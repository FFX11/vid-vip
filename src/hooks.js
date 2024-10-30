import { load } from 'cheerio';

const PROVIDER = 'OSOAPER';
const DOMAIN = "https://soaper.tv";
const PROXY_URL = "https://moviekex.online/proxy/m3u8-proxy?url=";
const headers = {
    "Origin": DOMAIN,
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
};
const movieInfo = {
    title: "Man on Fire",
    type: "movie",
    year: "2004"
}

export async function getSoaperSourcesId(tmdbId, seasonNumber = null, episodeNumber = null) {
    const type = movieInfo.season && movieInfo.episode ? "tv" : "movie";
    const searchUrl = `${DOMAIN}/search.html?keyword=${encodeURIComponent(movieInfo.title)}`;

    try {
        const searchResult = await fetch(searchUrl, { headers: { Referer: DOMAIN, ...headers } });
        const searchHtml = await searchResult.text();
        const searchPage$ = load(searchHtml);

        let linkDetail = "";
        searchPage$(".panel.panel-info.panel-default").each((_, item) => {
            const heading = searchPage$(item).find(".panel-heading").text();
            if (heading && (heading.trim() === "Related Movies" || heading === "Related TVs")) {
                searchPage$(item).find(".col-lg-2.col-md-3.col-sm-4.col-xs-6.no-padding").each((_, item2) => {
                    const year = searchPage$(item2).find(".img-group .img-tip.label.label-info").text();
                    const title = searchPage$(item2).find("h5 a").text().trim();
                    const href = searchPage$(item2).find("h5 a").attr('href');
                    const type = href.includes("movie_") ? "movie" : "tv";

                    if (title && href && title === movieInfo.title) {
                        if ((movieInfo.type === 'movie' && type === "movie" && year === movieInfo.year) ||
                            (movieInfo.type === 'tv' && type === "tv")) {
                            linkDetail = `${DOMAIN}${href}`;
                        }
                    }
                });
            }
        });

        if (!linkDetail) return { message: "Content not found" };
        let linkEpisode = linkDetail;
        if (movieInfo.type === "tv") {
            const tvPage = await fetch(linkDetail, { headers: { Referer: linkDetail, ...headers } });
            const tvHtml = await tvPage.text();
            const tvPage$ = load(tvHtml);

            tvPage$(".alert.alert-info-ex.col-sm-12").each((_, item) => {
                let season = tvPage$(item).find("h4").text().match(/season *([0-9]+)/i);
                season = season ? parseInt(season[1], 10) : 0;

                if (season === movieInfo.season) {
                    tvPage$(item).find(".col-sm-12.col-md-6.col-lg-4.myp1").each((_, item2) => {
                        const episodeTitle = tvPage$(item2).find("a").text();
                        const episodeHref = tvPage$(item2).find("a").attr("href");
                        const episodeNumber = parseInt(episodeTitle.match(/^([0-9]+) *\./i)[1], 10);

                        if (episodeNumber === movieInfo.episode) {
                            linkEpisode = `${DOMAIN}${episodeHref}`;
                        }
                    });
                }
            });
        }

        if (!linkEpisode) return { message: "Episode not found" };

        const id = linkEpisode.match(/\_([A-z0-9]+).html/i)?.[1];
        if (!id) return { message: "ID not found" };

        const urlDirect = `${DOMAIN}/home/index/GetEInfoAjax`;
        const headersForDirect = {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Requested-With": "XMLHttpRequest",
            Referer: linkEpisode
        };
        const body = new URLSearchParams({
            pass: id,
            e2: "0",
            server: "1"
        });

        const directResponse = await fetch(urlDirect, {
            method: "POST",
            headers: headersForDirect,
            body: body.toString()
        });
        let parseDataDirect = await directResponse.json();

        // If parseDataDirect is a string, parse it again to get an object
        if (typeof parseDataDirect === "string") {
            parseDataDirect = JSON.parse(parseDataDirect);
        }

        // Now we can access 'val' safely
        if (!parseDataDirect.val) {
            return { message: "Direct stream URL not found" };
        }

        const directURL = `${DOMAIN}${parseDataDirect.val.replace("/dev/Apis/tw_m3u8", "/home/index/M3U8")}`;
        const specificHeaders = {
            Referer: linkEpisode,
            ...headers
        };
        const encodedHeaders = encodeURIComponent(JSON.stringify(specificHeaders));

        return {
            stream: [
                {
                    id: "primary",
                    playlist: `${PROXY_URL}${encodeURIComponent(directURL)}&headers=${encodedHeaders}`,
                    type: "hls",
                    proxyDepth: 2,
                    captions: [] // Add captions logic here if available in parseDataDirect
                }
            ]
        };
    } catch (error) {
        console.error("Error fetching from Soaper:", error);
        return { message: 'Failed to retrieve content' };
    }
}
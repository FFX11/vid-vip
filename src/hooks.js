import { load } from 'cheerio';

const soaperBase = "https://soaper.tv";
const PROXY_URL = "https://moviekex.online/proxy/m3u8-proxy?url=";
const headers = {
    "Referer": "https://soaper.tv/movie_y5XgREJDbe.html",
    "Origin": "https://soaper.tv",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
};

export async function getSoaperSourcesId(tmdbId, seasonNumber = null, episodeNumber = null) {
    const type = seasonNumber && episodeNumber ? "show" : "movie";
    const searchUrl = `${soaperBase}/search.html`;
    const encodedHeaders = encodeURIComponent(JSON.stringify(headers));

    try {
        // Fetch search results page for the movie or show title
        const searchResult = await fetch(`${searchUrl}?keyword=${tmdbId}`, {
            headers: {
                'Referer': headers,
            }
        });
        const searchHtml = await searchResult.text();
        const searchPage$ = load(searchHtml);

        // Navigate to the "Related Movies" section
        const relatedMoviesSection = searchPage$("h4:contains('Titles includes keyword')").next(); // Select sibling elements
        let showLink;

        relatedMoviesSection.find("a").each((_, el) => {
            const titleText = searchPage$(el).text().trim();
            const href = searchPage$(el).attr("href");

            // Match title with tmdbId and retrieve href
            if (href) {
                showLink = href;
                return false; // Stop once the correct link is found
            }
        });

        if (!showLink) throw new Error("Content not found on Soaper");

        // Navigate to episode link if it's a show
        if (type === "show") {
            const showPage = await fetch(`${soaperBase}${showLink}`);
            const showHtml = await showPage.text();
            const showPage$ = load(showHtml);

            const seasonBlock = showPage$("h4").filter((_, el) => showPage$(el).text().includes(`Season ${seasonNumber}`)).parent();
            const episodes = seasonBlock.find("a").toArray();

            showLink = showPage$(
                episodes.find((el) => parseInt(showPage$(el).text().split(".")[0], 10) === episodeNumber)
            ).attr("href");
            if (!showLink) throw new Error("Episode not found on Soaper");
        }

        // Access the content page to retrieve streaming info
        const contentPage = await fetch(`${soaperBase}${showLink}`, {
            headers: { 'Referer': headers }
        });
        const contentHtml = await contentPage.text();
        const contentPage$ = load(contentHtml);

        // Extract pass for streaming
        const pass = contentPage$("#hId").attr("value");
        if (!pass) throw new Error("Pass value not found for content");

        const formData = new URLSearchParams();
        formData.append("pass", pass);
        formData.append("e2", "0");
        formData.append("server", "0");

        const infoEndpoint = type === "show" ? "/home/index/getEInfoAjax" : "/home/index/getMInfoAjax";
        const streamResponse = await fetch(`${soaperBase}${infoEndpoint}`, {
            method: "POST",
            body: formData,
            headers: {
                'Referer': `${soaperBase}${showLink}`
            }
        });

        const streamData = await streamResponse.json();

        // Process subtitles
        const captions = streamData.subs.map((sub) => {
            const language = sub.name.includes(".srt") ? sub.name.split(".srt")[0] : sub.name;
            return {
                id: sub.path,
                url: sub.path,
                type: "srt",
                hasCorsRestrictions: false,
                language
            };
        });

        // Build the stream result
        return {
            stream: [
                {
                    id: "primary",
                    playlist: `${PROXY_URL}${encodeURIComponent(`${soaperBase}/${streamData.val}`)}&headers=${encodedHeaders}`,
                    type: "hls",
                    proxyDepth: 2,
                    captions
                },
                ...streamData.val_bak ? [
                    {
                        id: "backup",
                        playlist: `${PROXY_URL}${encodeURIComponent(`${soaperBase}/${streamData.val_bak}`)}&headers=${encodedHeaders}`,
                        type: "hls",
                        proxyDepth: 2,
                        captions
                    }
                ] : []
            ]
        };
    } catch (error) {
        console.error("Error fetching from Soaper:", error);
        return { message: 'Failed to retrieve content' };
    }
}

import { vidsrcBase } from "./common.js";
import { load } from "cheerio";



export async function getVidsrcSourcesId(tmdbId, seasonNumber, episodeNumber) {
    const type = seasonNumber && episodeNumber ? "hydraxtv" : "hydrax";
    const url = `${vidsrcBase}/${type}.php?id=${tmdbId}${type === "hydraxtv" ? `&season=${seasonNumber}&episode=${episodeNumber}` : ''}`;
    const referralUrl = 'https://vidsrc.vip'
    const host = 'vidsrc.vip'

    try {
        const response = await fetch(url, {
            headers: {
                'Referer': referralUrl,
                'Host': host,
            }
        });
        const data = await response.text();

        const $ = load(data);

        // Extracting vpro and vto using regex
        const scriptContent = $('script').map((i, el) => $(el).html()).get().join(';');
        const vproMatch = scriptContent.match(/const vpro = "(.*?)";/);
        const vtoMatch = scriptContent.match(/const vto = "(.*?)";/);

        const titleMatch = scriptContent.match(/const title = "(.*?)";/);
        const yearMatch = scriptContent.match(/const year = "(.*?)";/);
        const imdbIdMatch = scriptContent.match(/const imdbId = "(.*?)";/);
        const seasonMatch = scriptContent.match(/const season = "(.*?)";/);
        const episodeMatch = scriptContent.match(/const episode = "(.*?)";/);

        const vpro = vproMatch ? vproMatch[1] : null;
        const vto = vtoMatch ? vtoMatch[1] : null;
        const title = titleMatch ? titleMatch[1] : null;
        const year = yearMatch ? yearMatch[1] : null;
        const extractedImdbId = imdbIdMatch ? imdbIdMatch[1] : null;
        const seasonNum = seasonMatch ? seasonMatch[1] : null;
        const episodeNum = episodeMatch ? episodeMatch[1] : null;


        // Extract additional elements
        const coverImageStyle = $('.cover-image').attr('style');
        const imageMatch = coverImageStyle ? coverImageStyle.match(/url\("([^"]+)"\)/) : null;
        const coverImage = imageMatch ? imageMatch[1] : null;
        const coverTitle = $('.title-text').text().trim();

        // Fetch subtitles
        const subtitles = await fetchSubtitles(extractedImdbId, type, seasonNumber, episodeNumber);

        return { vpro, vto, subtitles, title, year, imdbId: extractedImdbId, seasonNum, episodeNum, coverImage, coverTitle};
    } catch (err) {
        console.error(err);
        return;
    }
}

async function fetchSubtitles(imdbId, type,seasonNumber,episodeNumber) {
    const host = 'vidsrc.vip';
    const referer = 'https://vidsrc.vip'
    let urlImdb;

    if (type === 'hydraxtv') {
        urlImdb = `${vidsrcBase}/subs/${imdbId}-${seasonNumber}-${episodeNumber}.txt`;
    } else if (type === 'hydrax') {
        urlImdb = `${vidsrcBase}/subs/${imdbId}.txt`;
    }

    try {
        const response = await fetch(urlImdb, {
            headers: {
                'Host': host,
                'Referer': referer
            }
        });
        
        if (!response.ok) {
            throw new Error(`Subtitle fetch failed with status ${response.status}`);
        }

        const subtitles = await response.json();
        return subtitles;
    } catch (error) {
        console.error('Error fetching subtitles:', error.message);
        return [];
    }
}

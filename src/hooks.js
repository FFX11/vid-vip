import { vidsrcBase } from "./common.js";
import { load } from "cheerio";


export const config = {
    maxDuration: 25,
  };

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

        const vpro = vproMatch ? vproMatch[1] : null;
        const vto = vtoMatch ? vtoMatch[1] : null;

        // Fetch subtitles
        const subtitles = await fetchSubtitles(tmdbId);

        return { vpro, vto, subtitles };
    } catch (err) {
        console.error(err);
        return;
    }
}

async function fetchSubtitles(imdbId) {
    try {
        const response = await fetch(`${vidsrcBase}/subs/${imdbId}.txt`);
        
        if (!response.ok) {
            throw new Error(`Subtitle fetch failed with status ${response.status}`);
        }

        const subtitles = await response.json();
        return subtitles;
    } catch (error) {
        console.error('Error fetching subtitles:', error.message);
        return []; // Return empty array on error
    }
}
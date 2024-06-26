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

        const vpro = vproMatch ? vproMatch[1] : null;
        const vto = vtoMatch ? vtoMatch[1] : null;

        return { vpro, vto };
    } catch (err) {
        console.error(err);
        return;
    }
}
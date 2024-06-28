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

        // Fetch subtitles
        const subtitles = await fetchSubtitles(tmdbId, type, seasonNumber, episodeNumber);

        return { vpro, vto, subtitles };
    } catch (err) {
        console.error(err);
        return;
    }
}

async function fetchSubtitles(imdbId, type,seasonNumber,episodeNumber) {
    const host = 'vidsrc.vip';
    const referer = 'https://vidsrc.vip'
    let urlImdb;

    if (!isNaN(imdbId) && !seasonNumber && !episodeNumber) {
        imdbId = await fetchTmdbInfo(imdbId);
       
    }

    // Check if the imdbId is numeric and both seasonNumber and episodeNumber are provided
    if (!isNaN(imdbId) && seasonNumber && episodeNumber) {
        imdbId = await fetchTmdbInfoForTv(imdbId, seasonNumber, episodeNumber);
        
    }

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

async function fetchTmdbInfo(imdbId) {
    // Check if imdbId starts with "tt"
    if (imdbId.startsWith("tt")) {
        console.log("IMDB ID starts with 'tt', exiting.");
        return; // Exit the function early
    }

    const urlImdb = `https://api.themoviedb.org/3/movie/${imdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
    try {
        const response = await fetch(urlImdb);

        if (!response.ok) {
            throw new Error(`TMDb fetch failed with status ${response.status}`);
        }

        const tmdb = await response.json();

        return tmdb.imdb_id

    } catch (error) {
        console.error('Error fetching TMDb data:', error.message);
        // Handle the error appropriately
    }
}

async function fetchTmdbInfoForTv(imdbId) {
    // Check if imdbId starts with "tt"
    if (imdbId.startsWith("tt")) {
        console.log("IMDB ID starts with 'tt', exiting.");
        return; // Exit the function early
    }

    const urlImdb = `https://api.themoviedb.org/3/tv/${imdbId}/external_ids?api_key=1865f43a0549ca50d341dd9ab8b29f49`;
    try {
        const response = await fetch(urlImdb);

        if (!response.ok) {
            throw new Error(`TMDb fetch failed with status ${response.status}`);
        }

        const tmdb = await response.json();
        console.log('TMDb data:', tmdb);

        return tmdb.imdb_id
        // Your code to handle the TMDb data goes here

    } catch (error) {
        console.error('Error fetching TMDb data:', error.message);
        // Handle the error appropriately
    }
}
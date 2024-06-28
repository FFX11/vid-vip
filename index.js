import express from "express";
import { getVidsrcSourcesId} from "./src/hooks.js";

const app = express()
const port = 3000;

app.get('/', (req, res) => {
    res.status(200).json({
        routes: {
            movie: "/:movieTMDBid",
            show: "/:showTMDBid?s=seasonNumber&e=episodeNumber"
        },
    })
})//52814&season=1&episode=1

app.get('/:tmdbId', async(req, res) => {
    const id = req.params.tmdbId;
    const season = req.query.s;
    const episode = req.query.e;


    try {
        const { vpro, vto, subtitles, 
            title, year, imdbId: extractedImdbId, 
            seasonNum, episodeNum, coverImage, coverTitle   } = await getVidsrcSourcesId(id, season, episode);

        if (!vpro && !vto) {
            res.status(404).send({
                status: 404,
                message: "Oops media not available"
            });
            return;
        }

        // Return sources and subtitles as JSON
        res.status(200).json({
            sources: {
                vpro: vpro,
                vto: vto,
                coverImage, coverTitle
            },
            subtitles: subtitles
        });
    } catch (error) {
        console.error('Error fetching sources and subtitles:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
})

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})
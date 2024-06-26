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

    const sources = await getVidsrcSourcesId(id, season, episode);

    if (!sources) {
        res.status(404).send({
            status: 404,
            return: "Oops media not available"
        })
        return;
    };

    res.status(200).json({
        source: sources
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port http://localhost:${port}`)
})
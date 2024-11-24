import express from "express";
import child_process from "child_process";
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';
import "dotenv/config";

export const app = express();

// allow all origins
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "Content-Disposition");
    next();
});

app.use(express.static("public"));

function ytdlp(...args: string[]) {
    return child_process.execSync(`yt-dlp ${args.join(" ")} --no-exec`).toString();
}

app.get("/", (req, res) => {
    res.send("ok");
});

app.get("/ytdl", (req, res) => {
    const params = req.query;

    if (!params || !params.videoId || !params.format || !params.video || !params.audio)
        return void res.status(400).send("Missing parameters");

    const videoId = params.videoId as string;
    const format = params.format as string;
    const video = params.video === "true";
    const audio = params.audio === "true";

    if (!video && !audio && format === "any")
        return void res.status(400).send("You have to select something");

    if (!["any", "mp4", "webm", "mp3", "ogg", "wav"].includes(format))
        return void res.status(400).send("Invalid format");

    let formatArg = "";
    if (format === "any") {
        if (video && audio) formatArg = "b";
        else if (video) formatArg = "bv";
        else if (audio) formatArg = "ba";
    } else formatArg = format;

    const args = [
        `https://www.youtube.com/watch?v=${videoId}`,
        `-f ${formatArg}`,
        `-o "%(title)s.%(ext)s"`,
        `-P ./ytdlp/`
    ];

    const out = ytdlp(...args);

    if (out.includes("ERROR:")) {
        console.error(out);
        return void res.status(500).send("An error occurred");
    }

    const filename = out.split("\n").find(l => l.startsWith("[download] Destination: "))?.split(": ")[1] ?? "";

    if (!filename) {
        console.error("No filename found");
        console.log(out);
        return void res.status(500).send("An error occurred");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename.replace("ytdlp\\", "")}"`)
        .sendFile(`${path.resolve(dirname(fileURLToPath(import.meta.url)), "../../")}/${filename}`);

    setTimeout(() => {
        fs.unlinkSync(filename);
    }, 1000);
});

app.get("/spotify-currently-playing", async (req, res) => {
    if (req.headers.authorization !== process.env.SPOTIFY_API_SECRET)
        return void res.status(403).send("Unauthorized");

    const tokens = JSON.parse(fs.readFileSync("spotify-tokens.json", "utf-8"));
    const access_token = tokens.access_token;

    if (!access_token || tokens.expires_at < Date.now()) {
        console.log("Refreshing tokens");
        const newTokens = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`
            },
            // @ts-ignore
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: tokens.refresh_token
            }),
        }).then(res => res.json());

        if (newTokens.error)
            return void res.status(500).json(newTokens);

        fs.writeFileSync("spotify-tokens.json", JSON.stringify({
            access_token: newTokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: Date.now() + newTokens.expires_in * 1000
        }));
    }

    const currentlyPlayingRes = await fetch("https://api.spotify.com/v1/me/player/", {
        headers: {
            "Authorization": `Bearer ${tokens.access_token}`
        }
    })

    if (currentlyPlayingRes.status === 204)
        return void res.status(204).send("No content");

    const currentlyPlaying = await currentlyPlayingRes.json();

    if (currentlyPlaying.error)
        return void res.status(500).json(currentlyPlaying);

    res.json({
        name: currentlyPlaying.item.name,
        artist: currentlyPlaying.item.artists.map((a: any) => a.name).join(", "),
        album: currentlyPlaying.item.album.name,
        duration_ms: currentlyPlaying.item.duration_ms,
        progress_ms: currentlyPlaying.progress_ms,
        is_playing: currentlyPlaying.is_playing,
    })
});

export default function startHTTP() {
    app.listen(8000, () => {
        console.log("HTTP server started on port 8000");
    });
}
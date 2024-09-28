import express from "express";
import child_process from "child_process";
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs';

export const app = express();

// allow all origins
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Expose-Headers", "Content-Disposition");
    next();
});

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
        `-o %(title)s.%(ext)s`,
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

export default function startHTTP() {
    app.listen(8000, () => {
        console.log("HTTP server started on port 8000");
    });
}
import express from "express";
import "dotenv/config";
import { tuyaAuth, tuyaDevice, tuyaReq } from "./tuya";
import crypto from "crypto";
import { exec } from "child_process";

export const app = express();

// allow all origins
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST");
    res.header("Access-Control-Allow-Headers", "Content-Type, Content-Disposition, Authorization");
    next();
});

app.use(express.static("public"));

app.get("/", (req, res) => {
    res.send("ok");
});

app.get("/lights", async (req, res) => {
    if (req.headers.authorization !== process.env.API_SECRET)
        return void res.status(403).send("Unauthorized");
    
    // state = on/off
    // h, s, v = 0-360
    // must have state or all 3 h, s, v
    if (!req.query.state && (!req.query.h || !req.query.s || !req.query.v))
        return void res.status(400).send("Missing parameters");

    res.status(200).send("ok");
    
    if (req.query.state) {
        const on = req.query.state === "true";
        await tuyaDevice("switch_led", on);
    }

    if (req.query.h && req.query.s && req.query.v) {
        const h = parseInt(req.query.h as string);
        const s = parseInt(req.query.s as string);
        const v = parseInt(req.query.v as string);
        await tuyaDevice("colour_data_v2", { h, s, v });
    }
});

app.post('/webhook', async (req, res) => {
    const sig = req.headers['x-hub-signature-256'] || '';
    const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!);
    hmac.update(JSON.stringify(req.body));
    const digest = `sha256=${hmac.digest('hex')}`;
    
    if (sig !== digest) {
        console.error('Invalid signature');
        return void res.status(403).send('Invalid signature');
    }

    if (req.body.ref && req.body.ref === 'refs/heads/master') {
        console.log('Pulling latest changes...');
        exec('git pull && systemctl restart website-backend', { cwd: '~/new-website-backend' }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error pulling changes: ${error.message}`);
                return res.status(500).send('Error pulling changes');
            }
            if (stderr) {
                console.error(`stderr: ${stderr}`);
            }
            console.log(`stdout: ${stdout}`);
            res.status(200).send('Update successful');
        });
    } else {
        res.status(400).send('Invalid branch or request');
    }
});

export default async function startHTTP() {
    app.listen(8000, () => {
        console.log("HTTP server started on port 8000");
    });
    await tuyaAuth();
}
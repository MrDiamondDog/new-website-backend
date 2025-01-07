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
app.use(express.json());

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

const gitPath = '/usr/bin/git'; // Full path to git
const systemctlPath = '/bin/systemctl'; // Full path to systemctl

app.post('/webhook', async (req, res) => {
    try {
        // Ensure the request body is properly received
        if (!req.body || Object.keys(req.body).length === 0) {
            return void res.status(400).send('Invalid or missing request body');
        }

        // Validate the HMAC signature
        const sig = req.headers['x-hub-signature-256']; // GitHub's signature header
        if (!sig) {
            console.error('No signature found in request');
            return void res.status(403).send('No signature provided');
        }

        const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET!);
        const bodyData = JSON.stringify(req.body); // Convert the request body to a string
        hmac.update(bodyData);
        const digest = `sha256=${hmac.digest('hex')}`;

        if (sig !== digest) {
            console.error('Invalid signature');
            return void res.status(403).send('Invalid signature');
        }

        // Proceed with git pull and restart if branch matches
        if (req.body.ref && req.body.ref === 'refs/heads/master') { // Adjust branch name as needed
            console.log('Pulling latest changes...');
            exec(`${gitPath} pull && sudo ${systemctlPath} restart website-backend`, { cwd: '/home/ubuntu/new-website-backend/' }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error pulling changes: ${error.message}`);
                    return void res.status(500).send('Error pulling changes');
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
    } catch (error: any) {
        console.error(`Unexpected error: ${error.message}`);
        res.status(500).send('Internal server error');
    }
});

export default async function startHTTP() {
    app.listen(8000, () => {
        console.log("HTTP server started on port 8000");
    });
    await tuyaAuth();
}
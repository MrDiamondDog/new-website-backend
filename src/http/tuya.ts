import CryptoJS from "crypto-js";

const tuyaUrl = "https://openapi.tuyaus.com";

let access_token = "";
let refresh_token = "";

export function getSignature(reqMethod: string, reqBody: string, reqPath: string, nonce: string, sigHeaders: Record<string, string>) {
    const client_id = process.env.TUYA_ACCESS_ID!;
    const access_secret = process.env.TUYA_ACCESS_SECRET!;
    const t = Math.floor(Date.now());
    const stringToSign = reqMethod + "\n" + CryptoJS.SHA256(reqBody) + "\n" + (Object.keys(sigHeaders).map(key => `${key}:${sigHeaders[key]}`).join("\n")) + "\n\n" + reqPath;

    // console.log("client_id", client_id);
    // console.log("access_secret", access_secret);
    // console.log("access_token", access_token);
    // console.log("t", t);
    // console.log("method", reqMethod);
    // console.log("nonce", nonce);
    // console.log("url", reqPath);
    // console.log("sig headers", sigHeaders);
    // console.log("stringToSign", stringToSign);

    const str = `${client_id}${access_token ?? ""}${t}${nonce}${stringToSign}`;
    // console.log("full str", str);
    const sign = CryptoJS.HmacSHA256(str, access_secret).toString().toUpperCase();
    // console.log("sign", sign);

    // console.log("------------------------------");

    return sign;
}

export function tuyaReq(path: string, method = "GET", body = "") {
    const client_id = process.env.TUYA_ACCESS_ID!;
    const t = Math.floor(Date.now()).toString();
    const nonce = Math.random().toString(36).substring(7);

    const signature_headers = {
        area_id: "29a33e8796834b1efa6",
        call_id: "8afdb70ab2ed11eb85290242ac130003"
    }

    const headers = {
        client_id,
        access_token,
        t,
        nonce,
        "Signature-Headers": Object.keys(signature_headers).join(":"),
        ...signature_headers,
        sign_method: "HMAC-SHA256",
    };

    const sign = getSignature(method, body, path, nonce, signature_headers);

    return fetch(tuyaUrl + path, {
        method,
        headers: {
            ...headers,
            sign,
            "Content-Type": "application/json"
        },
        body: method === "GET" ? undefined : body
    });
}

export async function tuyaRefreshAuth() {
    if (!refresh_token) return;

    const res = await tuyaReq("/v1.0/token/" + refresh_token, "GET");

    const data = await res.json();

    if (!res.ok || !data.success)
        throw new Error("Failed to refresh Tuya auth: " + res.statusText + " " + data);

    access_token = data.result.access_token;
    refresh_token = data.result.refresh_token;

    setTimeout(tuyaRefreshAuth, data.result.expire_time * 1000);

    console.log("tuya auth refreshed");

    return data;
}

export async function tuyaAuth() {
    const res = await tuyaReq("/v1.0/token?grant_type=1", "GET");

    const data = await res.json();

    if (!res.ok || !data.success)
        throw new Error("Failed to authenticate with Tuya: " + res.statusText + " " + JSON.stringify(data));

    access_token = data.result.access_token;
    refresh_token = data.result.refresh_token;

    setTimeout(tuyaRefreshAuth, data.result.expire_time * 1000);

    console.log("tuya auth ok", access_token);

    return data;
}

export function tuyaDevice(command: string, data: any) {
    return tuyaReq(`/v1.0/iot-03/devices/${process.env.TUYA_DEVICE_ID}/commands`, "POST", JSON.stringify({ commands: [{ code: command, value: data }] }));
}
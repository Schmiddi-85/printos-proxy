import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.PRINTOS_KEY;
  const API_SECRET = process.env.PRINTOS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: "Missing PRINTOS_KEY or PRINTOS_SECRET",
    });
  }
const BASE_URL = "https://printos.api.hp.com/api/PrintbeatService";
  const PATH = "/externalApi/machines";

  const method = "GET";
  const timestamp = new Date().toISOString();

  const urlPath = PATH;

  // Canonical signature
  const messageToSign = `${method}\n${urlPath}\n${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256",
  };

  const debugInfo = {
    endpoint: "machines",
    sent_url: `${BASE_URL}${urlPath}`,
    method,
    urlPath,
    timestamp,
    messageToSign,
    signature,
    headers,
  };

  console.log("DEBUG MACHINES >>>", debugInfo);

  try {
    const response = await fetch(`${BASE_URL}${urlPath}`, { headers });
    const text = await response.text();
    return res.status(response.status).json({
      debug: debugInfo,
      hpResponse: text,
    });
  } catch (err: any) {
    return res.status(500).json({
      debug: debugInfo,
      error: err.message,
    });
  }
}

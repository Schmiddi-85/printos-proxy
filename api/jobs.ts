import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.JOBS_KEY;
  const API_SECRET = process.env.JOBS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "Missing JOBS_KEY or JOBS_SECRET" });
  }

  const BASE_URL = "https://printos.api.hp.com/api/PrintbeatService";
  const PATH = "/externalApi/jobs";

  const method = "GET";
  const timestamp = new Date().toISOString();

  const startMarker = req.query.startMarker ?? "1";
  const devices = req.query.devices ?? "";
  const sortOrder = req.query.sortOrder ?? "ASC";
  const limit = req.query.limit ?? "";

  const queryString = new URLSearchParams({
    startMarker: String(startMarker),
    devices: String(devices),
    sortOrder: String(sortOrder),
    limit: String(limit),
  }).toString();

  // Signature rules for PRINTOS JOBS:
  // method + " " + PATH + timestamp + queryString
  const messageToSign = `${method} ${PATH}${timestamp}${queryString}`;

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
    endpoint: "jobs",
    sent_url: `${BASE_URL}${PATH}?${queryString}`,
    method,
    timestamp,
    PATH,
    queryString,
    messageToSign,
    signature,
    headers,
  };

  console.log("DEBUG JOBS >>>", debugInfo);

  try {
    const response = await fetch(`${BASE_URL}${PATH}?${queryString}`, { headers });
    const text = await response.text();
    res.status(response.status).json({
      debug: debugInfo,
      hpResponse: text,
    });
  } catch (err: any) {
    res.status(500).json({ debug: debugInfo, error: err.message });
  }
}

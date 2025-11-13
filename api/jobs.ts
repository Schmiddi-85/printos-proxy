import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.JOBS_KEY;
  const API_SECRET = process.env.JOBS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({ error: "Missing JOBS_KEY or JOBS_SECRET" });
  }

  const BASE_URL = "https://printos.api.hp.com/printbeat";
  const PATH = "/externalApi/jobs";

  const method = "GET";
  const timestamp = new Date().toISOString();

  const startMarker = req.query.startMarker ?? "1";
  const devices = req.query.devices ?? "";
  const sortOrder = req.query.sortOrder ?? "ASC";
  const limit = req.query.limit ?? "";

  const query = new URLSearchParams({
    startMarker: String(startMarker),
    devices: String(devices),
    sortOrder: String(sortOrder),
    limit: String(limit)
  });

  const urlPath = `${PATH}?${query.toString()}`;

  // Here we generate the canonical string exactly like HP expects
  const messageToSign = `${method}\n${urlPath}\n${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256"
  };

  // ---- DEBUG INFO ----
  const debugInfo = {
    sent_to: `${BASE_URL}${urlPath}`,
    method,
    timestamp,
    messageToSign,
    computedSignature: signature,
    headers
  };
  console.log("DEBUG JOBS >>>", debugInfo);

  try {
    const response = await fetch(`${BASE_URL}${urlPath}`, { headers });

    const text = await response.text();

    // Return full debug info including HP response
    return res.status(response.status).json({
      debug: debugInfo,
      hpResponse: text
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message,
      debug: debugInfo
    });
  }
}

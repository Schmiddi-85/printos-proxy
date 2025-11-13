import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {

  const API_KEY = process.env.JOBS_KEY;
  const API_SECRET = process.env.JOBS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: "Missing JOBS_KEY or JOBS_SECRET"
    });
  }

  const BASE_URL = "https://printos.api.hp.com/printbeat";
  const PATH = "/externalApi/jobs";

  // deine fixen Geräte
  const DEVICE_IDS = ["47100254", "47100431"];

  // Query params vorbereiten
  const startMarker = req.query.startMarker ?? "1";
  const sortOrder = req.query.sortOrder ?? "ASC";
  const limit = req.query.limit ?? "200";

  const queryString = new URLSearchParams({
    startMarker: String(startMarker),
    sortOrder: String(sortOrder),
    limit: String(limit),
    devices: DEVICE_IDS.join(",")
  }).toString();

  const urlPath = `${PATH}?${queryString}`;
  const fullUrl = `${BASE_URL}${urlPath}`;

  // --- Signatur laut HP TestTool ---
  const method = "GET";
  const timestamp = new Date().toISOString();
  const messageToSign = `${method} ${urlPath}${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256",
  };

  try {
    const response = await fetch(fullUrl, { headers });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

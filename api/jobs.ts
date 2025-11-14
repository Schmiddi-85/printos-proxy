import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.JOBS_KEY;
  const API_SECRET = process.env.JOBS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: "Missing JOBS_KEY or JOBS_SECRET in environment variables",
    });
  }

  // Base URL from HP docs
  const BASE_URL = "https://printos.api.hp.com/printbeat";

  // This is always the SAME and is used for the HMAC (without query params!)
  const PATH = "/externalApi/jobs";

  // Query parameters provided by client (or default)
  const startMarker = req.query.startMarker ?? "0";
  const devices = req.query.devices ?? "";
  const sortOrder = req.query.sortOrder ?? "ASC";
  const limit = req.query.limit ?? "";

  // Build real query string for the HP API
  const queryString = new URLSearchParams({
    startMarker: String(startMarker),
    devices: String(devices),
    sortOrder: String(sortOrder),
    limit: String(limit),
  }).toString();

  const finalUrl = `${BASE_URL}${PATH}?${queryString}`;

  // HP-required timestamp
  const timestamp = new Date().toISOString();

  // IMPORTANT: SIGNATURE *does not include query string*
  const messageToSign = `GET\n${PATH}\n${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256",
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    Accept: "application/json",
  };

  try {
    const response = await fetch(finalUrl, { headers });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

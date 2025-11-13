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

  // BASE URL wie im HP-Test
  const BASE_URL = "https://printos.api.hp.com/printbeat";
  const PATH = "/externalApi/jobs";

  // Query Params
  const startMarker = req.query.startMarker ?? "0";
  const devices = req.query.devices ?? "";
  const sortOrder = req.query.sortOrder ?? "ASC";
  const limit = req.query.limit ?? "";

  const queryString = new URLSearchParams({
    startMarker: String(startMarker),
    devices: String(devices),
    sortOrder: String(sortOrder),
    limit: String(limit),
  }).toString();

  const fullPath = `${PATH}?${queryString}`;

  const method = "GET";
  const timestamp = new Date().toISOString();

  // EXACT format used by HP Test UI
  const messageToSign = `${method}\n${fullPath}\n${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256",
    Accept: "application/json",
  };

  try {
    const url = `${BASE_URL}${fullPath}`;

    const response = await fetch(url, { headers });
    const text = await response.text();

    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

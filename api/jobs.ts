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

  const BASE_URL = "https://printos.api.hp.com/printbeat";
  const PATH = "/externalApi/jobs";

  // Query parameters (empty devices = all machines)
  const params = new URLSearchParams({
    startMarker: req.query.startMarker ?? "0",
    devices: req.query.devices ?? "",
    sortOrder: req.query.sortOrder ?? "ASC",
    limit: req.query.limit ?? "",
  });

  const finalUrl = `${BASE_URL}${PATH}?${params.toString()}`;

  const timestamp = new Date().toISOString();

  // *** REQUIRED BY HP ***
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
    Host: "printos.api.hp.com",          // <----- THIS FIXES THE 401!
  };

  try {
    const hpResponse = await fetch(finalUrl, {
      headers,
      method: "GET",
    });

    const body = await hpResponse.text();
    res.status(hpResponse.status).send(body);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

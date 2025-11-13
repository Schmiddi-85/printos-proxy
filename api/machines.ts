import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.PRINTOS_KEY;
  const API_SECRET = process.env.PRINTOS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: "Missing PRINTOS_KEY or PRINTOS_SECRET in environment variables",
    });
  }

  const BASE_URL = "https://printos.api.hp.com/printbeat-service";
  const PATH = "/externalApi/machines";

  const method = "GET";
  const timestamp = new Date().toISOString();
  const messageToSign = `${method} ${PATH}${timestamp}`;

  const signature = crypto
    .createHmac("sha256", API_SECRET)
    .update(messageToSign)
    .digest("hex");

  const headers = {
    "x-hp-hmac-authentication": `${API_KEY}:${signature}`,
    "x-hp-hmac-date": timestamp,
    "x-hp-hmac-algorithm": "SHA256"
  };

  try {
    const response = await fetch(`${BASE_URL}${PATH}`, { headers });
    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}

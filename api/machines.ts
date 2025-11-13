import crypto from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const API_KEY = process.env.PRINTOS_KEY;
  const API_SECRET = process.env.PRINTOS_SECRET;

  if (!API_KEY || !API_SECRET) {
    return res.status(500).json({
      error: "Missing PRINTOS_KEY or PRINTOS_SECRET"
    });
  }

  const BASE_URL = "https://printos.api.hp.com";

  // These are the 3 known possible PrintBeat machine endpoints.
  const possiblePaths = [
    "/printbeat-service/machines",
    "/api/printbeat-service/machines",
    "/printbeat-service/externalApi/machines"
  ];

  const method = "GET";
  const timestamp = new Date().toISOString();

  let lastError = null;

  for (const PATH of possiblePaths) {
    const messageToSign = `${method}\n${PATH}\n${timestamp}`;

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

      if (response.status !== 404) {
        // Found the right endpoint (not NotFound)
        const data = await response.text();
        return res.status(response.status).send(data);
      } else {
        lastError = await response.text();
      }
    } catch (e: any) {
      lastError = e.message;
    }
  }

  return res.status(400).json({
    error: "None of the machine endpoints worked",
    detail: lastError
  });
}

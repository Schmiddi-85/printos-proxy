export default function handler(req, res) {
  res.json({
    message: "PrintOS Proxy is running",
    endpoints: ["/api/jobs", "/api/machines"]
  });
}

const express = require("express");
const path = require("path");
const { spawn } = require("child_process");

const app = express();
const PORT = process.env.PORT || 10000;
const YT_DLP = process.env.YT_DLP_PATH || "/usr/local/bin/yt-dlp";
const MAX_CONCURRENT = Number(process.env.MAX_CONCURRENT_DOWNLOADS || 2);
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const hits = new Map();
let activeDownloads = 0;

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

function platformHosts(platform) {
  return {
    Instagram: ["instagram.com", "www.instagram.com"],
    YouTube: ["youtube.com", "www.youtube.com", "youtu.be", "www.youtu.be", "m.youtube.com"],
    Facebook: ["facebook.com", "www.facebook.com", "fb.watch", "www.fb.watch", "m.facebook.com"]
  }[platform] || [];
}

function validateInput(url, platform) {
  if (!url || !platform) return { error: "Missing video URL or platform." };
  let u;
  try { u = new URL(url); } catch { return { error: "Invalid video URL." }; }
  const hosts = platformHosts(platform);
  if (!hosts.includes(u.hostname.toLowerCase())) return { error: "URL does not match the selected platform." };
  if (u.protocol !== "https:") return { error: "Only HTTPS video URLs are allowed." };
  return { url: u.toString(), platform };
}

function allowedByRateLimit(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) { hits.set(ip, recent); return false; }
  recent.push(now); hits.set(ip, recent);
  return true;
}

async function downloadHandler(req, res) {
  const rawUrl = req.method === "GET" ? req.query.url : (req.body || {}).url;
  const platform = req.method === "GET" ? req.query.platform : (req.body || {}).platform;
  const checked = validateInput(rawUrl, platform);
  if (checked.error) return res.status(400).json({ error: checked.error });

  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown").toString().split(",")[0].trim();
  if (!allowedByRateLimit(ip)) return res.status(429).json({ error: "Too many downloads from this connection. Please try again later." });
  if (activeDownloads >= MAX_CONCURRENT) return res.status(503).json({ error: "The downloader is busy right now. Please try again in a moment." });

  activeDownloads++;
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Content-Disposition", 'attachment; filename="reelszap-video.mp4"');
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prefer MP4. If separate video/audio streams are available, ffmpeg merges them.
  const args = [
    "--no-playlist", "--no-part", "--no-mtime", "--no-warnings",
    "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b",
    "--merge-output-format", "mp4",
    "-o", "-", checked.url
  ];

  const child = spawn(YT_DLP, args, { stdio: ["ignore", "pipe", "pipe"] });
  let started = false;
  let errorText = "";
  let settled = false;

  const finish = () => { if (!settled) { settled = true; activeDownloads = Math.max(0, activeDownloads - 1); } };
  child.stderr.on("data", d => { errorText += d.toString(); if (errorText.length > 8000) errorText = errorText.slice(-8000); });
  child.stdout.on("data", chunk => { started = true; res.write(chunk); });
  child.on("close", code => {
    finish();
    if (code !== 0 && !started) {
      if (!res.headersSent) {
        const text = errorText.toLowerCase();
        let detail = "Download failed. The video may be private, restricted, age-gated, login-required, or unsupported by the platform.";
        if (text.includes("sign in") || text.includes("login")) detail = "This video requires sign-in or is restricted.";
        res.status(502).json({ error: detail });
      } else if (!res.writableEnded) res.end();
      return;
    }
    if (!res.writableEnded) res.end();
  });
  child.on("error", () => {
    finish();
    if (!res.headersSent) res.status(500).json({ error: "Download engine is unavailable on the server." });
  });
  req.on("close", () => {
    if (!res.writableEnded) child.kill("SIGTERM");
  });
}

app.get("/api/download", downloadHandler);
app.post("/api/download", downloadHandler);

// Express 5-safe catch-all route.
app.get(/.*/, (_req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.listen(PORT, "0.0.0.0", () => console.log(`ReelsZap running on port ${PORT}`));

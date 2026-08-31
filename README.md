# ReelsZap

ReelsZap is an Express-based video utility site for downloading content you own or have permission to download.

## Deployment

This project is prepared for a free Render Web Service using the included Dockerfile. The Docker image installs Node.js, ffmpeg, Deno, and the current yt-dlp release so the download endpoint has its required server-side download engine.

Use Render **Web Service** with the Docker runtime. No custom build command is required; Render builds the included Dockerfile and starts `npm start`.

Free hosting can sleep when idle, so the first request after inactivity may take longer. Platform restrictions and private/login-required posts may prevent downloads.


## Public downloader behavior
The app accepts public HTTPS URLs from YouTube, Instagram, and Facebook. It streams downloads directly from the server to the browser to avoid loading the whole video into browser memory. Private/login-required/age-restricted/protected videos may fail. A small per-IP rate limit and concurrency cap are included to reduce abuse on free hosting.

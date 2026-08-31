FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV YT_DLP_PATH=/usr/local/bin/yt-dlp

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates ffmpeg unzip \
    && rm -rf /var/lib/apt/lists/* \
    && curl -L --fail https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod 755 /usr/local/bin/yt-dlp \
    && curl -fsSL https://deno.land/install.sh | sh \
    && ln -s /root/.deno/bin/deno /usr/local/bin/deno

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

EXPOSE 10000
CMD ["npm", "start"]

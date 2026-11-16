# Dockerfile for deployed IDLIX Reconstruction
FROM node:24-bookworm-slim

# Install Chromium and dumb-init for headless browser provisioning on Linux servers
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    dumb-init \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV HEADLESS=1
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy dependency manifests and install
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy application code and build
COPY . .
RUN npm run build

EXPOSE 3000

VOLUME ["/app/data"]

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "start"]

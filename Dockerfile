# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim

RUN set -eux; \
    apt-get -o Acquire::Retries=3 update; \
    apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
      python3 \
      make \
      g++; \
    if ! apt-get -o Acquire::Retries=3 install -y --no-install-recommends libreoffice-writer; then \
      apt-get -o Acquire::Retries=3 install -y --no-install-recommends libreoffice; \
    fi; \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm config set fund false && npm config set audit false \
    && npm install

COPY tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
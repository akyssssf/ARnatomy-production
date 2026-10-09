# Backend ARnatomy (NFR-08: satu image untuk lokal, staging, dan produksi).
# Model embedding RAG (q8, ±120 MB) diunduh saat build sehingga server siap tanpa internet saat pertama jalan.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY drizzle ./drizzle
COPY data ./data
COPY src ./src
COPY scripts/unduh-model.ts ./scripts/unduh-model.ts
RUN npx tsx scripts/unduh-model.ts
EXPOSE 4000
# Migrasi dan data awal dijalankan otomatis saat server mulai (src/server.ts)
CMD ["npx", "tsx", "src/server.ts"]

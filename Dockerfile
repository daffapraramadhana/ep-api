# syntax=docker/dockerfile:1

# Debian (glibc), bukan Alpine: onnxruntime-node (mesin TTS Kokoro) tidak
# menyediakan binary musl. Spec audio-tts §12.

########################
# 1) deps — full install (incl. devDependencies) so we can build + generate
########################
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# python3/make/g++ needed to compile bcrypt's native addon
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
# onnxruntime-node di linux/x64 mengunduh bundle GPU/CUDA dari GitHub saat
# install (ratusan MB, menimpa .so CPU) — kita hanya pakai CPU.
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN npm ci

########################
# 2) builder — prisma generate + nest build + panggang model TTS
########################
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Unduh model Kokoro (±90 MB) saat build — runtime tak butuh internet dan
# request audio pertama tak menunggu unduhan.
ENV TTS_MODEL_DIR=/app/tts-models
RUN node dist/src/tts/cli/prefetch-model.js

########################
# 3) prod-deps — production-only install (smaller runtime node_modules)
########################
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
ENV ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN npm ci --omit=dev

########################
# 4) runtime
########################
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV TTS_MODEL_DIR=/app/tts-models
# prisma's query engine needs libssl; ca-certificates for outbound HTTPS (S3, Groq, ElevenLabs)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
# generated prisma client (query engine + types) lives under node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/tts-models ./tts-models
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]

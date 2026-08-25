# syntax=docker/dockerfile:1

########################
# 1) deps — full install (incl. devDependencies) so we can build + generate
########################
FROM node:22-alpine AS deps
WORKDIR /app
# python3/make/g++ needed to compile bcrypt's native addon on musl (alpine)
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

########################
# 2) builder — prisma generate + nest build
########################
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

########################
# 3) prod-deps — production-only install (smaller runtime node_modules)
########################
FROM node:22-alpine AS prod-deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

########################
# 4) runtime
########################
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# prisma's query engine needs libssl on alpine
RUN apk add --no-cache openssl
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
# generated prisma client (query engine + types) lives under node_modules/.prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["./docker-entrypoint.sh"]

# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma's query engine binary needs libssl — Alpine's base image doesn't ship it, and its
# absence isn't a build-time warning only, it's a hard runtime crash (P1010/library load failure).
RUN apk add --no-cache openssl
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Production dependencies only ----
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
# The Prisma Client generated in the build stage (schema-specific query engine + types) lives
# in node_modules/.prisma — prod-deps' `npm ci --omit=dev` has no `prisma` CLI to regenerate it,
# so it's copied in directly on top of the regular @prisma/client package already installed.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
COPY package*.json ./
COPY prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/main.js"]

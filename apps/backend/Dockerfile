# DARKCITY Backend Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY ../../packages/shared/package.json ../../packages/shared/
COPY ../../packages/database/package.json ../../packages/database/

RUN npm install --production

# Build stage
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY ../../packages/shared ../../packages/shared
COPY ../../packages/database ../../packages/database

# Generate Prisma client
RUN npx prisma generate --schema=../../packages/database/prisma/schema.prisma

# Build TypeScript
RUN npm run build

# Production stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 darkcity

COPY --from=builder --chown=darkcity:nodejs /app/dist ./dist
COPY --from=builder --chown=darkcity:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=darkcity:nodejs /app/package.json ./package.json

USER darkcity

EXPOSE 3001

ENV PORT=3001

CMD ["node", "dist/index.js"]

FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built files
COPY dist/ ./dist/
COPY src/db/schema.sql ./src/db/

# Environment
ENV NODE_ENV=production

EXPOSE 3000

# Default to API server (override with scheduler command)
CMD ["node", "dist/index.js"]

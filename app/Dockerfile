FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM deps AS builder
COPY . .
RUN npm run build:frontend

FROM deps AS runner
COPY --from=builder /app/dist ./dist
COPY . .
ENV NODE_ENV=production
EXPOSE 3001
# Run DB migrations then start the server
CMD sh -c "node_modules/.bin/drizzle-kit migrate && node_modules/.bin/tsx --tsconfig tsconfig.server.json api/boot.ts"

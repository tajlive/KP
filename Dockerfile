# syntax=docker/dockerfile:1
FROM node:24-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm config set legacy-peer-deps true && npm ci --ignore-scripts
COPY . .
ENV FLY_IO=1
ENV NODE_ENV=production
RUN rm -rf .next && npm run build

FROM node:24-slim AS runner
WORKDIR /app
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# syntax=docker/dockerfile:1

# Multi-stage build for Next.js App Router with standalone output
# Node 24.x (matches .nvmrc)

# -------------------------------
# Stage 1: Dependencies
# -------------------------------
FROM node:24-slim AS deps
WORKDIR /app

# Install dependencies needed for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

# -------------------------------
# Stage 2: Builder
# -------------------------------
FROM node:24-slim AS builder
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./

# Copy source code
COPY . .

# Build the application
# Increase memory limit for build (matches existing build script)
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV SKIP_LINT_IN_BUILD=true
ENV FLY_IO=1
RUN npm run build

# -------------------------------
# Stage 3: Runner
# -------------------------------
FROM node:24-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV FLY_IO=1

# Create non-root user
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs

# Copy standalone output from builder
# With output: 'standalone', Next.js creates .next/standalone with server.js + needed files
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

# Switch to non-root user
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

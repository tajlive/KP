# syntax=docker/dockerfile:1
# Runtime-only Dockerfile — Next.js app er ferdigbygget i CI
FROM node:24-slim AS runner
WORKDIR /app
RUN groupadd -r nextjs && useradd -r -g nextjs nextjs
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --chown=nextjs:nextjs .next/standalone ./
COPY --chown=nextjs:nextjs .next/static ./.next/static
COPY --chown=nextjs:nextjs public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# OpenSSL requis pour que Prisma détecte la version à l'exécution (Alpine 3.17+ = OpenSSL 3.x)
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

# Next.js standalone ne trace pas automatiquement les binaires Prisma non-natifs
# On copie explicitement le binaire pour linux-musl + OpenSSL 3.x
COPY --from=builder /app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node \
  ./node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]

# ---- build stage ----
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++ openssl
WORKDIR /app

# enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npx nest build

# ---- runtime stage ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod --no-frozen-lockfile

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# migrations entrypoint: apply schema, seed if needed, then serve
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]

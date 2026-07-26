FROM node:20-alpine AS builder
WORKDIR /app

# pnpm-lock.yaml is the authoritative lockfile — install with pnpm so
# production builds are reproducible (npm would ignore it entirely).
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build-time public env (injected into client bundle)
ARG NUXT_PUBLIC_API_BASE
ARG NUXT_PUBLIC_WS_BASE
ARG NUXT_PUBLIC_APP_NAME
ARG NUXT_PUBLIC_ICP_NUMBER
ARG NUXT_PUBLIC_ICP_URL
ARG NUXT_PUBLIC_MPS_NUMBER
ARG NUXT_PUBLIC_MPS_URL
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_WS_BASE=$NUXT_PUBLIC_WS_BASE
ENV NUXT_PUBLIC_APP_NAME=$NUXT_PUBLIC_APP_NAME
ENV NUXT_PUBLIC_ICP_NUMBER=$NUXT_PUBLIC_ICP_NUMBER
ENV NUXT_PUBLIC_ICP_URL=$NUXT_PUBLIC_ICP_URL
ENV NUXT_PUBLIC_MPS_NUMBER=$NUXT_PUBLIC_MPS_NUMBER
ENV NUXT_PUBLIC_MPS_URL=$NUXT_PUBLIC_MPS_URL

COPY . .
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]

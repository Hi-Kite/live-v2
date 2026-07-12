# live.afsmc.cn v2 — Refactor Plan

A complete rewrite of the legacy PHP live-streaming web app using a modern,
production-grade stack. Old code stays untouched at the repo root; all new
code lives under `v2/`.

## Architecture

```
v2/
├── docker-compose.yml          # orchestrates all services
├── .env.example                # all secrets (no hardcoding)
├── README.md                   # deployment guide
├── PLAN.md                     # this file
├── backend/                    # NestJS (TypeScript) — API + WebSocket gateway
├── frontend/                   # Nuxt 3 (Vue 3 + TypeScript) — SSR UI
├── srs/                        # SRS media server config
└── nginx/                      # reverse proxy config (optional)
```

## Tech Stack

| Layer        | Technology                                          |
|--------------|-----------------------------------------------------|
| Backend      | NestJS (Node.js 20, TypeScript)                     |
| ORM          | Prisma (MySQL 8)                                    |
| Frontend     | Nuxt 3 (Vue 3, TypeScript)                          |
| UI           | Tailwind CSS + shadcn-style components              |
| Player       | ArtPlayer (FLV / HLS / Danmaku plugins)             |
| Realtime     | Socket.IO via `@nestjs/websockets`                  |
| Database     | MySQL 8 + Redis 7 (cache / rate-limit / socket-adapter) |
| Media server | SRS 5 (RTMP ingest → HTTP-FLV / HLS / WebRTC)       |
| Email        | Nodemailer (existing SMTP)                          |
| Captcha      | svg-captcha                                         |
| 2FA          | otplib + qrcode                                     |
| Auth         | JWT (httpOnly cookie) + refresh token, CSRF double-submit |
| Container    | Docker Compose                                      |

## Database Schema (Prisma)

- **User**: id, email, username, password (argon2), role (USER/ADMIN),
  emailVerified, twoFactorSecret, twoFactorEnabled, timestamps
- **Stream**: id, slug, title, description, streamKey (unique), liveStatus,
  startedAt, timestamps
- **Message**: id, streamId, userId, content, createdAt — indexed (streamId, createdAt)
- **Subscription**: id, email (unique), token (unique), createdAt
- **InviteCode**: code (pk), usedBy, usedAt, createdAt

## Backend Modules (NestJS)

- **AuthModule** — register (invite code), login, logout, me, verify-email,
  forgot-password, reset-password
- **TwoFactorModule** — setup (QR), verify, disable (admin only)
- **StreamModule** — list/detail (public), create/update/delete (admin)
- **AdminModule** — start/stop stream (sets liveStatus, emails subscribers,
  broadcasts via WS), user management, invite-code generation
- **ChatGateway** (WebSocket) — joinStream, sendMessage, deleteMessage (admin),
  broadcasts to room subscribers
- **SubscriptionModule** — subscribe (captcha), unsubscribe (token)
- **CaptchaModule** — GET /captcha (SVG + token)
- **RateLimitGuard** — Redis-backed throttler
- **Common** — ThrottlerGuard, CsrfGuard, ValidationPipe, global exception filter

Security:
- All secrets in `.env`
- CSRF double-submit cookie on every state-changing request
- Redis rate limiting (login 5/min, messages 10/min)
- Session regeneration on login
- argon2 password hashing
- `helmet`, strict CORS, `class-validator` input validation

## Frontend Pages (Nuxt 3)

| Route                | Description                                              |
|----------------------|----------------------------------------------------------|
| `/`                  | Home: live player + sidebar chat + danmaku + online count|
| `/login`             | Login form                                               |
| `/register`          | Register (invite code)                                   |
| `/streams/:slug`     | Individual stream page                                   |
| `/pvp`               | Multi-stream split view (pick live streams)              |
| `/account`           | User center: profile, change password, delete account    |
| `/subscribe`         | Email subscription (captcha)                             |
| `/unsubscribe`       | Unsubscribe landing                                      |
| `/admin`             | Admin dashboard (2FA required)                           |
| `/admin/streams`     | Stream mgmt: create/edit/start/stop, show push URL+key   |
| `/admin/users`       | User management                                          |
| `/admin/invite-codes`| Generate invite codes                                    |

## SRS Config

- RTMP ingest: `rtmp://srs:1935/live/{streamKey}`
- HTTP-FLV out: `http://srs:8080/live/{streamKey}.flv`
- HLS out: `http://srs:8080/live/{streamKey}.m3u8`
- WebRTC out: negotiated via SRS API
- Backend queries SRS API (`/api/v1/streams/`) to detect real live status

## Docker Compose Services

| Service   | Image                   | Ports                              |
|-----------|-------------------------|------------------------------------|
| backend   | node:20-alpine          | 3001 internal                      |
| frontend  | node:20-alpine (Nuxt)   | 3000                               |
| srs       | ossrs/srs:5             | 1935, 8080, 1985, 8000/udp         |
| mysql     | mysql:8                 | 3306                               |
| redis     | redis:7-alpine          | 6379                               |
| nginx     | nginx:alpine (optional) | 80/443 → reverse proxy             |

## End-to-End Workflows

**Admin starts a stream:**
1. Admin logs in (with 2FA) → `/admin/streams`
2. Creates stream → unique `streamKey` generated
3. Copies push URL + key into OBS
4. Clicks "Go Live" → backend sets `liveStatus=true`, emails subscribers,
   broadcasts WebSocket event
5. Frontend home instantly shows "LIVE" badge, player loads
6. OBS pushes to SRS → viewers watch via HTTP-FLV/HLS/WebRTC

**User chats:**
1. Connect WebSocket, join stream room
2. Send message → validated, rate-limited, saved to DB, broadcast to room
3. Message renders in sidebar + danmaku overlay simultaneously

**User registers:**
1. Enter invite code + credentials
2. Account created with `emailVerified=null`
3. Verification email sent
4. Click link → full access

## Implementation Phases

1. **Scaffold** — docker-compose, backend skeleton, frontend skeleton, Prisma
   schema, SRS config, `.env.example`
2. **Auth & Users** — register (invite), login, JWT, CSRF, rate limit,
   email verify, password reset
3. **Stream & SRS** — stream CRUD, SRS API integration, admin start/stop,
   ArtPlayer component
4. **Chat & WebSocket** — Socket.IO gateway, chat UI, danmaku overlay,
   online count
5. **Subscription & Email** — subscribe form, captcha, go-live notification,
   unsubscribe
6. **Admin Panel** — dashboard, stream mgmt, user mgmt, invite codes, 2FA
7. **PVP mode** — multi-stream split view, stream selector
8. **Polish** — theme, responsive, 404, docs, deploy verification

## Legacy Code

Original files at repo root are kept untouched for reference.

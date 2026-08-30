# Khurchi.com — Cloudflare-Native Architecture

Mumbai's Chair Care Network. Built as a fully Cloudflare-native production application.

## Architecture

- **Frontend**: React 18 + Vite (Tailwind CSS, Lucide icons, Framer Motion)
- **Backend API**: Cloudflare Worker in TypeScript (`worker/index.ts`)
- **Hosting**: Cloudflare Workers with Static Assets (`wrangler.jsonc`)
- **Database**: Cloudflare D1 (Serverless SQLite with atomic counters)
- **Email Notifications**: Resend API (Direct photo attachments without cloud storage retention)
- **Authentication**: Web Crypto API HS256 JWT tokens (`jose`)

---

## Cloudflare Resources

- **D1 Database Name**: `khurchi-db`
- **D1 Database ID**: `3d39c135-2004-4cad-b93a-ba410ae435d7`
- **Wrangler Config**: `wrangler.jsonc`
- **D1 Schema Migrations**: `migrations/0001_init.sql`

---

## 1-Command Production Deployment

### 1. Apply D1 Migrations to Remote Database
```bash
npx wrangler d1 migrations apply khurchi-db --remote
```

### 2. Configure Cloudflare Worker Secrets
```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_PASSWORD
```

### 3. Build & Deploy to Cloudflare Workers
```bash
npm run build
npx wrangler deploy
```

---

## Local Development in Google AI Studio
The local development server uses Node 22's built-in SQLite engine to simulate Cloudflare D1 with the exact same SQL migrations, allowing full end-to-end testing and previews in AI Studio on port 3000.

```bash
npm run dev
```

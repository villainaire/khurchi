# Khurchi.com — Cloudflare-Native Architecture

Professional Doorstep Chair Care Network across Mumbai, Thane & Navi Mumbai.

## Production Cloudflare Architecture

```
React / Vite Single Page Application (Served via Cloudflare Assets)
        ↓
Cloudflare Worker API (TypeScript + Hono)
        ↓
Cloudflare D1 Database (khurchi-db: 3d39c135-2004-4cad-b93a-ba410ae435d7)
        ↓
Cloudflare R2 Storage (Bucket: khurchi-uploads for customer chair images)
        ↓
Resend Email API (Real-time booking notification dispatch)
```

---

## Cloudflare Resources & Bindings

### 1. Cloudflare D1 Database
- **Database Name**: `khurchi-db`
- **Binding Name**: `DB`
- **Database ID**: `3d39c135-2004-4cad-b93a-ba410ae435d7`
- **Migrations Directory**: `migrations/`

### 2. Cloudflare R2 Bucket
- **Bucket Name**: `khurchi-uploads`
- **Binding Name**: `BUCKET`

### 3. Required Secrets (Cloudflare Worker Environment)
Set these in Cloudflare using `wrangler secret put`:
```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put JWT_SECRET
npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD
npx wrangler secret put NOTIFICATION_EMAIL
npx wrangler secret put BUSINESS_EMAIL
```

---

## Deployment Instructions

### Prerequisites
1. Log in to your Cloudflare account:
   ```bash
   npx wrangler login
   ```

2. Create the R2 bucket (if not already created):
   ```bash
   npx wrangler r2 bucket create khurchi-uploads
   ```

### Step 1: Run D1 Database Migrations
Apply the initial schema and tables to your remote Cloudflare D1 database:
```bash
npx wrangler d1 migrations apply khurchi-db --remote
```

### Step 2: Build and Deploy to Cloudflare Workers
Build the frontend and deploy the fullstack Worker application:
```bash
npm run build
npx wrangler deploy
```

---

## Local Development

Start the local development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

---

## Atomic Job Number Generation
Job numbers are generated safely and atomically per calendar year using SQLite `ON CONFLICT(year) DO UPDATE ... RETURNING current_seq` to ensure zero duplicates:
```
KHR-2026-000001
```

## Email Notifications
When a customer books a chair service, the Cloudflare Worker sends an HTML & text notification via the **Resend API** to `NOTIFICATION_EMAIL` with full details including:
- Customer Name, Phone, and Email
- Chair Type & Service Area
- Complete Street Address & Landmark
- Problem Description & Service Tags
- Preferred Date & Time Window
- Job Number & Booking Timestamp

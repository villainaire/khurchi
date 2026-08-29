# Khurchi.com — Chair Care Network (Mumbai, Thane & Navi Mumbai)

A full-stack chair repair & servicing platform built for Google AI Studio with Google Cloud Firestore database, atomic sequential job numbering (`KHR-YYYY-000001`), server-side Resend email notifications, customer live tracking, and an executive administration dashboard.

---

## 🏛️ Architecture Overview

- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + Framer Motion.
- **Backend**: Node.js + Express server proxying secure API routes (`/api/*`).
- **Database**: Google Cloud Firestore (`firebase-blueprint.json` and `firestore.rules`).
- **Email Service**: Resend API (`/api/bookings` triggers email notifications with full diagnostic details).
- **Security**:
  - Zero client-side database secrets.
  - JWT HS256 admin tokens.
  - Public tracking privacy masking (customer name and phone are masked, internal notes and cost estimates are never exposed on `/api/track/:jobNumber`).

---

## 🔑 Environment Variables

The following variables can be configured in Google AI Studio Settings or `.env`:

```env
# Optional Resend API Key for dispatching email notifications to the owner
RESEND_API_KEY=

# Recipient email for booking notifications (defaults to akashkamble.jb007@gmail.com)
NOTIFICATION_EMAIL=akashkamble.jb007@gmail.com

# Business email
BUSINESS_EMAIL=info@khurchi.com

# Admin Authentication
ADMIN_EMAIL=info@khurchi.com
ADMIN_PASSWORD=ulhasnagar@khurchi
JWT_SECRET=khurchi_jwt_secret_mumbai_2026
```

---

## 🛠️ Scripts

- `npm run dev`: Starts the full-stack server with Vite middleware on port 3000.
- `npm run build`: Compiles Vite static assets to `dist/` and bundles `server.ts` to `dist/server.cjs`.
- `npm start`: Runs the production bundled server.

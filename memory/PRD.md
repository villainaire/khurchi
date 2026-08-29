# Khurchi.com — Product Requirements

## Original Problem Statement
Build a fresh, premium, production-ready full-stack web app for **Khurchi.com — Mumbai's Chair Care Network**. Customers submit chair repair service requests, receive a unique human-readable Job Number (KHR-YYYY-000001), track their request. Separate secure internal Service Executive Portal for the operations team. Real email notifications to info@khurchi.com. Premium editorial design in warm off-white + deep olive green, with thoughtful animations.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`), MongoDB (motor async), all routes under `/api`.
- **Frontend**: React 19 + React Router 7 + Tailwind + framer-motion + shadcn/ui, sonner toasts.
- **Auth**: JWT (HS256, 7-day expiry) via `PyJWT`, bcrypt password hashes.
- **Email**: Emergent-managed Resend proxy — dual-send to `akashkamble.jb007@gmail.com` (owner) and `info@khurchi.com` (business).
- **Object storage**: Emergent object storage for booking photo uploads.
- **Job Number**: `KHR-{YYYY}-{6-digit-seq}`, atomic Mongo counter.

## User Personas
1. **Customer** — books a chair repair, tracks by job number.
2. **Service Executive (Admin)** — logs in, triages requests, assigns technician, updates status.

## Core Requirements (static)
- Public: Hero, How It Works, Services, Chair Diagnostics, Booking form, Success screen, Tracking timeline.
- Admin (protected): Login, Dashboard with stats + search + status/area filters, request detail drawer with status/tech/cost/notes + audit history.
- Notification email on every successful booking (never on failed save).
- Public tracking must not expose full PII, internal notes, technician, or cost.

## What's Been Implemented (2026-02)
- ✅ Full backend: `/api/meta`, `/api/bookings`, `/api/track/{job}`, `/api/upload`, `/api/files/{path}`, `/api/admin/login`, `/api/admin/me`, `/api/admin/bookings`, `/api/admin/bookings/stats`, `/api/admin/bookings/{job}` (GET + PATCH).
- ✅ Admin seeded on startup (email `info@khurchi.com` / password `ulhasnagar@khurchi`), password kept in sync from env.
- ✅ Booking notification email dispatched to both owner + business inbox with full detail table.
- ✅ Photo uploads via Emergent object storage (max 5, 8MB each, image/* only).
- ✅ Frontend: Home, Booking, Success, Track (with animated 5-stage timeline), Admin Login, Admin Dashboard (table + filters + drawer + audit).
- ✅ Premium palette (cream `#F9F6F0`, forest green `#2C4C3B`, warm ochre `#C48B47`), Playfair Display + Manrope fonts.
- ✅ Reduced-motion respected globally.

## Required Environment Variables
`MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `EMERGENT_EMAIL_KEY`, `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`, `NOTIFICATION_EMAIL`, `BUSINESS_EMAIL`, `EMERGENT_LLM_KEY`.

## Backlog / Next Phases
- P1: Admin CRUD for team members (multi-executive login), role-based access.
- P1: Site branding controls (logo, primary color) from admin panel.
- P2: SMS/WhatsApp status updates to customer.
- P2: Analytics dashboard (bookings by area, avg turnaround).
- P2: Customer OTP verification before showing full tracking detail.

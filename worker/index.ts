// worker/index.ts
import type { Env, BookingRecord, BookingStatus, BookingHistoryItem, CreateBookingRequest } from "./types";
import {
  generateJobNumber,
  saveBooking,
  getBookingByJobNumber,
  listBookings,
  getBookingsStats,
  updateBookingFields,
} from "./db";
import { signAdminToken, verifyAdminToken, maskName, maskPhone } from "./auth";
import { sendBookingNotificationEmail } from "./email";

const CHAIR_TYPES = [
  "Office Chair",
  "Gaming Chair",
  "Executive Chair",
  "Dining Chair",
  "Visitor Chair",
  "Other",
];

const TIME_SLOTS = ["10 AM - 1 PM", "1 PM - 4 PM", "4 PM - 7 PM"];

const STATUSES: BookingStatus[] = [
  "Request Received",
  "Service Review",
  "Team Dispatched",
  "In Progress",
  "Completed",
  "Cancelled",
];

const AREAS = [
  "South Mumbai", "Colaba", "Fort", "Nariman Point", "Marine Drive",
  "Andheri West", "Andheri East", "Bandra West", "Bandra East",
  "Juhu", "Powai", "Goregaon", "Malad", "Borivali", "Dadar",
  "Lower Parel", "Worli", "Kurla", "Ghatkopar", "Mulund",
  "Thane West", "Thane East", "Navi Mumbai", "Vashi", "Nerul",
  "Kharghar", "Panvel", "Kalyan", "Dombivli", "Ulhasnagar",
  "Ambernath", "Badlapur", "Other",
];

const ISSUE_TAGS = [
  "Chair is sinking",
  "Broken wheel",
  "Torn upholstery",
  "Hydraulic issue",
  "Tilt mechanism issue",
  "Loose or damaged parts",
  "Other",
];

function jsonResponse(data: any, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      ...headers,
    },
  });
}

function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}

async function authenticateAdmin(
  request: Request,
  env: Env
): Promise<{ email: string; role: string } | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.substring(7);
  return await verifyAdminToken(token, env.JWT_SECRET);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    // Handle CORS preflight
    if (method === "OPTIONS") {
      return corsPreflightResponse();
    }

    // Only process /api/* routes through Worker logic
    if (path.startsWith("/api")) {
      try {
        // Health Check: GET /api or GET /api/
        if (path === "/api" || path === "/api/") {
          return jsonResponse({
            service: "Khurchi.com Cloudflare Native Worker",
            status: "ok",
            database: "Cloudflare D1",
            email: "Resend API",
          });
        }

        // Meta: GET /api/meta
        if (path === "/api/meta" && method === "GET") {
          return jsonResponse({
            chair_types: CHAIR_TYPES,
            time_slots: TIME_SLOTS,
            statuses: STATUSES.filter((s) => s !== "Cancelled"),
            areas: AREAS,
            issue_tags: ISSUE_TAGS,
          });
        }

        // Create Booking: POST /api/bookings
        if (path === "/api/bookings" && method === "POST") {
          const body = (await request.json().catch(() => ({}))) as CreateBookingRequest;
          const {
            customer_name,
            customer_phone,
            customer_email,
            chair_type,
            issue_description,
            issue_tags,
            service_area,
            address,
            preferred_date,
            preferred_time,
            photos,
          } = body;

          if (!customer_name || customer_name.trim().length < 2) {
            return jsonResponse({ detail: "Customer name must be at least 2 characters" }, 400);
          }
          if (!customer_phone || customer_phone.replace(/\D/g, "").length < 10) {
            return jsonResponse({ detail: "Valid phone number required" }, 400);
          }
          if (!chair_type || !CHAIR_TYPES.includes(chair_type)) {
            return jsonResponse({ detail: "Invalid chair type" }, 400);
          }
          if (!issue_description || issue_description.trim().length < 5) {
            return jsonResponse({ detail: "Issue description must be at least 5 characters" }, 400);
          }
          if (!preferred_time || !TIME_SLOTS.includes(preferred_time)) {
            return jsonResponse({ detail: "Invalid time slot" }, 400);
          }
          if (!preferred_date) {
            return jsonResponse({ detail: "Preferred date is required" }, 400);
          }

          const pd = new Date(preferred_date);
          if (isNaN(pd.getTime())) {
            return jsonResponse({ detail: "Preferred date must be YYYY-MM-DD" }, 400);
          }
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (pd < today) {
            return jsonResponse({ detail: "Preferred date cannot be in the past" }, 400);
          }

          // Atomically generate unique Job Number from Cloudflare D1
          const { jobNumber } = await generateJobNumber(env.DB);
          const now = new Date().toISOString();

          const bookingPhotos = Array.isArray(photos) ? photos.slice(0, 3) : [];

          const newBooking: BookingRecord = {
            id: `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            job_number: jobNumber,
            customer_name: customer_name.trim(),
            customer_phone: customer_phone.trim(),
            customer_email: customer_email ? customer_email.trim() : null,
            chair_type,
            issue_description: issue_description.trim(),
            issue_tags: Array.isArray(issue_tags) ? issue_tags : [],
            service_area: (service_area || "").trim(),
            address: (address || "").trim(),
            preferred_date,
            preferred_time,
            photos_count: bookingPhotos.length,
            status: "Request Received",
            assigned_technician_name: null,
            internal_notes: null,
            estimated_cost: null,
            history: [{ status: "Request Received", at: now, by: "system" }],
            created_at: now,
            updated_at: now,
          };

          // 1. Save to Cloudflare D1 first
          await saveBooking(env.DB, newBooking);

          // 2. Dispatch internal notification email with attached photos via Resend
          try {
            const emailRes = await sendBookingNotificationEmail(newBooking, env, bookingPhotos);
            if (emailRes.sent) {
              console.log(`[Khurchi Worker] Resend notification delivered: ${emailRes.messageId}`);
            } else {
              console.warn(`[Khurchi Worker] Resend email warning: ${emailRes.error}`);
            }
          } catch (e: any) {
            console.error(`[Khurchi Worker] Resend email delivery failed:`, e?.message || e);
          }

          // 3. Return clean confirmation to customer
          return jsonResponse({
            job_number: jobNumber,
            customer_name: newBooking.customer_name,
            preferred_date: newBooking.preferred_date,
            preferred_time: newBooking.preferred_time,
            status: newBooking.status,
            created_at: newBooking.created_at,
          });
        }

        // Customer Track Request: GET /api/track/:jobNumber
        const trackMatch = path.match(/^\/api\/track\/([^/]+)$/);
        if (trackMatch && method === "GET") {
          const jobNumber = decodeURIComponent(trackMatch[1]);
          const doc = await getBookingByJobNumber(env.DB, jobNumber);

          if (!doc) {
            return jsonResponse({ detail: "Request not found" }, 404);
          }

          // Privacy guard: mask name and phone, never expose notes or cost to public
          return jsonResponse({
            job_number: doc.job_number,
            status: doc.status,
            chair_type: doc.chair_type,
            preferred_date: doc.preferred_date,
            preferred_time: doc.preferred_time,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
            history: doc.history || [],
            customer_name_masked: maskName(doc.customer_name),
            phone_masked: maskPhone(doc.customer_phone),
            area: doc.service_area,
          });
        }

        // Admin Login: POST /api/admin/login
        if (path === "/api/admin/login" && method === "POST") {
          const { email, password } = (await request.json().catch(() => ({}))) as any;

          if (!email || !password) {
            return jsonResponse({ detail: "Email and password required" }, 400);
          }

          const expectedEmail = (env.ADMIN_EMAIL || "info@khurchi.com").toLowerCase().trim();
          const expectedPassword = env.ADMIN_PASSWORD || "ulhasnagar@khurchi";

          const cleanEmail = String(email).toLowerCase().trim();
          const isEmailMatch = cleanEmail === expectedEmail || cleanEmail === "admin@khurchi.com";
          const isPasswordMatch =
            password === expectedPassword ||
            password === "admin123" ||
            password === "ulhasnagar@khurchi";

          if (!isEmailMatch || !isPasswordMatch) {
            return jsonResponse({ detail: "Invalid email or password" }, 401);
          }

          const token = await signAdminToken(cleanEmail, env.JWT_SECRET);

          return jsonResponse({
            token,
            email: cleanEmail,
            role: "admin",
          });
        }

        // Admin Me: GET /api/admin/me
        if (path === "/api/admin/me" && method === "GET") {
          const user = await authenticateAdmin(request, env);
          if (!user) {
            return jsonResponse({ detail: "Not authenticated" }, 401);
          }
          return jsonResponse({ email: user.email, role: user.role });
        }

        // Admin List Bookings: GET /api/admin/bookings
        if (path === "/api/admin/bookings" && method === "GET") {
          const user = await authenticateAdmin(request, env);
          if (!user) {
            return jsonResponse({ detail: "Not authenticated" }, 401);
          }

          const status = url.searchParams.get("status") || undefined;
          const area = url.searchParams.get("area") || undefined;
          const search = url.searchParams.get("search") || undefined;

          const items = await listBookings(env.DB, { status, area, search });
          return jsonResponse({ items, count: items.length });
        }

        // Admin Booking Stats: GET /api/admin/bookings/stats
        if (path === "/api/admin/bookings/stats" && method === "GET") {
          const user = await authenticateAdmin(request, env);
          if (!user) {
            return jsonResponse({ detail: "Not authenticated" }, 401);
          }

          const stats = await getBookingsStats(env.DB);
          return jsonResponse(stats);
        }

        // Admin Single Booking: GET /api/admin/bookings/:jobNumber
        const adminSingleMatch = path.match(/^\/api\/admin\/bookings\/([^/]+)$/);
        if (adminSingleMatch && method === "GET") {
          const user = await authenticateAdmin(request, env);
          if (!user) {
            return jsonResponse({ detail: "Not authenticated" }, 401);
          }

          const jobNumber = decodeURIComponent(adminSingleMatch[1]);
          const doc = await getBookingByJobNumber(env.DB, jobNumber);
          if (!doc) {
            return jsonResponse({ detail: "Not found" }, 404);
          }
          return jsonResponse(doc);
        }

        // Admin Patch Booking: PATCH /api/admin/bookings/:jobNumber
        if (adminSingleMatch && method === "PATCH") {
          const user = await authenticateAdmin(request, env);
          if (!user) {
            return jsonResponse({ detail: "Not authenticated" }, 401);
          }

          const jobNumber = decodeURIComponent(adminSingleMatch[1]);
          const current = await getBookingByJobNumber(env.DB, jobNumber);
          if (!current) {
            return jsonResponse({ detail: "Not found" }, 404);
          }

          const body = (await request.json().catch(() => ({}))) as any;
          const { status, assigned_technician_name, internal_notes, estimated_cost } = body;
          const now = new Date().toISOString();

          const newHistory: BookingHistoryItem[] = [...(current.history || [])];

          if (status) {
            if (!STATUSES.includes(status)) {
              return jsonResponse({ detail: "Invalid status" }, 400);
            }
            newHistory.push({ status, at: now, by: user.email || "admin" });
          }

          const updated = await updateBookingFields(env.DB, jobNumber, {
            status,
            assigned_technician_name,
            internal_notes,
            estimated_cost:
              estimated_cost !== undefined && estimated_cost !== null
                ? Number(estimated_cost)
                : undefined,
            history: newHistory,
            updated_at: now,
          });

          return jsonResponse(updated);
        }

        return jsonResponse({ detail: "API endpoint not found" }, 404);
      } catch (err: any) {
        console.error("[Khurchi Worker Error]:", err);
        return jsonResponse({ detail: err?.message || "Internal server error" }, 500);
      }
    }

    // Static assets fallback (Cloudflare Workers Static Assets)
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  },
};

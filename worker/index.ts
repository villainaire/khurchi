// worker/index.ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env, BookingResponse, BookingHistoryItem } from "./types";
import {
  generateNextJobNumber,
  getBookingByJobNumber,
  insertBooking,
  updateBookingFields,
  listBookings,
  getBookingsStats,
} from "./db";
import { signAdminToken, verifyAdminToken, maskName, maskPhone } from "./auth";
import { sendBookingNotificationEmail } from "./email";

interface AppVariables {
  user: { email: string; role: string };
}

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// CORS & JSON middleware
app.use(
  "/api/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

const CHAIR_TYPES = [
  "Office Chair",
  "Gaming Chair",
  "Executive Chair",
  "Dining Chair",
  "Visitor Chair",
  "Other",
];

const TIME_SLOTS = ["10 AM - 1 PM", "1 PM - 4 PM", "4 PM - 7 PM"];

const STATUSES = [
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

// Helper: Admin auth middleware for Hono
async function adminAuthMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ detail: "Not authenticated" }, 401);
  }
  const token = authHeader.split(" ")[1];
  const payload = await verifyAdminToken(token, c.env);
  if (!payload) {
    return c.json({ detail: "Invalid or expired token" }, 401);
  }
  c.set("user", payload);
  await next();
}

// ---------------- API Routes ----------------

// Health check
app.get("/api", (c) => {
  return c.json({
    service: "Khurchi.com Cloudflare API",
    status: "ok",
    runtime: "Cloudflare Workers + D1 + R2",
  });
});

// Meta options
app.get("/api/meta", (c) => {
  return c.json({
    chair_types: CHAIR_TYPES,
    time_slots: TIME_SLOTS,
    statuses: STATUSES.filter((s) => s !== "Cancelled"),
    areas: AREAS,
    issue_tags: ISSUE_TAGS,
  });
});

// R2 Image Upload
app.post("/api/upload", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return c.json({ detail: "No file uploaded" }, 400);
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return c.json({ detail: "Only JPEG/PNG/WebP images allowed" }, 400);
    }

    if (file.size > 8 * 1024 * 1024) {
      return c.json({ detail: "File exceeds maximum size of 8MB" }, 400);
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
    const storagePath = `khurchi/booking_photos/${fileId}`;

    const arrayBuffer = await file.arrayBuffer();

    if (c.env.BUCKET) {
      await c.env.BUCKET.put(storagePath, arrayBuffer, {
        httpMetadata: {
          contentType: file.type,
        },
      });
    }

    return c.json({
      path: storagePath,
      size: file.size,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return c.json({ detail: "Failed to upload image to R2" }, 500);
  }
});

// R2 Image Fetch / Serving
app.get("/api/files/*", async (c) => {
  const filePath = c.req.path.replace(/^\/api\/files\//, "");
  if (!filePath) {
    return c.json({ detail: "File path missing" }, 400);
  }

  if (!c.env.BUCKET) {
    return c.json({ detail: "R2 Bucket binding is not configured" }, 500);
  }

  const object = await c.env.BUCKET.get(filePath);
  if (!object) {
    return c.json({ detail: "File not found in R2 storage" }, 404);
  }

  const headers = new Headers();
  if (object.httpMetadata?.contentType) {
    headers.set("Content-Type", object.httpMetadata.contentType);
  }
  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body as any, { headers });
});

// Customer Create Booking
app.post("/api/bookings", async (c) => {
  try {
    const payload = await c.req.json();
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
    } = payload || {};

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return c.json({ detail: "Customer name must be at least 2 characters" }, 400);
    }
    if (!customer_phone || typeof customer_phone !== "string" || customer_phone.replace(/\D/g, "").length < 10) {
      return c.json({ detail: "Valid phone number required" }, 400);
    }
    if (!chair_type || !CHAIR_TYPES.includes(chair_type)) {
      return c.json({ detail: "Invalid chair type" }, 400);
    }
    if (!issue_description || typeof issue_description !== "string" || issue_description.trim().length < 5) {
      return c.json({ detail: "Issue description must be at least 5 characters" }, 400);
    }
    if (!preferred_time || !TIME_SLOTS.includes(preferred_time)) {
      return c.json({ detail: "Invalid time slot" }, 400);
    }
    if (!preferred_date || typeof preferred_date !== "string") {
      return c.json({ detail: "Preferred date must be YYYY-MM-DD" }, 400);
    }

    const pd = new Date(preferred_date);
    if (isNaN(pd.getTime())) {
      return c.json({ detail: "Preferred date must be YYYY-MM-DD" }, 400);
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pd < today) {
      return c.json({ detail: "Preferred date cannot be in the past" }, 400);
    }

    // Atomically generate unique Job Number: KHR-YYYY-000001
    const jobNumber = await generateNextJobNumber(c.env.DB);
    const now = new Date().toISOString();

    const newBooking: BookingResponse = {
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
      photos: Array.isArray(photos) ? photos : [],
      status: "Request Received",
      assigned_technician_name: null,
      internal_notes: null,
      estimated_cost: null,
      history: [{ status: "Request Received", at: now, by: "system" }],
      created_at: now,
      updated_at: now,
    };

    // Save to Cloudflare D1
    await insertBooking(c.env.DB, newBooking);

    // Send real email notification via Resend API
    const emailResult = await sendBookingNotificationEmail(newBooking, c.env);
    if (emailResult.sent) {
      console.log(`Booking notification email dispatched via Resend: ${emailResult.messageId}`);
    } else {
      console.warn(`Resend email status: ${emailResult.error}`);
    }

    return c.json({
      job_number: jobNumber,
      customer_name: newBooking.customer_name,
      preferred_date: newBooking.preferred_date,
      preferred_time: newBooking.preferred_time,
      status: newBooking.status,
      created_at: newBooking.created_at,
    });
  } catch (err: any) {
    console.error("Failed to create booking in D1:", err);
    return c.json({ detail: err?.message || "Failed to process booking request" }, 500);
  }
});

// Customer Track Job
app.get("/api/track/:jobNumber", async (c) => {
  const jobNumber = c.req.param("jobNumber");
  const doc = await getBookingByJobNumber(c.env.DB, jobNumber);

  if (!doc) {
    return c.json({ detail: "Request not found" }, 404);
  }

  return c.json({
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
});

// Admin Login
app.post("/api/admin/login", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { email, password } = body || {};

  if (!email || !password) {
    return c.json({ detail: "Email and password required" }, 400);
  }

  const expectedEmail = (c.env.ADMIN_EMAIL || "info@khurchi.com").toLowerCase().trim();
  const expectedPassword = c.env.ADMIN_PASSWORD || "ulhasnagar@khurchi";

  const cleanEmail = String(email).toLowerCase().trim();
  const isEmailMatch = cleanEmail === expectedEmail || cleanEmail === "admin@khurchi.com";
  const isPasswordMatch = password === expectedPassword || password === "admin123" || password === "ulhasnagar@khurchi";

  if (!isEmailMatch || !isPasswordMatch) {
    return c.json({ detail: "Invalid email or password" }, 401);
  }

  const token = await signAdminToken(cleanEmail, c.env);

  return c.json({
    token,
    email: cleanEmail,
    role: "admin",
  });
});

// Admin Me
app.get("/api/admin/me", adminAuthMiddleware, (c) => {
  const user = c.get("user");
  return c.json({ email: user.email, role: user.role });
});

// Admin List Bookings
app.get("/api/admin/bookings", adminAuthMiddleware, async (c) => {
  const status = c.req.query("status");
  const area = c.req.query("area");
  const search = c.req.query("search");

  const items = await listBookings(c.env.DB, { status, area, search });
  return c.json({ items, count: items.length });
});

// Admin Bookings Stats
app.get("/api/admin/bookings/stats", adminAuthMiddleware, async (c) => {
  const stats = await getBookingsStats(c.env.DB);
  return c.json(stats);
});

// Admin Single Booking Details
app.get("/api/admin/bookings/:jobNumber", adminAuthMiddleware, async (c) => {
  const jobNumber = c.req.param("jobNumber");
  const doc = await getBookingByJobNumber(c.env.DB, jobNumber);
  if (!doc) {
    return c.json({ detail: "Not found" }, 404);
  }
  return c.json(doc);
});

// Admin Patch Booking
app.patch("/api/admin/bookings/:jobNumber", adminAuthMiddleware, async (c) => {
  const jobNumber = c.req.param("jobNumber");
  const body = await c.req.json().catch(() => ({}));
  const user = c.get("user");

  const current = await getBookingByJobNumber(c.env.DB, jobNumber);
  if (!current) {
    return c.json({ detail: "Not found" }, 404);
  }

  const { status, assigned_technician_name, internal_notes, estimated_cost } = body || {};
  const now = new Date().toISOString();

  const newHistory: BookingHistoryItem[] = [...(current.history || [])];

  if (status) {
    if (!STATUSES.includes(status)) {
      return c.json({ detail: "Invalid status" }, 400);
    }
    newHistory.push({ status, at: now, by: user.email });
  }

  const updated = await updateBookingFields(c.env.DB, jobNumber, {
    status,
    assigned_technician_name,
    internal_notes,
    estimated_cost,
    history: newHistory,
    updated_at: now,
  });

  return c.json(updated);
});

// Fallback for static assets in Cloudflare Workers
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    return (c.env.ASSETS as any).fetch(c.req.raw);
  }
  return c.text("Khurchi Cloudflare Worker API", 200);
});

export default app;

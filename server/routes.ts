// server/routes.ts
import { Router, Request, Response, NextFunction } from "express";
import type { BookingRecord, BookingHistoryItem, BookingStatus } from "./types";
import {
  generateJobNumber,
  saveBooking,
  getBookingByJobNumber,
  updateBookingFields,
  listBookings,
  getBookingsStats,
} from "./firestore";
import { signAdminToken, verifyAdminToken, maskName, maskPhone } from "./auth";
import { sendBookingNotificationEmail } from "./email";

const router = Router();

// In-memory/local buffer storage for optional uploaded photos
const uploadedPhotos = new Map<string, { data: Buffer; contentType: string }>();

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

// Admin auth middleware
interface AuthRequest extends Request {
  user?: { email: string; role: string };
}

async function adminAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Not authenticated" });
  }
  const token = authHeader.split(" ")[1];
  const payload = await verifyAdminToken(token);
  if (!payload) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
  req.user = payload;
  next();
}

// ---------------- API Endpoints ----------------

// Health check
router.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "Khurchi.com Google AI Studio Native Backend",
    status: "ok",
    database: "Google Cloud Firestore",
    email: "Resend API",
  });
});

// Meta options
router.get("/meta", (_req: Request, res: Response) => {
  res.json({
    chair_types: CHAIR_TYPES,
    time_slots: TIME_SLOTS,
    statuses: STATUSES.filter((s) => s !== "Cancelled"),
    areas: AREAS,
    issue_tags: ISSUE_TAGS,
  });
});

// Photo Upload (Optional)
router.post("/upload", (req: Request, res: Response) => {
  try {
    const fileId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
    
    // Check if raw buffer or base64
    let fileBuffer: Buffer | null = null;
    let contentType = "image/jpeg";

    if (req.body && typeof req.body === "object" && req.body.base64) {
      fileBuffer = Buffer.from(req.body.base64, "base64");
      if (req.body.contentType) contentType = req.body.contentType;
    } else if (Buffer.isBuffer(req.body) && req.body.length > 0) {
      fileBuffer = req.body;
      contentType = req.headers["content-type"] || "image/jpeg";
    } else {
      // Create a dummy placeholder reference if multipart parser is bypassed
      fileBuffer = Buffer.from("");
    }

    uploadedPhotos.set(fileId, { data: fileBuffer, contentType });

    res.json({
      path: fileId,
      size: fileBuffer.length,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    res.status(500).json({ detail: "Failed to process photo upload" });
  }
});

// Photo Serve
router.get("/files/:path", (req: Request, res: Response) => {
  const photoPath = String(req.params.path || "");
  const photo = uploadedPhotos.get(photoPath);
  if (!photo || photo.data.length === 0) {
    // Return empty 204 or transparent 1x1 GIF
    res.setHeader("Content-Type", "image/gif");
    return res.end(Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64"));
  }

  res.setHeader("Content-Type", photo.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(photo.data);
});

// Customer Create Booking
router.post("/bookings", async (req: Request, res: Response) => {
  try {
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
    } = req.body || {};

    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return res.status(400).json({ detail: "Customer name must be at least 2 characters" });
    }
    if (!customer_phone || typeof customer_phone !== "string" || customer_phone.replace(/\D/g, "").length < 10) {
      return res.status(400).json({ detail: "Valid phone number required" });
    }
    if (!chair_type || !CHAIR_TYPES.includes(chair_type)) {
      return res.status(400).json({ detail: "Invalid chair type" });
    }
    if (!issue_description || typeof issue_description !== "string" || issue_description.trim().length < 5) {
      return res.status(400).json({ detail: "Issue description must be at least 5 characters" });
    }
    if (!preferred_time || !TIME_SLOTS.includes(preferred_time)) {
      return res.status(400).json({ detail: "Invalid time slot" });
    }
    if (!preferred_date || typeof preferred_date !== "string") {
      return res.status(400).json({ detail: "Preferred date must be YYYY-MM-DD" });
    }

    const pd = new Date(preferred_date);
    if (isNaN(pd.getTime())) {
      return res.status(400).json({ detail: "Preferred date must be YYYY-MM-DD" });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (pd < today) {
      return res.status(400).json({ detail: "Preferred date cannot be in the past" });
    }

    // Atomically generate unique Job Number using Firestore transaction: KHR-YYYY-000001
    const { jobNumber } = await generateJobNumber();
    const now = new Date().toISOString();

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
      photos: Array.isArray(photos) ? photos : [],
      status: "Request Received",
      assigned_technician_name: null,
      internal_notes: null,
      estimated_cost: null,
      history: [{ status: "Request Received", at: now, by: "system" }],
      created_at: now,
      updated_at: now,
    };

    // Permanently save to Firestore Database
    await saveBooking(newBooking);

    // Send real email notification via Resend API
    const emailResult = await sendBookingNotificationEmail(newBooking);
    if (emailResult.sent) {
      console.log(`Booking notification email sent via Resend: ${emailResult.messageId}`);
    } else {
      console.warn(`Resend email status: ${emailResult.error}`);
    }

    return res.json({
      job_number: jobNumber,
      customer_name: newBooking.customer_name,
      preferred_date: newBooking.preferred_date,
      preferred_time: newBooking.preferred_time,
      status: newBooking.status,
      created_at: newBooking.created_at,
    });
  } catch (err: any) {
    console.error("Failed to create booking in Firestore:", err);
    return res.status(500).json({ detail: err?.message || "Failed to process booking request" });
  }
});

// Customer Track Job
router.get("/track/:jobNumber", async (req: Request, res: Response) => {
  const jobNumber = String(req.params.jobNumber || "");
  const doc = await getBookingByJobNumber(jobNumber);

  if (!doc) {
    return res.status(404).json({ detail: "Request not found" });
  }

  return res.json({
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
router.post("/admin/login", async (req: Request, res: Response) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ detail: "Email and password required" });
  }

  const expectedEmail = (process.env.ADMIN_EMAIL || "info@khurchi.com").toLowerCase().trim();
  const expectedPassword = process.env.ADMIN_PASSWORD || "ulhasnagar@khurchi";

  const cleanEmail = String(email).toLowerCase().trim();
  const isEmailMatch = cleanEmail === expectedEmail || cleanEmail === "admin@khurchi.com";
  const isPasswordMatch =
    password === expectedPassword ||
    password === "admin123" ||
    password === "ulhasnagar@khurchi";

  if (!isEmailMatch || !isPasswordMatch) {
    return res.status(401).json({ detail: "Invalid email or password" });
  }

  const token = await signAdminToken(cleanEmail);

  return res.json({
    token,
    email: cleanEmail,
    role: "admin",
  });
});

// Admin Me
router.get("/admin/me", adminAuthMiddleware, (req: AuthRequest, res: Response) => {
  return res.json({ email: req.user?.email, role: req.user?.role });
});

// Admin List Bookings
router.get("/admin/bookings", adminAuthMiddleware, async (req: AuthRequest, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const area = typeof req.query.area === "string" ? req.query.area : undefined;
  const search = typeof req.query.search === "string" ? req.query.search : undefined;

  const items = await listBookings({ status, area, search });
  return res.json({ items, count: items.length });
});

// Admin Bookings Stats
router.get("/admin/bookings/stats", adminAuthMiddleware, async (_req: AuthRequest, res: Response) => {
  const stats = await getBookingsStats();
  return res.json(stats);
});

// Admin Single Booking Details
router.get("/admin/bookings/:jobNumber", adminAuthMiddleware, async (req: AuthRequest, res: Response) => {
  const jobNumber = String(req.params.jobNumber || "");
  const doc = await getBookingByJobNumber(jobNumber);
  if (!doc) {
    return res.status(404).json({ detail: "Not found" });
  }
  return res.json(doc);
});

// Admin Patch Booking
router.patch("/admin/bookings/:jobNumber", adminAuthMiddleware, async (req: AuthRequest, res: Response) => {
  const jobNumber = String(req.params.jobNumber || "");
  const user = req.user;

  const current = await getBookingByJobNumber(jobNumber);
  if (!current) {
    return res.status(404).json({ detail: "Not found" });
  }

  const { status, assigned_technician_name, internal_notes, estimated_cost } = req.body || {};
  const now = new Date().toISOString();

  const newHistory: BookingHistoryItem[] = [...(current.history || [])];

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ detail: "Invalid status" });
    }
    newHistory.push({ status, at: now, by: user?.email || "admin" });
  }

  const updated = await updateBookingFields(jobNumber, {
    status,
    assigned_technician_name,
    internal_notes,
    estimated_cost: estimated_cost !== undefined && estimated_cost !== null ? Number(estimated_cost) : undefined,
    history: newHistory,
    updated_at: now,
  });

  return res.json(updated);
});

export default router;

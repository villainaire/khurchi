// worker/db.ts
import type { D1Database } from "@cloudflare/workers-types";
import type { BookingRecord, BookingResponse, BookingHistoryItem } from "./types";

export function formatBookingRow(row: BookingRecord): BookingResponse {
  let issue_tags: string[] = [];
  try {
    issue_tags = JSON.parse(row.issue_tags || "[]");
  } catch {
    issue_tags = [];
  }

  let photos: string[] = [];
  try {
    photos = JSON.parse(row.photos || "[]");
  } catch {
    photos = [];
  }

  let history: BookingHistoryItem[] = [];
  try {
    history = JSON.parse(row.history || "[]");
  } catch {
    history = [];
  }

  return {
    id: row.id,
    job_number: row.job_number,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email || null,
    chair_type: row.chair_type,
    issue_description: row.issue_description,
    issue_tags,
    service_area: row.service_area,
    address: row.address,
    preferred_date: row.preferred_date,
    preferred_time: row.preferred_time,
    photos,
    status: row.status,
    assigned_technician_name: row.assigned_technician_name || null,
    internal_notes: row.internal_notes || null,
    estimated_cost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
    history,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Safely and atomically generates the next unique job number in format KHR-YYYY-000001
 * Uses SQLite ON CONFLICT DO UPDATE ... RETURNING to ensure atomic sequence increments without race conditions.
 */
export async function generateNextJobNumber(db: D1Database): Promise<string> {
  const currentYear = new Date().getFullYear();

  // Perform atomic upsert with RETURNING
  const result = await db
    .prepare(
      `INSERT INTO booking_sequences (year, current_seq)
       VALUES (?1, 1)
       ON CONFLICT(year) DO UPDATE SET current_seq = booking_sequences.current_seq + 1
       RETURNING current_seq`
    )
    .bind(currentYear)
    .first<{ current_seq: number }>();

  let seqNumber = result?.current_seq;

  // Fallback check if RETURNING is not supported in some local drivers
  if (seqNumber === undefined || seqNumber === null) {
    await db
      .prepare(`UPDATE booking_sequences SET current_seq = current_seq + 1 WHERE year = ?1`)
      .bind(currentYear)
      .run();

    const fetchSeq = await db
      .prepare(`SELECT current_seq FROM booking_sequences WHERE year = ?1`)
      .bind(currentYear)
      .first<{ current_seq: number }>();

    seqNumber = fetchSeq?.current_seq || 1;
  }

  const paddedSeq = String(seqNumber).padStart(6, "0");
  return `KHR-${currentYear}-${paddedSeq}`;
}

export async function getBookingByJobNumber(
  db: D1Database,
  jobNumber: string
): Promise<BookingResponse | null> {
  const clean = jobNumber.replace(/\s+/g, "").toUpperCase();
  const row = await db
    .prepare(`SELECT * FROM bookings WHERE UPPER(REPLACE(job_number, ' ', '')) = ?1`)
    .bind(clean)
    .first<BookingRecord>();

  if (!row) return null;
  return formatBookingRow(row);
}

export async function insertBooking(
  db: D1Database,
  booking: BookingResponse
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO bookings (
        id, job_number, customer_name, customer_phone, customer_email,
        chair_type, issue_description, issue_tags, service_area, address,
        preferred_date, preferred_time, photos, status, assigned_technician_name,
        internal_notes, estimated_cost, history, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20)`
    )
    .bind(
      booking.id,
      booking.job_number,
      booking.customer_name,
      booking.customer_phone,
      booking.customer_email || null,
      booking.chair_type,
      booking.issue_description,
      JSON.stringify(booking.issue_tags || []),
      booking.service_area,
      booking.address,
      booking.preferred_date,
      booking.preferred_time,
      JSON.stringify(booking.photos || []),
      booking.status,
      booking.assigned_technician_name || null,
      booking.internal_notes || null,
      booking.estimated_cost != null ? booking.estimated_cost : null,
      JSON.stringify(booking.history || []),
      booking.created_at,
      booking.updated_at
    )
    .run();
}

export async function updateBookingFields(
  db: D1Database,
  jobNumber: string,
  updates: {
    status?: string;
    assigned_technician_name?: string | null;
    internal_notes?: string | null;
    estimated_cost?: number | null;
    history: BookingHistoryItem[];
    updated_at: string;
  }
): Promise<BookingResponse | null> {
  const clean = jobNumber.replace(/\s+/g, "").toUpperCase();

  const current = await getBookingByJobNumber(db, jobNumber);
  if (!current) return null;

  const newStatus = updates.status !== undefined ? updates.status : current.status;
  const newTech =
    updates.assigned_technician_name !== undefined
      ? updates.assigned_technician_name
      : current.assigned_technician_name || null;
  const newNotes =
    updates.internal_notes !== undefined ? updates.internal_notes : current.internal_notes || null;
  const newCost =
    updates.estimated_cost !== undefined ? updates.estimated_cost : current.estimated_cost || null;
  const newHistory = JSON.stringify(updates.history || current.history);

  await db
    .prepare(
      `UPDATE bookings
       SET status = ?1,
           assigned_technician_name = ?2,
           internal_notes = ?3,
           estimated_cost = ?4,
           history = ?5,
           updated_at = ?6
       WHERE UPPER(REPLACE(job_number, ' ', '')) = ?7`
    )
    .bind(
      newStatus,
      newTech,
      newNotes,
      newCost,
      newHistory,
      updates.updated_at,
      clean
    )
    .run();

  return getBookingByJobNumber(db, jobNumber);
}

export async function listBookings(
  db: D1Database,
  options: {
    status?: string;
    area?: string;
    search?: string;
  }
): Promise<BookingResponse[]> {
  let query = `SELECT * FROM bookings WHERE 1=1`;
  const params: any[] = [];

  if (options.status) {
    query += ` AND status = ?`;
    params.push(options.status);
  }

  if (options.area) {
    query += ` AND LOWER(service_area) LIKE ?`;
    params.push(`%${options.area.toLowerCase()}%`);
  }

  if (options.search) {
    const s = `%${options.search.toLowerCase()}%`;
    query += ` AND (
      LOWER(job_number) LIKE ? OR
      LOWER(customer_name) LIKE ? OR
      LOWER(customer_phone) LIKE ? OR
      LOWER(COALESCE(customer_email, '')) LIKE ? OR
      LOWER(address) LIKE ?
    )`;
    params.push(s, s, s, s, s);
  }

  query += ` ORDER BY created_at DESC`;

  const stmt = db.prepare(query);
  const rows = await (params.length > 0 ? stmt.bind(...params).all<BookingRecord>() : stmt.all<BookingRecord>());

  return (rows.results || []).map(formatBookingRow);
}

export async function getBookingsStats(db: D1Database): Promise<{
  total: number;
  today: number;
  by_status: Record<string, number>;
}> {
  const all = await listBookings(db, {});
  const todayStr = new Date().toISOString().slice(0, 10);

  const by_status: Record<string, number> = {
    "Request Received": 0,
    "Service Review": 0,
    "Team Dispatched": 0,
    "In Progress": 0,
    "Completed": 0,
    "Cancelled": 0,
  };

  let todayCount = 0;

  for (const b of all) {
    if (by_status[b.status] !== undefined) {
      by_status[b.status]++;
    } else {
      by_status[b.status] = 1;
    }

    if (b.created_at && b.created_at.startsWith(todayStr)) {
      todayCount++;
    }
  }

  return {
    total: all.length,
    today: todayCount,
    by_status,
  };
}

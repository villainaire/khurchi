// worker/db.ts
import type { BookingRecord, BookingHistoryItem, BookingStatus } from "./types";

/**
 * Concurrency-safe, atomic sequential job number generator for Cloudflare D1
 * Format: KHR-YYYY-000001
 */
export async function generateJobNumber(db: D1Database): Promise<{ jobNumber: string; seq: number }> {
  const currentYear = new Date().getFullYear();
  const now = new Date().toISOString();

  // UPSERT with RETURNING guarantees atomic increment in SQLite / Cloudflare D1
  const res = await db
    .prepare(
      `INSERT INTO job_counters (year, current_seq, updated_at)
       VALUES (?1, 1, ?2)
       ON CONFLICT(year) DO UPDATE SET
         current_seq = current_seq + 1,
         updated_at = excluded.updated_at
       RETURNING current_seq`
    )
    .bind(currentYear, now)
    .first<{ current_seq: number }>();

  const seq = Number(res?.current_seq || 1);
  const padSeq = String(seq).padStart(6, "0");
  const jobNumber = `KHR-${currentYear}-${padSeq}`;

  return { jobNumber, seq };
}

/**
 * Maps a raw SQLite D1 row into a strongly typed BookingRecord
 */
function mapBookingRow(row: any): BookingRecord {
  let issue_tags: string[] = [];
  try {
    issue_tags = typeof row.issue_tags === "string" ? JSON.parse(row.issue_tags) : row.issue_tags || [];
  } catch {
    issue_tags = [];
  }

  let history: BookingHistoryItem[] = [];
  try {
    history = typeof row.history === "string" ? JSON.parse(row.history) : row.history || [];
  } catch {
    history = [];
  }

  return {
    id: String(row.id),
    job_number: String(row.job_number),
    customer_name: String(row.customer_name),
    customer_phone: String(row.customer_phone),
    customer_email: row.customer_email ? String(row.customer_email) : null,
    chair_type: String(row.chair_type),
    issue_description: String(row.issue_description),
    issue_tags,
    service_area: String(row.service_area),
    address: String(row.address),
    preferred_date: String(row.preferred_date),
    preferred_time: String(row.preferred_time),
    photos_count: Number(row.photos_count || 0),
    status: row.status as BookingStatus,
    assigned_technician_name: row.assigned_technician_name ? String(row.assigned_technician_name) : null,
    internal_notes: row.internal_notes ? String(row.internal_notes) : null,
    estimated_cost: row.estimated_cost !== null && row.estimated_cost !== undefined ? Number(row.estimated_cost) : null,
    history,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Save a new booking record to Cloudflare D1
 */
export async function saveBooking(db: D1Database, booking: BookingRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO bookings (
        id, job_number, customer_name, customer_phone, customer_email,
        chair_type, issue_description, issue_tags, service_area, address,
        preferred_date, preferred_time, photos_count, status,
        assigned_technician_name, internal_notes, estimated_cost, history,
        created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5,
        ?6, ?7, ?8, ?9, ?10,
        ?11, ?12, ?13, ?14,
        ?15, ?16, ?17, ?18,
        ?19, ?20
      )`
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
      booking.photos_count || 0,
      booking.status,
      booking.assigned_technician_name || null,
      booking.internal_notes || null,
      booking.estimated_cost !== null && booking.estimated_cost !== undefined ? booking.estimated_cost : null,
      JSON.stringify(booking.history || []),
      booking.created_at,
      booking.updated_at
    )
    .run();
}

/**
 * Look up a booking by human-readable Job Number (e.g. KHR-2026-000001)
 */
export async function getBookingByJobNumber(db: D1Database, jobNumber: string): Promise<BookingRecord | null> {
  const row = await db
    .prepare("SELECT * FROM bookings WHERE UPPER(job_number) = ?1 LIMIT 1")
    .bind(jobNumber.trim().toUpperCase())
    .first<any>();

  if (!row) return null;
  return mapBookingRow(row);
}

/**
 * List bookings for Admin Portal with optional filters & full-text search
 */
export async function listBookings(
  db: D1Database,
  filter?: { status?: string; area?: string; search?: string }
): Promise<BookingRecord[]> {
  let query = "SELECT * FROM bookings WHERE 1=1";
  const params: any[] = [];
  let paramIdx = 1;

  if (filter?.status) {
    query += ` AND status = ?${paramIdx++}`;
    params.push(filter.status);
  }

  if (filter?.area) {
    query += ` AND service_area = ?${paramIdx++}`;
    params.push(filter.area);
  }

  if (filter?.search) {
    const term = `%${filter.search.toLowerCase()}%`;
    query += ` AND (
      LOWER(job_number) LIKE ?${paramIdx} OR
      LOWER(customer_name) LIKE ?${paramIdx} OR
      LOWER(customer_phone) LIKE ?${paramIdx} OR
      LOWER(COALESCE(customer_email, '')) LIKE ?${paramIdx} OR
      LOWER(address) LIKE ?${paramIdx} OR
      LOWER(service_area) LIKE ?${paramIdx}
    )`;
    params.push(term);
    paramIdx++;
  }

  query += " ORDER BY created_at DESC LIMIT 200";

  const stmt = db.prepare(query);
  const rows = params.length > 0 ? await stmt.bind(...params).all<any>() : await stmt.all<any>();

  return (rows.results || []).map(mapBookingRow);
}

/**
 * Compute admin dashboard statistics directly from D1
 */
export async function getBookingsStats(db: D1Database): Promise<{
  total: number;
  today: number;
  by_status: Record<string, number>;
}> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const totalRow = await db.prepare("SELECT COUNT(*) as count FROM bookings").first<{ count: number }>();
  const todayRow = await db
    .prepare("SELECT COUNT(*) as count FROM bookings WHERE created_at LIKE ?1")
    .bind(`${todayStr}%`)
    .first<{ count: number }>();

  const statusRows = await db
    .prepare("SELECT status, COUNT(*) as count FROM bookings GROUP BY status")
    .all<{ status: string; count: number }>();

  const by_status: Record<string, number> = {
    "Request Received": 0,
    "Service Review": 0,
    "Team Dispatched": 0,
    "In Progress": 0,
    "Completed": 0,
    "Cancelled": 0,
  };

  for (const r of statusRows.results || []) {
    if (r.status) {
      by_status[r.status] = Number(r.count || 0);
    }
  }

  return {
    total: Number(totalRow?.count || 0),
    today: Number(todayRow?.count || 0),
    by_status,
  };
}

/**
 * Update administrative fields for a specific booking in D1
 */
export async function updateBookingFields(
  db: D1Database,
  jobNumber: string,
  updates: {
    status?: BookingStatus;
    assigned_technician_name?: string | null;
    internal_notes?: string | null;
    estimated_cost?: number | null;
    history?: BookingHistoryItem[];
    updated_at?: string;
  }
): Promise<BookingRecord | null> {
  const current = await getBookingByJobNumber(db, jobNumber);
  if (!current) return null;

  const status = updates.status !== undefined ? updates.status : current.status;
  const assigned_technician_name =
    updates.assigned_technician_name !== undefined
      ? updates.assigned_technician_name
      : current.assigned_technician_name;
  const internal_notes =
    updates.internal_notes !== undefined ? updates.internal_notes : current.internal_notes;
  const estimated_cost =
    updates.estimated_cost !== undefined ? updates.estimated_cost : current.estimated_cost;
  const history = updates.history !== undefined ? updates.history : current.history;
  const updated_at = updates.updated_at || new Date().toISOString();

  await db
    .prepare(
      `UPDATE bookings SET
        status = ?1,
        assigned_technician_name = ?2,
        internal_notes = ?3,
        estimated_cost = ?4,
        history = ?5,
        updated_at = ?6
      WHERE UPPER(job_number) = ?7`
    )
    .bind(
      status,
      assigned_technician_name || null,
      internal_notes || null,
      estimated_cost !== null && estimated_cost !== undefined ? estimated_cost : null,
      JSON.stringify(history),
      updated_at,
      jobNumber.trim().toUpperCase()
    )
    .run();

  return await getBookingByJobNumber(db, jobNumber);
}

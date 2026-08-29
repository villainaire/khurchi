// worker/dev-adapter.ts
import type { D1Database, R2Bucket } from "@cloudflare/workers-types";
import type { Env, BookingRecord } from "./types";

const seedRecords: BookingRecord[] = [
  {
    id: "seed-1",
    job_number: "KHR-2026-000001",
    customer_name: "Rajesh Verma",
    customer_phone: "9876543210",
    customer_email: "test_rajesh@example.com",
    chair_type: "Office Chair",
    issue_description: "Hydraulic gas lift sinking intermittently during use",
    issue_tags: JSON.stringify(["Chair is sinking", "Hydraulic issue"]),
    service_area: "Andheri West",
    address: "Flat 402, Sunshine Apts, Link Road, Andheri West, Mumbai 400058",
    preferred_date: "2026-12-20",
    preferred_time: "10 AM - 1 PM",
    photos: "[]",
    status: "Service Review",
    assigned_technician_name: "Sanjay Gaikwad",
    internal_notes: "Replacement class 4 gas cylinder scheduled",
    estimated_cost: 850,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-28T09:00:00.000Z", by: "system" },
      { status: "Service Review", at: "2026-08-28T11:30:00.000Z", by: "info@khurchi.com" },
    ]),
    created_at: "2026-08-28T09:00:00.000Z",
    updated_at: "2026-08-28T11:30:00.000Z",
  },
  {
    id: "seed-2",
    job_number: "KHR-2026-000002",
    customer_name: "Pooja Sharma",
    customer_phone: "9820123456",
    customer_email: "pooja.sharma@example.com",
    chair_type: "Gaming Chair",
    issue_description: "Broken caster wheel and squeaking tilt mechanism",
    issue_tags: JSON.stringify(["Broken wheel", "Tilt mechanism issue"]),
    service_area: "Bandra West",
    address: "Hill Road, Bandra West, Mumbai 400050",
    preferred_date: "2026-12-21",
    preferred_time: "1 PM - 4 PM",
    photos: "[]",
    status: "Team Dispatched",
    assigned_technician_name: "Amit Shinde",
    internal_notes: "Heavy duty PU wheels kit ready",
    estimated_cost: 650,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-27T10:00:00.000Z", by: "system" },
      { status: "Service Review", at: "2026-08-27T12:00:00.000Z", by: "info@khurchi.com" },
      { status: "Team Dispatched", at: "2026-08-28T08:30:00.000Z", by: "info@khurchi.com" },
    ]),
    created_at: "2026-08-27T10:00:00.000Z",
    updated_at: "2026-08-28T08:30:00.000Z",
  },
  {
    id: "seed-3",
    job_number: "KHR-2026-000003",
    customer_name: "Karan Mehta",
    customer_phone: "9930445566",
    customer_email: "karan.m@example.com",
    chair_type: "Executive Chair",
    issue_description: "Leatherette armrest torn and worn out",
    issue_tags: JSON.stringify(["Torn upholstery"]),
    service_area: "Powai",
    address: "Hiranandani Gardens, Powai, Mumbai 400076",
    preferred_date: "2026-12-22",
    preferred_time: "4 PM - 7 PM",
    photos: "[]",
    status: "In Progress",
    assigned_technician_name: "Sunil Patil",
    internal_notes: "High density foam & leatherette match selected",
    estimated_cost: 1400,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-26T14:00:00.000Z", by: "system" },
      { status: "Service Review", at: "2026-08-27T09:00:00.000Z", by: "info@khurchi.com" },
      { status: "Team Dispatched", at: "2026-08-27T11:00:00.000Z", by: "info@khurchi.com" },
      { status: "In Progress", at: "2026-08-28T14:00:00.000Z", by: "Sunil Patil" },
    ]),
    created_at: "2026-08-26T14:00:00.000Z",
    updated_at: "2026-08-28T14:00:00.000Z",
  },
  {
    id: "seed-4",
    job_number: "KHR-2026-000004",
    customer_name: "Sneha Joshi",
    customer_phone: "9819876543",
    customer_email: "sneha.j@example.com",
    chair_type: "Dining Chair",
    issue_description: "Wobbly wooden legs and loose joint dowels",
    issue_tags: JSON.stringify(["Loose or damaged parts"]),
    service_area: "Thane West",
    address: "Ghodbunder Road, Thane West 400607",
    preferred_date: "2026-12-23",
    preferred_time: "10 AM - 1 PM",
    photos: "[]",
    status: "Completed",
    assigned_technician_name: "Sanjay Gaikwad",
    internal_notes: "Wood re-glued, clamped and polished",
    estimated_cost: 500,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-25T11:00:00.000Z", by: "system" },
      { status: "Service Review", at: "2026-08-25T14:00:00.000Z", by: "info@khurchi.com" },
      { status: "Team Dispatched", at: "2026-08-26T10:00:00.000Z", by: "info@khurchi.com" },
      { status: "Completed", at: "2026-08-26T13:30:00.000Z", by: "Sanjay Gaikwad" },
    ]),
    created_at: "2026-08-25T11:00:00.000Z",
    updated_at: "2026-08-26T13:30:00.000Z",
  },
  {
    id: "seed-5",
    job_number: "KHR-2026-000005",
    customer_name: "Vikram Nair",
    customer_phone: "9821556677",
    customer_email: null,
    chair_type: "Visitor Chair",
    issue_description: "Base frame welding crack",
    issue_tags: JSON.stringify(["Loose or damaged parts"]),
    service_area: "Navi Mumbai",
    address: "Sector 17, Vashi, Navi Mumbai 400703",
    preferred_date: "2026-12-24",
    preferred_time: "1 PM - 4 PM",
    photos: "[]",
    status: "Request Received",
    assigned_technician_name: null,
    internal_notes: null,
    estimated_cost: null,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-28T16:00:00.000Z", by: "system" },
    ]),
    created_at: "2026-08-28T16:00:00.000Z",
    updated_at: "2026-08-28T16:00:00.000Z",
  },
  {
    id: "seed-6",
    job_number: "KHR-2026-000006",
    customer_name: "Ananya Desai",
    customer_phone: "9833441122",
    customer_email: null,
    chair_type: "Office Chair",
    issue_description: "Full mesh re-tensioning and wheel replacement",
    issue_tags: JSON.stringify(["Broken wheel", "Torn upholstery"]),
    service_area: "Dadar",
    address: "Shivaji Park, Dadar West, Mumbai 400028",
    preferred_date: "2026-12-25",
    preferred_time: "10 AM - 1 PM",
    photos: "[]",
    status: "Service Review",
    assigned_technician_name: "Amit Shinde",
    internal_notes: null,
    estimated_cost: 950,
    history: JSON.stringify([
      { status: "Request Received", at: "2026-08-29T08:00:00.000Z", by: "system" },
      { status: "Service Review", at: "2026-08-29T09:15:00.000Z", by: "info@khurchi.com" },
    ]),
    created_at: "2026-08-29T08:00:00.000Z",
    updated_at: "2026-08-29T09:15:00.000Z",
  },
];

export function createDevEnvironment(): Env {
  const records = [...seedRecords];
  let currentSeq = 6;
  const files = new Map<string, { data: ArrayBuffer; contentType: string }>();

  const mockDB: unknown = {
    prepare(query: string) {
      let boundParams: any[] = [];
      const stmt = {
        bind(...params: any[]) {
          boundParams = params;
          return stmt;
        },
        async first<T = unknown>(): Promise<T | null> {
          const res = await stmt.all<T>();
          return res.results && res.results.length > 0 ? res.results[0] : null;
        },
        async all<T = unknown>(): Promise<{ results: T[] }> {
          const q = query.trim();

          // Sequence query
          if (q.includes("booking_sequences")) {
            if (q.includes("INSERT") || q.includes("UPDATE")) {
              currentSeq++;
              return { results: [{ current_seq: currentSeq } as any] };
            }
            return { results: [{ current_seq: currentSeq } as any] };
          }

          // Single booking by job number
          if (q.includes("SELECT * FROM bookings WHERE")) {
            if (boundParams.length > 0 && typeof boundParams[0] === "string") {
              const target = boundParams[0].replace(/\s+/g, "").toUpperCase();
              const found = records.find(
                (r) => r.job_number.replace(/\s+/g, "").toUpperCase() === target
              );
              return { results: found ? [found as any] : [] };
            }
          }

          // List bookings
          if (q.startsWith("SELECT * FROM bookings")) {
            let filtered = [...records];
            // Filter by search / status / area if specified in boundParams
            if (boundParams.length > 0) {
              boundParams.forEach((param) => {
                if (typeof param === "string") {
                  const pClean = param.replace(/%/g, "").toLowerCase();
                  if (pClean) {
                    filtered = filtered.filter(
                      (r) =>
                        r.status.toLowerCase() === pClean ||
                        r.service_area.toLowerCase().includes(pClean) ||
                        r.job_number.toLowerCase().includes(pClean) ||
                        r.customer_name.toLowerCase().includes(pClean) ||
                        r.customer_phone.toLowerCase().includes(pClean) ||
                        (r.customer_email && r.customer_email.toLowerCase().includes(pClean)) ||
                        r.address.toLowerCase().includes(pClean)
                    );
                  }
                }
              });
            }
            filtered.sort(
              (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
            return { results: filtered as any };
          }

          return { results: [] };
        },
        async run(): Promise<{ success: boolean }> {
          const q = query.trim();

          if (q.startsWith("INSERT INTO bookings")) {
            const [
              id, job_number, customer_name, customer_phone, customer_email,
              chair_type, issue_description, issue_tags, service_area, address,
              preferred_date, preferred_time, photos, status, assigned_technician_name,
              internal_notes, estimated_cost, history, created_at, updated_at,
            ] = boundParams;

            records.unshift({
              id,
              job_number,
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
              status,
              assigned_technician_name,
              internal_notes,
              estimated_cost,
              history,
              created_at,
              updated_at,
            });
            return { success: true };
          }

          if (q.startsWith("UPDATE bookings")) {
            const [status, assigned_technician_name, internal_notes, estimated_cost, history, updated_at, targetJob] = boundParams;
            const found = records.find(
              (r) => r.job_number.replace(/\s+/g, "").toUpperCase() === targetJob
            );
            if (found) {
              if (status !== undefined) found.status = status;
              if (assigned_technician_name !== undefined) found.assigned_technician_name = assigned_technician_name;
              if (internal_notes !== undefined) found.internal_notes = internal_notes;
              if (estimated_cost !== undefined) found.estimated_cost = estimated_cost;
              if (history !== undefined) found.history = history;
              found.updated_at = updated_at;
            }
            return { success: true };
          }

          return { success: true };
        },
      };
      return stmt;
    },
  };

  const mockBucket: unknown = {
    async put(key: string, data: ArrayBuffer | Uint8Array, options?: any) {
      let arrayBuffer: ArrayBuffer;
      if (data instanceof Uint8Array) {
        const copy = new Uint8Array(data.byteLength);
        copy.set(data);
        arrayBuffer = copy.buffer;
      } else {
        arrayBuffer = data;
      }
      files.set(key, {
        data: arrayBuffer,
        contentType: options?.httpMetadata?.contentType || "application/octet-stream",
      });
      return { key };
    },
    async get(key: string) {
      const item = files.get(key);
      if (!item) return null;
      return {
        body: item.data,
        httpEtag: "mock-etag",
        writeHttpMetadata(headers: Headers) {
          headers.set("Content-Type", item.contentType);
        },
      };
    },
  };

  return {
    DB: mockDB as D1Database,
    BUCKET: mockBucket as R2Bucket,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    JWT_SECRET: process.env.JWT_SECRET || "khurchi_jwt_secret_mumbai_2026",
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || "info@khurchi.com",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "ulhasnagar@khurchi",
    NOTIFICATION_EMAIL: process.env.NOTIFICATION_EMAIL || "akashkamble.jb007@gmail.com",
    BUSINESS_EMAIL: process.env.BUSINESS_EMAIL || "info@khurchi.com",
  };
}

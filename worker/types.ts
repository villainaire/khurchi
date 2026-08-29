// worker/types.ts
import type { D1Database, R2Bucket, Fetcher } from "@cloudflare/workers-types";

export interface Env {
  // Bindings
  DB: D1Database;
  BUCKET: R2Bucket;
  ASSETS?: Fetcher;

  // Secrets & Config
  RESEND_API_KEY?: string;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  NOTIFICATION_EMAIL?: string;
  BUSINESS_EMAIL?: string;
}

export interface BookingHistoryItem {
  status: string;
  at: string;
  by: string;
}

export interface BookingRecord {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  chair_type: string;
  issue_description: string;
  issue_tags: string; // JSON string in SQLite
  service_area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  photos: string; // JSON string in SQLite
  status: string;
  assigned_technician_name: string | null;
  internal_notes: string | null;
  estimated_cost: number | null;
  history: string; // JSON string in SQLite
  created_at: string;
  updated_at: string;
}

export interface BookingResponse {
  id: string;
  job_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  chair_type: string;
  issue_description: string;
  issue_tags: string[];
  service_area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  photos: string[];
  status: string;
  assigned_technician_name?: string | null;
  internal_notes?: string | null;
  estimated_cost?: number | null;
  history: BookingHistoryItem[];
  created_at: string;
  updated_at: string;
}

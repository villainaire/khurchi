// worker/types.ts

export type BookingStatus =
  | "Request Received"
  | "Service Review"
  | "Team Dispatched"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export interface BookingHistoryItem {
  status: BookingStatus;
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
  issue_tags: string[];
  service_area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  photos_count: number;
  status: BookingStatus;
  assigned_technician_name: string | null;
  internal_notes: string | null;
  estimated_cost: number | null;
  history: BookingHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface BookingPhotoPayload {
  filename: string;
  contentType: string;
  base64: string;
}

export interface CreateBookingRequest {
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  chair_type: string;
  issue_description: string;
  issue_tags?: string[];
  service_area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  photos?: BookingPhotoPayload[];
}

export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  RESEND_API_KEY?: string;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  NOTIFICATION_EMAIL?: string;
  BUSINESS_EMAIL?: string;
}

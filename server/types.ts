// server/types.ts

export type ChairType =
  | "Office Chair"
  | "Gaming Chair"
  | "Executive Chair"
  | "Dining Chair"
  | "Visitor Chair"
  | "Other";

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
  photos: string[];
  status: BookingStatus;
  assigned_technician_name: string | null;
  internal_notes: string | null;
  estimated_cost: number | null;
  history: BookingHistoryItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateBookingInput {
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  chair_type: string;
  issue_description: string;
  issue_tags?: string[];
  service_area: string;
  address: string;
  preferred_date: string;
  preferred_time: string;
  photos?: string[];
}

export interface UpdateBookingInput {
  status?: BookingStatus;
  assigned_technician_name?: string;
  internal_notes?: string;
  estimated_cost?: number;
}

-- Migration: 0001_initial_schema.sql
-- Cloudflare D1 Database Schema for Khurchi.com

-- 1. Table for thread-safe atomic job sequence generation per year
CREATE TABLE IF NOT EXISTS booking_sequences (
  year INTEGER PRIMARY KEY,
  current_seq INTEGER NOT NULL DEFAULT 0
);

-- 2. Main bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  job_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  chair_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  issue_tags TEXT NOT NULL DEFAULT '[]', -- JSON array
  service_area TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  photos TEXT NOT NULL DEFAULT '[]', -- JSON array of R2 storage keys
  status TEXT NOT NULL DEFAULT 'Request Received',
  assigned_technician_name TEXT,
  internal_notes TEXT,
  estimated_cost REAL,
  history TEXT NOT NULL DEFAULT '[]', -- JSON array of audit logs
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Indices for rapid querying & filtering
CREATE INDEX IF NOT EXISTS idx_bookings_job_number ON bookings(job_number);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_area ON bookings(service_area);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- Initialize sequence for current year
INSERT OR IGNORE INTO booking_sequences (year, current_seq) VALUES (2026, 6);

-- Seed initial bookings data for Mumbai chair care operations
INSERT OR IGNORE INTO bookings (
  id, job_number, customer_name, customer_phone, customer_email,
  chair_type, issue_description, issue_tags, service_area, address,
  preferred_date, preferred_time, photos, status, assigned_technician_name,
  internal_notes, estimated_cost, history, created_at, updated_at
) VALUES 
(
  'seed-1',
  'KHR-2026-000001',
  'Rajesh Verma',
  '9876543210',
  'test_rajesh@example.com',
  'Office Chair',
  'Hydraulic gas lift sinking intermittently during use',
  '["Chair is sinking","Hydraulic issue"]',
  'Andheri West',
  'Flat 402, Sunshine Apts, Link Road, Andheri West, Mumbai 400058',
  '2026-12-20',
  '10 AM - 1 PM',
  '[]',
  'Service Review',
  'Sanjay Gaikwad',
  'Replacement class 4 gas cylinder scheduled',
  850,
  '[{"status":"Request Received","at":"2026-08-28T09:00:00.000Z","by":"system"},{"status":"Service Review","at":"2026-08-28T11:30:00.000Z","by":"info@khurchi.com"}]',
  '2026-08-28T09:00:00.000Z',
  '2026-08-28T11:30:00.000Z'
),
(
  'seed-2',
  'KHR-2026-000002',
  'Pooja Sharma',
  '9820123456',
  'pooja.sharma@example.com',
  'Gaming Chair',
  'Broken caster wheel and squeaking tilt mechanism',
  '["Broken wheel","Tilt mechanism issue"]',
  'Bandra West',
  'Hill Road, Bandra West, Mumbai 400050',
  '2026-12-21',
  '1 PM - 4 PM',
  '[]',
  'Team Dispatched',
  'Amit Shinde',
  'Heavy duty PU wheels kit ready',
  650,
  '[{"status":"Request Received","at":"2026-08-27T10:00:00.000Z","by":"system"},{"status":"Service Review","at":"2026-08-27T12:00:00.000Z","by":"info@khurchi.com"},{"status":"Team Dispatched","at":"2026-08-28T08:30:00.000Z","by":"info@khurchi.com"}]',
  '2026-08-27T10:00:00.000Z',
  '2026-08-28T08:30:00.000Z'
),
(
  'seed-3',
  'KHR-2026-000003',
  'Karan Mehta',
  '9930445566',
  'karan.m@example.com',
  'Executive Chair',
  'Leatherette armrest torn and worn out',
  '["Torn upholstery"]',
  'Powai',
  'Hiranandani Gardens, Powai, Mumbai 400076',
  '2026-12-22',
  '4 PM - 7 PM',
  '[]',
  'In Progress',
  'Sunil Patil',
  'High density foam & leatherette match selected',
  1400,
  '[{"status":"Request Received","at":"2026-08-26T14:00:00.000Z","by":"system"},{"status":"Service Review","at":"2026-08-27T09:00:00.000Z","by":"info@khurchi.com"},{"status":"Team Dispatched","at":"2026-08-27T11:00:00.000Z","by":"info@khurchi.com"},{"status":"In Progress","at":"2026-08-28T14:00:00.000Z","by":"Sunil Patil"}]',
  '2026-08-26T14:00:00.000Z',
  '2026-08-28T14:00:00.000Z'
),
(
  'seed-4',
  'KHR-2026-000004',
  'Sneha Joshi',
  '9819876543',
  'sneha.j@example.com',
  'Dining Chair',
  'Wobbly wooden legs and loose joint dowels',
  '["Loose or damaged parts"]',
  'Thane West',
  'Ghodbunder Road, Thane West 400607',
  '2026-12-23',
  '10 AM - 1 PM',
  '[]',
  'Completed',
  'Sanjay Gaikwad',
  'Wood re-glued, clamped and polished',
  500,
  '[{"status":"Request Received","at":"2026-08-25T11:00:00.000Z","by":"system"},{"status":"Service Review","at":"2026-08-25T14:00:00.000Z","by":"info@khurchi.com"},{"status":"Team Dispatched","at":"2026-08-26T10:00:00.000Z","by":"info@khurchi.com"},{"status":"Completed","at":"2026-08-26T13:30:00.000Z","by":"Sanjay Gaikwad"}]',
  '2026-08-25T11:00:00.000Z',
  '2026-08-26T13:30:00.000Z'
),
(
  'seed-5',
  'KHR-2026-000005',
  'Vikram Nair',
  '9821556677',
  NULL,
  'Visitor Chair',
  'Base frame welding crack',
  '["Loose or damaged parts"]',
  'Navi Mumbai',
  'Sector 17, Vashi, Navi Mumbai 400703',
  '2026-12-24',
  '1 PM - 4 PM',
  '[]',
  'Request Received',
  NULL,
  NULL,
  NULL,
  '[{"status":"Request Received","at":"2026-08-28T16:00:00.000Z","by":"system"}]',
  '2026-08-28T16:00:00.000Z',
  '2026-08-28T16:00:00.000Z'
),
(
  'seed-6',
  'KHR-2026-000006',
  'Ananya Desai',
  '9833441122',
  NULL,
  'Office Chair',
  'Full mesh re-tensioning and wheel replacement',
  '["Broken wheel","Torn upholstery"]',
  'Dadar',
  'Shivaji Park, Dadar West, Mumbai 400028',
  '2026-12-25',
  '10 AM - 1 PM',
  '[]',
  'Service Review',
  'Amit Shinde',
  NULL,
  950,
  '[{"status":"Request Received","at":"2026-08-29T08:00:00.000Z","by":"system"},{"status":"Service Review","at":"2026-08-29T09:15:00.000Z","by":"info@khurchi.com"}]',
  '2026-08-29T08:00:00.000Z',
  '2026-08-29T09:15:00.000Z'
);

-- Migration: 0001_init.sql
-- Khurchi.com Cloudflare D1 Schema

-- Atomic concurrency-safe sequence counter for job numbers (KHR-YYYY-000001)
CREATE TABLE IF NOT EXISTS job_counters (
  year INTEGER PRIMARY KEY,
  current_seq INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- Primary Bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  job_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  chair_type TEXT NOT NULL,
  issue_description TEXT NOT NULL,
  issue_tags TEXT NOT NULL DEFAULT '[]',
  service_area TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_date TEXT NOT NULL,
  preferred_time TEXT NOT NULL,
  photos_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Request Received',
  assigned_technician_name TEXT,
  internal_notes TEXT,
  estimated_cost REAL,
  history TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Performance & Query Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_job_number ON bookings(job_number);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_service_area ON bookings(service_area);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

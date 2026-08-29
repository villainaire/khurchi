// server/firestore.ts
import fs from "fs";
import path from "path";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction,
} from "firebase/firestore";
import type { BookingRecord, BookingHistoryItem } from "./types";

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function loadFirebaseConfig() {
  try {
    const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("Could not read firebase-applet-config.json:", err);
  }
  return null;
}

export function getDb(): Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  const config = loadFirebaseConfig();
  if (!config) {
    throw new Error("Firebase configuration not found in firebase-applet-config.json");
  }

  if (getApps().length === 0) {
    firebaseApp = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });
  } else {
    firebaseApp = getApps()[0];
  }

  if (config.firestoreDatabaseId) {
    firestoreDb = getFirestore(firebaseApp, config.firestoreDatabaseId);
  } else {
    firestoreDb = getFirestore(firebaseApp);
  }

  return firestoreDb;
}

/**
 * Concurrency-safe atomic Job Number Generation using Firestore Transactions
 * Format: KHR-YYYY-000001
 */
export async function generateJobNumber(): Promise<{ jobNumber: string; nextSeq: number }> {
  const db = getDb();
  const currentYear = new Date().getFullYear();
  const counterRef = doc(db, "counters", `bookings_${currentYear}`);

  const nextSeq = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let seq = 1;
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      seq = (typeof data?.current_seq === "number" ? data.current_seq : 0) + 1;
    }
    transaction.set(
      counterRef,
      {
        year: currentYear,
        current_seq: seq,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return seq;
  });

  const jobNumber = `KHR-${currentYear}-${String(nextSeq).padStart(6, "0")}`;
  return { jobNumber, nextSeq };
}

/**
 * Insert a new booking in Firestore
 */
export async function saveBooking(booking: BookingRecord): Promise<BookingRecord> {
  const db = getDb();
  const bookingRef = doc(db, "bookings", booking.id);
  await setDoc(bookingRef, booking);
  return booking;
}

/**
 * Retrieve booking by job number (case/space-insensitive)
 */
export async function getBookingByJobNumber(jobNumber: string): Promise<BookingRecord | null> {
  if (!jobNumber) return null;
  const clean = jobNumber.replace(/\s+/g, "").toUpperCase();
  const db = getDb();
  const bookingsCol = collection(db, "bookings");

  const q = query(bookingsCol, where("job_number", "==", clean));
  const snap = await getDocs(q);

  if (!snap.empty) {
    const docData = snap.docs[0].data() as BookingRecord;
    return docData;
  }

  // Fallback scan if exact match wasn't found due to case
  const allSnap = await getDocs(bookingsCol);
  for (const d of allSnap.docs) {
    const data = d.data() as BookingRecord;
    if (data.job_number && data.job_number.replace(/\s+/g, "").toUpperCase() === clean) {
      return data;
    }
  }

  return null;
}

/**
 * List bookings with filtering & search
 */
export async function listBookings(params: {
  status?: string;
  area?: string;
  search?: string;
}): Promise<BookingRecord[]> {
  const db = getDb();
  const bookingsCol = collection(db, "bookings");

  const snap = await getDocs(bookingsCol);
  let items: BookingRecord[] = snap.docs.map((d) => d.data() as BookingRecord);

  if (params.status) {
    items = items.filter(
      (r) => r.status && r.status.toLowerCase() === params.status?.toLowerCase()
    );
  }
  if (params.area) {
    const areaLower = params.area.toLowerCase();
    items = items.filter(
      (r) => r.service_area && r.service_area.toLowerCase().includes(areaLower)
    );
  }
  if (params.search) {
    const s = params.search.toLowerCase().trim();
    items = items.filter(
      (r) =>
        (r.job_number && r.job_number.toLowerCase().includes(s)) ||
        (r.customer_name && r.customer_name.toLowerCase().includes(s)) ||
        (r.customer_phone && r.customer_phone.toLowerCase().includes(s)) ||
        (r.customer_email && r.customer_email.toLowerCase().includes(s)) ||
        (r.address && r.address.toLowerCase().includes(s)) ||
        (r.service_area && r.service_area.toLowerCase().includes(s))
    );
  }

  // Sort descending by created_at
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return items;
}

/**
 * Get aggregate statistics for admin dashboard
 */
export async function getBookingsStats(): Promise<{
  total: number;
  today: number;
  by_status: Record<string, number>;
}> {
  const items = await listBookings({});
  const todayStr = new Date().toISOString().slice(0, 10);

  let todayCount = 0;
  const by_status: Record<string, number> = {};

  for (const item of items) {
    if (item.created_at && item.created_at.slice(0, 10) === todayStr) {
      todayCount++;
    }
    if (item.status) {
      by_status[item.status] = (by_status[item.status] || 0) + 1;
    }
  }

  return {
    total: items.length,
    today: todayCount,
    by_status,
  };
}

/**
 * Update an existing booking by job number
 */
export async function updateBookingFields(
  jobNumber: string,
  updates: Partial<BookingRecord>
): Promise<BookingRecord | null> {
  const current = await getBookingByJobNumber(jobNumber);
  if (!current) return null;

  const db = getDb();
  const bookingRef = doc(db, "bookings", current.id);

  const updated: BookingRecord = {
    ...current,
    ...updates,
    updated_at: updates.updated_at || new Date().toISOString(),
  };

  await setDoc(bookingRef, updated, { merge: true });
  return updated;
}

/**
 * Delete a specific booking document by document ID
 */
export async function deleteBookingById(id: string): Promise<boolean> {
  try {
    const db = getDb();
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "bookings", id));
    return true;
  } catch (err) {
    console.error(`Failed to delete booking ${id}:`, err);
    return false;
  }
}

/**
 * Remove all development / test / demo bookings from Firestore
 */
export async function clearAllDemoBookings(): Promise<number> {
  const db = getDb();
  const { deleteDoc } = await import("firebase/firestore");
  const bookingsCol = collection(db, "bookings");
  const snap = await getDocs(bookingsCol);
  let count = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, "bookings", d.id));
    count++;
  }
  return count;
}


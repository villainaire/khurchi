from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Query, Header, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import ipaddress
import uuid
import bcrypt
import jwt
import httpx
import requests
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
NOTIFICATION_EMAIL = os.environ.get("NOTIFICATION_EMAIL", "akashkamble.jb007@gmail.com")
BUSINESS_EMAIL = os.environ.get("BUSINESS_EMAIL", "info@khurchi.com")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "khurchi"

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ---------- DB ----------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- App ----------
app = FastAPI(title="Khurchi.com API")
api_router = APIRouter(prefix="/api")
bearer_scheme = HTTPBearer(auto_error=False)

# ---------- Object Storage ----------
storage_key: Optional[str] = None


def init_storage(force: bool = False):
    global storage_key
    if storage_key and not force:
        return storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
    resp.raise_for_status()
    storage_key = resp.json()["storage_key"]
    return storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- Email Guardrails ----------
_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = (
    "reply with your password", "reply with the code", "send your password", "cvv",
    "send us your password", "enter your password below", "confirm your card number",
    "your full card number", "seed phrase", "recovery phrase", "verify your card",
    "social security number", "confirm your bank details",
)
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan()
    scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} != real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str) -> Optional[str]:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if EMAIL_REPLY_TO:
        payload["contact_email"] = EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as httpx_client:
            resp = await httpx_client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        return None
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        return None


# ---------- Models ----------
CHAIR_TYPES = ["Office Chair", "Gaming Chair", "Executive Chair", "Dining Chair", "Visitor Chair", "Other"]
TIME_SLOTS = ["10 AM - 1 PM", "1 PM - 4 PM", "4 PM - 7 PM"]
STATUSES = ["Request Received", "Service Review", "Team Dispatched", "In Progress", "Completed", "Cancelled"]


class BookingCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=100)
    customer_phone: str = Field(min_length=10, max_length=15)
    customer_email: Optional[EmailStr] = None
    chair_type: str
    issue_description: str = Field(min_length=5, max_length=2000)
    issue_tags: List[str] = []
    service_area: str = Field(min_length=2, max_length=200)
    address: str = Field(min_length=5, max_length=1000)
    preferred_date: str
    preferred_time: str
    photos: List[str] = []


class BookingUpdate(BaseModel):
    status: Optional[str] = None
    assigned_technician_name: Optional[str] = None
    internal_notes: Optional[str] = None
    estimated_cost: Optional[float] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------- Auth ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(email: str) -> str:
    payload = {
        "sub": email,
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def require_admin(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Forbidden")
    return payload


# ---------- Job Number ----------
async def generate_job_number() -> str:
    year = datetime.now(timezone.utc).year
    counter = await db.counters.find_one_and_update(
        {"_id": f"job_{year}"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,
    )
    seq = counter["seq"] if counter else 1
    return f"KHR-{year}-{seq:06d}"


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    # Seed admin
    existing = await db.admins.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {ADMIN_EMAIL}")
    else:
        # Ensure password is up-to-date so credentials always work
        await db.admins.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )
    # Init storage
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


# ---------- Public Routes ----------
@api_router.get("/")
async def root():
    return {"service": "Khurchi.com API", "status": "ok"}


@api_router.get("/meta")
async def meta():
    return {
        "chair_types": CHAIR_TYPES,
        "time_slots": TIME_SLOTS,
        "statuses": [s for s in STATUSES if s != "Cancelled"],
        "areas": [
            "South Mumbai", "Colaba", "Fort", "Nariman Point", "Marine Drive",
            "Andheri West", "Andheri East", "Bandra West", "Bandra East",
            "Juhu", "Powai", "Goregaon", "Malad", "Borivali", "Dadar",
            "Lower Parel", "Worli", "Kurla", "Ghatkopar", "Mulund",
            "Thane West", "Thane East", "Navi Mumbai", "Vashi", "Nerul",
            "Kharghar", "Panvel", "Kalyan", "Dombivli", "Ulhasnagar",
            "Ambernath", "Badlapur", "Other",
        ],
        "issue_tags": [
            "Chair is sinking", "Broken wheel", "Torn upholstery",
            "Hydraulic issue", "Tilt mechanism issue", "Loose or damaged parts", "Other",
        ],
    }


@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG/PNG/WebP images allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 8MB)")
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg").lower()
    path = f"{APP_NAME}/booking_photos/{uuid.uuid4()}.{ext}"
    try:
        result = await asyncio.to_thread(put_object, path, data, file.content_type)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail="Upload failed")
    await db.files.insert_one({
        "id": str(uuid.uuid4()),
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": file.content_type,
        "size": result["size"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"path": result["path"], "size": result["size"]}


@api_router.get("/files/{path:path}")
async def download_file(path: str):
    record = await db.files.find_one({"storage_path": path, "is_deleted": False}, {"_id": 0})
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        data, ct = await asyncio.to_thread(get_object, path)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type=record.get("content_type", ct))


def _build_notification_html(booking: dict) -> str:
    photos_html = ""
    if booking.get("photos"):
        photos_html = f"<tr><td style='padding:8px 0;color:#596A60'>Photos attached</td><td style='padding:8px 0;color:#1A2B22'>{len(booking['photos'])} image(s)</td></tr>"
    rows = [
        ("Job Number", booking["job_number"]),
        ("Customer Name", booking["customer_name"]),
        ("Phone", booking["customer_phone"]),
        ("Email", booking.get("customer_email") or "-"),
        ("Chair Type", booking["chair_type"]),
        ("Issue", booking["issue_description"]),
        ("Tags", ", ".join(booking.get("issue_tags") or []) or "-"),
        ("Area", booking["service_area"]),
        ("Address", booking["address"]),
        ("Preferred Date", booking["preferred_date"]),
        ("Preferred Time", booking["preferred_time"]),
        ("Status", booking["status"]),
        ("Booked At", booking["created_at"]),
    ]
    body_rows = "".join(
        f"<tr><td style='padding:10px 16px;color:#596A60;border-bottom:1px solid #EFE9DF;vertical-align:top;width:180px'>{escape(str(k))}</td>"
        f"<td style='padding:10px 16px;color:#1A2B22;border-bottom:1px solid #EFE9DF'>{escape(str(v))}</td></tr>"
        for k, v in rows
    )
    return (
        f"<table role='presentation' width='100%' style='background:#F9F6F0;padding:32px 0;font-family:Manrope,Arial,sans-serif'>"
        f"<tr><td align='center'><table role='presentation' width='600' style='background:#FFFFFF;border:1px solid #E2DCD0;border-radius:12px;overflow:hidden'>"
        f"<tr><td style='background:#2C4C3B;color:#F9F6F0;padding:24px 32px'>"
        f"<div style='font-size:12px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.8'>Khurchi.com</div>"
        f"<div style='font-size:22px;font-weight:600;margin-top:6px'>New Service Request</div>"
        f"</td></tr>"
        f"<tr><td style='padding:24px 32px 8px 32px;color:#1A2B22'>A new chair care request has been submitted through the website.</td></tr>"
        f"<tr><td style='padding:8px 16px 24px 16px'><table role='presentation' width='100%' style='border-collapse:collapse'>{body_rows}{photos_html}</table></td></tr>"
        f"<tr><td style='padding:16px 32px 24px 32px;color:#596A60;font-size:12px;border-top:1px solid #EFE9DF'>"
        f"Sent by Khurchi.com Service Team. We never ask for passwords or payment details by email."
        f"</td></tr>"
        f"</table></td></tr></table>"
    )


@api_router.post("/bookings")
async def create_booking(payload: BookingCreate):
    if payload.chair_type not in CHAIR_TYPES:
        raise HTTPException(status_code=400, detail="Invalid chair type")
    if payload.preferred_time not in TIME_SLOTS:
        raise HTTPException(status_code=400, detail="Invalid time slot")
    try:
        pd = datetime.strptime(payload.preferred_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Preferred date must be YYYY-MM-DD")
    today = datetime.now(timezone.utc).date()
    if pd < today:
        raise HTTPException(status_code=400, detail="Preferred date cannot be in the past")

    job_number = await generate_job_number()
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "job_number": job_number,
        "customer_name": payload.customer_name.strip(),
        "customer_phone": payload.customer_phone.strip(),
        "customer_email": payload.customer_email,
        "chair_type": payload.chair_type,
        "issue_description": payload.issue_description.strip(),
        "issue_tags": payload.issue_tags,
        "service_area": payload.service_area.strip(),
        "address": payload.address.strip(),
        "preferred_date": payload.preferred_date,
        "preferred_time": payload.preferred_time,
        "photos": payload.photos,
        "status": "Request Received",
        "assigned_technician_name": None,
        "internal_notes": None,
        "estimated_cost": None,
        "history": [{"status": "Request Received", "at": now, "by": "system"}],
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db.bookings.insert_one(doc)
    except Exception as e:
        logger.error(f"Booking insert failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save booking. Please try again.")

    # Fire and forget email (do not block on failure — booking is already saved)
    subject = f"New Service Request | {job_number} | {payload.customer_name}"
    html = _build_notification_html(doc)
    try:
        await send_email(to=NOTIFICATION_EMAIL, subject=subject, html=html)
        if BUSINESS_EMAIL and BUSINESS_EMAIL != NOTIFICATION_EMAIL:
            await send_email(to=BUSINESS_EMAIL, subject=subject, html=html)
    except Exception as e:
        logger.error(f"Notification email failed for {job_number}: {e}")

    return {
        "job_number": job_number,
        "customer_name": doc["customer_name"],
        "preferred_date": doc["preferred_date"],
        "preferred_time": doc["preferred_time"],
        "status": doc["status"],
        "created_at": doc["created_at"],
    }


@api_router.get("/track/{job_number}")
async def track_booking(job_number: str):
    doc = await db.bookings.find_one({"job_number": job_number.upper().strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Request not found")
    # Public-safe fields only
    def mask_phone(p: str) -> str:
        return p[:2] + "*" * max(0, len(p) - 4) + p[-2:] if p else ""
    def mask_name(n: str) -> str:
        parts = (n or "").split()
        return " ".join([p[0] + "***" if p else "" for p in parts]) if parts else ""
    return {
        "job_number": doc["job_number"],
        "status": doc["status"],
        "chair_type": doc["chair_type"],
        "preferred_date": doc["preferred_date"],
        "preferred_time": doc["preferred_time"],
        "created_at": doc["created_at"],
        "updated_at": doc["updated_at"],
        "history": doc.get("history", []),
        "customer_name_masked": mask_name(doc["customer_name"]),
        "phone_masked": mask_phone(doc["customer_phone"]),
        "area": doc["service_area"],
    }


# ---------- Admin Routes ----------
@api_router.post("/admin/login")
async def admin_login(payload: LoginRequest):
    admin = await db.admins.find_one({"email": payload.email.lower().strip()})
    if not admin or not verify_password(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token(admin["email"])
    return {"token": token, "email": admin["email"], "role": admin["role"]}


@api_router.get("/admin/me")
async def admin_me(user=Depends(require_admin)):
    return {"email": user["sub"], "role": user["role"]}


@api_router.get("/admin/bookings")
async def list_bookings(
    status: Optional[str] = None,
    area: Optional[str] = None,
    search: Optional[str] = None,
    _=Depends(require_admin),
):
    q: dict = {}
    if status:
        q["status"] = status
    if area:
        q["service_area"] = {"$regex": re.escape(area), "$options": "i"}
    if search:
        s = re.escape(search)
        q["$or"] = [
            {"job_number": {"$regex": s, "$options": "i"}},
            {"customer_name": {"$regex": s, "$options": "i"}},
            {"customer_phone": {"$regex": s, "$options": "i"}},
            {"customer_email": {"$regex": s, "$options": "i"}},
            {"address": {"$regex": s, "$options": "i"}},
        ]
    items = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items, "count": len(items)}


@api_router.get("/admin/bookings/stats")
async def bookings_stats(_=Depends(require_admin)):
    pipeline = [{"$group": {"_id": "$status", "count": {"$sum": 1}}}]
    grouped = await db.bookings.aggregate(pipeline).to_list(100)
    total = await db.bookings.count_documents({})
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_count = await db.bookings.count_documents({"created_at": {"$regex": f"^{today}"}})
    return {
        "total": total,
        "today": today_count,
        "by_status": {g["_id"]: g["count"] for g in grouped},
    }


@api_router.get("/admin/bookings/{job_number}")
async def admin_get_booking(job_number: str, _=Depends(require_admin)):
    doc = await db.bookings.find_one({"job_number": job_number.upper().strip()}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    return doc


@api_router.patch("/admin/bookings/{job_number}")
async def admin_update_booking(job_number: str, payload: BookingUpdate, user=Depends(require_admin)):
    doc = await db.bookings.find_one({"job_number": job_number.upper().strip()})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    updates: dict = {}
    now = datetime.now(timezone.utc).isoformat()
    if payload.status:
        if payload.status not in STATUSES:
            raise HTTPException(status_code=400, detail="Invalid status")
        updates["status"] = payload.status
        history = doc.get("history", [])
        history.append({"status": payload.status, "at": now, "by": user["sub"]})
        updates["history"] = history
    if payload.assigned_technician_name is not None:
        updates["assigned_technician_name"] = payload.assigned_technician_name.strip() or None
    if payload.internal_notes is not None:
        updates["internal_notes"] = payload.internal_notes
    if payload.estimated_cost is not None:
        updates["estimated_cost"] = float(payload.estimated_cost)
    updates["updated_at"] = now
    await db.bookings.update_one({"job_number": doc["job_number"]}, {"$set": updates})
    fresh = await db.bookings.find_one({"job_number": doc["job_number"]}, {"_id": 0})
    return fresh


# ---------- Wire ----------
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

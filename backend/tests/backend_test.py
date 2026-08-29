import os
import re

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Track endpoint (bug fix under test) ----------
class TestTrack:
    def test_track_exact(self, client):
        r = client.get(f"{API}/track/KHR-2026-000001", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["job_number"] == "KHR-2026-000001"
        for k in ["status", "chair_type", "preferred_date", "preferred_time",
                  "created_at", "updated_at", "area", "customer_name_masked", "phone_masked"]:
            assert k in d, f"missing {k}"
        # PII must be masked / absent
        assert "customer_phone" not in d
        assert "address" not in d
        assert "customer_email" not in d
        assert "_id" not in d
        assert "*" in d["phone_masked"]
        assert "***" in d["customer_name_masked"]

    def test_track_lowercase(self, client):
        r = client.get(f"{API}/track/khr-2026-000001", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["job_number"] == "KHR-2026-000001"

    def test_track_with_whitespace(self, client):
        r = client.get(f"{API}/track/%20KHR-2026-000001%20", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["job_number"] == "KHR-2026-000001"

    def test_track_inner_whitespace(self, client):
        r = client.get(f"{API}/track/KHR-2026%20-000001", timeout=30)
        assert r.status_code == 200, r.text

    def test_track_number_six(self, client):
        r = client.get(f"{API}/track/KHR-2026-000006", timeout=30)
        assert r.status_code == 200, r.text
        assert r.json()["job_number"] == "KHR-2026-000006"

    def test_track_invalid(self, client):
        r = client.get(f"{API}/track/INVALID-NUMBER", timeout=30)
        assert r.status_code == 404
        assert r.json()["detail"] == "Request not found"


# ---------- Booking creation regression ----------
class TestBookingRegression:
    def test_create_booking_and_track(self, client):
        payload = {
            "customer_name": "TEST Rajesh Verma",
            "customer_phone": "9876543210",
            "customer_email": "test_rajesh@example.com",
            "chair_type": "Office Chair",
            "issue_description": "TEST Chair is sinking",
            "issue_tags": ["Chair is sinking"],
            "service_area": "Andheri West",
            "address": "Flat 402, Sunshine Apts, Andheri West, Mumbai 400058",
            "preferred_date": "2026-12-20",
            "preferred_time": "10 AM - 1 PM",
            "photos": [],
        }
        r = client.post(f"{API}/bookings", json=payload, timeout=60)
        assert r.status_code in (200, 201), r.text
        d = r.json()
        jn = d.get("job_number")
        assert jn and re.match(r"^KHR-\d{4}-\d{6}$", jn), d

        t = client.get(f"{API}/track/{jn}", timeout=30)
        assert t.status_code == 200, t.text
        td = t.json()
        assert td["job_number"] == jn
        assert td["chair_type"] == "Office Chair"
        assert td["area"] == "Andheri West"

    def test_create_booking_invalid_chair_type(self, client):
        payload = {
            "customer_name": "TEST Bad",
            "customer_phone": "9876543210",
            "chair_type": "Rocket Chair",
            "issue_description": "TEST something",
            "service_area": "Andheri",
            "address": "Some address line",
            "preferred_date": "2026-12-20",
            "preferred_time": "10 AM - 1 PM",
        }
        r = client.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 400, r.text

    def test_create_booking_past_date(self, client):
        payload = {
            "customer_name": "TEST Past",
            "customer_phone": "9876543210",
            "chair_type": "Office Chair",
            "issue_description": "TEST something",
            "service_area": "Andheri",
            "address": "Some address line",
            "preferred_date": "2020-01-01",
            "preferred_time": "10 AM - 1 PM",
        }
        r = client.post(f"{API}/bookings", json=payload, timeout=30)
        assert r.status_code == 400, r.text


# ---------- Admin auth smoke ----------
class TestAdminAuth:
    def test_login(self, client):
        r = client.post(f"{API}/admin/login", json={
            "email": "info@khurchi.com", "password": "ulhasnagar@khurchi"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        token = data.get("token") or data.get("access_token")
        assert token and isinstance(token, str)

    def test_login_bad_password(self, client):
        r = client.post(f"{API}/admin/login", json={
            "email": "info@khurchi.com", "password": "wrong"}, timeout=30)
        assert r.status_code in (400, 401), r.text

"""AgriFlow WashOps - Backend API tests."""
import os
import time
import uuid
import base64
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://harvest-care-sys.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Existing test user (per review request)
EXISTING_EMAIL = "test@agriflow.com"
EXISTING_PASS = "test123"

# Unique test user for fresh run
UNIQUE_EMAIL = f"tester_{uuid.uuid4().hex[:8]}@agriflow.io"
UNIQUE_PASS = "test123secure"
UNIQUE_NAME = "Tester Bot"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def tokens(session):
    tokens = {}
    # Register a new user
    r = session.post(f"{API}/auth/register", json={
        "email": UNIQUE_EMAIL, "password": UNIQUE_PASS, "name": UNIQUE_NAME,
    }, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    d = r.json()
    assert "access_token" in d and d["user"]["email"] == UNIQUE_EMAIL
    tokens["new"] = d["access_token"]
    tokens["new_user_id"] = d["user"]["id"]
    # Login existing user (fallback create if missing)
    r2 = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASS}, timeout=15)
    if r2.status_code != 200:
        session.post(f"{API}/auth/register", json={
            "email": EXISTING_EMAIL, "password": EXISTING_PASS, "name": "AgriFlow Tester"
        }, timeout=15)
        r2 = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASS}, timeout=15)
    assert r2.status_code == 200
    tokens["existing"] = r2.json()["access_token"]
    return tokens


def h(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


# ----- Auth -----
class TestAuth:
    def test_root(self, session):
        r = session.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_register_duplicate(self, session, tokens):
        r = session.post(f"{API}/auth/register", json={
            "email": UNIQUE_EMAIL, "password": UNIQUE_PASS, "name": "dup"
        }, timeout=10)
        assert r.status_code == 400

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me(self, session, tokens):
        r = session.get(f"{API}/auth/me", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == UNIQUE_EMAIL

    def test_me_invalid_token(self, session):
        r = session.get(f"{API}/auth/me", headers={"Authorization": "Bearer foo"}, timeout=10)
        assert r.status_code == 401


# ----- Sensors (depends on background simulator ~3s) -----
class TestSensors:
    def test_history_initial(self, session, tokens):
        # Wait for simulator to produce at least a reading
        time.sleep(5)
        r = session.get(f"{API}/sensors/history?limit=10", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) >= 1, "simulator should have produced data"
        sample = arr[0]
        assert "ph" in sample and "turbidity" in sample

    def test_latest(self, session, tokens):
        r = session.get(f"{API}/sensors/latest", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "ph" in data and "turbidity" in data

    def test_ingest(self, session, tokens):
        payload = {"ph": 7.1, "turbidity": 22.5, "motor_speed": 50, "nozzle_on": True}
        r = session.post(f"{API}/sensors/ingest", json=payload, headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ----- Control -----
class TestControl:
    def test_get_default(self, session, tokens):
        r = session.get(f"{API}/control", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["user_id"] and "motor_speed" in d

    def test_update(self, session, tokens):
        payload = {"motor_speed": 75, "nozzle_on": True, "auto_mode": True,
                   "threshold_turbidity": 60.0, "threshold_ph_min": 6.2, "threshold_ph_max": 8.0}
        r = session.post(f"{API}/control", json=payload, headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["motor_speed"] == 75
        assert d["nozzle_on"] is True
        assert d["auto_mode"] is True
        assert d["threshold_turbidity"] == 60.0

        r2 = session.get(f"{API}/control", headers=h(tokens["new"]), timeout=10)
        assert r2.json()["motor_speed"] == 75

    def test_reset(self, session, tokens):
        # set motor back to 0 / auto off so auto-stop doesn't confuse other tests
        r = session.post(f"{API}/control", json={"motor_speed": 0, "auto_mode": False, "nozzle_on": False},
                        headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200


# ----- Sessions -----
class TestSessions:
    def test_session_flow(self, session, tokens):
        r = session.post(f"{API}/sessions/start", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        sid = r.json()["id"]
        assert r.json()["status"] == "running"
        # wait a bit for readings
        time.sleep(4)
        r2 = session.post(f"{API}/sessions/{sid}/stop", headers=h(tokens["new"]), timeout=15)
        assert r2.status_code == 200
        d = r2.json()
        assert d["status"] == "completed"
        assert d["ended_at"] is not None

        r3 = session.get(f"{API}/sessions", headers=h(tokens["new"]), timeout=10)
        assert r3.status_code == 200
        arr = r3.json()
        assert any(x["id"] == sid for x in arr)

    def test_stop_nonexistent(self, session, tokens):
        r = session.post(f"{API}/sessions/{uuid.uuid4()}/stop", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 404


# ----- AI Vision -----
def _make_vegetable_jpeg_b64():
    """Generate a real JPEG with features (colored shapes) using Pillow."""
    from PIL import Image, ImageDraw
    import random
    img = Image.new("RGB", (320, 240), (240, 240, 230))
    d = ImageDraw.Draw(img)
    # simulate green leafy veggie + water droplets
    for _ in range(30):
        x, y = random.randint(0, 320), random.randint(0, 240)
        r = random.randint(10, 40)
        d.ellipse([x-r, y-r, x+r, y+r], fill=(random.randint(20,120), random.randint(120,220), random.randint(20,90)))
    for _ in range(20):
        x, y = random.randint(0, 320), random.randint(0, 240)
        d.ellipse([x-3, y-3, x+3, y+3], fill=(200, 230, 255))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


class TestAI:
    def test_analyze_vegetable(self, session, tokens):
        try:
            b64 = _make_vegetable_jpeg_b64()
        except ImportError:
            pytest.skip("Pillow not available")
        r = session.post(f"{API}/ai/analyze-vegetable",
                        json={"image_base64": b64},
                        headers=h(tokens["new"]), timeout=60)
        assert r.status_code == 200, f"AI failed: {r.status_code} {r.text[:300]}"
        d = r.json()
        assert 0 <= d["cleanliness_score"] <= 100
        assert isinstance(d["description"], str) and len(d["description"]) > 0
        assert isinstance(d["recommendations"], list)


# ----- Notifications -----
class TestNotifications:
    def test_vapid_public(self, session):
        r = session.get(f"{API}/notifications/vapid-public", timeout=10)
        assert r.status_code == 200
        assert r.json().get("public_key")

    def test_subscribe(self, session, tokens):
        payload = {
            "endpoint": f"https://fcm.googleapis.com/fcm/send/test-{uuid.uuid4().hex[:8]}",
            "keys": {"p256dh": "BTestKeyForSubscription1234567890abcdefghij", "auth": "authkey1234567890"},
        }
        r = session.post(f"{API}/notifications/subscribe", json=payload, headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ----- Auto mode -----
class TestAutoMode:
    def test_auto_stop_on_high_turbidity(self, session, tokens):
        # Enable auto mode with low threshold, start motor
        session.post(f"{API}/control", json={
            "motor_speed": 80, "nozzle_on": True, "auto_mode": True, "threshold_turbidity": 5.0
        }, headers=h(tokens["new"]), timeout=10)
        # Ingest a high turbidity reading to force trigger
        session.post(f"{API}/sensors/ingest",
                    json={"ph": 7.0, "turbidity": 99.9, "motor_speed": 80, "nozzle_on": True},
                    headers=h(tokens["new"]), timeout=10)
        time.sleep(1)
        r = session.get(f"{API}/control", headers=h(tokens["new"]), timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["motor_speed"] == 0, "auto mode should have set motor_speed to 0"
        assert d["nozzle_on"] is False

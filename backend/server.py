from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import asyncio
import logging
import json
import base64
import random
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt
from pywebpush import webpush, WebPushException

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# ============= ENV =============
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-dev-secret')
JWT_ALG = 'HS256'
JWT_EXP_DAYS = 7
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
VAPID_PRIVATE_KEY = os.environ.get('VAPID_PRIVATE_KEY', '')
VAPID_PUBLIC_KEY = os.environ.get('VAPID_PUBLIC_KEY', '')
VAPID_CLAIM_EMAIL = os.environ.get('VAPID_CLAIM_EMAIL', 'admin@agriflow.local')

# ============= DB =============
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ============= App =============
app = FastAPI(title="AgriFlow WashOps API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ============= Models =============
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class SensorReading(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    ph: float
    turbidity: float  # NTU
    motor_speed: int = 0  # 0-100 %
    nozzle_on: bool = False
    servo_position: int = 0  # 0-180 degrees
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SensorIngest(BaseModel):
    ph: float
    turbidity: float
    motor_speed: Optional[int] = 0
    nozzle_on: Optional[bool] = False
    servo_position: Optional[int] = 0

class ControlState(BaseModel):
    user_id: str
    motor_speed: int = 0
    nozzle_on: bool = False
    servo_push: bool = False
    auto_mode: bool = False
    threshold_turbidity: float = 50.0  # auto stop if turbidity > this
    threshold_ph_min: float = 6.0
    threshold_ph_max: float = 8.5
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ControlUpdate(BaseModel):
    motor_speed: Optional[int] = None
    nozzle_on: Optional[bool] = None
    servo_push: Optional[bool] = None
    auto_mode: Optional[bool] = None
    threshold_turbidity: Optional[float] = None
    threshold_ph_min: Optional[float] = None
    threshold_ph_max: Optional[float] = None

class WashSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    avg_ph: Optional[float] = None
    avg_turbidity: Optional[float] = None
    cleanliness_score: Optional[float] = None
    notes: Optional[str] = None
    status: str = "running"  # running | completed

class AnalyzeImageRequest(BaseModel):
    image_base64: str  # data URL or raw base64
    session_id: Optional[str] = None

class AnalyzeResult(BaseModel):
    cleanliness_score: int
    description: str
    recommendations: List[str]

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

# ============= Auth =============
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), hashed.encode())
    except Exception:
        return False

def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXP_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Missing token")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ============= Auth Routes =============
@api_router.post("/auth/register", response_model=TokenOut)
async def register(payload: UserRegister):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name,
        "password": hash_password(payload.password),
        "created_at": now.isoformat(),
    }
    await db.users.insert_one(doc)
    # init default control
    await db.control.update_one(
        {"user_id": user_id},
        {"$set": ControlState(user_id=user_id).model_dump(mode="json")},
        upsert=True,
    )
    token = create_token(user_id)
    return TokenOut(
        access_token=token,
        user=UserOut(id=user_id, email=payload.email.lower(), name=payload.name, created_at=now),
    )

@api_router.post("/auth/login", response_model=TokenOut)
async def login(payload: UserLogin):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    created = user["created_at"]
    if isinstance(created, str):
        created = datetime.fromisoformat(created)
    return TokenOut(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=created),
    )

@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    created = user["created_at"]
    if isinstance(created, str):
        created = datetime.fromisoformat(created)
    return UserOut(id=user["id"], email=user["email"], name=user["name"], created_at=created)

# ============= Sensors =============
@api_router.post("/sensors/ingest")
async def ingest_sensor(payload: SensorIngest, user=Depends(get_current_user)):
    reading = SensorReading(user_id=user["id"], **payload.model_dump())
    doc = reading.model_dump(mode="json")
    await db.sensor_readings.insert_one(doc)
    # Auto mode logic
    control = await db.control.find_one({"user_id": user["id"]}, {"_id": 0})
    if control and control.get("auto_mode"):
        if payload.turbidity > control.get("threshold_turbidity", 50.0):
            await db.control.update_one(
                {"user_id": user["id"]},
                {"$set": {"motor_speed": 0, "nozzle_on": False, "updated_at": datetime.now(timezone.utc).isoformat()}},
            )
            await _notify_with_cooldown(
                user["id"], "auto_stop", "Auto Stop Aktif",
                f"Turbidity {payload.turbidity:.1f} NTU melebihi threshold. Mesin dihentikan.",
                icon="🚨", cooldown_sec=60,
            )
    return {"ok": True, "id": reading.id}

@api_router.get("/sensors/latest")
async def latest_sensor(user=Depends(get_current_user)):
    doc = await db.sensor_readings.find_one(
        {"user_id": user["id"]}, {"_id": 0}, sort=[("timestamp", -1)]
    )
    return doc or {}

@api_router.get("/sensors/history")
async def sensor_history(limit: int = 60, user=Depends(get_current_user)):
    cursor = db.sensor_readings.find({"user_id": user["id"]}, {"_id": 0}).sort("timestamp", -1).limit(limit)
    docs = await cursor.to_list(length=limit)
    return list(reversed(docs))

# ============= Control =============
@api_router.get("/control")
async def get_control(user=Depends(get_current_user)):
    doc = await db.control.find_one({"user_id": user["id"]}, {"_id": 0})
    if not doc:
        state = ControlState(user_id=user["id"])
        d = state.model_dump(mode="json")
        await db.control.insert_one(d)
        return d
    return doc

@api_router.post("/control")
async def update_control(payload: ControlUpdate, user=Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.control.update_one({"user_id": user["id"]}, {"$set": update}, upsert=True)
    doc = await db.control.find_one({"user_id": user["id"]}, {"_id": 0})
    return doc

# ============= Sessions =============
@api_router.post("/sessions/start")
async def start_session(user=Depends(get_current_user)):
    session = WashSession(user_id=user["id"])
    await db.sessions.insert_one(session.model_dump(mode="json"))
    await _send_push_to_user(user["id"], "Sesi Dimulai",
                              "Pencucian sayuran dimulai. Monitor pH & turbidity di dashboard.",
                              icon="▶️")
    return session.model_dump(mode="json")

@api_router.post("/sessions/{session_id}/stop")
async def stop_session(session_id: str, user=Depends(get_current_user)):
    session = await db.sessions.find_one({"id": session_id, "user_id": user["id"]}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    started_at = session["started_at"]
    if isinstance(started_at, str):
        started_at = datetime.fromisoformat(started_at)
    cursor = db.sensor_readings.find(
        {"user_id": user["id"], "timestamp": {"$gte": started_at.isoformat()}},
        {"_id": 0, "ph": 1, "turbidity": 1},
    )
    readings = await cursor.to_list(length=10000)
    avg_ph = sum(r["ph"] for r in readings) / len(readings) if readings else None
    avg_tu = sum(r["turbidity"] for r in readings) / len(readings) if readings else None
    update = {
        "ended_at": datetime.now(timezone.utc).isoformat(),
        "avg_ph": avg_ph,
        "avg_turbidity": avg_tu,
        "status": "completed",
    }
    await db.sessions.update_one({"id": session_id}, {"$set": update})
    ph_str = f"{avg_ph:.2f}" if avg_ph is not None else "N/A"
    tu_str = f"{avg_tu:.1f}" if avg_tu is not None else "N/A"
    duration = int((datetime.now(timezone.utc) - started_at).total_seconds())
    await _send_push_to_user(
        user["id"], "Pencucian Selesai",
        f"Durasi {duration}s · pH avg: {ph_str} · Turbidity avg: {tu_str} NTU",
        icon="✅",
    )
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    return doc

@api_router.get("/sessions")
async def list_sessions(limit: int = 50, user=Depends(get_current_user)):
    cursor = db.sessions.find({"user_id": user["id"]}, {"_id": 0}).sort("started_at", -1).limit(limit)
    return await cursor.to_list(length=limit)

# ============= AI Vision =============
@api_router.post("/ai/analyze-vegetable", response_model=AnalyzeResult)
async def analyze_vegetable(payload: AnalyzeImageRequest, user=Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
    except ImportError:
        raise HTTPException(status_code=500, detail="emergentintegrations not installed")

    raw = payload.image_base64
    if "," in raw and raw.startswith("data:"):
        raw = raw.split(",", 1)[1]

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"veg-{user['id']}-{uuid.uuid4().hex[:8]}",
        system_message=(
            "You are an expert food safety inspector analyzing washed vegetables. "
            "Return STRICT JSON only with keys: cleanliness_score (0-100 integer), "
            "description (Indonesian, 1-2 sentences), recommendations (array of 2-3 short Indonesian strings). "
            "No markdown, no code fences, only JSON."
        ),
    ).with_model("gemini", "gemini-2.5-flash")

    image_content = ImageContent(image_base64=raw)
    msg = UserMessage(
        text="Analisa kebersihan sayuran setelah dicuci. Berikan skor kebersihan, deskripsi singkat, dan rekomendasi.",
        file_contents=[image_content],
    )
    try:
        response = await chat.send_message(msg)
    except Exception as e:
        logging.exception("AI error")
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    text = (response or "").strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        data = json.loads(text)
        result = AnalyzeResult(
            cleanliness_score=int(data.get("cleanliness_score", 0)),
            description=str(data.get("description", "")),
            recommendations=[str(x) for x in data.get("recommendations", [])][:5],
        )
    except Exception:
        result = AnalyzeResult(
            cleanliness_score=70,
            description=text[:200] if text else "Tidak dapat menganalisa gambar.",
            recommendations=["Cek pencahayaan kamera", "Coba ulang analisa"],
        )

    # Save to session if provided
    if payload.session_id:
        await db.sessions.update_one(
            {"id": payload.session_id, "user_id": user["id"]},
            {"$set": {"cleanliness_score": result.cleanliness_score, "notes": result.description}},
        )
    await db.ai_analyses.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "session_id": payload.session_id,
        "score": result.cleanliness_score,
        "description": result.description,
        "recommendations": result.recommendations,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Notify based on AI score
    if result.cleanliness_score >= 85:
        await _send_push_to_user(
            user["id"], "Sayuran Bersih!",
            f"Skor kebersihan: {result.cleanliness_score}/100. {result.description[:80]}",
            icon="✨",
        )
    elif result.cleanliness_score < 60:
        await _send_push_to_user(
            user["id"], "Perlu Cuci Ulang",
            f"Skor kebersihan rendah: {result.cleanliness_score}/100. {result.description[:80]}",
            icon="⚠️",
        )

    return result

# ============= Web Push =============
@api_router.get("/notifications/vapid-public")
async def get_vapid_public():
    return {"public_key": VAPID_PUBLIC_KEY}

@api_router.post("/notifications/subscribe")
async def subscribe_push(sub: PushSubscription, user=Depends(get_current_user)):
    await db.push_subs.update_one(
        {"user_id": user["id"], "endpoint": sub.endpoint},
        {"$set": {
            "user_id": user["id"],
            "endpoint": sub.endpoint,
            "keys": sub.keys,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"ok": True}

@api_router.post("/notifications/test")
async def test_push(user=Depends(get_current_user)):
    sent = await _send_push_to_user(user["id"], "AgriFlow Test", "Notifikasi push berfungsi! 🥬")
    return {"sent": sent}

async def _send_push_to_user(user_id: str, title: str, body: str, icon: str = "🔔") -> int:
    if not VAPID_PRIVATE_KEY:
        return 0
    cursor = db.push_subs.find({"user_id": user_id}, {"_id": 0})
    subs = await cursor.to_list(length=100)
    sent = 0
    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=json.dumps({"title": f"{icon} {title}", "body": body}),
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": f"mailto:{VAPID_CLAIM_EMAIL}"},
            )
            sent += 1
        except WebPushException as ex:
            logging.warning(f"Push failed: {ex}")
            if ex.response and ex.response.status_code in (404, 410):
                await db.push_subs.delete_one({"endpoint": s["endpoint"]})
    return sent

async def _notify_with_cooldown(user_id: str, alert_type: str, title: str, body: str,
                                 icon: str = "🔔", cooldown_sec: int = 120) -> bool:
    """Send notification only if same alert_type wasn't fired within cooldown_sec."""
    now = datetime.now(timezone.utc)
    last = await db.notif_cooldowns.find_one(
        {"user_id": user_id, "alert_type": alert_type}, {"_id": 0}
    )
    if last:
        last_time = datetime.fromisoformat(last["last_sent"])
        if (now - last_time).total_seconds() < cooldown_sec:
            return False
    await db.notif_cooldowns.update_one(
        {"user_id": user_id, "alert_type": alert_type},
        {"$set": {"user_id": user_id, "alert_type": alert_type, "last_sent": now.isoformat()}},
        upsert=True,
    )
    sent = await _send_push_to_user(user_id, title, body, icon)
    logging.info(f"[NOTIF] user={user_id[:8]} type={alert_type} sent={sent}")
    return sent > 0

# ============= Simulator =============
_simulator_task = None

async def _sensor_simulator():
    """Generates realistic sensor data for ALL users every 3 seconds."""
    while True:
        try:
            users = await db.users.find({}, {"_id": 0, "id": 1}).to_list(length=1000)
            for u in users:
                ctrl = await db.control.find_one({"user_id": u["id"]}, {"_id": 0}) or {}
                motor = ctrl.get("motor_speed", 0)
                nozzle = ctrl.get("nozzle_on", False)
                # pH baseline 7.2 ± noise; turbidity depends on motor + nozzle
                ph = round(7.2 + random.uniform(-0.6, 0.6), 2)
                base_turbidity = 5 if not (motor or nozzle) else 20 + (motor / 100) * 60
                turbidity = round(max(0, base_turbidity + random.uniform(-8, 12)), 2)
                # Slight decay over time when nozzle on (water cleans)
                if nozzle and motor > 0:
                    turbidity = round(max(2, turbidity * random.uniform(0.85, 1.05)), 2)
                reading = {
                    "id": str(uuid.uuid4()),
                    "user_id": u["id"],
                    "ph": ph,
                    "turbidity": turbidity,
                    "motor_speed": motor,
                    "nozzle_on": nozzle,
                    "servo_position": ctrl.get("servo_push", False) and 90 or 0,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
                await db.sensor_readings.insert_one(reading)

                # === AUTO NOTIFICATIONS (real-time, with cooldown) ===
                ph_min = ctrl.get("threshold_ph_min", 6.0)
                ph_max = ctrl.get("threshold_ph_max", 8.5)
                tu_max = ctrl.get("threshold_turbidity", 50.0)

                # 1. Auto-mode safety stop
                if ctrl.get("auto_mode") and turbidity > tu_max and motor > 0:
                    await db.control.update_one(
                        {"user_id": u["id"]},
                        {"$set": {"motor_speed": 0, "nozzle_on": False,
                                   "updated_at": datetime.now(timezone.utc).isoformat()}},
                    )
                    await _notify_with_cooldown(
                        u["id"], "auto_stop", "Auto Stop Aktif",
                        f"Turbidity {turbidity:.1f} NTU melebihi {tu_max:.0f}. Mesin otomatis dihentikan.",
                        icon="🚨", cooldown_sec=60,
                    )
                # 2. Turbidity warning (non-auto, just alert)
                elif turbidity > tu_max and motor > 0:
                    await _notify_with_cooldown(
                        u["id"], "turbidity_high", "Air Keruh!",
                        f"Turbidity {turbidity:.1f} NTU melebihi batas {tu_max:.0f}. Pertimbangkan ganti air.",
                        icon="💧", cooldown_sec=180,
                    )
                # 3. pH out of range (only when machine running)
                if motor > 0:
                    if ph < ph_min:
                        await _notify_with_cooldown(
                            u["id"], "ph_low", "pH Air Terlalu Asam",
                            f"pH {ph:.2f} di bawah batas {ph_min:.1f}. Cek kualitas air.",
                            icon="⚠️", cooldown_sec=180,
                        )
                    elif ph > ph_max:
                        await _notify_with_cooldown(
                            u["id"], "ph_high", "pH Air Terlalu Basa",
                            f"pH {ph:.2f} di atas batas {ph_max:.1f}. Cek kualitas air.",
                            icon="⚠️", cooldown_sec=180,
                        )
        except Exception:
            logging.exception("Simulator error")
        await asyncio.sleep(3)

@api_router.get("/")
async def root():
    return {"name": "AgriFlow WashOps API", "status": "ok"}

# ============= Mount =============
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def _startup():
    global _simulator_task
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.sensor_readings.create_index([("user_id", 1), ("timestamp", -1)])
    await db.sessions.create_index([("user_id", 1), ("started_at", -1)])
    await db.push_subs.create_index([("user_id", 1), ("endpoint", 1)], unique=True)
    _simulator_task = asyncio.create_task(_sensor_simulator())
    logger.info("Sensor simulator started")

@app.on_event("shutdown")
async def shutdown_db_client():
    global _simulator_task
    if _simulator_task:
        _simulator_task.cancel()
    client.close()

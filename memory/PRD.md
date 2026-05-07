# AgriFlow WashOps - PRD

## Original Problem Statement
Sistem monitoring pencucian sayuran berbasis IoT/ESP32. Sensors: pH air, turbidity, kamera (deteksi kebersihan). Actuators: DC motor (pemutar), nozzle air, servo (pendorong hasil). Dual platform (laptop + HP) dengan push notification di HP.

## Architecture
- **Backend**: FastAPI + MongoDB (Motor async), JWT auth (bcrypt), web push (pywebpush + VAPID), AI vision via emergentintegrations (Gemini 2.5 Flash + EMERGENT_LLM_KEY).
- **Frontend**: React 19 + react-router 7 + Tailwind + shadcn/ui + recharts + lucide-react. PWA dengan service-worker.js.
- **Hardware bridge**: ESP32 polling `/api/control` setiap 3s + POST telemetry ke `/api/sensors/ingest` dengan JWT.
- **Simulator**: Background asyncio task generate data sensor realistis untuk semua user terdaftar (3s interval) - berfungsi sebagai mock saat hardware fisik belum ready.

## User Personas
- **Operator pabrik**: Memulai/menghentikan pencucian, monitor real-time pH & turbidity.
- **Quality control**: Lihat skor kebersihan AI per session, history grafik.
- **Engineer/Maker**: Copy firmware ESP32 + paste JWT untuk integrasi hardware.

## What's Implemented (2026-02)
- ✅ JWT auth (register/login/me) dengan bcrypt
- ✅ Real-time sensor ingestion + history
- ✅ Manual control (motor slider, nozzle switch, servo button)
- ✅ Auto-mode dengan threshold (auto-stop saat turbidity tinggi) + push notif
- ✅ AI vision analysis (Gemini 2.5 Flash) untuk skor kebersihan sayuran
- ✅ Wash session lifecycle (start/stop dengan rata-rata pH & turbidity)
- ✅ Web Push Notification (VAPID) - PWA installable
- ✅ Industrial dark dashboard dengan SVG gauges + Recharts
- ✅ ESP32 firmware example page (siap copy-paste)
- ✅ Sensor simulator otomatis (background task)

## Backlog (Not Implemented)
### P1
- Multiple device support per user (multi-machine fleet)
- Real ESP32-CAM streaming (currently static image preview)
- Email/SMS notifications fallback
### P2
- Admin role + multi-tenancy
- Export wash session report (PDF/CSV)
- Calibration UI for pH/turbidity probes
- Lifespan migration (FastAPI deprecated on_event warning)

## Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/sensors/ingest
GET    /api/sensors/latest
GET    /api/sensors/history
GET    /api/control
POST   /api/control
POST   /api/sessions/start
POST   /api/sessions/{id}/stop
GET    /api/sessions
POST   /api/ai/analyze-vegetable
GET    /api/notifications/vapid-public
POST   /api/notifications/subscribe
POST   /api/notifications/test
```

## Test Credentials
See `/app/memory/test_credentials.md`

# AgriFlow WashOps · IoT Vegetable Wash Monitor

Sistem monitoring pencucian sayuran berbasis IoT (ESP32) dengan dashboard real-time, AI vision (Gemini), dan PWA push notification.

## Stack
- **Frontend**: React 19 + Tailwind + shadcn/ui + recharts (PWA)
- **Backend**: FastAPI + MongoDB (Motor async) + JWT auth
- **AI**: Gemini 2.5 Flash via emergentintegrations
- **Push**: pywebpush + VAPID
- **Hardware**: ESP32 + ESP32-CAM + pH/Turbidity sensors + DC motor + servo

## Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

Buat file `backend/.env`:
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=agriflow
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=dev-secret
EMERGENT_LLM_KEY=<your-key>
VAPID_PRIVATE_KEY=<generate>
VAPID_PUBLIC_KEY=<generate>
VAPID_CLAIM_EMAIL=admin@example.com
```

Buat file `frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Production Deployment

Lihat **[DEPLOYMENT.md](./DEPLOYMENT.md)** untuk panduan lengkap deploy ke:
- **Netlify** (Frontend)
- **Railway** (Backend)
- **MongoDB Atlas** (Database)

## Hardware Integration

Buka halaman **ESP32 Code** di dashboard untuk firmware Arduino siap-flash.

## License

MIT

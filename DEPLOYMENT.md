# 🚀 Deployment Guide — AgriFlow WashOps

Aplikasi ini full-stack (React + FastAPI + MongoDB + WebPush + AI Vision). Karena Netlify hanya menjalankan static site, deployment dipecah ke 3 platform.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Netlify    │────▶│   Railway    │────▶│ MongoDB Atlas│
│  (Frontend)  │     │  (Backend)   │     │  (Database)  │
└──────────────┘     └──────────────┘     └──────────────┘
   React 19           FastAPI               MongoDB M0
   PWA + SW           Python 3.11           Free tier
```

---

## 1. MongoDB Atlas (Database)

1. Daftar gratis: https://www.mongodb.com/cloud/atlas
2. **Build a Database** → pilih **M0 Free** → AWS → region terdekat
3. **Database Access** → **Add New Database User**
   - Username: `agriflow`
   - Password: generate strong → simpan
4. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`)
5. **Database** → **Connect** → **Drivers** → copy connection string:
   ```
   mongodb+srv://agriflow:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Ganti `<password>` dengan password user.

---

## 2. Railway (Backend FastAPI)

1. Daftar: https://railway.app (login pakai GitHub)
2. **New Project** → **Deploy from GitHub repo** → pilih repo
3. **Settings** → **Source**:
   - **Root Directory**: `backend`
4. **Variables** → tambahkan semua env berikut:

   | Key | Value |
   |-----|-------|
   | `MONGO_URL` | connection string dari MongoDB Atlas |
   | `DB_NAME` | `agriflow` |
   | `CORS_ORIGINS` | `https://NAMA-ANDA.netlify.app` (isi nanti setelah Netlify deploy) |
   | `JWT_SECRET` | random 32+ chars (bisa generate di https://generate-secret.vercel.app/32) |
   | `EMERGENT_LLM_KEY` | dari `/app/backend/.env` |
   | `VAPID_PRIVATE_KEY` | dari `/app/backend/.env` |
   | `VAPID_PUBLIC_KEY` | dari `/app/backend/.env` |
   | `VAPID_CLAIM_EMAIL` | `admin@agriflow.com` |

5. **Settings** → **Networking** → **Generate Domain**
   - Copy URL: `https://agriflow-production.up.railway.app`
6. Tunggu deploy selesai (~2 menit). Test:
   ```bash
   curl https://agriflow-production.up.railway.app/api/
   # → {"name":"AgriFlow WashOps API","status":"ok"}
   ```

> File `Procfile`, `runtime.txt`, dan `railway.toml` sudah disiapkan di `backend/` untuk auto-detect.

---

## 3. Netlify (Frontend React)

### A. Via Dashboard (Recommended)

1. Daftar: https://netlify.com
2. **Add new site** → **Import an existing project** → **GitHub** → pilih repo
3. Build settings (auto-detect dari `netlify.toml`):
   - **Base directory**: `frontend`
   - **Build command**: `yarn build`
   - **Publish directory**: `frontend/build`
4. **Environment variables** → **Add a variable**:
   ```
   REACT_APP_BACKEND_URL = https://agriflow-production.up.railway.app
   ```
   ⚠️ **TANPA** trailing slash, **TANPA** `/api`
5. **Deploy site** → tunggu ~3 menit
6. Setelah selesai, copy URL: `https://NAMA-ANDA.netlify.app`

### B. Via CLI

```bash
cd frontend
yarn install
yarn build

npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=build
```

---

## 4. Final Step: Update CORS di Backend

1. Kembali ke **Railway** → project Anda → **Variables**
2. Update `CORS_ORIGINS`:
   ```
   CORS_ORIGINS=https://NAMA-ANDA.netlify.app
   ```
3. Service akan auto-redeploy.

---

## 5. Custom Domain (Optional)

### Netlify
**Domain settings** → **Add custom domain** → `agriflow.com` → ikuti DNS instruction.
Netlify auto-provision SSL gratis (Let's Encrypt).

### Railway
**Settings** → **Networking** → **Custom Domain** → tambah `api.agriflow.com`.
Update DNS CNAME ke Railway domain. Update Netlify env `REACT_APP_BACKEND_URL` ke domain baru.

---

## ✅ Checklist Verifikasi

- [ ] MongoDB Atlas: cluster aktif, connection string valid
- [ ] Railway: `/api/` endpoint return `{"status":"ok"}`
- [ ] Railway logs: `Sensor simulator started` muncul
- [ ] Netlify: site loaded, login page muncul
- [ ] Login berhasil (frontend ↔ backend ↔ DB connected)
- [ ] Dashboard menampilkan data sensor (simulator jalan)
- [ ] Web Push notification bisa subscribe (cek toggle bell di header)
- [ ] AI Vision: upload image → analisa kebersihan return result
- [ ] PWA: di HP, browser nawarin "Add to Home Screen"

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| `CORS error` di console | `CORS_ORIGINS` di Railway harus exact match URL Netlify (no trailing slash) |
| `404` saat refresh `/dashboard` | Cek `frontend/public/_redirects` ada |
| Login error 401 | Cek `REACT_APP_BACKEND_URL` di Netlify env (Network tab DevTools) |
| Push notif tidak nyala | VAPID keys di Railway harus sama dengan yang user pakai saat subscribe pertama kali |
| Backend cold start lama | Railway free tier sleep setelah idle. Upgrade plan atau pakai UptimeRobot ping `/api/` setiap 5 menit |
| `Module not found` saat build Netlify | Jalankan `yarn install` dulu, commit `yarn.lock`, push ulang |
| AI vision error 500 | Cek `EMERGENT_LLM_KEY` di Railway env, pastikan masih ada balance |

---

## 💰 Estimasi Biaya

| Service | Free Tier | Setelah Free |
|---------|-----------|--------------|
| MongoDB Atlas M0 | 512MB selamanya | $9/bulan (M2) |
| Railway | $5 trial credit | ~$5-15/bulan tergantung usage |
| Netlify | 100GB bandwidth/bulan | $19/bulan (Pro) |
| **Total** | **$0** untuk light usage | **~$5-15/bulan** |

---

## 🔌 Hardware ESP32 Setup

Setelah deployment, buka halaman **ESP32 Code** di console untuk firmware Arduino. Update di firmware:
```cpp
const char* SERVER_URL = "https://agriflow-production.up.railway.app/api";
const char* JWT_TOKEN = "<copy dari localStorage 'agriflow_token'>";
```

ESP32 akan:
- POST sensor data ke `/api/sensors/ingest` setiap 3 detik
- GET `/api/control` untuk sinkron motor/nozzle/servo dengan dashboard

---

Selamat deploy! 🚀

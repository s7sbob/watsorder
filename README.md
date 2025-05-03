# 🚀 **WatsOrder Backend**

An **all-in-one WhatsApp ordering & e-commerce platform** built with TypeScript, Node .js 18 +, SQL Server and AWS S3.
It lets merchants spin-up a “store in WhatsApp” in minutes:

* 🛒 Menu & cart bot (Arabic ↔ English)
* 🤖 Keyword auto-replies & greeting flows
* 📦 Order life-cycle with quantities, addresses & confirmation
* 📲 Multi-session WhatsApp manager with live QR provisioning & Socket .io events
* 📢 Broadcast engine (text + media)
* 💳 Paymob payment integration
* ☁️ S3 image uploads (products / keywords / session logos)
* 🔐 JWT auth + role-based middleware
* 📝 Swagger-UI docs at `/api-docs`
* ⏰ Cron jobs for expiring subscriptions & order time-outs
* ⚙️ Extensible feature flags & pricing plans

---

## ✨ Tech Stack

| Layer           | Tech                               |
| --------------- | ---------------------------------- |
| Language        | **TypeScript 5**                   |
| Runtime         | **Node .js 18 LTS**                |
| Framework       | **Express 4**                      |
| DB / ORM        | **Microsoft SQL Server + TypeORM** |
| Real-time       | **Socket.io 4**                    |
| Messaging       | **whatsapp-web.js**                |
| Background jobs | **BullMQ + Redis**                 |
| Storage         | **AWS S3**                         |
| Auth            | **JWT** middleware                 |
| Docs            | **Swagger 3** (`swagger.yaml`)     |
| Process manager | **PM2**                            |
| Dev tools       | nodemon, ts-node, ESLint, Prettier |

---

## 📂 Project Structure <small>(key folders)</small>

```
src
├── controllers/        # Business logic  (auth, session, orders …)
├── routes/             # Express routers (REST endpoints)
├── middleware/         # JWT auth, S3 uploads, … :contentReference[oaicite:4]{index=4}:contentReference[oaicite:5]{index=5}
├── services/whatsapp/  # WhatsApp clients, handlers & broadcast logic :contentReference[oaicite:6]{index=6}:contentReference[oaicite:7]{index=7}
├── cron/               # Scheduled jobs (expireSessions, orderTimeouts)
├── config/             # DB pool, Redis, …
└── server.ts           # App entry-point + Socket.io bootstrap :contentReference[oaicite:8]{index=8}:contentReference[oaicite:9]{index=9}
```

---

## ⚡️ Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/watsorder.git
cd watsorder

# 2. Install dependencies
npm install          # or: pnpm i / yarn

# 3. Copy env template
cp .env.example .env # fill in the required secrets

# 4. Run in dev mode (auto-reload)
npm run dev          # nodemon + ts-node

# 5. Build & run production bundle
npm run build        # tsc -> dist
npm start            # node dist/server.js  (or: pm2 start ecosystem.config.js)
```

> **Swagger UI:** after the server boots, browse to **`http://localhost:5000/api-docs`** for fully-interactive API documentation.&#x20;

---

## 🔧 Environment Variables (`.env`)

| Variable                                                                             | Description                           |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| `PORT`                                                                               | HTTP port (default `5000`)            |
| `NODE_ENV`                                                                           | `development` / `production`          |
| **Database**                                                                         |                                       |
| `DB_USER`, `DB_PASSWORD`, `DB_SERVER`, `DB_DATABASE`                                 | SQL Server credentials                |
| **JWT / Auth**                                                                       |                                       |
| `JWT_SECRET`                                                                         | Signing key for access tokens         |
| **Backend Base**                                                                     |                                       |
| `BASE_URL`                                                                           | Public URL (e.g. `api.watsorder.com`) |
| `VITE_BACKEND_URL`                                                                   | Used by the front-end build           |
| **WhatsApp Sessions**                                                                |                                       |
| `FIXED_SESSION_ID`, `FIXED_CONTACT_NUMBER`                                           | Default session for OTP sends         |
| **AWS S3 (uploads)**                                                                 |                                       |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`          |                                       |
| **Paymob**                                                                           |                                       |
| `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID`, `PAYMOB_ENVIRONMENT` (`sandbox` / `live`) |                                       |

*(See the real `.env` in the repo for the full list of placeholders)*&#x20;

---

## 🛠 NPM Scripts (cheat-sheet)

| Script  | What it does                        |
| ------- | ----------------------------------- |
| `dev`   | Run with **nodemon** & **ts-node**  |
| `build` | Compile TypeScript into **`dist/`** |
| `start` | Run compiled JS (production)        |
| `lint`  | ESLint check                        |
| `test`  | Future unit tests                   |

---

## 📡 Core API Endpoints (high-level)

| Module            | Base Route                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Auth & JWT        | `POST /api/auth/login`, `POST /api/auth/register`                                          |
| WhatsApp Sessions | `GET /api/sessions`, `POST /api/sessions/:id/start-qr`, `POST /api/sessions/:id/cancel-qr` |
| Orders            | `GET /api/orders/new`, `POST /api/orders/:id/restaurant-confirm`                           |
| Broadcast         | `POST /api/sessions/:id/broadcast`                                                         |
| Paymob            | `POST /api/paymob/create-payment`                                                          |
| Config & Pricing  | `GET /api/config/pricing-plans`                                                            |

*(Complete contract available in Swagger)*

---

## 🖼 Uploading Images

The API streams uploads directly to S3 via the **multer-s3** middleware. Three dedicated endpoints exist:

* `/api/sessions/:id/upload-product` 📷
* `/api/sessions/:id/upload-keyword-image` 🖼
* `/api/sessions/:id/upload-session-logo` 🏷

Each file is limited to **5 MB** and only images are accepted.&#x20;

---

## 🏗 Database Migrations

TypeORM is configured in **`src/config/db2.ts`** (pool pattern).
For schema migrations we recommend installing the CLI and pointing it to `ormconfig.js`.

```bash
npx typeorm migration:generate src/migrations/Init
npx typeorm migration:run
```

---

## 🚀 Production Tips

* Use **PM2** for zero-downtime reloads: `pm2 start dist/server.js -n watsorder --env production`
* Serve behind an HTTPS reverse proxy (NGINX / Traefik).
* Point **webhooks** (e.g. Paymob) to `https://your-domain/api/paymob/…`
* Schedule DB backups & Redis persistence.

---

## 🙌 Contributing

1. Fork 🍴 and create a feature branch.
2. Follow ESLint + Prettier rules (`npm run lint` – please fix before PR).
3. Submit a pull request with a clear description & screenshots if UI related.

---

## 📄 License

This project is licensed under the **MIT License** — see `LICENSE` for details.

> Made with ❤️ & ☕ by the WatsOrder team.

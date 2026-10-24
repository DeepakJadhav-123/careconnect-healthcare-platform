# CARECONNECT — Full-stack demo

A working starter project based on the screenshots: patient workspace, Health Navigator, Find Care, Appointments, Live Queue, Reports, Referrals, Medicines, Bills, and Profile & Privacy.

## Stack
- Frontend: HTML, CSS, vanilla JavaScript (responsive/mobile-friendly)
- Backend: Node.js + Express REST API
- Database: SQLite (`careconnect.db` is created automatically)

## Run locally
Requires Node.js 18+.

```bash
npm install
npm start
```
Open `http://localhost:3000` in your browser. **Do not open `public/index.html` directly**; the frontend needs the backend API.

## API overview
- `GET /api/health`
- `GET /api/doctors`
- `GET/POST /api/appointments`, `PATCH /api/appointments/:id`
- `POST /api/navigator`, `GET /api/notes`
- `GET/POST /api/records`
- `GET/POST /api/referrals`
- `GET/POST /api/medicines`
- `GET/POST /api/bills`, `PATCH /api/bills/:id/pay`
- `GET/PUT /api/profile`

## Important limitations
This is a college/demo prototype, not a production medical service. The patient identity is a fixed demo name and there is no real login, password system, role-based access control, secure file storage, real hospital integration, or real-time queue feed. Do not enter real patient information. The Health Navigator uses basic keyword rules and is not a medical AI model, diagnosis, or prescription. Before real-world deployment, add proper authentication, authorization, audit logs, encryption, consent workflows, validation, backups, security review, and clinical/legal review.

## Deployment
Deploy the Node app to a Node-compatible hosting provider. For persistent SQLite storage, choose a host with a persistent disk; many free server instances have ephemeral storage. Alternatively, migrate the database layer to a managed PostgreSQL service before deploying. Set `PORT` if your host requires it.

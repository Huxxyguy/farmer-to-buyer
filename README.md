# Web-Based Farmer to Buyer Direct Marketplace

**Student:** Huzaifa Zakariyya (FCP/CSE/22/1042)  
**Supervisor:** Ibrahim Umar Said  
**Repository:** [https://github.com/Huxxyguy/farmer-to-buyer.git](https://github.com/Huxxyguy/farmer-to-buyer.git)  

---

## Project Overview

A web marketplace connecting Nigerian farmers directly to produce buyers, eliminating middlemen, improving income equity, reducing food waste, enabling escrow payments, and facilitating location-based produce browsing across Nigeria.

---

## Technical Stack

| Layer | Choice |
|---|---|
| **Backend API** | Fastify (Node.js) on Port `5000` |
| **Frontend Web** | Next.js (App Router, React) on Port `3000` |
| **Database** | PostgreSQL / SQLite (Prisma ORM) |
| **Authentication** | JWT Bearer Tokens / HTTP-only Cookies |
| **Payments & Escrow** | Paystack API (Sandbox with HMAC SHA512 Webhooks) |
| **Validation** | Ajv JSON Schema (Fastify Native) |

---

## Repository Structure

```
.
├── api/          — Fastify REST API Service (Port 5000)
│   ├── prisma/   — schema.prisma, seed.js
│   ├── src/      — Fastify server, auth, farms, products, orders, payments, admin, disputes, reviews
│   └── test/     — Automated test suites (auth, products, orders, admin, reviews)
├── web/          — Next.js App Router Frontend (Port 3000)
│   ├── public/   — manifest.json (PWA Web Manifest)
│   └── src/      — Marketplace browse, checkout, order tracking, farmer portal, admin dashboard
└── docs/         — Planning & specification documents
    ├── AGENTS.md
    ├── SRS.md
    ├── Schema.md
    ├── API_Spec.md
    └── Sprint_1_through_5_specs.md
```

---

## Quick Start & Running Locally

### 1. Backend Service (`/api`)
```bash
cd api
npm install
npx prisma db push
npm run db:seed
npm run dev
```

### 2. Frontend Application (`/web`)
```bash
cd web
npm install
npm run dev
```

### 3. Run Master Test Suite (`49/49 Passed`)
```bash
cd api
npm test
```

---

## Demo Accounts

- **Admin Account**: `admin@marketplace.ng` / `Admin123!`
- **Farmer Account**: `farmer@marketplace.ng` / `Farmer123!`
- **Buyer Account**: `buyer@marketplace.ng` / `Buyer123!`

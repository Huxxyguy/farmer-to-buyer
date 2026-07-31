# AGENT.md
## Web-Based Farmer to Buyer Direct Marketplace

This file gives any AI coding agent working in this repo the context needed to make correct decisions without re-deriving them from scratch. Read this before making changes.

---

## Project Summary

A web marketplace connecting Nigerian farmers directly to buyers, removing middlemen. Farmers list produce; buyers browse/filter by location and category, place orders, and pay via escrow (funds held until delivery is confirmed). Includes a two-way ratings system and an admin panel for farm verification and dispute resolution.

Final year academic project — solo developer, 6-month timeline, built sprint-by-sprint.

---

## Tech Stack (locked — do not substitute without explicit instruction)

| Layer | Choice |
|---|---|
| Backend | Fastify (Node.js) |
| Frontend | Next.js (App Router) |
| Database | PostgreSQL / SQLite |
| ORM | Prisma |
| Auth | JWT / httpOnly cookies |
| Validation | JSON Schema via Ajv (Fastify native) |
| Payments | Paystack (sandbox during dev) |
| File uploads | `@fastify/multipart` → Cloudinary or local disk |
| Deployment | Two separate services (API + web) |

---

## Repo Structure

```
/api          — Fastify backend
  /src
    /routes
    /middleware
    /utils
  /prisma      — schema.prisma, seed.js
  /test
/web          — Next.js frontend
  /src
    /app
    /components
    /context
/docs         — planning documents (SRS, schema, API spec, sprint plans)
```

---

## Source of Truth Documents

These live in `/docs` and should be treated as the spec:

- `SRS.md` — functional & non-functional requirements
- `Schema.md` — full ER diagram + data dictionary
- `API_Spec.md` — endpoint contracts
- `Implementation_Methodology_Agile_Sprints.md` — full sprint roadmap
- `Sprint_1_Auth_and_Roles.md` — active Sprint 1 specification & test cases

---

## Non-Negotiable Business Rules

1. **Admins cannot self-register.** `POST /auth/register` must reject `role: admin`.
2. **Unverified farmers' products must not appear in public browse/search.**
3. **Reviews are only postable on `completed` orders**, locked by `UNIQUE(order_id, reviewer_id)`.
4. **Escrow funds are held on payment, released only on buyer confirmation OR auto-release 7 days after `fulfilled_at`**.
5. **Order pricing snapshots at purchase time** (`order_items.price_at_purchase`).
6. **Paystack webhook must verify signature header**.
7. **Passwords are always hashed** (`bcrypt`).

# Sprint 6 — Deployment, Documentation & Defense Handover
## Web-Based Farmer to Buyer Direct Marketplace

**Duration:** 2 weeks  
**Prerequisites:** Sprints 1–5 complete (`users`, `farms`, `products`, `orders`, `payments`, `disputes`, `reviews`)  
**Status:** In Progress / Completed  

---

## Sprint Goal
Deploy the decoupled Fastify API and Next.js frontend services with PostgreSQL database configuration, generate complete academic system documentation (System Design Report, User Manual, API Documentation), and finalize defense demonstration materials.

---

## Task Breakdown

### 1. Production Containerization & Deployment Setup
- Create `docker-compose.yml` defining PostgreSQL database container, Fastify backend API container (`/api`), and Next.js web application container (`/web`).
- Configure production CORS, environment secrets, and database migrations.

### 2. Comprehensive Academic System Documentation
- **`System_Design_Report.md`**: Complete architectural breakdown, database ER data dictionary, non-functional performance benchmarks, and security model.
- **`User_Manual.md`**: Step-by-step user guide for Farmers (storefront setup, produce listing, order dispatch), Buyers (marketplace search, Paystack checkout, escrow release), and Admins (verification queue, dispute resolution).
- **`API_Documentation.md`**: REST API endpoint specification with request/response schemas.

### 3. Final Defense & Handover Materials
- Master verification checklist ensuring all 7 SRS objectives and 49 automated test cases pass cleanly.
- GitHub repository sync (`https://github.com/Huxxyguy/farmer-to-buyer.git`).

---

## Definition of Done
- [x] Docker Compose deployment configuration created (`docker-compose.yml`)
- [x] System Design Report, User Manual, and API Documentation generated in `/docs`
- [x] Master test suite (49/49 passed) verified on production schema
- [x] Project ready for final academic submission and defense

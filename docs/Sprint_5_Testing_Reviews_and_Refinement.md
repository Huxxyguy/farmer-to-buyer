# Sprint 5 — Two-Way Reviews Engine, PWA Polish & Final QA
## Web-Based Farmer to Buyer Direct Marketplace

**Duration:** 2 weeks  
**Prerequisites:** Sprints 1–4 complete (`users`, `farms`, `products`, `orders`, `payments`, `admin` APIs)  
**Depends on:** `reviews` table in Prisma schema  

---

## Sprint Goal
Buyers and farmers can exchange two-way post-transaction reviews locked exclusively to `completed` orders, enforced by database unique constraint `(order_id, reviewer_id)`. Includes mobile PWA manifest polish and master end-to-end QA test execution.

---

## Non-Negotiable Rules Enforced in Sprint 5
1. **Post-Transaction Reviews Only**: Reviews can ONLY be submitted on orders with status `completed`.
2. **Single Review Constraint**: Unique constraint `UNIQUE(order_id, reviewer_id)` guarantees each party can post at most one review per completed order.
3. **Aggregate Storefront Rating**: Public farm profile displays calculated average rating score (1.0 to 5.0).

---

## Task Breakdown

### Backend (Fastify API)
1. `POST /api/v1/orders/:id/review`
   - Guarded by `requireAuth`
   - Body: `{ rating: 1..5, comment }`
   - Enforces order status is `completed`
   - Enforces database `@@unique([order_id, reviewer_id])` constraint; returns `409 Conflict` if review already exists
2. `GET /api/v1/farms/:id/reviews`
   - Public endpoint returning list of reviews and calculated `average_rating` score

### Frontend (Next.js App)
3. **Order Review Modal (`/orders/[id]`)**:
   - Interactive 5-star rating selector and comment submission form
4. **Farm Storefront Reviews List (`/marketplace` & `/farms/[id]`)**:
   - Average rating badge display (e.g. `★ 4.9 (18 reviews)`)
5. **Mobile PWA Support (`/web/public/manifest.json`)**:
   - Web App Manifest file and responsive mobile viewport configuration

---

## Explicit Test Cases (Definition of Done Verification)

| # | Test Case | Expected Result |
|---|---|---|
| **1** | Review pending/fulfilled order (`POST /orders/:id/review`) | HTTP `400 Bad Request` rejected (Only `completed` orders can be reviewed) |
| **2** | Review completed order as buyer | Review created successfully, HTTP 201 |
| **3** | Submit duplicate review for same order | HTTP `409 Conflict` rejected by DB unique constraint |
| **4** | Query farm public reviews (`GET /farms/:id/reviews`) | Returns average star rating score and reviews list |
| **5** | Master test execution across all 5 sprint test suites | 100% of test suites pass cleanly |

---

## Definition of Done
- [ ] All review backend routes implemented and passing automated test suite (`api/test/reviews.test.js`)
- [ ] Business Rule #3 strictly enforced (reviews locked to `completed` orders & unique constraint)
- [ ] PWA web manifest file included in `/web/public/manifest.json`
- [ ] Master test runner passing all unit & integration tests cleanly

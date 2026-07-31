# Sprint 4 — Admin Governance, Farm Verification & Dispute Resolution
## Web-Based Farmer to Buyer Direct Marketplace

**Duration:** 2 weeks  
**Prerequisites:** Sprints 1, 2, and 3 complete (`users`, `farms`, `products`, `orders`, `payments`, `transactions` APIs)  
**Depends on:** `farms.verified_by`, `farms.verified_at`, `disputes` table in Prisma schema  

---

## Sprint Goal
Platform administrators can manage the farm verification queue (recording audit timestamps and admin IDs), arbitrate open buyer-farmer disputes (refunding buyers or releasing escrow to farmers), inspect platform transaction analytics, and govern user accounts.

---

## Task Breakdown

### Backend (Fastify API)
1. `GET /api/v1/admin/farms/pending`
   - Guarded by `requireRole(['admin'])`
   - Lists farms awaiting verification with farmer profile details

2. `POST /api/v1/admin/farms/:id/verify`
   - Guarded by `requireRole(['admin'])`
   - Body: `{ status: "verified" | "rejected" }`
   - Updates `farms.verification_status` and populates `verified_by = admin_id` and `verified_at = new Date()`

3. `POST /api/v1/orders/:id/dispute`
   - Guarded by `requireAuth` (Buyer or Farmer associated with order)
   - Body: `{ reason }`
   - Creates `Dispute` entry (`status: "open"`), updates `orders.status = "disputed"`, freezes payment in status `held`

4. `GET /api/v1/admin/disputes` & `GET /api/v1/admin/analytics`
   - Guarded by `requireRole(['admin'])`
   - `GET /admin/disputes`: Lists open disputes queue with order & party details
   - `GET /admin/analytics`: Aggregates platform metrics (total users, verified farms, total volume in NGN, completed orders, open disputes)

5. `POST /api/v1/admin/disputes/:id/resolve`
   - Guarded by `requireRole(['admin'])`
   - Body: `{ resolution: "resolved_refund" | "resolved_release" }`
   - If `resolved_refund`: updates `disputes.status = "resolved_refund"`, payment status to `refunded`, order to `completed`
   - If `resolved_release`: updates `disputes.status = "resolved_release"`, payment status to `released`, credits farmer `balance`, logs `transactions` ledger

### Frontend (Next.js App)
6. **Admin Dashboard (`/admin/dashboard`)**:
   - **Platform Metrics Bar**: Total GMV Volume (₦), Verified Farms Count, Total Orders, Open Disputes Count
   - **Farm Verification Queue**: List of pending farms with "Approve Storefront" and "Reject Storefront" buttons
   - **Dispute Resolution Queue**: List of active disputes with order details, buyer/farmer contact info, dispute reason, and "Issue Refund to Buyer" / "Release Payout to Farmer" action buttons

---

## Explicit Test Cases (Definition of Done Verification)

| # | Test Case | Expected Result |
|---|---|---|
| **1** | Admin lists pending farms (`GET /admin/farms/pending`) | Returns list of unverified farms |
| **2** | Admin approves farm (`POST /admin/farms/:id/verify`) | Farm status updated to `verified`, `verified_by` and `verified_at` recorded |
| **3** | Buyer opens dispute (`POST /orders/:id/dispute`) | Order status set to `disputed`, dispute record created with status `open` |
| **4** | Admin lists open disputes (`GET /admin/disputes`) | Returns open dispute queue |
| **5** | Admin resolves dispute via refund (`POST /admin/disputes/:id/resolve`) | Payment status updated to `refunded`, dispute marked `resolved_refund` |
| **6** | Admin resolves dispute via payout release | Payment status updated to `released`, farmer `balance` credited, `transactions` ledger logged |
| **7** | Non-admin user attempts `GET /admin/farms/pending` | HTTP `403 Forbidden` rejected |
| **8** | Platform analytics query (`GET /admin/analytics`) | Returns accurate aggregate counts & transaction volume |

---

## Definition of Done
- [ ] All 5 Fastify backend admin & dispute endpoints implemented and passing automated test suite (`api/test/admin.test.js`)
- [ ] Farm verification audit trail (`verified_by`, `verified_at`) recorded in database
- [ ] Dispute resolution updates payment escrow states (`refunded` vs `released`) and farmer ledger correctly
- [ ] Next.js Admin Control Center (`/admin/dashboard`) displaying metrics, verification queue, and dispute arbitration UI

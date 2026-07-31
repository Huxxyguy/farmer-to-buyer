# Sprint 3 — Orders, Payments & Escrow Engine
## Web-Based Farmer to Buyer Direct Marketplace

**Duration:** 2 weeks  
**Prerequisites:** Sprint 1 & Sprint 2 complete (`users`, `farms`, `products` APIs, JWT auth, role guards)  
**Depends on:** `orders`, `order_items`, `payments`, `transactions` tables in Prisma schema  

---

## Sprint Goal
Buyers can place produce orders with shipping destination details, inspect snapshotted pricing, pay via Paystack payment gateway, and track order fulfillment. Paystack webhooks verify signature HMAC before holding funds in escrow. Farmers can dispatch produce (`fulfilled`), and buyers can confirm receipt with a single click to release escrow funds directly into the farmer's withdrawable balance and transaction ledger. Includes an automated 7-day auto-release timer.

---

## Non-Negotiable Rules Enforced in Sprint 3
1. **Order Pricing Snapshot**: Prices snapshot at purchase time (`order_items.price_at_purchase`). Changing a product's price later must never retroactively alter historical order pricing.
2. **Paystack Webhook Verification**: `POST /payments/webhook` MUST verify Paystack's signature (`x-paystack-signature` header) before flipping `payments.status` to `held` and `orders.status` to `paid`.
3. **Escrow Hold & Single-Click Release**: Funds held on payment, released only on buyer confirmation or 7-day auto-release.
4. **Farmer Earnings Ledger**: Every released payment updates `farms.balance` and logs a row in `transactions` (`type: "credit"`).

---

## Task Breakdown

### Backend (Fastify API)
1. `POST /api/v1/orders`
   - Guarded by `requireRole(['buyer'])`
   - Payload: `{ items: [{ product_id, quantity }], delivery_address, delivery_state, delivery_city }`
   - Validates produce stock limits.
   - Snapshots `price_at_purchase` from `products.price`.
   - Calculates `total_amount`, creates `Order` (status: `pending`) & `OrderItems`, and decrements `products.quantity_available`.

2. `POST /api/v1/orders/:id/pay`
   - Guarded by `requireRole(['buyer'])`
   - Calls Paystack Initialize Transaction API (or mock sandbox handler) returning `authorization_url` & `reference`.

3. `POST /api/v1/payments/webhook`
   - **Public endpoint** (no user JWT header).
   - Validates Paystack HMAC SHA512 signature header `x-paystack-signature` against `PAYSTACK_SECRET_KEY`.
   - On `charge.success`: updates `orders.status` to `paid` and creates/updates `payments` record with `status: "held"`.

4. `GET /api/v1/orders/my-orders` & `GET /api/v1/orders/:id`
   - Guarded by `requireAuth`
   - Returns buyer orders or farmer incoming orders with items, pricing snapshot, delivery location, and escrow state.

5. `PATCH /api/v1/orders/:id/fulfill`
   - Guarded by `requireRole(['farmer'])`
   - Updates order status to `fulfilled` and sets `fulfilled_at = new Date()`.

6. `POST /api/v1/orders/:id/confirm`
   - Guarded by `requireRole(['buyer'])`
   - Enforces order status is `fulfilled`.
   - Transitions order status to `completed` and payment escrow status to `released`.
   - Credits farmer's `farms.balance` and logs entry in `transactions` ledger (`type: "credit"`, `amount`, `order_id`).

7. **7-Day Automated Escrow Auto-Release Engine**:
   - Interval-based scheduled job inspecting `orders` where `status = 'fulfilled'`, `fulfilled_at <= 7 days ago`, and `disputes` is empty.
   - Auto-releases payment, updates status to `completed`, credits farmer `balance`, and logs transaction ledger.

### Frontend (Next.js App)
8. **Cart & Checkout View (`/checkout` & `/marketplace`)**:
   - Shopping cart state with quantity selectors and shipping address inputs (`delivery_address`, `delivery_state`, `delivery_city`).
   - "Pay via Paystack" button initiating transaction.

9. **Order Management & Escrow Tracking (`/orders/[id]` & `/orders`)**:
   - Order timeline view (`pending` -> `paid` -> `fulfilled` -> `completed`).
   - Buyer view: **"Confirm Receipt & Release Funds"** button (active when `fulfilled`).
   - Farmer view: **"Mark Order Dispatched"** button.
   - Farmer Balance & Ledger View on `/farmer/dashboard` showing withdrawable balance and `transactions` list.

---

## Explicit Test Cases (Definition of Done Verification)

| # | Test Case | Expected Result |
|---|---|---|
| **1** | Buyer places order (`POST /orders`) | Order created at `status: "pending"`, stock decremented, `price_at_purchase` snapshotted |
| **2** | Product price changes after order placement | Existing order item `price_at_purchase` and total remain unchanged |
| **3** | Buyer initiates payment (`POST /orders/:id/pay`) | Returns Paystack authorization URL & reference |
| **4** | Webhook called with invalid HMAC signature | HTTP `401 Unauthorized` rejected (Rule #6) |
| **5** | Webhook called with valid HMAC signature | Order status set to `paid`, payment status set to `held` |
| **6** | Farmer marks order fulfilled (`PATCH /orders/:id/fulfill`) | Order status set to `fulfilled`, `fulfilled_at` timestamp recorded |
| **7** | Buyer confirms receipt (`POST /orders/:id/confirm`) | Order status set to `completed`, payment set to `released`, farmer `balance` credited, `transactions` ledger logged |
| **8** | Unauthorized user attempts receipt confirmation | HTTP `403 Forbidden` rejected |
| **9** | 7-Day Auto-Release service check | Fulfilled orders older than 7 days auto-release escrow to farmer balance |
| **10** | End-to-end UI verification: Checkout -> Payment -> Fulfillment -> Single-Click Escrow Release | Order completes smoothly, farmer balance reflects payout |

---

## Definition of Done
- [ ] All 7 backend endpoints implemented and passing automated test suite (`api/test/orders.test.js`)
- [ ] Paystack HMAC signature verification strictly enforced on webhook endpoint
- [ ] Historical pricing snapshot (`price_at_purchase`) verified immutable
- [ ] Single-click escrow release updates farmer `balance` and logs `transactions` ledger
- [ ] 7-day auto-release cron service verified
- [ ] Next.js checkout & order tracking pages working end-to-end

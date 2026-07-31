# Complete REST API Documentation
## Web-Based Farmer to Buyer Direct Marketplace

**Base URL:** `http://localhost:5000/api/v1`  
**Authentication:** JWT Bearer Token (`Authorization: Bearer <token>`) / Cookie  

---

## 1. Authentication Service (`/api/v1/auth`)

### `POST /auth/register`
- **Description**: Registers a new buyer or farmer user account. Public registration for `role: admin` is rejected with HTTP 400.
- **Request Body**:
  ```json
  {
    "name": "Musa Ibrahim",
    "email": "musa@example.com",
    "phone": "+2348012345678",
    "password": "Password123!",
    "role": "farmer"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "statusCode": 201,
    "user": { "id": "uuid", "name": "Musa Ibrahim", "role": "farmer", "verified": false },
    "token": "eyJhbGciOi..."
  }
  ```

### `POST /auth/login`
- **Description**: Authenticates email and password. Returns generic error on failure.
- **Request Body**: `{ "email": "musa@example.com", "password": "Password123!" }`
- **Response `200 OK`**: `{ "statusCode": 200, "user": {...}, "token": "..." }`

### `GET /auth/me`
- **Description**: Fetches profile for logged-in user.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: `{ "statusCode": 200, "user": {...} }`

---

## 2. Farm Storefront Service (`/api/v1/farms`)

### `POST /farms`
- **Auth**: Required (`farmer`)
- **Request Body**: `{ "farm_name": "Musa Organic Farm", "state": "Kano", "city": "Wudil", "address": "Plot 10 Wudil Road" }`
- **Response `201 Created`**: `{ "farm": { "id": "uuid", "farm_name": "Musa Organic Farm", "verification_status": "pending" } }`

### `GET /farms/my-farm`
- **Auth**: Required (`farmer`)
- **Response `200 OK`**: Returns farmer storefront profile, withdrawable balance, and active inventory items.

### `GET /farms`
- **Auth**: Public
- **Query Params**: `?state=Kano&city=Wudil`
- **Response `200 OK`**: Returns list of verified farms (`verification_status = 'verified'`).

---

## 3. Product Catalog Service (`/api/v1/products`)

### `POST /products`
- **Auth**: Required (`farmer`)
- **Request Body**:
  ```json
  {
    "farm_id": "uuid",
    "name": "Fresh Yellow Maize",
    "category": "Grains",
    "price": 22000,
    "unit": "50kg Bag",
    "quantity_available": 30
  }
  ```
- **Response `201 Created`**: `{ "product": { "id": "uuid", "name": "Fresh Yellow Maize", "price": 22000 } }`

### `GET /products` (Marketplace Search)
- **Auth**: Public
- **Query Params**: `?state=Kano&city=Wudil&category=Grains&search=maize&min_price=10000&max_price=50000`
- **Business Rule #2**: Strictly filters out produce from unverified/pending farms or inactive stock.
- **Response `200 OK`**: `{ "statusCode": 200, "count": 1, "products": [...] }`

---

## 4. Order & Escrow Service (`/api/v1/orders`)

### `POST /orders`
- **Auth**: Required (`buyer`)
- **Request Body**:
  ```json
  {
    "items": [{ "product_id": "uuid", "quantity": 2 }],
    "delivery_address": "No 12 BUK Road",
    "delivery_state": "Kano",
    "delivery_city": "Kano City"
  }
  ```
- **Response `201 Created`**: Snapshots `price_at_purchase`, decrements stock, returns order with status `pending`.

### `POST /orders/:id/pay`
- **Auth**: Required (`buyer`)
- **Response `200 OK`**: `{ "authorization_url": "https://checkout.paystack.com/...", "reference": "FMB-PAY-..." }`

### `POST /payments/webhook` (Paystack Signature Verified)
- **Auth**: Public (Paystack HMAC SHA512 Signature Header `x-paystack-signature`)
- **Response `200 OK`**: Updates order status to `paid` and payment status to `held`.

### `PATCH /orders/:id/fulfill`
- **Auth**: Required (`farmer`)
- **Response `200 OK`**: Updates order status to `fulfilled` and populates `fulfilled_at` timestamp.

### `POST /orders/:id/confirm`
- **Auth**: Required (`buyer`)
- **Response `200 OK`**: Single-click escrow release: sets order status `completed`, payment status `released`, credits farmer `balance`, and logs `transactions` ledger entry.

---

## 5. Admin & Dispute Service (`/api/v1/admin`)

### `POST /admin/farms/:id/verify`
- **Auth**: Required (`admin`)
- **Request Body**: `{ "status": "verified" }`
- **Response `200 OK`**: Updates verification status, logs `verified_by` admin ID and `verified_at` timestamp.

### `POST /admin/disputes/:id/resolve`
- **Auth**: Required (`admin`)
- **Request Body**: `{ "resolution": "resolved_refund" }` OR `{ "resolution": "resolved_release" }`
- **Response `200 OK`**: Arbitrates dispute, issuing refund to buyer or releasing payout to farmer balance.

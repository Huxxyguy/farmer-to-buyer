# Sprint 2 — Farm & Product Management
## Web-Based Farmer to Buyer Direct Marketplace

**Duration:** 2 weeks  
**Prerequisites:** Sprint 1 complete (`users` table, JWT auth, `requireAuth`, `requireRole`)  
**Depends on:** `farms` and `products` tables migrated in Prisma schema  

---

## Sprint Goal
Farmers can create their farm storefront profile, list produce with categories, prices, units, stock levels, and photos, and toggle product availability. Public marketplace buyers can browse and multi-filter produce by State, City, Category, Price, and Keyword. Unverified farmers' products are strictly excluded from public search per Business Rule #2.

---

## Task Breakdown

### Backend (Fastify API)
1. `POST /api/v1/farms`
   - Guarded by `requireRole(['farmer'])`
   - Validates JSON Schema: `farm_name`, `state`, `city`, `address`
   - Creates farm entry with `verification_status: "pending"` (or "verified" if user was pre-verified by admin seed)

2. `GET /api/v1/farms/my-farm`
   - Guarded by `requireRole(['farmer'])`
   - Returns logged-in farmer's farm profile, withdrawable balance, and active product listings

3. `POST /api/v1/products`
   - Guarded by `requireRole(['farmer'])`
   - Validates JSON Schema: `farm_id`, `name`, `category`, `price`, `unit`, `quantity_available`, `photo_url`
   - Rejects if farmer does not own the target `farm_id` with `403 Forbidden`

4. `GET /api/v1/products` (Public Marketplace Engine)
   - Public endpoint with query parameters: `state`, `city`, `category`, `search`, `min_price`, `max_price`, `page`, `limit`
   - **Enforces Business Rule #2**: Joins `farms` and filters `farms.verification_status = 'verified'` AND `products.is_active = true` AND `products.quantity_available > 0`
   - Returns paginated produce array with farm location details

5. `GET /api/v1/products/:id`
   - Public single produce item details view with farm contact & location info

6. `PATCH /api/v1/products/:id` & `PATCH /api/v1/products/:id/status`
   - Guarded by `requireRole(['farmer'])`
   - Allows owner farmer to update price, stock count, or deactivate/soft-delete listing (`is_active: false`)

7. `POST /api/v1/uploads`
   - Multipart file upload handling via `@fastify/multipart`
   - Saves uploaded produce photo to local disk `/uploads` directory and returns public `photo_url`

### Frontend (Next.js App)
8. **Farm Setup Component (`/farmer/dashboard`)**:
   - Storefront setup form if farmer has no farm registered yet
   - Verification status badge indicator (`PENDING ADMIN VERIFICATION` vs `VERIFIED STOREFRONT`)

9. **Farmer Listing Manager (`/farmer/dashboard`)**:
   - Produce creation modal form: Title, Category (Grains, Vegetables, Fruits, Tubers, Livestock), Price (NGN), Unit (kg, bag, basket), Stock Count, and Photo file uploader
   - Active produce list with Edit Price/Stock inline actions and Deactivate toggle

10. **Buyer Marketplace Interface (`/marketplace` & `/buyer/dashboard`)**:
    - Filter bar: State dropdown, City dropdown, Category selector, Search keyword input, Price range slider
    - Responsive Produce Grid Cards: Image, produce title, farm name, location badge (State/City), price/unit, stock indicator, and "Add to Cart" button (stubs for Sprint 3 checkout)

---

## Explicit Test Cases (Definition of Done Verification)

| # | Test Case | Expected Result |
|---|---|---|
| **1** | Register farmer & create farm profile (`POST /farms`) | Farm created with status `pending`, owner set to farmer user ID |
| **2** | Pending farmer creates produce listing (`POST /products`) | Product created in DB, but **excluded** from public `GET /products` marketplace response (Rule #2) |
| **3** | Admin verifies farm (`verification_status = 'verified'`) | Produce listing immediately appears in public `GET /products` search |
| **4** | Filter `GET /products?state=Kano&city=Wudil&category=Grains` | Returns only active grains from verified farms in Wudil, Kano |
| **5** | Keyword search `GET /products?search=rice` | Returns matching produce titles (case-insensitive substring match) |
| **6** | Farmer updates price & stock count (`PATCH /products/:id`) | Product updated in DB and reflected in public marketplace detail endpoint |
| **7** | Farmer deactivates listing (`is_active = false`) | Listing removed from public `GET /products` results |
| **8** | Buyer token calls `POST /products` | HTTP `403 Forbidden` rejected (Only farmers can create listings) |
| **9** | Upload produce image (`POST /uploads`) | Multi-part upload succeeds, file saved on disk, valid `photo_url` returned |
| **10** | End-to-end UI verification: Farmer adds produce item with photo -> Buyer filters produce by State/City on `/marketplace` | Produce card renders with image, price, stock, and farm location details |

---

## Definition of Done
- [ ] All 7 backend routes implemented and passing automated test suite (`api/test/products.test.js`)
- [ ] Business Rule #2 strictly enforced: unverified farms' items never appear in public search queries
- [ ] Image upload via `@fastify/multipart` functional and saving images to disk
- [ ] Next.js Farmer Dashboard allows creating & editing produce listings with photo upload
- [ ] Next.js Buyer Marketplace allows interactive State/City/Category produce filtering

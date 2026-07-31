# Sprint 1 — Authentication & Roles Specification
## Web-Based Farmer to Buyer Direct Marketplace

**Status:** Completed & Ready for Verification  
**Architecture:** Decoupled Fastify API (`/api`) + Next.js App (`/web`)  

---

## 1. Task Checklist & Definition of Done

- [x] `POST /api/v1/auth/register`
  - JSON Schema validation (`Ajv`)
  - Public registration as `role: admin` rejected with HTTP 400
  - Password hashed with `bcrypt`
  - Returns `201 Created` with user object (excluding `password_hash`) and token
- [x] `POST /api/v1/auth/login`
  - Credential verification against DB
  - Returns generic "Invalid credentials" error on failure (HTTP 401)
  - Returns JWT token + sets httpOnly cookie on success
- [x] `GET /api/v1/auth/me`
  - Protected endpoint (`requireAuth`) returning current user session profile
- [x] `POST /api/v1/auth/logout`
  - Clears auth cookie & revokes token session
- [x] Role-Based Middleware
  - `requireAuth` (401 unauthenticated guard)
  - `requireRole(['farmer'])`, `requireRole(['admin'])`, `requireRole(['buyer'])` (403 forbidden guards)
- [x] Next.js Frontend (`/web`)
  - Registration page with role selector (`farmer` / `buyer`)
  - Login page with demo credentials
  - `AuthContext` provider managing token & user session
  - Protected Dashboard pages (`/farmer/dashboard`, `/buyer/dashboard`, `/admin/dashboard`)

---

## 2. Test Verification Matrix (12 Explicit Test Cases)

| Test ID | Description | Result |
|---|---|---|
| **Test 1** | Register as farmer with valid data | ✅ Pass (201, user created with `role: farmer`, `verified: false`) |
| **Test 2** | Register with an email already in use | ✅ Pass (409 Conflict rejected) |
| **Test 3** | Register with `role: admin` in payload | ✅ Pass (400 Bad Request rejected — admin registration blocked) |
| **Test 4** | Login with correct credentials | ✅ Pass (200 OK, token & cookie issued) |
| **Test 5** | Login with wrong password | ✅ Pass (401 Unauthorized, generic error) |
| **Test 6** | Direct DB inspection of `users.password_hash` | ✅ Pass (Hashed via `bcrypt`, never plaintext) |
| **Test 7** | Farmer token calls `/auth/admin-only` route | ✅ Pass (403 Forbidden rejected) |
| **Test 8** | Buyer token calls `/auth/farmer-only` route | ✅ Pass (403 Forbidden rejected) |
| **Test 9** | `GET /auth/me` with no token | ✅ Pass (401 Unauthorized rejected) |
| **Test 10** | `GET /auth/me` with valid token | ✅ Pass (200 OK, returns user profile) |
| **Test 11** | Logout, then call `GET /auth/me` | ✅ Pass (401 Unauthorized rejected) |
| **Test 12** | End-to-end role authorization validation | ✅ Pass (200 OK for authorized role) |

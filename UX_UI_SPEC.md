# UX/UI Design & Interface Specification
## Farmer to Buyer Direct Marketplace Platform

**Document Version:** 1.0.0  
**Date:** September 2026  
**Status:** Production / Final Design Documentation  
**Repository:** [Farmer-to-Buyer Marketplace](https://github.com/Huxxyguy/farmer-to-buyer.git)

---

## 1. UX Design Philosophy & Core Principles

The **Farmer to Buyer Direct Marketplace** UI design system is built around three core pillars:
1. **Trust & Transparency**: Highlighting verified storefront badges, escrow status banners, and rating scores (`⭐ 4.8 / 5.0`) to instill confidence in direct digital agricultural transactions.
2. **Accessibility for Agricultural Stakeholders**: Clean typography, high-contrast HSL color palettes, clear button CTAs, and simplified forms suitable for mobile device usage in field environments.
3. **Rich Modern Visual Aesthetics**: Micro-animations, dynamic cards with visual borders, subtle glassmorphism overlay banners, and responsive multi-column layouts.

---

## 2. Design Tokens & CSS System (`globals.css`)

### Color Palette (HSL & Hex Variables)

```css
:root {
  /* Brand Core Colors */
  --primary-green: #16a34a;       /* Fresh Agricultural Green */
  --primary-hover: #15803d;       /* Darker Forest Green */
  --accent-green: #22c55e;        /* Vibrant Success Accent */
  
  /* Status & Role Accents */
  --accent-amber: #f59e0b;        /* Escrow Held / Pending Rating */
  --accent-blue: #3b82f6;         /* Information & Active Inventory */
  --accent-purple: #8b5cf6;       /* Admin Governance */
  --accent-red: #ef4444;          /* Danger / Dispute Warnings */
  
  /* Neutral Palette */
  --bg-main: #f8fafc;             /* Light Slate Background */
  --card-bg: #ffffff;             /* Crisp Pure White Surface */
  --border-color: #e2e8f0;        /* Subtle Border Lines */
  --text-primary: #0f172a;        /* High-Contrast Deep Slate */
  --text-secondary: #64748b;      /* Slate Muted Text */
  
  /* Typography & Layout Spacing */
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-main: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  --shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
}
```

---

## 3. Global Navigation & Layout Architecture

### Navigation Header (`Navbar.js`)
The navigation bar is pinned to the top of every screen and contains:
* **Brand Identity Logo**: `🌾 Farmer2Buyer` linking to home `/`.
* **Global Navigation Links**:
  * `🛒 Marketplace`: Public produce catalog.
  * `📦 My Orders`: Escrow order tracking.
  * `🌱 Seller Portal`: Farmer dashboard (visible for farmer accounts).
  * `👑 Admin`: Governance panel (visible for admin accounts).
* **Global Action Controls**:
  * **`← Back` Button**: Dynamic history navigation allowing users to easily navigate to the previous screen.
  * **User Session Pill**: Displays logged-in user name and role badge (`BUYER`, `FARMER`, `ADMIN`).
  * **Login / Register Buttons**: Displayed when session is unauthenticated.

```
+-----------------------------------------------------------------------------------+
| 🌾 Farmer2Buyer   ← Back | 🛒 Marketplace  📦 My Orders  🌱 Seller Portal  | [User] Logout |
+-----------------------------------------------------------------------------------+
```

---

## 4. User Journeys & Screen Specifications

### Journey 1: Buyer Discovery, Escrow Checkout & Order Receipt

```
+------------------+    +-------------------+    +--------------------+    +--------------------+
|   Marketplace    | -> |  Order Cart Modal | -> | Paystack Escrow    | -> |  Order Details &   |
| Browse & Filter  |    | Address & State   |    | Payment Gateway    |    | Confirm Receipt    |
+------------------+    +-------------------+    +--------------------+    +--------------------+
                                                                                     |
                                                                                     v
                                                                           +--------------------+
                                                                           | Rate Seller        |
                                                                           | (1-5 Star Review)  |
                                                                           +--------------------+
```

#### Screen Specification: Produce Marketplace (`/marketplace`)
* **Location Filters**: State dropdown (e.g. `Kano`, `Kaduna`, `Oyo`), LGA/City text input (e.g. `Wudil`), Produce Category pills (`Grains`, `Vegetables`, `Fruits`, `Tubers`, `Livestock`), and Keyword search box.
* **Produce Cards**:
  * Produce thumbnail photo / fallback icon.
  * State & City location tag (e.g. `📍 Wudil, Kano`).
  * Produce Title & Farm Storefront Name.
  * **Seller Reputation Score**: Rating badge (`⭐ 4.8 (12 reviews)`) or `New Seller`.
  * Unit Price in Naira (`₦22,000 / 50kg Bag`).
  * Stock count available.
  * `+ Add to Order Cart` button with quantity increment/decrement controls.
* **Floating Cart Summary Banner**: Displays total items selected, cumulative total amount (`₦`), and a `Proceed to Escrow Checkout →` button.

#### Screen Specification: Order Tracking & Receipt (`/orders/[id]`)
* **Escrow Status Banner**: Highlighted amber card showing escrow protection state (`HELD IN ESCROW`).
* **Order Item Table**: Displays item names, snapshotted price per unit, ordered quantity, and line total.
* **Lifecycle Action Buttons**:
  * `⚡ Instant Pay (Dev Test)` & `💳 Pay via Paystack` (when status is `pending`).
  * `CONFIRM RECEIPT & RELEASE FUNDS TO FARMER` (when status is `fulfilled`).
  * `🚩 Report Issue / Open Dispute` (when status is `paid` or `fulfilled`).
* **Verified Rating Form**: Displays 1-5 star dropdown selector and feedback text area once order is `completed`.

---

### Journey 2: Farmer Storefront Setup, Catalog & Bank Payout Withdrawal

```
+--------------------+    +-------------------+    +--------------------+    +--------------------+
|  Register Farm     | -> |  Add / Edit       | -> | Dispatch Incoming  | -> | 💸 Withdraw Earnings|
|  Storefront        |    |  Produce Listing  |    | Buyer Sales Orders |    | to Nigerian Bank   |
+--------------------+    +-------------------+    +--------------------+    +--------------------+
```

#### Screen Specification: Seller Portal (`/farmer/dashboard`)
* **Storefront Banner**: Displays Farm Name, Location (City, State), and KYC Status (`VERIFIED` in green or `PENDING` in amber).
* **Metrics Cards Grid**:
  1. **Available Farm Balance**: Cumulative released earnings in Naira with a prominent `💸 Withdraw to Bank` button.
  2. **Active Inventory Listings**: Total catalog items.
  3. **Incoming Buyer Orders**: Total sales orders.
  4. **Customer Reputation**: Average rating score (`⭐ 4.8 / 5.0`) and total verified review count.
* **Bank Withdrawal Modal (`showWithdraw`)**:
  * Form inputs for **Amount to Withdraw (₦)** (capped at current available balance).
  * **Bank Dropdown**: Selection of commercial/digital banks (First Bank, GTBank, Zenith, Access, UBA, Kuda, Moniepoint, OPay, etc.).
  * **10-Digit NUBAN Account Number** & **Account Holder Name**.
  * `Confirm Bank Payout Transfer` CTA button.
* **Financial Ledger Table**: Audit log showing dates, transaction types (`CREDIT` / `WITHDRAWAL`), descriptions, and amounts.
* **Dispatch Management Table**: List of buyer orders with `Dispatch Order` action buttons.
* **Catalog Inventory Grid**: Cards displaying produce listings with toggles for `Edit Price/Stock` and `Deactivate/Activate`.
* **Verified Customer Reviews List**: Displays customer ratings, reviewer names, and feedback comments.

---

### Journey 3: Admin KYC Verification & Dispute Arbitration

```
+--------------------+    +-------------------+    +--------------------+
| Pending Storefronts| -> | Dispute Queue     | -> | Platform Analytics |
| Review & Approve   |    | Refund / Release  |    | Metrics Dashboard  |
+--------------------+    +-------------------+    +--------------------+
```

#### Screen Specification: Admin Governance Dashboard (`/admin/dashboard`)
* **Analytics Header Grid**: Platform GMV sales, total escrow held, active farms count, and verified buyer count.
* **Pending Storefront Verification Queue**: List of registered farm storefronts awaiting KYC approval with `Approve Storefront` and `Reject Storefront` CTAs.
* **Open Dispute Arbitration Queue**: List of disputed orders with reason description, buyer/farmer details, and dual action buttons:
  * `Refund Buyer`: Reverses payment state to `refunded`.
  * `Release to Farmer`: Transfers payment to farmer balance and marks order `completed`.
* **Administrator Order Lifecycle Override**: Manual status selection panel on `/orders/[id]` allowing admins to set status to `PAID`, `FULFILLED`, `COMPLETED`, or `DISPUTED`.

---

## 5. Visual UI Components Specification

### Card Components (`.card`)
* White background (`#ffffff`), 1px slate border (`#e2e8f0`), rounded corners (`10px`), subtle box shadow (`0 4px 6px -1px rgba(0,0,0,0.05)`).

### Badges (`.badge`)
* `.badge-farmer`: Light green background (`#dcfce7`), dark green text (`#15803d`).
* `.badge-buyer`: Light blue background (`#dbeafe`), dark blue text (`#1e40af`).
* `.badge-admin`: Light purple background (`#f3e8ff`), dark purple text (`#6b21a8`).

### Alert Banners (`.alert`)
* `.alert-success`: Soft green background (`#f0fdf4`), green border (`#bbf7d0`), green text (`#166534`).
* `.alert-danger`: Soft red background (`#fef2f2`), red border (`#fecaca`), red text (`#991b1b`).

---

## 6. Accessibility & Responsive Breakpoints

* **Mobile Devices**: `< 640px` (Single column layout, stacked form fields, scrollable data tables).
* **Tablets**: `640px - 1024px` (Two-column grid layout, sticky cart header).
* **Desktop Monitors**: `> 1024px` (Four-column metrics grid, side-by-side filter navigation, full table layouts).
* **Contrast Compliance**: High-contrast text `#0f172a` against white `#ffffff` background complying with WCAG 2.1 AA readability standards.

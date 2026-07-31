# Platform User Manual
## Web-Based Farmer to Buyer Direct Marketplace

---

## 1. Getting Started

### Demo Account Credentials
- **Admin Portal**: Email: `admin@marketplace.ng` | Password: `Admin123!`
- **Farmer Portal**: Email: `farmer@marketplace.ng` | Password: `Farmer123!`
- **Buyer Portal**: Email: `buyer@marketplace.ng` | Password: `Buyer123!`

---

## 2. Farmer User Guide

### 2.1 Registration & Storefront Setup
1. Visit `http://localhost:3000/register`.
2. Select the **Farmer** role tab.
3. Enter your Name, Email, Phone number, and Password, then click **Register**.
4. On your **Farmer Dashboard**, enter your Farm Name, State, City, and Address to set up your storefront.
5. *Note*: New farm storefronts display **PENDING ADMIN APPROVAL** until verified by an Administrator.

### 2.2 Adding & Managing Produce Listings
1. On your Farmer Dashboard, click **+ Add Produce Listing**.
2. Fill in Produce Title (e.g. *Fresh Local Tomatoes*), Category (Grains, Vegetables, Fruits, Tubers, Livestock), Price per Unit (₦), Unit (50kg Bag, Basket, kg), Stock Quantity, and optional Photo URL.
3. Click **Publish Produce Listing**.
4. To temporarily pause sales of an item, click **Deactivate**.

### 2.3 Dispatching Orders & Tracking Earnings
1. When a buyer places an order, it appears under **Recent Orders** on your dashboard.
2. Once you ship or dispatch the produce to the buyer's delivery destination, click **Mark Produce Dispatched / Fulfilled**.
3. Once the buyer confirms receipt, the escrow funds will automatically transfer to your **Withdrawable Balance** and log a credit entry in your **Transactions Ledger**.

---

## 3. Buyer User Guide

### 3.1 Browsing & Location Filtering
1. Visit `http://localhost:3000/marketplace`.
2. Use the Filter Toolbar to select your State (e.g. *Kano*), City/LGA (e.g. *Wudil*), Category, or type a keyword (e.g. *Rice*).
3. Browse verified farm-gate produce listings with transparent prices and stock levels.

### 3.2 Ordering & Paystack Checkout
1. Click **Add to Order Cart** on a produce item.
2. Enter your shipping **Delivery Address**, **City**, and **State**.
3. Click **Pay via Paystack**. You will be directed to Paystack's secure checkout page.
4. After completing payment, your order status updates to `PAID (HELD IN ESCROW)`.

### 3.3 Inspecting Goods & Single-Click Escrow Release
1. When the farmer delivers your produce, inspect the items.
2. Go to your Order Details page (`/orders/[id]`).
3. Click **CONFIRM RECEIPT & RELEASE FUNDS TO FARMER**.
4. The payment state updates to `RELEASED`, crediting the farmer.
5. Submit a 1-to-5 star rating and review comment for the farmer!

---

## 4. Administrator Guide

### 4.1 Farm Verification Queue
1. Log in with Admin credentials (`admin@marketplace.ng`).
2. Go to the Admin Dashboard (`/admin/dashboard`).
3. Under **Farm Verification Queue**, inspect pending farmer storefronts.
4. Click **Approve Farm** to publish the farm's produce listings to the public marketplace. The system records your Admin ID and timestamp for accountability.

### 4.2 Dispute Resolution Queue
1. If a buyer or farmer raises a dispute, it appears under **Dispute Resolution Queue**.
2. Inspect the dispute reason and order details.
3. Click **Refund Buyer** to issue a full refund, or click **Release Payout to Farmer** to complete the escrow transfer.

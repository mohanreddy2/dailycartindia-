# DailyCart India — End-to-end SOP

**Product:** DailyCart (DailyMart groceries + DailyServe neighbourhood services)  
**Company:** Daily Cart 24/7 Pvt Ltd  
**Code:** [github.com/mohanreddy2/dailycartindia-](https://github.com/mohanreddy2/dailycartindia-)  
**Last updated:** 21 August 2026  

Use this document to run the live shop, onboard partners, fulfill orders, take payments, deploy code, and recover when something fails. Read **section 1** if you only need URLs; follow **sections 5–9** for the actual day-to-day work. To **see or edit MongoDB data**, use [section 16](#16-database--read-and-update-live-data) and [`SOP_DATABASE.md`](SOP_DATABASE.md).

---

## Contents

1. [Live map (URLs, services, logins)](#1-live-map-urls-services-logins)
2. [Technology stack](#2-technology-stack)
3. [How the system is wired](#3-how-the-system-is-wired)
4. [Who does what](#4-who-does-what)
5. [Customer — grocery order (DailyMart)](#5-customer--grocery-order-dailymart)
6. [Customer — service booking (DailyServe)](#6-customer--service-booking-dailyserve)
7. [Partner — join, KYC, sell (DailyPro)](#7-partner--join-kyc-sell-dailypro)
8. [Admin — run the marketplace (Ops)](#8-admin--run-the-marketplace-ops)
9. [Payments — COD and Razorpay](#9-payments--cod-and-razorpay)
10. [Ship a code change](#10-ship-a-code-change)
11. [Environment variables](#11-environment-variables)
12. [Local development](#12-local-development)
13. [Troubleshooting (mapped to each failure)](#13-troubleshooting-mapped-to-each-failure)
14. [Hard rules](#14-hard-rules)
15. [Contacts](#15-contacts)
16. [Database — read and update live data](#16-database--read-and-update-live-data)

---

## 1. Live map (URLs, services, logins)

### Public surfaces

| What | URL |
|------|-----|
| Customer shop | https://dailycartindia.com |
| Same shop (www) | https://www.dailycartindia.com |
| Customer login / register | https://dailycartindia.com/auth |
| Become a partner | https://dailycartindia.com/partner |
| Vendor login | https://dailycartindia.com/vendor/auth |
| Vendor portal (DailyPro) | https://dailycartindia.com/vendor |
| Admin login (**not** `/auth`) | https://dailycartindia.com/admin/login |
| Admin / Ops | https://dailycartindia.com/admin |
| Privacy / Terms / Refund | `/privacy` · `/terms` · `/refund` |
| API | https://dailycart-api.onrender.com |
| Health check | https://dailycart-api.onrender.com/api/health |
| Payment flags | https://dailycart-api.onrender.com/api/payments/methods |
| robots.txt | https://dailycartindia.com/robots.txt |
| Sitemap | https://dailycartindia.com/sitemap.xml |
| API docs | https://dailycart-api.onrender.com/docs |

One React app serves **three portals**. There is not a separate website per role.

### Render services

| Service | Type | Role | Rule |
|---------|------|------|------|
| **`dailycart-api`** | Python web | FastAPI | Blueprint-managed. Free plan **sleeps**; first request can take ~50 seconds. |
| **`dailycartindia-web`** | Static | **Live shop** | Auto-deploy from GitHub is unreliable. After every frontend change: **Manual Deploy → Deploy latest commit**. |

DNS (Squarespace): `www` CNAME → `dailycartindia-web.onrender.com`; apex A `216.24.57.1` (confirm in Render if it changes).

### Seeded logins (change immediately on a real shop)

| Role | Portal | Email | Password |
|------|--------|-------|----------|
| Admin | `/admin` | `admin@dailycart.in` | `Admin@123` |
| Customer | `/auth` then `/` | `customer@dailycart.in` | `Demo@123` |
| Mart vendor | `/vendor` | `vendor.mart@dailycart.in` | `Demo@123` |
| Service vendor | `/vendor` | `vendor.service@dailycart.in` | `Demo@123` |

Self-register on `/auth` or `/vendor/auth` always creates a **customer**. Admin cannot be self-registered. Admin access needs JWT `capabilities` including `"admin"`.

Token is stored in the browser as `dc_token`. Logout from the portal to clear it.

---

## 2. Technology stack

| Layer | Technology | Path / notes |
|-------|------------|----------------|
| Frontend | React 19, CRA + CRACO, React Router 7, Tailwind, shadcn/ui (Radix), Axios | `frontend/` |
| State | React context: auth, cart, location | `frontend/src/lib/store` |
| Backend | Python 3.11, FastAPI, Uvicorn | `backend/server.py` → `app` |
| Auth | JWT + bcrypt | `backend/core.py`, `backend/routers/auth_routes.py` |
| Database | MongoDB Atlas, Motor, 2dsphere geo | `MONGO_URL`, `DB_NAME=dailycart` |
| Payments | Razorpay Standard Checkout + COD | `backend/payments.py`, `frontend/src/lib/razorpay.js` |
| Hosting | Render Free (Oregon) | `dailycart-api` + `dailycartindia-web` |
| Domain | Squarespace DNS + Render TLS | `dailycartindia.com` |
| Source | GitHub `main` | `mohanreddy2/dailycartindia-` |
| Python deps (Render) | `backend/requirements-filtered.txt` | Skip unused `emergentintegrations` |

**Not used in production:** Emergent integrations, SMS OTP provider, AWS S3.

Frontend talks to the API via `REACT_APP_BACKEND_URL` (baked in at **build** time). Live value: `https://dailycart-api.onrender.com` — **no** trailing `/api`. Axios then calls `{BACKEND}/api/...`.

---

## 3. How the system is wired

```
Customer / Vendor / Admin browser
        │  https://dailycartindia.com
        ▼
React static site   Render service: dailycartindia-web
        │  HTTPS  {REACT_APP_BACKEND_URL}/api/*
        ▼
FastAPI             Render service: dailycart-api
        │
        ├── MongoDB Atlas   database: dailycart
        └── Razorpay        create order + verify signature (live keys)
```

| Code area | Responsibility |
|-----------|----------------|
| `frontend/src/pages/customer/` | Home, search, store, cart, checkout, orders, bookings, legal |
| `frontend/src/pages/vendor/` | Onboarding, inventory, orders, jobs, earnings |
| `frontend/src/pages/admin/` | Dashboard, KYC, vendors, users, orders, bookings, disputes |
| `backend/routers/public_routes.py` | Cities, categories, GPS discovery (public — **no KYC IDs**) |
| `backend/routers/auth_routes.py` | Register, login, OTP (dev mode) |
| `backend/routers/customer_routes.py` | Checkout, bookings, cancel, reviews, disputes |
| `backend/routers/vendor_routes.py` | Onboarding, catalog, order/job status |
| `backend/routers/admin_routes.py` | KYC decide, vendors, users, disputes |
| `backend/routers/payment_routes.py` | Razorpay create / confirm |
| `backend/core.py` | JWT, `public_vendor()`, `ORDER_FLOW`, `BOOKING_FLOW` |
| `backend/seed.py` | Demo cities, stores, users |

Discovery only returns vendors with `kyc_status=approved` and `is_active=true`. Public JSON must go through `public_vendor()` so `kyc`, `kyc_status`, and `user_id` are stripped.

### Seeded supply (after `seed.py`)

8 cities: Hyderabad, Bangalore, Visakhapatnam, Bhimavaram, Pune, Delhi, Mumbai, Chennai.  
~4 kirana stores and ~6 service pros per city. Home uses GPS or a city picker; empty nearby results usually mean the pin is not near seeded supply.

---

## 4. Who does what

| Actor | Can do | Cannot do in the UI today |
|-------|--------|---------------------------|
| **Customer** | Register, shop, book, COD checkout, cancel early, review after done, open a dispute | Become admin; see another user’s orders |
| **Mart vendor** | Inventory CRUD, accept/advance/reject grocery orders, earnings | Approve own KYC; change another store |
| **Service vendor** | Services CRUD, availability, accept/advance/decline jobs | Same as above |
| **Admin** | KYC, vendors, users, process orders/bookings, **catalog CRUD**, **reset passwords**, **make admin** | Remove your own admin access; skip order/booking steps |

Catalog photos, prices, and stock can be changed by the **vendor** on `/vendor` **or by ops** on `/admin/vendors` → catalog (boxes icon). Legal pages (`/privacy`, `/terms`, `/refund`, `/partner`) are code — change them in git, then redeploy **`dailycartindia-web`**.

---

## 5. Customer — grocery order (DailyMart)

**Happy path**

1. Open https://dailycartindia.com  
   If the first load hangs, the API is waking up. Wait ~50 seconds and refresh.
2. Allow location **or** pick a city (Hyderabad / Bangalore / …). Discovery is geo-based (`/api/discovery?lat=&lng=`).
3. Browse stores on Home, or Search. Open a store `/store/:id`.
4. Add products. The cart **splits by store**. Checkout can create **one order per store**.
5. Open `/checkout`. Login if prompted (`/auth?next=/checkout`).
6. Enter a delivery address line (city/lat/lng come from the location picker).
7. Choose **Cash on delivery** (always) or **Pay online** (only if Razorpay is enabled — see section 9).
8. Place order.
   - COD → `POST /api/orders/checkout` → orders with `status: placed`, `payment_status: pending`.
   - Online → create Razorpay session → pay → `POST /api/payments/razorpay/confirm` → orders with `payment_status: paid`.
9. Customer sees orders at `/orders`. Timeline updates as the store advances status.
10. Customer may **cancel only while status is `placed`**. After the store accepts, cancel is blocked. Stock is restored on cancel or vendor reject.
11. After `delivered`, customer can **review** (once) and/or open a **dispute**.

**Order status machine (vendor advances one step at a time)**

```
placed → accepted → picking → ready → out_for_delivery → delivered
   │
   └── rejected (only from placed; stock restored)
   └── cancelled by customer (only from placed; stock restored)
```

Vendor **or admin** buttons: Accept → Start picking → Mark ready → Out for delivery → Mark delivered.
Ops process at https://dailycartindia.com/admin/orders (same steps; cannot skip).

**If this flow fails**

| Symptom | What to do |
|---------|------------|
| No stores / empty home | Wrong city or GPS far from seeded pins. Pick Hyderabad or Bangalore. Confirm `/api/health` is `database: true`. |
| “Store unavailable” at checkout | Vendor KYC not approved, or admin deactivated them. |
| Out of stock | Vendor inventory `stock_qty`. Customer cannot override. |
| Checkout 401 | Not logged in, or token expired. Login again. |
| Pay online missing or merchant error | Section 9 and 13-D / 13-E. Use COD. |

---

## 6. Customer — service booking (DailyServe)

**Happy path**

1. Home or Search → service pro `/pro/:id` → pick a service → `/book/:serviceId`.
2. Login if needed. Choose date + slot (`/api/services/{id}/slots`). Enter address and notes.
3. Pay COD or Razorpay (same payment rules as grocery).
4. Booking is created with `status: requested`.
5. Customer tracks at `/orders` (bookings tab) or `/bookings/:id`.
6. Cancel allowed only while `requested` or `accepted`. After the pro is en route, cancel is blocked.
7. After `completed`, customer can review once and/or open a dispute.

**Booking status machine**

```
requested → accepted → en_route → in_progress → completed
     │
     └── declined (only from requested)
     └── cancelled by customer (requested or accepted only)
```

Slot clash: if another booking already holds that date/time (not cancelled/declined/completed), API returns 409 — pick another slot.

Vendor **or admin** buttons: Accept job → Start travel → Begin work → Mark completed. **Reject** on a new request sets status to `declined`.
Ops process at https://dailycartindia.com/admin/bookings (same steps; cannot skip).

**If this flow fails**

| Symptom | What to do |
|---------|------------|
| No slots | Vendor availability not set, or all default slots taken. Vendor: `/vendor/availability`. |
| “Provider unavailable” | KYC pending/rejected or `is_active` false. Admin KYC / Vendors screen. |
| Slot just booked | 409 conflict. Choose another time. |

---

## 7. Partner — join, KYC, sell (DailyPro)

Partners are **kirana/mart** or **home service**. Same portal: `/vendor`.

### 7.1 Join

1. Customer site → **Become a partner** (`/partner`) → **Continue to partner login** → `/vendor/auth`.
2. Register a new account **or** log in with an existing customer account.
3. If the user has **no vendor profile** → `/vendor/onboarding`.
4. Onboarding:
   - Type: Mart **or** Service (not both on one profile).
   - Name, address, city, map pin (lat/lng).
   - Categories (must match the products/services they add).
   - KYC id type + number (stored on the vendor record; **never** shown on public discovery).
   - Optional initial products (mart) or services (service).
5. Submit → `POST /api/vendor/onboarding` → `kyc_status: pending`. User gains `mart_vendor` or `service_vendor` capability.
6. Until ops approve KYC, DailyPro shows a **Verification in progress** gate (polls every 30 seconds). They cannot take live orders yet. Discovery will not list them.
7. Admin: `/admin/kyc` → Approve or Reject (optional note).
8. On approve, the gate lifts. Partner can sell.

Rejected KYC: vendor sees the note and is told to contact support. They cannot re-submit in the UI; ops must coordinate (new user, or a code/DB change).

### 7.2 Mart day-to-day

| Screen | Path | Work |
|--------|------|------|
| Dashboard | `/vendor` | Pending/active orders, earnings, low stock |
| Orders | `/vendor/orders` | Advance or reject (polls every 10s) |
| Inventory | `/vendor/inventory` | Add / edit / delete products, stock, price, image |
| Earnings | `/vendor/earnings` | Sum of **delivered** orders |
| Profile | `/vendor/profile` | Name, hours/open flag, min order, delivery fee |

### 7.3 Service day-to-day

| Screen | Path | Work |
|--------|------|------|
| Dashboard | `/vendor` | Pending/active jobs, earnings |
| Jobs | `/vendor/jobs` | Advance or decline |
| Services | `/vendor/services` | Catalogue CRUD |
| Availability | `/vendor/availability` | Working hours / slot basis |
| Earnings | `/vendor/earnings` | Sum of **completed** bookings |

### 7.4 Alternate: admin creates the vendor

Ops can attach a vendor profile to an existing **active user** on `/admin/vendors` (still starts KYC pending). Use this when the partner already has a customer login.

**If this flow fails**

| Symptom | What to do |
|---------|------------|
| Partner stuck on KYC gate | Admin has not approved. `/admin/kyc`. |
| Partner not on Home | KYC must be **approved** and `is_active` true. Pin must be near the customer’s city. |
| “You already have a vendor profile” | One vendor per user. Use that login. |
| Access denied on `/vendor` | Logged in as a customer with no vendor profile — go to onboarding, or use vendor demo login. |

---

## 8. Admin — run the marketplace (Ops)

Log in only at **https://dailycartindia.com/admin/login** with `admin@dailycart.in`.  
If you previously used `/auth` as a customer, **logout first** or you will see Access denied.

| Screen | Path | What to do |
|--------|------|------------|
| Dashboard | `/admin` | Users, live vendors, pending KYC, active orders/bookings, open disputes, GMV (delivered orders + completed bookings) |
| KYC | `/admin/kyc` | Filter pending / approved / rejected. Open a row → Approve or Reject with a note. This is the gate that puts a partner on the public map. |
| Vendors | `/admin/vendors` | List, create, edit name/address/geo/fees, toggle **active**. Boxes icon → **catalog** (add/edit/delete products or services). |
| Users | `/admin/users` | Create customer (name, email, password, phone). Edit name/email/phone. **Reset password** (optional new password on edit). **Make admin** / remove admin (shield icon). Deactivate (soft delete; also deactivates their vendor). |
| Orders | `/admin/orders` | Watch **and process** grocery orders: Accept → picking → ready → out for delivery → delivered. Reject only while `placed`. Same rules as the store. |
| Bookings | `/admin/bookings` | Watch **and process** jobs: Accept → start travel → begin work → completed. **Reject** only while `requested` (status becomes `declined`). Same rules as the pro. |
| Disputes | `/admin/disputes` | Open disputes from customers. Write a resolution → mark resolved. |

**Typical ops sequence for a new kirana**

1. Partner registers (section 7) **or** admin creates a user then a vendor.
2. KYC queue → verify ID offline if needed → Approve.
3. Ask partner to add real photos/prices on `/vendor/inventory`.
4. Spot-check Home in that city.
5. Watch `/admin/orders` after the first customer order. If the store is slow, ops can **Accept / pack / deliver** (or **Reject**) from that screen.

**How to process an order as admin**

1. Log in at https://dailycartindia.com/admin/login
2. Open **Orders** (https://dailycartindia.com/admin/orders)
3. Filter **Placed** for new work
4. Click **Accept order**, then **Start picking** → **Mark ready** → **Out for delivery** → **Mark delivered**
5. **Reject** only on a new (`placed`) order — that restores stock
6. You cannot jump to Delivered in one click. Customer cancel still only works before Accept.

**How to process a booking as admin**

1. Open **Bookings** (https://dailycartindia.com/admin/bookings)
2. Filter **Requested** for new work
3. Click **Accept job**, then **Start travel** → **Begin work** → **Mark completed**
4. **Reject** only on a new (`requested`) booking — stored as `declined`
5. **Cancel booking** only while `requested` or `accepted` (same window as the customer). After **Start travel**, cancel is blocked.
6. You cannot jump to Completed in one click.

**What admin cannot do (do not look for these buttons)**

- Remove **your own** admin access or delete your own admin account
- Skip order or booking steps (orders: placed → accepted → picking → ready → out_for_delivery → delivered; bookings: requested → accepted → en_route → in_progress → completed)
- Refund Razorpay (do that in the Razorpay Dashboard, and only after live capture works)

---

## 9. Payments — COD and Razorpay

| Method | When it works | Order/booking result |
|--------|----------------|----------------------|
| **Cash on delivery** | Always, if API is up | `payment_method: cod`, `payment_status: pending`. Collect cash on delivery / at the job. |
| **Pay online** | Razorpay env vars set **and** Razorpay has enabled live capture | `payment_method: razorpay`, `payment_status: paid` after signature verify |

Checkout UI calls `GET /api/payments/methods`. If `"razorpay": true`, the Pay online button appears (and is selected by default).

**Online pay sequence (app)**

1. `POST /api/payments/razorpay/create` with purpose `checkout` or `booking` → Razorpay order + `intent_id` stored in Mongo `payment_intents`.
2. Browser opens Razorpay Checkout with **`order_id` only** (do not also send `amount` — that broke live mode). Phone prefill only if it is a 10-digit Indian mobile.
3. Customer pays. Razorpay returns `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature`.
4. `POST /api/payments/razorpay/confirm` verifies signature, then creates the DailyCart order(s) or booking.

COD **must not** use the Razorpay endpoints. Online **must not** use `/orders/checkout` with a non-cod method.

### Known live blocker (August 2026)

Symptoms: Razorpay window opens → **“Uh! oh! … issue with the merchant”** → UPI banner **account not enabled to accept transactions**.

- App and `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` can still be correct.
- Razorpay Dashboard → **Orders**: status **Created**. **Payments**: ₹0 captured.
- Only **Razorpay support** can enable live capture.
- **Use COD** until they enable it. Cancel leftover Created orders in Razorpay if needed.
- Do not click Pay online for real money while this is blocked.

Razorpay Dashboard checks: Test Mode **OFF** for live keys; website `https://dailycartindia.com` **Approved**; add `www.dailycartindia.com` if they ask.

Env names must be exactly `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. Names like `Live_API_Key` are ignored.

---

## 10. Ship a code change

1. Edit locally in `dailycartindia-`.
2. Commit and push to GitHub **`main`**.
3. **API:** Blueprint often auto-deploys `dailycart-api`. If behaviour is still old, Render → `dailycart-api` → **Manual Deploy**.
4. **Website:** Render → **`dailycartindia-web`** (not `dailycart-web`) → **Manual Deploy → Deploy latest commit**.
5. Confirm:
   - Hard-refresh https://dailycartindia.com (Ctrl+Shift+R) or incognito.
   - https://dailycart-api.onrender.com/api/health → `{"status":"ok","database":true}`
   - https://dailycart-api.onrender.com/api/payments/methods → `"razorpay": true` if keys are set
   - If you changed public APIs: `/api/discovery` must **not** contain `kyc`.

Changing `REACT_APP_*` requires a **frontend rebuild**. Changing API env only requires redeploying `dailycart-api`.

First-time hosting steps (Mongo Atlas, Blueprint, DNS) live in `docs/DEPLOY_RENDER.md`.

---

## 11. Environment variables

Names only. Never paste secrets into git or chat.

### `dailycart-api`

| Name | Purpose |
|------|---------|
| `MONGO_URL` | Atlas connection string |
| `DB_NAME` | `dailycart` |
| `JWT_SECRET` | Signs login tokens. Rotating it logs everyone out. |
| `CORS_ORIGINS` | `https://dailycartindia.com,https://www.dailycartindia.com` |
| `RAZORPAY_KEY_ID` | `rzp_live_…` or `rzp_test_…` |
| `RAZORPAY_KEY_SECRET` | Matching secret |

### `dailycartindia-web`

| Name | Purpose |
|------|---------|
| `REACT_APP_BACKEND_URL` | `https://dailycart-api.onrender.com` |

---

## 12. Local development

Need: Python 3.11+, Node 18+, MongoDB (local or Atlas).

```bash
# API
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements-filtered.txt
# .env: MONGO_URL, DB_NAME=dailycart, JWT_SECRET, CORS_ORIGINS=http://localhost:3000
python seed.py --force
uvicorn server:app --reload --host 0.0.0.0 --port 8000

# UI (second terminal)
cd frontend
# .env: REACT_APP_BACKEND_URL=http://localhost:8000
npm install --legacy-peer-deps
npm start
```

| Surface | Local URL |
|---------|-----------|
| Shop | http://localhost:3000/ |
| Vendor | http://localhost:3000/vendor |
| Admin | http://localhost:3000/admin |
| Health | http://localhost:8000/api/health |

OTP login is **dev mode**: the API returns `dev_otp` in the JSON. No SMS provider is wired.

**Never run `python seed.py --force` against production.** It wipes users, vendors, products, orders, bookings, reviews, disputes.

Phone OTP and extra demo customers (`*@demo.dailycart.in`) exist only after seed.

---

## 13. Troubleshooting (mapped to each failure)

Work top to bottom. Most outages are **sleepy API**, **wrong static service**, or **Razorpay account**.

### A. Site slow, blank, or “failed to fetch”

1. Open https://dailycart-api.onrender.com/api/health — wait up to ~60s on Free plan.
2. Expect `{"status":"ok","database":true}`.
3. Never comes back → Render `dailycart-api` **Logs** (crash loop / Mongo).
4. `"database": false` → Atlas down, IP not allowed, or wrong `MONGO_URL` / `DB_NAME`.

### B. Website looks old (demo box on `/auth`, missing `/privacy`)

Static site missed the latest commit.

1. Render → **`dailycartindia-web`** → Manual Deploy → Deploy latest commit.
2. Do not deploy leftover `dailycart-web`.
3. Hard-refresh or incognito.

### C. Discovery JSON shows Aadhaar / PAN / KYC

`public_vendor()` not live, or a new endpoint skipped it.

1. Manual Deploy `dailycart-api` from latest `main`.
2. Confirm discovery has **no** `kyc`, `kyc_status`, `user_id`.
3. If still present: any vendor dict returned from public routes must use `public_vendor()`.

### D. Pay online button missing

1. GET `/api/payments/methods`.
   - `"razorpay": false` → fix env **names** on `dailycart-api`, Manual Deploy API.
   - `"razorpay": true` but no button → old frontend. Manual Deploy `dailycartindia-web`.

### E. Pay online opens, then merchant / UPI error

1. Razorpay Test Mode must be **OFF** when using `rzp_live_` keys.
2. Orders **Created** + Payments **₹0** = account not enabled to accept live transactions → Razorpay support.
3. Use COD until then.

### F. Admin Access denied

Logged in as customer/vendor. Logout. Use `/admin/login` with the admin account.

### G. Login fails after a deploy

`JWT_SECRET` rotated, or user deactivated (`is_active: false`). Logout and log in again. Deactivated users get “This account has been removed”.

### H. CORS errors in the browser console

`CORS_ORIGINS` must list exact shop origins, comma-separated, then redeploy API.

### I. Domain / SSL

Custom domains belong on **`dailycartindia-web`**. Squarespace DNS must match Render’s records. Wait until Render shows TLS **Verified**.

### J. Build / deploy failed

| Symptom | Check |
|---------|--------|
| Python build fail | `requirements-filtered.txt`, Python version |
| npm fail | `npm ci --legacy-peer-deps`; `ajv` peer issues |
| Route 404 on refresh | SPA rewrite `/*` → `/index.html` |
| Deployed but wrong site | You used `dailycart-web` instead of `dailycartindia-web` |

### K. Empty catalog everywhere

Wrong Mongo database, or someone ran seed `--force` / wiped Atlas. Restore from Atlas backup if production. Re-seed **only** on a known-empty/dev database.

### L. Customer cannot cancel / vendor cannot advance

Wrong status. Customer cancel only from `placed` (orders) or `requested`/`accepted` (bookings). Vendor must follow `ORDER_FLOW` / `BOOKING_FLOW` one step; skip is rejected.

### M. Review button missing

Reviews only after grocery `delivered` or booking `completed`. One review per order/booking.

---

## 14. Hard rules

1. Live shop service is **`dailycartindia-web`**. Manual Deploy if the UI is stale.
2. Never expose KYC documents or ID numbers on public APIs.
3. Razorpay env vars: **`RAZORPAY_KEY_ID`** and **`RAZORPAY_KEY_SECRET`** only.
4. Never paste API secrets, full live key IDs, or Aadhaar numbers into chat or git.
5. Change seeded admin/demo passwords before treating this as a real shop.
6. Free Render sleeps — wait ~1 minute before declaring the API dead.
7. Merchant “Uh oh” with Created Razorpay orders and zero captures is **account enablement**, not a missing button.
8. Do not run `seed.py --force` on production.
9. Admin login is `/admin/login`, not `/auth`.
10. Prefer Admin UI for data changes. Raw Atlas edits must filter on UUID field **`id`**, not Mongo `_id`. Full recipes: [`SOP_DATABASE.md`](SOP_DATABASE.md).

---

## 15. Contacts

| Topic | Where |
|-------|--------|
| Shop support | support@dailycart24x7.com |
| Founder | mohan.reddy02@gmail.com |
| WhatsApp | +65 90628025 · +91 9741188878 · +91 9347533422 · +91 9110759384 |
| Render | dashboard.render.com → `dailycart-api`, `dailycartindia-web` |
| Razorpay | dashboard.razorpay.com → support for live capture |
| Domain | Squarespace → dailycartindia.com DNS |
| Database | MongoDB Atlas → [SOP_DATABASE.md](SOP_DATABASE.md) |
| Code | GitHub → mohanreddy2/dailycartindia- |

Related: `docs/DEPLOY_RENDER.md` (first-time hosting), `docs/SOP_DATABASE.md` (see and edit live data), `README.md` (product overview), `docs/UAT_READY.md` (test checklist).

---

## 16. Database — read and update live data

**Canonical full SOP (every collection, recipe, curl, Compass):** [`docs/SOP_DATABASE.md`](SOP_DATABASE.md)

That file now has all of it:

1. Code vs data updates  
2. How FastAPI connects (`MONGO_URL`, `DB_NAME=dailycart`, Motor)  
3. Open Atlas Data Explorer  
4. Hard rules  
5. UUID `id` vs Mongo `_id`  
6. Every collection and field  
7. What queries the API actually runs  
8. Admin UI first  
9. Atlas Filter + Update recipes  
10. Passwords (bcrypt) and make-admin  
11. Order / booking status machines  
12. Geo `[lng, lat]`, empty Home  
13. Indexes  
14. Seed / backups (`--force` wipes production)  
15. Local vs production  
16. Post-edit checklist  
17. Compass and mongosh  
18. Atlas website login vs database user  
19. Exact city and category lists  
20. Example documents  
21. Admin API cookbook  
22. Customer/vendor APIs that write the same data  

### Decision: how to change live data

| Change | Do this | Deploy? |
|--------|---------|---------|
| Price, stock, hide store, KYC, password, make-admin, move pin, order step | **Admin** https://dailycartindia.com/admin | No |
| Same, from a script | **Admin API** Bearer token, see cookbook in SOP_DATABASE §21 | No |
| Add a **city** or **category** (no Admin screen yet) | Atlas `cities` / `categories` | No |
| New endpoint or new rule | Git `main` → Manual Deploy `dailycart-api` | Yes |
| Legal page / WhatsApp / UI | Git `main` → Manual Deploy `dailycartindia-web` | Yes |

### Open the database

1. Atlas account: https://cloud.mongodb.com (org **mohan's Org**, project **Project 0**).  
2. **Data Explorer** → **Cluster0** → **`dailycart`**.  
3. Database user (API/Compass): Atlas → **Database & Network Access**. URI is Render → `dailycart-api` → `MONGO_URL`. Never paste it into git.

Filter every edit on **`id`** (UUID), not `_id`.

```json
Filter:  { "id": "<vendor-uuid>" }
Update:  { "$set": { "is_active": false } }
```

Admin password / make-admin (no Atlas):

- UI: `/admin/users`  
- API: `PATCH /api/admin/users/{id}/password` `{ "password": "…" }`  
- API: `PATCH /api/admin/users/{id}/admin` `{ "is_admin": true }`

Never put plaintext in `password_hash`. Never `seed.py --force` on Cluster0. Never skip `placed` → `delivered` in Mongo.

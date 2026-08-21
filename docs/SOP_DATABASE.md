# DailyCart — Database SOP (backend data)

**Last updated:** 21 August 2026  
**Audience:** founder / ops / a developer who must change live data without breaking the shop  
**Live database:** MongoDB Atlas → org **mohan's Org** → project **Project 0** → cluster **Cluster0** → database **`dailycart`**

This document is the technical companion to [`SOP.md`](SOP.md). Use it when you need to **see or change data** that FastAPI already stores. Prefer the **Admin UI** first. Use Atlas only when there is no button, or when you are recovering from a bad record.

Never paste `MONGO_URL`, passwords, or KYC ID numbers into git or chat.

---

## Contents

1. [Two different “backend updates”](#1-two-different-backend-updates)
2. [How the API connects](#2-how-the-api-connects)
3. [Open Atlas and browse data](#3-open-atlas-and-browse-data)
4. [Hard rules before you edit](#4-hard-rules-before-you-edit)
5. [Document IDs (this is the most common mistake)](#5-document-ids-this-is-the-most-common-mistake)
6. [Collections and fields](#6-collections-and-fields)
7. [What the backend actually queries](#7-what-the-backend-actually-queries)
8. [Preferred path: Admin UI / API](#8-preferred-path-admin-ui--api)
9. [Atlas recipes (Filter + Update)](#9-atlas-recipes-filter--update)
10. [Passwords and admin capability](#10-passwords-and-admin-capability)
11. [Orders and bookings (status machines)](#11-orders-and-bookings-status-machines)
12. [Geo, cities, and empty Home](#12-geo-cities-and-empty-home)
13. [Indexes](#13-indexes)
14. [Seed, backups, and recovery](#14-seed-backups-and-recovery)
15. [Local Mongo vs production](#15-local-mongo-vs-production)
16. [Checklist after any live edit](#16-checklist-after-any-live-edit)
17. [Compass and mongosh (optional)](#17-compass-and-mongosh-optional)
18. [Atlas website login vs database user](#18-atlas-website-login-vs-database-user)
19. [Seeded cities and categories (exact lists)](#19-seeded-cities-and-categories-exact-lists)
20. [Example documents (shape the API writes)](#20-example-documents-shape-the-api-writes)
21. [Admin API cookbook (preferred over Atlas)](#21-admin-api-cookbook-preferred-over-atlas)
22. [Vendor / customer APIs that write the same collections](#22-vendor--customer-apis-that-write-the-same-collections)

---

## 1. Two different “backend updates”

| You want to change… | Where | How |
|---------------------|--------|-----|
| **Code** (new endpoint, new field, new rule) | GitHub `main` → Render `dailycart-api` | Edit Python, commit, push, **Manual Deploy** `dailycart-api`. Website only if UI changed. |
| **Data** (price, stock, hide a store, make someone admin, fix a stuck order) | MongoDB Atlas `dailycart` **or** Admin portal | Prefer https://dailycartindia.com/admin . If no button, edit Atlas as below. **No deploy needed** — the API reads Mongo on every request. |

The React shop (`dailycartindia-web`) never talks to Mongo. Only FastAPI does.

```
Browser  →  dailycartindia.com (static React)
                ↓  HTTPS  REACT_APP_BACKEND_URL/api/...
           dailycart-api (FastAPI on Render)
                ↓  Motor (async Mongo driver)
           Atlas Cluster0  /  database dailycart
```

Code: `backend/core.py` loads env and opens the client.

```python
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]   # dailycart
```

Health: `GET https://dailycart-api.onrender.com/api/health` → `{"status":"ok","database":true}`.

Env (names only):

| Variable | Where set | Value |
|----------|-----------|--------|
| `MONGO_URL` | Render → **dailycart-api** → Environment | Atlas `mongodb+srv://…` (secret) |
| `DB_NAME` | Same | `dailycart` |

Startup also calls `ensure_indexes()` then `seed(force=False)`. Seed **does not wipe** production if data already exists. `python seed.py --force` **does wipe**. Never run `--force` against Atlas production.

---

## 2. How the API connects

1. Atlas cluster: **Cluster0** (M0 Free typical).
2. Database user: Atlas → **Database & Network Access** → Database Users. This is **not** your Atlas website login.
3. Network: Atlas Network Access must allow Render (often `0.0.0.0/0` on Free). If you lock IPs and health shows `"database": false`, this is why.
4. Connection string lives only in Render `MONGO_URL`. Copy it from Render if Compass needs it. Do not commit it.
5. Driver: `motor.motor_asyncio.AsyncIOMotorClient` (async PyMongo).
6. On shutdown: `client.close()` in `backend/server.py`.

**Atlas website login** = Google/email for **mohan's Org**.  
**Database user** = username/password inside `MONGO_URL` used by the API.

---

## 3. Open Atlas and browse data

1. Open https://cloud.mongodb.com (you are already in **mohan's Org** / **Project 0**).
2. Left sidebar → **Data Explorer**.
3. Click **Cluster0** to expand (wait if it says “connect”).
4. Click database **`dailycart`**.
5. Click a collection (example: `users`).
6. Use **Filter** (JSON) then **Find**. Example:

```json
{ "email": "admin@dailycart.in" }
```

7. To edit one document: open it → pencil → change fields → **Update**.
8. To edit many: **Update** tab:

- Filter: `{ "email": "customer@dailycart.in" }`
- Update: `{ "$set": { "is_active": true } }`

Compass (optional desktop app): paste `MONGO_URL` from Render, then pick database `dailycart`. Same collections.

---

## 4. Hard rules before you edit

1. **Prefer Admin UI** (`/admin/users`, `/admin/vendors`, catalog, orders, bookings). Those paths write `audit_log` and keep related fields in sync.
2. **Find first, update second.** Copy the document. Know how many rows the filter matches (`count`).
3. Filter on **`id`** (UUID string) or **`email`**, never on Mongo `_id` unless you know what you are doing. The app **never** uses `_id`.
4. Do **not** `$unset` fields the API always reads (`capabilities`, `status`, `vendor_id`, `location`).
5. Do **not** put a plaintext password in `password_hash`. It must be bcrypt (see section 10). Easier: Admin → Users → New password.
6. Do **not** skip order/booking steps by jumping `placed` → `delivered` unless you also fix `status_history` and stock. Prefer Admin order buttons.
7. Do **not** delete collections. Soft-hide: `is_active: false` on users/vendors; `is_available: false` on products/services.
8. KYC IDs stay in `vendors.kyc`. Public APIs strip them via `public_vendor()`. Never dump KYC into a public gist.
9. Take an Atlas backup / screenshot of the document before a risky edit.
10. Never `seed.py --force` on this cluster.

---

## 5. Document IDs (this is the most common mistake)

Every business document has:

| Field | What it is |
|-------|------------|
| `_id` | Mongo ObjectId. Auto-created. API **strips** this (`strip_id()` in `core.py`). You will not see it in JSON from `/api`. |
| `id` | UUID string (`str(uuid.uuid4())`). **This is the primary key the whole app uses.** |

Always filter like:

```json
{ "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }
```

Not `{ "_id": "..." }` unless Compass shows ObjectId and you are sure.

Vendors, products, users, orders, bookings all link through these UUID `id` fields (`vendor_id`, `user_id`, `customer_id`, `product_id`, …).

---

## 6. Collections and fields

All live data is in database **`dailycart`**.

| Collection | Purpose | Typical count |
|------------|---------|----------------|
| `users` | Login accounts | customers, vendors, admins |
| `vendors` | Store / pro profile + KYC + geo | one per partner |
| `products` | Kirana SKUs | mart vendors only |
| `services` | Bookable jobs | service vendors only |
| `orders` | Grocery checkouts | DailyMart |
| `bookings` | Service jobs | DailyServe |
| `reviews` | After delivered / completed | one per order or booking |
| `disputes` | Customer complaints | admin resolves |
| `cities` | City picker | seeded 8 cities |
| `categories` | Grocery + service slugs | seeded |
| `payment_intents` | Razorpay sessions | short-lived |
| `otps` | Dev phone OTP | not production SMS |
| `audit_log` | Who changed what | append-only |

### `users`

| Field | Type | Notes |
|-------|------|--------|
| `id` | string UUID | JWT `sub` |
| `name` | string | |
| `email` | string | unique, lowercased |
| `phone` | string or null | unique when set |
| `password_hash` | string | bcrypt, never plaintext |
| `capabilities` | string[] | `"customer"`, `"admin"`, `"mart_vendor"`, `"service_vendor"` |
| `is_active` | bool | missing treated as true; `false` blocks login |
| `removed_at` | ISO string | set on admin deactivate |
| `created_at` | ISO string | |

Auth checks `capabilities` **from the database on every request**, not from the JWT `cap` claim. Promoting/demoting admin takes effect immediately for API calls. The user should log in again so the UI menus refresh.

### `vendors`

| Field | Type | Notes |
|-------|------|--------|
| `id` | UUID | public store URL `/store/:id` |
| `user_id` | UUID | owner in `users` |
| `type` | `"mart"` \| `"service"` | |
| `name`, `description`, `address`, `city` | string | |
| `category_slugs` | string[] | must match `categories.slug` |
| `location` | GeoJSON Point | **`coordinates: [lng, lat]`** — longitude first |
| `image` | URL or data-URI | |
| `rating`, `review_count` | number | updated from reviews |
| `min_order`, `delivery_fee` | number | mart |
| `kyc_status` | `pending` \| `approved` \| `rejected` | discovery requires `approved` |
| `kyc` | object | `id_type`, `id_number`, `submitted_at`, `decided_at`, `decision_note` |
| `is_active` | bool | admin deactivate |
| `is_open` | bool | store closed flag |
| `availability` | object or null | service slots `{ "mon": ["09:00", …], … }` |
| `created_at` | ISO string | |

**Public map rule:** vendor appears on Home/Search only if `kyc_status == "approved"` **and** `is_active != false`.

### `products` (mart)

`id`, `vendor_id`, `name`, `category_slug`, `price`, `mrp`, `unit`, `stock_qty` (number), `image`, `is_available`, `created_at`.

Checkout decrements `stock_qty`. Cancel/reject increments it back.

### `services` (pro)

`id`, `vendor_id`, `name`, `category_slug`, `description`, `base_price`, `duration_minutes`, `image`, `is_available`, `created_at`.

### `orders`

`id`, `order_no` (`DC` + 6 digits), `checkout_group_id`, `customer_id`, `customer_name`, `customer_phone`, `vendor_id`, `store_name`, `items[]` (`product_id`, `name`, `price`, `qty`, `unit`, `image`), `subtotal`, `delivery_fee`, `total`, `payment_method` (`cod` \| `razorpay`), `payment_status` (`pending` \| `paid`), `address`, `status`, `status_history[]`, `created_at`, optional Razorpay ids.

### `bookings`

`id`, `booking_no` (`DS` + 6 digits), `customer_id`, `vendor_id`, `service_id`, names, `price`, `slot_date`, `slot_time`, `address`, `notes`, payment fields, `status`, `status_history[]`, `created_at`.

### `cities`

`id`, `name`, `lat`, `lng` (and any extra seed fields). City picker and default map pins come from here.

### `categories`

`id`, `slug`, `name`, `kind` (`product` \| `service`), `icon`.

### `payment_intents`

Razorpay create/confirm. Do not edit unless recovering a stuck pay session. Unique index on `id`.

### `audit_log`

`id`, `action`, `at`, `by` (user id), plus `user_id` / `vendor_id` / `order_id` / `booking_id`. Treat as read-only.

---

## 7. What the backend actually queries

Use this when an Atlas edit “does nothing” on the website.

| Symptom | Query the API uses |
|---------|-------------------|
| Store missing on Home | `vendors` with `kyc_status: "approved"`, `is_active` not false, `location` near lat/lng (`2dsphere`) |
| Product missing in store | `products` with that `vendor_id` and `is_available: true` |
| Cannot log in | `users.email` + bcrypt `password_hash`; or `is_active: false` |
| Admin Access denied | `"admin"` not in `users.capabilities` |
| Vendor portal empty | `vendors.user_id` = that user’s `id` |
| Order not advancing | `orders.status` not the previous step in `ORDER_FLOW` |

Code map:

| File | Writes |
|------|--------|
| `backend/core.py` | connection, JWT, bcrypt, order/booking status machines |
| `backend/routers/auth_routes.py` | register, login, OTP |
| `backend/routers/public_routes.py` | cities, categories, GPS discovery (**no KYC in JSON**) |
| `backend/routers/customer_routes.py` | checkout, bookings, cancel, reviews, disputes |
| `backend/routers/vendor_routes.py` | onboarding, catalog, status |
| `backend/routers/admin_routes.py` | KYC, vendors, users, catalog, orders, bookings, disputes |
| `backend/routers/payment_routes.py` | Razorpay intents |
| `backend/seed.py` | indexes + demo data |

Interactive API: https://dailycart-api.onrender.com/docs (needs a Bearer token for admin routes).

---

## 8. Preferred path: Admin UI / API

Do these in the portal so related fields stay correct.

| Task | UI | API |
|------|----|-----|
| Change name/email/phone | `/admin/users` edit | `PATCH /api/admin/users/{id}` |
| Reset password | Users → New password | `PATCH /api/admin/users/{id}/password` `{ "password": "…" }` |
| Make / remove admin | Shield icon | `PATCH /api/admin/users/{id}/admin` `{ "is_admin": true }` |
| Deactivate user + their store | Trash on Users | `DELETE /api/admin/users/{id}` |
| Approve KYC | `/admin/kyc` | `POST /api/admin/kyc/{vendor_id}/decide` |
| Hide / show partner | Vendors toggle | `PATCH /api/admin/vendors/{id}/active` |
| Price / stock / catalog | Vendor DailyPro **or** Admin catalog | `/api/admin/vendors/{id}/products` |
| Advance order / booking | `/admin/orders` or `/admin/bookings` | `PATCH /api/admin/orders/{id}/status` |

Login: https://dailycartindia.com/admin/login — Bearer token in `Authorization`.

Atlas is for: bulk fixes, geo coordinates, cities/categories, stuck fields, forensic `audit_log` reads.

---

## 9. Atlas recipes (Filter + Update)

In Data Explorer: collection → **Update** (or edit one document). Always **Find** with the same filter first.

### Hide a store from the public map (keep data)

**Collection:** `vendors`  
**Filter:**

```json
{ "name": "Exact Store Name" }
```

**Update:**

```json
{ "$set": { "is_active": false } }
```

To show again: `"is_active": true` and ensure `kyc_status` is `"approved"`.

### Approve KYC in the database (only if Admin UI is down)

**Collection:** `vendors`  
**Filter:** `{ "id": "<vendor-uuid>" }`  
**Update:**

```json
{
  "$set": {
    "kyc_status": "approved",
    "kyc.decided_at": "2026-08-21T00:00:00+00:00"
  }
}
```

Owner must already have `mart_vendor` or `service_vendor` in `users.capabilities` (onboarding adds this).

### Change a product price and stock

**Collection:** `products`  
**Filter:** `{ "name": "Toor Dal", "vendor_id": "<vendor-uuid>" }`  
**Update:**

```json
{ "$set": { "price": 149, "stock_qty": 40, "is_available": true } }
```

No website deploy. Refresh the store page.

### Turn off a service listing

**Collection:** `services`  
**Update:** `{ "$set": { "is_available": false } }`

### Move a store on the map

`location.coordinates` is **`[longitude, latitude]`**.

```json
{
  "$set": {
    "city": "Bangalore",
    "location": { "type": "Point", "coordinates": [77.5946, 12.9716] }
  }
}
```

Wrong order (lat first) makes discovery empty or pins in the ocean.

### Deactivate a login without deleting

**Collection:** `users`  
**Update:** `{ "$set": { "is_active": false, "removed_at": "2026-08-21T00:00:00+00:00" } }`

Also set their vendor `is_active: false` or they may still appear if KYC is approved.

### Find everything for one partner

1. `users`: `{ "email": "vendor.mart@dailycart.in" }` → copy `id`
2. `vendors`: `{ "user_id": "<that-id>" }` → copy vendor `id`
3. `products` or `services`: `{ "vendor_id": "<vendor-id>" }`
4. `orders` / `bookings`: `{ "vendor_id": "<vendor-id>" }`

---

## 10. Passwords and admin capability

### Reset password (recommended)

Admin → Users → edit → **New password** (min 6 chars).  
API hashes with bcrypt in `core.hash_password()`.

### Reset password in Atlas (not recommended)

You cannot type `Admin@123` into `password_hash`. Login will fail.

Options:

1. Use Admin UI / `PATCH /api/admin/users/{id}/password`.
2. Generate bcrypt locally (Python):

```python
import bcrypt
print(bcrypt.hashpw(b"YourNewPass", bcrypt.gensalt()).decode())
```

Then `$set` that string on `password_hash`.

### Make someone admin in Atlas

**Collection:** `users`  
**Filter:** `{ "email": "someone@example.com" }`  
**Update:**

```json
{ "$addToSet": { "capabilities": "admin" } }
```

They must log in again at `/admin/login`. Keep `"customer"` in the array; do not replace the whole array unless you intend to.

Remove admin:

```json
{ "$pull": { "capabilities": "admin" } }
```

Do not remove admin from your **own** last admin account or you will lock yourself out of Ops. Seeded admin email: `admin@dailycart.in` (change that password on a real shop).

---

## 11. Orders and bookings (status machines)

The API **rejects skips**. If you must repair a stuck ticket in Mongo, keep `status` and `status_history` consistent.

**Orders** (`backend/core.py` `ORDER_FLOW`):

```
placed → accepted → picking → ready → out_for_delivery → delivered
```

- `rejected` only from `placed` (API also restores stock).
- Customer `cancelled` only from `placed` (API restores stock).

**Bookings** (`BOOKING_FLOW`):

```
requested → accepted → en_route → in_progress → completed
```

- `declined` only from `requested`.
- `cancelled` only from `requested` or `accepted`.

If you `$set` `status: "delivered"` from `placed` in Atlas, the UI timeline will look wrong and stock will not match. Prefer Admin **Accept → … → Delivered**.

Manual repair example (only if you know stock is already correct):

```json
{
  "$set": { "status": "accepted" },
  "$push": {
    "status_history": {
      "status": "accepted",
      "at": "2026-08-21T12:00:00+00:00",
      "by": "ops-atlas"
    }
  }
}
```

---

## 12. Geo, cities, and empty Home

Home uses GPS (or city picker) then `$near` / geo on `vendors.location`.

Seeded cities (after seed): Hyderabad, Bangalore, Visakhapatnam, Bhimavaram, Pune, Delhi, Mumbai, Chennai.

Empty Home usually means:

1. Pin is far from any `approved` + `active` vendor, or
2. All vendors `is_active: false` / `kyc_status` not `approved`, or
3. Wrong `DB_NAME` (empty database), or
4. `location.coordinates` swapped.

Add a city (Atlas `cities` Insert):

```json
{
  "id": "paste-a-new-uuid",
  "name": "Vijayawada",
  "lat": 16.5062,
  "lng": 80.6480
}
```

Generate UUID anywhere (Python `uuid.uuid4()`). Then add vendors whose `city` and `location` sit near that pin.

---

## 13. Indexes

Created at API startup (`seed.ensure_indexes()`):

| Collection | Index |
|------------|--------|
| `vendors` | `2dsphere` on `location` |
| `vendors` | `user_id` |
| `products` | `vendor_id` |
| `services` | `vendor_id` |
| `orders` | `customer_id`, `vendor_id` |
| `bookings` | `customer_id`, `vendor_id` |
| `users` | `email`, `phone` |
| `payment_intents` | unique `id`; `(user_id, created_at)` |

If discovery is slow or geo errors appear in Render logs after a restore, restart `dailycart-api` so indexes are re-ensured. Do not drop the `2dsphere` index.

---

## 14. Seed, backups, and recovery

| Command / action | Effect |
|------------------|--------|
| API start `seed(force=False)` | Creates indexes; seeds **only if** collections look empty |
| `python seed.py --force` | **Deletes** users, vendors, products, services, orders, bookings, reviews, disputes, cities, categories, then rebuilds demo world |
| Atlas backup / snapshot | Restore the `dailycart` database if someone wiped it |

**Production:** never `--force`. If the shop is empty, restore Atlas backup, then Manual Deploy API if needed.

Demo emails after seed (change passwords on a real shop): `admin@dailycart.in`, `customer@dailycart.in`, `vendor.mart@dailycart.in`, `vendor.service@dailycart.in`.

---

## 15. Local Mongo vs production

Local `.env` in `backend/`:

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=dailycart
```

or a **separate** Atlas database such as `dailycart_dev`. Pointing local `--force` seed at production `MONGO_URL` wipes the live shop.

How to tell which DB you are in: Atlas Data Explorer shows the database name; Render `DB_NAME` must be `dailycart` for production.

---

## 16. Checklist after any live edit

1. Atlas Find confirms the new field values.
2. https://dailycart-api.onrender.com/api/health → `"database": true`.
3. Hard-refresh the shop (or incognito).
4. If you changed a store: pick the right city / GPS, open `/store/{vendor id}`.
5. If you changed login: logout, login again (`dc_token` in localStorage).
6. If you changed admin: `/admin/login`, not `/auth`.
7. Optional: `audit_log` will **not** have a row for Atlas edits. Note the change in WhatsApp/email for the team.

---

## 17. Compass and mongosh (optional)

### MongoDB Compass (desktop)

1. Install Compass from mongodb.com/compass.
2. Render → **dailycart-api** → Environment → copy **`MONGO_URL`** (do not paste it into git/chat).
3. Compass → New connection → paste URI → Connect.
4. Left tree: **`dailycart`** → collections.
5. Same Filter JSON as Data Explorer.

If Compass cannot connect: Atlas → **Network Access** must allow your home IP (or `0.0.0.0/0`). Render already connects from its own IPs.

### mongosh

```text
mongosh "<MONGO_URL-from-Render>"
use dailycart
db.users.find({ email: "admin@dailycart.in" })
```

---

## 18. Atlas website login vs database user

| Login | What it is | Where |
|-------|------------|--------|
| **Atlas account** | Your Google/email for the cloud console | https://cloud.mongodb.com — org **mohan's Org**, project **Project 0** |
| **Database user** | Username/password inside `MONGO_URL` | Atlas → **Database & Network Access** → Database Users. Used only by FastAPI (and Compass). |

You can be logged into Atlas and still fail Compass if the DB user password is wrong. Reset that user in Database Access, then update Render `MONGO_URL` and **Manual Deploy** `dailycart-api`. Do not commit the new URI.

---

## 19. Seeded cities and categories (exact lists)

### `cities` (picker + default pins)

| name | state | lat | lng |
|------|-------|-----|-----|
| Hyderabad | Telangana | 17.3850 | 78.4867 |
| Bangalore | Karnataka | 12.9716 | 77.5946 |
| Visakhapatnam | Andhra Pradesh | 17.6868 | 83.2185 |
| Bhimavaram | Andhra Pradesh | 16.5449 | 81.5212 |
| Pune | Maharashtra | 18.5204 | 73.8567 |
| Delhi | Delhi | 28.6139 | 77.2090 |
| Mumbai | Maharashtra | 19.0760 | 72.8777 |
| Chennai | Tamil Nadu | 13.0827 | 80.2707 |

Insert a city (Atlas `cities`):

```json
{
  "id": "<new-uuid>",
  "name": "Vijayawada",
  "state": "Andhra Pradesh",
  "lat": 16.5062,
  "lng": 80.6480
}
```

Then add **approved + active** vendors whose `location.coordinates` are `[lng, lat]` near that pin, or Home stays empty.

### `categories`

**Products (`kind: product`):** grocery, dairy, fruits-veg, snacks, household, pooja, stationery, frozen, baby-pet.

**Services (`kind: service`):** plumber, electrician, cleaning, ac-repair, beauty, appliance, ironing, cobbler, tailor, tiffin, pest, ro-water, kitchen-repair, cctv, car-wash, movers, carpenter, pooja-service.

Vendor `category_slugs` and product/service `category_slug` must match these `slug` values. Insert:

```json
{
  "id": "<new-uuid>",
  "slug": "pharmacy",
  "name": "Pharmacy",
  "kind": "product",
  "icon": "heart-pulse"
}
```

---

## 20. Example documents (shape the API writes)

### User

```json
{
  "id": "uuid",
  "name": "Ops Admin",
  "email": "admin@dailycart.in",
  "phone": "9999900099",
  "password_hash": "$2b$12$…",
  "capabilities": ["admin", "customer"],
  "is_active": true,
  "created_at": "2026-08-21T00:00:00+00:00"
}
```

### Mart vendor (geo)

```json
{
  "id": "uuid",
  "user_id": "owner-user-uuid",
  "type": "mart",
  "name": "Store name",
  "city": "Bangalore",
  "location": { "type": "Point", "coordinates": [77.5946, 12.9716] },
  "kyc_status": "approved",
  "kyc": { "id_type": "gstin", "id_number": "…", "submitted_at": "…", "decided_at": "…" },
  "is_active": true,
  "is_open": true,
  "min_order": 99,
  "delivery_fee": 25,
  "category_slugs": ["grocery", "dairy"]
}
```

### Product

```json
{
  "id": "uuid",
  "vendor_id": "vendor-uuid",
  "name": "Toor Dal",
  "category_slug": "grocery",
  "price": 149,
  "mrp": 165,
  "unit": "1 kg",
  "stock_qty": 40,
  "is_available": true
}
```

### Order (status machine)

`status` one of: `placed`, `accepted`, `picking`, `ready`, `out_for_delivery`, `delivered`, `cancelled`, `rejected`.

`items[]`: `{ "product_id", "name", "price", "qty", "unit", "image" }`.

`payment_method`: `cod` | `razorpay`. `payment_status`: `pending` | `paid`.

### Booking

`status` one of: `requested`, `accepted`, `en_route`, `in_progress`, `completed`, `cancelled`, `declined`.

`slot_date` + `slot_time` unique per vendor except cancelled/declined/completed.

### Review / dispute

Review: `rating` 1–5, exactly one of `order_id` or `booking_id`. Recalculates `vendors.rating` and `review_count`.

Dispute: `status` `open` | `resolved`; admin sets `resolution`, `resolved_at`.

### Payment intent

`purpose` grocery checkout or booking; `status` `created` then `paid`; unique `id`; stores `razorpay_order_id`. Do not edit unless recovering a stuck pay.

---

## 21. Admin API cookbook (preferred over Atlas)

Base: `https://dailycart-api.onrender.com/api`  
Header: `Authorization: Bearer <dc_token from /admin/login>`  
Content-Type: `application/json`

Login (no Bearer):

```http
POST /api/auth/login
{ "email": "admin@dailycart.in", "password": "<your-admin-password>" }
```

Response includes `token` and `user.capabilities`.

| Task | Method | Path | Body |
|------|--------|------|------|
| List users | GET | `/admin/users` | |
| Edit contact | PATCH | `/admin/users/{id}` | `{ "name", "email", "phone" }` |
| Reset password | PATCH | `/admin/users/{id}/password` | `{ "password": "min6chars" }` |
| Make admin | PATCH | `/admin/users/{id}/admin` | `{ "is_admin": true }` |
| Remove admin | PATCH | `/admin/users/{id}/admin` | `{ "is_admin": false }` |
| Deactivate user | DELETE | `/admin/users/{id}` | |
| KYC decide | POST | `/admin/kyc/{vendor_id}/decide` | `{ "decision": "approved"\|"rejected", "note": "…" }` |
| Edit vendor / move pin | PATCH | `/admin/vendors/{id}` | `{ "city", "lat", "lng", "address", "min_order", "delivery_fee", "is_open", "category_slugs" }` |
| Hide / show vendor | PATCH | `/admin/vendors/{id}/active` | `{ "is_active": false }` |
| Add product | POST | `/admin/vendors/{id}/products` | `{ "name", "category_slug", "price", "mrp", "unit", "stock_qty", "is_available": true }` |
| Edit product | PATCH | `/admin/vendors/{id}/products/{pid}` | same as add |
| Delete product | DELETE | `/admin/vendors/{id}/products/{pid}` | |
| Add / edit / delete service | POST/PATCH/DELETE | `/admin/vendors/{id}/services` … | `{ "name", "category_slug", "base_price", "duration_minutes", "is_available" }` |
| Order step | PATCH | `/admin/orders/{id}/status` | `{ "status": "accepted" }` (one step only) |
| Booking step | PATCH | `/admin/bookings/{id}/status` | `{ "status": "accepted" }` |
| Resolve dispute | PATCH | `/admin/disputes/{id}/resolve` | `{ "resolution": "…" }` |

Interactive: https://dailycart-api.onrender.com/docs — **Authorize** with Bearer token.

Admin UI map:

| Screen | URL |
|--------|-----|
| Dashboard | `/admin` |
| KYC | `/admin/kyc` |
| Vendors + geo | `/admin/vendors` |
| Catalog | `/admin/vendors/:vendorId/catalog` |
| Users, password, make-admin | `/admin/users` |
| Orders | `/admin/orders` |
| Bookings | `/admin/bookings` |
| Disputes | `/admin/disputes` |

There is **no** Admin screen for `cities` or `categories` yet — use Atlas (section 19).

PowerShell example (password reset):

```powershell
$token = "<paste-token>"
$id = "<user-uuid>"
Invoke-RestMethod -Method PATCH -Uri "https://dailycart-api.onrender.com/api/admin/users/$id/password" -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"password":"NewPass@123"}'
```

---

## 22. Vendor / customer APIs that write the same collections

| Actor | Writes |
|-------|--------|
| `POST /api/auth/register` | `users` (`capabilities: ["customer"]` only) |
| `POST /api/vendor/onboarding` | `vendors` (kyc pending) + products/services + `users.capabilities` `mart_vendor` or `service_vendor` |
| `PATCH /api/vendor/products/{id}` | `products` (owner’s catalog) |
| `PATCH /api/vendor/orders/{id}/status` | same `apply_order_status` as admin |
| `POST /api/orders/checkout` | `orders` + decrement `products.stock_qty` |
| `POST /api/bookings` | `bookings` |
| `POST /api/payments/razorpay/create` | `payment_intents` |
| `POST /api/payments/razorpay/confirm` | marks intent paid, creates order/booking |
| `POST /api/reviews` | `reviews` + vendor rating |
| `POST /api/disputes` | `disputes` |

Public discovery (`GET /api/discovery`) **never** returns `kyc`, `kyc_status`, or `user_id` (`public_vendor()`).

---

## Related docs

| Doc | Use |
|-----|-----|
| [`SOP.md`](SOP.md) | Day-to-day shop, payments, deploys |
| [`DEPLOY_RENDER.md`](DEPLOY_RENDER.md) | First-time Render + Atlas wiring |
| API | https://dailycart-api.onrender.com/docs |
| Atlas | https://cloud.mongodb.com → Data Explorer → Cluster0 → `dailycart` |
| Atlas DB users | https://cloud.mongodb.com → Database & Network Access |
| Admin | https://dailycartindia.com/admin |

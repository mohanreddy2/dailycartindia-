# plan.md — DailyCart (FARM) Phased Delivery Plan

## 1) Objectives
- **App Right first:** make the hyperlocal marketplace flywheel *actually work* end-to-end (customer ↔ vendor ↔ admin), no fake/demo theater.
- **India-wide, GPS-native:** location picker + radius discovery using **MongoDB 2dsphere** (no hardcoded city).
- **Three portals, one app:** Customer (`/`), Vendor DailyPro (`/vendor`), Admin Ops (`/admin`) with isolated layouts + navigation.
- **Auth:** **email/password first** + optional **phone OTP (dev-mode)**.
- **Enterprise UI/UX last:** after correctness, uplift design system + polish across all portals.

---

## 2) Implementation Steps

### Phase 1 — Core Flow POC (Isolation) (REQUIRED)
**Core = Geo discovery + checkout split + vendor status propagation + admin KYC gate** (if this breaks, app is useless).

**Build (backend-only, minimal UI):**
1. Model + indexes in MongoDB:
   - `stores`, `products`, `serviceVendors`, `services`, `orders`, `bookings`, `users`, `kyc`, `reviews`.
   - `location` as GeoJSON `Point` + **2dsphere** indexes for stores/vendors.
2. FastAPI endpoints (minimal set):
   - `GET /api/discovery` (lat,lng,radius,kind,q) returns nearby stores + services ranked by distance.
   - `POST /api/orders/checkout` accepts cart items across stores → creates **N sub-orders**.
   - `PATCH /api/vendor/orders/{id}/status` advances status.
   - `POST /api/vendors/register` creates vendor with `kyc_status=pending`.
   - `PATCH /api/admin/kyc/{vendorId}` approve/reject; discovery must filter non-approved vendors.
3. Seed multiple cities + entities (small but multi-city):
   - 4–6 cities, 6–8 stores, 25–40 products, 4–6 service vendors, 10–15 services.
4. **Python POC script** (`scripts/poc_core_flow.py`) that:
   - picks a city lat/lng → calls discovery
   - creates a multi-store checkout → returns 2+ order IDs
   - advances status as vendor → verifies customer fetch sees updates
   - registers a new vendor → verifies NOT discoverable until admin approves.

**User stories (Phase 1)**
1. As a developer, I can query discovery near any Indian city lat/lng and get nearby stores/services sorted by distance.
2. As a customer, I can checkout a cart containing items from 2 stores and receive 2 sub-order IDs.
3. As a vendor, I can advance an order status and the updated status is visible when refetched.
4. As an admin, I can approve a vendor KYC and only then the vendor appears in discovery.
5. As a system, I can seed multiple cities and discovery results change when location changes.

**Exit criteria (Phase 1)**
- POC script runs green end-to-end twice (fresh DB) with deterministic outputs and no manual DB edits.

---

### Phase 2 — V1 App Development (Customer + Vendor + Admin, MVP)
**Goal:** build the real app around the proven core.

**Backend (expand from POC):**
1. Auth:
   - Email/password register/login (bcrypt) → JWT.
   - Phone OTP send/verify (dev mode returns OTP in response) → JWT.
   - Role/capabilities: `customer`, `mart_vendor`, `service_vendor`, `admin`.
2. Customer APIs:
   - store + product browsing, search/autocomplete
   - orders: mine list/detail, cancel (pre-accept)
   - bookings: create with slot, mine list/detail, cancel
   - reviews after delivered/completed
3. Vendor APIs (scoped):
   - mart: orders queue + status machine
   - services: jobs queue + status machine
   - inventory CRUD, services CRUD
   - availability (simple weekly grid)
   - earnings summaries
4. Admin APIs:
   - KYC queue, vendor activate/deactivate
   - oversight dashboard (counts + GMV)
   - disputes CRUD (minimal)

**Frontend (one React app, 3 portals):**
1. Shared:
   - global location state (GPS + city search picker) + “use my location”.
   - consistent error/empty/loading states (no silent fallback).
2. Customer (`/`):
   - home feed (nearby stores + services), search + autocomplete
   - store page → add to cart (multi-vendor cart grouped)
   - checkout COD, orders list/detail timeline
   - service detail → slot picker → booking → bookings list/detail
   - account + auth (email/password + OTP tab)
3. Vendor (`/vendor`):
   - onboarding + KYC pending screen
   - orders/jobs queues with action buttons
   - inventory + services managers
   - availability + earnings + profile
4. Admin (`/admin`):
   - dashboard KPIs + recent activity
   - KYC approve/reject
   - vendors activate/deactivate
   - orders/bookings oversight + disputes

**User stories (Phase 2)**
1. As a customer, I can set my location (GPS or city search) and immediately see nearby stores and service pros.
2. As a customer, I can add items from 2 stores into one cart and checkout to create 2 sub-orders.
3. As a mart vendor, I can accept an order and move it to delivered, and the customer sees the timeline update.
4. As a service vendor, I can accept a job and complete it, and the customer sees the booking status update.
5. As an admin, I can approve KYC so the vendor becomes discoverable; if I deactivate them, they disappear.

**Exit criteria (Phase 2)**
- 1 full **testing_agent_v3** run passes the 5 stories above end-to-end (happy path + key error states).

---

### Phase 3 — App Right Hardening (Correctness, Gaps, Reliability)
1. Tighten state machines + permissions (no cross-tenant access).
2. Idempotency on checkout; consistent totals per sub-order.
3. Better dispute flow (open → message/log → resolve) and admin audit log.
4. Review constraints (only after delivered/completed; prevent duplicates).
5. Data quality: seed expansion (multi-city, realistic catalog + images), admin tools to edit seed entities.

**User stories (Phase 3)**
1. As a customer, I cannot see or modify any order/booking that isn’t mine.
2. As a vendor, I cannot update orders that aren’t assigned to my store/vendor identity.
3. As an admin, I can see an audit trail of KYC and status changes.
4. As a customer, I can open a dispute and later see it resolved with a final outcome.
5. As a system, checkout is safe to retry without creating duplicate orders.

**Exit criteria (Phase 3)**
- testing_agent_v3 run passes + no critical auth/authorization bugs + consistent order totals.

---

### Phase 4 — Enterprise UI/UX Uplift (Design System + Polish)
1. Run **design_agent** with brand constraints:
   - warm, trustworthy, local; green=Serve, orange=Mart, blue=trust
   - avoid purple AI gradients; avoid cold generic SaaS.
2. Implement design system across portals:
   - typography hierarchy, spacing, components, status timelines, skeletons
   - mobile-first customer nav (bottom nav), data-dense vendor/admin tables
   - WCAG contrast, keyboard nav, polished empty/error states.
3. Final testing_agent_v3 pass (UX + flows) and fix regressions.

**User stories (Phase 4)**
1. As a customer, the app feels fast and clear with skeleton loading and meaningful empty states.
2. As a customer, I can understand order/booking progress instantly via a polished timeline.
3. As a vendor, I can process orders quickly with minimal clicks and high information density.
4. As an admin, I can review KYC faster with clear decision UI and safeguards.
5. As any user, I can use the product comfortably on mobile and desktop with accessible controls.

**Exit criteria (Phase 4)**
- Visual consistency across all portals + accessibility pass on key screens + final end-to-end test green.

---

## 3) Next Actions
1. Implement Mongo models + 2dsphere indexes + minimal POC endpoints.
2. Add seed (multi-city) + write `scripts/poc_core_flow.py`.
3. Run POC until green; only then proceed to V1 UI build.

---

## 4) Success Criteria
- A new user can: set location anywhere among seeded Indian cities → discover stores/services → checkout multi-store cart → track statuses.
- A vendor can: accept + fulfill orders/jobs; inventory/services manageable.
- Admin can: KYC approve/reject + activate/deactivate vendors; oversee live counts/GMV; resolve disputes.
- After UI/UX uplift: the experience is enterprise-grade, cohesive, fast, and trustworthy.

---
## STATUS LOG (updated by agent)
- Phase 1 POC: PASSED (poc_core_flow.py, green on :8000)
- Phase 2 Build: COMPLETE — backend (7 modules, geo 2dsphere, JWT auth email+OTP) + 3 portals
- Phase 2/3 Testing: iteration_1/2 + scripts/uat_e2e_validate.py **35/35 PASS**
- Phase 4 UI/UX: COMPLETE — Emergent badge removed; booking slot + vendor advance UX fixed; layout/a11y polish; README
- UAT: READY — see docs/UAT_READY.md
- Seed: multi-city India catalog + demo accounts
- Demo creds: customer@ / vendor.mart@ / vendor.service@ / admin@ (see README)
- REMAINING (pilot): SMS OTP, Razorpay, prod deploy — not blockers for UAT

# DailyCart — UAT Ready Report

**Status:** READY FOR UAT  
**Date:** 2026-07-10  
**Stack:** FastAPI + MongoDB 2dsphere · CRA React (3 portals)  
**Validation:** `scripts/uat_e2e_validate.py` **35/35 PASS** · `backend/poc_core_flow.py` **POC PASSED**

---

## Verdict

DailyCart core flywheel is solid and ready for human UAT:

- Customer discovers nearby marts/services by GPS city
- Multi-store cart splits into N sub-orders
- Mart vendor advances order → delivered; customer timeline updates
- Service booking with selectable slots; pro advances job → completed
- Reviews, disputes, admin KYC gate, activate/deactivate, oversight GMV
- Authz: customer cannot hit vendor/admin mutations (403)

Emergent badge removed. Phase 4 polish applied (layouts, a11y, fonts, README).

---

## How to run (local UAT)

```bash
# Mongo must be up on localhost:27017

cd backend
# .env: MONGO_URL, DB_NAME, JWT_SECRET (≥32 chars), CORS_ORIGINS
. .venv/bin/activate   # or: python3 -m venv .venv && pip install -r requirements.txt (skip emergentintegrations)
uvicorn server:app --host 0.0.0.0 --port 8000

cd ../frontend
# .env: REACT_APP_BACKEND_URL=http://localhost:8000
npm install --legacy-peer-deps
# if ajv error: npm install ajv@^8 --legacy-peer-deps
PORT=3000 npm start
```

| Surface | URL |
|---------|-----|
| Customer | http://localhost:3000/ |
| Vendor DailyPro | http://localhost:3000/vendor |
| Admin Ops | http://localhost:3000/admin |
| API health | http://localhost:8000/api/health |

Re-validate anytime:

```bash
cd backend && . .venv/bin/activate
python ../scripts/uat_e2e_validate.py
python poc_core_flow.py
```

---

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@dailycart.in` | `Demo@123` |
| Mart vendor | `vendor.mart@dailycart.in` | `Demo@123` |
| Service vendor (Ironing) | `vendor.service@dailycart.in` | `Demo@123` |
| Admin | `admin@dailycart.in` | `Admin@123` |

Phone OTP (dev): send OTP → UI shows `dev_otp` (e.g. customer phone `9999900001`).

### Demo data density (after `python seed.py --force`)

| Layer | Approx |
|-------|--------|
| Cities with supply | **8** (Hyd, Blr, Vizag, Bhimavaram, Pune, Delhi, Mumbai, Chennai) |
| Kirana stores | **32** (4/city) |
| Service pros | **48** (6/city) + **3** pending KYC |
| Products | **~900+** (staples, pooja, stationery, frozen, baby/pet…) |
| Services | **~200+** incl. **ironing, cobbler, tailor, tiffin, RO, fogging, CCTV, car wash, movers, pandit** |
| Live activity | Orders + bookings across statuses, reviews, **open + resolved disputes**, admin GMV |

**Partner demo tip:** login mart → Orders queue already has placed/accepted/picking/ready. Login service → Jobs show ironing bookings. Login admin → KYC pending (3), disputes, oversight GMV.

Force refresh data anytime:

```bash
cd backend && . .venv/bin/activate && python seed.py --force
```

---

## UAT checklist (manual)

### Customer
- [ ] Set location Hyderabad → see kirana + pros
- [ ] Switch to Pune → catalog changes
- [ ] Search / autocomplete (e.g. rice, AC)
- [ ] Add items from **2 stores** → cart groups by store → checkout COD → **2 order cards**
- [ ] Track order timeline as vendor advances
- [ ] Book a service: pick **tomorrow**, select an **available** slot, confirm
- [ ] After delivered/completed: leave review; open dispute

### Vendor (DailyPro)
- [ ] Login mart → Orders → advance through full path to **Delivered** (filter follows status)
- [ ] Login service → Jobs → accept → complete
- [ ] Inventory / services CRUD; availability toggles; earnings; profile

### Admin (Ops)
- [ ] Oversight KPIs + GMV
- [ ] KYC approve pending vendor → appears in discovery
- [ ] Deactivate vendor → hidden from discovery; reactivate
- [ ] Resolve a dispute

---

## Automated coverage (this ship)

| Suite | Result |
|-------|--------|
| `scripts/uat_e2e_validate.py` | **35 PASS / 0 FAIL** |
| `backend/poc_core_flow.py` | **POC PASSED** (flywheel E2E) |
| Browser smoke | Home loads; **no** “Made with Emergent” badge |
| FE compile | webpack compiled successfully |

Report artifact: `test_reports/uat_validation.json`

---

## Fixes shipped this pass

1. Removed Emergent badge, scripts, PostHog; title/meta → DailyCart
2. Booking slots: local date (no UTC skew); default tomorrow; “Booked” label; past-slot disable today
3. Vendor order/job advance: filter follows new status (button no longer “vanishes”)
4. Phase 4 polish: shells a11y, Home hero, portal demo hints, README
5. POC script: port **8000**; skip empty-catalog stores
6. JWT secret length ≥32 in `backend/.env`

---

## Known out-of-scope (pilot later)

- Real SMS OTP / MSG91
- Razorpay (COD only now)
- Production subdomain deploy
- Playwright browser CI (API E2E covers flywheel)
- Orphan local dirs `apps/`, `services/`, `packages/` (old monorepo leftovers — not in git)

---

## Sign-off

**App is ready for UAT.** Start at http://localhost:3000 with demo creds above. Run the manual checklist; file bugs against portal + step.

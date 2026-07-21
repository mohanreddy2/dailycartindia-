"""POC: proves the DailyCart core flywheel end-to-end against the running API.
1. Geo discovery near any Indian city (results change per city)
2. Auth: email/password register+login, OTP login
3. Multi-store cart -> checkout -> N sub-orders
4. Vendor advances order status -> customer sees update
5. Service booking with slot -> vendor accept/complete
6. New vendor register -> NOT discoverable until admin KYC approve
7. Admin deactivate -> vendor disappears from discovery
8. Review after delivery updates vendor rating
"""
import sys
import requests

BASE = "http://localhost:8000/api"
FAILED = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    print(f"[{status}] {name} {detail}")
    if not cond:
        FAILED.append(name)


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def main():
    # --- 0. health
    r = requests.get(f"{BASE}/health")
    check("health", r.status_code == 200 and r.json().get("database"))

    # --- 1. cities + geo discovery per city
    cities = requests.get(f"{BASE}/cities").json()
    check("cities list", len(cities) >= 6, f"({len(cities)} cities)")
    hyd = next(c for c in cities if c["name"] == "Hyderabad")
    pune = next(c for c in cities if c["name"] == "Pune")

    d_hyd = requests.get(f"{BASE}/discovery", params={"lat": hyd["lat"], "lng": hyd["lng"], "radius_km": 15}).json()
    d_pune = requests.get(f"{BASE}/discovery", params={"lat": pune["lat"], "lng": pune["lng"], "radius_km": 15}).json()
    check("discovery hyd stores", len(d_hyd["stores"]) >= 2, f"({len(d_hyd['stores'])} stores)")
    check("discovery hyd services", len(d_hyd["service_vendors"]) >= 2)
    check("discovery pune stores", len(d_pune["stores"]) >= 2)
    hyd_ids = {s["id"] for s in d_hyd["stores"]}
    pune_ids = {s["id"] for s in d_pune["stores"]}
    check("discovery location-aware", hyd_ids.isdisjoint(pune_ids), "(different cities -> different stores)")
    check("distance sorted", all(d_hyd["stores"][i]["distance_km"] <= d_hyd["stores"][i+1]["distance_km"]
                                  for i in range(len(d_hyd["stores"]) - 1)))

    # search
    d_search = requests.get(f"{BASE}/discovery", params={"lat": hyd["lat"], "lng": hyd["lng"], "radius_km": 15, "q": "rice"}).json()
    check("search 'rice' products", len(d_search["products"]) >= 1)
    ac = requests.get(f"{BASE}/discovery/autocomplete", params={"q": "ri"}).json()
    check("autocomplete", len(ac["suggestions"]) >= 1)

    # --- 2. auth
    import random
    tag = random.randint(10000, 99999)
    reg = requests.post(f"{BASE}/auth/register", json={
        "name": "POC Tester", "email": f"poc{tag}@test.in", "password": "Test@123", "phone": f"9000{tag}0"})
    check("register email/pw", reg.status_code == 200, reg.text[:80])
    cust_token = reg.json()["access_token"]

    login = requests.post(f"{BASE}/auth/login", json={"email": f"poc{tag}@test.in", "password": "Test@123"})
    check("login email/pw", login.status_code == 200)
    bad = requests.post(f"{BASE}/auth/login", json={"email": f"poc{tag}@test.in", "password": "wrong"})
    check("login wrong pw rejected", bad.status_code == 401)

    otp_send = requests.post(f"{BASE}/auth/otp/send", json={"phone": f"8888{tag}1"})
    check("otp send (dev)", otp_send.status_code == 200 and otp_send.json().get("dev_otp"))
    otp_ver = requests.post(f"{BASE}/auth/otp/verify", json={"phone": f"8888{tag}1", "otp": otp_send.json()["dev_otp"]})
    check("otp verify -> login", otp_ver.status_code == 200 and otp_ver.json().get("access_token"))

    anon = requests.post(f"{BASE}/orders/checkout", json={"items": [], "address": {"line": "x", "city": "y"}})
    check("anonymous checkout 401", anon.status_code == 401)

    # --- 3. multi-store checkout (skip stores with empty catalogs, e.g. newly approved KYC)
    stocked = []
    for s in d_hyd["stores"]:
        prods = requests.get(f"{BASE}/stores/{s['id']}").json().get("products") or []
        if len(prods) >= 5:
            stocked.append((s, prods))
        if len(stocked) >= 2:
            break
    check("store products", len(stocked) >= 2)
    (store_a, prods_a), (store_b, prods_b) = stocked[0], stocked[1]

    cart = {"items": [
        {"product_id": prods_a[0]["id"], "qty": 2},
        {"product_id": prods_a[1]["id"], "qty": 1},
        {"product_id": prods_b[0]["id"], "qty": 3},
    ], "address": {"label": "Home", "line": "Flat 12, Rose Apartments", "city": "Hyderabad",
                    "lat": hyd["lat"], "lng": hyd["lng"]},
        "idempotency_key": f"poc-{tag}"}
    co = requests.post(f"{BASE}/orders/checkout", json=cart, headers=auth_headers(cust_token))
    check("checkout 2 stores -> 2 sub-orders", co.status_code == 200 and len(co.json()["orders"]) == 2, co.text[:100])
    orders = co.json()["orders"]
    expected_sub = prods_a[0]["price"] * 2 + prods_a[1]["price"]
    order_a = next(o for o in orders if o["vendor_id"] == store_a["id"])
    check("order totals correct", abs(order_a["subtotal"] - expected_sub) < 0.01)

    co2 = requests.post(f"{BASE}/orders/checkout", json=cart, headers=auth_headers(cust_token))
    check("idempotent checkout replay", co2.status_code == 200 and co2.json().get("idempotent_replay"))

    mine = requests.get(f"{BASE}/orders/mine", headers=auth_headers(cust_token)).json()
    check("my orders scoped", len(mine) == 2)

    # --- 4. vendor advances order (demo mart vendor owns store A? find owner)
    # login as the demo mart vendor; their store is in Hyderabad
    vlogin = requests.post(f"{BASE}/auth/login", json={"email": "vendor.mart@dailycart.in", "password": "Demo@123"})
    check("vendor mart login", vlogin.status_code == 200)
    v_token = vlogin.json()["access_token"]
    v_orders = requests.get(f"{BASE}/vendor/orders", headers=auth_headers(v_token)).json()
    my_new = [o for o in v_orders if o["status"] == "placed" and o["customer_name"] == "POC Tester"]
    check("vendor sees new order", len(my_new) >= 1)
    if my_new:
        oid = my_new[0]["id"]
        for status in ["accepted", "picking", "ready", "out_for_delivery", "delivered"]:
            r = requests.patch(f"{BASE}/vendor/orders/{oid}/status", json={"status": status}, headers=auth_headers(v_token))
            check(f"vendor advance -> {status}", r.status_code == 200)
        skip = requests.patch(f"{BASE}/vendor/orders/{oid}/status", json={"status": "picking"}, headers=auth_headers(v_token))
        check("invalid transition rejected", skip.status_code == 400)
        cust_view = requests.get(f"{BASE}/orders/{oid}", headers=auth_headers(cust_token)).json()
        check("customer sees delivered", cust_view["status"] == "delivered")
        check("status history tracked", len(cust_view["status_history"]) == 6)

        # --- 8. review after delivery
        rev = requests.post(f"{BASE}/reviews", json={"order_id": oid, "rating": 5, "comment": "Great!"},
                            headers=auth_headers(cust_token))
        check("review after delivery", rev.status_code == 200)
        dup = requests.post(f"{BASE}/reviews", json={"order_id": oid, "rating": 4},
                            headers=auth_headers(cust_token))
        check("duplicate review rejected", dup.status_code == 409)

    # --- 5. service booking flow (book the DEMO service vendor so we can act on both sides)
    slogin_pre = requests.post(f"{BASE}/auth/login", json={"email": "vendor.service@dailycart.in", "password": "Demo@123"})
    demo_svc_vendor_id = requests.get(f"{BASE}/vendor/me", headers=auth_headers(slogin_pre.json()["access_token"])).json()["id"]
    svcs = requests.get(f"{BASE}/service-vendors/{demo_svc_vendor_id}").json()["services"]
    check("vendor services listed", len(svcs) >= 2)
    slots = requests.get(f"{BASE}/services/{svcs[0]['id']}/slots", params={"date": "2026-07-15"}).json()
    check("slots for date", len(slots["slots"]) >= 5)
    free = next(s["time"] for s in slots["slots"] if s["available"])
    bk = requests.post(f"{BASE}/bookings", json={
        "service_id": svcs[0]["id"], "slot_date": "2026-07-15", "slot_time": free,
        "address": {"label": "Home", "line": "Flat 12", "city": "Hyderabad", "lat": hyd["lat"], "lng": hyd["lng"]},
    }, headers=auth_headers(cust_token))
    check("booking created", bk.status_code == 200 and bk.json().get("booking_no"), bk.text[:100])
    bid = bk.json()["id"]

    slots2 = requests.get(f"{BASE}/services/{svcs[0]['id']}/slots", params={"date": "2026-07-15"}).json()
    taken = next(s for s in slots2["slots"] if s["time"] == free)
    check("slot now unavailable", not taken["available"])

    slogin = requests.post(f"{BASE}/auth/login", json={"email": "vendor.service@dailycart.in", "password": "Demo@123"})
    check("service vendor login", slogin.status_code == 200)
    s_token = slogin.json()["access_token"]
    jobs = requests.get(f"{BASE}/vendor/jobs", headers=auth_headers(s_token)).json()
    target = [j for j in jobs if j["id"] == bid]
    if not target:
        # booking may belong to another hyd service vendor; use that vendor's owner - fallback: skip
        check("service vendor sees job", False, "(booked vendor is not demo vendor)")
    else:
        check("service vendor sees job", True)
        for status in ["accepted", "en_route", "in_progress", "completed"]:
            r = requests.patch(f"{BASE}/vendor/jobs/{bid}/status", json={"status": status}, headers=auth_headers(s_token))
            check(f"job advance -> {status}", r.status_code == 200)
        cust_bk = requests.get(f"{BASE}/bookings/{bid}", headers=auth_headers(cust_token)).json()
        check("customer sees completed booking", cust_bk["status"] == "completed")

    # --- 6. KYC gate
    vreg = requests.post(f"{BASE}/auth/register", json={
        "name": "New Store Owner", "email": f"newvendor{tag}@test.in", "password": "Test@123"})
    nv_token = vreg.json()["access_token"]
    onb = requests.post(f"{BASE}/vendor/onboarding", json={
        "type": "mart", "name": f"POC Test Store {tag}", "address": "1 Test St", "city": "Hyderabad",
        "lat": hyd["lat"] + 0.001, "lng": hyd["lng"] + 0.001, "category_slugs": ["grocery"],
        "kyc_id_type": "gstin", "kyc_id_number": "36TEST1234Z"}, headers=auth_headers(nv_token))
    check("vendor onboarding", onb.status_code == 200 and onb.json()["kyc_status"] == "pending")
    new_vid = onb.json()["id"]

    d_check = requests.get(f"{BASE}/discovery", params={"lat": hyd["lat"], "lng": hyd["lng"], "radius_km": 15}).json()
    check("pending vendor NOT discoverable", new_vid not in {s["id"] for s in d_check["stores"]})

    alogin = requests.post(f"{BASE}/auth/login", json={"email": "admin@dailycart.in", "password": "Admin@123"})
    check("admin login", alogin.status_code == 200)
    a_token = alogin.json()["access_token"]

    not_admin = requests.get(f"{BASE}/admin/oversight", headers=auth_headers(cust_token))
    check("customer blocked from admin", not_admin.status_code == 403)

    kyc_q = requests.get(f"{BASE}/admin/kyc", params={"status": "pending"}, headers=auth_headers(a_token)).json()
    check("admin kyc queue", any(v["id"] == new_vid for v in kyc_q))
    appr = requests.patch(f"{BASE}/admin/kyc/{new_vid}", json={"decision": "approved"}, headers=auth_headers(a_token))
    check("admin approves kyc", appr.status_code == 200)

    d_check2 = requests.get(f"{BASE}/discovery", params={"lat": hyd["lat"], "lng": hyd["lng"], "radius_km": 15}).json()
    check("approved vendor discoverable", new_vid in {s["id"] for s in d_check2["stores"]})

    # --- 7. deactivate
    deact = requests.patch(f"{BASE}/admin/vendors/{new_vid}/active", json={"is_active": False}, headers=auth_headers(a_token))
    check("admin deactivates", deact.status_code == 200)
    d_check3 = requests.get(f"{BASE}/discovery", params={"lat": hyd["lat"], "lng": hyd["lng"], "radius_km": 15}).json()
    check("deactivated vendor hidden", new_vid not in {s["id"] for s in d_check3["stores"]})

    ov = requests.get(f"{BASE}/admin/oversight", headers=auth_headers(a_token)).json()
    check("admin oversight live", ov["orders_total"] >= 2 and ov["gmv"] > 0, f"(gmv={ov['gmv']})")

    print("\n" + "=" * 50)
    if FAILED:
        print(f"POC FAILED: {len(FAILED)} checks: {FAILED}")
        sys.exit(1)
    print("POC PASSED: core flywheel proven end-to-end")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Idempotent Admin-API seed of Mohan's live shops as kirana vendors.

Creates one mart per shop in every DailyCart city, with photos, website,
and a real product catalog. Safe to re-run: skips existing name+city vendors
and only adds missing products.

Does NOT wipe Mongo. Never run backend/seed.py --force against Cluster0.

Usage:
  python scripts/seed_network_stores.py
"""
from __future__ import annotations

import json
import ssl
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE = "https://dailycart-api.onrender.com/api"
ADMIN_EMAIL = "admin@dailycart.in"
ADMIN_PASSWORD = "Admin@123"
OWNER_PASSWORD = "Network@123"
TIMEOUT = 90

CTX = ssl.create_default_context()

IMG = {
    "rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&q=60",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&q=60",
    "oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&q=60",
    "atta": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=60",
    "eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&q=60",
    "dal": "https://images.unsplash.com/photo-1610725664285-7c57e6eeac3f?w=400&q=60",
    "tea": "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=400&q=60",
    "sugar": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&q=60",
    "mango": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=400&q=60",
    "mango2": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=60",
    "banana": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&q=60",
    "tomato": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=60",
    "spinach": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=60",
    "honey": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&q=60",
    "compost": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=60",
    "neem": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=60",
    "coconut": "https://images.unsplash.com/photo-1581375319711-2dff38d64d2e?w=400&q=60",
    "coriander": "https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=400&q=60",
    "gift": "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=400&q=60",
    "notebook": "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=60",
    "incense": "https://images.unsplash.com/photo-1478144592103-25e218a04891?w=400&q=60",
}

SHOPS = [
    {
        "slug": "dailycart24x7",
        "name": "Daily Cart 24/7",
        "website": "https://dailycart24x7.com/",
        "description": "Neighbourhood kirana and daily essentials from Daily Cart 24/7 Pvt Ltd.",
        "address": "D#105, Jai Prime Apartment, Alpha Garden, Kodigehalli, KR Puram, Bengaluru 560048",
        "image": "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=60",
        "category_slugs": ["grocery", "dairy"],
        "products": [
            {"name": "Sona Masoori Rice 5 kg", "category_slug": "grocery", "price": 349, "mrp": 399, "unit": "5 kg", "stock_qty": 40, "image": IMG["rice"]},
            {"name": "Nandini Toned Milk 500 ml", "category_slug": "dairy", "price": 28, "mrp": 30, "unit": "500 ml", "stock_qty": 80, "image": IMG["milk"]},
            {"name": "Fortune Sunflower Oil 1 L", "category_slug": "grocery", "price": 145, "mrp": 165, "unit": "1 L", "stock_qty": 36, "image": IMG["oil"]},
            {"name": "Aashirvaad Atta 5 kg", "category_slug": "grocery", "price": 255, "mrp": 285, "unit": "5 kg", "stock_qty": 28, "image": IMG["atta"]},
            {"name": "Toor Dal 1 kg", "category_slug": "grocery", "price": 168, "mrp": 189, "unit": "1 kg", "stock_qty": 40, "image": IMG["dal"]},
            {"name": "Farm Eggs (12)", "category_slug": "dairy", "price": 84, "mrp": 96, "unit": "12 pcs", "stock_qty": 50, "image": IMG["eggs"]},
            {"name": "Red Label Tea 250 g", "category_slug": "grocery", "price": 112, "mrp": 125, "unit": "250 g", "stock_qty": 32, "image": IMG["tea"]},
            {"name": "Sugar 1 kg", "category_slug": "grocery", "price": 48, "mrp": 55, "unit": "1 kg", "stock_qty": 60, "image": IMG["sugar"]},
        ],
    },
    {
        "slug": "idailycart",
        "name": "iDailyCart",
        "website": "https://idailycart.com/",
        "description": "Indian mangoes and export fruit, packed for home delivery.",
        "address": "Kodigehalli, KR Puram, Bengaluru 560048",
        "image": "https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&q=60",
        "category_slugs": ["fruits-veg"],
        "products": [
            {"name": "Alphonso Mangoes (6)", "category_slug": "fruits-veg", "price": 899, "mrp": 999, "unit": "6 pcs", "stock_qty": 20, "image": IMG["mango"]},
            {"name": "Banganapalli Mangoes (6)", "category_slug": "fruits-veg", "price": 449, "mrp": 499, "unit": "6 pcs", "stock_qty": 24, "image": IMG["mango2"]},
            {"name": "Kesar Mangoes (6)", "category_slug": "fruits-veg", "price": 649, "mrp": 729, "unit": "6 pcs", "stock_qty": 18, "image": IMG["mango"]},
            {"name": "Imam Pasand (4)", "category_slug": "fruits-veg", "price": 799, "mrp": 899, "unit": "4 pcs", "stock_qty": 12, "image": IMG["mango2"]},
            {"name": "Totapuri Mangoes (6)", "category_slug": "fruits-veg", "price": 299, "mrp": 349, "unit": "6 pcs", "stock_qty": 30, "image": IMG["mango"]},
            {"name": "Export Mango Gift Box", "category_slug": "fruits-veg", "price": 1499, "mrp": 1699, "unit": "1 box", "stock_qty": 10, "image": IMG["gift"]},
        ],
    },
    {
        "slug": "oraganic",
        "name": "Oraganic",
        "website": "https://oraganic.online/",
        "description": "Organic produce grown with care — vegetables, fruit, and pantry staples.",
        "address": "Kodigehalli, KR Puram, Bengaluru 560048",
        "image": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=60",
        "category_slugs": ["fruits-veg", "grocery"],
        "products": [
            {"name": "Organic Tomatoes 1 kg", "category_slug": "fruits-veg", "price": 68, "mrp": 80, "unit": "1 kg", "stock_qty": 40, "image": IMG["tomato"]},
            {"name": "Organic Palak Bunch", "category_slug": "fruits-veg", "price": 32, "mrp": 40, "unit": "1 bunch", "stock_qty": 35, "image": IMG["spinach"]},
            {"name": "Organic Bananas (6)", "category_slug": "fruits-veg", "price": 55, "mrp": 65, "unit": "6 pcs", "stock_qty": 40, "image": IMG["banana"]},
            {"name": "Forest Honey 250 g", "category_slug": "grocery", "price": 249, "mrp": 289, "unit": "250 g", "stock_qty": 22, "image": IMG["honey"]},
            {"name": "Organic Brown Rice 2 kg", "category_slug": "grocery", "price": 198, "mrp": 225, "unit": "2 kg", "stock_qty": 26, "image": IMG["rice"]},
            {"name": "A2 Cow Milk 500 ml", "category_slug": "dairy", "price": 45, "mrp": 52, "unit": "500 ml", "stock_qty": 30, "image": IMG["milk"]},
        ],
    },
    {
        "slug": "oraganic-ai",
        "name": "Oraganic AI",
        "website": "https://oraganic-ai.com/",
        "description": "Field intelligence and grower supplies for organic farms.",
        "address": "Kodigehalli, KR Puram, Bengaluru 560048",
        "image": "https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=600&q=60",
        "category_slugs": ["grocery"],
        "products": [
            {"name": "Neem Oil 500 ml", "category_slug": "grocery", "price": 189, "mrp": 220, "unit": "500 ml", "stock_qty": 24, "image": IMG["neem"]},
            {"name": "Vermicompost 5 kg", "category_slug": "grocery", "price": 149, "mrp": 175, "unit": "5 kg", "stock_qty": 30, "image": IMG["compost"]},
            {"name": "Coco Peat Block", "category_slug": "grocery", "price": 89, "mrp": 110, "unit": "1 block", "stock_qty": 28, "image": IMG["compost"]},
            {"name": "Organic Seeds Kit", "category_slug": "grocery", "price": 259, "mrp": 299, "unit": "1 kit", "stock_qty": 18, "image": IMG["spinach"]},
            {"name": "Grow Bags (pack of 5)", "category_slug": "household", "price": 199, "mrp": 249, "unit": "5 pcs", "stock_qty": 20, "image": IMG["compost"]},
            {"name": "Soil Test Kit", "category_slug": "household", "price": 499, "mrp": 599, "unit": "1 kit", "stock_qty": 12, "image": IMG["notebook"]},
        ],
    },
    {
        "slug": "alfa-garden",
        "name": "Alfa Garden",
        "website": "https://alfa-garden.com/",
        "description": "Organic produce from Alpha Garden, KR Puram.",
        "address": "Alpha Garden, Kodigehalli, KR Puram, Bengaluru 560048",
        "image": "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=60",
        "category_slugs": ["fruits-veg"],
        "products": [
            {"name": "Garden Tomatoes 1 kg", "category_slug": "fruits-veg", "price": 48, "mrp": 60, "unit": "1 kg", "stock_qty": 40, "image": IMG["tomato"]},
            {"name": "Curry Leaf Bunch", "category_slug": "fruits-veg", "price": 15, "mrp": 20, "unit": "1 bunch", "stock_qty": 50, "image": IMG["coriander"]},
            {"name": "Coriander Bunch", "category_slug": "fruits-veg", "price": 12, "mrp": 18, "unit": "1 bunch", "stock_qty": 50, "image": IMG["coriander"]},
            {"name": "Mint Bunch", "category_slug": "fruits-veg", "price": 12, "mrp": 18, "unit": "1 bunch", "stock_qty": 45, "image": IMG["spinach"]},
            {"name": "Tender Coconut", "category_slug": "fruits-veg", "price": 45, "mrp": 55, "unit": "1 pc", "stock_qty": 36, "image": IMG["coconut"]},
            {"name": "Garden Banana (6)", "category_slug": "fruits-veg", "price": 42, "mrp": 50, "unit": "6 pcs", "stock_qty": 30, "image": IMG["banana"]},
        ],
    },
    {
        "slug": "chittoor-mangoes",
        "name": "Chittoor Mangoes",
        "website": "https://chittoormango.com/",
        "description": "Premium Chittoor mangoes — air-flown varieties packed for India and Singapore.",
        "address": "Chittoor orchards & Bengaluru packing, Daily Cart 24/7 Pvt Ltd",
        "image": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=60",
        "category_slugs": ["fruits-veg"],
        "products": [
            {"name": "Banganapalli Box (5 kg)", "category_slug": "fruits-veg", "price": 799, "mrp": 899, "unit": "5 kg", "stock_qty": 16, "image": IMG["mango2"]},
            {"name": "Imam Pasand Box (3 kg)", "category_slug": "fruits-veg", "price": 1299, "mrp": 1499, "unit": "3 kg", "stock_qty": 10, "image": IMG["mango"]},
            {"name": "Mallika Mangoes (6)", "category_slug": "fruits-veg", "price": 549, "mrp": 649, "unit": "6 pcs", "stock_qty": 14, "image": IMG["mango"]},
            {"name": "Neelam Mangoes (6)", "category_slug": "fruits-veg", "price": 399, "mrp": 459, "unit": "6 pcs", "stock_qty": 20, "image": IMG["mango2"]},
            {"name": "Cheruku Rasalu (4)", "category_slug": "fruits-veg", "price": 899, "mrp": 999, "unit": "4 pcs", "stock_qty": 8, "image": IMG["mango"]},
            {"name": "Mixed Heritage Box", "category_slug": "fruits-veg", "price": 1599, "mrp": 1799, "unit": "1 box", "stock_qty": 8, "image": IMG["gift"]},
        ],
    },
    {
        "slug": "thanks2all",
        "name": "Thanks2All",
        "website": "https://thanks2all.org/",
        "description": "Thanks to all who shaped my life — Mohan Reddy Yadamuri. Community hampers and everyday gifts.",
        "address": "Bengaluru",
        "image": "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=60",
        "category_slugs": ["grocery", "pooja"],
        "products": [
            {"name": "Thank-you Hamper", "category_slug": "grocery", "price": 499, "mrp": 599, "unit": "1 box", "stock_qty": 20, "image": IMG["gift"]},
            {"name": "Assam Tea 250 g", "category_slug": "grocery", "price": 165, "mrp": 189, "unit": "250 g", "stock_qty": 24, "image": IMG["tea"]},
            {"name": "Notebook Set (3)", "category_slug": "stationery", "price": 129, "mrp": 159, "unit": "3 pcs", "stock_qty": 30, "image": IMG["notebook"]},
            {"name": "Sandal Incense Pack", "category_slug": "pooja", "price": 45, "mrp": 55, "unit": "1 pack", "stock_qty": 40, "image": IMG["incense"]},
            {"name": "Forest Honey Mini 100 g", "category_slug": "grocery", "price": 129, "mrp": 149, "unit": "100 g", "stock_qty": 26, "image": IMG["honey"]},
            {"name": "Mixed Dry Fruit Pouch", "category_slug": "snacks", "price": 249, "mrp": 289, "unit": "200 g", "stock_qty": 22, "image": IMG["gift"]},
        ],
    },
]

BANGALORE_LAT, BANGALORE_LNG = 13.0076, 77.7033


def request(method: str, path: str, *, body: dict | None = None, token: str | None = None) -> tuple[int, Any]:
    url = BASE + path
    headers = {"Accept": "application/json"}
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=TIMEOUT, context=CTX) as resp:
            raw = resp.read().decode() or "{}"
            try:
                return resp.status, json.loads(raw)
            except json.JSONDecodeError:
                return resp.status, raw
    except HTTPError as e:
        raw = e.read().decode() if e.fp else ""
        try:
            parsed: Any = json.loads(raw) if raw else {"detail": str(e)}
        except json.JSONDecodeError:
            parsed = raw[:400]
        return e.code, parsed
    except URLError as e:
        return 0, {"error": str(e.reason)}


def get(path: str, **kw: Any) -> tuple[int, Any]:
    return request("GET", path, **kw)


def post(path: str, body: dict | None = None, **kw: Any) -> tuple[int, Any]:
    return request("POST", path, body=body or {}, **kw)


def patch(path: str, body: dict | None = None, **kw: Any) -> tuple[int, Any]:
    return request("PATCH", path, body=body or {}, **kw)


def wake() -> None:
    print(f"Waking {BASE} …")
    for attempt in range(12):
        code, body = get("/health")
        ok = code == 200 and isinstance(body, dict) and body.get("database")
        print(f"  health try {attempt + 1}: {code} {body if isinstance(body, dict) else str(body)[:120]}")
        if ok:
            return
        time.sleep(8)
    raise SystemExit("API did not become healthy")


def city_slug(name: str) -> str:
    return name.lower().replace(" ", "")


def ensure_user(token: str, email: str, name: str, users_by_email: dict[str, dict]) -> dict:
    existing = users_by_email.get(email)
    if existing:
        return existing
    code, body = post("/admin/users", {
        "name": name[:80],
        "email": email,
        "password": OWNER_PASSWORD,
    }, token=token)
    if code in (200, 201) and isinstance(body, dict) and body.get("id"):
        users_by_email[email] = body
        return body
    if code == 409:
        code, users = get("/admin/users", token=token)
        if code == 200 and isinstance(users, list):
            for u in users:
                if (u.get("email") or "").lower() == email:
                    users_by_email[email] = u
                    return u
    raise RuntimeError(f"Could not create user {email}: {code} {body}")


def vendor_login(email: str) -> str | None:
    code, body = post("/auth/login", {"email": email, "password": OWNER_PASSWORD})
    if code == 200 and isinstance(body, dict) and body.get("access_token"):
        return body["access_token"]
    print(f"    vendor login fail {email}: {code} {body}")
    return None


def ensure_products(owner_email: str, wanted: list[dict]) -> int:
    """Live API catalogs products on /vendor/products (admin catalog route is not deployed yet)."""
    vtoken = vendor_login(owner_email)
    if not vtoken:
        return 0
    code, existing = get("/vendor/products", token=vtoken)
    have = set()
    if code == 200 and isinstance(existing, list):
        have = {(p.get("name") or "").strip().lower() for p in existing}
    added = 0
    for item in wanted:
        if item["name"].strip().lower() in have:
            continue
        payload = {**item, "is_available": True}
        code, body = post("/vendor/products", payload, token=vtoken)
        if code in (200, 201):
            added += 1
            have.add(item["name"].strip().lower())
        else:
            print(f"    product fail {item['name']}: {code} {body}")
    return added


def vendor_for_user(token: str, user_id: str) -> dict | None:
    code, body = get(f"/admin/users/{user_id}", token=token)
    if code == 200 and isinstance(body, dict) and isinstance(body.get("vendor"), dict):
        return body["vendor"]
    return None


def main() -> int:
    wake()
    code, login_body = post("/auth/login", {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if code != 200 or not isinstance(login_body, dict) or not login_body.get("access_token"):
        print("Admin login failed:", code, login_body)
        return 1
    token = login_body["access_token"]
    print("Admin login OK")

    code, cities = get("/cities")
    if code != 200 or not isinstance(cities, list) or not cities:
        print("Cities failed:", code, cities)
        return 1
    print(f"Cities: {', '.join(c.get('name', '?') for c in cities)}")

    code, vendors = get("/admin/vendors", token=token)
    if code != 200 or not isinstance(vendors, list):
        print("Vendors list failed:", code, vendors)
        return 1
    by_name_city = {
        ((v.get("name") or "").strip().lower(), (v.get("city") or "").strip().lower()): v
        for v in vendors
    }

    code, users = get("/admin/users", token=token)
    if code != 200 or not isinstance(users, list):
        print("Users list failed:", code, users)
        return 1
    users_by_email = {(u.get("email") or "").lower(): u for u in users}

    created = skipped = products_added = approved = 0
    shop_names = {s["name"].strip().lower() for s in SHOPS}

    for city in cities:
        city_name = city["name"]
        for index, shop in enumerate(SHOPS):
            key = (shop["name"].strip().lower(), city_name.strip().lower())
            vendor = by_name_city.get(key)
            email = f"net.{shop['slug']}.{city_slug(city_name)}@dailycart.in"
            if city_name == "Bangalore":
                lat, lng = BANGALORE_LAT + index * 0.001, BANGALORE_LNG + index * 0.001
                address = shop["address"]
            else:
                lat = float(city["lat"]) + index * 0.001
                lng = float(city["lng"]) + index * 0.001
                address = f"{shop['name']}, {city_name}"

            if vendor:
                skipped += 1
                vid = vendor["id"]
                print(f"= {shop['name']} / {city_name} ({vid})")
            else:
                owner = ensure_user(token, email, f"{shop['name']} ({city_name})", users_by_email)
                existing_for_user = vendor_for_user(token, owner["id"]) or next(
                    (v for v in vendors if v.get("user_id") == owner["id"]), None
                )
                if existing_for_user:
                    vendor = existing_for_user
                    vid = vendor["id"]
                    skipped += 1
                    vendors.append(vendor)
                    by_name_city[key] = vendor
                    print(f"= {shop['name']} / {city_name} (owner already has vendor {vid})")
                else:
                    payload = {
                        "user_id": owner["id"],
                        "type": "mart",
                        "name": shop["name"],
                        "description": shop["description"],
                        "category_slugs": shop["category_slugs"],
                        "address": address,
                        "city": city_name,
                        "lat": lat,
                        "lng": lng,
                        "min_order": 99,
                        "delivery_fee": 25,
                        "kyc_id_type": "gstin",
                        "kyc_id_number": f"NET{shop['slug'][:6].upper()}{city_slug(city_name)[:6].upper()}99",
                        "image": shop["image"],
                        "website": shop["website"],
                        "featured": False,
                    }
                    code, body = post("/admin/vendors", payload, token=token)
                    if code == 422:
                        for extra in ("image", "website", "featured"):
                            payload.pop(extra, None)
                        code, body = post("/admin/vendors", payload, token=token)
                    if code == 409:
                        vendor = vendor_for_user(token, owner["id"])
                        if not vendor:
                            print(f"x create {shop['name']} / {city_name}: {code} {body}")
                            continue
                        skipped += 1
                        vid = vendor["id"]
                        print(f"= {shop['name']} / {city_name} (409 reused {vid})")
                    elif code not in (200, 201) or not isinstance(body, dict) or not body.get("id"):
                        print(f"x create {shop['name']} / {city_name}: {code} {body}")
                        continue
                    else:
                        vendor = body
                        created += 1
                        vid = vendor["id"]
                        print(f"+ {shop['name']} / {city_name} ({vid})")
                    vendors.append(vendor)
                    by_name_city[key] = vendor

            if vendor.get("kyc_status") != "approved":
                code, body = patch(f"/admin/kyc/{vid}", {"decision": "approved", "note": "Network shop"}, token=token)
                if code == 200:
                    approved += 1
                    vendor["kyc_status"] = "approved"
                else:
                    print(f"    kyc fail: {code} {body}")

            patch_body = {
                "description": shop["description"],
                "address": address,
                "image": shop["image"],
                "website": shop["website"],
                "featured": False,
                "is_open": True,
                "min_order": 99,
                "delivery_fee": 25,
            }
            pcode, _ = patch(f"/admin/vendors/{vid}", patch_body, token=token)
            if pcode == 422:
                patch(f"/admin/vendors/{vid}", {
                    "description": shop["description"],
                    "address": address,
                    "is_open": True,
                    "min_order": 99,
                    "delivery_fee": 25,
                }, token=token)

            added = ensure_products(email, shop["products"])
            products_added += added
            if added:
                print(f"    +{added} products")

    print()
    print(f"Done. created={created} existing={skipped} kyc_approved={approved} products_added={products_added}")
    print(f"Network shops: {len(shop_names)} names × {len(cities)} cities")
    return 0


if __name__ == "__main__":
    sys.exit(main())

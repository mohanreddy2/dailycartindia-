"""Public catalog + geo discovery."""
import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from core import db, strip_id

router = APIRouter(tags=["public"])

WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DEFAULT_SLOTS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"]


def live_vendor_query(extra: dict = None) -> dict:
    q = {"kyc_status": "approved", "is_active": True}
    if extra:
        q.update(extra)
    return q


async def geo_vendors(lat: float, lng: float, radius_km: float, extra_query: dict, limit: int = 30):
    pipeline = [
        {"$geoNear": {
            "near": {"type": "Point", "coordinates": [lng, lat]},
            "distanceField": "distance_m",
            "maxDistance": radius_km * 1000,
            "query": live_vendor_query(extra_query),
            "spherical": True,
        }},
        {"$limit": limit},
    ]
    docs = await db.vendors.aggregate(pipeline).to_list(limit)
    out = []
    for d in docs:
        d = strip_id(d)
        d["distance_km"] = round(d.pop("distance_m", 0) / 1000, 2)
        out.append(d)
    return out


@router.get("/cities")
async def cities():
    docs = await db.cities.find().sort("name", 1).to_list(100)
    return strip_id(docs)


@router.get("/categories")
async def categories(kind: Optional[str] = None):
    q = {"kind": kind} if kind else {}
    docs = await db.categories.find(q).to_list(100)
    return strip_id(docs)


@router.get("/discovery")
async def discovery(
    lat: float, lng: float,
    radius_km: float = Query(10, ge=0.5, le=50),
    kind: Optional[str] = None,          # mart | service
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(30, le=60),
):
    result = {"stores": [], "service_vendors": [], "products": [], "services": []}
    rx = re.compile(re.escape(q.strip()), re.IGNORECASE) if q and q.strip() else None

    extra_mart = {"type": "mart"}
    extra_svc = {"type": "service"}
    if category:
        extra_mart["category_slugs"] = category
        extra_svc["category_slugs"] = category

    if kind in (None, "mart"):
        stores = await geo_vendors(lat, lng, radius_km, extra_mart, limit)
        if rx:
            store_ids = [s["id"] for s in stores]
            prods = await db.products.find({
                "vendor_id": {"$in": store_ids},
                "is_available": True,
                "$or": [{"name": rx}, {"category_slug": rx}],
            }).to_list(60)
            prods = strip_id(prods)
            smap = {s["id"]: s for s in stores}
            for p in prods:
                st = smap.get(p["vendor_id"], {})
                p["store_name"] = st.get("name")
                p["store_distance_km"] = st.get("distance_km")
            result["products"] = prods
            matched_ids = {p["vendor_id"] for p in prods}
            stores = [s for s in stores if rx.search(s["name"]) or s["id"] in matched_ids]
        result["stores"] = stores

    if kind in (None, "service"):
        vendors = await geo_vendors(lat, lng, radius_km, extra_svc, limit)
        if rx:
            v_ids = [v["id"] for v in vendors]
            svcs = await db.services.find({
                "vendor_id": {"$in": v_ids},
                "is_available": True,
                "$or": [{"name": rx}, {"category_slug": rx}, {"description": rx}],
            }).to_list(60)
            svcs = strip_id(svcs)
            vmap = {v["id"]: v for v in vendors}
            for s in svcs:
                vd = vmap.get(s["vendor_id"], {})
                s["vendor_name"] = vd.get("name")
                s["vendor_rating"] = vd.get("rating")
                s["vendor_distance_km"] = vd.get("distance_km")
            result["services"] = svcs
            matched_v = {s["vendor_id"] for s in svcs}
            vendors = [v for v in vendors if rx.search(v["name"]) or v["id"] in matched_v]
        result["service_vendors"] = vendors

    return result


@router.get("/discovery/autocomplete")
async def autocomplete(q: str, lat: Optional[float] = None, lng: Optional[float] = None):
    if not q or len(q.strip()) < 2:
        return {"suggestions": []}
    rx = re.compile(re.escape(q.strip()), re.IGNORECASE)
    suggestions = []
    cats = await db.categories.find({"name": rx}).to_list(5)
    for c in strip_id(cats):
        suggestions.append({"type": "category", "label": c["name"], "slug": c["slug"], "kind": c["kind"]})
    prods = await db.products.find({"name": rx, "is_available": True}).limit(6).to_list(6)
    seen = set()
    for p in strip_id(prods):
        if p["name"].lower() not in seen:
            seen.add(p["name"].lower())
            suggestions.append({"type": "product", "label": p["name"]})
    svcs = await db.services.find({"name": rx, "is_available": True}).limit(6).to_list(6)
    for s in strip_id(svcs):
        if s["name"].lower() not in seen:
            seen.add(s["name"].lower())
            suggestions.append({"type": "service", "label": s["name"]})
    vendors = await db.vendors.find({"name": rx, "kyc_status": "approved", "is_active": True}).limit(4).to_list(4)
    for v in strip_id(vendors):
        suggestions.append({"type": "vendor", "label": v["name"], "id": v["id"], "vendor_type": v["type"]})
    return {"suggestions": suggestions[:12]}


@router.get("/stores/{store_id}")
async def store_detail(store_id: str):
    store = await db.vendors.find_one({"id": store_id, "type": "mart"})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
    products = await db.products.find({"vendor_id": store_id}).to_list(200)
    return {"store": strip_id(store), "products": strip_id(products)}


@router.get("/service-vendors/{vendor_id}")
async def service_vendor_detail(vendor_id: str):
    vendor = await db.vendors.find_one({"id": vendor_id, "type": "service"})
    if not vendor:
        raise HTTPException(status_code=404, detail="Service provider not found")
    services = await db.services.find({"vendor_id": vendor_id}).to_list(100)
    reviews = await db.reviews.find({"vendor_id": vendor_id}).sort("created_at", -1).limit(10).to_list(10)
    return {"vendor": strip_id(vendor), "services": strip_id(services), "reviews": strip_id(reviews)}


@router.get("/services/{service_id}")
async def service_detail(service_id: str):
    svc = await db.services.find_one({"id": service_id})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    vendor = await db.vendors.find_one({"id": svc["vendor_id"]})
    return {"service": strip_id(svc), "vendor": strip_id(vendor)}


@router.get("/services/{service_id}/slots")
async def service_slots(service_id: str, date: str):
    svc = await db.services.find_one({"id": service_id})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    vendor = await db.vendors.find_one({"id": svc["vendor_id"]})
    try:
        d = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Date must be YYYY-MM-DD")
    weekday = WEEKDAYS[d.weekday()]
    availability = (vendor or {}).get("availability") or {}
    slots = availability.get(weekday) or DEFAULT_SLOTS
    if not slots:
        slots = DEFAULT_SLOTS
    # remove already-booked slots for that vendor+date
    booked = await db.bookings.find({
        "vendor_id": svc["vendor_id"], "slot_date": date,
        "status": {"$nin": ["cancelled", "declined", "completed"]},
    }).to_list(50)
    taken = {b["slot_time"] for b in booked}
    today = datetime.now().strftime("%Y-%m-%d")
    now_hm = datetime.now().strftime("%H:%M")
    out = []
    for t in slots:
        available = t not in taken
        if date == today and t <= now_hm:
            available = False
        out.append({"time": t, "available": available})
    return {"date": date, "slots": out}


@router.get("/vendors/{vendor_id}/reviews")
async def vendor_reviews(vendor_id: str):
    docs = await db.reviews.find({"vendor_id": vendor_id}).sort("created_at", -1).limit(50).to_list(50)
    return strip_id(docs)

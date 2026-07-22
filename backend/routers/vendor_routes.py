"""Vendor (DailyPro): onboarding, orders, jobs, inventory, services, availability, earnings."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import (db, new_id, now_iso, strip_id, get_current_user, require_vendor,
                  get_vendor_profile, ORDER_FLOW, BOOKING_FLOW, can_advance)

router = APIRouter(prefix="/vendor", tags=["vendor"])
MAX_INLINE_IMAGE_CHARS = 700_000  # ~500 KB source image after base64 encoding


def validate_inline_image(image: Optional[str]) -> None:
    if not image or not image.startswith("data:image/"):
        return
    if not image.startswith(("data:image/jpeg;", "data:image/png;", "data:image/webp;")):
        raise HTTPException(status_code=400, detail="Only JPG, PNG, and WebP images are supported")
    if len(image) > MAX_INLINE_IMAGE_CHARS:
        raise HTTPException(status_code=400, detail="Image must be 500 KB or smaller")


class OnboardingProduct(BaseModel):
    name: str = Field(..., min_length=2)
    category_slug: str
    price: float = Field(..., gt=0)
    mrp: Optional[float] = None
    unit: str = "1 pc"
    stock_qty: int = Field(0, ge=0)
    image: Optional[str] = None


class OnboardingService(BaseModel):
    name: str = Field(..., min_length=2)
    category_slug: str
    description: Optional[str] = None
    base_price: float = Field(..., gt=0)
    duration_minutes: int = Field(60, gt=0)
    image: Optional[str] = None


class OnboardingRequest(BaseModel):
    type: str = Field(..., pattern="^(mart|service)$")
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    category_slugs: List[str] = []
    address: str
    city: str
    lat: float
    lng: float
    image: Optional[str] = None
    min_order: float = 0
    delivery_fee: float = 25
    kyc_id_type: str = "aadhaar"
    kyc_id_number: str = Field(..., min_length=4)
    initial_products: List[OnboardingProduct] = []
    initial_services: List[OnboardingService] = []


class ProductBody(BaseModel):
    name: str
    category_slug: str
    price: float = Field(..., gt=0)
    mrp: Optional[float] = None
    unit: str = "1 pc"
    stock_qty: int = Field(0, ge=0)
    image: Optional[str] = None
    is_available: bool = True


class ServiceBody(BaseModel):
    name: str
    category_slug: str
    description: Optional[str] = None
    base_price: float = Field(..., gt=0)
    duration_minutes: int = 60
    image: Optional[str] = None
    is_available: bool = True


class StatusBody(BaseModel):
    status: str


class AvailabilityBody(BaseModel):
    availability: dict


class ProfileBody(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    is_open: Optional[bool] = None
    min_order: Optional[float] = None
    delivery_fee: Optional[float] = None


@router.post("/onboarding")
async def onboarding(body: OnboardingRequest, user: dict = Depends(get_current_user)):
    existing = await db.vendors.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=409, detail="You already have a vendor profile")
    if body.type == "mart" and body.initial_services:
        raise HTTPException(status_code=400, detail="Mart stores can only add products")
    if body.type == "service" and body.initial_products:
        raise HTTPException(status_code=400, detail="Service providers can only add services")
    catalog_categories = [item.category_slug for item in (body.initial_products if body.type == "mart" else body.initial_services)]
    if any(category not in body.category_slugs for category in catalog_categories):
        raise HTTPException(status_code=400, detail="Each product or service must use one of your selected categories")
    for item in [*body.initial_products, *body.initial_services]:
        validate_inline_image(item.image)

    vendor = {
        "id": new_id(),
        "user_id": user["id"],
        "type": body.type,
        "name": body.name.strip(),
        "description": body.description,
        "category_slugs": body.category_slugs,
        "address": body.address,
        "city": body.city,
        "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
        "image": body.image,
        "rating": 0,
        "review_count": 0,
        "min_order": body.min_order,
        "delivery_fee": body.delivery_fee,
        "kyc_status": "pending",
        "kyc": {"id_type": body.kyc_id_type, "id_number": body.kyc_id_number, "submitted_at": now_iso()},
        "is_active": True,
        "is_open": True,
        "availability": None,
        "created_at": now_iso(),
    }
    await db.vendors.insert_one(dict(vendor))
    if body.type == "mart":
        products = [{
            "id": new_id(),
            "vendor_id": vendor["id"],
            **product.model_dump(),
            "is_available": True,
            "created_at": now_iso(),
        } for product in body.initial_products]
        if products:
            await db.products.insert_many(products)
    else:
        services = [{
            "id": new_id(),
            "vendor_id": vendor["id"],
            **service.model_dump(),
            "is_available": True,
            "created_at": now_iso(),
        } for service in body.initial_services]
        if services:
            await db.services.insert_many(services)
    cap = "mart_vendor" if body.type == "mart" else "service_vendor"
    await db.users.update_one({"id": user["id"]}, {"$addToSet": {"capabilities": cap}})
    await db.audit_log.insert_one({"id": new_id(), "action": "vendor_onboarded", "vendor_id": vendor["id"],
                                   "by": user["id"], "at": now_iso()})
    return strip_id(vendor)


@router.get("/me")
async def vendor_me(user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    return vendor


@router.patch("/profile")
async def update_profile(body: ProfileBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db.vendors.update_one({"id": vendor["id"]}, {"$set": updates})
    updated = await db.vendors.find_one({"id": vendor["id"]})
    return strip_id(updated)


@router.get("/dashboard")
async def vendor_dashboard(user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    vid = vendor["id"]
    today = now_iso()[:10]
    if vendor["type"] == "mart":
        pending = await db.orders.count_documents({"vendor_id": vid, "status": "placed"})
        active = await db.orders.count_documents({"vendor_id": vid, "status": {"$in": ["accepted", "picking", "ready", "out_for_delivery"]}})
        done_today = await db.orders.count_documents({"vendor_id": vid, "status": "delivered", "created_at": {"$regex": f"^{today}"}})
        delivered = await db.orders.find({"vendor_id": vid, "status": "delivered"}).to_list(2000)
        earnings_total = round(sum(o["total"] for o in delivered), 2)
        earnings_today = round(sum(o["total"] for o in delivered if o["created_at"][:10] == today), 2)
        products_count = await db.products.count_documents({"vendor_id": vid})
        low_stock = await db.products.count_documents({"vendor_id": vid, "stock_qty": {"$lt": 10}})
        return {"vendor": vendor, "pending": pending, "active": active, "done_today": done_today,
                "earnings_total": earnings_total, "earnings_today": earnings_today,
                "products_count": products_count, "low_stock": low_stock}
    else:
        pending = await db.bookings.count_documents({"vendor_id": vid, "status": "requested"})
        active = await db.bookings.count_documents({"vendor_id": vid, "status": {"$in": ["accepted", "en_route", "in_progress"]}})
        done_today = await db.bookings.count_documents({"vendor_id": vid, "status": "completed", "created_at": {"$regex": f"^{today}"}})
        completed = await db.bookings.find({"vendor_id": vid, "status": "completed"}).to_list(2000)
        earnings_total = round(sum(b["price"] for b in completed), 2)
        earnings_today = round(sum(b["price"] for b in completed if b["created_at"][:10] == today), 2)
        services_count = await db.services.count_documents({"vendor_id": vid})
        return {"vendor": vendor, "pending": pending, "active": active, "done_today": done_today,
                "earnings_total": earnings_total, "earnings_today": earnings_today,
                "services_count": services_count}


# ---------- mart orders ----------

@router.get("/orders")
async def vendor_orders(status: Optional[str] = None, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    q = {"vendor_id": vendor["id"]}
    if status:
        q["status"] = status
    docs = await db.orders.find(q).sort("created_at", -1).to_list(200)
    return strip_id(docs)


@router.patch("/orders/{order_id}/status")
async def vendor_order_status(order_id: str, body: StatusBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    order = await db.orders.find_one({"id": order_id, "vendor_id": vendor["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    current, target = order["status"], body.status
    if target == "rejected":
        if current != "placed":
            raise HTTPException(status_code=400, detail="Can only reject a new order")
        for item in order["items"]:
            await db.products.update_one({"id": item["product_id"]}, {"$inc": {"stock_qty": item["qty"]}})
    elif not can_advance(ORDER_FLOW, current, target):
        raise HTTPException(status_code=400, detail=f"Cannot move from '{current}' to '{target}'")
    await db.orders.update_one({"id": order_id}, {
        "$set": {"status": target},
        "$push": {"status_history": {"status": target, "at": now_iso(), "by": "vendor"}},
    })
    await db.audit_log.insert_one({"id": new_id(), "action": "order_status", "order_id": order_id,
                                   "from": current, "to": target, "by": user["id"], "at": now_iso()})
    updated = await db.orders.find_one({"id": order_id})
    return strip_id(updated)


# ---------- service jobs ----------

@router.get("/jobs")
async def vendor_jobs(status: Optional[str] = None, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    q = {"vendor_id": vendor["id"]}
    if status:
        q["status"] = status
    docs = await db.bookings.find(q).sort("created_at", -1).to_list(200)
    return strip_id(docs)


@router.patch("/jobs/{booking_id}/status")
async def vendor_job_status(booking_id: str, body: StatusBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    booking = await db.bookings.find_one({"id": booking_id, "vendor_id": vendor["id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Job not found")
    current, target = booking["status"], body.status
    if target == "declined":
        if current != "requested":
            raise HTTPException(status_code=400, detail="Can only decline a new request")
    elif not can_advance(BOOKING_FLOW, current, target):
        raise HTTPException(status_code=400, detail=f"Cannot move from '{current}' to '{target}'")
    await db.bookings.update_one({"id": booking_id}, {
        "$set": {"status": target},
        "$push": {"status_history": {"status": target, "at": now_iso(), "by": "vendor"}},
    })
    await db.audit_log.insert_one({"id": new_id(), "action": "booking_status", "booking_id": booking_id,
                                   "from": current, "to": target, "by": user["id"], "at": now_iso()})
    updated = await db.bookings.find_one({"id": booking_id})
    return strip_id(updated)


# ---------- inventory ----------

@router.get("/products")
async def vendor_products(user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    docs = await db.products.find({"vendor_id": vendor["id"]}).sort("name", 1).to_list(500)
    return strip_id(docs)


@router.post("/products")
async def add_product(body: ProductBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    if vendor["type"] != "mart":
        raise HTTPException(status_code=400, detail="Only mart stores manage products")
    validate_inline_image(body.image)
    product = {"id": new_id(), "vendor_id": vendor["id"], **body.model_dump(), "created_at": now_iso()}
    await db.products.insert_one(dict(product))
    return strip_id(product)


@router.patch("/products/{product_id}")
async def update_product(product_id: str, body: ProductBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    product = await db.products.find_one({"id": product_id, "vendor_id": vendor["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    validate_inline_image(body.image)
    await db.products.update_one({"id": product_id}, {"$set": body.model_dump()})
    updated = await db.products.find_one({"id": product_id})
    return strip_id(updated)


@router.delete("/products/{product_id}")
async def delete_product(product_id: str, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    result = await db.products.delete_one({"id": product_id, "vendor_id": vendor["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------- services ----------

@router.get("/services")
async def vendor_services(user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    docs = await db.services.find({"vendor_id": vendor["id"]}).sort("name", 1).to_list(200)
    return strip_id(docs)


@router.post("/services")
async def add_service(body: ServiceBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    if vendor["type"] != "service":
        raise HTTPException(status_code=400, detail="Only service providers manage services")
    validate_inline_image(body.image)
    svc = {"id": new_id(), "vendor_id": vendor["id"], **body.model_dump(), "created_at": now_iso()}
    await db.services.insert_one(dict(svc))
    return strip_id(svc)


@router.patch("/services/{service_id}")
async def update_service(service_id: str, body: ServiceBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    svc = await db.services.find_one({"id": service_id, "vendor_id": vendor["id"]})
    if not svc:
        raise HTTPException(status_code=404, detail="Service not found")
    validate_inline_image(body.image)
    await db.services.update_one({"id": service_id}, {"$set": body.model_dump()})
    updated = await db.services.find_one({"id": service_id})
    return strip_id(updated)


@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    result = await db.services.delete_one({"id": service_id, "vendor_id": vendor["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"ok": True}


# ---------- availability + earnings ----------

@router.patch("/availability")
async def set_availability(body: AvailabilityBody, user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    await db.vendors.update_one({"id": vendor["id"]}, {"$set": {"availability": body.availability}})
    updated = await db.vendors.find_one({"id": vendor["id"]})
    return strip_id(updated)


@router.get("/earnings")
async def earnings(user: dict = Depends(require_vendor)):
    vendor = await get_vendor_profile(user)
    vid = vendor["id"]
    today = now_iso()[:10]
    if vendor["type"] == "mart":
        done = await db.orders.find({"vendor_id": vid, "status": "delivered"}).sort("created_at", -1).to_list(2000)
        entries = [{"ref": o["order_no"], "label": f"{len(o['items'])} items", "amount": o["total"],
                    "date": o["created_at"], "id": o["id"], "kind": "order"} for o in done]
    else:
        done = await db.bookings.find({"vendor_id": vid, "status": "completed"}).sort("created_at", -1).to_list(2000)
        entries = [{"ref": b["booking_no"], "label": b["service_name"], "amount": b["price"],
                    "date": b["created_at"], "id": b["id"], "kind": "booking"} for b in done]
    total = round(sum(e["amount"] for e in entries), 2)
    today_amt = round(sum(e["amount"] for e in entries if e["date"][:10] == today), 2)
    return {"total": total, "today": today_amt, "count": len(entries), "entries": entries[:100]}

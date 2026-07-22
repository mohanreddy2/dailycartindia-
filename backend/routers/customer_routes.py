"""Customer: checkout, orders, bookings, reviews, disputes."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import (db, new_id, now_iso, gen_no, strip_id, get_current_user,
                  ORDER_TERMINAL, BOOKING_TERMINAL)

router = APIRouter(tags=["customer"])


class CartItem(BaseModel):
    product_id: str
    qty: int = Field(..., ge=1, le=50)


class Address(BaseModel):
    label: str = "Home"
    line: str
    city: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class CheckoutRequest(BaseModel):
    items: List[CartItem]
    address: Address
    payment_method: str = "cod"
    idempotency_key: Optional[str] = None


class BookingRequest(BaseModel):
    service_id: str
    slot_date: str
    slot_time: str
    address: Address
    notes: Optional[str] = None


class ReviewRequest(BaseModel):
    order_id: Optional[str] = None
    booking_id: Optional[str] = None
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None


class DisputeRequest(BaseModel):
    order_id: Optional[str] = None
    booking_id: Optional[str] = None
    subject: str
    description: Optional[str] = None


async def _load_checkout_groups(items: List[CartItem]):
    if not items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    product_ids = [i.product_id for i in items]
    products = await db.products.find({"id": {"$in": product_ids}}).to_list(len(product_ids))
    pmap = {p["id"]: p for p in products}
    missing = [pid for pid in product_ids if pid not in pmap]
    if missing:
        raise HTTPException(status_code=400, detail="Some items are no longer available")

    groups = {}
    for item in items:
        p = pmap[item.product_id]
        if p.get("stock_qty", 0) < item.qty:
            raise HTTPException(status_code=400, detail=f"'{p['name']}' has only {p.get('stock_qty', 0)} in stock")
        groups.setdefault(p["vendor_id"], []).append((p, item.qty))

    vendor_ids = list(groups.keys())
    vendors = await db.vendors.find({"id": {"$in": vendor_ids}}).to_list(len(vendor_ids))
    vmap = {v["id"]: v for v in vendors}
    for vid in vendor_ids:
        v = vmap.get(vid)
        if not v or v.get("kyc_status") != "approved" or not v.get("is_active"):
            raise HTTPException(status_code=400, detail="One of the stores is currently unavailable")
    return groups, vmap


async def quote_checkout_amount(items: List[CartItem]):
    groups, vmap = await _load_checkout_groups(items)
    total = 0.0
    item_count = 0
    for vid, entries in groups.items():
        subtotal = round(sum(p["price"] * qty for p, qty in entries), 2)
        delivery_fee = float(vmap[vid].get("delivery_fee", 25))
        total += subtotal + delivery_fee
        item_count += sum(qty for _, qty in entries)
    return round(total, 2), {"item_count": item_count, "store_count": len(groups)}


async def create_checkout_orders(
    user: dict,
    items: List[CartItem],
    address: Address,
    payment_method: str = "cod",
    idempotency_key: Optional[str] = None,
    payment_meta: Optional[dict] = None,
):
    if idempotency_key:
        existing = await db.orders.find({
            "customer_id": user["id"], "idempotency_key": idempotency_key
        }).to_list(20)
        if existing:
            return {"orders": strip_id(existing), "idempotent_replay": True}

    groups, vmap = await _load_checkout_groups(items)
    group_id = new_id()
    created = []
    payment_meta = payment_meta or {}
    for vid, entries in groups.items():
        v = vmap[vid]
        order_items = [{
            "product_id": p["id"], "name": p["name"], "price": p["price"],
            "qty": qty, "unit": p.get("unit"), "image": p.get("image"),
        } for p, qty in entries]
        subtotal = round(sum(i["price"] * i["qty"] for i in order_items), 2)
        delivery_fee = float(v.get("delivery_fee", 25))
        order = {
            "id": new_id(),
            "order_no": gen_no("DC"),
            "checkout_group_id": group_id,
            "idempotency_key": idempotency_key,
            "customer_id": user["id"],
            "customer_name": user["name"],
            "customer_phone": user.get("phone"),
            "vendor_id": vid,
            "store_name": v["name"],
            "items": order_items,
            "subtotal": subtotal,
            "delivery_fee": delivery_fee,
            "total": round(subtotal + delivery_fee, 2),
            "payment_method": payment_method,
            "payment_status": payment_meta.get("payment_status", "pending" if payment_method == "cod" else "paid"),
            "address": address.model_dump(),
            "status": "placed",
            "status_history": [{"status": "placed", "at": now_iso(), "by": "customer"}],
            "created_at": now_iso(),
        }
        for key in ("razorpay_order_id", "razorpay_payment_id", "razorpay_signature", "paid_at"):
            if payment_meta.get(key):
                order[key] = payment_meta[key]
        await db.orders.insert_one(dict(order))
        for p, qty in entries:
            await db.products.update_one({"id": p["id"]}, {"$inc": {"stock_qty": -qty}})
        created.append(order)
    return {"orders": strip_id(created), "checkout_group_id": group_id}


async def quote_booking_amount(service_id: str):
    svc = await db.services.find_one({"id": service_id})
    if not svc or not svc.get("is_available", True):
        raise HTTPException(status_code=404, detail="Service not available")
    vendor = await db.vendors.find_one({"id": svc["vendor_id"]})
    if not vendor or vendor.get("kyc_status") != "approved" or not vendor.get("is_active"):
        raise HTTPException(status_code=400, detail="This provider is currently unavailable")
    return float(svc["base_price"]), {"service_name": svc["name"], "vendor_id": vendor["id"]}


async def create_booking_record(user: dict, body: BookingRequest, payment_meta: Optional[dict] = None):
    svc = await db.services.find_one({"id": body.service_id})
    if not svc or not svc.get("is_available", True):
        raise HTTPException(status_code=404, detail="Service not available")
    vendor = await db.vendors.find_one({"id": svc["vendor_id"]})
    if not vendor or vendor.get("kyc_status") != "approved" or not vendor.get("is_active"):
        raise HTTPException(status_code=400, detail="This provider is currently unavailable")
    clash = await db.bookings.find_one({
        "vendor_id": vendor["id"], "slot_date": body.slot_date, "slot_time": body.slot_time,
        "status": {"$nin": ["cancelled", "declined", "completed"]},
    })
    if clash:
        raise HTTPException(status_code=409, detail="This slot was just booked. Pick another time.")
    payment_meta = payment_meta or {}
    payment_method = payment_meta.get("payment_method", "cod")
    booking = {
        "id": new_id(),
        "booking_no": gen_no("DS"),
        "customer_id": user["id"],
        "customer_name": user["name"],
        "customer_phone": user.get("phone"),
        "vendor_id": vendor["id"],
        "vendor_name": vendor["name"],
        "service_id": svc["id"],
        "service_name": svc["name"],
        "price": svc["base_price"],
        "duration_minutes": svc.get("duration_minutes"),
        "slot_date": body.slot_date,
        "slot_time": body.slot_time,
        "address": body.address.model_dump(),
        "notes": body.notes,
        "payment_method": payment_method,
        "payment_status": payment_meta.get("payment_status", "pending" if payment_method == "cod" else "paid"),
        "status": "requested",
        "status_history": [{"status": "requested", "at": now_iso(), "by": "customer"}],
        "created_at": now_iso(),
    }
    for key in ("razorpay_order_id", "razorpay_payment_id", "razorpay_signature", "paid_at"):
        if payment_meta.get(key):
            booking[key] = payment_meta[key]
    await db.bookings.insert_one(dict(booking))
    return strip_id(booking)


@router.post("/orders/checkout")
async def checkout(body: CheckoutRequest, user: dict = Depends(get_current_user)):
    method = (body.payment_method or "cod").lower()
    if method != "cod":
        raise HTTPException(
            status_code=400,
            detail="Online payments must use /payments/razorpay/create then /payments/razorpay/confirm",
        )
    return await create_checkout_orders(
        user=user,
        items=body.items,
        address=body.address,
        payment_method="cod",
        idempotency_key=body.idempotency_key,
        payment_meta={"payment_status": "pending"},
    )


@router.get("/orders/mine")
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await db.orders.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(100)
    return strip_id(docs)


@router.get("/orders/{order_id}")
async def order_detail(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    is_admin = "admin" in user.get("capabilities", [])
    if order["customer_id"] != user["id"] and not is_admin:
        vendor = await db.vendors.find_one({"user_id": user["id"]})
        if not vendor or vendor["id"] != order["vendor_id"]:
            raise HTTPException(status_code=403, detail="Not your order")
    review = await db.reviews.find_one({"order_id": order_id})
    dispute = await db.disputes.find_one({"order_id": order_id})
    out = strip_id(order)
    out["review"] = strip_id(review)
    out["dispute"] = strip_id(dispute)
    return out


@router.post("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id, "customer_id": user["id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["status"] != "placed":
        raise HTTPException(status_code=400, detail="Order can only be cancelled before the store accepts it")
    await db.orders.update_one({"id": order_id}, {
        "$set": {"status": "cancelled"},
        "$push": {"status_history": {"status": "cancelled", "at": now_iso(), "by": "customer"}},
    })
    # restore stock
    for item in order["items"]:
        await db.products.update_one({"id": item["product_id"]}, {"$inc": {"stock_qty": item["qty"]}})
    return {"ok": True, "status": "cancelled"}


@router.post("/bookings")
async def create_booking(body: BookingRequest, user: dict = Depends(get_current_user)):
    return await create_booking_record(
        user=user,
        body=body,
        payment_meta={"payment_method": "cod", "payment_status": "pending"},
    )


@router.get("/bookings/mine")
async def my_bookings(user: dict = Depends(get_current_user)):
    docs = await db.bookings.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(100)
    return strip_id(docs)


@router.get("/bookings/{booking_id}")
async def booking_detail(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    is_admin = "admin" in user.get("capabilities", [])
    if booking["customer_id"] != user["id"] and not is_admin:
        vendor = await db.vendors.find_one({"user_id": user["id"]})
        if not vendor or vendor["id"] != booking["vendor_id"]:
            raise HTTPException(status_code=403, detail="Not your booking")
    review = await db.reviews.find_one({"booking_id": booking_id})
    dispute = await db.disputes.find_one({"booking_id": booking_id})
    out = strip_id(booking)
    out["review"] = strip_id(review)
    out["dispute"] = strip_id(dispute)
    return out


@router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    booking = await db.bookings.find_one({"id": booking_id, "customer_id": user["id"]})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["status"] not in ("requested", "accepted"):
        raise HTTPException(status_code=400, detail="Booking can no longer be cancelled")
    await db.bookings.update_one({"id": booking_id}, {
        "$set": {"status": "cancelled"},
        "$push": {"status_history": {"status": "cancelled", "at": now_iso(), "by": "customer"}},
    })
    return {"ok": True, "status": "cancelled"}


@router.post("/reviews")
async def create_review(body: ReviewRequest, user: dict = Depends(get_current_user)):
    if not body.order_id and not body.booking_id:
        raise HTTPException(status_code=400, detail="order_id or booking_id required")
    vendor_id = None
    if body.order_id:
        order = await db.orders.find_one({"id": body.order_id, "customer_id": user["id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["status"] != "delivered":
            raise HTTPException(status_code=400, detail="You can review only after delivery")
        dup = await db.reviews.find_one({"order_id": body.order_id})
        if dup:
            raise HTTPException(status_code=409, detail="You already reviewed this order")
        vendor_id = order["vendor_id"]
    else:
        booking = await db.bookings.find_one({"id": body.booking_id, "customer_id": user["id"]})
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["status"] != "completed":
            raise HTTPException(status_code=400, detail="You can review only after the job is completed")
        dup = await db.reviews.find_one({"booking_id": body.booking_id})
        if dup:
            raise HTTPException(status_code=409, detail="You already reviewed this booking")
        vendor_id = booking["vendor_id"]

    review = {
        "id": new_id(),
        "customer_id": user["id"],
        "customer_name": user["name"],
        "vendor_id": vendor_id,
        "order_id": body.order_id,
        "booking_id": body.booking_id,
        "rating": body.rating,
        "comment": body.comment,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(dict(review))
    # recompute vendor rating
    all_reviews = await db.reviews.find({"vendor_id": vendor_id}).to_list(1000)
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews), 2)
    await db.vendors.update_one({"id": vendor_id}, {"$set": {"rating": avg, "review_count": len(all_reviews)}})
    return strip_id(review)


@router.post("/disputes")
async def create_dispute(body: DisputeRequest, user: dict = Depends(get_current_user)):
    if not body.order_id and not body.booking_id:
        raise HTTPException(status_code=400, detail="order_id or booking_id required")
    ref = None
    if body.order_id:
        ref = await db.orders.find_one({"id": body.order_id, "customer_id": user["id"]})
    else:
        ref = await db.bookings.find_one({"id": body.booking_id, "customer_id": user["id"]})
    if not ref:
        raise HTTPException(status_code=404, detail="Order/booking not found")
    existing = await db.disputes.find_one({
        "$or": [{"order_id": body.order_id or "__none"}, {"booking_id": body.booking_id or "__none"}],
        "status": "open",
    })
    if existing:
        raise HTTPException(status_code=409, detail="A dispute is already open for this")
    dispute = {
        "id": new_id(),
        "customer_id": user["id"],
        "customer_name": user["name"],
        "order_id": body.order_id,
        "booking_id": body.booking_id,
        "ref_no": ref.get("order_no") or ref.get("booking_no"),
        "vendor_id": ref.get("vendor_id"),
        "vendor_name": ref.get("store_name") or ref.get("vendor_name"),
        "subject": body.subject,
        "description": body.description,
        "status": "open",
        "resolution": None,
        "created_at": now_iso(),
        "resolved_at": None,
    }
    await db.disputes.insert_one(dict(dispute))
    return strip_id(dispute)


@router.get("/disputes/mine")
async def my_disputes(user: dict = Depends(get_current_user)):
    docs = await db.disputes.find({"customer_id": user["id"]}).sort("created_at", -1).to_list(50)
    return strip_id(docs)

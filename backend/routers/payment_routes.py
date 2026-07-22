"""Online payments via Razorpay (UPI / cards / netbanking)."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from core import db, new_id, now_iso, get_current_user
from payments import (
    RAZORPAY_KEY_ID,
    create_razorpay_order,
    razorpay_enabled,
    require_razorpay,
    verify_payment_signature,
)
from routers.customer_routes import (
    Address,
    BookingRequest,
    CartItem,
    create_booking_record,
    create_checkout_orders,
    quote_booking_amount,
    quote_checkout_amount,
)

router = APIRouter(prefix="/payments", tags=["payments"])


class CheckoutIntentBody(BaseModel):
    items: List[CartItem]
    address: Address
    idempotency_key: Optional[str] = None


class BookingIntentBody(BaseModel):
    service_id: str
    slot_date: str
    slot_time: str
    address: Address
    notes: Optional[str] = None


class CreatePaymentBody(BaseModel):
    purpose: str = Field(..., pattern="^(checkout|booking)$")
    checkout: Optional[CheckoutIntentBody] = None
    booking: Optional[BookingIntentBody] = None


class ConfirmPaymentBody(BaseModel):
    intent_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


@router.get("/methods")
async def payment_methods():
    return {
        "cod": True,
        "razorpay": razorpay_enabled(),
        "razorpay_key_id": RAZORPAY_KEY_ID if razorpay_enabled() else None,
    }


@router.post("/razorpay/create")
async def create_payment(body: CreatePaymentBody, user: dict = Depends(get_current_user)):
    require_razorpay()
    if body.purpose == "checkout":
        if not body.checkout:
            raise HTTPException(status_code=400, detail="checkout payload required")
        amount_rupees, meta = await quote_checkout_amount(body.checkout.items)
        payload = body.checkout.model_dump()
        description = f"DailyCart order · {meta.get('item_count', 0)} items"
    else:
        if not body.booking:
            raise HTTPException(status_code=400, detail="booking payload required")
        amount_rupees, meta = await quote_booking_amount(body.booking.service_id)
        payload = body.booking.model_dump()
        description = f"DailyCart booking · {meta.get('service_name', 'service')}"

    amount_paise = int(round(amount_rupees * 100))
    intent_id = new_id()
    rzp_order = create_razorpay_order(
        amount_paise=amount_paise,
        receipt=intent_id.replace("-", "")[:40],
        notes={"intent_id": intent_id, "purpose": body.purpose, "user_id": user["id"]},
    )
    intent = {
        "id": intent_id,
        "user_id": user["id"],
        "purpose": body.purpose,
        "payload": payload,
        "amount": amount_rupees,
        "amount_paise": amount_paise,
        "currency": "INR",
        "razorpay_order_id": rzp_order["id"],
        "status": "created",
        "created_at": now_iso(),
    }
    await db.payment_intents.insert_one(dict(intent))
    return {
        "intent_id": intent_id,
        "key_id": RAZORPAY_KEY_ID,
        "order_id": rzp_order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "name": "DailyCart",
        "description": description,
        "prefill": {
            "name": user.get("name") or "",
            "email": user.get("email") or "",
            "contact": user.get("phone") or "",
        },
    }


@router.post("/razorpay/confirm")
async def confirm_payment(body: ConfirmPaymentBody, user: dict = Depends(get_current_user)):
    require_razorpay()
    intent = await db.payment_intents.find_one({"id": body.intent_id, "user_id": user["id"]})
    if not intent:
        raise HTTPException(status_code=404, detail="Payment session not found")
    if intent.get("status") == "paid" and intent.get("result"):
        return intent["result"]
    if intent.get("razorpay_order_id") != body.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment order mismatch")
    if not verify_payment_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    payment_meta = {
        "payment_method": "razorpay",
        "payment_status": "paid",
        "razorpay_order_id": body.razorpay_order_id,
        "razorpay_payment_id": body.razorpay_payment_id,
        "razorpay_signature": body.razorpay_signature,
        "paid_at": now_iso(),
    }

    if intent["purpose"] == "checkout":
        checkout = CheckoutIntentBody(**intent["payload"])
        result = await create_checkout_orders(
            user=user,
            items=checkout.items,
            address=checkout.address,
            payment_method="razorpay",
            idempotency_key=checkout.idempotency_key,
            payment_meta=payment_meta,
        )
    else:
        booking_req = BookingRequest(**intent["payload"])
        booking = await create_booking_record(user=user, body=booking_req, payment_meta=payment_meta)
        result = {"booking": booking}

    await db.payment_intents.update_one(
        {"id": intent["id"]},
        {"$set": {
            "status": "paid",
            "razorpay_payment_id": body.razorpay_payment_id,
            "result": result,
            "paid_at": now_iso(),
        }},
    )
    return result

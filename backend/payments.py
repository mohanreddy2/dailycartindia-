"""Razorpay helpers for DailyCart online payments."""
import hashlib
import hmac
import os
from typing import Optional

from fastapi import HTTPException

RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "").strip()
RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "").strip()


def razorpay_enabled() -> bool:
    return bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)


def require_razorpay():
    if not razorpay_enabled():
        raise HTTPException(
            status_code=503,
            detail="Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        )


def create_razorpay_order(amount_paise: int, receipt: str, notes: Optional[dict] = None) -> dict:
    require_razorpay()
    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Minimum payable amount is ₹1")
    try:
        import razorpay
    except ImportError as exc:
        raise HTTPException(status_code=500, detail="razorpay package is not installed") from exc

    client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt[:40],
        "payment_capture": 1,
        "notes": notes or {},
    })
    return order


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    require_razorpay()
    payload = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(RAZORPAY_KEY_SECRET.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)

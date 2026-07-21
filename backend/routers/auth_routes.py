"""Auth: email/password + dev-mode phone OTP."""
import random
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from core import (db, new_id, now_iso, hash_password, verify_password,
                  create_token, get_current_user, strip_id)

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class OtpSendRequest(BaseModel):
    phone: str = Field(..., min_length=10, max_length=15)


class OtpVerifyRequest(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None


def auth_response(user: dict) -> dict:
    return {
        "access_token": create_token(user["id"], user.get("capabilities", [])),
        "token_type": "bearer",
        "user": public_user(user),
    }


def public_user(user: dict) -> dict:
    u = strip_id(user)
    u.pop("password_hash", None)
    return u


@router.post("/register")
async def register(body: RegisterRequest):
    email = body.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if body.phone:
        phone_existing = await db.users.find_one({"phone": body.phone.strip()})
        if phone_existing:
            raise HTTPException(status_code=409, detail="An account with this phone already exists")
    user = {
        "id": new_id(),
        "name": body.name.strip(),
        "email": email,
        "phone": body.phone.strip() if body.phone else None,
        "password_hash": hash_password(body.password),
        "capabilities": ["customer"],
        "is_active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    return auth_response(user)


@router.post("/login")
async def login(body: LoginRequest):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("is_active", True) is False:
        raise HTTPException(status_code=403, detail="This account has been removed")
    return auth_response(strip_id(user))


@router.post("/otp/send")
async def otp_send(body: OtpSendRequest):
    phone = body.phone.strip().replace(" ", "")
    if not phone.replace("+", "").isdigit() or len(phone.replace("+", "")) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid phone number")
    otp = "".join(random.choices("0123456789", k=6))
    await db.otps.update_one(
        {"phone": phone},
        {"$set": {"phone": phone, "otp": otp,
                  "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()}},
        upsert=True,
    )
    # DEV MODE: OTP returned in response (no SMS provider wired yet)
    return {"sent": True, "dev_mode": True, "dev_otp": otp,
            "message": "Dev mode: use the code shown below (SMS delivery not enabled yet)"}


@router.post("/otp/verify")
async def otp_verify(body: OtpVerifyRequest):
    phone = body.phone.strip().replace(" ", "")
    rec = await db.otps.find_one({"phone": phone})
    if not rec or rec["otp"] != body.otp.strip():
        raise HTTPException(status_code=401, detail="Invalid OTP")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="OTP expired, request a new one")
    await db.otps.delete_one({"phone": phone})
    user = await db.users.find_one({"phone": phone})
    if not user:
        user = {
            "id": new_id(),
            "name": body.name or f"User {phone[-4:]}",
            "email": None,
            "phone": phone,
            "password_hash": None,
            "capabilities": ["customer"],
            "is_active": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one(dict(user))
    return auth_response(strip_id(user))


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    vendor = await db.vendors.find_one({"user_id": user["id"]})
    return {"user": public_user(user), "vendor": strip_id(vendor)}

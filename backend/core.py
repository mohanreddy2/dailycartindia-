"""DailyCart core: db, auth, helpers."""
import os
import uuid
import random
import string
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "dailycart-dev-secret-change-me")
JWT_ALGO = "HS256"
JWT_EXPIRE_DAYS = 30

# ---------- helpers ----------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def gen_no(prefix: str) -> str:
    return prefix + "".join(random.choices(string.digits, k=6))


def strip_id(doc):
    """Remove Mongo _id and return JSON-safe doc."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [strip_id(d) for d in doc]
    if isinstance(doc, dict):
        out = {}
        for k, v in doc.items():
            if k == "_id":
                continue
            if isinstance(v, datetime):
                out[k] = v.isoformat()
            elif isinstance(v, (dict, list)):
                out[k] = strip_id(v)
            else:
                out[k] = v
        return out
    return doc


# ---------- password ----------

def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


# ---------- jwt ----------

def create_token(user_id: str, capabilities: list) -> str:
    payload = {
        "sub": user_id,
        "cap": capabilities,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if user.get("is_active", True) is False:
        raise HTTPException(status_code=403, detail="This account has been removed")
    return strip_id(user)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if "admin" not in user.get("capabilities", []):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_vendor(user: dict = Depends(get_current_user)) -> dict:
    caps = user.get("capabilities", [])
    if not any(c in caps for c in ("mart_vendor", "service_vendor", "vendor")):
        raise HTTPException(status_code=403, detail="Vendor access required")
    return user


async def get_vendor_profile(user: dict) -> dict:
    vendor = await db.vendors.find_one({"user_id": user["id"]})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor profile not found. Complete onboarding first.")
    return strip_id(vendor)


# ---------- status machines ----------

ORDER_FLOW = ["placed", "accepted", "picking", "ready", "out_for_delivery", "delivered"]
ORDER_TERMINAL = {"delivered", "cancelled", "rejected"}
BOOKING_FLOW = ["requested", "accepted", "en_route", "in_progress", "completed"]
BOOKING_TERMINAL = {"completed", "cancelled", "declined"}


def can_advance(flow: list, current: str, target: str) -> bool:
    if current not in flow or target not in flow:
        return False
    return flow.index(target) == flow.index(current) + 1

"""Admin Ops: oversight, KYC, vendors, users, disputes."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

from core import db, hash_password, new_id, now_iso, strip_id, require_admin

router = APIRouter(prefix="/admin", tags=["admin"])


class KycDecision(BaseModel):
    decision: str  # approved | rejected
    note: Optional[str] = None


class ActiveBody(BaseModel):
    is_active: bool


class ResolveBody(BaseModel):
    resolution: str


class AdminUserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: Optional[str] = None


class AdminUserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=80)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None


class AdminVendorCreate(BaseModel):
    user_id: str
    type: str = Field(..., pattern="^(mart|service)$")
    name: str = Field(..., min_length=2)
    description: Optional[str] = None
    category_slugs: List[str] = []
    address: str = Field(..., min_length=3)
    city: str = Field(..., min_length=2)
    lat: float
    lng: float
    min_order: float = Field(0, ge=0)
    delivery_fee: float = Field(25, ge=0)
    kyc_id_type: str = "aadhaar"
    kyc_id_number: str = Field(..., min_length=4)


class AdminVendorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2)
    description: Optional[str] = None
    category_slugs: Optional[List[str]] = None
    address: Optional[str] = Field(None, min_length=3)
    city: Optional[str] = Field(None, min_length=2)
    lat: Optional[float] = None
    lng: Optional[float] = None
    min_order: Optional[float] = Field(None, ge=0)
    delivery_fee: Optional[float] = Field(None, ge=0)
    is_open: Optional[bool] = None


def public_user(user: dict) -> dict:
    user = strip_id(user)
    user.pop("password_hash", None)
    return user


@router.get("/oversight")
async def oversight(admin: dict = Depends(require_admin)):
    users_count = await db.users.count_documents({})
    vendors_total = await db.vendors.count_documents({})
    kyc_pending = await db.vendors.count_documents({"kyc_status": "pending"})
    vendors_live = await db.vendors.count_documents({"kyc_status": "approved", "is_active": True})
    orders_total = await db.orders.count_documents({})
    orders_active = await db.orders.count_documents({"status": {"$in": ["placed", "accepted", "picking", "ready", "out_for_delivery"]}})
    bookings_total = await db.bookings.count_documents({})
    bookings_active = await db.bookings.count_documents({"status": {"$in": ["requested", "accepted", "en_route", "in_progress"]}})
    disputes_open = await db.disputes.count_documents({"status": "open"})
    delivered = await db.orders.find({"status": "delivered"}).to_list(5000)
    completed = await db.bookings.find({"status": "completed"}).to_list(5000)
    gmv = round(sum(o["total"] for o in delivered) + sum(b["price"] for b in completed), 2)
    recent_orders = await db.orders.find().sort("created_at", -1).limit(8).to_list(8)
    recent_bookings = await db.bookings.find().sort("created_at", -1).limit(8).to_list(8)
    return {
        "users": users_count, "vendors_total": vendors_total, "kyc_pending": kyc_pending,
        "vendors_live": vendors_live, "orders_total": orders_total, "orders_active": orders_active,
        "bookings_total": bookings_total, "bookings_active": bookings_active,
        "disputes_open": disputes_open, "gmv": gmv,
        "recent_orders": strip_id(recent_orders), "recent_bookings": strip_id(recent_bookings),
    }


@router.get("/kyc")
async def kyc_queue(status: str = "pending", admin: dict = Depends(require_admin)):
    docs = await db.vendors.find({"kyc_status": status}).sort("created_at", -1).to_list(200)
    result = []
    for vendor in strip_id(docs):
        # Enrich with owner contact info
        owner = await db.users.find_one({"id": vendor.get("user_id")})
        if owner:
            vendor["owner_name"] = owner.get("name")
            vendor["owner_email"] = owner.get("email")
            vendor["owner_phone"] = owner.get("phone")
        result.append(vendor)
    return result


@router.patch("/kyc/{vendor_id}")
async def kyc_decide(vendor_id: str, body: KycDecision, admin: dict = Depends(require_admin)):
    if body.decision not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="decision must be approved or rejected")
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.vendors.update_one({"id": vendor_id}, {"$set": {
        "kyc_status": body.decision,
        "kyc.decided_at": now_iso(),
        "kyc.decision_note": body.note,
    }})
    await db.audit_log.insert_one({"id": new_id(), "action": f"kyc_{body.decision}", "vendor_id": vendor_id,
                                   "by": admin["id"], "note": body.note, "at": now_iso()})
    updated = await db.vendors.find_one({"id": vendor_id})
    return strip_id(updated)


@router.get("/vendors")
async def all_vendors(type: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"type": type} if type else {}
    docs = await db.vendors.find(q).sort("created_at", -1).to_list(500)
    return strip_id(docs)


@router.get("/vendors/{vendor_id}")
async def vendor_detail(vendor_id: str, admin: dict = Depends(require_admin)):
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    result = strip_id(vendor)
    owner = await db.users.find_one({"id": vendor["user_id"]})
    result["owner"] = public_user(owner) if owner else None
    result["products"] = strip_id(await db.products.find({"vendor_id": vendor_id}).sort("name", 1).to_list(500))
    result["services"] = strip_id(await db.services.find({"vendor_id": vendor_id}).sort("name", 1).to_list(200))
    return result


@router.post("/vendors")
async def create_vendor(body: AdminVendorCreate, admin: dict = Depends(require_admin)):
    owner = await db.users.find_one({"id": body.user_id, "is_active": {"$ne": False}})
    if not owner:
        raise HTTPException(status_code=400, detail="Select an active user as the vendor owner")
    if await db.vendors.find_one({"user_id": body.user_id}):
        raise HTTPException(status_code=409, detail="This user already has a vendor profile")
    vendor = {
        "id": new_id(), "user_id": body.user_id, "type": body.type, "name": body.name.strip(),
        "description": body.description, "category_slugs": body.category_slugs,
        "address": body.address, "city": body.city,
        "location": {"type": "Point", "coordinates": [body.lng, body.lat]},
        "rating": 0, "review_count": 0, "min_order": body.min_order, "delivery_fee": body.delivery_fee,
        "kyc_status": "pending",
        "kyc": {"id_type": body.kyc_id_type, "id_number": body.kyc_id_number, "submitted_at": now_iso()},
        "is_active": True, "is_open": True, "availability": None, "created_at": now_iso(),
    }
    await db.vendors.insert_one(dict(vendor))
    await db.users.update_one({"id": body.user_id}, {"$addToSet": {"capabilities": f"{body.type}_vendor"}})
    await db.audit_log.insert_one({"id": new_id(), "action": "admin_vendor_created", "vendor_id": vendor["id"],
                                   "by": admin["id"], "at": now_iso()})
    return strip_id(vendor)


@router.patch("/vendors/{vendor_id}")
async def update_vendor(vendor_id: str, body: AdminVendorUpdate, admin: dict = Depends(require_admin)):
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    updates = {k: v for k, v in body.model_dump().items() if v is not None and k not in ("lat", "lng")}
    if body.lat is not None or body.lng is not None:
        current = vendor.get("location", {}).get("coordinates", [0, 0])
        updates["location"] = {"type": "Point", "coordinates": [
            body.lng if body.lng is not None else current[0],
            body.lat if body.lat is not None else current[1],
        ]}
    if updates:
        await db.vendors.update_one({"id": vendor_id}, {"$set": updates})
        await db.audit_log.insert_one({"id": new_id(), "action": "vendor_updated", "vendor_id": vendor_id,
                                       "by": admin["id"], "at": now_iso()})
    return strip_id(await db.vendors.find_one({"id": vendor_id}))


@router.patch("/vendors/{vendor_id}/active")
async def toggle_vendor(vendor_id: str, body: ActiveBody, admin: dict = Depends(require_admin)):
    vendor = await db.vendors.find_one({"id": vendor_id})
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    await db.vendors.update_one({"id": vendor_id}, {"$set": {"is_active": body.is_active}})
    await db.audit_log.insert_one({"id": new_id(), "action": "vendor_active" if body.is_active else "vendor_deactivated",
                                   "vendor_id": vendor_id, "by": admin["id"], "at": now_iso()})
    updated = await db.vendors.find_one({"id": vendor_id})
    return strip_id(updated)


@router.get("/users")
async def all_users(admin: dict = Depends(require_admin)):
    docs = await db.users.find().sort("created_at", -1).to_list(500)
    return [public_user(u) for u in docs]


@router.get("/users/{user_id}")
async def user_detail(user_id: str, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    result = public_user(user)
    result["vendor"] = strip_id(await db.vendors.find_one({"user_id": user_id}))
    result["orders"] = strip_id(await db.orders.find({"customer_id": user_id}).sort("created_at", -1).to_list(100))
    result["bookings"] = strip_id(await db.bookings.find({"customer_id": user_id}).sort("created_at", -1).to_list(100))
    return result


@router.post("/users")
async def create_user(body: AdminUserCreate, admin: dict = Depends(require_admin)):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    if body.phone and await db.users.find_one({"phone": body.phone.strip()}):
        raise HTTPException(status_code=409, detail="An account with this phone already exists")
    user = {
        "id": new_id(), "name": body.name.strip(), "email": email,
        "phone": body.phone.strip() if body.phone else None, "password_hash": hash_password(body.password),
        "capabilities": ["customer"], "is_active": True, "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    await db.audit_log.insert_one({"id": new_id(), "action": "admin_user_created", "user_id": user["id"],
                                   "by": admin["id"], "at": now_iso()})
    return public_user(user)


@router.patch("/users/{user_id}")
async def update_user(user_id: str, body: AdminUserUpdate, admin: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    updates = {k: v.strip() if isinstance(v, str) else v for k, v in body.model_dump().items() if v is not None}
    if "email" in updates:
        updates["email"] = updates["email"].lower()
        duplicate = await db.users.find_one({"email": updates["email"], "id": {"$ne": user_id}})
        if duplicate:
            raise HTTPException(status_code=409, detail="An account with this email already exists")
    if "phone" in updates:
        duplicate = await db.users.find_one({"phone": updates["phone"], "id": {"$ne": user_id}})
        if duplicate:
            raise HTTPException(status_code=409, detail="An account with this phone already exists")
    if updates:
        await db.users.update_one({"id": user_id}, {"$set": updates})
        await db.audit_log.insert_one({"id": new_id(), "action": "user_updated", "user_id": user_id,
                                       "by": admin["id"], "at": now_iso()})
    return public_user(await db.users.find_one({"id": user_id}))


@router.delete("/users/{user_id}")
async def remove_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin account")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": False, "removed_at": now_iso()}})
    await db.vendors.update_many({"user_id": user_id}, {"$set": {"is_active": False, "removed_at": now_iso()}})
    await db.audit_log.insert_one({"id": new_id(), "action": "user_removed", "user_id": user_id,
                                   "by": admin["id"], "at": now_iso()})
    return {"ok": True}


@router.get("/orders")
async def all_orders(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    docs = await db.orders.find(q).sort("created_at", -1).to_list(300)
    return strip_id(docs)


@router.get("/bookings")
async def all_bookings(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    docs = await db.bookings.find(q).sort("created_at", -1).to_list(300)
    return strip_id(docs)


@router.get("/disputes")
async def all_disputes(status: Optional[str] = None, admin: dict = Depends(require_admin)):
    q = {"status": status} if status else {}
    docs = await db.disputes.find(q).sort("created_at", -1).to_list(200)
    return strip_id(docs)


@router.patch("/disputes/{dispute_id}/resolve")
async def resolve_dispute(dispute_id: str, body: ResolveBody, admin: dict = Depends(require_admin)):
    dispute = await db.disputes.find_one({"id": dispute_id})
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute["status"] != "open":
        raise HTTPException(status_code=400, detail="Dispute already resolved")
    await db.disputes.update_one({"id": dispute_id}, {"$set": {
        "status": "resolved", "resolution": body.resolution, "resolved_at": now_iso(),
    }})
    await db.audit_log.insert_one({"id": new_id(), "action": "dispute_resolved", "dispute_id": dispute_id,
                                   "by": admin["id"], "at": now_iso()})
    updated = await db.disputes.find_one({"id": dispute_id})
    return strip_id(updated)


@router.get("/audit")
async def audit_log(admin: dict = Depends(require_admin)):
    docs = await db.audit_log.find().sort("at", -1).limit(100).to_list(100)
    return strip_id(docs)

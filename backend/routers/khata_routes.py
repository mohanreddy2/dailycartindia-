"""Private thanks2all ledger vault. PIN-gated, encrypted blob, not shop data."""
from __future__ import annotations
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from core import db, hash_password, now_iso, verify_password

router = APIRouter(prefix="/khata", tags=["khata"])

DOC_ID = "thanks2all"
MAX_FAILS = 8
LOCK_MINUTES = 15
_ip_fails: dict[str, tuple[int, datetime | None]] = {}


class PinBody(BaseModel):
    pin: str = Field(..., min_length=4, max_length=64)


class RegisterBody(PinBody):
    salt: str = Field(..., min_length=8, max_length=200)
    vault: str = Field(..., min_length=8)


class SaveBody(PinBody):
    vault: str = Field(..., min_length=8)


class PinChangeBody(BaseModel):
    old_pin: str = Field(..., min_length=4, max_length=64)
    new_pin: str = Field(..., min_length=4, max_length=64)
    salt: str = Field(..., min_length=8, max_length=200)
    vault: str = Field(..., min_length=8)


SHARE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
MAX_SHARE_TXNS = 400


class ShareSnapshot(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    notes: str = Field("", max_length=2000)
    sheet: list[dict[str, Any]] = Field(default_factory=list)
    txns: list[dict[str, Any]] = Field(default_factory=list)


class ShareBody(PinBody):
    share_id: str = Field(..., min_length=8, max_length=80)
    snapshot: ShareSnapshot


def _col():
    return db.thanks2all_khata


def _shares():
    return db.thanks2all_khata_shares


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _guard_ip(request: Request) -> None:
    ip = _client_ip(request)
    count, until = _ip_fails.get(ip, (0, None))
    now = datetime.now(timezone.utc)
    if until and now < until:
        raise HTTPException(status_code=423, detail="Too many PIN tries. Wait 15 minutes.")
    if until and now >= until:
        _ip_fails[ip] = (0, None)


def _fail_ip(request: Request) -> None:
    ip = _client_ip(request)
    count, _ = _ip_fails.get(ip, (0, None))
    count += 1
    until = None
    if count >= MAX_FAILS:
        until = datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)
        count = 0
    _ip_fails[ip] = (count, until)


def _ok_ip(request: Request) -> None:
    _ip_fails.pop(_client_ip(request), None)


async def _doc():
    return await _col().find_one({"id": DOC_ID})


async def _record_fail(doc: dict | None) -> None:
    if not doc:
        return
    fails = int(doc.get("fails") or 0) + 1
    locked_until = None
    if fails >= MAX_FAILS:
        locked_until = (datetime.now(timezone.utc) + timedelta(minutes=LOCK_MINUTES)).isoformat()
        fails = 0
    await _col().update_one({"id": DOC_ID}, {"$set": {"fails": fails, "locked_until": locked_until}})


def _locked(doc: dict) -> bool:
    until = doc.get("locked_until")
    if not until:
        return False
    try:
        return datetime.fromisoformat(until) > datetime.now(timezone.utc)
    except Exception:
        return False


@router.get("/status")
async def status():
    doc = await _doc()
    return {"claimed": bool(doc), "updated_at": (doc or {}).get("updated_at")}


@router.post("/register")
async def register(body: RegisterBody, request: Request):
    _guard_ip(request)
    existing = await _doc()
    if existing:
        raise HTTPException(status_code=409, detail="Books already exist. Unlock with your PIN.")
    await _col().insert_one(
        {
            "id": DOC_ID,
            "pin_hash": hash_password(body.pin),
            "salt": body.salt,
            "vault": body.vault,
            "fails": 0,
            "locked_until": None,
            "updated_at": now_iso(),
        }
    )
    _ok_ip(request)
    return {"ok": True}


@router.post("/unlock")
async def unlock(body: PinBody, request: Request):
    _guard_ip(request)
    doc = await _doc()
    if not doc:
        raise HTTPException(status_code=404, detail="No cloud books yet.")
    if _locked(doc):
        raise HTTPException(status_code=423, detail="Too many PIN tries. Wait 15 minutes.")
    if not verify_password(body.pin, doc.get("pin_hash") or ""):
        _fail_ip(request)
        await _record_fail(doc)
        raise HTTPException(status_code=401, detail="Wrong PIN.")
    _ok_ip(request)
    await _col().update_one({"id": DOC_ID}, {"$set": {"fails": 0, "locked_until": None}})
    return {"salt": doc["salt"], "vault": doc["vault"], "updated_at": doc.get("updated_at")}


@router.post("/save")
async def save(body: SaveBody, request: Request):
    _guard_ip(request)
    doc = await _doc()
    if not doc:
        raise HTTPException(status_code=404, detail="No cloud books yet.")
    if _locked(doc):
        raise HTTPException(status_code=423, detail="Too many PIN tries. Wait 15 minutes.")
    if not verify_password(body.pin, doc.get("pin_hash") or ""):
        _fail_ip(request)
        await _record_fail(doc)
        raise HTTPException(status_code=401, detail="Wrong PIN.")
    _ok_ip(request)
    await _col().update_one(
        {"id": DOC_ID},
        {"$set": {"vault": body.vault, "fails": 0, "locked_until": None, "updated_at": now_iso()}},
    )
    return {"ok": True, "updated_at": now_iso()}


@router.post("/pin")
async def change_pin(body: PinChangeBody, request: Request):
    _guard_ip(request)
    doc = await _doc()
    if not doc:
        raise HTTPException(status_code=404, detail="No cloud books yet.")
    if _locked(doc):
        raise HTTPException(status_code=423, detail="Too many PIN tries. Wait 15 minutes.")
    if not verify_password(body.old_pin, doc.get("pin_hash") or ""):
        _fail_ip(request)
        await _record_fail(doc)
        raise HTTPException(status_code=401, detail="Wrong PIN.")
    _ok_ip(request)
    await _col().update_one(
        {"id": DOC_ID},
        {
            "$set": {
                "pin_hash": hash_password(body.new_pin),
                "salt": body.salt,
                "vault": body.vault,
                "fails": 0,
                "locked_until": None,
                "updated_at": now_iso(),
            }
        },
    )
    return {"ok": True}


def _public_share(doc: dict) -> dict:
    return {
        "id": doc.get("id"),
        "name": doc.get("name"),
        "notes": doc.get("notes") or "",
        "sheet": doc.get("sheet") or [],
        "txns": doc.get("txns") or [],
        "updated_at": doc.get("updated_at"),
    }


@router.get("/share/{share_id}")
async def get_share(share_id: str):
    if not SHARE_ID_RE.match(share_id):
        raise HTTPException(status_code=404, detail="Shared sheet not found.")
    doc = await _shares().find_one({"id": share_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Shared sheet not found.")
    return _public_share(doc)


@router.post("/share")
async def put_share(body: ShareBody, request: Request):
    _guard_ip(request)
    if not SHARE_ID_RE.match(body.share_id):
        raise HTTPException(status_code=400, detail="Invalid share id.")
    if len(body.snapshot.txns) > MAX_SHARE_TXNS:
        raise HTTPException(status_code=400, detail="Too many ledger lines to share.")
    doc = await _doc()
    if not doc:
        raise HTTPException(status_code=404, detail="No cloud books yet.")
    if _locked(doc):
        raise HTTPException(status_code=423, detail="Too many PIN tries. Wait 15 minutes.")
    if not verify_password(body.pin, doc.get("pin_hash") or ""):
        _fail_ip(request)
        await _record_fail(doc)
        raise HTTPException(status_code=401, detail="Wrong PIN.")
    _ok_ip(request)
    payload = {
        "id": body.share_id,
        "name": body.snapshot.name,
        "notes": body.snapshot.notes,
        "sheet": body.snapshot.sheet,
        "txns": body.snapshot.txns,
        "updated_at": now_iso(),
    }
    await _shares().update_one({"id": body.share_id}, {"$set": payload}, upsert=True)
    return {"ok": True, "id": body.share_id, "updated_at": payload["updated_at"]}

"""DailyCart API - GPS-native hyperlocal marketplace (DailyMart + DailyServe + DailyPro + Admin)."""
import asyncio
import logging
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from core import client, db
from routers.auth_routes import router as auth_router
from routers.public_routes import router as public_router
from routers.customer_routes import router as customer_router
from routers.vendor_routes import router as vendor_router
from routers.admin_routes import router as admin_router
from seed import seed, ensure_indexes

app = FastAPI(title="DailyCart API", version="1.0.0")

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"service": "dailycart-api", "status": "ok"}


@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        return {"status": "ok", "database": True}
    except Exception:
        return {"status": "degraded", "database": False}


api_router.include_router(auth_router)
api_router.include_router(public_router)
api_router.include_router(customer_router)
api_router.include_router(vendor_router)
api_router.include_router(admin_router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dailycart")


async def initialize_database():
    """Prepare indexes and demo content without blocking the web server startup."""
    try:
        await ensure_indexes()
        await seed(force=False)
        logger.info("DailyCart database initialization completed")
    except Exception:
        logger.exception("DailyCart database initialization failed")


@app.on_event("startup")
async def startup():
    asyncio.create_task(initialize_database())
    logger.info("DailyCart API started; database initialization runs in the background")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import logging
import os

from app.routers import scan, rules, users, stats, simulation
from app.core.websocket import manager
from app.database import init_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PhishGuard API")

# Configure CORS middleware
allowed_origins_str = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174"
)
origins = [o.strip() for o in allowed_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(scan.router)
app.include_router(rules.router)
app.include_router(users.router)
app.include_router(stats.router)
app.include_router(simulation.router)

@app.on_event("startup")
async def startup():
    init_db()

@app.get("/")
def home():
    return {"message": "Phishing Detector API is running"}

@app.get("/health")
def health_check():
    return {
        "status": "ok", 
        "service": "PhishGuard API",
        "environment": os.getenv("RAILWAY_ENVIRONMENT", "local")
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep the connection open by receiving any heartbeat/data
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
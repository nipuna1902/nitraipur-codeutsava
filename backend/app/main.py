from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.database import SessionLocal, init_db
from backend.app.integrations.mqtt.client import mqtt_manager
from backend.app.services.repository import TelemetryRepository
from backend.app.websocket.manager import ws_manager

logger = logging.getLogger("electron.main")


def create_app() -> FastAPI:
    app = FastAPI(
        title="Electron Backend",
        version="0.1.0",
        description="Prototype backend for simulator-first grid intelligence.",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)

    app_loop: asyncio.AbstractEventLoop | None = None

    def handle_mqtt_broadcast(data: dict) -> None:
        """Bridge paho-mqtt thread events to the FastAPI WebSocket loop."""
        try:
            if app_loop and app_loop.is_running():
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast(data), app_loop)
        except Exception as exc:
            logger.warning("MQTT->WS bridge error: %s", exc)

    def ingest_mqtt_readings(readings, context: dict) -> dict:
        with SessionLocal() as db:
            saved, anomaly_reports_created, derived_meter_status_counts = TelemetryRepository(db).ingest(readings)
        return {
            "accepted": len(saved),
            "anomaly_reports_created": anomaly_reports_created,
            "derived_meter_status_counts": derived_meter_status_counts,
            "topic": context.get("topic"),
        }

    @app.on_event("startup")
    async def on_startup() -> None:
        nonlocal app_loop
        app_loop = asyncio.get_running_loop()
        init_db()
        mqtt_manager.set_ingest_callback(ingest_mqtt_readings)
        mqtt_manager.set_broadcast_callback(handle_mqtt_broadcast)
        mqtt_manager.start()
        logger.info("MQTT client started.")

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        mqtt_manager.stop()
        logger.info("MQTT client stopped.")

    return app


app = create_app()

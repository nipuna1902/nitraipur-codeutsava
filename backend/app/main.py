from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.database import init_db
from backend.app.integrations.mqtt.client import mqtt_manager
from backend.app.services.simulation_ml import SimulationModelUnavailable, warm_model
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

    def handle_mqtt_telemetry(data: dict) -> None:
        """Bridge: paho-mqtt thread -> FastAPI asyncio event loop -> WebSocket broadcast."""
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.run_coroutine_threadsafe(ws_manager.broadcast(data), loop)
        except Exception as exc:
            logger.warning("MQTT->WS bridge error: %s", exc)

    @app.on_event("startup")
    async def on_startup() -> None:
        init_db()
        try:
            warm_model()
            logger.info("ML model artifact loaded and ready.")
        except SimulationModelUnavailable as exc:
            logger.warning("ML model is unavailable: %s", exc)
        mqtt_manager.set_broadcast_callback(handle_mqtt_telemetry)
        mqtt_manager.start()
        logger.info("MQTT client started.")

    @app.on_event("shutdown")
    async def on_shutdown() -> None:
        mqtt_manager.stop()
        logger.info("MQTT client stopped.")

    return app


app = create_app()

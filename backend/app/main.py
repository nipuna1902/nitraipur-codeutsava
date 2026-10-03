from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api.routes import router
from backend.app.database import init_db


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

    @app.on_event("startup")
    def on_startup() -> None:
        init_db()

    return app


app = create_app()

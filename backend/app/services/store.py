from backend.app.database import SessionLocal, init_db
from backend.app.services.repository import TelemetryRepository


class StoreFacade:
    """Compatibility facade for tests and scripts that need repository reset."""

    def reset(self) -> None:
        init_db()
        with SessionLocal() as db:
            TelemetryRepository(db).reset()


store = StoreFacade()

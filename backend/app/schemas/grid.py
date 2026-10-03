from pydantic import BaseModel


class ConsumerSummary(BaseModel):
    consumer_id: str
    latest_energy: float | None = None
    latest_power: float | None = None
    latest_voltage: float | None = None
    meter_status: str | None = None
    communication_status: str | None = None
    readings_count: int


class TransformerSummary(BaseModel):
    transformer_id: str
    feeder_id: str
    consumer_count: int
    latest_consumer_energy: float
    latest_unexplained_loss: float

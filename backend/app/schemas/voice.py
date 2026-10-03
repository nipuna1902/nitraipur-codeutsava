from pydantic import BaseModel, Field


class VoiceSessionRequest(BaseModel):
    case_id: str | None = None
    consumer_id: str | None = None
    language: str = Field(default="EN")


class VoiceSessionResponse(BaseModel):
    session_id: str
    status: str
    language: str
    provider: str
    message: str


class ConsumerToolRequest(BaseModel):
    consumer_id: str = Field(min_length=1)


class TransformerToolRequest(BaseModel):
    transformer_id: str = Field(min_length=1)


class FieldObservationRequest(BaseModel):
    case_id: str = Field(min_length=1)
    observation: str = Field(min_length=1)
    language: str = Field(default="EN")
    source: str = Field(default="VOICE")


class ChecklistUpdateRequest(BaseModel):
    case_id: str = Field(min_length=1)
    item_id: str = Field(min_length=1)
    status: str = Field(min_length=1)


class VoiceToolResponse(BaseModel):
    data_available: bool
    message: str
    payload: dict

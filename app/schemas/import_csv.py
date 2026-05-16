from pydantic import BaseModel


class ImportRowError(BaseModel):
    row: int
    reason: str


class ImportSummary(BaseModel):
    imported: int
    skipped: int
    errors: list[ImportRowError]

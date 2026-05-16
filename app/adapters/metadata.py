from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date


@dataclass
class MetadataResult:
    title: str
    author: str
    isbn: str | None
    cover_url: str | None
    description: str | None
    page_count: int | None
    published_date: date | None


class MetadataAdapter(ABC):
    @abstractmethod
    def search(self, query: str, *, limit: int = 10, lite: bool = False) -> list[MetadataResult]:
        ...

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


@dataclass
class MetadataSearchPage:
    results: list[MetadataResult]
    total: int
    offset: int
    limit: int
    has_more: bool


class MetadataAdapter(ABC):
    @abstractmethod
    def search(self, query: str, *, limit: int = 10, lite: bool = False) -> list[MetadataResult]:
        ...

    @abstractmethod
    def search_page(
        self,
        query: str,
        *,
        limit: int = 10,
        offset: int = 0,
        lite: bool = False,
    ) -> MetadataSearchPage:
        ...

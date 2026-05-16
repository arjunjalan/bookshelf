from abc import ABC, abstractmethod
from collections.abc import Generator
from dataclasses import dataclass


@dataclass
class LLMResult:
    text: str


class LLMAdapter(ABC):
    @abstractmethod
    def chat(self, messages: list[dict]) -> LLMResult:
        ...

    @abstractmethod
    def chat_stream(self, messages: list[dict]) -> Generator[str, None, None]:
        ...

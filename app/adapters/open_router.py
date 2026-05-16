import logging
import os
from collections.abc import Generator

from openai import OpenAI

from app.adapters.llm import LLMAdapter, LLMResult

logger = logging.getLogger(__name__)

_BASE_URL = "https://openrouter.ai/api/v1"


class OpenRouterAdapter(LLMAdapter):
    def __init__(self) -> None:
        self._model = os.getenv("LLM_MODEL", "meta-llama/llama-3.1-8b-instruct:free")
        self._client = OpenAI(
            api_key=os.getenv("OPENROUTER_API_KEY", ""),
            base_url=_BASE_URL,
        )

    def chat(self, messages: list[dict]) -> LLMResult:
        logger.debug("Sending %d messages to OpenRouter model %s", len(messages), self._model)
        response = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
        )
        if not response.choices or not response.choices[0].message.content:
            finish_reason = repr(response.choices[0].finish_reason) if response.choices else "no choices"
            raise ValueError(f"Empty response from model (finish_reason={finish_reason})")
        return LLMResult(text=response.choices[0].message.content)

    def chat_stream(self, messages: list[dict]) -> Generator[str, None, None]:
        logger.debug("Streaming %d messages to OpenRouter model %s", len(messages), self._model)
        stream = self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            stream=True,
        )
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

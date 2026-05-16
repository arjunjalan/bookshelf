import os

from app.adapters.llm import LLMAdapter
from app.adapters.metadata import MetadataAdapter


def get_metadata_adapter() -> MetadataAdapter:
    from app.adapters.open_library import OpenLibraryAdapter

    provider = os.getenv("METADATA_PROVIDER", "open_library")
    if provider == "open_library":
        return OpenLibraryAdapter()
    raise ValueError(f"Unknown metadata provider: {provider}")


def get_llm_adapter() -> LLMAdapter:
    from app.adapters.open_router import OpenRouterAdapter

    provider = os.getenv("LLM_PROVIDER", "openrouter")
    if provider == "openrouter":
        return OpenRouterAdapter()
    raise ValueError(f"Unknown LLM provider: {provider}")

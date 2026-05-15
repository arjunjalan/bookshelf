import os

from app.adapters.metadata import MetadataAdapter


def get_metadata_adapter() -> MetadataAdapter:
    from app.adapters.open_library import OpenLibraryAdapter

    provider = os.getenv("METADATA_PROVIDER", "open_library")
    if provider == "open_library":
        return OpenLibraryAdapter()
    raise ValueError(f"Unknown metadata provider: {provider}")

"""Environment-driven configuration for the Smruti backend."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    # --- Google Drive ---
    drive_folder_id: str = os.getenv("DRIVE_FOLDER_ID", "")
    # Provide EITHER the full service-account JSON (managed hosting, recommended)
    # or a path to the JSON file (local dev).
    google_credentials_json: str = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
    google_credentials_file: str = os.getenv(
        "GOOGLE_CREDENTIALS_FILE", "service-account.json"
    )

    # --- Face matching (InsightFace) ---
    # "buffalo_l" (accurate) or "buffalo_s" (smaller/lighter for tiny instances).
    face_model_pack: str = os.getenv("FACE_MODEL_PACK", "buffalo_l")
    # Cosine similarity threshold for a match (normed embeddings). 0.30–0.45 typical.
    match_threshold: float = float(os.getenv("MATCH_THRESHOLD", "0.35"))

    # --- WhatsApp (Twilio) ---
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_from: str = os.getenv(
        "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"
    )

    # --- App ---
    # Public URL Twilio fetches matched images from. Auto-detected on Hugging
    # Face Spaces (SPACE_HOST) and Render (RENDER_EXTERNAL_URL); override with
    # PUBLIC_BASE_URL for any other host.
    public_base_url: str = (
        os.getenv("PUBLIC_BASE_URL")
        or (f"https://{os.getenv('SPACE_HOST')}" if os.getenv("SPACE_HOST") else None)
        or os.getenv("RENDER_EXTERNAL_URL")
        or "http://localhost:8000"
    )
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    album_cache_dir: str = os.getenv("ALBUM_CACHE_DIR", "album_cache")
    max_photos_to_send: int = int(os.getenv("MAX_PHOTOS_TO_SEND", "10"))


settings = Settings()

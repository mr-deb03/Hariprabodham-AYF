"""Environment-driven configuration for the Smruti backend."""
import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass
class Settings:
    # Google Drive
    drive_folder_id: str = os.getenv("DRIVE_FOLDER_ID", "")
    google_credentials_file: str = os.getenv(
        "GOOGLE_CREDENTIALS_FILE", "service-account.json"
    )

    # Face matching (DeepFace)
    face_model: str = os.getenv("FACE_MODEL", "ArcFace")
    face_detector: str = os.getenv("FACE_DETECTOR", "retinaface")
    match_threshold: float = float(os.getenv("MATCH_THRESHOLD", "0"))

    # WhatsApp (Twilio)
    twilio_account_sid: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    twilio_auth_token: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    twilio_whatsapp_from: str = os.getenv(
        "TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886"
    )

    # App
    public_base_url: str = os.getenv("PUBLIC_BASE_URL", "http://localhost:8000")
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    album_cache_dir: str = os.getenv("ALBUM_CACHE_DIR", "album_cache")
    max_photos_to_send: int = int(os.getenv("MAX_PHOTOS_TO_SEND", "10"))


settings = Settings()

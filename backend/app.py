"""Smruti API — receives the form, matches faces against the Drive album,
and sends matched photos to the visitor's WhatsApp.

Run:  uvicorn app:app --reload --port 8000
"""
import os
import shutil
import tempfile

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
import drive
import face_matcher as matcher
import whatsapp as wa

app = FastAPI(title="Smruti API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.album_cache_dir, exist_ok=True)
# Matched photos are served from here so Twilio can fetch them for WhatsApp.
app.mount("/media", StaticFiles(directory=settings.album_cache_dir), name="media")


@app.get("/health")
def health():
    return {"status": "ok"}


def _chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def process_request(first_name: str, number: str, selfie_path: str):
    """Sync album → match faces → send on WhatsApp. Runs in the background."""
    try:
        drive.sync_album(settings.album_cache_dir)
        matches = matcher.find_matches(selfie_path, settings.album_cache_dir)
        matches = matches[: settings.max_photos_to_send]

        if not matches:
            wa.send_text(
                number,
                f"Hi {first_name}, we couldn't find any photos matching your face "
                "yet. We'll keep looking as new albums are added. 🙏",
            )
            return

        urls = [
            f"{settings.public_base_url}/media/{os.path.basename(p)}" for p in matches
        ]
        wa.send_text(
            number,
            f"Hi {first_name}! We found {len(urls)} photo(s) of you from our "
            "gatherings. Sending them now 🙏",
        )
        for chunk in _chunks(urls, 10):  # Twilio: max 10 media per message
            wa.send_media(number, chunk)
    except Exception as exc:  # noqa: BLE001
        print("Smruti processing error:", exc)
    finally:
        # Don't retain the biometric source image once we're done with it.
        shutil.rmtree(os.path.dirname(selfie_path), ignore_errors=True)


@app.post("/api/smruti")
async def smruti(
    background: BackgroundTasks,
    firstName: str = Form(...),
    lastName: str = Form(...),
    ayfCode: str = Form(...),
    whatsapp: str = Form(...),
    consent: str = Form("false"),
    photo: UploadFile = File(...),
):
    if consent.lower() != "true":
        raise HTTPException(status_code=400, detail="Consent is required.")
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    # Persist the selfie so the background task can read it after we respond.
    tmp_dir = tempfile.mkdtemp(prefix="smruti_")
    selfie_path = os.path.join(tmp_dir, photo.filename or "selfie.jpg")
    with open(selfie_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    background.add_task(process_request, firstName, whatsapp, selfie_path)

    return {
        "status": "processing",
        "message": "Thanks! We'll match your photos and send them to your WhatsApp shortly.",
    }

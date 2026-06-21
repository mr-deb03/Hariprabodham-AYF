"""Smruti API — receives the form, matches faces against the Drive album,
and sends matched photos to the visitor's WhatsApp.

Run locally:  uvicorn app:app --reload --port 8000
"""
import os
import shutil
import tempfile

import cv2
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
# Matched (resized) photos are served from here so Twilio can fetch them.
app.mount("/media", StaticFiles(directory=settings.album_cache_dir), name="media")

SEND_DIR = "_send"  # resized, WhatsApp-friendly copies live under album_cache/_send


@app.get("/health")
def health():
    return {"status": "ok"}


def _chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _prepare_for_send(src_path):
    """Resize a matched image to a WhatsApp-friendly JPEG (Twilio caps media
    around 5 MB). Returns the public URL, or None on failure."""
    send_dir = os.path.join(settings.album_cache_dir, SEND_DIR)
    os.makedirs(send_dir, exist_ok=True)
    base = os.path.splitext(os.path.basename(src_path))[0] + ".jpg"
    out = os.path.join(send_dir, base)
    if not os.path.exists(out):
        img = cv2.imread(src_path)
        if img is None:
            return None
        h, w = img.shape[:2]
        scale = min(1.0, 1600 / max(h, w))
        if scale < 1.0:
            img = cv2.resize(
                img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA
            )
        cv2.imwrite(out, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return f"{settings.public_base_url}/media/{SEND_DIR}/{base}"


def process_request(first_name: str, number: str, selfie_path: str):
    """Sync album → match faces → send on WhatsApp. Runs in the background."""
    try:
        print(f"[smruti] syncing album for {first_name} ({number})")
        drive.sync_album(settings.album_cache_dir)
        matches = matcher.find_matches(selfie_path, settings.album_cache_dir)
        matches = matches[: settings.max_photos_to_send]
        print(f"[smruti] {len(matches)} match(es) found")

        if not matches:
            wa.send_text(
                number,
                f"Hi {first_name}, we couldn't find any photos matching your face "
                "yet. Please make sure your photo has a clear, front-facing face — "
                "we'll also keep looking as new albums are added. 🙏",
            )
            return

        urls = [u for u in (_prepare_for_send(p) for p in matches) if u]
        wa.send_text(
            number,
            f"Hi {first_name}! Jai Swaminarayan Das Na Das\n"
            f"We found {len(urls)} photo(s) of you from our "
            "gatherings. Sending them now 🙏",
        )
        for chunk in _chunks(urls, 10):  # Twilio: max 10 media per message
            wa.send_media(number, chunk)
        print(f"[smruti] sent {len(urls)} photo(s) to {number}")
    except Exception as exc:  # noqa: BLE001
        print("[smruti] processing error:", exc)
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

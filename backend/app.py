"""Smruti API — matches a selfie against the Drive album and sends the matched
photos back to the visitor, over WhatsApp (web form) or Telegram (chat bot).

Run locally:  uvicorn app:app --reload --port 8000
"""
import os
import shutil
import tempfile
import threading

import cv2
from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Request,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
import drive
import face_matcher as matcher
import pending
import telegram as tg
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

# ---- Warm-up ------------------------------------------------------------
# Matching is lazy: the model loads on first use and the album index is built
# on first use, and neither survives a container restart on a free Space. That
# put the whole cost on the first visitor, whose caller (the Worker's
# waitUntil) gives up long before it finishes — so their photos were silently
# dropped and only the *next* request saw a warm Space. Do the work at boot,
# and let the cron re-run it to pick up newly added album photos.
_warm_lock = threading.Lock()
_warm_state = {"status": "cold", "photos": 0, "error": None}


def _warm_cache():
    if not _warm_lock.acquire(blocking=False):
        return  # a warm-up is already in flight; don't stack another
    try:
        _warm_state["status"] = "warming"
        drive.sync_album(settings.album_cache_dir)
        count = matcher.warm(settings.album_cache_dir)
        _warm_state.update(status="warm", photos=count, error=None)
        print(f"[smruti][warm] ready — {count} album photo(s) indexed")
    except Exception as exc:  # noqa: BLE001
        _warm_state.update(status="error", error=str(exc))
        print("[smruti][warm] failed:", exc)
    finally:
        _warm_lock.release()


def _warm_in_background():
    threading.Thread(target=_warm_cache, name="smruti-warm", daemon=True).start()


@app.get("/health")
def health():
    return {"status": "ok", "warm": _warm_state["status"]}


@app.get("/warm")
def warm():
    """Cron target. Kicks off the warm-up and returns straight away — the build
    can outlast any client timeout, so never make the caller wait for it."""
    if _warm_state["status"] != "warming":
        _warm_in_background()
    return {"ok": True, **_warm_state}


@app.get("/debug/net")
def debug_net(key: str = ""):
    """Diagnose outbound egress from this host. TLS-probes api.telegram.org and
    the configured TELEGRAM_API_BASE over both IPv4 and IPv6, then does a real
    HTTP request the way the app would — so we can see which path (if any) works
    and whether FORCE_IPV4 helps or hurts here. Guarded by the webhook secret
    when one is set. Remove/ignore once Telegram delivery is working."""
    import socket
    import ssl
    from urllib.parse import urlparse

    import requests

    if settings.telegram_webhook_secret and key != settings.telegram_webhook_secret:
        raise HTTPException(status_code=403, detail="bad key")

    def tls_probe(host, family):
        try:
            infos = socket.getaddrinfo(host, 443, family, socket.SOCK_STREAM)
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "stage": "dns", "error": f"{type(exc).__name__}: {exc}"}
        addr = infos[0][4]
        sock = socket.socket(family, socket.SOCK_STREAM)
        sock.settimeout(10)
        try:
            sock.connect(addr)
            ctx = ssl.create_default_context()
            with ctx.wrap_socket(sock, server_hostname=host):
                pass
            return {"ok": True, "addr": addr[0]}
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "stage": "connect/tls",
                "addr": addr[0],
                "error": f"{type(exc).__name__}: {exc}",
            }
        finally:
            try:
                sock.close()
            except Exception:  # noqa: BLE001
                pass

    api_host = urlparse(settings.telegram_api_base).hostname or "api.telegram.org"
    hosts = {"telegram": "api.telegram.org", "api_base": api_host}
    result = {
        "force_ipv4": settings.force_ipv4,
        "telegram_api_base": settings.telegram_api_base,
        "tls_probes": {
            name: {
                "host": host,
                "ipv4": tls_probe(host, socket.AF_INET),
                "ipv6": tls_probe(host, socket.AF_INET6),
            }
            for name, host in hosts.items()
        },
    }

    # End-to-end HTTP as the app actually issues it (honours FORCE_IPV4 patch).
    try:
        r = requests.get(f"{settings.telegram_api_base.rstrip('/')}/", timeout=15)
        result["http_get_api_base"] = {"ok": True, "status": r.status_code}
    except Exception as exc:  # noqa: BLE001
        result["http_get_api_base"] = {"ok": False, "error": f"{type(exc).__name__}: {exc}"}
    return result


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


def _match_photo_urls(selfie_path: str):
    """Sync the Drive album, match faces against the selfie, and return public
    URLs for the (resized) matched photos. Shared by every delivery channel."""
    drive.sync_album(settings.album_cache_dir)
    matches = matcher.find_matches(selfie_path, settings.album_cache_dir)
    matches = matches[: settings.max_photos_to_send]
    return [u for u in (_prepare_for_send(p) for p in matches) if u]


def process_request(first_name: str, number: str, selfie_path: str):
    """Match faces → send on WhatsApp. Runs in the background."""
    try:
        print(f"[smruti] syncing album for {first_name} ({number})")
        urls = _match_photo_urls(selfie_path)
        print(f"[smruti] {len(urls)} match(es) found")

        if not urls:
            wa.send_text(
                number,
                f"Hi {first_name}, we couldn't find any photos matching your face "
                "yet. Please make sure your photo has a clear, front-facing face — "
                "we'll also keep looking as new albums are added. 🙏",
            )
            return

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


def process_telegram_token(chat_id, fallback_name: str, token: str):
    """A user pressed Start on their deep link → match the selfie they uploaded
    on the website and send the photos to this chat. Deletes the token after."""
    entry = pending.load(token)
    if not entry:
        tg.send_message(
            chat_id,
            "This photo link has expired or was already used. Please fill in the "
            "Smruti form on our website again. 🙏",
        )
        return

    name = entry.get("firstName") or fallback_name
    try:
        tg.send_message(
            chat_id,
            f"Jai Swaminarayan {name}! 🙏 Matching your photos across our "
            "gathering albums — one moment…",
        )
        print(f"[smruti][tg] matching token {token} for chat {chat_id}")
        urls = _match_photo_urls(entry["selfie_path"])
        print(f"[smruti][tg] {len(urls)} match(es) found")

        if not urls:
            tg.send_message(
                chat_id,
                f"Hi {name}, we couldn't find any photos matching your face yet. "
                "Please submit the form again with a clearer, front-facing "
                "selfie — we'll also keep looking as new albums are added. 🙏",
            )
            return

        tg.send_message(
            chat_id,
            f"We found {len(urls)} photo(s) of you from our gatherings. "
            "Sending them now…",
        )
        for chunk in _chunks(urls, 10):  # Telegram: max 10 per album
            tg.send_photos(chat_id, chunk)
        print(f"[smruti][tg] sent {len(urls)} photo(s) to {chat_id}")
    except Exception as exc:  # noqa: BLE001
        print("[smruti][tg] processing error:", exc)
        try:
            tg.send_message(
                chat_id, "Sorry, something went wrong. Please try again shortly. 🙏"
            )
        except Exception:  # noqa: BLE001
            pass
    finally:
        # Removes the stored selfie too — not retained beyond delivery.
        pending.delete(token)


def _result_for_token(token: str) -> dict:
    """Match the selfie stored under `token` and return a delivery payload for
    the Cloudflare Worker to relay to Telegram. Unlike process_telegram_token,
    this NEVER talks to Telegram — used when this host's outbound egress to
    Telegram is blocked and the Worker handles all Telegram I/O instead."""
    entry = pending.load(token)
    if not entry:
        return {
            "status": "expired",
            "text": "This photo link has expired or was already used. Please fill "
            "in the Smruti form on our website again. 🙏",
        }
    name = entry.get("firstName") or "there"
    try:
        urls = _match_photo_urls(entry["selfie_path"])
    except Exception as exc:  # noqa: BLE001
        print("[smruti][tg] process error:", exc)
        # Keep the token so the visitor can retry the same link.
        return {
            "status": "error",
            "text": "Sorry, something went wrong while finding your photos. "
            "Please try again shortly. 🙏",
        }
    pending.delete(token)  # delivered (or definitively empty) — don't retain selfie
    if not urls:
        return {
            "status": "none",
            "text": f"Hi {name}, we couldn't find any photos matching your face "
            "yet. Please submit the form again with a clearer, front-facing selfie "
            "— we'll also keep looking as new albums are added. 🙏",
        }
    return {
        "status": "sent",
        "text": f"We found {len(urls)} photo(s) of you from our gatherings. "
        "Sending them now…",
        "photos": urls,
    }


@app.post("/telegram/process")
async def telegram_process(request: Request, x_smruti_secret: str = Header(default="")):
    """Called by the Cloudflare Worker (which owns all Telegram I/O because this
    host can't reach Telegram outbound). Matches the selfie stored under a token
    and RETURNS the photo URLs + text for the Worker to deliver. Guarded by the
    shared secret — set it to the same value as TELEGRAM_WEBHOOK_SECRET."""
    if (
        settings.telegram_webhook_secret
        and x_smruti_secret != settings.telegram_webhook_secret
    ):
        raise HTTPException(status_code=403, detail="bad secret")
    body = await request.json()
    token = (body.get("token") or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="missing token")
    print(f"[smruti][tg] process token {token} for chat {body.get('chat_id')}")
    result = _result_for_token(token)
    print(
        f"[smruti][tg] token {token}: {result['status']}, "
        f"{len(result.get('photos', []))} photo(s)"
    )
    return {"ok": True, **result}


@app.post("/api/smruti")
async def smruti(
    firstName: str = Form(...),
    lastName: str = Form(...),
    ayfCode: str = Form(...),
    consent: str = Form("false"),
    photo: UploadFile = File(...),
):
    """Stash the selfie under a token and return a Telegram deep link. Face
    matching happens when the visitor opens the link and presses Start, so the
    heavy work only runs for people who follow through (see the webhook)."""
    if consent.lower() != "true":
        raise HTTPException(status_code=400, detail="Consent is required.")
    if not photo.content_type or not photo.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    tmp_dir = tempfile.mkdtemp(prefix="smruti_")
    selfie_path = os.path.join(tmp_dir, photo.filename or "selfie.jpg")
    try:
        with open(selfie_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        pending.purge_old()  # opportunistic cleanup of abandoned submissions
        token = pending.create(
            {"firstName": firstName, "lastName": lastName, "ayfCode": ayfCode},
            selfie_path,
        )
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)  # pending store has its copy

    username = tg.bot_username()
    telegram_url = f"https://t.me/{username}?start={token}" if username else None
    return {
        "status": "ok",
        "token": token,
        "telegramUrl": telegram_url,
        "message": "Open the Telegram link and press Start to receive your photos.",
    }


# --------------------------------------------------------------------------- #
# Telegram bot — webhook for the form's deep link (/start <token> → photos)
# --------------------------------------------------------------------------- #

# Shown when someone opens the bot without a deep-link token (or sends a stray
# message) — points them back to the website form, which is the entry point.
USE_WEBSITE = (
    "Jai Swaminarayan {name}! 🙏\n\n"
    "To receive your photos, open the *Smruti* photo finder on our website, "
    "upload a selfie, then tap “Open my photos on Telegram”. I'll send your "
    "matched photos right here."
)


@app.post("/telegram/webhook")
async def telegram_webhook(
    request: Request,
    background: BackgroundTasks,
    x_telegram_bot_api_secret_token: str = Header(default=""),
):
    """Receive Telegram updates. All replies run in the background so we ack
    Telegram immediately (it retries otherwise)."""
    if (
        settings.telegram_webhook_secret
        and x_telegram_bot_api_secret_token != settings.telegram_webhook_secret
    ):
        raise HTTPException(status_code=403, detail="Invalid secret token.")

    update = await request.json()
    message = update.get("message") or update.get("edited_message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    if chat_id is None:
        return {"ok": True}

    first_name = (message.get("from") or {}).get("first_name") or "there"
    text = (message.get("text") or "").strip()

    # The deep link arrives as "/start <token>". Anything else → point to site.
    if text.startswith("/start"):
        parts = text.split(maxsplit=1)
        token = parts[1].strip() if len(parts) > 1 else ""
        if token:
            background.add_task(process_telegram_token, chat_id, first_name, token)
            return {"ok": True}

    background.add_task(tg.send_message, chat_id, USE_WEBSITE.format(name=first_name))
    return {"ok": True}


@app.on_event("startup")
def _warm_on_boot():
    """Restarts — not idle time — are what leave the Space cold, so warm on every
    boot. Backgrounded: the port has to start listening right away or the Space
    is marked unhealthy."""
    _warm_in_background()


@app.on_event("startup")
def _register_telegram_webhook():
    """Point Telegram at this server's webhook on boot (skipped locally)."""
    if not settings.telegram_bot_token:
        return
    base = settings.public_base_url
    if not base or base.startswith("http://localhost"):
        print("[smruti][tg] no public URL — skipping webhook registration")
        return
    try:
        res = tg.set_webhook(
            f"{base}/telegram/webhook", settings.telegram_webhook_secret
        )
        print("[smruti][tg] setWebhook:", res.get("description", res))
    except Exception as exc:  # noqa: BLE001
        print("[smruti][tg] setWebhook failed:", exc)

"""Telegram delivery for Smruti via the official Bot API.

Free, official, no ban risk. The website form stashes a selfie under a token and
hands back a t.me/<bot>?start=<token> link; when the visitor presses Start, the
bot matches their face and sends the photos into the chat.

Outbound calls go through TELEGRAM_API_BASE (default api.telegram.org). Some
hosts — notably some Hugging Face Spaces — can't reach api.telegram.org for
outbound calls even though inbound webhooks work; point TELEGRAM_API_BASE at a
small proxy (e.g. a Cloudflare Worker, see telegram-proxy-worker.js) to fix it.

This module is a thin HTTP client; orchestration lives in app.py.
"""
import socket

import requests
import urllib3.util.connection as _urllib3_conn

from config import settings

# Some hosts (observed on Hugging Face Spaces) have broken IPv6 egress: TLS
# handshakes to IPv6 destinations fail with "UNEXPECTED_EOF" or time out, while
# IPv4 works fine. Force urllib3 (used by requests) to resolve to IPv4 only —
# this fixes outbound to both api.telegram.org and the Cloudflare proxy.
_urllib3_conn.allowed_gai_family = lambda: socket.AF_INET

_BASE = settings.telegram_api_base.rstrip("/")
API = f"{_BASE}/bot{settings.telegram_bot_token}"
FILE_API = f"{_BASE}/file/bot{settings.telegram_bot_token}"

_username = None


def _request(method: str, url: str, **kwargs):
    """HTTP with a few retries — outbound to Telegram can be slow/flaky."""
    last = None
    for _ in range(3):
        try:
            return requests.request(method, url, **kwargs)
        except requests.RequestException as exc:  # timeout / connection error
            last = exc
    raise last


def bot_username() -> str:
    """The bot's @username (no @) for deep links. Prefers the configured value;
    otherwise asks getMe and caches a non-empty result (so a transient failure
    can be retried on the next call instead of being cached forever)."""
    global _username
    if settings.telegram_bot_username:
        return settings.telegram_bot_username
    if _username:
        return _username
    if settings.telegram_bot_token:
        try:
            r = _request("get", f"{API}/getMe", timeout=30)
            _username = r.json().get("result", {}).get("username", "") or ""
        except Exception as exc:  # noqa: BLE001
            print("[telegram] getMe failed:", exc)
    return _username or ""


def _post(method: str, payload: dict, timeout: int = 60):
    try:
        r = _request("post", f"{API}/{method}", json=payload, timeout=timeout)
    except Exception as exc:  # noqa: BLE001
        print(f"[telegram] {method} failed: {exc}")
        return None
    if not r.ok:
        print(f"[telegram] {method} HTTP {r.status_code}: {r.text[:300]}")
    return r


def send_message(chat_id, text: str):
    _post("sendMessage", {"chat_id": chat_id, "text": text}, timeout=45)


def send_photos(chat_id, urls, caption: str = None):
    """Send 1–10 photos to a chat. Telegram's album endpoint requires 2–10
    items, so a single photo is sent via sendPhoto instead."""
    urls = [u for u in urls if u]
    if not urls:
        return
    if len(urls) == 1:
        payload = {"chat_id": chat_id, "photo": urls[0]}
        if caption:
            payload["caption"] = caption
        _post("sendPhoto", payload)
        return
    media = []
    for i, url in enumerate(urls):
        item = {"type": "photo", "media": url}
        if i == 0 and caption:
            item["caption"] = caption  # caption rides on the album's first item
        media.append(item)
    _post("sendMediaGroup", {"chat_id": chat_id, "media": media})


def download_file(file_id: str, dest_path: str):
    """Resolve a Telegram file_id to its path, then stream it to dest_path."""
    meta = _request("get", f"{API}/getFile", params={"file_id": file_id}, timeout=45)
    meta.raise_for_status()
    file_path = meta.json()["result"]["file_path"]
    with _request("get", f"{FILE_API}/{file_path}", stream=True, timeout=180) as resp:
        resp.raise_for_status()
        with open(dest_path, "wb") as fh:
            for chunk in resp.iter_content(8192):
                fh.write(chunk)


def set_webhook(url: str, secret: str = ""):
    payload = {"url": url, "allowed_updates": ["message"]}
    if secret:
        payload["secret_token"] = secret
    r = _post("setWebhook", payload, timeout=45)
    return r.json() if r is not None else {"ok": False, "description": "request failed"}


def delete_webhook():
    r = _post("deleteWebhook", {}, timeout=30)
    return r.json() if r is not None else {"ok": False, "description": "request failed"}

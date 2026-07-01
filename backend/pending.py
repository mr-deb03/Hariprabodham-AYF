"""Short-lived store linking a website submission to a Telegram deep-link token.

Flow: the visitor uploads a selfie on the site → we stash it under a random
token and hand back a t.me/<bot>?start=<token> link. When they press Start, the
bot looks up the token, matches faces, sends the photos, then deletes the entry
— so the biometric selfie is never retained beyond delivery. Unclaimed entries
are purged after a day.
"""
import json
import os
import secrets
import shutil
import time

from config import settings

_ROOT = settings.pending_dir
_MAX_AGE = 24 * 3600  # discard submissions never opened on Telegram within 24h


def _dir(token: str) -> str:
    return os.path.join(_ROOT, token)


def _valid(token: str) -> bool:
    # tokens are URL-safe base64 (A–Z a–z 0–9 - _) — reject anything else so a
    # crafted token can't escape the store directory.
    return bool(token) and all(c.isalnum() or c in "-_" for c in token)


def create(meta: dict, selfie_src: str) -> str:
    """Stash the selfie + details under a fresh token and return the token."""
    os.makedirs(_ROOT, exist_ok=True)
    token = secrets.token_urlsafe(9)
    d = _dir(token)
    os.makedirs(d, exist_ok=True)
    ext = os.path.splitext(selfie_src)[1] or ".jpg"
    shutil.copyfile(selfie_src, os.path.join(d, "selfie" + ext))
    record = {**meta, "selfie": "selfie" + ext, "created": time.time()}
    with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as fh:
        json.dump(record, fh)
    return token


def load(token: str):
    """Return the stored record (incl. absolute selfie_path) or None."""
    if not _valid(token):
        return None
    meta_path = os.path.join(_dir(token), "meta.json")
    if not os.path.exists(meta_path):
        return None
    with open(meta_path, encoding="utf-8") as fh:
        record = json.load(fh)
    record["selfie_path"] = os.path.join(_dir(token), record.get("selfie", "selfie.jpg"))
    return record


def delete(token: str):
    if _valid(token):
        shutil.rmtree(_dir(token), ignore_errors=True)


def purge_old(max_age: float = _MAX_AGE):
    """Drop submissions whose deep-link was never opened in time."""
    if not os.path.isdir(_ROOT):
        return
    now = time.time()
    for token in os.listdir(_ROOT):
        try:
            with open(os.path.join(_ROOT, token, "meta.json"), encoding="utf-8") as fh:
                created = json.load(fh).get("created", 0)
            if now - created > max_age:
                shutil.rmtree(_dir(token), ignore_errors=True)
        except Exception:  # noqa: BLE001
            continue

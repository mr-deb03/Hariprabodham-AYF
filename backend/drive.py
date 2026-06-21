"""Google Drive access: list and download event-album images.

Uses a service account. Share the Drive folder with the service account's
email so it can read the photos. Credentials come from either the
GOOGLE_CREDENTIALS_JSON env var (managed hosting) or a JSON file (local dev).
"""
import json
import os

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

from config import settings

SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]


def _credentials():
    if settings.google_credentials_json.strip():
        info = json.loads(settings.google_credentials_json)
        return service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return service_account.Credentials.from_service_account_file(
        settings.google_credentials_file, scopes=SCOPES
    )


def _service():
    return build("drive", "v3", credentials=_credentials(), cache_discovery=False)


def list_album_images():
    """Return metadata for every image in the configured Drive folder."""
    service = _service()
    files = []
    page_token = None
    query = (
        f"'{settings.drive_folder_id}' in parents "
        "and mimeType contains 'image/' and trashed = false"
    )
    while True:
        resp = (
            service.files()
            .list(
                q=query,
                fields="nextPageToken, files(id, name, mimeType)",
                pageSize=1000,
                pageToken=page_token,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True,
            )
            .execute()
        )
        files.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return files


def sync_album(cache_dir: str):
    """Download album images not already cached locally. Only new files are
    fetched, so repeat calls are cheap. Returns metadata with ``local_path``."""
    os.makedirs(cache_dir, exist_ok=True)
    service = _service()
    result = []
    for f in list_album_images():
        local_path = os.path.join(cache_dir, f"{f['id']}_{_safe(f['name'])}")
        if not os.path.exists(local_path):
            _download(service, f["id"], local_path)
        result.append({**f, "local_path": local_path})
    return result


def _safe(name: str) -> str:
    cleaned = "".join(c for c in name if c.isalnum() or c in (".", "-", "_"))
    return cleaned or "image"


def _download(service, file_id: str, dest: str):
    request = service.files().get_media(fileId=file_id)
    with open(dest, "wb") as fh:
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()

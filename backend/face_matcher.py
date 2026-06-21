"""Local face matching with InsightFace (onnxruntime, CPU).

find_matches(selfie_path, album_dir) -> list[str]
    Returns the album image paths that contain the same person as the selfie.

Album face embeddings are cached on disk (keyed by file mtime) so only new or
changed photos are processed on each run — the first request is slow, the rest
are fast. Swap this module for a cloud provider (e.g. AWS Rekognition) by
keeping the same find_matches() signature.
"""
import os
import pickle

import cv2
import numpy as np

from config import settings

_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")
_INDEX_FILE = "face_index.pkl"
_app = None


def _is_image(name: str) -> bool:
    return name.lower().endswith(_IMAGE_EXTS)


def _get_app():
    """Lazy-load the InsightFace model once (heavy import + model load)."""
    global _app
    if _app is None:
        from insightface.app import FaceAnalysis

        _app = FaceAnalysis(
            name=settings.face_model_pack, providers=["CPUExecutionProvider"]
        )
        _app.prepare(ctx_id=-1, det_size=(640, 640))
    return _app


def _embeddings_for(path: str):
    img = cv2.imread(path)
    if img is None:
        return []
    try:
        faces = _get_app().get(img)
    except Exception as exc:  # noqa: BLE001
        print("Face detect error on", os.path.basename(path), exc)
        return []
    return [f.normed_embedding.astype(np.float32) for f in faces]


def _index_path(album_dir):
    return os.path.join(album_dir, _INDEX_FILE)


def _load_index(album_dir):
    p = _index_path(album_dir)
    if os.path.exists(p):
        try:
            with open(p, "rb") as fh:
                return pickle.load(fh)
        except Exception:  # noqa: BLE001
            return {}
    return {}


def _refresh_index(album_dir):
    """Compute (and cache) face embeddings for every album image."""
    index = _load_index(album_dir)
    files = [f for f in os.listdir(album_dir) if _is_image(f)]
    current = set(files)

    # Drop entries for removed files.
    for key in [k for k in index if k not in current]:
        del index[key]

    changed = False
    for f in files:
        full = os.path.join(album_dir, f)
        mtime = os.path.getmtime(full)
        entry = index.get(f)
        if not entry or entry.get("mtime") != mtime:
            index[f] = {"mtime": mtime, "embs": _embeddings_for(full)}
            changed = True

    if changed:
        with open(_index_path(album_dir), "wb") as fh:
            pickle.dump(index, fh)
    return index


def find_matches(selfie_path: str, album_dir: str):
    if not os.path.isdir(album_dir):
        return []
    if not any(_is_image(f) for f in os.listdir(album_dir)):
        return []

    selfie_embs = _embeddings_for(selfie_path)
    if not selfie_embs:
        return []  # no detectable face in the uploaded photo

    index = _refresh_index(album_dir)
    threshold = settings.match_threshold or 0.35

    matched = []
    for fname, entry in index.items():
        for emb in entry.get("embs", []):
            if any(float(np.dot(emb, s)) >= threshold for s in selfie_embs):
                matched.append(os.path.join(album_dir, fname))
                break
    return sorted(matched)

"""Local face matching with DeepFace.

Given a selfie and a folder of album images, returns the album images that
contain the same face. DeepFace caches face embeddings in a pickle inside the
album folder, so repeat searches are fast.

Swap this module for a cloud provider (e.g. AWS Rekognition SearchFacesByImage)
by keeping the same ``find_matches(selfie_path, album_dir) -> list[str]`` API.
"""
import os

from config import settings

_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp")


def _is_image(name: str) -> bool:
    return name.lower().endswith(_IMAGE_EXTS)


def find_matches(selfie_path: str, album_dir: str):
    if not os.path.isdir(album_dir):
        return []
    if not any(_is_image(f) for f in os.listdir(album_dir)):
        return []

    # Imported lazily so the API server boots fast (DeepFace import is heavy).
    from deepface import DeepFace

    kwargs = dict(
        img_path=selfie_path,
        db_path=album_dir,
        model_name=settings.face_model,
        detector_backend=settings.face_detector,
        enforce_detection=False,
        silent=True,
    )
    if settings.match_threshold > 0:
        kwargs["threshold"] = settings.match_threshold

    try:
        results = DeepFace.find(**kwargs)
    except Exception as exc:  # noqa: BLE001
        print("Face matching error:", exc)
        return []

    # DeepFace.find returns one DataFrame per face detected in the selfie.
    matched = set()
    for df in results:
        if df is None or getattr(df, "empty", True):
            continue
        col = "identity" if "identity" in df.columns else df.columns[0]
        for path in df[col].tolist():
            matched.add(os.path.abspath(path))
    return sorted(matched)

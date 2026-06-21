FROM python:3.11-slim

# System libraries needed by OpenCV / onnxruntime / InsightFace
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libglib2.0-0 libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the InsightFace model at build time so the first request is fast.
ARG FACE_MODEL_PACK=buffalo_l
RUN python -c "from insightface.app import FaceAnalysis; a=FaceAnalysis(name='${FACE_MODEL_PACK}', providers=['CPUExecutionProvider']); a.prepare(ctx_id=-1, det_size=(640,640))"

COPY . .

# Fail the build early if anything doesn't import (syntax / missing dep).
RUN python -c "import app"

ENV PORT=8000
# Single worker keeps the model loaded once (memory-friendly).
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1"]

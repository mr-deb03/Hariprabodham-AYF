FROM python:3.11-slim

# System libraries needed by OpenCV / onnxruntime / InsightFace
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake \
    libglib2.0-0 libgl1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Run as a non-root user (Hugging Face Spaces best practice; also fine on Render).
# Models and the album cache live under this user's HOME so they stay writable.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=8000

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Pre-download the InsightFace model at build time so the first request is fast.
# Saved to ~/.insightface (the user's HOME), which is writable at runtime too.
ARG FACE_MODEL_PACK=buffalo_l
ENV FACE_MODEL_PACK=${FACE_MODEL_PACK}
RUN python -c "from insightface.app import FaceAnalysis; a=FaceAnalysis(name='${FACE_MODEL_PACK}', providers=['CPUExecutionProvider']); a.prepare(ctx_id=-1, det_size=(640,640))"

COPY --chown=user . .

# Fail the build early if anything doesn't import (syntax / missing dep).
RUN python -c "import app"

# Single worker keeps the model loaded once (memory-friendly).
# Hugging Face Spaces routes the public URL to this port (declared as app_port).
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT} --workers 1"]

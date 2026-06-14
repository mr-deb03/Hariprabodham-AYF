# Smruti Backend

Receives the Smruti form (name, AYF code, WhatsApp number, face photo), finds
matching photos in a Google Drive album using local face recognition, and sends
them to the visitor's WhatsApp.

```
React form  ──POST multipart──►  FastAPI /api/smruti
                                      │
                                      ├─ Google Drive  → download album photos (cached)
                                      ├─ DeepFace      → match the selfie against the album
                                      └─ Twilio        → send matched photos on WhatsApp
```

## Stack

| Concern         | Choice                          | Swap it for…                     |
| --------------- | ------------------------------- | -------------------------------- |
| Web framework   | FastAPI + Uvicorn               | —                                |
| Face matching   | DeepFace (local, ArcFace)       | AWS Rekognition, Azure Face      |
| Photo source    | Google Drive (service account)  | Any folder / S3                  |
| Messaging       | Twilio WhatsApp                 | WhatsApp Cloud API (Meta)        |

Each concern lives in its own module (`face_matcher.py`, `drive.py`,
`whatsapp.py`) so you can replace one without touching the others.

## Setup

### 1. Install (Python 3.9–3.11 recommended)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows  (use: source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
```

The first face match downloads the DeepFace model weights (a few hundred MB).

### 2. Google Drive (service account)

1. In the [Google Cloud Console](https://console.cloud.google.com/), create a
   project and **enable the Google Drive API**.
2. Create a **service account**, add a **JSON key**, and save it as
   `backend/service-account.json`.
3. **Share your photo folder** with the service account's email
   (`...@...iam.gserviceaccount.com`) as a Viewer.
4. Put the folder's ID (from its URL) in `DRIVE_FOLDER_ID`.

### 3. Twilio WhatsApp

1. Create a Twilio account → **Messaging → Try WhatsApp** to get the sandbox.
2. Copy your **Account SID** and **Auth Token** into `.env`.
3. For production, register a WhatsApp sender and use **approved message
   templates** (business-initiated messages require them).

### 4. Public URL for media

Twilio fetches images from a public URL, so the backend must be reachable.
For local testing, expose it with [ngrok](https://ngrok.com/):

```bash
ngrok http 8000
```

Put the `https://...ngrok...` address in `PUBLIC_BASE_URL`.

### 5. Configure & run

```bash
copy .env.example .env         # then edit .env  (cp on macOS/Linux)
uvicorn app:app --reload --port 8000
```

Health check: <http://localhost:8000/health>  ·  API docs: <http://localhost:8000/docs>

### 6. Point the React form at it

In the **project root** (not `backend/`), create `.env`:

```
REACT_APP_SMRUTI_ENDPOINT=http://localhost:8000/api/smruti
```

Restart `npm start` (Create React App only reads env vars at startup).

## Notes & considerations

- **Performance:** the album is downloaded once and cached; DeepFace caches face
  embeddings in a pickle inside `album_cache/`. The first request after new
  photos are added is the slow one. Matching/sending runs in a background task,
  so the form returns immediately.
- **Privacy / law:** face data is biometric personal data (India's DPDP Act,
  GDPR). The uploaded selfie is deleted after processing. Add a documented
  retention/deletion policy and secure the server before going live.
- **Accuracy:** tune `FACE_MODEL`, `FACE_DETECTOR`, and `MATCH_THRESHOLD` in
  `.env`. A lower threshold = stricter (fewer false matches).

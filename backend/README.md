# Smruti Backend — Setup & Deploy

Receives the Smruti form (name, AYF code, WhatsApp number, face photo), finds
the visitor in a Google Drive event album using face recognition, and sends the
matched photos to their WhatsApp.

```
Vercel (React form) ──POST multipart──► Render (FastAPI /api/smruti)
                                            │
                                            ├─ Google Drive → download album (cached on a disk)
                                            ├─ InsightFace  → match the selfie to album faces
                                            └─ Twilio       → send matched photos via WhatsApp
```

Stack: **FastAPI** · **InsightFace** (onnxruntime, CPU) · **Google Drive API**
(service account) · **Twilio WhatsApp**. Each concern is its own module
(`face_matcher.py`, `drive.py`, `whatsapp.py`) so any one can be swapped.

---

## 1. Google Drive (service account)

1. [Google Cloud Console](https://console.cloud.google.com/) → your project →
   **enable the Google Drive API**.
2. **Create a service account** → add a **JSON key** → download it.
3. Open it in a text editor and copy the **entire JSON** (you'll paste it as an
   env var in step 3 — no file upload needed on Render).
4. **Share your photo folder** in Drive with the service account's email
   (`...@...iam.gserviceaccount.com`) as **Viewer**.
5. Copy the folder **ID** from its URL
   (`drive.google.com/drive/folders/THIS_PART`) → that's `DRIVE_FOLDER_ID`.

## 2. Twilio WhatsApp

1. Twilio Console → **Messaging → Try it out → Send a WhatsApp message** →
   activate the **sandbox**.
2. Copy your **Account SID** and **Auth Token**.
3. From your phone, send the join code (e.g. `join <two-words>`) to the Twilio
   sandbox number — **each recipient must join the sandbox once** before they
   can receive messages (sandbox limitation; not needed once you have an
   approved production sender + template).

## 3. Deploy to Render (Blueprint)

1. Push this repo to GitHub (already done).
2. Render Dashboard → **New → Blueprint** → select this repo. It reads
   [`render.yaml`](../render.yaml) and creates the **smruti-api** web service
   from the `backend/` folder.
3. Fill in the env vars it prompts for (the `sync:false` ones):
   - `DRIVE_FOLDER_ID` — from step 1.5
   - `GOOGLE_CREDENTIALS_JSON` — paste the full JSON from step 1.3
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — from step 2.2
   - `CORS_ORIGINS` — `https://YOUR-SITE.vercel.app,http://localhost:3000`
4. Deploy. First build takes a few minutes (it pre-downloads the face model).
   Health check: `https://smruti-api-XXXX.onrender.com/health` → `{"status":"ok"}`.

`PUBLIC_BASE_URL` is auto-detected from Render, so Twilio can fetch the photos.

> **Memory note:** `buffalo_l` needs ~1–2 GB RAM (the blueprint uses the
> `standard` plan). To run cheaper, set `FACE_MODEL_PACK=buffalo_s` and drop to
> the `starter` plan.

## 4. Point the Vercel frontend at it

In **Vercel → Project → Settings → Environment Variables**, add:

```
REACT_APP_SMRUTI_ENDPOINT = https://smruti-api-XXXX.onrender.com/api/smruti
```

Redeploy the frontend (CRA only reads env vars at build time). The Smruti form
will now POST to the live backend instead of running in demo mode.

## 5. Test

Open `/smruti`, fill the form with **a phone that has joined the Twilio
sandbox**, upload a clear face photo, submit. Within a minute you should receive
your matched photos on WhatsApp. Watch the Render logs (`[smruti] ...`) to see
the sync → match → send steps.

---

## Local development (optional)

Requires Python 3.10/3.11 installed.

```bash
cd backend
python -m venv venv && venv\Scripts\activate     # macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                            # then fill it in
#   - GOOGLE_CREDENTIALS_FILE=service-account.json (put the key file here)
#   - PUBLIC_BASE_URL=<your ngrok https url>       (so Twilio can reach you)
uvicorn app:app --reload --port 8000
```

Expose it for Twilio media with `ngrok http 8000` and set `PUBLIC_BASE_URL` to
the ngrok URL. Point the frontend's `REACT_APP_SMRUTI_ENDPOINT` at
`http://localhost:8000/api/smruti` and restart `npm start`.

## Notes & limits

- **Performance:** the album downloads once to the Render disk; face embeddings
  are cached (`face_index.pkl`) and only new photos are processed. The first
  request after new uploads is the slow one. Matching/sending runs in the
  background, so the form responds instantly.
- **Photo size:** matched images are auto-resized to ~1600px JPEG before
  sending (Twilio caps WhatsApp media around 5 MB).
- **Privacy / law:** face data is biometric personal data (India DPDP Act /
  GDPR). The uploaded selfie is deleted after processing; add a written
  retention policy before going live.
- **Cost:** Render instance + Twilio per-message + (in production) an approved
  WhatsApp sender & message templates.

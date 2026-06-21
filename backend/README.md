---
title: Smruti API
emoji: 📸
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

# Smruti Backend — Setup & Deploy

Receives the Smruti form (name, AYF code, WhatsApp number, face photo), finds
the visitor in a Google Drive event album using face recognition, and sends the
matched photos to their WhatsApp.

> The block above (between the `---` lines) is **Hugging Face Space metadata** —
> leave it in place; that's what tells HF to build this as a Docker Space on
> port 8000.

```
Vercel (React form) ──POST multipart──► Hugging Face Space (FastAPI /api/smruti)
                                            │
                                            ├─ Google Drive → download album (cached on disk)
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
3. Open it in a text editor and copy the **entire JSON** (you'll paste it as a
   secret in step 3 — no file upload needed).
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

## 3. Deploy to Hugging Face Spaces (free)

The free **CPU basic** tier gives 16 GB RAM, plenty for the full-accuracy
`buffalo_l` model. The Space is just a git repo containing this `backend/`
folder.

1. Create an account at [huggingface.co](https://huggingface.co), then go to
   **New → Space**. Set:
   - **Owner / name**: e.g. `your-name/smruti-api`
   - **SDK**: **Docker** → **Blank**
   - **Hardware**: **CPU basic (free)**
   - **Visibility**: **Public** (Twilio must be able to fetch the matched
     photos over HTTP; secrets are stored separately, never in the code).
2. Push this `backend/` folder to the Space's git repo. From the project root:
   ```bash
   # one-time: create a Hugging Face access token (Settings → Access Tokens, "write")
   git clone https://huggingface.co/spaces/your-name/smruti-api hf-space
   cp -r backend/* backend/.dockerignore hf-space/
   cd hf-space
   git add .
   git commit -m "Deploy Smruti API"
   git push                       # use your HF username + token when prompted
   ```
   (Or use the Space's **Files → Upload files** in the browser if you prefer no
   git — upload everything inside `backend/`.)
3. In the Space → **Settings → Variables and secrets**, add **Secrets**:
   - `DRIVE_FOLDER_ID` — from step 1.5
   - `GOOGLE_CREDENTIALS_JSON` — paste the full JSON from step 1.3
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` — from step 2.2

   …and **Variables** (non-secret):
   - `CORS_ORIGINS` — `https://YOUR-SITE.vercel.app,http://localhost:3000`
   - `TWILIO_WHATSAPP_FROM` — `whatsapp:+14155238886` (sandbox sender)
4. The Space rebuilds on every push / secret change. First build takes a few
   minutes (it pre-downloads the face model). When it's **Running**, your URL is:
   ```
   https://your-name-smruti-api.hf.space
   ```
   Health check: open `https://your-name-smruti-api.hf.space/health` →
   `{"status":"ok"}`.

`PUBLIC_BASE_URL` is auto-detected from the Space (`SPACE_HOST`), so Twilio can
fetch the photos with no extra config.

> **Note:** the free Space sleeps after ~48h of inactivity and has no persistent
> disk, so the album re-downloads on a cold start (the first request after a
> sleep is the slow one). For low/occasional traffic this is fine.

## 4. Point the Vercel frontend at it

In **Vercel → Project → Settings → Environment Variables**, add:

```
REACT_APP_SMRUTI_ENDPOINT = https://your-name-smruti-api.hf.space/api/smruti
```

Redeploy the frontend (CRA only reads env vars at build time). The Smruti form
will now POST to the live backend instead of running in demo mode.

## 5. Test

Open `/smruti`, fill the form with **a phone that has joined the Twilio
sandbox**, upload a clear face photo, submit. Within a minute you should receive
your matched photos on WhatsApp. Watch the Space **Logs** (`[smruti] ...`) to
see the sync → match → send steps.

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

- **Performance:** the album downloads once to the Space disk; face embeddings
  are cached (`face_index.pkl`) and only new photos are processed. The first
  request after new uploads (or a cold start) is the slow one. Matching/sending
  runs in the background, so the form responds instantly.
- **Photo size:** matched images are auto-resized to ~1600px JPEG before
  sending (Twilio caps WhatsApp media around 5 MB).
- **Privacy / law:** face data is biometric personal data (India DPDP Act /
  GDPR). The uploaded selfie is deleted after processing; add a written
  retention policy before going live.
- **Cost:** the Space is free; you pay only Twilio per-message and (in
  production) an approved WhatsApp sender & message templates.

---

## Alternative host: Render (paid)

`render.yaml` in the repo root is a Render Blueprint if you ever want to move off
the free tier — note it uses a paid plan (`standard`) and a persistent disk.
Hugging Face Spaces (above) is the free path.

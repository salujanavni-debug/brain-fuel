# SignSpeak

**SignSpeak** is an inclusive sign language and assistive communication web platform designed to bridge everyday conversations in healthcare, education, and daily life. It combines browser-based MediaPipe hand landmark tracking, an ML-ready Python FastAPI recognition pipeline, SpeechSynthesis voice playback, an interactive learning library, offline-ready multilingual quick communication boards, and an accessible Emergency Mode.

---

## 1. Project Overview

SignSpeak is built around two core design principles:
- **Privacy & Accessibility First**: Raw webcam video stays strictly in the user's browser. Only structured 21-point 3D hand landmark coordinates are sent to the recognition backend—never video frames or webcam recordings.
- **Honest Resilience**: When the AI gesture classification model is not yet trained on an authentic labeled dataset, or when the user is offline or without a camera, SignSpeak never fabricates predictions and keeps Quick Messages, Two-Way Communication, Emergency Mode, and Text-to-Sign guides working reliably.

---

## 2. Features

- **Real-Time Camera & Hand Landmarks (`/translator`)**:
  - Uses browser `getUserMedia` + `@mediapipe/tasks-vision` (`HandLandmarker`) to detect up to 2 hands and 21 landmarks per hand.
  - Draws landmarks and hand skeleton overlays in real time with FPS throttling, tab visibility pausing, camera selection, lighting hints, and clean stream/track release on Stop or page exit.
- **Sign-to-Speech & Sentence Builder (`/translator`)**:
  - Temporal smoothing (`PredictionPostProcessor`), configurable confidence thresholds, unknown-pose rejection, duplicate-speech lock while holding a sign, and browser `SpeechSynthesis` playback with voice selection + Speak/Pause/Resume/Stop controls.
  - Built-in Dataset Collection & Annotation drawer to record static poses and 24-frame dynamic clips for training.
- **Text-to-Sign Explorer (`/text-to-sign`)**:
  - Sends text to `POST /api/translation/text-to-sign` to match supported vocabulary against verified SVG hand demonstrations in exact sequence while clearly flagging unsupported words (never inventing signs).
- **Smart Quick Communication Board (`/quick-messages` & Home Dashboard)**:
  - Large, accessible cards organized into Basic Needs, Family & Personal, Healthcare, Emergency, and Daily Conversation, with **English, Hindi, and Punjabi** multilingual phrases and local speech playback.
- **Two-Way Communication (`/communicate`)**:
  - Split-screen live dialogue panel with picture phrase cards, typed replies, SpeechSynthesis output, and optional SpeechRecognition voice input.
- **Learn Sign Language (`/learn`)**:
  - Publicly browsable gesture catalog with category/difficulty filters, live search, detailed handshape guides, interactive Flashcards, multiple-choice Quizzes graded via `POST /api/learning/quiz/submit`, and synced per-user progress when signed in.
- **Emergency Mode (`/emergency`)**:
  - One-tap high-visibility urgent phrases (`I need help.`, `I am in pain.`, `Call a doctor.`, `I need water.`, `I cannot understand.`, `Please contact my family.`, `I need assistance.`), full-screen display mode, pinned Quick Access, copy-to-clipboard, and SpeechSynthesis playback (with an explicit notice that it does not contact emergency services automatically).
- **Authentication & Progress Tracking (`/auth`, `/profile`, `/progress`)**:
  - Supabase email/password authentication, profile management, synced learning progress, quiz history, and text-only translation history protected by Row Level Security (RLS).

---

## 3. Technology Stack

- **Frontend**: React 19, Vite, TypeScript / JavaScript, Tailwind CSS v4, React Router v7, Axios, Lucide React, `@mediapipe/tasks-vision`, `@supabase/supabase-js`
- **Preview BFF / Unified Dev Server**: Node.js, Express, `tsx`
- **Backend API & ML Service**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, NumPy, Scikit-learn, Joblib, TensorFlow (optional), MediaPipe
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **Deployment Targets**: Vercel (Frontend SPA) + Render (FastAPI Backend) + Supabase (Managed PostgreSQL & Auth)

---

## 4. Folder Structure

```text
.
├── index.html                      # HTML entry point & SEO metadata
├── package.json                    # Root unified frontend + Express preview server scripts
├── server.ts                       # Express API & Vite dev middleware (port 3000)
├── vercel.json                     # Vercel SPA rewrite & security header configuration
├── .env.example                    # Root frontend/preview environment variable template
├── public/
│   └── mediapipe/models/           # Official MediaPipe hand_landmarker.task model asset
├── src/                            # Unified TypeScript React application
│   ├── components/                 # CameraView, DatasetCollectorCard, QuickMessagesBoard, UI primitives
│   ├── context/                    # AccessibilityContext, AuthContext
│   ├── hooks/                      # useBackendHealth, useOnlineStatus
│   ├── layouts/                    # AppLayout with Navbar, OfflineBanner, Footer
│   ├── lib/                        # supabaseClient.ts
│   ├── pages/                      # Home, Translator, TextToSign, LearnSign, Emergency, QuickMessages, Communicate, Auth, Profile, Progress, About
│   ├── services/                   # Centralized Axios client (api.ts), translationService.ts, healthService.ts, cameraHandTracker.ts, supabaseDataService.ts
│   └── utils/                      # landmarkPostProcessor.ts, mediapipe.ts, signVocabulary.ts, speech.ts, quickMessagesData.ts
├── supabase/migrations/            # 001_initial_schema.sql & 002_seed_gestures.sql
├── tests/                          # Node/TS automated integration, security, camera, speech, and RLS tests
└── SignSpeak/                      # Decoupled full-stack workspace (Vercel frontend + Render FastAPI backend)
    ├── render.yaml                 # Render deployment blueprint
    ├── frontend/                   # Standalone Vite + React (JS) frontend + vercel.json
    ├── backend/                    # FastAPI REST API + ML training/inference pipeline
    │   ├── app/
    │   │   ├── api/                # health, gestures, recognition, learning, emergency, translation routers
    │   │   ├── core/               # config, security-redacted logging, exception handlers
    │   │   ├── ml/                 # vocabulary, features, dataset, train_classifier, inference
    │   │   ├── schemas/            # Pydantic request/response schemas
    │   │   └── services/           # Business logic services
    │   ├── datasets/               # Raw & processed hand-landmark JSON sample folders
    │   ├── models/                 # Trained model artifacts (.joblib / .keras) & model_metadata.json
    │   ├── tests/                  # Pytest API, ML, validation, and security tests
    │   ├── render.yaml             # Render backend config
    │   └── requirements.txt
    └── supabase/migrations/        # Synchronized SQL schema & seed migrations
```

---

## 5. Installation Instructions

### Prerequisites
- **Node.js** >= 20 and **npm** >= 10
- **Python** >= 3.10 and `pip` (for running the FastAPI backend and ML trainer)
- A **Supabase** project (optional for local offline usage; required for cloud auth & synced user tables)

### Install Unified Root Workspace (Preview Server + TypeScript Frontend)
```bash
npm install
```

### Install Decoupled SignSpeak Frontend & Backend
```bash
# Frontend
cd SignSpeak/frontend
npm install

# Backend
cd ../backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## 6. Environment Variable Setup

Never commit `.env` files or place `SUPABASE_SERVICE_ROLE_KEY` in any frontend `VITE_*` variable.

### Root `.env` (Optional for Supabase cloud sync)
Copy `.env.example` to `.env`:
```env
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

### `SignSpeak/frontend/.env`
Copy `SignSpeak/frontend/.env.example` to `SignSpeak/frontend/.env`:
```env
VITE_API_BASE_URL="http://localhost:8000"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

### `SignSpeak/backend/.env`
Copy `SignSpeak/backend/.env.example` to `SignSpeak/backend/.env`:
```env
APP_NAME="SignSpeak API"
APP_VERSION="0.1.0"
APP_ENV="development"
DEBUG=true
LOG_LEVEL="INFO"
HOST="0.0.0.0"
PORT=8000
CORS_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"
ENABLE_RATE_LIMIT=true
RATE_LIMIT_PER_MINUTE=120
MIN_CONFIDENCE_THRESHOLD=0.65
SUPABASE_URL="https://your-project-ref.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
```

---

## 7. How to Run Frontend

### Option A — Unified Preview Workspace (Express API + Vite on port 3000)
```bash
npm run dev
```
Open `http://localhost:3000`.

### Option B — Standalone SignSpeak Frontend (Port 5173, connects to FastAPI on port 8000)
```bash
cd SignSpeak/frontend
npm run dev
```
Open `http://localhost:5173`.

---

## 8. How to Run Backend

```bash
cd SignSpeak/backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
Verify the API is healthy:
```bash
curl http://localhost:8000/api/health
```
Interactive OpenAPI docs (enabled in non-production environments): `http://localhost:8000/docs`.

---

## 9. How to Train or Update the Gesture Model

SignSpeak intentionally ships **without a pre-baked fake model**. To train a real classifier:

1. **Collect Labeled Samples**:
   - Open `/translator` in the app, start your camera, and open **Dataset Collection & Annotation**.
   - Select one of the 8 prototype classes (`hello`, `thank-you`, `yes`, `no`, `help`, `stop`, `please`, `love`) or `unknown` (neutral/non-sign pose).
   - Capture static poses or 24-frame dynamic clips across multiple signers, hand positions, and lighting conditions.
   - Samples are saved to `SignSpeak/backend/datasets/raw/<gesture_id>_collected.json`.
   - Validate sign orientation, movement, and meaning against authentic Indian Sign Language (ISL) references before marking `isl_verified: true`.

2. **Train & Evaluate the Classifier**:
```bash
cd SignSpeak/backend
source .venv/bin/activate

# Scikit-learn (HistGradientBoosting / MLP pipeline — fast, lightweight)
python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models --framework sklearn

# Or TensorFlow 1D-CNN / BiGRU sequence model (requires tensorflow installed)
python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models --framework tensorflow
```
This outputs:
- `models/signspeak_gesture_classifier.joblib` (or `.keras`)
- `models/model_metadata.json` (classes, accuracy, per-class precision/recall/F1, feature schema)

3. **Serve Updated Predictions**:
   Restart FastAPI (`uvicorn app.main:app --reload --port 8000`). `TrainedLandmarkClassifier` will automatically load the saved artifact and enable live predictions on `POST /api/recognition/predict` and `POST /api/recognition/batch`.

---

## 10. API Documentation

Base URL (local FastAPI): `http://localhost:8000`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, version, AI pipeline readiness, database configuration state |
| `GET` | `/api/gestures` | List supported vocabulary (`?category=...&search=...`) |
| `GET` | `/api/gestures/{gesture_id}` | Detailed gesture guide, handshape, movement, tips, and SVG demonstration asset ID |
| `GET` | `/api/recognition/status` | Model trained flag, confidence threshold, prototype vocabulary, workflow steps |
| `POST` | `/api/recognition/predict` | Single-frame or short-sequence prediction from validated 21-point hand landmarks |
| `POST` | `/api/recognition/batch` | Multi-frame temporal sequence batch recognition (up to 120 frames) |
| `POST` | `/api/recognition/dataset/samples` | Save annotated 1–60 frame MediaPipe hand-landmark samples to `datasets/raw/` |
| `GET` | `/api/learning/categories` | Learning categories with gesture counts |
| `GET` | `/api/learning/gestures` | Learning guides with optional `category`, `difficulty`, and `search` filters |
| `POST` | `/api/learning/quiz` | Fetch curated quiz questions (`{ category, limit }`) without exposing answers |
| `POST` | `/api/learning/quiz/submit` | Grade quiz answers (`{ answers: [{ question_id, selected_option }] }`) and return explanations |
| `GET` | `/api/emergency/messages` | Predefined high-priority emergency communication phrases |
| `POST` | `/api/translation/text-to-sign` | Match input text against verified sign demonstrations and report unsupported tokens |

### Example: `POST /api/translation/text-to-sign`
Request:
```json
{ "text": "Hello friend" }
```
Response (`200 OK`):
```json
{
  "input_text": "Hello friend",
  "status": "complete",
  "demonstration_mode": "individual_sign_sequence",
  "grammar_notice": "Demonstrates matching individual signs from our verified starter library in English token order — NOT a grammatically complete Indian Sign Language (ISL) sentence translation.",
  "matched_count": 2,
  "unsupported_tokens": [],
  "demonstration_sequence": [ ... ],
  "tokens": [ ... ]
}
```

---

## 11. Deployment Instructions

### Step 1: Configure Supabase PostgreSQL
1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Run the SQL migrations in order via the Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_gestures.sql`
3. Copy your **Project URL**, **Anon Public Key** (safe for frontend), and **Service Role Key** (strictly backend-only).

### Step 2: Deploy FastAPI Backend to Render
1. Connect your repository to [Render](https://render.com) and select **New Blueprint** (uses `SignSpeak/render.yaml`) or create a Python Web Service with root directory `SignSpeak/backend`:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
2. Configure environment variables in Render Dashboard:
   - `APP_ENV=production`
   - `DEBUG=false`
   - `CORS_ORIGINS=https://your-vercel-app.vercel.app`
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Render automatically provisions HTTPS (`https://your-api.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Connect the repository to [Vercel](https://vercel.com) (using root `/` or `SignSpeak/frontend`, both include `vercel.json` SPA rewrites and security headers).
2. Set environment variables in Vercel Project Settings:
   - `VITE_API_BASE_URL=https://your-api.onrender.com`
   - `VITE_SUPABASE_URL=https://your-project-ref.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=your-supabase-anon-public-key`
3. Deploy. Update `CORS_ORIGINS` on Render to match your final Vercel HTTPS URL.

---

## 12. Known Limitations

1. **Untrained Prototype Gesture Model**: No labeled ISL dataset ships pre-trained inside `SignSpeak/backend/models/`. Until real samples are collected and trained via `app.ml.train_classifier`, `/api/recognition/predict` explicitly returns `model_unavailable` rather than fabricating sign predictions.
2. **Prototype Vocabulary & ISL Verification**: The 8 starter gesture classes (`Hello`, `Thank You`, `Yes`, `No`, `Help`, `Stop`, `Please`, `I Love You`) require review with qualified Indian Sign Language (ISL) educators and Deaf community reviewers before clinical or official deployment.
3. **Individual-Sign Text-to-Sign Scope**: `/text-to-sign` matches individual supported English tokens/aliases to verified visual sign guides. It does not synthesize complete ISL sentence grammar, facial non-manual markers, or spatial inflection.
4. **Emergency Mode Scope**: Emergency Mode is an on-device visual and SpeechSynthesis aid. It does **not** automatically dial emergency services (911 / 112), contact hospitals, or transmit SMS alerts.
5. **Browser Hardware Dependencies**: MediaPipe hand tracking requires a working webcam and WebGL/WASM-capable browser over HTTPS (or `localhost`). SpeechSynthesis voices and SpeechRecognition vary across browsers and operating systems.

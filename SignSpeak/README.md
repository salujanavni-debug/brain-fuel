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

- **Frontend**: React 19, Vite, JavaScript, Tailwind CSS v4, React Router v7, Axios, Lucide React, `@mediapipe/tasks-vision`, `@supabase/supabase-js`
- **Backend API & ML Service**: Python 3.11+, FastAPI, Uvicorn, Pydantic v2, NumPy, Scikit-learn, Joblib, TensorFlow (optional), MediaPipe
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS)
- **Deployment Targets**: Vercel (Frontend SPA) + Render (FastAPI Backend) + Supabase (Managed PostgreSQL & Auth)

---

## 4. Folder Structure

```text
SignSpeak/
├── render.yaml                     # Render deployment blueprint for FastAPI backend
├── README.md                       # Full documentation
├── frontend/                       # React + Vite frontend
│   ├── vercel.json                 # Vercel SPA rewrites & security headers
│   ├── package.json
│   ├── .env.example
│   ├── public/mediapipe/models/    # hand_landmarker.task model asset
│   └── src/
│       ├── components/             # CameraView, DatasetCollectorCard, QuickMessagesBoard, etc.
│       ├── context/                # AccessibilityContext, AuthContext
│       ├── hooks/                  # useBackendHealth, useOnlineStatus
│       ├── layouts/                # AppLayout
│       ├── lib/                    # supabaseClient.js
│       ├── pages/                  # All pages
│       ├── services/               # api.js, translationService.js, healthService.js, cameraHandTracker.js, supabaseDataService.js
│       └── utils/                  # landmarkPostProcessor.js, mediapipe.js, signVocabulary.js, speech.js
├── backend/                        # FastAPI backend & ML pipeline
│   ├── render.yaml
│   ├── requirements.txt
│   ├── .env.example
│   ├── app/
│   │   ├── api/                    # health, gestures, recognition, learning, emergency, translation
│   │   ├── core/                   # config, secret-redacted logging, exceptions
│   │   ├── ml/                     # vocabulary, features, dataset, train_classifier, inference
│   │   ├── schemas/                # Pydantic schemas
│   │   └── services/               # Service modules
│   ├── datasets/                   # Raw & processed landmark JSON clips
│   ├── models/                     # Trained model artifacts & metadata
│   └── tests/                      # Pytest backend, ML, validation, and security tests
└── supabase/migrations/            # 001_initial_schema.sql & 002_seed_gestures.sql
```

---

## 5. Installation Instructions

```bash
# 1. Install Frontend Dependencies
cd SignSpeak/frontend
npm install

# 2. Install Backend Dependencies
cd ../backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

---

## 6. Environment Variable Setup

Never commit `.env` files or expose `SUPABASE_SERVICE_ROLE_KEY` in `VITE_*` variables.

### `SignSpeak/frontend/.env`
```env
VITE_API_BASE_URL="http://localhost:8000"
VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
VITE_SUPABASE_ANON_KEY="your-supabase-anon-public-key"
```

### `SignSpeak/backend/.env`
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
Verify health endpoint:
```bash
curl http://localhost:8000/api/health
```

---

## 9. How to Train or Update the Gesture Model

1. Start the frontend and backend locally, navigate to `/translator`, start the camera, and use the **Dataset Collection & Annotation** panel to capture labeled landmark sequences into `SignSpeak/backend/datasets/raw/`.
2. Run the training CLI:
```bash
cd SignSpeak/backend
source .venv/bin/activate
python -m app.ml.train_classifier --dataset ./datasets/raw --output-dir ./models --framework sklearn
```
3. Restart FastAPI; `TrainedLandmarkClassifier` will automatically load `models/signspeak_gesture_classifier.joblib` (or `.keras`) and `models/model_metadata.json`.

---

## 10. API Documentation

Base URL: `http://localhost:8000`

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Service status, AI pipeline readiness, database configuration state |
| `GET` | `/api/gestures` | Supported vocabulary (`?category=...&search=...`) |
| `GET` | `/api/gestures/{gesture_id}` | Detailed gesture guide & demonstration assets |
| `GET` | `/api/recognition/status` | Trained model status, threshold, prototype vocabulary, workflow steps |
| `POST` | `/api/recognition/predict` | Single-frame or short-sequence prediction from 21-point landmarks |
| `POST` | `/api/recognition/batch` | Batch temporal sequence prediction (up to 120 frames) |
| `POST` | `/api/recognition/dataset/samples` | Save annotated 1–60 frame landmark samples to `datasets/raw/` |
| `GET` | `/api/learning/categories` | Learning categories & counts |
| `GET` | `/api/learning/gestures` | Learning guides filtered by category, difficulty, or search |
| `POST` | `/api/learning/quiz` | Fetch quiz questions (`{ category, limit }`) |
| `POST` | `/api/learning/quiz/submit` | Grade answers (`{ answers }`) and return score + explanations |
| `GET` | `/api/emergency/messages` | Predefined emergency phrases |
| `POST` | `/api/translation/text-to-sign` | Match text tokens to verified sign demonstrations |

---

## 11. Deployment Instructions

1. **Supabase**: Run `supabase/migrations/001_initial_schema.sql` and `002_seed_gestures.sql` in the Supabase SQL Editor.
2. **Render (Backend)**: Deploy `SignSpeak/backend` using `SignSpeak/render.yaml` (`pip install -r requirements.txt` and `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/api/health`). Set `APP_ENV=production`, `DEBUG=false`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. **Vercel (Frontend)**: Deploy `SignSpeak/frontend` with `SignSpeak/frontend/vercel.json`. Set `VITE_API_BASE_URL` to your Render HTTPS URL plus `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

---

## 12. Known Limitations

1. **Untrained Prototype Gesture Model**: No pre-trained ISL classifier artifact is bundled; until trained on real labeled samples, `/api/recognition/predict` explicitly returns `model_unavailable`.
2. **Prototype Vocabulary Scope**: The 8 initial recognition classes require authentic Indian Sign Language (ISL) validation with qualified Deaf community reviewers.
3. **Text-to-Sign Scope**: Demonstrates individual supported signs in English token order rather than complete ISL grammar.
4. **Emergency Mode Scope**: Visual and audio local aid only; does not dial emergency services (911 / 112) automatically.
5. **Hardware Dependencies**: Webcam + WebGL/WASM required for MediaPipe hand tracking; speech voices vary by browser and OS.

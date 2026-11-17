# SignSpeak

AI-powered sign language recognition and translation platform.

## Architecture

- **Frontend**: React.js, Vite, JavaScript, Tailwind CSS, React Router, Lucide React, Axios (`SignSpeak/frontend`)
- **Backend**: Python, FastAPI, Uvicorn, Pydantic (`SignSpeak/backend`)
- **AI Pipeline (Prepared)**: MediaPipe Tasks Vision, TensorFlow, OpenCV
- **Database (Prepared)**: Supabase PostgreSQL (server-side only)

## Project Structure

```text
SignSpeak/
  frontend/
    src/
      components/
      pages/
      layouts/
      hooks/
      services/
      assets/
      styles/
      utils/
      App.jsx
      main.jsx
    public/
    package.json
  backend/
    app/
      api/
      models/
      services/
      schemas/
      core/
      main.py
    requirements.txt
    .env.example
  README.md
```

## Running Locally

### 1. Start the FastAPI Backend

```bash
cd SignSpeak/backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Verify the health endpoint:

```bash
curl http://localhost:8000/api/health
```

### 2. Start the React Frontend

Open a second terminal:

```bash
cd SignSpeak/frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5173`. The dashboard automatically queries `GET /api/health` via the centralized Axios client (`src/services/api.js`) and displays the backend readiness status.

## Security Notes

- Never commit `.env` files.
- Never place Supabase service role keys or database credentials in `SignSpeak/frontend/.env` or any `VITE_` variable.

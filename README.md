# 🕶️ Tuba's Glasses — Sign Language to Voice Web App

**Real-time hand gesture interpreter** powered by MediaPipe, DeepFace, and Gemini AI.

> Live camera → gesture detection → AI sentence generation → spoken voice output

---

## 📐 Architecture

```
User Webcam (browser)
      ↓
React + Vite Frontend (Vercel)
      ↓  REST /analyze  /sentence
FastAPI Backend (Render)
      ↓
MediaPipe (hand + face tracking)
DeepFace (emotion detection)
      ↓
Gemini 2.5 Flash API
      ↓
Browser Speech Synthesis (TTS)
```

---

## 🧰 Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18 + Vite + CSS               |
| Backend   | FastAPI + Uvicorn                   |
| CV / AI   | MediaPipe, DeepFace, OpenCV         |
| LLM       | Gemini 2.5 Flash (REST API)         |
| TTS       | Web Speech API (browser-native)     |
| Hosting   | Vercel (frontend) + Render (backend)|

---

## 🤟 Gesture Dictionary

| Hand Shape       | Sign Word  |
|------------------|------------|
| Open hand        | TECHNOLOGY |
| Peace / V        | USE        |
| Point index      | FOR        |
| Thumbs up        | HELP       |
| Index + pinky    | NOT        |
| Fist             | WAR        |
| + more…          | LIFE, IMPROVE, WORLD, LOVE, … |
| Both hands open  | **FINISH** → speaks full sentence |

---

## 🚀 Deployment

### Backend → Render

1. Push the `backend/` folder to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, select the `backend` directory
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variable: `GEMINI_API_KEY` = your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
7. Deploy → copy your `.onrender.com` URL

### Frontend → Vercel

1. Push the `frontend/` folder to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Set root directory to `frontend`
4. Add environment variable: `VITE_API_URL` = your Render backend URL
5. Deploy → get your live `.vercel.app` URL 🎉

---

## 💻 Local Development

```bash
# Backend
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY=your_key_here
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
# Create .env.local with:  VITE_API_URL=http://localhost:8000
npm run dev
# Open http://localhost:3000
```

---

## 📁 Project Structure

```
tubas-glasses/
├── backend/
│   ├── main.py              # FastAPI app — /analyze, /sentence, /health
│   ├── requirements.txt
│   └── render.yaml          # Render deployment config
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main app + sign state machine
    │   ├── index.css         # All styles
    │   └── components/
    │       ├── Webcam.jsx    # Camera capture + face overlay
    │       ├── GlossBar.jsx  # Sign word pills (top bar)
    │       ├── EmotionPanel.jsx
    │       ├── SentenceDisplay.jsx
    │       └── StatusBar.jsx
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── vercel.json           # Vercel deployment config
```

---

## 🔑 API Keys

- **Gemini API Key**: Get free at https://aistudio.google.com/app/apikey
- Set as `GEMINI_API_KEY` env var on Render

---

## Resume Bullets

```
• Built real-time sign language interpreter web app using MediaPipe (hand tracking),
  DeepFace (emotion analysis), and Gemini 2.5 Flash (NLU) via React + FastAPI
• Deployed full-stack application on Vercel (frontend) and Render (backend)
  with live webcam inference pipeline running at 5 FPS
• Implemented gesture state machine (hold-to-lock, dual-hand FINISH trigger)
  translating ASL-inspired gloss words to natural speech via Web Speech API
```
"# sign_lang-to-voice_system" 

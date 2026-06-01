"""
Tuba's Glasses — FastAPI Backend
Handles: frame analysis (MediaPipe + DeepFace), Gemini LLM, TTS
"""

import os, base64, io, threading, time, math, random
import numpy as np
import cv2
import requests
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json

app = FastAPI(title="Tuba's Glasses API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

# ── Gesture table ──────────────────────────────────────────────────────────────
GTABLE = [
    ("TECHNOLOGY", [1,1,1,1,1], 1),
    ("USE",        [0,1,1,0,0], 1),
    ("FOR",        [0,1,0,0,0], 1),
    ("HELP",       [1,0,0,0,0], 1),
    ("NOT",        [0,1,0,0,1], 1),
    ("WAR",        [0,0,0,0,0], 1),
    ("LIFE",       [0,1,1,1,1], 1),
    ("IMPROVE",    [0,0,1,1,0], 1),
    ("WORLD",      [0,0,0,1,1], 1),
    ("LOVE",       [1,1,0,0,1], 1),
    ("GOOD",       [1,1,0,0,0], 1),
    ("LEARN",      [1,0,1,0,0], 1),
    ("CARE",       [1,0,0,1,0], 1),
    ("VOICE",      [1,0,0,0,1], 1),
    ("AI",         [0,1,0,1,0], 1),
    ("HUMAN",      [0,0,1,0,0], 1),
    ("SMART",      [0,0,0,0,1], 1),
    ("THANK",      [0,0,0,1,0], 1),
    ("HELLO",      [1,1,1,1,1], 2),
]

def classify(fingers, num_hands):
    if not fingers or num_hands == 0:
        return None
    f = [int(b) for b in fingers[0]]
    for word, pat, minh in GTABLE:
        if num_hands >= minh and f == pat:
            return word
    best, bd = None, 999
    for word, pat, minh in GTABLE:
        if minh > 1:
            continue
        d = sum(a != b for a, b in zip(f, pat))
        if d < bd:
            bd, best = d, word
    return best if bd <= 1 else None

# ── LLM ───────────────────────────────────────────────────────────────────────
FALLBACKS = [
    (["use","technology","for","help","not","war"], "Use technology to create help, not war."),
    (["use","technology","help","not","war"],        "Use technology to create help, not war."),
    (["technology","for","help","not","war"],        "Use technology to create help, not war."),
    (["use","technology","not","war"],               "Use technology for good, not war."),
    (["use","technology","help"],                    "Use technology to help people."),
    (["technology","not","war"],                     "Technology should help, not cause war."),
    (["help","not","war"],                           "Help people, not wage war."),
    (["not","war"],                                  "Choose peace, not war."),
    (["use","technology"],                           "Use technology for good."),
]

def llm_sentence(words: list[str]) -> str:
    gloss = " ".join(words)
    if GEMINI_API_KEY:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text":
                    f"Sign language gloss words. Make a natural English sentence (max 12 words): {gloss}\n"
                    "Reply with ONLY the sentence text, no notes or formatting."
                }]}],
                "generationConfig": {"maxOutputTokens": 60, "temperature": 0.2}
            }
            r = requests.post(url, headers={"Content-Type": "application/json"},
                              json=payload, timeout=8)
            d = r.json()
            if "candidates" in d and d["candidates"]:
                return d["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            pass

    w = [x.lower() for x in words]
    for keys, sentence in FALLBACKS:
        if all(k in w for k in keys):
            return sentence
    kw = [x for x in words if x.lower() not in {"and", "the", "a", "is"}]
    return (" ".join(kw[:6]).lower().capitalize() + "." if kw else "Sign language to voice.")

# ── REST endpoints ─────────────────────────────────────────────────────────────
class FrameRequest(BaseModel):
    image_b64: str          # base64 JPEG/PNG from webcam

class SentenceRequest(BaseModel):
    words: list[str]

@app.post("/analyze")
async def analyze_frame(req: FrameRequest):
    """Decode frame → MediaPipe hands + face + DeepFace emotion."""
    try:
        img_bytes = base64.b64decode(req.image_b64)
        arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if frame is None:
            return {"error": "invalid image"}

        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        import mediapipe as mp
        hands_sol = mp.solutions.hands.Hands(
            static_image_mode=True, max_num_hands=2,
            min_detection_confidence=0.6)
        face_sol = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True, max_num_faces=1,
            min_detection_confidence=0.5)

        # Hands
        hr = hands_sol.process(rgb)
        hand_pts_list = []
        fingers_list = []
        both_open = False

        if hr.multi_hand_landmarks:
            for hlm in hr.multi_hand_landmarks[:2]:
                pts = {i: [lm.x * w, lm.y * h] for i, lm in enumerate(hlm.landmark)}
                hand_pts_list.append(pts)
                fs = []
                for tip, base in [(4,3),(8,5),(12,9),(16,13),(20,17)]:
                    fs.append(bool(pts[tip][1] < pts[base][1] - 5))
                fingers_list.append(fs)
            if len(fingers_list) == 2 and all(fingers_list[0]) and all(fingers_list[1]):
                both_open = True

        num_hands = len(hand_pts_list)
        gesture = classify(fingers_list, num_hands)

        # Face mesh
        fr = face_sol.process(rgb)
        face_box = None
        if fr.multi_face_landmarks:
            flm = fr.multi_face_landmarks[0]
            all_p = [(lm.x * w, lm.y * h) for lm in flm.landmark]
            xs = [p[0] for p in all_p]; ys = [p[1] for p in all_p]
            face_box = [min(xs)-10, min(ys)-10, max(xs)+10, max(ys)+10]

        # Emotion via DeepFace
        emotion = "Neutral"
        emo_scores = {"Happy":0,"Sad":0,"Neutral":1,"Angry":0,"Questioning":0,"Skeptical":0}
        try:
            from deepface import DeepFace
            tiny = cv2.resize(frame, (320, 180))
            result = DeepFace.analyze(tiny, actions=['emotion'],
                                      enforce_detection=False, silent=True)
            if result:
                em = result[0]['dominant_emotion'].lower()
                raw = result[0]['emotion']
                m = {'happy':'Happy','sad':'Sad','neutral':'Neutral','angry':'Angry',
                     'fear':'Questioning','disgust':'Skeptical','surprise':'Happy'}
                tot = sum(raw.values()) or 1
                emotion = m.get(em, 'Neutral')
                emo_scores = {
                    'Happy':    (raw.get('happy',0) + raw.get('surprise',0)) / tot,
                    'Sad':       raw.get('sad',0) / tot,
                    'Neutral':   raw.get('neutral',0) / tot,
                    'Angry':     raw.get('angry',0) / tot,
                    'Questioning': raw.get('fear',0) / tot,
                    'Skeptical': raw.get('disgust',0) / tot,
                }
        except Exception:
            pass

        hands_sol.close(); face_sol.close()

        return {
            "gesture": gesture,
            "fingers": fingers_list,
            "num_hands": num_hands,
            "both_open": both_open,
            "face_box": face_box,
            "emotion": emotion,
            "emo_scores": emo_scores,
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/sentence")
async def get_sentence(req: SentenceRequest):
    """Convert sign words → natural sentence via Gemini."""
    if not req.words:
        return {"sentence": ""}
    sentence = llm_sentence(req.words)
    return {"sentence": sentence}

@app.get("/health")
async def health():
    return {"status": "ok", "gemini": bool(GEMINI_API_KEY)}

import { useState, useRef, useEffect, useCallback } from "react";
import Webcam from "./components/Webcam";
import GlossBar from "./components/GlossBar";
import EmotionPanel from "./components/EmotionPanel";
import SentenceDisplay from "./components/SentenceDisplay";
import StatusBar from "./components/StatusBar";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const HOLD_TIME = 1.5;
const GAP_TIME  = 0.4;
const FIN_THRESH = 2.0;

export default function App() {
  const [words, setWords]         = useState([]);
  const [sentence, setSentence]   = useState("");
  const [pending, setPending]     = useState(false);
  const [emotion, setEmotion]     = useState("Neutral");
  const [emoScores, setEmoScores] = useState({ Happy:0, Sad:0, Neutral:1, Angry:0, Questioning:0, Skeptical:0 });
  const [gesture, setGesture]     = useState(null);
  const [signState, setSignState] = useState("IDLE"); // IDLE | HOLDING | LOCKED
  const [holdProg, setHoldProg]   = useState(0);
  const [finProg, setFinProg]     = useState(0);
  const [speaking, setSpeaking]   = useState(false);
  const [mode, setMode]           = useState(0);
  const [faceBox, setFaceBox]     = useState(null);
  const [numHands, setNumHands]   = useState(0);
  const [bothOpen, setBothOpen]   = useState(false);
  const [apiOk, setApiOk]         = useState(false);

  // Sign state machine refs
  const stateRef      = useRef("IDLE");
  const wordRef       = useRef(null);
  const timerRef      = useRef(0);
  const gapRef        = useRef(0);
  const finTimerRef   = useRef(0);
  const finDoneRef    = useRef(false);
  const wordsRef      = useRef([]);
  const lastReqRef    = useRef([]);
  const lastPrevRef   = useRef(null);
  const sentenceRef   = useRef("");

  // Health check
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then(r => r.json())
      .then(d => setApiOk(d.status === "ok"))
      .catch(() => setApiOk(false));
  }, []);

  const speak = useCallback((text) => {
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.onstart = () => setSpeaking(true);
    u.onend   = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, []);

  const requestSentence = useCallback(async (ws) => {
    if (JSON.stringify(ws) === JSON.stringify(lastReqRef.current)) return;
    lastReqRef.current = [...ws];
    setPending(true);
    try {
      const r = await fetch(`${API_BASE}/sentence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: ws }),
      });
      const d = await r.json();
      if (d.sentence && d.sentence !== sentenceRef.current) {
        sentenceRef.current = d.sentence;
        setSentence(d.sentence);
        setMode(m => Math.max(m, 2));
      }
    } catch { } finally {
      setPending(false);
    }
  }, []);

  const onFrame = useCallback(async (imageB64) => {
    const now = performance.now() / 1000;
    const dt = lastPrevRef.current ? Math.min(now - lastPrevRef.current, 0.1) : 0.033;
    lastPrevRef.current = now;

    // Post to backend
    try {
      const r = await fetch(`${API_BASE}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_b64: imageB64 }),
      });
      const d = await r.json();
      if (d.error) return;

      const { gesture: g, num_hands, both_open, face_box,
              emotion: em, emo_scores, fingers } = d;

      setGesture(g);
      setNumHands(num_hands);
      setBothOpen(both_open);
      setFaceBox(face_box);
      setEmotion(em);
      setEmoScores(emo_scores);

      // ── Sign state machine ──────────────────────────────────────────────────
      const handPresent = num_hands > 0;

      // FINISH gesture
      if (both_open && wordsRef.current.length > 0) {
        finTimerRef.current = Math.min(finTimerRef.current + dt, FIN_THRESH + 0.1);
        const fp = Math.min(1.0, finTimerRef.current / FIN_THRESH);
        setFinProg(fp);
        if (fp >= 1.0 && !finDoneRef.current) {
          finDoneRef.current = true;
          setMode(3);
          // Get final sentence
          const rr = await fetch(`${API_BASE}/sentence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words: wordsRef.current }),
          });
          const dd = await rr.json();
          const final = dd.sentence || sentenceRef.current;
          sentenceRef.current = final;
          setSentence(final);
          speak(final);
        }
      } else {
        finTimerRef.current = Math.max(0, finTimerRef.current - dt * 2);
        setFinProg(finTimerRef.current / FIN_THRESH);
        if (!both_open) finDoneRef.current = false;
      }

      // Word locking
      if (!both_open) {
        const state = stateRef.current;

        if (state === "IDLE") {
          if (g && handPresent) {
            wordRef.current = g; timerRef.current = 0; gapRef.current = 0;
            stateRef.current = "HOLDING";
            setSignState("HOLDING");
          }
        } else if (state === "HOLDING") {
          if (g === wordRef.current && handPresent) {
            timerRef.current += dt;
            const prog = Math.min(1.0, timerRef.current / HOLD_TIME);
            setHoldProg(prog);
            if (timerRef.current >= HOLD_TIME) {
              stateRef.current = "LOCKED";
              setSignState("LOCKED");
              setHoldProg(1.0);
              const locked = wordRef.current;
              const newWords = [...wordsRef.current, locked].slice(-10);
              wordsRef.current = newWords;
              setWords([...newWords]);
              speak(locked);
              setMode(m => Math.max(m, 1));
              requestSentence(newWords);
              setMode(m => Math.max(m, 2));
            }
          } else {
            wordRef.current = g; timerRef.current = 0; setHoldProg(0);
            if (!(g && handPresent)) { stateRef.current = "IDLE"; setSignState("IDLE"); }
          }
        } else if (state === "LOCKED") {
          setHoldProg(0);
          if (!handPresent) {
            gapRef.current += dt;
            if (gapRef.current >= GAP_TIME) {
              stateRef.current = "IDLE"; gapRef.current = 0; wordRef.current = null;
              setSignState("IDLE");
            }
          } else {
            gapRef.current = 0;
          }
        }
      }
    } catch { }
  }, [speak, requestSentence]);

  const handleClear = useCallback(() => {
    setWords([]); setSentence(""); setPending(false);
    setSignState("IDLE"); setHoldProg(0); setFinProg(0);
    setMode(0); stateRef.current = "IDLE"; wordRef.current = null;
    timerRef.current = 0; gapRef.current = 0;
    finTimerRef.current = 0; finDoneRef.current = false;
    wordsRef.current = []; lastReqRef.current = [];
    sentenceRef.current = "";
    window.speechSynthesis.cancel();
  }, []);

  const showFinish = bothOpen && words.length > 0;

  return (
    <div className="app-root">
      <GlossBar words={words} gesture={gesture} signState={signState} onClear={handleClear} />
      <div className="main-area">
        <Webcam onFrame={onFrame} faceBox={faceBox} numHands={numHands} />
        <EmotionPanel scores={emoScores} emotion={emotion} />
      </div>
      <SentenceDisplay
        sentence={sentence} pending={pending}
        words={words} signState={signState}
        holdProg={holdProg} finProg={finProg}
        showFinish={showFinish}
        currentWord={wordRef.current}
      />
      <StatusBar mode={mode} speaking={speaking} apiOk={apiOk} numHands={numHands} />
    </div>
  );
}

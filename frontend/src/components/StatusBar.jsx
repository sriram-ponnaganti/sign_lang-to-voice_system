export default function StatusBar({ mode, speaking, apiOk, numHands }) {
  const modules = [
    { label: "Hand\nTracking",      active: numHands > 0 },
    { label: "Emotion\nDetection",  active: true },
    { label: "LLM\nInterpretation", active: mode >= 2 },
    { label: "Voice\nOutput",       active: speaking },
  ];

  return (
    <footer className="status-bar">
      {modules.map((m, i) => (
        <div key={i} className={`status-module ${m.active ? "on" : ""}`}>
          {m.label.split("\n").map((line, j) => (
            <span key={j} className="module-line">{line}</span>
          ))}
          {m.active && m.label.includes("Voice") && (
            <div className="voice-dots">
              {Array.from({length: 9}, (_,k) => (
                <span key={k} className="vdot" style={{
                  animationDelay: `${k * 0.08}s`,
                  animationPlayState: speaking ? "running" : "paused"
                }} />
              ))}
            </div>
          )}
        </div>
      ))}
      <div className={`api-badge ${apiOk ? "ok" : "err"}`}>
        API {apiOk ? "●" : "○"}
      </div>
    </footer>
  );
}

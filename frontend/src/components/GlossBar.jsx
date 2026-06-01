const PILL_COLS = [
  "#3cdc3c","#ffdc50","#96dcff","#dcdc00","#1ea0ff","#2828dc","#b464ff","#ffffff"
];

export default function GlossBar({ words, gesture, signState, onClear }) {
  return (
    <header className="gloss-bar">
      <span className="gloss-label">GLOSS</span>
      <div className="gloss-pills">
        {words.length === 0 && signState === "IDLE" && (
          <span className="gloss-placeholder">waiting for signs…</span>
        )}
        {words.map((w, i) => (
          <span key={i} className="gloss-pill" style={{ color: PILL_COLS[i % PILL_COLS.length] }}>
            <span className="pill-dot" style={{ background: PILL_COLS[i % PILL_COLS.length] }} />
            {w}
          </span>
        ))}
        {gesture && signState === "HOLDING" && (
          <span className="gloss-pill detecting">{gesture}…</span>
        )}
      </div>
      <div className="gloss-right">
        <span className="app-title">Tuba's Glasses</span>
        <button className="clear-btn" onClick={onClear}>Clear</button>
      </div>
    </header>
  );
}

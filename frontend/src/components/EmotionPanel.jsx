const EMO_COLS = {
  Happy: "#3cdc3c", Sad: "#dc643c", Neutral: "#b4b4b4",
  Angry: "#2828dc", Questioning: "#1ea0ff", Skeptical: "#00bedc"
};
const ORDER = ["Happy","Sad","Neutral","Angry","Questioning","Skeptical"];

export default function EmotionPanel({ scores, emotion }) {
  return (
    <aside className="emotion-panel">
      <div className="emotion-title">Emotion</div>
      {ORDER.map(em => {
        const sc = scores[em] || 0;
        const isTop = em === emotion;
        return (
          <div key={em} className={`emo-row ${isTop ? "emo-top" : ""}`}>
            <span className="emo-dot" style={{ background: EMO_COLS[em],
              boxShadow: isTop ? `0 0 6px ${EMO_COLS[em]}` : "none" }} />
            <span className="emo-name" style={{ color: isTop ? "#fff" : "#888" }}>{em}</span>
            <div className="emo-bar-bg">
              <div className="emo-bar-fill"
                style={{ width: `${sc * 100}%`, background: EMO_COLS[em] }} />
            </div>
          </div>
        );
      })}
    </aside>
  );
}

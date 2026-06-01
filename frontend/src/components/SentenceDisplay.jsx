export default function SentenceDisplay({
  sentence, pending, words, signState,
  holdProg, finProg, showFinish, currentWord
}) {
  return (
    <div className="sentence-area">
      {/* Sentence text */}
      <div className="sentence-text">
        {sentence || (pending ? "interpreting…" : "")}
        {pending && <span className="dot-blink">●</span>}
      </div>

      {/* Word lock widget */}
      {!showFinish && currentWord && (
        <div className={`lock-widget ${signState === "LOCKED" ? "locked" : ""}`}>
          <div className="lock-word">{currentWord}</div>
          {signState === "HOLDING" && (
            <>
              <div className="lock-bar-bg">
                <div className="lock-bar-fill" style={{ width: `${holdProg * 100}%` }} />
              </div>
              <div className="lock-hint">{Math.round(holdProg * 100)}%  hold still…</div>
            </>
          )}
          {signState === "LOCKED" && (
            <div className="lock-hint locked">LOCKED! lower hand for next sign</div>
          )}
        </div>
      )}

      {/* Finish gesture widget */}
      {showFinish && (
        <div className="finish-widget">
          <div className="finish-label">FINISH — hold both hands open</div>
          <div className="lock-bar-bg">
            <div className="lock-bar-fill finish" style={{ width: `${finProg * 100}%` }} />
          </div>
          <div className="lock-hint">{Math.round(finProg * 100)}%</div>
        </div>
      )}
    </div>
  );
}

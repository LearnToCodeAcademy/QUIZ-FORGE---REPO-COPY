import React, { useState, useCallback } from "react";

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  hint: string;
}

export interface FlashcardDeck {
  deck_title: string;
  card_count: number;
  source_summary: string;
  cards: Flashcard[];
}

interface Props {
  deck: FlashcardDeck;
  onBack: () => void;
}

type CardStatus = "unseen" | "known" | "review";

export default function FlashcardView({ deck, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({});
  const [done, setDone] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<number[]>(deck.cards.map((_, i) => i));

  const cards = shuffleOrder.map((i) => deck.cards[i]);
  const card = cards[index];
  const progress = ((index) / cards.length) * 100;
  const knownCount = Object.values(statuses).filter((s) => s === "known").length;
  const reviewCount = Object.values(statuses).filter((s) => s === "review").length;

  const goNext = useCallback((status?: CardStatus) => {
    if (status && card) {
      setStatuses((prev) => ({ ...prev, [card.id]: status }));
    }
    setFlipped(false);
    setShowHint(false);
    if (index + 1 >= cards.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }, [index, cards.length, card]);

  const goPrev = useCallback(() => {
    if (index === 0) return;
    setFlipped(false);
    setShowHint(false);
    setIndex(index - 1);
  }, [index]);

  const handleRestart = () => {
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
    setStatuses({});
    setDone(false);
  };

  const handleShuffle = () => {
    const arr = deck.cards.map((_, i) => i);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    setShuffleOrder(arr);
    setIndex(0);
    setFlipped(false);
    setShowHint(false);
    setStatuses({});
    setDone(false);
  };

  const getStatusColor = (s: CardStatus) => {
    if (s === "known") return "#10b981";
    if (s === "review") return "#f59e0b";
    return "var(--text-muted)";
  };

  if (done) {
    return (
      <div className="fc-done page-transition">
        <div className="fc-done-card">
          <div className="fc-done-emoji">🎉</div>
          <h2 className="fc-done-title">Deck Complete!</h2>
          <p className="fc-done-sub">You've gone through all {cards.length} flashcards</p>
          <div className="fc-done-stats">
            <div className="fc-done-stat fc-stat-known">
              <span className="fc-done-stat-val">{knownCount}</span>
              <span className="fc-done-stat-lbl">✓ Got it</span>
            </div>
            <div className="fc-done-stat fc-stat-review">
              <span className="fc-done-stat-val">{reviewCount}</span>
              <span className="fc-done-stat-lbl">↺ Need review</span>
            </div>
            <div className="fc-done-stat">
              <span className="fc-done-stat-val">{cards.length - knownCount - reviewCount}</span>
              <span className="fc-done-stat-lbl">— Skipped</span>
            </div>
          </div>
          <div className="fc-done-actions">
            <button className="btn-primary" onClick={handleRestart}>Study Again</button>
            <button className="btn-secondary" onClick={handleShuffle}>Shuffle & Restart</button>
            <button className="btn-ghost" onClick={onBack}>← Back</button>
          </div>
          {reviewCount > 0 && (
            <p className="fc-done-tip">💡 Tip: Focus on the {reviewCount} card{reviewCount > 1 ? "s" : ""} you marked for review.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fc-root page-transition">
      <div className="fc-header">
        <button className="btn-ghost fc-back-btn" onClick={onBack}>← Back</button>
        <div className="fc-header-info">
          <h2 className="fc-deck-title">{deck.deck_title}</h2>
          <span className="fc-counter">{index + 1} / {cards.length}</span>
        </div>
        <button className="btn-ghost fc-shuffle-btn" onClick={handleShuffle} title="Shuffle">
          🔀
        </button>
      </div>

      <div className="fc-progress-bar">
        <div className="fc-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="fc-dots-row">
        {cards.map((c, i) => (
          <button
            key={i}
            className={`fc-dot ${i === index ? "fc-dot-current" : ""} ${statuses[c.id] === "known" ? "fc-dot-known" : statuses[c.id] === "review" ? "fc-dot-review" : i < index ? "fc-dot-seen" : ""}`}
            onClick={() => { setIndex(i); setFlipped(false); setShowHint(false); }}
            title={`Card ${i + 1}`}
            style={{ background: statuses[c.id] ? getStatusColor(statuses[c.id]) : undefined }}
          />
        ))}
      </div>

      <div className="fc-legend">
        <span className="fc-legend-item fc-legend-known">✓ {knownCount} got it</span>
        <span className="fc-legend-item fc-legend-review">↺ {reviewCount} review</span>
      </div>

      <div className={`fc-card-wrapper`} onClick={() => { setFlipped(!flipped); setShowHint(false); }}>
        <div className={`fc-card ${flipped ? "fc-card-flipped" : ""}`}>
          <div className="fc-card-face fc-card-front">
            <div className="fc-card-label">QUESTION</div>
            <div className="fc-card-text">{card.front}</div>
            {!flipped && (
              <div className="fc-card-tap-hint">
                <span>Tap to reveal answer</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 13l5 5 5-5M7 6l5 5 5-5"/></svg>
              </div>
            )}
          </div>
          <div className="fc-card-face fc-card-back">
            <div className="fc-card-label">ANSWER</div>
            <div className="fc-card-text">{card.back}</div>
          </div>
        </div>
      </div>

      {!flipped && (
        <div className="fc-hint-area">
          {showHint ? (
            <div className="fc-hint-bubble">💡 {card.hint}</div>
          ) : (
            <button className="fc-hint-btn" onClick={(e) => { e.stopPropagation(); setShowHint(true); }}>
              Show hint
            </button>
          )}
        </div>
      )}

      {flipped ? (
        <div className="fc-grade-row">
          <p className="fc-grade-label">How did you do?</p>
          <div className="fc-grade-btns">
            <button className="fc-grade-btn fc-grade-review" onClick={() => goNext("review")}>
              ↺ Need review
            </button>
            <button className="fc-grade-btn fc-grade-known" onClick={() => goNext("known")}>
              ✓ Got it!
            </button>
          </div>
        </div>
      ) : (
        <div className="fc-nav-row">
          <button className="btn-secondary" onClick={goPrev} disabled={index === 0}>← Prev</button>
          <button className="btn-ghost" onClick={() => goNext()}>Skip →</button>
        </div>
      )}
    </div>
  );
}

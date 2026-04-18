import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Quiz } from "../types";

interface Props {
  quiz: Quiz;
  onBack: () => void;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

interface Card {
  id: string;
  pairId: number;
  text: string;
  side: "term" | "def";
  status: "hidden" | "flipped" | "matched";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildPairs(quiz: Quiz, maxPairs = 8) {
  const pairs: { term: string; def: string }[] = [];
  for (const q of quiz.questions) {
    if (pairs.length >= maxPairs) break;
    let term = "";
    let def = "";
    if ((q.type === "mcq" || q.type === "true_false") && q.choices && q.answer_index != null) {
      const short = q.prompt.replace(/^(what is |define |which )/i, "").replace(/\?$/, "").trim();
      if (short.length > 60) continue;
      term = short;
      def = q.choices[q.answer_index];
    } else if (q.answers && q.answers.length > 0 && q.prompt.length <= 80) {
      term = q.prompt.replace(/\?$/, "").trim();
      def = q.answers[0];
    }
    if (term.length >= 3 && def.length >= 2) pairs.push({ term, def });
  }
  return pairs.slice(0, maxPairs);
}

export default function MatchingPairsView({ quiz, onBack }: Props) {
  const pairs = useRef(buildPairs(quiz)).current;

  const buildCards = useCallback((): Card[] => {
    const cards: Card[] = [];
    pairs.forEach((p, i) => {
      cards.push({ id: `t${i}`, pairId: i, text: p.term, side: "term", status: "hidden" });
      cards.push({ id: `d${i}`, pairId: i, text: p.def, side: "def", status: "hidden" });
    });
    return shuffle(cards);
  }, [pairs]);

  const [cards, setCards] = useState<Card[]>(buildCards);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (done && timerRef.current) clearInterval(timerRef.current);
  }, [done]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleCardClick = useCallback((cardId: string) => {
    if (locked) return;
    const card = cards.find((c) => c.id === cardId);
    if (!card || card.status !== "hidden" || flipped.includes(cardId)) return;

    const newFlipped = [...flipped, cardId];
    setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status: "flipped" } : c));

    if (newFlipped.length === 2) {
      setAttempts((a) => a + 1);
      setLocked(true);
      const [aId, bId] = newFlipped;
      const cardA = cards.find((c) => c.id === aId)!;
      const cardB = cards.find((c) => c.id === bId)!;

      if (cardA.pairId === cardB.pairId && cardA.side !== cardB.side) {
        setCards((prev) => prev.map((c) => (c.id === aId || c.id === bId) ? { ...c, status: "matched" } : c));
        const newMatches = matches + 1;
        setMatches(newMatches);
        setFlipped([]);
        setLocked(false);
        if (newMatches === pairs.length) {
          setTimeout(() => setDone(true), 400);
        }
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c) => (c.id === aId || c.id === bId) && c.status === "flipped" ? { ...c, status: "hidden" } : c));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    } else {
      setFlipped(newFlipped);
    }
  }, [locked, cards, flipped, matches, pairs.length]);

  const handleRestart = () => {
    setCards(buildCards());
    setFlipped([]);
    setMatches(0);
    setAttempts(0);
    setDone(false);
    setTimeElapsed(0);
    setLocked(false);
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
  };

  if (pairs.length < 2) {
    return (
      <div className="pairs-root page-transition">
        <div className="game-empty">
          <div className="game-empty-icon">😕</div>
          <h2>Not enough pairs</h2>
          <p>Generate a quiz with MCQ or identification questions to play Matching Pairs.</p>
          <button className="btn-primary" onClick={onBack}>← Go Back</button>
        </div>
      </div>
    );
  }

  if (done) {
    const accuracy = Math.round((pairs.length / Math.max(attempts, pairs.length)) * 100);
    return (
      <div className="pairs-done page-transition">
        <div className="game-done-card">
          <div className="game-done-emoji">🧩</div>
          <h2>All Pairs Matched!</h2>
          <div className="game-done-stats-row">
            <div className="game-done-stat"><span>⏱</span><span>{formatTime(timeElapsed)}</span><span>Time</span></div>
            <div className="game-done-stat"><span>🎯</span><span>{attempts}</span><span>Attempts</span></div>
            <div className="game-done-stat"><span>💯</span><span>{accuracy}%</span><span>Accuracy</span></div>
          </div>
          <div className="game-done-actions">
            <button className="btn-primary" onClick={handleRestart}>Play Again</button>
            <button className="btn-ghost" onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const cols = pairs.length <= 4 ? 2 : Math.min(4, Math.ceil(Math.sqrt(cards.length)));

  return (
    <div className="pairs-root page-transition">
      <div className="game-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div className="game-header-center">
          <span className="game-label">🧩 Matching Pairs</span>
          <span className="game-counter">{matches} / {pairs.length} matched</span>
        </div>
        <div className="game-header-right">
          <span className="game-timer">⏱ {formatTime(timeElapsed)}</span>
          <span className="game-score-badge">🎯 {attempts}</span>
        </div>
      </div>

      <div className="pairs-instruction">Flip two cards to find a matching term and definition</div>

      <div className="pairs-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => (
          <button
            key={card.id}
            className={`pairs-card pairs-card-${card.status} ${card.side === "term" ? "pairs-card-term" : "pairs-card-def"}`}
            onClick={() => handleCardClick(card.id)}
            disabled={card.status !== "hidden" || locked}
          >
            <div className="pairs-card-inner">
              <div className="pairs-card-front">
                <span className="pairs-card-question-mark">?</span>
              </div>
              <div className="pairs-card-back">
                <span className="pairs-card-badge">{card.side === "term" ? "TERM" : "DEF"}</span>
                <span className="pairs-card-text">{card.text}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

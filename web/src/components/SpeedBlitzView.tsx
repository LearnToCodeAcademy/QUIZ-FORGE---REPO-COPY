import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Quiz } from "../types";

interface Props {
  quiz: Quiz;
  onBack: () => void;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

const TIME_PER_Q = 12;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface BlitzQuestion {
  prompt: string;
  choices: string[];
  correctIdx: number;
}

function buildBlitzQuestions(quiz: Quiz): BlitzQuestion[] {
  return quiz.questions
    .filter((q) => (q.type === "mcq" || q.type === "true_false") && q.choices && q.answer_index != null)
    .map((q) => ({ prompt: q.prompt, choices: q.choices!, correctIdx: q.answer_index! }));
}

export default function SpeedBlitzView({ quiz, onBack }: Props) {
  const allQuestions = useRef(shuffle(buildBlitzQuestions(quiz))).current;
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_Q);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const totalTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setFeedback(null);
    setSelectedIdx(null);
    if (index + 1 >= allQuestions.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setTimeLeft(TIME_PER_Q);
    }
  }, [index, allQuestions.length]);

  useEffect(() => {
    if (done) { if (timerRef.current) clearInterval(timerRef.current); return; }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setFeedback("timeout");
          setStreak(0);
          setTimeout(advance, 1000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [index, done]);

  useEffect(() => {
    totalTimerRef.current = setInterval(() => setTotalTime((t) => t + 1), 1000);
    return () => { if (totalTimerRef.current) clearInterval(totalTimerRef.current); };
  }, []);

  useEffect(() => {
    if (done && totalTimerRef.current) clearInterval(totalTimerRef.current);
  }, [done]);

  const handleAnswer = useCallback((choiceIdx: number) => {
    if (feedback !== null) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setSelectedIdx(choiceIdx);
    const q = allQuestions[index];
    if (choiceIdx === q.correctIdx) {
      setFeedback("correct");
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBestStreak((b) => Math.max(b, newStreak));
    } else {
      setFeedback("wrong");
      setStreak(0);
    }
    setTimeout(advance, 900);
  }, [feedback, index, allQuestions, advance, streak]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (allQuestions.length === 0) {
    return (
      <div className="blitz-root page-transition">
        <div className="game-empty">
          <div className="game-empty-icon">⚡</div>
          <h2>No MCQ questions found</h2>
          <p>Speed Blitz works with Multiple Choice questions. Try generating an MCQ quiz first.</p>
          <button className="btn-primary" onClick={onBack}>← Go Back</button>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / allQuestions.length) * 100);
    const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "⭐" : pct >= 50 ? "💪" : "📚";
    return (
      <div className="blitz-done page-transition">
        <div className="game-done-card">
          <div className="game-done-emoji">{emoji}</div>
          <h2>Speed Blitz Complete!</h2>
          <div className="game-done-score">
            <span className="game-done-val">{score}</span>
            <span className="game-done-total">/ {allQuestions.length}</span>
          </div>
          <div className="game-done-pct" style={{ color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</div>
          <div className="game-done-stats-row">
            <div className="game-done-stat"><span>⏱</span><span>{formatTime(totalTime)}</span><span>Time</span></div>
            <div className="game-done-stat"><span>🔥</span><span>{bestStreak}</span><span>Best Streak</span></div>
            <div className="game-done-stat"><span>✓</span><span>{score}</span><span>Correct</span></div>
          </div>
          <div className="game-done-actions">
            <button className="btn-primary" onClick={() => { setIndex(0); setScore(0); setStreak(0); setBestStreak(0); setDone(false); setTotalTime(0); setTimeLeft(TIME_PER_Q); setFeedback(null); setSelectedIdx(null); totalTimerRef.current = setInterval(() => setTotalTime((t) => t + 1), 1000); }}>Play Again</button>
            <button className="btn-ghost" onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const q = allQuestions[index];
  const timerPct = (timeLeft / TIME_PER_Q) * 100;
  const timerColor = timerPct > 60 ? "#10b981" : timerPct > 30 ? "#f59e0b" : "#ef4444";

  return (
    <div className="blitz-root page-transition">
      <div className="game-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div className="game-header-center">
          <span className="game-label">⚡ Speed Blitz</span>
          <span className="game-counter">{index + 1} / {allQuestions.length}</span>
        </div>
        <div className="game-header-right">
          <span className="game-score-badge">⭐ {score}</span>
          {streak >= 2 && <span className="blitz-streak">🔥 {streak}</span>}
        </div>
      </div>

      <div className="blitz-timer-bar-wrap">
        <div className="blitz-timer-bar" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>
      <div className="blitz-timer-text" style={{ color: timerColor }}>
        {timeLeft}s
        {feedback === "timeout" && <span className="blitz-timeout-label"> — Time's up!</span>}
      </div>

      <div className={`blitz-question-card ${feedback === "correct" ? "blitz-q-correct" : feedback === "wrong" || feedback === "timeout" ? "blitz-q-wrong" : ""}`}>
        <div className="blitz-q-label">Question {index + 1}</div>
        <div className="blitz-q-text">{q.prompt}</div>
      </div>

      <div className="blitz-choices">
        {q.choices.map((choice, ci) => {
          let cls = "blitz-choice";
          if (feedback !== null) {
            if (ci === q.correctIdx) cls += " blitz-choice-correct";
            else if (ci === selectedIdx) cls += " blitz-choice-wrong";
            else cls += " blitz-choice-dim";
          }
          return (
            <button
              key={ci}
              className={cls}
              onClick={() => handleAnswer(ci)}
              disabled={feedback !== null}
            >
              <span className="blitz-choice-letter">{String.fromCharCode(65 + ci)}</span>
              <span className="blitz-choice-text">{choice}</span>
              {feedback !== null && ci === q.correctIdx && <span className="blitz-check">✓</span>}
              {feedback !== null && ci === selectedIdx && ci !== q.correctIdx && <span className="blitz-x">✗</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

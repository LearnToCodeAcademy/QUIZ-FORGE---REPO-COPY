import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Quiz } from "../types";

interface Props {
  quiz: Quiz;
  onBack: () => void;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function scrambleWord(word: string): string {
  const arr = word.split("");
  let scrambled = arr;
  let tries = 0;
  while (scrambled.join("") === word && tries < 30) {
    scrambled = shuffle(arr);
    tries++;
  }
  return scrambled.join("");
}

interface ScrambleQuestion {
  prompt: string;
  answer: string;
  letters: string[];
}

function buildScrambleQuestions(quiz: Quiz): ScrambleQuestion[] {
  const qs: ScrambleQuestion[] = [];
  for (const q of quiz.questions) {
    let answer = "";
    if ((q.type === "mcq" || q.type === "true_false") && q.choices && q.answer_index != null) {
      answer = q.choices[q.answer_index];
    } else if (q.answers && q.answers.length > 0) {
      answer = q.answers[0];
    }
    if (!answer || answer.length < 3) continue;
    const letters = shuffle(answer.replace(/\s/g, "_").split(""));
    qs.push({ prompt: q.prompt, answer, letters });
  }
  return qs;
}

export default function WordScrambleView({ quiz, onBack, onNotify }: Props) {
  const questions = useRef(buildScrambleQuestions(quiz)).current;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number[]>([]);
  const [used, setUsed] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (done && timerRef.current) clearInterval(timerRef.current);
  }, [done]);

  const q = questions[index];
  const progress = (index / questions.length) * 100;
  const assembled = selected.map((si) => q?.letters[si]?.replace("_", " ") ?? "").join("");

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const handleLetterClick = useCallback((li: number) => {
    if (status !== "idle") return;
    if (used.includes(li)) return;
    const newSelected = [...selected, li];
    const newUsed = [...used, li];
    setSelected(newSelected);
    setUsed(newUsed);
    const assembledNow = newSelected.map((si) => q.letters[si].replace("_", " ")).join("");
    if (assembledNow.length === q.answer.length) {
      if (assembledNow.toLowerCase() === q.answer.toLowerCase()) {
        setStatus("correct");
        setScore((s) => s + 1);
        setTimeout(advance, 900);
      } else {
        setStatus("wrong");
        setTimeout(() => { setSelected([]); setUsed([]); setStatus("idle"); }, 800);
      }
    }
  }, [selected, used, q, status]);

  const handleRemoveLast = () => {
    if (status !== "idle" || selected.length === 0) return;
    const newSelected = selected.slice(0, -1);
    const removedIdx = selected[selected.length - 1];
    setSelected(newSelected);
    setUsed(used.filter((u) => u !== removedIdx));
  };

  const handleClear = () => {
    if (status !== "idle") return;
    setSelected([]);
    setUsed([]);
  };

  const advance = () => {
    setStatus("idle");
    setSelected([]);
    setUsed([]);
    if (index + 1 >= questions.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="scramble-root page-transition">
        <div className="game-empty">
          <div className="game-empty-icon">😕</div>
          <h2>No scrambleable answers</h2>
          <p>Try generating a quiz with MCQ or identification questions.</p>
          <button className="btn-primary" onClick={onBack}>← Go Back</button>
        </div>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "⭐" : pct >= 50 ? "💪" : "📚";
    return (
      <div className="scramble-done page-transition">
        <div className="game-done-card">
          <div className="game-done-emoji">{emoji}</div>
          <h2>Word Scramble Done!</h2>
          <div className="game-done-score">
            <span className="game-done-val">{score}</span>
            <span className="game-done-total">/ {questions.length}</span>
          </div>
          <div className="game-done-pct" style={{ color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>{pct}%</div>
          <div className="game-done-stats-row">
            <div className="game-done-stat"><span>⏱</span><span>{formatTime(timeElapsed)}</span><span>Time</span></div>
            <div className="game-done-stat"><span>✓</span><span>{score}</span><span>Correct</span></div>
            <div className="game-done-stat"><span>✗</span><span>{questions.length - score}</span><span>Skipped</span></div>
          </div>
          <div className="game-done-actions">
            <button className="btn-primary" onClick={() => { setIndex(0); setScore(0); setDone(false); setTimeElapsed(0); setSelected([]); setUsed([]); setStatus("idle"); timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000); }}>Play Again</button>
            <button className="btn-ghost" onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const remaining = q.letters.map((_, i) => i).filter((i) => !used.includes(i));

  return (
    <div className="scramble-root page-transition">
      <div className="game-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div className="game-header-center">
          <span className="game-label">🔤 Word Scramble</span>
          <span className="game-counter">{index + 1} / {questions.length}</span>
        </div>
        <div className="game-header-right">
          <span className="game-score-badge">⭐ {score}</span>
          <span className="game-timer">⏱ {formatTime(timeElapsed)}</span>
        </div>
      </div>

      <div className="game-progress-bar">
        <div className="game-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="scramble-prompt-card">
        <div className="scramble-prompt-label">Question {index + 1}</div>
        <div className="scramble-prompt-text">{q.prompt}</div>
        <div className="scramble-instruction">Tap the letters in the correct order to form the answer</div>
      </div>

      <div className={`scramble-assembled ${status === "correct" ? "scramble-correct" : status === "wrong" ? "scramble-wrong" : ""}`}>
        {assembled.length > 0 ? (
          <span className="scramble-assembled-text">{assembled}</span>
        ) : (
          <span className="scramble-assembled-placeholder">Tap letters below...</span>
        )}
        {status === "correct" && <span className="scramble-check">✓</span>}
        {status === "wrong" && <span className="scramble-x">✗</span>}
      </div>

      <div className="scramble-letter-bank">
        {q.letters.map((letter, li) => (
          <button
            key={li}
            className={`scramble-letter ${used.includes(li) ? "scramble-letter-used" : ""}`}
            onClick={() => handleLetterClick(li)}
            disabled={used.includes(li) || status !== "idle"}
          >
            {letter === "_" ? "⎵" : letter}
          </button>
        ))}
      </div>

      <div className="scramble-controls">
        <button className="btn-secondary" onClick={handleRemoveLast} disabled={selected.length === 0 || status !== "idle"}>⌫ Remove</button>
        <button className="btn-ghost" onClick={handleClear} disabled={selected.length === 0 || status !== "idle"}>Clear</button>
        <button className="btn-ghost scramble-skip" onClick={advance} disabled={status !== "idle"}>Skip →</button>
      </div>
    </div>
  );
}

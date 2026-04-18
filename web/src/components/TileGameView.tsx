import React, { useState, useEffect, useCallback, useRef } from "react";
import type { Quiz } from "../types";

interface Props {
  quiz: Quiz;
  onBack: () => void;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

type Phase = "intro" | "reveal" | "lower" | "shuffle" | "pick" | "result" | "done";

interface RoundQuestion {
  prompt: string;
  answer: string;
}

function buildQuestions(quiz: Quiz): RoundQuestion[] {
  const qs: RoundQuestion[] = [];
  for (const q of quiz.questions) {
    let answer = "";
    if ((q.type === "mcq" || q.type === "true_false") && q.choices && q.answer_index != null) {
      answer = q.choices[q.answer_index];
    } else if (q.answers && q.answers.length > 0) {
      answer = q.answers[0];
    }
    if (answer.trim()) qs.push({ prompt: q.prompt, answer });
  }
  return qs;
}

function generateSwaps(count: number): [number, number][] {
  const swaps: [number, number][] = [];
  const pairs: [number, number][] = [[0, 1], [1, 2], [0, 2]];
  let last = -1;
  for (let i = 0; i < count; i++) {
    let pick: number;
    do { pick = Math.floor(Math.random() * pairs.length); } while (pick === last);
    swaps.push(pairs[pick]);
    last = pick;
  }
  return swaps;
}

function formatTime(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* Three visually distinct cups — NO clipPath (not reliable on all mobile browsers) */
const CUP_COLORS = [
  {
    rimTop: "#ff6b6b",
    rimBot: "#c0392b",
    bodyTop: "#e74c3c",
    bodyBot: "#922b21",
    baseCol: "#7b241c",
  },
  {
    rimTop: "#f9ca24",
    rimBot: "#e67e22",
    bodyTop: "#f39c12",
    bodyBot: "#b7770d",
    baseCol: "#9a6009",
  },
  {
    rimTop: "#6ab04c",
    rimBot: "#1e8449",
    bodyTop: "#27ae60",
    bodyBot: "#1a5e35",
    baseCol: "#145a32",
  },
];

/* Slot left-% values inside the .shell-table container */
const SLOT_LEFT = ["4%", "36%", "68%"];

interface CupProps {
  cupIdx: number;          // 0/1/2 — determines color
  slot: number;            // 0/1/2 — determines position
  lifted: boolean;
  isWinner: boolean;
  phase: Phase;
  pickedSlot: number | null;
  onClick: (slot: number) => void;
  answer: string;
  isAnimating: boolean;
}

function Cup({ cupIdx, slot, lifted, isWinner, phase, pickedSlot, onClick, answer, isAnimating }: CupProps) {
  const col = CUP_COLORS[cupIdx % 3];
  const isClicked = pickedSlot === slot;
  const isCorrectReveal = phase === "result" && isWinner;
  const isWrongReveal  = phase === "result" && isClicked && !isWinner;

  const cupY = lifted ? -120 : 0;

  /* Ball under cup — shown while lifted or winner revealed */
  const showBall = (isWinner && lifted) || (phase === "result" && isWinner);

  const glowFilter = isCorrectReveal
    ? "drop-shadow(0 0 18px #22c55e) drop-shadow(0 0 8px #22c55e)"
    : isWrongReveal
    ? "drop-shadow(0 0 18px #ef4444)"
    : "none";

  return (
    <div
      style={{
        position: "absolute",
        left: SLOT_LEFT[slot],
        bottom: 0,
        width: 80,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        cursor: phase === "pick" && !isAnimating ? "pointer" : "default",
        /* Animate ONLY left so we can smoothly slide cups between slots */
        transition: "left 0.6s cubic-bezier(0.4,0,0.2,1)",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
      }}
      onClick={() => phase === "pick" && !isAnimating && onClick(slot)}
    >
      {/* ── Ball (answer card) sitting on the table under the cup ── */}
      <div style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 30%, #fde68a 0%, #f59e0b 55%, #b45309 100%)",
        boxShadow: showBall ? "0 6px 24px rgba(245,158,11,0.9), 0 0 0 3px rgba(253,230,138,0.6)" : "none",
        marginBottom: 4,
        opacity: showBall ? 1 : 0,
        transform: showBall ? "scale(1)" : "scale(0.3)",
        transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 4px",
        textAlign: "center",
        lineHeight: 1.15,
        pointerEvents: "none",
      }}>
        {showBall && (
          <span style={{
            fontSize: answer.length > 16 ? 7 : 9,
            fontWeight: 800,
            color: "#7c2d12",
            wordBreak: "break-word",
          }}>
            {answer.length > 22 ? answer.slice(0, 20) + "…" : answer}
          </span>
        )}
      </div>

      {/* ── Cup (rim + body + base) — lifts upward ── */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `translateY(${cupY}px)`,
        transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1)",
        filter: glowFilter,
      }}>

        {/* Rim — wide elliptical cap at top */}
        <div style={{
          width: 80,
          height: 18,
          borderRadius: "50% 50% 30% 30% / 80% 80% 30% 30%",
          background: `linear-gradient(180deg, ${col.rimTop}, ${col.rimBot})`,
          boxShadow: "0 3px 10px rgba(0,0,0,0.4)",
          position: "relative",
          zIndex: 2,
          flexShrink: 0,
        }}>
          {/* Specular highlight on rim */}
          <div style={{
            position: "absolute",
            top: 3,
            left: "18%",
            width: "28%",
            height: 5,
            borderRadius: 3,
            background: "rgba(255,255,255,0.35)",
          }} />
        </div>

        {/* Body — slightly narrower, rounded bottom */}
        <div style={{
          width: 70,
          height: 82,
          background: `linear-gradient(170deg, ${col.bodyTop} 0%, ${col.bodyBot} 100%)`,
          borderRadius: "2px 2px 16px 16px",
          position: "relative",
          marginTop: -2,
          zIndex: 1,
          flexShrink: 0,
          boxShadow: "inset -4px 0 10px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.3)",
        }}>
          {/* Body sheen — left highlight strip */}
          <div style={{
            position: "absolute",
            top: "10%",
            left: "14%",
            width: "16%",
            height: "65%",
            borderRadius: "50%",
            background: "linear-gradient(180deg,rgba(255,255,255,0.25) 0%,rgba(255,255,255,0) 100%)",
          }} />
        </div>

        {/* Base — narrower disk at bottom */}
        <div style={{
          width: 54,
          height: 9,
          background: col.baseCol,
          borderRadius: "0 0 10px 10px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          marginTop: -2,
          flexShrink: 0,
        }} />
      </div>

      {/* Table shadow — shrinks when cup is lifted */}
      <div style={{
        width: 72,
        height: 8,
        borderRadius: "50%",
        background: "rgba(0,0,0,0.3)",
        filter: "blur(5px)",
        marginTop: 2,
        opacity: lifted ? 0.05 : 0.55,
        transition: "opacity 0.5s ease",
      }} />

      {/* Pulsing pick-ring — visible only during "pick" phase */}
      {phase === "pick" && (
        <div style={{
          position: "absolute",
          bottom: 6,
          width: 76,
          height: 76,
          borderRadius: "50%",
          border: `2px solid ${CUP_COLORS[cupIdx % 3].rimTop}`,
          opacity: 0.7,
          animation: "cupPulse 1s ease-in-out infinite",
          pointerEvents: "none",
        }} />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */

export default function TileGameView({ quiz, onBack }: Props) {
  const questions = useRef(buildQuestions(quiz)).current;

  const [qIndex,       setQIndex]       = useState(0);
  const [phase,        setPhase]        = useState<Phase>("intro");
  const [score,        setScore]        = useState(0);
  const [totalTime,    setTotalTime]    = useState(0);
  const [attempts,     setAttempts]     = useState(0);

  // positions[cupIdx] = slot index (0 / 1 / 2) that this cup occupies
  const [positions,    setPositions]    = useState<[number,number,number]>([0,1,2]);
  const [winnerCup,    setWinnerCup]    = useState(0);
  const [liftedCups,   setLiftedCups]   = useState<number[]>([]);
  const [pickedSlot,   setPickedSlot]   = useState<number | null>(null);
  const [resultCorrect,setResultCorrect]= useState(false);
  const [isAnimating,  setIsAnimating]  = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  useEffect(() => {
    if (phase === "done" && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [phase]);

  const q = questions[qIndex];
  const shuffleCount = Math.min(5 + qIndex * 2, 12);

  /* ── Start a round ── */
  const startRound = useCallback(() => {
    const winner = Math.floor(Math.random() * 3);
    setWinnerCup(winner);
    setPositions([0, 1, 2]);
    setLiftedCups([]);
    setPickedSlot(null);
    setIsAnimating(true);

    /* 1. REVEAL — lift the winner cup so user sees the answer */
    setPhase("reveal");
    setLiftedCups([winner]);

    setTimeout(() => {
      /* 2. LOWER — put the cup back down */
      setPhase("lower");
      setLiftedCups([]);

      setTimeout(() => {
        /* 3. SHUFFLE — animate swaps one by one */
        setPhase("shuffle");
        const swaps = generateSwaps(shuffleCount);
        let cur: [number,number,number] = [0, 1, 2];

        swaps.forEach(([a, b], idx) => {
          setTimeout(() => {
            cur = [...cur] as [number,number,number];
            /* find which cup is in slot a vs slot b */
            const cupA = cur.indexOf(a) as 0|1|2;
            const cupB = cur.indexOf(b) as 0|1|2;
            /* swap them */
            [cur[cupA], cur[cupB]] = [cur[cupB], cur[cupA]];
            setPositions([...cur] as [number,number,number]);

            if (idx === swaps.length - 1) {
              /* 4. PICK — user's turn */
              setTimeout(() => {
                setPhase("pick");
                setIsAnimating(false);
              }, 700);
            }
          }, idx * 700);          // 700 ms per swap — easy to follow
        });
      }, 800);

    }, 2000);                     // 2 s to memorise answer
  }, [shuffleCount]);

  /* ── User taps a cup ── */
  const handleCupClick = useCallback((slot: number) => {
    if (phase !== "pick" || isAnimating) return;
    setAttempts(a => a + 1);
    setPickedSlot(slot);
    setIsAnimating(true);

    const clickedCup = positions.indexOf(slot) as 0|1|2;
    const correct = clickedCup === winnerCup;
    setResultCorrect(correct);
    if (correct) setScore(s => s + 1);

    /* ONLY the winner cup lifts — regardless of correct/wrong */
    setLiftedCups([winnerCup]);
    setPhase("result");

    setTimeout(() => {
      setLiftedCups([]);
      setTimeout(() => {
        if (qIndex + 1 >= questions.length) {
          setPhase("done");
        } else {
          setQIndex(i => i + 1);
          setPhase("intro");
          setIsAnimating(false);
        }
      }, 500);
    }, 2400);
  }, [phase, isAnimating, positions, winnerCup, qIndex, questions.length]);

  /* ── Empty state ── */
  if (questions.length === 0) {
    return (
      <div className="shell-root page-transition">
        <div className="game-empty">
          <div className="game-empty-icon">🎪</div>
          <h2>No questions available</h2>
          <p>Generate a quiz with some questions first to play the Shell Game.</p>
          <button className="btn-primary" onClick={onBack}>← Go Back</button>
        </div>
      </div>
    );
  }

  /* ── Done screen ── */
  if (phase === "done") {
    const pct   = Math.round((score / questions.length) * 100);
    const emoji = pct >= 90 ? "🏆" : pct >= 70 ? "⭐" : pct >= 50 ? "💪" : "🎪";
    return (
      <div className="shell-done page-transition">
        <div className="game-done-card">
          <div className="game-done-emoji">{emoji}</div>
          <h2>Shell Game Complete!</h2>
          <div className="game-done-score">
            <span className="game-done-val">{score}</span>
            <span className="game-done-total">/ {questions.length}</span>
          </div>
          <div className="game-done-pct" style={{ color: pct >= 70 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444" }}>
            {pct}%
          </div>
          <div className="game-done-stats-row">
            <div className="game-done-stat"><span>⏱</span><span>{formatTime(totalTime)}</span><span>Time</span></div>
            <div className="game-done-stat"><span>🎯</span><span>{attempts}</span><span>Picks</span></div>
            <div className="game-done-stat"><span>✓</span><span>{score}</span><span>Correct</span></div>
          </div>
          <div className="game-done-actions">
            <button className="btn-primary" onClick={() => {
              setQIndex(0); setScore(0); setAttempts(0); setTotalTime(0);
              setPositions([0,1,2]); setLiftedCups([]); setPickedSlot(null); setIsAnimating(false);
              setPhase("intro");
              if (!timerRef.current)
                timerRef.current = setInterval(() => setTotalTime(t => t + 1), 1000);
            }}>Play Again</button>
            <button className="btn-ghost" onClick={onBack}>← Back</button>
          </div>
        </div>
      </div>
    );
  }

  const progress = (qIndex / Math.max(questions.length, 1)) * 100;

  /* ── Main game UI ── */
  return (
    <div className="shell-root page-transition">

      {/* Header */}
      <div className="game-header">
        <button className="btn-ghost" onClick={onBack}>← Back</button>
        <div className="game-header-center">
          <span className="game-label">🎪 Shell Game</span>
          <span className="game-counter">{qIndex + 1} / {questions.length}</span>
        </div>
        <div className="game-header-right">
          <span className="game-score-badge">⭐ {score}</span>
          <span className="game-timer">⏱ {formatTime(totalTime)}</span>
        </div>
      </div>

      <div className="game-progress-bar">
        <div className="game-progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <div className="shell-question-card">
        <div className="shell-q-label">Which cup hides the answer?</div>
        <div className="shell-q-text">{q?.prompt}</div>
      </div>

      {/* Phase banner */}
      <div className="shell-phase-banner">
        {phase === "intro"  && <span>👀 Watch carefully — remember which cup holds the answer!</span>}
        {phase === "reveal" && <span className="shell-phase-reveal">🔍 Remember — the answer is under this cup!</span>}
        {phase === "lower"  && <span>😤 Get ready to follow...</span>}
        {phase === "shuffle"&& <span className="shell-phase-shuffle">🔀 Keep your eyes on the cup!</span>}
        {phase === "pick"   && <span className="shell-phase-pick">👆 Tap the cup hiding the answer!</span>}
        {phase === "result" && resultCorrect  && <span className="shell-phase-correct">✅ Correct! You found it!</span>}
        {phase === "result" && !resultCorrect && <span className="shell-phase-wrong">❌ Missed it! Watch the correct cup reveal.</span>}
      </div>

      {/* Stage — the 3 cups live here */}
      <div className="shell-stage">
        <div className="shell-table">
          {([0, 1, 2] as const).map(cupIdx => (
            <Cup
              key={cupIdx}
              cupIdx={cupIdx}
              slot={positions[cupIdx]}
              lifted={liftedCups.includes(cupIdx)}
              isWinner={cupIdx === winnerCup}
              phase={phase}
              pickedSlot={pickedSlot}
              onClick={handleCupClick}
              answer={q?.answer ?? ""}
              isAnimating={isAnimating}
            />
          ))}
        </div>
        <div className="shell-table-surface" />
      </div>

      {/* Start button — only on intro */}
      {phase === "intro" && (
        <div className="shell-start-area">
          <p className="shell-start-hint">
            The answer hides under one cup. Watch it lift, then follow the shuffle!
          </p>
          <button className="btn-primary shell-start-btn" onClick={startRound}>
            🎲 Start Round {qIndex + 1}
          </button>
        </div>
      )}
    </div>
  );
}

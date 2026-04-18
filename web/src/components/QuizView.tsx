import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Quiz } from "../types";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  quiz: Quiz;
  answers: Record<string, any>;
  setAnswers: (a: Record<string, any>) => void;
  onSubmit: () => void;
  allowBackNavigation?: boolean;
  questionTimer?: number;
}

export default function QuizView({ quiz, answers, setAnswers, onSubmit, allowBackNavigation = true, questionTimer = 0 }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(questionTimer);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const q = quiz.questions[currentIndex];
  const progress = ((currentIndex + 1) / quiz.questions.length) * 100;
  const answeredCount = Object.keys(answers).filter((k) => {
    const val = answers[k];
    if (val === undefined || val === "") return false;
    if (typeof val === "object") return Object.keys(val).length > 0;
    return true;
  }).length;

  const goToNext = useCallback(() => {
    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onSubmit();
    }
  }, [currentIndex, quiz.questions.length, onSubmit]);

  useEffect(() => {
    if (questionTimer <= 0) return;
    setTimeLeft(questionTimer);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          goToNext();
          return questionTimer;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIndex, questionTimer, goToNext]);

  const updateAnswer = (qid: string, value: any) => {
    setAnswers({ ...answers, [qid]: value });
  };

  const handleSubmit = () => {
    if (answeredCount < quiz.questions.length) {
      const unanswered = quiz.questions.length - answeredCount;
      if (!confirm(`You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`)) {
        return;
      }
    }
    if (timerRef.current) clearInterval(timerRef.current);
    onSubmit();
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mcq: "MULTIPLE CHOICE",
      true_false: "TRUE / FALSE",
      fill_blank: "FILL IN THE BLANK",
      identification: "IDENTIFICATION",
      matching: "MATCHING",
    };
    return labels[type] || type.toUpperCase();
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, "0")}` : `${sec}s`;
  };

  const renderQuestion = () => {
    if ((q.type === "mcq" || q.type === "true_false") && q.choices) {
      return (
        <div className="choices-list">
          {q.choices.map((c, i) => (
            <label
              key={i}
              className={`choice-item ${Number(answers[q.id]) === i ? "selected" : ""} ${q.type === "true_false" ? "tf-choice" : ""}`}
            >
              <input
                type="radio"
                name={q.id}
                checked={Number(answers[q.id]) === i}
                onChange={() => updateAnswer(q.id, i)}
              />
              {q.type === "true_false" ? (
                <span className={`tf-label ${c === "True" ? "tf-true" : "tf-false"}`}>{c}</span>
              ) : (
                <>
                  <span className="choice-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="choice-text">
                    <MarkdownRenderer content={c} className="inline-md" />
                  </span>
                </>
              )}
            </label>
          ))}
        </div>
      );
    }

    if (q.type === "matching" && q.pairs) {
      const rights = q.pairs.map((p) => p.right);
      return (
        <div className="matching-list">
          {q.pairs.map((p, i) => (
            <div key={i} className="match-row">
              <span className="match-left">
                <MarkdownRenderer content={p.left} className="inline-md" />
              </span>
              <select
                value={answers[q.id]?.[i] || ""}
                onChange={(e) => {
                  const current = answers[q.id] || {};
                  updateAnswer(q.id, { ...current, [i]: e.target.value });
                }}
                className="match-select"
              >
                <option value="">Select match...</option>
                {rights.map((r, ri) => (
                  <option key={ri} value={r}>{r}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      );
    }

    if (q.type === "fill_blank") {
      const BLANK_RE = /_{2,}/g;
      const parts = q.prompt.split(BLANK_RE);
      const blankCount = (q.prompt.match(BLANK_RE) || []).length;
      const currentVals: string[] = Array.isArray(answers[q.id]) ? answers[q.id] : Array(blankCount).fill("");

      const updateBlank = (blankIdx: number, val: string) => {
        const next = [...currentVals];
        next[blankIdx] = val;
        updateAnswer(q.id, next);
      };

      return (
        <div className="fill-blank-inline-wrap">
          <div className="fill-blank-sentence">
            {parts.map((part, pi) => (
              <React.Fragment key={pi}>
                <span className="fill-blank-text">{part}</span>
                {pi < blankCount && (
                  <input
                    type="text"
                    className="fill-blank-input"
                    value={currentVals[pi] || ""}
                    onChange={(e) => updateBlank(pi, e.target.value)}
                    placeholder="..."
                    autoFocus={pi === 0}
                    spellCheck={false}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="fill-blank-hint">
            Type your answer{blankCount > 1 ? "s" : ""} in the blank{blankCount > 1 ? "s" : ""} above — not case sensitive
          </div>
        </div>
      );
    }

    return (
      <input
        type="text"
        className="text-input"
        value={answers[q.id] || ""}
        onChange={(e) => updateAnswer(q.id, e.target.value)}
        placeholder="Type your answer here..."
        autoFocus
      />
    );
  };

  return (
    <div className="quiz-view page-transition">
      <div className="quiz-progress-bar">
        <div className="quiz-progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <div className="quiz-status">
        <span className="quiz-counter">Question {currentIndex + 1} of {quiz.questions.length}</span>
        {questionTimer > 0 && (
          <span className={`quiz-timer ${timeLeft <= 5 ? "timer-warning" : ""}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
        )}
        <span className="quiz-answered">{answeredCount} answered</span>
      </div>

      <div className="question-card card-3d">
        <div className="question-type-badge">{getTypeLabel(q.type)}</div>
        {q.type !== "fill_blank" && (
          <div className="question-prompt">
            <MarkdownRenderer content={q.prompt} />
          </div>
        )}
        {renderQuestion()}
      </div>

      <div className="quiz-nav">
        {allowBackNavigation ? (
          <button
            className="btn-secondary btn-ripple"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(currentIndex - 1)}
          >
            &larr; Previous
          </button>
        ) : (
          <div></div>
        )}

        {allowBackNavigation && (
          <div className="question-dots">
            {quiz.questions.map((_, i) => (
              <button
                key={i}
                className={`dot ${i === currentIndex ? "current" : ""} ${answers[quiz.questions[i].id] !== undefined && answers[quiz.questions[i].id] !== "" ? "answered" : ""}`}
                onClick={() => setCurrentIndex(i)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {currentIndex === quiz.questions.length - 1 ? (
          <button className="btn-success btn-ripple" onClick={handleSubmit}>
            Submit Quiz ✓
          </button>
        ) : (
          <button
            className="btn-primary btn-ripple"
            onClick={() => setCurrentIndex(currentIndex + 1)}
          >
            Next &rarr;
          </button>
        )}
      </div>
    </div>
  );
}

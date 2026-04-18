import React, { useState, useEffect } from "react";
import type { Quiz, User } from "../types";
import { getSharedQuiz } from "../api";
import QuizView from "./QuizView";

interface Props {
  shareCode: string;
  user: User | null;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  onRemix: (quiz: Quiz, quizType: string) => void;
}

export default function SharedQuizView({ shareCode, user, onNotify, onRemix }: Props) {
  const [quizData, setQuizData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"view" | "take">("view");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSharedQuiz();
  }, [shareCode]);

  const loadSharedQuiz = async () => {
    setLoading(true);
    try {
      const result = await getSharedQuiz(shareCode);
      if (result.ok) setQuizData(result.quiz);
      else setError(result.error || "Quiz not found");
    } catch { setError("Failed to load quiz"); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div className="shared-quiz-loading page-transition">
      <div className="spinner"></div>
      <p>Loading shared quiz...</p>
    </div>
  );

  if (error) return (
    <div className="shared-quiz-error page-transition">
      <div className="empty-icon">❌</div>
      <h3>Quiz Not Found</h3>
      <p>{error}</p>
    </div>
  );

  if (!quizData) return null;

  const quiz: Quiz = quizData.quizData;

  if (mode === "take") {
    return (
      <div className="page-transition">
        <QuizView quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={() => setMode("view")} />
      </div>
    );
  }

  return (
    <div className="shared-quiz-page page-transition">
      <div className="shared-quiz-card">
        <div className="shared-quiz-author">
          {quizData.author?.avatar ? (
            <img src={quizData.author.avatar} alt="" className="shared-author-avatar" />
          ) : (
            <div className="shared-author-placeholder">{quizData.author?.name?.[0] || "?"}</div>
          )}
          <div>
            <span className="shared-author-name">{quizData.author?.name || "Unknown"}</span>
            <span className="shared-quiz-date">{new Date(quizData.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <h2 className="shared-quiz-title">{quiz.quiz_title || quizData.title || "Shared Quiz"}</h2>

        <div className="shared-quiz-meta">
          <span className="badge badge-accent">{quizData.quizType}</span>
          <span className="badge badge-success">{quizData.totalQuestions} questions</span>
          {quizData.score !== null && <span className="badge badge-accent">Score: {Math.round(quizData.score)}%</span>}
        </div>

        <div className="shared-quiz-actions">
          <button className="btn-primary btn-ripple" onClick={() => { setAnswers({}); setMode("take"); }}>
            Take This Quiz
          </button>
          <button className="btn-secondary btn-ripple" onClick={() => onRemix(quiz, quizData.quizType)}>
            Remix Quiz
          </button>
        </div>
      </div>
    </div>
  );
}

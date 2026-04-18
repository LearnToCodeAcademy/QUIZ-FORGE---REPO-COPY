import React, { useState, useRef, useCallback, useMemo } from "react";
import type { Quiz, AIModel, User } from "../types";
import { scoreQuiz } from "../scoring";
import { explainAnswer, saveQuiz, addBookmark } from "../api";
import StarTutorial from "./StarTutorial";
import MarkdownRenderer from "./MarkdownRenderer";

interface Props {
  quiz: Quiz;
  answers: Record<string, any>;
  startedAt: number;
  endedAt: number;
  onReset: () => void;
  files: File[];
  aiModel: AIModel;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  user: User | null;
}

export default function QuizResults({ quiz, answers, startedAt, endedAt, onReset, aiModel, onNotify, user }: Props) {
  const [showReview, setShowReview] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<string | null>(null);
  const [showTrophy, setShowTrophy] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedQuizId, setSavedQuizId] = useState<number | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const firstStarRef = useRef<HTMLButtonElement>(null);

  const score = scoreQuiz(quiz, answers);
  const elapsed = endedAt - startedAt;
  const minutes = Math.floor(elapsed / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  const getGrade = () => {
    if (score.percent >= 90) return { letter: "A+", color: "#10b981", message: "Outstanding!" };
    if (score.percent >= 80) return { letter: "A", color: "#10b981", message: "Excellent work!" };
    if (score.percent >= 70) return { letter: "B", color: "#3b82f6", message: "Great job!" };
    if (score.percent >= 60) return { letter: "C", color: "#f59e0b", message: "Good effort!" };
    if (score.percent >= 50) return { letter: "D", color: "#f97316", message: "Keep studying!" };
    return { letter: "F", color: "#ef4444", message: "Review the material" };
  };

  const grade = getGrade();

  const getUserAnswer = (q: any) => {
    const ans = answers[q.id];
    if (ans === undefined || ans === "") return "No answer";
    if ((q.type === "mcq" || q.type === "true_false") && q.choices) return q.choices[Number(ans)] || "No answer";
    if (q.type === "matching") {
      if (typeof ans === "object" && !Array.isArray(ans)) {
        return Object.entries(ans).map(([i, v]) => `${q.pairs?.[Number(i)]?.left} → ${v}`).join(", ");
      }
      return "No answer";
    }
    if (q.type === "fill_blank" && Array.isArray(ans)) {
      const filled = ans.filter(Boolean);
      return filled.length > 0 ? filled.join(" / ") : "No answer";
    }
    return String(ans);
  };

  const getCorrectAnswer = (q: any) => {
    if ((q.type === "mcq" || q.type === "true_false") && q.choices) return q.choices[q.answer_index];
    if (q.type === "matching" && q.pairs) return q.pairs.map((p: any) => `${p.left} → ${p.right}`).join(", ");
    if (q.answers) return q.answers.join(" or ");
    return "N/A";
  };

  const handleCheckAnswers = useCallback(() => {
    const hasSeenTutorial = localStorage.getItem("quizforge_star_tutorial_seen");
    setShowReview(true);
    if (!hasSeenTutorial) {
      setTimeout(() => setShowTutorial(true), 500);
    }
  }, []);

  const handleDismissTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem("quizforge_star_tutorial_seen", "true");
  }, []);

  const handleExplain = async (questionId: string) => {
    if (explanations[questionId]) {
      setExplanations((prev) => { const next = { ...prev }; delete next[questionId]; return next; });
      return;
    }
    const q = quiz.questions.find((qq) => qq.id === questionId);
    if (!q) return;
    const qResult = score.perQuestion.find((p) => p.id === questionId);
    setLoadingExplanation(questionId);
    try {
      const result = await explainAnswer({ question: q.prompt, userAnswer: getUserAnswer(q), correctAnswer: getCorrectAnswer(q), isCorrect: qResult?.correct || false, aiModel });
      if (result.ok) { setExplanations((prev) => ({ ...prev, [questionId]: result.explanation })); }
      else { onNotify(result.error || "Failed to get explanation", "error"); setExplanations((prev) => ({ ...prev, [questionId]: q.explanation || "No explanation available." })); }
    } catch { onNotify("API is currently not working", "error"); setExplanations((prev) => ({ ...prev, [questionId]: q.explanation || "No explanation available." })); }
    finally { setLoadingExplanation(null); }
  };

  const handleSaveQuiz = async () => {
    if (!user) { onNotify("Please sign in to save quizzes", "info"); return; }
    setSaving(true);
    try {
      const result = await saveQuiz({
        title: quiz.quiz_title,
        quizData: quiz,
        answers,
        score: score.percent,
        totalQuestions: quiz.questions.length,
        timeSpent: Math.round(elapsed / 1000),
        quizType: quiz.quiz_type,
        aiModel,
      });
      if (result.ok) {
        setSavedQuizId(result.quizId);
        setShareCode(result.shareCode);
        onNotify("Quiz saved!", "success");
      } else { onNotify(result.error || "Failed to save", "error"); }
    } catch { onNotify("Failed to save quiz", "error"); }
    finally { setSaving(false); }
  };

  const handleBookmark = async () => {
    if (!savedQuizId) { onNotify("Save the quiz first", "info"); return; }
    try {
      await addBookmark(savedQuizId);
      setBookmarked(true);
      onNotify("Added to bookmarks!", "success");
    } catch { onNotify("Failed to bookmark", "error"); }
  };

  const handleShare = () => {
    if (!shareCode) { onNotify("Save the quiz first to get a share link", "info"); return; }
    const url = `${window.location.origin}/share/quiz/${shareCode}`;
    navigator.clipboard.writeText(url).then(() => onNotify("Share link copied!", "success")).catch(() => onNotify(url, "info"));
  };

  return (
    <div className="results-view page-transition">
      {showTrophy && (
        <div className="trophy-modal" onClick={() => setShowTrophy(false)}>
          <div className="trophy-content results-reveal" onClick={(e) => e.stopPropagation()}>
            <div className="trophy-icon">🏆</div>
            <h2 className="trophy-title">Quiz Complete!</h2>
            <div className="trophy-score" style={{ color: grade.color }}>{Math.round(score.percent)}%</div>
            <p className="trophy-grade">{grade.letter}</p>
            <p className="trophy-message">{grade.message}</p>
            <div className="confetti-container">
              {score.percent >= 70 && Array.from({ length: 30 }).map((_, i) => (
                <div key={i} className="confetti" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s`, backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"][i % 6] }}></div>
              ))}
            </div>
            <button className="btn-primary btn-ripple" onClick={() => setShowTrophy(false)}>View Details</button>
          </div>
        </div>
      )}

      <div className="score-summary">
        <div className="score-ring score-ring-animate">
          <svg viewBox="0 0 120 120" className="ring-svg">
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={grade.color} strokeWidth="8" strokeDasharray={`${2 * Math.PI * 52}`} strokeDashoffset={`${2 * Math.PI * 52 * (1 - score.percent / 100)}`} strokeLinecap="round" transform="rotate(-90 60 60)" className="score-circle-animated" />
          </svg>
          <div className="score-center">
            <span className="score-number animated-counter">{Math.round(score.percent)}%</span>
            <span className="score-label">{grade.letter}</span>
          </div>
        </div>

        <div className="score-stats">
          <div className="stat stat-card"><span className="stat-value">{score.earned}</span><span className="stat-label">Correct</span></div>
          <div className="stat stat-card"><span className="stat-value">{score.possible - score.earned}</span><span className="stat-label">Incorrect</span></div>
          <div className="stat stat-card"><span className="stat-value">{minutes}:{seconds.toString().padStart(2, "0")}</span><span className="stat-label">Time</span></div>
        </div>

        <div className="result-actions">
          <button className="btn-primary btn-ripple" onClick={onReset}>New Quiz</button>
          <button className="btn-secondary btn-ripple" onClick={() => showReview ? setShowReview(false) : handleCheckAnswers()}>
            {showReview ? "Hide Answers" : "Check Your Answers"}
          </button>
        </div>
        <div className="result-actions-secondary">
          {!savedQuizId ? (
            <button className="btn-secondary btn-sm btn-ripple" onClick={handleSaveQuiz} disabled={saving}>
              {saving ? "Saving..." : "💾 Save Quiz"}
            </button>
          ) : (
            <>
              {!bookmarked && (
                <button className="btn-secondary btn-sm btn-ripple" onClick={handleBookmark}>🔖 Bookmark</button>
              )}
              <button className="btn-secondary btn-sm btn-ripple" onClick={handleShare}>🔗 Share</button>
            </>
          )}
        </div>
      </div>

      {showReview && (
        <div className="answer-review">
          <h3>Answer Review</h3>
          {quiz.questions.map((q, i) => {
            const qResult = score.perQuestion.find((p) => p.id === q.id);
            const isCorrect = qResult?.correct || false;
            const isFirst = i === 0;
            return (
              <div key={q.id} className={`review-card ${isCorrect ? "correct" : "incorrect"} slide-in`}>
                <div className="review-header">
                  <span className="review-number">Q{i + 1}</span>
                  <span className={`review-badge ${isCorrect ? "badge-correct" : "badge-incorrect"}`}>{isCorrect ? "✓ Correct" : "✗ Incorrect"}</span>
                  <div className="explain-btn-wrapper">
                    <button ref={isFirst ? firstStarRef : undefined} className={`explain-btn ${explanations[q.id] ? "active" : ""}`} onClick={() => handleExplain(q.id)} disabled={loadingExplanation === q.id}>
                      {loadingExplanation === q.id ? <span className="mini-spinner"></span> : <span className="star-circle">★</span>}
                    </button>
                    <span className="explain-tooltip">Explain by QuizForge</span>
                  </div>
                </div>
                <div className="review-prompt"><MarkdownRenderer content={q.prompt} /></div>
                <div className="review-answers">
                  <div className="answer-row"><span className="answer-label">Your answer:</span><span className={`answer-value ${isCorrect ? "text-correct" : "text-incorrect"}`}>{getUserAnswer(q)}</span></div>
                  {!isCorrect && <div className="answer-row"><span className="answer-label">Correct answer:</span><span className="answer-value text-correct">{getCorrectAnswer(q)}</span></div>}
                </div>
                {explanations[q.id] && (
                  <div className="explanation-box slide-in">
                    <div className="explanation-header"><span>💡 Explanation</span></div>
                    <MarkdownRenderer content={explanations[q.id]} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showTutorial && <StarTutorial targetRef={firstStarRef} onDismiss={handleDismissTutorial} />}
    </div>
  );
}

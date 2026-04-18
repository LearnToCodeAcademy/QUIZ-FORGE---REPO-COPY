import React, { useState, useEffect } from "react";
import type { Quiz } from "../types";
import { getMyQuizzes } from "../api";

interface Props {
  currentQuiz: Quiz | null;
  currentView: string;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

interface SessionItem {
  id: number;
  title: string;
  quiz_type: string;
  total_questions: number;
  score: number;
  created_at: string;
  ai_model: string;
}

export default function SessionPage({ currentQuiz, currentView, onNotify }: Props) {
  const [recentQuizzes, setRecentQuizzes] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentSessions();
  }, []);

  const loadRecentSessions = async () => {
    setLoading(true);
    try {
      const result = await getMyQuizzes();
      if (result.ok) {
        setRecentQuizzes(result.quizzes.slice(0, 10));
      }
    } catch {} finally { setLoading(false); }
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="session-page page-transition">
      <div className="page-header-section">
        <h2>Current Session</h2>
        <p>Your active tasks and recent activity</p>
      </div>

      <div className="session-current-card">
        <div className="session-status-indicator">
          <div className={`status-dot ${currentQuiz ? "active" : "idle"}`}></div>
          <span className="status-text">{currentQuiz ? "Active Quiz" : "No active task"}</span>
        </div>
        {currentQuiz ? (
          <div className="session-active-info">
            <h3>{currentQuiz.quiz_title}</h3>
            <div className="session-meta-row">
              <span className="badge badge-accent">{currentQuiz.quiz_type}</span>
              <span className="badge badge-success">{currentQuiz.questions.length} questions</span>
            </div>
          </div>
        ) : (
          <p className="session-idle-text">Start a quiz, reviewer, or chat session from the home page to see it here.</p>
        )}
      </div>

      <div className="session-recent">
        <h3>Recent Sessions</h3>
        {loading ? (
          <div className="skeleton-list">
            {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{height: 60, marginBottom: 8}}></div>)}
          </div>
        ) : recentQuizzes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No sessions yet. Complete a quiz to see it here.</p>
          </div>
        ) : (
          <div className="session-list">
            {recentQuizzes.map((q) => (
              <div key={q.id} className="session-item card-3d">
                <div className="session-item-main">
                  <h4>{q.title || "Untitled Quiz"}</h4>
                  <div className="session-item-meta">
                    <span className="badge badge-accent">{q.quiz_type}</span>
                    <span className="badge badge-success">{Math.round(q.score || 0)}%</span>
                    <span className="session-time">{getTimeSince(q.created_at)}</span>
                  </div>
                </div>
                <div className="session-item-stats">
                  <span>{q.total_questions} Q</span>
                  <span className="session-model">{q.ai_model === "gemini" ? "Gemini" : "Grok"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

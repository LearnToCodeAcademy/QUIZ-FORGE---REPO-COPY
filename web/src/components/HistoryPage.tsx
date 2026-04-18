import React, { useState, useEffect } from "react";
import { getActivityHistory } from "../api";

interface Props {
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

interface ActivityItem {
  id: number;
  action: string;
  details: string;
  created_at: string;
}

export default function HistoryPage({ onNotify }: Props) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await getActivityHistory();
      if (result.ok) {
        setActivities(result.activities);
      }
    } catch {} finally { setLoading(false); }
  };

  const getIcon = (action: string) => {
    switch (action) {
      case "quiz_completed": return "📝";
      case "file_uploaded": return "📁";
      case "quiz_saved": return "💾";
      case "quiz_bookmarked": return "🔖";
      case "quiz_shared": return "🔗";
      case "reviewer_generated": return "📖";
      case "chat_session": return "💬";
      case "account_created": return "👤";
      default: return "📌";
    }
  };

  const formatAction = (action: string) => {
    switch (action) {
      case "quiz_completed": return "Completed a quiz";
      case "file_uploaded": return "Uploaded files";
      case "quiz_saved": return "Saved a quiz";
      case "quiz_bookmarked": return "Bookmarked a quiz";
      case "quiz_shared": return "Shared a quiz";
      case "reviewer_generated": return "Generated a reviewer";
      case "chat_session": return "Chat session";
      case "account_created": return "Account created";
      default: return action.replace(/_/g, " ");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="history-page page-transition">
      <div className="page-header-section">
        <h2>Activity History</h2>
        <p>Your recent actions and events</p>
      </div>

      {loading ? (
        <div className="skeleton-list">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton skeleton-text" style={{height: 56, marginBottom: 8}}></div>)}
        </div>
      ) : activities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📜</div>
          <p>No activity yet. Start using QuizForge to build your history!</p>
        </div>
      ) : (
        <div className="history-timeline">
          {activities.map((item) => (
            <div key={item.id} className="history-item">
              <div className="history-dot-line">
                <div className="history-dot"></div>
                <div className="history-line"></div>
              </div>
              <div className="history-content">
                <div className="history-icon">{getIcon(item.action)}</div>
                <div className="history-info">
                  <span className="history-action">{formatAction(item.action)}</span>
                  {item.details && <span className="history-details">{item.details}</span>}
                  <span className="history-time">{formatDate(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

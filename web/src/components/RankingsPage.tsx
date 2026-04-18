import React, { useState, useEffect } from "react";
import type { RankingUser } from "../types";
import { getRankings } from "../api";

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => { loadRankings(1); }, []);

  const loadRankings = async (p: number) => {
    setLoading(true);
    try {
      const result = await getRankings(p);
      if (result.ok) {
        if (p === 1) setRankings(result.rankings);
        else setRankings((prev) => [...prev, ...result.rankings]);
        setHasMore(result.hasMore);
        setPage(p);
      }
    } catch {} finally { setLoading(false); }
  };

  const getTrophyIcon = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);

  return (
    <div className="rankings-page page-transition">
      <div className="page-header-section">
        <h2>Leaderboard</h2>
        <p>Top users ranked by file uploads</p>
      </div>

      {loading && rankings.length === 0 ? (
        <div className="skeleton-list">
          {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{height: 60, marginBottom: 10}}></div>)}
        </div>
      ) : rankings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏆</div>
          <p>No rankings yet. Be the first to upload files!</p>
        </div>
      ) : (
        <>
          <div className="podium">
            {top3.length >= 2 && (
              <div className="podium-slot podium-2">
                <div className="podium-avatar-wrap">
                  {top3[1].avatar ? (
                    <img src={top3[1].avatar} alt="" className="podium-avatar" />
                  ) : (
                    <div className="podium-avatar-placeholder">{top3[1].name[0]}</div>
                  )}
                </div>
                <span className="podium-trophy">🥈</span>
                <span className="podium-name">{top3[1].name}</span>
                <span className="podium-count">{top3[1].fileCount} files</span>
                <div className="podium-bar podium-bar-2"></div>
              </div>
            )}

            {top3.length >= 1 && (
              <div className="podium-slot podium-1">
                <div className="podium-avatar-wrap">
                  {top3[0].avatar ? (
                    <img src={top3[0].avatar} alt="" className="podium-avatar" />
                  ) : (
                    <div className="podium-avatar-placeholder">{top3[0].name[0]}</div>
                  )}
                </div>
                <span className="podium-trophy">🥇</span>
                <span className="podium-name">{top3[0].name}</span>
                <span className="podium-count">{top3[0].fileCount} files</span>
                <div className="podium-bar podium-bar-1"></div>
              </div>
            )}

            {top3.length >= 3 && (
              <div className="podium-slot podium-3">
                <div className="podium-avatar-wrap">
                  {top3[2].avatar ? (
                    <img src={top3[2].avatar} alt="" className="podium-avatar" />
                  ) : (
                    <div className="podium-avatar-placeholder">{top3[2].name[0]}</div>
                  )}
                </div>
                <span className="podium-trophy">🥉</span>
                <span className="podium-name">{top3[2].name}</span>
                <span className="podium-count">{top3[2].fileCount} files</span>
                <div className="podium-bar podium-bar-3"></div>
              </div>
            )}
          </div>

          {rest.length > 0 && (
            <div className="ranking-list">
              {rest.map((r, i) => (
                <div key={r.id} className="ranking-row slide-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <span className="ranking-position">{getTrophyIcon(i + 4)}</span>
                  <div className="ranking-user">
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="ranking-avatar" />
                    ) : (
                      <div className="ranking-avatar-placeholder">{r.name[0]}</div>
                    )}
                    <span className="ranking-name">{r.name}</span>
                  </div>
                  <div className="ranking-stats">
                    <span className="ranking-stat">{r.fileCount} files</span>
                    <span className="ranking-stat">{r.quizCount} quizzes</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasMore && (
            <button className="btn-secondary btn-ripple show-more-btn" onClick={() => loadRankings(page + 1)} disabled={loading}>
              {loading ? "Loading..." : "Show More"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

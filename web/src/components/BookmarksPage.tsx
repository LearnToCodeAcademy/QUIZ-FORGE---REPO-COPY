import React, { useState, useEffect } from "react";
import type { SavedQuiz } from "../types";
import { getMyBookmarks, removeBookmark } from "../api";
import { jsPDF } from "jspdf";

interface Props {
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  onRemixQuiz: (quiz: SavedQuiz) => void;
  onViewQuiz: (quiz: SavedQuiz) => void;
}

export default function BookmarksPage({ onNotify, onRemixQuiz, onViewQuiz }: Props) {
  const [bookmarks, setBookmarks] = useState<SavedQuiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadBookmarks(); }, []);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const result = await getMyBookmarks();
      if (result.ok) setBookmarks(result.bookmarks);
    } catch {} finally { setLoading(false); }
  };

  const handleRemove = async (quizId: number) => {
    try {
      await removeBookmark(quizId);
      setBookmarks(bookmarks.filter((b) => b.id !== quizId));
      onNotify("Bookmark removed", "info");
    } catch { onNotify("Failed to remove bookmark", "error"); }
  };

  const downloadQuiz = (quiz: SavedQuiz, format: "pdf" | "docx" | "txt") => {
    const data = quiz.quiz_data;
    if (!data || !data.questions) { onNotify("No quiz data available", "error"); return; }

    const lines: string[] = [];
    lines.push(data.quiz_title || quiz.title || "Quiz");
    lines.push(`Type: ${quiz.quiz_type} | Questions: ${data.questions.length}`);
    lines.push("");

    data.questions.forEach((q, i) => {
      lines.push(`${i + 1}. ${q.prompt}`);
      if (q.choices) {
        q.choices.forEach((c, ci) => lines.push(`   ${String.fromCharCode(65 + ci)}. ${c}`));
      }
      if (q.pairs) {
        q.pairs.forEach((p) => lines.push(`   ${p.left} → ${p.right}`));
      }
      const answer = q.answer_index !== undefined && q.choices
        ? q.choices[q.answer_index]
        : q.answers?.join(" / ") || "See pairs above";
      lines.push(`   Answer: ${answer}`);
      if (q.explanation) lines.push(`   Explanation: ${q.explanation}`);
      lines.push("");
    });

    const text = lines.join("\n");

    if (format === "txt") {
      const blob = new Blob([text], { type: "text/plain" });
      downloadBlob(blob, `${quiz.title || "quiz"}.txt`);
    } else if (format === "pdf") {
      const doc = new jsPDF();
      const splitText = doc.splitTextToSize(text, 180);
      let y = 15;
      splitText.forEach((line: string) => {
        if (y > 275) { doc.addPage(); y = 15; }
        doc.setFontSize(10);
        doc.text(line, 15, y);
        y += 5;
      });
      doc.save(`${quiz.title || "quiz"}.pdf`);
    } else {
      const blob = new Blob([text], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      downloadBlob(blob, `${quiz.title || "quiz"}.docx`);
    }
    onNotify(`Downloaded as ${format.toUpperCase()}`, "success");
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bookmarks-page page-transition">
      <div className="page-header-section">
        <h2>My Bookmarks</h2>
        <p>Saved quizzes you can review, remix, or download</p>
      </div>

      {loading ? (
        <div className="skeleton-list">
          {[1,2,3].map(i => <div key={i} className="skeleton skeleton-text" style={{height: 80, marginBottom: 12}}></div>)}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📑</div>
          <p>No bookmarks yet. Save quizzes after completing them!</p>
        </div>
      ) : (
        <div className="bookmark-list">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="bookmark-card card-3d">
              <div className="bookmark-card-header">
                <h4>{bm.title || bm.quiz_data?.quiz_title || "Untitled Quiz"}</h4>
                <div className="bookmark-badges">
                  <span className="badge badge-accent">{bm.quiz_type}</span>
                  <span className="badge badge-success">{Math.round(bm.score || 0)}%</span>
                </div>
              </div>
              <div className="bookmark-meta">
                <span>{bm.total_questions} questions</span>
                <span>&middot;</span>
                <span>{bm.ai_model}</span>
                <span>&middot;</span>
                <span>{new Date(bm.created_at).toLocaleDateString()}</span>
              </div>
              <div className="bookmark-actions">
                <button className="btn-sm btn-secondary btn-ripple" onClick={() => onViewQuiz(bm)}>View</button>
                <button className="btn-sm btn-primary btn-ripple" onClick={() => onRemixQuiz(bm)}>Remix</button>
                <div className="download-dropdown">
                  <button className="btn-sm btn-ghost">Download ▾</button>
                  <div className="download-menu">
                    <button onClick={() => downloadQuiz(bm, "pdf")}>PDF</button>
                    <button onClick={() => downloadQuiz(bm, "txt")}>TXT</button>
                    <button onClick={() => downloadQuiz(bm, "docx")}>DOCX</button>
                  </div>
                </div>
                <button className="btn-sm btn-ghost text-danger" onClick={() => handleRemove(bm.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

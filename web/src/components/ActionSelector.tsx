import React, { useState } from "react";

type ActionId = "quiz" | "reviewer" | "chat" | "flashcard" | "tile-game" | "word-scramble" | "pairs-game" | "speed-blitz";

interface Props {
  onAction: (action: ActionId) => void;
}

interface ActionItem {
  id: ActionId;
  icon: string;
  title: string;
  desc: string;
  color: string;
}

const STUDY_ACTIONS: ActionItem[] = [
  { id: "quiz", icon: "🎯", title: "Generate Quiz", desc: "MCQ, fill-in-blank, matching & true/false — graded with AI explanations", color: "#7c3aed" },
  { id: "flashcard", icon: "🃏", title: "Flashcards", desc: "Flip cards to test memory — mark what you know and what needs review", color: "#2563eb" },
  { id: "reviewer", icon: "📝", title: "Reviewer Notes", desc: "AI-structured study notes with key concepts, summaries and tables", color: "#d97706" },
  { id: "chat", icon: "💬", title: "Chat with AI", desc: "Ask questions about your materials and get instant smart answers", color: "#0891b2" },
];

const GAME_ACTIONS: ActionItem[] = [
  { id: "tile-game", icon: "🎪", title: "Shell Game", desc: "Watch the cups shuffle — tap the one hiding the correct answer!", color: "#059669" },
  { id: "word-scramble", icon: "🔤", title: "Word Scramble", desc: "Unscramble key terms letter-by-letter — tests spelling & recall", color: "#7c3aed" },
  { id: "pairs-game", icon: "🧩", title: "Matching Pairs", desc: "Flip cards and match every term with its definition — memory challenge", color: "#db2777" },
  { id: "speed-blitz", icon: "⚡", title: "Speed Blitz", desc: "Race the clock — answer MCQ questions before time runs out!", color: "#dc2626" },
];

interface CategoryProps {
  icon: string;
  label: string;
  badge?: string;
  badgeColor?: string;
  actions: ActionItem[];
  onAction: (id: ActionId) => void;
  defaultOpen?: boolean;
}

function ActionCategory({ icon, label, badge, badgeColor, actions, onAction, defaultOpen = true }: CategoryProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`action-category ${open ? "action-category-open" : ""}`}>
      <button className="action-category-header" onClick={() => setOpen((o) => !o)}>
        <span className="action-category-icon">{icon}</span>
        <span className="action-category-label">{label}</span>
        {badge && (
          <span className="action-category-badge" style={{ background: badgeColor }}>{badge}</span>
        )}
        <span className="action-category-count">{actions.length}</span>
        <span className={`action-category-chevron ${open ? "chevron-open" : ""}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="action-category-grid">
          {actions.map((a) => (
            <button
              key={a.id}
              className="action-card"
              onClick={() => onAction(a.id)}
              style={{ "--card-accent": a.color } as React.CSSProperties}
            >
              <div className="action-card-icon">{a.icon}</div>
              <h3>{a.title}</h3>
              <p>{a.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActionSelector({ onAction }: Props) {
  return (
    <div className="action-selector">
      <h2 className="action-title">What would you like to do?</h2>
      <div className="action-categories">
        <ActionCategory
          icon="📚"
          label="Study Tools"
          actions={STUDY_ACTIONS}
          onAction={onAction}
          defaultOpen={true}
        />
        <ActionCategory
          icon="🎮"
          label="Games"
          badge="NEW"
          badgeColor="#7c3aed"
          actions={GAME_ACTIONS}
          onAction={onAction}
          defaultOpen={true}
        />
      </div>
    </div>
  );
}

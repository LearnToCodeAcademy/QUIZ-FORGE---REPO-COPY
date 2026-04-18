import React, { useState } from "react";
import type { AIModel } from "../types";
import type { FlashcardDeck } from "./FlashcardView";
import { generateFlashcards } from "../api";

interface Props {
  files: File[];
  onDeckGenerated: (deck: FlashcardDeck) => void;
  onBack: () => void;
  aiModel: AIModel;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

const COUNT_PRESETS = [5, 10, 15, 20];

export default function FlashcardConfig({ files, onDeckGenerated, onBack, aiModel, onNotify }: Props) {
  const [cardCount, setCardCount] = useState(10);
  const [customCount, setCustomCount] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const effectiveCount = customCount ? Number(customCount) : cardCount;

  const handleGenerate = async () => {
    if (effectiveCount < 3 || effectiveCount > 40) {
      setError("Card count must be between 3 and 40.");
      return;
    }
    setIsGenerating(true);
    setError("");
    try {
      const result = await generateFlashcards({ files, cardCount: effectiveCount, difficulty, aiModel });
      if (!result.ok) throw new Error(result.error || "Failed to generate flashcards");
      onDeckGenerated(result.deck);
    } catch (err: any) {
      setError(err.message);
      onNotify(err.message, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="generating-overlay">
        <div className="generating-content">
          <div className="spinner"></div>
          <h2>Creating Flashcards...</h2>
          <p>Generating {effectiveCount} cards from your materials</p>
          <div className="loading-dots"><span></span><span></span><span></span></div>
        </div>
      </div>
    );
  }

  return (
    <div className="config-section">
      <div className="config-header">
        <h2>🃏 Configure Flashcards</h2>
        <p>Create study flashcards from your uploaded materials</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="config-card">
        <div className="config-group">
          <label>Number of Cards</label>
          <div className="count-selector">
            {COUNT_PRESETS.map((n) => (
              <button
                key={n}
                className={`count-btn ${effectiveCount === n && !customCount ? "active" : ""}`}
                onClick={() => { setCardCount(n); setCustomCount(""); }}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              className="count-input"
              placeholder="Custom"
              min={3}
              max={40}
              value={customCount}
              onChange={(e) => setCustomCount(e.target.value)}
            />
          </div>
        </div>

        <div className="config-group">
          <label>Difficulty</label>
          <div className="option-pills">
            {(["easy", "medium", "hard"] as const).map((d) => (
              <button key={d} className={`pill ${difficulty === d ? "active" : ""}`} onClick={() => setDifficulty(d)}>
                {d === "easy" ? "🟢 Easy" : d === "medium" ? "🟡 Medium" : "🔴 Hard"}
              </button>
            ))}
          </div>
        </div>

        <div className="fc-preview-info">
          <div className="fc-preview-row">
            <span>📇</span>
            <span>{effectiveCount} flashcards from your {files.length} file{files.length > 1 ? "s" : ""}</span>
          </div>
          <div className="fc-preview-row">
            <span>🔄</span>
            <span>Tap each card to flip and reveal the answer</span>
          </div>
          <div className="fc-preview-row">
            <span>✓</span>
            <span>Mark cards as "Got it" or "Need review" to track progress</span>
          </div>
        </div>

        <div className="config-actions">
          <button className="btn-ghost" onClick={onBack}>← Back</button>
          <button className="btn-primary" onClick={handleGenerate} style={{ flex: 1 }}>
            Generate {effectiveCount} Flashcards
          </button>
        </div>
      </div>
    </div>
  );
}

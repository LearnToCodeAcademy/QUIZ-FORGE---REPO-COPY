import React, { useState } from "react";
import type { ReviewerType, PreferResponse, AIModel } from "../types";
import { generateReviewer } from "../api";

interface Props {
  files: File[];
  onReviewerGenerated: (content: string) => void;
  onBack: () => void;
  aiModel: AIModel;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
}

export default function ReviewerConfig({ files, onReviewerGenerated, onBack, aiModel, onNotify }: Props) {
  const [reviewerType, setReviewerType] = useState<ReviewerType>("concise");
  const [preferResponse, setPreferResponse] = useState<PreferResponse>("normal");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    try {
      const result = await generateReviewer({ files, reviewerType, preferResponse, aiModel });
      if (!result.ok) {
        throw new Error(result.error || "Failed to generate reviewer");
      }
      onReviewerGenerated(result.content);
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
          <h2>Creating Your Reviewer...</h2>
          <p>Analyzing and summarizing your materials</p>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="config-section">
      <div className="config-header">
        <h2>Configure Reviewer</h2>
        <p>Choose how detailed and long you want your study reviewer to be</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="config-card">
        <div className="config-group">
          <label>Type of Reviewer</label>
          <select
            className="select-input"
            value={reviewerType}
            onChange={(e) => setReviewerType(e.target.value as ReviewerType)}
          >
            <option value="short">Short - Key points only</option>
            <option value="concise">Concise - Balanced overview</option>
            <option value="detailed">Detailed - Comprehensive coverage</option>
          </select>
        </div>

        <div className="config-group">
          <label>Preferred Response Length</label>
          <select
            className="select-input"
            value={preferResponse}
            onChange={(e) => setPreferResponse(e.target.value as PreferResponse)}
          >
            <option value="short">Short</option>
            <option value="normal">Normal</option>
            <option value="long">Long</option>
          </select>
        </div>

        <button className="btn-primary btn-lg" onClick={handleGenerate}>
          Generate Reviewer
        </button>
      </div>
    </div>
  );
}

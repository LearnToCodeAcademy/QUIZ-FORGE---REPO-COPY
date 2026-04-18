import React, { useState, useEffect } from "react";
import type { QuizType, Difficulty, AIModel } from "../types";
import { generateQuiz, remixQuiz } from "../api";

interface Props {
  files: File[];
  onQuizGenerated: (quiz: any) => void;
  onBack: () => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  aiModel: AIModel;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  remixSource?: any;
}

export default function QuizConfig({ files, onQuizGenerated, onBack, isGenerating, setIsGenerating, aiModel, onNotify, remixSource }: Props) {
  const [quizType, setQuizType] = useState<QuizType>(remixSource?.quiz_type as QuizType || "mcq");
  const [questionCount, setQuestionCount] = useState(remixSource?.questions?.length || 10);
  const [difficulty, setDifficulty] = useState<Difficulty>("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (remixSource) {
      setQuizType(remixSource.quiz_type as QuizType || "mcq");
      setQuestionCount(remixSource.questions?.length || 10);
      setDifficulty("");
      setError("");
    }
  }, [remixSource]);

  const countOptions = [5, 10, 20, 30];
  const isRemix = !!remixSource;

  const handleGenerate = async () => {
    if (!isRemix && files.length === 0) {
      setError("Please upload at least one file first.");
      onNotify("Please upload at least one file first.", "error");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      let result;
      if (isRemix) {
        result = await remixQuiz({
          quizData: remixSource,
          quizType,
          questionCount: Math.min(30, Math.max(1, questionCount)),
          difficulty: difficulty || undefined,
          aiModel,
        });
      } else {
        result = await generateQuiz({
          files,
          quizType,
          questionCount: Math.min(30, Math.max(1, questionCount)),
          difficulty,
          aiModel,
        });
      }
      if (!result.ok) {
        throw new Error(result.error || "Failed to generate quiz");
      }
      onQuizGenerated(result.quiz);
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
          <h2>{isRemix ? "Remixing Your Quiz..." : "Crafting Your Quiz..."}</h2>
          <p>{isRemix ? "Creating new questions from the original quiz" : "Analyzing documents and generating questions"}</p>
          <div className="loading-dots">
            <span></span><span></span><span></span>
          </div>
          <div className="generating-shapes">
            <div className="shape shape-1"></div>
            <div className="shape shape-2"></div>
            <div className="shape shape-3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="config-section page-transition">
      <div className="config-header">
        <h2>{isRemix ? "Remix Quiz" : "Configure Your Quiz"}</h2>
        <p>{isRemix ? `Generating new questions based on "${remixSource.quiz_title || "Original Quiz"}"` : "Customize the quiz type, number of questions, and difficulty level"}</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="config-card">
        <div className="config-group">
          <label>Quiz Type</label>
          <div className="option-pills">
            {([
              { value: "mcq", label: "Multiple Choice" },
              { value: "true_false", label: "True / False" },
              { value: "fill_blank", label: "Fill in the Blank" },
              { value: "identification", label: "Identification" },
              { value: "matching", label: "Matching" },
              { value: "mixed", label: "Mixed" },
            ] as { value: QuizType; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                className={`pill ${quizType === opt.value ? "active" : ""}`}
                onClick={() => setQuizType(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="config-group">
          <label>Number of Questions (max 30)</label>
          <div className="count-selector">
            {countOptions.map((n) => (
              <button
                key={n}
                className={`count-btn ${questionCount === n ? "active" : ""}`}
                onClick={() => setQuestionCount(n)}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(30, Math.max(1, Number(e.target.value))))}
              className="count-input"
              placeholder="Custom"
            />
          </div>
        </div>

        <div className="config-group">
          <label>Difficulty</label>
          <div className="option-pills">
            {([
              { value: "", label: "Balanced" },
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Medium" },
              { value: "hard", label: "Hard" },
            ] as { value: Difficulty; label: string }[]).map((opt) => (
              <button
                key={opt.value}
                className={`pill ${difficulty === opt.value ? "active" : ""}`}
                onClick={() => setDifficulty(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="config-actions">
          <button className="btn-primary btn-lg btn-ripple" onClick={handleGenerate}>
            {isRemix ? "Remix Quiz" : "Generate Quiz"}
          </button>
          <button className="btn-secondary btn-lg btn-ripple" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

export type QuizType = "mcq" | "true_false" | "fill_blank" | "identification" | "matching" | "mixed";
export type Difficulty = "easy" | "medium" | "hard" | "";
export type AIModel = "grok" | "gemini";

export interface QuizQuestion {
  id: string;
  type: "mcq" | "true_false" | "fill_blank" | "identification" | "matching";
  prompt: string;
  choices?: string[];
  answer_index?: number;
  answers?: string[];
  pairs?: { left: string; right: string }[];
  explanation: string;
}

export interface Quiz {
  quiz_title: string;
  quiz_type: string;
  question_count: number;
  source_summary: string;
  questions: QuizQuestion[];
}

export interface QuizResult {
  ok: boolean;
  quiz?: Quiz;
  error?: string;
  raw?: string;
  details?: string;
}

export interface ScoreResult {
  earned: number;
  possible: number;
  percent: number;
  perQuestion: {
    id: string;
    type: string;
    earned: number;
    possible: number;
    correct: boolean;
  }[];
}

export type ReviewerType = "short" | "concise" | "detailed";
export type PreferResponse = "short" | "normal" | "long";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type AppView =
  | "upload" | "quiz-config" | "reviewer-config" | "chat"
  | "quiz" | "results" | "reviewer" | "settings"
  | "profile" | "bookmarks" | "rankings" | "shared-quiz"
  | "session" | "history"
  | "flashcard-config" | "flashcard" | "tile-game"
  | "word-scramble" | "pairs-game" | "speed-blitz";

export type FontSize = "small" | "medium" | "large" | "xlarge";

export interface ThemeColor {
  id: string;
  name: string;
  primary: string;
  light: string;
  gradient?: string;
}

export interface ThemeSettings {
  mode: "dark" | "light";
  accentColorId: string;
  fontFamily: string;
  fontSize: FontSize;
  allowBackNavigation: boolean;
  questionTimer: number;
}

export interface ApiKeySettings {
  grokKey: string;
  geminiKey: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl: string;
  hasGrokKey?: boolean;
  hasGeminiKey?: boolean;
}

export interface SavedQuiz {
  id: number;
  share_code: string;
  title: string;
  score: number;
  total_questions: number;
  time_spent: number;
  quiz_type: string;
  ai_model: string;
  quiz_data: Quiz;
  created_at: string;
  bookmarked_at?: string;
}

export interface UserFile {
  id: number;
  original_name: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface RankingUser {
  id: number;
  name: string;
  avatar: string;
  fileCount: number;
  quizCount: number;
}

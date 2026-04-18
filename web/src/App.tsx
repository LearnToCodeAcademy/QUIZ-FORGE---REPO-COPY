import React, { useState, useCallback, useEffect, useRef } from "react";
import type { Quiz, AppView, ChatMessage, AIModel, ThemeSettings, User, SavedQuiz } from "./types";
import FileUpload from "./components/FileUpload";
import ActionSelector from "./components/ActionSelector";
import QuizConfig from "./components/QuizConfig";
import QuizView from "./components/QuizView";
import QuizResults from "./components/QuizResults";
import ReviewerConfig from "./components/ReviewerConfig";
import ReviewerView from "./components/ReviewerView";
import ChatView from "./components/ChatView";
import Notification from "./components/Notification";
import Settings, { THEME_COLORS, FONTS, FONT_SIZES } from "./components/Settings";
import LandingPage from "./components/LandingPage";
import ProfilePage from "./components/ProfilePage";
import BookmarksPage from "./components/BookmarksPage";
import RankingsPage from "./components/RankingsPage";
import SharedQuizView from "./components/SharedQuizView";
import SessionPage from "./components/SessionPage";
import HistoryPage from "./components/HistoryPage";
import FlashcardConfig from "./components/FlashcardConfig";
import FlashcardView from "./components/FlashcardView";
import type { FlashcardDeck } from "./components/FlashcardView";
import TileGameView from "./components/TileGameView";
import WordScrambleView from "./components/WordScrambleView";
import MatchingPairsView from "./components/MatchingPairsView";
import SpeedBlitzView from "./components/SpeedBlitzView";
import { googleLogin, getMe, logout as apiLogout, uploadFiles, saveApiKeys } from "./api";

interface NotificationItem {
  id: number;
  message: string;
  type: "error" | "success" | "info";
}

function hexToLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

const DEFAULT_THEME: ThemeSettings = {
  mode: "dark",
  accentColorId: "purple",
  fontFamily: "inter",
  fontSize: "medium",
  allowBackNavigation: true,
  questionTimer: 0,
};

function loadThemeSettings(): ThemeSettings {
  try {
    const stored = localStorage.getItem("quizforge_theme_settings");
    if (stored) return { ...DEFAULT_THEME, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_THEME;
}

const GOOGLE_CLIENT_ID = "666046041125-3oh79likoaerdthd3q0liphtu0oep11t.apps.googleusercontent.com";

function getShareCodeFromUrl(): string | null {
  const path = window.location.pathname;
  const match = path.match(/\/share\/quiz\/(.+)/);
  return match ? match[1] : null;
}

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [view, setView] = useState<AppView>("upload");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [startedAt, setStartedAt] = useState(0);
  const [endedAt, setEndedAt] = useState(0);
  const [reviewerContent, setReviewerContent] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiModel, setAiModel] = useState<AIModel>("grok");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(loadThemeSettings);
  const [showSplash, setShowSplash] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [shareCode, setShareCode] = useState<string | null>(getShareCodeFromUrl);
  const [remixSource, setRemixSource] = useState<any>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [flashcardDeck, setFlashcardDeck] = useState<FlashcardDeck | null>(null);
  const [tileQuiz, setTileQuiz] = useState<Quiz | null>(null);
  const [quizMode, setQuizMode] = useState<"quiz" | "tile" | "scramble" | "pairs" | "blitz">("quiz");
  const savedFileNamesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("quizforge_token");
    if (token) {
      getMe().then((result) => {
        if (result.ok) setUser(result.user);
        else localStorage.removeItem("quizforge_token");
      }).catch(() => {}).finally(() => setAuthLoading(false));
    } else {
      // DEMO MODE: Auto-login with demo user (disable for production)
      setUser({
        id: 0,
        name: "Demo User",
        email: "demo@quizforge.dev",
        avatarUrl: "https://ui-avatars.com/api/?name=Demo+User&background=random",
        hasGrokKey: false,
        hasGeminiKey: false,
      });
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shareCode && user) {
      setView("shared-quiz");
    }
  }, [shareCode, user]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeSettings.mode);
    localStorage.setItem("quizforge_theme", themeSettings.mode);
    const color = THEME_COLORS.find((c) => c.id === themeSettings.accentColorId) || THEME_COLORS[0];
    document.documentElement.style.setProperty("--accent", color.primary);
    document.documentElement.style.setProperty("--accent-light", color.light);
    document.documentElement.style.setProperty("--accent-glow", `${color.primary}33`);
    document.documentElement.style.setProperty("--border-active", `${color.primary}80`);
    if (color.gradient) {
      document.documentElement.style.setProperty("--accent-gradient", color.gradient);
    } else {
      document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${color.primary}, ${color.light})`);
    }
    const lum = hexToLuminance(color.primary);
    document.documentElement.style.setProperty("--accent-text", lum > 0.4 ? "#1a1a2e" : "#ffffff");
    const font = FONTS.find((f) => f.id === themeSettings.fontFamily);
    if (font) document.documentElement.style.setProperty("--font-family", font.family);
    const fontSize = FONT_SIZES.find((f) => f.id === themeSettings.fontSize);
    if (fontSize) document.documentElement.style.setProperty("--font-size-base", fontSize.value);
    localStorage.setItem("quizforge_theme_settings", JSON.stringify(themeSettings));
  }, [themeSettings]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = () => setShowUserMenu(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showUserMenu]);

  const addNotification = useCallback((message: string, type: "error" | "success" | "info") => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => [...prev.slice(-4), { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeSettings((prev) => ({ ...prev, mode: prev.mode === "dark" ? "light" : "dark" }));
  }, []);

  const handleGoogleLogin = useCallback(async (credential: string) => {
    try {
      const result = await googleLogin(credential);
      if (result.ok) {
        localStorage.setItem("quizforge_token", result.token);
        setUser(result.user);
        addNotification(`Welcome, ${result.user.name}!`, "success");
      } else {
        addNotification(result.error || "Login failed", "error");
      }
    } catch {
      addNotification("Login failed. Please try again.", "error");
    }
  }, [addNotification]);

  const handleLogout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setView("upload");
    setShowUserMenu(false);
    addNotification("Signed out", "info");
  }, [addNotification]);

  const handleFilesUploadedForQuiz = useCallback(async (newFiles: File[]) => {
    if (!user) return;
    const unsaved = newFiles.filter(f => !savedFileNamesRef.current.has(f.name + f.size));
    if (unsaved.length === 0) return;
    try {
      await uploadFiles(unsaved);
      unsaved.forEach(f => savedFileNamesRef.current.add(f.name + f.size));
    } catch {}
  }, [user]);

  const handleAction = useCallback((action: "quiz" | "reviewer" | "chat" | "flashcard" | "tile-game" | "word-scramble" | "pairs-game" | "speed-blitz") => {
    if (user && files.length > 0) {
      handleFilesUploadedForQuiz(files);
    }
    if (action === "quiz") { setRemixSource(null); setQuizMode("quiz"); setView("quiz-config"); }
    else if (action === "reviewer") setView("reviewer-config");
    else if (action === "chat") setView("chat");
    else if (action === "flashcard") setView("flashcard-config");
    else if (action === "tile-game") { setRemixSource(null); setQuizMode("tile"); setView("quiz-config"); addNotification("🎮 Tile Game: Generate a quiz to play!", "info"); }
    else if (action === "word-scramble") { setRemixSource(null); setQuizMode("scramble"); setView("quiz-config"); addNotification("🔤 Word Scramble: Generate a quiz to start!", "info"); }
    else if (action === "pairs-game") { setRemixSource(null); setQuizMode("pairs"); setView("quiz-config"); addNotification("🧩 Matching Pairs: Generate a quiz to play!", "info"); }
    else if (action === "speed-blitz") { setRemixSource(null); setQuizMode("blitz"); setView("quiz-config"); addNotification("⚡ Speed Blitz: Generate an MCQ quiz to race!", "info"); }
  }, [user, files, handleFilesUploadedForQuiz, addNotification]);

  const handleQuizGenerated = useCallback((q: Quiz) => {
    setQuiz(q);
    setAnswers({});
    setStartedAt(Date.now());
    setEndedAt(0);
    setRemixSource(null);
    if (quizMode === "tile") {
      setTileQuiz(q);
      setView("tile-game");
    } else if (quizMode === "scramble") {
      setTileQuiz(q);
      setView("word-scramble");
    } else if (quizMode === "pairs") {
      setTileQuiz(q);
      setView("pairs-game");
    } else if (quizMode === "blitz") {
      setTileQuiz(q);
      setView("speed-blitz");
    } else {
      setView("quiz");
    }
  }, [quizMode]);

  const handleQuizSubmit = useCallback(() => {
    setEndedAt(Date.now());
    setView("results");
  }, []);

  const handleReviewerGenerated = useCallback((content: string) => {
    setReviewerContent(content);
    setView("reviewer");
  }, []);

  const handleReset = useCallback(() => {
    setQuiz(null);
    setAnswers({});
    setView("upload");
    setReviewerContent("");
    setChatHistory([]);
    setRemixSource(null);
    setFlashcardDeck(null);
    setTileQuiz(null);
    setQuizMode("quiz");
  }, []);

  const handleBackToActions = useCallback(() => { setRemixSource(null); setView("upload"); }, []);

  const handleRemixQuiz = useCallback((savedQuiz: SavedQuiz) => {
    if (savedQuiz.quiz_data) {
      setRemixSource(savedQuiz.quiz_data);
      setQuiz(null);
      setAnswers({});
      setView("quiz-config");
      addNotification("Configure your remixed quiz!", "info");
    }
  }, [addNotification]);

  const handleViewBookmarkedQuiz = useCallback((savedQuiz: SavedQuiz) => {
    if (savedQuiz.quiz_data) {
      setQuiz(savedQuiz.quiz_data);
      setAnswers({});
      setStartedAt(Date.now());
      setEndedAt(0);
      setView("quiz");
    }
  }, []);

  const handleCreateQuizFromFiles = useCallback((_fileIds: number[]) => {
    addNotification("Select files to upload first, then create a quiz from them!", "info");
    setView("upload");
  }, [addNotification]);

  const handleApiKeyInlineChange = useCallback((value: string) => {
    const keys = JSON.parse(localStorage.getItem("quizforge_api_keys") || '{"grokKey":"","geminiKey":""}');
    if (aiModel === "gemini") keys.geminiKey = value;
    else keys.grokKey = value;
    localStorage.setItem("quizforge_api_keys", JSON.stringify(keys));
    saveApiKeys(
      aiModel === "grok" ? value : keys.grokKey,
      aiModel === "gemini" ? value : keys.geminiKey
    ).catch(() => {});
  }, [aiModel]);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (showSplash) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <div className="splash-logo">⚡</div>
          <div className="splash-text">QuizForge</div>
          <div className="splash-bar"><div className="splash-bar-fill"></div></div>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="splash-screen" style={{animation: "none"}}>
        <div className="splash-content">
          <div className="spinner"></div>
          <div className="splash-text" style={{fontSize: 20, marginTop: 16}}>Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage googleClientId={GOOGLE_CLIENT_ID} onLogin={handleGoogleLogin} />
        <div className="notification-container">
          {notifications.map((n) => (
            <Notification key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div className="app-container">
      <div className="floating-particles">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="particle" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 8}s`, animationDuration: `${8 + Math.random() * 12}s`, width: `${2 + Math.random() * 4}px`, height: `${2 + Math.random() * 4}px` }} />
        ))}
      </div>

      <header className="app-header">
        <div className="header-inner">
          <div className="logo" onClick={handleReset}>
            <span className="logo-icon">⚡</span>
            <span className="logo-text">QuizForge</span>
          </div>
          <nav className="header-nav">
            <button className={`nav-link ${view === "upload" || view === "quiz-config" || view === "quiz" || view === "results" ? "active" : ""}`} onClick={handleReset}>Home</button>
            <button className={`nav-link ${view === "bookmarks" ? "active" : ""}`} onClick={() => setView("bookmarks")}>Bookmarks</button>
            <button className={`nav-link ${view === "rankings" ? "active" : ""}`} onClick={() => setView("rankings")}>Rankings</button>
            <button className={`nav-link ${view === "session" ? "active" : ""}`} onClick={() => setView("session")}>Session</button>
            <button className={`nav-link ${view === "history" ? "active" : ""}`} onClick={() => setView("history")}>History</button>
            <button className={`nav-link ${view === "profile" ? "active" : ""}`} onClick={() => setView("profile")}>Profile</button>
          </nav>
          <div className="header-actions">
            <button className="header-icon-btn" onClick={() => setView(view === "settings" ? "upload" : "settings")} title="Settings">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            <button className="theme-toggle" onClick={toggleTheme} title={themeSettings.mode === "dark" ? "Light Mode" : "Dark Mode"}>
              {themeSettings.mode === "dark" ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" /></svg>
              )}
            </button>
            <div className="user-menu-container" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}>
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="user-avatar-sm" />
              ) : (
                <div className="user-avatar-placeholder-sm">{user.name[0]}</div>
              )}
              {showUserMenu && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <span className="user-dropdown-name">{user.name}</span>
                    <span className="user-dropdown-email">{user.email}</span>
                  </div>
                  <div className="user-dropdown-divider"></div>
                  <button className="user-dropdown-item" onClick={() => { setView("profile"); setShowUserMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Profile
                  </button>
                  <button className="user-dropdown-item" onClick={() => { setView("settings"); setShowUserMenu(false); }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    Settings
                  </button>
                  <div className="user-dropdown-divider"></div>
                  <button className="user-dropdown-item user-dropdown-signout" onClick={handleLogout}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {view === "settings" && (
          <Settings themeSettings={themeSettings} onThemeChange={setThemeSettings} onBack={handleBackToActions} onNotify={addNotification} user={user} onLogout={handleLogout} />
        )}

        {view === "profile" && (
          <ProfilePage user={user} onNotify={addNotification} onUserUpdate={setUser} onCreateQuizFromFiles={handleCreateQuizFromFiles} />
        )}

        {view === "bookmarks" && (
          <BookmarksPage onNotify={addNotification} onRemixQuiz={handleRemixQuiz} onViewQuiz={handleViewBookmarkedQuiz} />
        )}

        {view === "rankings" && <RankingsPage />}

        {view === "session" && (
          <SessionPage
            currentQuiz={quiz}
            currentView={view}
            onNotify={addNotification}
          />
        )}

        {view === "history" && (
          <HistoryPage onNotify={addNotification} />
        )}

        {view === "shared-quiz" && shareCode && (
          <SharedQuizView shareCode={shareCode} user={user} onNotify={addNotification} onRemix={(q) => { setRemixSource(q); setQuiz(null); setView("quiz-config"); }} />
        )}

        {view === "upload" && (
          <>
            <div className="home-welcome-section">
              <div className="home-greeting">
                <div className="home-greeting-left">
                  <div className="home-greeting-eyebrow">
                    <span className="home-greeting-dot"></span>
                    {new Date().getHours() < 12 ? "Good morning" : new Date().getHours() < 17 ? "Good afternoon" : "Good evening"}
                  </div>
                  <h1 className="home-greeting-title">
                    Welcome back, <span className="home-greeting-name">{user.name.split(" ")[0]}</span>
                  </h1>
                  <p className="home-greeting-sub">Ready to transform your study materials today?</p>
                </div>
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="home-greeting-avatar" />
                )}
              </div>
              <div className="home-quick-stats">
                <div className="home-stat">
                  <span className="home-stat-icon">📝</span>
                  <div className="home-stat-info">
                    <span className="home-stat-value">∞</span>
                    <span className="home-stat-label">Quizzes Available</span>
                  </div>
                </div>
                <div className="home-stat">
                  <span className="home-stat-icon">🤖</span>
                  <div className="home-stat-info">
                    <span className="home-stat-value">2</span>
                    <span className="home-stat-label">AI Models</span>
                  </div>
                </div>
                <div className="home-stat">
                  <span className="home-stat-icon">📁</span>
                  <div className="home-stat-info">
                    <span className="home-stat-value">10</span>
                    <span className="home-stat-label">Files per Session</span>
                  </div>
                </div>
                <div className="home-stat">
                  <span className="home-stat-icon">⚡</span>
                  <div className="home-stat-info">
                    <span className="home-stat-value">Fast</span>
                    <span className="home-stat-label">Generation Speed</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="home-section-header">
              <h2 className="home-section-title">
                <span className="home-section-icon">📤</span>
                Upload Study Materials
              </h2>
              <p className="home-section-desc">Drag & drop your files or click to browse — PDF, DOCX, PPTX, TXT, and code files supported</p>
            </div>

            <FileUpload files={files} onFilesChange={(newFiles) => { setFiles(newFiles); }} />

            {files.length > 0 && (
              <div className="model-selector slide-in">
                <div className="model-selector-header">
                  <label className="model-label">
                    <span>🧠</span> Choose AI Model
                  </label>
                  <span className="model-selector-note">Both models are powerful — pick your preference</span>
                </div>
                <div className="model-options">
                  <button className={`model-btn ${aiModel === "grok" ? "active" : ""}`} onClick={() => setAiModel("grok")}>
                    <span className="model-icon">🤖</span>
                    <div className="model-info">
                      <span className="model-name">Grok</span>
                      <span className="model-desc">by xAI · Fast & powerful</span>
                    </div>
                    {aiModel === "grok" && <span className="model-selected-badge">Selected</span>}
                  </button>
                  <button className={`model-btn ${aiModel === "gemini" ? "active" : ""}`} onClick={() => setAiModel("gemini")}>
                    <span className="model-icon">✨</span>
                    <div className="model-info">
                      <span className="model-name">Google Gemini</span>
                      <span className="model-desc">by Google · Highly capable</span>
                    </div>
                    {aiModel === "gemini" && <span className="model-selected-badge">Selected</span>}
                  </button>
                </div>
                <div className="api-key-inline">
                  <span className="api-key-inline-label">🔑 Have your own API key? (optional — speeds things up)</span>
                  <input
                    type="password"
                    className="api-key-inline-input"
                    placeholder={aiModel === "gemini" ? "Gemini API key" : "Grok API key"}
                    onChange={(e) => handleApiKeyInlineChange(e.target.value)}
                  />
                </div>
              </div>
            )}

            {files.length > 0 && <ActionSelector onAction={handleAction} />}

            {files.length === 0 && (
              <div className="home-tips-section">
                <h3 className="home-tips-title">
                  <span>💡</span> Quick tips
                </h3>
                <div className="home-tips-grid">
                  <div className="home-tip-card">
                    <div className="home-tip-icon">📄</div>
                    <div className="home-tip-content">
                      <strong>Best file formats</strong>
                      <span>PDF and DOCX files give the best quiz quality</span>
                    </div>
                  </div>
                  <div className="home-tip-card">
                    <div className="home-tip-icon">📚</div>
                    <div className="home-tip-content">
                      <strong>Multiple files</strong>
                      <span>Upload up to 10 files at once for combined quizzes</span>
                    </div>
                  </div>
                  <div className="home-tip-card">
                    <div className="home-tip-icon">🔖</div>
                    <div className="home-tip-content">
                      <strong>Bookmark & remix</strong>
                      <span>Save your best quizzes and remix them for more practice</span>
                    </div>
                  </div>
                  <div className="home-tip-card">
                    <div className="home-tip-icon">🏆</div>
                    <div className="home-tip-content">
                      <strong>Track progress</strong>
                      <span>Check your history and rankings to see improvement</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {view === "quiz-config" && (
          <QuizConfig files={files} onQuizGenerated={handleQuizGenerated} onBack={handleBackToActions} isGenerating={isGenerating} setIsGenerating={setIsGenerating} aiModel={aiModel} onNotify={addNotification} remixSource={remixSource} />
        )}

        {view === "quiz" && quiz && (
          <QuizView quiz={quiz} answers={answers} setAnswers={setAnswers} onSubmit={handleQuizSubmit} allowBackNavigation={themeSettings.allowBackNavigation} questionTimer={themeSettings.questionTimer} />
        )}

        {view === "results" && quiz && (
          <QuizResults quiz={quiz} answers={answers} startedAt={startedAt} endedAt={endedAt || Date.now()} onReset={handleReset} files={files} aiModel={aiModel} onNotify={addNotification} user={user} />
        )}

        {view === "reviewer-config" && (
          <ReviewerConfig files={files} onReviewerGenerated={handleReviewerGenerated} onBack={handleBackToActions} aiModel={aiModel} onNotify={addNotification} />
        )}

        {view === "reviewer" && <ReviewerView content={reviewerContent} onBack={handleBackToActions} />}

        {view === "chat" && (
          <ChatView files={files} chatHistory={chatHistory} setChatHistory={setChatHistory} onBack={handleBackToActions} aiModel={aiModel} onNotify={addNotification} user={user} />
        )}

        {view === "flashcard-config" && (
          <FlashcardConfig
            files={files}
            onDeckGenerated={(deck) => { setFlashcardDeck(deck); setView("flashcard"); }}
            onBack={handleBackToActions}
            aiModel={aiModel}
            onNotify={addNotification}
          />
        )}

        {view === "flashcard" && flashcardDeck && (
          <FlashcardView deck={flashcardDeck} onBack={handleBackToActions} />
        )}

        {view === "tile-game" && tileQuiz && (
          <TileGameView quiz={tileQuiz} onBack={handleBackToActions} onNotify={addNotification} />
        )}

        {view === "word-scramble" && tileQuiz && (
          <WordScrambleView quiz={tileQuiz} onBack={handleBackToActions} onNotify={addNotification} />
        )}

        {view === "pairs-game" && tileQuiz && (
          <MatchingPairsView quiz={tileQuiz} onBack={handleBackToActions} onNotify={addNotification} />
        )}

        {view === "speed-blitz" && tileQuiz && (
          <SpeedBlitzView quiz={tileQuiz} onBack={handleBackToActions} onNotify={addNotification} />
        )}
      </main>

      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-brand"><span className="footer-logo">⚡</span><span>QuizForge</span></div>
          <div className="footer-divider"></div>
          <p className="footer-text">AI-powered study companion</p>
          <div className="footer-links">
            <span className="footer-badge">LaTeX Support</span>
            <span className="footer-badge">Dark & Light Mode</span>
            <span className="footer-badge">Multi-AI Models</span>
          </div>
        </div>
      </footer>

      {showScrollTop && (
        <button className="scroll-top-btn" onClick={scrollToTop} title="Scroll to top">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6" /></svg>
        </button>
      )}

      <div className="notification-container">
        {notifications.map((n) => (
          <Notification key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
        ))}
      </div>
    </div>
  );
}

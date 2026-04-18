import React, { useState, useEffect } from "react";
import type { ThemeSettings, ThemeColor, FontSize, ApiKeySettings, User } from "../types";
import { deleteAccount, logout } from "../api";

const THEME_COLORS: ThemeColor[] = [
  { id: "purple", name: "Purple", primary: "#7c3aed", light: "#8b5cf6" },
  { id: "blue", name: "Blue", primary: "#3b82f6", light: "#60a5fa" },
  { id: "green", name: "Green", primary: "#10b981", light: "#34d399" },
  { id: "red", name: "Red", primary: "#ef4444", light: "#f87171" },
  { id: "orange", name: "Orange", primary: "#f97316", light: "#fb923c" },
  { id: "teal", name: "Teal", primary: "#14b8a6", light: "#2dd4bf" },
  { id: "pink", name: "Pink", primary: "#ec4899", light: "#f472b6" },
  { id: "amber", name: "Amber", primary: "#f59e0b", light: "#fbbf24" },
  { id: "indigo", name: "Indigo", primary: "#4f46e5", light: "#6366f1" },
  { id: "slate", name: "Slate", primary: "#64748b", light: "#94a3b8" },
  { id: "sunset", name: "Sunset", primary: "#f97316", light: "#ec4899", gradient: "linear-gradient(135deg, #f97316, #ec4899)" },
  { id: "ocean", name: "Ocean", primary: "#3b82f6", light: "#14b8a6", gradient: "linear-gradient(135deg, #3b82f6, #14b8a6)" },
  { id: "forest", name: "Forest", primary: "#10b981", light: "#059669", gradient: "linear-gradient(135deg, #10b981, #059669)" },
  { id: "twilight", name: "Twilight", primary: "#7c3aed", light: "#3b82f6", gradient: "linear-gradient(135deg, #7c3aed, #3b82f6)" },
  { id: "rosegold", name: "Rose Gold", primary: "#ec4899", light: "#f59e0b", gradient: "linear-gradient(135deg, #ec4899, #f59e0b)" },
];

const FONTS = [
  { id: "inter", name: "Inter", family: "'Inter', sans-serif" },
  { id: "roboto", name: "Roboto", family: "'Roboto', sans-serif" },
  { id: "opensans", name: "Open Sans", family: "'Open Sans', sans-serif" },
  { id: "lato", name: "Lato", family: "'Lato', sans-serif" },
  { id: "poppins", name: "Poppins", family: "'Poppins', sans-serif" },
  { id: "montserrat", name: "Montserrat", family: "'Montserrat', sans-serif" },
  { id: "nunito", name: "Nunito", family: "'Nunito', sans-serif" },
  { id: "playfair", name: "Playfair Display", family: "'Playfair Display', serif" },
  { id: "sourcecode", name: "Source Code Pro", family: "'Source Code Pro', monospace" },
  { id: "merriweather", name: "Merriweather", family: "'Merriweather', serif" },
];

const FONT_SIZES: { id: FontSize; label: string; value: string }[] = [
  { id: "small", label: "Small", value: "14px" },
  { id: "medium", label: "Medium", value: "16px" },
  { id: "large", label: "Large", value: "18px" },
  { id: "xlarge", label: "Extra Large", value: "20px" },
];

interface Props {
  themeSettings: ThemeSettings;
  onThemeChange: (settings: ThemeSettings) => void;
  onBack: () => void;
  onNotify: (msg: string, type: "error" | "success" | "info") => void;
  user: User | null;
  onLogout: () => void;
}

export { THEME_COLORS, FONTS, FONT_SIZES };

export default function Settings({ themeSettings, onThemeChange, onBack, onNotify, user, onLogout }: Props) {
  const [settings, setSettings] = useState<ThemeSettings>(themeSettings);
  const [apiKeys, setApiKeys] = useState<ApiKeySettings>(() => {
    try {
      const stored = localStorage.getItem("quizforge_api_keys");
      return stored ? JSON.parse(stored) : { grokKey: "", geminiKey: "" };
    } catch { return { grokKey: "", geminiKey: "" }; }
  });
  const [showGrokKey, setShowGrokKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(5);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { onThemeChange(settings); }, [settings]);

  useEffect(() => {
    if (!showDeleteConfirm) return;
    setDeleteCountdown(5);
    const timer = setInterval(() => {
      setDeleteCountdown((prev) => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
    return () => clearInterval(timer);
  }, [showDeleteConfirm]);

  const handleApiKeySave = () => {
    localStorage.setItem("quizforge_api_keys", JSON.stringify(apiKeys));
    onNotify("API keys saved", "success");
  };

  const handleClearData = () => {
    if (confirm("This will clear all saved settings, API keys, and app data. Continue?")) {
      localStorage.removeItem("quizforge_theme_settings");
      localStorage.removeItem("quizforge_api_keys");
      localStorage.removeItem("quizforge_theme");
      localStorage.removeItem("quizforge_star_tutorial_seen");
      onNotify("All data cleared. Reloading...", "info");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      onNotify("Account deleted successfully", "info");
      onLogout();
    } catch { onNotify("Failed to delete account", "error"); }
    finally { setDeleting(false); setShowDeleteConfirm(false); }
  };

  return (
    <div className="settings-page page-transition">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Customize your QuizForge experience</p>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><span className="settings-icon">🎨</span> Theme Color</h3>
        <p className="settings-section-desc">Choose an accent color for the interface</p>
        <div className="settings-subsection">
          <span className="settings-sublabel">Solid Colors</span>
          <div className="color-grid">
            {THEME_COLORS.filter((c) => !c.gradient).map((color) => (
              <button key={color.id} className={`color-swatch ${settings.accentColorId === color.id ? "active" : ""}`} style={{ background: color.primary }} onClick={() => setSettings({ ...settings, accentColorId: color.id })} title={color.name}>
                {settings.accentColorId === color.id && <span className="swatch-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="settings-subsection">
          <span className="settings-sublabel">Gradient Colors</span>
          <div className="color-grid gradient-grid">
            {THEME_COLORS.filter((c) => c.gradient).map((color) => (
              <button key={color.id} className={`color-swatch gradient-swatch ${settings.accentColorId === color.id ? "active" : ""}`} style={{ background: color.gradient }} onClick={() => setSettings({ ...settings, accentColorId: color.id })} title={color.name}>
                <span className="swatch-label">{color.name}</span>
                {settings.accentColorId === color.id && <span className="swatch-check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><span className="settings-icon">🔤</span> Font Style</h3>
        <p className="settings-section-desc">Select your preferred font family</p>
        <div className="font-grid">
          {FONTS.map((font) => (
            <button key={font.id} className={`font-option ${settings.fontFamily === font.id ? "active" : ""}`} style={{ fontFamily: font.family }} onClick={() => setSettings({ ...settings, fontFamily: font.id })}>
              <span className="font-preview" style={{ fontFamily: font.family }}>Aa</span>
              <span className="font-name">{font.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><span className="settings-icon">📏</span> Font Size</h3>
        <p className="settings-section-desc">Adjust the base text size</p>
        <div className="font-size-options">
          {FONT_SIZES.map((fs) => (
            <button key={fs.id} className={`font-size-btn ${settings.fontSize === fs.id ? "active" : ""}`} onClick={() => setSettings({ ...settings, fontSize: fs.id })}>
              <span className="fs-label" style={{ fontSize: fs.value }}>{fs.label}</span>
              <span className="fs-value">{fs.value}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><span className="settings-icon">📝</span> Quiz Settings</h3>
        <p className="settings-section-desc">Configure quiz behavior</p>

        <div className="settings-toggle-row">
          <div className="toggle-info">
            <span className="toggle-label">Allow Going Back to Previous Questions</span>
            <span className="toggle-desc">When off, you can only move forward during quizzes</span>
          </div>
          <button className={`toggle-switch ${settings.allowBackNavigation ? "on" : "off"}`} onClick={() => setSettings({ ...settings, allowBackNavigation: !settings.allowBackNavigation })}>
            <div className="toggle-knob"></div>
          </button>
        </div>

        <div className="settings-timer-row">
          <div className="toggle-info">
            <span className="toggle-label">Per-Question Timer</span>
            <span className="toggle-desc">Auto-skip when time runs out (0 = disabled)</span>
          </div>
          <div className="timer-input-wrap">
            <input type="number" min={0} max={600} value={settings.questionTimer} onChange={(e) => setSettings({ ...settings, questionTimer: Math.max(0, Math.min(600, Number(e.target.value))) })} className="timer-input" />
            <span className="timer-unit">seconds</span>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title"><span className="settings-icon">🔑</span> Custom API Keys</h3>
        <p className="settings-section-desc">Optionally provide your own API keys (stored locally in your browser)</p>
        <div className="api-key-group">
          <label className="api-key-label">Grok (xAI) API Key</label>
          <div className="api-key-input-wrap">
            <input type={showGrokKey ? "text" : "password"} className="api-key-input" value={apiKeys.grokKey} onChange={(e) => setApiKeys({ ...apiKeys, grokKey: e.target.value })} placeholder="Enter your xAI API key (optional)" />
            <button className="api-key-toggle" onClick={() => setShowGrokKey(!showGrokKey)} type="button">{showGrokKey ? "Hide" : "Show"}</button>
          </div>
        </div>
        <div className="api-key-group">
          <label className="api-key-label">Google Gemini API Key</label>
          <div className="api-key-input-wrap">
            <input type={showGeminiKey ? "text" : "password"} className="api-key-input" value={apiKeys.geminiKey} onChange={(e) => setApiKeys({ ...apiKeys, geminiKey: e.target.value })} placeholder="Enter your Gemini API key (optional)" />
            <button className="api-key-toggle" onClick={() => setShowGeminiKey(!showGeminiKey)} type="button">{showGeminiKey ? "Hide" : "Show"}</button>
          </div>
        </div>
        <button className="btn-primary btn-ripple" onClick={handleApiKeySave}>Save API Keys</button>
      </div>

      <div className="settings-section settings-danger-zone">
        <h3 className="settings-section-title"><span className="settings-icon">⚠</span> Danger Zone</h3>
        <p className="settings-section-desc">Clear all saved data including settings, API keys, and preferences</p>
        <div className="danger-buttons">
          <button className="btn-danger btn-ripple" onClick={handleClearData}>Clear All Data</button>
          {user && (
            <button className="btn-danger btn-ripple" onClick={() => setShowDeleteConfirm(true)}>Delete Account</button>
          )}
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-confirm-icon">⚠️</div>
            <h3>Delete Your Account</h3>
            <p>You are hereby deleting your account. This action is <strong>irreversible</strong>. All your data, quizzes, bookmarks, files, and profile will be permanently removed.</p>
            <p className="delete-note">You can always create a new account using Google.</p>
            <div className="delete-confirm-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger btn-ripple" disabled={deleteCountdown > 0 || deleting} onClick={handleDeleteAccount}>
                {deleting ? "Deleting..." : deleteCountdown > 0 ? `Confirm (${deleteCountdown}s)` : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

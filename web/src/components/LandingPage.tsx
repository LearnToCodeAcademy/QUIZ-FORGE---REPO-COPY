import React, { useEffect, useState } from "react";

interface Props {
  googleClientId: string;
  onLogin: (credential: string) => void;
}

const STATS = [
  { value: "10K+", label: "Quizzes Created" },
  { value: "50+", label: "File Formats" },
  { value: "3", label: "AI Models" },
  { value: "100%", label: "Free to Start" },
];

const FEATURES = [
  {
    icon: "📝",
    title: "AI-Generated Quizzes",
    desc: "Automatically create MCQ, fill-in-the-blank, and matching questions from any document.",
    color: "#7c3aed",
  },
  {
    icon: "📖",
    title: "Smart Study Reviewers",
    desc: "Get structured summaries, key concepts, and notes generated instantly from your files.",
    color: "#2563eb",
  },
  {
    icon: "💬",
    title: "Chat with Your Files",
    desc: "Ask questions and have a conversation directly with the content of your uploaded materials.",
    color: "#059669",
  },
  {
    icon: "🔗",
    title: "Share & Remix",
    desc: "Share your quizzes with classmates and remix existing ones to create new study sets.",
    color: "#d97706",
  },
  {
    icon: "🏆",
    title: "Rankings & Progress",
    desc: "Track your performance over time and see how you rank against others on the leaderboard.",
    color: "#dc2626",
  },
  {
    icon: "📊",
    title: "Session Analytics",
    desc: "Review detailed results, time spent per question, and identify weak areas to improve.",
    color: "#7c3aed",
  },
];

const STEPS = [
  { num: "01", title: "Upload Your Files", desc: "Drag & drop PDFs, DOCX, PPTX, TXT, or code files" },
  { num: "02", title: "Pick an AI Action", desc: "Choose to generate a quiz, reviewer, or start a chat" },
  { num: "03", title: "Study Smarter", desc: "Take quizzes, review materials, and track your progress" },
];

export default function LandingPage({ googleClientId, onLogin }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setLoaded(true);
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  useEffect(() => {
    if (!loaded || !(window as any).google) return;
    (window as any).google.accounts.id.initialize({
      client_id: googleClientId,
      callback: (response: any) => {
        if (response.credential) onLogin(response.credential);
      },
    });
    (window as any).google.accounts.id.renderButton(
      document.getElementById("google-signin-btn"),
      { theme: "outline", size: "large", width: 300, text: "continue_with" }
    );
    const btn2 = document.getElementById("google-signin-btn-2");
    if (btn2) {
      (window as any).google.accounts.id.renderButton(btn2, { theme: "filled_blue", size: "large", width: 280, text: "continue_with" });
    }
  }, [loaded, googleClientId, onLogin]);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="lp-root">
      <div className="lp-bg">
        <div className="lp-bg-mesh"></div>
        <div className="lp-orbs">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`lp-orb lp-orb-${i + 1}`} />
          ))}
        </div>
        <div className="lp-grid-lines"></div>
      </div>

      <nav className="lp-nav" style={{ backdropFilter: scrollY > 40 ? "blur(20px)" : "none", background: scrollY > 40 ? "rgba(15,15,35,0.85)" : "transparent" }}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo">
            <span className="lp-nav-logo-icon">⚡</span>
            <span className="lp-nav-logo-text">QuizForge</span>
          </div>
          <div className="lp-nav-badge">AI-Powered</div>
        </div>
      </nav>

      <section className="lp-hero">
        <div className="lp-hero-eyebrow">
          <span className="lp-eyebrow-dot"></span>
          Powered by Grok & Gemini AI
        </div>
        <h1 className="lp-hero-title">
          Study Smarter with
          <span className="lp-hero-gradient"> AI-Powered</span>
          <br />Learning Tools
        </h1>
        <p className="lp-hero-subtitle">
          Transform any document into interactive quizzes, smart study reviewers,
          and AI chat sessions. Upload once, learn endlessly.
        </p>

        <div className="lp-hero-cta">
          <div className="lp-auth-card">
            <p className="lp-auth-label">
              <span className="lp-auth-icon">🔒</span>
              Secure sign-in with Google
            </p>
            <div id="google-signin-btn" className="google-btn-container"></div>
            <p className="lp-auth-note">Free to use · No credit card required</p>
          </div>
        </div>

        <div className="lp-hero-formats">
          {["PDF", "DOCX", "PPTX", "TXT", "Code", "More"].map((f) => (
            <span key={f} className="lp-format-badge">{f}</span>
          ))}
        </div>
      </section>

      <section className="lp-stats">
        <div className="lp-stats-inner">
          {STATS.map((s) => (
            <div key={s.label} className="lp-stat-card">
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-how">
        <div className="lp-section-inner">
          <div className="lp-section-label">How it works</div>
          <h2 className="lp-section-title">Three steps to smarter studying</h2>
          <div className="lp-steps">
            {STEPS.map((step, i) => (
              <div key={step.num} className="lp-step">
                <div className="lp-step-connector" style={{ opacity: i < STEPS.length - 1 ? 1 : 0 }}></div>
                <div className="lp-step-num">{step.num}</div>
                <h3 className="lp-step-title">{step.title}</h3>
                <p className="lp-step-desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-features">
        <div className="lp-section-inner">
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-title">Everything you need to ace your exams</h2>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <div className="lp-feature-icon-wrap" style={{ background: `${f.color}18`, borderColor: `${f.color}30` }}>
                  <span className="lp-feature-icon">{f.icon}</span>
                </div>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-cta-section">
        <div className="lp-cta-inner">
          <div className="lp-cta-badge">Ready to start?</div>
          <h2 className="lp-cta-title">Transform how you study today</h2>
          <p className="lp-cta-sub">Join students and educators using QuizForge to study smarter, not harder.</p>
          <div className="lp-cta-auth">
            <div id="google-signin-btn-2" className="google-btn-container lp-cta-google-btn"></div>
          </div>
          <div className="lp-cta-perks">
            <span>✓ Free forever</span>
            <span>✓ No setup needed</span>
            <span>✓ Works with any file</span>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-logo">
            <span>⚡</span>
            <span>QuizForge</span>
          </div>
          <p className="lp-footer-copy">AI-powered study companion · Built for students & educators</p>
        </div>
      </footer>
    </div>
  );
}

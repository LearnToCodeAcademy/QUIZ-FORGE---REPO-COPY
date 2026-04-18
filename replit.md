# QuizForge

## Overview
QuizForge is a quiz generation app that uses xAI Grok and Google Gemini to create quizzes, study reviewers, and interactive chat from uploaded learning files. Users upload documents (PDF, DOCX, PPTX, TXT, MD), and can generate quizzes, study reviewers, or chat with an AI about their materials. Requires Google OAuth sign-in.

## Project Architecture
- **Monorepo** with two packages:
  - `server/` - Express + TypeScript backend (port 3001 in dev)
  - `web/` - Vite + React + TypeScript frontend (port 5000 in dev)
- Root `package.json` uses `concurrently` to run both in dev mode
- Vite proxies `/api` requests to the backend server
- **PostgreSQL database** for persistent user data, quizzes, bookmarks, and files

## Netlify Deployment (Frontend Only)
- `netlify.toml` at `QUIZMATEHCI/netlify.toml` — base: `web`, publish: `dist`, build: `npm run build`
- `web/public/_redirects` — SPA catch-all redirect to `/index.html`
- Run `npm run build` inside `web/` to verify the production build locally
- **Note**: The Express backend requires separate hosting (Railway, Render, etc.). Set the backend URL via environment variables for production API calls.

## Key Features
- **Google OAuth Authentication**: Sign-in via Google with JWT-based sessions (httpOnly cookies + localStorage)
- **User Profiles**: Avatar upload (custom or Google), file management, stats
- **Generate Quiz**: MCQ, True/False, Fill-in-the-blank, Identification, Matching, Mixed types (max 30 items)
- **Per-Question Timer**: Configurable timer with auto-skip when time expires
- **Back Navigation Toggle**: Settings toggle to enable/disable going back to previous questions
- **Quiz Sharing**: Share quizzes via shareable links (/share/quiz/{shareCode})
- **Quiz Bookmarking**: Save and bookmark quizzes, download as PDF/TXT/DOCX
- **Leaderboard/Rankings**: Top users ranked by file uploads with podium display
- **Generate Reviewer**: Short/Concise/Detailed study reviewers with PDF download
- **Chat with QuizForge**: AI-powered chat with maximize/minimize and markdown rendering
- **Quiz Results**: Trophy modal, score display, answer review with AI explanations, save/share
- **AI Model Selection**: Choose between Grok (xAI) and Google Gemini
- **Settings Page**: Theme colors, fonts, quiz settings (timer, back nav), API keys, delete account
- **LaTeX Math Rendering**: KaTeX-powered math in quiz prompts, choices, chat, reviewer
- **Dark/Light Mode**: Theme toggle with localStorage persistence
- **Splash Screen**: Animated loading screen on app start
- **Landing Page**: Google Sign-In with animated UI elements
- **Delete Account**: 5-second confirmation delay for safety

## Frontend Structure (React)
- `web/src/main.tsx` - Entry point (imports KaTeX CSS + enhancements CSS)
- `web/src/App.tsx` - Main app with auth flow, routing, state management
- `web/src/components/` - React components:
  - LandingPage (Google Sign-In), ProfilePage (file management/avatar)
  - BookmarksPage (quiz bookmarks with PDF/TXT/DOCX download)
  - RankingsPage (leaderboard with podium display)
  - SharedQuizView (take/remix shared quizzes)
  - FileUpload, ActionSelector, QuizConfig, QuizView, QuizResults
  - ReviewerConfig, ReviewerView, ChatView (with maximize/minimize)
  - Settings (theme, font, quiz settings, API keys, delete account)
  - MarkdownRenderer (markdown + LaTeX rendering)
  - Notification (toast notifications), StarTutorial (first-visit spotlight)
- `web/src/styles/global.css` - Base styles with dark/light theme variables
- `web/src/styles/enhancements.css` - Advanced animations, all component styles
- `web/src/api.ts` - API client functions (auth, quizzes, files, bookmarks, rankings)
- `web/src/types.ts` - TypeScript types (User, SavedQuiz, UserFile, RankingUser, etc.)
- `web/src/scoring.ts` - Quiz scoring logic

## Backend API Endpoints
- `POST /api/auth/google` - Google OAuth login (returns JWT token)
- `GET /api/auth/me` - Get current user profile (requires auth)
- `POST /api/auth/logout` - Logout (clears cookie)
- `DELETE /api/auth/account` - Delete user account (requires auth)
- `PUT /api/auth/profile` - Update profile (name, custom avatar)
- `PUT /api/auth/api-keys` - Save API keys server-side
- `POST /api/quizzes/save` - Save quiz with answers and score (requires auth)
- `GET /api/quizzes/my` - Get user's quizzes (requires auth)
- `GET /api/quizzes/shared/:shareCode` - Get shared quiz (public)
- `POST /api/bookmarks/add` - Bookmark a quiz (requires auth)
- `DELETE /api/bookmarks/:quizId` - Remove bookmark (requires auth)
- `GET /api/bookmarks/my` - Get user's bookmarks (requires auth)
- `POST /api/files/upload` - Upload files to profile (requires auth)
- `GET /api/files/my` - Get user's files (requires auth)
- `DELETE /api/files/:id` - Delete a file (requires auth)
- `GET /api/rankings` - Get leaderboard rankings (public, paginated)
- `POST /api/generate-quiz` - Generate quiz from uploaded files
- `POST /api/generate-reviewer` - Generate study reviewer
- `POST /api/chat` - Chat with QuizForge AI
- `POST /api/explain-answer` - Get explanation for quiz answer
- `GET /api/health` - Health check

## Backend Structure
- `server/src/index.ts` - Express server setup with all route mounting
- `server/src/db.ts` - PostgreSQL pool + schema initialization
- `server/src/auth.ts` - Google OAuth verification, JWT, auth middleware
- `server/src/routes/auth.ts` - Auth routes (login, profile, delete account)
- `server/src/routes/quizzes.ts` - Quiz CRUD, bookmarks, rankings
- `server/src/routes/files.ts` - File upload/download/delete
- `server/src/xaiClient.ts` - xAI/Grok API client (OpenAI SDK)
- `server/src/geminiClient.ts` - Google Gemini API client
- `server/src/config.ts` - API key configuration
- `server/src/services/` - Business logic (grokGenerate, textExtract, promptBuilder, quizSchema)

## Database Schema (PostgreSQL)
- `users` - id, google_id, email, name, avatar_url, custom_avatar, grok_api_key, gemini_api_key
- `user_files` - id, user_id, filename, original_name, file_type, file_data (BYTEA), file_size
- `quizzes` - id, user_id, share_code, title, quiz_data (JSONB), answers, score, total_questions, time_spent, quiz_type, ai_model
- `bookmarks` - id, user_id, quiz_id (unique constraint)

## Key Dependencies
- Backend: Express, pg, google-auth-library, jsonwebtoken, uuid, cookie-parser, OpenAI SDK (for xAI), @google/genai (for Gemini), multer, pdf-parse, mammoth, zod, jszip
- Frontend: React, Vite, jsPDF (PDF generation), KaTeX (math rendering)

## Theme System
- 10 solid accent colors + 5 gradient themes
- 10 font families
- 4 font sizes
- All settings stored in localStorage as `quizforge_theme_settings`

## Environment Variables
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (secret)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret (secret)
- `DATABASE_URL` - PostgreSQL connection string (auto-provided)
- `XAI_API_KEY` - xAI API key for Grok
- `GEMINI_API_KEY` - Google Gemini API key
- `XAI_MODEL` - Optional. Model name (default: grok-4)
- `PORT` - Server port (default: 3001)

## Development Setup
- `npm run dev` starts both server and frontend concurrently
- Frontend: Vite dev server on port 5000 (0.0.0.0, all hosts allowed)
- Backend: Express on port 3001
- Vite proxies `/api/*` to backend

## Recent Changes
- Added Google OAuth authentication with JWT sessions
- Added PostgreSQL database with users, quizzes, bookmarks, user_files tables
- Created LandingPage with Google Sign-In and animated UI
- Created ProfilePage with file management and avatar upload
- Created BookmarksPage with download as PDF/TXT/DOCX
- Created RankingsPage with podium display and pagination
- Created SharedQuizView for viewing/taking shared quizzes
- Added per-question timer with auto-skip in QuizView
- Added back-navigation toggle in Settings
- Added quiz save, bookmark, and share functionality in QuizResults
- Added chat maximize/minimize in ChatView
- Added delete account with 5-second confirmation delay
- Added header navigation (Home, Bookmarks, Rankings, Profile)
- Added hero section on upload page

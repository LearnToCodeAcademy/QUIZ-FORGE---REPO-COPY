# QuizForge Flutter App

This directory contains a Flutter migration starter for QuizForge.

## Required Flutter version

- Flutter `3.41.7` (pinned via `.fvmrc`)

## Setup

1. Install FVM and Flutter 3.41.7:
   ```bash
   fvm install 3.41.7
   fvm use 3.41.7
   ```
2. Install dependencies:
   ```bash
   fvm flutter pub get
   ```
3. Run:
   ```bash
   fvm flutter run
   ```

## Environment

Pass API host using `--dart-define`:

```bash
fvm flutter run --dart-define=API_BASE_URL=http://localhost:3001/api
```

If omitted, the app defaults to `http://localhost:3001/api`.

## Included features

- Google sign-in flow with backend token exchange (`/auth/google`)
- Current user fetch (`/auth/me`) and logout
- API key save for Grok/Gemini (`/auth/api-keys`)
- Quiz generation (`/generate-quiz`) with AI model selection (Grok/Gemini)
- Basic quiz-taking UI with scoring for multiple-choice style questions

## Notes

- This is a migration base; advanced web features (flashcards, tile game, rankings, etc.) should be ported incrementally.
- For production mobile builds, configure Google Sign-In platform settings in Android/iOS project files.

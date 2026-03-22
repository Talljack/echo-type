<p align="center">
  <img src="app-icon.svg" alt="EchoType" width="80" height="80" />
</p>

<h1 align="center">EchoType</h1>

<p align="center">
  Master English through listening, speaking, reading & writing — all in one app.
</p>

<p align="center">
  <a href="https://echo-type.app">Try Online</a> ·
  <a href="https://github.com/Talljack/echo-type/releases">Download Desktop</a> ·
  <a href="https://github.com/Talljack/echo-type/issues">Feedback</a>
</p>

<p align="center">
  <a href="https://github.com/Talljack/echo-type/releases"><img src="https://img.shields.io/github/v/release/Talljack/echo-type?label=version" alt="Version" /></a>
  <a href="https://github.com/Talljack/echo-type/blob/main/LICENSE"><img src="https://img.shields.io/github/license/Talljack/echo-type" alt="License" /></a>
  <a href="https://github.com/Talljack/echo-type/stargazers"><img src="https://img.shields.io/github/stars/Talljack/echo-type" alt="Stars" /></a>
</p>

---

## Why EchoType?

Most English learning apps only focus on one skill. EchoType combines **listening, speaking, reading, and writing** into a single workflow — so you can practice the same content across all four skills, the way language is actually learned.

- Import any article, YouTube video, or web page as learning material
- Practice the same content by listening, reading aloud, and typing it out
- Get AI-powered tutoring, pronunciation scoring, and smart review reminders
- Works in the browser or as a native desktop app (macOS / Windows / Linux)
- Your data stays local — nothing leaves your device unless you choose to sync

## Features at a Glance

| Module | What You Do | What You Get |
| --- | --- | --- |
| **Listen** | Play content with TTS, follow along word-by-word | Listening comprehension, pronunciation exposure |
| **Speak** | Read aloud in role-play scenarios (ordering food, interviews...) | Speech recognition feedback, pronunciation scoring |
| **Read** | Read articles with built-in translation | Reading comprehension, vocabulary building |
| **Write** | Type passages against the original text | Typing speed (WPM), accuracy tracking, mistake analysis |
| **AI Tutor** | Chat with an AI English coach anytime | Grammar tips, vocabulary quizzes, practice drills |
| **Library** | Import from URL, YouTube, file, or type manually | Reusable content across all modules |

## Getting Started

### 1. Open EchoType

Visit [echo-type.app](https://echo-type.app) in your browser, or [download the desktop app](https://github.com/Talljack/echo-type/releases).

### 2. Set Up AI (optional but recommended)

Go to **Settings > AI Provider** and add your API key (OpenAI, Anthropic, Google, DeepSeek, and 15+ more supported). This enables the AI tutor, content generation, and pronunciation assessment.

### 3. Import Your First Content

Go to **Library** and import learning material:

- **Paste a URL** — any article or blog post
- **YouTube link** — extracts the transcript automatically
- **Upload a file** — text, PDF, or audio
- **Type manually** — words, sentences, or full articles
- **Use built-in content** — word books and scenario packs included

### 4. Start Practicing

Open your imported content in any module:

- **Listen** — hear it spoken aloud with word highlighting
- **Read** — read with Chinese translation side-by-side
- **Write** — type along and track your accuracy
- **Speak** — practice conversation scenarios with speech recognition

### 5. Review and Improve

- The **Dashboard** shows your progress, streaks, and stats
- **Spaced repetition** (FSRS) reminds you to review at the optimal time
- The **AI tutor** chat is always available for explanations and practice

## Use Cases

**Preparing for IELTS/TOEFL?** Import reading passages and practice all four skills with the same material.

**Want to improve your pronunciation?** Use the Speak module with SpeechSuper or AI-powered pronunciation assessment.

**Reading English news daily?** Paste any article URL and turn it into a full listening + reading + typing exercise.

**Building vocabulary?** Import word lists, review with spaced repetition, and test yourself with AI-generated quizzes.

**Learning at your own pace?** Everything runs locally — no account needed, no subscription, no ads.

## Desktop App

| Platform | Download |
| --- | --- |
| macOS (Apple Silicon) | `EchoType_<ver>_aarch64.dmg` |
| Windows | `EchoType_<ver>_x64-setup.exe` |
| Linux (Debian/Ubuntu) | `EchoType_<ver>_amd64.deb` |

The desktop app includes **system tray**, **keyboard shortcuts**, and **auto-update**.

## Cloud Sync (Optional)

Sign in with Google or GitHub to sync your learning progress across devices. Your content library, practice history, and settings travel with you.

## For Developers

```bash
git clone https://github.com/Talljack/echo-type.git
cd echo-type
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). For desktop development, install [Rust](https://rustup.rs/) and run `pnpm tauri:dev`.

**Tech stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Tauri v2 · Vercel AI SDK · IndexedDB · Supabase

## License

[MIT](LICENSE)

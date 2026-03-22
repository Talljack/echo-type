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

<p align="center">
  <a href="./README.zh-CN.md">中文文档</a>
</p>

---

## Why EchoType?

Most English learning apps only focus on one skill. EchoType combines **listening, speaking, reading, and writing** into a single workflow — so you can practice the same content across all four skills, the way language is actually learned.

- Import any article, YouTube video, or web page as learning material
- Practice the same content by listening, reading aloud, and typing it out
- Shadow reading: link the same material across Listen → Read → Write for deep practice
- Take an English level assessment (CEFR A1–C2) to get personalized difficulty
- AI tutor with 15+ providers — always available for explanations and practice
- Pronunciation scoring with phoneme-level IPA feedback
- Spaced repetition (FSRS) for long-term vocabulary retention
- Works in the browser or as a native desktop app (macOS / Windows / Linux)
- Your data stays local — nothing leaves your device unless you choose to sync

## Features

| Module | What You Do | What You Get |
| --- | --- | --- |
| **Listen** | Play content with TTS (browser voices, Fish Audio, Kokoro), follow along word-by-word | Listening comprehension, pronunciation exposure |
| **Speak** | Read aloud in 50+ role-play scenarios (ordering food, job interviews, doctor visits...) | Real-time speech recognition, pronunciation scoring |
| **Read** | Read articles with built-in Chinese translation | Reading comprehension, vocabulary in context |
| **Write** | Type passages against the original text | Typing speed (WPM), accuracy tracking, mistake analysis |
| **Shadow Reading** | Practice the same content across Listen → Read → Write | Deep multi-skill reinforcement with one piece of content |
| **Level Assessment** | Take a 30-question adaptive CEFR test | Know your level (A1–C2), content auto-matches your ability |
| **AI Tutor** | Chat with an AI English coach anytime | Grammar tips, vocabulary quizzes, practice drills, explanations |
| **Library** | Import from URL, YouTube, file, audio, or type manually | One content library shared across all modules |

The Library supports multiple content types:

- **Words** — single vocabulary with definitions, examples, and pronunciation
- **Sentences** — phrases and expressions for pattern practice
- **Articles** — full-length reading passages at any difficulty level
- **Scenarios** — 50+ real-world conversation situations (ordering food, doctor visits, job interviews, airport, hotel check-in...)
- **Word Books** — curated themed vocabulary packs (college entrance, professional, daily life, travel, technology, grammar, idioms...)

All content is tagged, searchable, and can be practiced in any module. AI can also generate new content at your CEFR level on demand.

| **Dashboard** | View daily plan, progress stats, recent sessions, streaks | Track your learning journey at a glance |
| **Spaced Repetition** | FSRS-based smart review reminders | Review words and phrases at the scientifically optimal time |
| **Cloud Sync** | Sign in with Google or GitHub | Sync progress, library, and settings across devices |
| **Keyboard Shortcuts** | Fully customizable keybindings, command palette (Cmd+K) | Navigate and control everything without touching the mouse |

## Getting Started

### 1. Open EchoType

Visit [echo-type.app](https://echo-type.app) in your browser, or [download the desktop app](https://github.com/Talljack/echo-type/releases).

### 2. Take the Level Assessment

Go to **Settings > English Level** and take a quick 30-question test. EchoType determines your CEFR level (A1–C2) and adjusts content difficulty automatically.

### 3. Set Up AI (optional but recommended)

Go to **Settings > AI Provider** and add your API key. Supported providers include OpenAI, Anthropic, Google, DeepSeek, Groq, xAI, Mistral, and 10+ more. This enables the AI tutor, content generation, translation, and pronunciation assessment.

### 4. Import Your First Content

Go to **Library** and import learning material:

- **Paste a URL** — any article or blog post, auto-extracted
- **YouTube link** — extracts the transcript automatically
- **Upload a file** — text, PDF, or audio (transcribed via AI)
- **Type manually** — words, sentences, or full articles
- **Browse Word Books** — built-in themed vocabulary packs

### 5. Start Practicing

Open your imported content in any module:

- **Listen** — hear it spoken aloud with word-by-word highlighting
- **Read** — read with Chinese translation side-by-side
- **Write** — type along and track your speed and accuracy
- **Speak** — practice conversation scenarios with speech recognition

### 6. Try Shadow Reading

Enable **Shadow Reading** in Settings to link content across modules. When you practice an article in Listen, the same content follows you into Read and Write — reinforcing the material through multiple skills.

### 7. Review and Improve

- Check your **Dashboard** for daily plan, progress, and streaks
- **Spaced repetition** reminds you to review words at the right time
- The **AI tutor** is always one click away for help

## Use Cases

**Preparing for IELTS/TOEFL?** Take the level assessment, import reading passages, and practice all four skills with the same material. Shadow reading helps you deeply absorb test content.

**Want to improve your pronunciation?** Use the Speak module with 50+ real-world scenarios. Enable SpeechSuper for phoneme-level IPA feedback, or use the AI fallback for instant scoring.

**Reading English news daily?** Paste any article URL — EchoType turns it into a full listening + reading + typing exercise automatically.

**Building vocabulary?** Browse built-in Word Books (college, professional, travel, daily life) or import your own lists. Review with FSRS spaced repetition and test yourself with AI-generated quizzes.

**Not sure where to start?** Take the English level test — EchoType recommends content matched to your CEFR level.

**Learning at your own pace?** Everything runs locally — no account needed, no subscription, no ads. Sign in only if you want cloud sync.

## Desktop App

| Platform | Download |
| --- | --- |
| macOS (Apple Silicon) | `EchoType_<ver>_aarch64.dmg` |
| Windows | `EchoType_<ver>_x64-setup.exe` |
| Linux (Debian/Ubuntu) | `EchoType_<ver>_amd64.deb` |

The desktop app includes **system tray** (Show/Hide, quick navigation, Quit), **keyboard shortcuts**, and **auto-update**.

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

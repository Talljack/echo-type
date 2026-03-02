# Local Media Import — Design Document

> Date: 2026-03-01
> Status: Draft

## Overview

EchoType currently supports importing content from URLs (YouTube, Bilibili, TikTok, Twitter/X) via `yt-dlp`, and from text (paste) and PDF (file upload). However, there is **no way to import local audio or video files** from the user's device. This plan adds local media upload with server-side transcription via OpenAI Whisper API.

## Current Import Architecture

| Method | Location | Input | Processing | Output |
|--------|----------|-------|------------|--------|
| Text paste | Library > Text Import | Clipboard text | Type detection | `ContentItem` |
| YouTube transcript | Library > YouTube | URL | `youtube-transcript` lib | `ContentItem` with text |
| PDF upload | Library > PDF/Book | `.pdf` file | `pdf-parse` lib | `ContentItem` with text |
| Platform extraction | Tools > Media Import | URL | `yt-dlp` server-side | `ContentItem` + audio file |
| Text extract | Tools > Text Extract | Clipboard text | AI segmentation | `ContentItem` |
| AI generation | Tools > AI Generate | Topic prompt | AI generation | `ContentItem` |

**Gap**: No local `.mp3`, `.wav`, `.m4a`, `.mp4`, `.webm` file upload.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Transcription engine | OpenAI Whisper API | Best accuracy, supports 50+ languages, already have OpenAI integration |
| File size limit | 25MB (Whisper API limit) | Whisper API hard limit; larger files need chunking (Phase 2) |
| Audio storage | Save to `public/media/` | Consistent with existing `yt-dlp` extraction pattern |
| Supported formats | `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac`, `.mp4`, `.webm`, `.avi` | Whisper supports these natively |
| UI location | Tools > Media Import (new section) + Library > new "Audio/Video" tab | Tools for power users; Library for quick import |
| Transcription language | Auto-detect (default) + manual override | Whisper auto-detects well; override for edge cases |
| Video handling | Extract audio track → transcribe | No video playback needed; we only need the text content |

## Interaction Flow

### Tools > Media Import — Extended

```
Media Import Tab (updated):
  ┌──────────────────────────────────────────────────┐
  │ Import Source:                                    │
  │ [🔗 From URL] [📁 From Local File]    ← NEW tab  │
  │                                                   │
  │ ┌─── From Local File ─────────────────────────┐  │
  │ │                                               │  │
  │ │  ┌─────────────────────────────────────────┐ │  │
  │ │  │     📁 Drop audio/video file here       │ │  │
  │ │  │     or click to browse                   │ │  │
  │ │  │                                          │ │  │
  │ │  │     MP3, WAV, M4A, MP4, WebM (max 25MB) │ │  │
  │ │  └─────────────────────────────────────────┘ │  │
  │ │                                               │  │
  │ │  Language: [Auto-detect ▼]                    │  │
  │ │                                               │  │
  │ │  [🎯 Transcribe]                              │  │
  │ │                                               │  │
  │ │  ─── Result ──────────────────────────────── │  │
  │ │  Audio Preview: [▶ ━━━━━━━━━━━━━━━ 3:42]     │  │
  │ │  Transcript:                                  │  │
  │ │  ┌─────────────────────────────────────────┐ │  │
  │ │  │ "Today we're going to talk about..."    │ │  │
  │ │  └─────────────────────────────────────────┘ │  │
  │ │                                               │  │
  │ │  Title: [________________________]            │  │
  │ │  Category: [________] (AI auto-classify)      │  │
  │ │  Difficulty: [Beginner] [Intermediate] [Adv]  │  │
  │ │  Tags: [_________________________]            │  │
  │ │                                               │  │
  │ │  [💾 Import to Library]                       │  │
  │ └───────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────┘
```

### Library > Import — New Tab

```
Import Content:
  [Text] [YouTube] [PDF/Book] [Audio/Video]  ← NEW tab
```

Simplified version of the Tools flow — just file upload + transcribe + save.

## Technical Architecture

### API Route: `/api/import/transcribe`

```
POST /api/import/transcribe
Content-Type: multipart/form-data

Body:
  file: File (audio/video, max 25MB)
  language?: string (ISO 639-1 code, e.g. "en", "zh")

Response:
{
  text: string,           // Full transcription
  language: string,       // Detected language
  duration: number,       // Audio duration in seconds
  segments?: Array<{      // Word/segment-level timestamps (if available)
    start: number,
    end: number,
    text: string
  }>
}
```

### API Route: `/api/import/upload-media`

```
POST /api/import/upload-media
Content-Type: multipart/form-data

Body:
  file: File (audio/video, max 25MB)

Response:
{
  audioUrl: string,       // Path like /media/abc123.mp3
  filename: string,       // Original filename
  duration: number,       // Duration in seconds
  mimeType: string        // e.g. "audio/mpeg"
}
```

### Processing Pipeline

```
User selects file
  → Client validates (type + size)
  → Upload to /api/import/upload-media
    → Save to public/media/[nanoid].[ext]
    → Return audioUrl
  → Upload to /api/import/transcribe (parallel or sequential)
    → Forward file to OpenAI Whisper API
    → Return transcript + segments
  → Show preview (audio player + transcript)
  → User edits metadata (title, category, tags, difficulty)
  → Save ContentItem to Dexie with:
    - text: transcript
    - metadata.audioUrl: saved file path
    - metadata.sourceFilename: original filename
    - metadata.videoDuration: duration
    - metadata.timestamps: segments (if available)
```

### Video Handling

For video files (`.mp4`, `.webm`, `.avi`):
1. Server extracts audio track using `ffmpeg` (already likely available if `yt-dlp` is installed)
2. Saves extracted audio as `.mp3` to `public/media/`
3. Sends audio to Whisper API for transcription
4. Video file itself is NOT stored (only extracted audio)

```bash
# ffmpeg command for audio extraction
ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 4 output.mp3
```

## State Management

No new stores needed. The import flow is self-contained within the component, using local `useState` — consistent with existing `MediaImportTab`, `PdfImport`, etc.

### ContentMetadata Extension

No changes needed — the existing `ContentMetadata` interface already supports everything:

```typescript
interface ContentMetadata {
  sourceUrl?: string;        // Not used for local files
  timestamps?: Array<{...}>; // Whisper segments
  sourceFilename?: string;   // Original uploaded filename
  pageRange?: string;        // Not used
  audioUrl?: string;         // Path to saved audio
  platform?: string;         // "local" for local uploads
  videoDuration?: number;    // Duration from Whisper/ffmpeg
}
```

## Component Changes

### 1. Tools Page — MediaImportTab Split

Refactor `MediaImportTab` into two sub-tabs:

```
Media Import
  ├── From URL (existing functionality, unchanged)
  └── From Local File (NEW)
```

Implementation: Add internal state `importMode: 'url' | 'local'` with toggle buttons.

### 2. NEW: `LocalMediaUpload` component (`src/components/import/local-media-upload.tsx`)

Reusable component for both Tools and Library import pages.

```
Props:
  onImported?: () => void  // Callback after save (e.g., router.push)
  compact?: boolean        // Simplified UI for Library tab
```

Features:
- Drag-and-drop zone (following `PdfImport` pattern)
- File type + size validation with clear error messages
- Upload progress indicator
- Audio preview player after transcription
- Editable metadata: title, category, difficulty, tags
- AI auto-classify category (reuse existing `/api/tools/classify`)

### 3. Library Import Page — New Tab

Add "Audio/Video" tab to `/library/import/page.tsx`:

```typescript
<TabsTrigger value="audio">
  <Mic className="w-4 h-4" />
  <span className="hidden sm:inline">Audio/Video</span>
</TabsTrigger>

<TabsContent value="audio">
  <LocalMediaUpload compact onImported={() => router.push('/library')} />
</TabsContent>
```

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/import/transcribe/route.ts` | NEW: Whisper API transcription endpoint |
| `src/app/api/import/upload-media/route.ts` | NEW: File upload + storage endpoint |
| `src/components/import/local-media-upload.tsx` | NEW: Reusable local media upload component |
| `src/app/(app)/tools/page.tsx` | Split MediaImportTab into URL/Local sub-tabs |
| `src/app/(app)/library/import/page.tsx` | Add Audio/Video tab |

## Dependencies

### Required
- `openai` npm package (already installed for AI features) — for Whisper API
- OpenAI API key (already configured via provider settings)

### Optional (Phase 2)
- `ffmpeg` binary on server — for video audio extraction
- `fluent-ffmpeg` npm package — Node.js ffmpeg wrapper

## Edge Cases

| Case | Behavior |
|------|----------|
| File > 25MB | Client-side rejection with message: "File too large. Maximum 25MB. Try trimming the audio first." |
| Unsupported format | Client-side rejection: "Unsupported format. Supported: MP3, WAV, M4A, OGG, FLAC, MP4, WebM" |
| Whisper API timeout | Show error: "Transcription timed out. Try a shorter file." Retry button. |
| Whisper API key missing | Show error: "OpenAI API key required. Configure in Settings > AI Providers." |
| Empty transcription | Show warning: "No speech detected. The audio may be music or silent." Allow save anyway. |
| Non-English audio | Whisper auto-detects language. Show detected language. User can re-transcribe with manual language override. |
| Video file uploaded | Extract audio → transcribe → save audio only. Show note: "Audio extracted from video." |
| Network error during upload | Show retry button. File stays selected in the input. |
| Duplicate upload | No dedup — user may intentionally re-import with different metadata |

## Security Considerations

- **File validation**: Check MIME type AND file extension on server (not just client)
- **File size**: Enforce 25MB limit on both client and server (`bodyParser` config)
- **Storage**: Files saved with `nanoid` names to prevent path traversal
- **Cleanup**: Consider periodic cleanup of orphaned files in `public/media/` (Phase 2)

## Implementation Order

1. **API routes** (`/api/import/transcribe`, `/api/import/upload-media`) — backend first
2. **`LocalMediaUpload` component** — reusable UI
3. **Tools page integration** — split MediaImportTab
4. **Library page integration** — add Audio/Video tab
5. **Video support** — ffmpeg audio extraction (can be Phase 2 if ffmpeg unavailable)

## Future Enhancements (Phase 2)

1. **Large file chunking**: Split files >25MB into chunks, transcribe each, merge results
2. **ffmpeg video processing**: Full video-to-audio extraction pipeline
3. **Batch upload**: Import multiple files at once
4. **Recording**: Record audio directly in the browser (MediaRecorder API)
5. **Waveform preview**: Use wavesurfer.js for uploaded audio visualization
6. **Background processing**: Queue-based transcription for multiple files
7. **Local Whisper**: Run whisper.cpp locally for offline/privacy use cases

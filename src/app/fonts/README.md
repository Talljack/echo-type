# Bundled fonts

Self-hosted (no network needed at build or runtime — important for the Tauri desktop
build and for builds behind restricted networks). Latin subsets of variable fonts,
taken from the `@fontsource-variable/*` 5.3.0 packages.

| File | Family | Role | License |
| --- | --- | --- | --- |
| `figtree-latin-wght.woff2` | Figtree (300–900) | UI & body text | SIL OFL 1.1 |
| `bricolage-latin-wght.woff2` | Bricolage Grotesque (200–800) | Display headings, numbers | SIL OFL 1.1 |
| `literata-latin-wght.woff2` | Literata (200–900) | Long-form reading passages & transcripts | SIL OFL 1.1 |
| `jetbrains-mono-latin-wght.woff2` | JetBrains Mono (100–800) | Typing / dictation practice | SIL OFL 1.1 |

Chinese text falls back to the platform CJK fonts (PingFang SC, Hiragino Sans GB,
Microsoft YaHei, Noto Sans CJK SC) declared in `src/app/globals.css`.

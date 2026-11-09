# Studio Paper — EchoType design language

EchoType is a study desk for learning English from real material: one video or one
article becomes listening, speaking, reading and writing practice. The interface
should feel like a calm, well-lit desk — **paper, ink, one teal pen and four
highlighters** — so the learner's attention stays on the material.

- **Paper** is the default (light) theme, **Ink** is the dark theme. Both use the
  same tokens; `.dark` on `<html>` switches them. Settings → Appearance
  (Light / Dark / System) and the sidebar toggle both control it.
- All tokens live in `src/app/globals.css`. Never hard-code hex values or raw
  Tailwind palette colours in components; use the semantic utilities below.

## 1. Colour

### Surfaces & text

| Token | Utility | Paper | Ink | Use |
| --- | --- | --- | --- | --- |
| canvas | `bg-canvas` | `#f5f3ee` | `#121311` | App background, sidebar |
| surface | `bg-surface` | `#ffffff` | `#1a1b18` | Cards, panels, inputs |
| surface-2 | `bg-surface-2` | `#f4f1ec` | `#21231f` | Subtle fills, hover, wells |
| surface-3 | `bg-surface-3` | `#ebe7df` | `#2a2c27` | Pressed / stronger fills |
| line | `border-line` | `#e3ded4` | `#2e302b` | Default borders & dividers |
| line-strong | `border-line-strong` | `#cdc6b8` | `#3f413b` | Inputs, emphasised borders |
| ink | `text-ink` | `#1c1b18` | `#efece5` | Primary text, titles |
| ink-2 | `text-ink-2` | `#4f4b44` | `#c9c4b9` | Body / secondary text |
| ink-3 | `text-ink-3` | `#6f6a60` | `#a19c90` | Meta text, descriptions (AA) |
| ink-4 | `text-ink-4` | `#9a9488` | `#75716a` | Placeholders, decorative icons only |

### Brand — "Echo teal"

| Utility | Use |
| --- | --- |
| `bg-brand` + `text-on-brand` | The one primary action per screen, active progress |
| `hover:bg-brand-strong` | Hover/pressed state of brand fills |
| `text-brand-ink` | Links, active icons, brand-coloured text |
| `bg-brand-soft` / `bg-brand-tint` | Selected rows, soft buttons, callouts |
| `border-brand-line` | Borders of selected / brand-tinted elements |
| `bg-highlight` / `bg-highlight-soft` | The reading "marker": current word/sentence, selection |

### Skills — the same colour always means the same skill

| Skill | Fill | Text | Tint | Icon |
| --- | --- | --- | --- | --- |
| Listen 听 | `bg-listen` | `text-listen-ink` | `bg-listen-soft` | Headphones |
| Speak 说 | `bg-speak` | `text-speak-ink` | `bg-speak-soft` | Mic |
| Read 读 | `bg-read` | `text-read-ink` | `bg-read-soft` | BookOpen |
| Write 写 | `bg-write` | `text-write-ink` | `bg-write-soft` | Keyboard |

Use `SKILLS`, `SkillTile` and `SkillChip` from `src/components/shared/skill.tsx`
instead of re-declaring these.

### Feedback

`success`, `warning`, `danger`, `info` — each has a fill (`bg-success`), text
(`text-success-ink`), tint (`bg-success-soft`) and border (`border-success-line`).
Green/red are reserved for right/wrong feedback; don't use them decoratively.

### Legacy bridge

Older code may still contain `indigo-*`, `slate-*`, `emerald-*`… classes. The
`@theme` bridge in `globals.css` re-points those families to the tokens above
(indigo → brand, slate → ink/surface, emerald/green → success, red/rose →
danger, amber/yellow → warning, blue/sky/cyan → info, violet/purple → write,
orange → speak) so they render on-theme in both modes. Migrate them to semantic
utilities when you touch a file.

## 2. Typography

| Role | Family | Utility | Notes |
| --- | --- | --- | --- |
| UI & body | Figtree | `font-sans` (default) | 15px body, 13px meta |
| Display | Fraunces | `font-display` | Page titles (28–34px), big numbers, wordmark |
| Reading | Literata | `font-reading` / `prose-reading` | Articles, transcripts, passages: 18px / 1.85 |
| Typing | JetBrains Mono | `font-mono` | Typing & dictation |

Fonts are self-hosted from `src/app/fonts` (no network needed). Chinese falls
back to PingFang SC / Microsoft YaHei / Noto Sans SC in every stack.

## 3. Shape, depth & motion

- Radius: controls `rounded-lg` (12px), cards `rounded-2xl` (20px), sheets/dialogs
  `rounded-2xl`, pills `rounded-full`.
- Elevation is warm and quiet: `shadow-xs` on cards, `shadow-lg` on popovers,
  `shadow-xl` on dialogs. In Ink, borders do most of the work.
- `card-paper` utility = surface + line border + `rounded-2xl` + `shadow-xs`.
- Motion 150–320ms with `ease-out-soft`; `animate-rise-in` for entering content.
  Everything respects `prefers-reduced-motion`.

## 4. Layout & navigation

- **Sidebar** (desktop): Study (Today, Courses, Review, Notes), Materials
  (Library, Discover), Practice (Conversation, Pronunciation); a primary
  **Add material** button and **Search ⌘K** at the top; Settings, theme toggle and
  account at the bottom. Collapses to a 76px rail (remembered).
- **Mobile**: bottom tab bar — Today, Courses, **+ Add**, Review, More (drawer).
- Page content max-width `max-w-6xl` (reading surfaces `max-w-3xl`), page padding
  `px-5 md:px-10`, vertical rhythm `space-y-8` between sections.
- Every page starts with `PageHeader` (`src/components/layout/page-header.tsx`):
  optional back link / eyebrow, display title, one-line description, actions.

## 5. Interaction principles

1. **One primary action per screen** (`bg-brand`). Everything else is outline,
   soft or ghost.
2. **Material first.** Practice screens put the text/video in the centre on paper;
   controls sit in a sticky bar with keyboard hints.
3. **Skill colour = orientation.** A learner should always know which skill they
   are practising from colour and icon alone.
4. **Feedback is immediate and kind.** Right/wrong colours only on the learner's
   own input; always offer a next step ("Try again", "Next sentence").
5. **Progress is visible but quiet.** Thin progress bars, small rings; celebrate
   completion once, not constantly.
6. Touch targets ≥ 40px; visible focus rings (`ring-ring/35`); all icons that
   act as buttons have `aria-label`s.

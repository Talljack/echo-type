# Learning workspace and trustworthy pronunciation

Approved direction: introduce LearningUnit/Lesson; migrate all existing content additively; deterministic segmentation; truthful pronunciation feedback. User delegated remaining design and implementation decisions.

## Data and migration

LearningUnit groups a book/category, collection, or individual article/media. Lesson references original content with exact text or timed segments. Originals and records are never rewritten. Stable IDs plus transactional reconciliation make migration resumable and idempotent. Deleted sources are not offered for practice. Newly imported/synced content enters the same reconciliation. Existing completed sessions count only for unsplit original exercises; they never imply that a new, smaller excerpt was practiced.

Lessons use 20 vocabulary items, paragraph/sentence boundaries around 350 words, or subtitle boundaries around five minutes. Unbroken paragraphs are bounded without dropping characters. AI is optional enrichment, not a migration dependency. Course outline permits renaming and splitting lessons without changing originals. Original audio/time offsets stay associated with excerpts.

## Learning experience

Dashboard begins with one Today workspace: due review, resume current course, targeted weakness. Full course list is searchable, and each course has a lesson outline. A lesson offers listen/read/speak/write through existing SingleItemPractice, preserving translation, speech fallback and session recording. Step completion derives from saved completed sessions. Moving to the next step is explicit, resumable, and never awarded just for navigation. Course and lesson progress uses stable exercise IDs.

## Pronunciation

Replace misleading browser percentages with recognized/not-recognized text. No browser or text-AI result implies phonetic mastery. A pronunciation studio provides sound reference, articulatory instructions, example word recordings, minimal-pair listening, and professional assessment when configured. Separate practice completion, listening evidence, and professional evidence. Legacy browser completion is retained as history, not converted into mastery. Failed listening/verified phonemes enter Weak Spots and Today. Handle denial, unsupported browsers, empty recordings and cancellation. Display only metrics actually returned by the provider, with source labels.

## Visual system

Calm learning workspace; existing Poppins/Open Sans, indigo #4F46E5, canvas #EEF2FF, dark ink #312E81, green for completed evidence. Tailwind only. Main reading surface white; secondary surfaces slate-50; radii 12px controls/24px workspace. One primary next action. Desktop outline + practice pane, mobile stacked; 44px controls; visible focus; reduced-motion safe. No decorative imagery required.

## Verification

Test deterministic reconstruction, text preservation, concurrency/idempotency, deleted sources, actual lesson progress, browser score trust and microphone cleanup. Typecheck and targeted regression suite, then desktop/mobile browser exercise including reload. Professional live service depends on user credentials; no fabricated successful assessment. Deliver an HTML design artifact and local preview; no automatic production deployment.

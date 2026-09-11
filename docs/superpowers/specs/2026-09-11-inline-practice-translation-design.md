# Inline practice translations

User direction: translations belong below the original, without a duplicate card; accept ordinary apostrophes when materials use smart punctuation. Existing authorization delegates design decisions and implementation.

Keep the existing Tailwind, fonts, colors and native host integration. Type's actual character display is the original: show sentence translations directly below it, keep cursor feedback and one hidden input, and collapse the optional full reference. Do not change stored content, scoring rules for genuinely wrong characters, or translation settings/cache/retry.

Listen and Read should reuse the word-aware reading view with inline sentence translations and preserve word playback/highlighting. Speak already renders translations below messages and stays unchanged. Missing or unmatched translations must never hide original words or shift later translations onto the wrong sentence.

Alternatives rejected: shrinking the duplicate cards still separates context; side-by-side panes fail on phones. Inline sentence pairs work across web, desktop and the iOS web host without native layout forks.

Verify straight/curly quote equivalence in both directions, real errors, partial/repeated sentence alignment, and browser layout at desktop and 375px. No release or remote changes in this task.

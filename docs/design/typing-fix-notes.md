# Course typing correction

The previous view showed both a character feedback panel and an editable textarea. It now uses one compact native textarea (including mobile keyboard / IME support), with success/error feedback on that field. The reference material stays separate. Screenshots: `course-typing-desktop.png` and `course-typing-mobile.png`.

Correct answers are saved before success is announced. Within a lesson, Type advances to the next Type item after 600 ms. The final Type item says “Practice saved” and retains explicit Continue. Failed saves retain the answer and allow retry. Repeated submission is guarded; switching exercises cancels pending automatic navigation. Manual and automatic legacy wordbook transitions are idempotent so they cannot skip the next unanswered item.

Verification:

- Regression tests initially reproduced missing course advancement, oversized input, unhandled save failure, and a manual/automatic navigation race (item 3 instead of item 2).
- TypeScript check passed; 132 unit-test files / 780 tests passed.
- Final focused browser rerun: all 5 course-typing regression tests passed (39.8 s), plus the updated legacy single-input test passed independently.
- The expanded 32-test browser run passed 28 tests and failed 4. One failure was a too-broad new selector matching the textarea itself; it was narrowed and its individual rerun passed. The remaining three failures concern existing expectations outside this typing change: Listen inline playback controls, default Write translation visibility, and Read's Listen button. They remain unresolved; the expanded suite is not fully green.
- Independent review passed after the navigation race correction.
- Tauri debug app rebuilt successfully at `src-tauri/target/debug/bundle/macos/EchoType.app`. This is a local build, not an installed-app update or production release.

The shared web component also serves iOS. No new iOS binary or production website was deployed for this correction, and this turn did not verify real-device typing. Existing learning data was not cleared or migrated by this fix.

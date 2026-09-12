# P0 + P1 implementation tracking

Baseline main a74a8b2, branch codex/p0-p1-learning-loop. User requested current checkout, no worktree. Preserve all legacy learning data. Do not deploy or publish this branch without instruction.

## Work packages

- [x] P0-A: sync cursor failure/retry, pagination, per-entity timestamps, account isolation, safe conflict preservation, schema expansion, binary ZIP backup and restore.
- [x] P0-B: lesson comprehension with source evidence, original writing/feedback/revision, immutable attempts, original drills still accessible.
- [x] P1-A: persisted minute-budget daily queue, pause/resume/skip/defer, evidence completion, bounded unified review entry, settings and rollover.
- [x] P1-B: durable foreground import jobs, resume/retry, original files, reviewed blocks, SRT/VTT offset, idempotent publication and source links.
- [x] P1-C: retelling, personal examples and sentence pronunciation, retry history and weak-spot practice linkage.
- [x] Integration: full Vitest + tsc + lint, browser workflows at desktop/375px, code review, migration instructions and explicit platform limits.

## Data ownership

Additive Dexie v18/v19 migrations own learningAttempts, dailyTasks, importJobs, syncConflicts and syncEntityState. Existing originals and historical sessions are not replaced. Cloud migrations are generated but not applied to production. Table availability is reported explicitly.

## UI contract

Quiet learning workspace: Poppins/Open Sans retained; Indigo action emphasis; dark Slate正文; white work surfaces on light canvas. Tailwind only. Radius scale: 8px fields, 12px controls, 16px sections, 24px outer workspace. No duplicated full translation card; status next to content. Actions minimum 44px, visible focus, reduced-motion-safe press scale. Existing five primary navigation entries unchanged.

Daily workspace: orient with time budget, show executable rows, then learning settings. Completion is evidence, not navigation. Empty/error/loading states cannot claim achievement.

## Verification log

**Expanded cross-platform validation did not pass release acceptance.** See `2026-09-12-cross-platform-verification.md` for newly discovered storage/migration/recovery failures and the Windows authentication blocker. The results below describe the earlier narrower run, not universal compatibility.

Baseline: 137 Vitest files / 821 tests passed before code changes. Each work package records targeted red/green verification; final results appended after integration.

Final local verification (2026-09-12):

- Vitest: 149 files / 890 tests passed.
- TypeScript: `pnpm exec tsc --noEmit` passed.
- Biome: `pnpm lint` passed (591 files, error-level checks).
- Production: `pnpm build` passed.
- Chromium: 12 integration tests passed (1.6m), covering daily queue + real saved response, durable imports, lesson immutable revisions, favorites queue and binary backup. Narrow-width workflows include 375px layouts. Dashboard screenshot visually inspected at desktop width.
- Independent reviews led to fixes for legacy/new completion separation, source anchors, stale import edits, unchanged audio retries, ZIP preflight, cumulative daily budget, targeted evidence allocation, favorites skipping/account races, restored sync cursors, stale conflict decisions, cross-account conflict archives and keyset pagination.
- Sync migrations and RLS/CAS assertions verified against isolated local PostgreSQL 16, not production.

## Delivery boundaries

Shared web/Tauri UI and data code are updated; Windows/macOS/iOS physical-device builds and startup have not been verified in this branch. No client release, PR or production migration was performed. Follow `docs/sync-v3-deployment.md` for coordinated deployment: older unconditional-sync clients must upgrade with the server guard.

Media stays local and is transferable in ZIP backups, not uploaded to cloud object storage. Import jobs run in the foreground and resume explicitly; they are not cloud workers. Drafts are session-local, submitted attempts sync. Comprehension is source-evidenced open response; spoken transfer uses recordings and self-review, not a new acoustic scoring engine or certified CEFR assessment. P2 offline/monetization features remain out of scope.

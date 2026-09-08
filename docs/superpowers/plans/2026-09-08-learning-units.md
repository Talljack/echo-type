# Learning units implementation plan

Goal: deliver additive course migration, continuous practice and trustworthy pronunciation in the existing app.

Architecture: deterministic pure course builder; Dexie tables and transaction-based reconciliation; shared learning workspace using existing practice; isolated pronunciation studio. Tech: TypeScript, Dexie, Next.js, Tailwind, Vitest/Playwright.

1. Add `src/types/learning-unit.ts`, `src/lib/learning-units.ts`, `src/lib/learning-unit-repository.ts` and version 17 tables. Tests cover stable IDs, complete text coverage, timed splits, 20-item lessons and deleted items. Use `pnpm exec vitest run src/lib/learning-units.test.ts`.
2. Add `/learn` and `/learn/[unitId]` workspaces; use SingleItemPractice and saved session evidence. Add Today card to dashboard ahead of analytics, and course entry after import. Integrate import/sync via content-driven reconciliation rather than changing originals.
3. Delegate pronunciation studio implementation with recognition/professional evidence separation, minimal-pair training, weak-spot persistence, media cleanup and tests. Preserve existing settings and avoid invented metrics.
4. Create standalone HTML design handoff for Dashboard/course/pronunciation, verify actual screens desktop/mobile. Run `pnpm typecheck`, targeted Vitest, then build. Review requirements then code quality; address findings before local commit.

User has authorized continuous execution; use subagent-driven-development for isolated pronunciation work, with primary agent implementing courses and doing integration.

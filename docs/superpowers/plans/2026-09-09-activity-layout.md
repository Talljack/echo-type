# Activity Layout Implementation Plan

**Goal:** Make the approved Activity summary readable without oversized cards.
**Architecture:** Existing dashboard grid and MiniHeatmap only; dictionary strings for summary labels.
**Tech Stack:** React, Tailwind, Vitest, Playwright.

- [x] Add SSR regression tests in dashboard-mini-components.test.tsx for period, active days, date labels and removal of 10px cells. RED confirmed missing period label before implementation.
- [x] Change MiniHeatmap to bounded fluid square cells and local-calendar weekday alignment. Add English/Chinese summary copy. Change dashboard-mini-analytics grid to auto-fit bounded columns.
- [x] Run targeted and full unit tests, TypeScript and Biome. 804 tests passed; browser regression covers 375px and 1280px, square cells, bounded cards and no horizontal overflow. Screenshots use isolated test records. No user data writes.
- [x] Read-only review found no blockers. Changes remain local, no deployment or native binary rebuild. The existing range ends yesterday; this layout change preserves that statistical contract.

# Course-led navigation

This iteration implements navigation and entry-point consolidation, not new reading-comprehension or free-writing engines.

Web / Desktop: Today, My courses, Learning materials, Review center and My notes form the primary group. AI conversation and Pronunciation remain specialist destinations. Settings is anchored above account controls. Legacy Listen/Read/Write lists remain available under My courses → Practice one skill and via existing shortcuts/deep links.

Notes shares a contextual header and route tabs for saved notes and useful expressions. Existing favorite and journal stores, IDs, source context, editing and search remain intact. Materials adds catalog and import links. Review links to three independent queues, without mixing rating models; it reads only required review data and never rebuilds derived courses to render the summary.

Visual checks: `navigation-desktop.png`, `navigation-mobile.png`, `navigation-notes-zh.png`. English and Chinese labels, collapsed active destination and 375px overflow were checked. No user content was deleted or migrated by this iteration.

Verification: 134 unit-test files / 798 tests, TypeScript, touched-source Biome checks and local Tauri debug app build passed. Final combined browser run passed 12 tests (48.4 s): six navigation tests, five typing regressions and one full course workspace flow. Coverage includes legacy route highlighting, persisted expression notes, distinct queue counts, read failure/retry and command-palette pronunciation. Native validation is recorded after its final routing review.

Release boundary: the local desktop artifact is `src-tauri/target/debug/bundle/macos/EchoType.app`; it is not a signed release or installed-app update. No push, PR, production deployment, TestFlight upload or physical-device speech test is included.

# Course-led navigation

This iteration implements navigation and entry-point consolidation, not new reading-comprehension or free-writing engines.

Web / Desktop: Today, My courses, Learning materials, Review center and My notes form the primary group. AI conversation and Pronunciation remain specialist destinations. Settings is anchored above account controls. Legacy Listen/Read/Write lists remain available under My courses → Practice one skill and via existing shortcuts/deep links.

Notes shares a contextual header and route tabs for saved notes and useful expressions. Existing favorite and journal stores, IDs, source context, editing and search remain intact. Materials adds catalog and import links. Review links to three independent queues, without mixing rating models; it reads only required review data and never rebuilds derived courses to render the summary.

Visual checks: `navigation-desktop.png`, `navigation-mobile.png`, `navigation-notes-zh.png`. English and Chinese labels, collapsed active destination and 375px overflow were checked. No user content was deleted or migrated by this iteration.

Verification: 135 unit-test files / 803 tests and TypeScript passed. Final combined browser run passed 12 tests (54.1 s): six navigation tests, five typing regressions and one full course workspace flow. Coverage includes legacy route highlighting, persisted expression notes, distinct queue counts, read failure/retry and command-palette pronunciation. Touched-source Biome checks have no errors; the account menu retains its pre-existing avatar img warning.

iOS now has Today / Courses / Materials / Review / Notes tabs. Cross-section links and explicit programmatic navigation (notes practice, shortcuts, command palette and AI tools) dispatch to the owning tab before the source page moves. Same-section navigation retains Next history. Destination queries are preserved, while Back/root navigation drops old lesson/review parameters. Local tabs share a single ephemeral data store; production persistent storage is unchanged.

Native validation: the latest seven unit tests passed, including real WKWebView bridge calls for both links and programmatic navigation, source-page preservation, query isolation and shared local store identity (`/tmp/echotype-native-final-seven-unit.log`). An earlier migration batch passed four targeted native UI tests for five-tab roots, ownership, restoration and back chrome (`/tmp/echotype-native-migration-final.log`). Spec and code-quality reviews were completed and findings fixed.

Native limitation: real Today → Courses and Notes → Review page-click tests did not reach their target controls because the local web app remained at "Loading your language settings..." in iOS 18.1 and 26.5 simulators. This is NOT a passing end-to-end result. See `/tmp/echotype-native-modern-links.log`. Full native UI suite, physical-device behavior and speech were not verified; do not treat this branch as an iOS release certification.

Release boundary: the final local Tauri debug build passed after the navigation bridge updates. Its artifact is `src-tauri/target/debug/bundle/macos/EchoType.app`; it is not a signed release or installed-app update. No push, PR, production deployment, TestFlight upload or physical-device speech test is included.

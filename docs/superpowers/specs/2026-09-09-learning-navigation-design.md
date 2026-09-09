# Learning navigation consolidation

Approved direction: course-led learning plus independent AI conversation and pronunciation practice.

Primary navigation: Today `/dashboard`, My courses `/learn`, Learning materials `/library`, Review center `/review`, My notes `/favorites`. Specialist navigation: AI conversation `/speak`, Pronunciation `/pronunciation`. Settings stays separate. Legacy list and detail routes remain functional; no tables, stored IDs or records are removed or migrated.

Notes shares a section header and route tabs across favorites and useful expressions (`/journal`). This preserves each source model and its editing/search features instead of copying or deduplicating user data. Favorites review belongs to Review, not Notes. Review center links to due lesson practice, due saved notes, and weak spots; each retains its own scoring and completion rules. Materials adds visible catalog/import links; courses adds an optional single-skill practice menu. Contextual section links must be reachable on mobile and native hosts with no sidebar.

Desktop uses the shared web runtime. iOS uses five tabs: Today, Courses, Materials, Review, Notes, with legacy practice paths owned by Courses, specialist training reachable from the shared course page, and deep-link/back handling updated. Old native test launch tab names should remain accepted aliases if inexpensive. No production release or app distribution is included.

Acceptance: seven primary/specialist web links plus settings; correct active parent for all legacy/deep routes; accessible selected-page state; materials and notes subroutes reachable; three review sources not silently merged; English/Chinese navigation; 375px no horizontal overflow; existing data and legacy practice routes remain intact. Genuine reading comprehension and free writing remain future work, not claims of this navigation release.

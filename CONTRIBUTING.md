# Contributing resources to EchoType

Thank you for helping learners find useful English resources.

## Submit a resource directory entry

Copy [the resource submission template](./.github/resource-submission.yaml), then open a pull request that adds one item to `src/lib/community-resources.ts` using the same fixed fields. The resource page renders it as a card automatically.

Required fields:

- `format`: course, website, video, podcast, article, or tool.
- `skills`: one or more of listening, speaking, reading, writing, vocabulary, grammar.
- `levels`, language variant, publisher, canonical URL and bilingual original description.
- `access`: external-link, open-license, author-original, or permission-granted.

## Copyright and safety rules

- Link to the original publisher; do not copy third-party textbook lessons, transcripts, audio, PDFs, paywalled content or scraped posts into this repository.
- Only add full learning content if you created it yourself or its licence explicitly permits redistribution in this project.
- Use canonical, reputable URLs. Do not include URLs that require users to bypass access controls or download pirated materials.
- Do not put API keys, personal data, referral codes or affiliate links in submissions.

## Original built-in practice content

Short original prompts are welcome in `src/lib/seed-data/`. Keep them practical, age-appropriate, factually neutral and tagged by scenario and skill. Add or update tests when you change app behavior.

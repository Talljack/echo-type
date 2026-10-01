# OSS_SYNTHESIS.md — what to learn from each repo (mechanics, not source trees)

License column verified via GitHub API on 2026-10-01.
Rule: **AGPL/GPL — pedagogy/architecture reference only, never copy code
into this repo.** MIT/Unlicense — reuse allowed with attribution, still
prefer synthesis over copy.

## Talljack/echo-type — the shell

| | |
|---|---|
| License | MIT |
| Worth learning | multi-module commodity shell; local-first Dexie + Supabase sync; 15-provider AI abstraction; multi-vendor TTS/STT; import pipeline (YT/PDF/URL); Tauri desktop; 1081-test discipline |
| Do not copy | "accuracy ⇒ progress" semantics; CEFR-MCQ-as-level; STT≈pronunciation assumption |
| Reuse | YES — this is the fork base itself |
| FlashDay use | product body; every module keeps working |

## artcc/freelingo — CEFR structure

| | |
|---|---|
| License | **AGPL-3.0** |
| Worth learning | CEFR-framed curriculum shape; placement → weekly plan → structured skills loop |
| Do not copy | any code; week-plan as the primary model (ours is capability-driven) |
| Reuse | NO (AGPL) — read for structure only |
| FlashDay use | vocabulary of guided-path milestones; validates the "one next plan" UX |

## affromero/Sotto — adaptive composition

| | |
|---|---|
| License | **AGPL-3.0** |
| Worth learning | mastery gates between units; personalized course composition; adaptive listening difficulty; context-first learning |
| Do not copy | any code; equating gate-pass with durable mastery |
| Reuse | NO (AGPL) — architecture/pedagogy only |
| FlashDay use | gates become evidence-barred milestones; composition = mission selection, not lockstep syllabus |

## LuteOrg/lute-v3 — known-word tracking

| | |
|---|---|
| License | MIT |
| Worth learning | per-token known/unknown states driving readable-at-level content; difficulty estimation from vocabulary coverage |
| Do not copy | word-knowledge as the ability model; the PHP/Python backend shape |
| Reuse | allowed (MIT) — prefer the *idea* (coverage→comprehensible input) |
| FlashDay use | "Learn from something you like": imported-content difficulty + glossing driven by lexical evidence |

## HugoFara/learning-with-texts — context-preserving reading

| | |
|---|---|
| License | Unlicense |
| Worth learning | learning inside real texts; word state carried by context; content recommendation from knownness |
| Do not copy | the PHP implementation; flashcard-first mining |
| Reuse | allowed — again, mechanics only |
| FlashDay use | context-signature discipline: vocabulary evidence stays bound to the text family it was earned in |

## asbplayer — media immersion

| | |
|---|---|
| License | **AGPL-3.0** |
| Worth learning | subtitle navigation; auto-pause loops; sentence-level replay; word state during playback |
| Do not copy | any code; passive watch-time as progress |
| Reuse | NO (AGPL) — UX mechanics only |
| FlashDay use | Listen/TTS transport upgrades: segment replay feeds `exposure` + `repeat` provenance honestly |

## Shadowing English (method, not a repo)

| | |
|---|---|
| License | n/a |
| Worth learning | `Understand → Listen → Shadow` ordering — comprehension before imitation |
| Do not copy | scoring the shadow attempt from transcript match |
| Reuse | n/a |
| FlashDay use | mission stage ordering inside Listen missions; shadow attempts record `asr`-authority response evidence only |

## English Trainer (method)

| | |
|---|---|
| License | n/a |
| Worth learning | `Decode → Dictation → Shadow → Pronunciation` progression — separates decoding from production |
| Do not copy | collapsing dictation accuracy into pronunciation claims |
| Reuse | n/a |
| FlashDay use | stage sequence for the Listen↔Speak bridge; each stage binds a different task purpose |

## FSRS (`ts-fsrs`, MIT)

| | |
|---|---|
| Worth learning | memory scheduling: when to resurface a *known* item |
| Do not copy | **ever** — treating FSRS stability/due-ness as ability |
| Reuse | YES — already vendored via `ts-fsrs` dep |
| FlashDay use | `Memory Model` only; sits beside — never inside — the capability projection |

## LanguageTool — deterministic writing diagnostics

| | |
|---|---|
| License | LGPL (server) — investigate before use; hosted API exists |
| Worth learning | deterministic error *identification* (rule ids, spans, categories) — exactly the provenance an `evaluation` needs |
| Do not copy | calling its output a learning outcome; it's diagnostics |
| Reuse | evaluate cost/privacy; likely self-host later or API-call |
| FlashDay use | Write module evaluator candidate — a deterministic authority for surface-form errors |

## Halleck45/OpenPronounce — acoustic pronunciation eval

| | |
|---|---|
| License | MIT |
| Worth learning | expected vs heard phones, phoneme diffs, word errors, confidence, prosody — real acoustic evidence shape |
| Do not copy | blind integration; server cost/latency/accuracy unverified |
| Reuse | candidate — **audit first** (model size, latency, hosting, correctness on labeled samples) |
| FlashDay use | future `production.speak.*` evaluator enabling intelligibility evidence STT cannot provide |

## Standing rules

- No code from AGPL/GPL repos enters this tree without an explicit,
  written license decision.
- Every imported mechanic arrives as a FlashDay contract/task/evaluator
  — never as a foreign scoring pipeline with direct write access to
  learner state.

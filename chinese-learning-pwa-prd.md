# PRD: Chinese Language Learning PWA

## Overview

A personal progressive web app for studying Chinese vocabulary using spaced repetition flashcards. The app ingests a user-uploaded CSV of vocab words and grammar concepts, generates example sentences via the Deepseek API, and schedules review sessions using Anki-style SRS. All data is persisted in Supabase, enabling cross-device sync. The app is hosted on Netlify.

---

## Goals

- Replace paper/Anki flashcards with a purpose-built tool tied to class curriculum
- Constrain example sentences to known vocabulary (class words + HSK 1–2) so they are comprehensible
- Support pinyin-only study (no characters)
- Be installable as a PWA on iOS/Android home screen
- Be easy to update as the class progresses (new CSV upload)

---

## Non-Goals

- No multi-user support; this is a single-user personal tool
- No character/hanzi study
- No audio/TTS (out of scope for v1)
- No spaced repetition across multiple decks; one unified deck

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | React (Vite) | Component model suits flashcard UI; fast build |
| Hosting | Netlify | Free tier, easy CI/CD from GitHub, supports serverless functions |
| Database | Supabase (free tier) | Postgres, auth-ready, real-time, cross-device sync |
| API proxy | Netlify serverless function | Keeps Deepseek API key out of the browser |
| AI | Deepseek API | Sentence generation constrained to known vocab |
| PWA | Vite PWA plugin (Workbox) | Service worker, manifest, offline support |

---

## User Flows

### 1. First-Time Setup
1. User opens app → prompted to connect Supabase (one-time config stored in Netlify env vars)
2. User uploads CSV vocab list
3. App parses CSV, deduplicates, and upserts words into Supabase
4. App is ready for study

### 2. CSV Upload & Update
1. User clicks "Update Vocab" and uploads a new CSV
2. App upserts new words; existing words and their SRS state are preserved
3. Newly added words are surfaced as "new" cards in the next session

### 3. Study Session
1. User taps "Study Now"
2. App queries Supabase for cards due today (SRS algorithm)
3. For each card:
   - Direction is randomized (EN → Pinyin or Pinyin → EN), or user can lock direction
   - Card front is shown
   - User taps to reveal back
   - If no cached sentence exists, app calls Netlify function → Deepseek to generate one on-demand; sentence is cached in Supabase
   - User rates recall: **Again / Hard / Good / Easy** (Anki-style)
   - SRS state is updated in Supabase
4. Session ends when queue is empty; summary screen shown

### 4. PWA Install
- On first visit, browser install prompt is surfaced (or manual "Add to Home Screen" instructions shown)
- App works offline for review of cached cards (no sentence generation offline)

---

## CSV Format

The app expects a CSV with the following columns. Additional columns are ignored.

```
pinyin,english,category,notes
nǐ hǎo,hello,greeting,
xǐhuān,to like,verb,
```

- `pinyin` — required; the Chinese pronunciation in pinyin with tone marks
- `english` — required; English translation
- `category` — optional; e.g. verb, noun, grammar, HSK1
- `notes` — optional; free text shown on card back

---

## Spaced Repetition Algorithm

Implements a simplified SM-2 algorithm (same as Anki default).

### Card States
- **New** — never studied
- **Learning** — failed at least once in current session; reshown within session (1 min / 10 min intervals)
- **Review** — graduated; scheduled in days/weeks/months

### Rating → Interval Logic

| Rating | Behavior |
|---|---|
| Again | Reset to Learning; reshow in 1 min |
| Hard | Ease factor −0.15; interval × 1.2 |
| Good | Ease factor unchanged; interval × ease factor |
| Easy | Ease factor +0.15; interval × ease factor × 1.3; skip learning steps |
| Known| Remove from circulation

### Supabase SRS Fields (per card)

```
interval        integer   -- days until next review
ease_factor     float     -- default 2.5
due_date        date      -- next review date
repetitions     integer   -- number of successful reviews
state           enum      -- new | learning | review
last_reviewed   timestamp
```

### Daily Session Logic
- New cards per day: configurable (default 20)
- Review cards: all cards where `due_date <= today`
- New cards are shown after reviews, unless queue is empty

---

## Sentence Generation

### Prompt Design (sent to Deepseek via Netlify function)

```
You are a Chinese language tutor. Generate one example sentence for the word "{pinyin}" ({english}).

Rules:
- Use pinyin only, no characters
- The sentence must use ONLY words from the following known vocabulary list AND words from HSK levels 1–2
- The sentence should be natural and simple
- Return JSON: { "pinyin": "...", "english_translation": "..." }

Known vocab: {comma-separated list of all user's pinyin words}
```

### Caching
- Generated sentences are stored in Supabase on first generation
- Subsequent card views use the cached sentence (no API call)
- User can manually regenerate a sentence via a "↻ Regenerate" button

---

## Data Model (Supabase)

### `vocab_cards`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| pinyin | text | |
| english | text | |
| category | text | nullable |
| notes | text | nullable |
| example_pinyin | text | cached generated sentence |
| example_english | text | cached translation |
| created_at | timestamp | |

### `srs_state`
| Column | Type | Notes |
|---|---|---|
| card_id | uuid FK | references vocab_cards |
| interval | integer | days |
| ease_factor | float | default 2.5 |
| due_date | date | |
| repetitions | integer | |
| state | text | new / learning / review |
| last_reviewed | timestamp | |

> Note: For a single-user app, no auth row-level security is required, but Supabase RLS can be enabled with a simple anon key policy if desired.

---

## UI Screens

### Home / Dashboard
- Cards due today count
- New cards available count
- Streak indicator
- "Study Now" CTA
- "Update Vocab" CSV upload button
- Settings link

### Study Screen
- Card front (large pinyin or english)
- "Show Answer" button
- Card back revealed: translation + example sentence (generated on-demand)
- Four rating buttons: Again / Hard / Good / Easy
- Progress bar for session (X of Y cards)
- Direction toggle (EN→PY / PY→EN / Random)

### Settings Screen
- Cards per day (new)
- Flashcard direction default
- Deepseek model selector (deepseek-chat default)
- "Regenerate all sentences" bulk action (caution: API cost)

---

## PWA Requirements

- `manifest.json`: name, short name, icons (192×192, 512×512), theme color, display: standalone
- Service worker via Workbox: cache app shell and static assets
- Offline mode: cached cards are reviewable; sentence generation disabled with a notice
- iOS meta tags: `apple-mobile-web-app-capable`, status bar style

---

## Netlify Serverless Function

**Endpoint:** `POST /.netlify/functions/generate-sentence`

**Request body:**
```json
{
  "pinyin": "xǐhuān",
  "english": "to like",
  "knownVocab": ["nǐ hǎo", "xǐhuān", "...]
}
```

**Response:**
```json
{
  "example_pinyin": "wǒ xǐhuān chī píngguǒ",
  "example_english": "I like to eat apples"
}
```

- API key stored as `DEEPSEEK_API_KEY` in Netlify environment variables
- Rate limiting: client sends one request at a time; no batching needed for on-demand generation

---

## Build & Deployment

```
/
├── src/                  # React app (Vite)
│   ├── components/
│   ├── hooks/            # useSRS, useVocab, useSupabase
│   ├── pages/            # Home, Study, Settings
│   └── lib/              # supabaseClient, srsAlgorithm
├── netlify/
│   └── functions/
│       └── generate-sentence.js
├── public/
│   ├── manifest.json
│   └── icons/
├── vite.config.js        # includes vite-plugin-pwa
└── netlify.toml
```

**Deployment steps:**
1. Push repo to GitHub
2. Connect repo to Netlify; set `DEEPSEEK_API_KEY` and `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in Netlify env vars
3. Netlify auto-builds on push to `main`

---

## MVP Scope (v1)

| Feature | In v1 |
|---|---|
| CSV upload & upsert | ✅ |
| Flashcards EN↔Pinyin | ✅ |
| SM-2 spaced repetition | ✅ |
| On-demand sentence generation | ✅ |
| Sentence caching in Supabase | ✅ |
| PWA / installable | ✅ |
| Offline review (cached cards) | ✅ |
| Audio / TTS | ❌ |
| Hanzi / characters | ❌ |
| Multiple decks | ❌ |
| Shared/social features | ❌ |

---

## Open Questions

1. **HSK 1–2 word list** — should the app embed the full HSK 1–2 word list locally to validate sentences, or trust the prompt to enforce it?
2. **Session size** — should there be a max session card count, or always clear the full due queue?
3. **Tone marks vs. numbers** — should pinyin input support numbered tones (ni3 hao3) as well as diacritics (nǐ hǎo)?
4. **CSV source of truth** — on re-upload, should cards removed from the CSV be archived or deleted?

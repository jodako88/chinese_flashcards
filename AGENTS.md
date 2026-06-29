# AGENTS.md — Chinese Language Learning PWA

This file is the authoritative reference for this project. Read it at the start of every Codex session. Do not suggest alternatives to decisions marked **[FINAL]**.
---

## Project Overview

A single-user PWA for studying Chinese vocabulary via spaced repetition flashcards. The app ingests a CSV of vocab words, generates pinyin example sentences via the Deepseek API, and schedules review sessions using a modified SM-2 algorithm. Data is persisted in Neon Postgres through Netlify serverless functions. Hosted on Netlify.

Single user. No app auth required. Database credentials stay server-side only.

---

## Tech Stack [FINAL]

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Hosting | Netlify |
| Database | Neon Postgres |
| API proxy | Netlify serverless functions |
| AI | Deepseek API (deepseek-chat) |
| PWA | vite-plugin-pwa (Workbox) |
| Styling | Tailwind CSS |

Do not suggest Firebase, Vercel, localStorage, IndexedDB as primary data store, or any alternative to these choices.

---

## Architecture Principles

- **Business logic lives in `src/lib` and `src/hooks`, never in components**
- `srsAlgorithm.js` contains pure functions only. No database calls, no side effects. This makes it independently testable.
- Neon is accessed only from Netlify serverless functions. Never expose `DATABASE_URL` to the browser.
- `src/lib/db.js` is the browser-facing data access layer. Components and hooks never call Netlify functions or SQL directly.
- SQL queries live in `netlify/functions/db.js`.
- Components are presentational where possible. State lives in hooks.
- Keep components small. If a component exceeds ~100 lines, split it.
- Use named exports throughout. No default exports except pages.

---

## Repository Structure

```
/
├── CLAUDE.md
├── src/
│   ├── components/
│   │   ├── FlashCard.jsx
│   │   ├── RatingButtons.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── SessionSummary.jsx
│   │   └── CsvUpload.jsx
│   ├── hooks/
│   │   ├── useSession.js       # session queue, card advancement, session state
│   │   ├── useVocab.js         # CSV parsing, upsert, vocab queries
│   │   └── useSentence.js      # sentence fetch, cache check, regenerate
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Study.jsx
│   │   └── Settings.jsx
│   └── lib/
│       ├── db.js               # browser-facing data access functions
│       ├── srsAlgorithm.js     # pure SRS functions
│       └── hsk1-2.json         # embedded HSK 1-2 word list
├── netlify/
│   └── functions/
│       ├── db.js                # Neon SQL access
│       └── generate-sentence.js
├── public/
│   ├── manifest.json
│   └── icons/
├── vite.config.js
└── netlify.toml
```

---

## Environment Variables

```
# Netlify environment (set in Netlify dashboard, not committed)
DATABASE_URL=
DEEPSEEK_API_KEY=
```

Never hardcode these values. Never commit a `.env` file.

---

## Neon Schema

### `vocab_cards`

```sql
create table vocab_cards (
  id uuid primary key default gen_random_uuid(),
  pinyin text not null unique,
  english text not null,
  hanzi text,
  category text,
  notes text,
  example_pinyin text,
  example_english text,
  created_at timestamptz default now()
);
```

### `srs_state`

```sql
create table srs_state (
  card_id uuid primary key references vocab_cards(id) on delete cascade,
  interval integer not null default 1,
  ease_factor double precision not null default 2.5,
  due_date date not null default current_date,
  repetitions integer not null default 0,
  state text not null default 'new',  -- new | learning | review
  again_count integer not null default 0,
  suspended boolean not null default false,
  last_reviewed timestamptz
);
```

`srs_state` is created automatically when a card is inserted. One row per card, always. See `docs/neon-schema.sql` for the complete schema, including the trigger and `app_settings`.

### `app_settings`

```sql
create table app_settings (
  id text primary key,
  new_cards_per_day integer not null default 20,
  default_direction text not null default 'random',
  deepseek_model text not null default 'deepseek-chat',
  updated_at timestamptz default now()
);
```

---

## CSV Format

```
pinyin,english,hanzi,category,notes
nǐ hǎo,hello,你好,greeting,
xǐhuān,to like,喜欢,verb,
```

Required: `pinyin`, `english`. Optional: `hanzi`, `category`, `notes`. Extra columns ignored.

Upsert key: `pinyin`. On re-upload, existing SRS state is preserved. Removed words are retained.

---

## SRS Algorithm [FINAL]

All logic lives in `src/lib/srsAlgorithm.js` as pure functions.

### Card States

- `new` — never studied
- `learning` — failed at least once; being relearned in current session
- `review` — graduated; scheduled by interval in days

### Rating → State Transitions

```
Again → state: learning, card goes to back of in-session queue (no timer)
Hard  → ease_factor - 0.15, interval * 1.2
Good  → ease_factor unchanged, interval * ease_factor
Easy  → ease_factor + 0.15, interval * ease_factor * 1.3, skip learning steps
```

Constraints:
- Minimum ease_factor: 1.3
- Minimum interval: 1 day
- On Again: do not update due_date or interval; card stays in session queue only

### Session Queue Construction

Pull three sets from Neon, all filtered by `suspended = false`:

1. Review cards: `state = 'review' AND due_date <= today`
2. Learning carryover: `state = 'learning' AND due_date <= today`
3. New cards: `state = 'new'`, limited to daily new card cap (default 20)

Interleave all three into one array. Ratio: 1 new card per 4 review/learning cards. If new cards run out, fill remaining slots with review/learning cards.

### Again Behavior [FINAL]

Again appends the card to the end of the current in-session queue array. No timers. No due_date update. The card reappears when the queue cycles to it.

### Mark as Known [FINAL]

Sets `suspended = true`. Card is excluded from all future queue construction. Reversible via Settings > Suspended Words.

---

## Sentence Generation

### Netlify Function

`POST /.netlify/functions/generate-sentence`

Request:
```json
{
  "pinyin": "xǐhuān",
  "english": "to like",
  "knownVocab": ["nǐ hǎo", "xǐhuān", "chī"]
}
```

Response:
```json
{
  "example_pinyin": "wǒ xǐhuān chī píngguǒ",
  "example_english": "I like to eat apples"
}
```

### Deepseek Prompt Template [FINAL]

```
You are a Chinese language tutor. Generate one example sentence for the word "{pinyin}" ({english}).

Rules:
- Use pinyin only, no characters
- The target word "{pinyin}" must appear in the sentence
- Use ONLY words from the following known vocabulary list. You may also use HSK 1–2 words strictly as grammar particles and connectors (e.g. de, ma, yě, hěn, shì). Do not use HSK 1–2 words as the main content words of the sentence.
- The sentence should be natural and simple
- Return JSON only, no other text: { "example_pinyin": "...", "example_english": "..." }

Known vocab (one word per line):
{newline-separated pinyin list}
```

### Target Word Bolding

Client-side string match of `pinyin` value within `example_pinyin`. Wrap match in `<strong>`. If no match found, render sentence unbolded without error.

### Caching

Sentences are stored in `vocab_cards.example_pinyin` and `vocab_cards.example_english` on first generation. Subsequent views use the cache. User can regenerate via "↻ Regenerate" button.

---

## UI Screens

### Home
- Cards due today count (review + learning, non-suspended)
- New cards available count
- Suspended cards count
- "Study Now" CTA (disabled if nothing due and no new cards)
- Settings link

### Study
- Card front: large pinyin or English (based on direction setting); when pinyin is on the front, show Hanzi with it if present
- "Show Answer" button
- Card back: translation, notes, example sentence with target word bolded; when pinyin is revealed on the back, show Hanzi with it if present
- Loading state: spinner + "Generating example..." while fetching
- Offline notice if sentence generation unavailable
- "↻ Regenerate" button
- Primary rating buttons: Again / Hard / Good / Easy
- Secondary action below buttons: "Mark as Known" (muted styling)
- Progress bar: X of Y cards
- Direction toggle: EN→PY / PY→EN / Random

### Session Summary
- Total cards reviewed
- Per-rating counts and percentages: Again, Hard, Good, Easy
- Headline metric: Good + Easy rate
- New cards graduated this session
- Cards marked as Known this session
- "Done" CTA → Home

### Settings
- New cards per day (default 20)
- Default direction
- "Update Vocab" CSV upload
- Deepseek model selector (default: deepseek-chat)
- "Regenerate All Sentences" with confirmation dialog
- Suspended Words list: pinyin + english per row, "Unsuspend" button per row

---

## PWA Requirements

- `manifest.json`: name, short_name, icons (192, 512), theme_color, display: standalone
- Workbox via vite-plugin-pwa: cache app shell and static assets
- Offline: cached cards reviewable; sentence generation disabled with inline notice
- iOS meta tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`

---

## Build Sequence

Work through these phases in order. Do not build ahead.

- [x] Phase 0: Project scaffold
- [x] Phase 1: Neon schema + data access layer
- [x] Phase 2: CSV upload and upsert
- [x] Phase 3: SRS algorithm (pure functions + tests)
- [x] Phase 4: Session queue construction + study flow
- [x] Phase 5: Sentence generation (Netlify function + caching + bolding)
- [x] Phase 6: Home dashboard + Session summary screen
- [x] Phase 7: Settings screen + Suspended Words
- [x] Phase 8: PWA config + offline mode

Update the checkboxes as phases are completed.

---

## Design Reference

The file `docs/design-reference/full_app.tsx` is a visual design prototype only.

Use it for layout, spacing, colors, screen structure, and interaction inspiration.

Do not copy it directly as production code because it uses mock data, inline state, and a single-file prototype structure.

Production implementation must still follow these rules:
- Business logic lives in src/lib and src/hooks
- Components are presentational where possible
- Browser data access goes through src/lib/db.js; SQL only happens in netlify/functions/db.js
- Build only the current phase

## Non-Goals [FINAL]

Do not implement or suggest:
- Multi-user support or auth
- Audio or TTS
- Multiple decks
- Timer-based card reinsertion
- Any social or sharing features

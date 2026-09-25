# Planner guide: turning audio + transcript into a codeable screenplay

The planner is the director. The planner's output, the screenplay, is the only thing the coder
sees, so all the craft lives here. Format: `SCREENPLAY_FORMAT.md`. Example: `screenplays/paleDot.md`.

## 1. Timing (10 minutes of work)

```bash
cp <given>.mp3 audio/<film>.mp3 ; save the transcript as audio/<film>.transcript.txt
python3 tools/align.py audio/<film>.mp3 audio/<film>.transcript.txt
```

- Gives every word's start/end, `DURATION`, the pauses, and words to **check by ear** (a word that
  seems to last > 1.2 s usually swallowed an intro; its real start is later).
- Prefer pauses for movement changes and word onsets for beats. Never start a visual before its word.

## 2. Story (think before any beat)

- **Logline**: what should the viewer feel at the end?
- **Spine**: ONE camera journey (in, out, along, through). It is what makes it one continuous shot.
- **Movements**: 4–10, each a different place or scale.
- **Hero moments**: 2–3 peaks. Keep everything else quieter so the peaks read as peaks.
- **Continuity chain**: write, for every movement change, what physically becomes what
  (the dot opens into the globe; the globe pours out the river). No cuts exist in this style.

## 3. Beats

One beat per visual idea, 1–4 s long (a list of items: one beat per item). For each:

1. **Meaning before illustration**: what does the line *mean*, and what image says that? ("king
   and peasant" → a hierarchy that levels into two equal dots.)
2. **New idea**: never reuse a staging. Track what you have used in a list as you go.
3. **Composition**: subject in the right or centre two-thirds; the top-left stays clear for the
   HUD; nothing important under the letterbox (y < 198 or > 882).
4. **One hot light** per moment; everything else dim.
5. **Motion**: say what moves during the whole beat, not just at its start.
6. **Science**: write the fact in SCIENCE, with numbers.
7. **Numbers, not adjectives**: positions, sizes, colours (kit constants), seeds, easing, times.

## 4. Look, seeds, lettering

- Tint keys: one wash per movement (cool/warm alternation keeps a long film breathing).
- Camera: one `speed(t)` for the whole film: a slow base drift + `g1` bumps for dives (+) and
  pull-backs (−). `panRate` for tracking shots.
- Every procedural set gets a seed, count and generation rule (section 5).
- Lettering: short paraphrases (2–5 words), one main line at a time, write-on timed to the words.

## 5. Lock the picture

If you can build a draft yourself, do it and run `node tools/refs.mjs <film>`: one reference
still per beat goes into `cinema/refs/<film>/`. The coder's build is scored against these. If you
cannot build a draft, make the ENTERS lines precise enough that a sketch would be unambiguous.

## 6. Long films (10 minutes = 18,000 frames)

- Split into **chunks of about 60 s** (≈ 15–25 beats each) at natural pauses. Each chunk is its own film
  (`<film>01`, `<film>02`, …) with its own screenplay, audio slice, refs and checker run.
- Cut the audio exactly on frame boundaries:
  `ffmpeg -i audio/<film>.mp3 -ss <a> -to <b> -c:a pcm_s16le audio/<film>01.wav` where a and b are
  multiples of 1/30 s, and re-run `align.py` on each slice (times restart at 0).
- **Hand-off frames**: the last beat of chunk N and the first beat of chunk N+1 describe the same
  picture (same element, position, colour, camera). Write it once as a "HANDOFF" block and paste
  it into both screenplays, so the chunks join invisibly.
- Plan the **whole-film story first** (section 2 for all 10 minutes, with its movements spread over
  chunks), then write chunk screenplays in order. Keep one running list of used stagings.
- Concatenate at the end: `ffmpeg -f concat -safe 0 -i list.txt -c copy out/<film>_full.mp4`
  (all chunks share codec settings via `tools/finish.mjs`).

## 7. Checklist before hand-off

- [ ] `node -e` parse is clean (`tools/new-film.mjs` refuses a screenplay with errors)
- [ ] beats tile 0 → frames exactly; every cue in section 3 is used by a beat
- [ ] every beat has WORDS / ENTERS / MOTION / INTENT at least
- [ ] no staging used twice; 2–3 hero moments marked
- [ ] every random thing has a seed; every colour is a kit constant
- [ ] all lettering is legal glyphs and fits `fit(s, 40, 740)`
- [ ] reference stills exist (or ENTERS lines are sketch-precise)

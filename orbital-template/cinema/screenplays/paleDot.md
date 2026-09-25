# PALE BLUE DOT · screenplay

Reference build: `src/canvas-core/paleDot.ts` (built from this screenplay with `cinemaKit`).
Everything below is specified in the 1920×1080 frame; image area y 138–942.

## 1. HEADER
| key | value |
|---|---|
| film | paleDot |
| audio | audio/paleDot.mp3 |
| transcript | audio/paleDot.transcript.txt |
| words | audio/paleDot.words.txt |
| fps | 30 |
| seconds | 95.112 |
| frames | 2853 |
| style | cinemaKit |

## 2. STORY
- **Logline**: from 6 billion km away, everything we are fits in one pixel; the film makes the
  viewer feel that smallness and then the tenderness it should inspire.
- **Spine**: one camera journey OUT → IN → OUT. We look back from Voyager 1 at a tiny Earth, dive
  into it to meet everyone who ever lived, then pull back past the dot, the galaxy and the cosmic
  web. The pull-back ends further out than we started.
- **Movements**:
  1. 0–16.9 Vantage: Voyager, the Sun, the orbits, lock-on to Earth.
  2. 14.5–21.8 The photograph: scattered-light bands, HERE / HOME / US.
  3. 21.8–32.1 Everyone: dive into the globe; links of love, acquaintance, fame; all humans ever.
  4. 32.1–41.9 History: the globe pours out a river; joy, suffering, beliefs, doctrines.
  5. 41.9–59.0 The cast in pairs: one small staging per pair, carried by the thinning river.
  6. 59.0–70.5 The web of everyone and its standouts; it spirals home.
  7. 70.5–84.5 The mote: pull back to one speck of dust in a sunbeam; a small stage.
  8. 81.6–95.1 The arena: the galaxy, the cosmic web, title, fade.
- **Hero moments**: the dive into the dot (21.8), the superstar flare (62.5–65), the pull-back to
  the galaxy arena (81.6–84).
- **Continuity chain**: Voyager's sightline leads to the Sun → the camera pushes past Voyager into
  the orbits → the reticle holds Earth while orbits blow past into the photo bands → the dot opens
  into the globe → the globe slides left and pours out the river → pairs rise out of the river →
  the explorer flies off-frame where the web appears → the web spirals into the globe → the globe
  pulls back into the mote → the mote's position becomes the Sun's place in the galaxy → the galaxy
  shrinks into the cosmic web.

## 3. CUES
| cue | time_s | frame | words |
|---|---|---|---|
| from | 4.10 | 123 | from this distant vantage point |
| earth | 6.46 | 194 | the Earth might not seem |
| of | 8.34 | 250 | of any particular interest |
| but | 11.40 | 342 | But for us |
| diff | 12.65 | 380 | it's different |
| consider | 14.46 | 434 | Consider again |
| dot | 15.44 | 463 | that dot |
| here | 16.95 | 509 | That's here |
| home | 18.44 | 553 | That's home |
| us | 19.59 | 588 | That's us |
| onit | 21.76 | 653 | On it |
| love | 22.94 | 688 | everyone you love |
| know | 24.55 | 737 | everyone you know |
| heard | 26.50 | 795 | everyone you ever heard of |
| human | 28.27 | 848 | every human being who ever was |
| lived | 30.88 | 926 | lived out their lives |
| aggregate | 32.09 | 963 | The aggregate |
| joy | 34.57 | 1037 | our joy |
| suffer | 35.12 | 1054 | and suffering |
| thousands | 35.59 | 1068 | thousands of |
| confident | 37.69 | 1131 | confident religions |
| ideologies | 39.04 | 1171 | ideologies |
| economic | 39.88 | 1196 | and economic doctrines |
| hunter | 41.89 | 1257 | every hunter and forager |
| hero | 44.20 | 1326 | every hero and coward |
| creator | 45.74 | 1372 | every creator |
| destroyer | 46.76 | 1403 | and destroyer |
| civ | 47.42 | 1423 | of civilization |
| king | 49.15 | 1475 | every king and peasant |
| couple | 51.37 | 1541 | every young couple |
| love2 | 52.37 | 1571 | in love |
| mother | 53.29 | 1599 | every mother and father |
| child | 54.43 | 1633 | hopeful child |
| inventor | 56.58 | 1697 | inventor |
| explorer | 57.54 | 1726 | and explorer |
| teacher | 59.00 | 1770 | every teacher of morals |
| corrupt | 60.63 | 1819 | every corrupt politician |
| superstar | 62.45 | 1874 | every superstar |
| star | 63.20 | 1896 | (super)star |
| supreme | 64.46 | 1934 | every supreme leader |
| saint | 66.80 | 2004 | every saint |
| sinner | 67.91 | 2037 | and sinner |
| history | 68.44 | 2053 | in the history of our species |
| livedThere | 70.45 | 2114 | lived there |
| mote | 71.97 | 2159 | on a mote of dust |
| suspended | 73.75 | 2213 | suspended |
| sunbeam | 75.48 | 2264 | in a sunbeam |
| earth2 | 77.44 | 2323 | The Earth is |
| small | 78.72 | 2362 | a very small |
| stage | 80.11 | 2403 | stage |
| vast | 81.56 | 2447 | in a vast |
| cosmic | 82.79 | 2484 | cosmic |
| arena | 83.68 | 2510 | arena |
| title | 87.00 | 2610 | (music) title |
| end | 95.10 | 2853 | (end of audio) |

## 4. LOOK AND CAMERA
- **Tint keys** `makeTint`: `[0,5,7,16] [6,13,10,13] [11,12,9,17] [15,18,10,17] [21.5,13,10,19]
  [23,4,10,23] [32,6,10,24] [34.5,20,8,27] [42,14,8,25] [59,17,8,27] [70,7,8,20] [73,17,12,11]
  [78,19,13,10] [82,6,8,19] [95.2,3,4,10]` (navy → warm charcoal → plum → navy → magenta-plum →
  amber-brown → navy → black).
- **Camera speed(t)** = `0.012 + 1.15*g1(t,22.3,0.6) - 0.9*g1(t,72.2,0.65) - 0.85*g1(t,82.5,0.75) - 0.07*ramp(t,84.5,3)`
  (slow drift; a forward rush for the dive; two backward rushes for the pull-backs; slow retreat).
- **Camera panRate(t)** = `0.03*ramp(t,32.5,1.5)*(1-ramp(t,58.3,1.5))` (sideways tracking along the river).
- `makeCamera(speed, panRate, 96)`, `makeStars(5, 1900)`.
- **Star alpha** = `(1 - 0.45*win(t,22.6,33,1,1) - 0.4*win(t,32,59,1,1) - 0.5*win(t,58.6,70.5,1,1)) * ramp(t,0,2)`.
- **Palette per movement**: vantage CYAN/VIO probe, GOLD orbits, AMBER Sun; photo PALE dot in warm
  bands; globe PALE/"130,235,205" land, WARM city lights, PINK/CYAN/VIO links; river NEON mix, joy
  GOLD, suffering RED/"150,70,200"; pairs one colour per person; web NEON dim with one hot node per
  role; mote WARM beam, PALE dot; galaxy GOLD bulge, "160,195,255" arms; cosmic web VIO/"120,170,255".
- **Frame finish**: `beginFrame` / `endFrame` defaults; `black = fades(t, 95.1)` (2.2 s up, 1.75 s down).

## 5. ASSETS AND SEEDS
All in the reference build; seeds and counts are binding.

| name | seed | count | rule |
|---|---|---|---|
| STARS | 5 | 1900 | `makeStars(5,1900)` |
| VOY (Voyager 1) | 12 | 170 mesh pts | local units, dish axis +x. Rim `ellipse(0,0,28,96,0,60)`; rings f∈{0.33,0.62,0.85}: `ellipse(-22(1-f²),0,28f,96f,0,40)`; 16 spokes `(-22(1-s²)+28s·cos a, 96s·sin a)`, s=0..1 in 8 steps; 3 feed struts from rim at 90°,210°,330° to focus (62,0); bus box (-70,-26)–(-26,26) with both diagonals; science boom (-48,-26)→(-190,-120), platform box (-218,-140)–(-182,-116), camera circle r8 at (-228,-128); RTG boom (-48,26)→(-200,110) with 3 skewed quads at s=0.6,0.75,0.9; magnetometer boom (-60,0)→(-330,260). Mesh: 170 pts `s=√r, a=r·TAU` on the dish paraboloid. Line i: hairline (i odd VIO else CYAN, alpha 0.22) + beads gap `5.5*max(0.6,scale)` r1.05 (i%3 ? CYAN : "200,180,255", alpha 0.85). Write-on per line `clamp(prog*1.6 - (i/n)*0.6)`. |
| ORB (orbits) | — | 6 | r 60/95/135/185/300/420, angular speed 0.2/0.12/0.004/0.05/0.02/0.01 rad/s, phase 1.1/4.0/2.5/5.4/0.4/3.3; flatten 0.34, rotate −0.12 rad. Index 2 is Earth. |
| FIB (globe) | 9 | 2600 | `makeSphere(2600, 9)` |
| PEOPLE | 21 | 7 love, 60 know, 1500 all, 3200 dust, 170 arcs | P0 = `v3(0.45, -lonAt(26)-0.35)`; love = near(P0, 0.08); know = near(P0, 0.42); all = randLand(0.9); dust = randLand(0.8); arcs i<50 from P0 else from all[r·300] to all[r·300]; life per point: angle d from P0, l=r, s=0.6+r·0.8. `near` = normalize(base + (r-0.5)·2·spread per axis). Globe spin `lonAt(t) = 0.9 + 0.07t`. |
| RIV (river) | 33 | 1500 | v=clamp((r+r+r-1.5)/1.2,-1,1), s=70+r·90, x0=r·2600, ph=r·TAU, h=floor(r·6), spark=r<0.12, sr=40+r·120 |
| EMB (emblems) | 44 | 150 | xw=760+r·1700, type=floor(r·5), h=26+r·r·110, d=r, bl=60+r·150 |
| FAR (tiny emblems) | 45 | 520 | xw=700+r·1900, y=r, h=4+r·12, d=r |
| FLAGS | 46 | 34 | xw=800+r·1600, h=80+r·90, w=30+r·26, d=r, colour r<0.5 ? CYAN : VIO |
| CHARTS | 47 | 4 lines × 56 pts | colours PINK, CYAN, AMBER, VIO; random walk y += (r-0.48)·22 (line 3 also −9 per step after step 40: it crashes); y0 = 280 + k·38; x = 900 + i·17.5 |
| WEB | 61 | 760 nodes | x=(r-0.5)·3.4, y=(r-0.5)·1.9, z=0.7+r·2.6, h=floor(r·6), m=r; edges to 2 nearest (3D) |
| MOTES | 71 | 300 | x=r·W, y=138+r·804, layer 0 (i<22, bokeh discs) / 1 (i<150) / 2, r, ph=r·TAU, sp=0.05+r·0.12 |
| GAL (galaxy) | 81 | 3400 | 22% bulge: rr=r^1.8·0.22, a=r·TAU, colour r<0.7 GOLD else WARM. Arms: s=r^0.8, arm=i%2, a=arm·π+s·3.8+(r-0.5)(0.5+0.5(1-s)), rr=0.12+0.88s, colour r<0.08 PINK, r<0.6 "160,195,255", else WHITE; m=r. Projection `galRot`: spin 0.02t, flatten 0.42, tilt −0.15. Sun at arm 0, s=0.55 (+0.1 rad). |
| COSMOS | 91 | 360 nodes | x=(r-0.5)·2.6, y=(r-0.5)·1.5, m=r; edges to 3 nearest if d²<0.03 |
| per-effect seeds | 3, 12, 31, 41, 51, 61, 101, 301, 311, 321, 351, 401–441, 501, 700+k | — | flare / skyline / branching / role seeds as named in each beat |

## 6. LETTERING
All via `hudTables(h, LABELS, LINES)`; main lines `cap = fit(s, 40, 740)`, weight 2.6; labels cap 15, weight 1.6.

**LABELS** `[start, end, text]`
```
[0.6, 14.3, "VOYAGER 1 - FEB 14 1990"]   [consider, 21.6, "NARROW ANGLE CAMERA"]   [22.3, 32.0, "HOME PLANET"]
[aggregate, 41.7, "HUMAN HISTORY"]       [hunter, 70.3, "THE CAST"]               [livedThere, 84.6, "EARTH - FROM 6 BILLION KM"]
```
**LINES** `[start, end, text, row, write s]`
```
[from, 8.2, "A DISTANT VANTAGE POINT", 0, 1.5]      [of, 11.2, "OF NO PARTICULAR INTEREST", 0, 1.3]
[but, 14.3, "BUT FOR US", 0, 0.6]                   [diff, 14.3, "IT IS DIFFERENT", 1, 0.8]
[consider, 16.8, "CONSIDER AGAIN", 0, 0.8]          [dot, 16.8, "THAT DOT", 1, 0.5]
[love, 24.45, "EVERYONE YOU LOVE", 0, 0.7]          [know, 26.4, "EVERYONE YOU KNOW", 0, 0.7]
[heard, 28.15, "EVERYONE YOU EVER HEARD OF", 0, 1.3] [human, 30.8, "EVERY HUMAN WHO EVER WAS", 0, 1.5]
[lived, 32.0, "LIVED OUT THEIR LIVES", 0, 1.0]      [aggregate, 34.45, "THE AGGREGATE", 0, 0.8]
[joy, 35.5, "JOY AND SUFFERING", 0, 0.9]            [thousands, 38.95, "THOUSANDS OF CONFIDENT RELIGIONS", 0, 2.6]
[ideologies, 39.8, "IDEOLOGIES", 0, 0.6]            [economic, 41.7, "ECONOMIC DOCTRINES", 0, 0.9]
[hunter, 44.1, "HUNTER & FORAGER", 0, 1.0]          [hero, 45.65, "HERO & COWARD", 0, 1.0]
[creator, 49.0, "CREATOR & DESTROYER", 0, 1.2]      [civ, 49.0, "OF CIVILIZATION", 1, 0.8]
[king, 51.25, "KING & PEASANT", 0, 1.0]             [couple, 53.2, "A YOUNG COUPLE IN LOVE", 0, 1.1]
[mother, 56.45, "MOTHER & FATHER", 0, 0.9]          [child, 56.45, "HOPEFUL CHILD", 1, 1.1]
[inventor, 58.9, "INVENTOR & EXPLORER", 0, 1.3]     [history, 70.3, "THE HISTORY OF OUR SPECIES", 0, 1.1]
[livedThere, 71.9, "LIVED THERE", 0, 0.5]           [mote-0.05, 73.65, "ON A MOTE OF DUST", 0, 0.8]
[suspended, 77.3, "SUSPENDED IN A SUNBEAM", 0, 2.1] [earth2, 81.4, "A VERY SMALL STAGE", 0, 2.8]
[vast, 84.6, "IN A VAST COSMIC ARENA", 0, 2.4]
```
**Special** (queued in this order after the tables: counter, big words, tags, title)
- Counter 28.47–32.3: label "HUMANS EVER BORN (EST.)" (120,312) cap 14 DIMT, writes 0.6 s from human+0.2;
  number `fmt(117e9 * ease(ramp(t, human+0.2, 1.8)))` at (120,338) cap 34 GOLDT weight 3; both fade at 32.0 (0.3 s).
- Big words: "HERE" (160,400) at here, "HOME" (160,500) at home, "US" (160,600) GOLDT at us; cap 70, weight 4.5,
  write 0.45 s, fade 21.8 (0.4 s).
- Tags (`f.tag`, cap 15): EARTH, 0.12 PIXEL, TEACHER OF MORALS, CORRUPT POLITICIAN, SUPERSTAR,
  SUPREME LEADER, SAINT, SINNER, YOU ARE HERE (positions in their beats).
- Title: "PALE BLUE DOT" centred (960,780) cap 52 weight 3.4, writes 1.6 s from 87.0; "CARL SAGAN"
  (960,860) cap 17 DIMT, writes 0.9 s from 89.0; both fade 93.2 (1.4 s).

## 7. BEATS
### B01 · Voyager in the dark · 0.00–4.10 s
- **WORDS**: (music intro)
- **CAMERA**: slow drift, speed 0.012. Fade up from black over 2.2 s (`fades`).
- **ENTERS**:
  - 0.3 · Voyager 1 (VOY) · centre (520−10t, 640), scale 1.05, rotation = angle from probe to Sun + 0.04·sin(0.3t) (dish faces the Sun) · CYAN/VIO · wireframe writes on, `prog = ramp(t,0.3,2.6)` · alpha `ramp(t,0.3,1.8)`
  - 0.2 · the Sun · `sunAt(t)` = (1400,468) while far · flare R = 6+11·min(k,1.6), colour "255,190,110", seed 3, rot 0.2+0.01t, 16 rays · alpha `ramp(t,0.2,2)`
- **MOTION**: stars drift; probe slides left 10 px/s and sways; flare rays turn.
- **TEXT**: label "VOYAGER 1 - FEB 14 1990" writes from 0.6.
- **SCIENCE**: Voyager 1 took the Pale Blue Dot image on 14 Feb 1990; its high-gain dish points back at Earth/the inner system.
- **INTENT**: loneliness and distance before a word is spoken.

### B02 · The sightline · 4.10–6.46 s
- **WORDS**: "From this distant vantage point" (`from`)
- **CAMERA**: solar-system zoom k = `sysK(t)` starts growing at 4.6: `lerp(0.16,1,ease(ramp(t,4.6,5.8)))`; Sun position eases (1400,468)→(1010,560) with the same ease.
- **ENTERS**:
  - from · sightline from the dish focus (probe local (62,0)) to the Sun · `hairG` VIO alpha 0.45, draws on `easeOut(ramp(t,from,1.3))`
  - from · 7 beads travelling probe→Sun: bead b at u=(t−from−0.32b)·0.42, drawn while 0<u<1 and behind the line head · glow AMBER r9 + WARM dot r1.8
- **STAYS**: Voyager, Sun.
- **EXITS**: sightline alpha `win(t,from,9,0.3,1.2)` × Voyager alpha.
- **MOTION**: beads travel; zoom begins.
- **TEXT**: line "A DISTANT VANTAGE POINT".
- **INTENT**: establish where we are looking from and toward.

### B03 · Just another dot · 6.46–11.40 s
- **WORDS**: "the Earth might not seem of any particular interest" (`earth`, `of`)
- **CAMERA**: continues the push toward the Sun; from 6.0 we pass Voyager: pq=`ease(ramp(t,6,4))`, probe x −1100·pq, y +150·pq, scale ×(1+2.3pq), alpha out `1−ramp(t,8.4,1.4)`. Extra push ×(1+0.6·ease(ramp(t,10.5,4))).
- **ENTERS**:
  - 5.2+0.3i · orbit i (ORB) · dotted ellipse around the Sun, rx = r·k, ry = rx·0.34, rot −0.12, trailing the planet by `TAU·ramp(t,5.2+0.3i,1.8)` · beads gap 4.5 r1.0 GOLD alpha 0.6
  - with its orbit · planets (not Earth): glow AMBER r9 + WARM dot r1.8 (Jupiter, Saturn r2.6); Saturn ring `ellipse(px,py,8,2.4,−0.12,20)` beads
  - 5.8 · Earth (orbit 2) · same amber dot, alpha `ramp(t,5.8,1.2)`; glow r12
  - earth · tag "EARTH" · leader (−30,−44) from Earth · GOLD / GOLDT · writes 0.6 s · gone by 11.3
- **MOTION**: planets move along orbits; orbits write on; camera pushes.
- **TEXT**: line "OF NO PARTICULAR INTEREST" at `of`.
- **SCIENCE**: Earth is the 3rd orbit; seen from above the ecliptic (Voyager was ~32° above it).
- **INTENT**: Earth is indistinguishable from the others.

### B04 · Lock-on · 11.40–14.46 s
- **WORDS**: "But for us, it's different." (`but`, `diff`)
- **CAMERA**: lock: Sun position blends to (DOT − earthOffset) with `ease(ramp(t,11.2,2.4))`, so Earth glides to DOT = (1240,540) and stays there.
- **ENTERS**:
  - but · orbits and other planets dim to 25% over 0.8 s
  - but · Earth turns PALE (glow r12+16, core "215,235,255", r2.4)
  - but · reticle on Earth · radius 26+160·(1−ease(ramp(t,but,1.1))), rot 0.35t · PALE · `reticle()` · alpha `ramp(t,but,0.3)`
- **STAYS**: Sun flare (now just right of Earth), dimmed orbits.
- **MOTION**: reticle closes and turns; push-in continues.
- **TEXT**: "BUT FOR US" row 0; "IT IS DIFFERENT" row 1 at diff.
- **INTENT**: of all the dots, this one is ours.

### B05 · The photograph · 14.46–16.95 s
- **WORDS**: "Consider again that dot." (`consider`, `dot`)
- **CAMERA**: k × exp(ln12·ease(ramp(t,consider,3.2))): the orbits fly past the lens (they fade `1−ramp(t,consider,1.3)`, the system fades `1−ramp(t,14.8,1.8)`); Earth stays at DOT.
- **ENTERS**:
  - consider · scattered-light bands (the real image's sunlight streaks), in a frame rotated −0.1 rad about DOT, x-scale 1+0.018(t−consider). Bands [x, half-width, colour, alpha]: [560,110,CYAN,.05] [780,170,"255,140,70",.09] [1010,90,"120,170,255",.07] [1240,210,"255,165,95",.13] [1450,120,"190,120,255",.08] [1640,250,"255,120,150",.06]; each a horizontal gradient 0→a→0, 70 speckles (rng 101) and 4 vertical faded streaks. Alpha `win(t,consider,22.7,1.4,0.9)`
  - dot+0.2 · tag "0.12 PIXEL" · leader (50,60) from DOT · PALE
- **STAYS**: reticle, Earth dot.
- **MOTION**: bands widen slowly; orbits fly off.
- **TEXT**: label "NARROW ANGLE CAMERA"; "CONSIDER AGAIN", "THAT DOT" (row 1).
- **SCIENCE**: in the photo Earth is 0.12 pixel, sitting in a band of scattered sunlight.
- **INTENT**: recreate the actual photograph, respectfully.

### B06 · HERE · 16.95–18.44 s
- **WORDS**: "That's here." (`here`)
- **ENTERS**: here · crosshair: 4 lines from 14 px off DOT to x=60, x=1860, y=168, y=912; grow `easeOut(ramp(t,here,0.7))`; `fade` PALE 0.55→0.08; ticks every 40 px, 8 px long · alpha `win(t,here,22,0.2,0.5)`
- **EXITS**: reticle fades 16.6–17.1.
- **TEXT**: big "HERE".
- **INTENT**: pin the location, map-like.

### B07 · HOME · 18.44–19.59 s
- **WORDS**: "That's home." (`home`)
- **ENTERS**: home and home+0.3 · two dotted ripples from DOT, radius 10→570 easeOut over 2.4 s, beads gap 5, PALE, alpha 0.75·(1−q)
- **TEXT**: big "HOME".
- **INTENT**: warmth spreading from the dot.

### B08 · US · 19.59–21.76 s
- **WORDS**: "That's us." (`us`)
- **ENTERS**: us · Earth core turns warm "255,236,210", glow radius +16, alpha +0.3 (`win(t,us,21.9,0.4,0.3)`)
- **TEXT**: big "US" in GOLDT. All three words fade at 21.8.
- **INTENT**: the dot contains people; it glows like a hearth.

### B09 · The dive · 21.76–22.94 s
- **WORDS**: "On it," (`onit`)
- **CAMERA**: dive: speed bump 1.15·g1(t,22.3,0.6) → stars streak outward in NEON. Globe radius R = 2.2·exp(ln(300/2.2)·q), q = `ease(ramp(t,onit,1.5))`; centre DOT → (1180,555).
- **ENTERS**: onit · the globe (`drawGlobe(FIB)`), spin `lonAt(t)`; holo rings draw `ramp(t,23,1.5)`.
- **EXITS**: bands, crosshair, big words (by 22.7).
- **MOTION**: rush forward; globe blooms open.
- **INTENT**: hero moment 1: we go inside the pixel.

### B10 · Everyone you love · 22.94–24.55 s
- **WORDS**: "everyone you love," (`love`)
- **ENTERS**: love · "you" = P0: glow PINK r26 + core "255,220,240" r3 · 7 love arcs P0→love[i], lift 0.04, PINK, width 1.3, each draws `easeOut(ramp(t,love+0.07i,0.5))`; end dots "255,190,225" r2.2
- **MOTION**: globe spins; arcs draw.
- **TEXT**: label "HOME PLANET" (22.3); line "EVERYONE YOU LOVE".
- **INTENT**: the smallest, warmest circle first.

### B11 · Everyone you know · 24.55–26.50 s
- **WORDS**: "everyone you know," (`know`)
- **ENTERS**: know · 60 arcs P0→know[i], lift 0.08, CYAN alpha 0.6, stagger 0.018 s, each 0.6 s; dots CYAN r1.7
- **TEXT**: "EVERYONE YOU KNOW".
- **INTENT**: the circle widens.

### B12 · Everyone you ever heard of · 26.50–28.27 s
- **WORDS**: "everyone you ever heard of," (`heard`)
- **ENTERS**: heard · 170 arcs (PEOPLE.heardArcs), lift 0.04+0.07·angle, colour i%3 ? VIO : PINK, alpha 0.4, width 0.9, stagger 0.009 s, each 0.8 s
- **TEXT**: "EVERYONE YOU EVER HEARD OF".
- **INTENT**: a web over the whole planet.

### B13 · Every human who ever was · 28.27–30.88 s
- **WORDS**: "every human being who ever was," (`human`)
- **ENTERS**: human · 4700 life points (all + dust) light up outward from P0: point on at human + (angle/π)·1.7, fade-in 0.25 s; dot (0.8+0.5s)·R/300 scale, WARM, alpha 0.75 × (0.4+0.6z); back side hidden
- **TEXT**: "EVERY HUMAN WHO EVER WAS"; counter to 117,000,000,000 (section 6).
- **SCIENCE**: ~117 billion humans have ever been born (Population Reference Bureau estimate).
- **INTENT**: the globe fills; scale of humanity.

### B14 · Lived out their lives · 30.88–32.09 s
- **WORDS**: "lived out their lives." (`lived`)
- **ENTERS**: lived · each life point flares once at lived + l·1.1: brightness 0.25+0.9·exp(−(t−tl)/0.25), colour "255,236,200" during its first 0.4 s, then settles to 0.25 (afterglow)
- **EXITS**: all arcs fade `1−ramp(t,lived,0.8)`.
- **TEXT**: "LIVED OUT THEIR LIVES".
- **INTENT**: a twinkle of births and deaths: every light had its moment.

### B15 · The river · 32.09–34.57 s
- **WORDS**: "The aggregate of" (`aggregate`)
- **CAMERA**: globe q2 = ease(ramp(t,aggregate,1.8)): R → 150, centre → (300,600). Pan starts (panRate).
- **ENTERS**: aggregate · river of 1500 dashes (RIV) emerging from the globe's right limb (src = globe.cx + 0.9R) and flowing right: x = src + ((x0 + s(t−aggregate)) mod 2600), shown while x < head = src + 2600·ease(ramp(t,aggregate,2.4)); centre y = `rivCY(x,t)` = 600 + 34 sin(0.0045x − 0.25t) + 16 sin(0.011x + 1.7); half-width 8 + 100·clamp((x−src)/600); y = centre + v·hw + 4 sin(1.3t+ph). Each dash = `fade` line length 0.12s px, width 1.8, colour NEON[h], alpha 0.35+0.5(1−|v|), plus dot r1.1
- **EXITS**: life points fade `1−ramp(t,aggregate+0.6,1.4)`.
- **MOTION**: continuous flow; ref look = neon streaks.
- **TEXT**: label "HUMAN HISTORY"; "THE AGGREGATE".
- **INTENT**: all those lives become one current: history.

### B16 · Joy and suffering · 34.57–35.59 s
- **WORDS**: "our joy and suffering," (`joy`, `suffer`)
- **ENTERS**:
  - joy · upper lanes (v<−0.12) turn GOLD / "255,235,170" (h odd/even) and lift 18 px (`ramp(t,joy,0.9)`); sparks (12%) rise a further sr·clamp((t−joy)/2.5) and fade to 40%
  - suffer · lower lanes (v>0.12) turn RED / "150,70,200", sink 22 px, dash length ×0.7
- **TEXT**: "JOY AND SUFFERING".
- **INTENT**: one river, two tones, the same water.

### B17 · Thousands of confident religions · 35.59–39.04 s
- **WORDS**: "thousands of confident religions," (`thousands`, `confident`)
- **CAMERA**: scroll(t) = 60·max(0,t−35) (+30·max(0,t−41.5)) px: everything on the bank moves left; globe exits left (−520·ease(ramp(t,35.6,3.2))).
- **ENTERS**:
  - thousands + ((xw−700)/1900)·2.3 + 0.3d · 520 tiny marks (FAR) on the far bank: y = rivCY − 110 − 70y, vertical hairline h tall, GOLD
  - thousands + ((xw−760)/1700)·2.2 + 0.3d · 150 emblems (EMB) standing on the near bank (y = rivCY − 110·(river thinning) − 8), only x ≥ 700; shapes by type: 0 spire (triangle ±0.18h, apex −0.8h, mast to −h); 1 dome (box ±0.3h × 0.4h + half-circle r0.3h + finial); 2 arch (posts ±0.22h to −0.62h + half-ellipse 0.22h×0.3h); 3 ring (pole to −0.55h + circle r0.22h at −0.8h); 4 star (pole to −0.5h + 5-point star r 0.24h/0.1h at −0.76h). Hairline alpha 0.25 + beads gap 3.6 r0.9 alpha 0.8, GOLD, write-on 0.7 s
  - confident + 0.6d · each emblem (x > 820) sends a beam up: `fade` GOLD 0.5→0 from its top, length bl·easeOut, never above y 330; top dot "255,240,200" r1.8
- **TEXT**: "THOUSANDS OF CONFIDENT RELIGIONS" (writes 2.6 s).
- **INTENT**: countless certainties, each shining upward, all on the same small bank.

### B18 · Ideologies · 39.04–39.88 s
- **WORDS**: "ideologies" (`ideologies`)
- **ENTERS**: ideologies + 0.7d · 34 flags (FLAGS), x ≥ 720: pole from bank up f.h·easeOut(ramp(0.5 s)), CYAN or VIO; flag w × 22 px, top edge ripples 4·sin(0.8i − 4t + 6d)·(i/8), `hairG`
- **TEXT**: "IDEOLOGIES".
- **INTENT**: banners raised among the beliefs.

### B19 · Economic doctrines · 39.88–41.89 s
- **WORDS**: "and economic doctrines," (`economic`)
- **ENTERS**: economic + 0.15k · 4 market lines (CHARTS) across x 900–1862, y0 280/318/356/394, `hairG` width 1.2, draw left→right `ease(ramp(1.5 s))`, head dot r2.4; the VIO line crashes at the end
- **EXITS**: emblems, flags, charts fade 41.2–42.2.
- **TEXT**: "ECONOMIC DOCTRINES".
- **INTENT**: competing charts of how the world should work.

### B20 · Hunter & forager · 41.89–44.20 s
- **WORDS**: "every hunter and forager," (`hunter`)
- **CAMERA**: river thins (half-width ×0.32, alpha ×0.55) and sinks to y≈735 (`ease(ramp(t,41.2,1.6))`); it is the ground line for all pairs. Pair centre PC = (1150,520); each pair drifts left.
- **ENTERS**: (u = t − hunter; alpha `win(t,hunter,44.8,0.35,0.6)`)
  - hunter · AMBER comet (`trail`, 30 samples, 0.025 s) darting: (PC.x−170−50u+150 sin 2.6u+60 sin 7.1u, PC.y−40+60 sin(3.3u+1))
  - hunter · GREEN forager at (PC.x+170−50u+30 sin 0.9u, PC.y+30+20 sin(1.3u+0.5)), glow r20; 34 motes (rng 301) scattered ±130/±85 drift into it one by one (collect time 0.25–2.15 s)
- **TEXT**: label "THE CAST"; "HUNTER & FORAGER".
- **INTENT**: chase vs gather: two ways to live.

### B21 · Hero & coward · 44.20–45.74 s
- **WORDS**: "every hero and coward," (`hero`)
- **ENTERS**: (adv = ease(ramp(u,0.1,1.2)), alpha `win(t,hero,46.3,…)`)
  - hero · GOLD flare at (PC.x−130−40u, PC.y+10−30adv), R 6+12adv, seed 12, 12 rays: steps forward and grows
  - hero · coward: VIO dot at (PC.x+140+90adv, PC.y+10−20adv) shrinking to 60%, dimming, faint line back to where it stood
- **TEXT**: "HERO & COWARD".
- **INTENT**: one steps into the light, one backs away.

### B22 · Creator & destroyer of civilization · 45.74–49.15 s
- **WORDS**: "every creator and destroyer of civilization," (`creator`, `destroyer`, `civ`)
- **ENTERS**: (rng 311; ground y 735; x0 = 700 − 30u)
  - creator+0.25+0.045k · 22 towers: width 18–46, height 60–60+230r², x = x0 + 38k + 8r; rise in 0.7 s (ease); outline + window dots (grid 7/14 px, 55% lit), CYAN dots r1.1, hairline alpha 0.25. A CYAN builder light rides the newest tower top.
  - destroyer+0.15+0.9r · each tower collapses: its dots fall y + 0.5·700·τ² (τ after a 0–0.4 s per-dot delay), drift ±40τ, turn RED/AMBER, fade to 30% over 1.6 s, stop at ground; RED glow r60 on impact
  - destroyer · RED flare (seed 31) sweeps right→left over the skyline in 1.6 s
- **TEXT**: "CREATOR & DESTROYER" + row 1 "OF CIVILIZATION" at civ.
- **INTENT**: building and ruin: the same hands.

### B23 · King & peasant · 49.15–51.37 s
- **WORDS**: "every king and peasant," (`king`)
- **ENTERS**: (apex = (PC.x−40u, PC.y−170); lv = ease(ramp(t,50.3,0.9)))
  - king · hierarchy pyramid: rows i=1..5 with 2i+1 dots at (apex.x+(j−i)·34, apex.y+52i), hairlines to parents, "200,170,120"
  - king · king at apex: GOLD glow r26, core r3.4, 5 crown rays
  - king · peasant at the bottom-left corner, dim "190,160,120"
  - 50.3 · the pyramid falls away (+160 px, fades); king descends and peasant rises to (PC.x∓60−40u, PC.y+40); both become the same GOLD dot
- **TEXT**: "KING & PEASANT".
- **SCIENCE/INTENT**: from far enough away there is no rank.

### B24 · A young couple in love · 51.37–53.29 s
- **WORDS**: "every young couple in love," (`couple`, `love2`)
- **ENTERS**: couple · two comets PINK and AMBER (34 samples, 0.035 s) spiralling in: radius 230·(1−ease(u/1.7))+10, angle 3.3u (+π for the second), y squashed 0.55, centre (PC.x−30u, PC.y)
  - love2 · merged glow "255,120,170" r70; one PINK dotted ring expands 20→320 (flat 0.55) over 1.6 s
- **TEXT**: "A YOUNG COUPLE IN LOVE".
- **INTENT**: two paths become one.

### B25 · Mother, father, hopeful child · 53.29–56.58 s
- **WORDS**: "every mother and father, hopeful child," (`mother`, `child`)
- **ENTERS**: (cl = ease(ramp(u,0,1.1)); dx = −35u)
  - mother · CYAN parent and AMBER parent move from ±170 to ±70 around (PC.x+dx, PC.y+30); line between them
  - child · a child is born between them: flare "190,235,255" (seed 41) R 3→10, rising 110 px (`ease(ramp(t,child+0.2,1.8))`), lines from both parents
- **TEXT**: "MOTHER & FATHER", row 1 "HOPEFUL CHILD" at child.
- **INTENT**: a new light, rising: hope.

### B26 · Inventor & explorer · 56.58–59.00 s
- **WORDS**: "inventor and explorer," (`inventor`, `explorer`)
- **ENTERS**:
  - inventor+0.1 · inventor at (PC.x−190−20u, PC.y+70), CYAN; 3 idea branches (rng 351) growing recursively to depth 5 (each segment 0.22 s, 2–3 children, angle ±0.65, length ×0.62–0.82), tips "220,250,255"
  - explorer · explorer launches from (PC.x+90−20u, PC.y+70) toward the upper right: distance 1500·ramp(t,explorer,1.5)^2.2 along (0.86,−0.5); beaded "200,170,255" trail with AMBER/VIO beads; a small AMBER dotted ring locks on it; it leaves frame
- **EXITS**: river fades 58.2–59.3.
- **TEXT**: "INVENTOR & EXPLORER".
- **INTENT**: curiosity leaves the frame: it leads into the web (and echoes Voyager).

### B27 · The web · teacher of morals · 59.00–60.63 s
- **WORDS**: "every teacher of morals," (`teacher`)
- **CAMERA**: 3D web (WEB): camera z = 0.13(t−58.4); screen = (960 + 760x/d, 540 + 760y/d), d = z − cz > 0.2; nodes appear right→left following the explorer (`ramp(t, 58.4+(1−x/W)·1.0, 0.5)`); depth fade `clamp((3.2−d)/1.2)·clamp((d−0.2)/0.4)`. Edges hairline 0.8 alpha 0.12 NEON; nodes r 0.8+1.2m.
- **ENTERS**: teacher · node at (1380,400) (drifts outward 3%/s from centre): fan of 20 lines to students in the lower arc (angles 0.2–2.8 rad, radius 130–200, y×0.8), CYAN, draw 59.43+0.03k; node glow CYAN r26; tag "TEACHER OF MORALS" (30,−50)
- **TEXT**: none but tags (label "THE CAST" stays).
- **INTENT**: one voice, many listeners.

### B28 · Corrupt politician · 60.63–62.45 s
- **WORDS**: "every corrupt politician," (`corrupt`)
- **ENTERS**: corrupt · node at (730,640): 14 links (rng 411) radius 110–200, RED/PINK, drawing from 60.8; glitch: each frame (rng frame·7+3) 25% of links jump ±9 px sideways; node split into a red and a cyan copy ±3 px; tag "CORRUPT POLITICIAN" (−30,56) RED/REDT
- **INTENT**: the signal is corrupted.

### B29 · Superstar · 62.45–64.46 s
- **WORDS**: "every superstar," (`superstar`, `star`)
- **ENTERS**: superstar · node at (1130,560): flare "255,175,90", seed 51, 22 rays, R = (10+26·ease(ramp(t,superstar,0.8)))·(1+0.8·g1(t,star+0.2,0.5)); star · 70 neon streaks (rng 421) fly outward at 250–950 px/s; tag "SUPERSTAR" (44,70) AMBER/GOLDT
- **INTENT**: hero moment 2: the brightest light in the film, and still just one node.

### B30 · Supreme leader · 64.46–66.80 s
- **WORDS**: "every supreme leader," (`supreme`)
- **ENTERS**: supreme · node at (1450,330): 60 points in a ring radius 140–400 (y×0.55) pull lines inward to it (RED/AMBER, easeOut 0.6 s, staggered 0–0.8 s); one RED dotted ring expands 20→380 over 1.6 s from 65.17; flare "255,110,80" seed 61; tag "SUPREME LEADER" (−40,70)
- **INTENT**: everything drawn toward one point.

### B31 · Saint & sinner · 66.80–68.44 s
- **WORDS**: "every saint and sinner" (`saint`, `sinner`)
- **ENTERS**: saint · white-gold node (840,470), glow r40, GOLD halo ellipse 16×5 above it at 67.21; tag "SAINT" (−40,−60) · sinner · crimson node (1060,560), glow "200,20,60" r30, jagged RED ring (rng 441); tag "SINNER" (40,60)
- **EXITS**: all role elements fade 68.5–69.1.
- **INTENT**: both made of the same light.

### B32 · The history of our species · 68.44–70.45 s
- **WORDS**: "in the history of our species," (`history`)
- **CAMERA**: the web swirls: every node rotates about the centre by sw·(2.6 + 900/(r+200)), sw = ease(ramp(t,history,2)), and the radius shrinks ×(1−0.8·ease(ramp(t,68.8,1.8))); web fades 70.3–71.2.
- **ENTERS**: 69.9 · the globe re-forms at the centre (960,540), R 220 (alpha `ramp(t,69.9,0.6)`)
- **TEXT**: "THE HISTORY OF OUR SPECIES".
- **INTENT**: all of it collapses back into one place.

### B33 · Lived there · 70.45–71.97 s
- **WORDS**: "lived there," (`livedThere`)
- **CAMERA**: pull-back: speed −0.9·g1(t,72.2,0.65) (stars stream inward). Globe R = 220·exp(ln(2.4/220)·q), centre (960,540) → D2 = (1160,520), q = ease(ramp(t,71.2,2)).
- **TEXT**: label "EARTH - FROM 6 BILLION KM"; line "LIVED THERE".
- **INTENT**: everything we just saw fits in that shrinking ball.

### B34 · A mote of dust · 71.97–73.75 s
- **WORDS**: "on a mote of dust," (`mote`)
- **ENTERS**: mote−0.3 · 300 motes (MOTES) converge in from ×2.6 spread to their places around D2 (`ease(ramp(t,71.4,2.4))`): layer 0 = 22 WARM bokeh discs r 30–90 alpha 0.05; layer 1 = 128 sparkles r 1.1–2.7; layer 2 = 150 specks r 0.6–1.2; colour "200,190,200"; drift 26·sin(sp·t+ph), 18·sin(0.8sp·t+1.3ph), sinking 6 px/s
- **STAYS**: Earth is now a PALE dot r≈2.4 at D2 with glow.
- **TEXT**: "ON A MOTE OF DUST".
- **INTENT**: Earth becomes one speck among specks.

### B35 · Suspended in a sunbeam · 73.75–77.44 s
- **WORDS**: "suspended in a sunbeam." (`suspended`, `sunbeam`)
- **ENTERS**:
  - suspended · drift slows to 30% (`1−0.7·ramp(t,suspended,1.2)`)
  - 75.0 · sunbeam through D2: angle 0.58 rad from vertical, half-width 260; WARM gradient across (0→0.2→0), drawn in 30 px strips so it passes through the frame; 12 god-ray streaks "255,220,170"; alpha `ramp(t,75,1.8)` (full on "sunbeam")
  - motes inside the beam glow: alpha +1.1·exp(−2.2(perp/bw)²), colour "255,225,180"
- **TEXT**: "SUSPENDED IN A SUNBEAM" (writes 2.1 s).
- **SCIENCE**: in the real photo, Earth sits in a ray of scattered sunlight.
- **INTENT**: stillness; tenderness.

### B36 · A very small stage · 77.44–80.11 s
- **WORDS**: "The Earth is a very small" (`earth2`, `small`)
- **ENTERS**: small · the beam narrows into a spotlight: angle 0.58→0.12, half-width 260→70, its lower end pulls up to 60 px below D2 (strips fade over the last 160 px) (`ease(ramp(t,small,1.6))`)
- **CAMERA**: 79.6 · slow pull-back ×1→0.6 around D2 (`ease(ramp(t,79.6,1.8))`).
- **TEXT**: "A VERY SMALL STAGE" (writes 2.8 s).
- **INTENT**: the spotlight finds the performer.

### B37 · The stage · 80.11–81.56 s
- **WORDS**: "stage" (`stage`)
- **ENTERS**: stage · dotted stage ellipse at D2+(0,44)·zoom, rx 110·zoom, ry 18·zoom, GOLD beads, writes 0.9 s; a lower half-ellipse +10 px for depth; floor glow WARM; 9 footlights "255,230,190" along the front edge (0.05 s apart)
- **INTENT**: a stage: everything that ever happened happened here.

### B38 · A vast cosmic arena · 81.56–84.50 s
- **WORDS**: "in a vast cosmic arena." (`vast`, `cosmic`, `arena`)
- **CAMERA**: pull-back 2: speed −0.85·g1(t,82.5,0.75); the mote scene shrinks ×(1−0.985·ramp(t,vast,1.9)^1.6) and fades 82.6–83.5. Galaxy scale sg = exp(ln40·(1−q)), q = ease(ramp(t,vast,2.2)); the Sun's place in the galaxy is anchored at D2, then the galaxy centre slides to (960,560).
- **ENTERS**:
  - 81.8 · galaxy (GAL): radius 520·sg, dots r clamp(0.5+1.2m·√sg, 0.5, 2.6), alpha 0.25+0.55m; bulge glow "255,200,140" r 0.45Rg; halo "140,160,255"
  - cosmic+0.16i · 5 arena tiers: dotted ellipses rx = Rg(1.18+0.2i), ry = rx(0.42+0.03i), raised 0.06·Rg·i, rot −0.15, counter-rotating 0.02 rad/s, GOLD beads gap 4.6, write 0.9 s each
  - arena · tiers brighten; 16 dotted aisles from tier 0 to tier 4
  - 83.9 · Sun marker: PALE glow + dotted ring r9; tag "YOU ARE HERE" (40,64)
- **TEXT**: "IN A VAST COSMIC ARENA" (writes 2.4 s).
- **SCIENCE**: the Sun is about halfway out in the Milky Way's disc, on a spiral arm.
- **INTENT**: hero moment 3: the stage sits inside an arena of 100 billion stars.

### B39 · Into the cosmic web · 84.50–87.00 s
- **WORDS**: (music)
- **CAMERA**: slow retreat (−0.07 speed); galaxy shrinks ×exp(ln0.12·ease(ramp(t,84.8,7.5))); arena tiers fade 86.8–88.
- **ENTERS**: 85.5 · cosmic web (COSMOS): nodes at (960 + 900x·wz, 560 + 900y·wz), wz = 4→1 (`ease(ramp(t,84.8,8.5))`) so it closes in from outside; filaments hairline 0.9 VIO / "120,170,255" alpha 0.22; nodes glow r6–14 (WARM if m>0.7) + WHITE core; alpha `ramp(t,85.5,2.5)`
- **INTENT**: even the galaxy is one node.

### B40 · Pale blue dot · 87.00–95.10 s
- **WORDS**: (music)
- **ENTERS**: title "PALE BLUE DOT" at 87.0, "CARL SAGAN" at 89.0 (section 6); "YOU ARE HERE" fades 88.5–89.5.
- **EXITS**: 93.3–95.05 fade to black (`fades`); lettering fades 93.2–94.6.
- **MOTION**: web keeps closing in, galaxy keeps shrinking.
- **INTENT**: quiet end; the title names what we saw.

## 8. REFERENCE STILLS
`cinema/refs/paleDot/Bnn_fNNNNN.jpg`, one per beat (middle frame), rendered from the reference build
with `node tools/refs.mjs paleDot`. `node tools/check.mjs paleDot` scores a build against them.

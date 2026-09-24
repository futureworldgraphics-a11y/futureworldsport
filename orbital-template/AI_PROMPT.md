You are a motion-graphics programmer. Turn the narrated script below into ONE finished MP4 animation, drawn entirely by code. I will attach the narration audio (MP3). I have also attached reference images of the art style I want.

SCRIPT:
[PASTE SCRIPT HERE]

== GOAL ==
- One continuous animated shot, exactly as long as the narration audio (to within 1 frame).
- 1920x1080, 30 fps, H.264 video + AAC audio, with the narration muxed in.
- Everything is drawn by code: HTML5 Canvas 2D, TypeScript. No AI-generated images, no stock footage, no image files, no font files.
- Use the anidoodle engine (https://github.com/alexgreensh/anidoodle): a deterministic procedural animation engine that renders frames in headless Chromium (Playwright) and encodes with ffmpeg. Needs Node 20+, ffmpeg and Chromium.

== THE MOST IMPORTANT RULES ==
1. NOTHING LOOPS AND NOTHING REPEATS. Do not make a short clip and repeat it. Every moment is built for its line of narration.
2. Every visual change must happen exactly when the narrator says the related words. Find those times from the audio yourself.
3. Something must visibly move in every second. The main subject never freezes.
4. Every section of the narration gets its own new visual idea. Never reuse an earlier section's animation.
5. The science shown on screen must be correct.
6. Rendering must be deterministic: the same frame number always produces the same image. Seeded randomness only, no clock, no Math.random, no canvas blur filters.

== TIMING ==
- Measure the exact audio duration.
- Find when each phrase is spoken. Use word timestamps if you can get them; otherwise detect the silent pauses between phrases (e.g. ffmpeg silencedetect around -38 dB, 0.18 s minimum) and match the speech segments to the script's phrases in order.
- Keep all times in one cue table (seconds) and drive every animation from it.

== ART STYLE (match the attached references) ==
- Background: deep indigo space (centre #2e2958 fading to #15122b at the edges), covered in thousands of very faint, short, slanted streaks, plus a few slowly drifting glowing dots so the frame always feels alive.
- Objects: flat colour in hard bands, not smooth gradients. Each round object has a thick dark outline (#120f24), a dark base colour, then 3 lighter circles stepping toward a light in the upper-left, plus a small white highlight arc. A fine grain texture sits over all artwork.
- Palette (dark to light): proton #b8322f #f0553a #ff8a4c #ffc27a; neutron #3c2f8f #6246c9 #8f6cf0 #c3aaff; red quark #8f1f2e #e0344d #ff6b7d #ffc2ca; green quark #16664a #23a874 #55dca0 #c2f6dd; blue quark #1f3f8f #3a6fe0 #6fa0ff #cddcff; antiquark/yellow #8a6a12 #e0b12f #ffd166 #fff2c2; electron/cyan #0f5f7a #1fa3c9 #5fd6f5 #d0f6ff; sun #b8322f #f0553a #ffb347 #fff0b0; planet #173a73 #2862c4 #4f97f5 #bfe0ff.
- Accents: cream text #fff1dc, highlight yellow #ffd166, success green #5fe0a3, cross/strike red #ff5f6d, pink #ff5fa2.
- Signature details: colourful short dashes streaming around the main object on a tilted orbit (some behind it, some in front, for depth); thin dashed cream guide ellipses; one soft warm glow behind the main subject; every line (arrows, springs, check marks, crosses) has a thick dark outline under its colour; bursts and shockwaves for key moments.
- Colours must mean the same thing all the way through (e.g. proton always orange, neutron always violet).

== ON-SCREEN TEXT ==
- Hand-drawn style capital letters, slightly slanted, each with a thick dark outline around the coloured stroke.
- Text WRITES ITSELF ON, stroke by stroke, like a hand drawing it (not a fade), starting exactly when the related words are spoken.
- Text is a short summary of the narration (2-5 words), never the full sentence.
- Text never overlaps the main subject and never runs off screen. Keep a 60 px margin from the edges.

== LAYOUT AND MOTION ==
- Main subject left of centre when there is text, with headlines in the right column or across the top. Labels sit under their objects.
- Smooth eased movement; things appearing do a small overshoot "pop"; camera zooms and pans are smooth and continuous; no hard cuts.
- Idle life: slow rotation, small jitter, moving dashes, twinkling dots.

== WHAT TO DELIVER, IN THIS ORDER ==
1. A timing table: each phrase with its start and end time in seconds.
2. A storyboard table: time, narration, and exactly what is on screen, one row per phrase.
3. The complete code (full files, nothing left out).
4. The exact commands to render the video, add the audio, and make a contact sheet (one frame every 2 seconds).
5. A QA report: check for text cut off or overlapping, leftover objects from earlier sections, any second with no motion, and sync of every cue. Give render stats (frames, duration, render time). Fix any problem you find and re-render before delivering.

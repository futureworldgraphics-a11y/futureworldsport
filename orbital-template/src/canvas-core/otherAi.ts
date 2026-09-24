// OTHER AI'S CODE, UNCHANGED (pasted by the user for comparison). Only the wrapper at the very
// bottom is added so anidoodle can call their renderFrame; their own render command does not exist.
import { Film } from "./film";

// animation.ts
// Target: Node 20+, Playwright/Chromium via anidoodle
// Compile: tsc animation.ts

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 30;
const TOTAL_DURATION = 59.0;
const TOTAL_FRAMES = Math.ceil(TOTAL_DURATION * FPS);

// --- DETERMINISTIC MATH ---
let seed = 987654321;
function random() {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
}
function randomRange(min: number, max: number) {
    return min + random() * (max - min);
}
function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function easeOutBack(x: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

// --- PALETTES ---
const PAL = {
    bgCenter: '#2e2958', bgEdge: '#15122b', outline: '#120f24',
    proton: ['#b8322f', '#f0553a', '#ff8a4c', '#ffc27a'],
    neutron: ['#3c2f8f', '#6246c9', '#8f6cf0', '#c3aaff'],
    redQuark: ['#8f1f2e', '#e0344d', '#ff6b7d', '#ffc2ca'],
    greenQuark: ['#16664a', '#23a874', '#55dca0', '#c2f6dd'],
    blueQuark: ['#1f3f8f', '#3a6fe0', '#6fa0ff', '#cddcff'],
    antiQuark: ['#8a6a12', '#e0b12f', '#ffd166', '#fff2c2'],
    cream: '#fff1dc', yellow: '#ffd166', green: '#5fe0a3', red: '#ff5f6d', pink: '#ff5fa2', cyan: '#5fd6f5'
};

// --- CUSTOM VECTOR FONT ENGINE ---
// Stroke definition: array of [x, y] from 0 to 1
type Stroke = [number, number][];
const FONT: Record<string, Stroke[]> = {
    'A': [[[0,1], [0.5,0], [1,1]], [[0.2,0.6], [0.8,0.6]]],
    'B': [[[0,0], [0,1]], [[0,0], [0.8,0], [1,0.25], [0.8,0.5], [0,0.5]], [[0,0.5], [0.9,0.5], [1,0.75], [0.9,1], [0,1]]],
    'C': [[[1,0.2], [0.8,0], [0.2,0], [0,0.2], [0,0.8], [0.2,1], [0.8,1], [1,0.8]]],
    'D': [[[0,0], [0,1]], [[0,0], [0.7,0], [1,0.3], [1,0.7], [0.7,1], [0,1]]],
    'E': [[[1,0], [0,0], [0,1], [1,1]], [[0,0.5], [0.8,0.5]]],
    'F': [[[1,0], [0,0], [0,1]], [[0,0.5], [0.8,0.5]]],
    'H': [[[0,0], [0,1]], [[1,0], [1,1]], [[0,0.5], [1,0.5]]],
    'I': [[[0.5,0], [0.5,1]], [[0.2,0], [0.8,0]], [[0.2,1], [0.8,1]]],
    'K': [[[0,0], [0,1]], [[1,0], [0,0.5], [1,1]]],
    'L': [[[0,0], [0,1], [1,1]]],
    'M': [[[0,1], [0,0], [0.5,0.5], [1,0], [1,1]]],
    'N': [[[0,1], [0,0], [1,1], [1,0]]],
    'O': [[[0.5,0], [0,0.5], [0.5,1], [1,0.5], [0.5,0]]],
    'P': [[[0,0], [0,1]], [[0,0], [0.8,0], [1,0.25], [0.8,0.5], [0,0.5]]],
    'R': [[[0,0], [0,1]], [[0,0], [0.8,0], [1,0.25], [0.8,0.5], [0,0.5]], [[0.4,0.5], [1,1]]],
    'S': [[[1,0.2], [0.8,0], [0.2,0], [0,0.2], [0.5,0.5], [1,0.8], [0.8,1], [0.2,1], [0,0.8]]],
    'T': [[[0,0], [1,0]], [[0.5,0], [0.5,1]]],
    'U': [[[0,0], [0,0.8], [0.2,1], [0.8,1], [1,0.8], [1,0]]],
    'V': [[[0,0], [0.5,1], [1,0]]],
    'W': [[[0,0], [0.25,1], [0.5,0.5], [0.75,1], [1,0]]],
    'X': [[[0,0], [1,1]], [[1,0], [0,1]]],
    'Y': [[[0,0], [0.5,0.5], [1,0]], [[0.5,0.5], [0.5,1]]],
    '?': [[[0.2,0.2], [0.5,0], [0.8,0.2], [0.8,0.4], [0.5,0.7], [0.5,0.8]], [[0.5,0.95], [0.5,1]]],
    ' ': []
};

// Calculate total length of a stroke
function getStrokeLength(stroke: Stroke): number {
    let len = 0;
    for(let i=1; i<stroke.length; i++) {
        const dx = stroke[i][0] - stroke[i-1][0];
        const dy = stroke[i][1] - stroke[i-1][1];
        len += Math.sqrt(dx*dx + dy*dy);
    }
    return len;
}

// Draw text writing itself on
function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, time: number, startT: number, dur: number) {
    const progress = Math.max(0, Math.min(1, (time - startT) / dur));
    let cx = x;
    const slant = 0.2;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let char of text) {
        if (char === ' ') { cx += size * 0.6; continue; }
        const strokes = FONT[char];
        if (!strokes) continue;

        let charProgress = progress * text.length - (cx - x) / (size * 0.8);
        charProgress = Math.max(0, Math.min(1, charProgress));

        for (let stroke of strokes) {
            if (charProgress <= 0) break;
            const totalLen = getStrokeLength(stroke);
            const drawLen = totalLen * charProgress;

            let currentLen = 0;
            ctx.beginPath();

            for (let i=0; i<stroke.length; i++) {
                const px = cx + stroke[i][0] * size + (1 - stroke[i][1]) * size * slant;
                const py = y + stroke[i][1] * size;

                if (i === 0) {
                    ctx.moveTo(px, py);
                } else {
                    const segDx = stroke[i][0] - stroke[i-1][0];
                    const segDy = stroke[i][1] - stroke[i-1][1];
                    const segLen = Math.sqrt(segDx*segDx + segDy*segDy);

                    if (currentLen + segLen > drawLen) {
                        const ratio = (drawLen - currentLen) / segLen;
                        const fx = cx + (stroke[i-1][0] + segDx * ratio) * size + (1 - (stroke[i-1][1] + segDy * ratio)) * size * slant;
                        const fy = y + (stroke[i-1][1] + segDy * ratio) * size;
                        ctx.lineTo(fx, fy);
                        break;
                    } else {
                        ctx.lineTo(px, py);
                        currentLen += segLen;
                    }
                }
            }
            // Thick dark outline
            ctx.lineWidth = size * 0.25;
            ctx.strokeStyle = PAL.outline;
            ctx.stroke();
            // Cream inner
            ctx.lineWidth = size * 0.12;
            ctx.strokeStyle = PAL.cream;
            ctx.stroke();
        }
        cx += size * 0.8;
    }
}

// --- VISUAL ELEMENTS ---
function drawLayeredSphere(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, palette: string[]) {
    ctx.lineWidth = r * 0.15;
    ctx.strokeStyle = PAL.outline;

    // Outer outline + darkest
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = palette[0];
    ctx.fill();
    ctx.stroke();

    // 3 inner highlights stepping towards top-left
    for(let i=1; i<=3; i++) {
        ctx.beginPath();
        const offset = r * 0.15 * i;
        const innerR = r - (r * 0.2 * i);
        if (innerR <= 0) break;
        ctx.arc(x - offset, y - offset, innerR, 0, Math.PI * 2);
        ctx.fillStyle = palette[i];
        ctx.fill();
    }

    // White highlight arc
    ctx.beginPath();
    ctx.arc(x - r*0.4, y - r*0.4, r*0.3, Math.PI, Math.PI * 1.5);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = 'round';
    ctx.stroke();
}

// Global noise canvas for grain texture overlay
let noiseCanvas: HTMLCanvasElement | null = null;
function applyGrain(ctx: CanvasRenderingContext2D) {
    if (!noiseCanvas) {
        noiseCanvas = document.createElement('canvas');
        noiseCanvas.width = WIDTH;
        noiseCanvas.height = HEIGHT;
        const nCtx = noiseCanvas.getContext('2d')!;
        const imgData = nCtx.createImageData(WIDTH, HEIGHT);
        for(let i=0; i<imgData.data.length; i+=4) {
            const val = randomRange(0, 255);
            imgData.data[i] = val;
            imgData.data[i+1] = val;
            imgData.data[i+2] = val;
            imgData.data[i+3] = 15; // very faint
        }
        nCtx.putImageData(imgData, 0, 0);
    }
    ctx.drawImage(noiseCanvas, 0, 0);
}

// --- SCENE RENDERERS ---

function renderBackground(ctx: CanvasRenderingContext2D, time: number) {
    const grad = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, 0, WIDTH/2, HEIGHT/2, WIDTH);
    grad.addColorStop(0, PAL.bgCenter);
    grad.addColorStop(1, PAL.bgEdge);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Slanted streaks
    seed = 123; // Reset seed for deterministic static background elements
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    for(let i=0; i<300; i++) {
        const x = randomRange(-500, WIDTH + 500) + (time * 10 * randomRange(0.5, 1.5)) % WIDTH;
        const y = randomRange(-500, HEIGHT + 500);
        const len = randomRange(20, 100);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y - len);
        ctx.stroke();
    }

    // Drifting dots
    ctx.fillStyle = 'rgba(255,241,220,0.4)';
    for(let i=0; i<50; i++) {
        const x = (randomRange(0, WIDTH) + time * randomRange(-15, 15)) % WIDTH;
        const y = (randomRange(0, HEIGHT) + time * randomRange(-15, 15)) % HEIGHT;
        const outX = x < 0 ? x + WIDTH : x;
        const outY = y < 0 ? y + HEIGHT : y;
        ctx.beginPath();
        ctx.arc(outX, outY, randomRange(1, 3), 0, Math.PI * 2);
        ctx.fill();
    }
}

// Scene 1: Inside every atom (0 - 3.5)
function scene1(ctx: CanvasRenderingContext2D, time: number) {
    const progress = time / 3.5;
    const camZ = progress * 1000;

    for(let i=0; i<30; i++) {
        seed = 1000 + i;
        const z = randomRange(0, 1500) - camZ;
        if (z < -100 || z > 1500) continue;

        const scale = 500 / (z + 100);
        const x = WIDTH/2 + randomRange(-800, 800) * scale;
        const y = HEIGHT/2 + randomRange(-500, 500) * scale;

        const isProton = random() > 0.5;
        drawLayeredSphere(ctx, x, y, 40 * scale, isProton ? PAL.proton : PAL.neutron);

        // Cream guide ellipses
        if (random() > 0.7) {
            ctx.beginPath();
            ctx.ellipse(x, y, 80 * scale, 30 * scale, time + i, 0, Math.PI * 2);
            ctx.strokeStyle = PAL.outline;
            ctx.lineWidth = 4 * scale;
            ctx.stroke();
            ctx.setLineDash([10*scale, 10*scale]);
            ctx.strokeStyle = PAL.cream;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    drawText(ctx, "INSIDE EVERY ATOM", 100, 100, 50, time, 0.5, 1.5);
}

// Scene 2: Unseen (3.5 - 7.0)
function scene2(ctx: CanvasRenderingContext2D, time: number) {
    const localT = time - 3.5;
    const r = Math.min(250, 50 + easeOutBack(Math.min(localT, 1)) * 200);

    // Soft warm glow
    const glow = ctx.createRadialGradient(WIDTH/2, HEIGHT/2, r, WIDTH/2, HEIGHT/2, r*3);
    glow.addColorStop(0, 'rgba(255,194,122,0.15)');
    glow.addColorStop(1, 'rgba(255,194,122,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0,0,WIDTH,HEIGHT);

    drawLayeredSphere(ctx, WIDTH/2 - 200, HEIGHT/2, r, PAL.proton);

    // Orbiting dashes
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for(let i=0; i<12; i++) {
        const angle = localT * 2 + (i * Math.PI / 6);
        const yOffset = Math.sin(angle) * r * 0.4;
        const xOffset = Math.cos(angle) * r * 1.2;
        if (Math.sin(angle) > 0) continue; // Draw behind

        ctx.beginPath();
        ctx.moveTo(WIDTH/2 - 200 + xOffset, HEIGHT/2 + yOffset);
        ctx.lineTo(WIDTH/2 - 200 + xOffset + 20, HEIGHT/2 + yOffset + 5);
        ctx.strokeStyle = PAL.outline; ctx.stroke();
        ctx.strokeStyle = PAL.yellow; ctx.stroke();
    }

    drawText(ctx, "UNSEEN", 1200, 150, 70, time, 4.0, 1.0);
}

// Scene 3: Tech & Effort (7.0 - 11.5)
function scene3(ctx: CanvasRenderingContext2D, time: number) {
    const r = 250;
    const localT = time - 7.0;
    const cx = WIDTH/2 - 200;
    const cy = HEIGHT/2;

    drawLayeredSphere(ctx, cx, cy, r, PAL.proton);

    // Microscope Lens sliding in
    const lensX = cx + Math.max(0, (1 - easeOutBack(localT)) * 800);
    ctx.lineWidth = 15;
    ctx.strokeStyle = PAL.outline;
    ctx.fillStyle = PAL.cyan;
    ctx.beginPath();
    ctx.arc(lensX, cy, 180, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    // Inner lens bands
    ctx.beginPath(); ctx.arc(lensX - 30, cy - 30, 120, 0, Math.PI*2);
    ctx.fillStyle = '#1fa3c9'; ctx.fill();

    // Red strike
    if (localT > 1.5) {
        const strikeP = Math.min(1, (localT - 1.5) * 3);
        ctx.lineWidth = 40;
        ctx.strokeStyle = PAL.outline;
        ctx.beginPath(); ctx.moveTo(lensX - 200, cy - 200); ctx.lineTo(lensX - 200 + 400*strikeP, cy - 200 + 400*strikeP); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lensX + 200, cy - 200); ctx.lineTo(lensX + 200 - 400*strikeP, cy - 200 + 400*strikeP); ctx.stroke();

        ctx.lineWidth = 30;
        ctx.strokeStyle = PAL.red;
        ctx.beginPath(); ctx.moveTo(lensX - 200, cy - 200); ctx.lineTo(lensX - 200 + 400*strikeP, cy - 200 + 400*strikeP); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(lensX + 200, cy - 200); ctx.lineTo(lensX + 200 - 400*strikeP, cy - 200 + 400*strikeP); ctx.stroke();
    }

    // Vortex drop (9.5 - 11.5)
    if (time > 9.5) {
        const dropP = (time - 9.5) / 2.0;
        ctx.fillStyle = `rgba(46, 41, 88, ${dropP})`;
        ctx.fillRect(0,0,WIDTH,HEIGHT);
        // Shrinking
        drawLayeredSphere(ctx, cx, cy, r * (1 - dropP*0.8), PAL.proton);
    }
}

// Scene 4: Forbidden & Quarks (11.5 - 19.5)
function scene4(ctx: CanvasRenderingContext2D, time: number) {
    const cx = WIDTH/2 - 300;
    const cy = HEIGHT/2;
    const localT = time - 11.5;

    // Cage
    if (time < 14.0) {
        drawLayeredSphere(ctx, cx, cy, 300, PAL.proton);
        ctx.lineWidth = 20;
        ctx.strokeStyle = PAL.outline;
        const cageP = easeInOutCubic(Math.min(1, localT));
        for(let i=0; i<6; i++) {
            const ang = (i * Math.PI) / 3;
            ctx.beginPath();
            ctx.moveTo(cx, cy - 400 * cageP);
            ctx.lineTo(cx + Math.cos(ang)*400*cageP, cy + Math.sin(ang)*400*cageP);
            ctx.stroke();
        }
        drawText(ctx, "FORBIDDEN", 1000, 200, 60, time, 12.0, 1.5);
    }
    // Zoom inside
    else {
        const zoomT = time - 14.0;
        // Quarks
        const qR = 80;
        const radius = 150 + Math.sin(zoomT * 5) * 10; // Breathing
        const a1 = zoomT;
        const a2 = zoomT + (Math.PI*2/3);
        const a3 = zoomT + (Math.PI*4/3);

        const q1x = cx + Math.cos(a1) * radius; const q1y = cy + Math.sin(a1) * radius;
        const q2x = cx + Math.cos(a2) * radius; const q2y = cy + Math.sin(a2) * radius;
        const q3x = cx + Math.cos(a3) * radius; const q3y = cy + Math.sin(a3) * radius;

        // Gluon springs
        ctx.lineWidth = 12;
        ctx.strokeStyle = PAL.outline;
        ctx.beginPath(); ctx.moveTo(q1x, q1y); ctx.lineTo(q2x, q2y); ctx.lineTo(q3x, q3y); ctx.closePath(); ctx.stroke();
        ctx.strokeStyle = PAL.cream;
        ctx.lineWidth = 6;
        ctx.setLineDash([15, 10]);
        ctx.stroke();
        ctx.setLineDash([]);

        drawLayeredSphere(ctx, q1x, q1y, qR, PAL.redQuark);
        drawLayeredSphere(ctx, q2x, q2y, qR, PAL.greenQuark);
        drawLayeredSphere(ctx, q3x, q3y, qR, PAL.blueQuark);

        drawText(ctx, "PERMANENTLY IMPRISONED", 900, 250, 45, time, 14.5, 2.0);
    }
}

// Scene 5: Pull & Create Matter (19.5 - 32.0)
function scene5(ctx: CanvasRenderingContext2D, time: number) {
    const cx = WIDTH/2 - 400;
    const cy = HEIGHT/2;
    const localT = time - 19.5;

    let pullDist = 0;
    if (time < 25.5) pullDist = easeInOutCubic(localT / 6.0) * 600;
    else pullDist = 600; // snapped

    const a1 = time; const a2 = time + 2.09; const a3 = time + 4.18;
    const rBase = 150;

    const q2x = cx + Math.cos(a2) * rBase; const q2y = cy + Math.sin(a2) * rBase;
    const q3x = cx + Math.cos(a3) * rBase; const q3y = cy + Math.sin(a3) * rBase;

    // The pulled quark
    let q1x = cx + Math.cos(a1) * rBase + pullDist;
    let q1y = cy + Math.sin(a1) * rBase;

    if (time < 25.5) {
        // Stretching spring
        ctx.lineWidth = 15 + Math.random()*5; // vibrating tension
        ctx.strokeStyle = PAL.outline;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(q1x, q1y); ctx.stroke();
        ctx.strokeStyle = PAL.yellow;
        ctx.lineWidth = 8;
        ctx.stroke();

        drawLayeredSphere(ctx, q1x, q1y, 80, PAL.redQuark);
        drawLayeredSphere(ctx, q2x, q2y, 80, PAL.greenQuark);
        drawLayeredSphere(ctx, q3x, q3y, 80, PAL.blueQuark);
    } else {
        // Snapped! Create meson
        const snapT = time - 25.5;

        // Shockwave
        if (snapT < 1.0) {
            ctx.beginPath();
            ctx.arc(cx + 300, cy, snapT * 800, 0, Math.PI*2);
            ctx.fillStyle = `rgba(255, 209, 102, ${1 - snapT})`;
            ctx.fill();
        }

        // New quark in proton
        const newQx = cx + Math.cos(a1) * rBase;
        const newQy = cy + Math.sin(a1) * rBase;

        // Anti-quark pairs with pulled quark
        const antiQx = q1x - 120;
        const antiQy = q1y;

        // Meson spring
        ctx.lineWidth = 12; ctx.strokeStyle = PAL.outline;
        ctx.beginPath(); ctx.moveTo(q1x, q1y); ctx.lineTo(antiQx, antiQy); ctx.stroke();
        ctx.strokeStyle = PAL.cream; ctx.lineWidth = 6; ctx.stroke();

        drawLayeredSphere(ctx, newQx, newQy, 80, PAL.redQuark); // Replaced
        drawLayeredSphere(ctx, q2x, q2y, 80, PAL.greenQuark);
        drawLayeredSphere(ctx, q3x, q3y, 80, PAL.blueQuark);

        drawLayeredSphere(ctx, q1x, q1y, 80, PAL.redQuark);
        drawLayeredSphere(ctx, antiQx, antiQy, 80, PAL.antiQuark); // Anti-red

        drawText(ctx, "CREATES NEW MATTER", 900, 200, 50, time, 26.0, 2.0);
    }
}

// Scene 6: Certainty & Confirmation (32.0 - 45.0)
function scene6(ctx: CanvasRenderingContext2D, time: number) {
    const cx = WIDTH/2;
    const cy = HEIGHT/2;

    if (time < 39.0) {
        // Wave functions
        const localT = time - 32.0;
        ctx.lineWidth = 12;

        for (let i=0; i<3; i++) {
            ctx.beginPath();
            const colors = [PAL.green, PAL.pink, PAL.cyan];
            for (let x = -200; x < WIDTH + 200; x += 10) {
                const y = cy + Math.sin((x + localT*200) * 0.01 + i*(Math.PI/1.5)) * 200 * easeInOutCubic(Math.min(1, localT/2));
                if (x === -200) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = PAL.outline; ctx.stroke();
            ctx.lineWidth = 6;
            ctx.strokeStyle = colors[i]; ctx.stroke();
            ctx.lineWidth = 12;
        }
    } else {
        // Bubble chamber tracks
        const localT = time - 39.0;
        const numTracks = 8;

        for (let i = 0; i < numTracks; i++) {
            seed = 500 + i;
            const dir = random() > 0.5 ? 1 : -1;
            const color = [PAL.cyan, PAL.yellow, PAL.red, PAL.green][Math.floor(random()*4)];

            ctx.beginPath();
            let r = 0;
            let theta = random() * Math.PI * 2;
            const maxR = localT * 300 * randomRange(0.5, 1.5);

            let lastX = cx, lastY = cy;
            while (r < maxR) {
                const px = cx + Math.cos(theta) * r;
                const py = cy + Math.sin(theta) * r;
                if (r === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);

                r += 5;
                theta += 0.05 * dir;
                lastX = px; lastY = py;
            }

            ctx.lineWidth = 15;
            ctx.strokeStyle = PAL.outline; ctx.stroke();
            ctx.lineWidth = 8;
            ctx.strokeStyle = color; ctx.stroke();

            // Draw particle tip
            if (maxR > 10) {
                drawLayeredSphere(ctx, lastX, lastY, 20, PAL.proton);
            }
        }
        drawText(ctx, "CONFIRMED REAL", 100, 150, 60, time, 39.5, 2.0);
    }
}

// Scene 7: How & Conclusion (45.0 - 59.0)
function scene7(ctx: CanvasRenderingContext2D, time: number) {
    const cx = WIDTH/2 - 200;
    const cy = HEIGHT/2;

    if (time < 54.0) {
        // Question mark from dashes
        const localT = time - 45.0;
        const qScale = Math.min(1, easeOutBack(localT / 2.0));

        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(qScale, qScale);

        const qStrokes = FONT['?'];
        ctx.lineCap = 'round';
        for (let stroke of qStrokes) {
            ctx.beginPath();
            for(let i=0; i<stroke.length; i++) {
                const px = (stroke[i][0] - 0.5) * 600;
                const py = (stroke[i][1] - 0.5) * 600;
                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.lineWidth = 40; ctx.strokeStyle = PAL.outline; ctx.stroke();

            // Streaming dash effect inside
            ctx.setLineDash([30, 40]);
            ctx.lineDashOffset = -time * 100;
            ctx.lineWidth = 20; ctx.strokeStyle = PAL.yellow; ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.restore();

        drawText(ctx, "HOW ?", 1100, 300, 80, time, 46.0, 1.5);
    } else {
        // Eye of knowledge
        const localT = time - 54.0;
        const fadeOut = Math.max(0, 1 - (localT - 3) / 2); // Fades at end

        ctx.globalAlpha = fadeOut;

        // Draw eye shape
        ctx.beginPath();
        ctx.moveTo(cx - 300, cy);
        ctx.quadraticCurveTo(cx, cy - 200, cx + 300, cy);
        ctx.quadraticCurveTo(cx, cy + 200, cx - 300, cy);
        ctx.lineWidth = 30; ctx.strokeStyle = PAL.outline; ctx.stroke();
        ctx.fillStyle = PAL.bgCenter; ctx.fill();
        ctx.lineWidth = 15; ctx.strokeStyle = PAL.cream; ctx.stroke();

        // Pupil reflecting quarks
        ctx.beginPath();
        ctx.arc(cx, cy, 100, 0, Math.PI*2);
        ctx.fillStyle = PAL.outline; ctx.fill();

        const qR = 25;
        const rot = time;
        drawLayeredSphere(ctx, cx + Math.cos(rot)*40, cy + Math.sin(rot)*40, qR, PAL.redQuark);
        drawLayeredSphere(ctx, cx + Math.cos(rot+2.09)*40, cy + Math.sin(rot+2.09)*40, qR, PAL.greenQuark);
        drawLayeredSphere(ctx, cx + Math.cos(rot+4.18)*40, cy + Math.sin(rot+4.18)*40, qR, PAL.blueQuark);

        drawText(ctx, "KNOW IT EXISTS", 1000, 250, 50, time, 54.5, 2.0);
        ctx.globalAlpha = 1.0;
    }
}

// --- MAIN RENDER PIPELINE ---
export function renderFrame(canvas: HTMLCanvasElement, frameNumber: number) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure deterministic randomness based on frame
    seed = 123456789 + frameNumber;

    const time = frameNumber / FPS;

    renderBackground(ctx, time);

    if (time < 3.5) scene1(ctx, time);
    else if (time < 7.0) scene2(ctx, time);
    else if (time < 11.5) scene3(ctx, time);
    else if (time < 19.5) scene4(ctx, time);
    else if (time < 32.0) scene5(ctx, time);
    else if (time < 45.0) scene6(ctx, time);
    else scene7(ctx, time);

    applyGrain(ctx);
}

// Anidoodle / Playwright hook:
if (typeof window !== 'undefined') {
    (window as any).renderFrame = renderFrame;
    (window as any).TOTAL_FRAMES = TOTAL_FRAMES;
    (window as any).FPS = FPS;
    (window as any).WIDTH = WIDTH;
    (window as any).HEIGHT = HEIGHT;
}

// ===== WRAPPER ADDED FOR THE COMPARISON (not part of their code) =====
// Hands their renderFrame the engine's canvas; 1742 frames = the narration's length (their
// own mux used -shortest, which cuts to the audio the same way).
export const otherAi: Film = {
  meta: { title: "otherAi", W: 1920, H: 1080, fps: 30, bpm: 120, durationFrames: 1742 },
  assets: { images: {} },
  shots: [{ id: "theirs", start: 0, end: 1742, draw: (ctx, frame) => renderFrame({ getContext: () => ctx } as unknown as HTMLCanvasElement, frame) }],
};

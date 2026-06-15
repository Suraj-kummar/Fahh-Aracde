// =========================================================
//  MEMORY MATCH — memory.js
//  Classic slot-machine emoji card flip game
//  Nostalgic neon retro style
// =========================================================
"use strict";

const MemoryGame = (() => {

  // ── Emoji set (8 pairs = 16 cards) ───────────────────────
  const EMOJIS = ["🍒", "🍋", "⭐", "🔔", "💎", "7️⃣", "🍀", "💣"];
  const GRID_COLS = 4;
  const GRID_ROWS = 4;
  const TOTAL     = GRID_COLS * GRID_ROWS; // 16

  // ── Card dimensions (calculated on init) ─────────────────
  let CARD_W, CARD_H, GAP, OFFSET_X, OFFSET_Y;

  // ── State ─────────────────────────────────────────────────
  let cards        = [];  // { emoji, flipped, matched, flipT, col, row }
  let selected     = [];  // indices of face-up unmatched cards (max 2)
  let moves        = 0;
  let matchedPairs = 0;
  let startTime    = null;
  let elapsedSecs  = 0;
  let gameState;           // "idle" | "playing" | "locked" | "won"
  let lockTimer    = null;

  let canvas, ctx, W, H;
  let animId = null;
  let frameCount = 0;

  // ── Audio ─────────────────────────────────────────────────
  let audioCtx;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, type = "sine", dur = 0.12, vol = 0.15) {
    try {
      const ac = getAudio();
      if (ac.state === "suspended") ac.resume();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(vol, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + dur + 0.01);
    } catch (_) {}
  }

  function playFlip()  { beep(440, "sine",     0.08, 0.12); }
  function playMatch() {
    beep(660, "sine", 0.12, 0.18);
    setTimeout(() => beep(880, "sine", 0.12, 0.18), 100);
    setTimeout(() => beep(1100,"sine", 0.12, 0.15), 200);
  }
  function playMiss()  { beep(220, "sawtooth", 0.15, 0.1); }
  function playWin()  {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => setTimeout(() => beep(n, "sine", 0.2, 0.2), i * 120));
  }

  // ── Particles ─────────────────────────────────────────────
  let particles = [];

  function spawnMatchParticles(col, row) {
    const cx = OFFSET_X + col * (CARD_W + GAP) + CARD_W / 2;
    const cy = OFFSET_Y + row * (CARD_H + GAP) + CARD_H / 2;
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: Math.random() * 5 + 2,
        color: `hsl(${Math.random() * 60 + 30}, 100%, 65%)`,
      });
    }
  }

  // ── Game logic ────────────────────────────────────────────

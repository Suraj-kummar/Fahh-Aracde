// ============================================================
//  SpaceInvadersGame — Classic Neon Space Invaders for Fahh Arcade
//  Canvas: invaders-canvas (480 x 520)
//  Global: SpaceInvadersGame
// ============================================================
const SpaceInvadersGame = (() => {
  // ── Constants ──────────────────────────────────────────────
  const W = 480, H = 520;
  const ALIEN_COLS = 10, ALIEN_ROWS = 5;
  const ALIEN_W    = 34, ALIEN_H = 26;
  const ALIEN_PAD_X = 10, ALIEN_PAD_Y = 14;
  const ALIEN_OFF_X = (W - (ALIEN_COLS * (ALIEN_W + ALIEN_PAD_X) - ALIEN_PAD_X)) / 2;
  const ALIEN_OFF_Y = 80;

  // 3 alien types per row band
  const ALIEN_TYPES = [
    { pts: 30, color: '#ff6b6b', glow: '#ff6b6b', rows: [0]       },  // top row — red
    { pts: 20, color: '#f9ca24', glow: '#f9ca24', rows: [1, 2]    },  // mid    — gold
    { pts: 10, color: '#74b9ff', glow: '#74b9ff', rows: [3, 4]    },  // bottom — blue
  ];

  const PLAYER_W   = 36, PLAYER_H = 20;
  const PLAYER_Y   = H - 50;
  const PLAYER_SPD = 220;  // px/s
  const BULLET_SPD = 420;
  const ALIEN_BULLET_SPD = 200;

  const SHIELD_COUNT = 4;
  const SHIELD_W = 44, SHIELD_H = 28;

  const CLR = {
    bg      : '#0d0d1a',
    player  : '#4ecca3',
    playerG : '#4ecca3',
    bullet  : '#f9ca24',
    abul    : '#ff6b6b',
    text    : '#ffffff',
    dim     : '#555577',
    accent  : '#a29bfe',
    gold    : '#f9ca24',
    red     : '#ff6b6b',
    shield  : '#4ecca3',
  };

  // ── State ──────────────────────────────────────────────────
  let canvas, ctx, animId;
  let audioCtx;
  let gameState;
  let score, bestScore, lives;
  let player;          // { x }
  let bullet;          // { x, y, active }  — single player bullet
  let aliens;          // array of { x, y, type, alive, frame }
  let alienBullets;    // array of { x, y, active }
  let shields;         // array of { x, y, blocks: [[bool]] }
  let alienDir;        // 1 or -1
  let alienStepTimer;  // countdown to next alien move
  let alienStepInterval;
  let alienShootTimer;
  let alienShootInterval;
  let marchBeat;       // 0-3 for animation
  let marchTimer;
  let keysDown;
  let lastTs;
  let boundKeyDown, boundKeyUp, boundClick, boundTouch;
  let explosions;      // visual flash list

  // ── Audio ──────────────────────────────────────────────────
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function playShoot() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(200, ac.currentTime + 0.1);
      g.gain.setValueAtTime(0.15, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.12);
      osc.start(); osc.stop(ac.currentTime + 0.12);
    } catch(e) {}
  }

  function playExplosion() {
    try {
      const ac = getAudio();
      const buf = ac.createBuffer(1, ac.sampleRate * 0.2, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
      const src = ac.createBufferSource(); const g = ac.createGain();
      src.buffer = buf;
      src.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.4, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
      src.start(); src.stop(ac.currentTime + 0.2);
    } catch(e) {}
  }

  function playMarch(beat) {
    try {
      const ac = getAudio();
      const freqs = [80, 100, 80, 60];
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'square'; osc.frequency.value = freqs[beat % 4];
      g.gain.setValueAtTime(0.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.06);
      osc.start(); osc.stop(ac.currentTime + 0.06);
    } catch(e) {}
  }

  function playDie() {
    try {
      const ac = getAudio();
      const osc = ac.createOscillator(); const g = ac.createGain();
      osc.connect(g); g.connect(ac.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(50, ac.currentTime + 0.6);
      g.gain.setValueAtTime(0.3, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.6);
      osc.start(); osc.stop(ac.currentTime + 0.6);
    } catch(e) {}
  }

  // ── Shield helpers ─────────────────────────────────────────
  function makeShield(cx, y) {
    // 5x4 grid of blocks, arch shape
    const pattern = [
      [0,1,1,1,0],
      [1,1,1,1,1],
      [1,1,1,1,1],
      [1,1,0,1,1],
    ];
    return { x: cx - SHIELD_W / 2, y, blocks: pattern.map(r => [...r]) };
  }

  function makeShields() {
    const arr = [];
    const gap = W / (SHIELD_COUNT + 1);
    for (let i = 0; i < SHIELD_COUNT; i++) {
      arr.push(makeShield(gap * (i + 1), H - 120));
    }
    return arr;
  }

  // ── Game setup ─────────────────────────────────────────────
  function loadBest() { bestScore = parseInt(localStorage.getItem('invaders_best') || '0', 10); }
  function saveBest()  { if (score > bestScore) { bestScore = score; localStorage.setItem('invaders_best', bestScore); } }

  function alienTypeForRow(r) {
    for (const t of ALIEN_TYPES) if (t.rows.includes(r)) return t;
    return ALIEN_TYPES[2];
  }

  function initGame() {
    player = { x: W / 2 - PLAYER_W / 2 };
    bullet = { x: 0, y: 0, active: false };
    alienBullets = [];
    explosions   = [];
    lives = 3;
    score = 0;

    // Build alien grid
    aliens = [];
    for (let r = 0; r < ALIEN_ROWS; r++) {
      const t = alienTypeForRow(r);
      for (let c = 0; c < ALIEN_COLS; c++) {
        aliens.push({
          col  : c, row : r,
          x    : ALIEN_OFF_X + c * (ALIEN_W + ALIEN_PAD_X),
          y    : ALIEN_OFF_Y + r * (ALIEN_H + ALIEN_PAD_Y),
          type : t,
          alive: true,
          frame: 0,
        });
      }
    }

    shields             = makeShields();
    alienDir            = 1;
    alienStepTimer      = 0;
    alienStepInterval   = 800;   // ms; decreases as aliens die
    alienShootTimer     = 0;
    alienShootInterval  = 1200;
    marchBeat           = 0;
    marchTimer          = 0;
    keysDown            = {};
    gameState           = 'playing';
    lastTs              = null;
  }

  function livingAliens() { return aliens.filter(a => a.alive); }

  function recalcSpeed() {
    const remaining = livingAliens().length;
    const total     = ALIEN_COLS * ALIEN_ROWS;
    // Faster as fewer aliens remain
    const frac = remaining / total;
    alienStepInterval  = Math.max(80, 800 * frac);
    alienShootInterval = Math.max(400, 1200 * frac);
  }

  // ── Update ─────────────────────────────────────────────────
  function update(dt) {
    // Player movement
    if (keysDown['ArrowLeft']  || keysDown['a'] || keysDown['A'])
      player.x = Math.max(0, player.x - PLAYER_SPD * dt / 1000);
    if (keysDown['ArrowRight'] || keysDown['d'] || keysDown['D'])
      player.x = Math.min(W - PLAYER_W, player.x + PLAYER_SPD * dt / 1000);

    // Player bullet
    if (bullet.active) {
      bullet.y -= BULLET_SPD * dt / 1000;
      if (bullet.y < 0) { bullet.active = false; }

      // Bullet vs aliens
      for (const a of aliens) {
        if (!a.alive) continue;
        if (bullet.active &&
            bullet.x >= a.x && bullet.x <= a.x + ALIEN_W &&
            bullet.y >= a.y && bullet.y <= a.y + ALIEN_H) {
          a.alive = false;
          bullet.active = false;
          score += a.type.pts;
          explosions.push({ x: a.x + ALIEN_W / 2, y: a.y + ALIEN_H / 2, t: 400 });
          playExplosion();
          recalcSpeed();
        }
      }

      // Bullet vs shields
      for (const sh of shields) {
        if (!bullet.active) break;
        hitShield(sh, bullet.x, bullet.y, 4, 8, () => { bullet.active = false; });
      }
    }

    // Alien bullets
    for (const ab of alienBullets) {
      if (!ab.active) continue;
      ab.y += ALIEN_BULLET_SPD * dt / 1000;
      if (ab.y > H) { ab.active = false; continue; }

      // Alien bullet vs player
      if (ab.x >= player.x && ab.x <= player.x + PLAYER_W &&
          ab.y >= PLAYER_Y  && ab.y <= PLAYER_Y + PLAYER_H) {
        ab.active = false;
        lives--;
        explosions.push({ x: player.x + PLAYER_W / 2, y: PLAYER_Y + PLAYER_H / 2, t: 600 });
        playDie();
        if (lives <= 0) { gameState = 'dead'; saveBest(); return; }
      }

      // Alien bullet vs shields
      for (const sh of shields) {
        if (!ab.active) break;
        hitShield(sh, ab.x, ab.y, 4, 8, () => { ab.active = false; });
      }
    }
    alienBullets = alienBullets.filter(b => b.active || b.y < H);

    // Alien march
    alienStepTimer += dt;
    if (alienStepTimer >= alienStepInterval) {
      alienStepTimer = 0;
      marchBeat = (marchBeat + 1) % 4;
      playMarch(marchBeat);
      stepAliens();
    }

    // Alien shooting
    alienShootTimer += dt;
    if (alienShootTimer >= alienShootInterval) {
      alienShootTimer = 0;
      alienShoot();
    }

    // Explosions
    explosions = explosions.filter(ex => { ex.t -= dt; return ex.t > 0; });

    // Aliens reach player row?
    for (const a of aliens) {
      if (a.alive && a.y + ALIEN_H >= PLAYER_Y) {
        gameState = 'dead'; saveBest(); playDie(); return;
      }
    }

    // Win?
    if (livingAliens().length === 0) {
      gameState = 'win'; saveBest();
    }
  }

  function stepAliens() {
    const live = livingAliens();
    if (!live.length) return;

    // Find bounds
    const minX = Math.min(...live.map(a => a.x));
    const maxX = Math.max(...live.map(a => a.x + ALIEN_W));

    let descend = false;
    if (alienDir === 1 && maxX + 8 >= W) { descend = true; alienDir = -1; }
    if (alienDir === -1 && minX - 8 <= 0) { descend = true; alienDir = 1; }

    for (const a of aliens) {
      if (!a.alive) continue;
      if (descend) { a.y += ALIEN_H + 4; }
      else          { a.x += alienDir * 10; }
      a.frame ^= 1;
    }
  }

  function alienShoot() {
    const live = livingAliens();
    if (!live.length) return;
    // Cap alien bullets for performance (max 5 on screen)
    const activeCount = alienBullets.filter(b => b.active).length;
    if (activeCount >= 5) return;
    // Pick bottom-most alien per column to shoot
    const cols = {};
    for (const a of live) {
      if (!cols[a.col] || a.row > cols[a.col].row) cols[a.col] = a;
    }
    const shooters = Object.values(cols);
    const shooter  = shooters[Math.floor(Math.random() * shooters.length)];
    alienBullets.push({
      x: shooter.x + ALIEN_W / 2,
      y: shooter.y + ALIEN_H,
      active: true,
    });
  }


  function hitShield(sh, bx, by, bw, bh, onHit) {
    const bSize = 9;   // each shield block size
    const cols  = sh.blocks[0].length;
    const rows  = sh.blocks.length;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!sh.blocks[r][c]) continue;
        const tx = sh.x + c * bSize;
        const ty = sh.y + r * bSize;
        if (bx + bw >= tx && bx <= tx + bSize && by + bh >= ty && by <= ty + bSize) {
          sh.blocks[r][c] = 0;
          onHit();
          return;
        }
      }
    }
  }

  // ── Drawing ────────────────────────────────────────────────
  function drawBg() {
    ctx.fillStyle = CLR.bg;
    ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    // Static pseudo-random stars (seeded by index)
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 137 + 11) % W);
      const sy = ((i * 97  + 53) % H);
      ctx.fillRect(sx, sy, 1, 1);
    }
  }

  function drawAlien(a) {
    ctx.save();
    ctx.shadowBlur  = 12;
    ctx.shadowColor = a.type.glow;
    ctx.fillStyle   = a.type.color;
    const x = a.x, y = a.y;
    const f = a.frame; // 0 or 1 for animation

    if (a.type.pts === 30) {
      // Saucer-like top row alien
      ctx.beginPath();
      ctx.ellipse(x + ALIEN_W/2, y + ALIEN_H/2, ALIEN_W/2 - 1, ALIEN_H/2 - 2, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = CLR.bg;
      ctx.beginPath();
      ctx.arc(x + ALIEN_W/2 - 6 + f*2, y + ALIEN_H/2 - 2, 4, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + ALIEN_W/2 + 6 - f*2, y + ALIEN_H/2 - 2, 4, 0, Math.PI*2);
      ctx.fill();
    } else if (a.type.pts === 20) {
      // Crab-like mid alien
      ctx.fillRect(x + 4,  y + 2,  ALIEN_W - 8, ALIEN_H - 8);
      ctx.fillRect(x + 2,  y + 8,  ALIEN_W - 4, 8);
      // legs animate
      ctx.fillRect(x,      y + 14 + f*4, 6, 6);
      ctx.fillRect(x + ALIEN_W - 6, y + 14 + f*4, 6, 6);
      ctx.fillRect(x + 10, y + 14 + (1-f)*4, 6, 6);
      ctx.fillRect(x + ALIEN_W - 16, y + 14 + (1-f)*4, 6, 6);
    } else {
      // Squid-like bottom alien
      ctx.fillRect(x + 8,  y + 2,  ALIEN_W - 16, 10);
      ctx.fillRect(x + 4,  y + 8,  ALIEN_W - 8,  10);
      ctx.fillRect(x,      y + 14, ALIEN_W,       6);
      // Tentacles
      ctx.fillRect(x + 2,  y + 18 + f*3, 5, 6);
      ctx.fillRect(x + 12, y + 18 + (1-f)*3, 5, 6);
      ctx.fillRect(x + 22, y + 18 + f*3, 5, 6);
      ctx.fillRect(x + ALIEN_W - 7, y + 18 + (1-f)*3, 5, 6);
    }
    ctx.restore();
  }

  function drawAliens() {
    for (const a of aliens) {
      if (!a.alive) continue;
      drawAlien(a);
    }
  }

  function drawPlayer() {
    ctx.save();
    ctx.shadowBlur  = 18;
    ctx.shadowColor = CLR.playerG;
    ctx.fillStyle   = CLR.player;
    const x = player.x, y = PLAYER_Y;
    // Ship body
    ctx.fillRect(x + 4, y + 8, PLAYER_W - 8, PLAYER_H - 8);
    // Nose
    ctx.beginPath();
    ctx.moveTo(x + PLAYER_W / 2, y);
    ctx.lineTo(x + PLAYER_W / 2 - 6, y + 10);
    ctx.lineTo(x + PLAYER_W / 2 + 6, y + 10);
    ctx.fill();
    // Wings
    ctx.fillRect(x, y + 12, 8, PLAYER_H - 12);
    ctx.fillRect(x + PLAYER_W - 8, y + 12, 8, PLAYER_H - 12);
    ctx.restore();
  }

  function drawBullets() {
    if (bullet.active) {
      ctx.save();
      ctx.shadowBlur  = 10;
      ctx.shadowColor = CLR.bullet;
      ctx.fillStyle   = CLR.bullet;
      ctx.fillRect(bullet.x - 2, bullet.y, 4, 12);
      ctx.restore();
    }
    for (const ab of alienBullets) {
      if (!ab.active) continue;
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = CLR.abul;
      ctx.fillStyle   = CLR.abul;
      ctx.fillRect(ab.x - 2, ab.y, 4, 10);
      ctx.restore();
    }
  }

  function drawShields() {
    const bSize = 9;
    for (const sh of shields) {
      ctx.save();
      ctx.shadowBlur  = 8;
      ctx.shadowColor = CLR.shield;
      ctx.fillStyle   = CLR.shield;
      for (let r = 0; r < sh.blocks.length; r++) {
        for (let c = 0; c < sh.blocks[r].length; c++) {
          if (!sh.blocks[r][c]) continue;
          ctx.fillRect(sh.x + c * bSize, sh.y + r * bSize, bSize - 1, bSize - 1);
        }
      }
      ctx.restore();
    }
  }

  function drawExplosions() {
    for (const ex of explosions) {
      const alpha = ex.t / 400;
      ctx.save();
      ctx.globalAlpha = Math.min(1, alpha * 2);
      ctx.shadowBlur  = 20;
      ctx.shadowColor = '#f9ca24';
      ctx.fillStyle   = '#f9ca24';
      const r = (1 - alpha) * 20 + 4;
      ctx.beginPath();
      ctx.arc(ex.x, ex.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawHUD() {
    ctx.fillStyle = '#111128';
    ctx.fillRect(0, 0, W, 56);

    const heartStr = '♥'.repeat(lives) + '♡'.repeat(Math.max(0, 3 - lives));
    ctx.fillStyle = CLR.red;
    ctx.font      = '18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(heartStr, 8, 30);

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCORE: ' + score, W / 2, 30);

    ctx.fillStyle = CLR.gold;
    ctx.font      = '13px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BEST: ' + bestScore, W - 8, 30);

    // Alien count
    ctx.fillStyle = CLR.dim;
    ctx.font      = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(livingAliens().length + ' ALIENS', W / 2, 50);
  }

  function drawOverlay(title, sub, tColor, tGlow) {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';

    ctx.save();
    ctx.shadowBlur  = 30;
    ctx.shadowColor = tGlow;
    ctx.fillStyle   = tColor;
    ctx.font        = 'bold 34px monospace';
    ctx.fillText(title, W / 2, H / 2 - 70);
    ctx.restore();

    if (sub) {
      ctx.fillStyle = CLR.dim;
      ctx.font      = '14px monospace';
      ctx.fillText(sub, W / 2, H / 2 - 35);
    }

    ctx.fillStyle = CLR.text;
    ctx.font      = 'bold 18px monospace';
    ctx.fillText('Score: ' + score, W / 2, H / 2 + 5);
    ctx.fillStyle = CLR.gold;
    ctx.font      = 'bold 15px monospace';
    ctx.fillText('Best:  ' + bestScore, W / 2, H / 2 + 33);

    ctx.fillStyle = CLR.accent;
    ctx.font      = 'bold 13px monospace';
    ctx.fillText('SPACE or TAP to ' + (sub && sub.includes('Arrow') ? 'START' : 'RESTART'), W / 2, H / 2 + 75);
  }

  // ── Main Loop ──────────────────────────────────────────────
  function loop(ts) {
    animId = requestAnimationFrame(loop);
    drawBg();

    if (gameState === 'start') {
      drawOverlay('SPACE INVADERS', 'Arrow Keys to move, SPACE to fire', CLR.player, CLR.player);
      return;
    }
    if (gameState === 'dead') {
      drawShields(); drawAliens(); drawPlayer(); drawBullets(); drawExplosions(); drawHUD();
      drawOverlay('GAME OVER', null, CLR.red, CLR.red);
      return;
    }
    if (gameState === 'win') {
      drawHUD();
      drawOverlay('YOU WIN!', 'Earth is safe... for now!', CLR.gold, CLR.gold);
      return;
    }

    // playing
    if (!lastTs) lastTs = ts;
    const dt = Math.min(ts - lastTs, 50);
    lastTs   = ts;
    update(dt);

    drawShields();
    drawAliens();
    drawPlayer();
    drawBullets();
    drawExplosions();
    drawHUD();
  }

  // ── Input ──────────────────────────────────────────────────
  function onKeyDown(e) {
    keysDown[e.key] = true;
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (gameState === 'start' || gameState === 'dead' || gameState === 'win') {
        initGame(); return;
      }
      // Shoot
      if (!bullet.active) {
        bullet = { x: player.x + PLAYER_W / 2, y: PLAYER_Y, active: true };
        playShoot();
      }
      return;
    }
    if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) e.preventDefault();
  }

  function onKeyUp(e)  { keysDown[e.key] = false; }

  let boundKeyUp;

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx    = canvas.getContext('2d');
    loadBest();
    gameState = 'start';
    score = 0; lives = 3;
    keysDown  = {};

    boundKeyDown = onKeyDown;
    boundKeyUp   = onKeyUp;
    boundClick   = () => {
      if (gameState === 'start' || gameState === 'dead' || gameState === 'win') initGame();
    };
    boundTouch   = (e) => {
      e.preventDefault();
      if (gameState === 'start' || gameState === 'dead' || gameState === 'win') { initGame(); return; }
      // Tap left/right side to move; tap center to shoot
      const rect = canvas.getBoundingClientRect();
      const tx = e.touches[0].clientX - rect.left;
      if (tx < W * 0.35) keysDown['ArrowLeft']  = true;
      else if (tx > W * 0.65) keysDown['ArrowRight'] = true;
      else {
        if (!bullet.active) { bullet = { x: player.x + PLAYER_W / 2, y: PLAYER_Y, active: true }; playShoot(); }
      }
    };

    window.addEventListener('keydown', boundKeyDown);
    window.addEventListener('keyup',   boundKeyUp);
    canvas.addEventListener('click',      boundClick);
    canvas.addEventListener('touchstart', boundTouch, { passive: false });
    canvas.addEventListener('touchend',   () => { keysDown['ArrowLeft'] = false; keysDown['ArrowRight'] = false; });

    animId = requestAnimationFrame(loop);
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    window.removeEventListener('keydown', boundKeyDown);
    window.removeEventListener('keyup',   boundKeyUp);
    if (canvas) {
      canvas.removeEventListener('click',      boundClick);
      canvas.removeEventListener('touchstart', boundTouch);
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
  }

  return { init, destroy };
})();

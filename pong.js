// =========================================================
//  PONG — pong.js   (single-player: you vs AI)
//  Retro neon style, runs inside #pong-canvas
// =========================================================
"use strict";

const PongGame = (() => {

  let canvas, ctx, W, H;
  let animId = null;

  // ── Sizes (set on init) ──────────────────────────────────
  const PADDLE_W  = 10;
  const PADDLE_H  = 70;
  const BALL_R    = 8;
  const WIN_SCORE = 7;

  // ── State ────────────────────────────────────────────────
  let playerY, aiY, ballX, ballY, ballVX, ballVY;
  let playerScore, aiScore;
  let gameState; // "start" | "playing" | "over"
  let winner;
  let frameCount;
  let lastPaddleHit; // cooldown to prevent stuck ball

  // ── AI settings ──────────────────────────────────────────
  const AI_SPEED = 3.2;

  // ── Audio (Web Audio API) ────────────────────────────────
  let audioCtx;
  function getAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function beep(freq, type = "square", dur = 0.08, vol = 0.15) {
    try {
      const ac   = getAudio();
      if (ac.state === "suspended") ac.resume();
      const osc  = ac.createOscillator();
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

  // ── Trail ────────────────────────────────────────────────
  let trail = [];

  // ── Particles ────────────────────────────────────────────
  let particles = [];

  function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        r: Math.random() * 3 + 1,
        color,
      });
    }
  }

  // ── Reset helpers ─────────────────────────────────────────
  function resetBall(dir = 1) {
    ballX  = W / 2;
    ballY  = H / 2;
    const angle = (Math.random() * 0.5 - 0.25); // slight angle
    ballVX = dir * (4 + Math.random()) * Math.cos(angle);
    ballVY = (4 + Math.random()) * Math.sin(angle) * (Math.random() < 0.5 ? 1 : -1);
    trail  = [];
  }

  function resetGame() {
    playerY     = H / 2 - PADDLE_H / 2;
    aiY         = H / 2 - PADDLE_H / 2;
    playerScore = 0;
    aiScore     = 0;
    frameCount  = 0;
    lastPaddleHit = -100;
    particles   = [];
    trail       = [];
    resetBall(1);
  }

  // ── Input ─────────────────────────────────────────────────
  let mouseY = null;
  let keyUp   = false;
  let keyDown = false;

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.clientY - rect.top) * scaleY - PADDLE_H / 2;
  }

  function onTouchMove(e) {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.touches[0].clientY - rect.top) * scaleY - PADDLE_H / 2;
  }

  function onKeyDown(e) {
    if (e.code === "ArrowUp"   || e.code === "KeyW") { keyUp   = true; e.preventDefault(); }
    if (e.code === "ArrowDown" || e.code === "KeyS") { keyDown = true; e.preventDefault(); }
    if ((e.code === "Space" || e.code === "Enter") && gameState !== "playing") {
      e.preventDefault();
      startGame();
    }
  }

  function onKeyUp(e) {
    if (e.code === "ArrowUp"   || e.code === "KeyW") keyUp   = false;
    if (e.code === "ArrowDown" || e.code === "KeyS") keyDown = false;
  }

  function onClick() {
    if (gameState !== "playing") startGame();
  }

  // ── Game flow ─────────────────────────────────────────────
  function startGame() {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    else if (!audioCtx) getAudio();
    resetGame();
    gameState = "playing";
  }

  // ── Update ────────────────────────────────────────────────
  function update() {
    if (gameState !== "playing") return;
    frameCount++;

    // Player paddle
    const PLAYER_SPEED = 7;
    if (mouseY !== null) {
      playerY = mouseY;
    } else {
      if (keyUp)   playerY -= PLAYER_SPEED;
      if (keyDown) playerY += PLAYER_SPEED;
    }
    playerY = Math.max(0, Math.min(H - PADDLE_H, playerY));

    // AI paddle (tracks ball with imperfect reaction)
    const aiCenter = aiY + PADDLE_H / 2;
    const diff     = ballY - aiCenter;
    const aiMove   = Math.sign(diff) * Math.min(Math.abs(diff), AI_SPEED);
    aiY += aiMove;
    aiY = Math.max(0, Math.min(H - PADDLE_H, aiY));

    // Trail
    trail.push({ x: ballX, y: ballY });
    if (trail.length > 14) trail.shift();

    // Ball movement
    ballX += ballVX;
    ballY += ballVY;

    // Top / bottom wall bounce
    if (ballY - BALL_R < 0) {
      ballY  = BALL_R;
      ballVY = Math.abs(ballVY);
      beep(400, "square", 0.05);
    }
    if (ballY + BALL_R > H) {
      ballY  = H - BALL_R;
      ballVY = -Math.abs(ballVY);
      beep(400, "square", 0.05);
    }

    // Player paddle hit (left side)
    const pRight = PADDLE_W + 14;
    if (
      frameCount > lastPaddleHit + 5 &&
      ballX - BALL_R < pRight &&
      ballX + BALL_R > 14 &&
      ballY + BALL_R > playerY &&
      ballY - BALL_R < playerY + PADDLE_H
    ) {
      ballX = pRight + BALL_R;
      // Angle based on where ball hits paddle
      const rel   = (ballY - (playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * 0.9; // max ±~52°
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.07;
      ballVX =  Math.abs(speed * Math.cos(angle));
      ballVY =  speed * Math.sin(angle);
      // Cap speed
      const maxSpeed = 12;
      const s = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      if (s > maxSpeed) { ballVX *= maxSpeed/s; ballVY *= maxSpeed/s; }
      lastPaddleHit = frameCount;
      beep(600, "square", 0.07, 0.2);
      spawnHitParticles(ballX, ballY, "#4ecca3");
    }

    // AI paddle hit (right side)
    const aiLeft = W - PADDLE_W - 14;
    if (
      frameCount > lastPaddleHit + 5 &&
      ballX + BALL_R > aiLeft &&
      ballX - BALL_R < aiLeft + PADDLE_W &&
      ballY + BALL_R > aiY &&
      ballY - BALL_R < aiY + PADDLE_H
    ) {
      ballX = aiLeft - BALL_R;
      const rel   = (ballY - (aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const angle = rel * 0.9;
      const speed = Math.sqrt(ballVX * ballVX + ballVY * ballVY) * 1.03;
      ballVX = -Math.abs(speed * Math.cos(angle));
      ballVY =  speed * Math.sin(angle);
      const maxSpeed = 12;
      const s = Math.sqrt(ballVX * ballVX + ballVY * ballVY);
      if (s > maxSpeed) { ballVX *= maxSpeed/s; ballVY *= maxSpeed/s; }
      lastPaddleHit = frameCount;
      beep(350, "square", 0.07, 0.15);
      spawnHitParticles(ballX, ballY, "#ff6b6b");
    }

    // Scoring
    if (ballX - BALL_R < 0) {
      aiScore++;
      beep(180, "sawtooth", 0.3, 0.25);
      if (aiScore >= WIN_SCORE) { gameState = "over"; winner = "ai"; return; }
      resetBall(1);
    }
    if (ballX + BALL_R > W) {
      playerScore++;
      beep(880, "sine", 0.2, 0.2);
      if (playerScore >= WIN_SCORE) { gameState = "over"; winner = "player"; return; }
      resetBall(-1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= 0.05; p.r *= 0.94;
      if (p.alpha <= 0) particles.splice(i, 1);
    }
  }

  // ── Draw ──────────────────────────────────────────────────
  function draw() {
    // Background
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, W, H);

    // Center line
    ctx.setLineDash([8, 10]);
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Score display
    ctx.font = "bold 48px 'Press Start 2P', monospace";
    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(78,204,163,0.25)";
    ctx.fillText(playerScore, W / 4, 70);
    ctx.fillStyle = "rgba(255,107,107,0.25)";
    ctx.fillText(aiScore, (W * 3) / 4, 70);

    ctx.fillStyle = "rgba(78,204,163,0.9)";
    ctx.fillText(playerScore, W / 4, 68);
    ctx.fillStyle = "rgba(255,107,107,0.9)";
    ctx.fillText(aiScore, (W * 3) / 4, 68);

    // Labels
    ctx.font = "10px 'Press Start 2P', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText("YOU", W / 4, 88);
    ctx.fillText("CPU", (W * 3) / 4, 88);

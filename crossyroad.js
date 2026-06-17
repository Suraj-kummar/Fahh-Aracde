
"use strict";
const CrossyRoadGame = (() => {
  let canvas, ctx, animId, gameState;
  let player, lanes, score, highScore;
  const W = 480, H = 520;
  const LANE_H = 50, PLAYER_SIZE = 28;
  const NUM_LANES = Math.floor(H / LANE_H);

  const LANE_TYPES = ['grass', 'road', 'road', 'water', 'water', 'road', 'grass', 'road', 'water', 'road'];

  function makeLane(y, typeHint) {
    const type = typeHint || LANE_TYPES[Math.floor(Math.random() * LANE_TYPES.length)];
    const dir = Math.random() < 0.5 ? 1 : -1;
    const speed = (Math.random() * 1.5 + 0.8) * (1 + score * 0.02);
    const objW = type === 'water' ? 80 + Math.random()*40 : 50 + Math.random()*30;
    const gap = 100 + Math.random() * 120;
    const objs = [];
    let x = Math.random() * W;
    while (x < W + 300) {
      objs.push({ x: dir > 0 ? -x : W + x, w: objW });
      x += objW + gap;
    }
    return { y, type, dir, speed, objs, objW };
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    ctx = canvas.getContext('2d');
    canvas.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    highScore = parseInt(localStorage.getItem('crossy_best') || '0');
    startGame();
    if (animId) cancelAnimationFrame(animId);
    loop();
  }

  function startGame() {
    score = 0;
    player = { x: W / 2, y: H - LANE_H / 2, moving: false, targetY: H - LANE_H / 2, dir: 0 };
    lanes = [];
    // Safe start lane
    lanes.push({ y: H - LANE_H / 2, type: 'grass', dir: 1, speed: 0, objs: [] });
    for (let i = 1; i < NUM_LANES + 5; i++) {
      const type = i < 2 ? 'grass' : LANE_TYPES[i % LANE_TYPES.length];
      lanes.push(makeLane(H - LANE_H * (i + 0.5), type));
    }
    gameState = 'playing';
  }

  function handleKey(e) {
    if (gameState === 'over') { startGame(); return; }
    if (gameState !== 'playing') return;
    if (player.moving) return;
    const moves = {
      ArrowUp: { dy: -LANE_H }, ArrowDown: { dy: LANE_H },
      ArrowLeft: { dx: -LANE_H * 0.8 }, ArrowRight: { dx: LANE_H * 0.8 },
      w: { dy: -LANE_H }, s: { dy: LANE_H },
      a: { dx: -LANE_H * 0.8 }, d: { dx: LANE_H * 0.8 }
    };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    if (m.dy) {
      player.targetY = player.y + m.dy;
      player.moving = true;
      player.dir = m.dy < 0 ? -1 : 1;
      if (m.dy < 0) score++;
    } else if (m.dx) {
      player.x = Math.max(PLAYER_SIZE/2, Math.min(W - PLAYER_SIZE/2, player.x + m.dx));
    }
  }

  let tapStart = null;
  function handleClick(e) {
    if (gameState === 'over') { startGame(); return; }
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (W / rect.width);
    const cy = (e.clientY - rect.top) * (H / rect.height);
    const dx = cx - player.x, dy = cy - player.y;
    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) { player.targetY = player.y - LANE_H; player.moving = true; player.dir = -1; score++; }
      else { player.targetY = player.y + LANE_H; player.moving = true; player.dir = 1; }
    } else {
      player.x = Math.max(PLAYER_SIZE/2, Math.min(W - PLAYER_SIZE/2, player.x + (dx > 0 ? LANE_H*0.8 : -LANE_H*0.8)));
    }
  }

  function getLaneAt(y) {
    return lanes.find(l => Math.abs(l.y - y) < LANE_H * 0.5);
  }

  function update(dt) {
    // Move player smoothly
    if (player.moving) {
      const step = LANE_H * dt * 12;
      if (Math.abs(player.y - player.targetY) < step) {
        player.y = player.targetY;
        player.moving = false;
        // Check if scrolled forward, add new lanes
        if (player.y < H * 0.4) {
          const offset = H * 0.4 - player.y;
          player.y += offset;
          player.targetY += offset;
          lanes.forEach(l => l.y += offset);
          lanes = lanes.filter(l => l.y < H + LANE_H);
          const topY = Math.min(...lanes.map(l => l.y));
          while (lanes.length < NUM_LANES + 5) {
            const newY = topY - LANE_H;
            const type = LANE_TYPES[Math.floor(Math.random() * LANE_TYPES.length)];
            lanes.unshift(makeLane(newY, type));
          }
        }
      } else {
        player.y += (player.targetY - player.y > 0 ? step : -step);
      }
    }

    // Move lane objects
    lanes.forEach(l => {
      if (l.type === 'grass') return;
      l.objs.forEach(o => {
        o.x += l.dir * l.speed;
        if (l.dir > 0 && o.x > W + l.objW) o.x = -l.objW - 20;
        if (l.dir < 0 && o.x < -l.objW - 20) o.x = W + l.objW;
      });
    });

    // Drift player on logs
    const lane = getLaneAt(player.y);
    if (lane && lane.type === 'water') {
      const onLog = lane.objs.some(o => player.x > o.x - 5 && player.x < o.x + o.w + 5);
      if (onLog) {
        player.x += lane.dir * lane.speed;
      } else {
        gameState = 'over';
        saveScore();
      }
    }

    // Check road collisions
    if (lane && lane.type === 'road') {
      lane.objs.forEach(o => {
        if (player.x > o.x - 5 && player.x < o.x + o.w + 5 && Math.abs(player.y - lane.y) < 20) {
          gameState = 'over';
          saveScore();
        }
      });
    }

    // Fell off screen
    if (player.x < 0 || player.x > W || player.y > H + 40) {
      gameState = 'over'; saveScore();
    }
  }

  function saveScore() {
    if (score > highScore) { highScore = score; localStorage.setItem('crossy_best', score); }
  }

  function drawEmoji(emoji, x, y, size) {
    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, x, y);
  }

  function draw() {
    ctx.fillStyle = '#1a3a1a';
    ctx.fillRect(0, 0, W, H);

    lanes.forEach(l => {
      const laneTop = l.y - LANE_H / 2;
      // Lane bg
      if (l.type === 'grass') {
        ctx.fillStyle = '#2d6a2d';
        ctx.fillRect(0, laneTop, W, LANE_H);
        // Grass texture
        ctx.fillStyle = '#357a35';
        for (let i = 0; i < W; i += 30) {
          ctx.fillRect(i, laneTop + LANE_H - 8, 20, 8);
        }
      } else if (l.type === 'road') {
        ctx.fillStyle = '#333';
        ctx.fillRect(0, laneTop, W, LANE_H);
        // Road markings
        ctx.fillStyle = '#666';
        ctx.fillRect(0, l.y - 2, W, 4);
        // Dashes
        ctx.strokeStyle = '#ffff00';
        ctx.setLineDash([20, 15]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, l.y);
        ctx.lineTo(W, l.y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Cars
        l.objs.forEach(o => {
          ctx.fillStyle = ['#ff4444','#4444ff','#ffaa00','#44ff44','#ff44ff'][Math.abs(Math.floor(o.x/50)) % 5];
          ctx.fillRect(o.x, laneTop + 8, o.w, LANE_H - 16);
          // Windows
          ctx.fillStyle = '#aaddff';
          ctx.fillRect(o.x + 5, laneTop + 12, o.w * 0.3, LANE_H * 0.4);
          ctx.fillRect(o.x + o.w * 0.5, laneTop + 12, o.w * 0.3, LANE_H * 0.4);
          // Lights
          ctx.fillStyle = l.dir > 0 ? '#ff8800' : '#ffffff';
          ctx.fillRect(o.x + (l.dir > 0 ? o.w - 4 : 0), laneTop + 15, 4, 8);
        });
      } else if (l.type === 'water') {
        ctx.fillStyle = '#1a5fb4';
        ctx.fillRect(0, laneTop, W, LANE_H);
        // Water ripples
        ctx.strokeStyle = '#4a8fe0';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < W; i += 25) {
          ctx.beginPath();
          ctx.arc(i + (Date.now()*0.02 % 25), l.y, 8, Math.PI, 0);
          ctx.stroke();
        }
        // Logs
        l.objs.forEach(o => {
          ctx.fillStyle = '#8b5e3c';
          ctx.fillRect(o.x, laneTop + 10, o.w, LANE_H - 20);
          // Log lines
          ctx.strokeStyle = '#6b3e1c';
          ctx.lineWidth = 1;
          for (let i = o.x + 15; i < o.x + o.w; i += 15) {
            ctx.beginPath();
            ctx.moveTo(i, laneTop + 10);
            ctx.lineTo(i, laneTop + LANE_H - 10);
            ctx.stroke();
          }
        });
      }
    });

    // Player (frog)
    if (gameState !== 'over') {
      drawEmoji('🐸', player.x, player.y, 24);
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Outfit';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${score}`, 10, 16);
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${highScore}`, W - 10, 16);

    if (gameState === 'over') {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      drawEmoji('💀', W/2, H/2 - 60, 48);
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 32px Outfit';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SQUASHED!', W/2, H/2 - 10);
      ctx.fillStyle = '#fff';
      ctx.font = '18px Outfit';
      ctx.fillText(`Score: ${score}`, W/2, H/2 + 25);
      ctx.fillStyle = '#ffcc00';
      ctx.fillText(`Best: ${highScore}`, W/2, H/2 + 52);
      ctx.fillStyle = '#aaa';
      ctx.font = '14px Outfit';
      ctx.fillText('Click or press any key to restart', W/2, H/2 + 85);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  let lastTs = 0;
  function loop(ts = 0) {
    animId = requestAnimationFrame(loop);
    const dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    if (gameState === 'playing') update(dt);
    draw();
  }

  function destroy() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    if (canvas) {
      canvas.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    }
    saveScore();
  }

  return { init, destroy };
})();

// arcade-hub: score registered

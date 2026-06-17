/**
 * ConnectFourGame - IIFE-style module
 * Usage: ConnectFourGame.init('canvasId')  /  ConnectFourGame.destroy()
 */
const ConnectFourGame = (() => {
  // ─── Constants ────────────────────────────────────────────────────────────
  const COLS = 7;
  const ROWS = 6;
  const CANVAS_W = 480;
  const CANVAS_H = 480;
  const BOARD_TOP = 60;          // header height
  const CELL = Math.floor((CANVAS_H - BOARD_TOP) / ROWS); // ≈70
  const RADIUS = CELL * 0.38;
  const AI_DEPTH = 4;
  const STORAGE_KEY = 'connectfour_wins';

  const COLOR = {
    bg: '#0a0e1a',
    header: '#0d1226',
    board: '#1a3a8f',
    boardShadow: '#0e2160',
    hole: '#07111f',
    p1: '#e63946',
    p1glow: '#ff6b6b',
    p2: '#ffd166',
    p2glow: '#ffe599',
    text: '#e0e8ff',
    subtext: '#7a8db5',
    win1: '#ff4757',
    win2: '#ffd32a',
    preview: 'rgba(255,255,255,0.18)',
    border: '#2a4dbf',
  };

  // ─── State ────────────────────────────────────────────────────────────────
  let canvas, ctx;
  let rafId = null;
  let clickHandler, moveHandler, leaveHandler;

  let board;          // [ROW][COL]  0=empty, 1=P1, 2=P2
  let currentPlayer;  // 1 or 2
  let gameOver;
  let winner;         // 0=draw, 1 or 2
  let winCells;       // [[r,c], …] of winning 4
  let hoverCol;
  let scores;         // { p1, p2 }
  let aiThinking;

  // Drop animation queue  [{row,col,player,fromY,toY,y,done}]
  let animations;
  let glowPhase;      // for winner glow pulse

  // ─── Init / Destroy ───────────────────────────────────────────────────────
  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) { console.error('ConnectFourGame: canvas not found:', canvasId); return; }
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    ctx = canvas.getContext('2d');

    scores = loadScores();
    resetGame();

    clickHandler = onCanvasClick;
    moveHandler  = onCanvasMove;
    leaveHandler = onCanvasLeave;
    canvas.addEventListener('click', clickHandler);
    canvas.addEventListener('mousemove', moveHandler);
    canvas.addEventListener('mouseleave', leaveHandler);

    loop();
  }

  function destroy() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    if (canvas) {
      canvas.removeEventListener('click', clickHandler);
      canvas.removeEventListener('mousemove', moveHandler);
      canvas.removeEventListener('mouseleave', leaveHandler);
    }
    canvas = ctx = null;
  }

  // ─── Game Logic ───────────────────────────────────────────────────────────
  function resetGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    currentPlayer = 1;
    gameOver = false;
    winner = null;
    winCells = [];
    hoverCol = -1;
    animations = [];
    glowPhase = 0;
    aiThinking = false;
  }

  function getNextRow(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) return r;
    }
    return -1;
  }

  function dropDisc(col, player) {
    const row = getNextRow(col);
    if (row === -1) return false;
    board[row][col] = player;

    // Queue drop animation
    const toY = BOARD_TOP + row * CELL + CELL / 2;
    animations.push({ row, col, player, fromY: BOARD_TOP - RADIUS - 5, toY, y: BOARD_TOP - RADIUS - 5, done: false });

    const result = checkWin(board, player);
    if (result) {
      winner = player;
      winCells = result;
      gameOver = true;
      scores[player === 1 ? 'p1' : 'p2']++;
      saveScores();
    } else if (isDraw(board)) {
      winner = 0;
      gameOver = true;
    }
    return true;
  }

  function checkWin(b, p) {
    // Returns winning cells array or null
    const dirs = [[0,1],[1,0],[1,1],[1,-1]];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (b[r][c] !== p) continue;
        for (const [dr, dc] of dirs) {
          const cells = [[r, c]];
          for (let k = 1; k < 4; k++) {
            const nr = r + dr*k, nc = c + dc*k;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || b[nr][nc] !== p) break;
            cells.push([nr, nc]);
          }
          if (cells.length === 4) return cells;
        }
      }
    }
    return null;
  }

  function isDraw(b) {
    return b[0].every(cell => cell !== 0);
  }

  // ─── AI – Minimax ─────────────────────────────────────────────────────────
  function scoreWindow(window, player) {
    const opp = player === 2 ? 1 : 2;
    const pCount = window.filter(x => x === player).length;
    const eCount = window.filter(x => x === 0).length;
    const oCount = window.filter(x => x === opp).length;
    if (pCount === 4) return 100;
    if (pCount === 3 && eCount === 1) return 5;
    if (pCount === 2 && eCount === 2) return 2;
    if (oCount === 3 && eCount === 1) return -4;
    return 0;
  }

  function scoreBoard(b, player) {
    let score = 0;
    // Center column preference
    const center = b.map(r => r[Math.floor(COLS/2)]);
    score += center.filter(x => x === player).length * 3;

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow([b[r][c], b[r][c+1], b[r][c+2], b[r][c+3]], player);
      }
    }
    // Vertical
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r <= ROWS - 4; r++) {
        score += scoreWindow([b[r][c], b[r+1][c], b[r+2][c], b[r+3][c]], player);
      }
    }
    // Diagonal /
    for (let r = 3; r < ROWS; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow([b[r][c], b[r-1][c+1], b[r-2][c+2], b[r-3][c+3]], player);
      }
    }
    // Diagonal \
    for (let r = 0; r <= ROWS - 4; r++) {
      for (let c = 0; c <= COLS - 4; c++) {
        score += scoreWindow([b[r][c], b[r+1][c+1], b[r+2][c+2], b[r+3][c+3]], player);
      }
    }
    return score;
  }

  function minimax(b, depth, alpha, beta, maximizing) {
    const validCols = [];
    for (let c = 0; c < COLS; c++) { if (getNextRowB(b, c) !== -1) validCols.push(c); }

    const p1wins = !!checkWin(b, 1);
    const p2wins = !!checkWin(b, 2);

    if (p2wins) return { score: 10000 + depth };
    if (p1wins) return { score: -(10000 + depth) };
    if (validCols.length === 0 || depth === 0) return { score: scoreBoard(b, 2) };

    if (maximizing) {
      let best = { score: -Infinity };
      for (const c of validCols) {
        const nb = cloneBoard(b);
        const r  = getNextRowB(nb, c);
        nb[r][c] = 2;
        const val = minimax(nb, depth - 1, alpha, beta, false).score;
        if (val > best.score) best = { score: val, col: c };
        alpha = Math.max(alpha, val);
        if (alpha >= beta) break;
      }
      return best;
    } else {
      let best = { score: Infinity };
      for (const c of validCols) {
        const nb = cloneBoard(b);
        const r  = getNextRowB(nb, c);
        nb[r][c] = 1;
        const val = minimax(nb, depth - 1, alpha, beta, true).score;
        if (val < best.score) best = { score: val, col: c };
        beta = Math.min(beta, val);
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function getNextRowB(b, col) {
    for (let r = ROWS - 1; r >= 0; r--) { if (b[r][col] === 0) return r; }
    return -1;
  }

  function cloneBoard(b) {
    return b.map(r => [...r]);
  }

  function doAIMove() {
    aiThinking = true;
    // Use setTimeout so the canvas updates "thinking" state first
    setTimeout(() => {
      if (!canvas || gameOver) { aiThinking = false; return; }
      const result = minimax(cloneBoard(board), AI_DEPTH, -Infinity, Infinity, true);
      const col = (result.col !== undefined) ? result.col : Math.floor(COLS / 2);
      dropDisc(col, 2);
      if (!gameOver) currentPlayer = 1;
      aiThinking = false;
    }, 80);
  }

  // ─── Scores / Storage ─────────────────────────────────────────────────────
  function loadScores() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return { p1: 0, p2: 0 };
  }

  function saveScores() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(scores)); } catch (_) {}
  }

  // ─── Input Handlers ───────────────────────────────────────────────────────
  function colFromX(x) {
    if (x < 0 || x >= CANVAS_W) return -1;
    return Math.floor(x / (CANVAS_W / COLS));
  }

  function onCanvasClick(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (gameOver) {
      // Restart
      resetGame();
      return;
    }

    if (currentPlayer !== 1 || aiThinking || animations.some(a => !a.done)) return;

    const col = colFromX(x * (CANVAS_W / rect.width));
    if (col < 0 || col >= COLS) return;
    if (getNextRow(col) === -1) return;

    const placed = dropDisc(col, 1);
    if (placed && !gameOver) {
      currentPlayer = 2;
      doAIMove();
    }
  }


  // ─── Render ───────────────────────────────────────────────────────────────
  function loop() {
    if (!canvas) return;
    update();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function update() {
    glowPhase += 0.07;
    // Advance drop animations
    for (const anim of animations) {
      if (anim.done) continue;
      const speed = 18 + (anim.toY - anim.y) * 0.18;
      anim.y = Math.min(anim.y + speed, anim.toY);
      if (anim.y >= anim.toY) anim.done = true;
    }
    // Remove finished animations older than current frame (keep for rendering)
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    drawBackground();
    drawHeader();
    drawBoardBase();
    drawDiscs();
    drawBoardForeground();   // board holes overlay
    drawHoverPreview();
    drawWinHighlight();
    if (gameOver) drawGameOverOverlay();
  }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#080c18');
    grad.addColorStop(1, '#0d1828');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawHeader() {
    // Header bg
    ctx.fillStyle = COLOR.header;
    ctx.fillRect(0, 0, CANVAS_W, BOARD_TOP);

    // Score: P1
    ctx.font = 'bold 13px "Segoe UI", sans-serif';
    ctx.textBaseline = 'middle';

    drawScorePill(12, 12, `🔴 You`, scores.p1, COLOR.p1, COLOR.p1glow);
    drawScorePill(CANVAS_W - 12, 12, `AI 🟡`, scores.p2, COLOR.p2, COLOR.p2glow, true);

    // Turn indicator
    if (!gameOver) {
      const label = (currentPlayer === 1) ? "Your Turn" : aiThinking ? "AI Thinking…" : "AI's Turn";
      const col   = (currentPlayer === 1) ? COLOR.p1 : COLOR.p2;
      ctx.fillStyle = col;
      ctx.font = 'bold 15px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, CANVAS_W / 2, BOARD_TOP / 2);
    }
  }

  function drawScorePill(x, y, label, score, color, glowColor, rightAlign = false) {
    const w = 110, h = 36;
    const rx = rightAlign ? x - w : x;
    const ry = y;

    // Pill bg
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.fillStyle = `${color}22`;
    roundRect(rx, ry, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = `${color}88`;
    ctx.lineWidth = 1.5;
    roundRect(rx, ry, w, h, 8);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = COLOR.text;
    ctx.font = 'bold 12px "Segoe UI", sans-serif';
    ctx.textAlign = rightAlign ? 'right' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, rightAlign ? rx + w - 10 : rx + 10, ry + 12);

    ctx.fillStyle = color;
    ctx.font = 'bold 16px "Segoe UI", sans-serif';
    ctx.fillText(score, rightAlign ? rx + w - 10 : rx + 10, ry + 26);
  }

  function drawBoardBase() {
    // Board shadow
    ctx.save();
    ctx.shadowColor = COLOR.boardShadow;
    ctx.shadowBlur = 20;
    ctx.fillStyle = COLOR.board;
    ctx.fillRect(0, BOARD_TOP, CANVAS_W, CANVAS_H - BOARD_TOP);
    ctx.restore();

    // Subtle gradient overlay
    const grad = ctx.createLinearGradient(0, BOARD_TOP, 0, CANVAS_H);
    grad.addColorStop(0, 'rgba(255,255,255,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.15)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, BOARD_TOP, CANVAS_W, CANVAS_H - BOARD_TOP);
  }

  function drawDiscs() {
    // Draw placed discs (below board overlay)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = board[r][c];
        if (v === 0) continue;
        // Check if this cell has an active animation (skip static draw, anim handles it)
        const anim = animations.find(a => a.row === r && a.col === c && !a.done);
        if (anim) continue;
        const cx = cellCX(c);
        const cy = cellCY(r);
        drawDisc(cx, cy, v, false);
      }
    }

    // Draw in-flight animation discs
    for (const anim of animations) {
      if (anim.done && board[anim.row][anim.col] !== 0) {
        const cx = cellCX(anim.col);
        const cy = cellCY(anim.row);
        drawDisc(cx, cy, anim.player, false);
        continue;
      }
      if (!anim.done) {
        const cx = cellCX(anim.col);
        const cy = anim.y;
        drawDisc(cx, cy, anim.player, false);
      }
    }
  }

  function drawBoardForeground() {
    // Draw the board with holes cut out so discs appear inside the board
    ctx.save();
    ctx.fillStyle = COLOR.board;

    // We'll draw the board rectangles and use destination-out to punch holes,
    // but simpler: draw hole-shaped dark circles on top of discs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = cellCX(c);
        const cy = cellCY(r);
        const anim = animations.find(a => a.row === r && a.col === c && !a.done);

        if (board[r][c] === 0 && !anim) {
          // Empty hole: draw dark circle
          const grad = ctx.createRadialGradient(cx - RADIUS*0.2, cy - RADIUS*0.2, RADIUS*0.1, cx, cy, RADIUS);
          grad.addColorStop(0, '#0d1a2e');
          grad.addColorStop(1, COLOR.hole);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Occupied or animated: draw transparent hole border only
          ctx.strokeStyle = 'rgba(0,0,0,0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Inner rim highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx - RADIUS*0.15, cy - RADIUS*0.15, RADIUS * 0.88, Math.PI*1.1, Math.PI*1.9);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Board grid lines (subtle)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * (CANVAS_W / COLS), BOARD_TOP);
      ctx.lineTo(c * (CANVAS_W / COLS), CANVAS_H);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, BOARD_TOP + r * CELL);
      ctx.lineTo(CANVAS_W, BOARD_TOP + r * CELL);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHoverPreview() {
    if (gameOver || currentPlayer !== 1 || aiThinking || hoverCol < 0) return;
    if (getNextRow(hoverCol) === -1) return;
    const cx = cellCX(hoverCol);
    const cy = BOARD_TOP - RADIUS - 6;

    ctx.save();
    ctx.globalAlpha = 0.5 + 0.15 * Math.sin(glowPhase * 2);
    ctx.shadowColor = COLOR.p1;
    ctx.shadowBlur = 16;
    ctx.fillStyle = COLOR.p1;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Drop arrow
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = COLOR.p1;
    ctx.beginPath();
    ctx.moveTo(cx, BOARD_TOP - 4);
    ctx.lineTo(cx - 6, BOARD_TOP - 14);
    ctx.lineTo(cx + 6, BOARD_TOP - 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawWinHighlight() {
    if (winCells.length === 0) return;
    const pulse = 0.55 + 0.45 * Math.sin(glowPhase * 3);
    const color = winner === 1 ? COLOR.win1 : COLOR.win2;

    for (const [r, c] of winCells) {
      const cx = cellCX(c);
      const cy = cellCY(r);
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 30 * pulse;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3.5;
      ctx.globalAlpha = 0.85 + 0.15 * pulse;
      ctx.beginPath();
      ctx.arc(cx, cy, RADIUS + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGameOverOverlay() {
    // Semi-transparent overlay
    ctx.save();
    ctx.fillStyle = 'rgba(5,10,25,0.72)';
    ctx.fillRect(0, BOARD_TOP, CANVAS_W, CANVAS_H - BOARD_TOP);

    // Card
    const cw = 300, ch = 150;
    const cx = CANVAS_W / 2, cy = (BOARD_TOP + CANVAS_H) / 2;
    ctx.shadowColor = winner === 1 ? COLOR.p1 : winner === 2 ? COLOR.p2 : '#888';
    ctx.shadowBlur = 30;
    const grad = ctx.createLinearGradient(cx - cw/2, cy - ch/2, cx + cw/2, cy + ch/2);
    grad.addColorStop(0, '#141e3a');
    grad.addColorStop(1, '#0d1226');
    ctx.fillStyle = grad;
    roundRect(cx - cw/2, cy - ch/2, cw, ch, 16);
    ctx.fill();
    ctx.strokeStyle = winner === 1 ? `${COLOR.p1}88` : winner === 2 ? `${COLOR.p2}88` : '#44444488';
    ctx.lineWidth = 2;
    roundRect(cx - cw/2, cy - ch/2, cw, ch, 16);
    ctx.stroke();
    ctx.restore();

    // Title
    let title, sub;
    if (winner === 1)      { title = '🎉 You Win!';   sub = 'Click anywhere to play again'; }
    else if (winner === 2) { title = '🤖 AI Wins!';   sub = 'Click anywhere to play again'; }
    else                   { title = "It's a Draw!";  sub = 'Click anywhere to play again'; }

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const titleColor = winner === 1 ? COLOR.p1glow : winner === 2 ? COLOR.p2glow : '#aaa';
    ctx.shadowColor = titleColor;
    ctx.shadowBlur = 18 * (0.6 + 0.4 * Math.sin(glowPhase * 2));
    ctx.fillStyle = titleColor;
    ctx.font = 'bold 30px "Segoe UI", sans-serif';
    ctx.fillText(title, cx, cy - 22);
    ctx.restore();

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = COLOR.subtext;
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillText(sub, cx, cy + 20);
    ctx.restore();

    // Restart button
    const bw = 160, bh = 38;
    const bx = cx - bw/2, by = cy + 45;
    const hover = isMouseOverRect(bx, by, bw, bh);
    ctx.save();
    const btnColor = winner === 1 ? COLOR.p1 : winner === 2 ? COLOR.p2 : '#5566aa';
    ctx.shadowColor = btnColor;
    ctx.shadowBlur = hover ? 22 : 10;
    ctx.fillStyle = hover ? btnColor : `${btnColor}99`;
    roundRect(bx, by, bw, bh, 10);
    ctx.fill();
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText('Play Again', cx, by + bh / 2);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function cellCX(col) { return col * (CANVAS_W / COLS) + (CANVAS_W / COLS) / 2; }
  function cellCY(row) { return BOARD_TOP + row * CELL + CELL / 2; }

  let _mouseX = -1, _mouseY = -1;
  function isMouseOverRect(x, y, w, h) {
    return _mouseX >= x && _mouseX <= x + w && _mouseY >= y && _mouseY <= y + h;
  }

  // Wrap move handler to track mouse position
  const _origMoveHandler = onCanvasMove;

  function drawDisc(cx, cy, player, glow) {
    const color   = player === 1 ? COLOR.p1 : COLOR.p2;
    const glowCol = player === 1 ? COLOR.p1glow : COLOR.p2glow;

    ctx.save();
    if (glow) {
      ctx.shadowColor = glowCol;
      ctx.shadowBlur = 20;
    }

    // Base disc
    const grad = ctx.createRadialGradient(cx - RADIUS*0.3, cy - RADIUS*0.3, RADIUS*0.05, cx, cy, RADIUS);
    grad.addColorStop(0, lighten(color, 35));
    grad.addColorStop(0.6, color);
    grad.addColorStop(1, darken(color, 30));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(cx - RADIUS*0.22, cy - RADIUS*0.28, RADIUS*0.38, RADIUS*0.22, -Math.PI/4, 0, Math.PI*2);
    ctx.fill();

    // Edge shadow
    ctx.strokeStyle = darken(color, 40);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, RADIUS - 0.75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function lighten(hex, pct) {
    return adjustColor(hex, pct);
  }
  function darken(hex, pct) {
    return adjustColor(hex, -pct);
  }
  function adjustColor(hex, pct) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c+c).join('');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0,2),16) + Math.round(255*pct/100)));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2,4),16) + Math.round(255*pct/100)));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4,6),16) + Math.round(255*pct/100)));
    return `rgb(${r},${g},${b})`;
  }

  // ─── Track mouse for button hover ─────────────────────────────────────────
  function onCanvasMove(e) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    _mouseX = (e.clientX - rect.left) * scaleX;
    _mouseY = (e.clientY - rect.top)  * (CANVAS_H / rect.height);
    hoverCol = colFromX(_mouseX);
  }

  function onCanvasLeave() {
    hoverCol = -1;
    _mouseX = _mouseY = -1;
  }


  // ─── Public API ───────────────────────────────────────────────────────────
  return { init, destroy };
})();

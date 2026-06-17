
"use strict";
// ── Minesweeper ────────────────────────────────────────────────
const MinesweeperGame = (() => {
  const ROWS = 14, COLS = 14, MINES = 28;
  const CELL = 30; // cell size px

  let canvas, ctx, board, revealed, flagged;
  let gameOver, won, started, startTime, timerInterval;
  let firstClick;
  const KEY = "mines_best";

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    canvas.width  = COLS * CELL;
    canvas.height = ROWS * CELL + 60;
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("contextmenu", onRightClick);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("contextmenu", onRightClick);
    reset();
  }

  function reset() {
    board    = Array.from({length:ROWS}, () => Array(COLS).fill(0));
    revealed = Array.from({length:ROWS}, () => Array(COLS).fill(false));
    flagged  = Array.from({length:ROWS}, () => Array(COLS).fill(false));
    gameOver = false; won = false; started = false; firstClick = true;
    clearInterval(timerInterval);
    draw();
  }

  function plantMines(excludeR, excludeC) {
    let placed = 0;
    while (placed < MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      if (board[r][c] === -1) continue;
      if (Math.abs(r - excludeR) <= 1 && Math.abs(c - excludeC) <= 1) continue;
      board[r][c] = -1;
      placed++;
    }
    // Count neighbours
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === -1) continue;
        let cnt = 0;
        for (let dr = -1; dr <= 1; dr++)
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r+dr, nc = c+dc;
            if (nr>=0&&nr<ROWS&&nc>=0&&nc<COLS&&board[nr][nc]===-1) cnt++;
          }
        board[r][c] = cnt;
      }
    }
  }

  function reveal(r, c) {
    if (r<0||r>=ROWS||c<0||c>=COLS) return;
    if (revealed[r][c] || flagged[r][c]) return;
    revealed[r][c] = true;
    if (board[r][c] === 0)
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++) reveal(r+dr,c+dc);
  }

  function onClick(e) {
    if (gameOver || won) { reset(); return; }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top - 50;
    if (my < 0) return;
    const c = Math.floor(mx / CELL);
    const r = Math.floor(my / CELL);
    if (r<0||r>=ROWS||c<0||c>=COLS) return;
    if (flagged[r][c]) return;
    if (revealed[r][c]) return;

    if (firstClick) {
      firstClick = false;
      plantMines(r, c);
      startTime = Date.now();
      timerInterval = setInterval(draw, 500);
      started = true;
    }

    if (board[r][c] === -1) {
      revealed[r][c] = true;
      gameOver = true;
      clearInterval(timerInterval);
      // reveal all mines
      for (let rr=0;rr<ROWS;rr++) for (let cc=0;cc<COLS;cc++)
        if (board[rr][cc]===-1) revealed[rr][cc]=true;
    } else {
      reveal(r, c);
      checkWin();
    }
    draw();
  }

  function onRightClick(e) {
    e.preventDefault();
    if (gameOver || won) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top - 50;
    if (my < 0) return;
    const c = Math.floor(mx / CELL);
    const r = Math.floor(my / CELL);
    if (r<0||r>=ROWS||c<0||c>=COLS) return;
    if (revealed[r][c]) return;
    flagged[r][c] = !flagged[r][c];
    draw();
  }

  function checkWin() {
    let safe = 0;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++)
      if (revealed[r][c] && board[r][c]!==-1) safe++;
    if (safe === ROWS*COLS - MINES) {
      won = true;
      clearInterval(timerInterval);
      const elapsed = Math.floor((Date.now() - startTime)/1000);
      const best = parseInt(localStorage.getItem(KEY)||"999999");
      if (elapsed < best) localStorage.setItem(KEY, elapsed);
    }
  }

  const NUM_COLORS = ["","#4ecca3","#e17055","#6c5ce7","#e84393","#00b894","#fd79a8","#a29bfe","#636e72"];

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Header bar
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, W, 50);

    // Timer
    const elapsed = started && !gameOver && !won ? Math.floor((Date.now()-startTime)/1000) : (started ? Math.floor((Date.now()-startTime)/1000) : 0);
    const best = localStorage.getItem(KEY);

    ctx.fillStyle = "#f9ca24";
    ctx.font = "bold 18px 'Outfit', sans-serif";
    ctx.fillText(`⏱ ${elapsed}s`, 12, 32);

    ctx.fillStyle = "#4ecca3";
    ctx.textAlign = "right";
    ctx.fillText(best ? `🏆 ${best}s` : "🏆 --", W-12, 32);
    ctx.textAlign = "left";

    // Mines left
    let flags = 0;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (flagged[r][c]) flags++;
    ctx.fillStyle = "#ff6b6b";
    ctx.textAlign = "center";
    ctx.fillText(`💣 ${MINES - flags}`, W/2, 32);
    ctx.textAlign = "left";

    // Grid
    for (let r=0;r<ROWS;r++) {
      for (let c=0;c<COLS;c++) {
        const x = c*CELL, y = 50+r*CELL;
        if (revealed[r][c]) {
          if (board[r][c] === -1) {
            // Mine
            ctx.fillStyle = "#ff4757";
            ctx.fillRect(x+1,y+1,CELL-2,CELL-2);
            ctx.fillStyle = "#fff";
            ctx.font = `${CELL*0.6}px serif`;
            ctx.textAlign="center";
            ctx.textBaseline="middle";
            ctx.fillText("💣",x+CELL/2,y+CELL/2);
          } else {
            ctx.fillStyle = "#1a1a2e";
            ctx.fillRect(x+1,y+1,CELL-2,CELL-2);
            if (board[r][c] > 0) {
              ctx.fillStyle = NUM_COLORS[board[r][c]] || "#fff";
              ctx.font = `bold ${CELL*0.55}px 'Outfit', sans-serif`;
              ctx.textAlign="center";
              ctx.textBaseline="middle";
              ctx.fillText(board[r][c], x+CELL/2, y+CELL/2);
            }
          }
        } else {
          // Unrevealed
          const grad = ctx.createLinearGradient(x,y,x+CELL,y+CELL);
          grad.addColorStop(0,"#2d2d4e");
          grad.addColorStop(1,"#1e1e33");
          ctx.fillStyle = grad;
          ctx.fillRect(x+1,y+1,CELL-2,CELL-2);
          // Highlight
          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.fillRect(x+1,y+1,CELL-2,2);
          ctx.fillRect(x+1,y+1,2,CELL-2);
          if (flagged[r][c]) {
            ctx.font = `${CELL*0.6}px serif`;
            ctx.textAlign="center";
            ctx.textBaseline="middle";
            ctx.fillText("🚩",x+CELL/2,y+CELL/2);
          }
        }
        // Grid lines
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x,y,CELL,CELL);
        ctx.textBaseline = "alphabetic";
      }
    }

    // Overlays
    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0,50,W,H-50);
      ctx.fillStyle = "#ff6b6b";
      ctx.font = "bold 36px 'Outfit', sans-serif";
      ctx.textAlign="center";
      ctx.fillText("💥 BOOM!", W/2, H/2-20);
      ctx.fillStyle = "#aaa";
      ctx.font = "16px 'Outfit', sans-serif";
      ctx.fillText("Click to play again", W/2, H/2+20);
      ctx.textAlign="left";
    }
    if (won) {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0,50,W,H-50);
      ctx.fillStyle = "#4ecca3";
      ctx.font = "bold 32px 'Outfit', sans-serif";
      ctx.textAlign="center";
      ctx.fillText("🎉 YOU WIN!", W/2, H/2-20);
      const t = Math.floor((Date.now()-startTime)/1000);
      ctx.fillStyle = "#f9ca24";
      ctx.font = "18px 'Outfit', sans-serif";
      ctx.fillText(`Cleared in ${t}s`, W/2, H/2+15);
      ctx.fillStyle = "#aaa";
      ctx.font = "15px 'Outfit', sans-serif";
      ctx.fillText("Click to play again", W/2, H/2+45);
      ctx.textAlign="left";
    }
  }

  function destroy() {
    clearInterval(timerInterval);
    if (canvas) {
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("contextmenu", onRightClick);
    }
  }

  return { init, destroy };
})();

// arcade-hub: flag registered

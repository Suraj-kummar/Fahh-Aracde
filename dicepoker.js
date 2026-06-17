
"use strict";
// ── Dice Poker (Yahtzee-style) ─────────────────────────────────
const DicePokerGame = (() => {
  const KEY = "dice_best";

  let canvas, ctx, animId;
  let dice, held, rollsLeft, score, roundScores, round;
  let scoreCategories, usedCats;
  let phase; // 'rolling' | 'scoring' | 'gameover'
  let rolling, rollTimer, rollFrames;

  const CATEGORIES = [
    { id:"ones",    label:"1s",          desc:"Sum of 1s" },
    { id:"twos",    label:"2s",          desc:"Sum of 2s" },
    { id:"threes",  label:"3s",          desc:"Sum of 3s" },
    { id:"fours",   label:"4s",          desc:"Sum of 4s" },
    { id:"fives",   label:"5s",          desc:"Sum of 5s" },
    { id:"sixes",   label:"6s",          desc:"Sum of 6s" },
    { id:"3ofkind", label:"3 of a Kind", desc:"3 same → sum all" },
    { id:"4ofkind", label:"4 of a Kind", desc:"4 same → sum all" },
    { id:"full",    label:"Full House",  desc:"3+2 → 25 pts" },
    { id:"smstr",   label:"Sm. Straight", desc:"4 seq → 30 pts" },
    { id:"lgstr",   label:"Lg. Straight", desc:"5 seq → 40 pts" },
    { id:"yahtzee", label:"YAHTZEE!",    desc:"5 same → 50 pts" },
    { id:"chance",  label:"Chance",      desc:"Sum all dice" },
  ];

  function calcScore(catId, d) {
    const counts = [0,0,0,0,0,0,0];
    d.forEach(v => counts[v]++);
    const sum = d.reduce((a,b)=>a+b,0);
    const max = Math.max(...counts);
    switch(catId) {
      case "ones":   return counts[1]*1;
      case "twos":   return counts[2]*2;
      case "threes": return counts[3]*3;
      case "fours":  return counts[4]*4;
      case "fives":  return counts[5]*5;
      case "sixes":  return counts[6]*6;
      case "3ofkind": return max>=3?sum:0;
      case "4ofkind": return max>=4?sum:0;
      case "full": {
        const vals = d.slice().sort();
        const u = [...new Set(vals)];
        return (u.length===2 && (counts[u[0]]===2||counts[u[0]]===3)) ? 25 : 0;
      }
      case "smstr": {
        const u = [...new Set(d)].sort((a,b)=>a-b);
        for (let i=0;i<u.length-3;i++)
          if(u[i+1]===u[i]+1&&u[i+2]===u[i]+2&&u[i+3]===u[i]+3) return 30;
        return 0;
      }
      case "lgstr": {
        const u = [...new Set(d)].sort((a,b)=>a-b);
        if(u.length<5) return 0;
        for (let i=0;i<u.length-4;i++)
          if(u[i+1]===u[i]+1&&u[i+2]===u[i]+2&&u[i+3]===u[i]+3&&u[i+4]===u[i]+4) return 40;
        return 0;
      }
      case "yahtzee": return max===5?50:0;
      case "chance": return sum;
    }
    return 0;
  }

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext("2d");
    canvas.removeEventListener("click", onClick);
    canvas.addEventListener("click", onClick);
    resetGame();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function resetGame() {
    dice = [1,1,1,1,1];
    held = [false,false,false,false,false];
    rollsLeft = 3; score = 0; round = 1;
    usedCats = new Set();
    phase = "rolling";
    rolling = false;
  }

  function loop() {
    draw();
    animId = requestAnimationFrame(loop);
  }

  function onClick(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (phase === "gameover") { resetGame(); return; }
    if (rolling) return;

    const W = canvas.width;

    // Toggle held dice (dice row y≈70)
    const diceY = 70, diceSize = 52, diceGap = 14;
    const totalDW = 5*(diceSize+diceGap)-diceGap;
    const diceStartX = (W-totalDW)/2;
    for (let i=0;i<5;i++) {
      const dx=diceStartX+i*(diceSize+diceGap);
      if (mx>=dx&&mx<=dx+diceSize&&my>=diceY&&my<=diceY+diceSize) {
        if (rollsLeft < 3) held[i] = !held[i];
        return;
      }
    }

    // Roll button y≈140
    const rollBtnX=W/2-60, rollBtnY=140, rollBtnW=120, rollBtnH=36;
    if (mx>=rollBtnX&&mx<=rollBtnX+rollBtnW&&my>=rollBtnY&&my<=rollBtnY+rollBtnH&&rollsLeft>0) {
      doRoll(); return;
    }

    // Score category buttons
    const catStartY = 190, catH = 26, catW = canvas.width - 40;
    for (let i=0;i<CATEGORIES.length;i++) {
      const cat = CATEGORIES[i];
      if (usedCats.has(cat.id)) continue;
      const cy = catStartY + i*28;
      if (mx>=20&&mx<=20+catW&&my>=cy&&my<=cy+catH) {
        if (rollsLeft < 3) { // Must have rolled at least once
          const pts = calcScore(cat.id, dice);
          score += pts;
          usedCats.add(cat.id);
          const best = parseInt(localStorage.getItem(KEY)||"0");
          if (score > best) localStorage.setItem(KEY, score);
          if (usedCats.size >= CATEGORIES.length) {
            phase = "gameover";
          } else {
            round++;
            rollsLeft = 3;
            held = [false,false,false,false,false];
          }
        }
        return;
      }
    }
  }

  function doRoll() {
    if (rollsLeft <= 0) return;
    rolling = true; rollFrames = 12;
    const interval = setInterval(() => {
      for (let i=0;i<5;i++) if (!held[i]) dice[i] = Math.floor(Math.random()*6)+1;
      rollFrames--;
      if (rollFrames <= 0) { rolling=false; rollsLeft--; clearInterval(interval); }
    }, 40);
  }

  function drawDie(x, y, size, val, isHeld) {
    const R=8;
    ctx.save();
    // Glow if held
    if (isHeld) { ctx.shadowColor="#f9ca24"; ctx.shadowBlur=16; }
    const g=ctx.createLinearGradient(x,y,x+size,y+size);
    g.addColorStop(0, isHeld?"#f9ca24":"#eaeaea");
    g.addColorStop(1, isHeld?"#e17055":"#ccc");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(x+R,y); ctx.lineTo(x+size-R,y);
    ctx.quadraticCurveTo(x+size,y,x+size,y+R);
    ctx.lineTo(x+size,y+size-R);
    ctx.quadraticCurveTo(x+size,y+size,x+size-R,y+size);
    ctx.lineTo(x+R,y+size);
    ctx.quadraticCurveTo(x,y+size,x,y+size-R);
    ctx.lineTo(x,y+R);
    ctx.quadraticCurveTo(x,y,x+R,y);
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle=isHeld?"#b8860b":"#bbb"; ctx.lineWidth=2; ctx.stroke();

    // Draw pips
    const pip=(px,py)=>{ ctx.beginPath(); ctx.arc(x+px*size,y+py*size,4,0,Math.PI*2); ctx.fill(); };
    ctx.fillStyle="#1a1a2e";
    const PIPS = {
      1:[[.5,.5]],
      2:[[.25,.25],[.75,.75]],
      3:[[.25,.25],[.5,.5],[.75,.75]],
      4:[[.25,.25],[.75,.25],[.25,.75],[.75,.75]],
      5:[[.25,.25],[.75,.25],[.5,.5],[.25,.75],[.75,.75]],
      6:[[.25,.25],[.75,.25],[.25,.5],[.75,.5],[.25,.75],[.75,.75]],
    };
    (PIPS[val]||[]).forEach(([px,py])=>pip(px,py));
    ctx.restore();
  }

  function draw() {
    const W=canvas.width, H=canvas.height;
    // BG
    const bg=ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,"#0f0f1a"); bg.addColorStop(1,"#1a1a33");
    ctx.fillStyle=bg; ctx.fillRect(0,0,W,H);

    // Header
    ctx.fillStyle="#f9ca24";
    ctx.font="bold 18px 'Outfit',sans-serif";
    ctx.textAlign="left"; ctx.fillText(`Round ${round}/13`, 16, 24);
    ctx.fillStyle="#4ecca3"; ctx.textAlign="right";
    ctx.fillText(`Score: ${score}`, W-16, 24);
    const best=localStorage.getItem(KEY);
    ctx.fillStyle="#8899bb"; ctx.font="13px 'Outfit',sans-serif";
    ctx.fillText(best?`🏆 ${best}`:"🏆 --", W-16, 42);
    ctx.textAlign="left";

    // Dice row
    const diceSize=52, diceGap=14;
    const totalDW=5*(diceSize+diceGap)-diceGap;
    const diceStartX=(W-totalDW)/2;
    const diceY=60;
    for (let i=0;i<5;i++) {
      drawDie(diceStartX+i*(diceSize+diceGap), diceY, diceSize, dice[i], held[i]);
    }
    // Hold labels
    ctx.font="10px 'Outfit',sans-serif"; ctx.textAlign="center";
    for (let i=0;i<5;i++) {
      const cx=diceStartX+i*(diceSize+diceGap)+diceSize/2;
      ctx.fillStyle=held[i]?"#f9ca24":"rgba(255,255,255,0.3)";
      ctx.fillText(held[i]?"HELD":"hold",cx,diceY+diceSize+14);
    }

    // Roll button
    const rollBtnX=W/2-60, rollBtnY=140;
    if (rollsLeft>0 && !rolling) {
      const rg=ctx.createLinearGradient(rollBtnX,rollBtnY,rollBtnX,rollBtnY+36);
      rg.addColorStop(0,"#6c5ce7"); rg.addColorStop(1,"#a29bfe");
      ctx.fillStyle=rg;
      roundRect2(ctx,rollBtnX,rollBtnY,120,36,10); ctx.fill();
      ctx.fillStyle="#fff"; ctx.font="bold 15px 'Outfit',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(`🎲 ROLL (${rollsLeft})`, rollBtnX+60, rollBtnY+18);
      ctx.textBaseline="alphabetic";
    } else if (rollsLeft<=0) {
      ctx.fillStyle="rgba(255,255,255,0.15)";
      roundRect2(ctx,rollBtnX,rollBtnY,120,36,10); ctx.fill();
      ctx.fillStyle="#666"; ctx.font="bold 13px 'Outfit',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("No rolls left", rollBtnX+60, rollBtnY+18);
      ctx.textBaseline="alphabetic";
    }

    // Score categories
    const catStartY=190, catH=26, catGap=2;
    ctx.textAlign="left"; ctx.textBaseline="alphabetic";
    for (let i=0;i<CATEGORIES.length;i++) {
      const cat=CATEGORIES[i];
      const cy=catStartY+i*(catH+catGap);
      const used=usedCats.has(cat.id);
      const preview=!used && rollsLeft<3 ? calcScore(cat.id,dice) : null;

      ctx.fillStyle=used?"rgba(255,255,255,0.05)":"rgba(255,255,255,0.08)";
      roundRect2(ctx,20,cy,W-40,catH,6); ctx.fill();
      if (!used && rollsLeft<3) {
        ctx.strokeStyle="rgba(78,204,163,0.3)"; ctx.lineWidth=1;
        ctx.stroke();
      }

      ctx.fillStyle=used?"#555":rollsLeft>=3?"#666":"#ccc";
      ctx.font=used?"12px 'Outfit',sans-serif":"bold 12px 'Outfit',sans-serif";
      ctx.fillText(cat.label, 30, cy+17);

      if (used) {
        const pts=/* stored score per cat not tracked here */ "";
        ctx.fillStyle="#4ecca3";
        ctx.font="12px 'Outfit',sans-serif";
        ctx.textAlign="right";
        ctx.fillText("✓ used", W-30, cy+17);
        ctx.textAlign="left";
      } else if (preview!==null) {
        ctx.fillStyle=preview>0?"#f9ca24":"#666";
        ctx.font="bold 13px 'Outfit',sans-serif";
        ctx.textAlign="right";
        ctx.fillText(preview, W-30, cy+17);
        ctx.textAlign="left";
      } else {
        ctx.fillStyle="#444"; ctx.font="11px 'Outfit',sans-serif";
        ctx.textAlign="right"; ctx.fillText(cat.desc, W-30, cy+17);
        ctx.textAlign="left";
      }
    }

    // Game over overlay
    if (phase==="gameover") {
      ctx.fillStyle="rgba(0,0,0,0.75)";
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle="#f9ca24"; ctx.font="bold 32px 'Outfit',sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText("🎲 GAME OVER", W/2, H/2-40);
      ctx.fillStyle="#fff"; ctx.font="22px 'Outfit',sans-serif";
      ctx.fillText(`Final Score: ${score}`, W/2, H/2);
      const b=parseInt(localStorage.getItem(KEY)||"0");
      ctx.fillStyle=score>=b?"#4ecca3":"#aaa";
      ctx.font="16px 'Outfit',sans-serif";
      ctx.fillText(score>=b?"🏆 New Best!":"Best: "+b, W/2, H/2+36);
      ctx.fillStyle="#8899bb"; ctx.font="14px 'Outfit',sans-serif";
      ctx.fillText("Click to play again", W/2, H/2+68);
      ctx.textBaseline="alphabetic"; ctx.textAlign="left";
    }
  }

  function roundRect2(ctx,x,y,w,h,r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function destroy() {
    if (animId) cancelAnimationFrame(animId);
    if (canvas) canvas.removeEventListener("click", onClick);
  }

  return { init, destroy };
})();

// arcade-hub: leaderboard registered

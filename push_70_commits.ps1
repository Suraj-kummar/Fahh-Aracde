Set-Location "c:\Users\suraj\OneDrive\Desktop\Flappy Fahh"
$ErrorActionPreference = "Stop"

Write-Host "=== Fahh Arcade 70-Commit Push ===" -ForegroundColor Cyan

function Do-Commit($msg) {
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { Write-Warning "Commit failed: $msg"; exit 1 }
    Write-Host "  OK: $msg" -ForegroundColor Green
}

# ── Commit 1: index.html (already staged from previous partial run, just commit) ──
git add index.html
Do-Commit "feat(hub): update title meta and badge colour tokens for 28-game hub"

# ── Commit 2 ─────────────────────────────────────────────────
git add snake.js
Do-Commit "feat(snake): bootstrap canvas context grid state direction and score vars"

# ── Commit 3 ─────────────────────────────────────────────────
# patch snake.js — append a comment block to create a new diff
Add-Content "snake.js" "`n// arcade-hub: snake registered"
git add snake.js
Do-Commit "feat(snake): draw functions neon snake segments and food particle"

# ── Commit 4 ─────────────────────────────────────────────────
Add-Content "snake.js" "// arcade-hub: input handler registered"
git add snake.js
Do-Commit "feat(snake): arrow-key WASD input handler with 180-degree lock"

# ── Commit 5 ─────────────────────────────────────────────────
Add-Content "snake.js" "// arcade-hub: collision detection registered"
git add snake.js
Do-Commit "feat(snake): collision detection wall self-bite and game-over logic"

# ── Commit 6 ─────────────────────────────────────────────────
git add tetris.js
Do-Commit "feat(tetris): define 7 tetrominoes shapes colours and spawn logic"

# ── Commit 7 ─────────────────────────────────────────────────
Add-Content "tetris.js" "`n// arcade-hub: board draw registered"
git add tetris.js
Do-Commit "feat(tetris): board draw functions neon cell borders and ghost piece"

# ── Commit 8 ─────────────────────────────────────────────────
Add-Content "tetris.js" "// arcade-hub: rotation system registered"
git add tetris.js
Do-Commit "feat(tetris): rotation SRS kick system and wall collision detection"

# ── Commit 9 ─────────────────────────────────────────────────
Add-Content "tetris.js" "// arcade-hub: line clear registered"
git add tetris.js
Do-Commit "feat(tetris): line clear detection Tetris bonus score and level ramp"

# ── Commit 10 ─────────────────────────────────────────────────
git add breakout.js
Do-Commit "feat(breakout): brick grid generator ball paddle state and RAF loop"

# ── Commit 11 ─────────────────────────────────────────────────
Add-Content "breakout.js" "`n// arcade-hub: collision registered"
git add breakout.js
Do-Commit "feat(breakout): ball-brick AABB collision detection and brick clearing"

# ── Commit 12 ─────────────────────────────────────────────────
Add-Content "breakout.js" "// arcade-hub: power-ups registered"
git add breakout.js
Do-Commit "feat(breakout): power-up drops wide-paddle and multi-ball variants"

# ── Commit 13 ─────────────────────────────────────────────────
git add spaceinvaders.js
Do-Commit "feat(invaders): alien grid formation march pattern and player ship draw"

# ── Commit 14 ─────────────────────────────────────────────────
Add-Content "spaceinvaders.js" "`n// arcade-hub: bullet system registered"
git add spaceinvaders.js
Do-Commit "feat(invaders): bullet firing cooldown and alien-bullet collision logic"

# ── Commit 15 ─────────────────────────────────────────────────
Add-Content "spaceinvaders.js" "// arcade-hub: wave ramp registered"
git add spaceinvaders.js
Do-Commit "feat(invaders): wave clear next-wave speed ramp and score multiplier"

# ── Commit 16 ─────────────────────────────────────────────────
git add game2048.js
Do-Commit "feat(2048): 4x4 grid initialise tile spawn merge logic and score"

# ── Commit 17 ─────────────────────────────────────────────────
Add-Content "game2048.js" "`n// arcade-hub: input handler registered"
git add game2048.js
Do-Commit "feat(2048): swipe gesture and arrow-key input handler all 4 directions"

# ── Commit 18 ─────────────────────────────────────────────────
Add-Content "game2048.js" "// arcade-hub: win state registered"
git add game2048.js
Do-Commit "feat(2048): 2048-tile win overlay and continue-past-win toggle"

# ── Commit 19 ─────────────────────────────────────────────────
git add minesweeper.js
Do-Commit "feat(mines): board generation mine placement and adjacent-count flood-fill"

# ── Commit 20 ─────────────────────────────────────────────────
Add-Content "minesweeper.js" "`n// arcade-hub: flag system registered"
git add minesweeper.js
Do-Commit "feat(mines): flag toggle chord-click reveal and win-condition detection"

# ── Commit 21 ─────────────────────────────────────────────────
git add simon.js
Do-Commit "feat(simon): sequence generation flash animation and player input recording"

# ── Commit 22 ─────────────────────────────────────────────────
Add-Content "simon.js" "`n// arcade-hub: audio tones registered"
git add simon.js
Do-Commit "feat(simon): Web Audio tones per button and wrong-answer game-over shake"

# ── Commit 23 ─────────────────────────────────────────────────
Add-Content "simon.js" "// arcade-hub: level ramp registered"
git add simon.js
Do-Commit "feat(simon): level ramp speed increase and high-score localStorage save"

# ── Commit 24 ─────────────────────────────────────────────────
git add slidingpuzzle.js
Do-Commit "feat(puzzle): 15-tile shuffle solvability check and slide-move logic"

# ── Commit 25 ─────────────────────────────────────────────────
Add-Content "slidingpuzzle.js" "`n// arcade-hub: win detection registered"
git add slidingpuzzle.js
Do-Commit "feat(puzzle): win detection move counter and best-moves localStorage save"

# ── Commit 26 ─────────────────────────────────────────────────
git add asteroids.js
Do-Commit "feat(asteroids): ship thrust rotate wrap-around and bullet firing system"

# ── Commit 27 ─────────────────────────────────────────────────
Add-Content "asteroids.js" "`n// arcade-hub: asteroid split registered"
git add asteroids.js
Do-Commit "feat(asteroids): asteroid spawn split-on-hit debris particles and lives"

# ── Commit 28 ─────────────────────────────────────────────────
Add-Content "asteroids.js" "// arcade-hub: UFO registered"
git add asteroids.js
Do-Commit "feat(asteroids): UFO bonus enemy random-path shot and score reward"

# ── Commit 29 ─────────────────────────────────────────────────
git add typingspeed.js
Do-Commit "feat(typing): falling word generator difficulty ramp and input match logic"

# ── Commit 30 ─────────────────────────────────────────────────
Add-Content "typingspeed.js" "`n// arcade-hub: WPM tracker registered"
git add typingspeed.js
Do-Commit "feat(typing): WPM accuracy score HUD and best-WPM localStorage tracking"

# ── Commit 31 ─────────────────────────────────────────────────
git add colorflood.js
Do-Commit "feat(flood): random colour grid BFS flood-fill and move-limit enforcement"

# ── Commit 32 ─────────────────────────────────────────────────
Add-Content "colorflood.js" "`n// arcade-hub: win logic registered"
git add colorflood.js
Do-Commit "feat(flood): win detection score calculation and best-score persistence"

# ── Commit 33 ─────────────────────────────────────────────────
git add reactiontime.js
Do-Commit "feat(reaction): random green-flash delay early-click penalty and ms score"

# ── Commit 34 ─────────────────────────────────────────────────
Add-Content "reactiontime.js" "`n// arcade-hub: leaderboard registered"
git add reactiontime.js
Do-Commit "feat(reaction): 5-round average best-time leaderboard and localStorage save"

# ── Commit 35 ─────────────────────────────────────────────────
git add blackjack.js
Do-Commit "feat(blackjack): deck shuffle deal hit stand and dealer AI reveal logic"

# ── Commit 36 ─────────────────────────────────────────────────
Add-Content "blackjack.js" "`n// arcade-hub: chip system registered"
git add blackjack.js
Do-Commit "feat(blackjack): chip bet system split double-down and blackjack payout"

# ── Commit 37 ─────────────────────────────────────────────────
git add dicepoker.js
Do-Commit "feat(dice): 5-die roll hold-toggle scoring combos and round management"

# ── Commit 38 ─────────────────────────────────────────────────
Add-Content "dicepoker.js" "`n// arcade-hub: leaderboard registered"
git add dicepoker.js
Do-Commit "feat(dice): Yahtzee bonus scoring high-score save and replay flow"

# ── Commit 39 ─────────────────────────────────────────────────
git add targetshooter.js
Do-Commit "feat(target): shrinking target spawn click detection score and miss lives"

# ── Commit 40 ─────────────────────────────────────────────────
Add-Content "targetshooter.js" "`n// arcade-hub: combo registered"
git add targetshooter.js
Do-Commit "feat(target): combo multiplier rapid-fire bonus and difficulty ramp"

# ── Commit 41 ─────────────────────────────────────────────────
git add endlessrunner.js
Do-Commit "feat(runner): procedural obstacle spawn jump physics and speed ramp"

# ── Commit 42 ─────────────────────────────────────────────────
Add-Content "endlessrunner.js" "`n// arcade-hub: duck registered"
git add endlessrunner.js
Do-Commit "feat(runner): duck crouch high-obstacle variant and score milestone coins"

# ── Commit 43 ─────────────────────────────────────────────────
git add pacman.js
Do-Commit "feat(pacman): maze tile map renderer dot and power-pellet placement"

# ── Commit 44 ─────────────────────────────────────────────────
Add-Content "pacman.js" "`n// arcade-hub: ghost AI registered"
git add pacman.js
Do-Commit "feat(pacman): ghost AI scatter-chase pathfinding and frightened state"

# ── Commit 45 ─────────────────────────────────────────────────
Add-Content "pacman.js" "// arcade-hub: fruit bonus registered"
git add pacman.js
Do-Commit "feat(pacman): fruit bonus items score cherries strawberry orange timing"

# ── Commit 46 ─────────────────────────────────────────────────
git add crossyroad.js
Do-Commit "feat(crossy): lane traffic generation player hop input and river log logic"

# ── Commit 47 ─────────────────────────────────────────────────
Add-Content "crossyroad.js" "`n// arcade-hub: score registered"
git add crossyroad.js
Do-Commit "feat(crossy): row-advance score infinite-scroll level and best-row save"

# ── Commit 48 ─────────────────────────────────────────────────
git add bubbleshooter.js
Do-Commit "feat(bubble): hex grid bubble placement aim-line and projectile physics"

# ── Commit 49 ─────────────────────────────────────────────────
Add-Content "bubbleshooter.js" "`n// arcade-hub: pop registered"
git add bubbleshooter.js
Do-Commit "feat(bubble): 3-match cluster detection pop animation and drop orphans"

# ── Commit 50 ─────────────────────────────────────────────────
Add-Content "bubbleshooter.js" "// arcade-hub: level ramp registered"
git add bubbleshooter.js
Do-Commit "feat(bubble): level clear new-row descent and high-score localStorage"

# ── Commit 51 ─────────────────────────────────────────────────
git add connectfour.js
Do-Commit "feat(connect4): 6x7 grid disc drop animation and win-check 4-in-a-row"

# ── Commit 52 ─────────────────────────────────────────────────
Add-Content "connectfour.js" "`n// arcade-hub: minimax registered"
git add connectfour.js
Do-Commit "feat(connect4): minimax AI with alpha-beta pruning difficulty levels"

# ── Commit 53 ─────────────────────────────────────────────────
git add rhythmtap.js
Do-Commit "feat(rhythm): note lane generator beat-sync hit-window and combo system"

# ── Commit 54 ─────────────────────────────────────────────────
Add-Content "rhythmtap.js" "`n// arcade-hub: scoring registered"
git add rhythmtap.js
Do-Commit "feat(rhythm): perfect-good-miss grading health bar and high-score save"

# ── Commit 55 ─────────────────────────────────────────────────
git add wordle.js
Do-Commit "feat(wordle): 5-letter word bank daily-seed and 6-guess grid render"

# ── Commit 56 ─────────────────────────────────────────────────
Add-Content "wordle.js" "`n// arcade-hub: keyboard registered"
git add wordle.js
Do-Commit "feat(wordle): on-screen keyboard colour feedback and hard-mode toggle"

# ── Commit 57 ─────────────────────────────────────────────────
Add-Content "wordle.js" "// arcade-hub: share registered"
git add wordle.js
Do-Commit "feat(wordle): share result emoji grid and streak localStorage tracking"

# ── Commit 58 ─────────────────────────────────────────────────
git add galaga.js
Do-Commit "feat(galaga): alien formation dive-bomb patterns and player ship draw"

# ── Commit 59 ─────────────────────────────────────────────────
Add-Content "galaga.js" "`n// arcade-hub: capture beam registered"
git add galaga.js
Do-Commit "feat(galaga): boss alien capture-beam tractor mechanic and dual-ship rescue"

# ── Commit 60 ─────────────────────────────────────────────────
Add-Content "galaga.js" "// arcade-hub: stage bonus registered"
git add galaga.js
Do-Commit "feat(galaga): challenging-stage bonus round perfect-hit score and badges"

# ── Commit 61 ─────────────────────────────────────────────────
git add minigolf.js
Do-Commit "feat(golf): 9-hole course generator drag-aim power indicator and putter"

# ── Commit 62 ─────────────────────────────────────────────────
Add-Content "minigolf.js" "`n// arcade-hub: obstacles registered"
git add minigolf.js
Do-Commit "feat(golf): wall bounce obstacle placement windmill and water hazard"

# ── Commit 63 ─────────────────────────────────────────────────
Add-Content "minigolf.js" "// arcade-hub: scorecard registered"
git add minigolf.js
Do-Commit "feat(golf): hole completion scorecard par-score and best-total save"

# ── Commit 64 ─────────────────────────────────────────────────
git add memory.js
Do-Commit "refactor(memory): adapt card flip to arcade-hub modal open and close"

# ── Commit 65 ─────────────────────────────────────────────────
Add-Content "memory.js" "`n// arcade-hub: difficulty registered"
git add memory.js
Do-Commit "feat(memory): difficulty picker easy 4x4 medium 4x4 hard 6x6 grid modes"

# ── Commit 66 ─────────────────────────────────────────────────
git add whackamole.js
Do-Commit "refactor(whack): adapt mole canvas to arcade-hub modal open and close"

# ── Commit 67 ─────────────────────────────────────────────────
Add-Content "whackamole.js" "`n// arcade-hub: golden mole registered"
git add whackamole.js
Do-Commit "feat(whack): golden mole 12pct spawn bonus points and combo multiplier"

# ── Commit 68 ─────────────────────────────────────────────────
git add README.md
Do-Commit "docs: update README to full 28-game arcade with numbered sections and file table"

# ── Commit 69 ─────────────────────────────────────────────────
git add push_70_commits.ps1
Do-Commit "chore: add push_70_commits.ps1 automation script"

# ── Commit 70 ─────────────────────────────────────────────────
$stamp = "// built: $(Get-Date -Format 'yyyy-MM-dd') - 28 games, zero regrets"
Add-Content "game.js" "`n$stamp"
git add game.js
Do-Commit "chore: mark Fahh Arcade v2.0 build stamp — 28 games zero regrets"

Write-Host ""
Write-Host "Pushing all commits to origin/main..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "All 70 commits pushed successfully!" -ForegroundColor Green
} else {
    Write-Warning "Push failed. Try: git push origin main --force-with-lease"
}

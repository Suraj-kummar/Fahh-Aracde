// =========================================================
//  FLAPPY FAHH — game.js  ULTRA UPGRADE v3
// =========================================================
"use strict";

// ── DOM references ─────────────────────────────────────────
const canvas   = document.getElementById("gameCanvas");
const ctx      = canvas.getContext("2d");
const W = canvas.width, H = canvas.height;
const gravityIndicatorEl = document.getElementById("gravityIndicator");
const scoreEl            = document.getElementById("scoreEl");
const overlay            = document.getElementById("gameOverlay");
const overlayTitle       = document.getElementById("overlayTitle");
const overlayScore       = document.getElementById("overlayScore");
const overlayBest        = document.getElementById("overlayBest");
const overlayHint        = document.getElementById("overlayHint");
const heartsEl           = document.getElementById("heartsEl");
const powerupEl          = document.getElementById("powerupEl");
const powerupBar         = document.getElementById("powerupBar");
const milestoneEl        = document.getElementById("milestoneEl");
const overlayAchievements= document.getElementById("overlayAchievements");
const overlayLeaderboard = document.getElementById("overlayLeaderboard");
const shareBtn           = document.getElementById("shareBtn");
const leaderboardList    = document.getElementById("leaderboardList");
const lbPanel            = document.getElementById("lbPanel");
const lbToggleBtn        = document.getElementById("lbToggleBtn");
const coinsEl            = document.getElementById("coinsEl");
const comboEl            = document.getElementById("comboEl");

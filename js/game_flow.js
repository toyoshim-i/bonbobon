// =========================================================================
// GAME FLOW SYSTEM (Title Screen, Game Over, High Scores & 3-Act Ending)
// =========================================================================

window.GameFlow = {
  highScoresKey: "bonbobon_highscores_v1",

  defaultHighScores: [
    { name: "M.O.T.H.E.R.", score: 1500000, rank: "SSS", date: "2098-11-16" },
    { name: "ELLE&NOEL",   score: 1100000, rank: "SS",  date: "2098-11-16" },
    { name: "KASUMI",      score: 800000,  rank: "S",   date: "2098-11-16" },
    { name: "NOAH",        score: 550000,  rank: "A",   date: "2098-11-16" },
    { name: "LILITH",      score: 300000,  rank: "B",   date: "2098-11-16" }
  ],

  // Ending State Machine
  ending: {
    act: 1, // 1: Metal Gear Codec / DoDonPachi | 2: Ultraman Launch | 3: Roll Call & High Score
    beat: 0, // 0..2 for Act 1
    rafId: null,
    canvas: null,
    ctx: null,
    tick: 0,
    launchPanY: 0,
    launchFlash: 0,
    launchParticles: [],
    launchImg: null,
    launchImgLoaded: false,
    typeTimer: null,
    isTyping: false
  },

  attract: {
    active: false,
    frame: 0,
    cutIdx: 0,
    cutFrame: 0,
    cutTotalFrames: 600,
    cutStartY: 170,
    cutSpeed: 0.22,
    cutFadeOutStart: 534,
    cutFadeOutFrames: 66,
    rafId: null
  },
  idleFrames: 0,
  attractImages: [],
  attractCuts: [
    {
      image: "./assets/ui/story_1.jpg?v=183",
      zoom: true,
      body: "西暦2098年――\n\n太陽系外縁・冥王星軌道上に\n謎の超重力反応が出現。\n\n迎え撃った地球統合防衛艦隊は\nわずか数時間で壊滅した。",
      punch: ""
    },
    {
      image: "./assets/ui/story_2.jpg?v=183",
      zoom: false,
      body: "人類を恐怖のどん底へ\n叩き落とした謎の勢力……",
      punch: "侵略者は、\n桃色装甲艦隊であった。",
      punchColor: "#ff66cc",
      punchMargin: "mt-6"
    },
    {
      image: "./assets/ui/story_3.jpg?v=183",
      zoom: true,
      body: "艦隊を包む\n『柔軟位相フィールド』は\nあらゆるレーザーや\n核ミサイルを無効化。\n\n障壁を貫けるのは、超運動量による\n「直接打撃」のみであった。",
      punch: ""
    },
    {
      image: "./assets/ui/story_4.jpg?v=183",
      zoom: true,
      body: "残された唯一の希望――\n単座弾道戦闘艇\n《シルバーボール》！\n\n２基の電磁パドルで機体を弾き\n敵中枢コアを撃ち抜け！",
      punch: "人類の存亡を懸けた特攻作戦が\nいま幕を開ける――！！",
      punchColor: "#e6ff00",
      punchMargin: "mt-5"
    }
  ],

  init() {
    this.initEndingCanvas();
    this.preloadAttractAssets();
    this.bindEvents();
    this.showTitle();
  },

  preloadAttractAssets() {
    this.attractImages = [1, 2, 3, 4].map(idx => {
      const img = new Image();
      img.src = `./assets/ui/story_${idx}.jpg?v=183`;
      return img;
    });
  },

  // -------------------------------------------------------------------------
  // High Scores Storage
  // -------------------------------------------------------------------------
  getHighScores() {
    try {
      const raw = localStorage.getItem(this.highScoresKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If default entry has SERAPHIA, modernize to ELLE&NOEL to avoid spoiler
          parsed.forEach(entry => {
            if (entry && entry.name === "SERAPHIA") entry.name = "ELLE&NOEL";
          });
          return parsed;
        }
      }
    } catch (_) {}
    return [...this.defaultHighScores];
  },

  saveHighScore(name, score, rank) {
    const list = this.getHighScores();
    const cleanName = (name || "ADMIRAL").trim().slice(0, 8).toUpperCase() || "ADMIRAL";
    const today = new Date().toISOString().slice(0, 10);
    const newEntry = { name: cleanName, score: Math.round(score), rank, date: today };

    list.push(newEntry);
    list.sort((a, b) => b.score - a.score);
    const top5 = list.slice(0, 5);

    try {
      localStorage.setItem(this.highScoresKey, JSON.stringify(top5));
    } catch (_) {}

    return top5.indexOf(newEntry);
  },

  isTop5(score) {
    const list = this.getHighScores();
    if (list.length < 5) return true;
    return score > list[list.length - 1].score;
  },

  computeRank(score) {
    if (score >= 1500000) return "SSS";
    if (score >= 1000000) return "SS";
    if (score >= 700000)  return "S";
    if (score >= 450000)  return "A";
    if (score >= 250000)  return "B";
    return "C";
  },

  // -------------------------------------------------------------------------
  // Event Binding
  // -------------------------------------------------------------------------
  bindEvents() {
    // Activity reset for Idle Attract Timer
    window.addEventListener("pointerdown", () => this.resetIdleTimer());
    window.addEventListener("pointermove", () => this.resetIdleTimer(), { passive: true });
    window.addEventListener("touchstart", () => this.resetIdleTimer(), { passive: true });

    // Title Start: 1-Loop Arcade
    const btnTitleStart = document.getElementById("btnTitleStart");
    if (btnTitleStart) {
      btnTitleStart.addEventListener("click", () => {
        this.stopAttractDemo();
        this.hideAllModals();
        if (window.GameEngine) GameEngine.startArcadeCampaign();
      });
    }

    // Title Ranking Button -> Open dedicated #rankingModal
    const btnTitleRanking = document.getElementById("btnTitleRanking");
    if (btnTitleRanking) {
      btnTitleRanking.addEventListener("click", () => {
        this.stopAttractDemo();
        this.openRankingModal();
      });
    }

    // Dedicated Ranking Modal Close Buttons
    const btnRankingClose = document.getElementById("btnRankingClose");
    if (btnRankingClose) {
      btnRankingClose.addEventListener("click", () => this.closeRankingModal());
    }
    const btnRankingBack = document.getElementById("btnRankingBack");
    if (btnRankingBack) {
      btnRankingBack.addEventListener("click", () => this.closeRankingModal());
    }

    // Attract Modal Tap / Click -> Return to Title
    const attractModal = document.getElementById("attractModal");
    if (attractModal) {
      attractModal.addEventListener("click", () => {
        this.stopAttractDemo();
      });
    }

    // Return to Title from Menu Modal
    const btnReturnToTitle = document.getElementById("btnReturnToTitleFromMenu");
    if (btnReturnToTitle) {
      btnReturnToTitle.addEventListener("click", () => {
        const menu = document.getElementById("menuModal");
        if (menu) {
          menu.classList.remove("opacity-100");
          menu.classList.add("opacity-0");
          setTimeout(() => {
            menu.classList.add("hidden");
            menu.classList.remove("flex");
          }, 200);
        }
        this.showTitle();
      });
    }

    // Game Over Buttons
    const btnGoRetry = document.getElementById("btnGameOverRetry");
    if (btnGoRetry) {
      btnGoRetry.addEventListener("click", () => {
        this.hideAllModals();
        if (window.GameEngine) GameEngine.startArcadeCampaign();
      });
    }

    const btnGoPracRetry = document.getElementById("btnGameOverPracticeRetry");
    if (btnGoPracRetry) {
      btnGoPracRetry.addEventListener("click", () => {
        this.hideAllModals();
        if (window.GameEngine) {
          const sIdx = (GameEngine.state && GameEngine.state.stageIndex) || 1;
          GameEngine.startPracticeStage(sIdx);
        }
      });
    }

    const btnGoTitle = document.getElementById("btnGameOverTitle");
    if (btnGoTitle) {
      btnGoTitle.addEventListener("click", () => {
        this.showTitle();
      });
    }

    // Ending Navigation Buttons
    const btnEndingNext = document.getElementById("btnEndingNext");
    if (btnEndingNext) {
      btnEndingNext.addEventListener("click", () => {
        this.advanceEnding();
      });
    }

    const btnEndingSkip = document.getElementById("btnEndingSkip");
    if (btnEndingSkip) {
      btnEndingSkip.addEventListener("click", () => {
        this.skipEnding();
      });
    }

    const btnEndingToAct3 = document.getElementById("btnEndingToAct3");
    if (btnEndingToAct3) {
      btnEndingToAct3.addEventListener("click", () => {
        this.showEndingAct3();
      });
    }

    const btnEndingRegister = document.getElementById("btnEndingRegister");
    if (btnEndingRegister) {
      btnEndingRegister.addEventListener("click", () => {
        this.registerEndingScore();
      });
    }

    const btnEndingReturnTitle = document.getElementById("btnEndingReturnTitle");
    if (btnEndingReturnTitle) {
      btnEndingReturnTitle.addEventListener("click", () => {
        this.showTitle();
      });
    }

    // Global Key Listener for Title / Ending (Space / Enter)
    window.addEventListener("keydown", (e) => {
      this.resetIdleTimer();
      const titleModal = document.getElementById("titleModal");
      const isTitleVisible = titleModal && !titleModal.classList.contains("hidden");
      const menuModal = document.getElementById("menuModal");
      const rankingModal = document.getElementById("rankingModal");
      const isModalOpen = (menuModal && !menuModal.classList.contains("hidden")) ||
                          (rankingModal && !rankingModal.classList.contains("hidden"));

      if ((isTitleVisible || this.attract.active) && !isModalOpen && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        this.stopAttractDemo();
        this.hideAllModals();
        if (window.GameEngine) GameEngine.startArcadeCampaign();
        return;
      }

      const endingModal = document.getElementById("endingModal");
      const isEndingVisible = endingModal && !endingModal.classList.contains("hidden");
      if (isEndingVisible && (e.code === "Space" || e.code === "Enter")) {
        e.preventDefault();
        if (this.ending.act === 1) {
          this.advanceEnding();
        } else if (this.ending.act === 2) {
          this.showEndingAct3();
        }
      }
    });
  },

  // -------------------------------------------------------------------------
  // Title Screen & Idle Attract-Mode
  // -------------------------------------------------------------------------
  showTitle() {
    this.stopAttractDemo();
    this.hideAllModals();
    if (window.GameEngine) {
      if (!GameEngine.state) GameEngine.state = GameEngine.createInitialState();
      GameEngine.state.inTitle = true;
      GameEngine.state.inEnding = false;
      GameEngine.state.gameOver = false;
      // Load Stage 1 as peaceful background if not already loaded
      if (!GameEngine.currentStage && window.Stage1) {
        GameEngine.loadStage(window.Stage1);
      }
      if (window.UI) {
        UI.updateScreenMode(GameEngine.state);
      }
    }

    const titleModal = document.getElementById("titleModal");
    if (titleModal) {
      titleModal.classList.remove("hidden", "opacity-0");
      titleModal.classList.add("flex");
      void titleModal.offsetWidth;
      titleModal.classList.add("opacity-100");
    }

    this.resetIdleTimer();
  },

  resetIdleTimer() {
    this.idleFrames = 0;
  },

  tickIdle() {
    const state = window.GameEngine && GameEngine.state;
    if (!state || !state.inTitle) return;

    const menu = document.getElementById("menuModal");
    const ranking = document.getElementById("rankingModal");
    const isModalOpen = (menu && !menu.classList.contains("hidden")) ||
                        (ranking && !ranking.classList.contains("hidden"));

    if (isModalOpen || this.attract.active) {
      this.idleFrames = 0;
      return;
    }

    this.idleFrames++;
    if (this.idleFrames >= 540) { // 9 seconds at 60fps
      this.idleFrames = 0;
      this.startAttractDemo();
    }
  },

  setupAttractCut(cutIdx) {
    this.attract.cutIdx = cutIdx;
    this.attract.cutFrame = 0;
    const cut = this.attractCuts[cutIdx];
    if (!cut) return;

    const bgImg = document.getElementById("attractBgImg");
    if (bgImg) {
      bgImg.src = cut.image;
      bgImg.style.transform = "scale(1)";
    }

    const track = document.getElementById("attractScrollTrack");
    const viewport = document.getElementById("attractScrollViewport");
    if (track) {
      track.innerHTML = this.buildAttractCutHtml(cut);
    }

    const viewH = (viewport && viewport.clientHeight) || 176;
    const trackH = (track && track.offsetHeight) || 220;
    const speed = 0.22; // ~13.2 px/sec constant non-stop crawl

    const startY = viewH - 6; // Starts right at bottom fade zone
    const fadeStartY = (viewH * 0.5) - trackH + 17; // Last line reaches vertical center
    const distToFadeStart = Math.max(24, startY - fadeStartY);

    const fadeOutStart = Math.ceil(distToFadeStart / speed);
    const fadeOutFrames = 66; // 1.1s smooth fade to pure black while continuing to scroll
    const totalFrames = fadeOutStart + fadeOutFrames;

    this.attract.cutStartY = startY;
    this.attract.cutSpeed = speed;
    this.attract.cutFadeOutStart = fadeOutStart;
    this.attract.cutFadeOutFrames = fadeOutFrames;
    this.attract.cutTotalFrames = totalFrames;

    if (track) {
      track.style.transform = `translateY(${startY.toFixed(1)}px)`;
    }
  },

  buildAttractCutHtml(cut) {
    let html = '';
    if (cut.body) {
      const paras = cut.body.split("\n\n");
      const bodyHtml = paras.map(p => {
        const lines = p.split("\n").join("<br>");
        return `<p class="text-[19px] sm:text-[21px] font-black leading-[1.65] tracking-wide text-[#f8f2ff] whitespace-nowrap" style="text-shadow: 0 2px 4px #000, 0 0 10px #000, 0 1px 0 #000;">${lines}</p>`;
      }).join('<div class="h-4"></div>');
      html += bodyHtml;
    }
    if (cut.punch) {
      const punchLines = cut.punch.split("\n").join("<br>");
      const mtClass = cut.punchMargin || "mt-5";
      const color = cut.punchColor || "#ff66cc";
      html += `<p class="text-[21px] sm:text-[23px] font-black leading-[1.55] tracking-wider ${mtClass} whitespace-nowrap" style="color: ${color}; text-shadow: 0 2px 6px #000, 0 0 12px ${color}b0, 0 1px 0 #000;">${punchLines}</p>`;
    }
    return html;
  },

  startAttractDemo() {
    if (this.attract.active) return;
    this.attract.active = true;
    this.attract.frame = 0;

    const titleModal = document.getElementById("titleModal");
    const attractModal = document.getElementById("attractModal");
    const curtain = document.getElementById("attractBlackCurtain");
    const fxCanvas = document.getElementById("attractFxCanvas");

    if (curtain) curtain.style.opacity = "1";
    if (fxCanvas) {
      const fxCtx = fxCanvas.getContext("2d");
      if (fxCtx) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      fxCanvas.style.transform = "scale(1)";
    }

    this.setupAttractCut(0);

    if (titleModal) {
      titleModal.classList.remove("opacity-100");
      titleModal.classList.add("opacity-0");
      setTimeout(() => {
        if (this.attract.active) {
          titleModal.classList.add("hidden");
          titleModal.classList.remove("flex");
        }
      }, 500);
    }

    if (attractModal) {
      attractModal.classList.remove("hidden", "opacity-0");
      attractModal.classList.add("flex");
      void attractModal.offsetWidth;
      attractModal.classList.add("opacity-100");
    }

    this.runAttractLoop();
  },

  stopAttractDemo() {
    if (!this.attract.active) return;
    this.attract.active = false;
    cancelAnimationFrame(this.attract.rafId);
    this.idleFrames = 0;

    const titleModal = document.getElementById("titleModal");
    const attractModal = document.getElementById("attractModal");
    const curtain = document.getElementById("attractBlackCurtain");
    const fxCanvas = document.getElementById("attractFxCanvas");
    if (curtain) curtain.style.opacity = "1";
    if (fxCanvas) {
      const fxCtx = fxCanvas.getContext("2d");
      if (fxCtx) fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
      fxCanvas.style.transform = "scale(1)";
    }

    if (attractModal) {
      attractModal.classList.remove("opacity-100");
      attractModal.classList.add("opacity-0");
      setTimeout(() => {
        attractModal.classList.add("hidden");
        attractModal.classList.remove("flex");
      }, 500);
    }

    if (titleModal && window.GameEngine && GameEngine.state && GameEngine.state.inTitle) {
      titleModal.classList.remove("hidden", "opacity-0");
      titleModal.classList.add("flex");
      void titleModal.offsetWidth;
      titleModal.classList.add("opacity-100");
    }
  },

  runAttractLoop() {
    cancelAnimationFrame(this.attract.rafId);
    const loop = () => {
      if (!this.attract.active) return;
      this.stepAttract();
      this.attract.rafId = requestAnimationFrame(loop);
    };
    this.attract.rafId = requestAnimationFrame(loop);
  },

  stepAttract() {
    this.attract.frame++;
    this.attract.cutFrame++;

    const cf = this.attract.cutFrame;
    const cutIdx = this.attract.cutIdx;
    const totalFrames = this.attract.cutTotalFrames;
    const cut = this.attractCuts[cutIdx];

    if (!cut) {
      this.stopAttractDemo();
      return;
    }

    // Advance to next cut when current cut finishes
    if (cf >= totalFrames) {
      const nextIdx = cutIdx + 1;
      if (nextIdx >= this.attractCuts.length) {
        this.stopAttractDemo();
        return;
      }
      this.setupAttractCut(nextIdx);
      return;
    }

    const curtain = document.getElementById("attractBlackCurtain");
    const bgImg = document.getElementById("attractBgImg");
    const track = document.getElementById("attractScrollTrack");

    // 1. Black curtain fade:
    // Fade in from black over 48 frames (0.8s)
    // Fade out to black over cutFadeOutFrames (66f = 1.1s)
    const fadeOutStart = this.attract.cutFadeOutStart;
    const fadeOutFrames = this.attract.cutFadeOutFrames || 66;
    let alpha;
    if (cf < 48) {
      alpha = 1.0 - (cf / 48);
    } else if (cf < fadeOutStart) {
      alpha = 0.0;
    } else {
      alpha = Math.min(1.0, (cf - fadeOutStart) / fadeOutFrames);
    }
    if (curtain) curtain.style.opacity = alpha.toFixed(3);

    // 2. Subtle zoom:
    const progress = Math.min(1.0, cf / totalFrames);
    if (bgImg) {
      if (cut.zoom) {
        bgImg.style.transform = `scale(${(1.0 + 0.045 * progress).toFixed(4)})`;
      } else {
        bgImg.style.transform = "scale(1)";
      }
    }

    // 3. Continuous non-stop scroll (never pauses during fade-in or fade-out!):
    if (track) {
      const curY = this.attract.cutStartY - cf * this.attract.cutSpeed;
      track.style.transform = `translateY(${curY.toFixed(1)}px)`;
    }

    // 4. Render Retro 16-Bit Electromagnetic Crackle FX (Cut 3)
    this.renderAttractFx(cutIdx, progress, this.attract.frame);
  },

  renderAttractFx(cutIdx, progress, f) {
    const canvas = document.getElementById("attractFxCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (cutIdx !== 3) {
      canvas.style.transform = "scale(1)";
      return;
    }

    // Apply the same subtle zoom as Cut 3 bgImg so lightning arcs stay locked to the Silver-Ball
    const zoomStr = (1.0 + 0.045 * progress).toFixed(4);
    canvas.style.transform = `scale(${zoomStr})`;

    // Re-seed every 4 frames (15fps authentic MSX2/PC-Engine cadence)
    let seed = (Math.floor(f / 4) * 1664525 + 1013904223) >>> 0;
    const rnd = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed >>> 0) / 4294967296;
    };

    // Jagged lightning bolt drawing helper (NO shadowBlur!)
    const drawBolt = (pts, outerColor, innerColor = "#ffffff") => {
      if (pts.length < 2) return;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "miter";
      // Outer thick stroke (4.5px)
      ctx.strokeStyle = outerColor;
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // Inner crisp core (1.8px)
      ctx.strokeStyle = innerColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
    };

    // 1. 5-6 jagged multi-segment lightning bolts around Silver-Ball center (384, 831) at radius 157..194px
    const cx = 384, cy = 831;
    const numBolts = 5 + Math.floor(rnd() * 2); // 5 or 6 bolts
    for (let b = 0; b < numBolts; b++) {
      const startAngle = rnd() * Math.PI * 2;
      const arcSpan = (0.35 + rnd() * 0.45) * (rnd() > 0.5 ? 1 : -1);
      const segs = 6 + Math.floor(rnd() * 3); // 6..8 segments
      const baseR = 157 + rnd() * 37; // 157..194px
      const pts = [];
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const a = startAngle + arcSpan * t;
        const rJitter = (s === 0 || s === segs) ? 0 : (rnd() - 0.5) * 25;
        const r = Math.max(139, Math.min(212, baseR + rJitter));
        pts.push({
          x: cx + Math.cos(a) * r,
          y: cy + Math.sin(a) * r
        });
      }
      const outerColor = (b % 2 === 0) ? "rgba(255, 190, 40, 0.85)" : "rgba(0, 245, 232, 0.80)";
      drawBolt(pts, outerColor, "#ffffff");
    }

    // 2. 2 small crackling cyan/yellow arcs at the twin upper paddle cannon tips (293, 436) and (475, 436)
    const tips = [{ x: 293, y: 436 }, { x: 475, y: 436 }];
    tips.forEach((tip, idx) => {
      const tipAngle = -Math.PI / 2 + (rnd() - 0.5) * 1.6;
      const tipLen = 26 + rnd() * 22;
      const tipSegs = 4;
      const pts = [];
      for (let s = 0; s <= tipSegs; s++) {
        const t = s / tipSegs;
        const jx = (s > 0 && s < tipSegs) ? (rnd() - 0.5) * 14 : 0;
        const jy = (s > 0 && s < tipSegs) ? (rnd() - 0.5) * 14 : 0;
        pts.push({
          x: tip.x + Math.cos(tipAngle) * tipLen * t + jx,
          y: tip.y + Math.sin(tipAngle) * tipLen * t + jy
        });
      }
      const color = (idx === 0) ? "rgba(0, 245, 232, 0.85)" : "rgba(255, 190, 40, 0.85)";
      drawBolt(pts, color, "#ffffff");
    });

    // 3. Subtle pulsing cyan highlight along the Silver-Ball's visor slit (302, 915) to (466, 915)
    const visorAlpha = 0.45 + 0.35 * Math.sin(f * 0.22);
    ctx.save();
    ctx.lineCap = "round";
    // Outer glow line (5.0px)
    ctx.strokeStyle = `rgba(0, 245, 232, ${visorAlpha.toFixed(2)})`;
    ctx.lineWidth = 5.0;
    ctx.beginPath();
    ctx.moveTo(302, 915);
    ctx.lineTo(466, 915);
    ctx.stroke();
    // Inner crisp core (1.8px)
    ctx.strokeStyle = `rgba(255, 255, 255, ${(visorAlpha * 0.95).toFixed(2)})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(306, 915);
    ctx.lineTo(462, 915);
    ctx.stroke();

    // Micro-spark along the slit
    if (rnd() > 0.35) {
      const sparkX = 320 + rnd() * 128;
      const sparkPts = [
        { x: sparkX - 8, y: 915 },
        { x: sparkX, y: 915 + (rnd() > 0.5 ? -7 : 7) },
        { x: sparkX + 8, y: 915 }
      ];
      drawBolt(sparkPts, "rgba(255, 190, 40, 0.9)", "#ffffff");
    }
    ctx.restore();
  },

  jumpAttractCut(cutIdx = 0, progress = 0.5) {
    if (!this.attract.active) {
      this.startAttractDemo();
    }
    this.setupAttractCut(cutIdx);
    this.attract.cutFrame = Math.floor(this.attract.cutTotalFrames * progress);
    this.stepAttract();
  },

  openRankingModal() {
    this.resetIdleTimer();
    const modal = document.getElementById("rankingModal");
    if (modal) {
      this.renderHighScoresTable("rankingHighScoresTable");
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      void modal.offsetWidth;
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    }
  },

  closeRankingModal() {
    this.resetIdleTimer();
    const modal = document.getElementById("rankingModal");
    if (modal) {
      modal.classList.remove("opacity-100");
      modal.classList.add("opacity-0");
      setTimeout(() => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
      }, 200);
    }
  },

  renderHighScoresTable(tableId, highlightIdx = -1) {
    const tableEl = document.getElementById(tableId);
    if (!tableEl) return;
    const scores = this.getHighScores();
    tableEl.innerHTML = "";

    scores.forEach((entry, idx) => {
      const isHl = idx === highlightIdx;
      const row = document.createElement("div");
      row.className = `flex items-center justify-between px-2 py-1 rounded text-[9px] font-mono ${
        isHl ? "bg-[#e6ff00]/25 border border-[#e6ff00] text-[#e6ff00] font-black animate-pulse" : "text-gray-200 border-b border-white/10"
      }`;
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : ` ${idx + 1}.`;
      row.innerHTML = `
        <div class="flex items-center gap-1.5 truncate">
          <span class="w-4 text-center shrink-0">${medal}</span>
          <span class="font-bold truncate">${entry.name}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[8px] px-1 rounded bg-[#ff1493]/30 font-bold text-[#ff66b2]">${entry.rank || "S"}</span>
          <span class="text-[#00f5d4] font-black">${entry.score.toLocaleString()}</span>
        </div>
      `;
      tableEl.appendChild(row);
    });
  },

  // -------------------------------------------------------------------------
  // Game Over Screen
  // -------------------------------------------------------------------------
  showGameOver(state) {
    state.gameOver = true;
    state.inTitle = false;
    state.inEnding = false;

    const modal = document.getElementById("gameOverModal");
    if (!modal) return;

    const finalStageName = state.phase === 3 ? "熾天使セラフィア (FINAL)" : "エル＆ノエル (FINAL)";
    const stageNames = ["リリス (STAGE 1)", "セルティ (STAGE 2)", "ノア (STAGE 3)", "カスミ (STAGE 4)", finalStageName];
    const curStageName = stageNames[(state.stageIndex || 1) - 1] || "STAGE 1";

    const stageEl = document.getElementById("gameOverStage");
    if (stageEl) stageEl.textContent = `STAGE ${state.stageIndex || 1}: ${curStageName}`;

    const peakEl = document.getElementById("gameOverPeakScore");
    if (peakEl) peakEl.textContent = (state.peakScore || state.score || 0).toLocaleString();

    const missesEl = document.getElementById("gameOverMisses");
    if (missesEl) missesEl.textContent = String(state.totalMisses || 0);

    const btnPracRetry = document.getElementById("btnGameOverPracticeRetry");
    if (btnPracRetry) {
      if (state.gameMode === "practice") {
        btnPracRetry.classList.remove("hidden");
      } else {
        btnPracRetry.classList.add("hidden");
      }
    }

    modal.classList.remove("hidden");
    modal.classList.add("flex");
    void modal.offsetWidth;
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
  },

  // -------------------------------------------------------------------------
  // 3-Act DoDonPachi ➔ Ultraman Launch Ending Sequence (Metal Gear Codec Parody)
  // -------------------------------------------------------------------------
  initEndingCanvas() {
    const c = document.getElementById("endingCanvas");
    if (c) {
      this.ending.canvas = c;
      this.ending.ctx = c.getContext("2d");
    }

    this.ending.launchImg = new Image();
    this.ending.launchImg.src = "./assets/ui/ending_launch.jpg?v=183";
    this.ending.launchImg.onload = () => {
      this.ending.launchImgLoaded = true;
    };
  },

  startEnding(state) {
    state.inEnding = true;
    state.inTitle = false;
    state.gameOver = false;
    this.hideAllModals();

    const skipBtn = document.getElementById("btnEndingSkip");
    if (skipBtn) skipBtn.classList.remove("hidden");

    const modal = document.getElementById("endingModal");
    if (modal) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      void modal.offsetWidth;
      modal.classList.remove("opacity-0");
      modal.classList.add("opacity-100");
    }

    this.ending.act = 1;
    this.ending.beat = 0;
    this.ending.tick = 0;
    this.ending.launchPanY = 0;
    this.ending.launchFlash = 0;
    this.ending.launchParticles = [];

    // Classic Transceiver Ring "ピロリロリン♪ ピロリロリン♪"
    if (window.sfx && window.sfx.codecRing) window.sfx.codecRing();

    setTimeout(() => {
      if (window.sfx && window.sfx.codecOpen) window.sfx.codecOpen();
    }, 550);

    this.showEndingAct1Beat(0);
    this.startEndingLoop();
  },

  advanceEnding() {
    if (this.ending.act === 1) {
      this.ending.beat++;
      if (this.ending.beat <= 2) {
        if (window.sfx && window.sfx.flip) window.sfx.flip();
        this.showEndingAct1Beat(this.ending.beat);
      } else {
        // Close Codec and launch fleet!
        if (window.sfx && window.sfx.codecClose) window.sfx.codecClose();
        this.showEndingAct2();
      }
    }
  },

  skipEnding() {
    if (window.sfx && window.sfx.codecClose) window.sfx.codecClose();
    this.showEndingAct3();
  },

  showEndingAct1Beat(beatIdx) {
    this.ending.beat = beatIdx;
    const act1Box = document.getElementById("endingAct1");
    const act2Box = document.getElementById("endingAct2");
    const act3Box = document.getElementById("endingAct3");
    if (act1Box) act1Box.classList.remove("hidden");
    if (act2Box) act2Box.classList.add("hidden");
    if (act3Box) act3Box.classList.add("hidden");

    const beats = [
      {
        text: `司令官「――諸君、実にご苦労だった。<br>これにて対異星体・最終迎撃演習『計画名：ボン・ボヤージュ』全行程を終了する。」`,
        btn: "通信を進める ▶"
      },
      {
        text: `司令官「……何？ なぜ急に某戦術諜報無線のような画面なのかだと？ 細かいことは気にするな、通信費の節約だ！！」<br><br>司令官「それより聞け！ 貴官が戦った『美少女戦艦群の襲来』はAIが見せていた演習だが――<span class="text-[#e6ff00] font-black">彼女たち『桃色装甲艦隊』5隻は軌道ドックに実在する！！</span>」`,
        btn: "通信を進める ▶"
      },
      {
        text: `司令官「人類滅亡の危機という極限状態での激突データこそが、彼女たちの戦闘AIを完成させる『最終実戦チューニング』だったのだ！<br><br><span class="text-[#00f5e8] font-black">調律率100%……これより貴官に全艦の指揮権を委譲する。本物の異星艦隊へ向かい、全艦、出撃せよ！！</span>」`,
        btn: "通信終了 ➔ 全艦、出撃！！ ▶"
      }
    ];

    const cur = beats[beatIdx] || beats[0];
    const dialogEl = document.getElementById("codecDialogueText");
    if (dialogEl) {
      dialogEl.innerHTML = cur.text;
    }

    const nextBtn = document.getElementById("btnEndingNext");
    if (nextBtn) {
      nextBtn.textContent = cur.btn;
    }
  },

  showEndingAct2() {
    this.ending.act = 2;
    this.ending.act2Frame = 0;
    this.ending.launchPanY = 0;
    this.ending.launchFlash = 1.0;

    const act1Box = document.getElementById("endingAct1");
    const act2Box = document.getElementById("endingAct2");
    const act3Box = document.getElementById("endingAct3");
    if (act1Box) act1Box.classList.add("hidden");
    if (act3Box) act3Box.classList.add("hidden");

    if (act2Box) {
      act2Box.classList.remove("hidden");
      act2Box.classList.remove("opacity-100");
      act2Box.classList.add("opacity-0");
      setTimeout(() => {
        if (this.ending.act === 2) {
          act2Box.classList.remove("opacity-0");
          act2Box.classList.add("opacity-100");
        }
      }, 1100);
    }

    // Spawn 32 rising plasma launch contrails & stars
    this.ending.launchParticles = Array.from({ length: 32 }, (_, i) => ({
      x: 30 + Math.random() * 360,
      y: 420 + Math.random() * 240,
      vy: -3.5 - Math.random() * 6.0,
      len: 25 + Math.random() * 45,
      width: 1.5 + Math.random() * 2.5,
      color: ["#ff2ad4", "#00f5e8", "#e6ff00", "#ffffff"][i % 4],
      alpha: 0.6 + Math.random() * 0.4
    }));

    if (window.sfx && window.sfx.ultramanLaunch) {
      window.sfx.ultramanLaunch();
    }
  },

  showEndingAct3() {
    this.ending.act = 3;
    const act1Box = document.getElementById("endingAct1");
    const act2Box = document.getElementById("endingAct2");
    const act3Box = document.getElementById("endingAct3");
    if (act1Box) act1Box.classList.add("hidden");
    if (act2Box) act2Box.classList.add("hidden");
    if (act3Box) act3Box.classList.remove("hidden");

    const skipBtn = document.getElementById("btnEndingSkip");
    if (skipBtn) skipBtn.classList.add("hidden");

    const state = (window.GameEngine && GameEngine.state) || {};
    const finalScore = state.score || 0;
    const totalMiss = state.totalMisses || 0;
    const isNoMiss = totalMiss === 0;

    let awardedScore = finalScore;
    if (isNoMiss && !state._perfectBonusAwarded) {
      state._perfectBonusAwarded = true;
      awardedScore += 200000;
      state.score = awardedScore;
    }

    const rank = this.computeRank(awardedScore);

    const scoreEl = document.getElementById("endingFinalScore");
    if (scoreEl) scoreEl.textContent = awardedScore.toLocaleString();

    const missEl = document.getElementById("endingTotalMiss");
    if (missEl) missEl.textContent = String(totalMiss);

    const noMissEl = document.getElementById("endingNoMissBanner");
    if (noMissEl) {
      if (isNoMiss) noMissEl.classList.remove("hidden");
      else noMissEl.classList.add("hidden");
    }

    const rankBadge = document.getElementById("endingRankBadge");
    if (rankBadge) {
      rankBadge.textContent = rank;
      const rankCols = {
        SSS: "text-[#e6ff00] bg-[#e6ff00]/20 border-[#e6ff00] shadow-[0_0_12px_#e6ff00]",
        SS:  "text-[#00f5e8] bg-[#00f5e8]/20 border-[#00f5e8]",
        S:   "text-[#ff66cc] bg-[#ff66cc]/20 border-[#ff66cc]",
        A:   "text-[#39ff14] bg-[#39ff14]/20 border-[#39ff14]",
        B:   "text-[#d6c4ff] bg-[#d6c4ff]/20 border-[#d6c4ff]",
        C:   "text-gray-400 bg-gray-800 border-gray-600"
      };
      rankBadge.className = `text-lg font-black px-3 py-1 rounded border tracking-widest ${rankCols[rank] || rankCols.B}`;
    }

    this.renderHighScoresTable("endingHighScoresTable");
  },

  registerEndingScore() {
    const input = document.getElementById("endingCallsignInput");
    const name = input ? input.value : "ADMIRAL";
    const state = (window.GameEngine && GameEngine.state) || {};
    const rank = this.computeRank(state.score || 0);

    const newIdx = this.saveHighScore(name, state.score || 0, rank);
    this.renderHighScoresTable("endingHighScoresTable", newIdx);

    const regBtn = document.getElementById("btnEndingRegister");
    if (regBtn) {
      regBtn.disabled = true;
      regBtn.textContent = "登録完了 ✔";
      regBtn.className = "px-3 py-1 rounded bg-gray-700 text-gray-400 text-[9.5px] font-bold cursor-default shrink-0";
    }
    if (input) input.disabled = true;
  },

  // -------------------------------------------------------------------------
  // Ending Canvas Animation Loop
  // -------------------------------------------------------------------------
  startEndingLoop() {
    cancelAnimationFrame(this.ending.rafId);
    const loop = () => {
      const state = window.GameEngine && GameEngine.state;
      if (!state || !state.inEnding) return;
      this.renderEndingCanvas();
      this.ending.rafId = requestAnimationFrame(loop);
    };
    this.ending.rafId = requestAnimationFrame(loop);
  },

  updateCodecSignalBars() {
    const container = document.getElementById("codecSignalBars");
    if (!container) return;
    if (container.children.length === 0) {
      container.innerHTML = Array.from({ length: 8 }, () => `<div class="flex-1 bg-[#34ff8a] rounded-xs transition-all duration-75" style="height: 4px"></div>`).join("");
    }
    const isTalking = this.ending.act === 1 && Math.random() < 0.75;
    Array.from(container.children).forEach((bar) => {
      const h = isTalking ? (4 + Math.floor(Math.random() * 18)) : 4;
      bar.style.height = `${h}px`;
      bar.style.opacity = isTalking ? "1.0" : "0.35";
    });
  },

  renderEndingCanvas() {
    const ctx = this.ending.ctx;
    const c = this.ending.canvas;
    if (!ctx || !c) return;

    this.ending.tick++;
    const t = this.ending.tick;
    const W = c.width;
    const H = c.height;

    // ACT 1: Metal Gear Solid / MSX2 Codec Transceiver screen
    if (this.ending.act === 1) {
      ctx.fillStyle = "#020b06";
      ctx.fillRect(0, 0, W, H);
      if (t % 3 === 0) this.updateCodecSignalBars();
    }

    // ACT 2: "ジョワッ！！" Ultraman-Style Fleet Launch
    else if (this.ending.act === 2) {
      this.ending.act2Frame = (this.ending.act2Frame || 0) + 1;
      const progress = Math.min(1.0, this.ending.act2Frame / 90);
      const scale = 1.06 - 0.06 * progress;

      if (this.ending.launchImgLoaded && this.ending.launchImg.complete) {
        const dw = W * scale;
        const dh = H * scale;
        const dx = (W - dw) * 0.5;
        const dy = H - dh; // Bottom pinned so Earth is 100% visible inside y = 0..660!
        ctx.drawImage(this.ending.launchImg, dx, dy, dw, dh);
      } else {
        ctx.fillStyle = "#030214";
        ctx.fillRect(0, 0, W, H);
        const eGrad = ctx.createRadialGradient(210, 720, 20, 210, 720, 320);
        eGrad.addColorStop(0, "#4da6ff");
        eGrad.addColorStop(0.4, "#0055ff");
        eGrad.addColorStop(1, "#030214");
        ctx.fillStyle = eGrad;
        ctx.beginPath();
        ctx.arc(210, 720, 320, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.save();
      this.ending.launchParticles.forEach(p => {
        p.y += p.vy;
        if (p.y < -p.len) {
          p.y = H + 20;
          p.x = 20 + Math.random() * (W - 40);
        }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.width;
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x, p.y + p.len);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = p.width * 0.4;
        ctx.stroke();
      });
      ctx.restore();

      if (this.ending.launchFlash > 0.01) {
        this.ending.launchFlash *= 0.88;
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${this.ending.launchFlash.toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // ACT 3: Starfield background for Final Score & Evaluation
    else if (this.ending.act === 3) {
      ctx.fillStyle = "#07021a";
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 107 + t * 0.4) % W);
        const sy = ((i * 73 + t * 0.2) % H);
        const sz = (i % 3) + 1;
        ctx.fillStyle = i % 2 === 0 ? "#00f5e8" : "#ff2ad4";
        ctx.globalAlpha = 0.4 + 0.3 * Math.sin(t * 0.05 + i);
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.restore();
    }
  },

  hideAllModals() {
    ["titleModal", "attractModal", "rankingModal", "menuModal", "gameOverModal", "endingModal", "clearModal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("opacity-100", "flex");
        el.classList.add("opacity-0", "hidden");
      }
    });
    cancelAnimationFrame(this.ending.rafId);
  }
};

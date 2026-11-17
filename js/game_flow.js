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
      image: "./assets/ui/story_1.jpg?v=190",
      zoom: true,
      body: "西暦2098年――\n\n太陽系外縁・冥王星軌道上に\n謎の超重力反応が出現。\n\n迎え撃った地球統合防衛艦隊は\nわずか数時間で壊滅した。",
      punch: ""
    },
    {
      image: "./assets/ui/story_2.jpg?v=190",
      zoom: false,
      body: "人類を恐怖のどん底へ\n叩き落とした謎の勢力……",
      punch: "侵略者は、\n桃色装甲艦隊であった。",
      punchColor: "#ff66cc",
      punchMargin: "mt-6"
    },
    {
      image: "./assets/ui/story_3.jpg?v=190",
      zoom: true,
      body: "艦隊を包む\n『柔軟位相フィールド』は\nあらゆるレーザーや\n核ミサイルを無効化。\n\n障壁を貫けるのは、超運動量による\n「直接打撃」のみであった。",
      punch: ""
    },
    {
      image: "./assets/ui/story_4.jpg?v=190",
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
    const q = (window.StageCommon && StageCommon.ASSET_QUERY) || "";
    this.attractImages = [1, 2, 3, 4].map(idx => {
      const img = new Image();
      img.src = `./assets/ui/story_${idx}.jpg${q}`;
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
    const btnBottomEndingAction = document.getElementById("btnBottomEndingAction");
    if (btnBottomEndingAction) {
      btnBottomEndingAction.addEventListener("click", () => {
        if (this.ending.act === 1) {
          this.advanceEnding();
        } else if (this.ending.act === 2) {
          this.showEndingAct3();
        } else if (this.ending.act === 3) {
          this.showTitle();
        }
      });
    }

    const btnEndingSkip = document.getElementById("btnEndingSkip");
    if (btnEndingSkip) {
      btnEndingSkip.addEventListener("click", () => {
        this.skipEnding();
      });
    }

    const codecDialogueText = document.getElementById("codecDialogueText");
    if (codecDialogueText) {
      codecDialogueText.addEventListener("click", () => {
        if (this.ending.act === 1) this.advanceEnding();
      });
    }

    const btnEndingRegister = document.getElementById("btnEndingRegister");
    if (btnEndingRegister) {
      btnEndingRegister.addEventListener("click", () => {
        this.registerEndingScore();
      });
    }

    // Global Key Listener for Title / Ending (Space / Enter)
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
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
        if (this.ending.act === 1) {
          e.preventDefault();
          this.advanceEnding();
        } else if (this.ending.act === 2) {
          e.preventDefault();
          this.showEndingAct3();
        }
      }
    });
  },

  // -------------------------------------------------------------------------
  // Title Screen & Idle Attract-Mode
  // -------------------------------------------------------------------------
  showTitle() {
    clearTimeout(this.ending.typeTimer);
    this.ending.isTyping = false;
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

    const elCache = this._attractEls || (this._attractEls = {
      curtain: document.getElementById("attractBlackCurtain"),
      bgImg: document.getElementById("attractBgImg"),
      track: document.getElementById("attractScrollTrack"),
      fxCanvas: document.getElementById("attractFxCanvas")
    });
    const curtain = elCache.curtain;
    const bgImg = elCache.bgImg;
    const track = elCache.track;

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
    const elCache = this._attractEls;
    const canvas = (elCache && elCache.fxCanvas) || document.getElementById("attractFxCanvas");
    if (!canvas) return;
    const ctx = this._attractFxCtx || (this._attractFxCtx = canvas.getContext("2d"));
    if (!ctx) return;

    if (cutIdx !== 3) {
      if (!this._attractFxCleared) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.transform = "scale(1)";
        this._attractFxCleared = true;
      }
      return;
    }
    this._attractFxCleared = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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
      if (window.UI && UI.openModal) UI.openModal(modal);
    }
  },

  closeRankingModal() {
    this.resetIdleTimer();
    if (window.UI && UI.closeModal) UI.closeModal("rankingModal");
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

    const idx = state.stageIndex || 1;
    const meta = window.GameEngine && GameEngine.getStageMeta ? GameEngine.getStageMeta(idx) : null;
    const curStageName = (idx === 5 && state.phase === 3)
      ? "熾天使セラフィア (FINAL)"
      : (meta ? meta.displayName : "STAGE 1");

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

    if (window.UI && UI.openModal) UI.openModal(modal);
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
    const q = (window.StageCommon && StageCommon.ASSET_QUERY) || "";
    this.ending.launchImg.src = `./assets/ui/ending_launch.jpg${q}`;
    this.ending.launchImg.onload = () => {
      this.ending.launchImgLoaded = true;
    };
  },

  startEnding(state) {
    state.inEnding = true;
    state.inTitle = false;
    state.gameOver = false;
    this.hideAllModals();
    if (window.UI && UI.updateScreenMode) UI.updateScreenMode(state);

    const skipBtn = document.getElementById("btnEndingSkip");
    if (skipBtn) skipBtn.classList.remove("hidden");

    if (window.UI && UI.openModal) UI.openModal("endingModal");

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
      if (this.ending.isTyping) {
        this.finishEndingTyping();
        return;
      }
      this.ending.beat++;
      if (this.ending.beat <= 4) {
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
    clearTimeout(this.ending.typeTimer);
    this.ending.isTyping = false;
    if (window.sfx && window.sfx.codecClose) window.sfx.codecClose();
    this.showEndingAct3();
  },

  setCodecSpeakerVisual(speaker) {
    const leftBox = document.getElementById("codecLeftBox");
    const rightBox = document.getElementById("codecRightBox");
    const leftImg = document.getElementById("codecLeftPortraitImg");
    const leftLabel = document.getElementById("codecLeftLabel");

    if (speaker === "elon") {
      if (leftImg && !leftImg.getAttribute("src").includes("dr_elon.jpg?v=193")) {
        leftImg.style.display = "";
        leftImg.src = "./assets/ui/dr_elon.jpg?v=193";
        leftImg.alt = "Dr. Elon";
      }
      if (leftLabel) leftLabel.textContent = "[DR. ELON]";
    } else if (speaker === "colonel") {
      if (leftImg && !leftImg.getAttribute("src").includes("commander.jpg?v=193")) {
        leftImg.style.display = "";
        leftImg.src = "./assets/ui/commander.jpg?v=193";
        leftImg.alt = "Colonel";
      }
      if (leftLabel) leftLabel.textContent = "[COLONEL]";
    }

    const isRightActive = speaker === "ball";
    if (leftBox) {
      leftBox.classList.toggle("opacity-50", isRightActive);
      leftBox.classList.toggle("opacity-100", !isRightActive);
    }
    if (rightBox) {
      rightBox.classList.toggle("opacity-50", !isRightActive);
      rightBox.classList.toggle("opacity-100", isRightActive);
    }
  },

  getCodecSpeakerMeta(speaker) {
    if (speaker === "elon") return { name: "【エローン博士】", cls: "text-[#e6ff00] font-black text-[13px] sm:text-[14px] tracking-wider" };
    if (speaker === "ball") return { name: "【シルバーボール】", cls: "text-[#00f5e8] font-black text-[13px] sm:text-[14px] tracking-wider" };
    return { name: "【大佐】", cls: "text-[#9effc4] font-black text-[13px] sm:text-[14px] tracking-wider" };
  },

  wrapCodecSegments(segments, maxW = 22) {
    const charW = (ch) => (/[\x00-\x7F]/.test(ch) ? 0.55 : 1.0);
    const strW = (s) => {
      let w = 0;
      for (const ch of s) w += charW(ch);
      return w;
    };
    const segInst = (typeof Intl !== "undefined" && Intl.Segmenter)
      ? new Intl.Segmenter("ja", { granularity: "word" })
      : null;
    const tokenize = (text) => {
      const protectedRe = /(『[^』]{1,14}』|――|……|異星人|異星艦隊|桃色装甲艦隊|最終迎撃演習|最終テスト|戦闘AI|美少女艦隊学|軌道ドック|シルバーボール|エローン博士|ボン・ボヤージュ|[0-9]+隻|[ァ-ヶー・]{2,}|[A-Za-z0-9%％]+)/g;
      const raw = [];
      let last = 0;
      const pushPlain = (str) => {
        if (!str) return;
        if (segInst) {
          for (const s of segInst.segment(str)) raw.push(s.segment);
        } else {
          for (const ch of str) raw.push(ch);
        }
      };
      for (const m of text.matchAll(protectedRe)) {
        if (m.index > last) pushPlain(text.slice(last, m.index));
        raw.push(m[0]);
        last = m.index + m[0].length;
      }
      if (last < text.length) pushPlain(text.slice(last));

      const NO_START = /^[、。！？…・ー―：』」）】〉》っゃゅょぁぃぅぇぉッャュョァィゥェォ%％]/;
      const NO_END = /[『「（【〈《]$/;
      const merged = [];
      for (const tok of raw) {
        if (merged.length > 0 && NO_START.test(tok) && !merged[merged.length - 1].endsWith("\n")) {
          merged[merged.length - 1] += tok;
        } else if (merged.length > 0 && NO_END.test(merged[merged.length - 1])) {
          merged[merged.length - 1] += tok;
        } else {
          merged.push(tok);
        }
      }
      return merged;
    };

    let col = 0;
    let prevEndedWithNewline = false;
    return segments.map((seg, segIdx) => {
      if (!seg.inline) {
        col = 0;
        prevEndedWithNewline = false;
      }
      const tokens = tokenize(seg.text);
      const nextSeg = segments[segIdx + 1];
      const hasMoreInSameLine = !!(nextSeg && nextSeg.inline);
      let out = "";
      tokens.forEach((tok, tIdx) => {
        if (tok === "\n") {
          const alreadyNewline = out.endsWith("\n") || (out.length === 0 && prevEndedWithNewline);
          if (!alreadyNewline && (out.length > 0 || seg.inline)) {
            out += "\n";
          }
          col = 0;
          return;
        }
        if (col === 0 && tok === " ") return;
        const w = strW(tok);
        if (col > 0 && col + w > maxW) {
          out += "\n";
          col = 0;
          if (tok === " ") return;
        }
        out += tok;
        col += w;
        const isLastTok = (tIdx === tokens.length - 1) && !hasMoreInSameLine;
        const nextTok = tokens[tIdx + 1];
        if (!isLastTok && /[。！？]$/.test(tok) && nextTok !== "\n") {
          out += "\n";
          col = 0;
        }
      });
      if (out.length > 0) {
        prevEndedWithNewline = out.endsWith("\n");
      }
      return { ...seg, text: out };
    });
  },

  finishEndingTyping() {
    clearTimeout(this.ending.typeTimer);
    this.ending.isTyping = false;
    const dialogEl = document.getElementById("codecDialogueText");
    const segs = this.ending.currentSegments || [];
    if (dialogEl) {
      dialogEl.innerHTML = "";
      let bodyBox = null;
      segs.forEach((s, idx) => {
        if (!s.inline) {
          const meta = this.getCodecSpeakerMeta(s.speaker);
          const hdr = document.createElement("div");
          hdr.className = idx > 0 ? `${meta.cls} mt-1.5` : meta.cls;
          hdr.textContent = meta.name;
          dialogEl.appendChild(hdr);

          bodyBox = document.createElement("div");
          bodyBox.className = "pl-5 whitespace-pre-wrap";
          dialogEl.appendChild(bodyBox);
        }
        const sp = document.createElement("span");
        if (s.cls) sp.className = s.cls;
        sp.textContent = s.text;
        if (bodyBox) bodyBox.appendChild(sp);
      });
      dialogEl.scrollTop = dialogEl.scrollHeight;
    }
    if (segs.length > 0) {
      this.setCodecSpeakerVisual(segs[segs.length - 1].speaker);
    }
  },

  showEndingAct1Beat(beatIdx) {
    clearTimeout(this.ending.typeTimer);
    this.ending.beat = beatIdx;
    const act1Box = document.getElementById("endingAct1");
    const act2Box = document.getElementById("endingAct2");
    const act3Box = document.getElementById("endingAct3");
    if (act1Box) act1Box.classList.remove("hidden");
    if (act2Box) act2Box.classList.add("hidden");
    if (act3Box) act3Box.classList.add("hidden");

    const beats = [
      {
        segments: [
          { speaker: "colonel", text: "――ご苦労だった。これにて対異星人・最終迎撃演習『計画名：ボン・ボヤージュ』\n全行程を終了する。" },
          { speaker: "ball", text: "……待ってくれ大佐\n『演習』ってのはどういうことだ！？" }
        ],
        btn: "通信を進める ▶"
      },
      {
        segments: [
          { speaker: "colonel", text: "まだ気づかんのか。あんな格好をして異星人が攻めてくるわけがないだろう。" },
          { speaker: "ball", text: "……計ったな、大佐！" },
          { speaker: "colonel", text: "それより聞け！\n貴官が戦った仮想空間の『桃色装甲艦隊』5隻は\nエローン博士によって開発され――" },
          { speaker: "colonel", inline: true, pauseMs: 450, cls: "text-[#e6ff00] font-black", text: "\n軌道ドックに実在する！！" }
        ],
        btn: "通信を進める ▶"
      },
      {
        segments: [
          { speaker: "ball", text: "おい、なんだって大佐\nそれはどういうことだ！" },
          { speaker: "elon", text: "その件については私が説明するわ。" },
          { speaker: "ball", text: "……あんたは誰だ？" }
        ],
        btn: "通信を進める ▶"
      },
      {
        segments: [
          { speaker: "elon", text: "英雄にお目にかかれて光栄だわ。私はエローン。大学で『美少女艦隊学』を専攻していたの。\n今は軍に従事して、桃色装甲艦隊の開発を\n任されているわ。" },
          { speaker: "colonel", text: "博士は美少女を扱うのがうまい。君もあの見事なギミックを見ただろう。" },
          { speaker: "elon", text: "人類滅亡の危機という極限状態での衝突。\nそのデータこそが、彼女たちを完成させる\n最終テストだったのよ。" }
        ],
        btn: "通信を進める ▶"
      },
      {
        segments: [
          { speaker: "colonel", text: "……そういうことだ。全5隻の覚醒率は100%に達した。" },
          { speaker: "colonel", inline: true, cls: "text-[#e6ff00] font-black", text: "\n彼女たちを隅々まで探り尽くした貴官に" },
          { speaker: "colonel", inline: true, text: "\n全艦の指揮権を委譲する。" },
          { speaker: "ball", text: "くそっ、やっぱり計ったな。\n……面白くなってきやがったぜ！" },
          { speaker: "colonel", cls: "text-[#00f5e8] font-black", text: "今度こそ本物の異星艦隊が相手だ。頼んだぞ、シルバーボール。\n――全艦、出撃せよ！！" }
        ],
        btn: "通信終了 ➔ 全艦、出撃！！ ▶"
      }
    ];

    const cur = beats[beatIdx] || beats[0];
    const wrappedSegments = this.wrapCodecSegments(cur.segments, 22);
    this.ending.currentSegments = wrappedSegments;
    this.updateEndingBottomButton(cur.btn, "codec");

    const dialogEl = document.getElementById("codecDialogueText");
    if (!dialogEl) return;
    dialogEl.innerHTML = "";

    let segIdx = 0;
    let charIdx = 0;
    let currentBodyBox = null;
    let currentSpan = null;
    this.ending.isTyping = true;

    const initSegmentNode = (seg, idx) => {
      if (!seg.inline) {
        const meta = this.getCodecSpeakerMeta(seg.speaker);
        const hdr = document.createElement("div");
        hdr.className = idx > 0 ? `${meta.cls} mt-1.5` : meta.cls;
        hdr.textContent = meta.name;
        dialogEl.appendChild(hdr);

        currentBodyBox = document.createElement("div");
        currentBodyBox.className = "pl-5 whitespace-pre-wrap";
        dialogEl.appendChild(currentBodyBox);
      }
      const sp = document.createElement("span");
      if (seg.cls) sp.className = seg.cls;
      if (currentBodyBox) currentBodyBox.appendChild(sp);
      this.setCodecSpeakerVisual(seg.speaker);
      return sp;
    };

    currentSpan = initSegmentNode(wrappedSegments[0], 0);

    const stepType = () => {
      if (this.ending.act !== 1 || !this.ending.isTyping) return;
      const seg = wrappedSegments[segIdx];
      if (!seg) {
        this.ending.isTyping = false;
        return;
      }

      if (charIdx < seg.text.length) {
        const ch = seg.text[charIdx++];
        currentSpan.textContent += ch;
        dialogEl.scrollTop = dialogEl.scrollHeight;

        if (ch === "\n") {
          this.ending.typeTimer = setTimeout(stepType, 0);
          return;
        }

        if (!/[\s、。「」『』！？」]/.test(ch)) {
          if (window.sfx && window.sfx.codecSpeakBlip) {
            window.sfx.codecSpeakBlip(seg.speaker);
          }
        }

        const isPunct = /[、。！？…]/.test(ch);
        let delay;
        if (seg.speaker === "elon") {
          delay = isPunct ? 150 : 56;
        } else if (seg.speaker === "colonel") {
          delay = isPunct ? 230 : 84;
        } else {
          delay = isPunct ? 190 : 70;
        }
        this.ending.typeTimer = setTimeout(stepType, delay);
      } else {
        segIdx++;
        charIdx = 0;
        if (segIdx < wrappedSegments.length) {
          const nextSeg = wrappedSegments[segIdx];
          currentSpan = initSegmentNode(nextSeg, segIdx);
          const pauseMs = nextSeg.pauseMs != null ? nextSeg.pauseMs : (nextSeg.inline ? 20 : 650);
          this.ending.typeTimer = setTimeout(stepType, pauseMs);
        } else {
          this.ending.isTyping = false;
        }
      }
    };

    this.ending.typeTimer = setTimeout(stepType, 60);
  },

  updateEndingBottomButton(label, variant) {
    const btn = document.getElementById("btnBottomEndingAction");
    if (!btn) return;
    btn.textContent = label;
    const base = "h-12 w-full rounded-lg font-black active:scale-95 transition cursor-pointer select-none flex items-center justify-center";
    if (variant === "codec") {
      btn.className = `${base} bg-[#125830] hover:bg-[#1f8f4f] text-[#34ff8a] font-mono text-sm border-2 border-[#34ff8a] shadow-[0_0_12px_rgba(52,255,138,0.3)]`;
    } else if (variant === "launch") {
      btn.className = `${base} bg-gradient-to-r from-[#ff1493] via-[#00f5e8] to-[#e6ff00] text-black text-sm shadow-lg hover:brightness-110`;
    } else {
      btn.className = `${base} bg-gradient-to-r from-[#ff1493] to-[#7928ca] text-white text-sm shadow-lg hover:brightness-110`;
    }
  },

  buildEndingAct2Html() {
    const lines = [
      { text: "✨ 全艦、宇宙へ飛翔！！ ✨", cls: "text-base sm:text-lg font-black text-[#00f5d4] tracking-wider mb-1", shadow: "#00f5d4" },
      { text: "軌道ドック全ゲート開放！", cls: "text-[15px] sm:text-[17px] font-bold text-white leading-relaxed" },
      { text: "旗艦『シルバーボール』の先導のもと、", cls: "text-[15px] sm:text-[17px] font-bold text-white leading-relaxed" },
      { text: "貴官が操る『桃色装甲艦隊』5隻が、", cls: "text-[15px] sm:text-[17px] font-bold text-white leading-relaxed" },
      { text: "本物の異星艦隊が待つ深宇宙へ向かい、", cls: "text-[15px] sm:text-[17px] font-bold text-white leading-relaxed" },
      { text: "いま一斉に翔け上がる！", cls: "text-[15px] sm:text-[17px] font-bold text-[#e6ff00] leading-relaxed" },
      { text: "「ジョワッ！！」", cls: "text-xl sm:text-2xl font-black text-[#ff66b2] tracking-widest", shadow: "#ff1493" },
      { text: "蒼き地球に見送られ、", cls: "text-[15px] sm:text-[17px] font-bold text-white leading-relaxed" },
      { text: "少女たちの銀翼は星の海へ……", cls: "text-[15px] sm:text-[17px] font-bold text-[#00f5d4] leading-relaxed" },
      { text: "良い旅を、", cls: "text-[15px] sm:text-[17px] font-bold text-[#e6ff00] leading-relaxed" },
      { text: "ボン・ボヤージュ！！", cls: "text-lg sm:text-xl font-black text-[#e6ff00] tracking-wider mb-1", shadow: "#e6ff00" },
      { text: "✨ THE END ✨", cls: "text-base sm:text-lg font-mono font-black text-[#00f5e8] tracking-widest animate-pulse", shadow: "#00f5e8" }
    ];
    return lines.map(l => {
      const outline = "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 6px #000, 0 0 10px #000";
      const glow = l.shadow ? `${outline}, 0 0 14px ${l.shadow}` : outline;
      return `<p class="${l.cls}" style="text-shadow: ${glow};">${l.text}</p>`;
    }).join("");
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

    const track = document.getElementById("endingAct2ScrollTrack");
    const viewport = document.getElementById("endingAct2Viewport");
    if (track) {
      track.innerHTML = this.buildEndingAct2Html();
    }

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

    const viewH = (viewport && viewport.clientHeight) || 230;
    const trackH = (track && track.offsetHeight) || 360;
    this.ending.act2ScrollStartY = viewH * 0.85;
    this.ending.act2ScrollMinY = -(trackH + 24);
    this.ending.act2ScrollY = this.ending.act2ScrollStartY;
    if (track) {
      track.style.transform = `translateY(${this.ending.act2ScrollStartY.toFixed(1)}px)`;
    }

    this.updateEndingBottomButton("🏆 最終戦果＆ランキング登録へ ▶", "launch");

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

    this.updateEndingBottomButton("🏠 タイトル画面へ帰還 (RETURN TO TITLE)", "title");

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
    this.initArcadeKeyboard();
  },

  initArcadeKeyboard() {
    this.ending.registered = false;
    if (typeof this.ending.callsign !== "string") {
      this.ending.callsign = "ADMIRAL";
    }
    const kb = document.getElementById("endingArcadeKeyboard");
    const regBtn = document.getElementById("btnEndingRegister");
    if (regBtn) {
      regBtn.disabled = false;
      regBtn.textContent = "登録";
      regBtn.className = "px-3 py-1 rounded bg-[#00f5d4] hover:bg-[#00d0b4] text-black text-[10px] font-black cursor-pointer transition shrink-0";
    }
    if (kb) {
      kb.classList.remove("hidden");
      if (!kb.dataset.bound) {
        const keys = [
          ..."ABCDEFGHI",
          ..."JKLMNOPQR",
          ..."STUVWXYZ-",
          ..."012345678",
          { k: "9", label: "9", span: 1 },
          { k: "SPC", label: "SPC", span: 2 },
          { k: "BS", label: "⌫ BS", span: 3 },
          { k: "CLR", label: "CLR", span: 3 }
        ];
        kb.innerHTML = keys.map(item => {
          const obj = typeof item === "string" ? { k: item, label: item, span: 1 } : item;
          const spanCls = obj.span > 1 ? `col-span-${obj.span}` : "";
          const styleCls = obj.k === "CLR"
            ? "bg-[#36092f] hover:bg-[#ff1493] text-[#ff66b2] hover:text-white border-[#ff1493]/70"
            : obj.k === "BS"
              ? "bg-[#2a124a] hover:bg-[#e6ff00] text-[#e6ff00] hover:text-black border-[#e6ff00]/60"
              : "bg-[#150638] hover:bg-[#00f5d4] text-[#00f5d4] hover:text-black border-[#00f5d4]/50";
          return `<button type="button" data-key="${obj.k}" class="${spanCls} h-7 rounded border font-mono font-black text-[11px] cursor-pointer active:scale-95 transition select-none flex items-center justify-center ${styleCls}">${obj.label}</button>`;
        }).join("");
        kb.addEventListener("click", (e) => {
          const btn = e.target.closest("button[data-key]");
          if (!btn || this.ending.registered) return;
          this.inputCallsignKey(btn.dataset.key);
        });
        kb.dataset.bound = "1";
      }
    }
    this.updateCallsignDisplay();
  },

  inputCallsignKey(key) {
    if (this.ending.registered) return;
    let cur = this.ending.callsign || "";
    if (key === "CLR") {
      cur = "";
    } else if (key === "BS") {
      cur = cur.slice(0, -1);
    } else if (key === "SPC") {
      if (cur.length < 8) cur += " ";
    } else if (cur.length < 8) {
      cur += key;
    }
    this.ending.callsign = cur;
    if (window.sfx && window.sfx.flipperClick) window.sfx.flipperClick();
    this.updateCallsignDisplay();
  },

  updateCallsignDisplay() {
    const el = document.getElementById("endingCallsignDisplay");
    if (!el) return;
    const cur = this.ending.callsign || "";
    const safe = cur.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/ /g, "&nbsp;");
    if (!this.ending.registered && cur.length < 8) {
      el.innerHTML = `${safe}<span class="text-[#e6ff00] animate-pulse">_</span>`;
    } else {
      el.innerHTML = safe || '<span class="text-gray-500">--------</span>';
    }
  },

  registerEndingScore() {
    if (this.ending.registered) return;
    const raw = (this.ending.callsign || "").trim();
    const name = raw || "ADMIRAL";
    this.ending.callsign = name;
    this.ending.registered = true;

    const state = (window.GameEngine && GameEngine.state) || {};
    const rank = this.computeRank(state.score || 0);

    const newIdx = this.saveHighScore(name, state.score || 0, rank);
    this.renderHighScoresTable("endingHighScoresTable", newIdx);
    this.updateCallsignDisplay();

    const kb = document.getElementById("endingArcadeKeyboard");
    if (kb) kb.classList.add("hidden");

    const regBtn = document.getElementById("btnEndingRegister");
    if (regBtn) {
      regBtn.disabled = true;
      regBtn.textContent = "登録完了 ✔";
      regBtn.className = "px-3 py-1 rounded bg-gray-700 text-gray-400 text-[9.5px] font-bold cursor-default shrink-0";
    }
    if (window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
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
      container.innerHTML = Array.from({ length: 12 }, () => `<div class="flex-1 bg-[#34ff8a] rounded-xs transition-all duration-75" style="height: 4px"></div>`).join("");
    }
    const isTalking = this.ending.act === 1 && this.ending.isTyping && Math.random() < 0.85;
    Array.from(container.children).forEach((bar) => {
      const h = isTalking ? (4 + Math.floor(Math.random() * 16)) : 4;
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

      // Cinematic bottom-to-top roll scroll after initial 1.1s unobstructed view
      if (this.ending.act2Frame > 66) {
        const track = document.getElementById("endingAct2ScrollTrack");
        if (track) {
          const minY = this.ending.act2ScrollMinY ?? -200;
          this.ending.act2ScrollY = Math.max(minY, (this.ending.act2ScrollY ?? 180) - 0.42);
          track.style.transform = `translateY(${this.ending.act2ScrollY.toFixed(1)}px)`;
        }
      }

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
    if (window.UI) {
      UI.isMenuOpen = false;
      if (window.GameEngine && GameEngine.state) {
        UI.updateScreenMode(GameEngine.state);
      }
    }
  }
};

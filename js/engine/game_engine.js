// =========================================================================
// PINBALL ENGINE - CORE GAME ENGINE
// =========================================================================

window.GameEngine = {
  canvas: null,
  ctx: null,
  W: 420,
  H: 660,
  IMG_BOX: { x: 16, y: 16, w: 364, h: 644 },

  state: null,
  currentStage: null,
  isSimulationRunning: false,
  rafId: null,
  FIXED_STEP_MS: 1000 / 60,
  _lastFrameTime: 0,
  _accumulator: 0,
  _needsRender: true,
  _boundLoop: null,

  STAGE_REGISTRY: [
    {
      index: 1,
      id: "stage1",
      globalName: "Stage1",
      headerLabel: "STAGE 1",
      get displayName() { return t("engine.stage1.displayName"); },
      get warningHtml() { return t("engine.stage1.warning"); }
    },
    {
      index: 2,
      id: "stage2",
      globalName: "Stage2",
      headerLabel: "STAGE 2",
      get displayName() { return t("engine.stage2.displayName"); },
      get warningHtml() { return t("engine.stage2.warning"); }
    },
    {
      index: 3,
      id: "stage3",
      globalName: "Stage3",
      headerLabel: "STAGE 3",
      get displayName() { return t("engine.stage3.displayName"); },
      get warningHtml() { return t("engine.stage3.warning"); }
    },
    {
      index: 4,
      id: "stage4",
      globalName: "Stage4",
      headerLabel: "STAGE 4",
      get displayName() { return t("engine.stage4.displayName"); },
      get warningHtml() { return t("engine.stage4.warning"); }
    },
    {
      index: 5,
      id: "stage5",
      globalName: "Stage5",
      headerLabel: "FINAL",
      get displayName() { return t("engine.stage5.displayName"); },
      get warningHtml() { return t("engine.stage5.warning"); }
    }
  ],

  getStageMeta(indexOrId) {
    if (typeof indexOrId === "number") {
      return this.STAGE_REGISTRY.find(s => s.index === indexOrId) || this.STAGE_REGISTRY[0];
    }
    return this.STAGE_REGISTRY.find(s => s.id === indexOrId) || this.STAGE_REGISTRY[0];
  },

  getStageByIndex(stageNum) {
    const meta = this.getStageMeta(stageNum);
    return (meta && window[meta.globalName]) || window.Stage1;
  },

  init(canvasId = "pinballCanvas") {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.state = this.createInitialState();

    UI.initControls(this);
  },

  createDefaultClearSequence() {
    if (window.StageCommon && typeof StageCommon.createClearSequenceState === "function") {
      return StageCommon.createClearSequenceState(false);
    }
    return {
      active: false,
      frame: 0,
      phase: "playing",
      whiteoutAlpha: 0,
      cgRevealAlpha: 0,
      uiShown: false,
      shatterPieces: [],
      smokeClouds: []
    };
  },

  createInitialState() {
    const state = {
      score: 0,
      peakScore: 0,
      stageIndex: 1,
      gameMode: "arcade",
      inTitle: true,
      inEnding: false,
      gameOver: false,
      totalMisses: 0,
      stageMisses: 0,
      stagePlayFrames: 0,
      stageEarnedScore: 0,
      relics: (window.Systems && typeof Systems.createEmptyRelics === "function")
        ? Systems.createEmptyRelics()
        : {
            lilith_gravity: 0, celty_fission: 0, noa_bit: 0, kasumi_chakra: 0,
            radar: 0, spring: 0, drone: 0, fever_cap: 0, holo_magnet: 0, burst_core: 0
          },
      selectedRelic: "radar",
      baseMultiplier: 1.0,
      burstMultiplier: 1.0,
      burstTimer: 0,
      overdriveActive: false,
      overdriveRank: 0,
      magnetActive: false,
      magnetRank: 0,
      deckLightningBolts: [],
      _overdriveChainCd: 0,
      _fissionHitCount: 0,
      _fissionCd: 0,
      _noaBitInterceptCd: 0,
      _noaBitWarpCharges: 0,
      _noaBitPos: { x: 198, y: 532 },
      _currentRelicDraft: null,
      fever: {
        gauge: 0,
        active: false,
        timer: 0,
        mult: 1.0
      },
      balls: [],
      ballsRemaining: 1,
      stageCleared: false,
      phase: 1,

      plunger: {
        power: 0,
        pulling: false,
        launchFrames: 0,
        launchSpeed: 0,
        launchPower: 0,
        launchSkillRatio: 0,
        springY: 575,
        springVy: 0
      },

      perm: {
        centerPost: 0,
        centerPostHP: 0,
        kickbackL: 0,
        kickbackL_charges: 0,
        kickbackR: 0,
        kickbackR_charges: 0,
        wideFlipper: 0
      },

      keptBuffs: [
        { id: "mult2x", tier: 1 },
        null,
        null,
        null
      ],

      boss: null,

      particles: [],
      popups: [],
      hearts: [],
      shockwaves: [],
      armorDebris: [],
      capsules: [],

      nudgeOffset: { x: 0, y: 0 },
      hitStopTimer: 0,
      skillShotEligible: false,
      leftFlipperDown: false,
      rightFlipperDown: false,

      clearSequence: this.createDefaultClearSequence()
    };
    if (window.Systems && typeof Systems.applyLoadoutToState === "function") {
      Systems.applyLoadoutToState(state);
    }
    return state;
  },

  loadStage(stage) {
    this.currentStage = stage;
    window.currentStage = stage;
    stage.initAssets();

    this.state.boss = stage.createBossState();
    this.state.phase = 1;
    this.state.hitStopTimer = 0;
    if (this.state.fever && this.state.fever.active) {
      this.state.fever.active = false;
      this.state.fever.timer = 0;
      this.state.fever.mult = 1.0;
    }
    this.state.stagePlayFrames = 0;
    this.state.stageEarnedScore = 0;
    this.state.stageCleared = false;
    this.state._clearBonusAwarded = false;
    this.state.clearSequence = this.createDefaultClearSequence();
    this.state.armorDebris = [];
    this.state.particles = [];
    this.state.popups = [];
    this.state.hearts = [];
    this.state.shockwaves = [];
    this.state.capsules = [];
    this.state.deckLightningBolts = [];
    this.state._currentRelicDraft = null;
    this.state._noaBitInterceptCd = 0;
    this.state._noaBitWarpCharges = (this.state.relics && this.state.relics.noa_bit > 0) ? 1 : 0;
    this.state.nudgeOffset = { x: 0, y: 0 };

    const meta = this.getStageMeta(stage && stage.id);
    if (meta) this.state.stageIndex = meta.index;

    Systems.prepareBallForLaunch(this.state);
    if (window.UI) {
      UI.isStage5ClearOpen = false;
      UI.updateScreenMode(this.state);
    }
    UI.updateHUD(this.state);

    const txtHeader = document.getElementById("txtHeaderStage");
    if (txtHeader) {
      txtHeader.textContent = meta ? meta.headerLabel : "STAGE 1";
    }
  },

  getStageWarningCutin(stageIndex) {
    const meta = this.STAGE_REGISTRY.find(s => s.index === stageIndex);
    return meta ? meta.warningHtml : "🚨 WARNING!! A HUGE BATTLESHIP IS APPROACHING FAST!!";
  },

  startArcadeCampaign() {
    if (window.GameFlow) {
      if (GameFlow.stopAttractDemo) GameFlow.stopAttractDemo();
      if (GameFlow.hideAllModals) GameFlow.hideAllModals();
    }
    this.state = this.createInitialState();
    this.state.gameMode = "arcade";
    this.state.stageIndex = 1;
    this.state.score = 0;
    this.state.peakScore = 0;
    this.state.totalMisses = 0;
    this.state.stageMisses = 0;
    this.state.inTitle = false;
    this.state.inEnding = false;
    this.state.gameOver = false;
    this.loadStage(window.Stage1 || window.currentStage);
    UI.updateHUD(this.state);
    UI.showCutin(this.getStageWarningCutin(1), 220);
  },

  startPracticeStage(stageNum, opts = null) {
    if (window.GameFlow) {
      if (GameFlow.stopAttractDemo) GameFlow.stopAttractDemo();
      if (GameFlow.hideAllModals) GameFlow.hideAllModals();
    }
    const targetStage = this.getStageByIndex(stageNum);
    this.state = this.createInitialState();
    this.state.gameMode = "practice";
    this.state.stageIndex = stageNum;
    const practiceStart = Systems.scaled(ScoreTable.bonus.PRACTICE_START);
    this.state.score = practiceStart;
    this.state.peakScore = practiceStart;
    this.state.totalMisses = 0;
    this.state.stageMisses = 0;
    this.state.inTitle = false;
    this.state.inEnding = false;
    this.state.gameOver = false;
    this.loadStage(targetStage);
    if (opts && opts.startPhase === 3 && targetStage && typeof targetStage.enterPhase3Direct === "function") {
      targetStage.enterPhase3Direct(this.state);
      if (typeof targetStage.updateStatusMonitor === "function") targetStage.updateStatusMonitor(this.state);
      UI.updateHUD(this.state);
      UI.showCutin(t("stage5.cutin.wingPaddles"), 220);
    } else {
      UI.updateHUD(this.state);
      UI.showCutin(this.getStageWarningCutin(stageNum), 220);
    }
  },

  advanceToNextStage(chosenRelic) {
    if (chosenRelic && window.Systems && typeof Systems.applyRelicPickup === "function") {
      Systems.applyRelicPickup(this.state, chosenRelic);
    }
    const nextIdx = (this.state.stageIndex || 1) + 1;
    if (nextIdx > 5) {
      if (window.GameFlow && window.GameFlow.startEnding) {
        window.GameFlow.startEnding(this.state);
      }
      return;
    }
    this.state.stageIndex = nextIdx;
    this.state.stageMisses = 0;
    this.state.stageCleared = false;
    this.state._clearBonusAwarded = false;

    const nextStage = this.getStageByIndex(nextIdx);
    this.loadStage(nextStage);
    UI.updateHUD(this.state);
    UI.showCutin(this.getStageWarningCutin(nextIdx), 220);
  },

  startPlungerPull() {
    // 常時再引き可能（軽く浮かせて落ちてきたボールにカウンターを合わせるテクニックに対応）
    this.state.plunger.pulling = true;
  },

  releasePlunger() {
    if (!this.state.plunger.pulling) return;
    this.state.plunger.pulling = false;

    // 引き量に応じた物理ピストン初速をセット（バネ先端に接するボールのみ物理衝突で打ち出す）
    const currentPower = Math.max(3, this.state.plunger.power);
    const p = currentPower / 100;
    const pb = Physics.BALANCE;
    const launchSpeed = pb.PLUNGER_BASE_SPEED + p * pb.PLUNGER_MAX_ADD_SPEED;

    this.state.plunger.launchSpeed = launchSpeed;
    this.state.plunger.launchPower = currentPower;
    this.state.plunger.launchSkillRatio = p;
    this.state.plunger.launchFrames = 6;
    this.state.plunger.springVy = -p * 22;
    this.state.plunger.power = 0;
    UI.updateHUD(this.state);
  },

  resetGame() {
    const prevStageIndex = (this.state && !this.state.inTitle) ? (this.state.stageIndex || 1) : 1;
    const prevGameMode = (this.state && !this.state.inTitle) ? (this.state.gameMode || "arcade") : "arcade";
    this.state = this.createInitialState();
    this.state.inTitle = false;
    this.state.stageIndex = prevStageIndex;
    this.state.gameMode = prevGameMode;
    if (this.currentStage) {
      this.state.boss = this.currentStage.createBossState();
    }
    Systems.prepareBallForLaunch(this.state);
    if (window.UI) {
      UI.isStage5ClearOpen = false;
      UI.updateScreenMode(this.state);
    }
    UI.updateHUD(this.state);
    UI.showCutin(t("engine.resetInit"), 100);
  },

  stepPhysics() {
    const state = this.state;
    if (state.inTitle) {
      if (window.GameFlow && window.GameFlow.tickIdle) {
        window.GameFlow.tickIdle();
      }
      return;
    }
    if (state.inEnding || state.gameOver) return;

    this._inStepPhysics = true;
    try {
      this._stepPhysicsInner(state);
    } finally {
      this._inStepPhysics = false;
      if (state._hudDirty) {
        state._hudDirty = false;
        if (window.UI) UI.updateHUD(state);
      }
    }
  },

  _stepPhysicsInner(state) {

    // Post-clear freeze bypass & debris animation
    if (state.stageCleared) {
      if (this.currentStage) this.currentStage.update(state, this);
      Particles.update(state);

      if (state.clearSequence.frame < 105) {
        for (let bi = 0; bi < state.balls.length; bi++) {
          const ball = state.balls[bi];
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.vy += 0.22;
          ball.vx *= 0.99;
          if (!ball.trail) ball.trail = [];
          Physics.pushTrailPoint(ball.trail, ball.x, ball.y, 9);
        }

        Physics.updateFlippers(state);
      }
      return;
    }

    // Hit-stop micro freeze
    if (state.hitStopTimer > 0) {
      state.hitStopTimer--;
      Particles.update(state);
      return;
    }

    // Plunger power charge & spring oscillation physics
    if (state.plunger.pulling) {
      const prevStep = Math.floor(state.plunger.power / 12);
      state.plunger.power = Math.min(100, state.plunger.power + 3.4);
      const nextStep = Math.floor(state.plunger.power / 12);
      if (nextStep > prevStep && window.sfx) {
        window.sfx.plungerPullClick();
      }
      state.plunger.springY = 575 + (state.plunger.power / 100) * 36;
      state.plunger.springVy = 0;

      if (window.UI && typeof UI.updatePlungerHint === "function") {
        UI.updatePlungerHint(state);
      }
    } else {
      // Natural spring-damper oscillation back to rest position (575)
      const restY = 575;
      const dy = restY - (state.plunger.springY || restY);
      state.plunger.springVy = (state.plunger.springVy || 0) + dy * 0.44;
      state.plunger.springVy *= 0.65;
      state.plunger.springY = (state.plunger.springY || restY) + state.plunger.springVy;
      if (state.plunger.launchFrames > 0) {
        state.plunger.launchFrames--;
        if (state.plunger.launchFrames <= 0) {
          state.plunger.launchSpeed = 0;
        }
      }
    }

    if ((state._overdriveChainCd || 0) > 0) state._overdriveChainCd--;
    if ((state._fissionCd || 0) > 0) state._fissionCd--;
    if ((state._noaBitInterceptCd || 0) > 0) state._noaBitInterceptCd--;
    if (state.relics && state.relics.noa_bit > 0) {
      const bitTick = (state.boss && state.boss.animTick) || 0;
      if (!state._noaBitPos) state._noaBitPos = { x: 198, y: 532 };
      state._noaBitPos.x = 198 + Math.sin(bitTick * 0.05) * 62;
      state._noaBitPos.y = 532 + Math.cos(bitTick * 0.08) * 8;
    }

    // Burst Buff Timer
    if (state.burstTimer > 0) {
      state.burstTimer--;
      if (state.burstTimer <= 0) {
        state.burstMultiplier = 1.0;
        state.magnetActive = false;
        state.magnetRank = 0;
        state.overdriveActive = false;
        state.overdriveRank = 0;
        UI.showCutin(t("engine.burstEnd"), 90);
        UI.updateHUD(state);
      }
    }

    // Fever Mode Timer
    if (state.fever.active) {
      state.fever.timer--;
      const feverDur = (window.Systems && typeof Systems.getFeverDurationFrames === "function")
        ? Systems.getFeverDurationFrames(state)
        : (60 * 18);
      state.fever.gauge = Math.max(0, (state.fever.timer / feverDur) * 100);
      if (state.fever.timer <= 0 || state.balls.length <= 1) {
        Systems.endFeverMode(state);
      }
    }

    state.nudgeOffset.x *= 0.86;
    state.nudgeOffset.y *= 0.86;

    if (this.currentStage) this.currentStage.update(state, this);
    Physics.updateFlippers(state);

    const SUBSTEPS = Physics.BALANCE.SUBSTEPS;
    const gravity = Physics.BALANCE.GRAVITY / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
      for (let bi = state.balls.length - 1; bi >= 0; bi--) {
        const ball = state.balls[bi];

        Physics.stepBallPhysics(state, ball, gravity, SUBSTEPS, s);

        if (this.currentStage) {
          this._activeCollisionBall = ball;
          try {
            this.currentStage.checkCollisions(ball, state, this, s);
          } finally {
            this._activeCollisionBall = null;
          }
        }

        Physics.enforceOuterBounds(state, ball);
      }
    }

    // Update Balls & Drain Check
    let hasActivePlayBall = false;
    for (let bi = state.balls.length - 1; bi >= 0; bi--) {
      const ball = state.balls[bi];
      if (!ball.trail) ball.trail = [];
      Physics.pushTrailPoint(ball.trail, ball.x, ball.y, 9);
      if (ball.crotchHitTimer > 0) ball.crotchHitTimer--;
      if (ball._bumperGrace > 0) ball._bumperGrace--;
      if (ball._coreGrace > 0) ball._coreGrace--;
      if (ball._flipHitGrace > 0) ball._flipHitGrace--;
      if (ball._postGrace > 0) ball._postGrace--;
      if (ball._chakraTimer > 0) ball._chakraTimer--;
      if (ball._magnetHeld > 0) ball._magnetHeld--;
      if (!ball.inShooterLane) hasActivePlayBall = true;

      // Ball Stagnation / Stuck Detection (Universal pinball feature)
      const speed = Math.hypot(ball.vx, ball.vy);
      const isTrappedInWell = (state.boss && state.boss.crotch && state.boss.chestArmorBroken &&
                               Math.hypot(ball.x - state.boss.crotch.x, ball.y - state.boss.crotch.y) < 22);
      const isStuck = !ball.inShooterLane && !ball._onWireRamp && !ball._inNavelTrap && !ball._fusionStasis && !ball._seraphStasis && !(ball._magnetHeld > 0) && (speed < 0.75 || isTrappedInWell) && ball.y < this.H - 45;

      if (isStuck) {
        ball.stuckTimer = (ball.stuckTimer || 0) + 1;
        if (ball.stuckTimer >= Physics.BALANCE.STUCK_REMIND_FRAMES && (ball.stuckTimer - Physics.BALANCE.STUCK_REMIND_FRAMES) % 180 === 0) {
          // Casual reminder to nudge the table if ball is stuck anywhere
          UI.showCutin(t("engine.ballStuck"), 120);
        } else if (ball.stuckTimer > Physics.BALANCE.STUCK_KICK_FRAMES) {
          // Machine auto-kick (Pinball Ball Search mechanism) to prevent deadlock
          ball.vy = -5.8;
          ball.vx = (Math.random() - 0.5) * 6.2;
          ball.stuckTimer = 0;
          if (window.sfx) window.sfx.flip();
          Particles.addPopup(state, ball.x, ball.y - 15, "⚡BALL SEARCH KICK!", "#00f5d4", 1.1);
        }
      } else {
        ball.stuckTimer = Math.max(0, (ball.stuckTimer || 0) - 2);
      }

      if (ball.y > this.H + 18) {
        state.balls.splice(bi, 1);
        if (state.balls.length === 0) {
          if (state.score <= 0) {
            // Strict Sonic Rule: 0 score drain = INSTANT GAME OVER!
            state.gameOver = true;
            if (window.sfx && window.sfx.gameOverDown) window.sfx.gameOverDown();
            if (window.GameFlow && window.GameFlow.showGameOver) {
              window.GameFlow.showGameOver(state);
            }
          } else {
            // Sonic Ring-Scatter Survival!
            const stageNum = state.stageIndex || 1;
            const bal = Systems.BALANCE;
            const sb = ScoreTable.bonus;
            const loss = Math.min(state.score, Math.max(Systems.scaled(sb.MISS_PENALTY_MIN_PER_STAGE * stageNum), Math.floor(state.score * sb.MISS_PENALTY_RATIO)));
            state.score = Math.max(0, state.score - loss);
            state.stageEarnedScore = Math.min(state.score, Math.max(0, Math.floor((state.stageEarnedScore || 0) * (1 - sb.MISS_PENALTY_RATIO))));
            state.totalMisses = (state.totalMisses || 0) + 1;
            state.stageMisses = (state.stageMisses || 0) + 1;

            // Debuffs on Miss
            state.burstTimer = 0;
            state.burstMultiplier = 1.0;
            state.magnetActive = false;
            state.magnetRank = 0;
            state.overdriveActive = false;
            state.overdriveRank = 0;
            if (state.fever) {
              state.fever.gauge = Math.floor((state.fever.gauge || 0) * bal.MISS_FEVER_KEEP_RATIO);
            }

            // Degrade 1 highest-tier keptBuffs slot by 1 level
            if (state.keptBuffs && state.keptBuffs.length > 0) {
              let highestIdx = -1;
              let highestTier = -1;
              state.keptBuffs.forEach((slot, idx) => {
                if (slot && slot.tier > highestTier) {
                  highestTier = slot.tier;
                  highestIdx = idx;
                }
              });
              if (highestIdx >= 0) {
                if (state.keptBuffs[highestIdx].tier > 1) {
                  state.keptBuffs[highestIdx].tier--;
                } else {
                  state.keptBuffs[highestIdx] = null;
                }
              }
            }

            // Sonic Scatter Visuals & SFX
            if (window.sfx && window.sfx.sonicScatter) window.sfx.sonicScatter();
            if (window.Particles) {
              Particles.add(state, 198, 640, "#e6ff00", 16, 7.2);
              Particles.add(state, 198, 640, "#00f5d4", 12, 6.0);
              Particles.addPopup(state, 198, 560, "💥SHIELD HIT! -" + loss.toLocaleString(), "#ff0055", 1.2);
            }

            Systems.prepareBallForLaunch(state, true);

            if (state.score === 0) {
              UI.showCutin(t("engine.dangerZero"), 200);
            } else {
              UI.showCutin(t("engine.miss", { loss: loss.toLocaleString(), score: state.score.toLocaleString() }), 165);
            }
          }
          UI.updateHUD(state);
        }
      }
    }

    // ステージ5分タイマー進行 ＆ 0:00超過時の毎フレーム呪いスリップ減点
    if (hasActivePlayBall && !state.stageCleared) {
      state.stagePlayFrames = (state.stagePlayFrames || 0) + 1;
      const st = window.ScoreTable && ScoreTable.stageTimer;
      if (st) {
        const limit = st.LIMIT_FRAMES || (60 * 300);
        const rem = limit - state.stagePlayFrames;
        if (rem === st.WARN_YELLOW_FRAMES) {
          Particles.addPopup(state, 198, 280, "⏱1:00 REMAINING!", "#e6ff00", 1.1);
        } else if (rem === st.WARN_RED_FRAMES) {
          if (window.sfx && window.sfx.feverAlarm) window.sfx.feverAlarm();
          Particles.addPopup(state, 198, 280, "🚨0:30 HURRY UP!!", "#ff0055", 1.2);
        } else if (rem === 0) {
          if (window.sfx && window.sfx.feverAlarm) window.sfx.feverAlarm();
          UI.showCutin(t("engine.timeOverCurse"), 210);
          Particles.addPopup(state, 198, 280, "☠️TIME OVER! SCORE DRAIN!!", "#ff0055", 1.25);
        } else if (rem < 0) {
          const prevScore = state.score;
          const drained = Systems.applyOvertimeDrain(state);
          if (prevScore > 0 && state.score === 0) {
            if (window.sfx && window.sfx.sonicScatter) window.sfx.sonicScatter();
            UI.showCutin(t("engine.dangerZero"), 200);
          }
          if (drained > 0 || (-rem) % 60 === 0) {
            state._hudDirty = true;
          }
        }
        if (rem >= 0 && rem % 60 === 0) {
          state._hudDirty = true;
        }
      }
    }

    // Floating Capsules (Plan A)
    const hasHoloMag = !!(state.relics && state.relics.holo_magnet > 0);
    const capMult = hasHoloMag ? 1.5 : 1.0;
    for (let ci = state.capsules.length - 1; ci >= 0; ci--) {
      const cap = state.capsules[ci];
      cap.phase += 0.06;
      if (hasHoloMag && state.balls) {
        let nearBall = null;
        let nearDist = 65;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - cap.x, ball.y - cap.y);
          if (d < nearDist) { nearDist = d; nearBall = ball; }
        }
        if (nearBall) {
          cap.x += (nearBall.x - cap.x) * 0.04;
          cap.baseY += (nearBall.y - cap.y) * 0.04;
        }
      }
      cap.y = cap.baseY + Math.sin(cap.phase) * 3.5;
      cap.life--;

      let caught = false;
      for (const ball of state.balls) {
        if (Math.hypot(ball.x - cap.x, ball.y - cap.y) < ball.r + cap.r * capMult + 2) {
          caught = true;
          break;
        }
      }

      if (caught) {
        Systems.collectCapsule(state, cap);
        state.capsules.splice(ci, 1);
      } else if (cap.life <= 0) {
        state.capsules.splice(ci, 1);
      }
    }

    Particles.update(state);

    if (state.deckLightningBolts && state.deckLightningBolts.length > 0) {
      for (let li = state.deckLightningBolts.length - 1; li >= 0; li--) {
        state.deckLightningBolts[li].life--;
        if (state.deckLightningBolts[li].life <= 0) {
          state.deckLightningBolts.splice(li, 1);
        }
      }
    }
  },

  renderTable() {
    const ctx = this.ctx;
    const state = this.state;
    const W = this.W;
    const H = this.H;

    ctx.save();
    ctx.translate(state.nudgeOffset.x, state.nudgeOffset.y);

    // Background
    ctx.fillStyle = "#09031c";
    ctx.fillRect(0, 0, W, H);

    // Floor glow
    ctx.strokeStyle = state.fever.active ? "rgba(255, 20, 147, 0.25)" : "rgba(130, 35, 205, 0.15)";
    ctx.lineWidth = 1;
    for (let y = 460; y < H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(30, y);
      ctx.lineTo(370, y);
      ctx.stroke();
    }

    // Stage Background Artwork & Character Patches
    if (this.currentStage && this.currentStage.renderBackground) {
      try {
        this.currentStage.renderBackground(ctx, state, this);
      } catch (err) {
        console.error("renderBackground error:", err);
      }
    }

    // Stage Interactive Cyber Target Guides
    if (this.currentStage && this.currentStage.renderTargets) {
      try {
        this.currentStage.renderTargets(ctx, state, this);
      } catch (err) {
        console.error("renderTargets error:", err);
      }
    }

    // Walls & Neon Rails
    const isShattered = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 25;
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;

    if (!isShattered && !isPostWhiteout) {
      ctx.save();
      // Slingshots
      ctx.fillStyle = "rgba(45, 12, 60, 0.8)";
      ctx.beginPath();
      ctx.moveTo(84, 450); ctx.lineTo(84, 535); ctx.lineTo(106, 565); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(312, 450); ctx.lineTo(312, 535); ctx.lineTo(290, 565); ctx.closePath(); ctx.fill();

      Physics.TABLE_WALLS.forEach(w => {
        ctx.beginPath();
        ctx.moveTo(w.x1, w.y1);
        ctx.lineTo(w.x2, w.y2);
        if (w.isSlingshot) {
          ctx.strokeStyle = "#00f5d4";
          ctx.lineWidth = 4;
        } else {
          ctx.strokeStyle = "#ff1493";
          ctx.lineWidth = 3;
        }
        ctx.stroke();
      });
      ctx.restore();
    } else if (isShattered && !isPostWhiteout) {
      ctx.save();
      state.clearSequence.shatterPieces.forEach(p => {
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.beginPath();
        ctx.moveTo(-p.len / 2, 0);
        ctx.lineTo(p.len / 2, 0);
        ctx.stroke();
        ctx.restore();
      });
      ctx.restore();
    }

    // Flippers, Capsules, Plunger & Balls
    if (!isPostWhiteout) {
      const fxTick = (state.boss && state.boss.animTick) || 0;

      // Lilith Signature Relic: Inverted Gravity Cushion Field
      if (state.relics && state.relics.lilith_gravity > 0) {
        ctx.save();
        const pulse = 0.5 + 0.5 * Math.sin(fxTick * 0.14);
        ctx.strokeStyle = `rgba(255, 20, 147, ${(0.22 + pulse * 0.18).toFixed(2)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(198, 610, 38 + pulse * 6, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.strokeStyle = `rgba(0, 245, 212, ${(0.18 + pulse * 0.16).toFixed(2)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(198, 610, 24 + (1 - pulse) * 5, Math.PI * 1.05, Math.PI * 1.95);
        ctx.stroke();
        ctx.restore();
      }

      // Noa Signature Relic: Aegis Intercept Escort Bit
      if (state.relics && state.relics.noa_bit > 0) {
        const bp = state._noaBitPos || { x: 198, y: 532 };
        const ready = (state._noaBitInterceptCd || 0) <= 0;
        const warpReady = (state._noaBitWarpCharges || 0) > 0;
        ctx.save();
        ctx.translate(bp.x, bp.y);
        if (ready) {
          ctx.strokeStyle = "#00f5d4";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 10 + Math.sin(fxTick * 0.15) * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const frac = 1 - Math.min(1, (state._noaBitInterceptCd || 0) / 480);
          ctx.strokeStyle = "rgba(0, 245, 212, 0.45)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 9.5, -Math.PI * 0.5, -Math.PI * 0.5 + Math.PI * 2 * frac);
          ctx.stroke();
        }
        ctx.rotate(fxTick * 0.06);
        ctx.fillStyle = ready ? "#00f5d4" : "#5a6b8c";
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5.5, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-5.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        if (warpReady) {
          ctx.save();
          ctx.fillStyle = "#e6ff00";
          ctx.font = "bold 7.5px monospace";
          ctx.textAlign = "center";
          ctx.fillText("W", bp.x, bp.y - 12);
          ctx.restore();
        }
      }

      // Flippers (Main + Stage 5 Phase 3 Mid-Field Wing Paddles)
      const flippers = Physics.getFlippers(state);
      flippers.forEach((f, idx) => {
        const st = Physics.flipperState[idx];
        const x2 = f.px + Math.cos(st.angle) * f.len;
        const y2 = f.py + Math.sin(st.angle) * f.len;

        ctx.save();
        ctx.lineCap = "round";
        if (!f.isSubFlipper && state.magnetActive) {
          const magAlpha = (0.28 + 0.18 * Math.sin(fxTick * 0.25)).toFixed(2);
          ctx.strokeStyle = `rgba(0, 245, 212, ${magAlpha})`;
          ctx.lineWidth = 17;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        if (f.isSubFlipper) {
          // 中段ウイングパドル：ゴールド×シアンの発光エナジーブレード
          ctx.strokeStyle = "rgba(230, 255, 0, 0.35)";
          ctx.lineWidth = 13;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.strokeStyle = f.isLeft ? "#ff2ad4" : "#00f5e8";
          ctx.lineWidth = 8.5;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(f.px, f.py, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 1.8;
          ctx.stroke();
        } else {
          ctx.strokeStyle = f.isLeft ? "#ff1493" : "#00f5d4";
          ctx.lineWidth = 9;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.moveTo(f.px, f.py);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          ctx.fillStyle = "#e6ff00";
          ctx.beginPath();
          ctx.arc(f.px, f.py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      // Installed Kickbacks
      if (state.perm.kickbackL > 0) {
        ctx.save();
        const charged = state.perm.kickbackL_charges > 0;
        ctx.strokeStyle = charged ? (Math.floor(Date.now() / 120) % 2 === 0 ? "#00f5d4" : "#e6ff00") : "#3d1852";
        ctx.lineWidth = charged ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(16, 560);
        ctx.lineTo(50, 560);
        ctx.stroke();
        if (charged) {
          ctx.fillStyle = "#00f5d4";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText("LASER", 33, 554);
        }
        ctx.restore();
      }
      if (state.perm.kickbackR > 0) {
        ctx.save();
        const charged = state.perm.kickbackR_charges > 0;
        ctx.strokeStyle = charged ? (Math.floor(Date.now() / 120) % 2 === 0 ? "#00f5d4" : "#e6ff00") : "#3d1852";
        ctx.lineWidth = charged ? 4 : 2;
        ctx.beginPath();
        ctx.moveTo(346, 560);
        ctx.lineTo(380, 560);
        ctx.stroke();
        if (charged) {
          ctx.fillStyle = "#00f5d4";
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillText("LASER", 363, 554);
        }
        ctx.restore();
      }

      // Installed Center Post
      if (state.perm.centerPost > 0 && state.perm.centerPostHP > 0) {
        const postR = 7 + state.perm.centerPost * 3.5;
        const cpx = Physics.TABLE_GEOM.CENTER_POST_X;
        const cpy = Physics.TABLE_GEOM.CENTER_POST_Y;
        ctx.save();
        ctx.fillStyle = "rgba(0, 245, 212, 0.35)";
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cpx, cpy, postR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`HP:${state.perm.centerPostHP}`, cpx, cpy + 24);
        ctx.restore();
      }

      // Floating Hologram Pill Capsules (オフスクリーンスプライトキャッシュで高速描画)
      if (!this._capsuleSpriteCache) this._capsuleSpriteCache = {};
      for (let ci = 0; ci < state.capsules.length; ci++) {
        const cap = state.capsules[ci];
        const key = `${cap.color}|${cap.label}`;
        let sprite = this._capsuleSpriteCache[key];
        if (!sprite) {
          const sw = 60;
          const sh = 32;
          const c = document.createElement("canvas");
          c.width = sw;
          c.height = sh;
          const cx = c.getContext("2d");
          cx.translate(sw / 2, sh / 2);

          const capW = 44;
          const capH = 18;
          const halfW = capW / 2;
          const halfH = capH / 2;
          const radius = halfH;

          const drawCapsulePath = () => {
            cx.beginPath();
            cx.arc(-halfW + radius, 0, radius, Math.PI * 0.5, Math.PI * 1.5);
            cx.lineTo(halfW - radius, -radius);
            cx.arc(halfW - radius, 0, radius, -Math.PI * 0.5, Math.PI * 0.5);
            cx.closePath();
          };

          cx.save();
          cx.strokeStyle = cap.color;
          cx.lineWidth = 4.5;
          cx.globalAlpha = 0.32;
          drawCapsulePath();
          cx.stroke();
          cx.restore();

          cx.save();
          drawCapsulePath();
          cx.clip();
          cx.fillStyle = "rgba(240, 248, 255, 0.88)";
          cx.fillRect(-halfW, -halfH, halfW, capH);
          cx.fillStyle = cap.color;
          cx.globalAlpha = 0.90;
          cx.fillRect(0, -halfH, halfW, capH);
          cx.strokeStyle = "#ffffff";
          cx.lineWidth = 1.6;
          cx.beginPath();
          cx.moveTo(0, -halfH);
          cx.lineTo(0, halfH);
          cx.stroke();
          cx.fillStyle = "rgba(255, 255, 255, 0.70)";
          cx.beginPath();
          cx.ellipse(0, -halfH + 3.2, halfW - 5, 2.0, 0, 0, Math.PI * 2);
          cx.fill();
          cx.restore();

          cx.strokeStyle = "#ffffff";
          cx.lineWidth = 1.6;
          drawCapsulePath();
          cx.stroke();

          cx.font = "bold 8.5px monospace";
          cx.textAlign = "center";
          cx.textBaseline = "middle";
          cx.fillStyle = "rgba(0, 0, 0, 0.85)";
          cx.fillText(cap.label, 1, 1);
          cx.fillStyle = "#ffffff";
          cx.fillText(cap.label, 0, 0);

          sprite = c;
          this._capsuleSpriteCache[key] = sprite;
        }

        ctx.save();
        ctx.translate(cap.x, cap.y);
        const tilt = Math.sin(cap.phase) * 0.14;
        const pulse = 1 + Math.sin(cap.phase * 2) * 0.08;
        ctx.rotate(tilt);
        ctx.scale(pulse, pulse);
        ctx.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
        ctx.restore();
      }

      // Plunger Coil Spring & Striker Plate (Always visible in shooter lane)
      ctx.save();
      const plungerY = state.plunger.springY || 575;
      const springBottomY = 635;
      const springHeight = Math.max(10, springBottomY - plungerY);

      const hasBallOnPlunger = state.balls && state.balls.some(b => b.inShooterLane && b.y > 535);
      const plungerCol = state.plunger.pulling ? "#e6ff00" : (hasBallOnPlunger ? "#00f5d4" : "#ff1493");
      // Draw Zigzag Spring Coil
      ctx.strokeStyle = plungerCol;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(393, springBottomY);
      const coils = 8;
      for (let i = 1; i <= coils; i++) {
        const segY = springBottomY - (springHeight / coils) * (i - 0.5);
        const segX = i % 2 === 1 ? 388 : 398;
        ctx.lineTo(segX, segY);
      }
      ctx.lineTo(393, plungerY);
      ctx.stroke();

      // Plunger Head / Striker Plate
      ctx.fillStyle = plungerCol;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(385, plungerY - 6, 16, 6, 2);
      } else {
        ctx.rect(385, plungerY - 6, 16, 6);
      }
      ctx.fill();
      ctx.stroke();

      // Vertical Power Charge Gauge Bar along Shooter Lane when pulling
      if (state.plunger.pulling && state.plunger.power > 0) {
        const gaugeH = (state.plunger.power / 100) * 120;
        ctx.fillStyle = "rgba(230, 255, 0, 0.4)";
        ctx.fillRect(402, 575 - gaugeH, 3, gaugeH);
        ctx.fillStyle = "#e6ff00";
        ctx.fillRect(401, 575 - gaugeH, 5, 2);
      }
      ctx.restore();

      // Balls (ground-level; elevated wire-ramp balls cast a shadow here and render in renderForeground)
      const bTick = (state.boss && state.boss.animTick) || 0;
      state.balls.forEach(ball => {
        if (ball._onWireRamp) {
          const h = ball._onWireRamp.elev || 1.0;
          ctx.save();
          ctx.fillStyle = `rgba(4, 2, 18, ${0.38 + h * 0.16})`;
          ctx.beginPath();
          ctx.ellipse(ball.x + 5 * h, ball.y + 9 * h, ball.r * 0.92, ball.r * 0.65, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return;
        }
        if (ball.trail && ball.trail.length > 1) {
          ctx.fillStyle = ball._isFissionBall
            ? "#00f5d4"
            : (state.overdriveActive ? "#e6ff00" : (state.fever.active ? "#e6ff00" : "#00f5d4"));
          for (let i = 0; i < ball.trail.length; i++) {
            const pt = ball.trail[i];
            const alpha = (i / ball.trail.length) * 0.45;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ball.r * (0.4 + alpha * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
        }

        if ((ball._magnetHeld || 0) > 0) {
          ctx.save();
          ctx.strokeStyle = "#00f5d4";
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 4.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        if ((ball._chakraTimer || 0) > 0) {
          ctx.save();
          ctx.strokeStyle = "#ff66cc";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 3.2, (bTick * 0.18), (bTick * 0.18) + Math.PI * 1.4);
          ctx.stroke();
          ctx.restore();
        }
        if (state.overdriveActive) {
          ctx.save();
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 1.4;
          const ang = (bTick * 0.35 + ball.x * 0.1) % (Math.PI * 2);
          ctx.beginPath();
          ctx.moveTo(ball.x + Math.cos(ang) * (ball.r + 1), ball.y + Math.sin(ang) * (ball.r + 1));
          ctx.lineTo(ball.x + Math.cos(ang + 0.5) * (ball.r + 5), ball.y + Math.sin(ang + 0.5) * (ball.r + 5));
          ctx.moveTo(ball.x - Math.cos(ang) * (ball.r + 1), ball.y - Math.sin(ang) * (ball.r + 1));
          ctx.lineTo(ball.x - Math.cos(ang + 0.4) * (ball.r + 5), ball.y - Math.sin(ang + 0.4) * (ball.r + 5));
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.fillStyle = ball._isFissionBall
          ? "#00f5d4"
          : (state.overdriveActive ? "#e6ff00" : (state.fever.active ? "#e6ff00" : (state.burstTimer > 0 ? "#ff1493" : "#ffffff")));
        ctx.strokeStyle = ball._isFissionBall ? "#e6ff00" : "#ff1493";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(ball.x - 2, ball.y - 2, 2, 2);
        ctx.restore();
      });
    }

    // Stage Foreground Overlays (3D Wireform Ramps, Elevated Balls, Foreground Petals)
    if (!isPostWhiteout && this.currentStage && this.currentStage.renderForeground) {
      try {
        this.currentStage.renderForeground(ctx, state, this);
      } catch (err) {
        console.error("renderForeground error:", err);
      }
    }

    // Particles, Popups, Hearts & Shockwaves
    Particles.render(ctx, state);

    // Deck Chain Lightning / Slash Bolts
    if (state.deckLightningBolts && state.deckLightningBolts.length > 0) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "miter";
      for (let li = 0; li < state.deckLightningBolts.length; li++) {
        const bolt = state.deckLightningBolts[li];
        const pts = bolt.pts;
        if (!pts || pts.length < 2) continue;
        ctx.globalAlpha = Math.max(0, Math.min(1, bolt.life / (bolt.maxLife || 14)));
        ctx.strokeStyle = bolt.color || "#e6ff00";
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let pi = 1; pi < pts.length; pi++) ctx.lineTo(pts[pi].x, pts[pi].y);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let pi = 1; pi < pts.length; pi++) ctx.lineTo(pts[pi].x, pts[pi].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Blinding Whiteout Flash
    if (state.clearSequence && state.clearSequence.active && state.clearSequence.whiteoutAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${state.clearSequence.whiteoutAlpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    ctx.restore();
  },

  loop(now) {
    if (!this.isSimulationRunning) return;
    const curTime = typeof now === "number" ? now : performance.now();
    if (!this._lastFrameTime) this._lastFrameTime = curTime;
    const dt = Math.min(100, Math.max(0, curTime - this._lastFrameTime));
    this._lastFrameTime = curTime;
    this._accumulator += dt;

    let steps = 0;
    try {
      while (this._accumulator >= this.FIXED_STEP_MS && steps < 4) {
        this.stepPhysics();
        this._accumulator -= this.FIXED_STEP_MS;
        steps++;
      }
      if (this._accumulator >= this.FIXED_STEP_MS) {
        this._accumulator = 0;
      }

      const st = this.state;
      const isCovered = st && (st.inTitle || st.inEnding);
      if (!isCovered && (steps > 0 || this._needsRender)) {
        this.renderTable();
        this._needsRender = false;
      }
    } catch (err) {
      console.error("GameEngine loop error:", err);
    }
    this.rafId = requestAnimationFrame(this._boundLoop || (this._boundLoop = (t) => this.loop(t)));
  },

  start() {
    if (this.isSimulationRunning) return;
    this.isSimulationRunning = true;
    this._lastFrameTime = performance.now();
    this._accumulator = this.FIXED_STEP_MS;
    this._needsRender = true;
    this.rafId = requestAnimationFrame(this._boundLoop || (this._boundLoop = (t) => this.loop(t)));
  },

  pause() {
    this.isSimulationRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
};

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

  init(canvasId = "pinballCanvas") {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.state = this.createInitialState();

    UI.initControls(this);
  },

  createInitialState() {
    return {
      score: 0,
      baseMultiplier: 1.0,
      burstMultiplier: 1.0,
      burstTimer: 0,
      fever: {
        gauge: 0,
        active: false,
        timer: 0,
        mult: 1.0
      },
      balls: [],
      ballsRemaining: 3,
      extraBallMilestones: [50000, 150000, 300000, 600000, 1000000],
      stageCleared: false,
      phase: 1,

      plunger: {
        power: 0,
        pulling: false,
        waitingForLaunch: true,
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

      clearSequence: {
        active: false,
        frame: 0,
        phase: "playing",
        whiteoutAlpha: 0,
        cgRevealAlpha: 0,
        uiShown: false,
        shatterPieces: [],
        smokeClouds: []
      }
    };
  },

  loadStage(stage) {
    this.currentStage = stage;
    window.currentStage = stage;
    stage.initAssets();

    this.state.boss = stage.createBossState();
    this.state.phase = 1;
    this.state.stageCleared = false;
    this.state.clearSequence.active = false;

    Systems.prepareBallForLaunch(this.state);
    UI.updateHUD(this.state);
  },

  startPlungerPull() {
    if (!this.state.plunger.waitingForLaunch) return;
    this.state.plunger.pulling = true;
  },

  releasePlunger() {
    if (!this.state.plunger.pulling) return;
    this.state.plunger.pulling = false;

    // Linear power based on charge duration / drag distance (respects slight taps)
    const currentPower = Math.max(3, this.state.plunger.power);
    if (window.sfx) window.sfx.plungerLaunch(currentPower);

    const ballInLane = this.state.balls.find(b => b.inShooterLane);
    if (ballInLane) {
      const p = currentPower / 100;
      // Complete linear launch speed: ~1.2 at minimal tap up to 16.8 at full 100%
      const launchSpeed = 1.2 + p * 15.6;
      ballInLane.vy = -launchSpeed;
      ballInLane.vx = -0.3;
      this.state.plunger.waitingForLaunch = false;

      // Spring oscillation recoil impulse
      this.state.plunger.springVy = -p * 18;

      if (p >= 0.70 && p <= 0.86) {
        this.state.skillShotEligible = true;
      }
    }
    this.state.plunger.power = 0;
    UI.updateHUD(this.state);
  },

  resetGame() {
    this.state = this.createInitialState();
    if (this.currentStage) {
      this.state.boss = this.currentStage.createBossState();
    }
    Systems.prepareBallForLaunch(this.state);
    UI.updateHUD(this.state);
    UI.showCutin("🔄 テーブルとビルドを初期化しました", 100);
  },

  stepPhysics() {
    const state = this.state;

    // Post-clear freeze bypass & debris animation
    if (state.stageCleared) {
      if (this.currentStage) this.currentStage.update(state, this);
      Particles.update(state);

      if (state.clearSequence.frame < 105) {
        state.balls.forEach(ball => {
          ball.x += ball.vx;
          ball.y += ball.vy;
          ball.vy += 0.22;
          ball.vx *= 0.99;
          ball.trail.push({ x: ball.x, y: ball.y });
          if (ball.trail.length > 9) ball.trail.shift();
        });

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
      const prevStep = Math.floor(state.plunger.power / 16);
      state.plunger.power = Math.min(100, state.plunger.power + 1.8);
      const nextStep = Math.floor(state.plunger.power / 16);
      if (nextStep > prevStep && window.sfx) {
        window.sfx.plungerPullClick();
      }
      state.plunger.springY = 575 + (state.plunger.power / 100) * 36;
      state.plunger.springVy = 0;

      const pHint = document.getElementById("plungerBtnHint");
      if (pHint) {
        pHint.textContent = `POWER ${Math.round(state.plunger.power)}%`;
        pHint.className = "text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5 animate-pulse";
      }
    } else {
      // Natural spring-damper oscillation back to rest position (575)
      const restY = 575;
      const dy = restY - (state.plunger.springY || restY);
      state.plunger.springVy = (state.plunger.springVy || 0) + dy * 0.32;
      state.plunger.springVy *= 0.74;
      state.plunger.springY = (state.plunger.springY || restY) + state.plunger.springVy;
    }

    // Burst Buff Timer
    if (state.burstTimer > 0) {
      state.burstTimer--;
      if (state.burstTimer <= 0) {
        state.burstMultiplier = 1.0;
        state.magnetActive = false;
        state.overdriveActive = false;
        UI.showCutin("【BURST終了】倍率リセット", 90);
        UI.updateHUD(state);
      }
    }

    // Fever Mode Timer
    if (state.fever.active) {
      state.fever.timer--;
      state.fever.gauge = Math.max(0, (state.fever.timer / (60 * 18)) * 100);
      if (state.fever.timer <= 0 || state.balls.length <= 1) {
        Systems.endFeverMode(state);
      }
    }

    state.nudgeOffset.x *= 0.86;
    state.nudgeOffset.y *= 0.86;

    if (this.currentStage) this.currentStage.update(state, this);
    Physics.updateFlippers(state);

    const SUBSTEPS = 6;
    const gravity = 0.118 / SUBSTEPS;

    for (let s = 0; s < SUBSTEPS; s++) {
      for (let bi = state.balls.length - 1; bi >= 0; bi--) {
        const ball = state.balls[bi];

        Physics.stepBallPhysics(state, ball, gravity, SUBSTEPS, s);

        if (this.currentStage) {
          this.currentStage.checkCollisions(ball, state, this, s);
        }
      }
    }

    // Update Balls & Drain Check
    for (let bi = state.balls.length - 1; bi >= 0; bi--) {
      const ball = state.balls[bi];
      ball.trail.push({ x: ball.x, y: ball.y });
      if (ball.trail.length > 9) ball.trail.shift();
      if (ball.crotchHitTimer > 0) ball.crotchHitTimer--;

      // Ball Stagnation / Stuck Detection (Universal pinball feature)
      const speed = Math.hypot(ball.vx, ball.vy);
      const isTrappedInWell = (state.boss && state.boss.crotch && state.boss.chestArmorBroken &&
                               Math.hypot(ball.x - state.boss.crotch.x, ball.y - state.boss.crotch.y) < 22);
      const isStuck = !ball.inShooterLane && (speed < 0.75 || isTrappedInWell) && ball.y < this.H - 45;

      if (isStuck) {
        ball.stuckTimer = (ball.stuckTimer || 0) + 1;
        if (ball.stuckTimer >= 85 && (ball.stuckTimer - 85) % 180 === 0) {
          // Casual reminder to nudge the table if ball is stuck anywhere
          UI.showCutin("⚠️【ボール停滞中】<br>スワイプ または SPACE で台を揺らそう！", 120);
        } else if (ball.stuckTimer > 360) {
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
          state.ballsRemaining--;
          if (state.ballsRemaining > 0) {
            Particles.addPopup(state, 210, 580, `BALL LOST... 残り${state.ballsRemaining}球`, "#ff1493", 1.1);
            Systems.prepareBallForLaunch(state);
          } else {
            state.ballsRemaining = 3;
            UI.showCutin("🔄【コンティニュー】<br>ボールを3球補充しました！", 150);
            Systems.prepareBallForLaunch(state);
          }
          UI.updateHUD(state);
        }
      }
    }

    // Floating Capsules (Plan A)
    for (let ci = state.capsules.length - 1; ci >= 0; ci--) {
      const cap = state.capsules[ci];
      cap.phase += 0.06;
      cap.y = cap.baseY + Math.sin(cap.phase) * 3.5;
      cap.life--;

      let caught = false;
      for (const ball of state.balls) {
        if (Math.hypot(ball.x - cap.x, ball.y - cap.y) < ball.r + cap.r + 2) {
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
    if (this.currentStage) {
      this.currentStage.renderBackground(ctx, state, this);
    }

    // Stage Interactive Cyber Target Guides
    if (this.currentStage) {
      this.currentStage.renderTargets(ctx, state, this);
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
      // Flippers
      const flippers = Physics.getFlippers(state);
      flippers.forEach((f, idx) => {
        const st = Physics.flipperState[idx];
        const x2 = f.px + Math.cos(st.angle) * f.len;
        const y2 = f.py + Math.sin(st.angle) * f.len;

        ctx.save();
        ctx.lineCap = "round";
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
        ctx.save();
        ctx.fillStyle = "rgba(0, 245, 212, 0.35)";
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(198, 614, postR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`HP:${state.perm.centerPostHP}`, 198, 638);
        ctx.restore();
      }

      // Floating Hologram Capsules
      state.capsules.forEach(cap => {
        ctx.save();
        const pulse = 1 + Math.sin(cap.phase * 2) * 0.12;
        const capR = cap.r * pulse;

        ctx.strokeStyle = cap.color;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cap.x, cap.y, capR, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = cap.color;
        ctx.globalAlpha = 0.28 + Math.sin(cap.phase * 2) * 0.12;
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.globalAlpha = 0.95;
        ctx.fillText(cap.label, cap.x, cap.y + 3);
        ctx.restore();
      });

      // Plunger Coil Spring & Striker Plate (Always visible in shooter lane)
      ctx.save();
      const plungerY = state.plunger.springY || 575;
      const springBottomY = 635;
      const springHeight = Math.max(10, springBottomY - plungerY);

      // Draw Zigzag Spring Coil
      ctx.strokeStyle = state.plunger.pulling ? "#e6ff00" : (state.plunger.waitingForLaunch ? "#00f5d4" : "#ff1493");
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
      ctx.fillStyle = state.plunger.pulling ? "#e6ff00" : (state.plunger.waitingForLaunch ? "#00f5d4" : "#ff1493");
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

      // Balls
      state.balls.forEach(ball => {
        if (ball.trail && ball.trail.length > 1) {
          for (let i = 0; i < ball.trail.length; i++) {
            const pt = ball.trail[i];
            const alpha = (i / ball.trail.length) * 0.45;
            ctx.save();
            ctx.fillStyle = state.fever.active ? `rgba(230, 255, 0, ${alpha})` : `rgba(0, 245, 212, ${alpha})`;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, ball.r * (0.4 + alpha * 0.5), 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        ctx.save();
        ctx.fillStyle = state.fever.active ? "#e6ff00" : (state.burstTimer > 0 ? "#ff1493" : "#ffffff");
        ctx.strokeStyle = "#ff1493";
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

    // Particles, Popups, Hearts & Shockwaves
    Particles.render(ctx, state);

    // Blinding Whiteout Flash
    if (state.clearSequence && state.clearSequence.active && state.clearSequence.whiteoutAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${state.clearSequence.whiteoutAlpha})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

    ctx.restore();
  },

  loop() {
    if (!this.isSimulationRunning) return;
    try {
      this.stepPhysics();
      this.renderTable();
    } catch (err) {
      console.error("GameEngine loop error:", err);
    }
    this.rafId = requestAnimationFrame(() => this.loop());
  },

  start() {
    if (this.isSimulationRunning) return;
    this.isSimulationRunning = true;
    this.loop();
  },

  pause() {
    this.isSimulationRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
};

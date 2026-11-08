// =========================================================================
// STAGE 1: LILITH (桃色装甲リリス)
// =========================================================================

window.Stage1 = {
  id: "stage1",
  name: "桃色装甲リリス",
  bossName: "リリス (LILITH)",

  assets: {
    armoredImg: new Image(),
    bareImg: new Image(),
    defeatCgImg: new Image(),
    earTipLImg: new Image(),
    earTipRImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    this.assets.armoredImg.src = "./assets/stage1/centerpiece_armored.jpg";
    this.assets.bareImg.src = "./assets/stage1/centerpiece.jpg";
    this.assets.defeatCgImg.src = "./assets/stage1/defeat_cg.jpg";
    this.assets.earTipLImg.src = "./assets/stage1/ear_tip_L.png";
    this.assets.earTipRImg.src = "./assets/stage1/ear_tip_R.png";

    const faceData = window.STAGE1_FACE_PATCHES || {};
    Object.entries(faceData).forEach(([k, uri]) => {
      const im = new Image();
      im.src = uri;
      this.assets.facePatchImgs[k] = im;
    });

    let count = 0;
    const check = () => {
      count++;
      if (count >= 3) this.assets.loaded = true;
    };
    this.assets.armoredImg.onload = check;
    this.assets.bareImg.onload = check;
    this.assets.defeatCgImg.onload = check;
  },

  createBossState() {
    return {
      droneL_HP: 3,
      droneR_HP: 3,
      leftShoulderHP: 5,
      rightShoulderHP: 5,
      chestArmorHP: 10,
      chestArmorBroken: false,
      coreHP: 16,
      leftEarLit: false,
      rightEarLit: false,
      coreUnlocked: false,
      blushGauge: 0,
      expression: "smile",
      expressionTimer: 0,
      blinkTimer: 120,
      winkTimer: 0,
      talkTimer: 0,
      animTick: 0,
      hairSpring: { dx: 0, dy: 0, vx: 0, vy: 0, phase: 0 },
      gaze: { x: 0, y: 0 },

      // Bust 2D Spring
      bustL: { x: 160, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },
      bustR: { x: 236, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },

      // Drones
      droneL: { x: 61,  y: 175, r: 16, flash: 0, rot: 0 },
      droneR: { x: 335, y: 175, r: 16, flash: 0, rot: 0 },

      // Hanging Rabbit Ear Tips
      earL: {
        ax: 137, ay: 49,
        bx: 68,  by: 105,
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },
      earR: {
        ax: 258, ay: 49,
        bx: 329, by: 105,
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },

      // Shoulder Armor
      podL: { x: 108, y: 290, r: 23, flash: 0, rot: 0 },
      podR: { x: 288, y: 290, r: 23, flash: 0, rot: 0 },

      // Waist / Hip Units
      hipL: { x: 110, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },
      hipR: { x: 285, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },

      // Crotch Secret Gravity Well
      crotch: { x: 198, y: 556, r: 17, gravRadius: 135, flash: 0, rot: 0, charge: 0, maxCharge: 3, cooldown: 0 },

      // Core Gem
      core: { x: 198, y: 310, r: 16, flash: 0 }
    };
  },

  getTargetDesc(state) {
    if (state.stageCleared) return "大破・強制装甲パージ 成功！";
    if (state.phase === 1) {
      if (state.boss.droneL_HP > 0 || state.boss.droneR_HP > 0) return "ドローン撃破でシールド解除！";
      return "両肩アーマーを集中砲火！";
    }
    if (state.phase === 2) {
      return state.boss.chestArmorBroken ? "露出コアに集中連打せよ！" : `胸部装甲破壊 (残HP:${state.boss.chestArmorHP})`;
    }
    return `BOSS CORE 撃破チャンス！ (残HP:${state.boss.coreHP})`;
  },

  updateStatusMonitor(state) {
    const blushText = document.getElementById("blushGaugeText");
    if (blushText) blushText.textContent = `${state.boss.blushGauge}%`;
    const blushBar = document.getElementById("blushGaugeBar");
    if (blushBar) blushBar.style.width = `${state.boss.blushGauge}%`;

    const shText = document.getElementById("statusShoulders");
    if (shText) shText.textContent = `L:${state.boss.leftShoulderHP}/5 R:${state.boss.rightShoulderHP}/5`;

    const chestText = document.getElementById("statusChestArmor");
    if (chestText) chestText.textContent = state.boss.chestArmorBroken ? "💥PURGED!" : `HP: ${state.boss.chestArmorHP}/10`;

    const earsText = document.getElementById("statusEars");
    if (earsText) earsText.textContent = `L:${state.boss.leftEarLit ? "ON" : "OFF"} / R:${state.boss.rightEarLit ? "ON" : "OFF"}`;

    const coreText = document.getElementById("statusCore");
    if (coreText) {
      coreText.textContent = state.phase === 3
        ? `HP: ${state.boss.coreHP}/16 [KO可]`
        : (state.boss.coreUnlocked ? "★UNLOCKED★" : "SHIELDED");
    }

    const faceMap = {
      smile: "余裕スマイル",
      blush: "赤面ぷるぷる",
      shock: "ダメージ焦り顔!?",
      angry_emp: "EMP逆上カウンター⚡"
    };
    const faceEl = document.getElementById("bossFaceStatus");
    if (faceEl) faceEl.textContent = faceMap[state.boss.expression] || "余裕スマイル";
  },

  impulseBust(state, which, vxImpact, vyImpact) {
    const b = which === "L" ? state.boss.bustL : state.boss.bustR;
    if (window.sfx) window.sfx.softPuru();
    b.vx += vxImpact * 1.35;
    b.vy += vyImpact * 1.35;
    b.flash = 16;

    const other = which === "L" ? state.boss.bustR : state.boss.bustL;
    other.vx -= vxImpact * 0.45;
    other.vy += vyImpact * 0.45;

    state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 18);
    state.boss.expression = "blush";
    state.boss.expressionTimer = 54;
    state.boss.talkTimer = 36;
    state.boss.hairSpring.vx += vxImpact * 0.55;
    state.boss.hairSpring.vy += vyImpact * 0.55;

    Systems.addFever(state, 12);
    Particles.add(state, b.x, b.y, "#ff66b2", 8, 2.8);
    Systems.addScore(state, 600, b.x, b.y - 18, "♥ぷるんっ! SOFT");

    // EMP Counter at 100% Blush
    if (state.boss.blushGauge >= 100) {
      state.boss.blushGauge = 0;
      state.boss.expression = "angry_emp";
      state.boss.expressionTimer = 60;
      if (window.sfx) window.sfx.armorBreak();
      UI.showCutin("⚡「ちょ、どこ触ってんのよっ！！」<br>カウンターEMP発動＆カプセル放出！", 180);
      Particles.add(state, 210, 390, "#ff1493", 32, 6.5);
      Systems.spawnFloatingCapsule(state, 5, "buff");
      state.balls.forEach(ball => {
        ball.vy = -12 - Math.random() * 4;
        ball.vx = (Math.random() - 0.5) * 12;
      });
    }
    UI.updateHUD(state);
  },

  impulseEar(state, which, torque, vxImpact, vyImpact) {
    const ear = which === "L" ? state.boss.earL : state.boss.earR;
    if (window.sfx) window.sfx.earBoing();
    ear.angleVel += torque * 0.15;
    ear.vx += (vxImpact || 0) * 0.8;
    ear.vy += (vyImpact || 0) * 0.8;
    ear.flash = 18;
  },

  onNudge(state, nx, ny, intensity) {
    if (state.boss.chestArmorBroken) {
      this.impulseBust(state, "L", nx * 5.5 * intensity, ny * 5.5 * intensity);
      this.impulseBust(state, "R", nx * 5.5 * intensity, ny * 5.5 * intensity);
    }
    this.impulseEar(state, "L", nx * 4.2 * intensity, ny * 4.2 * intensity);
    this.impulseEar(state, "R", nx * 4.2 * intensity, ny * 4.2 * intensity);
  },

  update(state, engine) {
    // Bust Springs
    const stiffness = 0.26;
    const damping = 0.80;
    [state.boss.bustL, state.boss.bustR].forEach(b => {
      const ax = -stiffness * b.dx;
      const ay = -stiffness * b.dy;
      b.vx = (b.vx + ax) * damping;
      b.vy = (b.vy + ay) * damping;
      b.dx += b.vx;
      b.dy += b.vy;
      b.dx = Math.max(-18, Math.min(18, b.dx));
      b.dy = Math.max(-18, Math.min(18, b.dy));
      if (b.flash > 0) b.flash--;
    });

    // Hanging Ear Pendulum Springs
    const earAngStiffness = 0.09;
    const earAngDamping = 0.93;
    [state.boss.earL, state.boss.earR].forEach(ear => {
      const angAcc = -earAngStiffness * ear.angle;
      ear.angleVel = (ear.angleVel + angAcc) * earAngDamping;
      ear.angle += ear.angleVel;
      ear.angle = Math.max(-0.35, Math.min(0.35, ear.angle));

      const ax = -0.12 * ear.dx;
      const ay = -0.12 * ear.dy;
      ear.vx = (ear.vx + ax) * earAngDamping;
      ear.vy = (ear.vy + ay) * earAngDamping;
      ear.dx += ear.vx;
      ear.dy += ear.vy;
      ear.dx = Math.max(-14, Math.min(14, ear.dx));
      ear.dy = Math.max(-14, Math.min(14, ear.dy));

      if (ear.flash > 0) ear.flash--;
    });

    // Hair spring
    const hs = state.boss.hairSpring;
    hs.phase += 0.055;
    hs.vx = (hs.vx - 0.18 * hs.dx) * 0.86;
    hs.vy = (hs.vy - 0.18 * hs.dy) * 0.86;
    hs.dx = Math.max(-10, Math.min(10, hs.dx + hs.vx));
    hs.dy = Math.max(-8, Math.min(8, hs.dy + hs.vy));

    state.boss.animTick++;
    state.boss.blinkTimer--;
    if (state.boss.blinkTimer <= -10) {
      state.boss.blinkTimer = 130 + Math.floor(Math.random() * 110);
    }
    if (state.boss.winkTimer > 0) state.boss.winkTimer--;
    if (state.boss.talkTimer > 0) state.boss.talkTimer--;

    // Gaze tracking
    if (state.balls.length > 0) {
      const b = state.balls[0];
      const targetGx = Math.max(-2.3, Math.min(2.3, (b.x - 198) * 0.015));
      const targetGy = Math.max(-1.8, Math.min(2.3, (b.y - 194) * 0.011));
      state.boss.gaze.x += (targetGx - state.boss.gaze.x) * 0.25;
      state.boss.gaze.y += (targetGy - state.boss.gaze.y) * 0.25;
    }

    if (state.boss.expressionTimer > 0) {
      state.boss.expressionTimer--;
      if (state.boss.expressionTimer === 0) {
        state.boss.expression = "smile";
      }
    }

    // Target reticles rotation and flash decay
    [
      state.boss.droneL, state.boss.droneR,
      state.boss.earL, state.boss.earR,
      state.boss.podL, state.boss.podR,
      state.boss.hipL, state.boss.hipR,
      state.boss.bustL, state.boss.bustR,
      state.boss.crotch,
      state.boss.core
    ].forEach(g => {
      if (!g) return;
      if (g.flash > 0) g.flash--;
      if (g.rot !== undefined) {
        g.rot += g.flash > 0 ? (0.28 + (g.flash / 12) * 0.18) : 0.035;
      }
    });

    if (state.boss.crotch && state.boss.crotch.cooldown > 0) {
      state.boss.crotch.cooldown--;
    }

    // Clear sequence
    this.updateClearSequence(state, engine);
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;

    // Helper alias
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);
    const checkCapsule = (ax, ay, bx, by, cr) => Physics.checkCapsuleHit(ball, ax, ay, bx, by, cr);
    const checkEllipse = (cx, cy, rx, ry) => Physics.checkEllipseHit(ball, cx, cy, rx, ry);

    // 1. Chest Armor Plate vs Exposed Bust
    if (!state.boss.chestArmorBroken) {
      const hit = checkEllipse(198, 353, 54, 26);
      if (hit) {
        ball.x = hit.cx + hit.nx * (hit.minDist + 1.5);
        ball.y = hit.cy + hit.ny * (hit.minDist + 1.5);
        ball.vx = hit.nx * 9.5;
        ball.vy = hit.ny * 9.5;
        if (window.sfx) window.sfx.metalBumper();

        if (state.phase === 2 && state.boss.chestArmorHP > 0) {
          state.boss.chestArmorHP--;
          Particles.add(state, hit.cx, hit.cy, "#ff1493", 16, 5.0);
          Systems.addFever(state, 6);

          if (state.boss.chestArmorHP === 5) {
            UI.showCutin("⚠️【胸部装甲に亀裂発生】<br>第1装甲破壊！ あと5回直撃でパージ！", 180);
            Particles.triggerArmorBreakEffect(state, "chest", hit.cx, hit.cy);
            state.boss.expression = "shock";
            state.boss.expressionTimer = 60;
          } else if (state.boss.chestArmorHP === 0) {
            state.boss.chestArmorBroken = true;
            Particles.triggerArmorBreakEffect(state, "chest", hit.cx, hit.cy);
            state.boss.expression = "blush";
            state.boss.expressionTimer = 85;
            UI.showCutin("💥【CHEST ARMOR PURGE】💥<br>完全装甲パージ！<br>秘密のグラビティコア起動！", 240);
            Systems.addScore(state, 15000, hit.cx, hit.cy, "FULL PURGE!!");
            Systems.spawnFloatingCapsule(state, 2, "buff");
            Systems.spawnFloatingCapsule(state, 5, "buff");
          } else {
            Systems.addScore(state, 1200, hit.cx, hit.cy, `ARMOR HIT [${state.boss.chestArmorHP}]`);
          }
        } else {
          Systems.addScore(state, 400, hit.cx, hit.cy, "ARMOR RICOCHET");
        }
        UI.updateHUD(state);
      }
    } else {
      // Exposed Soft Bust Bounce
      [
        { side: "L", b: state.boss.bustL },
        { side: "R", b: state.boss.bustR }
      ].forEach(({ side, b }) => {
        const cx = b.x + b.dx;
        const cy = b.y + b.dy;
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + b.r;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = cx + nx * (minDist + 1.2);
          ball.y = cy + ny * (minDist + 1.2);

          const normalSpd = ball.vx * nx + ball.vy * ny;
          const tanX = -ny;
          const tanY = nx;
          const tanSpd = ball.vx * tanX + ball.vy * tanY;

          const restitution = state.fever.active ? 1.05 : 0.72;
          const newNormalSpd = -normalSpd * restitution;
          ball.vx = nx * newNormalSpd + tanX * tanSpd * 0.94;
          ball.vy = ny * newNormalSpd + tanY * tanSpd * 0.94;

          this.impulseBust(state, side, -nx * 4.2, -ny * 4.2);

          for (let h = 0; h < (state.fever.active ? 4 : 2); h++) {
            Particles.spawnHeart(state, cx, cy, false);
          }
          if (state.phase === 2 && state.boss.chestArmorBroken) {
            state.phase = 3;
            state.boss.coreUnlocked = true;
          }
        }
      });
    }

    // 2. Drones
    [
      { d: state.boss.droneL, which: "L", tag: "L-DRONE" },
      { d: state.boss.droneR, which: "R", tag: "R-DRONE" }
    ].forEach(({ d, which, tag }) => {
      checkBumper(d, 8.5, () => {
        if (window.sfx) window.sfx.metalBumper();
        Systems.addFever(state, 5);
        Particles.add(state, d.x, d.y, "#00f5d4", 14, 4.5);

        const hpKey = which === "L" ? "droneL_HP" : "droneR_HP";
        if (state.boss[hpKey] > 0) {
          state.boss[hpKey]--;
          Systems.addScore(state, 2000, d.x, d.y - 12, `${tag} HIT! HP:${state.boss[hpKey]}`);
          if (state.boss[hpKey] === 0) {
            if (window.sfx) window.sfx.armorBreak();
            Particles.add(state, d.x, d.y, "#ff1493", 22, 6.0);
            Systems.addScore(state, 6000, d.x, d.y - 15, `💥${tag} DESTROYED!`);
            UI.showCutin(`💥【${tag} 撃破】<br>肩アーマーの電磁シールドが解除！`, 160);
            Systems.spawnFloatingCapsule(state, which === "L" ? 0 : 1, "buff");
            state.baseMultiplier += 0.25;
            this.checkPhase1Clear(state);
          }
        } else {
          if (window.sfx) window.sfx.exSpark();
          Systems.addScore(state, 2500, d.x, d.y - 12, "⚡EX-BUMP!");
        }
        UI.updateHUD(state);
      });
    });

    // 3. Hanging Rabbit Ear Tips
    [
      { ear: state.boss.earL, which: "L", tag: "L-EAR" },
      { ear: state.boss.earR, which: "R", tag: "R-EAR" }
    ].forEach(({ ear, which, tag }) => {
      const tipX = ear.ax + (ear.bx - ear.ax) * Math.cos(ear.angle) - (ear.by - ear.ay) * Math.sin(ear.angle);
      const tipY = ear.ay + (ear.bx - ear.ax) * Math.sin(ear.angle) + (ear.by - ear.ay) * Math.cos(ear.angle);
      const hit = checkCapsule(ear.ax, ear.ay, tipX, tipY, ear.r);

      if (hit) {
        ball.x = hit.qx + hit.nx * (hit.minDist + 1.2);
        ball.y = hit.qy + hit.ny * (hit.minDist + 1.2);

        const vDotN = ball.vx * hit.nx + ball.vy * hit.ny;
        if (vDotN < 0) {
          ball.vx = (ball.vx - 1.55 * vDotN * hit.nx) * 0.88;
          ball.vy = (ball.vy - 1.55 * vDotN * hit.ny) * 0.88;
        }

        const crossTorque = (hit.qx - ear.ax) * ball.vy - (hit.qy - ear.ay) * ball.vx;
        const normalizedTorque = Math.max(-1.5, Math.min(1.5, crossTorque * 0.003));
        this.impulseEar(state, which, normalizedTorque, ball.vx * 0.25, ball.vy * 0.25);

        Systems.addFever(state, 8);
        Particles.add(state, hit.qx, hit.qy, "#b84dff", 14, 4.0);

        if (state.skillShotEligible) {
          state.skillShotEligible = false;
          Systems.addScore(state, 25000, hit.qx, hit.qy, "★SKILL SHOT!!");
          UI.showCutin("🎯【SKILL SHOT 炸裂】<br>垂れ耳クッションキャッチ！<br>+25,000pts ＆ レアカプセル！", 180);
          Systems.spawnFloatingCapsule(state, 2, "buff");
        } else {
          Systems.addScore(state, 2000, hit.qx, hit.qy, "🐰FUNYON DAMP!");
          Particles.addPopup(state, hit.qx, hit.qy - 18, "🐰ふにょん (SPEED DAMP)", "#e6ff00", 1.0);
        }

        const litKey = which === "L" ? "leftEarLit" : "rightEarLit";
        state.boss[litKey] = true;
        if (state.boss.leftEarLit && state.boss.rightEarLit) {
          state.boss.coreUnlocked = true;
          UI.showCutin("🔓【両耳センサー達成】<br>胸部コアのロックが一時解除！", 180);
        }
        UI.updateHUD(state);
      }
    });

    // 4. Shoulder Armor Clusters
    [
      { pod: state.boss.podL, which: "L", tag: "L-ARMOR" },
      { pod: state.boss.podR, which: "R", tag: "R-ARMOR" }
    ].forEach(({ pod, which, tag }) => {
      checkBumper(pod, 8.2, () => {
        const hpKey = which === "L" ? "leftShoulderHP" : "rightShoulderHP";
        const droneHPKey = which === "L" ? "droneL_HP" : "droneR_HP";
        const isShielded = state.phase === 1 && state.boss[droneHPKey] > 0;

        if (isShielded) {
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, pod.x, pod.y, "#00f5d4", 16, 4.5);
          Systems.addScore(state, 500, pod.x, pod.y - 12, "🛡️SHIELDED!");
          Particles.addPopup(state, pod.x, pod.y - 15, `先に${which}-DRONEを倒せ!`, "#00f5d4", 0.95);
        } else {
          if (state.boss[hpKey] > 0) {
            state.boss[hpKey]--;
            if (window.sfx) window.sfx.metalBumper();
            Systems.addFever(state, 4);
            Particles.add(state, pod.x, pod.y, "#ff1493", 14, 4.5);
            Systems.addScore(state, 1800, pod.x, pod.y - 12, `${tag} HIT! HP:${state.boss[hpKey]}`);

            if (state.boss[hpKey] === 0) {
              Particles.triggerArmorBreakEffect(state, which === "L" ? "shoulder_l" : "shoulder_r", pod.x, pod.y);
              state.boss.expression = "shock";
              state.boss.expressionTimer = 65;
              Systems.addScore(state, 5000, pod.x, pod.y, `💥${tag} BREAK!!`);
              UI.showCutin(`💥【${which === "L" ? "左" : "右"}肩アーマー破壊】<br>内部ジェネレータ露出！<br>⚡EX-BOUNCE活性化！`, 180);
              Systems.spawnFloatingCapsule(state, which === "L" ? 3 : 4, "perm");
              this.checkPhase1Clear(state);
            } else {
              this.impulseBust(state, which, (Math.random() - 0.5) * 2, -2.5);
            }
          } else {
            if (window.sfx) window.sfx.exSpark();
            Systems.addFever(state, 5);
            Particles.add(state, pod.x, pod.y, "#00f5d4", 18, 5.0);
            Particles.add(state, pod.x, pod.y, "#e6ff00", 12, 4.0);
            Systems.addScore(state, 5000, pod.x, pod.y, "⚡EX-SPARK!!");
          }
          UI.updateHUD(state);
        }
      });
    });

    // 5. Waist / Hip Cyber Units (Active from Phase 1!)
    [
      { hip: state.boss.hipL, tag: "L-HIP", side: "L" },
      { hip: state.boss.hipR, tag: "R-HIP", side: "R" }
    ].forEach(({ hip, tag, side }) => {
      checkBumper(hip, 7.5, () => {
        if (window.sfx) window.sfx.metalBumper();
        Systems.addFever(state, 4);
        Particles.add(state, hip.x, hip.y, "#ff66b2", 14, 4.5);
        Particles.add(state, hip.x, hip.y, "#00f5d4", 8, 3.5);
        if (hip.hp > 0) {
          hip.hp--;
          Systems.addScore(state, 2500, hip.x, hip.y - 12, `${tag} HIT! HP:${hip.hp}`);
          if (hip.hp === 0) {
            Particles.triggerArmorBreakEffect(state, side === "L" ? "shoulder_l" : "shoulder_r", hip.x, hip.y);
            Systems.addScore(state, 8000, hip.x, hip.y - 15, `💥${tag} OVERHEAT!`);
            UI.showCutin(`💥【${side === "L" ? "左" : "右"}腰ユニット過熱】<br>冷却系ダウン！ スコア倍率UP！`, 160);
            state.baseMultiplier += 0.5;
            Systems.addFever(state, 15);
          }
        } else {
          if (window.sfx) window.sfx.exSpark();
          Systems.addScore(state, 3000, hip.x, hip.y - 12, "⚡HIP SPARK!");
        }
        UI.updateHUD(state);
      });
    });

    // 6. Crotch Secret Gravity Well (Activated when Chest Armor is shattered)
    if (state.boss.chestArmorBroken) {
      const crotch = state.boss.crotch;
      const dxCr = crotch.x - ball.x;
      const dyCr = crotch.y - ball.y;
      const distCr = Math.hypot(dxCr, dyCr);

      // Natural Gravitational Pull
      if (distCr < crotch.gravRadius && distCr > 1.5) {
        const pullFactor = Math.pow(1.0 - distCr / crotch.gravRadius, 1.35);
        const force = 0.48 * pullFactor;
        ball.vx += (dxCr / distCr) * force;
        ball.vy += (dyCr / distCr) * force;

        // Subtle damping near the core so weak balls can naturally balance against downward gravity
        if (distCr < 40) {
          ball.vx *= 0.982;
          ball.vy *= 0.982;
        }
        if (distCr < 18) {
          ball.vx *= 0.92;
          ball.vy *= 0.92;
        }

        if (Math.random() < 0.70) {
          const pAngle = Math.atan2(dyCr, dxCr) + (Math.random() - 0.5) * 0.4;
          state.particles.push({
            x: ball.x,
            y: ball.y,
            vx: Math.cos(pAngle) * (2.8 + Math.random() * 2.2),
            vy: Math.sin(pAngle) * (2.8 + Math.random() * 2.2),
            color: Math.random() > 0.4 ? "#b84dff" : "#00f5d4",
            life: 15,
            scale: 1.05
          });
        }

        if (distCr < crotch.gravRadius * 0.65 && Math.random() < 0.1) {
          Particles.spawnHeart(state, ball.x, ball.y, true);
        }
      }

      // Core Touch & Charge
      if (distCr < ball.r + crotch.r + 2.0) {
        if (!ball.crotchHitTimer || ball.crotchHitTimer <= 0) {
          ball.crotchHitTimer = 35;
          crotch.flash = 22;
          if (window.sfx) {
            window.sfx.softPuru();
          }
          Particles.spawnHeart(state, crotch.x, crotch.y, true);

          if (crotch.cooldown && crotch.cooldown > 0) {
            if (window.sfx) window.sfx.metalBumper();
            Systems.addScore(state, 1500, crotch.x, crotch.y - 14, "GRAV RESIDUE");
          } else {
            crotch.charge++;
            state.boss.expression = "blush";
            state.boss.expressionTimer = 85;
            state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 25);
            Particles.add(state, crotch.x, crotch.y, "#e6ff00", 18, 4.0);
            Particles.add(state, crotch.x, crotch.y, "#ff1493", 14, 3.5);

            if (crotch.charge < crotch.maxCharge) {
              Systems.addScore(state, 5000 * crotch.charge, crotch.x, crotch.y - 16, `🌀GRAVITY TRAP ${crotch.charge}/${crotch.maxCharge}`);
              Particles.addPopup(state, crotch.x, crotch.y - 30, "「あっ……吸い付いちゃった……！？ 早く落としてよっ」", "#ff66b2", 1.05);
            } else {
              crotch.charge = 0;
              crotch.cooldown = 60 * 18;
              if (window.sfx) {
                window.sfx.burstTrigger();
                window.sfx.exSpark();
              }
              Systems.addScore(state, 30000, crotch.x, crotch.y - 20, "★GRAVITY OVERLOAD!! +30,000");
              Particles.addPopup(state, crotch.x, crotch.y - 35, "「きゃあああっ！？ 重力場が反転しちゃう……っ！！」", "#e6ff00", 1.3);
              UI.showCutin("🌀【GRAVITY OVERLOAD!!】🌀<br>重力特異点崩壊！<br>秘密のマルチボール＆全開フィーバー！", 220);

              ball.crotchHitTimer = 45;
              ball.vy = -8.5;
              ball.vx = (Math.random() - 0.5) * 6;

              if (state.balls.length < 3) {
                Systems.spawnBall(state, crotch.x + (Math.random() - 0.5) * 16, crotch.y - 20, (Math.random() - 0.5) * 6, -7.5);
              }
              Systems.startFeverMode(state);
              state.burstMultiplier = Math.max(state.burstMultiplier, 2.0);
              state.burstTimer = 360;
            }
          }
          UI.updateHUD(state);
        }
      }
    }

    // 7. Chest Core Gem (Phase 3 Final Target)
    checkBumper(state.boss.core, 7.8, core => {
      Systems.addFever(state, 6);
      if (state.phase === 3 && state.boss.coreHP > 0) {
        state.boss.coreHP--;
        state.boss.expression = "shock";
        state.boss.expressionTimer = 85;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, core.x, core.y, "#ff1493", 26, 6.0);
        Systems.addScore(state, 8000, core.x, core.y - 20, `💥CORE HIT! HP:${state.boss.coreHP}`);

        if (state.boss.coreHP === 0) {
          this.triggerClear(state, engine);
        }
      } else if (state.boss.coreUnlocked) {
        if (window.sfx) window.sfx.burstTrigger();
        Particles.add(state, core.x, core.y, "#e6ff00", 20, 4.5);
        Systems.addScore(state, 500, core.x, core.y - 18, "★JACKPOT!!");
        Systems.spawnFloatingCapsule(state, 5, "buff");
      } else {
        if (window.sfx) window.sfx.metalBumper();
        Systems.addScore(state, 1500, core.x, core.y - 16, "CORE SHIELDED");
      }
      UI.updateHUD(state);
    });
  },

  checkPhase1Clear(state) {
    if (state.boss.leftShoulderHP === 0 && state.boss.rightShoulderHP === 0 && state.phase === 1) {
      state.phase = 2;
      if (window.sfx) window.sfx.burstTrigger();
      state.boss.expression = "shock";
      state.boss.expressionTimer = 90;
      UI.showCutin("🎉【PHASE 1 突破】外装防衛網壊滅！<br>胸部装甲＆秘密のグラビティコア露出！", 240);
      Systems.spawnFloatingCapsule(state, 2, "buff");
    }
  },

  triggerClear(state, engine) {
    if (state.stageCleared) return;
    state.stageCleared = true;
    state.clearSequence.active = true;
    state.clearSequence.frame = 0;
    state.clearSequence.phase = "shatter";

    if (window.sfx) window.sfx.burstTrigger();
    UI.showCutin("💥【CRITICAL K.O.】💥<br>機体制御崩壊！ 装甲強制パージ！", 180);
    Particles.add(state, 198, 307, "#ffffff", 60, 9.5);
    Particles.add(state, 198, 307, "#ff1493", 60, 8.0);
    Particles.add(state, 198, 307, "#e6ff00", 60, 8.0);

    state.clearSequence.shatterPieces = Particles.shatterTableFrame(Physics.TABLE_WALLS);

    state.balls.forEach(ball => {
      const blastAngle = Math.atan2(ball.y - 307, ball.x - 198) + (Math.random() - 0.5) * 0.6;
      const blastSpeed = 8.0 + Math.random() * 4.5;
      ball.vx = Math.cos(blastAngle) * blastSpeed;
      ball.vy = Math.sin(blastAngle) * blastSpeed - 3.0;
    });
  },

  spawnSmokeCloud(x, y, color = "#ff66b2") {
    return {
      x: x + (Math.random() - 0.5) * 36,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 3.2,
      vy: -1.6 - Math.random() * 2.8,
      r: 22 + Math.random() * 20,
      maxR: 70 + Math.random() * 40,
      growth: 0.8 + Math.random() * 0.7,
      color,
      alpha: 0.1,
      maxAlpha: 0.55 + Math.random() * 0.25,
      life: 100 + Math.floor(Math.random() * 40),
      maxLife: 120
    };
  },

  updateClearSequence(state, engine) {
    const seq = state.clearSequence;
    if (!seq.active) return;
    seq.frame++;

    // Step 1: 0..45 Frame -> Screen Shake
    if (seq.frame < 45) {
      state.nudgeOffset.x = (Math.random() - 0.5) * 16;
      state.nudgeOffset.y = (Math.random() - 0.5) * 12;
      if (seq.frame % 10 === 0) {
        if (window.sfx) window.sfx.armorBreak();
        Particles.add(state, 198 + (Math.random() - 0.5) * 120, 307 + (Math.random() - 0.5) * 80, "#ff1493", 16, 5.0);
      }
    } else {
      state.nudgeOffset.x *= 0.84;
      state.nudgeOffset.y *= 0.84;
    }

    // Flying shards
    seq.shatterPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.98;
      p.angle += p.vAngle;
      p.life--;
    });

    // Step 2: 25..120 Frame -> Billowing Smoke & Whiteout
    if (seq.frame >= 25 && seq.frame <= 120) {
      for (let i = 0; i < 3; i++) {
        const col = Math.random() > 0.5 ? "#ff66b2" : (Math.random() > 0.5 ? "#b84dff" : "#e6e0f8");
        seq.smokeClouds.push(this.spawnSmokeCloud(198, 320, col));
      }
      if (seq.frame % 2 === 0) {
        seq.smokeClouds.push(this.spawnSmokeCloud(100 + Math.random() * 220, 580, "#ffffff"));
      }
    }

    // Whiteout buildup
    if (seq.frame >= 65 && seq.frame <= 105) {
      seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 65) / 38);
      if (seq.frame === 104 && window.sfx) {
        window.sfx.burstTrigger();
      }
    }

    // Step 3: Frame 105+ -> Defeat CG
    if (seq.frame >= 105) {
      seq.cgRevealAlpha = 1.0;
      seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);

      if (seq.frame % 2 === 0) {
        const colors = ["#ffffff", "#f0e6ff", "#d8c8ff", "#ffd1e6", "#6c528a"];
        const col = colors[Math.floor(Math.random() * colors.length)];
        seq.smokeClouds.push({
          x: 288 + (Math.random() - 0.5) * 28,
          y: 450 + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 1.8 + 0.4,
          vy: -1.2 - Math.random() * 2.2,
          r: 16 + Math.random() * 14,
          maxR: 55 + Math.random() * 30,
          growth: 0.65 + Math.random() * 0.55,
          color: col,
          alpha: 0.15,
          maxAlpha: 0.65 + Math.random() * 0.25,
          life: 85 + Math.floor(Math.random() * 40),
          maxLife: 100
        });
      }

      if (seq.frame % 3 === 0) {
        seq.smokeClouds.push({
          x: 200 + (Math.random() - 0.5) * 160,
          y: 520 + (Math.random() - 0.5) * 40,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.0 - Math.random() * 1.8,
          r: 18 + Math.random() * 18,
          maxR: 65 + Math.random() * 35,
          growth: 0.7 + Math.random() * 0.6,
          color: Math.random() > 0.4 ? "#f0e6ff" : "#ffffff",
          alpha: 0.1,
          maxAlpha: 0.5 + Math.random() * 0.25,
          life: 90 + Math.floor(Math.random() * 35),
          maxLife: 110
        });
      }

      if (Math.random() < 0.4) {
        state.particles.push({
          x: 60 + Math.random() * 280,
          y: 480 + Math.random() * 120,
          vx: (Math.random() - 0.5) * 0.8,
          vy: -0.8 - Math.random() * 1.2,
          color: Math.random() > 0.5 ? "#ff66b2" : (Math.random() > 0.5 ? "#00f5d4" : "#e6ff00"),
          life: 50 + Math.floor(Math.random() * 35)
        });
      }
    }

    // Update smoke clouds
    for (let i = seq.smokeClouds.length - 1; i >= 0; i--) {
      const smk = seq.smokeClouds[i];
      smk.x += smk.vx;
      smk.y += smk.vy;
      smk.vy *= 0.98;
      smk.vx *= 0.97;
      if (smk.r < smk.maxR) smk.r += smk.growth;
      smk.life--;
      const progress = 1 - (smk.life / smk.maxLife);
      if (progress < 0.2) {
        smk.alpha = (progress / 0.2) * smk.maxAlpha;
      } else {
        smk.alpha = Math.max(0, (1 - (progress - 0.2) / 0.8) * smk.maxAlpha);
      }
      if (smk.life <= 0 || smk.alpha <= 0.01) {
        seq.smokeClouds.splice(i, 1);
      }
    }

    // Step 4: Frame 155+ -> Show Clear Modal
    if (seq.frame >= 155 && !seq.uiShown) {
      seq.uiShown = true;
      UI.updateHUD(state);
      const modal = document.getElementById("clearModal");
      if (modal) {
        const scoreEl = document.getElementById("clearFinalScore");
        if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
        const ballsEl = document.getElementById("clearRemainingBalls");
        if (ballsEl) ballsEl.textContent = "●".repeat(state.ballsRemaining) + ` (${state.ballsRemaining})`;

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        void modal.offsetWidth;
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
      }
    }
  },

  renderBackground(ctx, state, engine) {
    if (!this.assets.loaded) return;

    const IMG_BOX = engine.IMG_BOX;
    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    const isArmored = !state.boss.chestArmorBroken && this.assets.armoredImg.complete;
    const baseImg = isDefeat ? this.assets.defeatCgImg : (isArmored ? this.assets.armoredImg : this.assets.bareImg);

    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // Bust Spring Dynamics
    if (state.boss.chestArmorBroken && !isDefeat) {
      const dispL = Math.hypot(state.boss.bustL.dx, state.boss.bustL.dy);
      const dispR = Math.hypot(state.boss.bustR.dx, state.boss.bustR.dy);
      if (state.fever.active || dispL > 0.6 || dispR > 0.6) {
        const drawSpringBustPatch = (b) => {
          ctx.save();
          const cx = b.x + b.dx;
          const cy = b.y + b.dy;
          const scaleX = 1 + (b.dx * 0.008) - (b.dy * 0.006);
          const scaleY = 1 + (b.dy * 0.008) - (b.dx * 0.006);

          ctx.translate(cx, cy);
          ctx.scale(scaleX, scaleY);
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.clip();

          const srcScaleX = this.assets.bareImg.width / IMG_BOX.w;
          const srcScaleY = this.assets.bareImg.height / IMG_BOX.h;
          const sx = (b.x - b.r - IMG_BOX.x) * srcScaleX;
          const sy = (b.y - b.r - IMG_BOX.y) * srcScaleY;
          const sw = (b.r * 2) * srcScaleX;
          const sh = (b.r * 2) * srcScaleY;

          ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -b.r, -b.r, b.r * 2, b.r * 2);
          ctx.restore();
        };
        drawSpringBustPatch(state.boss.bustL);
        drawSpringBustPatch(state.boss.bustR);
      }
    }

    // Face Patch Compositing
    let activePatchKey = null;
    if (!isDefeat) {
      const isTalking = state.boss.talkTimer > 0;
      const talkPhase = Math.floor(state.boss.animTick / 5) % 3;
      const isBriefFlinch = state.boss.expressionTimer > 38;

      if (state.boss.expression === "angry_emp" || state.boss.expression === "shock") {
        activePatchKey = isBriefFlinch ? "shout" : ((isTalking && talkPhase === 0) ? "talk" : "open_blush");
      } else if (state.boss.expression === "blush") {
        activePatchKey = isBriefFlinch ? "wince" : ((isTalking && talkPhase === 0) ? "talk" : "open_blush");
      } else if (state.boss.winkTimer > 0) {
        activePatchKey = "wink";
      } else if (state.boss.blinkTimer <= 0 && state.boss.blinkTimer >= -5) {
        activePatchKey = "blink";
      } else if (isTalking) {
        if (talkPhase === 0) activePatchKey = "talk";
        else if (talkPhase === 1) activePatchKey = "talk_sm";
      }
    }

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (135 / 384) * IMG_BOX.w;
      const fy = IMG_BOX.y + (160 / 688) * IMG_BOX.h;
      const fw = (115 / 384) * IMG_BOX.w;
      const fh = (75 / 688) * IMG_BOX.h;
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // Hanging Rabbit Ear Tips
    if (!isDefeat) {
      const drawEarTipSprite = (which, ear) => {
        const img = which === "L" ? this.assets.earTipLImg : this.assets.earTipRImg;
        if (!img.complete) return;

        const isLeft = which === "L";
        const pivotX = ear.ax;
        const pivotY = ear.ay;
        const sX = IMG_BOX.w / 768;
        const sY = IMG_BOX.h / 1376;
        const sprPivotX = isLeft ? 163 : -2;
        const sprPivotY = 48;

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(ear.angle);

        const squash = Math.sin(ear.angle * 6) * 0.05;
        ctx.scale(1 - squash, 1 + squash);

        const drawX = -sprPivotX * sX;
        const drawY = -sprPivotY * sY;
        const drawW = img.width * sX;
        const drawH = img.height * sY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      };

      drawEarTipSprite("L", state.boss.earL);
      drawEarTipSprite("R", state.boss.earR);
    }

    // Billowing Smoke Clouds
    if (state.clearSequence && state.clearSequence.smokeClouds.length > 0) {
      ctx.save();
      state.clearSequence.smokeClouds.forEach(smk => {
        ctx.save();
        ctx.globalAlpha = smk.alpha;
        const grad = ctx.createRadialGradient(smk.x, smk.y, smk.r * 0.15, smk.x, smk.y, smk.r);
        grad.addColorStop(0, smk.color);
        grad.addColorStop(0.65, smk.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smk.x, smk.y, smk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
  },

  renderTargets(ctx, state, engine) {
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
    if (isPostWhiteout) return;

    const animTick = state.boss.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. Drones
    const dL = state.boss.droneL;
    const dR = state.boss.droneR;
    drawGuide(dL.x, dL.y, dL.r, state.boss.droneL_HP > 0 ? "#00f5d4" : "#e6ff00", dL.flash, dL.rot, "L-DRONE", state.boss.droneL_HP > 0 ? `HP:${state.boss.droneL_HP}` : "EX-BUMP");
    drawGuide(dR.x, dR.y, dR.r, state.boss.droneR_HP > 0 ? "#00f5d4" : "#e6ff00", dR.flash, dR.rot, "R-DRONE", state.boss.droneR_HP > 0 ? `HP:${state.boss.droneR_HP}` : "EX-BUMP");

    // 2. Shoulder Armor
    const pL = state.boss.podL;
    const pR = state.boss.podR;
    const shL_HP = state.boss.leftShoulderHP;
    const shR_HP = state.boss.rightShoulderHP;
    const pL_shielded = state.phase === 1 && state.boss.droneL_HP > 0;
    const pR_shielded = state.phase === 1 && state.boss.droneR_HP > 0;
    const colL = shL_HP === 0 ? "#e6ff00" : (pL_shielded ? "#b59ce6" : "#ff1493");
    const colR = shR_HP === 0 ? "#e6ff00" : (pR_shielded ? "#b59ce6" : "#ff1493");
    drawGuide(pL.x, pL.y, pL.r, colL, pL.flash, pL.rot, "L-ARMOR", shL_HP === 0 ? "⚡EX-SPARK" : (pL_shielded ? "🛡️SHIELD" : `HP:${shL_HP}`));
    drawGuide(pR.x, pR.y, pR.r, colR, pR.flash, pR.rot, "R-ARMOR", shR_HP === 0 ? "⚡EX-SPARK" : (pR_shielded ? "🛡️SHIELD" : `HP:${shR_HP}`));

    // 3. Waist / Hip Units
    const hL = state.boss.hipL;
    const hR = state.boss.hipR;
    drawGuide(hL.x, hL.y, hL.r, hL.hp > 0 ? "#ff66b2" : "#00f5d4", hL.flash, hL.rot, "L-HIP", hL.hp > 0 ? `HP:${hL.hp}` : "⚡OVERHEAT");
    drawGuide(hR.x, hR.y, hR.r, hR.hp > 0 ? "#ff66b2" : "#00f5d4", hR.flash, hR.rot, "R-HIP", hR.hp > 0 ? `HP:${hR.hp}` : "⚡OVERHEAT");

    // 4. Exposed Bust Targets
    if (state.boss.chestArmorBroken) {
      const bL = state.boss.bustL;
      const bR = state.boss.bustR;
      const bustCol = state.fever.active ? "#e6ff00" : "#ff1493";
      drawGuide(bL.x + bL.dx, bL.y + bL.dy, bL.r, bustCol, bL.flash, bL.rot, "L-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");
      drawGuide(bR.x + bR.dx, bR.y + bR.dy, bR.r, bustCol, bR.flash, bR.rot, "R-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");
    }

    // 5. Crotch Secret Gravity Well
    if (state.boss.chestArmorBroken) {
      const cr = state.boss.crotch;
      const crChargeStr = "◆".repeat(cr.charge) + "◇".repeat(cr.maxCharge - cr.charge);
      const isCooling = cr.cooldown && cr.cooldown > 0;
      const sub = isCooling ? "COOLING" : `[${crChargeStr}]`;
      const col = isCooling ? "#9933ff" : (cr.charge > 0 ? "#e6ff00" : "#ff1493");

      // Gravitational Pull Waves
      ctx.save();
      ctx.translate(cr.x, cr.y);
      const inwardPhase = (animTick * 0.04) % 1.0;
      const waveRadius = cr.r + (cr.gravRadius - cr.r) * (1.0 - inwardPhase);
      ctx.strokeStyle = "rgba(184, 77, 255, " + (0.45 * inwardPhase).toFixed(2) + ")";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Gravitational Tether Lightning
      state.balls.forEach(b => {
        const d = Math.hypot(cr.x - b.x, cr.y - b.y);
        if (d < cr.gravRadius) {
          ctx.save();
          const beamAlpha = Math.pow(1.0 - d / cr.gravRadius, 1.1) * 0.95;
          ctx.strokeStyle = `rgba(230, 255, 0, ${beamAlpha.toFixed(2)})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(cr.x, cr.y);
          const midX = (cr.x + b.x) / 2 + (Math.random() - 0.5) * 8;
          const midY = (cr.y + b.y) / 2 + (Math.random() - 0.5) * 8;
          ctx.lineTo(midX, midY);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          ctx.strokeStyle = `rgba(184, 77, 255, ${beamAlpha.toFixed(2)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      drawGuide(cr.x, cr.y, cr.r, col, cr.flash, cr.rot, "GRAV CORE", sub);
    }

    // 6. Chest Core Gem Flash
    if (state.boss.core.flash > 0) {
      ctx.save();
      const core = state.boss.core;
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI / 3) * i - Math.PI / 6;
        const px = core.x + Math.cos(ang) * core.r;
        const py = core.y + Math.sin(ang) * core.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = "rgba(230, 255, 0, 0.3)";
      ctx.fill();
      ctx.restore();
    }

    // Overheat Generator Sparks
    [
      { pod: state.boss.podL, hp: state.boss.leftShoulderHP },
      { pod: state.boss.podR, hp: state.boss.rightShoulderHP }
    ].forEach(({ pod, hp }) => {
      if (hp === 0 && Math.random() < 0.35) {
        ctx.save();
        const ang = Math.random() * Math.PI * 2;
        const len = 12 + Math.random() * 16;
        ctx.strokeStyle = Math.random() > 0.5 ? "#e6ff00" : "#00f5d4";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pod.x + (Math.random() - 0.5) * 10, pod.y + (Math.random() - 0.5) * 10);
        ctx.lineTo(pod.x + Math.cos(ang) * len, pod.y + Math.sin(ang) * len);
        ctx.stroke();
        ctx.restore();
      }
    });
  }
};

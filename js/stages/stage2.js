// =========================================================================
// STAGE 2: CELTY (疾風紫電セルティ)
// =========================================================================

window.Stage2 = {
  id: "stage2",
  name: "疾風紫電セルティ",
  bossName: "セルティ (CELTY)",

  assets: {
    armoredImg: new Image(),
    bareImg: new Image(),
    defeatCgImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    this.assets.bareImg.src = "./assets/stage2/centerpiece.jpg";
    this.assets.armoredImg.src = "./assets/stage2/centerpiece.jpg"; // Fallback until armored CG is ready

    const faceData = window.STAGE2_FACE_PATCHES || {};
    Object.entries(faceData).forEach(([k, uri]) => {
      const im = new Image();
      im.src = uri;
      this.assets.facePatchImgs[k] = im;
    });

    let count = 0;
    const check = () => {
      count++;
      if (count >= 1) this.assets.loaded = true;
    };
    this.assets.bareImg.onload = check;
  },

  createBossState() {
    return {
      name: "セルティ",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 100,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,

      // Sensitive Tip Targets (胸の先端 & 髪の先端)
      tipBust: { x: 132, y: 342, r: 16, flash: 0, rot: 0, hp: 6 },
      tipTailL: { x: 88, y: 440, r: 18, flash: 0, rot: 0, angle: 0, vAngle: 0 },
      tipTailR: { x: 308, y: 420, r: 18, flash: 0, rot: 0, angle: 0, vAngle: 0 },

      // Back Jet Thruster (背中ジェット噴射機構)
      jet: {
        x: 198,
        y: 275,
        r: 32,
        active: false,
        timer: 0,
        blastCooldown: 0
      },

      // Asymmetric Posed Collision Bumper Points
      handShield: { x: 145, y: 215, r: 24, flash: 0, rot: 0, hp: 8, broken: false },
      elbowL: { x: 68, y: 290, r: 16, flash: 0, rot: 0 },
      hipR: { x: 275, y: 370, r: 22, flash: 0, rot: 0, hp: 6, broken: false },
      buttCore: { x: 210, y: 465, r: 30, flash: 0, rot: 0, charge: 0, maxCharge: 3 },

      // Stage Progression & Armor States
      armorHandBroken: false,
      armorHipBroken: false,
      armorBustBroken: false,
      allArmorsPurged: false,
      defeatTriggered: false
    };
  },

  update(state, engine) {
    if (!state.boss) return;

    // 1. Natural Blink Cycle
    if (state.boss.blinkTimer > 0) {
      state.boss.blinkTimer--;
    } else {
      state.boss.blinkTimer = 140 + Math.floor(Math.random() * 110);
    }

    // 2. Wink & Expression Timers
    if (state.boss.winkTimer > 0) state.boss.winkTimer--;
    if (state.boss.talkTimer > 0) state.boss.talkTimer--;
    if (state.boss.expressionTimer > 0) {
      state.boss.expressionTimer--;
      if (state.boss.expressionTimer <= 0) {
        state.boss.expression = "normal";
      }
    }

    // 3. Twintail Physical Sway Physics
    const tL = state.boss.tipTailL;
    if (tL) {
      tL.vAngle += -0.04 * tL.angle - 0.02 * tL.vAngle;
      tL.angle += tL.vAngle;
      tL.rot = tL.angle;
    }
    const tR = state.boss.tipTailR;
    if (tR) {
      tR.vAngle += -0.04 * tR.angle - 0.02 * tR.vAngle;
      tR.angle += tR.vAngle;
      tR.rot = tR.angle;
    }

    // 4. Back Jet Thruster Propulsion & Repulsion Wind Blast
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

      // Exhaust flame particles spewing backwards & diagonally
      for (let i = 0; i < 3; i++) {
        const spreadAngle = Math.PI * 0.55 + (Math.random() - 0.5) * 0.75;
        const speed = 4.0 + Math.random() * 5.0;
        state.particles.push({
          x: jet.x + (Math.random() - 0.5) * 16,
          y: jet.y + (Math.random() - 0.5) * 10,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          color: Math.random() < 0.6 ? "#00f5d4" : (Math.random() < 0.5 ? "#ffffff" : "#ff007f"),
          life: 16,
          scale: 1.4 + Math.random() * 0.8
        });
      }

      // Ball Repulsion Wind (Blow away nearby balls!)
      state.balls.forEach(ball => {
        const dx = ball.x - jet.x;
        const dy = ball.y - jet.y;
        const dist = Math.hypot(dx, dy);
        const blastRadius = 175;

        if (dist < blastRadius && dist > 1.0) {
          const force = 12.0 * Math.pow(1.0 - dist / blastRadius, 1.25);
          ball.vx += (dx / dist) * force;
          ball.vy += (dy / dist) * force;

          // Extra speed cap safety
          const spd = Math.hypot(ball.vx, ball.vy);
          if (spd > 22.0) {
            ball.vx = (ball.vx / spd) * 22.0;
            ball.vy = (ball.vy / spd) * 22.0;
          }
        }
      });
    } else if (jet) {
      jet.active = false;
      if (jet.blastCooldown > 0) jet.blastCooldown--;
    }

    // Flash decay on targets
    [state.boss.tipBust, state.boss.tipTailL, state.boss.tipTailR, state.boss.handShield, state.boss.elbowL, state.boss.hipR, state.boss.buttCore].forEach(t => {
      if (t && t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);

    // 1. Sensitive Tip (胸の先端): Triggers Back Jet Blast!
    const bust = state.boss.tipBust;
    if (bust) {
      checkBumper(bust, 9.0, () => {
        bust.flash = 20;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, bust.x, bust.y, "#ff1493", 16, 5.0);
        Particles.spawnHeart(state, bust.x, bust.y, false);

        state.boss.expression = "open_blush";
        state.boss.expressionTimer = 85;
        state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 30);

        // TRIGGER BACK JET PROPULSION!
        this.triggerJetBlast(state, "bust");
        Systems.addScore(state, 12000, bust.x, bust.y, "♥BUST TIP SENSITIVE!♥");
      });
    }

    // 2. Twintail Tips (髪の先端): Physical Sway & Posture Jet Burn
    const tL = state.boss.tipTailL;
    if (tL) {
      checkBumper(tL, 7.5, () => {
        tL.flash = 18;
        tL.vAngle += 0.35;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, tL.x, tL.y, "#00f5d4", 12, 4.0);
        state.boss.expression = "shock";
        state.boss.expressionTimer = 60;
        this.triggerJetBlast(state, "tailL");
        Systems.addScore(state, 6000, tL.x, tL.y, "⚡TAIL TIP IMPACT!");
      });
    }

    const tR = state.boss.tipTailR;
    if (tR) {
      checkBumper(tR, 7.5, () => {
        tR.flash = 18;
        tR.vAngle -= 0.35;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, tR.x, tR.y, "#00f5d4", 12, 4.0);
        state.boss.expression = "shock";
        state.boss.expressionTimer = 60;
        this.triggerJetBlast(state, "tailR");
        Systems.addScore(state, 6000, tR.x, tR.y, "⚡TAIL TIP IMPACT!");
      });
    }

    // 3. Hand Hologram Shield (左手・前方スキルターゲット)
    const hs = state.boss.handShield;
    if (hs) {
      checkBumper(hs, 8.5, () => {
        hs.flash = 20;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, hs.x, hs.y, "#00f5d4", 18, 5.0);
        if (hs.hp > 0) {
          hs.hp--;
          Systems.addScore(state, 3000, hs.x, hs.y, `HAND EMITTER! HP:${hs.hp}`);
          if (hs.hp === 0) {
            hs.broken = true;
            state.boss.armorHandBroken = true;
            Particles.triggerArmorBreakEffect(state, "shoulder_l", hs.x, hs.y);
            UI.showCutin("💥【左手エミッター大破！】💥<br>シールドフィールド完全消滅！", 180);
            Systems.addScore(state, 20000, hs.x, hs.y, "★EMITTER DESTROYED!★");
            Systems.spawnFloatingCapsule(state, 1, "perm");
          }
        } else {
          Systems.addScore(state, 4000, hs.x, hs.y, "⚡EMITTER SPARK!");
        }
      });
    }

    // 4. Left Elbow (左肘アングルバンパー)
    const elb = state.boss.elbowL;
    if (elb) {
      checkBumper(elb, 8.8, () => {
        elb.flash = 16;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, elb.x, elb.y, "#e6ff00", 12, 4.0);
        Systems.addScore(state, 2500, elb.x, elb.y, "ELBOW DEFLECT!");
      });
    }

    // 5. Right Hip / Flank (腰・ヒップ装甲)
    const hip = state.boss.hipR;
    if (hip) {
      checkBumper(hip, 8.0, () => {
        hip.flash = 18;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, hip.x, hip.y, "#ff66b2", 14, 4.5);
        if (hip.hp > 0) {
          hip.hp--;
          Systems.addScore(state, 3000, hip.x, hip.y, `HIP UNIT HP:${hip.hp}`);
          if (hip.hp === 0) {
            hip.broken = true;
            state.boss.armorHipBroken = true;
            Particles.triggerArmorBreakEffect(state, "shoulder_r", hip.x, hip.y);
            UI.showCutin("💥【右腰推進ユニット過熱】<br>姿勢制御ダウン！", 180);
            Systems.addScore(state, 20000, hip.x, hip.y, "★HIP OVERHEAT!★");
          }
        }
      });
    }

    // 6. Butt / Hip Core (ヒップ・ぷるぷる反発バンパー)
    const butt = state.boss.buttCore;
    if (butt) {
      checkBumper(butt, 9.5, () => {
        butt.flash = 24;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, butt.x, butt.y, "#ff1493", 20, 5.0);
        Particles.spawnHeart(state, butt.x, butt.y, false);

        state.boss.expression = "open_blush";
        state.boss.expressionTimer = 80;
        butt.charge++;
        Systems.addScore(state, 5000 * butt.charge, butt.x, butt.y, `🍑HIP PURU-PURU x${butt.charge}!`);

        if (butt.charge >= butt.maxCharge) {
          butt.charge = 0;
          UI.showCutin("🍑【ヒップバースト達成】🍑<br>過剰刺激でフィーバー全開！", 200);
          Systems.startFeverMode(state);
        }
      });
    }
  },

  triggerJetBlast(state, originType) {
    const jet = state.boss.jet;
    if (!jet) return;

    jet.timer = 45; // 45 frames of active jet propulsion
    if (window.sfx && window.sfx.feverAlarm) {
      window.sfx.feverAlarm();
    }

    // Dialogue based on what was touched
    if (originType === "bust") {
      UI.showCutin("🚀【背中ジェット暴走！！】🚀<br>「ひゃんっ！？ どこ当ててるのバカッ！<br>吹き飛びなさいっっ！！」", 200);
    } else {
      UI.showCutin("💨【姿勢制御スラスター点火】💨<br>「くっ……！ 接近させないわよ！」", 160);
    }

    // Initial shockwave ring
    state.shockwaves.push({
      x: jet.x,
      y: jet.y,
      r: 10,
      maxR: 160,
      color: "#00f5d4",
      alpha: 1.0
    });
  },

  renderBackground(ctx, state) {
    const IMG_BOX = { x: 16, y: 16, w: 364, h: 652 };

    if (!this.assets.loaded || !this.assets.bareImg.complete) {
      ctx.fillStyle = "#120624";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    ctx.save();
    ctx.drawImage(this.assets.bareImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // Overlay Dynamic Face Expression Patch
    const isDefeat = state.clearSequence && state.clearSequence.active;
    const activePatchKey = isDefeat ? "open_blush" : (
      state.boss.expression === "open_blush" ? "open_blush" :
      state.boss.expression === "shock" ? "shock" :
      state.boss.expression === "wince" ? "wince" :
      (state.boss.winkTimer > 0 ? "wink" :
      (state.boss.blinkTimer > 0 && state.boss.blinkTimer < 8 ? "blink" :
      (state.boss.talkTimer > 0 ? ((state.boss.talkTimer % 12 < 6) ? "talk" : "talk_sm") : null)))
    );

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      // Relative face box: (270, 310, 190, 170) on 768x1376
      const fx = IMG_BOX.x + (270 / 768) * IMG_BOX.w;
      const fy = IMG_BOX.y + (310 / 1376) * IMG_BOX.h;
      const fw = (190 / 768) * IMG_BOX.w;
      const fh = (170 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // Render Back Jet Exhaust Flames (when active)
    const jet = state.boss.jet;
    if (jet && jet.active) {
      ctx.save();
      ctx.translate(jet.x, jet.y);
      const pulse = 1.0 + Math.sin(Date.now() * 0.05) * 0.25;

      const grad = ctx.createRadialGradient(0, 0, 4, 0, 10, 50 * pulse);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.35, "rgba(0, 245, 212, 0.85)");
      grad.addColorStop(0.7, "rgba(255, 0, 127, 0.6)");
      grad.addColorStop(1, "rgba(0, 245, 212, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Jet Nozzle Ring
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  },

  renderTargets(ctx, state, animTick) {
    if (!state.boss) return;

    const drawGuide = (x, y, r, color, flash, rot, label, sub) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);

      const f = flash || 0;
      ctx.strokeStyle = f > 0 ? "#ffffff" : color;
      ctx.lineWidth = f > 0 ? 3.0 : 1.8;
      ctx.fillStyle = f > 0 ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.22)";

      ctx.beginPath();
      ctx.arc(0, 0, r + (f > 0 ? 3 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tick notches
      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(r - 3, 0);
        ctx.lineTo(r + 4, 0);
        ctx.stroke();
      }

      ctx.restore();

      if (label) {
        ctx.save();
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.fillText(label, x, y - r - 3);
        if (sub) {
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(sub, x, y + r + 10);
        }
        ctx.restore();
      }
    };

    // 1. Sensitive Tip Target (胸の先端 - JET IGNITION)
    const bTip = state.boss.tipBust;
    if (bTip) {
      drawGuide(bTip.x, bTip.y, bTip.r, "#ff1493", bTip.flash, animTick * 0.03, "♥BUST TIP", "⚡JET SENSOR");
    }

    // 2. Twintail Tips (髪の先端)
    const tL = state.boss.tipTailL;
    if (tL) {
      drawGuide(tL.x, tL.y, tL.r, "#00f5d4", tL.flash, tL.rot, "TAIL-L", "SWAY");
    }
    const tR = state.boss.tipTailR;
    if (tR) {
      drawGuide(tR.x, tR.y, tR.r, "#00f5d4", tR.flash, tR.rot, "TAIL-R", "SWAY");
    }

    // 3. Hand Hologram Shield
    const hs = state.boss.handShield;
    if (hs) {
      drawGuide(hs.x, hs.y, hs.r, hs.broken ? "#00f5d4" : "#e6ff00", hs.flash, animTick * 0.02, "SHIELD-PAD", hs.broken ? "BROKEN" : `HP:${hs.hp}`);
    }

    // 4. Left Elbow
    const elb = state.boss.elbowL;
    if (elb) {
      drawGuide(elb.x, elb.y, elb.r, "#00f5d4", elb.flash, animTick * 0.02, "ELBOW", "DEFLECT");
    }

    // 5. Right Hip Unit
    const hip = state.boss.hipR;
    if (hip) {
      drawGuide(hip.x, hip.y, hip.r, hip.broken ? "#00f5d4" : "#ff66b2", hip.flash, -animTick * 0.02, "R-HIP", hip.broken ? "BROKEN" : `HP:${hip.hp}`);
    }

    // 6. Butt / Hip Core
    const butt = state.boss.buttCore;
    if (butt) {
      drawGuide(butt.x, butt.y, butt.r, "#ff1493", butt.flash, animTick * 0.015, "🍑HIP CORE", `[${"◆".repeat(butt.charge)}${"◇".repeat(butt.maxCharge - butt.charge)}]`);
    }

    // 7. Back Jet Nozzle Status
    const jet = state.boss.jet;
    if (jet) {
      ctx.save();
      ctx.translate(jet.x, jet.y);
      ctx.strokeStyle = jet.active ? "#e6ff00" : "rgba(0, 245, 212, 0.4)";
      ctx.lineWidth = jet.active ? 2.5 : 1.2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, jet.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = jet.active ? "#e6ff00" : "#00f5d4";
      ctx.fillText("🚀JET NOZZLE", jet.x, jet.y - jet.r - 2);
      ctx.restore();
    }
  },

  renderHUD(ctx, state) {},
  renderOverlays(ctx, state) {},

  getTargetDesc(state) {
    if (!state.boss) return "---";
    if (state.boss.jet && state.boss.jet.active) {
      return "⚠️JET OVERLOAD BLOWAWAY! 球が吹き飛ばされます！";
    }
    return "TARGET: 胸の先端(BUST TIP)直撃で背中ジェット暴走点火！";
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const dtArmR = document.getElementById("dtArmRStatus");
    if (dtArmR) {
      dtArmR.textContent = state.boss.armorHandBroken ? "💥BROKEN!" : `EMITTER (${state.boss.handShield.hp}/8)`;
      dtArmR.className = state.boss.armorHandBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtArmL = document.getElementById("dtArmLStatus");
    if (dtArmL) {
      dtArmL.textContent = state.boss.armorHipBroken ? "💥BROKEN!" : `HIP UNIT (${state.boss.hipR.hp}/6)`;
      dtArmL.className = state.boss.armorHipBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtChest = document.getElementById("dtChestStatus");
    if (dtChest) {
      dtChest.textContent = `SENSITIVE (HP:${state.boss.tipBust.hp})`;
      dtChest.className = "font-bold text-[#ff1493]";
    }
    const dtCrotch = document.getElementById("dtCrotchStatus");
    if (dtCrotch) {
      const jet = state.boss.jet;
      if (jet && jet.active) {
        dtCrotch.textContent = "🔥JET PROPULSION!";
        dtCrotch.className = "font-bold text-[#e6ff00] animate-pulse";
      } else {
        dtCrotch.textContent = "STANDBY";
        dtCrotch.className = "font-bold text-gray-400";
      }
    }
  }
};

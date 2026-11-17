// =========================================================================
// STAGE 1: RENDERING
// =========================================================================

Object.assign(window.Stage1, {
  renderBackground(ctx, state, engine) {
    if (!this.assets.loaded) return;

    const IMG_BOX = engine.IMG_BOX;
    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    const isChestArmored = !state.boss.chestArmorBroken && this.assets.armoredImg.complete;
    const baseImg = isDefeat ? this.assets.defeatCgImg : (isChestArmored ? this.assets.armoredImg : this.assets.bareImg);

    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // Multi-piece armor stripping overlay: Right Arm, Left Arm, Torso
    if (!isDefeat && this.assets.bareImg.complete && this.assets.armoredImg.complete) {
      const natW = this.assets.bareImg.naturalWidth || 768;
      const natH = this.assets.bareImg.naturalHeight || 1376;

      // Case A: Torso is Armored, but individual arms are PURGED -> patch bare skin onto armored base
      if (isChestArmored) {
        // Right Arm (Character Right / Screen Left)
        if (state.boss.armR_Broken) {
          const sx = natW * 0.05, sy = natH * 0.26, sw = natW * 0.35, sh = natH * 0.54;
          const dx = IMG_BOX.x + IMG_BOX.w * 0.05;
          const dy = IMG_BOX.y + IMG_BOX.h * 0.26;
          const dw = IMG_BOX.w * 0.35;
          const dh = IMG_BOX.h * 0.54;
          ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        // Left Arm (Character Left / Screen Right)
        if (state.boss.armL_Broken) {
          const sx = natW * 0.60, sy = natH * 0.26, sw = natW * 0.35, sh = natH * 0.54;
          const dx = IMG_BOX.x + IMG_BOX.w * 0.60;
          const dy = IMG_BOX.y + IMG_BOX.h * 0.26;
          const dw = IMG_BOX.w * 0.35;
          const dh = IMG_BOX.h * 0.54;
          ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, dx, dy, dw, dh);
        }
      } else {
        // Case B: Torso is Purged (Base is Bare), but arms are still ARMORED -> patch armored sleeves onto bare base
        if (!state.boss.armR_Broken) {
          const sx = natW * 0.05, sy = natH * 0.26, sw = natW * 0.35, sh = natH * 0.54;
          const dx = IMG_BOX.x + IMG_BOX.w * 0.05;
          const dy = IMG_BOX.y + IMG_BOX.h * 0.26;
          const dw = IMG_BOX.w * 0.35;
          const dh = IMG_BOX.h * 0.54;
          ctx.drawImage(this.assets.armoredImg, sx, sy, sw, sh, dx, dy, dw, dh);
        }
        if (!state.boss.armL_Broken) {
          const sx = natW * 0.60, sy = natH * 0.26, sw = natW * 0.35, sh = natH * 0.54;
          const dx = IMG_BOX.x + IMG_BOX.w * 0.60;
          const dy = IMG_BOX.y + IMG_BOX.h * 0.26;
          const dw = IMG_BOX.w * 0.35;
          const dh = IMG_BOX.h * 0.54;
          ctx.drawImage(this.assets.armoredImg, sx, sy, sw, sh, dx, dy, dw, dh);
        }
      }
    }

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

    // Face Patch Compositing (瞬き・ウインク・感情遷移シーケンス・口パク)
    if (!isDefeat) {
      const activePatchKey = StageCommon.getActiveFacePatchKey(state.boss, state, {
        defaultExpr: "smile",
        aliasMap: { blush: "open_blush", angry_emp: "shout" },
        halfBlink: false
      });
      StageCommon.drawFacePatch(
        ctx,
        this.assets.facePatchImgs,
        activePatchKey,
        IMG_BOX,
        { x: 135, y: 160, w: 115, h: 75 },
        { w: 384, h: 688 }
      );
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
    StageCommon.renderSmokeClouds(ctx, state);
  },

  renderTargets(ctx, state, engine) {
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
    if (isPostWhiteout) return;

    const animTick = state.boss.animTick || 0;
    const TC = Particles.TARGET_COLORS;
    const drawGuide = (x, y, r, color, flash, rot, label, sub, opts) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub, opts);

    // 1. Drones (防衛ユニット: 紫 / 破壊後: スコアバンパー)
    const dL = state.boss.droneL;
    const dR = state.boss.droneR;
    if (state.boss.droneL_HP > 0) {
      drawGuide(dL.x, dL.y, dL.r, TC.DEFENSE, dL.flash, dL.rot, "L-DRONE", `HP:${state.boss.droneL_HP}`, { isAttack: true });
    } else {
      Particles.drawBounceBumperGuide(ctx, animTick, dL.x, dL.y, dL.r, TC.SCORE, dL.flash, "L-DRONE", "EX-BUMP");
    }
    if (state.boss.droneR_HP > 0) {
      drawGuide(dR.x, dR.y, dR.r, TC.DEFENSE, dR.flash, dR.rot, "R-DRONE", `HP:${state.boss.droneR_HP}`, { isAttack: true });
    } else {
      Particles.drawBounceBumperGuide(ctx, animTick, dR.x, dR.y, dR.r, TC.SCORE, dR.flash, "R-DRONE", "EX-BUMP");
    }

    // 2. Arm / Shoulder Armor (ロック中: 薄紫・回転停止 / 攻撃可: 赤 / 破壊後: スコアバンパー)
    const pL = state.boss.podL;
    const pR = state.boss.podR;
    const armR_Broken = state.boss.armR_Broken;
    const armL_Broken = state.boss.armL_Broken;
    const pL_shielded = state.phase === 1 && state.boss.droneL_HP > 0;
    const pR_shielded = state.phase === 1 && state.boss.droneR_HP > 0;
    if (armR_Broken) {
      Particles.drawBounceBumperGuide(ctx, animTick, pL.x, pL.y, pL.r, TC.SCORE, pL.flash, "R-ARM", "⚡EX-SPARK");
    } else {
      drawGuide(pL.x, pL.y, pL.r, pL_shielded ? TC.LOCKED : TC.ATTACK, pL.flash, pL.rot, "R-ARM", pL_shielded ? "🛡️SHIELD" : `HP:${state.boss.armR_HP}`, { isLocked: pL_shielded, isAttack: !pL_shielded });
    }
    if (armL_Broken) {
      Particles.drawBounceBumperGuide(ctx, animTick, pR.x, pR.y, pR.r, TC.SCORE, pR.flash, "L-ARM", "⚡EX-SPARK");
    } else {
      drawGuide(pR.x, pR.y, pR.r, pR_shielded ? TC.LOCKED : TC.ATTACK, pR.flash, pR.rot, "L-ARM", pR_shielded ? "🛡️SHIELD" : `HP:${state.boss.armL_HP}`, { isLocked: pR_shielded, isAttack: !pR_shielded });
    }

    // 3. Waist / Hip Units (任意破壊 × スコア倍率: 外黄 / 内赤 → 破壊後グレー)
    const hL = state.boss.hipL;
    const hR = state.boss.hipR;
    if (hL.hp > 0) {
      drawGuide(hL.x, hL.y, hL.r, TC.SCORE, hL.flash, hL.rot, "L-HIP", `HP:${hL.hp}`, { innerColor: TC.ATTACK });
    } else {
      Particles.drawBounceBumperGuide(ctx, animTick, hL.x, hL.y, hL.r, TC.BROKEN, hL.flash, "L-HIP", "⚡OVERHEAT");
    }
    if (hR.hp > 0) {
      drawGuide(hR.x, hR.y, hR.r, TC.SCORE, hR.flash, hR.rot, "R-HIP", `HP:${hR.hp}`, { innerColor: TC.ATTACK });
    } else {
      Particles.drawBounceBumperGuide(ctx, animTick, hR.x, hR.y, hR.r, TC.BROKEN, hR.flash, "R-HIP", "⚡OVERHEAT");
    }

    // 4. Chest Armor Vents / Exposed Bust Targets
    if (!state.boss.chestArmorBroken) {
      // 胸部排気口（進行必須 × お色気: 外赤 / 内ピンク）
      const vL = state.boss.ventL;
      const vR = state.boss.ventR;
      if (vL) {
        drawGuide(vL.x, vL.y, vL.r, vL.hp > 0 ? TC.ATTACK : TC.BROKEN, vL.flash, -animTick * 0.02, "L-VENT", vL.hp > 0 ? `HP:${vL.hp}` : "DAMAGED", { innerColor: vL.hp > 0 ? TC.SEXY : null, isAttack: vL.hp > 0 });
      }
      if (vR) {
        drawGuide(vR.x, vR.y, vR.r, vR.hp > 0 ? TC.ATTACK : TC.BROKEN, vR.flash, animTick * 0.02, "R-VENT", vR.hp > 0 ? `HP:${vR.hp}` : "DAMAGED", { innerColor: vR.hp > 0 ? TC.SEXY : null, isAttack: vR.hp > 0 });
      }

      // 首元のジュエル（CORE JEWEL）：Phase 3 前は静かな六角フレーム（両耳達成時は黄、通常は薄紫）
      const core = state.boss.core;
      if (core) {
        ctx.save();
        ctx.strokeStyle = state.boss.coreUnlocked ? "rgba(230, 255, 0, 0.70)" : "rgba(143, 122, 184, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i - Math.PI / 6;
          const px = core.x + Math.cos(ang) * (core.r - 2);
          const py = core.y + Math.sin(ang) * (core.r - 2);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    } else {
      const bL = state.boss.bustL;
      const bR = state.boss.bustR;
      const bustCol = state.fever.active ? TC.FEVER : TC.SEXY;
      Particles.drawBounceBumperGuide(ctx, animTick, bL.x + bL.dx, bL.y + bL.dy, bL.r, bustCol, bL.flash, "L-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");
      Particles.drawBounceBumperGuide(ctx, animTick, bR.x + bR.dx, bR.y + bR.dy, bR.r, bustCol, bR.flash, "R-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");

      // Phase 3 コア露出時はクリティカル目標として強調表示
      if (state.phase === 3 && state.boss.coreUnlocked && state.boss.coreHP > 0 && state.boss.core) {
        const core = state.boss.core;
        drawGuide(core.x, core.y, core.r, TC.ATTACK, core.flash, animTick * 0.045, "★CORE JEWEL★", `HP:${state.boss.coreHP}/16`, { isCritical: true, innerColor: TC.SCORE });
      }
    }

    // 5. Crotch Secret Gravity Well (Reacts to Bust-boing Excitement!)
    if (state.boss.chestArmorBroken) {
      const cr = state.boss.crotch;
      const crChargeStr = "◆".repeat(cr.charge) + "◇".repeat(cr.maxCharge - cr.charge);
      const isCooling = cr.cooldown && cr.cooldown > 0;

      const excitementRatio = Math.min(1.0, (state.boss.bustExcitement || 0) / 100);
      const isExcited = excitementRatio > 0.30;

      const sub = isCooling ? "COOLING" : (isExcited ? "♥BOOSTED♥" : `[${crChargeStr}]`);
      const col = isCooling ? TC.LOCKED : TC.SEXY;
      const innerCol = isCooling ? null : (isExcited ? TC.SCORE : TC.DEFENSE);

      // Gravitational Pull Waves (intensifies with excitement)
      ctx.save();
      ctx.translate(cr.x, cr.y);
      const inwardSpeed = 0.03 + 0.05 * excitementRatio;
      const inwardPhase = (animTick * inwardSpeed) % 1.0;
      const waveRadius = cr.r + (cr.gravRadius - cr.r) * (1.0 - inwardPhase);
      const waveAlpha = (0.25 + 0.65 * excitementRatio) * inwardPhase;
      ctx.strokeStyle = isExcited ? `rgba(255, 20, 147, ${waveAlpha.toFixed(2)})` : `rgba(184, 77, 255, ${waveAlpha.toFixed(2)})`;
      ctx.lineWidth = 1.4 + 2.0 * excitementRatio;
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

      drawGuide(cr.x, cr.y, cr.r, col, cr.flash, cr.rot, "GRAV CORE", sub, { innerColor: innerCol, isLocked: isCooling });
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
    const drawPodSpark = (pod, hp) => {
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
    };
    drawPodSpark(state.boss.podL, state.boss.armL_HP);
    drawPodSpark(state.boss.podR, state.boss.armR_HP);
  }
});

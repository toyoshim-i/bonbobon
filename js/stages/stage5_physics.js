// =========================================================================
// STAGE 5: PHYSICS & COLLISIONS
// =========================================================================

Object.assign(window.Stage5, {
  update(state, engine) {
    const b = state.boss;
    if (!b) return;
    b.animTick++;

    // Clear sequence progress
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: t("engine.stage5.finalDisplayName"),
        defeatQuoteHtml: t("stage5.defeatQuote"),
        smokeColors: ["#ffffff", "#00f5e8", "#ff2ad4", "#ffe57f", "#b84dff"]
      });
      return;
    }

    // Update face animation
    StageCommon.updateFaceAnim(b, "normal");

    // Timers
    if (state.leftFlipperDown || state.rightFlipperDown) {
      b.lastFlipActiveTimer = 95;
    } else if (b.lastFlipActiveTimer > 0) {
      b.lastFlipActiveTimer--;
    }
    if (b.coreGraceTimer > 0) b.coreGraceTimer--;
    if (b.fusionFlashTimer > 0) b.fusionFlashTimer--;
    if (b.crescendoFlash > 0) b.crescendoFlash--;
    if (b.elle.blushTimer > 0) b.elle.blushTimer--;
    if (b.noel.blushTimer > 0) b.noel.blushTimer--;
    if (b.navelBeam.pluckAmp > 0.05) {
      b.navelBeam.pluckAmp *= 0.90;
    } else {
      b.navelBeam.pluckAmp = 0;
    }

    const tick = b.animTick;

    // Fusion sequence progression (Cinematic 3-Beat Transformation)
    if (b.fusionSeq && b.fusionSeq.active) {
      const fs = b.fusionSeq;
      // Stasis field: float all playfield balls gently to prevent any drain
      state.balls.forEach(ball => {
        if (!ball.inShooterLane && !ball._onWireRamp) {
          ball._fusionStasis = true;
          ball.x += (198 - ball.x) * 0.004;
          ball.y = Math.min(480, ball.y) + Math.sin(b.animTick * 0.12) * 0.35;
          ball.vx = 0;
          ball.vy = 0;
        }
      });

      fs.frame++;

      // Beat 1 (frame 1..69) — Twins Double-Helix Skyward Exit & Whiteout Swell
      if (fs.frame < 70) {
        const u = fs.frame / 69;
        const helixR = (1 - u * 0.65) * 68;
        const ang = u * Math.PI * 3.5;
        const cy = 270 - Math.pow(u, 1.85) * 430;

        b.elle.dx = 198 + Math.cos(ang) * helixR - (b.baseL.x + b.baseL.w * 0.5);
        b.elle.dy = cy - (b.baseL.y + b.baseL.h * 0.45);
        b.noel.dx = 198 + Math.cos(ang + Math.PI) * helixR - (b.baseR.x + b.baseR.w * 0.5);
        b.noel.dy = cy - (b.baseR.y + b.baseR.h * 0.45);

        if (b.elleBelly) {
          b.elleBelly.x = 159.1 + b.elle.dx;
          b.elleBelly.y = 426.9 + b.elle.dy;
        }
        if (b.noelBelly) {
          b.noelBelly.x = 265.3 + b.noel.dx;
          b.noelBelly.y = 288.4 + b.noel.dy;
        }
        b.elleSpring.x = b.prismL.homeX + b.elle.dx;
        b.elleSpring.y = b.prismL.homeY + b.elle.dy;
        b.noelSpring.x = b.prismR.homeX + b.noel.dx;
        b.noelSpring.y = b.prismR.homeY + b.noel.dy;
        [b.noelAntR, b.noelAntL].forEach(ant => {
          if (!ant) return;
          ant.pivotX = ant.homePivotX + b.noel.dx;
          ant.pivotY = ant.homePivotY + b.noel.dy;
          ant.restTipX = ant.homeTipX + b.noel.dx;
          ant.restTipY = ant.homeTipY + b.noel.dy;
        });

        b.animTick += 4; // Scroll 3D wireframe grid 5x faster!
        fs.whiteout = fs.frame < 38 ? 0 : Math.min(1.0, (fs.frame - 38) / 31);
      } else if (fs.frame === 70) {
        // Beat 2 begins
        state.phase = 3;
        b.fused = true;
        b.expression = "blink";
        b.expressionTimer = 95;
        Systems.dropReward(state, "major", { x: 198, y: 240 });
        Systems.addScore(state, ScoreTable.stage5.SERAPHIA_AWAKENING, 198, 240, "✨SERAPHIA AWAKENING!!");
        fs.seraOffsetY = -220;
      } else if (fs.frame <= 160) {
        // Beat 2 (frame 70..160) — Heavenly God-Rays & Slow Descent of Seraphia
        const v = (fs.frame - 70) / 90;
        const ease = 1 - Math.pow(1 - v, 3);
        fs.seraOffsetY = -220 * (1 - ease);
        fs.whiteout = Math.max(0, 1.0 - (fs.frame - 70) / 52);
        if (fs.frame % 4 === 0) {
          Particles.add(state, 198 + (Math.random() - 0.5) * 260, 50 + Math.random() * 200, Math.random() < 0.5 ? "#ff2ad4" : "#00f5e8", 2, 2.5);
        }
      } else if (fs.frame <= 195) {
        // Beat 3 (frame 161..195) — Odd-Eye Awakening & Release
        if (fs.frame === 161) {
          fs.seraOffsetY = 0;
          b.subFlippersDeployed = true;
          StageCommon.setExpressionSequence(state, [
            { expr: "shout", frames: 34 },
            { expr: "wink", frames: 30 }
          ]);
          if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
          if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 75, speed: 4.5, color: "#ff2ad4", lineWidth: 3.5, alpha: 1.0 });
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 92, speed: 5.0, color: "#00f5e8", lineWidth: 3.5, alpha: 1.0 });
          state.shockwaves.push({ x: 22,  y: 324, r: 6, maxR: 54, speed: 4.0, color: "#e6ff00", lineWidth: 3.2, alpha: 1.0 });
          state.shockwaves.push({ x: 374, y: 324, r: 6, maxR: 54, speed: 4.0, color: "#00f5e8", lineWidth: 3.2, alpha: 1.0 });
          Particles.add(state, 22,  324, "#e6ff00", 24, 5.5);
          Particles.add(state, 374, 324, "#00f5e8", 24, 5.5);
          UI.showCutin(t("stage5.cutin.wingPaddles"), 210);
        }
        b.subFlipperDeploy = Math.min(1.0, (b.subFlipperDeploy || 0) + 1 / 34);
        if (fs.frame >= 195) {
          fs.active = false;
          fs.whiteout = 0;
          b.subFlipperDeploy = 1.0;
          state.balls.forEach(ball => {
            if (ball._fusionStasis) {
              ball._fusionStasis = false;
              ball.vx = (Math.random() < 0.5 ? -1 : 1) * 3.8;
              ball.vy = -6.8;
            }
          });
          // 合体開幕を派手にするため、支援マルチボールを1球追加投入！
          const playBalls = state.balls.filter(ball => !ball.inShooterLane);
          if (playBalls.length < 2 && window.Systems && Systems.spawnBall) {
            Systems.spawnBall(state, 198 + (Math.random() - 0.5) * 36, 260, (Math.random() < 0.5 ? -1 : 1) * 4.2, -7.2);
          }
          UI.updateHUD(state);
        }
      }
      if (b.animTick % 4 === 0) {
        this.updateStatusMonitor(state);
      }
      return;
    }

    const activePlayBalls = state.balls.filter(ball => !ball.inShooterLane && !ball._onWireRamp && ball.y < 590);

    // Soft spring & movement updates by Phase
    if (state.phase < 3) {
      StageCommon.stepSoftSpring(b.elleSpring, 0.22, 0.87, 5.2);
      StageCommon.stepSoftSpring(b.noelSpring, 0.22, 0.87, 5.2);
      if (b.elleBelly) StageCommon.stepSoftSpring(b.elleBelly, 0.19, 0.88, b.elleBroken ? 6.4 : 6.2);
      if (b.noelBelly) StageCommon.stepSoftSpring(b.noelBelly, 0.19, 0.88, b.noelBroken ? 6.4 : 6.2);
      if (b.elleHip) StageCommon.stepSoftSpring(b.elleHip, 0.18, 0.88, 6.4);
      if (b.noelHip) StageCommon.stepSoftSpring(b.noelHip, 0.18, 0.88, 6.4);

      // Independent movement per twin (broken twin immediately enters wide solo flight!)
      if (!b.elleBroken) {
        b.elle.dx = Math.sin(tick * 0.037) * 7.5;
        b.elle.dy = Math.cos(tick * 0.049) * 8.0;
      } else {
        b.elle.dx = Math.sin(tick * 0.031) * 28 + 10;
        b.elle.dy = Math.cos(tick * 0.043) * 26 - 12;
      }
      if (!b.noelBroken) {
        b.noel.dx = Math.cos(tick * 0.043) * 8.0;
        b.noel.dy = Math.sin(tick * 0.053) * 8.5;
      } else {
        b.noel.dx = Math.cos(tick * 0.036) * 30 - 12;
        b.noel.dy = Math.sin(tick * 0.047) * 32 + 16;
      }

      b.haloL.x = b.haloL.homeX + b.elle.dx;
      b.haloL.y = b.haloL.homeY + b.elle.dy;
      b.odangoL.x = b.odangoL.homeX + b.elle.dx;
      b.odangoL.y = b.odangoL.homeY + b.elle.dy;
      b.kneeL.x = b.kneeL.homeX + b.elle.dx;
      b.kneeL.y = b.kneeL.homeY + b.elle.dy;
      b.prismL.x = b.prismL.homeX + b.elle.dx;
      b.prismL.y = b.prismL.homeY + b.elle.dy;
      b.charmL.x = b.charmL.homeX + b.elle.dx;
      b.charmL.y = b.charmL.homeY + b.elle.dy;

      b.haloR.x = b.haloR.homeX + b.noel.dx;
      b.haloR.y = b.haloR.homeY + b.noel.dy;
      b.antennaR.x = b.antennaR.homeX + b.noel.dx;
      b.antennaR.y = b.antennaR.homeY + b.noel.dy;
      b.kneeR.x = b.kneeR.homeX + b.noel.dx;
      b.kneeR.y = b.kneeR.homeY + b.noel.dy;
      b.prismR.x = b.prismR.homeX + b.noel.dx;
      b.prismR.y = b.prismR.homeY + b.noel.dy;
      b.charmR.x = b.charmR.homeX + b.noel.dx;
      b.charmR.y = b.charmR.homeY + b.noel.dy;
      [b.noelAntR, b.noelAntL].forEach(ant => {
        if (!ant) return;
        ant.pivotX = ant.homePivotX + b.noel.dx;
        ant.pivotY = ant.homePivotY + b.noel.dy;
        ant.restTipX = ant.homeTipX + b.noel.dx;
        ant.restTipY = ant.homeTipY + b.noel.dy;
        ant.angleVel = (ant.angleVel - 0.19 * ant.angle) * 0.87;
        ant.angle += ant.angleVel;
        if (ant.angle > 0.44) { ant.angle = 0.44; ant.angleVel *= -0.5; }
        if (ant.angle < -0.44) { ant.angle = -0.44; ant.angleVel *= -0.5; }
        if (ant.flash > 0) ant.flash--;
      });

      b.synchroSpark.x = 198.5 + (b.elle.dx + b.noel.dx) * 0.5;
      b.synchroSpark.y = 278.0 + (b.elle.dy + b.noel.dy) * 0.5;

      b.elleSpring.x = b.prismL.homeX + b.elle.dx;
      b.elleSpring.y = b.prismL.homeY + b.elle.dy;
      b.noelSpring.x = b.prismR.homeX + b.noel.dx;
      b.noelSpring.y = b.prismR.homeY + b.noel.dy;
      if (b.elleBelly) {
        b.elleBelly.x = 159.1 + b.elle.dx;
        b.elleBelly.y = 426.9 + b.elle.dy;
      }
      if (b.noelBelly) {
        b.noelBelly.x = 265.3 + b.noel.dx;
        b.noelBelly.y = 288.4 + b.noel.dy;
      }
      if (b.elleHip) {
        b.elleHip.x = 145.4 + b.elle.dx;
        b.elleHip.y = 434.9 + b.elle.dy;
      }
      if (b.noelHip) {
        b.noelHip.x = 260.1 + b.noel.dx;
        b.noelHip.y = 294.5 + b.noel.dy;
      }

      // Intermittent & Reactive Navel-to-Navel Intercept Beam state machine!
      const nb = b.navelBeam;
      const hasRisingBall = activePlayBalls.some(ball => ball.vy < -2.3 && ball.y > 315 && ball.y < 575);
      if (nb.mode === "idle") {
        nb.timer--;
        if (hasRisingBall && nb.timer > 0 && nb.timer <= 55) {
          nb.timer = Math.max(0, nb.timer - 3);
        }
        if ((nb.timer <= 0 && hasRisingBall) || nb.timer <= -95) {
          nb.mode = "charging";
          nb.timer = hasRisingBall ? 10 : 18;
        }
      } else if (nb.mode === "charging") {
        nb.timer--;
        if (nb.timer <= 0) {
          nb.mode = "active";
          nb.timer = state.phase === 1 ? 125 : 150;
          nb.pluckAmp = 6;
          if (window.sfx && window.sfx.navelBeamPluck) window.sfx.navelBeamPluck();
        }
      } else if (nb.mode === "active") {
        nb.timer--;
        if (nb.timer <= 0) {
          nb.mode = "idle";
          nb.timer = state.phase === 1 ? 110 : 80;
        }
      }
    } else {
      // Phase 3
      if (b.chestArmorBroken) {
        StageCommon.stepSoftSpring(b.bustL, 0.16, 0.89, 11.8);
        StageCommon.stepSoftSpring(b.bustR, 0.16, 0.89, 11.8);
        StageCommon.stepSoftSpring(b.hipL, 0.18, 0.88, 9.5);
        StageCommon.stepSoftSpring(b.hipR, 0.18, 0.88, 9.5);

        // Respawn orbs if both defeated
        if (b.cherubOrbs.every(o => !o.active) && b.core.hp > 0) {
          b.orbCooldown--;
          if (b.orbCooldown <= 0) {
            b.cherubOrbs.forEach((o, idx) => {
              o.active = true;
              o.hp = o.maxHP;
              o.flash = 20;
              o.shotTimer = idx === 0 ? 95 : 155;
              o.chargeTimer = 0;
            });
            b.orbCooldown = 330;
            if (window.sfx && window.sfx.bunshinSummon) window.sfx.bunshinSummon();
            Particles.addPopup(state, 198, 205, t("stage5.popup.orbRespawn"), "#00f5e8", 1.1);
          }
        }
        // Rotate active orbs & trigger aim/fire cycle
        const oAngle = b.animTick * (b.finalCrescendo ? 0.068 : 0.052);
        b.cherubOrbs[0].x = 198 + Math.cos(oAngle) * 104;
        b.cherubOrbs[0].y = 205 + Math.sin(oAngle) * 40;
        b.cherubOrbs[1].x = 198 + Math.cos(oAngle + Math.PI) * 104;
        b.cherubOrbs[1].y = 205 + Math.sin(oAngle + Math.PI) * 40;
        if (typeof this.stepOrbAttack === "function") {
          this.stepOrbAttack(state, b, activePlayBalls);
        }
      } else {
        StageCommon.stepSoftSpring(b.bustL, 0.19, 0.88, 6.5);
        StageCommon.stepSoftSpring(b.bustR, 0.19, 0.88, 6.5);
        StageCommon.stepSoftSpring(b.hipL, 0.19, 0.88, 6.0);
        StageCommon.stepSoftSpring(b.hipR, 0.19, 0.88, 6.0);
      }

      // Step 10-zone random glowing circuit traces on Seraphia's suit & thighs!
      if (b.circuitZones) {
        b.circuitWaveTimer--;
        if (b.circuitWaveTimer <= 0) {
          b.circuitWaveTimer = 140 + Math.floor(Math.random() * 90);
          // Top-to-bottom or bottom-to-top bi-color circuit cascade!
          const revWave = Math.random() < 0.35;
          const tiers = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
          tiers.forEach((pair, ti) => {
            const delay = (revWave ? (4 - ti) : ti) * 6 + 1;
            pair.forEach(zi => {
              b.circuitZones[zi].cooldown = Math.min(b.circuitZones[zi].cooldown, delay);
              b.circuitZones[zi].peak = 1.0;
            });
          });
        }
        // Impact reactive boost when soft-bodies or targets flash
        if (b.bustL.flash > 10 || b.pauldronL.flash > 10) { b.circuitZones[0].alpha = 1.0; b.circuitZones[2].alpha = 0.95; }
        if (b.bustR.flash > 10 || b.pauldronR.flash > 10) { b.circuitZones[1].alpha = 1.0; b.circuitZones[3].alpha = 0.95; }
        if (b.navelSera.flash > 10) { b.circuitZones[4].alpha = 1.0; b.circuitZones[5].alpha = 1.0; }
        if (b.garterL.flash > 10) { b.circuitZones[6].alpha = 1.0; b.circuitZones[8].alpha = 0.95; }
        if (b.garterR.flash > 10) { b.circuitZones[7].alpha = 1.0; b.circuitZones[9].alpha = 0.95; }

        for (let zi = 0; zi < b.circuitZones.length; zi++) {
          const cz = b.circuitZones[zi];
          if (cz.hold > 0) {
            cz.hold--;
            cz.alpha += (cz.peak - cz.alpha) * 0.52;
            if (cz.hold === 0 && cz.doublePulse) {
              cz.doublePulse = false;
              cz.alpha = 0.22;
              cz.cooldown = 5;
              cz.peak = 1.0;
            }
          } else {
            cz.alpha *= state.fever.active ? 0.91 : 0.87;
            if (cz.alpha < 0.02) cz.alpha = 0;
            cz.cooldown--;
            if (cz.cooldown <= 0) {
              cz.peak = 0.78 + Math.random() * 0.22;
              cz.hold = 7 + Math.floor(Math.random() * 15);
              cz.doublePulse = Math.random() < 0.38;
              cz.cooldown = (state.fever.active ? 16 : 26) + Math.floor(Math.random() * 68);
            }
          }
        }
      }

      // 5. Seraphia's Navel Gravity Vortex ➔ Crotch Gate Straight-Down Spit
      const nt = b.navelTrap;
      if (nt) {
        if (nt.capturedBall && !state.balls.includes(nt.capturedBall)) {
          nt.capturedBall = null;
          nt.mode = "idle";
          nt.timer = 115;
        }

        if (nt.mode === "idle") {
          nt.gateOpen *= 0.85;
          nt.timer--;
          if (nt.timer <= 0 && activePlayBalls.length > 0) {
            nt.mode = "vortex";
            nt.timer = 220;
            if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
          }
        } else if (nt.mode === "vortex") {
          nt.timer--;
          if (nt.timer <= 0) {
            nt.mode = "idle";
            nt.timer = b.chestArmorBroken ? 95 : 115;
          }
        } else if (nt.mode === "digesting") {
          nt.timer--;
          const prog = 1 - (nt.timer / 48);
          nt.gateOpen = Math.min(1, prog * 1.6);
          if (nt.capturedBall) {
            nt.capturedBall.x = 198.0;
            nt.capturedBall.y = 284.6 + prog * 61.4;
            nt.capturedBall.vx = 0;
            nt.capturedBall.vy = 0;
          }
          b.hipL.vx += Math.sin(b.animTick * 0.6) * 0.9;
          b.hipR.vx -= Math.sin(b.animTick * 0.6) * 0.9;

          if (nt.timer <= 0) {
            const cb = nt.capturedBall;
            nt.capturedBall = null;
            if (cb) {
              cb._inNavelTrap = false;
              cb._crotchSpitActive = true;
              if (!cb.hitCooldowns) cb.hitCooldowns = {};
              cb.hitCooldowns.crotchSpit = 95;
              cb.x = 198.0;
              cb.y = 350.0;
              cb.vx = 0.0;
              cb.vy = 10.6;
            }
            nt.mode = "spit_cool";
            nt.timer = 36;
            b.hipL.vx -= 6.5;
            b.hipR.vx += 6.5;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            state.shockwaves.push({ x: 198, y: 348, r: 8, maxR: 50, speed: 4.5, color: "#ff1493", lineWidth: 3.0, alpha: 1.0 });
            Particles.addPopup(state, 198, 370, t("stage5.popup.navelEject"), "#ff2ad4", 1.15);
          }
        } else if (nt.mode === "spit_cool") {
          nt.timer--;
          nt.gateOpen = Math.max(0, nt.timer / 36);
          if (nt.timer <= 0) {
            nt.mode = "idle";
            nt.timer = b.chestArmorBroken ? 95 : 115;
          }
        }
      }

      // Step Sanctuary Rising Feathers
      if (b.sanctuaryFeathers) {
        b.sanctuaryFeathers.forEach(f => {
          f.y -= f.spd;
          f.x += Math.sin(tick * 0.04 + f.phase) * f.sway * 0.5;
          if (f.y < -20) {
            f.y = 670;
            f.x = 20 + Math.random() * 380;
          }
        });
      }

      // Seraphic Harmony Beam countdown & Mid-Field Wing-Paddle deploy guarantee
      if (b.harmonyBeamTimer > 0) b.harmonyBeamTimer--;
      if (!b.subFlippersDeployed) b.subFlippersDeployed = true;
      if ((b.subFlipperDeploy || 0) < 1.0) {
        b.subFlipperDeploy = Math.min(1.0, (b.subFlipperDeploy || 0) + 1 / 30);
      }

      // Grand Phase 3 Boss Attack: Rotating Star Laser, Staggered Feint Light-Swords & Converging Pillars
      const sa = b.seraphAttack;
      const isCresc = !!b.finalCrescendo;
      const idleRecovery = isCresc ? 42 : (b.chestArmorBroken ? 68 : 88);
      if (sa && (!b.fusionSeq || !b.fusionSeq.active)) {
        if (sa.mode === "idle") {
          sa.timer--;
          if (sa.timer <= 0 && activePlayBalls.length > 0) {
            if (sa.nextType === "cross") {
              sa.mode = "cross_warn";
              sa.timer = isCresc ? 28 : 34;
              sa.baseAngle = Math.random() * Math.PI;
              sa.armCount = b.chestArmorBroken ? 6 : 4;
              sa.rotDir = Math.random() < 0.5 ? 1 : -1;
              sa.nextType = "sword";
              if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            } else if (sa.nextType === "sword") {
              sa.mode = "sword_warn";
              sa.timer = isCresc ? 26 : 32;
              sa.nextType = "pillars";
              const portals = isCresc
                ? [
                    { x: 56,  y: 146, targetX: 256, delay: 0 },
                    { x: 96,  y: 114, targetX: 136, delay: 10 },
                    { x: 142, y: 92,  targetX: 262, delay: 16 },
                    { x: 184, y: 80,  targetX: 146, delay: 28 },
                    { x: 212, y: 80,  targetX: 250, delay: 34 },
                    { x: 254, y: 92,  targetX: 134, delay: 40 },
                    { x: 300, y: 114, targetX: 260, delay: 50 },
                    { x: 340, y: 146, targetX: 140, delay: 56 }
                  ]
                : (b.chestArmorBroken
                    ? [
                        { x: 74,  y: 130, targetX: 130, delay: 0 },
                        { x: 132, y: 102, targetX: 260, delay: 12 },
                        { x: 186, y: 86,  targetX: 146, delay: 18 },
                        { x: 210, y: 86,  targetX: 248, delay: 32 },
                        { x: 264, y: 102, targetX: 134, delay: 38 },
                        { x: 322, y: 130, targetX: 264, delay: 44 }
                      ]
                    : [
                        { x: 86,  y: 126, targetX: 132, delay: 0 },
                        { x: 158, y: 98,  targetX: 248, delay: 14 },
                        { x: 238, y: 98,  targetX: 148, delay: 22 },
                        { x: 310, y: 126, targetX: 264, delay: 28 }
                      ]);
              sa.portals = portals;
              if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
            } else {
              sa.mode = "pillars_warn";
              sa.timer = isCresc ? 34 : 42;
              sa.nextType = "cross";
              const bases = b.chestArmorBroken ? [74, 156, 240, 322] : [88, 198, 308];
              const jitter = b.chestArmorBroken ? 10 : 14;
              const convergeVels = isCresc ? [0.42, 0.26, -0.26, -0.42] : [0, 0, 0, 0];
              sa.pillars = bases.map((bx, idx) => ({
                x: bx + (Math.random() - 0.5) * jitter * 2,
                vx: convergeVels[idx] || 0,
                w: 26,
                color: idx % 2 === 0 ? "#ff2ad4" : "#00f5e8"
              }));
              if (!b.faceAnim.sequence) {
                b.expression = "shout";
                b.expressionTimer = 46;
              }
              if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            }
          }
        } else if (sa.mode === "cross_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "cross_fire";
            sa.timer = 115;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            Particles.addPopup(state, 198, 224, t("stage5.popup.starStasis"), "#ff2ad4", 1.2);
            if (typeof this.captureSeraphStasis === "function") {
              this.captureSeraphStasis(state, b, "cross");
            }
          }
        } else if (sa.mode === "cross_fire") {
          sa.timer--;
          if (b.chestArmorBroken && sa.timer === 58) {
            sa.rotDir = -(sa.rotDir || 1);
            state.shockwaves.push({ x: 198, y: 224, r: 10, maxR: 78, speed: 5.2, color: "#ffd700", lineWidth: 3.2, alpha: 1.0 });
            Particles.addPopup(state, 198, 200, "⚡REVERSE STAR LASER!!", "#ffd700", 1.15);
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
          }
          // Composite Final Crescendo: fire flank feint swords while star laser sweeps!
          if (isCresc && (sa.timer === 92 || sa.timer === 44)) {
            this.spawnFeintSword(sa, 72, 118, 256, 0, isCresc, b.chestArmorBroken);
            this.spawnFeintSword(sa, 324, 118, 140, 10, isCresc, b.chestArmorBroken);
            if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
          }
          const rotBase = isCresc ? 0.022 : (b.chestArmorBroken ? 0.019 : 0.014);
          const rotScale = (b.chestArmorBroken && sa.timer > 58 && sa.timer <= 66) ? 0.2 : 1.0;
          const dAng = (sa.rotDir || 1) * rotBase * rotScale;
          sa.baseAngle += dAng;
          if (typeof this.stepSeraphStasis === "function") {
            this.stepSeraphStasis(state, b, "cross", dAng);
          }
          if (sa.timer <= 0) {
            if (typeof this.releaseSeraphStasis === "function") {
              this.releaseSeraphStasis(state, "end");
            }
            sa.mode = "idle";
            sa.timer = idleRecovery;
          }
        } else if (sa.mode === "sword_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "sword_fire";
            sa.timer = isCresc ? 86 : 115;
            const portalSpawns = (sa.portals && sa.portals.length > 0)
              ? sa.portals
              : [
                  { x: 86,  y: 126, targetX: 132, delay: 0 },
                  { x: 158, y: 98,  targetX: 248, delay: 14 },
                  { x: 238, y: 98,  targetX: 148, delay: 22 },
                  { x: 310, y: 126, targetX: 264, delay: 28 }
                ];
            portalSpawns.forEach((p, idx) => {
              this.spawnFeintSword(sa, p.x, p.y, p.targetX, p.delay, isCresc, b.chestArmorBroken, idx);
            });
            sa.portals = [];
            Particles.addPopup(state, 198, 120, isCresc ? "⚔️SERAPHIC SWORD BARRAGE!!" : "⚔️LIGHT-SWORD VOLLEY!", "#ffd700", 1.2);
          }
        } else if (sa.mode === "sword_fire") {
          sa.timer--;
          if ((!sa.swords || sa.swords.length === 0) && sa.timer <= 0) {
            sa.mode = "idle";
            sa.timer = idleRecovery;
          }
        } else if (sa.mode === "pillars_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "pillars_fire";
            sa.timer = 70;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            Particles.addPopup(state, 198, 150, t("stage5.popup.magStasis"), "#e6ff00", 1.18);
            (sa.pillars || []).forEach(p => {
              state.shockwaves.push({ x: p.x, y: 585, r: 8, maxR: 52, speed: 4.5, color: p.color || "#ffd700", lineWidth: 3.0, alpha: 1.0 });
            });
            if (typeof this.captureSeraphStasis === "function") {
              this.captureSeraphStasis(state, b, "pillar");
            }
          }
        } else if (sa.mode === "pillars_fire") {
          sa.timer--;
          if (isCresc && sa.pillars && sa.pillars.length === 4) {
            const bounds = [
              { max: 136 },
              { max: 166 },
              { min: 230 },
              { min: 260 }
            ];
            sa.pillars.forEach((p, idx) => {
              if (!p.vx) return;
              p.x += p.vx;
              if (bounds[idx].max !== undefined) p.x = Math.min(bounds[idx].max, p.x);
              if (bounds[idx].min !== undefined) p.x = Math.max(bounds[idx].min, p.x);
            });
          }
          if (typeof this.stepSeraphStasis === "function") {
            this.stepSeraphStasis(state, b, "pillar", 0);
          }
          if (isCresc && sa.timer === 52 && sa.pillars && sa.pillars.length >= 2) {
            this.spawnFeintSword(sa, sa.pillars[0].x, 110, 256, 0, true, true, 100);
            this.spawnFeintSword(sa, 198, 96, 142, 10, true, true, 101);
            this.spawnFeintSword(sa, sa.pillars[sa.pillars.length - 1].x, 110, 140, 20, true, true, 102);
            if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
          } else if (!isCresc && b.chestArmorBroken && sa.timer === 48 && sa.pillars && sa.pillars.length >= 2) {
            this.spawnFeintSword(sa, sa.pillars[0].x, 110, 136, 0, false, true, 100);
            this.spawnFeintSword(sa, sa.pillars[sa.pillars.length - 1].x, 110, 260, 0, false, true, 101);
            if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
          }
          if (sa.timer <= 0) {
            if (typeof this.releaseSeraphStasis === "function") {
              this.releaseSeraphStasis(state, "end");
            }
            sa.mode = "idle";
            sa.timer = idleRecovery;
          }
        }

        if (sa.mode !== "cross_fire" && sa.mode !== "pillars_fire" && typeof this.releaseSeraphStasis === "function") {
          if (state.balls && state.balls.some(ball => ball._seraphStasis)) {
            this.releaseSeraphStasis(state, "end");
          }
        }

        // Active Light-Sword update (runs across modes so composite & pillar swords keep flying!)
        if (sa.swords && sa.swords.length > 0) {
          const flippers = Physics.getFlippers(state);
          for (let si = sa.swords.length - 1; si >= 0; si--) {
            const sw = sa.swords[si];
            if (sw.delay > 0) {
              sw.delay--;
              if (sw.delay === 0) {
                sw.active = true;
                if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
              }
              continue;
            }
            if (!sw.active) continue;

            if (sw.stage === "lock") {
              sw.lockTimer--;
              let earlyClash = false;
              const clashPad = state.overdriveActive ? 17 : 3;
              for (const ball of state.balls) {
                if (ball.inShooterLane || ball._onWireRamp) continue;
                if (Math.hypot(ball.x - sw.x, ball.y - sw.y) < ball.r + sw.r + clashPad) {
                  earlyClash = true;
                  if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
                  Particles.add(state, sw.x, sw.y, state.overdriveActive ? "#e6ff00" : "#ffd700", state.overdriveActive ? 20 : 16, 4.4);
                  if (state.overdriveActive) {
                    Systems.addScore(state, ScoreTable.common.VOLT_SHATTER, sw.x, sw.y, "⚡VOLT SHATTER!", { fromDeckEffect: true });
                    if ((state.overdriveRank || 0) >= 2 && typeof this.applyDeckBonusDamage === "function") {
                      this.applyDeckBonusDamage(state, 1, sw.x, sw.y, "⚡VOLT COUNTER!", "#e6ff00", { source: "volt" });
                    }
                  } else {
                    Systems.addScore(state, ScoreTable.stage5.SWORD_CLASH, sw.x, sw.y, "⚔️CLASH!");
                  }
                  sa.swords.splice(si, 1);
                  break;
                }
              }
              if (earlyClash) continue;
              if (sw.lockTimer <= 0) {
                sw.stage = "fly";
                sw.vx = Math.cos(sw.ang) * (sw.spd || 2.6);
                sw.vy = Math.sin(sw.ang) * (sw.spd || 2.6);
                Particles.add(state, sw.x, sw.y, "#ffd700", 6, 3.0);
                if (window.sfx && window.sfx.laserPew) window.sfx.laserPew();
              }
              continue;
            }

            sw.trail.push({ x: sw.x, y: sw.y });
            if (sw.trail.length > 7) sw.trail.shift();

            if (!sw.parried && sw.accel) {
              sw.spd = Math.min(sw.maxSpd || 8.0, (sw.spd || 2.6) + sw.accel);
              sw.vx = Math.cos(sw.ang) * sw.spd;
              sw.vy = Math.sin(sw.ang) * sw.spd;
            }

            sw.x += sw.vx;
            sw.y += sw.vy;
            sw.ang = Math.atan2(sw.vy, sw.vx);

            if (sw.parried) {
              const tgt = this.getActiveBossTarget(state);
              const dx = tgt.x - sw.x;
              const dy = tgt.y - sw.y;
              const dist = Math.hypot(dx, dy) || 1;
              const hSpd = (sw.rally || 1) >= 2 ? 14.0 : 12.0;
              sw.vx = (dx / dist) * hSpd;
              sw.vy = (dy / dist) * hSpd;
              if (dist < 26) {
                if (typeof this.tryBossCounterParry === "function" && this.tryBossCounterParry(state, b, sw, tgt, "sword")) {
                  continue;
                }
                const rally = sw.rally || 1;
                const dmgLabel = rally >= 2 ? `🔥RALLY x${rally} BREAK!!` : "⚔️SWORD PARRY!";
                this.damageActiveBoss(state, 1, tgt.x, tgt.y, dmgLabel, { source: "parry", rally });
                if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
                sa.swords.splice(si, 1);
                continue;
              }
            } else {
              if (sw.y > 440 && window.Systems && Systems.tryNoaBitIntercept(state, sw.x, sw.y)) {
                sa.swords.splice(si, 1);
                continue;
              }
              // Ball clash
              let clashed = false;
              const clashPad = state.overdriveActive ? 17 : 3;
              for (const ball of state.balls) {
                if (ball.inShooterLane || ball._onWireRamp) continue;
                if (Math.hypot(ball.x - sw.x, ball.y - sw.y) < ball.r + sw.r + clashPad) {
                  clashed = true;
                  if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
                  Particles.add(state, sw.x, sw.y, state.overdriveActive ? "#e6ff00" : "#ffd700", state.overdriveActive ? 20 : 16, 4.4);
                  if (state.overdriveActive) {
                    Systems.addScore(state, ScoreTable.common.VOLT_SHATTER, sw.x, sw.y, "⚡VOLT SHATTER!", { fromDeckEffect: true });
                    if ((state.overdriveRank || 0) >= 2 && typeof this.applyDeckBonusDamage === "function") {
                      this.applyDeckBonusDamage(state, 1, sw.x, sw.y, "⚡VOLT COUNTER!", "#e6ff00", { source: "volt" });
                    }
                  } else {
                    Systems.addScore(state, ScoreTable.stage5.SWORD_CLASH, sw.x, sw.y, "⚔️CLASH!");
                  }
                  sa.swords.splice(si, 1);
                  break;
                }
              }
              if (clashed) continue;

              // Flipper collision / parry
              let parriedNow = false;
              let hitFlipper = false;
              let hitFlipIsLeft = true;
              for (let fi = 0; fi < flippers.length; fi++) {
                const f = flippers[fi];
                const fst = Physics.flipperState[fi];
                const tipX = f.px + Math.cos(fst.angle) * f.len;
                const tipY = f.py + Math.sin(fst.angle) * f.len;
                const cp = Physics.closestPointOnSeg(sw.x, sw.y, f.px, f.py, tipX, tipY);
                if (Math.hypot(sw.x - cp.x, sw.y - cp.y) < sw.r + 7.0) {
                  hitFlipper = true;
                  hitFlipIsLeft = !!f.isLeft;
                  fst.swingHit = true;
                  Physics.flipperState[f.isLeft ? 0 : 1].swingHit = true;
                  const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
                  if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
                    parriedNow = true;
                  }
                  break;
                }
              }

              if (parriedNow) {
                this.handlePlayerParryReturn(state, sw, ScoreTable.stage5.SWORD_PARRY, "⚔️SWORD PARRY!!", "#ffd700", 8);
                continue;
              } else if (hitFlipper) {
                const pinKey = hitFlipIsLeft ? "flipperPinL" : "flipperPinR";
                state[pinKey] = Math.max(state[pinKey] || 0, 5);
                b[hitFlipIsLeft ? "pinStyleL" : "pinStyleR"] = "sword";
                let shortened = false;
                if (state.perm && (state.perm.wideFlipper || 0) > 0) {
                  state.perm.wideFlipper = Math.max(0, state.perm.wideFlipper - 1);
                  shortened = true;
                  if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
                  UI.updateHUD(state);
                }
                if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
                Particles.add(state, sw.x, sw.y, "#ffd700", 16, 4.0);
                Particles.addPopup(state, sw.x, sw.y - 16, shortened ? t("stage5.popup.swordPinShorten") : t("stage5.popup.swordPin"), shortened ? "#ff0055" : "#ffd700", 1.08);
                sa.swords.splice(si, 1);
                continue;
              }
            }

            if (sw.y > 670 || sw.y < -30 || sw.x < -30 || sw.x > 450) {
              sa.swords.splice(si, 1);
            }
          }
        }
      }
    }

    // Flash decay on targets
    [
      b.haloL, b.odangoL, b.kneeL, b.prismL, b.charmL,
      b.haloR, b.antennaR, b.kneeR, b.prismR, b.charmR,
      b.synchroSpark, b.elleBelly, b.noelBelly, b.elleHip, b.noelHip,
      b.pauldronL, b.pauldronR, b.garterL, b.garterR, b.navelSera, b.core,
      ...(b.chimePipes || []), ...b.cherubOrbs
    ].forEach(tObj => {
      if (tObj && tObj.flash > 0) tObj.flash--;
    });
    if (b.haloL && b.haloL.passFlashTimer > 0) b.haloL.passFlashTimer--;
    if (b.haloR && b.haloR.passFlashTimer > 0) b.haloR.passFlashTimer--;

    // Cosmic Star Anomalies state machine
    const cm = b.cosmic;
    if (cm.mode === "idle") {
      if (activePlayBalls.length > 0) {
        cm.timer--;
        if (cm.timer <= 0) {
          cm.x = 92 + Math.random() * 212;
          cm.y = 148 + Math.random() * 210;
          if (cm.nextType === "gamma") {
            cm.mode = "gamma_warn";
            cm.timer = 50;
            cm.angle = (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.45);
            cm.nextType = "blackhole";
          } else {
            cm.mode = "bh_warn";
            cm.timer = 48;
            cm.nextType = "gamma";
          }
        }
      }
    } else if (cm.mode === "gamma_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "gamma_fire";
        cm.timer = 105;
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Particles.addPopup(state, cm.x, cm.y - 20, "💥GAMMA BURST!!", "#e6ff00", 1.15);
      }
    } else if (cm.mode === "gamma_fire") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = state.phase === 3 ? 145 : 170;
      }
    } else if (cm.mode === "bh_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "bh_active";
        cm.timer = 195;
        if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
        Particles.addPopup(state, cm.x, cm.y - 20, "🕳️SINGULARITY!!", "#b84dff", 1.15);
      }
    } else if (cm.mode === "bh_active") {
      cm.timer--;
      // Gravitational pull & singularity sling
      for (let bi = 0; bi < activePlayBalls.length; bi++) {
        const ball = activePlayBalls[bi];
        const dx = cm.x - ball.x;
        const dy = cm.y - ball.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 106 && dist > 1) {
          const pull = 0.36 * (1 - dist / 106) + 11.5 / Math.max(20, dist);
          ball.vx += (dx / dist) * pull;
          ball.vy += (dy / dist) * pull;

          if (dist < 16 && (ball.hitCooldowns.bhSling || 0) <= 0) {
            ball.hitCooldowns.bhSling = 55;
            if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
            const ang = (Math.random() < 0.5 ? 0.38 : Math.PI - 0.38) + (Math.random() - 0.5) * 0.28;
            ball.vx = Math.cos(ang) * 11.4;
            ball.vy = Math.sin(ang) * 11.4;
            Systems.addScore(state, ScoreTable.stage5.SINGULARITY_SLING, cm.x, cm.y, "🕳️SINGULARITY SLING!");
            Particles.add(state, cm.x, cm.y, "#b84dff", 18, 5.0);
            state.shockwaves.push({ x: cm.x, y: cm.y, r: 8, maxR: 55, speed: 4.2, color: "#b84dff", lineWidth: 3.0, alpha: 1.0 });
          }
        }
      }
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = state.phase === 3 ? 145 : 170;
      }
    }

    // Judgement Halo Attack state machine (straight Phase 1 -> Twins Cross-Curve Phase 2 -> Wing-Arc Curve Phase 3)
    const ha = b.haloAttack;
    if (ha.mode === "idle") {
      ha.timer--;
      if (ha.timer <= 0 && activePlayBalls.length > 0) {
        ha.mode = "charging";
        ha.chargeTimer = 34;
        ha.targetSide = Math.random() < 0.5 ? "L" : "R";
        ha.timer = state.phase === 1
          ? 175
          : (state.phase === 2 ? 140 : (b.finalCrescendo ? 88 : (b.chestArmorBroken ? 115 : 135)));
        const isDual = (state.phase === 1 && (b.elleBroken || b.noelBroken))
          || state.phase === 2
          || (state.phase === 3 && (b.chestArmorBroken || Math.random() < 0.5));
        if (isDual) {
          if (state.phase < 3) {
            // Twins Cross-Curve: Elle curves left->right flipper, Noel curves right->left flipper
            ha.aimTargets = [
              { sx: b.prismL.x, sy: b.prismL.y, cx: Math.max(20, Math.min(82, b.prismL.x - 125)), cy: 515, ax: 256, ay: 600, color: "#ff2ad4" },
              { sx: b.prismR.x, sy: b.prismR.y, cx: Math.min(380, Math.max(316, b.prismR.x + 115)), cy: 445, ax: 140, ay: 600, color: "#00f5e8" }
            ];
          } else {
            // Seraphia Wing-Arc Curve + optional center orb ring
            ha.aimTargets = [
              { sx: 152, sy: 184, cx: 56,  cy: 395, ax: 140, ay: 600, color: "#ff2ad4" },
              { sx: 244, sy: 184, cx: 340, cy: 395, ax: 256, ay: 600, color: "#00f5e8" }
            ];
            if (b.chestArmorBroken && (b.cherubOrbs.some(o => o.active) || b.finalCrescendo)) {
              const centerSideL = Math.random() < 0.5;
              ha.aimTargets.push({
                sx: 198,
                sy: 176,
                ax: centerSideL ? 132 : 264,
                ay: 600,
                color: centerSideL ? "#ff2ad4" : "#00f5e8"
              });
            }
          }
        } else {
          ha.aimTargets = [{
            sx: 198,
            sy: state.phase === 3 ? 180 : 250,
            ax: ha.targetSide === "L" ? 142 : 254,
            ay: 600,
            color: ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8"
          }];
        }
        if (!b.faceAnim.sequence && state.phase === 3) {
          b.expression = "shout";
          b.expressionTimer = 34;
        }
      }
    } else if (ha.mode === "charging") {
      ha.chargeTimer--;
      if (ha.chargeTimer <= 0) {
        ha.mode = "idle";
        const spd = state.phase === 1
          ? 5.6
          : (state.phase === 2 ? 6.3 : (b.finalCrescendo ? 7.8 : (b.chestArmorBroken ? 7.2 : 6.4)));
        const aims = (ha.aimTargets && ha.aimTargets.length > 0)
          ? ha.aimTargets
          : [{
              sx: 198,
              sy: state.phase === 3 ? 180 : 250,
              ax: ha.targetSide === "L" ? 142 : 254,
              ay: 600,
              color: ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8"
            }];
        aims.forEach(aim => {
          const isCurved = aim.cx !== undefined && aim.cy !== undefined;
          const ang = Math.atan2(aim.ay - aim.sy, aim.ax - aim.sx);
          const chord = Math.hypot(aim.ax - aim.sx, aim.ay - aim.sy);
          const poly = Math.hypot(aim.cx - aim.sx, aim.cy - aim.sy) + Math.hypot(aim.ax - aim.cx, aim.ay - aim.cy);
          const arcLen = isCurved ? 0.5 * (chord + poly) : chord;
          const initVx = isCurved ? (aim.cx - aim.sx) : Math.cos(ang);
          const initVy = isCurved ? (aim.cy - aim.sy) : Math.sin(ang);
          const initNorm = Math.hypot(initVx, initVy) || 1;
          ha.rings.push({
            x: aim.sx,
            y: aim.sy,
            vx: (initVx / initNorm) * spd,
            vy: (initVy / initNorm) * spd,
            spd,
            curved: isCurved,
            p0x: aim.sx,
            p0y: aim.sy,
            cx: aim.cx,
            cy: aim.cy,
            p2x: aim.ax,
            p2y: aim.ay,
            u: 0,
            du: spd / Math.max(120, arcLen),
            r: 14,
            rot: 0,
            parried: false,
            color: aim.color,
            trail: []
          });
        });
        ha.aimTargets = [];
        if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
      }
    }

    // Halo ring flight and collision
    const flippers = Physics.getFlippers(state);
    for (let i = ha.rings.length - 1; i >= 0; i--) {
      const ring = ha.rings[i];
      ring.trail.push({ x: ring.x, y: ring.y });
      if (ring.trail.length > 8) ring.trail.shift();
      if (!ring.parried && ring.curved && ring.u < 1) {
        ring.u += ring.du;
        if (ring.u <= 1) {
          const u = ring.u;
          const omt = 1 - u;
          const nx = omt * omt * ring.p0x + 2 * omt * u * ring.cx + u * u * ring.p2x;
          const ny = omt * omt * ring.p0y + 2 * omt * u * ring.cy + u * u * ring.p2y;
          ring.vx = nx - ring.x;
          ring.vy = ny - ring.y;
          ring.x = nx;
          ring.y = ny;
        } else {
          const tx = 2 * (ring.p2x - ring.cx);
          const ty = 2 * (ring.p2y - ring.cy);
          const tLen = Math.hypot(tx, ty) || 1;
          const exitSpd = ring.spd || 6.4;
          ring.vx = (tx / tLen) * exitSpd;
          ring.vy = (ty / tLen) * exitSpd;
          ring.curved = false;
          ring.x += ring.vx;
          ring.y += ring.vy;
        }
      } else {
        ring.x += ring.vx;
        ring.y += ring.vy;
      }
      ring.rot += ring.parried ? 0.45 : 0.25;

      if (ring.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - ring.x;
        const dy = tgt.y - ring.y;
        const dist = Math.hypot(dx, dy) || 1;
        ring.vx = (dx / dist) * 12.0;
        ring.vy = (dy / dist) * 12.0;
        if (dist < 22) {
          this.healActiveBoss(state, state.phase === 3 ? 2 : 1, tgt.x, tgt.y);
          ha.rings.splice(i, 1);
          continue;
        }
      } else {
        if (ring.y > 440 && window.Systems && Systems.tryNoaBitIntercept(state, ring.x, ring.y)) {
          ha.rings.splice(i, 1);
          continue;
        }
        let clashedBall = false;
        const clashPad = state.overdriveActive ? 17 : 3;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - ring.x, ball.y - ring.y);
          if (d < ball.r + ring.r + clashPad) {
            clashedBall = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, ring.x, ring.y, state.overdriveActive ? "#e6ff00" : "#00f5e8", state.overdriveActive ? 18 : 14, 4.2);
            if (state.overdriveActive) {
              Systems.addScore(state, ScoreTable.common.VOLT_SHATTER, ring.x, ring.y, "⚡VOLT SHATTER!", { fromDeckEffect: true });
              if ((state.overdriveRank || 0) >= 2 && typeof this.applyDeckBonusDamage === "function") {
                this.applyDeckBonusDamage(state, 1, ring.x, ring.y, "⚡VOLT COUNTER!", "#e6ff00", { source: "volt" });
              }
            } else {
              Systems.addScore(state, ScoreTable.stage5.HALO_RING_CLASH, ring.x, ring.y, "⚔️CLASH!");
            }
            ha.rings.splice(i, 1);
            break;
          }
        }
        if (clashedBall) continue;

        let parriedNow = false;
        let hitFlipper = false;
        let hitFlipIsLeft = true;
        let cpX = 0, cpY = 0;
        for (let fi = 0; fi < flippers.length; fi++) {
          const f = flippers[fi];
          const fst = Physics.flipperState[fi];
          const tipX = f.px + Math.cos(fst.angle) * f.len;
          const tipY = f.py + Math.sin(fst.angle) * f.len;
          const cp = Physics.closestPointOnSeg(ring.x, ring.y, f.px, f.py, tipX, tipY);
          const dist = Math.hypot(ring.x - cp.x, ring.y - cp.y);
          if (dist < ring.r + 7.0) {
            hitFlipper = true;
            hitFlipIsLeft = !!f.isLeft;
            fst.swingHit = true;
            Physics.flipperState[f.isLeft ? 0 : 1].swingHit = true;
            cpX = cp.x;
            cpY = cp.y;
            const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
            if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
              parriedNow = true;
            }
            break;
          }
        }

        if (parriedNow) {
          ring.parried = true;
          if (state.phase === 3) {
            b.expression = "shock";
            b.expressionTimer = 30;
          } else {
            b.elle.blushTimer = 30;
            b.noel.blushTimer = 30;
          }
          if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
          state.shockwaves.push({ x: ring.x, y: ring.y, r: 6, maxR: 44, speed: 4.2, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
          Particles.add(state, ring.x, ring.y, "#e6ff00", 18, 5.0);
          Particles.addPopup(state, ring.x, ring.y - 14, "⚔️HALO PARRY!!", "#e6ff00", 1.2);
          Systems.addScore(state, ScoreTable.stage5.HALO_RING_PARRY, ring.x, ring.y, "⚔️PARRY!");
          Systems.addFever(state, 8);
          continue;
        } else if (hitFlipper) {
          // 拘束リング：他のパドル拘束と同じ連打解除システムに統一（高耐久8回ガチャ解除！）
          const pinKey = hitFlipIsLeft ? "flipperPinL" : "flipperPinR";
          state[pinKey] = Math.max(state[pinKey] || 0, 8);
          b[hitFlipIsLeft ? "pinStyleL" : "pinStyleR"] = "halo";
          if (window.sfx && window.sfx.haloReverse) window.sfx.haloReverse();
          UI.showCutin(t("stage5.cutin.curseRing"), 110);
          Particles.add(state, cpX, cpY, "#ff1493", 18, 4.2);
          Particles.addPopup(state, cpX, cpY - 18, t("stage5.popup.lrReverse"), "#ff2ad4", 1.08);
          ha.rings.splice(i, 1);
          continue;
        }
      }

      if (ring.y > 660 || ring.y < 10 || ring.x < 10 || ring.x > 385) {
        ha.rings.splice(i, 1);
      }
    }

    if (b.animTick % 4 === 0) {
      this.updateStatusMonitor(state);
    }
  },

  checkCollisions(ball, state, engine, substep = 0) {
    const b = state.boss;
    if (!b || ball.inShooterLane || ball._inNavelTrap || ball._fusionStasis || (ball._seraphStasis && ball._seraphStasis.grazeDelay <= 0)) return;

    const SUBSTEPS = (window.Physics && Physics.BALANCE.SUBSTEPS) || 8;

    // A & B. 3D Wireform Ramp Riding & Gate Entry (active only in Phases 1 & 2 before fusion!)
    if (StageCommon.stepWireRampBall(ball, state, this, substep, SUBSTEPS, {
      canEnter: state.phase < 3 && !(b.fusionSeq && b.fusionSeq.active),
      minVy: -2.6,
      minSpeed: 9.5,
      maxSpeed: 14.8,
      entryScore: ScoreTable.stage5.RAMP_ENTRY,
      onExit: (exitBall, rs) => {
        exitBall._rampDropHalo = {
          targetKey: rs.rampId === "left" ? "haloR" : "haloL",
          timer: 46,
          passed: false
        };
      }
    })) {
      return;
    }

    if (substep !== 0) return;

    if (!ball.hitCooldowns) ball.hitCooldowns = {};
    for (const k in ball.hitCooldowns) {
      if (ball.hitCooldowns[k] > 0) ball.hitCooldowns[k]--;
    }
    if (ball._rampDropHalo) {
      ball._rampDropHalo.timer--;
      if (ball._rampDropHalo.timer <= 0) ball._rampDropHalo = null;
    }

    const hitCircle = (key, target, bounceSpd, cooldown, onHit) => {
      if ((ball.hitCooldowns[key] || 0) > 0) return false;
      return Physics.checkCircleBumper(ball, target, bounceSpd, () => {
        ball.hitCooldowns[key] = cooldown;
        onHit();
      });
    };

    const hitRotatedEllipse = (key, h, bounceSpd, cooldown, onHit) => {
      if ((ball.hitCooldowns[key] || 0) > 0) return false;
      const dx = ball.x - h.x;
      const dy = ball.y - h.y;
      const cosT = Math.cos(-h.tilt);
      const sinT = Math.sin(-h.tilt);
      const lx = dx * cosT - dy * sinT;
      const ly = dx * sinT + dy * cosT;
      const ex = h.rx + ball.r;
      const ey = h.ry + ball.r;
      const normDistSq = (lx * lx) / (ex * ex) + (ly * ly) / (ey * ey);
      if (normDistSq <= 1.0) {
        ball.hitCooldowns[key] = cooldown;
        let lnx = lx / (h.rx * h.rx);
        let lny = ly / (h.ry * h.ry);
        const lnLen = Math.hypot(lnx, lny) || 1;
        lnx /= lnLen;
        lny /= lnLen;
        const cosB = Math.cos(h.tilt);
        const sinB = Math.sin(h.tilt);
        const nx = lnx * cosB - lny * sinB;
        const ny = lnx * sinB + lny * cosB;

        const scale = 1.0 / Math.sqrt(normDistSq);
        const borderLx = lx * scale;
        const borderLy = ly * scale;
        const borderGx = h.x + (borderLx * cosB - borderLy * sinB);
        const borderGy = h.y + (borderLx * sinB + borderLy * cosB);
        ball.x = borderGx + nx * (ball.r + 0.5);
        ball.y = borderGy + ny * (ball.r + 0.5);

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx -= 1.85 * dot * nx;
          ball.vy -= 1.85 * dot * ny;
        }
        const curSpd = Math.hypot(ball.vx, ball.vy);
        if (curSpd < bounceSpd) {
          const factor = bounceSpd / (curSpd || 1);
          ball.vx *= factor;
          ball.vy *= factor;
        }
        onHit();
        return true;
      }
      return false;
    };

    // C. Gamma-Ray Burst Collision
    if (b.cosmic.mode === "gamma_fire") {
      const a = b.cosmic.angle;
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      const perpDist = Math.abs((ball.x - b.cosmic.x) * nx + (ball.y - b.cosmic.y) * ny);
      if (perpDist < ball.r + 9 && (ball.hitCooldowns.gamma || 0) <= 0) {
        ball.hitCooldowns.gamma = 20;
        const sign = ((ball.x - b.cosmic.x) * nx + (ball.y - b.cosmic.y) * ny) >= 0 ? 1 : -1;
        ball.vx = nx * sign * 8.8;
        ball.vy = ny * sign * 8.8;
        if (b.lastFlipActiveTimer <= 0) {
          ball.vy = Math.max(ball.vy, 1.8);
        }
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Systems.addScore(state, ScoreTable.stage5.GAMMA_BURST_HIT, ball.x, ball.y, "💥GAMMA BURST!");
        Particles.add(state, ball.x, ball.y, "#e6ff00", 15, 4.5);
        state.shockwaves.push({ x: ball.x, y: ball.y, r: 6, maxR: 40, speed: 4.0, color: "#00f5e8", lineWidth: 2.5, alpha: 0.9 });
      }
    }

    // D. One-Way Navel-to-Navel Intercept Beam Collision (Phases 1 & 2, ONLY when active!)
    //    Passes through from ABOVE, fiercely reflects upward shots coming from BELOW!
    if (state.phase < 3 && b.navelBeam.mode === "active") {
      const x1 = 159.1 + b.elle.dx;
      const y1 = 426.9 + b.elle.dy;
      const x2 = 265.3 + b.noel.dx;
      const y2 = 288.4 + b.noel.dy;

      const cp = Physics.closestPointOnSeg(ball.x, ball.y, x1, y1, x2, y2);
      const dist = Math.hypot(ball.x - cp.x, ball.y - cp.y);
      const segLen2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) || 1;
      const segT = ((ball.x - x1) * (x2 - x1) + (ball.y - y1) * (y2 - y1)) / segLen2;

      if (segT > 0.06 && segT < 0.94 && dist < ball.r + 6.0) {
        const bLen = Math.sqrt(segLen2);
        // Ensure normal (bnx, bny) ALWAYS points toward the lower playfield (bny > 0)
        let bnx = -(y2 - y1) / bLen;
        let bny = (x2 - x1) / bLen;
        if (bny < 0) { bnx = -bnx; bny = -bny; }

        const dotDown = ball.vx * bnx + ball.vy * bny;
        const tx = (x2 - x1) / bLen;
        const ty = (y2 - y1) / bLen;

        // Coming from ABOVE (moving downward / with bny): pass right through with a subtle ripple!
        if (ball.vy >= -0.3 || dotDown >= -0.2) {
          if ((ball.hitCooldowns.navelPass || 0) <= 0) {
            ball.hitCooldowns.navelPass = 18;
            b.navelBeam.pluckAmp = Math.max(b.navelBeam.pluckAmp, 5.0);
            if (b.elleBelly && b.noelBelly) {
              b.elleBelly.vx += tx * 2.2;
              b.elleBelly.vy += ty * 2.2;
              b.noelBelly.vx -= tx * 2.2;
              b.noelBelly.vy -= ty * 2.2;
            }
          }
        } else if ((ball.hitCooldowns.navelBeam || 0) <= 0) {
          // Coming from BELOW (shot upward against underside): slam-reflect back downward!
          ball.hitCooldowns.navelBeam = 18;
          b.navelBeam.pluckAmp = 15;
          b.navelBeam.pluckCount++;
          if (window.sfx && window.sfx.navelBeamPluck) window.sfx.navelBeamPluck();

          if (b.elleBelly && b.noelBelly) {
            b.elleBelly.vx += tx * 5.2 - bnx * 4.6;
            b.elleBelly.vy += ty * 5.2 - bny * 4.6;
            b.noelBelly.vx += -tx * 5.2 - bnx * 4.6;
            b.noelBelly.vy += -ty * 5.2 - bny * 4.6;
            b.elleBelly.flash = 16;
            b.noelBelly.flash = 16;
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
          }

          b.elleSpring.vy = -1.8;
          b.noelSpring.vy = -1.8;
          b.elle.blushTimer = 32;
          b.noel.blushTimer = 32;
          b.blushGauge = Math.min(100, (b.blushGauge || 0) + 8);

          // Push ball cleanly below the barrier line and reflect velocity downward
          ball.x = cp.x + bnx * (ball.r + 6.2);
          ball.y = cp.y + bny * (ball.r + 6.2);
          let rvx = ball.vx - 2 * dotDown * bnx;
          let rvy = ball.vy - 2 * dotDown * bny;
          rvy = Math.max(3.2, rvy);
          const outSpd = Math.max(9.2, Math.min(13.2, Math.hypot(rvx, rvy) * 1.10));
          const rMag = Math.hypot(rvx, rvy) || 1;
          ball.vx = (rvx / rMag) * outSpd;
          ball.vy = (rvy / rMag) * outSpd;

          state.shockwaves.push({ x: cp.x, y: cp.y, r: 4, maxR: 36, speed: 3.8, color: "#ff2ad4", lineWidth: 2.2, alpha: 0.95 });
          Particles.add(state, cp.x, cp.y, "#00f5e8", 12, 4.0);

          if ((b.elleBroken || b.noelBroken) && b.navelBeam.pluckCount % 3 === 0) {
            const targetPrism = (b.elleBroken && b.prismL.hp > 0) ? b.prismL : ((b.noelBroken && b.prismR.hp > 0) ? b.prismR : null);
            if (targetPrism) {
              targetPrism.hp--;
              targetPrism.flash = 20;
              Particles.add(state, cp.x, cp.y, "#e6ff00", 16, 5.0);
              Systems.addScore(state, ScoreTable.stage5.NAVEL_OVERLOAD, cp.x, cp.y, t("stage5.popup.navelOverload"));
              if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
                this.triggerSeraphFusion(state);
              }
            }
          } else {
            Systems.addScore(state, ScoreTable.stage5.NAVEL_BEAM_REFLECT, cp.x, cp.y, t("stage5.popup.navelReflect"));
          }
        }
      }
    }

    // E & F. Independent Twin Collision Checks (Phases 1 & 2)
    if (state.phase < 3) {
      // High-Five Synchro Spark exists ONLY while neither twin is broken!
      if (!b.elleBroken && !b.noelBroken) {
        hitCircle("synchro_spark", b.synchroSpark, 9.2, 16, () => {
          b.synchroSpark.flash = 20;
          const toRight = ball.vx <= 0;
          ball.vx = toRight ? 7.5 : -7.5;
          ball.vy = -6.5;
          if (window.sfx && window.sfx.slingshot) window.sfx.slingshot();
          state.shockwaves.push({ x: b.synchroSpark.x, y: b.synchroSpark.y, r: 8, maxR: 48, speed: 4.0, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
          Particles.add(state, b.synchroSpark.x, b.synchroSpark.y, "#e6ff00", 18, 5.0);
          Systems.addScore(state, ScoreTable.stage5.TWIN_TOSS, b.synchroSpark.x, b.synchroSpark.y, "🏐TWIN TOSS!");
          Systems.addFever(state, 5);
        });
      }

      const bothIntact = !b.elleBroken && !b.noelBroken;

      const onTwinPartHit = (obj, spring, twin, opts = null) => {
        const isAlternating = bothIntact && b.lastTwinHitSide && b.lastTwinHitSide !== obj.side;
        const dmg = isAlternating ? 2 : 1;
        b.lastTwinHitSide = obj.side;
        obj.hp = Math.max(0, obj.hp - dmg);
        obj.flash = 22;
        spring.vx += (obj.side === "L" ? -1 : 1) * 3.0;
        spring.vy -= 3.0;
        twin.blushTimer = 25;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);

        const msg = isAlternating ? "⚡SYNCHRO BREAK x2!!" : `${obj.label} HP:${obj.hp}`;
        Systems.addScore(state, isAlternating ? ScoreTable.stage5.TWIN_PART_SYNCHRO : ScoreTable.stage5.TWIN_PART_HIT, obj.x, obj.y - 10, msg);
        Systems.addFever(state, isAlternating ? 8 : 4);
        Particles.add(state, obj.x, obj.y, obj.color, 14, 4.5);

        if (obj.hp <= 0) {
          obj.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", obj.x, obj.y);
          if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
          this.checkIndividualTwinBreaks(state);
        } else {
          if (!(opts && opts.softSfx) && window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
        }
        UI.updateHUD(state);
      };

      // 0. Ramp-Drop Halo Ring Pass-Through Bonus (Option 1: milk while unbroken with 0 damage to halo!)
      if (ball._rampDropHalo && ball._rampDropHalo.timer > 0 && !ball._rampDropHalo.passed && ball.vy > 0) {
        const haloCandidates = [
          { key: "haloL", h: b.haloL, spring: b.elleSpring, twin: b.elle },
          { key: "haloR", h: b.haloR, spring: b.noelSpring, twin: b.noel }
        ];
        for (let hi = 0; hi < haloCandidates.length; hi++) {
          const { key, h, spring, twin } = haloCandidates[hi];
          if (!h || h.broken) continue;
          const dx = ball.x - h.x;
          const dy = ball.y - h.y;
          const cosT = Math.cos(-h.tilt);
          const sinT = Math.sin(-h.tilt);
          const lx = dx * cosT - dy * sinT;
          const ly = dx * sinT + dy * cosT;
          const ex = h.rx + ball.r * 1.0;
          const ey = h.ry + ball.r * 1.35;
          const normDistSq = (lx * lx) / (ex * ex) + (ly * ly) / (ey * ey);
          if (normDistSq <= 1.0) {
            ball._rampDropHalo.passed = true;
            ball.hitCooldowns[key] = 20;
            h.passFlashTimer = 46;
            h.flash = 28;
            if (twin) twin.blushTimer = 18;
            if (spring) spring.vy -= 2.0;
            if (state.shockwaves) {
              state.shockwaves.push({ x: h.x, y: h.y, r: 8, maxR: 52, speed: 3.6, color: "#ffd700", lineWidth: 3.0, alpha: 1.0 });
              state.shockwaves.push({ x: h.x, y: h.y, r: 6, maxR: 40, speed: 3.0, color: h.color, lineWidth: 2.4, alpha: 0.95 });
            }
            Particles.add(state, h.x, h.y, "#ffd700", 16, 4.4);
            Particles.add(state, h.x, h.y, h.color, 12, 3.8);
            if (window.sfx) {
              if (window.sfx.capsuleCatch) window.sfx.capsuleCatch();
              if (window.sfx.exSpark) window.sfx.exSpark();
            }
            Systems.addScore(state, ScoreTable.stage5.HALO_PASS_BONUS, h.x, h.y - 16, "✨HALO RING PASS!!");
            Systems.addFever(state, 8);
            UI.updateHUD(state);
            break;
          }
        }
      }

      // 1. Rotated Elliptical Halos (skip solid bounce while dropping through on a wire ramp pass)
      const isRampHaloDrop = !!(ball._rampDropHalo && ball._rampDropHalo.timer > 0 && !ball._rampDropHalo.passed && ball.vy > 0);
      if (!b.haloL.broken && !isRampHaloDrop) {
        hitRotatedEllipse("haloL", b.haloL, 9.2, 14, () => onTwinPartHit(b.haloL, b.elleSpring, b.elle));
      }
      if (!b.haloR.broken && !isRampHaloDrop) {
        hitRotatedEllipse("haloR", b.haloR, 9.2, 14, () => onTwinPartHit(b.haloR, b.noelSpring, b.noel));
      }

      // 2. Hair Ornament Targets (Elle odango: soft cushion dampened bounce; Noel headset: wobbles antennas)
      if (!b.odangoL.broken && (ball.hitCooldowns.odangoL || 0) <= 0) {
        const od = b.odangoL;
        const dx = ball.x - od.x;
        const dy = ball.y - od.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + od.r;
        if (dist < minDist && dist > 0.0001) {
          ball.hitCooldowns.odangoL = 14;
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = od.x + nx * (minDist + 1.5);
          ball.y = od.y + ny * (minDist + 1.5);

          const vn = ball.vx * nx + ball.vy * ny;
          const tx = -ny;
          const ty = nx;
          const vt = ball.vx * tx + ball.vy * ty;
          const outVn = vn < 0 ? Math.min(5.2, Math.max(2.4, -vn * 0.44)) : Math.max(2.4, vn * 0.65);
          const outVt = vt * 0.72;
          ball.vx = nx * outVn + tx * outVt;
          ball.vy = ny * outVn + ty * outVt;
          const sp = Math.hypot(ball.vx, ball.vy);
          if (sp > 6.2) {
            ball.vx *= 6.2 / sp;
            ball.vy *= 6.2 / sp;
          }

          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
          onTwinPartHit(od, b.elleSpring, b.elle, { softSfx: true });
        }
      }
      if (!b.antennaR.broken) {
        hitCircle("antennaR", b.antennaR, 8.8, 14, () => {
          const dir = ball.vx >= 0 ? 1 : -1;
          if (b.noelAntR) b.noelAntR.angleVel += dir * 0.18;
          if (b.noelAntL) b.noelAntL.angleVel += dir * 0.14;
          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          onTwinPartHit(b.antennaR, b.noelSpring, b.noel);
        });
      }

      // 2B. Noel's Elastic Wobbling Headset Antennas
      const antCfg = this.NOEL_ANTENNA_BOUNCE || { restitution: 0.72, kick: 2.5, maxSpeed: 12.8 };
      [
        { key: "noelAntR", ant: b.noelAntR, skipRootOverlap: true },
        { key: "noelAntL", ant: b.noelAntL, skipRootOverlap: false }
      ].forEach(({ key, ant, skipRootOverlap }) => {
        if (!ant || (ball.hitCooldowns[key] || 0) > 0) return;
        if (skipRootOverlap && (ball.hitCooldowns.antennaR || 0) >= 12) return;
        const ep = this.getNoelAntennaEndpoints(ant);
        const hit = Physics.checkCapsuleHit(ball, ep.ax, ep.ay, ep.bx, ep.by, ant.r);
        if (!hit) return;

        ball.hitCooldowns[key] = 10;
        ball.x = hit.qx + hit.nx * (hit.minDist + 1.6);
        ball.y = hit.qy + hit.ny * (hit.minDist + 1.6);

        const vn = ball.vx * hit.nx + ball.vy * hit.ny;
        if (vn < 0) {
          ball.vx -= (1 + antCfg.restitution) * vn * hit.nx;
          ball.vy -= (1 + antCfg.restitution) * vn * hit.ny;
        }
        ball.vx += hit.nx * antCfg.kick;
        ball.vy += hit.ny * antCfg.kick;
        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > antCfg.maxSpeed) {
          ball.vx *= antCfg.maxSpeed / sp;
          ball.vy *= antCfg.maxSpeed / sp;
        }

        const rx = hit.qx - ep.ax;
        const ry = hit.qy - ep.ay;
        const torque = (rx * (-hit.ny) - ry * (-hit.nx)) * 0.0045;
        ant.angleVel += Math.max(-0.26, Math.min(0.26, torque || ((ball.vx > 0 ? 1 : -1) * 0.16)));
        ant.flash = 20;
        if (b.noel) b.noel.blushTimer = 20;
        if (b.noelSpring) b.noelSpring.vy -= 2.0;

        if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
        Particles.add(state, hit.qx, hit.qy, "#00f5e8", 12, 4.2);
        Particles.add(state, hit.qx, hit.qy, "#ffffff", 6, 3.0);
        if (!(ball._bumperGrace > 0)) {
          ball._bumperGrace = 14;
          Systems.addScore(state, ScoreTable.stage5.ANTENNA_BOUNCE, hit.qx, hit.qy - 12, "📡ANTENNA BOING!");
        }
        Systems.addFever(state, 3);
        UI.updateHUD(state);
      });

      // 3. Knee Ring Targets
      if (!b.kneeL.broken) {
        hitCircle("kneeL", b.kneeL, 9.0, 14, () => onTwinPartHit(b.kneeL, b.elleSpring, b.elle));
      }
      if (!b.kneeR.broken) {
        hitCircle("kneeR", b.kneeR, 9.0, 14, () => onTwinPartHit(b.kneeR, b.noelSpring, b.noel));
      }

      // 4. Thigh Garter Charms (Soft-Bounce Ornaments -> Hip/Buttock Quiver!)
      hitCircle("charmL", b.charmL, 8.2, 14, () => {
        b.charmL.flash = 18;
        if (b.elleHip) {
          b.elleHip.vx -= 5.8;
          b.elleHip.vy -= 5.2;
        }
        b.elleSpring.vy -= 2.5;
        b.elle.blushTimer = 30;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
        if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
        Particles.spawnHeart(state, b.charmL.x, b.charmL.y - 8, true);
        Particles.add(state, b.charmL.x, b.charmL.y, b.charmL.color, 12, 3.8);
        Systems.addScore(state, ScoreTable.stage5.GARTER_CHARM, b.charmL.x, b.charmL.y - 10, "♥GARTER BOUNCE!");
        Systems.addFever(state, 4);
        UI.updateHUD(state);
      });
      hitCircle("charmR", b.charmR, 8.2, 14, () => {
        b.charmR.flash = 18;
        if (b.noelHip) {
          b.noelHip.vx += 5.8;
          b.noelHip.vy -= 5.2;
        }
        b.noelSpring.vy -= 2.5;
        b.noel.blushTimer = 30;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
        if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
        Particles.spawnHeart(state, b.charmR.x, b.charmR.y - 8, true);
        Particles.add(state, b.charmR.x, b.charmR.y, b.charmR.color, 12, 3.8);
        Systems.addScore(state, ScoreTable.stage5.GARTER_CHARM, b.charmR.x, b.charmR.y - 10, "♦GARTER BOUNCE!");
        Systems.addFever(state, 4);
        UI.updateHUD(state);
      });

      // 5. Chest Brooches (Protected until broken, then primary damage core!)
      [
        { obj: b.prismL, id: "prismL", broken: b.elleBroken, spring: b.elleSpring, twin: b.elle },
        { obj: b.prismR, id: "prismR", broken: b.noelBroken, spring: b.noelSpring, twin: b.noel }
      ].forEach(({ obj, id, broken, spring, twin }) => {
        if (!broken) {
          hitCircle(id + "_guard", obj, 8.6, 14, () => {
            obj.flash = 16;
            spring.vy -= 3.2;
            twin.blushTimer = 20;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, obj.x, obj.y, obj.color, 10, 3.5);
            Systems.addScore(state, ScoreTable.stage5.BROOCH_GUARD, obj.x, obj.y - 10, "🛡️BROOCH GUARD");
            UI.updateHUD(state);
          });
        } else if (obj.hp > 0) {
          hitCircle(id, obj, 8.8, 15, () => {
            obj.hp = Math.max(0, obj.hp - 1);
            obj.flash = 20;
            spring.vx += (obj.side === "L" ? 1 : -1) * 3.5;
            spring.vy -= 4.0;
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 9);
            Particles.add(state, obj.x, obj.y, obj.color, 16, 4.8);
            Systems.addScore(state, ScoreTable.stage5.BROOCH_HIT, obj.x, obj.y - 10, `${obj.label} HP:${obj.hp}`);
            Systems.addFever(state, 6);
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();

            if (obj.hp <= 0) {
              obj.broken = true;
              Particles.triggerArmorBreakEffect(state, "chest", obj.x, obj.y);
              if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
              if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
                this.triggerSeraphFusion(state);
              }
            }
            UI.updateHUD(state);
          });
        }
      });
    }

    // Seraphic Organ Chime Pipes (Phase 3)
    if (state.phase === 3 && b.chimePipes) {
      b.chimePipes.forEach((pipe, pIdx) => {
        hitCircle("chimePipe_" + pIdx, pipe, 8.5, 14, () => {
          pipe.lit = true;
          pipe.flash = 22;
          if (window.sfx && window.sfx.playFM) {
            window.sfx.playFM(pipe.note, pipe.note * 0.5, 220, 0.20, "triangle", pipe.note * 1.5, 0.16);
          } else if (window.sfx && window.sfx.capsuleCatch) {
            window.sfx.capsuleCatch();
          }
          Particles.add(state, pipe.x, pipe.y, pipe.col, 14, 4.0);
          Systems.addScore(state, ScoreTable.stage5.CHIME_PIPE_HIT, pipe.x, pipe.y - 10, "🎹CHIME!");
          Systems.addFever(state, 4);

          if (b.chimePipes.every(p => p.lit)) {
            b.harmonyBeamTimer = 55;
            b.chimePipes.forEach(p => { p.lit = false; p.flash = 25; });
            Systems.addScore(state, ScoreTable.stage5.HARMONY_JACKPOT, 198, 120, "✨SERAPHIC HARMONY JACKPOT!!");
            Particles.addPopup(state, 198, 120, "✨HARMONY JACKPOT!!", "#e6ff00", 1.25);
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            this.damageActiveBoss(state, 3, 198, 205, "🎹HARMONY LASER!!", { source: "harmony" });
          }
          UI.updateHUD(state);
        });
      });
    }

    // G. Phase 3 Collision Checks (Seraphia) — Star & Pillar lasers freeze/graze balls via _seraphStasis in update()
    if (state.phase === 3) {
      // 0. Seraphia Navel Gravity Vortex (per-substep suction, drag & capture!)
      if (b.navelTrap && b.navelTrap.mode === "vortex" && !b.navelTrap.capturedBall) {
        const dNavel = Math.hypot(198.0 - ball.x, 284.6 - ball.y);
        if (!ball.hitCooldowns || (ball.hitCooldowns.crotchSpit || 0) <= 0) {
          if (dNavel < 148 && dNavel > 1) {
            const pull = (0.92 * (1 - dNavel / 148) + 26.0 / Math.max(16, dNavel)) / SUBSTEPS;
            ball.vx += ((198.0 - ball.x) / dNavel) * pull;
            ball.vy += ((284.6 - ball.y) / dNavel) * pull;
            // Orbital drag so fast shots brake & spiral unmistakably into the navel!
            if (dNavel < 115) {
              const drag = dNavel < 65 ? Math.pow(0.90, 1 / SUBSTEPS) : Math.pow(0.945, 1 / SUBSTEPS);
              ball.vx *= drag;
              ball.vy *= drag;
            }
          }
          if (dNavel < 26) {
            this.captureBallInNavel(state, b, ball);
            return;
          }
        }
      }

      // Phase 3A: Chest Armor intact
      if (!b.chestArmorBroken) {
        // Bust hits
        [
          { key: "seraBustL", cup: b.bustL, other: b.bustR },
          { key: "seraBustR", cup: b.bustR, other: b.bustL }
        ].forEach(({ key, cup, other }) => {
          hitCircle(key, cup, 9.0, 15, () => {
            const dxH = ball.x - cup.x;
            const dyH = ball.y - cup.y;
            const dL = Math.hypot(dxH, dyH) || 1;
            cup.vx += -(dxH / dL) * 5.0;
            cup.vy += -(dyH / dL) * 5.0 - 1.0;
            other.vx += (dxH / dL) * 2.5;
            other.vy += -(dyH / dL) * 2.5;
            cup.flash = 18;

            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);
            if (!b.faceAnim.sequence) {
              b.expression = b.chestArmorHP <= 4 ? "open_blush" : "wince";
              b.expressionTimer = 22;
            }
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, cup.x, cup.y, "#ff2ad4", 14, 4.4);
            Systems.addScore(state, ScoreTable.stage5.SERAPH_CHEST_HIT, cup.x, cup.y - 12, `ARMOR HP:${b.chestArmorHP}`);
            Systems.addFever(state, 5);

            if (b.chestArmorHP <= 0) {
              this.breakSeraphiaArmor(state);
            }
            UI.updateHUD(state);
          });
        });

        // Pauldrons
        [b.pauldronL, b.pauldronR].forEach(pld => {
          hitCircle(pld.label, pld, 9.2, 15, () => {
            pld.flash = 18;
            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            if (!b.faceAnim.sequence) {
              b.expression = "wince";
              b.expressionTimer = 18;
            }
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, pld.x, pld.y, "#00f5e8", 12, 4.0);
            Systems.addScore(state, ScoreTable.stage5.SERAPH_PAULDRON_HIT, pld.x, pld.y - 12, `ARMOR HP:${b.chestArmorHP}`);
            Systems.addFever(state, 4);

            if (b.chestArmorHP <= 0) {
              this.breakSeraphiaArmor(state);
            }
            UI.updateHUD(state);
          });
        });
      } else {
        // Phase 3B: Armor Broken (Cherub Orbs Barrier + Core + Rich Soft Bodies)

        // Cherub Spirit Orbs
        b.cherubOrbs.forEach(orb => {
          if (!orb.active) return;
          hitCircle(orb.id, orb, 9.2, 14, () => {
            orb.hp--;
            orb.flash = 18;
            Particles.add(state, orb.x, orb.y, orb.color, 16, 4.8);
            if (orb.hp <= 0) {
              orb.active = false;
              orb.chargeTimer = 0;
              if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
              state.shockwaves.push({ x: orb.x, y: orb.y, r: 8, maxR: 55, speed: 4.2, color: orb.color, lineWidth: 3.0, alpha: 1.0 });
              Particles.add(state, orb.x, orb.y, "#e6ff00", 20, 5.5);
              Systems.addScore(state, ScoreTable.stage5.ORB_SHATTER, orb.x, orb.y - 10, `💥${orb.label} SHATTER!!`);
              Systems.addFever(state, 8);
              if (b.cherubOrbs.every(o => !o.active)) {
                b.orbCooldown = 330;
                Particles.addPopup(state, b.core.x, b.core.y - 16, t("stage5.popup.coreOpen"), "#e6ff00", 1.15);
              }
            } else {
              if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
              Systems.addScore(state, ScoreTable.stage5.ORB_HIT, orb.x, orb.y - 10, `${orb.label} HP:${orb.hp}`);
            }
            UI.updateHUD(state);
          });
        });

        // Ark Core
        hitCircle("sera_core", b.core, 9.8, 16, () => {
          b.core.flash = 24;
          const isShielded = b.coreGraceTimer > 0 || b.cherubOrbs.some(o => o.active);
          if (isShielded) {
            if (window.sfx && window.sfx.slingshot) window.sfx.slingshot();
            Systems.addScore(state, ScoreTable.stage5.CORE_BARRIER, b.core.x, b.core.y - 12, t("stage5.popup.orbBarrier"));
          } else {
            b.core.hp = Math.max(0, b.core.hp - 1);
            b.expression = "wince";
            b.expressionTimer = 28;
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 8, maxR: 64, speed: 4.6, color: "#00f5d4", lineWidth: 3.2, alpha: 1.0 });
            Particles.add(state, b.core.x, b.core.y, "#00f5d4", 24, 6.0);
            Systems.addScore(state, ScoreTable.stage5.CORE_HIT, b.core.x, b.core.y - 14, `💎ARK CORE HP:${b.core.hp}`);
            Systems.addFever(state, 8);
            if (b.core.hp <= 0) {
              this.triggerStageClear(state);
            } else {
              this.checkFinalCrescendo(state);
            }
          }
          UI.updateHUD(state);
        });

        // Rich Soft Bounce: Bust L & R
        [
          { key: "seraBustL_soft", cup: b.bustL, other: b.bustR },
          { key: "seraBustR_soft", cup: b.bustR, other: b.bustL }
        ].forEach(({ key, cup, other }) => {
          hitCircle(key, cup, 8.2, 14, () => {
            const dxH = ball.x - cup.x;
            const dyH = ball.y - cup.y;
            const dL = Math.hypot(dxH, dyH) || 1;
            cup.vx += -(dxH / dL) * 8.5;
            cup.vy += -(dyH / dL) * 8.5 - 1.5;
            other.vx += (dxH / dL) * 4.2;
            other.vy += -(dyH / dL) * 4.0;
            cup.flash = 18;

            b.bustExcitement = Math.min(100, (b.bustExcitement || 0) + 16);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 15);
            if (!b.faceAnim.sequence) {
              b.expression = "open_blush";
              b.expressionTimer = 34;
            }
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.spawnHeart(state, cup.x, cup.y - 8, false);
            Particles.add(state, cup.x, cup.y, "#ff66cc", 14, 4.0);
            Systems.addScore(state, ScoreTable.stage5.DIVINE_BUST_BOUNCE, cup.x, cup.y - 12, "♥DIVINE BOUNCE!!");
            Systems.addFever(state, 6);
            UI.updateHUD(state);
          });
        });

        // Garters & Navel (Sympathetic Hip & Bust Bounce)
        [b.garterL, b.garterR].forEach((gar, gIdx) => {
          hitCircle(gar.label, gar, 8.5, 16, () => {
            gar.flash = 18;
            const mainHip = gIdx === 0 ? b.hipL : b.hipR;
            const subHip = gIdx === 0 ? b.hipR : b.hipL;
            const dir = gIdx === 0 ? -1 : 1;
            mainHip.vx += dir * 7.0;
            mainHip.vy -= 6.0;
            subHip.vx -= dir * 4.0;
            subHip.vy -= 3.5;
            b.bustL.vy -= 3.5;
            b.bustR.vy -= 3.5;

            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 8);
            if (!b.faceAnim.sequence && b.expression === "normal") {
              b.expression = "open_blush";
              b.expressionTimer = 24;
            }
            Particles.spawnHeart(state, gar.x, gar.y - 6, true);
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, gar.x, gar.y, "#00f5e8", 10, 3.4);
            Systems.addScore(state, ScoreTable.stage5.SERAPH_GARTER, gar.x, gar.y - 10, `✨${gar.label}`);
            Systems.addFever(state, 4);
            UI.updateHUD(state);
          });
        });

        if (!(b.navelTrap && b.navelTrap.mode !== "idle")) {
          hitCircle("seraNavel", b.navelSera, 8.2, 16, () => {
            b.navelSera.flash = 18;
            b.hipL.vy -= 6.5;
            b.hipR.vy -= 6.5;
            b.bustL.vy += 4.5;
            b.bustR.vy += 4.5;

            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 12);
            if (!b.faceAnim.sequence && b.expression === "normal") {
              b.expression = "open_blush";
              b.expressionTimer = 30;
            }
            Particles.spawnHeart(state, b.navelSera.x, b.navelSera.y - 6, false);
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, b.navelSera.x, b.navelSera.y, "#ff66cc", 14, 4.2);
            Systems.addScore(state, ScoreTable.stage5.SERAPH_NAVEL, b.navelSera.x, b.navelSera.y - 10, "💖NAVEL TOUCH!");
            Systems.addFever(state, 5);
            UI.updateHUD(state);
          });
        }
      }
    }
  },

  spawnFeintSword(sa, x, y, targetX, delay, isCresc, isBroken, id = Math.random()) {
    if (!sa) return;
    if (!sa.swords) sa.swords = [];
    const ang = Math.atan2(600 - y, targetX - x);
    sa.swords.push({
      id,
      x,
      y,
      targetX,
      vx: 0,
      vy: 0,
      spd: 2.6,
      maxSpd: isCresc ? 9.6 : (isBroken ? 8.8 : 8.0),
      accel: isCresc ? 0.38 : 0.32,
      ang,
      r: 13,
      delay,
      stage: "lock",
      lockTimer: isCresc ? 14 : 18,
      active: delay <= 0,
      parried: false,
      trail: []
    });
  },

  stepOrbAttack(state, b, activePlayBalls) {
    if (!b || state.stageCleared) return;
    if (!b.orbAttack) b.orbAttack = { bolts: [] };
    const bolts = b.orbAttack.bolts;
    const isCresc = !!b.finalCrescendo;

    if (b.cherubOrbs && (!b.fusionSeq || !b.fusionSeq.active)) {
      b.cherubOrbs.forEach((orb, oi) => {
        if (!orb.active || activePlayBalls.length === 0) return;
        if ((orb.chargeTimer || 0) > 0) {
          orb.chargeTimer--;
          if (orb.chargeTimer === 0) {
            orb.shotTimer = isCresc ? 105 : 145;
            const baseAng = Math.atan2((orb.aimY || 600) - orb.y, (orb.aimX || 198) - orb.x);
            const offsets = isCresc ? [-0.09, 0.09] : [0];
            const bSpd = isCresc ? 6.4 : 5.4;
            offsets.forEach(off => {
              const a = baseAng + off;
              bolts.push({
                x: orb.x,
                y: orb.y,
                vx: Math.cos(a) * bSpd,
                vy: Math.sin(a) * bSpd,
                r: 9.5,
                color: orb.color,
                parried: false,
                trail: []
              });
            });
            if (window.sfx) {
              if (window.sfx.laserPew) window.sfx.laserPew();
              else if (window.sfx.shurikenThrow) window.sfx.shurikenThrow();
            }
          }
        } else {
          orb.shotTimer = (orb.shotTimer !== undefined ? orb.shotTimer : 120) - 1;
          if (orb.shotTimer <= 0) {
            orb.chargeTimer = isCresc ? 24 : 30;
            orb.aimX = (oi === 0 ? 250 : 146) + (Math.random() - 0.5) * 32;
            orb.aimY = 600;
          }
        }
      });
    }

    if (bolts.length === 0) return;
    const flippers = Physics.getFlippers(state);
    for (let bi = bolts.length - 1; bi >= 0; bi--) {
      const bolt = bolts[bi];
      bolt.trail.push({ x: bolt.x, y: bolt.y });
      if (bolt.trail.length > 6) bolt.trail.shift();
      bolt.x += bolt.vx;
      bolt.y += bolt.vy;

      if (bolt.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - bolt.x;
        const dy = tgt.y - bolt.y;
        const dist = Math.hypot(dx, dy) || 1;
        const hSpd = (bolt.rally || 1) >= 2 ? 14.0 : 12.5;
        bolt.vx = (dx / dist) * hSpd;
        bolt.vy = (dy / dist) * hSpd;
        if (dist < 24) {
          if (typeof this.tryBossCounterParry === "function" && this.tryBossCounterParry(state, b, bolt, tgt, "bolt")) {
            continue;
          }
          const rally = bolt.rally || 1;
          const dmgLabel = rally >= 2 ? `🔥RALLY x${rally} BREAK!!` : "⚡ORB COUNTER!";
          this.damageActiveBoss(state, 1, tgt.x, tgt.y, dmgLabel, { source: "parry", rally });
          if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
          bolts.splice(bi, 1);
          continue;
        }
      } else {
        if (bolt.y > 440 && window.Systems && Systems.tryNoaBitIntercept(state, bolt.x, bolt.y)) {
          bolts.splice(bi, 1);
          continue;
        }
        let clashed = false;
        const clashPad = state.overdriveActive ? 16 : 3;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          if (Math.hypot(ball.x - bolt.x, ball.y - bolt.y) < ball.r + bolt.r + clashPad) {
            clashed = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, bolt.x, bolt.y, state.overdriveActive ? "#e6ff00" : bolt.color, state.overdriveActive ? 18 : 12, 4.0);
            if (state.overdriveActive) {
              Systems.addScore(state, ScoreTable.common.VOLT_SHATTER, bolt.x, bolt.y, "⚡VOLT SHATTER!", { fromDeckEffect: true });
              if ((state.overdriveRank || 0) >= 2 && typeof this.applyDeckBonusDamage === "function") {
                this.applyDeckBonusDamage(state, 1, bolt.x, bolt.y, "⚡VOLT COUNTER!", "#e6ff00", { source: "volt" });
              }
            } else {
              Systems.addScore(state, ScoreTable.stage5.ORB_BOLT_CLASH, bolt.x, bolt.y, "✨BOLT CLASH!");
            }
            bolts.splice(bi, 1);
            break;
          }
        }
        if (clashed) continue;

        let parriedNow = false;
        let hitFlipper = false;
        let hitFlipIsLeft = true;
        for (let fi = 0; fi < flippers.length; fi++) {
          const f = flippers[fi];
          const fst = Physics.flipperState[fi];
          const tipX = f.px + Math.cos(fst.angle) * f.len;
          const tipY = f.py + Math.sin(fst.angle) * f.len;
          const cp = Physics.closestPointOnSeg(bolt.x, bolt.y, f.px, f.py, tipX, tipY);
          if (Math.hypot(bolt.x - cp.x, bolt.y - cp.y) < bolt.r + 6.5) {
            hitFlipper = true;
            hitFlipIsLeft = !!f.isLeft;
            fst.swingHit = true;
            Physics.flipperState[f.isLeft ? 0 : 1].swingHit = true;
            const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
            if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
              parriedNow = true;
            }
            break;
          }
        }

        if (parriedNow) {
          this.handlePlayerParryReturn(state, bolt, ScoreTable.stage5.ORB_BOLT_PARRY, "⚡PARRY!", "#e6ff00", 5);
          continue;
        } else if (hitFlipper) {
          const pinKey = hitFlipIsLeft ? "flipperPinL" : "flipperPinR";
          state[pinKey] = Math.max(state[pinKey] || 0, 3);
          b[hitFlipIsLeft ? "pinStyleL" : "pinStyleR"] = "halo";
          if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
          Particles.add(state, bolt.x, bolt.y, bolt.color, 14, 3.8);
          Particles.addPopup(state, bolt.x, bolt.y - 14, t("stage5.popup.orbBoltPin"), bolt.color, 1.04);
          bolts.splice(bi, 1);
          continue;
        }
      }

      if (bolt.y > 670 || bolt.y < -30 || bolt.x < -30 || bolt.x > 450) {
        bolts.splice(bi, 1);
      }
    }
  },

  handlePlayerParryReturn(state, proj, baseScore, defaultLabel, color, feverGain) {
    proj.rally = (proj.rally || 0) + 1;
    proj.parried = true;
    if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
    state.shockwaves.push({ x: proj.x, y: proj.y, r: 8, maxR: 48, speed: 4.5, color: proj.countered ? "#ff1493" : color, lineWidth: 3.0, alpha: 1.0 });
    Particles.add(state, proj.x, proj.y, proj.countered ? "#ff1493" : color, 20, 5.2);
    if (proj.countered) {
      proj.countered = false;
      const rallyTxt = t("stage5.popup.rallyReturn", { rally: proj.rally });
      Particles.addPopup(state, proj.x, proj.y - 16, rallyTxt, "#ff1493", 1.24);
      Systems.addScore(state, ScoreTable.stage5.PARRY_RALLY_BONUS * proj.rally, proj.x, proj.y, rallyTxt);
      Systems.addFever(state, 10);
    } else {
      Particles.addPopup(state, proj.x, proj.y - 14, defaultLabel, color, 1.2);
      Systems.addScore(state, baseScore, proj.x, proj.y, "⚔️PARRY!");
      Systems.addFever(state, feverGain);
    }
  },

  tryBossCounterParry(state, b, proj, tgt, kind) {
    if (!b || state.phase !== 3 || !b.chestArmorBroken || state.stageCleared) return false;
    const rally = proj.rally || 1;
    if (rally >= 3) return false;
    let doCounter = false;
    if (b._forceCounterParry === true) doCounter = true;
    else if (b._forceCounterParry === false) doCounter = false;
    else {
      const chance = rally === 1 ? (b.finalCrescendo ? 0.65 : 0.45) : (b.finalCrescendo ? 0.40 : 0.25);
      doCounter = Math.random() < chance;
    }
    if (!doCounter) return false;

    proj.parried = false;
    proj.countered = true;
    proj.trail = [];
    const tx = Math.random() < 0.5 ? 140 : 256;
    const ty = 600;
    const returnSpd = Math.min(10.8, 8.4 + rally * 1.1);
    const a = Math.atan2(ty - proj.y, tx - proj.x);
    proj.vx = Math.cos(a) * returnSpd;
    proj.vy = Math.sin(a) * returnSpd;
    if (kind === "sword") {
      proj.stage = "fly";
      proj.accel = 0;
      proj.spd = returnSpd;
      proj.ang = a;
    }
    state.hitStopTimer = Math.max(state.hitStopTimer || 0, 3);
    b.expression = "wink";
    b.expressionTimer = 28;
    const fxX = (tgt && tgt.x) || proj.x;
    const fxY = (tgt && tgt.y) || proj.y;
    state.shockwaves.push({ x: fxX, y: fxY, r: 8, maxR: 56, speed: 4.8, color: "#ff1493", lineWidth: 3.2, alpha: 1.0 });
    state.shockwaves.push({ x: fxX, y: fxY, r: 6, maxR: 42, speed: 4.2, color: "#ffd700", lineWidth: 2.4, alpha: 0.95 });
    Particles.add(state, fxX, fxY, "#ff1493", 22, 5.4);
    if (window.sfx) {
      if (window.sfx.metalBumper) window.sfx.metalBumper();
      if (window.sfx.shurikenParry) window.sfx.shurikenParry();
    }
    Particles.addPopup(state, fxX, fxY - 16, t("stage5.popup.counterParry", { rally: rally + 1 }), "#ff1493", 1.18);
    return true;
  },

  isBallGrazingCross(ball, cx, cy, bAng, armCount) {
    for (let arm = 0; arm < armCount; arm++) {
      const ang = bAng + (arm * Math.PI * 2) / armCount;
      const nx = -Math.sin(ang);
      const ny = Math.cos(ang);
      const perpSigned = (ball.x - cx) * nx + (ball.y - cy) * ny;
      const perpDist = Math.abs(perpSigned);
      const alongDist = (ball.x - cx) * Math.cos(ang) + (ball.y - cy) * Math.sin(ang);
      if (alongDist > 0 && perpDist < ball.r + 19) {
        return { hit: true, nx, ny, sign: perpSigned >= 0 ? 1 : -1 };
      }
    }
    return null;
  },

  isBallGrazingPillars(ball, pillars) {
    if (!pillars || ball.y <= 16 || ball.y >= 615) return null;
    for (let pi = 0; pi < pillars.length; pi++) {
      const p = pillars[pi];
      const halfW = (p.w || 26) * 0.52;
      if (Math.abs(ball.x - p.x) < ball.r + halfW + 10) {
        return { hit: true, dir: ball.x >= p.x ? 1 : -1, p };
      }
    }
    return null;
  },

  applyLaserGrazeKnockback(state, ball, mode, hit) {
    Systems.addScore(state, ScoreTable.stage5.LASER_GRAZE_BONUS, ball.x, ball.y - 12, t("stage5.popup.laserGraze"));
    state.shockwaves.push({ x: ball.x, y: ball.y, r: 6, maxR: 44, speed: 4.2, color: "#ffd700", lineWidth: 2.8, alpha: 0.95 });
    Particles.add(state, ball.x, ball.y, "#e6ff00", 18, 4.8);
    if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
    if (mode === "pillar") {
      ball.vx = hit.dir * 8.2;
      ball.vy = -4.2;
    } else {
      ball.vx = hit.nx * hit.sign * 9.0;
      ball.vy = hit.ny * hit.sign * 9.0;
    }
    ball._seraphStasis = {
      mode,
      savedVx: 0,
      savedVy: 0,
      grazeDelay: 9,
      grazed: true,
      originX: 198,
      originY: 224,
      totalRot: 0
    };
  },

  captureSeraphStasis(state, b, mode) {
    if (!state || !state.balls || !b) return;
    const sa = b.seraphAttack || {};
    state.balls.forEach(ball => {
      if (!ball || ball.inShooterLane || ball._onWireRamp || ball._inNavelTrap || ball._fusionStasis || ball.y >= 605) return;
      if (ball._seraphStasis) return;
      ball._magnetHeld = 0;
      const grazeHit = mode === "pillar"
        ? this.isBallGrazingPillars(ball, sa.pillars)
        : this.isBallGrazingCross(ball, 198, 224, sa.baseAngle || 0, sa.armCount || 4);
      if (grazeHit) {
        this.applyLaserGrazeKnockback(state, ball, mode, grazeHit);
      } else {
        const savedVx = ball.vx;
        const savedVy = ball.vy;
        ball.vx = 0;
        ball.vy = 0;
        ball._seraphStasis = {
          mode,
          savedVx,
          savedVy,
          grazeDelay: 0,
          grazed: false,
          originX: 198,
          originY: 224,
          totalRot: 0
        };
      }
    });
  },

  stepSeraphStasis(state, b, mode, dAng = 0) {
    if (!state || !state.balls || !b) return;
    this.captureSeraphStasis(state, b, mode);
    const sa = b.seraphAttack || {};
    state.balls.forEach(ball => {
      const st = ball && ball._seraphStasis;
      if (!st) return;
      if (st.grazeDelay > 0) {
        st.grazeDelay--;
        if (st.grazeDelay <= 0) {
          st.savedVx = ball.vx;
          st.savedVy = ball.vy;
          ball.vx = 0;
          ball.vy = 0;
        }
        return;
      }
      ball.vx = 0;
      ball.vy = 0;
      if (mode === "pillar" && !st.grazed && sa.pillars) {
        const sweepHit = this.isBallGrazingPillars(ball, sa.pillars);
        if (sweepHit) {
          this.applyLaserGrazeKnockback(state, ball, mode, sweepHit);
          return;
        }
      }
      if (mode === "cross" && dAng !== 0) {
        const cx = st.originX;
        const cy = st.originY;
        const rx = ball.x - cx;
        const ry = ball.y - cy;
        let r = Math.hypot(rx, ry);
        const theta = Math.atan2(ry, rx) + dAng;
        const R_SAFE = 144;
        if (r > R_SAFE) {
          r = Math.max(R_SAFE, r - Math.max(2.2, (r - R_SAFE) * 0.08));
        }
        ball.x = Math.max(38, Math.min(358, cx + Math.cos(theta) * r));
        ball.y = Math.max(48, Math.min(540, cy + Math.sin(theta) * r));
        st.totalRot += dAng;
      }
    });
  },

  releaseSeraphStasis(state, reason = "end") {
    if (!state || !state.balls) return;
    state.balls.forEach(ball => {
      const st = ball && ball._seraphStasis;
      if (!st) return;
      ball._seraphStasis = null;
      if (reason === "clear") {
        ball.vx = 0;
        ball.vy = 0;
        return;
      }
      if (st.grazeDelay > 0) {
        return;
      }
      if (st.mode === "pillar") {
        ball.vx = 0;
        ball.vy = 0;
        Particles.add(state, ball.x, ball.y, "#00f5e8", 10, 3.2);
      } else if (st.mode === "cross") {
        const cosR = Math.cos(st.totalRot);
        const sinR = Math.sin(st.totalRot);
        ball.vx = st.savedVx * cosR - st.savedVy * sinR;
        ball.vy = st.savedVx * sinR + st.savedVy * cosR;
        Particles.add(state, ball.x, ball.y, "#ffd700", 12, 3.8);
      }
    });
  }
});

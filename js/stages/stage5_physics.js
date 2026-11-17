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
        bossDisplayName: "熾天使セラフィア (SERAPHIA)",
        defeatQuoteHtml: "「我が聖域の理を破るとは……！<br>人の子の放つ光、誠に見事でした……っ！」",
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
    if (b.elle.blushTimer > 0) b.elle.blushTimer--;
    if (b.noel.blushTimer > 0) b.noel.blushTimer--;
    if (b.navelBeam.pluckAmp > 0.05) {
      b.navelBeam.pluckAmp *= 0.90;
    } else {
      b.navelBeam.pluckAmp = 0;
    }

    const t = b.animTick;

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

        b.animTick += 4; // Scroll 3D wireframe grid 5x faster!
        fs.whiteout = fs.frame < 38 ? 0 : Math.min(1.0, (fs.frame - 38) / 31);
      } else if (fs.frame === 70) {
        // Beat 2 begins
        state.phase = 3;
        b.fused = true;
        b.expression = "blink";
        b.expressionTimer = 95;
        Systems.dropReward(state, "major", { x: 198, y: 240 });
        Systems.addScore(state, 80000, 198, 240, "✨SERAPHIA AWAKENING!!");
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
          StageCommon.setExpressionSequence(state, [
            { expr: "shout", frames: 34 },
            { expr: "wink", frames: 30 }
          ]);
          if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 70, speed: 4.5, color: "#ff2ad4", lineWidth: 3.5, alpha: 1.0 });
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 85, speed: 5.0, color: "#00f5e8", lineWidth: 3.5, alpha: 1.0 });
        }
        if (fs.frame >= 195) {
          fs.active = false;
          fs.whiteout = 0;
          state.balls.forEach(ball => {
            if (ball._fusionStasis) {
              ball._fusionStasis = false;
              ball.vx = (Math.random() < 0.5 ? -1 : 1) * 3.8;
              ball.vy = -6.8;
            }
          });
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
        b.elle.dx = Math.sin(t * 0.037) * 7.5;
        b.elle.dy = Math.cos(t * 0.049) * 8.0;
      } else {
        b.elle.dx = Math.sin(t * 0.031) * 28 + 10;
        b.elle.dy = Math.cos(t * 0.043) * 26 - 12;
      }
      if (!b.noelBroken) {
        b.noel.dx = Math.cos(t * 0.043) * 8.0;
        b.noel.dy = Math.sin(t * 0.053) * 8.5;
      } else {
        b.noel.dx = Math.cos(t * 0.036) * 30 - 12;
        b.noel.dy = Math.sin(t * 0.047) * 32 + 16;
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
          nb.timer = state.phase === 1 ? 105 : 130;
          nb.pluckAmp = 6;
          if (window.sfx && window.sfx.navelBeamPluck) window.sfx.navelBeamPluck();
        }
      } else if (nb.mode === "active") {
        nb.timer--;
        if (nb.timer <= 0) {
          nb.mode = "idle";
          nb.timer = state.phase === 1 ? 145 : 110;
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
            b.cherubOrbs.forEach(o => { o.active = true; o.hp = o.maxHP; o.flash = 20; });
            b.orbCooldown = 480;
            if (window.sfx && window.sfx.bunshinSummon) window.sfx.bunshinSummon();
            Particles.addPopup(state, 198, 205, "🛡️精霊オーブ再展開！", "#00f5e8", 1.1);
          }
        }
        // Rotate active orbs
        const oAngle = b.animTick * 0.035;
        b.cherubOrbs[0].x = 198 + Math.cos(oAngle) * 96;
        b.cherubOrbs[0].y = 205 + Math.sin(oAngle) * 35;
        b.cherubOrbs[1].x = 198 + Math.cos(oAngle + Math.PI) * 96;
        b.cherubOrbs[1].y = 205 + Math.sin(oAngle + Math.PI) * 35;
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
          nt.timer = 145;
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
            nt.timer = 145;
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
              cb.vy = 9.6;
            }
            nt.mode = "spit_cool";
            nt.timer = 36;
            b.hipL.vx -= 6.5;
            b.hipR.vx += 6.5;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            state.shockwaves.push({ x: 198, y: 348, r: 8, maxR: 50, speed: 4.5, color: "#ff1493", lineWidth: 3.0, alpha: 1.0 });
            Particles.addPopup(state, 198, 370, "⚠️真下排出! 台揺らし!!", "#ff2ad4", 1.15);
          }
        } else if (nt.mode === "spit_cool") {
          nt.timer--;
          nt.gateOpen = Math.max(0, nt.timer / 36);
          if (nt.timer <= 0) {
            nt.mode = "idle";
            nt.timer = 145;
          }
        }
      }

      // Step Sanctuary Rising Feathers
      if (b.sanctuaryFeathers) {
        b.sanctuaryFeathers.forEach(f => {
          f.y -= f.spd;
          f.x += Math.sin(t * 0.04 + f.phase) * f.sway * 0.5;
          if (f.y < -20) {
            f.y = 670;
            f.x = 20 + Math.random() * 380;
          }
        });
      }

      // Seraphic Harmony Beam countdown
      if (b.harmonyBeamTimer > 0) b.harmonyBeamTimer--;

      // Grand Phase 3 Boss Attack: Rotating Cross-Seraphim Laser & Light-Sword Volley
      const sa = b.seraphAttack;
      if (sa && (!b.fusionSeq || !b.fusionSeq.active)) {
        if (sa.mode === "idle") {
          sa.timer--;
          if (sa.timer <= 0 && activePlayBalls.length > 0) {
            if (sa.nextType === "cross") {
              sa.mode = "cross_warn";
              sa.timer = 45;
              sa.baseAngle = Math.random() * Math.PI;
              sa.nextType = "sword";
              if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            } else {
              sa.mode = "sword_warn";
              sa.timer = 40;
              sa.nextType = "cross";
              if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
            }
          }
        } else if (sa.mode === "cross_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "cross_fire";
            sa.timer = 80;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            Particles.addPopup(state, 198, 224, "⚔️CROSS SERAPHIM LASER!", "#ff2ad4", 1.2);
          }
        } else if (sa.mode === "cross_fire") {
          sa.timer--;
          sa.baseAngle += 0.007; // smooth sweeping cross laser
          if (sa.timer <= 0) {
            sa.mode = "idle";
            sa.timer = 210;
          }
        } else if (sa.mode === "sword_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "sword_fire";
            sa.timer = 130;
            sa.swords = [];
            const portalSpawns = [
              { x: 110, y: 120, targetX: 142, delay: 0 },
              { x: 198, y: 96,  targetX: 198, delay: 12 },
              { x: 286, y: 120, targetX: 254, delay: 24 }
            ];
            portalSpawns.forEach((p, idx) => {
              const ang = Math.atan2(600 - p.y, p.targetX - p.x);
              sa.swords.push({
                id: idx,
                x: p.x,
                y: p.y,
                vx: Math.cos(ang) * 5.6,
                vy: Math.sin(ang) * 5.6,
                ang,
                r: 13,
                delay: p.delay,
                active: false,
                parried: false,
                trail: []
              });
            });
            Particles.addPopup(state, 198, 120, "⚔️LIGHT-SWORD VOLLEY!", "#ffd700", 1.2);
          }
        } else if (sa.mode === "sword_fire") {
          sa.timer--;
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

            sw.trail.push({ x: sw.x, y: sw.y });
            if (sw.trail.length > 7) sw.trail.shift();

            sw.x += sw.vx;
            sw.y += sw.vy;
            sw.ang = Math.atan2(sw.vy, sw.vx);

            if (sw.parried) {
              const tgt = this.getActiveBossTarget(state);
              const dx = tgt.x - sw.x;
              const dy = tgt.y - sw.y;
              const dist = Math.hypot(dx, dy) || 1;
              sw.vx = (dx / dist) * 12.0;
              sw.vy = (dy / dist) * 12.0;
              if (dist < 26) {
                this.damageActiveBoss(state, 2, tgt.x, tgt.y, "⚔️SWORD PARRY!! -2HP");
                if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
                sa.swords.splice(si, 1);
                continue;
              }
            } else {
              // Ball clash
              let clashed = false;
              for (const ball of state.balls) {
                if (ball.inShooterLane || ball._onWireRamp) continue;
                if (Math.hypot(ball.x - sw.x, ball.y - sw.y) < ball.r + sw.r + 3) {
                  clashed = true;
                  if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
                  Particles.add(state, sw.x, sw.y, "#ffd700", 16, 4.2);
                  Systems.addScore(state, 4000, sw.x, sw.y, "⚔️CLASH!");
                  sa.swords.splice(si, 1);
                  break;
                }
              }
              if (clashed) continue;

              // Flipper collision / parry
              let parriedNow = false;
              let hitFlipper = false;
              for (let fi = 0; fi < flippers.length; fi++) {
                const f = flippers[fi];
                const fst = Physics.flipperState[fi];
                const tipX = f.px + Math.cos(fst.angle) * f.len;
                const tipY = f.py + Math.sin(fst.angle) * f.len;
                const cp = Physics.closestPointOnSeg(sw.x, sw.y, f.px, f.py, tipX, tipY);
                if (Math.hypot(sw.x - cp.x, sw.y - cp.y) < sw.r + 7.0) {
                  hitFlipper = true;
                  const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
                  if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
                    parriedNow = true;
                  }
                  break;
                }
              }

              if (parriedNow) {
                sw.parried = true;
                if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
                state.shockwaves.push({ x: sw.x, y: sw.y, r: 8, maxR: 50, speed: 4.5, color: "#ffd700", lineWidth: 3.0, alpha: 1.0 });
                Particles.add(state, sw.x, sw.y, "#ffd700", 20, 5.5);
                Particles.addPopup(state, sw.x, sw.y - 14, "⚔️SWORD PARRY!!", "#ffd700", 1.2);
                Systems.addScore(state, 12000, sw.x, sw.y, "⚔️PARRY!");
                Systems.addFever(state, 8);
                continue;
              } else if (hitFlipper) {
                state.flipperReverseTimer = Math.max(state.flipperReverseTimer || 0, 180);
                if (window.sfx && window.sfx.haloReverse) window.sfx.haloReverse();
                Particles.add(state, sw.x, sw.y, "#ff1493", 16, 4.0);
                Particles.addPopup(state, 198, 560, "⚔️SWORD IMPACT!!", "#ff1493", 1.2);
                sa.swords.splice(si, 1);
                continue;
              }
            }

            if (sw.y > 670 || sw.y < -30 || sw.x < -30 || sw.x > 450) {
              sa.swords.splice(si, 1);
            }
          }

          if (sa.swords.length === 0 && sa.timer <= 0) {
            sa.mode = "idle";
            sa.timer = 210;
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
            cm.timer = 65;
            cm.angle = (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.45);
            cm.nextType = "blackhole";
          } else {
            cm.mode = "bh_warn";
            cm.timer = 60;
            cm.nextType = "gamma";
          }
        }
      }
    } else if (cm.mode === "gamma_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "gamma_fire";
        cm.timer = 95;
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Particles.addPopup(state, cm.x, cm.y - 20, "💥GAMMA BURST!!", "#e6ff00", 1.15);
      }
    } else if (cm.mode === "gamma_fire") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = 240;
      }
    } else if (cm.mode === "bh_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "bh_active";
        cm.timer = 185;
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
        if (dist < 98 && dist > 1) {
          const pull = 0.28 * (1 - dist / 98) + 9.5 / Math.max(20, dist);
          ball.vx += (dx / dist) * pull;
          ball.vy += (dy / dist) * pull;

          if (dist < 16 && (ball.hitCooldowns.bhSling || 0) <= 0) {
            ball.hitCooldowns.bhSling = 55;
            if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
            const ang = (Math.random() < 0.5 ? 0.38 : Math.PI - 0.38) + (Math.random() - 0.5) * 0.28;
            ball.vx = Math.cos(ang) * 10.4;
            ball.vy = Math.sin(ang) * 10.4;
            Systems.addScore(state, 4500, cm.x, cm.y, "🕳️SINGULARITY SLING!");
            Particles.add(state, cm.x, cm.y, "#b84dff", 18, 5.0);
            state.shockwaves.push({ x: cm.x, y: cm.y, r: 8, maxR: 55, speed: 4.2, color: "#b84dff", lineWidth: 3.0, alpha: 1.0 });
          }
        }
      }
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = 240;
      }
    }

    // Judgement Halo Attack state machine
    const ha = b.haloAttack;
    if (ha.mode === "idle") {
      ha.timer--;
      if (ha.timer <= 0 && activePlayBalls.length > 0) {
        ha.mode = "charging";
        ha.chargeTimer = 38;
        ha.targetSide = Math.random() < 0.5 ? "L" : "R";
        ha.timer = 230;
        if (!b.faceAnim.sequence && state.phase === 3) {
          b.expression = "shout";
          b.expressionTimer = 38;
        }
      }
    } else if (ha.mode === "charging") {
      ha.chargeTimer--;
      if (ha.chargeTimer <= 0) {
        ha.mode = "idle";
        const targetX = ha.targetSide === "L" ? 142 : 254;
        const targetY = 600;
        const sx = 198;
        const sy = state.phase === 3 ? 180 : 250;
        const ang = Math.atan2(targetY - sy, targetX - sx);
        const spd = 5.0;
        ha.rings.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 14,
          rot: 0,
          parried: false,
          color: ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8",
          trail: []
        });
        if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
      }
    }

    // Halo ring flight and collision
    const flippers = Physics.getFlippers(state);
    for (let i = ha.rings.length - 1; i >= 0; i--) {
      const ring = ha.rings[i];
      ring.trail.push({ x: ring.x, y: ring.y });
      if (ring.trail.length > 8) ring.trail.shift();
      ring.x += ring.vx;
      ring.y += ring.vy;
      ring.rot += ring.parried ? 0.45 : 0.25;

      if (ring.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - ring.x;
        const dy = tgt.y - ring.y;
        const dist = Math.hypot(dx, dy) || 1;
        ring.vx = (dx / dist) * 12.0;
        ring.vy = (dy / dist) * 12.0;
        if (dist < 22) {
          this.damageActiveBoss(state, 2, tgt.x, tgt.y, "⚡HALO PARRY!! -2HP");
          ha.rings.splice(i, 1);
          continue;
        }
      } else {
        let clashedBall = false;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - ring.x, ball.y - ring.y);
          if (d < ball.r + ring.r + 3) {
            clashedBall = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, ring.x, ring.y, "#00f5e8", 14, 4.0);
            Systems.addScore(state, 3500, ring.x, ring.y, "⚔️CLASH!");
            ha.rings.splice(i, 1);
            break;
          }
        }
        if (clashedBall) continue;

        let parriedNow = false;
        let hitFlipper = false;
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
          Systems.addScore(state, 10000, ring.x, ring.y, "⚔️PARRY!");
          Systems.addFever(state, 8);
          continue;
        } else if (hitFlipper) {
          state.flipperReverseTimer = 240; // 4.0 seconds
          if (window.sfx && window.sfx.haloReverse) window.sfx.haloReverse();
          UI.showCutin("😇【呪いの天使輪！】<br>4秒間 左右パドルの操作がアベコベに逆転！！", 110);
          Particles.add(state, cpX, cpY, "#ff1493", 16, 4.0);
          Particles.addPopup(state, 198, 560, "🔄LRパドル反転!!", "#ff1493", 1.2);
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
    if (!b || ball.inShooterLane || ball._inNavelTrap || ball._fusionStasis) return;

    const SUBSTEPS = 6;

    // A. 3D Wireform Ramp Riding
    if (ball._onWireRamp) {
      const rs = ball._onWireRamp;
      rs.dist += rs.speed / SUBSTEPS;
      const samp = this.sampleRamp(rs.rampId, rs.dist);
      ball.x = samp.x;
      ball.y = samp.y;
      rs.elev = samp.elev;

      if (substep === 0) {
        rs.tick = (rs.tick || 0) + 1;
        if (rs.tick % 5 === 0 && window.sfx && window.sfx.rampRailTick) {
          window.sfx.rampRailTick(rs.tick / 5);
        }
        if (rs.tick % 2 === 0) {
          const rampDef = this.WIRE_RAMPS[rs.rampId];
          Particles.add(state, ball.x, ball.y, rampDef.color, 3, 2.2);
        }
      }

      if (rs.dist >= samp.totalLen) {
        const rampDef = this.WIRE_RAMPS[rs.rampId];
        ball._onWireRamp = null;
        ball._rampExitCooldown = 28;
        ball.vx = rampDef.exitVx;
        ball.vy = rampDef.exitVy;
        Particles.addPopup(state, ball.x, ball.y - 12, "⚡SKYWAY DROP!", rampDef.color, 1.05);
      }
      return;
    }

    if (substep === 0 && ball._rampExitCooldown > 0) {
      ball._rampExitCooldown--;
    }

    // B. Wire Ramp Gate Entry (active only in Phases 1 & 2 before fusion!)
    if (state.phase < 3 && !(b.fusionSeq && b.fusionSeq.active) && !ball._rampExitCooldown && ball.vy < -2.6 && b.lastFlipActiveTimer > 0) {
      for (const rampKey of ["left", "right"]) {
        const rd = this.WIRE_RAMPS[rampKey];
        const dGate = Math.hypot(ball.x - rd.entryX, ball.y - rd.entryY);
        if (dGate < ball.r + rd.entryR) {
          const entrySpd = Math.max(9.5, Math.min(14.8, Math.hypot(ball.vx, ball.vy) * 1.18));
          ball._onWireRamp = {
            rampId: rampKey,
            dist: 2,
            speed: entrySpd,
            elev: 0.15,
            tick: 0
          };
          ball.trail = [];
          if (window.sfx && window.sfx.rampEnter) window.sfx.rampEnter();
          state.shockwaves.push({ x: rd.entryX, y: rd.entryY, r: 6, maxR: 44, speed: 3.8, color: rd.color, lineWidth: 2.8, alpha: 1.0 });
          Systems.addScore(state, 6000, rd.entryX, rd.entryY - 12, `⚡${rd.name} IN!!`);
          Particles.add(state, rd.entryX, rd.entryY, rd.color, 16, 4.4);
          return;
        }
      }
    }

    if (!ball.hitCooldowns) ball.hitCooldowns = {};
    if (substep === 0) {
      for (const k in ball.hitCooldowns) {
        if (ball.hitCooldowns[k] > 0) ball.hitCooldowns[k]--;
      }
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
        ball.vx = nx * sign * 7.8;
        ball.vy = ny * sign * 7.8;
        if (b.lastFlipActiveTimer <= 0) {
          ball.vy = Math.max(ball.vy, 1.8);
        }
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Systems.addScore(state, 3000, ball.x, ball.y, "💥GAMMA BURST!");
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
              Systems.addScore(state, 5000, cp.x, cp.y, "⚡へそ過負荷 -1HP!");
              if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
                this.triggerSeraphFusion(state);
              }
            }
          } else {
            Systems.addScore(state, 1800, cp.x, cp.y, "🛡️へそバリア反射!!");
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
          Systems.addScore(state, 4000, b.synchroSpark.x, b.synchroSpark.y, "🏐TWIN TOSS! +4000");
          Systems.addFever(state, 5);
        });
      }

      const bothIntact = !b.elleBroken && !b.noelBroken;

      const onTwinPartHit = (obj, spring, twin) => {
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
        Systems.addScore(state, isAlternating ? 12000 : 5000, obj.x, obj.y - 10, msg);
        Systems.addFever(state, isAlternating ? 8 : 4);
        Particles.add(state, obj.x, obj.y, obj.color, 14, 4.5);

        if (obj.hp <= 0) {
          obj.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", obj.x, obj.y);
          if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
          this.checkIndividualTwinBreaks(state);
        } else {
          if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
        }
        UI.updateHUD(state);
      };

      // 1. Rotated Elliptical Halos
      if (!b.haloL.broken) {
        hitRotatedEllipse("haloL", b.haloL, 9.2, 14, () => onTwinPartHit(b.haloL, b.elleSpring, b.elle));
      }
      if (!b.haloR.broken) {
        hitRotatedEllipse("haloR", b.haloR, 9.2, 14, () => onTwinPartHit(b.haloR, b.noelSpring, b.noel));
      }

      // 2. Hair Ornament Targets (plays earBoing)
      if (!b.odangoL.broken) {
        hitCircle("odangoL", b.odangoL, 8.8, 14, () => {
          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          onTwinPartHit(b.odangoL, b.elleSpring, b.elle);
        });
      }
      if (!b.antennaR.broken) {
        hitCircle("antennaR", b.antennaR, 8.8, 14, () => {
          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          onTwinPartHit(b.antennaR, b.noelSpring, b.noel);
        });
      }

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
        Systems.addScore(state, 4500, b.charmL.x, b.charmL.y - 10, "♥GARTER BOUNCE!");
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
        Systems.addScore(state, 4500, b.charmR.x, b.charmR.y - 10, "♦GARTER BOUNCE!");
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
            Systems.addScore(state, 3000, obj.x, obj.y - 10, "🛡️BROOCH GUARD");
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
            Systems.addScore(state, 8000, obj.x, obj.y - 10, `${obj.label} HP:${obj.hp}`);
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
          Systems.addScore(state, 4000, pipe.x, pipe.y - 10, "🎹CHIME!");
          Systems.addFever(state, 4);

          if (b.chimePipes.every(p => p.lit)) {
            b.harmonyBeamTimer = 55;
            b.chimePipes.forEach(p => { p.lit = false; p.flash = 25; });
            Systems.addScore(state, 40000, 198, 120, "✨SERAPHIC HARMONY JACKPOT!! +40,000");
            Particles.addPopup(state, 198, 120, "✨HARMONY JACKPOT!!", "#e6ff00", 1.25);
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            this.damageActiveBoss(state, 3, 198, 205, "🎹HARMONY LASER -3HP!!");
          }
          UI.updateHUD(state);
        });
      });
    }

    // Rotating Cross-Seraphim Laser Collision (Phase 3)
    if (state.phase === 3 && b.seraphAttack && b.seraphAttack.mode === "cross_fire") {
      const cx = 198, cy = 224;
      const bAng = b.seraphAttack.baseAngle;
      for (let arm = 0; arm < 4; arm++) {
        const ang = bAng + (arm * Math.PI) / 2;
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const perpDist = Math.abs((ball.x - cx) * nx + (ball.y - cy) * ny);
        const alongDist = (ball.x - cx) * Math.cos(ang) + (ball.y - cy) * Math.sin(ang);
        if (alongDist > 0 && perpDist < ball.r + 9 && (ball.hitCooldowns.crossLaser || 0) <= 0) {
          ball.hitCooldowns.crossLaser = 16;
          const sign = ((ball.x - cx) * nx + (ball.y - cy) * ny) >= 0 ? 1 : -1;
          ball.vx = nx * sign * 8.2;
          ball.vy = ny * sign * 8.2;
          if (b.lastFlipActiveTimer <= 0) {
            ball.vy = Math.max(ball.vy, 1.5);
          }
          if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
          Particles.add(state, ball.x, ball.y, arm % 2 === 0 ? "#ff2ad4" : "#00f5e8", 16, 4.5);
          Systems.addScore(state, 3000, ball.x, ball.y, "⚔️CROSS DEFLECTION!");
          break;
        }
      }
    }

    // G. Phase 3 Collision Checks (Seraphia)
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
            Systems.addScore(state, 6000, cup.x, cup.y - 12, `ARMOR HP:${b.chestArmorHP}`);
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
            Systems.addScore(state, 4000, pld.x, pld.y - 12, `ARMOR HP:${b.chestArmorHP}`);
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
              if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
              state.shockwaves.push({ x: orb.x, y: orb.y, r: 8, maxR: 55, speed: 4.2, color: orb.color, lineWidth: 3.0, alpha: 1.0 });
              Particles.add(state, orb.x, orb.y, "#e6ff00", 20, 5.5);
              Systems.addScore(state, 18000, orb.x, orb.y - 10, `💥${orb.label} SHATTER!!`);
              Systems.addFever(state, 8);
              if (b.cherubOrbs.every(o => !o.active)) {
                b.orbCooldown = 480;
                Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
              }
            } else {
              if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
              Systems.addScore(state, 4500, orb.x, orb.y - 10, `${orb.label} HP:${orb.hp}`);
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
            Systems.addScore(state, 2000, b.core.x, b.core.y - 12, "🛡️精霊オーブ結界！オーブを倒せ！");
          } else {
            b.core.hp = Math.max(0, b.core.hp - 1);
            b.expression = "wince";
            b.expressionTimer = 28;
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 8, maxR: 64, speed: 4.6, color: "#00f5d4", lineWidth: 3.2, alpha: 1.0 });
            Particles.add(state, b.core.x, b.core.y, "#00f5d4", 24, 6.0);
            Systems.addScore(state, 15000, b.core.x, b.core.y - 14, `💎ARK CORE HP:${b.core.hp}`);
            Systems.addFever(state, 8);
            if (b.core.hp <= 0) {
              this.triggerStageClear(state);
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
            Systems.addScore(state, 7500, cup.x, cup.y - 12, "♥DIVINE BOUNCE!!");
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
            Systems.addScore(state, 4000, gar.x, gar.y - 10, `✨${gar.label}`);
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
            Systems.addScore(state, 5500, b.navelSera.x, b.navelSera.y - 10, "💖NAVEL TOUCH!");
            Systems.addFever(state, 5);
            UI.updateHUD(state);
          });
        }
      }
    }
  }
});

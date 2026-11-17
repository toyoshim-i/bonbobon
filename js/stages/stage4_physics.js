// =========================================================================
// STAGE 4: PHYSICS & COLLISIONS
// =========================================================================

Object.assign(window.Stage4, {
  _hitCircle(ball, key, target, bounceSpd, cooldown, onHit) {
    if ((ball.hitCooldowns[key] || 0) > 0) return false;
    return Physics.checkCircleBumper(ball, target, bounceSpd, () => {
      ball.hitCooldowns[key] = cooldown;
      onHit();
    });
  },

  update(state, engine) {
    const b = state.boss;
    if (!b) return;
    b.animTick++;

    // クリア演出進行
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: "カスミ (KASUMI)",
        defeatQuoteHtml: "「くっ……忍びの装束も秘術も見破られるなんて……！<br>お、お見事……参りました……っ！」",
        smokeColors: ["#ffb7dd", "#00f5d4", "#b84dff", "#ff2a9d"]
      });
      return;
    }

    // 0. 表情アニメーション状態マシン更新
    StageCommon.updateFaceAnim(b, "normal");

    if (b.sakuraStormTimer > 0) b.sakuraStormTimer--;
    if (b.coreGraceTimer > 0) b.coreGraceTimer--;
    if (state.leftFlipperDown || state.rightFlipperDown) {
      b.lastFlipActiveTimer = 95;
    } else if (b.lastFlipActiveTimer > 0) {
      b.lastFlipActiveTimer--;
    }
    b.stoleWind = Math.max(0, (b.stoleWind || 0) * 0.96);

    const activePlayBalls = state.balls.filter(ball => !ball.inShooterLane && !ball._onWireRamp && ball.y < 590);

    // 1. 前景マトリックス 0/1 ストリーム更新 ＆ ボール接触時の減速（デジタル抵抗）判定！
    const fastFactor = (state.fever.active || b.sakuraStormTimer > 0) ? 1.85 : 1.0;
    b.matrixCols.forEach(col => {
      col.y += col.speed * fastFactor;
      if (col.y - col.len * 13 > 660) {
        col.y = -10 - Math.random() * 60;
      }
      if ((b.animTick + (col.x | 0)) % 8 === 0) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = Math.random() < 0.5 ? "0" : "1";
      }
      for (let k = 0; k < col.len; k++) {
        if (col.hitTimers[k] > 0) {
          col.hitTimers[k]--;
          continue;
        }
        const cy = col.y - k * 12;
        if (cy < 26 || cy > 565) continue;
        for (let bi = 0; bi < activePlayBalls.length; bi++) {
          const ball = activePlayBalls[bi];
          if (Math.abs(ball.x - col.x) < ball.r + 5.5 && Math.abs(ball.y - cy) < ball.r + 5.5) {
            col.hitTimers[k] = 32;
            const spd = Math.hypot(ball.vx, ball.vy);
            if (spd > 2.4) {
              ball.vx *= 0.915;
              ball.vy *= 0.915;
            }
            Particles.add(state, col.x, cy, col.pink ? "#ff77cc" : "#00f5d4", 2, 1.8);
            break;
          }
        }
      }
    });

    // 2. 桜の花びら更新 ＆ 手前の桜にボールが当たった際の舞い散り＆減速判定！
    const stormBoost = b.sakuraStormTimer > 0 ? 2.2 : 1.0;
    const stepPetals = (arr, isFront) => {
      arr.forEach(p => {
        if (p.hitCooldown > 0) p.hitCooldown--;
        p.swayPhase += 0.048;
        p.x += (p.vx + Math.sin(p.swayPhase) * 0.5) * stormBoost;
        p.y += p.vy * stormBoost;
        p.rot += p.rotSpd * stormBoost;

        if (isFront && p.y > 26 && p.y < 570) {
          for (let bi = 0; bi < activePlayBalls.length; bi++) {
            const ball = activePlayBalls[bi];
            const dx = p.x - ball.x;
            const dy = p.y - ball.y;
            const d = Math.hypot(dx, dy);
            // 直撃時はボールを減速させつつ花びらを弾き飛ばす！
            if (d < ball.r + p.size + 3.5 && p.hitCooldown <= 0) {
              p.hitCooldown = 30;
              const spd = Math.hypot(ball.vx, ball.vy);
              if (spd > 2.4) {
                ball.vx *= 0.92;
                ball.vy *= 0.92;
              }
              const nx = d > 0.1 ? dx / d : 0;
              const ny = d > 0.1 ? dy / d : -1;
              p.vx += nx * 2.4 + (ball.vx || 0) * 0.25;
              p.vy += ny * 2.0 - 0.9;
              p.rotSpd = (Math.random() - 0.5) * 0.32;
              Particles.add(state, p.x, p.y, "#ffb7dd", 3, 2.0);
            } else if (d < 36 && d > 0.1) {
              const push = (1 - d / 36) * 0.35;
              p.vx += (dx / d) * push;
              p.vy += (dy / d) * push - 0.12;
            }
          }
        }
        p.vx = p.vx * 0.96 + 0.012;
        p.vy = Math.max(-1.8, Math.min(2.7, p.vy * 0.98 + 0.022));

        if (p.y > 658 || p.x < 12 || p.x > 382) {
          p.x = 24 + Math.random() * 345;
          p.y = 18 + Math.random() * 24;
          p.vx = -0.25 + Math.random() * 0.7;
          p.vy = (isFront ? 0.9 : 0.56) + Math.random() * 0.55;
        }
      });
    };
    stepPetals(b.backPetals, false);
    stepPetals(b.frontPetals, true);

    // 3. 提灯の振り子物理
    if (b.lanternCelebrationTimer > 0) {
      b.lanternCelebrationTimer--;
      if (b.lanternCelebrationTimer === 0) {
        b.lanterns.forEach(l => { l.lit = false; });
      }
    }
    b.lanterns.forEach((lt, idx) => {
      if (lt.flash > 0) lt.flash--;
      const windPush = Math.sin(b.animTick * 0.035 + idx * 1.3) * 0.0012;
      lt.angleVel += -lt.angle * 0.062 + windPush;
      lt.angleVel *= 0.94;
      lt.angle += lt.angleVel;
    });

    // 風魔手裏剣スラッシュ進行
    if (b.fumaSlash) {
      b.fumaSlash.progress += 0.055;
      b.fumaSlash.rot += 0.45;
      if (b.fumaSlash.progress >= 0.55 && !b.fumaSlash.applied) {
        b.fumaSlash.applied = true;
        this.damageActiveArmor(state, 3, b.fumaSlash.tx, b.fumaSlash.ty, "🌸FUMA SLASH -3HP!!");
      }
      if (b.fumaSlash.progress >= 1.15) {
        b.fumaSlash = null;
      }
    }

    // 4. 回転手裏剣スピナー回転＆連続スコア判定
    b.spinners.forEach(sp => {
      if (sp.flash > 0) sp.flash--;
      sp.angle += sp.omega;
      const absW = Math.abs(sp.omega);
      if (absW > 0.09) {
        sp.omega *= 0.983;
        sp.spinTicks++;
        if (sp.spinTicks % 6 === 0) {
          if (window.sfx && window.sfx.spinnerTick) window.sfx.spinnerTick(absW * 2.2);
          Systems.addScore(state, 450, sp.x, sp.y - 12, null);
          Systems.addFever(state, 0.5);
          Particles.add(state, sp.x + (Math.random() - 0.5) * 18, sp.y + (Math.random() - 0.5) * 18, "#00f5d4", 3, 2.4);
        }
      } else {
        const dir = sp.id === "spinL" ? 1 : -1;
        sp.omega = dir * 0.06;
      }
    });

    // 5. Phase 2〜3 秘奥義・夜桜風魔大車輪（左右のSKYWAYランプ入口〜中央ライン y=386 を幅広く横断！）
    const gf = b.giantFuma;
    if (gf.active) {
      if (gf.flash > 0) gf.flash--;
      gf.rot += state.phase >= 3 ? 0.38 : 0.26;
      gf.x += gf.vx;
      if (gf.x > 334) { gf.x = 334; gf.vx = -Math.abs(gf.vx); }
      if (gf.x < 62)  { gf.x = 62;  gf.vx = Math.abs(gf.vx); }
      if (b.animTick % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        Particles.add(state, gf.x + Math.cos(a) * gf.r, gf.y + Math.sin(a) * gf.r, b.animTick % 8 === 0 ? "#ff2a9d" : "#00f5d4", 1, 1.8);
      }
    }

    // 6. 幻影分身の浮遊＆定期再召喚＋九字レーザー照準一斉手裏剣シーケンス！
    const nj = b.ninjutsu;

    nj.clones.forEach(cl => {
      if (cl.flash > 0) cl.flash--;
      cl.phase += 0.06;
    });
    if (state.phase >= 2 && activePlayBalls.length > 0 && nj.clones.every(c => !c.active)) {
      nj.cloneCooldown--;
      if (nj.cloneCooldown <= 0) {
        nj.cloneCooldown = state.phase === 3 ? 480 : 320;
        this.summonBunshinClones(state);
      }
    }

    if (nj.mode === "idle") {
      nj.timer--;
      if (nj.timer <= 0 && activePlayBalls.length > 0) {
        nj.mode = "seal_charge";
        nj.timer = 46;
        nj.sealKanjiIdx = (nj.sealKanjiIdx + 1) % 6;
        b.stoleWind = Math.max(b.stoleWind, 1.1);

        nj.aimTargets = [];
        const mainAimX = 142 + Math.random() * 112;
        nj.aimTargets.push({ sx: 198, sy: 258, ax: mainAimX, ay: 602, color: "#ff2a9d" });
        nj.clones.forEach((cl, idx) => {
          if (cl.active) {
            nj.aimTargets.push({
              sx: cl.x,
              sy: cl.y + Math.sin(cl.phase) * 7,
              ax: idx === 0 ? 136 : 260,
              ay: 602,
              color: cl.color
            });
          }
        });

        if (!b.faceAnim.sequence) {
          b.expression = "shout";
          b.expressionTimer = 46;
        }
      }
    } else if (nj.mode === "seal_charge") {
      nj.timer--;
      if (nj.timer <= 0) {
        nj.mode = "idle";
        nj.timer = state.phase === 1 ? 175 : (state.phase === 2 ? 145 : 125);
        nj.aimTargets.forEach(aim => {
          const ang = Math.atan2(aim.ay - aim.sy, aim.ax - aim.sx);
          const spd = 4.9 + state.phase * 0.42;
          nj.thrownShurikens.push({
            x: aim.sx,
            y: aim.sy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 13,
            rot: 0,
            parried: false,
            color: aim.color,
            trail: []
          });
        });
        nj.aimTargets = [];
        if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
      }
    }

    // 投擲手裏剣の移動・パドルパリィ判定
    const flippers = Physics.getFlippers(state);
    for (let i = nj.thrownShurikens.length - 1; i >= 0; i--) {
      const sh = nj.thrownShurikens[i];
      sh.trail.push({ x: sh.x, y: sh.y });
      if (sh.trail.length > 9) sh.trail.shift();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.rot += sh.parried ? 0.62 : 0.38;

      if (sh.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - sh.x;
        const dy = tgt.y - sh.y;
        const dist = Math.hypot(dx, dy) || 1;
        sh.vx = (dx / dist) * 12.2;
        sh.vy = (dy / dist) * 12.2;
        if (dist < 22) {
          this.damageActiveArmor(state, sh.dmg || 2, tgt.x, tgt.y, sh.dmg === 1 ? "⚡BUNSHIN COUNTER -1HP!" : "⚡PARRY COUNTER -2HP!!");
          nj.thrownShurikens.splice(i, 1);
          continue;
        }
      } else {
        let clashedBall = false;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - sh.x, ball.y - sh.y);
          if (d < ball.r + sh.r + 3) {
            clashedBall = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, sh.x, sh.y, "#00f5d4", 12, 4.0);
            Systems.addScore(state, 3500, sh.x, sh.y, "⚔️CLASH!");
            nj.thrownShurikens.splice(i, 1);
            break;
          }
        }
        if (clashedBall) continue;

        let parriedNow = false;
        for (let fi = 0; fi < flippers.length; fi++) {
          const f = flippers[fi];
          const fst = Physics.flipperState[fi];
          const tipX = f.px + Math.cos(fst.angle) * f.len;
          const tipY = f.py + Math.sin(fst.angle) * f.len;
          const cp = Physics.closestPointOnSeg(sh.x, sh.y, f.px, f.py, tipX, tipY);
          const dist = Math.hypot(sh.x - cp.x, sh.y - cp.y);
          if (dist < sh.r + 7.0) {
            const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
            const pinKey = f.isLeft ? "flipperPinL" : "flipperPinR";
            const alreadyPinned = (state[pinKey] || 0) > 0;
            // ジャストスイング中（かつ未拘束）のみPARRY成立！ 上げっぱなしや静止パドルには手裏剣が突き刺さって振り幅1/3拘束！
            if (!alreadyPinned && (omega > 0.12 || (fst.justPressedTimer || 0) > 0)) {
              parriedNow = true;
            } else {
              state[pinKey] = 5;
              fst.pinShake = 10;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, cp.x, cp.y, "#b84dff", 14, 3.8);
              Particles.addPopup(state, cp.x, cp.y - 16, "📌拘束! 5回ガチャで解除!", "#ff2a9d", 0.96);
              nj.thrownShurikens.splice(i, 1);
            }
            break;
          }
        }

        if (parriedNow) {
          sh.parried = true;
          sh.dmg = state.phase === 3 ? 1 : 2;
          b.expression = "shock";
          b.expressionTimer = 30;
          if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
          state.shockwaves.push({ x: sh.x, y: sh.y, r: 5, maxR: 42, speed: 4.0, color: "#e6ff00", lineWidth: 2.8, alpha: 1.0 });
          Particles.add(state, sh.x, sh.y, "#e6ff00", 18, 5.2);
          Particles.addPopup(state, sh.x, sh.y - 14, "⚔️PARRY!!", "#e6ff00", 1.2);
          Systems.addScore(state, 9000, sh.x, sh.y, "⚔️PARRY!");
          Systems.addFever(state, 7);
          continue;
        }
      }

      if (sh.y > 655 || sh.y < 10 || sh.x < 10 || sh.x > 385) {
        nj.thrownShurikens.splice(i, 1);
      }
    }

    // 7. 胸・腰〜太ももの2段階ゴム膜スプリング更新
    if (b.chestArmorBroken) {
      StageCommon.stepSoftSpring(b.bustL, 0.15, 0.90, 9.2);
      StageCommon.stepSoftSpring(b.bustR, 0.15, 0.90, 9.2);
    } else {
      StageCommon.stepSoftSpring(b.bustL, 0.18, 0.89, 6.4);
      StageCommon.stepSoftSpring(b.bustR, 0.18, 0.89, 6.4);
    }
    StageCommon.stepSoftSpring(b.hipL, 0.17, 0.89, 7.0);
    StageCommon.stepSoftSpring(b.hipR, 0.17, 0.89, 7.0);

    [b.tekkoL, b.tekkoR, b.kneeL, b.kneeR, b.core, b.hairpinCore, ...b.waistSensors].forEach(t => {
      if (t.flash > 0) t.flash--;
    });
    if (b.subLogFlash > 0) b.subLogFlash--;

    if (b.animTick % 4 === 0) {
      this.updateStatusMonitor(state);
    }
  },

  checkCollisions(ball, state, engine, substep = 0) {
    const b = state.boss;
    if (!b || ball.inShooterLane) return;

    const SUBSTEPS = 6;

    // -----------------------------------------------------------------
    // A & B. 空中立体ワイヤーランプ滑走 ＆ 入口ゲート突入判定
    // -----------------------------------------------------------------
    if (StageCommon.stepWireRampBall(ball, state, this, substep, SUBSTEPS, {
      minVy: -2.5,
      minSpeed: 9.2,
      maxSpeed: 14.5,
      entryScore: 5500,
      onRide: (rideBall, rs, st, ss) => {
        b.stoleWind = Math.max(b.stoleWind, 0.55);
        if (ss === 0) {
          b.lanterns.forEach(lt => {
            if (!rs.visitedLanterns[lt.id] && Math.hypot(rideBall.x - lt.x, rideBall.y - lt.y) < lt.r + 18) {
              rs.visitedLanterns[lt.id] = true;
              this.lightLantern(st, lt, rs.rampId === "left" ? 1 : -1);
            }
          });
        }
      }
    })) {
      return;
    }

    if (substep !== 0) return;

    if (ball.y > 170 && ball.y < 460 && (ball.x < 145 || ball.x > 255)) {
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd > 4.5) b.stoleWind = Math.min(1.6, b.stoleWind + spd * 0.04);
    }

    if (!ball.hitCooldowns) ball.hitCooldowns = {};
    if (substep === 0) {
      for (const k in ball.hitCooldowns) {
        if (ball.hitCooldowns[k] > 0) ball.hitCooldowns[k]--;
      }
    }

    const hitCircle = (key, target, bounceSpd, cooldown, onHit) => {
      return this._hitCircle(ball, key, target, bounceSpd, cooldown, onHit);
    };

    // 1. 幻影分身ホログラム撃破判定
    b.ninjutsu.clones.forEach(cl => {
      if (!cl.active) return;
      const cy = cl.y + Math.sin(cl.phase) * 7;
      const proxy = { x: cl.x, y: cy, r: cl.r, flash: cl.flash };
      hitCircle("cl_" + cl.id, proxy, 8.8, 14, () => {
        cl.hp--;
        cl.flash = 18;
        Particles.add(state, cl.x, cy, cl.color, 16, 4.8);
        if (cl.hp <= 0) {
          cl.active = false;
          if (window.sfx) window.sfx.armorBreak();
          state.shockwaves.push({ x: cl.x, y: cy, r: 8, maxR: 62, speed: 4.5, color: cl.color, lineWidth: 3.2, alpha: 1.0 });
          Particles.add(state, cl.x, cy, "#e6ff00", 22, 5.8);
          Systems.addScore(state, 20000, cl.x, cy - 10, "💥BUNSHIN SHATTER!!");
          Systems.addFever(state, 10);
          if (state.phase === 3 && b.ninjutsu.clones.every(c => !c.active)) {
            b.ninjutsu.cloneCooldown = 480;
            Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
          }
          if (b.lastFlipActiveTimer > 0) {
            b.ninjutsu.thrownShurikens.push({
              x: cl.x, y: cy, vx: 0, vy: -6, r: 13, rot: 0, parried: true, dmg: 1, color: "#e6ff00", trail: []
            });
          }
        } else {
          if (window.sfx) window.sfx.metalBumper();
          Systems.addScore(state, 4500, cl.x, cy - 10, `👥BUNSHIN HP:${cl.hp}`);
        }
      });
    });

    // 2. Phase 2〜3 秘奥義・夜桜風魔大車輪（ランプ入口高度を左右パトロールし、下からの打ち上げショットを叩き落とす＆落下球に横回転をかける！）
    if (b.giantFuma.active && (ball.hitCooldowns["giant_fuma"] || 0) === 0) {
      const gf = b.giantFuma;
      const dFuma = Math.hypot(ball.x - gf.x, ball.y - gf.y);
      if (dFuma < ball.r + gf.r) {
        ball.hitCooldowns["giant_fuma"] = 14;
        gf.flash = 16;
        const spinKick = (gf.vx >= 0 ? 1 : -1) * 2.6;
        if (ball.vy < 0) {
          // 下からの打ち上げショット：回転刃で弾き落としてブロック！
          ball.y = gf.y + gf.r + ball.r + 1.5;
          ball.vy = Math.max(5.4, Math.abs(ball.vy) * 0.88);
          ball.vx = Math.max(-9.5, Math.min(9.5, ball.vx * 0.75 + spinKick));
          Systems.addScore(state, 3500, gf.x, gf.y - 16, "🌀FUMA BLOCK!");
        } else {
          // 上からの落下球：止めずに横スピンを加えて軌道を見切りにくくする！
          ball.vx = Math.max(-9.5, Math.min(9.5, ball.vx + spinKick));
          ball.vy = Math.max(4.5, ball.vy * 1.05);
        }
        if (window.sfx && window.sfx.fumaClash) window.sfx.fumaClash();
        state.shockwaves.push({ x: gf.x, y: gf.y, r: 10, maxR: 44, speed: 4.2, color: "#e6ff00", lineWidth: 2.4, alpha: 0.9 });
        Particles.add(state, ball.x, ball.y, "#e6ff00", 14, 4.8);
      }
    }

    // 3. 上段ワイヤー提灯バンパー 5基
    b.lanterns.forEach(lt => {
      const swingX = lt.x + Math.sin(lt.angle) * (lt.y - lt.cordY);
      const swingY = lt.cordY + Math.cos(lt.angle) * (lt.y - lt.cordY);
      const proxy = { x: swingX, y: swingY, r: lt.r, flash: lt.flash };
      if (hitCircle("lt_" + lt.id, proxy, 8.2, 14, () => {
        const impDir = ball.vx >= 0 ? 1 : -1;
        this.lightLantern(state, lt, impDir);
      })) {
        lt.flash = 20;
      }
    });

    // 4. 貫通型回転手裏剣スピナー（跳ね返りで難易度を下げない純粋スピナー！）
    b.spinners.forEach(sp => {
      const key = "sp_" + sp.id;
      if ((ball.hitCooldowns[key] || 0) > 0) return;
      const dx = ball.x - sp.x;
      const dy = ball.y - sp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < ball.r + sp.r) {
        ball.hitCooldowns[key] = 14;
        const spinDir = sp.id === "spinL" ? 1 : -1;
        sp.omega = spinDir * Math.min(0.78, Math.abs(sp.omega) + 0.44);
        sp.flash = 18;
        if (window.sfx && window.sfx.spinnerTick) window.sfx.spinnerTick(2.2);
        Particles.add(state, sp.x, sp.y, "#00f5d4", 8, 3.4);
        Systems.addScore(state, 2500, sp.x, sp.y - 12, "🌀SPIN!");
      }
    });

    // 5. Phase 1 外装：左右のコテ角プレート ＆ 左右独立の膝当てアーマー
    [
      { key: "tekkoL", obj: b.tekkoL, title: "L-KOTE" },
      { key: "tekkoR", obj: b.tekkoR, title: "R-KOTE" },
      { key: "kneeL",  obj: b.kneeL,  title: "L-KNEE" },
      { key: "kneeR",  obj: b.kneeR,  title: "R-KNEE" }
    ].forEach(({ key, obj, title }) => {
      if (obj.broken) return;
      hitCircle(key, obj, 9.0, 16, () => {
        obj.hp = Math.max(0, obj.hp - 1);
        obj.flash = 18;
        if (!b.faceAnim.sequence) {
          b.expression = "wince";
          b.expressionTimer = 18;
        }
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, obj.x, obj.y, "#e6ff00", 14, 4.4);
        Systems.addScore(state, 3500, obj.x, obj.y - 10, `${title} HP:${obj.hp}`);
        Systems.addFever(state, 4);
        if (obj.hp === 0) {
          obj.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", obj.x, obj.y);
          Systems.addScore(state, 22000, obj.x, obj.y, `★${title} BROKEN!★`);
          Systems.dropReward(state, "minor", { x: obj.x, y: obj.y });
          StageCommon.setExpressionSequence(state, [
            { expr: "shock", frames: 22 },
            { expr: "wince", frames: 26 }
          ]);
          this.checkPhase1Clear(state);
        }
        UI.updateHUD(state);
      });
    });

    // 6. 胸部・忍装束スーツ（装着中も弾む揺れ -> 破壊後は晒し姿で大揺れ＋ハート！）
    [
      { key: "bustL", cup: b.bustL, other: b.bustR, side: "L" },
      { key: "bustR", cup: b.bustR, other: b.bustL, side: "R" }
    ].forEach(({ key, cup, other }) => {
      const bounce = b.chestArmorBroken ? 8.0 : 9.4;
      hitCircle(key, cup, bounce, 15, () => {
        const dxH = ball.x - cup.x;
        const dyH = ball.y - cup.y;
        const dL = Math.hypot(dxH, dyH) || 1;
        const impScale = b.chestArmorBroken ? 7.5 : 5.4;
        cup.vx += -(dxH / dL) * impScale;
        cup.vy += -(dyH / dL) * impScale - 1.2;
        other.vx += (dxH / dL) * (impScale * 0.48);
        other.vy += -(dyH / dL) * (impScale * 0.45);
        cup.flash = 18;

        if (!b.chestArmorBroken) {
          if (window.sfx) window.sfx.softPuru();
          if (state.phase >= 2) {
            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
            if (!b.faceAnim.sequence) {
              b.expression = b.chestArmorHP <= 4 ? "open_blush" : "wince";
              b.expressionTimer = 24;
            }
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#ff2a9d", 15, 4.6);
            Systems.addScore(state, 5000, cup.x, cup.y - 12, `SUIT HP:${b.chestArmorHP}`);
            Systems.addFever(state, 6);
            if (b.chestArmorHP <= 0) {
              this.breakChestSuit(state);
            }
          } else {
            Particles.add(state, cup.x, cup.y, "#00f5d4", 9, 3.4);
            Systems.addScore(state, 2000, cup.x, cup.y - 12, "🛡️SEAL GUARD");
          }
        } else {
          if (window.sfx) window.sfx.softPuru();
          b.bustExcitement = Math.min(100, (b.bustExcitement || 0) + 16);
          b.blushGauge = Math.min(100, (b.blushGauge || 0) + 12);
          if (!b.faceAnim.sequence) {
            b.expression = "open_blush";
            b.expressionTimer = 34;
          }
          Particles.spawnHeart(state, cup.x, cup.y - 8, false);
          Particles.add(state, cup.x, cup.y, "#ff66cc", 14, 4.0);
          Systems.addScore(state, 6500, cup.x, cup.y - 12, "♥SOFT BOUNCE!!");
          Systems.addFever(state, 5.5);
        }
        UI.updateHUD(state);
      });
    });

    // 7. 腰の四角いシアン回路センサー（ヒットでお尻〜太ももが連動して大きくぷるぷる！）
    b.waistSensors.forEach(sens => {
      const key = "sens_" + sens.id;
      if ((ball.hitCooldowns[key] || 0) > 0) return;
      if (Math.hypot(ball.x - sens.x, ball.y - sens.y) < ball.r + sens.r) {
        ball.hitCooldowns[key] = 22;
        sens.flash = 18;
        const mainHip = sens.side === "L" ? b.hipL : b.hipR;
        const subHip = sens.side === "L" ? b.hipR : b.hipL;
        const dir = sens.side === "L" ? -1 : 1;
        mainHip.vx += dir * 6.8;
        mainHip.vy -= 6.2;
        subHip.vx -= dir * 3.8;
        subHip.vy -= 3.4;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);
        if (!b.faceAnim.sequence && b.expression === "normal") {
          b.expression = "open_blush";
          b.expressionTimer = 24;
        }
        Particles.spawnHeart(state, sens.x, sens.y - 6, true);
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, sens.x, sens.y, "#00f5d4", 10, 3.4);
        Systems.addScore(state, 3500, sens.x, sens.y - 10, `⚡${sens.label}`);
        Systems.addFever(state, 3.5);
      }
    });

    // 8. Phase 3 最終コア：首元の羽衣チャクラ核 ＆ 頭頂の電脳水引（分身生存中は変わり身結界で保護！）
    hitCircle("chakra_core", b.core, 9.8, 16, () => {
      b.core.flash = 22;
      b.stoleWind = Math.max(b.stoleWind, 1.3);
      if (state.phase >= 3 && b.core.unlocked && !this.isCoreShieldedByBunshin(state)) {
        b.core.hp = Math.max(0, b.core.hp - 1);
        b.expression = "wince";
        b.expressionTimer = 28;
        if (window.sfx) window.sfx.exSpark();
        state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 6, maxR: 50, speed: 4.2, color: "#00f5d4", lineWidth: 2.8, alpha: 1.0 });
        Particles.add(state, b.core.x, b.core.y, "#00f5d4", 20, 5.4);
        Systems.addScore(state, 9000, b.core.x, b.core.y - 14, `💎CORE HP:${b.core.hp}`);
        Systems.addFever(state, 8);
        if (b.core.hp <= 0) {
          this.triggerStageClear(state);
        }
      } else {
        if (window.sfx) window.sfx.slingshot();
        const msg = state.phase >= 3 ? "🛡️分身結界！分身を倒せ！" : "🔒CHAKRA BARRIER";
        Systems.addScore(state, 2200, b.core.x, b.core.y - 12, msg);
      }
      UI.updateHUD(state);
    });

    hitCircle("hairpin_core", b.hairpinCore, 9.6, 18, () => {
      b.hairpinCore.flash = 22;
      if (state.phase >= 3 && b.core.unlocked && !this.isCoreShieldedByBunshin(state)) {
        b.core.hp = Math.max(0, b.core.hp - 2);
        b.core.flash = 22;
        StageCommon.setExpressionSequence(state, [
          { expr: "shock", frames: 20 },
          { expr: "wince", frames: 26 }
        ]);
        if (window.sfx) window.sfx.exSpark();
        state.shockwaves.push({ x: b.hairpinCore.x, y: b.hairpinCore.y, r: 8, maxR: 60, speed: 4.5, color: "#e6ff00", lineWidth: 3.2, alpha: 1.0 });
        Particles.add(state, b.hairpinCore.x, b.hairpinCore.y, "#e6ff00", 22, 5.8);
        Systems.addScore(state, 18000, b.hairpinCore.x, b.hairpinCore.y - 12, `⚡CRITICAL -2HP! (残${b.core.hp})`);
        Systems.addFever(state, 10);
        if (b.core.hp <= 0) {
          this.triggerStageClear(state);
        }
      } else {
        if (window.sfx) window.sfx.metalBumper();
        const msg = state.phase >= 3 ? "🛡️分身結界中！" : "✨KAMI-KAZARI BONUS!";
        Systems.addScore(state, 4200, b.hairpinCore.x, b.hairpinCore.y - 10, msg);
        Systems.addFever(state, 4);
      }
      UI.updateHUD(state);
    });

    // 9. 提灯コンボ報酬：センタードレイン上の「変わり身の丸太」一時セーブポスト
    if (b.subLogHP > 0) {
      const logTarget = { x: 198, y: 612, r: 13 };
      hitCircle("sub_log", logTarget, 9.5, 16, () => {
        ball.vy = -Math.abs(ball.vy) - 4.4;
        b.subLogHP--;
        b.subLogFlash = 22;
        b.sakuraStormTimer = Math.max(b.sakuraStormTimer, 90);
        if (window.sfx) window.sfx.armorBreak();
        Particles.add(state, 198, 612, "#ffb7dd", 18, 4.8);
        Particles.addPopup(state, 198, 592, b.subLogHP > 0 ? `🪵KAWARIMI SAVE! (残${b.subLogHP})` : "🪵KAWARIMI VANISHED!", "#e6ff00", 1.05);
      });
    }
  }
});

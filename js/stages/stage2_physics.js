// =========================================================================
// STAGE 2: PHYSICS & COLLISIONS
// =========================================================================

Object.assign(window.Stage2, {
  update(state, engine) {
    if (!state.boss) return;

    // クリア演出進行
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: t("stage2.bossName"),
        defeatQuoteHtml: t("stage2.defeatQuote"),
        explosionOrigin: { x: state.boss.core ? state.boss.core.x : 198, y: state.boss.core ? state.boss.core.y : 320 },
        smokeColors: ["#00f5d4", "#ff007f", "#ffffff", "#e0ffff"]
      });
      return;
    }

    state.boss.animTick = (state.boss.animTick || 0) + 1;

    // 1. 生き生きとした表情アニメーション・リップシンク制御
    StageCommon.updateFaceAnim(state.boss, "normal", {
      idleRandom: true,
      blinkProb: 0.55,
      blinkFrames: 16,
      winkProb: 0.82,
      winkFrames: 45,
      talkFrames: 24
    });

    // 2. 胸のバネ物理（ぷるぷる振動）
    StageCommon.stepSoftSpring(state.boss.tipBust, 0.12, 0.88, 14);

    // 3. お尻のバネ物理（左右2つの円で自然に揺れる）
    StageCommon.stepSoftSpring(state.boss.buttL, 0.13, 0.86, 14);
    StageCommon.stepSoftSpring(state.boss.buttR, 0.13, 0.86, 14);

    // 3.5. 破損部位の火花・黒煙エフェクト（描画フェーズから物理フェーズへ分離）
    const b = state.boss;
    if (b.hologram && b.hologram.broken) {
      if (Math.random() < 0.20) {
        Particles.add(state, b.hologram.x + (Math.random() - 0.5) * 16, b.hologram.y + (Math.random() - 0.5) * 16, "#00f5d4", 2, 2.5);
      }
      if (Math.random() < 0.15 && state.particles.length < Particles.MAX_PARTICLES) {
        state.particles.push({
          x: b.hologram.x + (Math.random() - 0.5) * 10,
          y: b.hologram.y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -1.2 - Math.random() * 1.5,
          color: "#333333",
          life: 20,
          scale: 1.5
        });
      }
    }
    if (b.antenna && b.antenna.broken && Math.random() < 0.25) {
      Particles.add(state, b.antenna.x + (Math.random() - 0.5) * 12, b.antenna.y + (Math.random() - 0.5) * 12, "#e6ff00", 2, 2.5);
    }
    if (b.shoulderL && b.shoulderL.broken && Math.random() < 0.15) {
      Particles.add(state, b.shoulderL.x + (Math.random() - 0.5) * 16, b.shoulderL.y + (Math.random() - 0.5) * 16, "#ff1493", 2, 2.0);
    }
    if (b.elbowL && b.elbowL.broken && Math.random() < 0.15) {
      Particles.add(state, b.elbowL.x + (Math.random() - 0.5) * 16, b.elbowL.y + (Math.random() - 0.5) * 16, "#e6ff00", 2, 2.0);
    }
    if (b.elbowR && b.elbowR.broken && Math.random() < 0.15) {
      Particles.add(state, b.elbowR.x + (Math.random() - 0.5) * 18, b.elbowR.y + (Math.random() - 0.5) * 18, "#e6ff00", 2, 2.0);
    }
    if (b.tipBust && b.tipBust.broken && Math.random() < 0.15) {
      Particles.add(state, b.tipBust.x + (Math.random() - 0.5) * 10, b.tipBust.y + (Math.random() - 0.5) * 10, "#e6ff00", 2, 2.0);
    }
    if (((b.nozzleL && b.nozzleL.broken) || (b.nozzleR && b.nozzleR.broken)) && Math.random() < 0.25 && state.particles.length < Particles.MAX_PARTICLES) {
      const nozPos = (b.nozzleL && b.nozzleL.broken) ? b.nozzleL : b.nozzleR;
      state.particles.push({
        x: nozPos.x + (Math.random() - 0.5) * 14,
        y: nozPos.y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.5 - Math.random() * 2.0,
        color: Math.random() < 0.5 ? "#333333" : "#552244",
        life: 20,
        scale: 1.8
      });
    }
    if ((state.phase >= 3 || b.allArmorsPurged) && b.core && Math.random() < 0.25) {
      Particles.add(state, b.core.x + (Math.random() - 0.5) * 20, b.core.y + (Math.random() - 0.5) * 20, "#00f5d4", 2, 2.5);
    }

    // 4. カチューシャのアンテナ先端の周期放電サイクル
    const ant = state.boss.antenna;
    if (ant) {
      if (ant.broken) {
        // 放電機構ショート大破：放電停止、時折小火花がパチパチ散る
        ant.isActive = false;
        ant.isWarning = false;
        if (Math.random() < 0.12) {
          Particles.add(state, ant.x + (Math.random() - 0.5) * 6, ant.y + (Math.random() - 0.5) * 6, "#e6ff00", 2, 2.0);
        }
      } else {
        ant.timer = (ant.timer + 1) % ant.cycle;
        if (ant.flash > 0) ant.flash--;

        const isWarning = ant.timer >= (ant.cycle - ant.activeDuration - ant.warningDuration) &&
                          ant.timer < (ant.cycle - ant.activeDuration);
        const isActive = ant.timer >= (ant.cycle - ant.activeDuration);

        ant.isWarning = isWarning;
        ant.isActive = isActive;

        if (isActive) {
          // 放電中：激しい電撃火花
          if (Math.random() < 0.65) {
            const arcAngle = Math.random() * Math.PI * 2;
            const arcR = ant.r * (0.8 + Math.random() * 0.7);
            state.particles.push({
              x: ant.x + Math.cos(arcAngle) * arcR,
              y: ant.y + Math.sin(arcAngle) * arcR,
              vx: (Math.random() - 0.5) * 3.5,
              vy: (Math.random() - 0.5) * 3.5,
              color: Math.random() < 0.5 ? "#00f5d4" : "#e6ff00",
              life: 10,
              scale: 1.2
            });
          }
        }
      }
    }

    // 5. 左手奥ホログラムのラスターグリッジ ＆ レーザー発射
    const holo = state.boss.hologram;
    if (holo) {
      if (holo.broken) {
        // ホログラム砲台大破：レーザー完全停止、グリッチ微小ノイズのみ
        holo.laserState = "idle";
        holo.flash = 0;
        holo.glitchShift = (Math.random() < 0.15) ? (Math.random() - 0.5) * 6 : 0;
      } else {
        if (holo.flash > 0) holo.flash--;
        holo.glitchShift = (Math.random() < 0.3) ? (Math.random() - 0.5) * 10 : 0;

        if (holo.laserState === "idle") {
          if (holo.cooldown > 0) {
            holo.cooldown--;
          } else {
            holo.laserState = "charge";
            holo.laserTimer = 55; // チャージ＆エイム時間
            holo.isLocked = false;
            if (window.sfx && window.sfx.capsuleCatch) {
              window.sfx.capsuleCatch();
            }
          }
        } else if (holo.laserState === "charge") {
        holo.laserTimer--;

        // 1. 発射16フレーム前まではメインボールを追尾エイム！
        if (holo.laserTimer > 16) {
          holo.isLocked = false;
          if (state.balls.length > 0) {
            const targetBall = state.balls[0];
            const aimAngle = Math.atan2(targetBall.y - holo.y, targetBall.x - holo.x);
            // プレイフィールド全域（右上〜右下）をカバーする角度制限
            const clamped = Math.max(-Math.PI * 0.28, Math.min(Math.PI * 0.52, aimAngle));
            holo.beamAngle = holo.beamAngle * 0.82 + clamped * 0.18;
          }
        } else {
          // 2. 発射直前（残り16フレーム）：照準をロックオン固定！
          // 高速ボールなら回避でき、低速ボールは直撃して吹き飛ばされる！
          if (!holo.isLocked) {
            holo.isLocked = true;
            if (window.sfx && window.sfx.metalBumper) {
              window.sfx.metalBumper();
            }
          }
        }

        const endPt = this.getLaserEndPoint(holo, (engine && engine.W) || 420, (engine && engine.H) || 660);
        holo.beamEndX = endPt.x;
        holo.beamEndY = endPt.y;

        // チャージスパーク・エネルギー収束粒子
        const pCount = holo.isLocked ? 3 : 2;
        state.boss.expression = "shout";
        state.boss.expressionTimer = 8;
        for (let i = 0; i < pCount; i++) {
          const ca = Math.random() * Math.PI * 2;
          const cr = 18 + Math.random() * 26;
          const speed = holo.isLocked ? 4.5 : 3.0;
          state.particles.push({
            x: holo.x + Math.cos(ca) * cr,
            y: holo.y + Math.sin(ca) * cr,
            vx: -Math.cos(ca) * speed,
            vy: -Math.sin(ca) * speed,
            color: holo.isLocked ? (Math.random() < 0.5 ? "#ffffff" : "#ff0055") : (Math.random() < 0.5 ? "#00f5d4" : "#ff007f"),
            life: 10,
            scale: holo.isLocked ? 1.5 : 1.1
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "fire";
          holo.laserTimer = 36; // 36フレーム照射
          holo.flash = 35;
          state.boss.expression = "wink";
          state.boss.expressionTimer = 36;
          if (window.sfx && window.sfx.metalBumper) {
            window.sfx.metalBumper();
          }
          UI.showCutin(t("stage2.cutin.holoLaser"), 140);
        }
      } else if (holo.laserState === "fire") {
        holo.laserTimer--;

        const endPt = this.getLaserEndPoint(holo, (engine && engine.W) || 420, (engine && engine.H) || 660);
        holo.beamEndX = endPt.x;
        holo.beamEndY = endPt.y;

        // レーザービーム線分衝突判定（テーブルの壁セグメントで遮断された範囲で判定）
        const beamStartX = holo.x;
        const beamStartY = holo.y;
        const beamEndX = holo.beamEndX;
        const beamEndY = holo.beamEndY;

        const newSplitBalls = [];
        state.balls.forEach(ball => {
          // 発射待ち（シューターレーン内）のボールは壁で遮られるため絶対に被弾させない安全保護
          if (ball.inShooterLane || (state.plunger && state.plunger.waitingForLaunch)) return;

          const hit = Physics.checkCapsuleHit(ball, beamStartX, beamStartY, beamEndX, beamEndY, 9.5);
          if (hit) {
            // 直撃判定：レーザービームの芯線に直撃（中心線からの距離 dist <= 9.0）かつ通常サイズ（r >= 7.0）のボールの場合、2つのミニボールに核分裂！
            const centerDist = (hit.dist !== undefined) ? hit.dist : Math.hypot(ball.x - hit.qx, ball.y - hit.qy);
            const isDirectHit = centerDist <= 9.0;
            const canSplit = (ball.r >= 7.0) && (state.balls.length + newSplitBalls.length < 12);

            if (isDirectHit && canSplit && !ball._hasSplitThisBeam) {
              ball._hasSplitThisBeam = true;

              // 元のボールを小型化（ミニボールA）
              ball.r = 6.0;
              ball.x = hit.qx + hit.nx * 9.0;
              ball.y = hit.qy + hit.ny * 9.0;
              ball.vx = (hit.nx * 15.0) + (Math.random() - 0.5) * 4.0;
              ball.vy = (hit.ny * 15.0) - 4.0;

              // 新しいミニボールBの生成
              const newBall = {
                x: hit.qx - hit.nx * 9.0,
                y: hit.qy - hit.ny * 9.0,
                vx: (-hit.nx * 15.0) + (Math.random() - 0.5) * 4.0,
                vy: (-hit.ny * 15.0) - 4.0,
                r: 6.0,
                trail: [],
                inShooterLane: false,
                _hasSplitThisBeam: true
              };
              newSplitBalls.push(newBall);

              if (window.sfx) {
                if (window.sfx.metalBumper) window.sfx.metalBumper();
                if (window.sfx.capsuleCatch) window.sfx.capsuleCatch();
              }
              Particles.add(state, hit.qx, hit.qy, "#00f5d4", 26, 7.0);
              Particles.add(state, hit.qx, hit.qy, "#ffffff", 20, 6.0);
              Particles.add(state, hit.qx, hit.qy, "#ff007f", 16, 5.0);
              Particles.addPopup(state, hit.qx, hit.qy - 14, "⚡LASER FISSION!! MINI-BALLS SPLIT!⚡", "#00f5d4", 1.4);
              Systems.addScore(state, ScoreTable.stage2.LASER_FISSION, hit.qx, hit.qy, "★FISSION MULTI-BALL!★");
              UI.showCutin(t("stage2.cutin.laserSplit"), 160);
            } else {
              // かすり当たり、または既に分裂済みのミニボール：強烈にノックバック＆吹き飛ばし！
              ball.x = hit.qx + hit.nx * (hit.minDist + 2.0);
              ball.y = hit.qy + hit.ny * (hit.minDist + 2.0);
              ball.vx = hit.nx * 16.5;
              ball.vy = hit.ny * 16.5;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, ball.x, ball.y, "#00f5d4", 18, 5.5);
              Particles.add(state, ball.x, ball.y, "#ffffff", 12, 4.5);
              Systems.addScore(state, ScoreTable.stage2.LASER_HIT, ball.x, ball.y, "⚡LASER HIT!⚡");
            }
          } else if (holo.laserTimer === 30) {
            // ニアミス回避ボーナス判定（発射直後、至近距離を高速で通り抜けて回避）
            const abx = beamEndX - beamStartX;
            const aby = beamEndY - beamStartY;
            const lenSq = abx * abx + aby * aby;
            let t = lenSq > 0 ? ((ball.x - beamStartX) * abx + (ball.y - beamStartY) * aby) / lenSq : 0;
            t = Math.max(0, Math.min(1, t));
            const qx = beamStartX + t * abx;
            const qy = beamStartY + t * aby;
            const dist = Math.hypot(ball.x - qx, ball.y - qy);
            const ballSpeed = Math.hypot(ball.vx, ball.vy);
            if (dist < 42 && ballSpeed > 6.5) {
              Systems.addScore(state, ScoreTable.stage2.LASER_DODGE, ball.x, ball.y, "✨DODGE BONUS!✨");
              Particles.add(state, ball.x, ball.y, "#e6ff00", 12, 3.5);
            }
          }
        });

        if (newSplitBalls.length > 0) {
          state.balls.push(...newSplitBalls);
        }

        // ビーム沿いに激しいレーザー粒子
        for (let i = 0; i < 3; i++) {
          const ratio = Math.random();
          const px = beamStartX + (beamEndX - beamStartX) * ratio;
          const py = beamStartY + (beamEndY - beamStartY) * ratio;
          state.particles.push({
            x: px + (Math.random() - 0.5) * 8,
            y: py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: Math.random() < 0.6 ? "#00f5d4" : "#ffffff",
            life: 8,
            scale: 1.2
          });
        }

        // 画面端着弾点での激しい激突スパーク噴出
        if (Math.random() < 0.8) {
          state.particles.push({
            x: beamEndX + (Math.random() - 0.5) * 6,
            y: beamEndY + (Math.random() - 0.5) * 6,
            vx: -Math.cos(holo.beamAngle) * (2.0 + Math.random() * 5.0) + (Math.random() - 0.5) * 4,
            vy: -Math.sin(holo.beamAngle) * (2.0 + Math.random() * 5.0) + (Math.random() - 0.5) * 4,
            color: Math.random() < 0.5 ? "#00f5d4" : "#ffffff",
            life: 14,
            scale: 1.5
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "idle";
          holo.isLocked = false;
          holo.cooldown = 220 + Math.floor(Math.random() * 80);
          state.balls.forEach(b => { b._hasSplitThisBeam = false; });
        }
      }
    }
  }

    // 6. 背中ジェット噴射機構（左右2基のノズル先端開口部から斜め下への指向性超音速噴流）
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

      const nozzles = jet.nozzles || [{ x: jet.x, y: jet.y, angle: jet.angle || (Math.PI * 0.46) }];
      nozzles.forEach(noz => {
        // ノズル軸方向（斜め下）への高速火炎プラズマ粒子噴射
        const jetAngle = noz.angle || (Math.PI * 0.46);
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * 0.35;
          const pAngle = jetAngle + spread;
          const speed = 7.0 + Math.random() * 8.5;
          state.particles.push({
            x: noz.x + (Math.random() - 0.5) * 6,
            y: noz.y + (Math.random() - 0.5) * 6,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed,
            color: Math.random() < 0.5 ? "#ffffff" : (Math.random() < 0.6 ? "#00f5d4" : "#e6ff00"),
            life: 14,
            scale: 1.5 + Math.random() * 0.8
          });
        }

        state.balls.forEach(ball => {
          const dx = ball.x - noz.x;
          const dy = ball.y - noz.y;
          const dist = Math.hypot(dx, dy);
          const blastRadius = 210;

          if (dist < blastRadius && dist > 1.0) {
            // ノズル噴射コーン（斜め下方向）への指向性風圧
            const ballAngle = Math.atan2(dy, dx);
            let angleDiff = Math.abs(ballAngle - jetAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            // 噴流の中心コーン（広がり角90度以内）ほど強力に吹き飛ばす
            const coneFactor = Math.max(0.2, Math.cos(Math.min(Math.PI / 2, angleDiff)));
            const force = 12.0 * Math.pow(1.0 - dist / blastRadius, 1.1) * coneFactor;

            // 噴射軸方向＋放射方向の合成ベクトルで吹き飛ばす
            ball.vx += (Math.cos(jetAngle) * 0.6 + (dx / dist) * 0.4) * force;
            ball.vy += (Math.sin(jetAngle) * 0.6 + (dy / dist) * 0.4) * force;

            const spd = Math.hypot(ball.vx, ball.vy);
            if (spd > 24.0) {
              ball.vx = (ball.vx / spd) * 24.0;
              ball.vy = (ball.vy / spd) * 24.0;
            }
          }
        });
      });
    } else if (jet) {
      jet.active = false;
    }

    // Flash decay
    [state.boss.shoulderL, state.boss.elbowL, state.boss.elbowR, state.boss.nozzleL, state.boss.nozzleR, state.boss.tipBust, state.boss.hipJointL, state.boss.catEarL, state.boss.catEarR].forEach(t => {
      if (t && t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;
    const graceFrames = (window.ScoreTable && ScoreTable.antiStall.BUMPER_GRACE_FRAMES) || 10;
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, () => {
      if (ball._bumperGrace > 0) return;
      ball._bumperGrace = graceFrames;
      if (cb) cb(bumper);
    });

    // 1. カチューシャのアンテナ先端（放電時は強烈に弾く、停止時は通過！ 接触でHP減少）
    const ant = state.boss.antenna;
    if (ant) {
      const dxA = ball.x - ant.x;
      const dyA = ball.y - ant.y;
      const distA = Math.hypot(dxA, dyA);

      if (distA < ball.r + ant.r) {
        if (!ant.broken) {
          if (ant.isActive) {
            // 放電中：激しい電撃で弾き返す！
            checkBumper(ant, 11.5, () => {
              ant.flash = 24;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, ant.x, ant.y, "#00f5d4", 18, 5.0);
              Particles.add(state, ant.x, ant.y, "#e6ff00", 12, 4.0);
              StageCommon.setExpressionSequence(state, [
                { expr: "shock", frames: 20 },
                { expr: "shout", frames: 24 },
                { expr: "wince", frames: 32 }
              ]);

              if (ant.hp > 0) {
                ant.hp--;
                Systems.addScore(state, ScoreTable.stage2.ANTENNA_REPEL, ant.x, ant.y, `⚡ELECTRIC REPEL! HP:${ant.hp}`);
                if (ant.hp === 0) {
                  ant.broken = true;
                  ant.isActive = false;
                  ant.isWarning = false;
                  Particles.triggerArmorBreakEffect(state, "antenna", ant.x, ant.y);
                  UI.showCutin(t("stage2.cutin.antennaBreak"), 200);
                  Systems.addScore(state, ScoreTable.stage2.ANTENNA_DESTROY, ant.x, ant.y, "★ANTENNA DESTROYED!★");
                  Systems.dropReward(state, "major", { x: ant.x, y: ant.y });
                  this.checkPhase1Clear(state);
                }
              }
            });
          } else {
            // 電撃停止中：通り抜け可能！ オービットゲート通過ボーナス ＆ ダメージ
            if (!ball._passedAntennaGate) {
              ball._passedAntennaGate = true;
              ant.flash = 18;
              if (window.sfx) window.sfx.capsuleCatch();
              Particles.add(state, ant.x, ant.y, "#00f5d4", 14, 4.0);

              if (ant.hp > 0) {
                ant.hp--;
                Systems.addScore(state, ScoreTable.stage2.ANTENNA_GATE_PASS, ant.x, ant.y, `★GATE PASS! HP:${ant.hp}★`);
                Particles.addPopup(state, ant.x, ant.y - 14, `★GATE PASS HP:${ant.hp}★`, "#e6ff00", 1.1);
                if (ant.hp === 0) {
                  ant.broken = true;
                  ant.isActive = false;
                  ant.isWarning = false;
                  Particles.triggerArmorBreakEffect(state, "antenna", ant.x, ant.y);
                  UI.showCutin(t("stage2.cutin.antennaBreak"), 200);
                  Systems.addScore(state, ScoreTable.stage2.ANTENNA_DESTROY, ant.x, ant.y, "★ANTENNA DESTROYED!★");
                  Systems.dropReward(state, "major", { x: ant.x, y: ant.y });
                  this.checkPhase1Clear(state);
                }
              } else {
                Systems.addScore(state, ScoreTable.stage2.ANTENNA_GATE_PASS, ant.x, ant.y, "★ORBIT GATE CLEAR!!★");
              }
            }
          }
        }
      } else {
        ball._passedAntennaGate = false;
      }
    }

    // 2. バウンスポイント：手前の左肩装甲（※右肩は身体の奥にあるため反射板なし）
    const handleShoulderHit = (sh, sideLabel) => {
      checkBumper(sh, 9.5, () => {
        sh.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, sh.x, sh.y, "#00f5d4", 18, 5.0);

        if (sh.hp > 0) {
          sh.hp--;
          StageCommon.setExpressionSequence(state, [
            { expr: "wince", frames: 28 },
            { expr: "talk_sm", frames: 20 }
          ]);
          Systems.addScore(state, ScoreTable.stage2.SHOULDER_HIT, sh.x, sh.y, `${sideLabel} SHOULDER! HP:${sh.hp}`);
          if (sh.hp === 0) {
            sh.broken = true;
            Particles.triggerArmorBreakEffect(state, sideLabel.toLowerCase() + "_shoulder", sh.x, sh.y);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 25 },
              { expr: "shout", frames: 30 },
              { expr: "wince", frames: 45 }
            ]);
            UI.showCutin(t("stage2.cutin.shoulderBreak", { side: sideLabel }), 200);
            Systems.addScore(state, ScoreTable.stage2.SHOULDER_PURGE, sh.x, sh.y, `★${sideLabel} SHOULDER PURGED!★`);
            Systems.dropReward(state, "major", { x: sh.x, y: sh.y });
            this.checkPhase1Clear(state);
          }
        } else {
          Systems.addScore(state, ScoreTable.stage2.SHOULDER_SPARK, sh.x, sh.y, `⚡${sideLabel} SHOULDER SPARK!`);
        }
      });
    };

    if (state.boss.shoulderL) handleShoulderHit(state.boss.shoulderL, "L");

    // 3. 腕部関節装甲ターゲット：肘（左肘＆右肘：Phase 1 破壊対象 各HP: 5）
    const handleElbowHit = (elb, sideLabel) => {
      if (!elb) return;
      checkBumper(elb, 10.0, () => {
        elb.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, elb.x, elb.y, "#ff007f", 18, 5.0);

        if (elb.hp > 0) {
          elb.hp--;
          StageCommon.setExpressionSequence(state, [
            { expr: "wince", frames: 25 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, ScoreTable.stage2.ARM_HIT, elb.x, elb.y, `${sideLabel}-ARM! HP:${elb.hp}`);

          if (elb.hp === 0) {
            elb.broken = true;
            Particles.triggerArmorBreakEffect(state, `${sideLabel.toLowerCase()}_arm`, elb.x, elb.y);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 25 },
              { expr: "shout", frames: 30 },
              { expr: "wince", frames: 40 }
            ]);
            UI.showCutin(t("stage2.cutin.armBreak", { side: sideLabel }), 200);
            Systems.addScore(state, ScoreTable.stage2.ARM_DESTROY, elb.x, elb.y, `★${sideLabel} ARM DESTROYED!★`);
            Systems.dropReward(state, "major", { x: elb.x, y: elb.y });
            this.checkPhase1Clear(state);
          }
        } else {
          // 破壊後：小スパーク散布
          Particles.add(state, elb.x, elb.y, "#e6ff00", 12, 3.5);
          Systems.addScore(state, ScoreTable.stage2.ARM_SPARK, elb.x, elb.y, `⚡${sideLabel} ARM SPARK!`);
        }
      });
    };

    if (state.boss.elbowL) handleElbowHit(state.boss.elbowL, "L");
    if (state.boss.elbowR) handleElbowHit(state.boss.elbowR, "R");

    // 3.5. 背中ブースターノズル噴射口ターゲット（左右2基のノズル：Phase 2 破壊対象 各HP: 4）
    const handleNozzleHit = (noz, nozLabel) => {
      if (!noz) return;
      checkBumper(noz, 10.5, () => {
        noz.flash = 24;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, noz.x, noz.y, "#ff007f", 16, 4.5);

        if (state.phase < 2 && !noz.broken) {
          Systems.addScore(state, ScoreTable.stage2.NOZZLE_ARMORED, noz.x, noz.y, "🛡️NOZZLE ARMORED");
          return;
        }

        if (noz.hp > 0) {
          noz.hp--;
          StageCommon.setExpressionSequence(state, [
            { expr: "shock", frames: 20 },
            { expr: "wince", frames: 25 }
          ]);
          Systems.addScore(state, ScoreTable.stage2.NOZZLE_HIT, noz.x, noz.y, `NOZZLE-${nozLabel}! HP:${noz.hp}`);

          if (noz.hp === 0) {
            noz.broken = true;
            Particles.triggerArmorBreakEffect(state, `nozzle_${nozLabel.toLowerCase()}`, noz.x, noz.y);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 28 },
              { expr: "shout", frames: 32 }
            ]);
            UI.showCutin(t("stage2.cutin.nozzleBreak", { side: nozLabel }), 200);
            Systems.addScore(state, ScoreTable.stage2.NOZZLE_DESTROY, noz.x, noz.y, `★NOZZLE-${nozLabel} DESTROYED!★`);
            Systems.dropReward(state, "major", { x: noz.x, y: noz.y });

            // 両ノズル大破チェック
            const bothBroken = state.boss.nozzleL.broken && state.boss.nozzleR.broken;
            if (bothBroken) {
              if (state.boss.jet) {
                state.boss.jet.timer = 0;
                state.boss.jet.active = false;
              }
              UI.showCutin(t("stage2.cutin.allNozzleBreak"), 220);
              Systems.addScore(state, ScoreTable.stage2.ALL_THRUSTERS_DOWN, noz.x, noz.y, "★ALL THRUSTERS DOWN!★");
              this.checkPhase2Clear(state);
            }
          }
        } else {
          Particles.add(state, noz.x, noz.y, "#555555", 8, 2.5);
          Systems.addScore(state, ScoreTable.stage2.NOZZLE_SCRAP, noz.x, noz.y, "⚡NOZZLE SCRAP");
        }
      });
    };

    if (state.boss.nozzleL) handleNozzleHit(state.boss.nozzleL, "L");
    if (state.boss.nozzleR) handleNozzleHit(state.boss.nozzleR, "R");

    // 4. 左手奥ホログラム砲台コア（Phase 1はシールド防御、Phase 2で攻撃可能！）
    const holo = state.boss.hologram;
    if (holo) {
      checkBumper(holo, 9.2, () => {
        holo.flash = 22;
        if (holo.broken) {
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#00f5d4", 10, 3.5);
          Systems.addScore(state, ScoreTable.stage2.HOLO_SCRAP, holo.x, holo.y, "HOLO SCRAP");
        } else if (holo.isShielded || state.phase < 2) {
          // Phase 1: ホログラムシールドで反射
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#00f5d4", 14, 4.5);
          Systems.addScore(state, ScoreTable.stage2.HOLO_SHIELDED, holo.x, holo.y, "⚡HOLO SHIELDED⚡");
        } else {
          // Phase 2: シールド解除！ ホログラム砲台コアへ直接ダメージ
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#ff007f", 20, 5.5);
          Particles.add(state, holo.x, holo.y, "#ffffff", 14, 4.5);

          if (holo.hp > 0) {
            holo.hp--;
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 20 },
              { expr: "wince", frames: 28 }
            ]);
            Systems.addScore(state, ScoreTable.stage2.HOLO_HIT, holo.x, holo.y, `💥HOLO CANNON! HP:${holo.hp}`);

            if (holo.hp === 0) {
              holo.broken = true;
              holo.laserState = "idle";
              holo.laserTimer = 0;
              Particles.triggerArmorBreakEffect(state, "hologram_cannon", holo.x, holo.y);
              StageCommon.setExpressionSequence(state, [
                { expr: "shock", frames: 25 },
                { expr: "shout", frames: 32 },
                { expr: "open_blush", frames: 50 }
              ]);
              UI.showCutin(t("stage2.cutin.holoBreak"), 220);
              Systems.addScore(state, ScoreTable.stage2.HOLO_DESTROY, holo.x, holo.y, "★HOLO CANNON DESTROYED!★");
              Systems.dropReward(state, "major", { x: holo.x, y: holo.y });
              this.checkPhase2Clear(state);
            }
          }
        }
      });
    }

    // 5. 胸の先端（バネ振動 ＆ 背中ジェット暴走トリガーセンサー ＆ Phase 2装甲パージ）
    const bust = state.boss.tipBust;
    if (bust) {
      checkBumper(bust, 8.5, () => {
        bust.flash = 22;
        bust.vx += (ball.vx || 2.5) * 1.3;
        bust.vy += (ball.vy || -3.0) * 1.3;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, bust.x, bust.y, "#ff1493", 18, 5.0);
        Particles.spawnHeart(state, bust.x, bust.y, false);

        StageCommon.setExpressionSequence(state, [
          { expr: "shock", frames: 18 },
          { expr: "wince", frames: 24 },
          { expr: "open_blush", frames: 70 }
        ]);
        state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 30);
        this.triggerJetBlast(state);

        if (state.phase < 2 && !bust.broken) {
          Systems.addScore(state, ScoreTable.stage2.BUST_ARMORED, bust.x, bust.y, "🔒BUST LOCKED");
          return;
        }

        if (!bust.broken && bust.hp > 0) {
          bust.hp--;
          Systems.addScore(state, ScoreTable.stage2.BUST_TIP_HIT, bust.x, bust.y, `♥BUST SENSITIVE! HP:${bust.hp}♥`);
          if (bust.hp === 0) {
            bust.broken = true;
            Particles.triggerArmorBreakEffect(state, "bust_armor", bust.x, bust.y);
            UI.showCutin(t("stage2.cutin.bustPurge"), 200);
            Systems.addScore(state, ScoreTable.stage2.BUST_ARMOR_PURGE, bust.x, bust.y, "★BUST ARMOR PURGED!★");
            Systems.dropReward(state, "major", { x: bust.x, y: bust.y });
            this.checkPhase2Clear(state);
          }
        } else {
          Systems.addScore(state, ScoreTable.stage2.BUST_TIP_SENSITIVE, bust.x, bust.y, "♥BUST TIP SENSITIVE!♥");
        }
      });
    }

    // 6. メイン動力炉：プラズマ・リアクターコア（Phase 3 最終決戦ターゲット！）
    const core = state.boss.core;
    if (core) {
      checkBumper(core, 8.8, () => {
        Systems.addFever(state, 6);
        if (state.phase === 3 && core.unlocked && core.hp > 0) {
          core.hp--;
          core.flash = 26;
          StageCommon.setExpressionSequence(state, [
            { expr: "shock", frames: 25 },
            { expr: "shout", frames: 30 },
            { expr: "open_blush", frames: 60 }
          ]);
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 26, 6.0);
          Particles.add(state, core.x, core.y, "#ffffff", 20, 5.0);
          Systems.addScore(state, ScoreTable.stage2.CORE_HIT, core.x, core.y - 18, `💥CORE HIT! HP:${core.hp}`);

          if (core.hp === 0) {
            this.triggerClear(state, engine);
          }
        } else if (core.unlocked) {
          if (window.sfx) window.sfx.burstTrigger();
          Particles.add(state, core.x, core.y, "#e6ff00", 20, 4.5);
          Systems.addScore(state, ScoreTable.stage2.CORE_OVERDRIVE, core.x, core.y - 16, "★REACTOR OVERDRIVE!★");
        } else {
          core.flash = 12;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 10, 3.0);
          Systems.addScore(state, ScoreTable.stage2.CORE_SHIELDED, core.x, core.y - 14, "⚡CORE SHIELDED⚡");
        }
        UI.updateHUD(state);
      });
    }

    // 7. 左足付け根の丸い装甲パーツ（剛体バンパー ＆ お尻揺れトリガー）
    const hip = state.boss.hipJointL;
    if (hip) {
      const bL = state.boss.buttL;
      const jDx = (bL ? bL.dx : 0) * this.HIP_FOLLOW;
      const jDy = (bL ? bL.dy : 0) * this.HIP_FOLLOW;
      const dynamicHip = {
        x: hip.x + jDx,
        y: hip.y + jDy,
        r: hip.r
      };
      checkBumper(dynamicHip, 10.0, () => {
        hip.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, dynamicHip.x, dynamicHip.y, "#00f5d4", 18, 5.0);
        Particles.add(state, dynamicHip.x, dynamicHip.y, "#ff007f", 12, 4.0);

        // 当たったとき、お尻（左右2つの球体）が自然にぷるんと揺れる！
        const bR = state.boss.buttR;
        const impX = (ball.vx > 0 ? 1 : -1) * 3.6 + (Math.random() - 0.5) * 1.5;
        const impY = Math.abs(ball.vy) * 0.85 + 3.2;

        if (bL) {
          bL.vx += impX;
          bL.vy += impY;
        }
        if (bR) {
          // 右臀部には少し遅延・波及する柔らかい衝撃
          bR.vx += impX * 0.65;
          bR.vy += impY * 0.75;
        }

        StageCommon.setExpressionSequence(state, [
          { expr: "shock", frames: 18 },
          { expr: "wince", frames: 25 },
          { expr: "open_blush", frames: 55 }
        ]);
        Systems.addScore(state, ScoreTable.stage2.HIP_BUMPER, dynamicHip.x, dynamicHip.y, "⚡HIP CYBER BUMPER!⚡");
      });
    }

    // 8. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳の鋭角エッジリフレクション）
    const checkCatEarBumper = (ear, earName) => {
      if (!ear) return;
      const edges = [
        [ear.v1, ear.v2],
        [ear.v2, ear.v3],
        [ear.v3, ear.v1]
      ];
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const hit = Physics.checkCapsuleHit(ball, edge[0].x, edge[0].y, edge[1].x, edge[1].y, 4.5);
        if (hit) {
          ball.x = hit.qx + hit.nx * (hit.minDist + 1.8);
          ball.y = hit.qy + hit.ny * (hit.minDist + 1.8);
          // 入射角を残す反射＋法線方向への弾き出し。
          // （旧実装は入射を無視して法線方向へ速さ14で固定キックしていたため、
          //  発射直後の球が毎回同じコースで右壁→パドル間ドレインへ直行していた）
          const EP = this.CAT_EAR_BOUNCE;
          const vn = ball.vx * hit.nx + ball.vy * hit.ny;
          if (vn < 0) {
            ball.vx -= (1 + EP.restitution) * vn * hit.nx;
            ball.vy -= (1 + EP.restitution) * vn * hit.ny;
          }
          ball.vx += hit.nx * EP.kick;
          ball.vy += hit.ny * EP.kick;
          const sp = Math.hypot(ball.vx, ball.vy);
          if (sp > EP.maxSpeed) {
            ball.vx *= EP.maxSpeed / sp;
            ball.vy *= EP.maxSpeed / sp;
          }

          ear.flash = 24;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, ball.x, ball.y, "#ff007f", 16, 5.0);
          Particles.add(state, ball.x, ball.y, "#00f5d4", 10, 4.0);

          StageCommon.setExpressionSequence(state, [
            { expr: "wink", frames: 45 }
          ]);
          if (!(ball._bumperGrace > 0)) {
            ball._bumperGrace = graceFrames;
            Systems.addScore(state, ScoreTable.stage2.CAT_EAR_BOUNCE, ball.x, ball.y, `⚡${earName} CAT EAR BOUNCE!⚡`);
          }
          return;
        }
      }
    };
    checkCatEarBumper(state.boss.catEarL, "L");
    checkCatEarBumper(state.boss.catEarR, "R");
  },

  checkPhase1Clear(state) {
    const b = state.boss;
    const isArmsBroken = b.elbowL.broken && b.elbowR.broken;
    if (b.shoulderL.broken && b.antenna.broken && isArmsBroken && state.phase === 1) {
      state.phase = 2;
      b.hologram.isShielded = false;
      if (window.sfx) window.sfx.burstTrigger();
      // 大ブレイク破片演出
      Particles.triggerArmorBreakEffect(state, "left_shoulder", b.shoulderL.x, b.shoulderL.y);
      Particles.triggerArmorBreakEffect(state, "antenna", b.antenna.x, b.antenna.y);
      Particles.triggerArmorBreakEffect(state, "l_arm", b.elbowL.x, b.elbowL.y);
      Particles.triggerArmorBreakEffect(state, "r_arm", b.elbowR.x, b.elbowR.y);
      Particles.add(state, 198, 250, "#00f5d4", 40, 7.0);
      Particles.add(state, 198, 250, "#ffffff", 40, 8.0);
      StageCommon.setExpressionSequence(state, [
        { expr: "shock", frames: 35 },
        { expr: "shout", frames: 40 },
        { expr: "wince", frames: 55 }
      ]);
      UI.showCutin(t("stage2.cutin.phase1Clear"), 240);
      Systems.dropReward(state, "rare", 2);
      UI.updateHUD(state);
    }
  },

  checkPhase2Clear(state) {
    const b = state.boss;
    const isNozzlesBroken = (!b.nozzleL || b.nozzleL.broken) && (!b.nozzleR || b.nozzleR.broken);
    if (b.hologram.broken && b.tipBust.broken && isNozzlesBroken && state.phase === 2) {
      state.phase = 3;
      b.core.unlocked = true;
      b.allArmorsPurged = true;
      if (window.sfx) window.sfx.burstTrigger();
      // 大ブレイク躯体損壊演出
      if (b.nozzleL) Particles.triggerArmorBreakEffect(state, "nozzle_l", b.nozzleL.x, b.nozzleL.y);
      if (b.nozzleR) Particles.triggerArmorBreakEffect(state, "nozzle_r", b.nozzleR.x, b.nozzleR.y);
      if (b.hologram) Particles.triggerArmorBreakEffect(state, "hologram", b.hologram.x, b.hologram.y);
      Particles.add(state, b.core.x, b.core.y, "#00f5d4", 60, 9.5);
      Particles.add(state, b.core.x, b.core.y, "#ffffff", 50, 8.5);
      Particles.add(state, b.core.x, b.core.y, "#ff007f", 45, 8.0);

      StageCommon.setExpressionSequence(state, [
        { expr: "shock", frames: 35 },
        { expr: "wince", frames: 50 },
        { expr: "open_blush", frames: 999 }
      ]);
      Systems.addScore(state, ScoreTable.stage2.ALL_ARMORS_PURGED, b.core.x, b.core.y, "★ALL ARMORS PURGED!★");
      UI.showCutin(t("stage2.cutin.phase2Clear"), 260);
      Systems.addFever(state, 100);
      Systems.dropReward(state, "rare", 3);
      UI.updateHUD(state);
    }
  },

  triggerClear(state, engine) {
    if (state.stageCleared) return;
    const b = state.boss;
    if (b) {
      if (b.hologram) {
        b.hologram.laserState = "idle";
        b.hologram.isLocked = false;
      }
      if (b.antenna) {
        b.antenna.isActive = false;
        b.antenna.isWarning = false;
      }
      if (b.jet) {
        b.jet.active = false;
        b.jet.timer = 0;
      }
      b.expression = "open_blush";
      b.expressionTimer = 9999;
    }

    StageCommon.startClearSequence(state, Physics.TABLE_WALLS);

    if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
    UI.showCutin(t("stage2.cutin.criticalKO"), 240);
    const coreX = (b && b.core) ? b.core.x : 198;
    const coreY = (b && b.core) ? b.core.y : 320;
    Particles.add(state, coreX, coreY, "#00f5d4", 70, 10.5);
    Particles.add(state, coreX, coreY, "#ff007f", 70, 9.5);
    Particles.add(state, coreX, coreY, "#ffffff", 70, 10.0);

    state.balls.forEach(ball => {
      const a = Math.atan2(ball.y - coreY, ball.x - coreX) + (Math.random() - 0.5) * 0.5;
      const spd = 7.5 + Math.random() * 4.0;
      ball.vx = Math.cos(a) * spd;
      ball.vy = Math.sin(a) * spd - 2.5;
    });
    UI.updateHUD(state);
  },

  triggerStageClear(state, engine) {
    this.triggerClear(state, engine);
  },

  getLaserEndPoint(holo, maxW = 420, maxH = 660) {
    const cos = Math.cos(holo.beamAngle);
    const sin = Math.sin(holo.beamAngle);
    let minT = 1200;

    // テーブルの境界壁セグメント（外周壁・シューターレーン仕切り壁・下部ガイド壁）
    const walls = (window.Physics && window.Physics.TABLE_WALLS) || [];
    const allWalls = [
      ...walls,
      // テーブル底辺境界（ドレイン付近）
      { x1: 0, y1: maxH - 12, x2: maxW, y2: maxH - 12 }
    ];

    allWalls.forEach(w => {
      const vx = w.x2 - w.x1;
      const vy = w.y2 - w.y1;
      const denom = cos * vy - sin * vx;
      if (Math.abs(denom) < 1e-7) return;

      const ax = w.x1 - holo.x;
      const ay = w.y1 - holo.y;
      const t = (ax * vy - ay * vx) / denom;
      const u = (ax * sin - ay * cos) / denom;

      // 前方方向の壁かつ線分区間内（u: 0..1）
      if (t > 4.0 && u >= -0.01 && u <= 1.01) {
        if (t < minT) minT = t;
      }
    });

    // 画面外枠矩形とのフォールバック交点
    if (cos > 1e-4) {
      const t = (maxW - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    } else if (cos < -1e-4) {
      const t = (0 - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    }

    if (sin > 1e-4) {
      const t = (maxH - holo.y) / sin;
      if (t > 0 && t < minT) minT = t;
    } else if (sin < -1e-4) {
      const t = (0 - holo.y) / sin;
      if (t > 0 && t < minT) minT = t;
    }

    return {
      x: holo.x + cos * minT,
      y: holo.y + sin * minT,
      len: minT
    };
  },

  triggerJetBlast(state) {
    const jet = state.boss.jet;
    if (!jet) return;

    jet.timer = 85;
    jet.active = true;
    if (window.sfx && window.sfx.feverAlarm) {
      window.sfx.feverAlarm();
    }

    UI.showCutin(t("stage2.cutin.backJet"), 180);

    state.shockwaves.push({
      x: jet.x,
      y: jet.y,
      r: 10,
      maxR: 175,
      color: "#00f5d4",
      alpha: 1.0
    });
  },

  // 猫耳三角バウンスの反発パラメータ（restitution: 反発係数, kick: 法線方向の弾き出し, maxSpeed: 上限）
  CAT_EAR_BOUNCE: { restitution: 0.6, kick: 2.0, maxSpeed: 14.0 }
});

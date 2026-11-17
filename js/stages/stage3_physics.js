// =========================================================================
// STAGE 3: PHYSICS, BIT LASERS & COLLISIONS
// =========================================================================

Object.assign(window.Stage3, {
  updateBit(bit, state, animTick) {
    if (!bit || bit.broken) return;

    if (bit.flash > 0) bit.flash--;
    bit.rot += 0.025;
    bit.bobY = Math.sin(animTick * 0.08 + bit.phaseOff) * 2.2;

    if (bit.mode === "pause") {
      bit.x = bit.toX;
      bit.y = bit.toY;
      bit.timer--;
      if (bit.timer <= 0) {
        bit.fromX = bit.toX;
        bit.fromY = bit.toY;

        let candX = bit.homeX;
        let candY = bit.homeY;
        for (let tries = 0; tries < 6; tries++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = 0.45 + Math.random() * 0.55;
          candX = Math.max(bit.minX, Math.min(bit.maxX, bit.homeX + Math.cos(ang) * bit.roamRx * rad));
          candY = Math.max(bit.minY, Math.min(bit.maxY, bit.homeY + Math.sin(ang) * bit.roamRy * rad));
          if (Math.hypot(candX - bit.fromX, candY - bit.fromY) >= 14) break;
        }
        bit.toX = candX;
        bit.toY = candY;
        bit.moveDuration = 52 + Math.floor(Math.random() * 18);
        bit.timer = bit.moveDuration;
        bit.mode = "move";
      }
    } else {
      bit.timer--;
      const progress = Math.max(0, Math.min(1, 1 - bit.timer / bit.moveDuration));
      const ease = 0.5 - 0.5 * Math.cos(Math.PI * progress);
      bit.x = bit.fromX + (bit.toX - bit.fromX) * ease;
      bit.y = bit.fromY + (bit.toY - bit.fromY) * ease;

      if (animTick % 4 === 0) {
        state.particles.push({
          x: bit.x + (Math.random() - 0.5) * 6,
          y: bit.y + bit.bobY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          color: "#00f5d4",
          life: 10
        });
      }

      if (bit.timer <= 0) {
        bit.x = bit.toX;
        bit.y = bit.toY;
        bit.mode = "pause";
        bit.timer = 85 + Math.floor(Math.random() * 45);
      }
    }
  },

  // 重力加速度(0.118/frame)と初速オフセット(startOffset)を厳密に織り込んだ未来交点計算（台揺らし無しなら必中コース！）
  solvePredictiveShot(sx, sy, ball, startOffset = 19.5, laserSpeed = 16.2) {
    const x0 = ball.x;
    const y0 = ball.y;
    const vx = ball.vx || 0;
    const vy = ball.vy || 0;
    const g = 0.118;

    const ballPosAt = (t) => ({
      x: x0 + vx * t,
      y: y0 + vy * t + 0.5 * g * t * (t + 1 / 6)
    });

    const f = (t) => {
      const p = ballPosAt(t);
      return Math.hypot(p.x - sx, p.y - sy) - (startOffset + laserSpeed * t);
    };

    let tHit = Math.max(0.5, (Math.hypot(x0 - sx, y0 - sy) - startOffset) / laserSpeed);
    let prevT = 0.0;
    let prevF = f(0.0);
    for (let step = 1; step <= 48; step++) {
      const curT = step;
      const curF = f(curT);
      if (prevF >= 0 && curF <= 0) {
        let lo = prevT;
        let hi = curT;
        for (let it = 0; it < 12; it++) {
          const mid = 0.5 * (lo + hi);
          if (f(mid) > 0) lo = mid;
          else hi = mid;
        }
        tHit = 0.5 * (lo + hi);
        break;
      }
      prevT = curT;
      prevF = curF;
    }

    tHit = Math.max(0.35, Math.min(45, tHit));
    const aim = ballPosAt(tHit);
    const ang = Math.atan2(aim.y - sy, aim.x - sx);
    return {
      angle: ang,
      ux: Math.cos(ang),
      uy: Math.sin(ang),
      aimX: aim.x,
      aimY: aim.y,
      t: tHit
    };
  },

  // 3機以上健在時、そのうち3機を選抜してデルタビームを形成（4機健在時は毎回除外機を変えて三角形の形状を変化させる）
  pickDeltaBeamBits(aliveBits, bl) {
    if (aliveBits.length < 3) return [];
    if (aliveBits.length === 3) {
      return aliveBits.map(bit => bit.id);
    }
    const candidatesToExclude = aliveBits.filter(bit => bit.id !== bl.lastExcludedBitId);
    const pool = candidatesToExclude.length > 0 ? candidatesToExclude : aliveBits;
    const excluded = pool[Math.floor(Math.random() * pool.length)];
    bl.lastExcludedBitId = excluded.id;
    return aliveBits.filter(bit => bit.id !== excluded.id).slice(0, 3).map(bit => bit.id);
  },

  _deltaEdgesBuf: [],
  _deltaBitsBuf: [null, null, null],
  _aliveBitsBuf: [],
  _activeBallsBuf: [],
  _candBallsBuf: [],

  // 選抜された3機のビット外縁同士を結ぶデルタビーム線分配列を取得（ビット本体の被弾判定は妨げない）
  getDeltaBeamEdges(b) {
    const bl = b && b.bitLasers;
    if (!bl || !bl.deltaBitIds || bl.deltaBitIds.length !== 3) return this._emptyArr;
    const allBits = this.getAllBits(b);
    const bits = this._deltaBitsBuf;
    for (let k = 0; k < 3; k++) {
      const id = bl.deltaBitIds[k];
      let found = null;
      for (let i = 0; i < allBits.length; i++) {
        if (allBits[i].id === id && !allBits[i].broken) {
          found = allBits[i];
          break;
        }
      }
      if (!found) return this._emptyArr;
      bits[k] = found;
    }

    const edges = this._deltaEdgesBuf;
    edges.length = 0;
    for (let p = 0; p < 3; p++) {
      const b1 = bits[p];
      const b2 = bits[(p + 1) % 3];
      const p1x = b1.x;
      const p1y = b1.y + (b1.bobY || 0);
      const p2x = b2.x;
      const p2y = b2.y + (b2.bobY || 0);
      const dx = p2x - p1x;
      const dy = p2y - p1y;
      const len = Math.hypot(dx, dy);
      const pad1 = b1.r + 2;
      const pad2 = b2.r + 2;
      if (len > pad1 + pad2 + 4) {
        const ux = dx / len;
        const uy = dy / len;
        edges.push({
          ax: p1x + ux * pad1,
          ay: p1y + uy * pad1,
          bx: p2x - ux * pad2,
          by: p2y - uy * pad2,
          rawAx: p1x,
          rawAy: p1y,
          rawBx: p2x,
          rawBy: p2y
        });
      }
    }
    return edges;
  },

  // ロックオン・ショートレーザー直撃によるボール四散＆ボールロスト演出
  shatterBallByLaser(ball, state, engine) {
    if (!ball || ball._shattered) return;
    const bx = ball.x;
    const by = ball.y;

    state.hitStopTimer = 4;
    state.nudgeOffset.x = (Math.random() - 0.5) * 20;
    state.nudgeOffset.y = (Math.random() - 0.5) * 18;

    if (window.sfx && window.sfx.ballShatter) {
      window.sfx.ballShatter();
    } else if (window.sfx) {
      window.sfx.armorBreak();
    }

    // 二重の衝撃波リング
    state.shockwaves.push({
      x: bx,
      y: by,
      r: 5,
      maxR: 72,
      speed: 5.0,
      color: "#ff1744",
      lineWidth: 3.6,
      alpha: 1.0
    });
    state.shockwaves.push({
      x: bx,
      y: by,
      r: 3,
      maxR: 48,
      speed: 3.4,
      color: "#e6ff00",
      lineWidth: 2.4,
      alpha: 1.0
    });

    // ボールが四散する12個の金属・プラズマ破片
    const shardPalette = ["#e6ff00", "#00f5d4", "#ff1744", "#ffffff"];
    for (let i = 0; i < 12; i++) {
      const ang = (Math.PI * 2 * i) / 12 + (Math.random() - 0.5) * 0.35;
      const spd = 4.6 + Math.random() * 6.8;
      state.armorDebris.push({
        x: bx + (Math.random() - 0.5) * 6,
        y: by + (Math.random() - 0.5) * 6,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 2.2,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.45,
        w: 6 + Math.random() * 6,
        h: 5 + Math.random() * 5,
        color: shardPalette[i % shardPalette.length],
        stroke: "#ffffff",
        life: 48 + Math.floor(Math.random() * 24),
        maxLife: 72
      });
    }

    Particles.add(state, bx, by, "#ff1744", 22, 6.8);
    Particles.add(state, bx, by, "#e6ff00", 18, 5.8);
    Particles.add(state, bx, by, "#ffffff", 14, 4.6);
    Particles.addPopup(state, bx, Math.max(46, by - 16), "💥BALL SHATTERED!!", "#ff1744", 1.24);

    StageCommon.setExpressionSequence(state, [
      { expr: "wink", frames: 28 },
      { expr: "talk", frames: 28 }
    ]);
    UI.showCutin("💥【ロックオン直撃！ ボール四散ロスト！】💥<br>赤ロック警報が鳴ったらタイミングよく『台揺らし』で振り切れ！", 175);

    // 物理ステップ末尾の標準ドレイン処理に委ねて安全にボールロストさせる
    ball._shattered = true;
    ball.trail = [];
    ball.vx = 0;
    ball.vy = 0;
    ball.y = (engine ? engine.H : 620) + 60;
  },

  resetSnipeState(bl, nextCooldown = 160) {
    bl.snipePhase = "idle";
    bl.snipeBitId = null;
    bl.snipeTargetBall = null;
    bl.snipePhaseTimer = 0;
    bl.nudgedDuringLock = false;
    bl.staleShot = null;
    bl.snipeTimer = nextCooldown;
  },

  updateBitLasers(state) {
    const b = state.boss;
    const bl = b && b.bitLasers;
    if (!bl) return;

    state.balls.forEach(ball => {
      if (ball._triLaserGrace > 0) ball._triLaserGrace--;
    });

    // ステージクリア時は全レーザー即消去
    if (state.stageCleared) {
      bl.shortLasers = [];
      bl.triMode = "cooldown";
      bl.deltaBitIds = [];
      this.resetSnipeState(bl, 180);
      return;
    }

    // 飛翔中のショートレーザー更新
    for (let i = bl.shortLasers.length - 1; i >= 0; i--) {
      const sl = bl.shortLasers[i];
      if (sl.hit) {
        bl.shortLasers.splice(i, 1);
        continue;
      }
      sl.prevX = sl.x;
      sl.prevY = sl.y;
      sl.x += sl.vx;
      sl.y += sl.vy;
      sl.life--;
      if (sl.aimTimer > 0) sl.aimTimer--;
      if (sl.life <= 0 || sl.x < 8 || sl.x > 390 || sl.y < 10 || sl.y > 635) {
        bl.shortLasers.splice(i, 1);
      }
    }

    const allBits = this.getAllBits(b);
    const aliveBits = this._aliveBitsBuf;
    aliveBits.length = 0;
    for (let i = 0; i < allBits.length; i++) {
      if (!allBits[i].broken) aliveBits.push(allBits[i]);
    }
    const activeBalls = this._activeBallsBuf;
    activeBalls.length = 0;
    for (let i = 0; i < state.balls.length; i++) {
      const ball = state.balls[i];
      if (!ball.inShooterLane && !ball._capturedByHand && !ball._shattered) activeBalls.push(ball);
    }

    if (aliveBits.length >= 3) {
      // === 3機以上健在時：そのうち3機が選ばれてデルタビーム！ ===
      if (bl.snipePhase !== "idle") {
        this.resetSnipeState(bl, 90);
      }

      if (bl.triMode === "cooldown") {
        if (activeBalls.length > 0) {
          bl.triTimer--;
          if (bl.triTimer <= 0) {
            bl.deltaBitIds = this.pickDeltaBeamBits(aliveBits, bl);
            bl.triMode = "charge";
            bl.triTimer = 46;
            aliveBits.forEach(bit => {
              if (bl.deltaBitIds.includes(bit.id)) bit.flash = 16;
            });
          }
        }
      } else if (bl.triMode === "charge" || bl.triMode === "fire") {
        // 選抜された3機のうち1機でも撃墜されたら一旦再編成クールダウンへ
        const selectedAlive = bl.deltaBitIds.every(id => aliveBits.some(bit => bit.id === id));
        if (!selectedAlive) {
          bl.triMode = "cooldown";
          bl.deltaBitIds = [];
          bl.triTimer = 70;
          return;
        }

        if (bl.triMode === "charge") {
          bl.triTimer--;
          if (bl.triTimer <= 0) {
            bl.triMode = "fire";
            bl.triTimer = 118;
            aliveBits.forEach(bit => {
              if (bl.deltaBitIds.includes(bit.id)) bit.flash = 24;
            });
            if (window.sfx) window.sfx.triangleLaser();
            Particles.addPopup(state, 198, 292, "🔺DELTA BEAM!!", "#00f5d4", 1.15);
          }
        } else {
          bl.triTimer--;
          if (b.animTick % 6 === 0) {
            const deltaBits = aliveBits.filter(bit => bl.deltaBitIds.includes(bit.id));
            const pick = deltaBits[Math.floor(Math.random() * deltaBits.length)];
            if (pick) {
              state.particles.push({
                x: pick.x + (Math.random() - 0.5) * 10,
                y: pick.y + (pick.bobY || 0) + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 1.8,
                vy: (Math.random() - 0.5) * 1.8,
                color: Math.random() < 0.5 ? "#00f5d4" : "#ff1493",
                life: 10
              });
            }
          }
          if (bl.triTimer <= 0) {
            bl.triMode = "cooldown";
            bl.deltaBitIds = [];
            bl.triTimer = 165 + Math.floor(Math.random() * 50);
          }
        }
      }
    } else if (aliveBits.length >= 1) {
      // === 1〜2機残存時：ロックオン→必中ショートレーザー（ボール四散ロスト・台揺らしでのみ回避可能！） ===
      if (bl.triMode !== "cooldown") {
        bl.triMode = "cooldown";
        bl.deltaBitIds = [];
        bl.triTimer = 150;
      }

      const handsBusy = b.hands && b.hands.mode === "transfer";
      // フリッパー直上(y>=470)の球は新規ロックオン対象外にして理不尽ハメを防ぐ
      const candidateBalls = this._candBallsBuf;
      candidateBalls.length = 0;
      for (let i = 0; i < activeBalls.length; i++) {
        const ball = activeBalls[i];
        if (ball.y > 46 && ball.y < 470) candidateBalls.push(ball);
      }
      const nextCooldown = () => (aliveBits.length === 2 ? 185 : 225) + Math.floor(Math.random() * 45);

      if (bl.snipePhase === "idle") {
        if (!handsBusy && candidateBalls.length > 0) {
          bl.snipeTimer--;
          if (bl.snipeTimer <= 0) {
            const shooter = aliveBits[bl.nextBitCursor % aliveBits.length];
            bl.nextBitCursor++;
            const tgt = candidateBalls[Math.floor(Math.random() * candidateBalls.length)];

            bl.snipePhase = "tracking";
            bl.snipeBitId = shooter.id;
            bl.snipeTargetBall = tgt;
            bl.snipePhaseTimer = 45; // 0.75秒（15f×3カウント：リズミカルな ピッ・ピッ・ピッ！）
            bl.nudgedDuringLock = false;
            bl.staleShot = this.solvePredictiveShot(
              shooter.x,
              shooter.y + (shooter.bobY || 0),
              tgt,
              shooter.r + 3,
              16.8
            );
            shooter.mode = "pause";
            shooter.timer = Math.max(shooter.timer, 82);
            shooter.flash = 12;
            if (window.sfx && window.sfx.lockBeep) window.sfx.lockBeep(1);
          }
        }
      } else if (bl.snipePhase === "tracking") {
        const shooter = aliveBits.find(bit => bit.id === bl.snipeBitId);
        const tgt = bl.snipeTargetBall;
        const tgtValid = tgt && state.balls.includes(tgt) && !tgt.inShooterLane && !tgt._capturedByHand && !tgt._shattered && tgt.y < 595;
        if (!shooter || !tgtValid || handsBusy) {
          this.resetSnipeState(bl, 75);
          return;
        }

        shooter.mode = "pause";
        shooter.timer = Math.max(shooter.timer, 36);
        shooter.flash = Math.max(shooter.flash, 5);

        // 台揺らし前までの最新予測軌道を保持（リズム先行台揺らし時にも旧軌道へ外せるようにする）
        if (!bl.nudgedDuringLock) {
          bl.staleShot = this.solvePredictiveShot(
            shooter.x,
            shooter.y + (shooter.bobY || 0),
            tgt,
            shooter.r + 3,
            16.8
          );
        }

        bl.snipePhaseTimer--;
        if (bl.snipePhaseTimer === 30 && window.sfx && window.sfx.lockBeep) {
          window.sfx.lockBeep(2);
        } else if (bl.snipePhaseTimer === 15 && window.sfx && window.sfx.lockBeep) {
          window.sfx.lockBeep(3);
        }

        if (bl.snipePhaseTimer <= 0) {
          bl.snipePhase = "locked";
          bl.snipePhaseTimer = 28; // 0.47秒の明確な赤ロック警報＆台揺らし回避ウィンドウ！
          shooter.flash = 28;
          if (!bl.nudgedDuringLock) {
            bl.staleShot = this.solvePredictiveShot(
              shooter.x,
              shooter.y + (shooter.bobY || 0),
              tgt,
              shooter.r + 3,
              16.8
            );
          }
          if (window.sfx && window.sfx.lockComplete) window.sfx.lockComplete();
        }
      } else if (bl.snipePhase === "locked") {
        const shooter = aliveBits.find(bit => bit.id === bl.snipeBitId);
        const tgt = bl.snipeTargetBall;
        const tgtValid = tgt && state.balls.includes(tgt) && !tgt.inShooterLane && !tgt._capturedByHand && !tgt._shattered && tgt.y < 595;
        if (!shooter || !tgtValid || handsBusy) {
          this.resetSnipeState(bl, 75);
          return;
        }

        shooter.mode = "pause";
        shooter.timer = Math.max(shooter.timer, 20);
        shooter.flash = Math.max(shooter.flash, 8);
        bl.snipePhaseTimer--;

        if (bl.snipePhaseTimer <= 0) {
          const sx = shooter.x;
          const sy = shooter.y + (shooter.bobY || 0);
          const laserSpeed = 16.8;
          const startOffset = shooter.r + 3;
          const sol = (bl.nudgedDuringLock && bl.staleShot)
            ? bl.staleShot
            : this.solvePredictiveShot(sx, sy, tgt, startOffset, laserSpeed);

          const startX = sx + sol.ux * startOffset;
          const startY = sy + sol.uy * startOffset;

          // 初フレームの6サブステップでも弾頭が t=0 -> 1 フレーム分等速前進するよう prevX/x を設定（重力込み偏差射撃と完全一致！）
          bl.shortLasers.push({
            prevX: startX,
            prevY: startY,
            x: startX + sol.ux * laserSpeed,
            y: startY + sol.uy * laserSpeed,
            vx: sol.ux * laserSpeed,
            vy: sol.uy * laserSpeed,
            ux: sol.ux,
            uy: sol.uy,
            len: 28,
            r: 4.6,
            aimX: sol.aimX,
            aimY: sol.aimY,
            aimTimer: Math.min(22, Math.ceil(sol.t)),
            life: 44,
            hit: false,
            targetBall: tgt,
            ignoreBall: bl.nudgedDuringLock ? tgt : null,
            evadedInFlight: false
          });

          shooter.flash = 22;
          if (window.sfx) window.sfx.laserPew();
          Particles.add(state, startX, startY, "#ff1744", 8, 3.8);
          Particles.add(state, startX, startY, "#e6ff00", 6, 3.2);

          this.resetSnipeState(bl, nextCooldown());
        }
      }
    } else {
      // 全ビット破壊済み
      bl.triMode = "cooldown";
      bl.deltaBitIds = [];
      if (bl.snipePhase !== "idle") {
        this.resetSnipeState(bl, 180);
      }
    }
  },

  updateHands(state) {
    const b = state.boss;
    const hands = b.hands;
    if (!hands) return;

    const spec = this.getHandSuctionSpec(state);
    hands.suctionLevel = spec.level;
    hands.suctionRadius = spec.radius;
    hands.pullForce = spec.pull;

    if (b.handL.flash > 0) b.handL.flash--;
    if (b.handR.flash > 0) b.handR.flash--;
    if (hands.handLClosedTimer > 0) hands.handLClosedTimer--;
    if (hands.handRClosedTimer > 0) hands.handRClosedTimer--;

    state.balls.forEach(ball => {
      if (ball._handThrowGrace > 0) ball._handThrowGrace--;
    });

    if (state.stageCleared) {
      if (hands.capturedBall) {
        this.releaseCapturedBall(hands);
      }
      hands.mode = "open";
      hands.handLClosedTimer = 0;
      hands.handRClosedTimer = 0;
      return;
    }

    if (hands.mode === "open") {
      hands.timer--;
      if (hands.timer <= 0) {
        hands.mode = "suction";
        hands.timer = spec.suctionFrames;
      }
    } else if (hands.mode === "suction") {
      hands.timer--;

      // 破壊進行レベルに応じて激しくなる吸引渦パーティクル
      const pInterval = spec.level >= 4 ? 1 : (spec.level >= 2 ? 2 : 3);
      if (b.animTick % pInterval === 0) {
        [b.handL, b.handR].forEach(h => {
          const ang = Math.random() * Math.PI * 2;
          const dist = 28 + Math.random() * (spec.radius * 0.72);
          const pSpd = 2.4 + spec.level * 0.75;
          state.particles.push({
            x: h.x + Math.cos(ang) * dist,
            y: h.y + Math.sin(ang) * dist,
            vx: -Math.cos(ang) * pSpd,
            vy: -Math.sin(ang) * pSpd,
            color: spec.level >= 4
              ? (Math.random() < 0.5 ? "#e6ff00" : "#ff1493")
              : (Math.random() < 0.5 ? "#ff1493" : "#00f5d4"),
            life: 12
          });
        });
      }

      let caught = false;
      for (const ball of state.balls) {
        if (ball.inShooterLane || ball._capturedByHand || (ball._handThrowGrace && ball._handThrowGrace > 0)) continue;

        for (const h of [b.handL, b.handR]) {
          const dx = h.x - ball.x;
          const dy = h.y - ball.y;
          const dist = Math.hypot(dx, dy);
          const catchR = 23 + spec.level * 1.5;

          if (dist < catchR) {
            // キャッチ成立！ 手を閉じて反対の手へワープ転送開始
            hands.mode = "transfer";
            hands.transferTotal = spec.transferFrames;
            hands.timer = spec.transferFrames;
            hands.catchSide = h.side;
            hands.exitSide = h.side === "L" ? "R" : "L";
            hands.capturedBall = ball;

            ball._capturedByHand = true;
            ball._savedR = ball.r || 6.5;
            ball.r = 0.1;
            ball.x = h.x;
            ball.y = h.y;
            ball.vx = 0;
            ball.vy = 0;
            ball.trail = [];
            ball.stuckTimer = 0;

            if (h.side === "L") {
              hands.handLClosedTimer = spec.transferFrames + 4;
            } else {
              hands.handRClosedTimer = spec.transferFrames + 4;
            }
            h.flash = 22;

            if (window.sfx) window.sfx.capsuleCatch();
            Particles.add(state, h.x, h.y, "#ff1493", 20, 4.8);
            Particles.add(state, h.x, h.y, "#00f5d4", 14, 4.0);
            Systems.addScore(state, 4000 + spec.level * 1200, h.x, h.y - 16, `🌀${h.side}-HAND CATCH LV.${spec.level}!`);
            StageCommon.setExpressionSequence(state, [
              { expr: spec.level >= 3 ? "wince" : "wink", frames: 20 },
              { expr: spec.level >= 4 ? "open_blush" : "talk", frames: 22 }
            ]);
            caught = true;
            break;
          } else if (dist < spec.radius && dist > 0.5) {
            // 破壊が進むほど遠くからでも強烈に吸い寄せる！
            const ratio = 1 - dist / spec.radius;
            const pull = spec.pull * Math.pow(ratio, 0.78);
            ball.vx += (dx / dist) * pull;
            ball.vy += (dy / dist) * pull;

            const dampZone = 38 + spec.level * 10;
            if (dist < dampZone) {
              const damp = 0.95 - spec.level * 0.012;
              ball.vx *= damp;
              ball.vy *= damp;
            }
          }
        }
        if (caught) break;
      }

      if (!caught && hands.timer <= 0) {
        hands.mode = "open";
        hands.timer = spec.openFrames + Math.floor(Math.random() * 35);
      }
    } else if (hands.mode === "transfer") {
      const ball = hands.capturedBall;
      if (!ball || !state.balls.includes(ball)) {
        this.releaseCapturedBall(hands);
        hands.mode = "open";
        hands.timer = spec.openFrames;
        return;
      }

      const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
      const exitHand = hands.exitSide === "L" ? b.handL : b.handR;

      hands.timer--;
      ball.stuckTimer = 0;
      ball.vx = 0;
      ball.vy = 0;
      ball.trail = [];

      // 転送後半は反対側の手もグッと握り込んでチャージ
      if (hands.timer <= Math.ceil(hands.transferTotal * 0.5) && hands.timer > 0) {
        if (hands.exitSide === "L") hands.handLClosedTimer = Math.max(hands.handLClosedTimer, 4);
        else hands.handRClosedTimer = Math.max(hands.handRClosedTimer, 4);
      }

      const progress = 1 - hands.timer / hands.transferTotal;
      const arcX = catchHand.x + (exitHand.x - catchHand.x) * progress;
      const arcY = catchHand.y + (exitHand.y - catchHand.y) * progress - Math.sin(progress * Math.PI) * 34;
      ball.x = arcX;
      ball.y = arcY;

      for (let i = 0; i < 2; i++) {
        state.particles.push({
          x: arcX + (Math.random() - 0.5) * 10,
          y: arcY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2.4,
          vy: (Math.random() - 0.5) * 2.4,
          color: i === 0 ? "#00f5d4" : "#e6ff00",
          life: 11
        });
      }

      if (hands.timer <= 0) {
        if (hands.exitSide === "L") hands.handLClosedTimer = 0;
        else hands.handRClosedTimer = 0;

        // センタードレイン直撃角のみわずかに避けつつ全周ランダム方向に射出
        const pickRandomThrowAngle = () => {
          const drainAngle = Math.atan2(615 - exitHand.y, 198 - exitHand.x);
          let a = Math.random() * Math.PI * 2;
          const diff = Math.atan2(Math.sin(a - drainAngle), Math.cos(a - drainAngle));
          if (Math.abs(diff) < 0.26) {
            a += (diff >= 0 ? 0.36 : -0.36);
          }
          return a;
        };

        const throwAngle = pickRandomThrowAngle();
        const throwSpeed = Math.min(13.2, spec.throwSpeed + Math.random() * 0.8);
        const spawnX = Math.max(28, Math.min(368, exitHand.x + Math.cos(throwAngle) * 24));
        const spawnY = Math.max(44, Math.min(560, exitHand.y + Math.sin(throwAngle) * 24));

        this.releaseCapturedBall(hands, { x: spawnX, y: spawnY });
        ball.vx = Math.cos(throwAngle) * throwSpeed;
        ball.vy = Math.sin(throwAngle) * throwSpeed;
        ball._handThrowGrace = 36;

        exitHand.flash = 26;
        if (window.sfx) window.sfx.plungerLaunch(72 + spec.level * 7);
        state.shockwaves.push({
          x: exitHand.x,
          y: exitHand.y,
          r: 8,
          maxR: 48 + spec.level * 10,
          speed: 4.5,
          color: spec.level >= 4 ? "#ff1493" : "#00f5d4",
          lineWidth: 3.0,
          alpha: 1.0
        });
        Particles.add(state, exitHand.x, exitHand.y, "#00f5d4", 20 + spec.level * 3, 6.0);
        Particles.add(state, exitHand.x, exitHand.y, "#e6ff00", 14 + spec.level * 2, 5.0);
        Systems.addScore(state, 7000 + spec.level * 1500, exitHand.x, exitHand.y - 18, `⚡${exitHand.side}-HAND THROW!`);

        StageCommon.setExpressionSequence(state, [
          { expr: "shout", frames: 22 },
          { expr: spec.level >= 4 ? "open_blush" : "wink", frames: 36 }
        ]);

        hands.mode = "open";
        hands.timer = spec.openFrames + Math.floor(Math.random() * 35);
      }
    }
  },

  update(state, engine) {
    if (!state.boss) return;
    const b = state.boss;

    // クリア演出進行
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: "ノア (NOA)",
        defeatQuoteHtml: "「ふぇぇ……中枢ペンダント壊れちゃったよぉ……！<br>電脳空間が……シャットダウンしちゃう……っ！」",
        explosionOrigin: { x: b.core ? b.core.x : 198, y: b.core ? b.core.y : 330 },
        smokeColors: ["#00f5d4", "#ff1493", "#ffffff", "#e0ffff"]
      });
      return;
    }

    b.animTick = (b.animTick || 0) + 1;

    // 1. 表情アニメーション制御
    StageCommon.updateFaceAnim(b, "normal", {
      idleRandom: true,
      blinkProb: 0.56,
      blinkFrames: 16,
      winkProb: 0.82,
      winkFrames: 44,
      talkFrames: 24
    });
    if (b.bustExcitement > 0) b.bustExcitement = Math.max(0, b.bustExcitement - 0.22);

    // 2. 浮遊ビット4機の移動＆一時停止サイクル ＆ ビットレーザー更新
    this.getAllBits(b).forEach(bit => this.updateBit(bit, state, b.animTick));
    this.updateBitLasers(state);

    // 3. カチューシャのアンテナ角度バネ減衰振動（電撃なし）
    const ant = b.antenna;
    if (ant) {
      const springK = 0.17;
      const damp = 0.88;
      ant.angleVel = (ant.angleVel - springK * ant.angle) * damp;
      ant.angle += ant.angleVel;
      if (ant.angle > 0.42) { ant.angle = 0.42; ant.angleVel *= -0.5; }
      if (ant.angle < -0.42) { ant.angle = -0.42; ant.angleVel *= -0.5; }
      if (ant.flash > 0) ant.flash--;
    }

    // 4. 左右のワープハンド更新（破壊進行に応じて吸引強化）
    this.updateHands(state);

    // 5. 胸部 ＆ お尻・太もも 2Dバネ物理（被弾・台揺らし時のみ揺れ、減衰後はピタッと静止させる）
    const updateSoftSpring = (part, stiffness = 0.22, damping = 0.82, maxDisp = 5.0) => {
      if (!part) return;
      part.vx = (part.vx - stiffness * part.dx) * damping;
      part.vy = (part.vy - stiffness * part.dy) * damping;
      part.dx = Math.max(-maxDisp, Math.min(maxDisp, part.dx + part.vx));
      part.dy = Math.max(-maxDisp, Math.min(maxDisp, part.dy + part.vy));
      if (Math.hypot(part.dx, part.dy) < 0.10 && Math.hypot(part.vx, part.vy) < 0.08) {
        part.dx = 0;
        part.dy = 0;
        part.vx = 0;
        part.vy = 0;
      }
      if (part.flash > 0) part.flash--;
      if (part.rot !== undefined) part.rot += 0.02;
    };
    // ビスチェ装着中も弾むような揺れ(max 6.2px)、パージ後は開放された大きな揺れ(max 9.2px)へ変化！
    if (b.chestArmorBroken) {
      updateSoftSpring(b.bustL, 0.15, 0.90, 9.2);
      updateSoftSpring(b.bustR, 0.15, 0.90, 9.2);
    } else {
      updateSoftSpring(b.bustL, 0.18, 0.89, 6.2);
      updateSoftSpring(b.bustR, 0.18, 0.89, 6.2);
    }
    updateSoftSpring(b.hipButt, 0.18, 0.89, 6.0);
    updateSoftSpring(b.thigh, 0.18, 0.89, 5.8);

    // 6. 各部位フラッシュ減衰
    [b.kneePad, b.hipPort, b.garterRibbon, b.bootKicker, b.core].forEach(t => {
      if (!t) return;
      if (t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (!state.boss || ball._shattered) return;
    const b = state.boss;

    // ワープハンド捕獲中のボールは全サブステップ(s=0..5)で座標・速度をロック
    if (ball._capturedByHand) {
      const hands = b.hands;
      if (hands && hands.mode === "transfer" && hands.capturedBall === ball) {
        const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
        const exitHand = hands.exitSide === "L" ? b.handL : b.handR;
        const progress = 1 - hands.timer / (hands.transferTotal || 44);
        ball.x = catchHand.x + (exitHand.x - catchHand.x) * progress;
        ball.y = catchHand.y + (exitHand.y - catchHand.y) * progress - Math.sin(progress * Math.PI) * 34;
        ball.vx = 0;
        ball.vy = 0;
        ball.trail = [];
        return;
      } else {
        ball._capturedByHand = false;
        if (ball._savedR) { ball.r = ball._savedR; delete ball._savedR; }
      }
    }

    if (ball.inShooterLane) return;

    // 0A. ビット連携レーザー衝突判定（高速弾すり抜け防止のため全サブステップ s=0..5 で判定）
    const bl = b.bitLasers;
    if (bl && !state.stageCleared) {
      // (1) 3機以上健在時：選抜3機によるデルタビームの3辺反射
      if (bl.triMode === "fire" && !(ball._triLaserGrace > 0)) {
        const edges = this.getDeltaBeamEdges(b);
        for (const ed of edges) {
          const hit = Physics.checkCapsuleHit(ball, ed.ax, ed.ay, ed.bx, ed.by, 4.5);
          if (hit) {
            ball.x = hit.qx + hit.nx * (hit.minDist + 2.0);
            ball.y = hit.qy + hit.ny * (hit.minDist + 2.0);

            const vn = ball.vx * hit.nx + ball.vy * hit.ny;
            if (vn < 0) {
              ball.vx -= 1.85 * vn * hit.nx;
              ball.vy -= 1.85 * vn * hit.ny;
            }
            ball.vx += hit.nx * 3.4;
            ball.vy += hit.ny * 3.4;

            const sp = Math.hypot(ball.vx, ball.vy);
            if (sp < 9.4) {
              ball.vx = (ball.vx / (sp || 1)) * 9.4;
              ball.vy = (ball.vy / (sp || 1)) * 9.4;
            } else if (sp > 12.6) {
              ball.vx = (ball.vx / sp) * 12.6;
              ball.vy = (ball.vy / sp) * 12.6;
            }

            ball._triLaserGrace = 8;
            if (window.sfx) window.sfx.exSpark();
            Particles.add(state, hit.qx, hit.qy, "#00f5d4", 12, 4.5);
            Particles.add(state, hit.qx, hit.qy, "#ff1493", 10, 4.0);
            Systems.addScore(state, 2400, hit.qx, hit.qy - 12, "🔺DELTA BEAM!");
            break;
          }
        }
      }

      // (2) 1〜2機残存時：ロックオン・ショートレーザー直撃でボール四散＆ボールロスト！（台揺らし回避済みの球はすり抜け）
      if (bl.shortLasers && bl.shortLasers.length > 0) {
        const tSub = (s + 1) / 6;
        for (const sl of bl.shortLasers) {
          if (sl.hit || sl.ignoreBall === ball) continue;
          const lx = sl.prevX + (sl.x - sl.prevX) * tSub;
          const ly = sl.prevY + (sl.y - sl.prevY) * tSub;
          const tx = lx - sl.ux * sl.len;
          const ty = ly - sl.uy * sl.len;
          const hit = Physics.checkCapsuleHit(ball, tx, ty, lx, ly, sl.r);
          if (hit) {
            sl.hit = true;
            this.shatterBallByLaser(ball, state, engine);
            return;
          }
        }
      }
    }

    if (s !== 0) return;

    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);

    // 1. カチューシャのアンテナ（電撃なし：当たるとバネで揺れて弾き返す！）
    const ant = b.antenna;
    if (ant) {
      const ep = this.getAntennaEndpoints(ant);
      const hit = Physics.checkCapsuleHit(ball, ep.ax, ep.ay, ep.bx, ep.by, ant.r);
      if (hit) {
        ball.x = hit.qx + hit.nx * (hit.minDist + 1.6);
        ball.y = hit.qy + hit.ny * (hit.minDist + 1.6);

        const AB = this.ANTENNA_BOUNCE;
        const vn = ball.vx * hit.nx + ball.vy * hit.ny;
        if (vn < 0) {
          ball.vx -= (1 + AB.restitution) * vn * hit.nx;
          ball.vy -= (1 + AB.restitution) * vn * hit.ny;
        }
        ball.vx += hit.nx * AB.kick;
        ball.vy += hit.ny * AB.kick;

        const sp = Math.hypot(ball.vx, ball.vy);
        if (sp > AB.maxSpeed) {
          ball.vx *= AB.maxSpeed / sp;
          ball.vy *= AB.maxSpeed / sp;
        }

        const rx = hit.qx - ep.ax;
        const ry = hit.qy - ep.ay;
        const impactX = -hit.nx;
        const impactY = -hit.ny;
        const torque = (rx * impactY - ry * impactX) * 0.0026;
        ant.angleVel += Math.max(-0.22, Math.min(0.22, torque || ((ball.vx > 0 ? 1 : -1) * 0.14)));
        ant.flash = 22;

        if (window.sfx) {
          window.sfx.earBoing();
          window.sfx.slingshot();
        }
        Particles.add(state, hit.qx, hit.qy, "#00f5d4", 14, 4.5);
        Particles.add(state, hit.qx, hit.qy, "#ff66b2", 10, 3.8);

        StageCommon.setExpressionSequence(state, [
          { expr: "wink", frames: 36 }
        ]);

        if (state.skillShotEligible) {
          state.skillShotEligible = false;
          Systems.addScore(state, 25000, hit.qx, hit.qy, "★SKILL SHOT!!");
          UI.showCutin("🎯【SKILL SHOT 成功！】<br>ヘッドセットアンテナ弾性バウンス！<br>+25,000pts ＆ レアカプセル！", 180);
          Systems.dropReward(state, "rare", 2);
        } else {
          Systems.addScore(state, 3000, hit.qx, hit.qy - 12, "📡ANTENNA BOING!");
        }
        UI.updateHUD(state);
      }
    }

    // 2. 浮遊ビット×4機（耐久力差あり：3機以上はデルタビーム、2機以下でロックオン粉砕レーザーへ移行！）
    this.getAllBits(b).forEach(bit => {
      if (!bit || bit.broken) return;
      const dynBit = { x: bit.x, y: bit.y + (bit.bobY || 0), r: bit.r };
      checkBumper(dynBit, 10.2, () => {
        bit.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, dynBit.x, dynBit.y, "#00f5d4", 16, 4.8);

        if (state.skillShotEligible && (bit.id === "bitTopL" || bit.id === "bitTopR")) {
          state.skillShotEligible = false;
          Systems.addScore(state, 20000, dynBit.x, dynBit.y - 16, "★SKILL SHOT!!");
          Systems.dropReward(state, "rare", 1);
        }

        if (bit.hp > 0) {
          bit.hp--;
          StageCommon.setExpressionSequence(state, [
            { expr: "wince", frames: 20 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, 3500, dynBit.x, dynBit.y - 12, `${bit.label} HIT! HP:${bit.hp}`);

          if (bit.hp === 0) {
            bit.broken = true;
            Particles.triggerArmorBreakEffect(state, "bit_unit", dynBit.x, dynBit.y);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 24 },
              { expr: "shout", frames: 28 },
              { expr: "wince", frames: 32 }
            ]);
            Systems.addScore(state, 22000, dynBit.x, dynBit.y, `💥${bit.label} DESTROYED!`);

            const remBits = this.getAllBits(b).filter(x => !x.broken).length;
            if (b.bitLasers) {
              b.bitLasers.triMode = "cooldown";
              b.bitLasers.deltaBitIds = [];
              if (remBits === 3) {
                b.bitLasers.triTimer = 70;
              } else if (remBits >= 1) {
                this.resetSnipeState(b.bitLasers, 72);
              }
            }
            if (remBits === 3) {
              UI.showCutin(`💥【浮遊ビット ${bit.label} 撃墜！】💥<br>残り3機！ 残存3機によるデルタビーム照射が継続！`, 185);
            } else if (remBits === 2) {
              UI.showCutin(`💥【浮遊ビット ${bit.label} 撃墜！】💥<br>デルタビーム解除！ 残存2機が『ロックオン粉砕レーザー』へ移行！<br>赤ロック時に『台揺らし』で回避せよ！`, 215);
            } else if (remBits === 1) {
              UI.showCutin(`💥【浮遊ビット ${bit.label} 撃墜！】💥<br>残り1機！ 最後のビットが単独ロックオン狙撃を続行！`, 185);
            } else {
              UI.showCutin(`💥【全浮遊ビット撃墜完了！】💥<br>ビット兵装壊滅！ ノアの両手吸引出力がさらに上昇！`, 185);
            }
            Systems.dropReward(state, "major", { x: dynBit.x, y: dynBit.y });
            this.checkPhase1Clear(state);
          }
          this.checkSuctionEscalationNotice(state);
        }
        UI.updateHUD(state);
      });
    });

    // 3. 左右の手（通常オープン時はグローブ・バウンスバンパーとして弾く！）
    if (b.hands && b.hands.mode === "open") {
      [b.handL, b.handR].forEach(h => {
        if (ball._handThrowGrace && ball._handThrowGrace > 0) return;
        checkBumper(h, 9.8, () => {
          h.flash = 20;
          if (window.sfx) window.sfx.slingshot();
          Particles.add(state, h.x, h.y, "#ff1493", 14, 4.5);
          Particles.add(state, h.x, h.y, "#00f5d4", 8, 3.5);
          StageCommon.setExpressionSequence(state, [{ expr: "wink", frames: 30 }]);
          Systems.addScore(state, 2800, h.x, h.y - 14, `🖐️${h.label} BOUNCE!`);
        });
      });
    }

    // 4A. 腰部サイバーポート [▭]（当てるとお尻〜太ももが激しく揺れ、HP0で過負荷ブレイク！）
    const hPort = b.hipPort;
    if (hPort) {
      checkBumper(hPort, 9.8, () => {
        hPort.flash = 22;
        const impX = (ball.vx > 0 ? 1 : -1) * 3.8;
        const impY = Math.abs(ball.vy) * 0.65 + 2.8;
        this.impulseHip(state, impX, impY, true);

        if (!hPort.broken && hPort.hp > 0) {
          hPort.hp--;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, hPort.x, hPort.y, "#00f5d4", 14, 4.5);
          Systems.addScore(state, 3600, hPort.x, hPort.y - 12, `HIP PORT! HP:${hPort.hp}`);

          if (hPort.hp === 0) {
            hPort.broken = true;
            state.baseMultiplier += 0.3;
            Particles.triggerArmorBreakEffect(state, "hip_port", hPort.x, hPort.y);
            Systems.addScore(state, 20000, hPort.x, hPort.y, "💥HIP LOCK OVERLOAD!!");
            UI.showCutin("♥【腰部サイバーポート過負荷！】♥<br>ヒップ感度リミッター解除＆スコア倍率+0.3x！", 190);
            Systems.dropReward(state, "major", 3);
          }
          this.checkSuctionEscalationNotice(state);
        } else {
          if (window.sfx) window.sfx.exSpark();
          Particles.add(state, hPort.x, hPort.y, "#e6ff00", 14, 4.5);
          Systems.addScore(state, 4200, hPort.x, hPort.y - 12, "⚡HIP SPARK & BOING!");
        }
        UI.updateHUD(state);
      });
    }

    // 5B. 太もものガーターリボン飾り（ジェム付きリボンに当たるとリボンが弾み、釣られて太もも＆お尻がぷるんと揺れる！）
    const gr = b.garterRibbon;
    if (gr) {
      const tx = b.thigh ? b.thigh.dx * 0.35 : 0;
      const ty = b.thigh ? b.thigh.dy * 0.35 : 0;
      const cx = gr.x + tx;
      const cy = gr.y + ty;
      const dx = ball.x - cx;
      const dy = ball.y - cy;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + gr.r;

      if (dist < minDist && dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cx + nx * (minDist + 1.5);
        ball.y = cy + ny * (minDist + 1.5);

        const normalSpd = ball.vx * nx + ball.vy * ny;
        const tanX = -ny;
        const tanY = nx;
        const tanSpd = ball.vx * tanX + ball.vy * tanY;
        const restitution = state.fever.active ? 1.05 : 0.85;
        const newNormal = Math.max(8.2, -normalSpd * restitution);
        ball.vx = nx * newNormal + tanX * tanSpd * 0.94;
        ball.vy = ny * newNormal + tanY * tanSpd * 0.94;

        if (window.sfx) window.sfx.slingshot();
        Particles.add(state, cx, cy, "#00f5d4", 8, 3.6);
        this.impulseHip(state, -nx * 4.8, -ny * 4.8, true);
        const multBonus = (b.hipPort && b.hipPort.broken) ? 4500 : 2800;
        Systems.addScore(state, multBonus, cx, cy - 12, "🎀RIBBON BOING!");
      }
    }

    // 4C. 左下の浮いたパープルブーツ「BOOT」（自然な方向反発バンパー：上側から当たった時のみ軽く跳ね返す）
    const boot = b.bootKicker;
    if (boot) {
      checkBumper(boot, 9.2, () => {
        boot.flash = 20;
        if (ball.y < boot.y - 4 && ball.vy > -6.5) {
          ball.vy = -7.8;
        }
        // 蹴り返しの反動で太もも・お尻も軽く揺れる
        if (b.thigh) { b.thigh.vy -= 2.4; b.thigh.vx += 1.4; }
        if (b.hipButt) { b.hipButt.vy -= 1.8; }

        if (window.sfx) window.sfx.slingshot();
        Particles.add(state, boot.x, boot.y, "#00f5d4", 12, 4.4);
        Particles.add(state, boot.x, boot.y, "#ff1493", 8, 3.6);
        Systems.addScore(state, 2400, boot.x, boot.y - 14, "👢BOOT BOUNCE!");
      });
    }

    // 5. 手前の右膝当てアーマー（Phase 1 破壊対象 HP: 7、破壊後はバウンスポイント）
    const knee = b.kneePad;
    if (knee) {
      checkBumper(knee, 9.6, () => {
        knee.flash = 22;
        if (!knee.broken && knee.hp > 0) {
          knee.hp--;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, knee.x, knee.y, "#b84dff", 16, 4.8);
          StageCommon.setExpressionSequence(state, [
            { expr: "wince", frames: 24 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, 3500, knee.x, knee.y - 14, `KNEE PAD! HP:${knee.hp}`);

          if (knee.hp === 0) {
            knee.broken = true;
            Particles.triggerArmorBreakEffect(state, "knee_armor", knee.x, knee.y);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 26 },
              { expr: "shout", frames: 28 },
              { expr: "open_blush", frames: 48 }
            ]);
            Systems.addScore(state, 25000, knee.x, knee.y, "★KNEE PAD PURGED!★");
            UI.showCutin("💥【右膝当てアーマー大破！】💥<br>ニーパッド装甲パージ！ 両手の吸引出力が上昇！", 190);
            Systems.dropReward(state, "major", { x: knee.x, y: knee.y });
            this.checkPhase1Clear(state);
          }
          this.checkSuctionEscalationNotice(state);
        } else {
          if (window.sfx) window.sfx.slingshot();
          Particles.add(state, knee.x, knee.y, "#ff66b2", 12, 4.0);
          Systems.addScore(state, 2400, knee.x, knee.y - 12, "⚡KNEE BOUNCE!");
        }
        UI.updateHUD(state);
      });
    }

    if (ball._bustGrace > 0) ball._bustGrace--;
    if (ball._coreGrace > 0) ball._coreGrace--;

    // 6. 胸部ビスチェ装甲（Phase 2 破壊対象 HP: 9：装着中も胸全体が軽くぷるっと揺れる！） ＆ パージ後の大揺れソフトバスト
    if (!b.chestArmorBroken) {
      [
        { side: "L", cup: b.bustL, other: b.bustR },
        { side: "R", cup: b.bustR, other: b.bustL }
      ].forEach(({ side, cup, other }) => {
        checkBumper(cup, 9.4, () => {
          // ビスチェ越しでもはっきり視認できる軽いぷるっ揺れを付与
          const dxHit = ball.x - cup.x;
          const dyHit = ball.y - cup.y;
          const dLen = Math.hypot(dxHit, dyHit) || 1;
          const impX = -(dxHit / dLen) * 5.2;
          const impY = -(dyHit / dLen) * 5.4 - 1.0;
          cup.vx += impX;
          cup.vy += impY;
          if (other) {
            other.vx += impX * 0.48;
            other.vy += impY * 0.52;
          }

          if (ball._bustGrace > 0) return;
          ball._bustGrace = 8;
          cup.flash = 20;
          if (window.sfx) window.sfx.softPuru();

          if (state.phase < 2) {
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#00f5d4", 10, 3.8);
            Systems.addScore(state, 1200, cup.x, cup.y - 14, "🛡️KNEE LOCK!");
          } else if (b.chestArmorHP > 0) {
            b.chestArmorHP--;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#ff1493", 18, 5.0);
            StageCommon.setExpressionSequence(state, [
              { expr: "shock", frames: 18 },
              { expr: "wince", frames: 24 },
              { expr: "open_blush", frames: 40 }
            ]);

            if (b.chestArmorHP === 0) {
              this.triggerChestPurge(state);
            } else {
              Systems.addScore(state, 4500, cup.x, cup.y - 14, `BUSTIER HIT! HP:${b.chestArmorHP}`);
              this.checkSuctionEscalationNotice(state);
            }
          }
          UI.updateHUD(state);
        });
      });
    } else {
      // 胸部装甲パージ後：左右ソフトバスト弾性ぷるぷるバウンス！
      [
        { side: "L", cup: b.bustL },
        { side: "R", cup: b.bustR }
      ].forEach(({ side, cup }) => {
        const cx = cup.x + cup.dx;
        const cy = cup.y + cup.dy;
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + cup.r;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = cx + nx * (minDist + 1.4);
          ball.y = cy + ny * (minDist + 1.4);

          const normalSpd = ball.vx * nx + ball.vy * ny;
          const tanX = -ny;
          const tanY = nx;
          const tanSpd = ball.vx * tanX + ball.vy * tanY;
          const restitution = state.fever.active ? 1.05 : 0.78;
          const newNormal = Math.max(7.2, -normalSpd * restitution);
          ball.vx = nx * newNormal + tanX * tanSpd * 0.94;
          ball.vy = ny * newNormal + tanY * tanSpd * 0.94;

          // 谷間V字ポケットへの滞留防止：内向き法線で挟まれかけた球は斜め上外方へ弾き出す
          if ((side === "L" && nx > 0.25 && ny < 0) || (side === "R" && nx < -0.25 && ny < 0)) {
            const escSign = ball.x < 199 ? -1 : 1;
            ball.vx = escSign * Math.max(4.6, Math.abs(ball.vx));
            ball.vy = Math.min(-8.8, ball.vy);
          }

          if (!(ball._bustGrace > 0)) {
            ball._bustGrace = 8;
            this.impulseBust(state, side, -nx * 7.2, -ny * 7.2);
            Systems.addScore(
              state,
              state.fever.active ? 6000 : 3000,
              cx,
              cy - 14,
              state.fever.active ? "♥HYPER BOING♥" : "♥PURU-PURU♥"
            );
          }
        }
      });
    }

    // 7. 首元のグリーンのペンダント・コア（Phase 3 解錠時のみ当たり判定有効：谷間との多重反射ハマりを完全防止）
    const core = b.core;
    if (core && state.phase === 3 && core.unlocked && core.hp > 0) {
      checkBumper(core, 9.0, () => {
        // 下側（胸の谷間方向）へ弾かれた際は斜め横方向へ大きく逃がして往復ピンポンを完全防止
        if (ball.y > core.y - 2) {
          const sideSign = ball.x >= core.x ? 1 : -1;
          ball.vx = sideSign * 7.8;
          ball.vy = 4.2;
        }
        if (ball._coreGrace > 0) return;
        ball._coreGrace = 8;

        core.hp--;
        core.flash = 26;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, core.x, core.y, "#00f5d4", 26, 6.0);
        Particles.add(state, core.x, core.y, "#e6ff00", 18, 5.0);
        StageCommon.setExpressionSequence(state, [
          { expr: "shock", frames: 22 },
          { expr: "shout", frames: 28 },
          { expr: "open_blush", frames: 55 }
        ]);
        Systems.addScore(state, 12000, core.x, core.y - 18, `💥PENDANT CORE! HP:${core.hp}`);

        if (core.hp === 0) {
          this.triggerClear(state, engine);
        }
        UI.updateHUD(state);
      });
    }
  },

  checkPhase1Clear(state) {
    const b = state.boss;
    // ビット4機はビスチェより長生きする独立護衛兵装とし、右膝当てアーマー破壊で Phase 2（胸部ビスチェ攻撃）を解禁！
    if (b.kneePad.broken && state.phase === 1) {
      state.phase = 2;
      this.checkSuctionEscalationNotice(state);
      if (window.sfx) window.sfx.burstTrigger();
      Particles.add(state, 198, 260, "#00f5d4", 36, 7.0);
      Particles.add(state, 198, 260, "#ff1493", 32, 6.5);
      StageCommon.setExpressionSequence(state, [
        { expr: "shock", frames: 30 },
        { expr: "shout", frames: 36 },
        { expr: "wince", frames: 48 }
      ]);
      UI.showCutin("💥【PHASE 1 突破！ 右膝当てアーマー大破！】💥<br>胸部ビスチェのロック解除！ ビットの弾幕をかいくぐり胸を狙え！", 220);
      Systems.dropReward(state, "rare", 2);
      UI.updateHUD(state);
    }
  },

  triggerChestPurge(state) {
    const b = state.boss;
    b.chestArmorBroken = true;
    b.allArmorsPurged = true;
    state.phase = 3;
    b.core.unlocked = true;
    this.checkSuctionEscalationNotice(state);

    Particles.triggerArmorBreakEffect(state, "chest", 198, 278);
    Particles.add(state, 198, 278, "#ff1493", 50, 8.5);
    Particles.add(state, 198, 278, "#00f5d4", 45, 8.0);
    Particles.add(state, 198, 278, "#ffffff", 40, 7.5);

    b.bustL.vx = -4.5;
    b.bustL.vy = -8.5;
    b.bustR.vx = 4.5;
    b.bustR.vy = -8.5;
    b.hipButt.vy = -5.0;

    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 32 },
      { expr: "shout", frames: 36 },
      { expr: "open_blush", frames: 999 }
    ]);

    Systems.addScore(state, 45000, 198, 270, "★CYBER BUSTIER PURGED!! +45,000★");
    UI.showCutin("💥【大ブレイク！ 胸部パージ＆両手吸引MAX暴走！】💥<br>首元ペンダント解錠！ 必死の吸引ガードをかいくぐりコアを撃て！", 260);
    Systems.dropReward(state, "rare", 3);
    Systems.dropReward(state, "major", 4);
    Systems.startFeverMode(state);
    UI.updateHUD(state);
  },

  triggerClear(state, engine) {
    if (state.stageCleared) return;
    const b = state.boss;
    if (b.hands) {
      this.releaseCapturedBall(b.hands);
    }
    if (b.bitLasers) {
      b.bitLasers.shortLasers = [];
      b.bitLasers.triMode = "cooldown";
      b.bitLasers.deltaBitIds = [];
      if (typeof this.resetSnipeState === "function") {
        this.resetSnipeState(b.bitLasers, 180);
      }
    }

    StageCommon.startClearSequence(state, Physics.TABLE_WALLS);

    if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
    UI.showCutin("💥【CRITICAL K.O.】💥<br>ノアの中枢ペンダント臨界崩壊！ 電脳空間シャットダウン！", 240);
    const coreX = (b && b.core) ? b.core.x : 198;
    const coreY = (b && b.core) ? b.core.y : 330;
    Particles.add(state, coreX, coreY, "#00f5d4", 70, 10.5);
    Particles.add(state, coreX, coreY, "#ff1493", 70, 9.5);
    Particles.add(state, coreX, coreY, "#ffffff", 70, 10.0);

    b.expression = "open_blush";
    b.expressionTimer = 9999;

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
  }
});

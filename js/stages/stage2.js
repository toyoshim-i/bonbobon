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
    hologramImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    this.assets.bareImg.src = "./assets/stage2/centerpiece.jpg";
    this.assets.armoredImg.src = "./assets/stage2/centerpiece.jpg";

    if (window.STAGE2_HOLOGRAM_DATA) {
      this.assets.hologramImg.src = window.STAGE2_HOLOGRAM_DATA;
    } else {
      this.assets.hologramImg.src = "./assets/stage2/hologram.png";
    }

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

      // 1. カチューシャのアンテナ先端（周期電撃バリア ＆ 通過ゲート）
      // 原画 768x1376 の (625, 125) に正確に配置
      antenna: {
        x: 312,
        y: 75,
        r: 18,
        timer: 0,
        cycle: 190,          // 190フレーム周期 (~3.1秒)
        activeDuration: 65,  // 放電時間
        warningDuration: 30, // 予兆警告時間
        flash: 0,
        isWarning: false,
        isActive: false
      },

      // 2. 左手奥のホログラム（ラスターグリッジ ＆ 間欠防衛レーザー砲）
      // 原画 768x1376 の (102, 389) に正確に配置
      hologram: {
        x: 64,
        y: 198,
        r: 26,
        glitchShift: 0,
        laserState: "idle",  // "idle" | "charge" | "fire"
        laserTimer: 0,
        cooldown: 200,       // 次の発射までの間隔
        beamAngle: Math.PI * 0.35, // 照準角度
        beamEndX: 420,
        beamEndY: 450,
        isLocked: false,     // 発射直前ロックオン状態
        flash: 0
      },

      // 3. バウンスポイント：肩（左肩＆右肩）
      // 左肩: 原画 (340, 573) -> キャンバス (177, 284)
      shoulderL: {
        x: 177,
        y: 284,
        r: 26,
        hp: 8,
        broken: false,
        flash: 0,
        rot: 0
      },
      // 右肩: 原画 (538, 564) -> キャンバス (271, 280)
      shoulderR: {
        x: 271,
        y: 280,
        r: 26,
        hp: 8,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 4. バウンスポイント：肘（左肘＆右肘）
      // 左肘: 原画 (200, 835) -> キャンバス (111, 407)
      elbowL: {
        x: 111,
        y: 407,
        r: 20,
        flash: 0,
        rot: 0
      },
      // 右肘: 原画 (722, 776) -> キャンバス (358, 379)
      elbowR: {
        x: 358,
        y: 379,
        r: 20,
        flash: 0,
        rot: 0
      },

      // 5. 胸の先端（バネ振動 ＆ 背中ジェット噴射トリガーセンサー）
      // 原画 (205, 680) -> キャンバス (113, 334)
      tipBust: {
        x: 113,
        y: 334,
        r: 16,
        hp: 6,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        flash: 0,
        rot: 0
      },

      // 6. 背中ジェット噴射ノズル
      // 原画 (507, 766) -> キャンバス (256, 375)
      jet: {
        x: 256,
        y: 375,
        r: 26,
        active: false,
        timer: 0
      },

      // 7. 左足付け根の丸いパーツ（追加バウンスポイント）
      // 原画 (298, 1091) -> キャンバス (157, 527)
      hipJointL: {
        x: 157,
        y: 527,
        r: 28,
        flash: 0,
        rot: 0
      },

      // 8. お尻（バネ振動スプリング）
      // 原画 (490, 1080) -> キャンバス (248, 521)
      butt: {
        x: 248,
        y: 521,
        r: 48,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0
      },

      defeatTriggered: false
    };
  },

  update(state, engine) {
    if (!state.boss) return;

    // 1. 自然な瞬きと表情制御
    if (state.boss.blinkDuration > 0) {
      state.boss.blinkDuration--;
    } else if (state.boss.blinkTimer > 0) {
      state.boss.blinkTimer--;
    } else {
      // 瞬き開始（約10フレーム = 0.16秒）
      state.boss.blinkDuration = 10;
      state.boss.blinkTimer = 90 + Math.floor(Math.random() * 90);
    }

    // ランダムなウインク（約5秒に1回）
    if (state.boss.winkTimer > 0) {
      state.boss.winkTimer--;
    } else if (Math.random() < 0.003 && state.boss.expression === "normal") {
      state.boss.winkTimer = 28;
    }

    if (state.boss.talkTimer > 0) state.boss.talkTimer--;
    if (state.boss.expressionTimer > 0) {
      state.boss.expressionTimer--;
      if (state.boss.expressionTimer <= 0) {
        state.boss.expression = "normal";
      }
    }

    // 2. 胸のバネ物理（ぷるぷる振動）
    const bust = state.boss.tipBust;
    if (bust) {
      const stiffness = 0.12;
      const damping = 0.88;
      const ax = -stiffness * bust.dx;
      const ay = -stiffness * bust.dy;
      bust.vx = (bust.vx + ax) * damping;
      bust.vy = (bust.vy + ay) * damping;
      bust.dx += bust.vx;
      bust.dy += bust.vy;
      bust.dx = Math.max(-14, Math.min(14, bust.dx));
      bust.dy = Math.max(-14, Math.min(14, bust.dy));
    }

    // 3. お尻のバネ物理（ぷるんぷるん振動）
    const butt = state.boss.butt;
    if (butt) {
      const stiffness = 0.12;
      const damping = 0.87;
      const ax = -stiffness * butt.dx;
      const ay = -stiffness * butt.dy;
      butt.vx = (butt.vx + ax) * damping;
      butt.vy = (butt.vy + ay) * damping;
      butt.dx += butt.vx;
      butt.dy += butt.vy;
      butt.dx = Math.max(-16, Math.min(16, butt.dx));
      butt.dy = Math.max(-16, Math.min(16, butt.dy));
    }

    // 4. カチューシャのアンテナ先端の周期放電サイクル
    const ant = state.boss.antenna;
    if (ant) {
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

    // 5. 左手奥ホログラムのラスターグリッジ ＆ レーザー発射
    const holo = state.boss.hologram;
    if (holo) {
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

        // チャージスパーク粒子
        if (Math.random() < 0.6) {
          const ca = Math.random() * Math.PI * 2;
          const cr = 24 + Math.random() * 16;
          state.particles.push({
            x: holo.x + Math.cos(ca) * cr,
            y: holo.y + Math.sin(ca) * cr,
            vx: -Math.cos(ca) * 3.0,
            vy: -Math.sin(ca) * 3.0,
            color: holo.isLocked ? "#ff0055" : "#ff007f",
            life: 12,
            scale: holo.isLocked ? 1.4 : 1.0
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "fire";
          holo.laserTimer = 36; // 36フレーム照射
          holo.flash = 35;
          if (window.sfx && window.sfx.metalBumper) {
            window.sfx.metalBumper();
          }
          UI.showCutin("⚡【ホログラムレーザー発砲！】⚡<br>高速移動で射線を回避せよ！", 140);
        }
      } else if (holo.laserState === "fire") {
        holo.laserTimer--;

        const endPt = this.getLaserEndPoint(holo, (engine && engine.W) || 420, (engine && engine.H) || 660);
        holo.beamEndX = endPt.x;
        holo.beamEndY = endPt.y;

        // レーザービーム線分衝突判定（画面端までしっかり伸ばして判定）
        const beamStartX = holo.x;
        const beamStartY = holo.y;
        const beamEndX = holo.beamEndX;
        const beamEndY = holo.beamEndY;

        state.balls.forEach(ball => {
          const hit = Physics.checkCapsuleHit(ball, beamStartX, beamStartY, beamEndX, beamEndY, 9.5);
          if (hit) {
            // ボールが低速で逃げ切れなかった場合：強烈にノックバック＆吹き飛ばし！
            ball.x = hit.qx + hit.nx * (hit.minDist + 2.0);
            ball.y = hit.qy + hit.ny * (hit.minDist + 2.0);
            ball.vx = hit.nx * 16.5;
            ball.vy = hit.ny * 16.5;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, ball.x, ball.y, "#00f5d4", 18, 5.5);
            Particles.add(state, ball.x, ball.y, "#ffffff", 12, 4.5);
            Systems.addScore(state, 5000, ball.x, ball.y, "⚡LASER HIT! +5,000⚡");
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
              Systems.addScore(state, 3000, ball.x, ball.y, "✨DODGE BONUS! +3,000✨");
              Particles.add(state, ball.x, ball.y, "#e6ff00", 12, 3.5);
            }
          }
        });

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
        }
      }
    }

    // 6. 背中ジェット噴射機構
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

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

      state.balls.forEach(ball => {
        const dx = ball.x - jet.x;
        const dy = ball.y - jet.y;
        const dist = Math.hypot(dx, dy);
        const blastRadius = 175;

        if (dist < blastRadius && dist > 1.0) {
          const force = 13.0 * Math.pow(1.0 - dist / blastRadius, 1.25);
          ball.vx += (dx / dist) * force;
          ball.vy += (dy / dist) * force;

          const spd = Math.hypot(ball.vx, ball.vy);
          if (spd > 22.0) {
            ball.vx = (ball.vx / spd) * 22.0;
            ball.vy = (ball.vy / spd) * 22.0;
          }
        }
      });
    } else if (jet) {
      jet.active = false;
    }

    // Flash decay
    [state.boss.shoulderL, state.boss.shoulderR, state.boss.elbowL, state.boss.elbowR, state.boss.tipBust, state.boss.hipJointL].forEach(t => {
      if (t && t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);

    // 1. カチューシャのアンテナ先端（放電時は弾く、停止時は通り抜け可能！）
    const ant = state.boss.antenna;
    if (ant) {
      const dxA = ball.x - ant.x;
      const dyA = ball.y - ant.y;
      const distA = Math.hypot(dxA, dyA);

      if (distA < ball.r + ant.r) {
        if (ant.isActive) {
          // 放電中：激しい電撃で弾き返す！
          checkBumper(ant, 11.5, () => {
            ant.flash = 24;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, ant.x, ant.y, "#00f5d4", 18, 5.0);
            Particles.add(state, ant.x, ant.y, "#e6ff00", 12, 4.0);
            state.boss.expression = "shock";
            state.boss.expressionTimer = 50;
            Systems.addScore(state, 4000, ant.x, ant.y, "⚡ELECTRIC SHOCK REPEL!⚡");
          });
        } else {
          // 電撃停止中：通り抜け可能！ オービットゲート通過ボーナス
          if (!ball._passedAntennaGate) {
            ball._passedAntennaGate = true;
            Systems.addScore(state, 8000, ant.x, ant.y, "★ORBIT GATE CLEAR!!★");
            Particles.addPopup(state, ant.x, ant.y - 14, "★GATE PASS +8000★", "#e6ff00", 1.1);
            if (window.sfx) window.sfx.capsuleCatch();
          }
        }
      } else {
        ball._passedAntennaGate = false;
      }
    }

    // 2. バウンスポイント：肩（左肩＆右肩）
    const handleShoulderHit = (sh, sideLabel) => {
      checkBumper(sh, 9.5, () => {
        sh.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, sh.x, sh.y, "#00f5d4", 18, 5.0);

        if (sh.hp > 0) {
          sh.hp--;
          state.boss.expression = "wince";
          state.boss.expressionTimer = 45;
          Systems.addScore(state, 3000, sh.x, sh.y, `${sideLabel} SHOULDER! HP:${sh.hp}`);
          if (sh.hp === 0) {
            sh.broken = true;
            Particles.triggerArmorBreakEffect(state, sideLabel.toLowerCase() + "_shoulder", sh.x, sh.y);
            UI.showCutin(`💥【${sideLabel}肩装甲大破！】💥<br>肩部装甲パージ！ +30,000pts ボーナス！`, 200);
            Systems.addScore(state, 30000, sh.x, sh.y, `★${sideLabel} SHOULDER PURGED!★`);
            Systems.spawnFloatingCapsule(state, 2, "buff");
          }
        } else {
          Systems.addScore(state, 3500, sh.x, sh.y, `⚡${sideLabel} SHOULDER SPARK!`);
        }
      });
    };

    if (state.boss.shoulderL) handleShoulderHit(state.boss.shoulderL, "L");
    if (state.boss.shoulderR) handleShoulderHit(state.boss.shoulderR, "R");

    // 3. バウンスポイント：肘（左肘＆右肘）
    const handleElbowHit = (elb, sideLabel) => {
      checkBumper(elb, 9.8, () => {
        elb.flash = 20;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, elb.x, elb.y, "#e6ff00", 16, 4.5);
        state.boss.expression = "wince";
        state.boss.expressionTimer = 40;
        Systems.addScore(state, 3500, elb.x, elb.y, `⚡${sideLabel} ELBOW DEFLECT!`);
      });
    };

    if (state.boss.elbowL) handleElbowHit(state.boss.elbowL, "L");
    if (state.boss.elbowR) handleElbowHit(state.boss.elbowR, "R");

    // 4. 胸の先端（バネ振動 ＆ 背中ジェット暴走トリガーセンサー）
    const bust = state.boss.tipBust;
    if (bust) {
      checkBumper(bust, 8.5, () => {
        bust.flash = 22;
        bust.vx += (ball.vx || 2.5) * 1.3;
        bust.vy += (ball.vy || -3.0) * 1.3;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, bust.x, bust.y, "#ff1493", 18, 5.0);
        Particles.spawnHeart(state, bust.x, bust.y, false);

        state.boss.expression = "open_blush";
        state.boss.expressionTimer = 85;
        state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 30);

        this.triggerJetBlast(state);
        Systems.addScore(state, 12000, bust.x, bust.y, "♥BUST TIP SENSITIVE!♥");
      });
    }

    // 5. 左足付け根の丸いパーツ（追加バウンスポイント ＆ お尻揺れトリガー）
    const hip = state.boss.hipJointL;
    if (hip) {
      checkBumper(hip, 10.0, () => {
        hip.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, hip.x, hip.y, "#00f5d4", 18, 5.0);
        Particles.add(state, hip.x, hip.y, "#ff007f", 12, 4.0);

        // 当たったとき、お尻がぷるんと揺れる！
        const butt = state.boss.butt;
        if (butt) {
          butt.vx += (ball.vx > 0 ? 1 : -1) * 3.8 + (Math.random() - 0.5) * 1.5;
          butt.vy += Math.abs(ball.vy) * 0.9 + 3.2;
        }

        state.boss.expression = "wince";
        state.boss.expressionTimer = 45;
        Systems.addScore(state, 4500, hip.x, hip.y, "⚡HIP CYBER BUMPER!⚡");
      });
    }
  },

  getLaserEndPoint(holo, maxW = 420, maxH = 660) {
    const cos = Math.cos(holo.beamAngle);
    const sin = Math.sin(holo.beamAngle);
    let minT = 1200;

    // x 境界との交点 (右端 maxW または 左端 0)
    if (cos > 1e-4) {
      const t = (maxW - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    } else if (cos < -1e-4) {
      const t = (0 - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    }

    // y 境界との交点 (下端 maxH または 上端 0)
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

    jet.timer = 50;
    if (window.sfx && window.sfx.feverAlarm) {
      window.sfx.feverAlarm();
    }

    UI.showCutin("🚀【背中ジェット噴射！】🚀<br>「ひゃんっ！？ どこ当ててるのバカッ！<br>吹き飛びなさいっっ！！」", 180);

    state.shockwaves.push({
      x: jet.x,
      y: jet.y,
      r: 10,
      maxR: 175,
      color: "#00f5d4",
      alpha: 1.0
    });
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };

    if (!this.assets.loaded || !this.assets.bareImg.complete) {
      ctx.fillStyle = "#120624";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    ctx.save();
    // 1. ベース原画描画
    ctx.drawImage(this.assets.bareImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    const srcScaleX = this.assets.bareImg.width / IMG_BOX.w;
    const srcScaleY = this.assets.bareImg.height / IMG_BOX.h;

    // 2. 胸のぷるぷる揺れ処理（tipBustの振動変形）
    const bust = state.boss.tipBust;
    if (bust && Math.hypot(bust.dx, bust.dy) > 0.3) {
      ctx.save();
      const cx = bust.x + bust.dx;
      const cy = bust.y + bust.dy;
      const scaleX = 1 + (bust.dx * 0.015) - (bust.dy * 0.010);
      const scaleY = 1 + (bust.dy * 0.015) - (bust.dx * 0.010);

      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, -0.2, 0, Math.PI * 2);
      ctx.clip();

      const sx = (bust.x - 24 - IMG_BOX.x) * srcScaleX;
      const sy = (bust.y - 28 - IMG_BOX.y) * srcScaleY;
      const sw = 48 * srcScaleX;
      const sh = 56 * srcScaleY;

      ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -24, -28, 48, 56);
      ctx.restore();
    }

    // 3. お尻のぷるんぷるん揺れ処理（左足付け根ヒット時）
    const butt = state.boss.butt;
    if (butt && Math.hypot(butt.dx, butt.dy) > 0.3) {
      ctx.save();
      const bx = butt.x + butt.dx;
      const by = butt.y + butt.dy;
      const scaleX = 1 + (butt.dx * 0.012) - (butt.dy * 0.008);
      const scaleY = 1 + (butt.dy * 0.012) - (butt.dx * 0.008);

      ctx.translate(bx, by);
      ctx.scale(scaleX, scaleY);
      ctx.beginPath();
      ctx.ellipse(0, 0, 52, 45, 0, 0, Math.PI * 2);
      ctx.clip();

      const sx = (butt.x - 52 - IMG_BOX.x) * srcScaleX;
      const sy = (butt.y - 45 - IMG_BOX.y) * srcScaleY;
      const sw = 104 * srcScaleX;
      const sh = 90 * srcScaleY;

      ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -52, -45, 104, 90);
      ctx.restore();
    }

    // 4. 左手奥ホログラム：対象物（シアンのホログラム投影）のみに限定したラスターグリッジノイズ
    // 重なっている指や背景には一切影響を与えない
    const holo = state.boss.hologram;
    if (holo && this.assets.hologramImg && this.assets.hologramImg.complete) {
      const hx = IMG_BOX.x + (3 / 768) * IMG_BOX.w;
      const hy = IMG_BOX.y + (341 / 1376) * IMG_BOX.h;
      const hw = (129 / 768) * IMG_BOX.w;
      const hh = (123 / 1376) * IMG_BOX.h;

      const slices = 8;
      const sliceH = hh / slices;
      const srcSliceH = this.assets.hologramImg.height / slices;

      for (let i = 0; i < slices; i++) {
        const isGlitching = Math.random() < 0.35 || holo.laserState === "charge";
        const shift = isGlitching ? (Math.random() - 0.5) * 6.5 + (holo.glitchShift || 0) : 0;

        if (Math.abs(shift) > 0.5) {
          ctx.save();
          // シアン/マゼンタの色ズレゴースト
          if (Math.random() < 0.5) {
            ctx.globalAlpha = 0.55;
            ctx.drawImage(
              this.assets.hologramImg,
              0, i * srcSliceH, this.assets.hologramImg.width, srcSliceH,
              hx + shift * 1.4, hy + i * sliceH, hw, sliceH
            );
          }
          ctx.globalAlpha = 0.85;
          ctx.drawImage(
            this.assets.hologramImg,
            0, i * srcSliceH, this.assets.hologramImg.width, srcSliceH,
            hx + shift, hy + i * sliceH, hw, sliceH
          );
          ctx.restore();
        }
      }
    }

    // 5. Dynamic Face Expression Patch
    const isDefeat = state.clearSequence && state.clearSequence.active;
    const activePatchKey = isDefeat ? "open_blush" : (
      state.boss.expression === "open_blush" ? "open_blush" :
      state.boss.expression === "shock" ? "shock" :
      state.boss.expression === "wince" ? "wince" :
      (state.boss.winkTimer > 0 ? "wink" :
      (state.boss.blinkDuration > 0 ? "blink" :
      (state.boss.talkTimer > 0 ? ((state.boss.talkTimer % 12 < 6) ? "talk" : "talk_sm") : null)))
    );

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (270 / 768) * IMG_BOX.w;
      const fy = IMG_BOX.y + (310 / 1376) * IMG_BOX.h;
      const fw = (190 / 768) * IMG_BOX.w;
      const fh = (170 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // 6. 背中ジェット噴射火炎
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

    // 1. カチューシャのアンテナ先端（周期電撃バリア）
    const ant = state.boss.antenna;
    if (ant) {
      ctx.save();
      ctx.translate(ant.x, ant.y);
      if (ant.isActive) {
        // 放電中：ジグザグの電撃アークリング
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const r = ant.r + ((i % 2 === 0) ? 5 : -4) + Math.random() * 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 245, 212, 0.3)";
        ctx.fill();
      } else if (ant.isWarning) {
        // 放電予告（黄色点滅）
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, ant.r + Math.sin(animTick * 0.2) * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 安全・通過可能（青緑の静止リング）
        ctx.strokeStyle = "rgba(0, 245, 212, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, ant.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = ant.isActive ? "#00f5d4" : (ant.isWarning ? "#e6ff00" : "#00f5d4");
      ctx.fillText(ant.isActive ? "⚡SHOCK⚡" : (ant.isWarning ? "⚠️WARNING" : "OPEN GATE"), ant.x, ant.y - ant.r - 3);
      ctx.restore();
    }

    // 2. 左手奥ホログラム（照準＆レーザービーム描画）
    const holo = state.boss.hologram;
    if (holo) {
      drawGuide(holo.x, holo.y, holo.r, "#ff007f", holo.flash, animTick * 0.02, "HOLOGRAM", holo.laserState === "fire" ? "⚡LASER FIRE⚡" : (holo.laserState === "charge" ? "⚠️CHARGING" : "STANDBY"));

      const endPt = this.getLaserEndPoint(holo, 420, 660);
      const ex = holo.beamEndX || endPt.x;
      const ey = holo.beamEndY || endPt.y;

      if (holo.laserState === "charge") {
        ctx.save();
        if (holo.isLocked) {
          // ロックオン確定（発射直前）：警告パルスライン ＆ レティクル固定
          const isPulse = Math.floor(animTick * 0.4) % 2 === 0;
          ctx.strokeStyle = isPulse ? "#ff0055" : "#ffffff";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.moveTo(holo.x, holo.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // 画面端のロックオンマーカー
          ctx.strokeStyle = "#ff0055";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(ex, ey, 9, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = "bold 9px monospace";
          ctx.fillStyle = "#ff0055";
          ctx.textAlign = "center";
          ctx.fillText("⚠️LOCKED", holo.x, holo.y - holo.r - 8);
        } else {
          // 照準追跡中：ピンク破線エイムラインがボールをトラッキング！
          ctx.strokeStyle = "rgba(255, 0, 127, 0.75)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(holo.x, holo.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // 画面端の照準レティクル
          ctx.setLineDash([]);
          ctx.strokeStyle = "#ff007f";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(ex, ey, 5 + Math.sin(animTick * 0.1) * 2, 0, Math.PI * 2);
          ctx.stroke();

          ctx.font = "bold 8px monospace";
          ctx.fillStyle = "#ff007f";
          ctx.textAlign = "center";
          ctx.fillText("AIMING...", holo.x, holo.y - holo.r - 8);
        }
        ctx.restore();
      } else if (holo.laserState === "fire") {
        // 強力なネオンレーザービーム本体が画面端まで貫通！
        ctx.save();

        // 1. 最外殻巨大グロー
        ctx.strokeStyle = "rgba(0, 245, 212, 0.25)";
        ctx.lineWidth = 22.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 2. 中間エナジー層
        ctx.strokeStyle = "rgba(0, 245, 212, 0.80)";
        ctx.lineWidth = 10.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 3. ビーム芯線（超高熱ホワイト）
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 4. 画面端での着弾衝撃波（巨大な光球・フレア）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, ey, 8 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey, 16 + Math.random() * 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    // 3. バウンスポイント：肩（左肩＆右肩）
    const shL = state.boss.shoulderL;
    if (shL) {
      drawGuide(shL.x, shL.y, shL.r, shL.broken ? "#00f5d4" : "#e6ff00", shL.flash, animTick * 0.02, "L-SHOULDER", shL.broken ? "PURGED" : `HP:${shL.hp}`);
    }
    const shR = state.boss.shoulderR;
    if (shR) {
      drawGuide(shR.x, shR.y, shR.r, shR.broken ? "#00f5d4" : "#e6ff00", shR.flash, -animTick * 0.02, "R-SHOULDER", shR.broken ? "PURGED" : `HP:${shR.hp}`);
    }

    // 4. バウンスポイント：肘（左肘＆右肘）
    const elbL = state.boss.elbowL;
    if (elbL) {
      drawGuide(elbL.x, elbL.y, elbL.r, "#e6ff00", elbL.flash, -animTick * 0.02, "L-ELBOW", "DEFLECT");
    }
    const elbR = state.boss.elbowR;
    if (elbR) {
      drawGuide(elbR.x, elbR.y, elbR.r, "#e6ff00", elbR.flash, animTick * 0.02, "R-ELBOW", "DEFLECT");
    }

    // 5. 胸の先端（JET SENSOR）
    const bTip = state.boss.tipBust;
    if (bTip) {
      drawGuide(bTip.x, bTip.y, bTip.r, "#ff1493", bTip.flash, animTick * 0.03, "♥BUST TIP", "⚡JET SENSOR");
    }

    // 6. 左足付け根の丸いパーツ（CYBER BUMP）
    const hip = state.boss.hipJointL;
    if (hip) {
      drawGuide(hip.x, hip.y, hip.r, "#00f5d4", hip.flash, animTick * 0.025, "HIP JOINT", "CYBER BUMP");
    }
  },

  renderHUD(ctx, state) {},
  renderOverlays(ctx, state) {},

  getTargetDesc(state) {
    if (!state.boss) return "---";
    const ant = state.boss.antenna;
    if (ant && ant.isActive) {
      return "⚡アンテナ電撃放電中！ 停止タイミングでゲートを抜けろ！";
    }
    const holo = state.boss.hologram;
    if (holo && holo.laserState === "charge") {
      return holo.isLocked ? "⚠️レーザー照準ロックオン！高速移動で緊急回避せよ！" : "⚠️ホログラム砲台がボールを照準中！停止するな！";
    }
    return "TARGET: 両肩装甲破壊 ＆ 胸・足付け根ヒットでギミック発動！";
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const dtArmR = document.getElementById("dtArmRStatus");
    if (dtArmR) {
      const shR = state.boss.shoulderR;
      dtArmR.textContent = shR.broken ? "💥PURGED!" : `R-SHOULDER (${shR.hp}/8)`;
      dtArmR.className = shR.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtArmL = document.getElementById("dtArmLStatus");
    if (dtArmL) {
      const shL = state.boss.shoulderL;
      dtArmL.textContent = shL.broken ? "💥PURGED!" : `L-SHOULDER (${shL.hp}/8)`;
      dtArmL.className = shL.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtChest = document.getElementById("dtChestStatus");
    if (dtChest) {
      const holo = state.boss.hologram;
      if (holo && holo.laserState === "fire") {
        dtChest.textContent = "⚡LASER FIRE!";
        dtChest.className = "font-bold text-[#ff007f] animate-ping";
      } else if (holo && holo.laserState === "charge") {
        dtChest.textContent = "⚠️CHARGING...";
        dtChest.className = "font-bold text-[#e6ff00]";
      } else {
        dtChest.textContent = "HOLOGRAM STANDBY";
        dtChest.className = "font-bold text-gray-400";
      }
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

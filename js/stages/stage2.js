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

  // 表情アニメーションシーケンス開始ヘルパー
  setExpressionSequence(state, seq) {
    if (!state.boss || !state.boss.faceAnim || !seq || seq.length === 0) return;
    state.boss.faceAnim.sequence = seq;
    state.boss.faceAnim.seqIdx = 0;
    state.boss.faceAnim.seqTimer = seq[0].frames;
    state.boss.expression = seq[0].expr;
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

      // 2. 左手奥のホログラム（内側の小さい丸を中心にしたエネルギー充填＆防衛レーザー砲）
      // 原画 768x1376 の (61, 392) に正確に配置（ホログラム内側の円形コア）
      hologram: {
        x: 45,
        y: 199,
        r: 22,
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
      // 原画 (207, 650) の胸の最先端ピンク突起・ハイライトに正確配置 -> キャンバス (114, 320)
      tipBust: {
        x: 114,
        y: 320,
        r: 15,
        hp: 6,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        flash: 0,
        rot: 0
      },

      // 6. 背中ジェット噴射ノズル
      // 原画 (478, 693) -> キャンバス (243, 340) に正確配置（斜め下方向へ噴射）
      jet: {
        x: 243,
        y: 340,
        angle: Math.PI * 0.38,
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

      // 8. お尻（左右2つの円で近似 ＆ 中心強く周辺馴染ませスプリング）
      buttL: {
        x: 220,
        y: 521,
        rx: 26,
        ry: 30,
        dx: 0, dy: 0, vx: 0, vy: 0
      },
      buttR: {
        x: 262,
        y: 512,
        rx: 26,
        ry: 32,
        dx: 0, dy: 0, vx: 0, vy: 0
      },
      // 互換参照
      get butt() { return this.buttL; },

      // 9. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳）
      catEarL: {
        v1: { x: 168, y: 70 }, // Tip (320, 115)
        v2: { x: 153, y: 91 }, // Base Left (288, 160)
        v3: { x: 183, y: 89 }, // Base Right (352, 155)
        cx: 168, cy: 83, r: 16,
        flash: 0
      },
      catEarR: {
        v1: { x: 247, y: 92 },  // Tip (488, 162)
        v2: { x: 229, y: 112 }, // Base Left (450, 205)
        v3: { x: 262, y: 112 }, // Base Right (518, 205)
        cx: 246, cy: 105, r: 16,
        flash: 0
      },

      // 10. 生き生きとした表情アニメーション制御ステート
      faceAnim: {
        idleTimer: 80,
        blinkFrame: 0,     // 瞬きアニメ進行カウンタ
        talkFrame: 0,      // 口パクカウンタ
        winkFrame: 0,      // ウインクカウンタ
        sequence: null,    // 感情遷移アニメーション [{expr, frames}, ...]
        seqIdx: 0,
        seqTimer: 0
      },

      defeatTriggered: false
    };
  },

  update(state, engine) {
    if (!state.boss) return;

    // 1. 生き生きとした表情アニメーション・リップシンク制御
    const fa = state.boss.faceAnim || (state.boss.faceAnim = {});
    const isTalking = (state.boss.talkTimer > 0) || (state.cutin && state.cutin.timer > 0);

    // 被弾・アクション等の感情遷移アニメーションシーケンス実行中
    if (fa.sequence && fa.sequence.length > 0) {
      fa.seqTimer--;
      if (fa.seqTimer <= 0) {
        fa.seqIdx++;
        if (fa.seqIdx < fa.sequence.length) {
          const step = fa.sequence[fa.seqIdx];
          state.boss.expression = step.expr;
          fa.seqTimer = step.frames;
        } else {
          // シーケンス完了
          fa.sequence = null;
          state.boss.expression = "normal";
        }
      }
    } else {
      // 通常タイマー減衰
      if (state.boss.expressionTimer > 0) {
        state.boss.expressionTimer--;
        if (state.boss.expressionTimer <= 0) {
          state.boss.expression = "normal";
        }
      }

      // アイドル時の自然な表情アニメーション（瞬き・ダブル瞬き・ウインク・吐息）
      if (state.boss.expression === "normal") {
        fa.idleTimer = (fa.idleTimer || 0) - 1;
        if (fa.idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.45) {
            // パチッ（単発瞬き 9フレーム）
            fa.blinkFrame = 9;
            fa.idleTimer = 85 + Math.floor(Math.random() * 80);
          } else if (r < 0.72) {
            // パチパチッ（ダブル瞬き 20フレーム）
            fa.blinkFrame = 20;
            fa.idleTimer = 110 + Math.floor(Math.random() * 90);
          } else if (r < 0.88) {
            // 自信満々の放電ウインク（28フレーム）
            fa.winkFrame = 28;
            fa.idleTimer = 140 + Math.floor(Math.random() * 110);
          } else {
            // ふと口が動く吐息（16フレーム）
            fa.talkFrame = 16;
            fa.idleTimer = 95 + Math.floor(Math.random() * 85);
          }
        }
      }
    }

    if (fa.blinkFrame > 0) fa.blinkFrame--;
    if (fa.winkFrame > 0) fa.winkFrame--;
    if (fa.talkFrame > 0) fa.talkFrame--;
    if (state.boss.talkTimer > 0) state.boss.talkTimer--;

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

    // 3. お尻のバネ物理（左右2つの円で自然に揺れる）
    const updateButtSpring = (b) => {
      if (!b) return;
      const stiffness = 0.13;
      const damping = 0.86;
      const ax = -stiffness * b.dx;
      const ay = -stiffness * b.dy;
      b.vx = (b.vx + ax) * damping;
      b.vy = (b.vy + ay) * damping;
      b.dx += b.vx;
      b.dy += b.vy;
      b.dx = Math.max(-14, Math.min(14, b.dx));
      b.dy = Math.max(-14, Math.min(14, b.dy));
    };
    updateButtSpring(state.boss.buttL);
    updateButtSpring(state.boss.buttR);

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

    // 6. 背中ジェット噴射機構（ノズル開口部から斜め下への指向性超音速噴流）
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

      // ノズル軸方向（斜め右下）への高速火炎プラズマ粒子噴射
      const jetAngle = jet.angle || (Math.PI * 0.38);
      for (let i = 0; i < 4; i++) {
        const spread = (Math.random() - 0.5) * 0.35;
        const pAngle = jetAngle + spread;
        const speed = 7.0 + Math.random() * 8.5;
        state.particles.push({
          x: jet.x + (Math.random() - 0.5) * 8,
          y: jet.y + (Math.random() - 0.5) * 8,
          vx: Math.cos(pAngle) * speed,
          vy: Math.sin(pAngle) * speed,
          color: Math.random() < 0.5 ? "#ffffff" : (Math.random() < 0.6 ? "#00f5d4" : "#e6ff00"),
          life: 14,
          scale: 1.5 + Math.random() * 0.8
        });
      }

      state.balls.forEach(ball => {
        const dx = ball.x - jet.x;
        const dy = ball.y - jet.y;
        const dist = Math.hypot(dx, dy);
        const blastRadius = 210;

        if (dist < blastRadius && dist > 1.0) {
          // ノズル噴射コーン（斜め下方向）への指向性風圧
          const ballAngle = Math.atan2(dy, dx);
          let angleDiff = Math.abs(ballAngle - jetAngle);
          if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

          // 噴流の中心コーン（広がり角90度以内）ほど強力に吹き飛ばす
          const coneFactor = Math.max(0.2, Math.cos(Math.min(Math.PI / 2, angleDiff)));
          const force = 16.0 * Math.pow(1.0 - dist / blastRadius, 1.1) * coneFactor;

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
    } else if (jet) {
      jet.active = false;
    }

    // Flash decay
    [state.boss.shoulderL, state.boss.shoulderR, state.boss.elbowL, state.boss.elbowR, state.boss.tipBust, state.boss.hipJointL, state.boss.catEarL, state.boss.catEarR].forEach(t => {
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
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 16 },
              { expr: "shout", frames: 18 },
              { expr: "wince", frames: 22 }
            ]);
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
          this.setExpressionSequence(state, [
            { expr: "wince", frames: 22 },
            { expr: "talk_sm", frames: 16 }
          ]);
          Systems.addScore(state, 3000, sh.x, sh.y, `${sideLabel} SHOULDER! HP:${sh.hp}`);
          if (sh.hp === 0) {
            sh.broken = true;
            Particles.triggerArmorBreakEffect(state, sideLabel.toLowerCase() + "_shoulder", sh.x, sh.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 20 },
              { expr: "shout", frames: 25 },
              { expr: "wince", frames: 35 }
            ]);
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
        this.setExpressionSequence(state, [
          { expr: "wince", frames: 20 },
          { expr: "talk_sm", frames: 14 }
        ]);
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

        this.setExpressionSequence(state, [
          { expr: "shock", frames: 14 },
          { expr: "wince", frames: 18 },
          { expr: "open_blush", frames: 55 }
        ]);
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

        // 当たったとき、お尻（左右2つの円）が自然にぷるんと揺れる！
        const bL = state.boss.buttL;
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

        this.setExpressionSequence(state, [
          { expr: "shock", frames: 14 },
          { expr: "wince", frames: 22 },
          { expr: "open_blush", frames: 35 }
        ]);
        Systems.addScore(state, 4500, hip.x, hip.y, "⚡HIP CYBER BUMPER!⚡");
      });
    }

    // 6. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳の鋭角エッジリフレクション）
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
          ball.vx = hit.nx * 14.0;
          ball.vy = hit.ny * 14.0;

          ear.flash = 24;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, ball.x, ball.y, "#ff007f", 16, 5.0);
          Particles.add(state, ball.x, ball.y, "#00f5d4", 10, 4.0);

          this.setExpressionSequence(state, [
            { expr: "wink", frames: 35 }
          ]);
          Systems.addScore(state, 3500, ball.x, ball.y, `⚡${earName} CAT EAR BOUNCE!⚡`);
          return;
        }
      }
    };
    checkCatEarBumper(state.boss.catEarL, "L");
    checkCatEarBumper(state.boss.catEarR, "R");
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

    jet.timer = 85;
    jet.active = true;
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

    // 3. お尻のぷるんぷるん揺れ処理（左右2つの円近似 ＆ 中心強く周辺馴染ませ）
    const renderCheekJiggle = (b) => {
      if (!b) return;
      const disp = Math.hypot(b.dx, b.dy);
      if (disp < 0.25) return;

      // 3層同心変形（外周は原画と自然に馴染み、中心ほど強く弾むソフトブレンド）
      const layers = [
        { ratio: 1.00, weight: 0.15, alpha: 0.40 },
        { ratio: 0.72, weight: 0.55, alpha: 0.70 },
        { ratio: 0.42, weight: 1.00, alpha: 1.00 }
      ];

      layers.forEach(layer => {
        ctx.save();
        const curDx = b.dx * layer.weight;
        const curDy = b.dy * layer.weight;
        const cx = b.x + curDx;
        const cy = b.y + curDy;
        const scaleX = 1 + (curDx * 0.012) - (curDy * 0.008);
        const scaleY = 1 + (curDy * 0.012) - (curDx * 0.008);

        ctx.translate(cx, cy);
        ctx.scale(scaleX, scaleY);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.rx * layer.ratio, b.ry * layer.ratio, 0.05, 0, Math.PI * 2);
        ctx.clip();

        const sx = (b.x - b.rx - IMG_BOX.x) * srcScaleX;
        const sy = (b.y - b.ry - IMG_BOX.y) * srcScaleY;
        const sw = b.rx * 2 * srcScaleX;
        const sh = b.ry * 2 * srcScaleY;

        ctx.globalAlpha = layer.alpha;
        ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -b.rx, -b.ry, b.rx * 2, b.ry * 2);
        ctx.restore();
      });
    };
    renderCheekJiggle(state.boss.buttL);
    renderCheekJiggle(state.boss.buttR);

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

    // 5. Dynamic Face Expression Patch (瞬き・ダブル瞬き・ウインク・感情遷移シーケンス・口パク)
    const isDefeat = state.clearSequence && state.clearSequence.active;
    const fa = state.boss.faceAnim || {};
    const isTalking = (state.boss.talkTimer > 0) || (state.cutin && state.cutin.timer > 0);
    const talkCycle = Math.floor(performance.now() * 0.009) % 3;

    let activePatchKey = null;
    if (isDefeat) {
      activePatchKey = "open_blush";
    } else if (state.boss.expression && state.boss.expression !== "normal") {
      activePatchKey = state.boss.expression;
    } else if (isTalking) {
      activePatchKey = (talkCycle === 0) ? "talk" : ((talkCycle === 1) ? "talk_sm" : null);
    } else if (fa.winkFrame > 0) {
      activePatchKey = "wink";
    } else if (fa.blinkFrame > 0) {
      // ダブル瞬き対応 (20..13: 1回目瞬き, 12..8: 薄目開き, 7..0: 2回目瞬き)
      if (fa.blinkFrame > 12 || fa.blinkFrame <= 7) {
        activePatchKey = "blink";
      } else {
        activePatchKey = null;
      }
    } else if (fa.talkFrame > 0) {
      activePatchKey = "talk_sm";
    }

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (270 / 768) * IMG_BOX.w;
      const fy = IMG_BOX.y + (310 / 1376) * IMG_BOX.h;
      const fw = (190 / 768) * IMG_BOX.w;
      const fh = (170 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // 6. 背中ジェット噴射火炎は renderTargets にて最前面レイヤーで描画
    ctx.restore();
  },

  renderTargets(ctx, state, engine) {
    if (!state.boss) return;
    const animTick = (typeof engine === "number") ? engine : (performance.now() * 0.06);

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

    // 1. カチューシャのアンテナ先端（ターゲットマーク不要：放電中・予兆時のみ電撃エフェクトを描画）
    const ant = state.boss.antenna;
    if (ant) {
      if (ant.isActive) {
        // 放電中：激しいプラズマコアと四方八方に走る稲妻アーク放電
        ctx.save();
        ctx.translate(ant.x, ant.y);

        const pulse = 1.0 + Math.sin(performance.now() * 0.08) * 0.25;
        const gradCore = ctx.createRadialGradient(0, 0, 2, 0, 0, 16 * pulse);
        gradCore.addColorStop(0, "#ffffff");
        gradCore.addColorStop(0.35, "rgba(0, 245, 212, 0.90)");
        gradCore.addColorStop(0.7, "rgba(0, 245, 212, 0.40)");
        gradCore.addColorStop(1, "rgba(0, 245, 212, 0)");
        ctx.fillStyle = gradCore;
        ctx.beginPath();
        ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 激しく走る稲妻放電ボルト（5本）
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "#00f5d4";
        ctx.shadowBlur = 8;

        const bolts = 5;
        for (let b = 0; b < bolts; b++) {
          const baseAngle = (b / bolts) * Math.PI * 2 + (performance.now() * 0.006);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          let curX = 0;
          let curY = 0;
          const segments = 4;
          const boltLen = (ant.r + 6 + Math.random() * 8) / segments;
          for (let s = 1; s <= segments; s++) {
            const jag = (Math.random() - 0.5) * 8;
            const a = baseAngle + jag * 0.15;
            curX += Math.cos(a) * boltLen + (Math.random() - 0.5) * 3;
            curY += Math.sin(a) * boltLen + (Math.random() - 0.5) * 3;
            ctx.lineTo(curX, curY);
          }
          ctx.stroke();
        }

        ctx.restore();
      } else if (ant.isWarning) {
        // 放電予兆：アンテナ先端から時折パチパチと散る小スパーク
        if (Math.random() < 0.65) {
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.strokeStyle = Math.random() < 0.5 ? "#ffffff" : "#e6ff00";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#e6ff00";
          ctx.shadowBlur = 6;
          const a = Math.random() * Math.PI * 2;
          const d = 5 + Math.random() * 9;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
          ctx.lineTo(Math.cos(a) * d + (Math.random() - 0.5) * 4, Math.sin(a) * d + (Math.random() - 0.5) * 4);
          ctx.stroke();
          ctx.restore();
        }
      }
      // 安全待機時：ターゲットマークは一切描画しない（原画のまま）
    }

    // 2. 左手奥ホログラム（ターゲット円は廃止し、ド派手なエネルギー充填＆レーザー放射エフェクト）
    const holo = state.boss.hologram;
    if (holo) {
      const endPt = this.getLaserEndPoint(holo, 420, 660);
      const ex = holo.beamEndX || endPt.x;
      const ey = holo.beamEndY || endPt.y;

      // --- エネルギー充填アニメーション ---
      if (holo.laserState === "charge") {
        ctx.save();
        const chargeRatio = Math.max(0, Math.min(1, 1 - (holo.laserTimer / 55)));

        // A. 収縮するエネルギーリング（外側から中心へ吸い込まれるインプロージョン）
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const phase = (animTick * 0.07 + rIdx * 0.33) % 1.0;
          const ringRadius = (1.0 - phase) * 28 + 3;
          ctx.strokeStyle = holo.isLocked ? `rgba(255, 0, 85, ${0.4 + phase * 0.6})` : `rgba(0, 245, 212, ${0.3 + phase * 0.5})`;
          ctx.lineWidth = 1.5 + phase * 1.5;
          ctx.beginPath();
          ctx.arc(holo.x, holo.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // B. 中心プラズマコア（チャージ進行で巨大化＆激しく脈動）
        const coreR = Math.max(2, 4 + chargeRatio * 9 + Math.sin(animTick * 0.4) * 2.5);

        // コア外殻グロー
        const outerR = Math.max(coreR + 2, coreR * 1.8);
        const grad = ctx.createRadialGradient(holo.x, holo.y, 1, holo.x, holo.y, outerR);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, holo.isLocked ? "#ff0055" : "#00f5d4");
        grad.addColorStop(1, "rgba(255, 0, 127, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // コア内核（高熱ホワイト）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, coreR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // C. ロックオン臨界放電アーク（発射直前：中心から周囲へバチバチ放電）
        if (holo.isLocked) {
          ctx.strokeStyle = (Math.floor(animTick * 0.5) % 2 === 0) ? "#ffffff" : "#ff0055";
          ctx.lineWidth = 1.8;
          for (let a = 0; a < 4; a++) {
            const baseAng = a * (Math.PI / 2) + animTick * 0.25;
            const midR = 12 + Math.random() * 6;
            const endR = 20 + Math.random() * 8;
            ctx.beginPath();
            ctx.moveTo(holo.x, holo.y);
            ctx.lineTo(holo.x + Math.cos(baseAng + 0.3) * midR, holo.y + Math.sin(baseAng + 0.3) * midR);
            ctx.lineTo(holo.x + Math.cos(baseAng - 0.2) * endR, holo.y + Math.sin(baseAng - 0.2) * endR);
            ctx.stroke();
          }

          // 警告パルスエイムライン（赤白点滅）
          const isPulse = Math.floor(animTick * 0.4) % 2 === 0;
          ctx.strokeStyle = isPulse ? "#ff0055" : "#ffffff";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(holo.x, holo.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // 画面端のロックオンレティクル
          ctx.strokeStyle = "#ff0055";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(ex, ey, 9, 0, Math.PI * 2);
          ctx.stroke();
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

        // 4. 砲身マズルフレア（大閃光＆十字スターバースト）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, 11 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        // 十字光芒
        ctx.moveTo(holo.x - 24, holo.y); ctx.lineTo(holo.x + 24, holo.y);
        ctx.moveTo(holo.x, holo.y - 24); ctx.lineTo(holo.x, holo.y + 24);
        ctx.stroke();

        // 5. 画面端での着弾衝撃波（巨大な光球・フレア）
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

    // 7. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳の鋭角エッジバンパー）
    const drawCatEar = (ear, label) => {
      if (!ear) return;
      ctx.save();
      const f = ear.flash || 0;
      ctx.strokeStyle = f > 0 ? "#ffffff" : "#ff007f";
      ctx.lineWidth = f > 0 ? 3.0 : 2.0;
      ctx.fillStyle = f > 0 ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 0, 127, 0.22)";

      ctx.beginPath();
      ctx.moveTo(ear.v1.x, ear.v1.y);
      ctx.lineTo(ear.v2.x, ear.v2.y);
      ctx.lineTo(ear.v3.x, ear.v3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 内側サイバースリット
      ctx.strokeStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const midBaseX = (ear.v2.x + ear.v3.x) / 2;
      const midBaseY = (ear.v2.y + ear.v3.y) / 2;
      ctx.moveTo(ear.v1.x, ear.v1.y);
      ctx.lineTo(midBaseX, midBaseY);
      ctx.stroke();

      ctx.font = "bold 8px monospace";
      ctx.fillStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.textAlign = "center";
      ctx.fillText("BOUNCE", ear.cx, ear.cy - 10);
      ctx.restore();
    };
    drawCatEar(state.boss.catEarL, "L-EAR");
    drawCatEar(state.boss.catEarR, "R-EAR");

    // 8. 背中ジェット噴射火炎（ノズル開口部から斜め下への指向性超音速プラズマ噴流）
    const jet = state.boss.jet;
    if (jet && jet.active) {
      ctx.save();
      ctx.translate(jet.x, jet.y);
      const jetAngle = jet.angle || (Math.PI * 0.38);
      ctx.rotate(jetAngle);

      const pulse = 1.0 + Math.sin(performance.now() * 0.05) * 0.18;
      const length = (68 + Math.random() * 22) * pulse;
      const width = 17 * pulse;

      // A. 外層プラズマ火炎プルーム（マゼンタピンク〜シアン）
      const gradPlume = ctx.createLinearGradient(0, 0, length, 0);
      gradPlume.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      gradPlume.addColorStop(0.15, "rgba(0, 245, 212, 0.90)");
      gradPlume.addColorStop(0.55, "rgba(255, 0, 127, 0.65)");
      gradPlume.addColorStop(1, "rgba(255, 0, 127, 0)");

      ctx.fillStyle = gradPlume;
      ctx.beginPath();
      ctx.moveTo(0, -width);
      ctx.lineTo(length, 0);
      ctx.lineTo(0, width);
      ctx.closePath();
      ctx.fill();

      // B. 内層コア火炎（超音速高密度プラズマ：白熱シアン）
      const coreLength = length * 0.65;
      const coreWidth = width * 0.55;
      const gradCore = ctx.createLinearGradient(0, 0, coreLength, 0);
      gradCore.addColorStop(0, "#ffffff");
      gradCore.addColorStop(0.4, "#00f5d4");
      gradCore.addColorStop(1, "rgba(0, 245, 212, 0)");

      ctx.fillStyle = gradCore;
      ctx.beginPath();
      ctx.moveTo(0, -coreWidth);
      ctx.lineTo(coreLength, 0);
      ctx.lineTo(0, coreWidth);
      ctx.closePath();
      ctx.fill();

      // C. ショックダイヤモンド（マッハディスク：3連ひし形衝撃波）
      for (let d = 1; d <= 3; d++) {
        const dx = (length * 0.22) * d;
        const dw = 5.5 * (1 - d * 0.22) * pulse;
        const dh = 7.5 * (1 - d * 0.22) * pulse;
        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.beginPath();
        ctx.moveTo(dx - dw, 0);
        ctx.lineTo(dx, -dh);
        ctx.lineTo(dx + dw, 0);
        ctx.lineTo(dx, dh);
        ctx.closePath();
        ctx.fill();
      }

      // D. ノズル開口部リング
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(0, 0, 4, width * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 2.0;
      ctx.stroke();

      ctx.restore();
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

    const faceMap = {
      normal: "疾風の紫電（余裕）",
      wink: "☆放電ウインク☆",
      shock: "⚡焦りショック!?",
      wince: "痛っ…負けないわ！",
      shout: "⚡全出力プラズマ！",
      open_blush: "♥赤面ハァハァ…♥",
      talk: "通信交信中…",
      talk_sm: "呼吸整え中…"
    };
    const faceEl = document.getElementById("bossFaceStatus");
    if (faceEl) faceEl.textContent = faceMap[state.boss.expression] || "疾風の紫電（余裕）";
  }
};

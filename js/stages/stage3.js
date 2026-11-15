// =========================================================================
// STAGE 3: NOA (電脳空間ノア)
// =========================================================================

window.Stage3 = {
  id: "stage3",
  name: "電脳空間ノア",
  bossName: "ノア (NOA)",

  assets: {
    bareImg: new Image(),
    defeatCgImg: new Image(),
    bitOrbImg: new Image(),
    bgBitTopImg: new Image(),
    bgBitMidLImg: new Image(),
    bgBitMidRImg: new Image(),
    bgAntennaImg: new Image(),
    antennaRodImg: new Image(),
    handLClosedImg: new Image(),
    handRClosedImg: new Image(),
    kneeBrokenImg: new Image(),
    bodyDamageImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  // カチューシャのアンテナ反発設定（今回は電撃なし・揺れて跳ね返す弾性ロッド）
  ANTENNA_BOUNCE: { restitution: 0.76, kick: 2.8, maxSpeed: 13.2 },

  initAssets() {
    const v = "?v=123";
    this.assets.bareImg.src = "./assets/stage3/centerpiece.jpg" + v;
    this.assets.defeatCgImg.src = "./assets/stage3/defeat_cg.jpg" + v;
    this.assets.bitOrbImg.src = "./assets/stage3/bit_orb.png" + v;
    this.assets.bgBitTopImg.src = "./assets/stage3/bg_bit_top.png" + v;
    this.assets.bgBitMidLImg.src = "./assets/stage3/bg_bit_mid_l.png" + v;
    this.assets.bgBitMidRImg.src = "./assets/stage3/bg_bit_mid_r.png" + v;
    this.assets.bgAntennaImg.src = "./assets/stage3/bg_antenna.png" + v;
    this.assets.antennaRodImg.src = "./assets/stage3/antenna_rod.png" + v;
    this.assets.handLClosedImg.src = "./assets/stage3/hand_l_closed.png" + v;
    this.assets.handRClosedImg.src = "./assets/stage3/hand_r_closed.png" + v;
    this.assets.kneeBrokenImg.src = "./assets/stage3/knee_broken.png" + v;
    this.assets.bodyDamageImg.src = "./assets/stage3/body_damage.png" + v;

    this.assets.facePatchImgs = Systems.loadFacePatches(
      "stage3",
      window.STAGE3_FACE_PATCHES,
      ["blink_half", "blink", "wink", "shout", "shock", "wince", "open_blush", "talk", "talk_sm"]
    );

    let count = 0;
    const check = () => {
      count++;
      if (count >= 1) this.assets.loaded = true;
    };
    this.assets.bareImg.onload = check;
    if (this.assets.bareImg.complete && this.assets.bareImg.naturalWidth > 0) {
      this.assets.loaded = true;
    }
  },

  setExpressionSequence(state, seq) {
    if (!state.boss || !state.boss.faceAnim || !seq || seq.length === 0) return;
    state.boss.faceAnim.sequence = seq;
    state.boss.faceAnim.seqIdx = 0;
    state.boss.faceAnim.seqTimer = seq[0].frames;
    state.boss.expression = seq[0].expr;
  },

  createBossState() {
    const makeBit = (id, label, homeX, homeY, r, roamRx, roamRy, minX, maxX, minY, maxY, initTimer, phaseOff) => ({
      id,
      label,
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      fromX: homeX,
      fromY: homeY,
      toX: homeX,
      toY: homeY,
      r,
      hp: 4,
      maxHP: 4,
      broken: false,
      flash: 0,
      rot: 0,
      mode: "pause",      // "pause" | "move"
      timer: initTimer,
      moveDuration: 58,
      roamRx,
      roamRy,
      minX,
      maxX,
      minY,
      maxY,
      phaseOff,
      bobY: 0
    });

    return {
      name: "ノア",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 100,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,
      bustExcitement: 0,
      animTick: 0,

      // 1. 浮遊ビット×3機（初期位置を中心に移動と停止を繰り返し、反射＆HP破壊対応）
      // Upper-Right: 原画 (656, 294) -> キャンバス (326.9, 153.6)
      bitTop: makeBit("bitTop", "BIT-TOP", 326.9, 153.6, 17, 22, 18, 296, 348, 128, 176, 40, 0.0),
      // Mid-Left: 原画 (168, 744) -> キャンバス (95.6, 364.2)
      bitMidL: makeBit("bitMidL", "BIT-L", 95.6, 364.2, 16, 18, 26, 72, 118, 334, 394, 82, 2.1),
      // Mid-Right: 原画 (611, 739.5) -> キャンバス (305.6, 362.1)
      bitMidR: makeBit("bitMidR", "BIT-R", 305.6, 362.1, 17, 19, 26, 282, 325, 332, 392, 22, 4.2),

      // 2. カチューシャのアンテナ（電撃なし・当たると揺れて跳ね返す弾性ロッド）
      // 根元ピボット: 原画 (253, 286) -> キャンバス (135.9, 149.9)
      // 先端初期位置: 原画 (185, 117) -> キャンバス (103.7, 70.8)
      antenna: {
        pivotX: 135.9,
        pivotY: 149.9,
        restTipX: 103.7,
        restTipY: 70.8,
        r: 7.0,
        angle: 0,
        angleVel: 0,
        flash: 0
      },

      // 3. 左右の手（時折吸い込んで閉じ、反対の手からランダムな方向に放り出すワープハンド）
      // 左手掌: 原画 (176, 540) -> キャンバス (99.4, 268.7)
      // 右手掌: 原画 (616, 528) -> キャンバス (308.0, 263.1)
      handL: { x: 99.4, y: 268.7, r: 20, flash: 0, side: "L", label: "L-HAND" },
      handR: { x: 308.0, y: 263.1, r: 20, flash: 0, side: "R", label: "R-HAND" },
      hands: {
        mode: "open",          // "open" | "suction" | "transfer"
        timer: 135,
        suctionRadius: 78,
        catchSide: null,       // "L" | "R"
        exitSide: null,        // "L" | "R"
        capturedBall: null,
        transferTotal: 44,
        handLClosedTimer: 0,
        handRClosedTimer: 0
      },

      // 4. 左右サーバーラック端子バウンスノード（破壊不能バウンス＋LEDスキャン演出）
      rackL: { x: 54, y: 335, r: 12, flash: 0, scanTimer: 0, label: "SERVER-L" },
      rackR: { x: 342, y: 335, r: 12, flash: 0, scanTimer: 0, label: "SERVER-R" },

      // 5. 手前の右膝当てアーマー（Phase 1 破壊対象 HP: 5）
      // 原画 (575, 955) -> キャンバス (288.5, 463.0)
      kneePad: {
        x: 288.5,
        y: 463.0,
        r: 23,
        hp: 5,
        maxHP: 5,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 6. 胸部ビスチェ装甲 ＆ 露出後のソフトバスト（Phase 2 破壊対象 HP: 8）
      // 左胸: 原画 (346, 560) -> (180.0, 278.1), 右胸: 原画 (426, 558) -> (217.9, 277.2)
      chestArmorHP: 8,
      chestArmorMaxHP: 8,
      chestArmorBroken: false,
      allArmorsPurged: false,
      bustL: { x: 180.0, y: 278.1, r: 22, rx: 25, ry: 25, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },
      bustR: { x: 217.9, y: 277.2, r: 19, rx: 21, ry: 23, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },

      // 7. 首元のグリーンのペンダント・コア（Phase 3 最終撃破ターゲット HP: 12）
      // 原画 (380, 461) -> キャンバス (196.1, 231.8)
      core: {
        x: 196.1,
        y: 231.8,
        r: 17,
        hp: 12,
        maxHP: 12,
        unlocked: false,
        flash: 0
      },

      // 8. 表情アニメーション制御ステート
      faceAnim: {
        idleTimer: 75,
        blinkFrame: 0,
        talkFrame: 0,
        winkFrame: 0,
        sequence: null,
        seqIdx: 0,
        seqTimer: 0
      }
    };
  },

  getAntennaEndpoints(ant) {
    const dx0 = ant.restTipX - ant.pivotX;
    const dy0 = ant.restTipY - ant.pivotY;
    const cosA = Math.cos(ant.angle || 0);
    const sinA = Math.sin(ant.angle || 0);
    return {
      ax: ant.pivotX,
      ay: ant.pivotY,
      bx: ant.pivotX + dx0 * cosA - dy0 * sinA,
      by: ant.pivotY + dx0 * sinA + dy0 * cosA
    };
  },

  releaseCapturedBall(hands, restorePos = null) {
    if (!hands || !hands.capturedBall) return;
    const b = hands.capturedBall;
    b._capturedByHand = false;
    if (b._savedR) {
      b.r = b._savedR;
      delete b._savedR;
    } else if (b.r < 4.0) {
      b.r = 6.5;
    }
    if (restorePos) {
      b.x = restorePos.x;
      b.y = restorePos.y;
    }
    hands.capturedBall = null;
    hands.catchSide = null;
    hands.exitSide = null;
  },

  impulseBust(state, which, vxImpact, vyImpact) {
    if (!state.boss) return;
    const b = which === "L" ? state.boss.bustL : state.boss.bustR;
    const other = which === "L" ? state.boss.bustR : state.boss.bustL;
    if (!b || !other) return;

    if (window.sfx) window.sfx.softPuru();
    b.vx += vxImpact * 1.35;
    b.vy += vyImpact * 1.35;
    b.flash = 18;

    other.vx -= vxImpact * 0.45;
    other.vy += vyImpact * 0.45;

    state.boss.blushGauge = Math.min(100, (state.boss.blushGauge || 0) + 18);
    state.boss.bustExcitement = Math.min(100, (state.boss.bustExcitement || 0) + 32);
    state.boss.talkTimer = 36;
    this.setExpressionSequence(state, [
      { expr: "shock", frames: 12 },
      { expr: "wince", frames: 16 },
      { expr: "open_blush", frames: 56 }
    ]);

    Systems.addFever(state, 10);
    Particles.add(state, b.x, b.y, "#ff66b2", 8, 2.8);
    Particles.spawnHeart(state, b.x, b.y, false);
    Systems.addScore(state, 1800, b.x, b.y - 16, "♥ぷるんっ! SOFT");

    // 羞恥ゲージ100%到達で電脳オーバーフローカウンター（カプセル放出）
    if (state.boss.blushGauge >= 100) {
      state.boss.blushGauge = 0;
      this.setExpressionSequence(state, [
        { expr: "shout", frames: 38 },
        { expr: "open_blush", frames: 60 }
      ]);
      if (window.sfx) window.sfx.armorBreak();
      UI.showCutin("⚡「ちょ、ちょっと…っ！ 演算回路がバグっちゃうでしょっ！！」<br>電脳パルス逆流＆アイテムカプセル放出！", 180);
      Particles.add(state, 198, 278, "#00f5d4", 28, 6.0);
      Particles.add(state, 198, 278, "#ff1493", 24, 5.5);
      Systems.dropReward(state, "minor", 5);
      state.balls.forEach(ball => {
        if (!ball.inShooterLane && !ball._capturedByHand) {
          ball.vy = -11.5 - Math.random() * 3.0;
          ball.vx = (Math.random() - 0.5) * 10.0;
        }
      });
    }
    UI.updateHUD(state);
  },

  onNudge(state, nx, ny, intensity) {
    if (!state.boss) return;
    if (state.boss.chestArmorBroken) {
      this.impulseBust(state, "L", nx * 5.0 * intensity, ny * 5.0 * intensity);
      this.impulseBust(state, "R", nx * 5.0 * intensity, ny * 5.0 * intensity);
    } else {
      // 装甲中でもわずかに揺れる
      state.boss.bustL.vx += nx * 2.2 * intensity;
      state.boss.bustL.vy += ny * 2.2 * intensity;
      state.boss.bustR.vx += nx * 2.2 * intensity;
      state.boss.bustR.vy += ny * 2.2 * intensity;
    }
    if (state.boss.antenna) {
      state.boss.antenna.angleVel += nx * 0.08 * intensity;
    }
  },

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

        // 初期位置 (homeX, homeY) を中心とした範囲で次の停止目標を選択
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
      // 滑らかなイーズイン・アウト移動
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
        // しばらく停止（約1.4〜2.1秒）
        bit.timer = 85 + Math.floor(Math.random() * 45);
      }
    }
  },

  updateHands(state) {
    const b = state.boss;
    const hands = b.hands;
    if (!hands) return;

    if (b.handL.flash > 0) b.handL.flash--;
    if (b.handR.flash > 0) b.handR.flash--;
    if (hands.handLClosedTimer > 0) hands.handLClosedTimer--;
    if (hands.handRClosedTimer > 0) hands.handRClosedTimer--;

    // ボールごとのスロー直後再吸引防止グレースタイマー減衰
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
        hands.timer = 165; // 約2.7秒間吸引モード
      }
    } else if (hands.mode === "suction") {
      hands.timer--;

      // 吸引渦パーティクル演出
      if (b.animTick % 3 === 0) {
        [b.handL, b.handR].forEach(h => {
          const ang = Math.random() * Math.PI * 2;
          const dist = 34 + Math.random() * 34;
          state.particles.push({
            x: h.x + Math.cos(ang) * dist,
            y: h.y + Math.sin(ang) * dist,
            vx: -Math.cos(ang) * 2.6,
            vy: -Math.sin(ang) * 2.6,
            color: Math.random() < 0.5 ? "#ff1493" : "#00f5d4",
            life: 12
          });
        });
      }

      // フィールド内のボールを引き寄せ、中心到達でキャッチして握り込む！
      let caught = false;
      for (const ball of state.balls) {
        if (ball.inShooterLane || ball._capturedByHand || (ball._handThrowGrace && ball._handThrowGrace > 0)) continue;

        for (const h of [b.handL, b.handR]) {
          const dx = h.x - ball.x;
          const dy = h.y - ball.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 24) {
            // キャッチ成立！ 手を閉じて反対の手へワープ転送開始
            hands.mode = "transfer";
            hands.transferTotal = 44;
            hands.timer = 44;
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
              hands.handLClosedTimer = 46;
            } else {
              hands.handRClosedTimer = 46;
            }
            h.flash = 22;

            if (window.sfx) window.sfx.capsuleCatch();
            Particles.add(state, h.x, h.y, "#ff1493", 20, 4.8);
            Particles.add(state, h.x, h.y, "#00f5d4", 14, 4.0);
            Systems.addScore(state, 5000, h.x, h.y - 16, `🌀${h.side}-HAND CATCH!`);
            Systems.addFever(state, 8);
            this.setExpressionSequence(state, [
              { expr: "wink", frames: 24 },
              { expr: "talk", frames: 22 }
            ]);
            caught = true;
            break;
          } else if (dist < hands.suctionRadius && dist > 0.5) {
            const ratio = 1 - dist / hands.suctionRadius;
            const pull = 0.56 * Math.pow(ratio, 0.85);
            ball.vx += (dx / dist) * pull;
            ball.vy += (dy / dist) * pull;
            if (dist < 44) {
              ball.vx *= 0.93;
              ball.vy *= 0.93;
            }
          }
        }
        if (caught) break;
      }

      if (!caught && hands.timer <= 0) {
        hands.mode = "open";
        hands.timer = 180 + Math.floor(Math.random() * 45);
      }
    } else if (hands.mode === "transfer") {
      const ball = hands.capturedBall;
      if (!ball || !state.balls.includes(ball)) {
        this.releaseCapturedBall(hands);
        hands.mode = "open";
        hands.timer = 160;
        return;
      }

      const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
      const exitHand = hands.exitSide === "L" ? b.handL : b.handR;

      hands.timer--;
      ball.stuckTimer = 0;
      ball.vx = 0;
      ball.vy = 0;
      ball.trail = [];

      // 転送後半は反対側の手もグッと握り込んでチャージ！
      if (hands.timer <= 22 && hands.timer > 0) {
        if (hands.exitSide === "L") hands.handLClosedTimer = Math.max(hands.handLClosedTimer, 4);
        else hands.handRClosedTimer = Math.max(hands.handRClosedTimer, 4);
      }

      // 両手間の電脳ワープストリーム粒子
      const progress = 1 - hands.timer / hands.transferTotal;
      const arcX = catchHand.x + (exitHand.x - catchHand.x) * progress;
      const arcY = catchHand.y + (exitHand.y - catchHand.y) * progress - Math.sin(progress * Math.PI) * 34;
      ball.x = arcX;
      ball.y = arcY;

      for (let i = 0; i < 2; i++) {
        state.particles.push({
          x: arcX + (Math.random() - 0.5) * 10,
          y: arcY + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2.2,
          vy: (Math.random() - 0.5) * 2.2,
          color: i === 0 ? "#00f5d4" : "#e6ff00",
          life: 11
        });
      }

      if (hands.timer <= 0) {
        // 反対側の手をパッと開いてランダムな方向へ放り出す！
        if (hands.exitSide === "L") hands.handLClosedTimer = 0;
        else hands.handRClosedTimer = 0;

        // センタードレイン直撃角のみわずかに避けつつ全周ランダム方向に射出
        const drainAngle = Math.atan2(615 - exitHand.y, 198 - exitHand.x);
        let throwAngle = Math.random() * Math.PI * 2;
        let diff = Math.atan2(Math.sin(throwAngle - drainAngle), Math.cos(throwAngle - drainAngle));
        if (Math.abs(diff) < 0.26) {
          throwAngle += (diff >= 0 ? 0.36 : -0.36);
        }

        const throwSpeed = 11.8 + Math.random() * 1.4;
        const spawnX = Math.max(28, Math.min(368, exitHand.x + Math.cos(throwAngle) * 24));
        const spawnY = Math.max(44, Math.min(560, exitHand.y + Math.sin(throwAngle) * 24));

        this.releaseCapturedBall(hands, { x: spawnX, y: spawnY });
        ball.vx = Math.cos(throwAngle) * throwSpeed;
        ball.vy = Math.sin(throwAngle) * throwSpeed;
        ball._handThrowGrace = 34;

        exitHand.flash = 26;
        if (window.sfx) window.sfx.plungerLaunch(78);
        state.shockwaves.push({
          x: exitHand.x,
          y: exitHand.y,
          r: 8,
          maxR: 58,
          speed: 4.5,
          color: "#00f5d4",
          lineWidth: 3.0,
          alpha: 1.0
        });
        Particles.add(state, exitHand.x, exitHand.y, "#00f5d4", 22, 6.0);
        Particles.add(state, exitHand.x, exitHand.y, "#e6ff00", 16, 5.0);
        Systems.addScore(state, 8000, exitHand.x, exitHand.y - 18, `⚡${exitHand.side}-HAND THROW!`);
        Systems.addFever(state, 10);

        this.setExpressionSequence(state, [
          { expr: "shout", frames: 22 },
          { expr: "wink", frames: 36 }
        ]);

        hands.mode = "open";
        hands.timer = 190 + Math.floor(Math.random() * 45);
      }
    }
  },

  update(state, engine) {
    if (!state.boss) return;
    const b = state.boss;
    b.animTick = (b.animTick || 0) + 1;

    // 0. クリア演出進行
    this.updateClearSequence(state, engine);

    // 1. 表情アニメーション制御
    const fa = b.faceAnim || (b.faceAnim = {});
    if (fa.sequence && fa.sequence.length > 0) {
      fa.seqTimer--;
      if (fa.seqTimer <= 0) {
        fa.seqIdx++;
        if (fa.seqIdx < fa.sequence.length) {
          const step = fa.sequence[fa.seqIdx];
          b.expression = step.expr;
          fa.seqTimer = step.frames;
        } else {
          fa.sequence = null;
          b.expression = "normal";
        }
      }
    } else {
      if (b.expressionTimer > 0) {
        b.expressionTimer--;
        if (b.expressionTimer <= 0) b.expression = "normal";
      }
      if (b.expression === "normal") {
        fa.idleTimer = (fa.idleTimer || 0) - 1;
        if (fa.idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.56) {
            fa.blinkFrame = 16;
            fa.idleTimer = 125 + Math.floor(Math.random() * 110);
          } else if (r < 0.82) {
            fa.winkFrame = 44;
            fa.idleTimer = 165 + Math.floor(Math.random() * 115);
          } else {
            fa.talkFrame = 24;
            fa.idleTimer = 140 + Math.floor(Math.random() * 100);
          }
        }
      }
    }

    if (fa.blinkFrame > 0) fa.blinkFrame--;
    if (fa.winkFrame > 0) fa.winkFrame--;
    if (fa.talkFrame > 0) fa.talkFrame--;
    if (b.winkTimer > 0) {
      b.winkTimer--;
      fa.winkFrame = Math.max(fa.winkFrame || 0, b.winkTimer);
    }
    if (b.talkTimer > 0) b.talkTimer--;
    if (b.bustExcitement > 0) b.bustExcitement = Math.max(0, b.bustExcitement - 0.25);

    // 2. 浮遊ビット3機の移動＆一時停止サイクル更新
    this.updateBit(b.bitTop, state, b.animTick);
    this.updateBit(b.bitMidL, state, b.animTick);
    this.updateBit(b.bitMidR, state, b.animTick);

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

    // 4. 左右のワープハンド更新
    this.updateHands(state);

    // 5. 胸部2Dバネ物理（ぷるぷる振動）
    const updateBustSpring = (cup) => {
      if (!cup) return;
      const stiffness = 0.20;
      const damping = 0.84;
      cup.vx = (cup.vx - stiffness * cup.dx) * damping;
      cup.vy = (cup.vy - stiffness * cup.dy) * damping;
      cup.dx = Math.max(-14, Math.min(14, cup.dx + cup.vx));
      cup.dy = Math.max(-14, Math.min(14, cup.dy + cup.vy));
      if (cup.flash > 0) cup.flash--;
      cup.rot += 0.02;
    };
    updateBustSpring(b.bustL);
    updateBustSpring(b.bustR);

    if (state.fever.active && b.chestArmorBroken && b.animTick % 12 === 0) {
      b.bustL.vy -= 2.2;
      b.bustR.vy += 2.2;
    }

    // 6. 各部位フラッシュ＆サーバースキャン減衰
    [b.kneePad, b.core, b.rackL, b.rackR].forEach(t => {
      if (!t) return;
      if (t.flash > 0) t.flash--;
      if (t.scanTimer > 0) t.scanTimer--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (!state.boss) return;
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

    if (s !== 0) return;
    if (ball.inShooterLane) return;

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

        // 衝突位置と入射方向に応じた回転トルクでアンテナがビヨンと揺れる
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
        Systems.addFever(state, 6);

        this.setExpressionSequence(state, [
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

    // 2. 浮遊ビット×3機（反射＆HP破壊）
    [b.bitTop, b.bitMidL, b.bitMidR].forEach(bit => {
      if (!bit || bit.broken) return;
      const dynBit = { x: bit.x, y: bit.y + (bit.bobY || 0), r: bit.r };
      checkBumper(dynBit, 10.2, () => {
        bit.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, dynBit.x, dynBit.y, "#00f5d4", 16, 4.8);
        Systems.addFever(state, 5);

        if (state.skillShotEligible && bit.id === "bitTop") {
          state.skillShotEligible = false;
          Systems.addScore(state, 20000, dynBit.x, dynBit.y - 16, "★SKILL SHOT!!");
          Systems.dropReward(state, "rare", 1);
        }

        if (bit.hp > 0) {
          bit.hp--;
          this.setExpressionSequence(state, [
            { expr: "wince", frames: 20 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, 3500, dynBit.x, dynBit.y - 12, `${bit.label} HIT! HP:${bit.hp}`);

          if (bit.hp === 0) {
            bit.broken = true;
            Particles.triggerArmorBreakEffect(state, "bit_unit", dynBit.x, dynBit.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 24 },
              { expr: "shout", frames: 28 },
              { expr: "wince", frames: 32 }
            ]);
            Systems.addScore(state, 22000, dynBit.x, dynBit.y, `💥${bit.label} DESTROYED!`);
            UI.showCutin(`💥【浮遊ビット ${bit.label} 撃墜！】💥<br>自律防衛ノード破壊！ +22,000pts！`, 180);
            Systems.dropReward(state, "major", { x: dynBit.x, y: dynBit.y });
            this.checkPhase1Clear(state);
          }
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
          Systems.addFever(state, 4);
          this.setExpressionSequence(state, [{ expr: "wink", frames: 30 }]);
          Systems.addScore(state, 2800, h.x, h.y - 14, `🖐️${h.label} BOUNCE!`);
        });
      });
    }

    // 4. 左右サーバーラック端子バウンスノード
    [b.rackL, b.rackR].forEach(rk => {
      if (!rk) return;
      checkBumper(rk, 10.4, () => {
        rk.flash = 20;
        rk.scanTimer = 45;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, rk.x, rk.y, "#00f5d4", 14, 4.5);
        Particles.add(state, rk.x, rk.y, "#e6ff00", 8, 3.5);
        Systems.addFever(state, 4);
        Systems.addScore(state, 2600, rk.x, rk.y - 12, `💻${rk.label} HACK!`);
      });
    });

    // 5. 手前の右膝当てアーマー（Phase 1 破壊対象 HP: 5、破壊後はバウンスポイント）
    const knee = b.kneePad;
    if (knee) {
      checkBumper(knee, 9.6, () => {
        knee.flash = 22;
        if (!knee.broken && knee.hp > 0) {
          knee.hp--;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, knee.x, knee.y, "#b84dff", 16, 4.8);
          Systems.addFever(state, 5);
          this.setExpressionSequence(state, [
            { expr: "wince", frames: 24 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, 3500, knee.x, knee.y - 14, `KNEE PAD! HP:${knee.hp}`);

          if (knee.hp === 0) {
            knee.broken = true;
            Particles.triggerArmorBreakEffect(state, "knee_armor", knee.x, knee.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 26 },
              { expr: "shout", frames: 28 },
              { expr: "open_blush", frames: 48 }
            ]);
            Systems.addScore(state, 25000, knee.x, knee.y, "★KNEE PAD PURGED!★");
            UI.showCutin("💥【右膝当てアーマー大破！】💥<br>ニーパッド装甲パージ！ +25,000pts！", 190);
            Systems.dropReward(state, "major", { x: knee.x, y: knee.y });
            this.checkPhase1Clear(state);
          }
        } else {
          if (window.sfx) window.sfx.slingshot();
          Particles.add(state, knee.x, knee.y, "#ff66b2", 12, 4.0);
          Systems.addScore(state, 2400, knee.x, knee.y - 12, "⚡KNEE BOUNCE!");
        }
        UI.updateHUD(state);
      });
    }

    // 6. 胸部ビスチェ装甲（Phase 2 破壊対象 HP: 8） ＆ パージ後のソフトバスト
    if (!b.chestArmorBroken) {
      [
        { side: "L", cup: b.bustL },
        { side: "R", cup: b.bustR }
      ].forEach(({ side, cup }) => {
        checkBumper(cup, 9.4, () => {
          cup.flash = 20;
          // 衝撃で少し揺らす
          cup.vx += (ball.vx || 2.0) * 0.45;
          cup.vy += (ball.vy || -2.5) * 0.45;

          if (state.phase < 2) {
            // Phase 1 中は浮遊ビット＆膝当てによる電磁シールド防御
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#00f5d4", 12, 4.0);
            Systems.addScore(state, 1200, cup.x, cup.y - 14, "🛡️BIT BARRIER!");
          } else if (b.chestArmorHP > 0) {
            b.chestArmorHP--;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#ff1493", 18, 5.0);
            Systems.addFever(state, 6);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 18 },
              { expr: "wince", frames: 24 },
              { expr: "open_blush", frames: 40 }
            ]);

            if (b.chestArmorHP === 0) {
              this.triggerChestPurge(state);
            } else {
              Systems.addScore(state, 4500, cup.x, cup.y - 14, `BUSTIER HIT! HP:${b.chestArmorHP}`);
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

          this.impulseBust(state, side, -nx * 4.4, -ny * 4.4);
          Systems.addScore(
            state,
            state.fever.active ? 6000 : 3000,
            cx,
            cy - 14,
            state.fever.active ? "♥HYPER BOING♥" : "♥PURU-PURU♥"
          );
        }
      });
    }

    // 7. 首元のグリーンのペンダント・コア（Phase 3 最終撃破ターゲット HP: 12）
    const core = b.core;
    if (core) {
      checkBumper(core, 8.8, () => {
        Systems.addFever(state, 6);
        if (state.phase === 3 && core.unlocked && core.hp > 0) {
          core.hp--;
          core.flash = 26;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 26, 6.0);
          Particles.add(state, core.x, core.y, "#e6ff00", 18, 5.0);
          this.setExpressionSequence(state, [
            { expr: "shock", frames: 22 },
            { expr: "shout", frames: 28 },
            { expr: "open_blush", frames: 55 }
          ]);
          Systems.addScore(state, 12000, core.x, core.y - 18, `💥PENDANT CORE! HP:${core.hp}`);

          if (core.hp === 0) {
            this.triggerClear(state, engine);
          }
        } else {
          core.flash = 12;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 10, 3.2);
          Systems.addScore(state, 1500, core.x, core.y - 14, "🔒PENDANT SHIELDED");
        }
        UI.updateHUD(state);
      });
    }
  },

  checkPhase1Clear(state) {
    const b = state.boss;
    const allBitsDown = b.bitTop.broken && b.bitMidL.broken && b.bitMidR.broken;
    if (allBitsDown && b.kneePad.broken && state.phase === 1) {
      state.phase = 2;
      if (window.sfx) window.sfx.burstTrigger();
      Particles.add(state, 198, 260, "#00f5d4", 36, 7.0);
      Particles.add(state, 198, 260, "#ff1493", 32, 6.5);
      this.setExpressionSequence(state, [
        { expr: "shock", frames: 30 },
        { expr: "shout", frames: 36 },
        { expr: "wince", frames: 48 }
      ]);
      UI.showCutin("💥【PHASE 1 突破！ 全ビット＆膝装甲壊滅！】💥<br>胸部バリア解除！ サイバービスチェ装甲を破壊せよ！", 230);
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

    Particles.triggerArmorBreakEffect(state, "chest", 198, 278);
    Particles.add(state, 198, 278, "#ff1493", 50, 8.5);
    Particles.add(state, 198, 278, "#00f5d4", 45, 8.0);
    Particles.add(state, 198, 278, "#ffffff", 40, 7.5);

    b.bustL.vy = -6.5;
    b.bustR.vy = -6.5;

    this.setExpressionSequence(state, [
      { expr: "shock", frames: 32 },
      { expr: "shout", frames: 36 },
      { expr: "open_blush", frames: 999 }
    ]);

    Systems.addScore(state, 45000, 198, 270, "★CYBER BUSTIER PURGED!! +45,000★");
    UI.showCutin("💥【大ブレイク！ 胸部ビスチェ強制パージ！】💥<br>首元のグリーンペンダント・コア解錠！ 全開フィーバー突入！", 260);
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

    state.stageCleared = true;
    state.clearSequence.active = true;
    state.clearSequence.frame = 0;
    state.clearSequence.phase = "shatter";

    if (window.sfx) window.sfx.burstTrigger();
    UI.showCutin("💥【CRITICAL K.O.】💥<br>ノアの中枢ペンダント臨界崩壊！ 電脳空間シャットダウン！", 240);
    Particles.add(state, b.core.x, b.core.y, "#00f5d4", 70, 10.5);
    Particles.add(state, b.core.x, b.core.y, "#ff1493", 70, 9.5);
    Particles.add(state, b.core.x, b.core.y, "#ffffff", 70, 10.0);

    state.clearSequence.shatterPieces = Particles.shatterTableFrame(Physics.TABLE_WALLS);

    b.expression = "open_blush";
    b.expressionTimer = 9999;

    state.balls.forEach(ball => {
      const a = Math.atan2(ball.y - b.core.y, ball.x - b.core.x) + (Math.random() - 0.5) * 0.5;
      const spd = 7.5 + Math.random() * 4.0;
      ball.vx = Math.cos(a) * spd;
      ball.vy = Math.sin(a) * spd - 2.5;
    });
  },

  spawnSmokeCloud(x, y, color = "#00f5d4") {
    return {
      x: x + (Math.random() - 0.5) * 36,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 3.0,
      vy: -1.5 - Math.random() * 2.5,
      r: 20 + Math.random() * 18,
      maxR: 65 + Math.random() * 35,
      growth: 0.75 + Math.random() * 0.65,
      color,
      alpha: 0.1,
      maxAlpha: 0.60 + Math.random() * 0.25,
      life: 80 + Math.floor(Math.random() * 35),
      maxLife: 100
    };
  },

  updateClearSequence(state, engine) {
    if (!state.clearSequence || !state.clearSequence.active) return;
    const seq = state.clearSequence;
    const core = state.boss.core;
    seq.frame++;

    if (seq.frame < 45) {
      state.nudgeOffset.x = (Math.random() - 0.5) * 16;
      state.nudgeOffset.y = (Math.random() - 0.5) * 12;
      if (seq.frame % 10 === 0 && window.sfx) {
        window.sfx.armorBreak();
      }
    } else {
      state.nudgeOffset.x *= 0.84;
      state.nudgeOffset.y *= 0.84;
    }

    seq.shatterPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.98;
      p.angle += p.vAngle;
      p.life--;
    });

    if (seq.frame >= 25 && seq.frame <= 105) {
      for (let i = 0; i < 3; i++) {
        const col = Math.random() > 0.5 ? "#00f5d4" : (Math.random() > 0.5 ? "#ff1493" : "#ffffff");
        seq.smokeClouds.push(this.spawnSmokeCloud(198, 330, col));
      }
      if (seq.frame % 2 === 0) {
        seq.smokeClouds.push(this.spawnSmokeCloud(100 + Math.random() * 220, 580, "#ffffff"));
      }
    }

    if (seq.frame >= 65 && seq.frame <= 105) {
      seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 65) / 38);
      if (seq.frame === 104 && window.sfx) {
        window.sfx.burstTrigger();
      }
      // ホワイトアウト頂点で上部の煙を一掃し、大破CGの顔・上半身をクリアに見せる
      if (seq.frame === 105) {
        seq.smokeClouds = [];
      }
    }

    if (seq.frame >= 105) {
      seq.cgRevealAlpha = 1.0;
      seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);

      // 破損した右膝当て付近＆足元フロアから立ち昇る控えめな余韻スモーク（顔や胸は隠さない）
      if (seq.frame % 3 === 0) {
        const colors = ["#ffffff", "#e0ffff", "#00f5d4", "#ff80df"];
        const col = colors[Math.floor(Math.random() * colors.length)];
        seq.smokeClouds.push({
          x: 288 + (Math.random() - 0.5) * 28,
          y: 470 + (Math.random() - 0.5) * 18,
          vx: (Math.random() - 0.5) * 1.4 + 0.3,
          vy: -0.9 - Math.random() * 1.4,
          r: 14 + Math.random() * 12,
          maxR: 42 + Math.random() * 20,
          growth: 0.45 + Math.random() * 0.4,
          color: col,
          alpha: 0.10,
          maxAlpha: 0.42 + Math.random() * 0.16,
          life: 65 + Math.floor(Math.random() * 25),
          maxLife: 85
        });
      }
      if (seq.frame % 4 === 0) {
        seq.smokeClouds.push({
          x: 198 + (Math.random() - 0.5) * 160,
          y: 560 + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 1.2,
          vy: -0.8 - Math.random() * 1.3,
          r: 16 + Math.random() * 14,
          maxR: 50 + Math.random() * 24,
          growth: 0.5 + Math.random() * 0.4,
          color: Math.random() > 0.4 ? "#e0ffff" : "#ffffff",
          alpha: 0.08,
          maxAlpha: 0.38 + Math.random() * 0.15,
          life: 70 + Math.floor(Math.random() * 25),
          maxLife: 90
        });
      }
    }

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

    if (seq.frame >= 155 && !seq.uiShown) {
      seq.uiShown = true;
      UI.updateHUD(state);
      const modal = document.getElementById("clearModal");
      if (modal) {
        const nameEl = modal.querySelector(".text-\\[\\#ff66b2\\]");
        if (nameEl) nameEl.textContent = "ノア (NOA)";
        const quoteEl = modal.querySelector("p");
        if (quoteEl) {
          quoteEl.innerHTML = "「あぅぅっ……メインサーバーまでハッキングされるなんて……！<br>わ、わたしの演算コアが熱暴走しちゃうよぉ……っ！」";
        }

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        void modal.offsetWidth;
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
      }
    }
  },

  // ゴム膜ワープ用の縮小画素キャッシュ（通常時 / 胸部破損差分合成時の2系統をキャッシュ）
  _getSrcPixels(IMG_BOX, isChestBroken) {
    const img = this.assets.bareImg;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const dmgReady = isChestBroken && this.assets.bodyDamageImg && this.assets.bodyDamageImg.complete && this.assets.bodyDamageImg.naturalWidth > 0;
    const key = `${img.src}|${IMG_BOX.w}x${IMG_BOX.h}|${dmgReady ? "dmg" : "base"}`;
    if (!this._srcPixCache) this._srcPixCache = {};
    if (this._srcPixCache[key]) return this._srcPixCache[key];

    try {
      const c = document.createElement("canvas");
      c.width = IMG_BOX.w;
      c.height = IMG_BOX.h;
      const cc = c.getContext("2d", { willReadFrequently: true });
      cc.drawImage(img, 0, 0, IMG_BOX.w, IMG_BOX.h);
      if (dmgReady) {
        const bx = (250 / 768) * IMG_BOX.w;
        const by = (480 / 1376) * IMG_BOX.h;
        const bw = (255 / 768) * IMG_BOX.w;
        const bh = (320 / 1376) * IMG_BOX.h;
        cc.drawImage(this.assets.bodyDamageImg, bx, by, bw, bh);
      }
      const d = cc.getImageData(0, 0, c.width, c.height);
      this._srcPixCache[key] = { key, w: c.width, h: c.height, data: d.data };
    } catch (e) {
      this._srcPixCache[key] = { key, w: 0, h: 0, data: null };
    }
    return this._srcPixCache[key];
  },

  renderSoftWarp(ctx, IMG_BOX, bodies, isChestBroken) {
    const active = bodies.filter(b => b && Math.hypot(b.dx, b.dy) >= 0.25);
    if (active.length === 0) return;
    const src = this._getSrcPixels(IMG_BOX, isChestBroken);
    if (!src || !src.data) return;

    const REACH = 1.22;
    const fields = active.map(b => {
      const rx = b.rx * REACH, ry = b.ry * REACH;
      return {
        cx: b.x - IMG_BOX.x,
        cy: b.y - IMG_BOX.y,
        rx,
        ry,
        irx: 1 / rx,
        iry: 1 / ry,
        dx: b.dx,
        dy: b.dy,
        kx: b.dx * 0.010 - b.dy * 0.006,
        ky: b.dy * 0.010 - b.dx * 0.006
      };
    });

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    fields.forEach(f => {
      x0 = Math.min(x0, f.cx - f.rx); x1 = Math.max(x1, f.cx + f.rx);
      y0 = Math.min(y0, f.cy - f.ry); y1 = Math.max(y1, f.cy + f.ry);
    });
    const SW = src.w, SH = src.h;
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(SW, Math.ceil(x1)); y1 = Math.min(SH, Math.ceil(y1));
    const w = x1 - x0, h = y1 - y0;
    if (w <= 0 || h <= 0) return;

    if (!this._warpCanvas || this._warpCanvas.width < w || this._warpCanvas.height < h) {
      this._warpCanvas = document.createElement("canvas");
      this._warpCanvas.width = Math.max(w, 64);
      this._warpCanvas.height = Math.max(h, 64);
      this._warpCtx = this._warpCanvas.getContext("2d");
    }
    if (!this._warpImg || this._warpImg.width !== w || this._warpImg.height !== h) {
      this._warpImg = this._warpCtx.createImageData(w, h);
    }
    const out = this._warpImg;
    const od = out.data;
    od.fill(0);
    const sd = src.data;
    const nF = fields.length;

    for (let v = 0; v < h; v++) {
      const Y = y0 + v;
      for (let u = 0; u < w; u++) {
        const X = x0 + u;
        let ox = 0, oy = 0, inside = false;
        for (let i = 0; i < nF; i++) {
          const f = fields[i];
          const rxv = X - f.cx, ryv = Y - f.cy;
          const nx = rxv * f.irx, ny = ryv * f.iry;
          const r2 = nx * nx + ny * ny;
          if (r2 >= 1) continue;
          const t = 1 - r2;
          const wgt = t * t;
          ox += wgt * (f.dx + f.kx * rxv);
          oy += wgt * (f.dy + f.ky * ryv);
          inside = true;
        }
        if (!inside) continue;

        let sx = X - ox, sy = Y - oy;
        if (sx < 0) sx = 0; else if (sx > SW - 1.001) sx = SW - 1.001;
        if (sy < 0) sy = 0; else if (sy > SH - 1.001) sy = SH - 1.001;
        const ix = sx | 0, iy = sy | 0;
        const fx = sx - ix, fy = sy - iy;
        const i00 = (iy * SW + ix) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        const oi = (v * w + u) * 4;
        od[oi]     = sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11;
        od[oi + 1] = sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11;
        od[oi + 2] = sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11;
        od[oi + 3] = 255;
      }
    }

    this._warpCtx.putImageData(out, 0, 0);
    ctx.drawImage(this._warpCanvas, 0, 0, w, h, IMG_BOX.x + x0, IMG_BOX.y + y0, w, h);
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };

    if (!this.assets.loaded || !this.assets.bareImg.complete) {
      ctx.fillStyle = "#08031c";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    const b = state.boss;
    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    const baseImg = isDefeat ? this.assets.defeatCgImg : this.assets.bareImg;

    const drawSrcPatch = (img, sx, sy, sw, sh) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      ctx.drawImage(
        img,
        IMG_BOX.x + (sx / 768) * IMG_BOX.w,
        IMG_BOX.y + (sy / 1376) * IMG_BOX.h,
        (sw / 768) * IMG_BOX.w,
        (sh / 1376) * IMG_BOX.h
      );
    };

    ctx.save();
    // 1. ベース原画（撃破時は敗北ご褒美CG）
    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    if (!isDefeat && b) {
      // 2. 原画に描き込まれている固定ビット3機と固定アンテナを背景パッチで消去
      drawSrcPatch(this.assets.bgAntennaImg, 172, 108, 94, 186);
      drawSrcPatch(this.assets.bgBitTopImg, 612, 248, 92, 90);
      drawSrcPatch(this.assets.bgBitMidLImg, 128, 704, 80, 80);
      drawSrcPatch(this.assets.bgBitMidRImg, 568, 698, 82, 84);

      // 3. 左右の手の握り込み差分（吸引キャッチ＆転送チャージ中）
      if (b.hands && b.hands.handLClosedTimer > 0) {
        drawSrcPatch(this.assets.handLClosedImg, 68, 396, 194, 199);
      }
      if (b.hands && b.hands.handRClosedTimer > 0) {
        drawSrcPatch(this.assets.handRClosedImg, 544, 392, 184, 196);
      }

      // 4. 膝当て破損差分 ＆ 胸部ビスチェ大ブレイク破損差分
      if (b.kneePad && b.kneePad.broken) {
        drawSrcPatch(this.assets.kneeBrokenImg, 420, 770, 230, 340);
      }
      if (b.chestArmorBroken) {
        drawSrcPatch(this.assets.bodyDamageImg, 250, 480, 255, 320);
      }

      // 5. 胸部ゴム膜ぷるぷるワープ描画
      this.renderSoftWarp(ctx, IMG_BOX, [b.bustL, b.bustR], b.chestArmorBroken);

      // 6. カチューシャの揺れるアンテナスプライト描画（根元ピボット回転）
      const ant = b.antenna;
      if (ant && this.assets.antennaRodImg.complete && this.assets.antennaRodImg.naturalWidth > 0) {
        const sX = IMG_BOX.w / 768;
        const sY = IMG_BOX.h / 1376;
        const localPivotX = 253 - 172; // 81
        const localPivotY = 286 - 108; // 178
        ctx.save();
        ctx.translate(ant.pivotX, ant.pivotY);
        ctx.rotate(ant.angle || 0);
        ctx.drawImage(
          this.assets.antennaRodImg,
          -localPivotX * sX,
          -localPivotY * sY,
          94 * sX,
          186 * sY
        );
        ctx.restore();
      }

      // 7. 表情差分パッチ合成 (FACE_BOX: x=296, y=300, w=174, h=120)
      const fa = b.faceAnim || {};
      const isTalking = (b.talkTimer > 0) || (state.cutin && state.cutin.timer > 0);
      const talkCycle = Math.floor(performance.now() * 0.007) % 3;
      let activePatchKey = null;

      if (b.expression && b.expression !== "normal") {
        activePatchKey = b.expression;
      } else if (isTalking) {
        activePatchKey = (talkCycle === 0) ? "talk" : ((talkCycle === 1) ? "talk_sm" : null);
      } else if (fa.winkFrame > 0) {
        activePatchKey = "wink";
      } else if (fa.blinkFrame > 0) {
        const bf = fa.blinkFrame;
        activePatchKey = (bf >= 14) ? "blink_half" : (bf >= 6) ? "blink" : (bf >= 3) ? "blink_half" : null;
      } else if (fa.talkFrame > 0) {
        activePatchKey = "talk_sm";
      }

      if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
        drawSrcPatch(this.assets.facePatchImgs[activePatchKey], 296, 300, 174, 120);
      }

      // 8. 浮遊ビット3機の可動スプライト描画（破壊済みのビットは消滅）
      if (this.assets.bitOrbImg.complete && this.assets.bitOrbImg.naturalWidth > 0) {
        const orbW = (84 / 768) * IMG_BOX.w;
        const orbH = (84 / 1376) * IMG_BOX.h;
        [b.bitTop, b.bitMidL, b.bitMidR].forEach(bit => {
          if (!bit || bit.broken) return;
          const bx = bit.x;
          const by = bit.y + (bit.bobY || 0);
          ctx.save();
          if (bit.flash > 0) {
            ctx.shadowColor = "#00f5d4";
            ctx.shadowBlur = 12;
          }
          ctx.drawImage(this.assets.bitOrbImg, bx - orbW / 2, by - orbH / 2, orbW, orbH);
          ctx.restore();
        });
      }

      // 9. 左右サーバーラックLEDスキャン光演出
      [
        { rk: b.rackL, x0: 26, x1: 66 },
        { rk: b.rackR, x0: 332, x1: 372 }
      ].forEach(({ rk, x0, x1 }) => {
        if (!rk || rk.scanTimer <= 0) return;
        const ratio = 1 - rk.scanTimer / 45;
        const scanY = 230 + ratio * 210;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 245, 212, ${(1 - ratio) * 0.85})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, scanY);
        ctx.lineTo(x1, scanY);
        ctx.stroke();
        ctx.restore();
      });
    }

    // 10. クリア演出スモーククラウド
    if (state.clearSequence && state.clearSequence.smokeClouds && state.clearSequence.smokeClouds.length > 0) {
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

    ctx.restore();
  },

  renderTargets(ctx, state, engine) {
    if (!state.boss) return;
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
    if (isPostWhiteout) return;

    const b = state.boss;
    const animTick = b.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. カチューシャのアンテナ（破壊不能・電撃なし：共通ガイドパルスによるバウンスロッド表示）
    const ant = b.antenna;
    if (ant) {
      const ep = this.getAntennaEndpoints(ant);
      const pulse = Particles.guidePulse(animTick);
      const isHit = ant.flash > 0;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = isHit ? "#ffffff" : "rgba(0, 245, 212, 0.55)";
      ctx.lineWidth = (isHit ? 8.5 : 5.5) * pulse;
      ctx.beginPath();
      ctx.moveTo(ep.ax, ep.ay);
      ctx.lineTo(ep.bx, ep.by);
      ctx.stroke();

      ctx.fillStyle = isHit ? "#ffffff" : "#00f5d4";
      ctx.beginPath();
      ctx.arc(ep.bx, ep.by, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();

      if (!isHit) {
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.0;
        ctx.strokeText("BOUNCE", ep.bx, ep.by - 10);
        ctx.fillStyle = "#00f5d4";
        ctx.fillText("BOUNCE", ep.bx, ep.by - 10);
      }
      ctx.restore();
    }

    // 2. 浮遊ビット×3機（破壊対象：HPバー付きガイド、破壊後は消滅）
    [b.bitTop, b.bitMidL, b.bitMidR].forEach(bit => {
      if (!bit || bit.broken) return;
      const by = bit.y + (bit.bobY || 0);
      const col = bit.mode === "move" ? "#e6ff00" : "#00f5d4";
      drawGuide(bit.x, by, bit.r, col, bit.flash, bit.rot, bit.label, `HP:${bit.hp}/${bit.maxHP}`);
    });

    // 3. 左右の手（通常: バウンスバンパー / 吸引中: ボルテックスリング / 転送中: 電脳ワープライン）
    const hands = b.hands;
    if (hands) {
      if (hands.mode === "open") {
        Particles.drawBounceBumperGuide(ctx, animTick, b.handL.x, b.handL.y, b.handL.r, "#ff66b2", b.handL.flash, "L-HAND", "GLOVE BUMP");
        Particles.drawBounceBumperGuide(ctx, animTick, b.handR.x, b.handR.y, b.handR.r, "#ff66b2", b.handR.flash, "R-HAND", "GLOVE BUMP");
      } else if (hands.mode === "suction") {
        [b.handL, b.handR].forEach(h => {
          ctx.save();
          ctx.translate(h.x, h.y);
          for (let ring = 0; ring < 3; ring++) {
            const phase = ((animTick * 0.045) + ring / 3) % 1.0;
            const rad = hands.suctionRadius * (1.0 - phase);
            ctx.strokeStyle = ring % 2 === 0
              ? `rgba(255, 20, 147, ${(phase * 0.75).toFixed(2)})`
              : `rgba(0, 245, 212, ${(phase * 0.75).toFixed(2)})`;
            ctx.lineWidth = 1.6 + phase * 1.4;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(4, rad), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();
          Particles.drawBounceBumperGuide(ctx, animTick, h.x, h.y, h.r, "#e6ff00", h.flash, h.label, "🌀CATCHING");
        });
      } else if (hands.mode === "transfer") {
        const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
        const exitHand = hands.exitSide === "L" ? b.handL : b.handR;
        const progress = 1 - hands.timer / (hands.transferTotal || 44);
        const midX = (catchHand.x + exitHand.x) / 2;
        const midY = (catchHand.y + exitHand.y) / 2 - 42;

        ctx.save();
        ctx.strokeStyle = "rgba(0, 245, 212, 0.85)";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(catchHand.x, catchHand.y);
        ctx.quadraticCurveTo(midX, midY, exitHand.x, exitHand.y);
        ctx.stroke();

        // 転送中エネルギー弾コア
        const orbX = catchHand.x + (exitHand.x - catchHand.x) * progress;
        const orbY = catchHand.y + (exitHand.y - catchHand.y) * progress - Math.sin(progress * Math.PI) * 34;
        ctx.setLineDash([]);
        ctx.fillStyle = "#e6ff00";
        ctx.beginPath();
        ctx.arc(orbX, orbY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();

        Particles.drawBounceBumperGuide(ctx, animTick, catchHand.x, catchHand.y, catchHand.r, "#ff1493", 0, catchHand.label, "✊CAUGHT!");
        Particles.drawBounceBumperGuide(ctx, animTick, exitHand.x, exitHand.y, exitHand.r, "#e6ff00", 8, exitHand.label, "⚡READY!");
      }
    }

    // 4. 左右サーバーラック端子バウンスノード（HPバーなし）
    Particles.drawBounceBumperGuide(ctx, animTick, b.rackL.x, b.rackL.y, b.rackL.r, "#00f5d4", b.rackL.flash, "SERVER-L", "DATA BUMP");
    Particles.drawBounceBumperGuide(ctx, animTick, b.rackR.x, b.rackR.y, b.rackR.r, "#00f5d4", b.rackR.flash, "SERVER-R", "DATA BUMP");

    // 5. 右膝当てアーマー（未破壊時はHPガイド、破壊後はバウンスバンパー）
    const knee = b.kneePad;
    if (knee) {
      if (!knee.broken) {
        drawGuide(knee.x, knee.y, knee.r, "#b84dff", knee.flash, animTick * 0.02, "KNEE PAD", `HP:${knee.hp}/${knee.maxHP}`);
      } else {
        Particles.drawBounceBumperGuide(ctx, animTick, knee.x, knee.y, knee.r, "#ff66b2", knee.flash, "KNEE", "BOUNCE");
      }
    }

    // 6. 胸部ビスチェ装甲 / パージ後ソフトバスト
    if (!b.chestArmorBroken) {
      if (state.phase < 2) {
        drawGuide(b.bustL.x, b.bustL.y, b.bustL.r, "#b59ce6", b.bustL.flash, -animTick * 0.015, "L-BUSTIER", "🛡️BARRIER");
        drawGuide(b.bustR.x, b.bustR.y, b.bustR.r, "#b59ce6", b.bustR.flash, animTick * 0.015, "R-BUSTIER", "🛡️BARRIER");
      } else {
        drawGuide(b.bustL.x, b.bustL.y, b.bustL.r, "#ff1493", b.bustL.flash, -animTick * 0.025, "L-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
        drawGuide(b.bustR.x, b.bustR.y, b.bustR.r, "#ff1493", b.bustR.flash, animTick * 0.025, "R-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
      }
    } else {
      const bustCol = state.fever.active ? "#e6ff00" : "#ff1493";
      const subTxt = state.fever.active ? "♥FEVER♥" : "♥SOFT";
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx, b.bustL.y + b.bustL.dy, b.bustL.r, bustCol, b.bustL.flash, "L-BUST", subTxt);
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx, b.bustR.y + b.bustR.dy, b.bustR.r, bustCol, b.bustR.flash, "R-BUST", subTxt);
    }

    // 7. 首元のグリーンのペンダント・コア
    const core = b.core;
    if (core) {
      if (state.phase === 3 && core.unlocked) {
        drawGuide(core.x, core.y, core.r, "#00f5d4", core.flash, animTick * 0.04, "★PENDANT CORE★", `HP:${core.hp}/${core.maxHP}`);
      } else {
        // 解錠前は控えめなエメラルド六角シールドフレーム
        ctx.save();
        ctx.strokeStyle = core.flash > 0 ? "#ffffff" : "rgba(0, 245, 212, 0.50)";
        ctx.lineWidth = core.flash > 0 ? 2.6 : 1.4;
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
    }
  },

  getTargetDesc(state) {
    if (!state.boss) return "---";
    const b = state.boss;
    if (state.stageCleared) {
      return "✨ノア撃破完了！ STAGE 3 CLEAR!!✨";
    }
    if (state.phase === 3) {
      return `💥最終目標: 首元のペンダントコアに集中連打！ (残HP:${b.core.hp})`;
    }
    if (state.phase === 2) {
      return `胸部ビスチェ装甲を破壊せよ！ (残HP:${b.chestArmorHP})`;
    }
    const bitsAlive = [b.bitTop, b.bitMidL, b.bitMidR].filter(x => x && !x.broken).length;
    if (bitsAlive > 0 && !b.kneePad.broken) {
      return `浮遊ビット(残${bitsAlive}機)＆右膝当てアーマーを破壊せよ！`;
    }
    if (bitsAlive > 0) {
      return `残りの浮遊ビット(残${bitsAlive}機)を撃墜せよ！`;
    }
    return `右膝当てアーマー(残HP:${b.kneePad.hp})を破壊せよ！`;
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    const nameEl = document.getElementById("targetBossName");
    if (nameEl) nameEl.innerHTML = '<span class="w-2 h-2 rounded-full bg-[#00f5d4] animate-pulse"></span>TYPE-NOA (ノア)';
    const briefEl = document.getElementById("targetBriefingText");
    if (briefEl) {
      briefEl.textContent = "「わたしの電脳空間へようこそ♪ 浮遊ビットとワープハンドで翻弄しちゃうんだから……って、胸は演算対象外だってばぁっ！」";
    }

    const lblArmR = document.getElementById("dtArmRLabel");
    if (lblArmR) lblArmR.textContent = "浮遊ビット(3-BITS):";
    const lblArmL = document.getElementById("dtArmLLabel");
    if (lblArmL) lblArmL.textContent = "右膝当て(KNEE PAD):";
    const lblChest = document.getElementById("dtChestLabel");
    if (lblChest) lblChest.textContent = "胸部＆首ペンダント:";
    const lblCrotch = document.getElementById("dtCrotchLabel");
    if (lblCrotch) lblCrotch.textContent = "両手ワープ(HANDS):";

    const dtArmR = document.getElementById("dtArmRStatus");
    if (dtArmR) {
      const alive = [b.bitTop, b.bitMidL, b.bitMidR].filter(x => x && !x.broken).length;
      dtArmR.textContent = alive === 0 ? "💥ALL DOWN!" : `ACTIVE (${alive}/3機)`;
      dtArmR.className = alive === 0 ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#00f5d4]";
    }

    const dtArmL = document.getElementById("dtArmLStatus");
    if (dtArmL) {
      dtArmL.textContent = b.kneePad.broken ? "💥PURGED!" : `ARMORED (${b.kneePad.hp}/${b.kneePad.maxHP})`;
      dtArmL.className = b.kneePad.broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]";
    }

    const dtChest = document.getElementById("dtChestStatus");
    if (dtChest) {
      if (state.phase === 3 && b.core.unlocked) {
        dtChest.textContent = b.core.hp === 0 ? "💥CORE K.O.!" : `★PENDANT (${b.core.hp}/12)`;
        dtChest.className = "font-bold text-[#00f5d4] animate-pulse";
      } else {
        dtChest.textContent = b.chestArmorBroken ? "💥PURGED!" : `BUSTIER (${b.chestArmorHP}/8)`;
        dtChest.className = b.chestArmorBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#ff1493]";
      }
    }

    const dtCrotch = document.getElementById("dtCrotchStatus");
    if (dtCrotch && b.hands) {
      if (b.hands.mode === "transfer") {
        dtCrotch.textContent = `⚡WARP (${b.hands.catchSide}→${b.hands.exitSide})`;
        dtCrotch.className = "font-bold text-[#e6ff00] animate-pulse";
      } else if (b.hands.mode === "suction") {
        dtCrotch.textContent = "🌀SUCTION ON";
        dtCrotch.className = "font-bold text-[#ff66b2] animate-pulse";
      } else {
        dtCrotch.textContent = "OPEN BUMP";
        dtCrotch.className = "font-bold text-[#00f5d4]";
      }
    }

    const blushText = document.getElementById("blushGaugeText");
    if (blushText) blushText.textContent = `${b.blushGauge || 0}%`;
    const blushBar = document.getElementById("blushGaugeBar");
    if (blushBar) blushBar.style.width = `${b.blushGauge || 0}%`;

    const faceMap = {
      normal: "電脳オペレート（余裕）",
      wink: "☆ワープウインク☆",
      shock: "⚡演算エラー発生!?",
      wince: "くぅっ…バグが…！",
      shout: "⚡出力フルバースト！",
      open_blush: "♥熱暴走ハァハァ…♥",
      talk: "データリンク中…",
      talk_sm: "演算処理中…"
    };
    const faceEl = document.getElementById("bossFaceStatus");
    if (faceEl) faceEl.textContent = faceMap[b.expression] || "電脳オペレート（余裕）";
  }
};

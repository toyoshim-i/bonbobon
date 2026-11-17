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
    const v = "?v=136";
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

  getAllBits(b) {
    if (!b) return [];
    return [b.bitTopL, b.bitTopR, b.bitMidL, b.bitMidR].filter(Boolean);
  },

  createBossState() {
    const makeBit = (id, label, maxHP, homeX, homeY, r, roamRx, roamRy, minX, maxX, minY, maxY, initTimer, phaseOff) => ({
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
      hp: maxHP,
      maxHP,
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

      // 1. 浮遊ビット×4機スタート（ビスチェより長生きする高耐久の独立護衛ユニット：7 -> 11 -> 15 -> 19！）
      // 3機以上健在時は3機選抜デルタビーム、2機以下になると終盤（ビスチェ破壊後〜コア戦）までロックオン粉砕レーザーで狙い撃つ！
      // Lower-Left (前衛ビット HP:7 — 最初に撃墜され、残り3機のデルタビームへ移行): (95.6, 364.2)
      bitMidL: makeBit("bitMidL", "BIT-LL", 7, 95.6, 364.2, 16, 14, 26, 70, 104, 334, 394, 82, 2.1),
      // Lower-Right (中衛ビット HP:11 — 2番目に撃墜され、残り2機のロックオン粉砕レーザーへ移行): (305.6, 362.1)
      bitMidR: makeBit("bitMidR", "BIT-LR", 11, 305.6, 362.1, 17, 19, 26, 282, 325, 332, 392, 22, 4.2),
      // Upper-Left (高機動狙撃ビット HP:15 — ビスチェ破壊後も生き残りやすく左上から狙撃): (66.0, 153.6)
      bitTopL: makeBit("bitTopL", "BIT-UL", 15, 66.0, 153.6, 17, 16, 18, 46, 82, 132, 172, 58, 1.1),
      // Upper-Right (重量指揮ビット HP:19 — 最終フェーズまでしぶとく生き残る最硬司令ビット): (326.9, 153.6)
      bitTopR: makeBit("bitTopR", "BIT-UR", 19, 326.9, 153.6, 18, 22, 18, 296, 348, 128, 176, 40, 0.0),

      // 1B. ビット連携レーザー（3機以上: 3機選抜デルタビーム / 1〜2機: ロックオン→ボール四散ショートレーザー）
      bitLasers: {
        triMode: "cooldown",    // "cooldown" | "charge" | "fire"
        triTimer: 115,
        deltaBitIds: [],
        lastExcludedBitId: null,
        snipePhase: "idle",     // "idle" | "tracking" | "locked"
        snipeTimer: 85,
        snipeBitId: null,
        snipeTargetBall: null,
        snipePhaseTimer: 0,
        nudgedDuringLock: false,
        staleShot: null,
        nextBitCursor: 0,
        shortLasers: []         // { x, y, prevX, prevY, vx, vy, ux, uy, len, r, aimX, aimY, aimTimer, life, hit, targetBall, ignoreBall, evadedInFlight }
      },

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

      // 3. 左右の手（破壊が進むほど吸引範囲・吸引力・頻度が強化され、反対の手から放り出す！）
      // 左手掌: 原画 (176, 540) -> キャンバス (99.4, 268.7)
      // 右手掌: 原画 (616, 528) -> キャンバス (308.0, 263.1)
      handL: { x: 99.4, y: 268.7, r: 20, flash: 0, side: "L", label: "L-HAND" },
      handR: { x: 308.0, y: 263.1, r: 20, flash: 0, side: "R", label: "R-HAND" },
      hands: {
        mode: "open",          // "open" | "suction" | "transfer"
        timer: 130,
        suctionLevel: 1,       // 1..4 (破壊進行度でエスカレート)
        announcedLevel: 1,
        suctionRadius: 70,
        pullForce: 0.48,
        catchSide: null,       // "L" | "R"
        exitSide: null,        // "L" | "R"
        capturedBall: null,
        transferTotal: 44,
        handLClosedTimer: 0,
        handRClosedTimer: 0
      },

      // 4. 腰部サイバーポート ＆ 太ももガーターリボン飾り（当たると釣られてお尻〜太ももが揺れる） ＆ 左足ブーツキッカー
      // 腰サイバー端子 [▭]: 原画 (298, 689) -> キャンバス (157.2, 338.5)
      hipPort: {
        x: 157.2,
        y: 338.5,
        r: 14,
        hp: 5,
        maxHP: 5,
        broken: false,
        flash: 0,
        rot: 0
      },
      // 太ももの輪っかガーターリボン飾り（ジェム付きリボン）: 原画 (368.1, 842.3) -> キャンバス (190.5, 410.2)
      garterRibbon: {
        x: 190.5,
        y: 410.2,
        r: 18,
        flash: 0
      },
      // 釣られて揺れるお尻ゴム膜ワープ領域（直接の当たり判定は置かず連動揺れ専用）
      hipButt: {
        x: 154.4,
        y: 382.0,
        rx: 27,
        ry: 29,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        flash: 0
      },
      // ガーターリボン〜太ももゴム膜ワープ領域
      thigh: {
        x: 186.0,
        y: 402.0,
        rx: 25,
        ry: 25,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0
      },
      // 浮いた左足パープルブーツ（下方への落下球を軽く蹴り返すBOOTバンパー）: 原画 (238, 1025) -> キャンバス (128.8, 495.7)
      bootKicker: {
        x: 128.8,
        y: 495.7,
        r: 17,
        flash: 0
      },

      // 5. 手前の右膝当てアーマー（Phase 1 破壊対象 HP: 5 — 破壊で胸部ビスチェのバリア解除！）
      // 原画 (575, 955) -> キャンバス (286.5, 463.0) ※右スリングショット壁との挟まり防止のため r=19
      kneePad: {
        x: 286.5,
        y: 463.0,
        r: 19,
        hp: 5,
        maxHP: 5,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 6. 胸部ビスチェ装甲 ＆ 露出後のソフトバスト（Phase 2 破壊対象 HP: 9）
      // ※当たり判定 r=18/16 は維持しつつ、ゴム膜ワープ半径 rx/ry を胸全体の輪郭まで広げてビスチェ越しの揺れもはっきり視認可能に！
      chestArmorHP: 9,
      chestArmorMaxHP: 9,
      chestArmorBroken: false,
      allArmorsPurged: false,
      bustL: { x: 180.0, y: 280.0, r: 18, rx: 29, ry: 29, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },
      bustR: { x: 217.9, y: 279.0, r: 16, rx: 25, ry: 27, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },

      // 7. 首元のグリーンのペンダント・コア（Phase 3 最終撃破ターゲット HP: 11）
      // 原画 (380, 455) -> キャンバス (196.1, 229.0)
      core: {
        x: 196.1,
        y: 229.0,
        r: 14,
        hp: 11,
        maxHP: 11,
        unlocked: false,
        flash: 0
      },

      // 9. 表情アニメーション制御ステート
      faceAnim: StageCommon.createFaceAnim(75)
    };
  },

  // 部位破壊の進行度 (0.0 .. 1.0) ＋ 羞恥・ぷるぷる興奮ブーストから手ワープ吸引スペックを算出
  getHandSuctionSpec(state) {
    const b = state.boss;
    const allBits = this.getAllBits(b);
    const bitsMaxHP = allBits.reduce((acc, bit) => acc + bit.maxHP, 0);
    const bitsRemHP = allBits.reduce((acc, bit) => acc + (bit.broken ? 0 : bit.hp), 0);
    const totalMax =
      bitsMaxHP +
      b.kneePad.maxHP +
      b.hipPort.maxHP +
      b.chestArmorMaxHP;

    const curRem =
      bitsRemHP +
      (b.kneePad.broken ? 0 : b.kneePad.hp) +
      (b.hipPort.broken ? 0 : b.hipPort.hp) +
      (b.chestArmorBroken ? 0 : b.chestArmorHP);

    const baseDestruction = Math.max(0, Math.min(1, (totalMax - curRem) / totalMax));
    const exciteBoost = Math.min(0.18, ((b.bustExcitement || 0) / 100) * 0.18);
    const eff = Math.min(1.0, baseDestruction + exciteBoost);

    let level = 1;
    if (baseDestruction >= 0.82 || b.chestArmorBroken) level = 4;
    else if (baseDestruction >= 0.52 || state.phase >= 2) level = 3;
    else if (baseDestruction >= 0.22) level = 2;

    return {
      destruction: baseDestruction,
      eff,
      level,
      radius: Math.round(70 + eff * 78),          // 70px -> 最大 148px
      pull: 0.48 + eff * 1.02,                    // 0.48 -> 最大 1.50
      openFrames: Math.round(195 - eff * 118),    // 195f -> 最短 77f
      suctionFrames: Math.round(150 + eff * 85),  // 150f -> 最長 235f
      throwSpeed: 11.4 + eff * 1.8,               // 11.4 -> 最大 13.2
      transferFrames: Math.round(44 - eff * 14)   // 44f  -> 最速 30f
    };
  },

  checkSuctionEscalationNotice(state) {
    const b = state.boss;
    if (!b || !b.hands) return;
    const spec = this.getHandSuctionSpec(state);
    b.hands.suctionLevel = spec.level;
    b.hands.suctionRadius = spec.radius;
    b.hands.pullForce = spec.pull;

    if (spec.level > (b.hands.announcedLevel || 1)) {
      b.hands.announcedLevel = spec.level;
      // 破壊が進んだ瞬間にすぐ強化された吸引を体験できるよう吸引フェーズを前倒し
      if (b.hands.mode === "open" && b.hands.timer > 35) {
        b.hands.timer = 35;
      }
      const msgMap = {
        2: "🌀HAND VACUUM LV.2 UP!",
        3: "🌀HAND VACUUM LV.3 STRONG!!",
        4: "🌀MAX OVERLOAD VACUUM!!"
      };
      Particles.addPopup(state, 204, 248, msgMap[spec.level] || "🌀VACUUM UP!", "#e6ff00", 1.18);
    }
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

  triggerBlushOverflow(state) {
    const b = state.boss;
    b.blushGauge = 0;
    StageCommon.setExpressionSequence(state, [
      { expr: "shout", frames: 38 },
      { expr: "open_blush", frames: 65 }
    ]);
    if (window.sfx) window.sfx.armorBreak();
    UI.showCutin("⚡「ちょ、ちょっと…っ！ 変なとこばっかり当てないでよぉっ！！」<br>羞恥オーバーフロー＆アイテムカプセル放出！", 185);
    Particles.add(state, 198, 290, "#00f5d4", 28, 6.0);
    Particles.add(state, 198, 290, "#ff1493", 24, 5.5);
    Systems.dropReward(state, "minor", 5);
    state.balls.forEach(ball => {
      if (!ball.inShooterLane && !ball._capturedByHand && ball.y < 520) {
        ball.vy = Math.min(ball.vy, -8.5);
        ball.vx += (Math.random() - 0.5) * 6.0;
      }
    });
  },

  impulseHip(state, vxImpact, vyImpact, playSfx = true) {
    if (!state.boss) return;
    const b = state.boss;
    const hb = b.hipButt;
    const th = b.thigh;
    if (!hb || !th) return;

    if (playSfx && window.sfx) window.sfx.softPuru();
    // ガーターリボン〜太ももが引っ張られ、それに釣られてお尻までぷるんと揺れる！
    th.vx += vxImpact * 0.85;
    th.vy += vyImpact * 0.85;
    hb.vx += vxImpact * 0.80;
    hb.vy += vyImpact * 0.80;
    if (b.garterRibbon) b.garterRibbon.flash = 20;

    b.blushGauge = Math.min(100, (b.blushGauge || 0) + 10);
    b.bustExcitement = Math.min(100, (b.bustExcitement || 0) + 26);
    b.talkTimer = 32;
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 12 },
      { expr: "wince", frames: 18 },
      { expr: "open_blush", frames: 50 }
    ]);

    Systems.addFever(state, 3);
    const fxX = b.garterRibbon ? b.garterRibbon.x : th.x;
    const fxY = b.garterRibbon ? b.garterRibbon.y : th.y;
    Particles.add(state, fxX, fxY, "#ff66b2", 10, 3.0);
    Particles.spawnHeart(state, hb.x + 12, hb.y, false);

    if (b.blushGauge >= 100) {
      this.triggerBlushOverflow(state);
    }
    UI.updateHUD(state);
  },

  impulseBust(state, which, vxImpact, vyImpact) {
    if (!state.boss) return;
    const b = which === "L" ? state.boss.bustL : state.boss.bustR;
    const other = which === "L" ? state.boss.bustR : state.boss.bustL;
    if (!b || !other) return;

    if (window.sfx) window.sfx.softPuru();
    b.vx += vxImpact * 0.88;
    b.vy += vyImpact * 0.94;
    b.flash = 18;

    other.vx += vxImpact * 0.42;
    other.vy += vyImpact * 0.50;

    state.boss.blushGauge = Math.min(100, (state.boss.blushGauge || 0) + 14);
    state.boss.bustExcitement = Math.min(100, (state.boss.bustExcitement || 0) + 34);
    state.boss.talkTimer = 36;
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 12 },
      { expr: "wince", frames: 16 },
      { expr: "open_blush", frames: 56 }
    ]);

    Systems.addFever(state, 5);
    Particles.add(state, b.x, b.y, "#ff66b2", 8, 2.8);
    Particles.spawnHeart(state, b.x, b.y, false);
    Systems.addScore(state, 1800, b.x, b.y - 16, "♥ぷるんっ! SOFT");

    if (state.boss.blushGauge >= 100) {
      this.triggerBlushOverflow(state);
    }
    UI.updateHUD(state);
  },

  triggerDebugJiggle(state) {
    if (!state || !state.boss) return;
    const b = state.boss;
    if (b.chestArmorBroken) {
      this.impulseBust(state, "L", 7.2, -7.8);
      this.impulseBust(state, "R", -7.2, -7.8);
    } else {
      if (window.sfx) window.sfx.softPuru();
      b.bustL.vx += 5.2; b.bustL.vy -= 5.6;
      b.bustR.vx -= 5.2; b.bustR.vy -= 5.6;
    }
    this.impulseHip(state, 6.0, -6.5, false);
  },

  onNudge(state, nx, ny, intensity) {
    if (!state.boss) return;
    const b = state.boss;

    if (window.Systems && Systems.isNudgeJiggleEnabled()) {
      const mult = (b.chestArmorBroken ? 8.2 : 6.4) * (intensity || 1.0);
      const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
      if (b.bustL && b.bustR) {
        b.bustL.vx += sway * mult;
        b.bustL.vy += (ny - 0.65) * mult;
        b.bustR.vx -= sway * mult * 0.75;
        b.bustR.vy += (ny - 0.65) * mult;
      }
      if (b.hipButt && b.thigh) {
        b.hipButt.vx += sway * 5.6 * (intensity || 1.0);
        b.hipButt.vy += (ny - 0.5) * 5.6 * (intensity || 1.0);
        b.thigh.vx += sway * 4.6 * (intensity || 1.0);
        b.thigh.vy += (ny - 0.5) * 4.6 * (intensity || 1.0);
      }
      if (b.expression === "normal" || b.expression === "smug") {
        b.expression = "blush";
        b.expressionTimer = 35;
      }
      if (window.sfx && window.sfx.softPuru) {
        window.sfx.softPuru();
      }
    }

    if (b.antenna) {
      b.antenna.angleVel += nx * 0.08 * intensity;
    }

    // ★ロックオン粉砕ショートレーザーの台揺らし回避判定！
    const bl = b.bitLasers;
    if (bl && !state.stageCleared) {
      const canBreakLock =
        (bl.snipePhase === "locked" && !bl.nudgedDuringLock) ||
        (bl.snipePhase === "tracking" && bl.snipePhaseTimer <= 10 && !bl.nudgedDuringLock);

      if (canBreakLock) {
        bl.nudgedDuringLock = true;
        const tgt = bl.snipeTargetBall;
        const popX = (tgt && state.balls.includes(tgt)) ? tgt.x : 198;
        const popY = (tgt && state.balls.includes(tgt)) ? Math.max(48, tgt.y - 22) : 280;
        if (window.sfx) window.sfx.capsuleDrop();
        Particles.add(state, popX, popY, "#00f5d4", 16, 4.8);
        Systems.addScore(state, 5000, popX, popY, "✨LOCK BROKEN!");
      }

      // 発射直後の飛翔中ショートレーザーに対するギリギリ回避（弾頭がまだ球に届く前なら回避成功！）
      if (bl.shortLasers && bl.shortLasers.length > 0) {
        bl.shortLasers.forEach(sl => {
          if (sl.hit || sl.ignoreBall || !sl.targetBall) return;
          const tb = sl.targetBall;
          if (!state.balls.includes(tb)) return;
          if (Math.hypot(sl.x - tb.x, sl.y - tb.y) >= 16) {
            sl.ignoreBall = tb;
            sl.evadedInFlight = true;
            if (window.sfx) window.sfx.capsuleDrop();
            Particles.add(state, tb.x, tb.y, "#00f5d4", 18, 5.2);
            Systems.addScore(state, 8000, tb.x, Math.max(48, tb.y - 22), "✨JUST EVADE!!");
          }
        });
      }
    }
  },

  getTargetDesc(state) {
    if (!state.boss) return "---";
    const b = state.boss;
    if (state.stageCleared) {
      return "✨ノア撃破！ STAGE 3 CLEAR!";
    }
    if (b.bitLasers && b.bitLasers.snipePhase === "locked" && !b.bitLasers.nudgedDuringLock) {
      return "⚠️赤ロック！台揺らしで回避せよ！";
    }
    const bitsAlive = this.getAllBits(b).filter(x => !x.broken).length;
    if (state.phase === 3) {
      return bitsAlive > 0
        ? `首ペンダントを連打せよ！(HP:${b.core.hp}/機${bitsAlive})`
        : `首ペンダントを連打せよ！(HP:${b.core.hp})`;
    }
    if (state.phase === 2) {
      return `胸部ビスチェを破壊せよ！(HP:${b.chestArmorHP})`;
    }
    return `右膝アーマーを破壊せよ！(HP:${b.kneePad.hp})`;
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    UI.setBossHeader("#00f5d4", "TYPE-NOA (ノア)");
    UI.setText("targetBriefingText", "「4機のビットが3機以上残ってるとデルタビーム！ 2機以下になったら必中ロックオンでボールを砕いちゃうから、赤ロックで台を揺らして避けてみてねっ！」");

    UI.setText("dtArmRLabel", "浮遊ビット(4-BITS):");
    UI.setText("dtArmLLabel", "膝＆腰端子(KNEE/HIP):");
    UI.setText("dtChestLabel", "胸部＆首ペンダント:");
    UI.setText("dtCrotchLabel", "両手吸引(VACUUM):");

    const alive = this.getAllBits(b).filter(x => !x.broken).length;
    if (alive === 0) {
      UI.setText("dtArmRStatus", "💥ALL DOWN!");
      UI.setClass("dtArmRStatus", "font-bold text-[#ff1493] animate-pulse");
    } else if (alive >= 3 && b.bitLasers && b.bitLasers.triMode === "fire") {
      UI.setText("dtArmRStatus", `🔺DELTA BEAM!! (${alive}/4)`);
      UI.setClass("dtArmRStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else if (alive < 3 && b.bitLasers && b.bitLasers.snipePhase === "locked") {
      UI.setText("dtArmRStatus", "⚠️LOCKED! NUDGE!");
      UI.setClass("dtArmRStatus", "font-bold text-[#ff1744] animate-pulse");
    } else if (alive < 3) {
      UI.setText("dtArmRStatus", `🎯LOCK SNIPE (${alive}/4機)`);
      UI.setClass("dtArmRStatus", "font-bold text-[#e6ff00]");
    } else {
      UI.setText("dtArmRStatus", `DELTA READY (${alive}/4機)`);
      UI.setClass("dtArmRStatus", "font-bold text-[#00f5d4]");
    }

    const kBroken = b.kneePad.broken;
    const hBroken = b.hipPort.broken;
    if (kBroken && hBroken) {
      UI.setText("dtArmLStatus", "💥ALL PURGED!");
      UI.setClass("dtArmLStatus", "font-bold text-[#ff1493] animate-pulse");
    } else {
      const kStr = kBroken ? "OK" : `${b.kneePad.hp}`;
      const hStr = hBroken ? "OK" : `${b.hipPort.hp}`;
      UI.setText("dtArmLStatus", `膝:${kStr} / 腰:${hStr}`);
      UI.setClass("dtArmLStatus", "font-bold text-[#e6ff00]");
    }

    if (state.phase === 3 && b.core.unlocked) {
      UI.setText("dtChestStatus", b.core.hp === 0 ? "💥CORE K.O.!" : `★PENDANT (${b.core.hp}/${b.core.maxHP})`);
      UI.setClass("dtChestStatus", "font-bold text-[#00f5d4] animate-pulse");
    } else {
      UI.setText("dtChestStatus", b.chestArmorBroken ? "💥PURGED!" : `BUSTIER (${b.chestArmorHP}/${b.chestArmorMaxHP})`);
      UI.setClass("dtChestStatus", b.chestArmorBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#ff1493]");
    }

    if (b.hands) {
      const lv = b.hands.suctionLevel || 1;
      if (b.hands.mode === "transfer") {
        UI.setText("dtCrotchStatus", `⚡WARP (${b.hands.catchSide}→${b.hands.exitSide}) LV.${lv}`);
        UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
      } else if (b.hands.mode === "suction") {
        UI.setText("dtCrotchStatus", lv >= 4 ? "🌀MAX VACUUM!!" : `🌀SUCTION LV.${lv}`);
        UI.setClass("dtCrotchStatus", "font-bold text-[#ff1493] animate-pulse");
      } else {
        UI.setText("dtCrotchStatus", `READY [LV.${lv}]`);
        UI.setClass("dtCrotchStatus", lv >= 3 ? "font-bold text-[#e6ff00]" : "font-bold text-[#00f5d4]");
      }
    }

    UI.setText("blushGaugeText", `${b.blushGauge || 0}%`);
    UI.setWidth("blushGaugeBar", `${b.blushGauge || 0}%`);

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
    UI.setText("bossFaceStatus", faceMap[b.expression] || "電脳オペレート（余裕）");
  }
};

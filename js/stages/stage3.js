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

  // 選抜された3機のビット外縁同士を結ぶデルタビーム線分配列を取得（ビット本体の被弾判定は妨げない）
  getDeltaBeamEdges(b) {
    const bl = b && b.bitLasers;
    if (!bl || !bl.deltaBitIds || bl.deltaBitIds.length !== 3) return [];
    const allBits = this.getAllBits(b);
    const bits = bl.deltaBitIds.map(id => allBits.find(bit => bit.id === id && !bit.broken));
    if (bits.some(bit => !bit)) return [];

    const pts = bits.map(bit => ({
      x: bit.x,
      y: bit.y + (bit.bobY || 0),
      r: bit.r
    }));
    const pairs = [[0, 1], [1, 2], [2, 0]];
    const edges = [];
    for (const [i, j] of pairs) {
      const p1 = pts[i];
      const p2 = pts[j];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);
      const pad1 = p1.r + 2;
      const pad2 = p2.r + 2;
      if (len > pad1 + pad2 + 4) {
        const ux = dx / len;
        const uy = dy / len;
        edges.push({
          ax: p1.x + ux * pad1,
          ay: p1.y + uy * pad1,
          bx: p2.x - ux * pad2,
          by: p2.y - uy * pad2,
          rawAx: p1.x,
          rawAy: p1.y,
          rawBx: p2.x,
          rawBy: p2.y
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

    const aliveBits = this.getAllBits(b).filter(bit => !bit.broken);
    const activeBalls = state.balls.filter(ball => !ball.inShooterLane && !ball._capturedByHand && !ball._shattered);

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
      const candidateBalls = activeBalls.filter(ball => ball.y > 46 && ball.y < 470);
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
  },

  // ゴム膜ワープ用の縮小画素キャッシュ（固定ビット消去済みベース＋破損差分合成）
  _getSrcPixels(IMG_BOX, isChestBroken, isKneeBroken) {
    const img = this.assets.bareImg;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const dmgReady = isChestBroken && this.assets.bodyDamageImg && this.assets.bodyDamageImg.complete && this.assets.bodyDamageImg.naturalWidth > 0;
    const kneeReady = isKneeBroken && this.assets.kneeBrokenImg && this.assets.kneeBrokenImg.complete && this.assets.kneeBrokenImg.naturalWidth > 0;
    const bgMidLReady = this.assets.bgBitMidLImg && this.assets.bgBitMidLImg.complete && this.assets.bgBitMidLImg.naturalWidth > 0;
    const key = `${img.src}|${IMG_BOX.w}x${IMG_BOX.h}|${dmgReady ? 1 : 0}|${kneeReady ? 1 : 0}|${bgMidLReady ? 1 : 0}`;
    if (!this._srcPixCache) this._srcPixCache = {};
    if (this._srcPixCache[key]) return this._srcPixCache[key];

    try {
      const c = document.createElement("canvas");
      c.width = IMG_BOX.w;
      c.height = IMG_BOX.h;
      const cc = c.getContext("2d", { willReadFrequently: true });
      cc.drawImage(img, 0, 0, IMG_BOX.w, IMG_BOX.h);
      if (bgMidLReady) {
        cc.drawImage(this.assets.bgBitMidLImg, (128 / 768) * IMG_BOX.w, (704 / 1376) * IMG_BOX.h, (80 / 768) * IMG_BOX.w, (80 / 1376) * IMG_BOX.h);
      }
      if (kneeReady) {
        cc.drawImage(this.assets.kneeBrokenImg, (420 / 768) * IMG_BOX.w, (770 / 1376) * IMG_BOX.h, (230 / 768) * IMG_BOX.w, (340 / 1376) * IMG_BOX.h);
      }
      if (dmgReady) {
        cc.drawImage(this.assets.bodyDamageImg, (250 / 768) * IMG_BOX.w, (480 / 1376) * IMG_BOX.h, (255 / 768) * IMG_BOX.w, (320 / 1376) * IMG_BOX.h);
      }
      const d = cc.getImageData(0, 0, c.width, c.height);
      this._srcPixCache[key] = { key, w: c.width, h: c.height, data: d.data };
    } catch (e) {
      this._srcPixCache[key] = { key, w: 0, h: 0, data: null };
    }
    return this._srcPixCache[key];
  },

  renderSoftWarp(ctx, IMG_BOX, bodies, isChestBroken, isKneeBroken, slotName = "default") {
    const src = this._getSrcPixels(IMG_BOX, isChestBroken, isKneeBroken);
    if (!src || !src.data) return;
    StageCommon.renderSoftWarp(ctx, IMG_BOX, src, bodies, {
      slotStore: this._warpSlots || (this._warpSlots = {}),
      slotName,
      reach: 1.12,
      minDisp: 0.25,
      rgba: false,
      shear: true
    });
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
      const isKneeBroken = !!(b.kneePad && b.kneePad.broken);
      if (isKneeBroken) {
        drawSrcPatch(this.assets.kneeBrokenImg, 420, 770, 230, 340);
      }
      if (b.chestArmorBroken) {
        drawSrcPatch(this.assets.bodyDamageImg, 250, 480, 255, 320);
      }

      // 5. 胸部（ビスチェ装着中は小揺れ／破損後は大揺れ） ＆ お尻〜太もも ゴム膜ぷるぷるワープ描画
      this.renderSoftWarp(ctx, IMG_BOX, [b.bustL, b.bustR], b.chestArmorBroken, isKneeBroken, "bust");
      this.renderSoftWarp(ctx, IMG_BOX, [b.hipButt, b.thigh], b.chestArmorBroken, isKneeBroken, "hip");

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
      const activePatchKey = StageCommon.getActiveFacePatchKey(b, state, {
        defaultExpr: "normal",
        halfBlink: true
      });
      StageCommon.drawFacePatch(
        ctx,
        this.assets.facePatchImgs,
        activePatchKey,
        IMG_BOX,
        { x: 296, y: 300, w: 174, h: 120 },
        { w: 768, h: 1376 }
      );

      // 8. 浮遊ビット4機の可動スプライト描画（破壊済みのビットは消滅）
      if (this.assets.bitOrbImg.complete && this.assets.bitOrbImg.naturalWidth > 0) {
        const orbW = (84 / 768) * IMG_BOX.w;
        const orbH = (84 / 1376) * IMG_BOX.h;
        this.getAllBits(b).forEach(bit => {
          if (!bit || bit.broken) return;
          const bx = bit.x;
          const by = bit.y + (bit.bobY || 0);
          ctx.save();
          if (bit.flash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = "#00f5d4";
            ctx.beginPath();
            ctx.arc(bx, by, orbW * 0.58, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.drawImage(this.assets.bitOrbImg, bx - orbW / 2, by - orbH / 2, orbW, orbH);
          ctx.restore();
        });
      }
    }

    // 9. クリア演出スモーククラウド
    StageCommon.renderSmokeClouds(ctx, state);

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

    // 2. 浮遊ビット×4機 ＆ デルタビーム／ロックオン粉砕ショートレーザー描画
    const allBits = this.getAllBits(b);
    const bl = b.bitLasers;
    if (bl) {
      // (A) 3機以上時：選抜3機によるデルタビーム予兆チャージ＆本照射描画
      if (bl.triMode === "charge" || bl.triMode === "fire") {
        const edges = this.getDeltaBeamEdges(b);
        if (edges.length === 3) {
          ctx.save();
          if (bl.triMode === "charge") {
            const blink = (Math.floor(animTick * 0.35) % 2 === 0);
            ctx.strokeStyle = blink ? "rgba(230, 255, 0, 0.85)" : "rgba(0, 245, 212, 0.55)";
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 5]);
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
          } else {
            // 結界内部の淡いサイバーフィールド
            ctx.fillStyle = (Math.floor(animTick * 0.2) % 2 === 0)
              ? "rgba(0, 245, 212, 0.08)"
              : "rgba(255, 20, 147, 0.07)";
            ctx.beginPath();
            ctx.moveTo(edges[0].rawAx, edges[0].rawAy);
            ctx.lineTo(edges[1].rawAx, edges[1].rawAy);
            ctx.lineTo(edges[2].rawAx, edges[2].rawAy);
            ctx.closePath();
            ctx.fill();

            // 3辺の極太ネオンビーム（外周グロー＋中心ホワイトコア）
            const glowCol = (Math.floor(animTick * 0.3) % 2 === 0) ? "#00f5d4" : "#ff1493";
            ctx.lineCap = "round";

            // Fast neon outer-glow under-stroke
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.strokeStyle = glowCol;
            ctx.lineWidth = 14.0;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
            ctx.restore();

            // Main neon beam
            ctx.strokeStyle = glowCol;
            ctx.lineWidth = 6.5;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });

            // Bright white inner core
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.2;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
          }
          ctx.restore();
        }
      }

      // (B) 1〜2機時のロックオン→発射シーケンス描画（3カウント収束サイト → 赤ロック警報＆台揺らし回避表示！）
      if ((bl.snipePhase === "tracking" || bl.snipePhase === "locked") && bl.snipeBitId) {
        const shooter = allBits.find(x => !x.broken && x.id === bl.snipeBitId);
        const tgt = bl.snipeTargetBall;
        if (shooter && tgt && state.balls.includes(tgt) && !tgt.inShooterLane && !tgt._shattered) {
          const sx = shooter.x;
          const sy = shooter.y + (shooter.bobY || 0);

          ctx.save();
          if (bl.snipePhase === "tracking") {
            const prog = Math.max(0, Math.min(1, 1 - bl.snipePhaseTimer / 45));
            const countNum = Math.max(1, Math.ceil(bl.snipePhaseTimer / 15)); // 3 -> 2 -> 1
            const bx = tgt.x;
            const by = tgt.y;
            const retR = 34 - prog * 21; // 34px -> 13px へ収束！

            // 砲台ビット周囲のチャージリング
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(sx, sy, shooter.r + 4 + (1 - prog) * 10, 0, Math.PI * 2);
            ctx.stroke();

            // 黄色破線レーザーサイト
            ctx.strokeStyle = "rgba(230, 255, 0, 0.78)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -(animTick * 1.8);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);

            // 時計回りのロック進行ゲージリング
            ctx.strokeStyle = "rgba(230, 255, 0, 0.9)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(bx, by, retR + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
            ctx.stroke();

            // 回転しながら収束する4隅ターゲットブラケット
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate((1 - prog) * 0.9);
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.4;
            const arm = Math.max(4.5, retR * 0.42);
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([cxS, cyS]) => {
              ctx.beginPath();
              ctx.moveTo(cxS * retR, cyS * (retR - arm));
              ctx.lineTo(cxS * retR, cyS * retR);
              ctx.lineTo(cxS * (retR - arm), cyS * retR);
              ctx.stroke();
            });
            ctx.restore();

            // 視認性の高いカウントダウンピルバッジ
            const badgeX = Math.max(66, Math.min(330, bx));
            const badgeY = by > 85 ? (by - retR - 14) : (by + retR + 18);
            const labelTxt = bl.nudgedDuringLock ? "✨LOCK BROKEN!" : `🎯LOCK-ON [${countNum}]`;
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            const tw = ctx.measureText(labelTxt).width + 12;
            ctx.fillStyle = "rgba(8, 3, 28, 0.88)";
            ctx.fillRect(badgeX - tw / 2, badgeY - 9, tw, 14);
            ctx.strokeStyle = bl.nudgedDuringLock ? "#00f5d4" : "#e6ff00";
            ctx.lineWidth = 1.3;
            ctx.strokeRect(badgeX - tw / 2, badgeY - 9, tw, 14);
            ctx.fillStyle = bl.nudgedDuringLock ? "#00f5d4" : "#e6ff00";
            ctx.fillText(labelTxt, badgeX, badgeY + 1.5);
          } else {
            // === LOCKED フェーズ（発射直前 0.47秒：赤ロック点滅＆台揺らし回避ウィンドウ！） ===
            const lockProg = Math.max(0, Math.min(1, bl.snipePhaseTimer / 28)); // 1 -> 0 で発射！
            if (bl.nudgedDuringLock) {
              // 台揺らし成功済み：旧予測地点にシアン破線サイトが置き去りになり、球は安全圏へ！
              const ax = bl.staleShot ? bl.staleShot.aimX : tgt.x;
              const ay = bl.staleShot ? bl.staleShot.aimY : tgt.y;
              ctx.strokeStyle = "rgba(0, 245, 212, 0.72)";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(ax, ay);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.strokeStyle = "#00f5d4";
              ctx.lineWidth = 2.0;
              ctx.beginPath();
              ctx.arc(ax, ay, 11, 0, Math.PI * 2);
              ctx.stroke();

              const badgeX = Math.max(66, Math.min(330, tgt.x));
              const badgeY = tgt.y > 76 ? (tgt.y - 22) : (tgt.y + 26);
              const txt = "✨EVADED!!";
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "center";
              const tw = ctx.measureText(txt).width + 12;
              ctx.fillStyle = "rgba(8, 3, 28, 0.90)";
              ctx.fillRect(badgeX - tw / 2, badgeY - 9, tw, 14);
              ctx.strokeStyle = "#00f5d4";
              ctx.lineWidth = 1.4;
              ctx.strokeRect(badgeX - tw / 2, badgeY - 9, tw, 14);
              ctx.fillStyle = "#00f5d4";
              ctx.fillText(txt, badgeX, badgeY + 1.5);
            } else {
              // 未回避：激しいクリムゾンレッド警報レーザーサイト＆収束発射トリガーリング！
              const fastBlink = (Math.floor(animTick * 0.5) % 2 === 0);
              const mainCol = fastBlink ? "#ff1744" : "#e6ff00";
              const bx = tgt.x;
              const by = tgt.y;

              // 砲台側の発射トリガー収束リング（0になった瞬間に発射されるのが直感的に分かる！）
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.arc(sx, sy, shooter.r + 2 + lockProg * 14, 0, Math.PI * 2);
              ctx.stroke();

              // 赤色ソリッド照準ビーム
              // Fast outer glow under-stroke
              ctx.save();
              ctx.globalAlpha = 0.28;
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = (fastBlink ? 2.8 : 2.0) + 6.0;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.restore();

              // Inner solid targeting beam
              ctx.strokeStyle = mainCol;
              ctx.lineWidth = fastBlink ? 2.8 : 2.0;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(bx, by);
              ctx.stroke();

              // ボールに噛み付く二重クリムゾン照準クロスヘア
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.arc(bx, by, 13, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(bx - 18, by); ctx.lineTo(bx - 8, by);
              ctx.moveTo(bx + 8, by);  ctx.lineTo(bx + 18, by);
              ctx.moveTo(bx, by - 18); ctx.lineTo(bx, by - 8);
              ctx.moveTo(bx, by + 8);  ctx.lineTo(bx, by + 18);
              ctx.stroke();

              // 台揺らし回避を促す緊急アラートバッジ
              const badgeX = Math.max(82, Math.min(314, bx));
              const badgeY = by > 82 ? (by - 24) : (by + 28);
              const alertTxt = "⚠️LOCKED! 台揺らし!";
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "center";
              const tw = ctx.measureText(alertTxt).width + 14;
              ctx.fillStyle = fastBlink ? "rgba(180, 0, 36, 0.92)" : "rgba(14, 4, 28, 0.92)";
              ctx.fillRect(badgeX - tw / 2, badgeY - 10, tw, 15);
              ctx.strokeStyle = fastBlink ? "#ffffff" : "#ff1744";
              ctx.lineWidth = 1.6;
              ctx.strokeRect(badgeX - tw / 2, badgeY - 10, tw, 15);
              ctx.fillStyle = fastBlink ? "#ffffff" : "#e6ff00";
              ctx.fillText(alertTxt, badgeX, badgeY + 1.5);
            }
          }
          ctx.restore();
        }
      }

      // (C) 飛翔中のボール粉砕ショートレーザー弾描画
      if (bl.shortLasers && bl.shortLasers.length > 0) {
        ctx.save();
        ctx.lineCap = "round";
        bl.shortLasers.forEach(sl => {
          if (sl.hit) return;
          if (sl.aimTimer > 0 && sl.aimY > 24 && sl.aimY < 580 && sl.aimX > 20 && sl.aimX < 376) {
            ctx.save();
            ctx.strokeStyle = sl.ignoreBall ? "rgba(0, 245, 212, 0.45)" : "rgba(255, 23, 68, 0.55)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(sl.aimX, sl.aimY, 6.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          const tx = sl.x - sl.ux * sl.len;
          const ty = sl.y - sl.uy * sl.len;

          // Fast neon outer-glow under-stroke
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = "#ff1744";
          ctx.lineWidth = 14.0;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();
          ctx.restore();

          // Main laser beam
          ctx.strokeStyle = "#ff1744";
          ctx.lineWidth = 6.8;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();

          // Bright inner core
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sl.x, sl.y, 3.0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }

    allBits.forEach(bit => {
      if (!bit || bit.broken) return;
      const by = bit.y + (bit.bobY || 0);
      const isSnipeShooter = bl && (bl.snipePhase === "tracking" || bl.snipePhase === "locked") && bl.snipeBitId === bit.id;
      const isDeltaActive = bl && (bl.triMode === "charge" || bl.triMode === "fire") && bl.deltaBitIds && bl.deltaBitIds.includes(bit.id);
      const col = isSnipeShooter
        ? (bl.snipePhase === "locked" ? "#ff1744" : "#e6ff00")
        : (isDeltaActive ? "#ff1493" : (bit.mode === "move" ? "#e6ff00" : "#00f5d4"));
      drawGuide(bit.x, by, bit.r, col, bit.flash, bit.rot, bit.label, `HP:${bit.hp}/${bit.maxHP}`);
    });

    // 3. 左右の手（通常: バウンス / 吸引中: 破壊進行度LV.1〜4に応じた大渦＆吸引テザー電撃 / 転送中: 電脳ワープライン）
    const hands = b.hands;
    if (hands) {
      const lv = hands.suctionLevel || 1;
      if (hands.mode === "open") {
        const openCol = lv >= 4 ? "#ff1493" : "#ff66b2";
        Particles.drawBounceBumperGuide(ctx, animTick, b.handL.x, b.handL.y, b.handL.r, openCol, b.handL.flash, "L-HAND", `GLOVE [LV.${lv}]`);
        Particles.drawBounceBumperGuide(ctx, animTick, b.handR.x, b.handR.y, b.handR.r, openCol, b.handR.flash, "R-HAND", `GLOVE [LV.${lv}]`);
      } else if (hands.mode === "suction") {
        const ringCount = Math.min(4, 1 + lv);
        const speedMul = 0.038 + lv * 0.012;
        [b.handL, b.handR].forEach(h => {
          ctx.save();
          ctx.translate(h.x, h.y);
          for (let ring = 0; ring < ringCount; ring++) {
            const phase = ((animTick * speedMul) + ring / ringCount) % 1.0;
            const rad = hands.suctionRadius * (1.0 - phase);
            const alpha = (phase * (0.50 + lv * 0.11)).toFixed(2);
            ctx.strokeStyle = lv >= 4
              ? (ring % 2 === 0 ? `rgba(255, 20, 147, ${alpha})` : `rgba(230, 255, 0, ${alpha})`)
              : (ring % 2 === 0 ? `rgba(255, 20, 147, ${alpha})` : `rgba(0, 245, 212, ${alpha})`);
            ctx.lineWidth = 1.4 + phase * (1.0 + lv * 0.35);
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(4, rad), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // 吸引圏内に入ったボールへ伸びる電脳キャプチャ・テザービーム！
          state.balls.forEach(ball => {
            if (ball.inShooterLane || ball._capturedByHand || (ball._handThrowGrace && ball._handThrowGrace > 0)) return;
            const d = Math.hypot(h.x - ball.x, h.y - ball.y);
            if (d < hands.suctionRadius) {
              ctx.save();
              const tAlpha = Math.pow(1.0 - d / hands.suctionRadius, 0.85) * 0.92;
              ctx.strokeStyle = lv >= 3 ? `rgba(230, 255, 0, ${tAlpha.toFixed(2)})` : `rgba(0, 245, 212, ${tAlpha.toFixed(2)})`;
              ctx.lineWidth = 1.6 + lv * 0.45;
              ctx.beginPath();
              ctx.moveTo(h.x, h.y);
              const mx = (h.x + ball.x) / 2 + (Math.random() - 0.5) * (4 + lv * 2);
              const my = (h.y + ball.y) / 2 + (Math.random() - 0.5) * (4 + lv * 2);
              ctx.lineTo(mx, my);
              ctx.lineTo(ball.x, ball.y);
              ctx.stroke();
              ctx.restore();
            }
          });

          const subLbl = lv >= 4 ? "🌀MAX VACUUM!" : `🌀VACUUM LV.${lv}`;
          const gCol = lv >= 4 ? "#ff1493" : "#e6ff00";
          Particles.drawBounceBumperGuide(ctx, animTick, h.x, h.y, h.r, gCol, h.flash, h.label, subLbl);
        });
      } else if (hands.mode === "transfer") {
        const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
        const exitHand = hands.exitSide === "L" ? b.handL : b.handR;
        const progress = 1 - hands.timer / (hands.transferTotal || 44);
        const midX = (catchHand.x + exitHand.x) / 2;
        const midY = (catchHand.y + exitHand.y) / 2 - 42;

        ctx.save();
        ctx.strokeStyle = lv >= 4 ? "rgba(255, 20, 147, 0.90)" : "rgba(0, 245, 212, 0.85)";
        ctx.lineWidth = 2.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(catchHand.x, catchHand.y);
        ctx.quadraticCurveTo(midX, midY, exitHand.x, exitHand.y);
        ctx.stroke();

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
        Particles.drawBounceBumperGuide(ctx, animTick, exitHand.x, exitHand.y, exitHand.r, "#e6ff00", 8, exitHand.label, "⚡THROW!");
      }
    }

    // 4. 腰部サイバーポート ＆ 太ももガーターリボン飾り ＆ 左下ブーツ
    if (b.hipPort) {
      const hp = b.hipPort;
      if (!hp.broken) {
        drawGuide(hp.x, hp.y, hp.r, "#00f5d4", hp.flash, -animTick * 0.025, "HIP PORT", `HP:${hp.hp}/${hp.maxHP}`);
      } else {
        Particles.drawBounceBumperGuide(ctx, animTick, hp.x, hp.y, hp.r, "#e6ff00", hp.flash, "HIP PORT", "⚡SPARK");
      }
    }
    if (b.garterRibbon) {
      const gr = b.garterRibbon;
      const tx = b.thigh ? b.thigh.dx * 0.35 : 0;
      const ty = b.thigh ? b.thigh.dy * 0.35 : 0;
      Particles.drawBounceBumperGuide(
        ctx,
        animTick,
        gr.x + tx,
        gr.y + ty,
        gr.r,
        "#ff66b2",
        gr.flash,
        "RIBBON",
        "CHARM BOING"
      );
    }
    if (b.bootKicker) {
      const bk = b.bootKicker;
      Particles.drawBounceBumperGuide(ctx, animTick, bk.x, bk.y, bk.r, "#00f5d4", bk.flash, "BOOT", "BOUNCE");
    }

    // 6. 右膝当てアーマー（未破壊時はHPガイド、破壊後はバウンスバンパー）
    const knee = b.kneePad;
    if (knee) {
      if (!knee.broken) {
        drawGuide(knee.x, knee.y, knee.r, "#b84dff", knee.flash, animTick * 0.02, "KNEE PAD", `HP:${knee.hp}/${knee.maxHP}`);
      } else {
        Particles.drawBounceBumperGuide(ctx, animTick, knee.x, knee.y, knee.r, "#ff66b2", knee.flash, "KNEE", "BOUNCE");
      }
    }

    // 7. 胸部ビスチェ装甲 / パージ後ソフトバスト（ガイド円の追従量は抑え、背景絵のぷるぷる相対変位がより映えるようにする）
    if (!b.chestArmorBroken) {
      const lx = b.bustL.x + b.bustL.dx * 0.25;
      const ly = b.bustL.y + b.bustL.dy * 0.25;
      const rx = b.bustR.x + b.bustR.dx * 0.25;
      const ry = b.bustR.y + b.bustR.dy * 0.25;
      if (state.phase < 2) {
        drawGuide(lx, ly, b.bustL.r, "#b59ce6", b.bustL.flash, -animTick * 0.015, "L-BUSTIER", "🛡️LOCKED");
        drawGuide(rx, ry, b.bustR.r, "#b59ce6", b.bustR.flash, animTick * 0.015, "R-BUSTIER", "🛡️LOCKED");
      } else {
        drawGuide(lx, ly, b.bustL.r, "#ff1493", b.bustL.flash, -animTick * 0.025, "L-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
        drawGuide(rx, ry, b.bustR.r, "#ff1493", b.bustR.flash, animTick * 0.025, "R-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
      }
    } else {
      const bustCol = state.fever.active ? "#e6ff00" : "#ff1493";
      const subTxt = state.fever.active ? "♥FEVER♥" : "♥SOFT";
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx, b.bustL.y + b.bustL.dy, b.bustL.r, bustCol, b.bustL.flash, "L-BUST", subTxt);
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx, b.bustR.y + b.bustR.dy, b.bustR.r, bustCol, b.bustR.flash, "R-BUST", subTxt);
    }

    // 8. 首元のグリーンのペンダント・コア
    const core = b.core;
    if (core) {
      if (state.phase === 3 && core.unlocked) {
        drawGuide(core.x, core.y, core.r, "#00f5d4", core.flash, animTick * 0.04, "★PENDANT CORE★", `HP:${core.hp}/${core.maxHP}`);
      } else {
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

// =========================================================================
// PINBALL ENGINE - SYSTEMS (BUFFS, SCORING, FEVER, CAPSULES & BALLS)
// =========================================================================

window.Systems = {
  // 全システム共通のゲームバランス定数（調整時の単一参照先）
  // ※スコア関連の値は js/engine/score_table.js（ScoreTable）で一元管理する。
  BALANCE: {
    FEVER_DURATION_FRAMES: 60 * 18,
    FEVER_MULT: 2.5,
    FEVER_TARGET_BALLS: 3,
    BURST_DURATION_FRAMES: 60 * 10,
    CAPSULE_LIFE_FRAMES: 960,
    MISS_FEVER_KEEP_RATIO: 0.5
  },

  // 基礎点を表示スケールへ変換する（ボーナス・ペナルティ等、倍率を通さない加減算用）
  scaled(basePts) {
    return Math.round(basePts * (window.ScoreTable.SCORE_SCALE || 1));
  },

  // カンスト上限（9,999,999,999）でスコアをクランプする
  capScore(val) {
    const cap = (window.ScoreTable && ScoreTable.SCORE_CAP) || 9999999999;
    return Math.min(cap, Math.max(0, Math.round(val)));
  },

  // ステージ制限時間（5:00）内は 1.0、タイムアップ（0:00超過）後は 0.0（新規加点・Fever停止）
  getAntiStallScale(state) {
    if (!state || !window.ScoreTable || !ScoreTable.stageTimer) return 1.0;
    const limit = ScoreTable.stageTimer.LIMIT_FRAMES || (60 * 300);
    return (state.stagePlayFrames || 0) >= limit ? 0.0 : 1.0;
  },

  // タイムオーバー中の毎フレーム・スコア減少処理（『まもるクン』式のプレッシャー演出）
  applyOvertimeDrain(state) {
    if (!state || state.score <= 0 || !window.ScoreTable || !ScoreTable.stageTimer) return 0;
    const st = ScoreTable.stageTimer;
    const limit = st.LIMIT_FRAMES || (60 * 300);
    const overFrames = (state.stagePlayFrames || 0) - limit;
    if (overFrames <= 0) return 0;

    const overSec = overFrames / 60;
    const flatLoss = this.scaled(st.OVERTIME_DRAIN_BASE_PER_FRAME + overSec * st.OVERTIME_DRAIN_ACCEL_PER_SEC);
    const ratioLoss = Math.floor(state.score * (st.OVERTIME_DRAIN_RATIO_PER_FRAME || 0));
    const jitter = (overFrames * 7) % 13; // 下桁が毎フレーム激しく回転するよう端数を付与
    const loss = Math.min(state.score, Math.max(1, flatLoss + ratioLoss + jitter));
    state.score = Math.max(0, state.score - loss);
    state.stageEarnedScore = Math.min(state.score, Math.max(0, (state.stageEarnedScore || 0) - loss));
    return loss;
  },

  PERM_DEFS: {
    centerPost: {
      id: "centerPost",
      get name() { return t("perm.centerPost.name"); },
      get desc() { return t("perm.centerPost.desc"); },
      maxLv: 2
    },
    kickbackL: {
      id: "kickbackL",
      get name() { return t("perm.kickbackL.name"); },
      get desc() { return t("perm.kickbackL.desc"); },
      maxLv: 1
    },
    kickbackR: {
      id: "kickbackR",
      get name() { return t("perm.kickbackR.name"); },
      get desc() { return t("perm.kickbackR.desc"); },
      maxLv: 1
    },
    wideFlipper: {
      id: "wideFlipper",
      get name() { return t("perm.longFlipper.name"); },
      get desc() { return t("perm.longFlipper.desc"); },
      maxLv: 2
    }
  },

  BUFF_DEFS: {
    mult2x:   { id: "mult2x",   get label() { return t("buff.mult2x.label"); },   color: "#ff1493", mult: 2.0, get desc() { return t("buff.mult2x.desc"); } },
    overdrive:{ id: "overdrive",get label() { return t("buff.overdrive.label"); },color: "#e6ff00", mult: 1.8, get desc() { return t("buff.overdrive.desc"); } },
    magnet:   { id: "magnet",   get label() { return t("buff.magnet.label"); },   color: "#00f5d4", mult: 1.5, get desc() { return t("buff.magnet.desc"); } },
    fever:    { id: "fever",    get label() { return t("buff.fever.label"); },    color: "#b84dff", mult: 1.6, get desc() { return t("buff.fever.desc"); } }
  },

  LOADOUT_MAX_COST: 3,
  DEFAULT_LOADOUT: ["centerPost", "kickbackL", "kickbackR"],
  LOADOUT_DEFS: [
    { id: "centerPost",     cost: 1, icon: "🛡️", color: "#00f5d4", get name() { return t("deck.mod.centerPost.name"); },     get desc() { return t("deck.mod.centerPost.desc"); } },
    { id: "kickbackL",      cost: 1, icon: "⚡", color: "#00f5d4", get name() { return t("deck.mod.kickbackL.name"); },      get desc() { return t("deck.mod.kickbackL.desc"); } },
    { id: "kickbackR",      cost: 1, icon: "⚡", color: "#00f5d4", get name() { return t("deck.mod.kickbackR.name"); },      get desc() { return t("deck.mod.kickbackR.desc"); } },
    { id: "wideFlipper",    cost: 2, icon: "↔️", color: "#e6ff00", get name() { return t("deck.mod.wideFlipper.name"); },    get desc() { return t("deck.mod.wideFlipper.desc"); } },
    { id: "startOverdrive", cost: 1, icon: "⚡", color: "#e6ff00", get name() { return t("deck.mod.startOverdrive.name"); }, get desc() { return t("deck.mod.startOverdrive.desc"); } },
    { id: "startMagnet",    cost: 1, icon: "🧲", color: "#00f5d4", get name() { return t("deck.mod.startMagnet.name"); },    get desc() { return t("deck.mod.startMagnet.desc"); } },
    { id: "highRiskMult",   cost: 1, icon: "🔥", color: "#ff1493", get name() { return t("deck.mod.highRiskMult.name"); },   get desc() { return t("deck.mod.highRiskMult.desc"); } }
  ],

  BOSS_RELIC_BY_STAGE: {
    1: "lilith_gravity",
    2: "celty_fission",
    3: "noa_bit",
    4: "kasumi_chakra"
  },

  RELIC_DEFS: {
    lilith_gravity: { id: "lilith_gravity", icon: "🌀", color: "#ff1493", isBoss: true,  bossStage: 1, maxStack: 1,  get name() { return t("relic.lilith_gravity.name"); }, get short() { return t("relic.lilith_gravity.short"); }, get desc() { return t("relic.lilith_gravity.desc"); } },
    celty_fission:  { id: "celty_fission",  icon: "⚡", color: "#e6ff00", isBoss: true,  bossStage: 2, maxStack: 1,  get name() { return t("relic.celty_fission.name"); },  get short() { return t("relic.celty_fission.short"); },  get desc() { return t("relic.celty_fission.desc"); } },
    noa_bit:        { id: "noa_bit",        icon: "🛡️", color: "#00f5d4", isBoss: true,  bossStage: 3, maxStack: 1,  get name() { return t("relic.noa_bit.name"); },        get short() { return t("relic.noa_bit.short"); },        get desc() { return t("relic.noa_bit.desc"); } },
    kasumi_chakra:  { id: "kasumi_chakra",  icon: "🌸", color: "#ff66cc", isBoss: true,  bossStage: 4, maxStack: 1,  get name() { return t("relic.kasumi_chakra.name"); },  get short() { return t("relic.kasumi_chakra.short"); },  get desc() { return t("relic.kasumi_chakra.desc"); } },
    radar:          { id: "radar",          icon: "📡", color: "#e6ff00", isBoss: false, bossStage: 0, maxStack: 99, get name() { return t("relic.radar.name"); },          get short() { return t("relic.radar.short"); },          get desc() { return t("relic.radar.desc"); } },
    spring:         { id: "spring",         icon: "⚙️", color: "#00f5d4", isBoss: false, bossStage: 0, maxStack: 2,  get name() { return t("relic.spring.name"); },         get short() { return t("relic.spring.short"); },         get desc() { return t("relic.spring.desc"); } },
    drone:          { id: "drone",          icon: "🤖", color: "#ff66b2", isBoss: false, bossStage: 0, maxStack: 1,  get name() { return t("relic.drone.name"); },          get short() { return t("relic.drone.short"); },          get desc() { return t("relic.drone.desc"); } },
    fever_cap:      { id: "fever_cap",      icon: "🔥", color: "#b84dff", isBoss: false, bossStage: 0, maxStack: 2,  get name() { return t("relic.fever_cap.name"); },      get short() { return t("relic.fever_cap.short"); },      get desc() { return t("relic.fever_cap.desc"); } },
    holo_magnet:    { id: "holo_magnet",    icon: "🧲", color: "#00f5d4", isBoss: false, bossStage: 0, maxStack: 1,  get name() { return t("relic.holo_magnet.name"); },    get short() { return t("relic.holo_magnet.short"); },    get desc() { return t("relic.holo_magnet.desc"); } },
    burst_core:     { id: "burst_core",     icon: "💥", color: "#ff1493", isBoss: false, bossStage: 0, maxStack: 2,  get name() { return t("relic.burst_core.name"); },     get short() { return t("relic.burst_core.short"); },     get desc() { return t("relic.burst_core.desc"); } }
  },

  createEmptyRelics() {
    const out = {};
    Object.keys(this.RELIC_DEFS).forEach(k => { out[k] = 0; });
    return out;
  },

  CAPSULE_SLOTS: [
    { x: 74,  y: 220 }, // Under Left Drone
    { x: 322, y: 220 }, // Under Right Drone
    { x: 198, y: 110 }, // Between Ears / Upper Orbit
    { x: 80,  y: 330 }, // Left Shoulder Spot
    { x: 316, y: 330 }, // Right Shoulder Spot
    { x: 198, y: 440 }  // Mid Abdomen
  ],

  // 各ステージ共通の顔パッチ読み込み。
  // 素材は assets/<stage>/faces/<表情>.png に置き、js/<stage>_assets.js に同じ内容を Base64 で埋め込む。
  // 埋め込みがあればそれを使い（file:// でも動く）、無い表情だけ faces/ の PNG を読む。
  loadFacePatches(stageDir, embedded, keys) {
    const data = embedded || {};
    const names = Array.from(new Set([...(keys || []), ...Object.keys(data)]));
    const imgs = {};
    names.forEach(k => {
      const im = new Image();
      im.src = data[k] || `./assets/${stageDir}/faces/${k}.png`;
      imgs[k] = im;
    });
    return imgs;
  },

  addScore(state, basePts, x, y, label = "", opts = null) {
    const stallScale = (opts && opts.exemptDecay) ? 1.0 : this.getAntiStallScale(state);
    // FEVER と BURST の同時発動時は乗算爆発を防ぎつつ重ね掛けの旨味を残す加算合成: 1 + (fever - 1) + (burst - 1)
    const buffMult = 1 + (state.fever.mult - 1) + (state.burstMultiplier - 1);
    const gravScoreMult = (state.relics && state.relics.lilith_gravity > 0)
      ? ((window.ScoreTable && ScoreTable.multiplier.LILITH_GRAVITY_SCORE_MULT) || 0.70)
      : 1.0;
    const totalMult = state.baseMultiplier * buffMult * gravScoreMult;
    const pts = Math.round(basePts * (window.ScoreTable.SCORE_SCALE || 1) * totalMult * stallScale);
    state.score = this.capScore((state.score || 0) + pts);
    state.stageEarnedScore = Math.min(state.score, this.capScore((state.stageEarnedScore || 0) + pts));
    state.peakScore = Math.max(state.peakScore || 0, state.score);

    if (pts <= 0 && stallScale <= 0) {
      if (label) Particles.addPopup(state, x, y, `${label} +0`, "#888888", 0.85);
    } else if (label) {
      Particles.addPopup(state, x, y, `${label} +${pts.toLocaleString()}`, totalMult > 1.5 ? "#e6ff00" : "#00f5d4");
    } else {
      Particles.addPopup(state, x, y, `+${pts.toLocaleString()}`, "#ffffff", 0.9);
    }

    if (!state._inDeckBonusDamage && !(opts && opts.fromDeckEffect) && window.GameEngine && GameEngine._activeCollisionBall) {
      this.handleDeckBallHitProc(state, GameEngine._activeCollisionBall, basePts, x, y);
    }

    if (window.UI) window.UI.updateHUD(state);
  },

  deductScore(state, amount, x, y, label = "", opts = null) {
    if (!state || state.stageCleared || state.inTitle || state.inEnding || state.gameOver) return;
    const allowPreLaunch = !!(opts && opts.allowPreLaunch);
    if (!allowPreLaunch && state.balls && state.balls.length > 0 && state.balls.every(b => b.inShooterLane)) return;
    const rawAmt = Math.max(0, this.scaled(amount));
    const loss = Math.min(state.score || 0, rawAmt);
    if (loss <= 0) {
      if (allowPreLaunch && rawAmt > 0) {
        const txt = label ? `${label} -${rawAmt.toLocaleString()}` : `-${rawAmt.toLocaleString()}`;
        Particles.addPopup(state, x, y, txt, "#ff5588", 0.88);
      }
      return;
    }
    state.score = Math.max(0, state.score - loss);
    state.stageEarnedScore = Math.min(state.score, Math.max(0, (state.stageEarnedScore || 0) - loss));
    const txt = label ? `${label} -${loss.toLocaleString()}` : `-${loss.toLocaleString()}`;
    Particles.addPopup(state, x, y, txt, "#ff5588", 0.88);
    if (window.UI) window.UI.updateHUD(state);
  },

  getFeverDurationFrames(state) {
    const capCount = (state && state.relics && state.relics.fever_cap) || 0;
    return this.BALANCE.FEVER_DURATION_FRAMES + capCount * 240;
  },

  addFever(state, amount) {
    if (state.fever.active) return;
    const capCount = (state && state.relics && state.relics.fever_cap) || 0;
    const boost = 1 + capCount * 0.30;
    const gravFeverMult = (state.relics && state.relics.lilith_gravity > 0)
      ? ((window.ScoreTable && ScoreTable.multiplier.LILITH_GRAVITY_FEVER_MULT) || 0.75)
      : 1.0;
    const effAmount = amount * boost * gravFeverMult * this.getAntiStallScale(state);
    if (effAmount <= 0) return;
    state.fever.gauge = Math.min(100, state.fever.gauge + effAmount);
    if (state.fever.gauge >= 100) {
      this.startFeverMode(state);
    }
    if (window.UI) window.UI.updateHUD(state);
  },

  startFeverMode(state) {
    state.fever.active = true;
    state.fever.timer = this.getFeverDurationFrames(state);
    state.fever.gauge = 100;
    state.fever.mult = this.BALANCE.FEVER_MULT;

    if (window.sfx && window.sfx.feverStart) window.sfx.feverStart();

    // Spawn multiballs up to target count
    while (state.balls.length < this.BALANCE.FEVER_TARGET_BALLS) {
      const offset = (Math.random() - 0.5) * 40;
      this.spawnBall(state, 198 + offset, 240, (Math.random() - 0.5) * 6, -8);
    }

    if (window.UI) window.UI.showCutin(t("systems.feverEnter"), 200);
    Particles.add(state, 210, 330, "#ff1493", 35, 6.0);
    Particles.add(state, 210, 330, "#e6ff00", 25, 5.0);
    if (window.UI) window.UI.updateHUD(state);
  },

  endFeverMode(state) {
    state.fever.active = false;
    state.fever.timer = 0;
    state.fever.gauge = 0;
    state.fever.mult = 1.0;
    if (window.UI) window.UI.showCutin(t("systems.feverEnd"), 100);
    if (window.UI) window.UI.updateHUD(state);
  },

  evaluateBurstHand(state) {
    const activeList = (state && state.keptBuffs ? state.keptBuffs : []).filter(Boolean);
    const count = activeList.length;
    if (count === 0) {
      return {
        count: 0,
        mult: 1.0,
        durationFrames: 0,
        handType: null,
        overdriveRank: 0,
        magnetRank: 0,
        feverRank: 0,
        extraBalls: 0,
        instantFeverAdd: 0
      };
    }

    const bc = (window.ScoreTable && ScoreTable.burst) || {
      TIER_STEP: 0.75,
      SLOT_SYNERGY_STEP: 0.20,
      MAX_MULT: 10.0,
      HAND_TRINITY: 1.15,
      HAND_OVERCLOCK: 1.25,
      HAND_FULL_DRIVE: 1.35,
      FULL_DRIVE_EXTRA_SEC: 4,
      BURST_CORE_ADD_MULT: 0.6,
      BURST_CORE_EXTRA_SEC: 4
    };

    let addSum = 0.0;
    const idCounts = {};
    let hasTier3 = false;
    let overdriveRank = 0;
    let magnetRank = 0;
    let feverRank = 0;

    activeList.forEach(item => {
      const def = this.BUFF_DEFS[item.id];
      if (!def) return;
      const tierFactor = 1 + (item.tier - 1) * bc.TIER_STEP;
      addSum += (def.mult - 1.0) * tierFactor;
      idCounts[item.id] = (idCounts[item.id] || 0) + 1;
      if (item.tier >= 3) hasTier3 = true;
      if (item.id === "overdrive") overdriveRank = Math.max(overdriveRank, item.tier);
      if (item.id === "magnet") magnetRank = Math.max(magnetRank, item.tier);
      if (item.id === "fever") feverRank = Math.max(feverRank, item.tier);
    });

    const uniqueSize = Object.keys(idCounts).length;
    const hasDupSlot = Object.values(idCounts).some(c => c >= 2);
    const synergy = 1 + (count - 1) * bc.SLOT_SYNERGY_STEP;

    let handType = null;
    let handMult = 1.0;
    let extraSec = 0;
    if (uniqueSize === 4) {
      handType = "full_drive";
      handMult = bc.HAND_FULL_DRIVE || 1.35;
      extraSec = bc.FULL_DRIVE_EXTRA_SEC || 4;
    } else if ((hasTier3 && count >= 2) || hasDupSlot) {
      handType = "overclock";
      handMult = bc.HAND_OVERCLOCK || 1.25;
    } else if (uniqueSize === 3) {
      handType = "trinity";
      handMult = bc.HAND_TRINITY || 1.15;
    } else if (count >= 2) {
      handType = "pair";
    }

    if (handType === "full_drive" || handType === "overclock") {
      if (overdriveRank > 0) overdriveRank += 1;
      if (magnetRank > 0) magnetRank += 1;
      if (feverRank > 0) feverRank += 1;
    }

    const burstCoreCount = (state && state.relics && state.relics.burst_core) || 0;
    const rawMult = Math.min(
      bc.MAX_MULT,
      (1.0 + addSum) * synergy * handMult + burstCoreCount * (bc.BURST_CORE_ADD_MULT || 0.6)
    );
    const mult = Math.round(rawMult * 10) / 10;
    const extraBalls = feverRank >= 3 ? 2 : ((feverRank >= 1 || count >= 3) ? 1 : 0);
    const instantFeverAdd = feverRank >= 3 ? 60 : (feverRank === 2 ? 35 : (feverRank === 1 ? 15 : 0));
    const durationFrames =
      this.BALANCE.BURST_DURATION_FRAMES +
      (extraSec + burstCoreCount * (bc.BURST_CORE_EXTRA_SEC || 4)) * 60;

    return {
      count,
      mult,
      durationFrames,
      handType,
      overdriveRank,
      magnetRank,
      feverRank,
      extraBalls,
      instantFeverAdd
    };
  },

  triggerBurst(state) {
    const evalRes = this.evaluateBurstHand(state);
    if (evalRes.count === 0) {
      Particles.addPopup(state, 210, 520, "NO BUFFS!", "#ff1493", 1.0);
      return;
    }
    if (window.sfx) window.sfx.burstTrigger();

    state.burstMultiplier = evalRes.mult;
    state.burstTimer = evalRes.durationFrames;
    state.overdriveRank = evalRes.overdriveRank;
    state.magnetRank = evalRes.magnetRank;
    state.overdriveActive = evalRes.overdriveRank > 0;
    state.magnetActive = evalRes.magnetRank > 0;
    state.keptBuffs = [null, null, null, null];

    for (let i = 0; i < evalRes.extraBalls && state.balls.length < 5; i++) {
      this.spawnBall(state, 198 + (Math.random() - 0.5) * 32, 260, (Math.random() - 0.5) * 6, -7);
    }

    if (evalRes.instantFeverAdd > 0) {
      this.addFever(state, evalRes.instantFeverAdd);
    }

    // Lilith Signature Relic: BURST-triggered inverted-gravity EMP lifts active balls moderately
    if (state.relics && state.relics.lilith_gravity > 0 && state.balls) {
      let lifted = 0;
      state.balls.forEach(b => {
        if (!b.inShooterLane && !b._onWireRamp && b.y > 180) {
          b.vy = Math.min(b.vy, -6.8);
          b.vx += (Math.random() - 0.5) * 3.0;
          lifted++;
        }
      });
      if (state.shockwaves) {
        state.shockwaves.push({ x: 198, y: 560, r: 10, maxR: 135, speed: 5.5, color: "#ff1493", lineWidth: 3.2, alpha: 0.95 });
      }
      Particles.add(state, 198, 560, "#ff1493", 20, 5.2);
      if (lifted > 0) {
        Particles.addPopup(state, 198, 515, "🌀GRAV-EMP!!", "#ff1493", 1.25);
      }
    }

    if (state.boss) {
      state.boss.expression = "shock";
      state.boss.expressionTimer = 55;
    }
    Particles.add(state, 210, 340, "#e6ff00", 28, 5.5);
    const durSec = Math.round(evalRes.durationFrames / 60);
    if (window.UI) {
      if (evalRes.handType === "full_drive" || evalRes.handType === "overclock" || evalRes.handType === "trinity") {
        window.UI.showCutin(
          t("systems.burstTriggerHand", {
            hand: t(`systems.hand.${evalRes.handType}`),
            mult: state.burstMultiplier.toFixed(1),
            sec: durSec
          }),
          180
        );
      } else {
        window.UI.showCutin(t("systems.burstTrigger", { mult: state.burstMultiplier.toFixed(1), sec: durSec }), 180);
      }
      window.UI.updateHUD(state);
    }
  },

  // 全ステージ共通のドロップ規則。ステージ側はカプセルの種類を直接指定せず、
  // イベントの重さ（tier）と出現位置だけを渡す。種類の配分はここで一元管理する。
  //   minor : 小イベント（スキルショット・ジャックポット等）→ 一時バフ
  //   major : パーツ破壊 → 永続強化 MAJOR_PERM_RATE / 一時バフ 残り
  //   rare  : フェーズ突破・スキルショット等の山場 → 永続強化 確定
  // at: スロット番号、または {x, y}（最寄りの空きスロットに出す）
  DROP_TIERS: { minor: 0, major: 0.5, rare: 1 },
  dropReward(state, tier, at = null) {
    const rate = this.DROP_TIERS[tier] !== undefined ? this.DROP_TIERS[tier] : 0;
    let category = Math.random() < rate ? "perm" : "buff";
    // 永続強化が全て最大レベルなら、空振りの永続カプセルではなく一時バフを出す
    if (category === "perm" && !Object.keys(this.PERM_DEFS).some(k => (state.perm[k] || 0) < this.PERM_DEFS[k].maxLv)) {
      category = "buff";
    }
    let slot = null;
    if (typeof at === "number") {
      slot = at;
    } else if (at && typeof at.x === "number") {
      const occupied = state.capsules.map(c => c.slotIndex);
      let best = -1, bestD = Infinity;
      this.CAPSULE_SLOTS.forEach((sp, idx) => {
        if (occupied.includes(idx)) return;
        const d = (sp.x - at.x) ** 2 + (sp.y - at.y) ** 2;
        if (d < bestD) { bestD = d; best = idx; }
      });
      slot = best >= 0 ? best : null;
    }
    this.spawnFloatingCapsule(state, slot, category);
  },

  spawnFloatingCapsule(state, slotIdx = null, category = null) {
    if (window.sfx) window.sfx.capsuleDrop();
    const occupiedSlots = state.capsules.map(c => c.slotIndex);
    let available = this.CAPSULE_SLOTS.map((s, idx) => idx).filter(idx => !occupiedSlots.includes(idx));
    if (available.length === 0) available = [0, 1, 2, 3, 4, 5];

    const targetIdx = (slotIdx !== null && slotIdx >= 0 && slotIdx < this.CAPSULE_SLOTS.length)
      ? slotIdx
      : available[Math.floor(Math.random() * available.length)];

    const slotPos = this.CAPSULE_SLOTS[targetIdx];
    const isPerm = category ? category === "perm" : Math.random() < 0.45;
    const lifeMult = (state && state.relics && state.relics.holo_magnet > 0) ? 1.5 : 1.0;
    const capLife = Math.round(this.BALANCE.CAPSULE_LIFE_FRAMES * lifeMult);

    if (isPerm) {
      const keys = Object.keys(this.PERM_DEFS);
      const availableUpgrades = keys.filter(k => state.perm[k] < this.PERM_DEFS[k].maxLv);
      const pickKey = availableUpgrades.length > 0
        ? availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
        : keys[Math.floor(Math.random() * keys.length)];
      const labels = {
        centerPost: "STOPPER",
        kickbackL: "L-LASER",
        kickbackR: "R-LASER",
        wideFlipper: "WIDE-FLP"
      };
      state.capsules.push({
        slotIndex: targetIdx,
        x: slotPos.x,
        y: slotPos.y,
        baseY: slotPos.y,
        phase: Math.random() * Math.PI * 2,
        r: 15,
        life: capLife,
        maxLife: capLife,
        category: "perm",
        subId: pickKey,
        label: labels[pickKey] || "UPGRADE",
        color: "#00f5d4"
      });
    } else {
      const buffKeys = Object.keys(this.BUFF_DEFS);
      const pickBuff = buffKeys[Math.floor(Math.random() * buffKeys.length)];
      const def = this.BUFF_DEFS[pickBuff];
      state.capsules.push({
        slotIndex: targetIdx,
        x: slotPos.x,
        y: slotPos.y,
        baseY: slotPos.y,
        phase: Math.random() * Math.PI * 2,
        r: 15,
        life: capLife,
        maxLife: capLife,
        category: "buff",
        subId: pickBuff,
        label: def.label,
        color: def.color
      });
    }
  },

  collectCapsule(state, cap) {
    if (window.sfx) window.sfx.capsuleCatch();
    Particles.add(state, cap.x, cap.y, cap.color, 18, 4.5);
    if (state.boss) {
      state.boss.winkTimer = 45;
      state.boss.talkTimer = 65;
      if (state.boss.hairSpring) state.boss.hairSpring.vy -= 2.2;
    }

    if (cap.category === "perm") {
      const key = cap.subId;
      const def = this.PERM_DEFS[key];
      if (state.perm[key] < def.maxLv) {
        state.perm[key]++;
        if (key === "centerPost") state.perm.centerPostHP = 3;
        if (key === "kickbackL") state.perm.kickbackL_charges = 1;
        if (key === "kickbackR") state.perm.kickbackR_charges = 1;
        Particles.addPopup(state, cap.x, cap.y - 12, `🛠 ${def.name} Lv.${state.perm[key]}`, "#00f5d4", 1.15);
        if (window.UI) window.UI.showCutin(t("systems.permDrop", { name: def.name, lv: state.perm[key] }), 160);
      } else {
        if (key === "centerPost") state.perm.centerPostHP = 3;
        if (key === "kickbackL") state.perm.kickbackL_charges = 1;
        if (key === "kickbackR") state.perm.kickbackR_charges = 1;
        this.addScore(state, ScoreTable.common.PERM_MAX_REPAIR, cap.x, cap.y, "MAX REPAIR", { fromDeckEffect: true });
      }
    } else {
      const key = cap.subId;
      const def = this.BUFF_DEFS[key];
      const isFeverCard = key === "fever";
      if (isFeverCard) {
        this.addFever(state, 25);
      }
      const existingIdx = state.keptBuffs.findIndex(b => b && b.id === key && b.tier < 3);
      if (existingIdx !== -1) {
        state.keptBuffs[existingIdx].tier++;
        const newTier = state.keptBuffs[existingIdx].tier;
        Particles.addPopup(state, cap.x, cap.y - 12, t("systems.buffMergePopup", { tier: newTier }), "#e6ff00", 1.2);
        if (window.UI) window.UI.showCutin(t("systems.buffMergeCutin", { label: def.label, tier: newTier }), 160);
      } else {
        const emptyIdx = state.keptBuffs.findIndex(b => b === null);
        if (emptyIdx !== -1) {
          state.keptBuffs[emptyIdx] = { id: key, tier: 1 };
          const msg = isFeverCard ? t("systems.feverKeepPopup") : `KEEP! ${def.label}`;
          Particles.addPopup(state, cap.x, cap.y - 12, msg, def.color, 1.1);
        } else {
          // 4 slots full: upgrade the lowest-tier slot (< 3), or convert to score + fever if all ★3
          let targetSlot = -1;
          let lowestTier = 4;
          for (let si = 0; si < state.keptBuffs.length; si++) {
            const sb = state.keptBuffs[si];
            if (sb && sb.tier < 3 && sb.tier < lowestTier) {
              lowestTier = sb.tier;
              targetSlot = si;
            }
          }
          if (targetSlot !== -1) {
            state.keptBuffs[targetSlot].tier++;
            Particles.addPopup(state, cap.x, cap.y - 12, t("systems.buffFullMergePopup", { tier: state.keptBuffs[targetSlot].tier }), "#e6ff00", 1.1);
          } else {
            this.addFever(state, 15);
            this.addScore(state, ScoreTable.common.PERM_MAX_REPAIR, cap.x, cap.y, t("systems.buffAllMaxPopup"), { fromDeckEffect: true });
          }
        }
      }
    }
    if (window.UI) window.UI.updateHUD(state);
  },

  pushLightningBolt(state, x1, y1, x2, y2, color = "#e6ff00", life = 14) {
    if (!state) return;
    if (!state.deckLightningBolts) state.deckLightningBolts = [];
    if (state.deckLightningBolts.length >= 12) {
      state.deckLightningBolts.shift();
    }
    const pts = [];
    const segs = 5;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 0; i <= segs; i++) {
      const frac = i / segs;
      const jitter = (i === 0 || i === segs) ? 0 : (Math.random() - 0.5) * 16;
      pts.push({ x: x1 + dx * frac + nx * jitter, y: y1 + dy * frac + ny * jitter });
    }
    state.deckLightningBolts.push({ pts, color, life, maxLife: life });
  },

  tryNoaBitIntercept(state, projX, projY) {
    if (!state || !state.relics || !(state.relics.noa_bit > 0)) return false;
    if ((state._noaBitInterceptCd || 0) > 0) return false;

    state._noaBitInterceptCd = 480; // 8 seconds
    const bitPos = state._noaBitPos || { x: 198, y: 532 };
    this.pushLightningBolt(state, bitPos.x, bitPos.y, projX, projY, "#00f5d4", 16);
    if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
    if (state.shockwaves) {
      state.shockwaves.push({ x: projX, y: projY, r: 5, maxR: 34, speed: 3.6, color: "#00f5d4", lineWidth: 2.5, alpha: 0.95 });
    }
    Particles.add(state, projX, projY, "#00f5d4", 16, 4.5);
    Particles.addPopup(state, projX, projY - 12, t("physics.aegisInterceptPopup"), "#00f5d4", 1.1);
    this.addScore(state, ScoreTable.common.AEGIS_INTERCEPT, projX, projY, "🛡️AEGIS BIT", { fromDeckEffect: true });
    return true;
  },

  handleDeckBallHitProc(state, ball, basePts, hitX, hitY) {
    if (!state || !ball || state.stageCleared || state._inDeckBonusDamage || basePts < 800) return;
    const stage = window.currentStage;

    // 1. Overdrive Chain Lightning (BURST)
    if (state.overdriveActive && (state.overdriveRank || 0) > 0 && (state._overdriveChainCd || 0) <= 0 &&
        stage && typeof stage.applyDeckBonusDamage === "function") {
      state._overdriveChainCd = 24;
      const chains = Math.min(3, state.overdriveRank);
      let targets = [];
      state._inDeckBonusDamage = true;
      try {
        targets = stage.applyDeckBonusDamage(state, 1, hitX, hitY, "⚡VOLT CHAIN!", "#e6ff00", { chainCount: chains }) || [];
      } finally {
        state._inDeckBonusDamage = false;
      }
      if (targets.length > 0) {
        if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
        targets.forEach(tgt => {
          this.pushLightningBolt(state, hitX, hitY, tgt.x, tgt.y, "#e6ff00", 14);
          this.addScore(state, ScoreTable.common.VOLT_CHAIN, tgt.x, tgt.y - 10, "⚡VOLT", { fromDeckEffect: true });
        });
      }
    }

    // 2. Kasumi Wind Chakra Slash (within 2.5s of flipper swing)
    if (!state.stageCleared && state.relics && state.relics.kasumi_chakra > 0 && (ball._chakraTimer || 0) > 0 &&
        stage && typeof stage.applyDeckBonusDamage === "function") {
      ball._chakraTimer = 0;
      let targets = [];
      state._inDeckBonusDamage = true;
      try {
        targets = stage.applyDeckBonusDamage(state, 1, hitX, hitY, "🌸CHAKRA SLASH -1HP!", "#ff66cc", { chainCount: 1 }) || [];
      } finally {
        state._inDeckBonusDamage = false;
      }
      if (targets.length > 0) {
        if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
        targets.forEach(tgt => {
          this.pushLightningBolt(state, hitX, hitY, tgt.x, tgt.y, "#ff66cc", 14);
          if (state.shockwaves) {
            state.shockwaves.push({ x: tgt.x, y: tgt.y, r: 6, maxR: 38, speed: 3.8, color: "#ff66cc", lineWidth: 2.5, alpha: 0.95 });
          }
          this.addScore(state, ScoreTable.common.CHAKRA_SLASH, tgt.x, tgt.y - 12, "🌸CHAKRA SLASH", { fromDeckEffect: true });
        });
      }
    }

    // 3. Celty Volt Fission Prism (split mini-ball every 10 hits)
    if (!state.stageCleared && state.relics && state.relics.celty_fission > 0) {
      state._fissionHitCount = (state._fissionHitCount || 0) + 1;
      if (state._fissionHitCount >= 10 && (state._fissionCd || 0) <= 0 && state.balls.length < 3) {
        state._fissionHitCount = 0;
        state._fissionCd = 150;
        const baseAngle = Math.atan2(ball.vy || -6, ball.vx || 2);
        const speed = Math.max(7.5, Math.hypot(ball.vx, ball.vy));
        const sign = Math.random() < 0.5 ? 1 : -1;
        const splitAngle = baseAngle + sign * 0.42;
        state.balls.push({
          x: ball.x,
          y: ball.y,
          vx: Math.cos(splitAngle) * speed,
          vy: Math.sin(splitAngle) * speed,
          r: 5.5,
          trail: [],
          inShooterLane: false,
          _isFissionBall: true
        });
        if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
        Particles.add(state, ball.x, ball.y, "#e6ff00", 18, 4.8);
        if (state.shockwaves) {
          state.shockwaves.push({ x: ball.x, y: ball.y, r: 6, maxR: 36, speed: 3.6, color: "#e6ff00", lineWidth: 2.4, alpha: 0.95 });
        }
        this.addScore(state, ScoreTable.common.FISSION_SPLIT, ball.x, ball.y - 14, "⚡FISSION SPLIT!!", { fromDeckEffect: true });
      }
    }
  },

  rollRelicDraft(state) {
    const stageIdx = (state && state.stageIndex) || 1;
    const bossRelic = this.BOSS_RELIC_BY_STAGE[stageIdx] || "lilith_gravity";
    const owned = (state && state.relics) || {};
    const pool = Object.values(this.RELIC_DEFS)
      .filter(def => !def.isBoss && (owned[def.id] || 0) < (def.maxStack || 1))
      .map(def => def.id);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }
    const commonPicks = pool.slice(0, 2);
    while (commonPicks.length < 2) {
      commonPicks.push("radar");
    }
    return [bossRelic, commonPicks[0], commonPicks[1]];
  },

  applyRelicPickup(state, relicId) {
    if (!state || !relicId) return;
    if (!state.relics) state.relics = this.createEmptyRelics();
    state.relics[relicId] = (state.relics[relicId] || 0) + 1;
    state.selectedRelic = relicId;
    if (relicId === "radar") {
      const addMult = (window.ScoreTable && ScoreTable.multiplier.RADAR_ADD_MULT) || 0.30;
      state.baseMultiplier = +((state.baseMultiplier || 1.0) + addMult).toFixed(4);
    } else if (relicId === "drone") {
      if (!state.perm) state.perm = {};
      state.perm.centerPost = Math.max(state.perm.centerPost || 0, 1);
      state.perm.centerPostHP = Math.max(state.perm.centerPostHP || 0, 3);
    } else if (relicId === "noa_bit") {
      state._noaBitWarpCharges = 1;
    }
  },

  prepareBallForLaunch(state, skipIntroCutin = false) {
    state.balls = [];
    state.flipperPinL = 0;
    state.flipperPinR = 0;
    state.flipperPinMaxL = 0;
    state.flipperPinMaxR = 0;
    state.flipperReverseTimer = 0;
    state.plunger.power = 0;
    state.plunger.pulling = false;
    state.plunger.launchFrames = 0;
    state.plunger.launchSpeed = 0;
    state.skillShotEligible = false;

    const geom = (window.Physics && Physics.TABLE_GEOM) || { SHOOTER_CENTER_X: 393, PLUNGER_REST_Y: 575 };
    const r = 6.5;
    state.balls.push({
      x: geom.SHOOTER_CENTER_X,
      y: geom.PLUNGER_REST_Y - 6 - r,
      vx: 0,
      vy: 0,
      r,
      trail: [],
      inShooterLane: true
    });

    if (state.perm.kickbackL > 0) state.perm.kickbackL_charges = 1;
    if (state.perm.kickbackR > 0) state.perm.kickbackR_charges = 1;
    if (state.perm.centerPost > 0) state.perm.centerPostHP = 3;

    // Relic: Support Drone auto-deploys center post on ball launch
    if (state.relics && state.relics.drone > 0) {
      state.perm.centerPost = Math.max(state.perm.centerPost || 0, 1);
      state.perm.centerPostHP = Math.max(state.perm.centerPostHP || 0, 3);
    }

    if (!skipIntroCutin && window.UI) {
      window.UI.showCutin(t("systems.gameStartCutin"), 150);
    }
  },

  spawnBall(state, x = 198, y = 260, vx = 0, vy = -7.5) {
    state.balls.push({
      x,
      y,
      vx,
      vy,
      r: 6.5,
      trail: [],
      inShooterLane: false
    });
  },

  // -------------------------------------------------------------------------
  // Persistent Settings (localStorage)
  // -------------------------------------------------------------------------
  settingsKey: "bonbobon_settings_v1",
  settings: {
    sfxEnabled: true,
    nudgeJiggle: false, // デフォルトはOFF（台揺らし時の身体ぷるんっ抑制）
    debugMenuEnabled: false, // デフォルトはOFF（プレイ中の設定アイコン常時表示）
    loadout: ["centerPost", "kickbackL", "kickbackR"],
    debugPerm: {
      centerPost: 0,
      kickbackL: 0,
      kickbackR: 0,
      wideFlipper: 0
    }
  },

  loadSettings() {
    try {
      const raw = localStorage.getItem(this.settingsKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.sfxEnabled === "boolean") this.settings.sfxEnabled = parsed.sfxEnabled;
          if (typeof parsed.nudgeJiggle === "boolean") this.settings.nudgeJiggle = parsed.nudgeJiggle;
          if (typeof parsed.debugMenuEnabled === "boolean") this.settings.debugMenuEnabled = parsed.debugMenuEnabled;
          if (Array.isArray(parsed.loadout)) {
            const valid = [];
            let costSum = 0;
            parsed.loadout.forEach(id => {
              const def = this.LOADOUT_DEFS.find(m => m.id === id);
              if (def && !valid.includes(id) && costSum + def.cost <= this.LOADOUT_MAX_COST) {
                valid.push(id);
                costSum += def.cost;
              }
            });
            this.settings.loadout = valid;
          }
          if (parsed.debugPerm && typeof parsed.debugPerm === "object") {
            ["centerPost", "kickbackL", "kickbackR", "wideFlipper"].forEach(k => {
              if (typeof parsed.debugPerm[k] === "number") {
                const max = this.PERM_DEFS[k] ? this.PERM_DEFS[k].maxLv : 2;
                this.settings.debugPerm[k] = Math.max(0, Math.min(max, parsed.debugPerm[k]));
              }
            });
          }
        }
      }
    } catch (_) {}
    if (!Array.isArray(this.settings.loadout)) {
      this.settings.loadout = [...this.DEFAULT_LOADOUT];
    }
    if (window.sfx) {
      window.sfx.enabled = this.settings.sfxEnabled;
    }
    return this.settings;
  },

  getLoadout() {
    if (this.settings && Array.isArray(this.settings.loadout)) {
      return [...this.settings.loadout];
    }
    return [...this.DEFAULT_LOADOUT];
  },

  getLoadoutCost(ids = null) {
    const list = ids || this.getLoadout();
    let total = 0;
    list.forEach(id => {
      const def = this.LOADOUT_DEFS.find(m => m.id === id);
      if (def) total += def.cost;
    });
    return total;
  },

  toggleLoadoutModule(id) {
    const def = this.LOADOUT_DEFS.find(m => m.id === id);
    if (!def) return { ok: false, changed: false, reason: "unknown" };
    const cur = this.getLoadout();
    const idx = cur.indexOf(id);
    if (idx !== -1) {
      cur.splice(idx, 1);
      this.settings.loadout = cur;
      this.saveSettings();
      return { ok: true, changed: true, equipped: false };
    }
    if (this.getLoadoutCost(cur) + def.cost > this.LOADOUT_MAX_COST) {
      return { ok: false, changed: false, reason: "overCost" };
    }
    cur.push(id);
    this.settings.loadout = cur;
    this.saveSettings();
    return { ok: true, changed: true, equipped: true };
  },

  resetLoadoutDefault() {
    this.settings.loadout = [...this.DEFAULT_LOADOUT];
    this.saveSettings();
    return this.getLoadout();
  },

  applyLoadoutToState(state) {
    if (!state) return;
    const loadout = this.getLoadout();
    if (!state.perm) {
      state.perm = {
        centerPost: 0, centerPostHP: 0,
        kickbackL: 0, kickbackL_charges: 0,
        kickbackR: 0, kickbackR_charges: 0,
        wideFlipper: 0
      };
    }
    if (loadout.includes("centerPost")) {
      state.perm.centerPost = Math.max(state.perm.centerPost || 0, 1);
      state.perm.centerPostHP = 3;
    }
    if (loadout.includes("kickbackL")) {
      state.perm.kickbackL = Math.max(state.perm.kickbackL || 0, 1);
      state.perm.kickbackL_charges = 1;
    }
    if (loadout.includes("kickbackR")) {
      state.perm.kickbackR = Math.max(state.perm.kickbackR || 0, 1);
      state.perm.kickbackR_charges = 1;
    }
    if (loadout.includes("wideFlipper")) {
      state.perm.wideFlipper = Math.max(state.perm.wideFlipper || 0, 1);
    }

    // Overlay debugPerm on top if any non-zero debug levels are configured
    if (this.settings && this.settings.debugPerm) {
      const dp = this.settings.debugPerm;
      if (dp.centerPost > 0) {
        state.perm.centerPost = Math.max(state.perm.centerPost || 0, dp.centerPost);
        state.perm.centerPostHP = 3;
      }
      if (dp.kickbackL > 0) {
        state.perm.kickbackL = Math.max(state.perm.kickbackL || 0, dp.kickbackL);
        state.perm.kickbackL_charges = 1;
      }
      if (dp.kickbackR > 0) {
        state.perm.kickbackR = Math.max(state.perm.kickbackR || 0, dp.kickbackR);
        state.perm.kickbackR_charges = 1;
      }
      if (dp.wideFlipper > 0) {
        state.perm.wideFlipper = Math.max(state.perm.wideFlipper || 0, dp.wideFlipper);
      }
    }

    if (state.keptBuffs) {
      const addStartCard = (buffId) => {
        const emptyIdx = state.keptBuffs.findIndex(b => b === null);
        if (emptyIdx !== -1) state.keptBuffs[emptyIdx] = { id: buffId, tier: 1 };
      };
      if (loadout.includes("startOverdrive")) addStartCard("overdrive");
      if (loadout.includes("startMagnet")) addStartCard("magnet");
    }

    if (loadout.includes("highRiskMult")) {
      const addMult = (window.ScoreTable && ScoreTable.multiplier && ScoreTable.multiplier.HIGH_RISK_ADD_MULT) || 0.5963;
      state.baseMultiplier = +((state.baseMultiplier || 1.0) + addMult).toFixed(4);
    }
  },

  saveSettings() {
    try {
      localStorage.setItem(this.settingsKey, JSON.stringify(this.settings));
    } catch (_) {}
  },

  setSfxEnabled(enabled) {
    this.settings.sfxEnabled = !!enabled;
    if (window.sfx) window.sfx.enabled = this.settings.sfxEnabled;
    this.saveSettings();
    return this.settings.sfxEnabled;
  },

  isSfxEnabled() {
    return this.settings.sfxEnabled !== false;
  },

  setNudgeJiggle(enabled) {
    this.settings.nudgeJiggle = !!enabled;
    this.saveSettings();
    return this.settings.nudgeJiggle;
  },

  isNudgeJiggleEnabled() {
    return !!(this.settings && this.settings.nudgeJiggle);
  },

  setDebugMenuEnabled(enabled) {
    this.settings.debugMenuEnabled = !!enabled;
    this.saveSettings();
    return this.settings.debugMenuEnabled;
  },

  isDebugMenuEnabled() {
    return !!(this.settings && this.settings.debugMenuEnabled);
  },

  getInitialPermState() {
    const p = {
      centerPost: 0,
      centerPostHP: 0,
      kickbackL: 0,
      kickbackL_charges: 0,
      kickbackR: 0,
      kickbackR_charges: 0,
      wideFlipper: 0
    };
    if (this.settings && this.settings.debugPerm) {
      const dp = this.settings.debugPerm;
      p.centerPost = dp.centerPost || 0;
      p.centerPostHP = p.centerPost > 0 ? 3 : 0;
      p.kickbackL = dp.kickbackL || 0;
      p.kickbackL_charges = p.kickbackL > 0 ? 1 : 0;
      p.kickbackR = dp.kickbackR || 0;
      p.kickbackR_charges = p.kickbackR > 0 ? 1 : 0;
      p.wideFlipper = dp.wideFlipper || 0;
    }
    return p;
  },

  applyDebugPermToState(state) {
    if (!state) return;
    if (!state.perm) state.perm = {};
    const dp = this.settings.debugPerm;
    state.perm.centerPost = dp.centerPost || 0;
    state.perm.centerPostHP = state.perm.centerPost > 0 ? 3 : 0;
    state.perm.kickbackL = dp.kickbackL || 0;
    state.perm.kickbackL_charges = state.perm.kickbackL > 0 ? 1 : 0;
    state.perm.kickbackR = dp.kickbackR || 0;
    state.perm.kickbackR_charges = state.perm.kickbackR > 0 ? 1 : 0;
    state.perm.wideFlipper = dp.wideFlipper || 0;
  },

  setDebugPermLevel(key, lv, state = null) {
    const max = this.PERM_DEFS[key] ? this.PERM_DEFS[key].maxLv : 2;
    const clamped = Math.max(0, Math.min(max, lv));
    this.settings.debugPerm[key] = clamped;
    this.saveSettings();
    if (state) this.applyDebugPermToState(state);
    return clamped;
  },

  cycleDebugPermLevel(key, state = null) {
    const max = this.PERM_DEFS[key] ? this.PERM_DEFS[key].maxLv : 2;
    const current = (this.settings.debugPerm && this.settings.debugPerm[key]) || 0;
    const next = current >= max ? 0 : current + 1;
    return this.setDebugPermLevel(key, next, state);
  },

  resetDebugPermLevels(state = null) {
    ["centerPost", "kickbackL", "kickbackR", "wideFlipper"].forEach(k => {
      this.settings.debugPerm[k] = 0;
    });
    this.saveSettings();
    if (state) this.applyDebugPermToState(state);
  },

  maxAllDebugPermLevels(state = null) {
    ["centerPost", "kickbackL", "kickbackR", "wideFlipper"].forEach(k => {
      const max = this.PERM_DEFS[k] ? this.PERM_DEFS[k].maxLv : 2;
      this.settings.debugPerm[k] = max;
    });
    this.saveSettings();
    if (state) this.applyDebugPermToState(state);
  }
};

// Immediate settings load on evaluation
if (window.Systems && typeof window.Systems.loadSettings === "function") {
  window.Systems.loadSettings();
}

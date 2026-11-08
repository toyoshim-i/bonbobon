// =========================================================================
// PINBALL ENGINE - SYSTEMS (BUFFS, SCORING, FEVER, CAPSULES & BALLS)
// =========================================================================

window.Systems = {
  PERM_DEFS: {
    centerPost: {
      id: "centerPost",
      name: "センターストッパー",
      desc: "中央ドレイン防止ポスト（耐久3ヒット）",
      maxLv: 2
    },
    kickbackL: {
      id: "kickbackL",
      name: "左アウトレーンキックバック",
      desc: "左落下時に緊急レーザー射出（各ボール1回）",
      maxLv: 1
    },
    kickbackR: {
      id: "kickbackR",
      name: "右アウトレーンキックバック",
      desc: "右落下時に緊急レーザー射出（各ボール1回）",
      maxLv: 1
    },
    wideFlipper: {
      id: "wideFlipper",
      name: "ロングフリッパー",
      desc: "フリッパー長拡大（打撃・防衛範囲UP）",
      maxLv: 2
    }
  },

  BUFF_DEFS: {
    mult2x:   { id: "mult2x",   label: "スコア×2", color: "#ff1493", mult: 2.0, desc: "スコア倍率×2.0" },
    overdrive:{ id: "overdrive",label: "電撃貫通", color: "#e6ff00", mult: 1.8, desc: "貫通電撃ボール＆倍率×1.8" },
    magnet:   { id: "magnet",   label: "磁力吸着", color: "#00f5d4", mult: 1.5, desc: "フリッパー磁力吸着＆×1.5" },
    fever:    { id: "fever",    label: "FEVER+玉", color: "#b84dff", mult: 2.2, desc: "即時フィーバーゲージ+50%" }
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

  addScore(state, basePts, x, y, label = "") {
    const totalMult = state.baseMultiplier * state.burstMultiplier * state.fever.mult;
    const pts = Math.round(basePts * totalMult);
    const prevScore = state.score;
    state.score += pts;

    if (label) {
      Particles.addPopup(state, x, y, `${label} +${pts.toLocaleString()}`, totalMult > 1.5 ? "#e6ff00" : "#00f5d4");
    } else {
      Particles.addPopup(state, x, y, `+${pts.toLocaleString()}`, "#ffffff", 0.9);
    }

    // Extra Ball score milestones
    if (state.extraBallMilestones && state.extraBallMilestones.length > 0) {
      const nextTarget = state.extraBallMilestones[0];
      if (prevScore < nextTarget && state.score >= nextTarget) {
        state.extraBallMilestones.shift();
        state.ballsRemaining = Math.min(5, state.ballsRemaining + 1);
        if (window.sfx) window.sfx.burstTrigger();
        Particles.add(state, 198, 550, "#e6ff00", 30, 6.0);
        if (window.UI) window.UI.showCutin(`⭐【EXTRA BALL 獲得】⭐<br>スコアボーナス！<br>ボール＋1球 (残り${state.ballsRemaining}球)`, 210);
      }
    }

    if (window.UI) window.UI.updateHUD(state);
  },

  addFever(state, amount) {
    if (state.fever.active) return;
    state.fever.gauge = Math.min(100, state.fever.gauge + amount);
    if (state.fever.gauge >= 100) {
      this.startFeverMode(state);
    }
    if (window.UI) window.UI.updateHUD(state);
  },

  startFeverMode(state) {
    state.fever.active = true;
    state.fever.timer = 60 * 18; // 18 seconds
    state.fever.gauge = 100;
    state.fever.mult = 5.0;

    if (window.sfx && window.sfx.feverStart) window.sfx.feverStart();

    // Spawn 2 multiballs (total 3 on screen)
    while (state.balls.length < 3) {
      const offset = (Math.random() - 0.5) * 40;
      this.spawnBall(state, 198 + offset, 240, (Math.random() - 0.5) * 6, -8);
    }

    if (window.UI) window.UI.showCutin("🔥【BOMB-O-FEVER 突入】🔥<br>マルチボール発動＆スコア倍率×5.0！", 200);
    Particles.add(state, 210, 330, "#ff1493", 35, 6.0);
    Particles.add(state, 210, 330, "#e6ff00", 25, 5.0);
    if (window.UI) window.UI.updateHUD(state);
  },

  endFeverMode(state) {
    state.fever.active = false;
    state.fever.timer = 0;
    state.fever.gauge = 0;
    state.fever.mult = 1.0;
    if (window.UI) window.UI.showCutin("【FEVER 終了】<br>通常モードへ復帰します", 100);
    if (window.UI) window.UI.updateHUD(state);
  },

  triggerBurst(state) {
    const activeList = state.keptBuffs.filter(Boolean);
    if (activeList.length === 0) {
      Particles.addPopup(state, 210, 520, "NO BUFFS!", "#ff1493", 1.0);
      return;
    }
    if (window.sfx) window.sfx.burstTrigger();

    let totalMult = 1.0;
    let spawnExtraBall = false;
    activeList.forEach(item => {
      const def = this.BUFF_DEFS[item.id];
      const tierFactor = 1 + (item.tier - 1) * 0.65;
      totalMult *= (def.mult * tierFactor);
      if (item.id === "magnet") state.magnetActive = true;
      if (item.id === "overdrive") state.overdriveActive = true;
      if (item.id === "fever") spawnExtraBall = true;
    });

    if (activeList.length >= 2) {
      totalMult *= (1 + activeList.length * 0.25);
    }

    state.burstMultiplier = Math.round(totalMult * 10) / 10;
    state.burstTimer = 60 * 10;
    state.keptBuffs = [null, null, null, null];

    if (spawnExtraBall || activeList.length >= 3) {
      this.spawnBall(state, 210, 260, (Math.random() - 0.5) * 6, -7);
    }

    if (state.boss) {
      state.boss.expression = "shock";
      state.boss.expressionTimer = 55;
    }
    Particles.add(state, 210, 340, "#e6ff00", 28, 5.5);
    if (window.UI) window.UI.showCutin(`🔥【BURST解放】🔥<br>スコア倍率 ×${state.burstMultiplier.toFixed(1)} (10秒間発動)！`, 180);
    if (window.UI) window.UI.updateHUD(state);
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
        life: 960,
        maxLife: 960,
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
        life: 960,
        maxLife: 960,
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
        if (window.UI) window.UI.showCutin(`🛠【パーツ鹵獲設置】<br>${def.name} Lv.${state.perm[key]} を展開！`, 160);
      } else {
        if (key === "centerPost") state.perm.centerPostHP = 3;
        if (key === "kickbackL") state.perm.kickbackL_charges = 1;
        if (key === "kickbackR") state.perm.kickbackR_charges = 1;
        this.addScore(state, 3500, cap.x, cap.y, "MAX REPAIR");
      }
    } else {
      const key = cap.subId;
      const def = this.BUFF_DEFS[key];
      if (key === "fever") {
        this.addFever(state, 50);
        Particles.addPopup(state, cap.x, cap.y - 12, "FEVER +50%!", "#b84dff", 1.2);
      } else {
        const existingIdx = state.keptBuffs.findIndex(b => b && b.id === key && b.tier < 3);
        if (existingIdx !== -1) {
          state.keptBuffs[existingIdx].tier++;
          const newTier = state.keptBuffs[existingIdx].tier;
          Particles.addPopup(state, cap.x, cap.y - 12, `合成 ★Lv.${newTier}`, "#e6ff00", 1.2);
          if (window.UI) window.UI.showCutin(`⚡【バフ合成強化】<br>${def.label} が ★Lv.${newTier} にランクアップ！`, 160);
        } else {
          const emptyIdx = state.keptBuffs.findIndex(b => b === null);
          if (emptyIdx !== -1) {
            state.keptBuffs[emptyIdx] = { id: key, tier: 1 };
            Particles.addPopup(state, cap.x, cap.y - 12, `KEEP! ${def.label}`, def.color, 1.1);
          } else {
            state.keptBuffs[0].tier = Math.min(3, state.keptBuffs[0].tier + 1);
            Particles.addPopup(state, cap.x, cap.y - 12, `FULL合成 ★Lv.${state.keptBuffs[0].tier}`, "#e6ff00", 1.1);
          }
        }
      }
    }
    if (window.UI) window.UI.updateHUD(state);
  },

  prepareBallForLaunch(state) {
    state.balls = [];
    state.plunger.waitingForLaunch = true;
    state.plunger.power = 0;
    state.plunger.pulling = false;
    state.skillShotEligible = false;

    state.balls.push({
      x: 393,
      y: 575,
      vx: 0,
      vy: 0,
      r: 6.5,
      trail: [],
      inShooterLane: true
    });

    if (state.perm.kickbackL > 0) state.perm.kickbackL_charges = 1;
    if (state.perm.kickbackR > 0) state.perm.kickbackR_charges = 1;
    if (state.perm.centerPost > 0) state.perm.centerPostHP = 3;

    if (window.UI) window.UI.showCutin("【ゲーム開始】<br>画面左右タップでパドル操作！<br>発射ボタン または 右下スワイプで射出！", 150);
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
  }
};

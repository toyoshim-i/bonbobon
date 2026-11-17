// =========================================================================
// STAGE 1: LILITH (桃色装甲リリス)
// =========================================================================

window.Stage1 = {
  id: "stage1",
  name: "桃色装甲リリス",
  bossName: "リリス (LILITH)",

  assets: {
    armoredImg: new Image(),
    bareImg: new Image(),
    defeatCgImg: new Image(),
    earTipLImg: new Image(),
    earTipRImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    if (this.assets._initialized) return;
    this.assets._initialized = true;
    const v = (window.StageCommon && StageCommon.ASSET_QUERY) || "?v=190";
    this.assets.armoredImg.src = "./assets/stage1/centerpiece_armored.jpg" + v;
    this.assets.bareImg.src = "./assets/stage1/centerpiece.jpg" + v;
    this.assets.defeatCgImg.src = "./assets/stage1/defeat_cg.jpg" + v;
    this.assets.earTipLImg.src = "./assets/stage1/ear_tip_L.png" + v;
    this.assets.earTipRImg.src = "./assets/stage1/ear_tip_R.png" + v;

    // 表情差分パッチ初期化（assets/stage1/faces/ ＋ STAGE1_FACE_PATCHES）
    this.assets.facePatchImgs = Systems.loadFacePatches("stage1", window.STAGE1_FACE_PATCHES,
      ["blink", "wink", "wince", "shout", "talk", "talk_sm", "open_blush"]);

    let count = 0;
    const check = () => {
      count++;
      if (count >= 3) this.assets.loaded = true;
    };
    this.assets.armoredImg.onload = check;
    this.assets.bareImg.onload = check;
    this.assets.defeatCgImg.onload = check;
  },

  // 表情アニメーションシーケンス開始ヘルパー
  createBossState() {
    return {
      droneL_HP: 3,
      droneR_HP: 3,

      // 3 Major Armor Sections: Right Arm, Left Arm, Torso/Chest
      armR_HP: 6,
      armR_Broken: false,
      armL_HP: 6,
      armL_Broken: false,
      chestArmorHP: 8,
      chestArmorBroken: false,
      allArmorsPurged: false,

      // Bust Bouncing Excitement level (0..100) - Boosts crotch suction!
      bustExcitement: 0,

      coreHP: 16,
      leftEarLit: false,
      rightEarLit: false,
      coreUnlocked: false,
      blushGauge: 0,
      expression: "smile",
      expressionTimer: 0,
      blinkTimer: 120,
      winkTimer: 0,
      talkTimer: 0,
      faceAnim: StageCommon.createFaceAnim(70),
      animTick: 0,
      hairSpring: { dx: 0, dy: 0, vx: 0, vy: 0, phase: 0 },
      gaze: { x: 0, y: 0 },

      // Bust 2D Spring
      bustL: { x: 160, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },
      bustR: { x: 236, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },

      // Drones
      droneL: { x: 61,  y: 175, r: 16, flash: 0, rot: 0 },
      droneR: { x: 335, y: 175, r: 16, flash: 0, rot: 0 },

      // Hanging Rabbit Ear Tips
      earL: {
        ax: 137, ay: 49,
        bx: 68,  by: 105,
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },
      earR: {
        ax: 258, ay: 49,
        bx: 329, by: 105,
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },

      // Shoulder Armor
      podL: { x: 108, y: 290, r: 23, flash: 0, rot: 0 },
      podR: { x: 288, y: 290, r: 23, flash: 0, rot: 0 },

      // Waist / Hip Units
      hipL: { x: 110, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },
      hipR: { x: 285, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },

      // Chest Armor Exhaust Vents (両胸下の黄色と黒の排気口：胴体装甲の真の弱点)
      // 原画の左右排気口グラフィックに完全一致配置
      ventL: { x: 145, y: 368, r: 18, hp: 4, flash: 0 },
      ventR: { x: 251, y: 368, r: 18, hp: 4, flash: 0 },

      // Crotch Secret Gravity Well
      crotch: { x: 198, y: 556, r: 17, gravRadius: 135, flash: 0, rot: 0, charge: 0, maxCharge: 3, cooldown: 0 },

      // Core Gem (首元の黄色い六角ジュエル)
      core: { x: 198, y: 310, r: 16, flash: 0 }
    };
  },

  getTargetDesc(state) {
    if (state.stageCleared) return "✨リリス撃破！ STAGE 1 CLEAR!";
    if (!state.boss.armR_Broken || !state.boss.armL_Broken) {
      if (state.boss.droneL_HP > 0 || state.boss.droneR_HP > 0) return "ドローンを撃破しシールド解除せよ！";
      return "両腕＆胴体の装甲を破壊せよ！";
    }
    if (!state.boss.chestArmorBroken) {
      return `胴体装甲を集中砲火せよ！(HP:${state.boss.chestArmorHP})`;
    }
    return `露出コアへ集中連打せよ！(HP:${state.boss.coreHP})`;
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;

    UI.setBossHeader("#ff1493", "TYPE-LILITH (リリス)");
    UI.setText("targetBriefingText", "「変な重力トラップに引っかかるなんて……！ 装甲がパージされる前に早く助けなさいよっ！」");
    UI.setText("dtArmRLabel", "右手装甲(R-ARM):");
    UI.setText("dtArmLLabel", "左手装甲(L-ARM):");
    UI.setText("dtChestLabel", "胴体装甲(TORSO):");
    UI.setText("dtCrotchLabel", "クロッチ吸引場:");

    UI.setText("dtArmRStatus", state.boss.armR_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armR_HP}/6)`);
    UI.setClass("dtArmRStatus", state.boss.armR_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");

    UI.setText("dtArmLStatus", state.boss.armL_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armL_HP}/6)`);
    UI.setClass("dtArmLStatus", state.boss.armL_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");

    UI.setText("dtChestStatus", state.boss.chestArmorBroken ? "💥PURGED!" : `ARMORED (${state.boss.chestArmorHP}/8)`);
    UI.setClass("dtChestStatus", state.boss.chestArmorBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#00f5d4]");

    if (state.boss.chestArmorBroken && state.boss.crotch) {
      const ch = state.boss.crotch.charge || 0;
      const excitementRatio = Math.min(1.0, (state.boss.bustExcitement || 0) / 100);
      const isExcited = excitementRatio > 0.30;
      if (state.boss.crotch.cooldown > 0) {
        UI.setText("dtCrotchStatus", "COOLING");
        UI.setClass("dtCrotchStatus", "font-bold text-purple-400");
      } else if (isExcited) {
        UI.setText("dtCrotchStatus", `♥SUCTION BOOST (${Math.round(excitementRatio * 100)}%)`);
        UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
      } else {
        UI.setText("dtCrotchStatus", `CALM [${"◆".repeat(ch)}${"◇".repeat(3 - ch)}]`);
        UI.setClass("dtCrotchStatus", "font-bold text-gray-400");
      }
    } else {
      UI.setText("dtCrotchStatus", "INACTIVE");
      UI.setClass("dtCrotchStatus", "font-bold text-gray-400");
    }

    UI.setText("blushGaugeText", `${state.boss.blushGauge}%`);
    UI.setWidth("blushGaugeBar", `${state.boss.blushGauge}%`);

    const rStr = state.boss.armR_Broken ? "PURGED" : `${state.boss.armR_HP}/6`;
    const lStr = state.boss.armL_Broken ? "PURGED" : `${state.boss.armL_HP}/6`;
    UI.setText("statusShoulders", `右手:${rStr} / 左手:${lStr}`);

    UI.setText("statusChestArmor", state.boss.chestArmorBroken ? "💥PURGED!" : `HP: ${state.boss.chestArmorHP}/8`);

    UI.setText("statusEars", `L:${state.boss.leftEarLit ? "ON" : "OFF"} / R:${state.boss.rightEarLit ? "ON" : "OFF"}`);

    UI.setText("statusCore", state.phase === 3
      ? `HP: ${state.boss.coreHP}/16 [KO可]`
      : (state.boss.coreUnlocked ? "★UNLOCKED★" : "SHIELDED"));

    const faceMap = {
      smile: "余裕スマイル",
      blush: "赤面ぷるぷる",
      shock: "ダメージ焦り顔!?",
      angry_emp: "EMP逆上カウンター⚡"
    };
    UI.setText("bossFaceStatus", faceMap[state.boss.expression] || "余裕スマイル");
  },

  impulseBust(state, which, vxImpact, vyImpact) {
    const b = which === "L" ? state.boss.bustL : state.boss.bustR;
    if (window.sfx) window.sfx.softPuru();
    b.vx += vxImpact * 1.35;
    b.vy += vyImpact * 1.35;
    b.flash = 16;

    const other = which === "L" ? state.boss.bustR : state.boss.bustL;
    other.vx -= vxImpact * 0.45;
    other.vy += vyImpact * 0.45;

    state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 18);
    state.boss.bustExcitement = Math.min(100, (state.boss.bustExcitement || 0) + 35);
    state.boss.expression = "blush";
    state.boss.expressionTimer = 54;
    state.boss.talkTimer = 36;
    state.boss.hairSpring.vx += vxImpact * 0.55;
    state.boss.hairSpring.vy += vyImpact * 0.55;

    Systems.addFever(state, 12);
    Particles.add(state, b.x, b.y, "#ff66b2", 8, 2.8);
    Systems.addScore(state, 600, b.x, b.y - 18, "♥ぷるんっ! SOFT");

    // EMP Counter at 100% Blush
    if (state.boss.blushGauge >= 100) {
      state.boss.blushGauge = 0;
      state.boss.expression = "angry_emp";
      state.boss.expressionTimer = 60;
      if (window.sfx) window.sfx.armorBreak();
      UI.showCutin("⚡「ちょ、どこ触ってんのよっ！！」<br>カウンターEMP発動＆カプセル放出！", 180);
      Particles.add(state, 210, 390, "#ff1493", 32, 6.5);
      Systems.dropReward(state, "minor", 5);
      state.balls.forEach(ball => {
        ball.vy = -12 - Math.random() * 4;
        ball.vx = (Math.random() - 0.5) * 12;
      });
    }
    UI.updateHUD(state);
  },

  impulseEar(state, which, torque, vxImpact, vyImpact) {
    const ear = which === "L" ? state.boss.earL : state.boss.earR;
    if (window.sfx) window.sfx.earBoing();
    ear.angleVel += torque * 0.15;
    ear.vx += (vxImpact || 0) * 0.8;
    ear.vy += (vyImpact || 0) * 0.8;
    ear.flash = 18;
  },

  triggerDebugJiggle(state) {
    if (!state || !state.boss) return;
    state.boss.chestArmorBroken = true;
    this.impulseBust(state, "L", 6.5, -7.5);
    this.impulseBust(state, "R", -6.5, -7.5);
  },

  onNudge(state, nx, ny, intensity) {
    if (window.Systems && Systems.isNudgeJiggleEnabled() && state.boss) {
      const bL = state.boss.bustL;
      const bR = state.boss.bustR;
      if (bL && bR) {
        const broken = state.boss.chestArmorBroken;
        const mult = (broken ? 6.2 : 3.4) * (intensity || 1.0);
        const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
        bL.vx += sway * mult;
        bL.vy += (ny - 0.65) * mult;
        bR.vx -= sway * mult * 0.75;
        bR.vy += (ny - 0.65) * mult;
        if (window.sfx && window.sfx.softPuru) {
          window.sfx.softPuru();
        }
      }
      if (state.boss.expression === "normal" || state.boss.expression === "smile") {
        state.boss.expression = "blush";
        state.boss.expressionTimer = 35;
      }
    }
    this.impulseEar(state, "L", nx * 4.2 * intensity, ny * 4.2 * intensity);
    this.impulseEar(state, "R", nx * 4.2 * intensity, ny * 4.2 * intensity);
  },
};

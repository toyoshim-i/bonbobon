// =========================================================================
// STAGE 5: CELESTIAL SANCTUARY (電脳天界アーク・サンクチュアリ)
// BOSS: エル＆ノエル ➔ 熾天使セラフィア (ELLE & NOEL ➔ SERAPHIA)
// =========================================================================

window.Stage5 = {
  id: "stage5",
  name: "電脳天界サンクチュアリ",
  bossName: "エル＆ノエル ➔ 熾天使セラフィア",

  assets: {
    twinLIntactImg: new Image(),
    twinLBrokenImg: new Image(),
    twinRIntactImg: new Image(),
    twinRBrokenImg: new Image(),
    seraphiaIntactImg: new Image(),
    seraphiaBrokenImg: new Image(),
    defeatCgImg: new Image(),
    wingUpperImg: new Image(),
    wingMidImg: new Image(),
    wingLowerImg: new Image(),
    cherubOrbLImg: new Image(),
    cherubOrbRImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    const v = "?v=190";
    this.assets.twinLIntactImg.src = "./assets/stage5/twin_l_intact.png" + v;
    this.assets.twinLBrokenImg.src = "./assets/stage5/twin_l_broken.png" + v;
    this.assets.twinRIntactImg.src = "./assets/stage5/twin_r_intact.png" + v;
    this.assets.twinRBrokenImg.src = "./assets/stage5/twin_r_broken.png" + v;
    this.assets.seraphiaIntactImg.src = "./assets/stage5/seraphia_intact.png" + v;
    this.assets.seraphiaBrokenImg.src = "./assets/stage5/seraphia_broken.png" + v;
    this.assets.defeatCgImg.src = "./assets/stage5/defeat_cg.jpg" + v;
    this.assets.wingUpperImg.src = "./assets/stage5/wing_upper.png" + v;
    this.assets.wingMidImg.src = "./assets/stage5/wing_mid.png" + v;
    this.assets.wingLowerImg.src = "./assets/stage5/wing_lower.png" + v;
    this.assets.cherubOrbLImg.src = "./assets/stage5/cherub_orb_l.png" + v;
    this.assets.cherubOrbRImg.src = "./assets/stage5/cherub_orb_r.png" + v;

    this.assets.facePatchImgs = Systems.loadFacePatches(
      "stage5",
      window.STAGE5_FACE_PATCHES,
      ["blink", "blink_half", "wink", "wince", "shout", "shock", "open_blush", "talk", "talk_sm"]
    );

    this.assets.loaded = true;
    this._srcCache = null;
    this._rampStaticCanvas = null;
    this._rampUpperCanvas = null;
    this._rampMetrics = null;
  },

  // 3D立体ワイヤーランプ軌道定義 (Pinball Cross-Over Twin Skyway: NOEL RAMP & ELLE RAMP)
  WIRE_RAMPS: {
    left: {
      id: "left",
      name: "NOEL RAMP",
      color: "#00f5e8",
      accent: "#e6ff00",
      entryX: 96,
      entryY: 412,
      entryR: 22,
      exitVx: 0.08,
      exitVy: 3.1,
      points: [
        { x: 96,  y: 412, elev: 0.10 },
        { x: 46,  y: 326, elev: 0.45 },
        { x: 40,  y: 178, elev: 0.80 },
        { x: 64,  y: 68,  elev: 0.96 },
        { x: 168, y: 42,  elev: 1.00 },
        { x: 242, y: 48,  elev: 0.86 },
        { x: 260, y: 68,  elev: 0.62 }
      ]
    },
    right: {
      id: "right",
      name: "ELLE RAMP",
      color: "#ff2ad4",
      accent: "#e6ff00",
      entryX: 330,
      entryY: 388,
      entryR: 22,
      exitVx: 0.10,
      exitVy: 3.1,
      points: [
        { x: 330, y: 388, elev: 0.10 },
        { x: 356, y: 326, elev: 0.48 },
        { x: 342, y: 266, elev: 0.82 },
        { x: 258, y: 274, elev: 0.96 },
        { x: 198, y: 226, elev: 1.00 },
        { x: 152, y: 194, elev: 0.85 },
        { x: 132, y: 208, elev: 0.60 }
      ]
    }
  },

  sampleRamp(rampKey, dist) {
    if (!this._rampMetrics) {
      this._rampMetrics = {
        left: StageCommon.buildPolylineMetrics(this.WIRE_RAMPS.left.points),
        right: StageCommon.buildPolylineMetrics(this.WIRE_RAMPS.right.points)
      };
    }
    return StageCommon.samplePolylineRamp(this._rampMetrics[rampKey], dist);
  },

  createBossState() {
    // 28 Twinkling Stars across the deep cyber space
    const stars = Array.from({ length: 28 }, (_, i) => ({
      x: 25 + Math.random() * 346,
      y: 20 + Math.random() * 450,
      colorIdx: i % 5,
      spd: 0.04 + Math.random() * 0.05,
      phase: Math.random() * Math.PI * 2,
      baseScale: 0.7 + Math.random() * 0.5
    }));

    return {
      name: "エル＆ノエル",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 100,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,
      bustExcitement: 0,
      animTick: 0,
      lastFlipActiveTimer: 0,
      faceAnim: StageCommon.createFaceAnim(),

      // 3D Background Stars & Grid
      stars,
      gridScroll: 0,

      // Cosmic Star Anomalies ("ガンマ線バースト" & "ブラックホール化")
      cosmic: {
        mode: "idle", // "idle" | "gamma_warn" | "gamma_fire" | "bh_warn" | "bh_active"
        timer: 240,
        nextType: "gamma",
        x: 198,
        y: 250,
        angle: 0.6
      },

      // Phase 1 & 2 Twins: Elle (Left, Magenta) & Noel (Right, Cyan)
      baseL: { x: 51.5, y: 256.1, w: 159, h: 339 },
      baseR: { x: 187.1, y: 116.6, w: 193, h: 339 },
      elle: { dx: 0, dy: 0, vx: 0, vy: 0, blushTimer: 0 },
      noel: { dx: 0, dy: 0, vx: 0, vy: 0, blushTimer: 0 },
      elleBroken: false,
      noelBroken: false,
      elleSpring: { x: 152.5, y: 380.6, r: 24, rx: 24, ry: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      noelSpring: { x: 261.0, y: 234.6, r: 24, rx: 24, ry: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      elleBelly: { x: 159.1, y: 426.9, r: 14, rx: 23, ry: 21, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      noelBelly: { x: 265.3, y: 288.4, r: 14, rx: 23, ry: 21, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      elleHip: { x: 145.4, y: 434.9, r: 18, rx: 28, ry: 28, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      noelHip: { x: 260.1, y: 294.5, r: 18, rx: 28, ry: 28, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },

      // Phase 1 Exact Art-Anchored Targets (Elle: Left Pink Twin)
      haloL: { homeX: 135.0, homeY: 244.5, x: 135.0, y: 244.5, rx: 34, ry: 12, tilt: -0.26, hp: 2, maxHP: 2, side: "L", label: "L-HALO", color: "#ff2ad4", flash: 0, broken: false },
      odangoL: { homeX: 114.6, homeY: 296.3, x: 114.6, y: 296.3, r: 14, hp: 2, maxHP: 2, side: "L", label: "ODANGO", color: "#ff66cc", flash: 0, broken: false },
      kneeL: { homeX: 170.5, homeY: 495.3, x: 170.5, y: 495.3, r: 14, hp: 2, maxHP: 2, side: "L", label: "L-KNEE", color: "#ff2ad4", flash: 0, broken: false },
      prismL: { homeX: 152.5, homeY: 380.6, x: 152.5, y: 380.6, r: 14, hp: 4, maxHP: 4, color: "#ff2ad4", label: "L-BROOCH", flash: 0, broken: false },
      charmL: { homeX: 154.9, homeY: 476.1, x: 154.9, y: 476.1, r: 13, color: "#ff66cc", label: "♥CHARM", flash: 0 },

      // Phase 1 Exact Art-Anchored Targets (Noel: Right Cyan Twin)
      haloR: { homeX: 259.9, homeY: 105.0, x: 259.9, y: 105.0, rx: 35, ry: 12, tilt: 0.16, hp: 2, maxHP: 2, side: "R", label: "R-HALO", color: "#00f5e8", flash: 0, broken: false },
      antennaR: { homeX: 289.5, homeY: 137.7, x: 289.5, y: 137.7, r: 14, hp: 2, maxHP: 2, side: "R", label: "ANTENNA", color: "#00f5e8", flash: 0, broken: false },
      kneeR: { homeX: 262.9, homeY: 352.0, x: 262.9, y: 352.0, r: 14, hp: 2, maxHP: 2, side: "R", label: "R-KNEE", color: "#00f5e8", flash: 0, broken: false },
      prismR: { homeX: 261.0, homeY: 234.6, x: 261.0, y: 234.6, r: 14, hp: 4, maxHP: 4, color: "#00f5e8", label: "R-BROOCH", flash: 0, broken: false },
      charmR: { homeX: 285.7, homeY: 330.0, x: 285.7, y: 330.0, r: 13, color: "#00f5e8", label: "♦CHARM", flash: 0 },

      synchroSpark: { x: 198.5, y: 278.0, r: 15, flash: 0 },
      lastTwinHitSide: null,

      // Mystery Navel-to-Navel One-Way Intercept Beam (intermittent & triggered by rising balls!)
      navelBeam: {
        mode: "idle",     // "idle" | "charging" | "active"
        timer: 70,
        pluckAmp: 0,
        pluckCount: 0
      },

      // Fusion / Phase 3 State
      fused: false,
      fusionFlashTimer: 0,
      fusionSeq: { active: false, frame: 0, whiteout: 0, seraOffsetY: 0 },
      chestArmorHP: 10,
      chestArmorMaxHP: 10,
      chestArmorBroken: false,

      // Seraphia Soft Bodies & Targets (Phase 3 - aligned to 90s Seraphia 768x1376 sprite)
      bustL: { x: 173.3, y: 223.8, r: 19, rx: 30, ry: 30, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      bustR: { x: 222.6, y: 223.8, r: 19, rx: 30, ry: 30, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      hipL:  { x: 166.0, y: 352.0, r: 16, rx: 30, ry: 42, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      hipR:  { x: 230.0, y: 352.0, r: 16, rx: 30, ry: 42, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      pauldronL: { x: 144.0, y: 193.8, r: 15, flash: 0, label: "L-ARMOR" },
      pauldronR: { x: 252.0, y: 193.8, r: 15, flash: 0, label: "R-ARMOR" },
      garterL:   { x: 170.5, y: 373.6, r: 14, flash: 0, label: "L-GARTER" },
      garterR:   { x: 225.5, y: 373.6, r: 14, flash: 0, label: "R-GARTER" },
      navelSera: { x: 198.0, y: 284.6, r: 12, flash: 0, label: "NAVEL" },
      core: { x: 198.0, y: 201.3, r: 16, hp: 16, maxHP: 16, unlocked: false, flash: 0, label: "ARK CORE" },
      coreGraceTimer: 0,

      // Upper 5-Chime "Seraphic Organ Pipes" (active in Phase 3)
      chimePipes: [
        { x: 76,  y: 88, r: 11, col: "#ff2ad4", note: 523.25,  lit: false, flash: 0 },
        { x: 134, y: 68, r: 11, col: "#00f5e8", note: 659.25,  lit: false, flash: 0 },
        { x: 198, y: 58, r: 11, col: "#e6ff00", note: 783.99,  lit: false, flash: 0 },
        { x: 262, y: 68, r: 11, col: "#00f5e8", note: 987.77,  lit: false, flash: 0 },
        { x: 320, y: 88, r: 11, col: "#ff2ad4", note: 1174.66, lit: false, flash: 0 }
      ],
      harmonyBeamTimer: 0,

      // 26 Rising Sanctuary Feathers (Phase 3)
      sanctuaryFeathers: Array.from({ length: 26 }, (_, i) => ({
        x: 20 + Math.random() * 380,
        y: Math.random() * 660,
        spd: 0.8 + Math.random() * 1.3,
        scale: 0.6 + Math.random() * 0.5,
        col: ["#ff2ad4", "#00f5e8", "#e6ff00"][i % 3],
        phase: Math.random() * Math.PI * 2,
        sway: 0.8 + Math.random() * 1.2
      })),

      // Grand Phase 3 Boss Attack: Rotating Cross-Seraphim Laser & Light-Sword Volley
      seraphAttack: {
        mode: "idle", // "idle" | "cross_warn" | "cross_fire" | "sword_warn" | "sword_fire"
        timer: 140,
        nextType: "cross",
        baseAngle: 0,
        swords: []
      },

      // Seraphia Navel Gravity Vortex & Crotch Gate Spit
      navelTrap: {
        mode: "idle", // "idle" | "vortex" | "digesting" | "spit_cool"
        timer: 145,
        capturedBall: null,
        gateOpen: 0
      },

      // Cherub Spirit Orbs (Phase 3B)
      cherubOrbs: [
        { id: "cherub_l", x: 102, y: 210, r: 16, active: false, hp: 3, maxHP: 3, color: "#ff2ad4", label: "ORB-L", flash: 0 },
        { id: "cherub_r", x: 294, y: 210, r: 16, active: false, hp: 3, maxHP: 3, color: "#00f5e8", label: "ORB-R", flash: 0 }
      ],
      orbCooldown: 0,

      // Seraphia 10-Zone Random Cyber-Circuit Glow Scheduler (Suit + Thighs + Stocking Cuffs)
      circuitZones: Array.from({ length: 10 }, (_, idx) => ({
        alpha: 0,
        hold: 0,
        peak: 0.9,
        doublePulse: false,
        cooldown: 8 + idx * 9 + Math.floor(Math.random() * 20)
      })),
      circuitWaveTimer: 110,

      // Judgement Halo Attack (Reverse Controls)
      haloAttack: {
        mode: "idle", // "idle" | "charging"
        timer: 230,
        chargeTimer: 0,
        targetSide: "L",
        rings: []
      }
    };
  },

  getTargetDesc(state) {
    const b = state.boss;
    if (!b) return "双子天使を撃破せよ！";
    if (state.stageCleared) return "✨セラフィア撃破！";
    if (b.fusionSeq && b.fusionSeq.active) return "✨セラフィア降臨中！";

    if (state.phase < 3) {
      if (!b.elleBroken && !b.noelBroken) {
        return "光輪・髪飾り・膝を破壊せよ！";
      }
      if (b.elleBroken && !b.noelBroken) {
        return b.prismL.hp > 0 ? "エル胸核＆ノエル装備を破壊せよ！" : "ノエルの装備を破壊せよ！";
      }
      if (!b.elleBroken && b.noelBroken) {
        return b.prismR.hp > 0 ? "ノエル胸核＆エル装備を破壊せよ！" : "エルの装備を破壊せよ！";
      }
      return "胸部ブローチを破壊せよ！";
    }
    // Phase 3
    if (!b.chestArmorBroken) {
      return `胸部装甲を破壊せよ！(HP:${b.chestArmorHP})`;
    }
    const orbs = b.cherubOrbs.filter(o => o.active).length;
    if (orbs > 0 || b.coreGraceTimer > 0) {
      return `精霊オーブを倒し結界を解除せよ！`;
    }
    return `アーク核を撃破せよ！(HP:${b.core.hp})`;
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    UI.setBossHeader("#e6ff00", state.phase === 3 ? "SERAPHIA (熾天使セラフィア)" : "ELLE & NOEL (双子天使)");

    if (state.phase === 1) {
      UI.setText("targetBriefingText", "「私たちの天界光輪・髪飾り・膝装甲を狙ってみて！ 交互に当てるとシンクロ崩壊よ！」");
      UI.setText("dtArmLLabel", "左天使エル (L-TWIN):");
      UI.setText("dtArmRLabel", "右天使ノエル (R-TWIN):");
      UI.setText("dtChestLabel", "合体ロック:");
      UI.setText("dtCrotchLabel", "宇宙事象 / 光輪攻撃:");

      const lRemain = (!b.haloL.broken ? 1 : 0) + (!b.odangoL.broken ? 1 : 0) + (!b.kneeL.broken ? 1 : 0);
      const rRemain = (!b.haloR.broken ? 1 : 0) + (!b.antennaR.broken ? 1 : 0) + (!b.kneeR.broken ? 1 : 0);
      const lStatus = b.elleBroken ? "💥BROKEN!" : `装備残:${lRemain}/3`;
      const rStatus = b.noelBroken ? "💥BROKEN!" : `装備残:${rRemain}/3`;
      UI.setText("dtArmLStatus", lStatus);
      UI.setClass("dtArmLStatus", b.elleBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#ff2ad4]");
      UI.setText("dtArmRStatus", rStatus);
      UI.setClass("dtArmRStatus", b.noelBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#00f5e8]");
      UI.setText("dtChestStatus", "🔒FUSED LOCK");
      UI.setClass("dtChestStatus", "font-bold text-gray-400");
    } else if (state.phase === 2) {
      UI.setText("targetBriefingText", "「へそシンクロ光線が過負荷を起こしてる…！ 胸のブローチを狙わないで！」");
      UI.setText("dtArmLLabel", "エル・ブローチ:");
      UI.setText("dtArmRLabel", "ノエル・ブローチ:");
      UI.setText("dtChestLabel", "テザー過負荷:");
      UI.setText("dtCrotchLabel", "宇宙事象 / 光輪攻撃:");

      UI.setText("dtArmLStatus", b.prismL.hp <= 0 ? "💥BROOCH DOWN" : `HP: ${b.prismL.hp}/4`);
      UI.setClass("dtArmLStatus", b.prismL.hp <= 0 ? "font-bold text-gray-400" : "font-bold text-[#ff2ad4] animate-pulse");
      UI.setText("dtArmRStatus", b.prismR.hp <= 0 ? "💥BROOCH DOWN" : `HP: ${b.prismR.hp}/4`);
      UI.setClass("dtArmRStatus", b.prismR.hp <= 0 ? "font-bold text-gray-400" : "font-bold text-[#00f5e8] animate-pulse");
      UI.setText("dtChestStatus", "⚡TETHER OVERLOAD");
      UI.setClass("dtChestStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else {
      UI.setText("targetBriefingText", "「双子を超越せし神聖なる熾天使の前に跪きなさい！ アーク・コアには触れさせません！」");
      UI.setText("dtArmLLabel", "精霊オーブ-L:");
      UI.setText("dtArmRLabel", "精霊オーブ-R:");
      UI.setText("dtChestLabel", "胸部装甲 / コア:");
      UI.setText("dtCrotchLabel", "パドル状態:");

      UI.setText("dtArmLStatus", b.cherubOrbs[0].active ? `ORB-L (${b.cherubOrbs[0].hp}/3)` : "💥DOWN");
      UI.setClass("dtArmLStatus", b.cherubOrbs[0].active ? "font-bold text-[#ff2ad4] animate-pulse" : "font-bold text-gray-400");
      UI.setText("dtArmRStatus", b.cherubOrbs[1].active ? `ORB-R (${b.cherubOrbs[1].hp}/3)` : "💥DOWN");
      UI.setClass("dtArmRStatus", b.cherubOrbs[1].active ? "font-bold text-[#00f5e8] animate-pulse" : "font-bold text-gray-400");

      if (!b.chestArmorBroken) {
        UI.setText("dtChestStatus", `ARMOR (${b.chestArmorHP}/${b.chestArmorMaxHP})`);
        UI.setClass("dtChestStatus", "font-bold text-[#e6ff00]");
      } else {
        const orbs = b.cherubOrbs.filter(o => o.active).length;
        if (orbs > 0 || b.coreGraceTimer > 0) {
          UI.setText("dtChestStatus", "🛡️BARRIER ACTIVE");
          UI.setClass("dtChestStatus", "font-bold text-[#00f5e8] animate-pulse");
        } else {
          UI.setText("dtChestStatus", `💎CORE (${b.core.hp}/${b.core.maxHP})`);
          UI.setClass("dtChestStatus", "font-bold text-[#ff1493] animate-pulse");
        }
      }
    }

    if ((state.flipperReverseTimer || 0) > 0) {
      const secLeft = (state.flipperReverseTimer / 60).toFixed(1);
      UI.setText("dtCrotchStatus", `🔄LR反転中 (${secLeft}s)`);
      UI.setClass("dtCrotchStatus", "font-bold text-[#ff1493] animate-pulse");
    } else if (b.cosmic.mode === "gamma_fire") {
      UI.setText("dtCrotchStatus", "💥ガンマ線バースト発射中!!");
      UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else if (b.cosmic.mode === "bh_active") {
      UI.setText("dtCrotchStatus", "🕳️特異点重力発生中!!");
      UI.setClass("dtCrotchStatus", "font-bold text-[#b84dff] animate-pulse");
    } else if (b.haloAttack.mode === "charging") {
      UI.setText("dtCrotchStatus", "⚡光輪投擲照準中!!");
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5e8] animate-pulse");
    } else {
      UI.setText("dtCrotchStatus", "NORMAL");
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4]");
    }

    const blushVal = Math.min(100, Math.round(b.blushGauge || 0));
    UI.setText("blushGaugeText", `${blushVal}%`);
    UI.setWidth("blushGaugeBar", `${blushVal}%`);

    const faceMap = {
      normal: b.chestArmorBroken ? "神聖なる羞恥" : "威厳ある微笑み",
      wink: "✨天界のウインク✨",
      shock: "！神聖領域侵犯…っ！？",
      wince: "くぅっ…！アーク・コアが…！",
      shout: "神罰の光輪よ、彼らを裁け！",
      open_blush: "♥恥ずかしい…見ないで…♥",
      talk: "聖域の啓示を告げる…",
      talk_sm: "調和を司る…"
    };
    UI.setText("bossFaceStatus", faceMap[b.expression] || faceMap.normal);
  },

  triggerDebugJiggle(state) {
    const b = state.boss;
    if (!b) return;
    if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();

    if (state.phase < 3) {
      b.elleSpring.vx += 5.2; b.elleSpring.vy -= 6.4;
      b.noelSpring.vx -= 5.2; b.noelSpring.vy -= 6.4;
      if (b.elleBelly) { b.elleBelly.vx += 5.5; b.elleBelly.vy -= 5.8; }
      if (b.noelBelly) { b.noelBelly.vx -= 5.5; b.noelBelly.vy -= 5.8; }
      if (b.elleHip) { b.elleHip.vx -= 5.8; b.elleHip.vy -= 5.2; }
      if (b.noelHip) { b.noelHip.vx += 5.8; b.noelHip.vy -= 5.2; }
      b.elle.blushTimer = 35;
      b.noel.blushTimer = 35;
      b.navelBeam.pluckAmp = 12;
      b.blushGauge = Math.min(100, (b.blushGauge || 0) + 15);
      Particles.spawnHeart(state, 198, 260, false);
      StageCommon.setExpressionSequence(state, [
        { expr: "open_blush", frames: 30 },
        { expr: "wince", frames: 20 }
      ]);
    } else {
      const imp = b.chestArmorBroken ? 9.8 : 5.8;
      b.bustL.vx += imp; b.bustL.vy -= imp * 1.1;
      b.bustR.vx -= imp; b.bustR.vy -= imp * 1.1;
      b.hipL.vx -= 6.5; b.hipL.vy -= 5.5;
      b.hipR.vx += 6.5; b.hipR.vy -= 5.5;
      b.blushGauge = Math.min(100, (b.blushGauge || 0) + 20);
      Particles.spawnHeart(state, 198, 220, false);
      StageCommon.setExpressionSequence(state, [
        { expr: "open_blush", frames: 36 },
        { expr: "wince", frames: 20 }
      ]);
    }
  },

  onNudge(state, nx, ny, intensity) {
    const b = state.boss;
    if (!b) return;

    if (state.phase < 3) {
      b.navelBeam.pluckAmp = Math.min(15, b.navelBeam.pluckAmp + 6.0 * intensity);
      if (window.Systems && Systems.isNudgeJiggleEnabled()) {
        const mult = intensity || 1.0;
        const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
        b.elleSpring.vx += sway * 6.0 * mult;
        b.elleSpring.vy += (ny - 0.6) * 6.0 * mult;
        b.noelSpring.vx -= sway * 5.2 * mult;
        b.noelSpring.vy += (ny - 0.6) * 6.0 * mult;
        if (b.elleBelly) { b.elleBelly.vx += sway * 6.4 * mult; b.elleBelly.vy += (ny - 0.5) * 6.4 * mult; }
        if (b.noelBelly) { b.noelBelly.vx -= sway * 5.4 * mult; b.noelBelly.vy += (ny - 0.5) * 6.4 * mult; }
        if (b.elleHip) { b.elleHip.vx += sway * 6.4 * mult; b.elleHip.vy += (ny - 0.5) * 6.4 * mult; }
        if (b.noelHip) { b.noelHip.vx -= sway * 5.4 * mult; b.noelHip.vy += (ny - 0.5) * 6.4 * mult; }
        if (b.elle) b.elle.blushTimer = 32;
        if (b.noel) b.noel.blushTimer = 32;
        if (window.sfx && window.sfx.softPuru) {
          window.sfx.softPuru();
        }
      }
    } else {
      if (window.Systems && Systems.isNudgeJiggleEnabled()) {
        const mult = intensity || 1.0;
        const bImp = (b.chestArmorBroken ? 9.2 : 7.0) * mult;
        const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
        b.bustL.vx += sway * bImp;
        b.bustL.vy += (ny - 0.65) * bImp;
        b.bustR.vx -= sway * bImp * 0.75;
        b.bustR.vy += (ny - 0.65) * bImp;
        b.hipL.vx += sway * 6.5 * mult;
        b.hipL.vy += (ny - 0.5) * 6.5 * mult;
        b.hipR.vx -= sway * 5.2 * mult;
        b.hipR.vy += (ny - 0.5) * 6.5 * mult;
        if (!b.faceAnim.sequence && b.expression === "normal") {
          b.expression = b.chestArmorBroken ? "open_blush" : "shock";
          b.expressionTimer = 28;
        }
        if (window.sfx && window.sfx.softPuru) {
          window.sfx.softPuru();
        }
      }
    }

    // Save balls caught in crotch spit
    state.balls.forEach(ball => {
      if (ball._crotchSpitActive) {
        ball._crotchSpitActive = false;
        const latDir = Math.abs(nx) > 0.2 ? Math.sign(nx) : (Math.random() < 0.5 ? -1 : 1);
        ball.vx = latDir * 5.6;
        ball.vy = Math.min(ball.vy, 4.8);
        Systems.addScore(state, 15000, ball.x, ball.y, "⚡NUDGE SAVE!! +15000");
        Particles.add(state, ball.x, ball.y, "#00f5e8", 16, 4.5);
      }
    });
  },

  captureBallInNavel(state, b, ball) {
    const nt = b.navelTrap;
    if (!nt || nt.capturedBall) return;
    nt.capturedBall = ball;
    ball._inNavelTrap = true;
    ball.vx = 0;
    ball.vy = 0;
    ball.trail = [];
    nt.mode = "digesting";
    nt.timer = 48;
    b.expression = "open_blush";
    b.expressionTimer = 56;
    b.bustL.vy = -5;
    b.bustR.vy = -5;
    b.hipL.vx = -5;
    b.hipR.vx = 5;
    if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
    UI.showCutin("⚠️【へそ重力捕獲 ➔ 股間ゲート開放！】<br>真下へ高速排出！台揺らし(NUDGE)で回避せよ！", 95);
  },

  getActiveBossTarget(state) {
    const b = state.boss;
    if (state.phase < 3) {
      if (b.elleBroken && b.prismL.hp > 0) return b.prismL;
      if (b.noelBroken && b.prismR.hp > 0) return b.prismR;
      const parts = [b.haloL, b.odangoL, b.kneeL, b.haloR, b.antennaR, b.kneeR];
      const alive = parts.filter(p => !p.broken);
      return alive.length > 0 ? alive[0] : b.prismL;
    }
    // Phase 3
    if (!b.chestArmorBroken) {
      return b.bustL;
    }
    const activeOrb = b.cherubOrbs.find(o => o.active);
    if (activeOrb) return activeOrb;
    return b.core;
  },

  damageActiveBoss(state, dmg, hitX, hitY, label = "⚡HALO PARRY!! -2HP") {
    const b = state.boss;
    if (!b) return;

    if (state.phase < 3) {
      const prismTgt = (b.elleBroken && b.prismL.hp > 0) ? b.prismL : ((b.noelBroken && b.prismR.hp > 0) ? b.prismR : null);
      const parts = [b.haloL, b.odangoL, b.kneeL, b.haloR, b.antennaR, b.kneeR];
      const alive = parts.filter(p => !p.broken);
      if (alive.length > 0) {
        const tgt = alive[0];
        tgt.hp = Math.max(0, tgt.hp - dmg);
        tgt.flash = 22;
        state.shockwaves.push({ x: tgt.x, y: tgt.y, r: 6, maxR: 50, speed: 4.2, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
        Particles.add(state, tgt.x, tgt.y, "#e6ff00", 20, 5.5);
        Systems.addScore(state, 12000, tgt.x, tgt.y - 10, label);
        if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
        if (tgt.hp === 0) {
          tgt.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", tgt.x, tgt.y);
          this.checkIndividualTwinBreaks(state);
        }
      } else if (prismTgt) {
        prismTgt.hp = Math.max(0, prismTgt.hp - dmg);
        prismTgt.flash = 22;
        state.shockwaves.push({ x: prismTgt.x, y: prismTgt.y, r: 6, maxR: 50, speed: 4.2, color: prismTgt.color, lineWidth: 3.0, alpha: 1.0 });
        Particles.add(state, prismTgt.x, prismTgt.y, prismTgt.color, 18, 5.0);
        Systems.addScore(state, 15000, prismTgt.x, prismTgt.y - 10, label);
        if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
        if (prismTgt.hp <= 0) {
          prismTgt.broken = true;
          Particles.triggerArmorBreakEffect(state, "chest", prismTgt.x, prismTgt.y);
          if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
            this.triggerSeraphFusion(state);
          }
        }
      }
    } else if (state.phase === 3 && !state.stageCleared) {
      if (!b.chestArmorBroken) {
        b.chestArmorHP = Math.max(0, b.chestArmorHP - dmg);
        b.bustL.flash = 20;
        b.bustR.flash = 20;
        b.bustL.vy -= 6.0;
        b.bustR.vy -= 6.0;
        state.shockwaves.push({ x: 198, y: 208, r: 8, maxR: 55, speed: 4.5, color: "#ff2ad4", lineWidth: 3.0, alpha: 1.0 });
        Particles.add(state, 198, 208, "#ff2ad4", 20, 5.5);
        Systems.addScore(state, 20000, 198, 208, label);
        if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
        if (b.chestArmorHP <= 0) {
          this.breakSeraphiaArmor(state);
        }
      } else {
        const activeOrb = b.cherubOrbs.find(o => o.active);
        if (activeOrb) {
          activeOrb.hp = Math.max(0, activeOrb.hp - dmg);
          activeOrb.flash = 20;
          Particles.add(state, activeOrb.x, activeOrb.y, activeOrb.color, 16, 4.8);
          Systems.addScore(state, 15000, activeOrb.x, activeOrb.y - 10, label);
          if (activeOrb.hp <= 0) {
            activeOrb.active = false;
            if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
            if (b.cherubOrbs.every(o => !o.active)) {
              b.orbCooldown = 480;
              Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
            }
          }
        } else if (b.coreGraceTimer <= 0) {
          b.core.hp = Math.max(0, b.core.hp - dmg);
          b.core.flash = 24;
          state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 8, maxR: 64, speed: 4.6, color: "#00f5d4", lineWidth: 3.2, alpha: 1.0 });
          Particles.add(state, b.core.x, b.core.y, "#00f5d4", 24, 6.0);
          Systems.addScore(state, 25000, b.core.x, b.core.y - 12, label);
          if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
          if (b.core.hp <= 0) {
            this.triggerStageClear(state);
          }
        }
      }
    }
    UI.updateHUD(state);
  },

  checkIndividualTwinBreaks(state) {
    const b = state.boss;
    let newlyBrokenL = false;
    let newlyBrokenR = false;

    if (!b.elleBroken && b.haloL.broken && b.odangoL.broken && b.kneeL.broken) {
      b.elleBroken = true;
      newlyBrokenL = true;
      b.elleSpring.vy -= 4.0;
      for (let i = 0; i < 18; i++) {
        Particles.add(state, 150 + (Math.random() - 0.5) * 80, 360 + (Math.random() - 0.5) * 90, "#ff2ad4", 3, 4.0);
      }
      Systems.dropReward(state, "minor", { x: b.prismL.x, y: b.prismL.y });
    }
    if (!b.noelBroken && b.haloR.broken && b.antennaR.broken && b.kneeR.broken) {
      b.noelBroken = true;
      newlyBrokenR = true;
      b.noelSpring.vy -= 4.0;
      for (let i = 0; i < 18; i++) {
        Particles.add(state, 260 + (Math.random() - 0.5) * 80, 230 + (Math.random() - 0.5) * 90, "#00f5e8", 3, 4.0);
      }
      Systems.dropReward(state, "minor", { x: b.prismR.x, y: b.prismR.y });
    }

    if (b.elleBroken && b.noelBroken && state.phase === 1) {
      this.breakTwinSynchro(state);
      if (b.prismL.hp <= 0 && b.prismR.hp <= 0) {
        this.triggerSeraphFusion(state);
      }
    } else if (newlyBrokenL) {
      UI.showCutin("💥【エル軽ブレイク！】<br>エルのハイタッチ解除＆胸プリズム露出！", 175);
      Systems.addScore(state, 25000, b.prismL.x, b.prismL.y, "💥ELLE BREAK!!");
    } else if (newlyBrokenR) {
      UI.showCutin("💥【ノエル軽ブレイク！】<br>ノエルのハイタッチ解除＆胸プリズム露出！", 175);
      Systems.addScore(state, 25000, b.prismR.x, b.prismR.y, "💥NOEL BREAK!!");
    }
  },

  breakTwinSynchro(state) {
    const b = state.boss;
    state.phase = 2;
    b.elleBroken = true;
    b.noelBroken = true;
    b.lastTwinHitSide = null;
    for (let i = 0; i < 24; i++) {
      Particles.add(state, 198 + (Math.random() - 0.5) * 160, 250 + (Math.random() - 0.5) * 160, Math.random() < 0.5 ? "#ff2ad4" : "#00f5e8", 3, 4.0);
    }
    if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
    UI.showCutin("💥【双子ともブレイク完了！】<br>残る胸プリズムを撃破せよ！", 190);
    Systems.addScore(state, 40000, 198, 250, "💥BOTH TWINS BROKEN!");
    Systems.dropReward(state, "major", { x: 198, y: 250 });
    UI.updateHUD(state);
  },

  triggerSeraphFusion(state) {
    const b = state.boss;
    if (b.fusionSeq && b.fusionSeq.active) return;
    b.fusionSeq = { active: true, frame: 0, whiteout: 0, seraOffsetY: -220 };

    // Release any ball currently riding a wire ramp
    state.balls.forEach(ball => {
      if (ball._onWireRamp) {
        ball._onWireRamp = null;
        ball._rampExitCooldown = 30;
        Particles.add(state, ball.x, ball.y, "#ffffff", 10, 3.5);
      }
    });

    if (window.sfx && window.sfx.seraphFusion) window.sfx.seraphFusion();
    UI.showCutin("✨【超次元合体シークエンス】<br>エル＆ノエル天界昇華 ➔ 熾天使セラフィア降臨！！", 195);
    UI.updateHUD(state);
  },

  breakSeraphiaArmor(state) {
    const b = state.boss;
    b.chestArmorBroken = true;
    b.core.unlocked = true;
    b.coreGraceTimer = 90;
    b.cherubOrbs.forEach(o => { o.active = true; o.hp = o.maxHP; o.flash = 20; });
    b.orbCooldown = 480;
    b.blushGauge = Math.min(100, (b.blushGauge || 0) + 50);

    b.bustL.vx += 8.5; b.bustL.vy -= 9.0;
    b.bustR.vx -= 8.5; b.bustR.vy -= 9.0;

    Particles.triggerArmorBreakEffect(state, "chest", 198, 208);
    if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
    UI.showCutin("💖【熾天使装甲ブレイク！】💖<br>「くっ…聖なる衣が…！ 精霊オーブよ、結界を張りなさい！」", 220);
    Systems.addScore(state, 100000, 198, 208, "💖ARMOR PURGED!!");
    Systems.dropReward(state, "major", { x: 198, y: 208 });
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 30 },
      { expr: "wince", frames: 40 },
      { expr: "open_blush", frames: 60 }
    ]);
    UI.updateHUD(state);
  },

  triggerStageClear(state) {
    if (state.stageCleared) return;
    state.stageCleared = true;
    if (state.boss) {
      state.boss.blushGauge = 100;
      state.boss.expression = "wince";
    }
    StageCommon.startClearSequence(state, Physics.TABLE_WALLS);
    if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
    Systems.addScore(state, 200000, 198, 225, "✨STAGE 5 ALL CLEAR!!✨");
    UI.showCutin("✨【熾天使セラフィア 完全解脱！！】✨<br>「我が聖域の理を破るとは…人の子の光、見届けました…！」", 260);
    UI.updateHUD(state);
  },

  update(state, engine) {
    const b = state.boss;
    if (!b) return;
    b.animTick++;

    // Clear sequence progress
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: "熾天使セラフィア (SERAPHIA)",
        defeatQuoteHtml: "「我が聖域の理を破るとは……！<br>人の子の放つ光、誠に見事でした……っ！」",
        smokeColors: ["#ffffff", "#00f5e8", "#ff2ad4", "#ffe57f", "#b84dff"]
      });
      return;
    }

    // Update face animation
    StageCommon.updateFaceAnim(b, "normal");

    // Timers
    if (state.leftFlipperDown || state.rightFlipperDown) {
      b.lastFlipActiveTimer = 95;
    } else if (b.lastFlipActiveTimer > 0) {
      b.lastFlipActiveTimer--;
    }
    if (b.coreGraceTimer > 0) b.coreGraceTimer--;
    if (b.fusionFlashTimer > 0) b.fusionFlashTimer--;
    if (b.elle.blushTimer > 0) b.elle.blushTimer--;
    if (b.noel.blushTimer > 0) b.noel.blushTimer--;
    if (b.navelBeam.pluckAmp > 0.05) {
      b.navelBeam.pluckAmp *= 0.90;
    } else {
      b.navelBeam.pluckAmp = 0;
    }

    const t = b.animTick;

    // Fusion sequence progression (Cinematic 3-Beat Transformation)
    if (b.fusionSeq && b.fusionSeq.active) {
      const fs = b.fusionSeq;
      // Stasis field: float all playfield balls gently to prevent any drain
      state.balls.forEach(ball => {
        if (!ball.inShooterLane && !ball._onWireRamp) {
          ball._fusionStasis = true;
          ball.x += (198 - ball.x) * 0.004;
          ball.y = Math.min(480, ball.y) + Math.sin(b.animTick * 0.12) * 0.35;
          ball.vx = 0;
          ball.vy = 0;
        }
      });

      fs.frame++;

      // Beat 1 (frame 1..69) — Twins Double-Helix Skyward Exit & Whiteout Swell
      if (fs.frame < 70) {
        const u = fs.frame / 69;
        const helixR = (1 - u * 0.65) * 68;
        const ang = u * Math.PI * 3.5;
        const cy = 270 - Math.pow(u, 1.85) * 430;

        b.elle.dx = 198 + Math.cos(ang) * helixR - (b.baseL.x + b.baseL.w * 0.5);
        b.elle.dy = cy - (b.baseL.y + b.baseL.h * 0.45);
        b.noel.dx = 198 + Math.cos(ang + Math.PI) * helixR - (b.baseR.x + b.baseR.w * 0.5);
        b.noel.dy = cy - (b.baseR.y + b.baseR.h * 0.45);

        if (b.elleBelly) {
          b.elleBelly.x = 159.1 + b.elle.dx;
          b.elleBelly.y = 426.9 + b.elle.dy;
        }
        if (b.noelBelly) {
          b.noelBelly.x = 265.3 + b.noel.dx;
          b.noelBelly.y = 288.4 + b.noel.dy;
        }
        b.elleSpring.x = b.prismL.homeX + b.elle.dx;
        b.elleSpring.y = b.prismL.homeY + b.elle.dy;
        b.noelSpring.x = b.prismR.homeX + b.noel.dx;
        b.noelSpring.y = b.prismR.homeY + b.noel.dy;

        b.animTick += 4; // Scroll 3D wireframe grid 5x faster!
        fs.whiteout = fs.frame < 38 ? 0 : Math.min(1.0, (fs.frame - 38) / 31);
      } else if (fs.frame === 70) {
        // Beat 2 begins
        state.phase = 3;
        b.fused = true;
        b.expression = "blink";
        b.expressionTimer = 95;
        Systems.dropReward(state, "major", { x: 198, y: 240 });
        Systems.addScore(state, 80000, 198, 240, "✨SERAPHIA AWAKENING!!");
        fs.seraOffsetY = -220;
      } else if (fs.frame <= 160) {
        // Beat 2 (frame 70..160) — Heavenly God-Rays & Slow Descent of Seraphia
        const v = (fs.frame - 70) / 90;
        const ease = 1 - Math.pow(1 - v, 3);
        fs.seraOffsetY = -220 * (1 - ease);
        fs.whiteout = Math.max(0, 1.0 - (fs.frame - 70) / 52);
        if (fs.frame % 4 === 0) {
          Particles.add(state, 198 + (Math.random() - 0.5) * 260, 50 + Math.random() * 200, Math.random() < 0.5 ? "#ff2ad4" : "#00f5e8", 2, 2.5);
        }
      } else if (fs.frame <= 195) {
        // Beat 3 (frame 161..195) — Odd-Eye Awakening & Release
        if (fs.frame === 161) {
          fs.seraOffsetY = 0;
          StageCommon.setExpressionSequence(state, [
            { expr: "shout", frames: 34 },
            { expr: "wink", frames: 30 }
          ]);
          if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 70, speed: 4.5, color: "#ff2ad4", lineWidth: 3.5, alpha: 1.0 });
          state.shockwaves.push({ x: 198, y: 210, r: 8, maxR: 85, speed: 5.0, color: "#00f5e8", lineWidth: 3.5, alpha: 1.0 });
        }
        if (fs.frame >= 195) {
          fs.active = false;
          fs.whiteout = 0;
          state.balls.forEach(ball => {
            if (ball._fusionStasis) {
              ball._fusionStasis = false;
              ball.vx = (Math.random() < 0.5 ? -1 : 1) * 3.8;
              ball.vy = -6.8;
            }
          });
          UI.updateHUD(state);
        }
      }
      if (b.animTick % 4 === 0) {
        this.updateStatusMonitor(state);
      }
      return;
    }

    const activePlayBalls = state.balls.filter(ball => !ball.inShooterLane && !ball._onWireRamp && ball.y < 590);

    // Soft spring & movement updates by Phase
    if (state.phase < 3) {
      StageCommon.stepSoftSpring(b.elleSpring, 0.22, 0.87, 5.2);
      StageCommon.stepSoftSpring(b.noelSpring, 0.22, 0.87, 5.2);
      if (b.elleBelly) StageCommon.stepSoftSpring(b.elleBelly, 0.19, 0.88, b.elleBroken ? 6.4 : 6.2);
      if (b.noelBelly) StageCommon.stepSoftSpring(b.noelBelly, 0.19, 0.88, b.noelBroken ? 6.4 : 6.2);
      if (b.elleHip) StageCommon.stepSoftSpring(b.elleHip, 0.18, 0.88, 6.4);
      if (b.noelHip) StageCommon.stepSoftSpring(b.noelHip, 0.18, 0.88, 6.4);

      // Independent movement per twin (broken twin immediately enters wide solo flight!)
      if (!b.elleBroken) {
        b.elle.dx = Math.sin(t * 0.037) * 7.5;
        b.elle.dy = Math.cos(t * 0.049) * 8.0;
      } else {
        b.elle.dx = Math.sin(t * 0.031) * 28 + 10;
        b.elle.dy = Math.cos(t * 0.043) * 26 - 12;
      }
      if (!b.noelBroken) {
        b.noel.dx = Math.cos(t * 0.043) * 8.0;
        b.noel.dy = Math.sin(t * 0.053) * 8.5;
      } else {
        b.noel.dx = Math.cos(t * 0.036) * 30 - 12;
        b.noel.dy = Math.sin(t * 0.047) * 32 + 16;
      }

      b.haloL.x = b.haloL.homeX + b.elle.dx;
      b.haloL.y = b.haloL.homeY + b.elle.dy;
      b.odangoL.x = b.odangoL.homeX + b.elle.dx;
      b.odangoL.y = b.odangoL.homeY + b.elle.dy;
      b.kneeL.x = b.kneeL.homeX + b.elle.dx;
      b.kneeL.y = b.kneeL.homeY + b.elle.dy;
      b.prismL.x = b.prismL.homeX + b.elle.dx;
      b.prismL.y = b.prismL.homeY + b.elle.dy;
      b.charmL.x = b.charmL.homeX + b.elle.dx;
      b.charmL.y = b.charmL.homeY + b.elle.dy;

      b.haloR.x = b.haloR.homeX + b.noel.dx;
      b.haloR.y = b.haloR.homeY + b.noel.dy;
      b.antennaR.x = b.antennaR.homeX + b.noel.dx;
      b.antennaR.y = b.antennaR.homeY + b.noel.dy;
      b.kneeR.x = b.kneeR.homeX + b.noel.dx;
      b.kneeR.y = b.kneeR.homeY + b.noel.dy;
      b.prismR.x = b.prismR.homeX + b.noel.dx;
      b.prismR.y = b.prismR.homeY + b.noel.dy;
      b.charmR.x = b.charmR.homeX + b.noel.dx;
      b.charmR.y = b.charmR.homeY + b.noel.dy;

      b.synchroSpark.x = 198.5 + (b.elle.dx + b.noel.dx) * 0.5;
      b.synchroSpark.y = 278.0 + (b.elle.dy + b.noel.dy) * 0.5;

      b.elleSpring.x = b.prismL.homeX + b.elle.dx;
      b.elleSpring.y = b.prismL.homeY + b.elle.dy;
      b.noelSpring.x = b.prismR.homeX + b.noel.dx;
      b.noelSpring.y = b.prismR.homeY + b.noel.dy;
      if (b.elleBelly) {
        b.elleBelly.x = 159.1 + b.elle.dx;
        b.elleBelly.y = 426.9 + b.elle.dy;
      }
      if (b.noelBelly) {
        b.noelBelly.x = 265.3 + b.noel.dx;
        b.noelBelly.y = 288.4 + b.noel.dy;
      }
      if (b.elleHip) {
        b.elleHip.x = 145.4 + b.elle.dx;
        b.elleHip.y = 434.9 + b.elle.dy;
      }
      if (b.noelHip) {
        b.noelHip.x = 260.1 + b.noel.dx;
        b.noelHip.y = 294.5 + b.noel.dy;
      }

      // Intermittent & Reactive Navel-to-Navel Intercept Beam state machine!
      const nb = b.navelBeam;
      const hasRisingBall = activePlayBalls.some(ball => ball.vy < -2.3 && ball.y > 315 && ball.y < 575);
      if (nb.mode === "idle") {
        nb.timer--;
        if (hasRisingBall && nb.timer > 0 && nb.timer <= 55) {
          nb.timer = Math.max(0, nb.timer - 3);
        }
        if ((nb.timer <= 0 && hasRisingBall) || nb.timer <= -95) {
          nb.mode = "charging";
          nb.timer = hasRisingBall ? 10 : 18;
        }
      } else if (nb.mode === "charging") {
        nb.timer--;
        if (nb.timer <= 0) {
          nb.mode = "active";
          nb.timer = state.phase === 1 ? 105 : 130;
          nb.pluckAmp = 6;
          if (window.sfx && window.sfx.navelBeamPluck) window.sfx.navelBeamPluck();
        }
      } else if (nb.mode === "active") {
        nb.timer--;
        if (nb.timer <= 0) {
          nb.mode = "idle";
          nb.timer = state.phase === 1 ? 145 : 110;
        }
      }
    } else {
      // Phase 3
      if (b.chestArmorBroken) {
        StageCommon.stepSoftSpring(b.bustL, 0.16, 0.89, 11.8);
        StageCommon.stepSoftSpring(b.bustR, 0.16, 0.89, 11.8);
        StageCommon.stepSoftSpring(b.hipL, 0.18, 0.88, 9.5);
        StageCommon.stepSoftSpring(b.hipR, 0.18, 0.88, 9.5);

        // Respawn orbs if both defeated
        if (b.cherubOrbs.every(o => !o.active) && b.core.hp > 0) {
          b.orbCooldown--;
          if (b.orbCooldown <= 0) {
            b.cherubOrbs.forEach(o => { o.active = true; o.hp = o.maxHP; o.flash = 20; });
            b.orbCooldown = 480;
            if (window.sfx && window.sfx.bunshinSummon) window.sfx.bunshinSummon();
            Particles.addPopup(state, 198, 205, "🛡️精霊オーブ再展開！", "#00f5e8", 1.1);
          }
        }
        // Rotate active orbs
        const oAngle = b.animTick * 0.035;
        b.cherubOrbs[0].x = 198 + Math.cos(oAngle) * 96;
        b.cherubOrbs[0].y = 205 + Math.sin(oAngle) * 35;
        b.cherubOrbs[1].x = 198 + Math.cos(oAngle + Math.PI) * 96;
        b.cherubOrbs[1].y = 205 + Math.sin(oAngle + Math.PI) * 35;
      } else {
        StageCommon.stepSoftSpring(b.bustL, 0.19, 0.88, 6.5);
        StageCommon.stepSoftSpring(b.bustR, 0.19, 0.88, 6.5);
        StageCommon.stepSoftSpring(b.hipL, 0.19, 0.88, 6.0);
        StageCommon.stepSoftSpring(b.hipR, 0.19, 0.88, 6.0);
      }

      // Step 10-zone random glowing circuit traces on Seraphia's suit & thighs!
      if (b.circuitZones) {
        b.circuitWaveTimer--;
        if (b.circuitWaveTimer <= 0) {
          b.circuitWaveTimer = 140 + Math.floor(Math.random() * 90);
          // Top-to-bottom or bottom-to-top bi-color circuit cascade!
          const revWave = Math.random() < 0.35;
          const tiers = [[0, 1], [2, 3], [4, 5], [6, 7], [8, 9]];
          tiers.forEach((pair, ti) => {
            const delay = (revWave ? (4 - ti) : ti) * 6 + 1;
            pair.forEach(zi => {
              b.circuitZones[zi].cooldown = Math.min(b.circuitZones[zi].cooldown, delay);
              b.circuitZones[zi].peak = 1.0;
            });
          });
        }
        // Impact reactive boost when soft-bodies or targets flash
        if (b.bustL.flash > 10 || b.pauldronL.flash > 10) { b.circuitZones[0].alpha = 1.0; b.circuitZones[2].alpha = 0.95; }
        if (b.bustR.flash > 10 || b.pauldronR.flash > 10) { b.circuitZones[1].alpha = 1.0; b.circuitZones[3].alpha = 0.95; }
        if (b.navelSera.flash > 10) { b.circuitZones[4].alpha = 1.0; b.circuitZones[5].alpha = 1.0; }
        if (b.garterL.flash > 10) { b.circuitZones[6].alpha = 1.0; b.circuitZones[8].alpha = 0.95; }
        if (b.garterR.flash > 10) { b.circuitZones[7].alpha = 1.0; b.circuitZones[9].alpha = 0.95; }

        for (let zi = 0; zi < b.circuitZones.length; zi++) {
          const cz = b.circuitZones[zi];
          if (cz.hold > 0) {
            cz.hold--;
            cz.alpha += (cz.peak - cz.alpha) * 0.52;
            if (cz.hold === 0 && cz.doublePulse) {
              cz.doublePulse = false;
              cz.alpha = 0.22;
              cz.cooldown = 5;
              cz.peak = 1.0;
            }
          } else {
            cz.alpha *= state.fever.active ? 0.91 : 0.87;
            if (cz.alpha < 0.02) cz.alpha = 0;
            cz.cooldown--;
            if (cz.cooldown <= 0) {
              cz.peak = 0.78 + Math.random() * 0.22;
              cz.hold = 7 + Math.floor(Math.random() * 15);
              cz.doublePulse = Math.random() < 0.38;
              cz.cooldown = (state.fever.active ? 16 : 26) + Math.floor(Math.random() * 68);
            }
          }
        }
      }

      // 5. Seraphia's Navel Gravity Vortex ➔ Crotch Gate Straight-Down Spit
      const nt = b.navelTrap;
      if (nt) {
        if (nt.capturedBall && !state.balls.includes(nt.capturedBall)) {
          nt.capturedBall = null;
          nt.mode = "idle";
          nt.timer = 145;
        }

        if (nt.mode === "idle") {
          nt.gateOpen *= 0.85;
          nt.timer--;
          if (nt.timer <= 0 && activePlayBalls.length > 0) {
            nt.mode = "vortex";
            nt.timer = 220;
            if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
          }
        } else if (nt.mode === "vortex") {
          nt.timer--;
          if (nt.timer <= 0) {
            nt.mode = "idle";
            nt.timer = 145;
          }
        } else if (nt.mode === "digesting") {
          nt.timer--;
          const prog = 1 - (nt.timer / 48);
          nt.gateOpen = Math.min(1, prog * 1.6);
          if (nt.capturedBall) {
            nt.capturedBall.x = 198.0;
            nt.capturedBall.y = 284.6 + prog * 61.4;
            nt.capturedBall.vx = 0;
            nt.capturedBall.vy = 0;
          }
          b.hipL.vx += Math.sin(b.animTick * 0.6) * 0.9;
          b.hipR.vx -= Math.sin(b.animTick * 0.6) * 0.9;

          if (nt.timer <= 0) {
            const cb = nt.capturedBall;
            nt.capturedBall = null;
            if (cb) {
              cb._inNavelTrap = false;
              cb._crotchSpitActive = true;
              if (!cb.hitCooldowns) cb.hitCooldowns = {};
              cb.hitCooldowns.crotchSpit = 95;
              cb.x = 198.0;
              cb.y = 350.0;
              cb.vx = 0.0;
              cb.vy = 9.6;
            }
            nt.mode = "spit_cool";
            nt.timer = 36;
            b.hipL.vx -= 6.5;
            b.hipR.vx += 6.5;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            state.shockwaves.push({ x: 198, y: 348, r: 8, maxR: 50, speed: 4.5, color: "#ff1493", lineWidth: 3.0, alpha: 1.0 });
            Particles.addPopup(state, 198, 370, "⚠️真下排出! 台揺らし!!", "#ff2ad4", 1.15);
          }
        } else if (nt.mode === "spit_cool") {
          nt.timer--;
          nt.gateOpen = Math.max(0, nt.timer / 36);
          if (nt.timer <= 0) {
            nt.mode = "idle";
            nt.timer = 145;
          }
        }
      }

      // Step Sanctuary Rising Feathers
      if (b.sanctuaryFeathers) {
        b.sanctuaryFeathers.forEach(f => {
          f.y -= f.spd;
          f.x += Math.sin(t * 0.04 + f.phase) * f.sway * 0.5;
          if (f.y < -20) {
            f.y = 670;
            f.x = 20 + Math.random() * 380;
          }
        });
      }

      // Seraphic Harmony Beam countdown
      if (b.harmonyBeamTimer > 0) b.harmonyBeamTimer--;

      // Grand Phase 3 Boss Attack: Rotating Cross-Seraphim Laser & Light-Sword Volley
      const sa = b.seraphAttack;
      if (sa && (!b.fusionSeq || !b.fusionSeq.active)) {
        if (sa.mode === "idle") {
          sa.timer--;
          if (sa.timer <= 0 && activePlayBalls.length > 0) {
            if (sa.nextType === "cross") {
              sa.mode = "cross_warn";
              sa.timer = 45;
              sa.baseAngle = Math.random() * Math.PI;
              sa.nextType = "sword";
              if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            } else {
              sa.mode = "sword_warn";
              sa.timer = 40;
              sa.nextType = "cross";
              if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
            }
          }
        } else if (sa.mode === "cross_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "cross_fire";
            sa.timer = 80;
            if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
            Particles.addPopup(state, 198, 224, "⚔️CROSS SERAPHIM LASER!", "#ff2ad4", 1.2);
          }
        } else if (sa.mode === "cross_fire") {
          sa.timer--;
          sa.baseAngle += 0.007; // smooth sweeping cross laser
          if (sa.timer <= 0) {
            sa.mode = "idle";
            sa.timer = 210;
          }
        } else if (sa.mode === "sword_warn") {
          sa.timer--;
          if (sa.timer <= 0) {
            sa.mode = "sword_fire";
            sa.timer = 130;
            sa.swords = [];
            const portalSpawns = [
              { x: 110, y: 120, targetX: 142, delay: 0 },
              { x: 198, y: 96,  targetX: 198, delay: 12 },
              { x: 286, y: 120, targetX: 254, delay: 24 }
            ];
            portalSpawns.forEach((p, idx) => {
              const ang = Math.atan2(600 - p.y, p.targetX - p.x);
              sa.swords.push({
                id: idx,
                x: p.x,
                y: p.y,
                vx: Math.cos(ang) * 5.6,
                vy: Math.sin(ang) * 5.6,
                ang,
                r: 13,
                delay: p.delay,
                active: false,
                parried: false,
                trail: []
              });
            });
            Particles.addPopup(state, 198, 120, "⚔️LIGHT-SWORD VOLLEY!", "#ffd700", 1.2);
          }
        } else if (sa.mode === "sword_fire") {
          sa.timer--;
          const flippers = Physics.getFlippers(state);
          for (let si = sa.swords.length - 1; si >= 0; si--) {
            const sw = sa.swords[si];
            if (sw.delay > 0) {
              sw.delay--;
              if (sw.delay === 0) {
                sw.active = true;
                if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
              }
              continue;
            }
            if (!sw.active) continue;

            sw.trail.push({ x: sw.x, y: sw.y });
            if (sw.trail.length > 7) sw.trail.shift();

            sw.x += sw.vx;
            sw.y += sw.vy;
            sw.ang = Math.atan2(sw.vy, sw.vx);

            if (sw.parried) {
              const tgt = this.getActiveBossTarget(state);
              const dx = tgt.x - sw.x;
              const dy = tgt.y - sw.y;
              const dist = Math.hypot(dx, dy) || 1;
              sw.vx = (dx / dist) * 12.0;
              sw.vy = (dy / dist) * 12.0;
              if (dist < 26) {
                this.damageActiveBoss(state, 2, tgt.x, tgt.y, "⚔️SWORD PARRY!! -2HP");
                if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
                sa.swords.splice(si, 1);
                continue;
              }
            } else {
              // Ball clash
              let clashed = false;
              for (const ball of state.balls) {
                if (ball.inShooterLane || ball._onWireRamp) continue;
                if (Math.hypot(ball.x - sw.x, ball.y - sw.y) < ball.r + sw.r + 3) {
                  clashed = true;
                  if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
                  Particles.add(state, sw.x, sw.y, "#ffd700", 16, 4.2);
                  Systems.addScore(state, 4000, sw.x, sw.y, "⚔️CLASH!");
                  sa.swords.splice(si, 1);
                  break;
                }
              }
              if (clashed) continue;

              // Flipper collision / parry
              let parriedNow = false;
              let hitFlipper = false;
              for (let fi = 0; fi < flippers.length; fi++) {
                const f = flippers[fi];
                const fst = Physics.flipperState[fi];
                const tipX = f.px + Math.cos(fst.angle) * f.len;
                const tipY = f.py + Math.sin(fst.angle) * f.len;
                const cp = Physics.closestPointOnSeg(sw.x, sw.y, f.px, f.py, tipX, tipY);
                if (Math.hypot(sw.x - cp.x, sw.y - cp.y) < sw.r + 7.0) {
                  hitFlipper = true;
                  const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
                  if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
                    parriedNow = true;
                  }
                  break;
                }
              }

              if (parriedNow) {
                sw.parried = true;
                if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
                state.shockwaves.push({ x: sw.x, y: sw.y, r: 8, maxR: 50, speed: 4.5, color: "#ffd700", lineWidth: 3.0, alpha: 1.0 });
                Particles.add(state, sw.x, sw.y, "#ffd700", 20, 5.5);
                Particles.addPopup(state, sw.x, sw.y - 14, "⚔️SWORD PARRY!!", "#ffd700", 1.2);
                Systems.addScore(state, 12000, sw.x, sw.y, "⚔️PARRY!");
                Systems.addFever(state, 8);
                continue;
              } else if (hitFlipper) {
                state.flipperReverseTimer = Math.max(state.flipperReverseTimer || 0, 180);
                if (window.sfx && window.sfx.haloReverse) window.sfx.haloReverse();
                Particles.add(state, sw.x, sw.y, "#ff1493", 16, 4.0);
                Particles.addPopup(state, 198, 560, "⚔️SWORD IMPACT!!", "#ff1493", 1.2);
                sa.swords.splice(si, 1);
                continue;
              }
            }

            if (sw.y > 670 || sw.y < -30 || sw.x < -30 || sw.x > 450) {
              sa.swords.splice(si, 1);
            }
          }

          if (sa.swords.length === 0 && sa.timer <= 0) {
            sa.mode = "idle";
            sa.timer = 210;
          }
        }
      }
    }

    // Flash decay on targets
    [
      b.haloL, b.odangoL, b.kneeL, b.prismL, b.charmL,
      b.haloR, b.antennaR, b.kneeR, b.prismR, b.charmR,
      b.synchroSpark, b.elleBelly, b.noelBelly, b.elleHip, b.noelHip,
      b.pauldronL, b.pauldronR, b.garterL, b.garterR, b.navelSera, b.core,
      ...(b.chimePipes || []), ...b.cherubOrbs
    ].forEach(tObj => {
      if (tObj && tObj.flash > 0) tObj.flash--;
    });

    // Cosmic Star Anomalies state machine
    const cm = b.cosmic;
    if (cm.mode === "idle") {
      if (activePlayBalls.length > 0) {
        cm.timer--;
        if (cm.timer <= 0) {
          cm.x = 92 + Math.random() * 212;
          cm.y = 148 + Math.random() * 210;
          if (cm.nextType === "gamma") {
            cm.mode = "gamma_warn";
            cm.timer = 65;
            cm.angle = (Math.random() < 0.5 ? 1 : -1) * (0.45 + Math.random() * 0.45);
            cm.nextType = "blackhole";
          } else {
            cm.mode = "bh_warn";
            cm.timer = 60;
            cm.nextType = "gamma";
          }
        }
      }
    } else if (cm.mode === "gamma_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "gamma_fire";
        cm.timer = 95;
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Particles.addPopup(state, cm.x, cm.y - 20, "💥GAMMA BURST!!", "#e6ff00", 1.15);
      }
    } else if (cm.mode === "gamma_fire") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = 240;
      }
    } else if (cm.mode === "bh_warn") {
      cm.timer--;
      if (cm.timer <= 0) {
        cm.mode = "bh_active";
        cm.timer = 185;
        if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
        Particles.addPopup(state, cm.x, cm.y - 20, "🕳️SINGULARITY!!", "#b84dff", 1.15);
      }
    } else if (cm.mode === "bh_active") {
      cm.timer--;
      // Gravitational pull & singularity sling
      for (let bi = 0; bi < activePlayBalls.length; bi++) {
        const ball = activePlayBalls[bi];
        const dx = cm.x - ball.x;
        const dy = cm.y - ball.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 98 && dist > 1) {
          const pull = 0.28 * (1 - dist / 98) + 9.5 / Math.max(20, dist);
          ball.vx += (dx / dist) * pull;
          ball.vy += (dy / dist) * pull;

          if (dist < 16 && (ball.hitCooldowns.bhSling || 0) <= 0) {
            ball.hitCooldowns.bhSling = 55;
            if (window.sfx && window.sfx.blackHolePulse) window.sfx.blackHolePulse();
            const ang = (Math.random() < 0.5 ? 0.38 : Math.PI - 0.38) + (Math.random() - 0.5) * 0.28;
            ball.vx = Math.cos(ang) * 10.4;
            ball.vy = Math.sin(ang) * 10.4;
            Systems.addScore(state, 4500, cm.x, cm.y, "🕳️SINGULARITY SLING!");
            Particles.add(state, cm.x, cm.y, "#b84dff", 18, 5.0);
            state.shockwaves.push({ x: cm.x, y: cm.y, r: 8, maxR: 55, speed: 4.2, color: "#b84dff", lineWidth: 3.0, alpha: 1.0 });
          }
        }
      }
      if (cm.timer <= 0) {
        cm.mode = "idle";
        cm.timer = 240;
      }
    }

    // Judgement Halo Attack state machine
    const ha = b.haloAttack;
    if (ha.mode === "idle") {
      ha.timer--;
      if (ha.timer <= 0 && activePlayBalls.length > 0) {
        ha.mode = "charging";
        ha.chargeTimer = 38;
        ha.targetSide = Math.random() < 0.5 ? "L" : "R";
        ha.timer = 230;
        if (!b.faceAnim.sequence && state.phase === 3) {
          b.expression = "shout";
          b.expressionTimer = 38;
        }
      }
    } else if (ha.mode === "charging") {
      ha.chargeTimer--;
      if (ha.chargeTimer <= 0) {
        ha.mode = "idle";
        const targetX = ha.targetSide === "L" ? 142 : 254;
        const targetY = 600;
        const sx = 198;
        const sy = state.phase === 3 ? 180 : 250;
        const ang = Math.atan2(targetY - sy, targetX - sx);
        const spd = 5.0;
        ha.rings.push({
          x: sx,
          y: sy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          r: 14,
          rot: 0,
          parried: false,
          color: ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8",
          trail: []
        });
        if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
      }
    }

    // Halo ring flight and collision
    const flippers = Physics.getFlippers(state);
    for (let i = ha.rings.length - 1; i >= 0; i--) {
      const ring = ha.rings[i];
      ring.trail.push({ x: ring.x, y: ring.y });
      if (ring.trail.length > 8) ring.trail.shift();
      ring.x += ring.vx;
      ring.y += ring.vy;
      ring.rot += ring.parried ? 0.45 : 0.25;

      if (ring.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - ring.x;
        const dy = tgt.y - ring.y;
        const dist = Math.hypot(dx, dy) || 1;
        ring.vx = (dx / dist) * 12.0;
        ring.vy = (dy / dist) * 12.0;
        if (dist < 22) {
          this.damageActiveBoss(state, 2, tgt.x, tgt.y, "⚡HALO PARRY!! -2HP");
          ha.rings.splice(i, 1);
          continue;
        }
      } else {
        let clashedBall = false;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - ring.x, ball.y - ring.y);
          if (d < ball.r + ring.r + 3) {
            clashedBall = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, ring.x, ring.y, "#00f5e8", 14, 4.0);
            Systems.addScore(state, 3500, ring.x, ring.y, "⚔️CLASH!");
            ha.rings.splice(i, 1);
            break;
          }
        }
        if (clashedBall) continue;

        let parriedNow = false;
        let hitFlipper = false;
        let cpX = 0, cpY = 0;
        for (let fi = 0; fi < flippers.length; fi++) {
          const f = flippers[fi];
          const fst = Physics.flipperState[fi];
          const tipX = f.px + Math.cos(fst.angle) * f.len;
          const tipY = f.py + Math.sin(fst.angle) * f.len;
          const cp = Physics.closestPointOnSeg(ring.x, ring.y, f.px, f.py, tipX, tipY);
          const dist = Math.hypot(ring.x - cp.x, ring.y - cp.y);
          if (dist < ring.r + 7.0) {
            hitFlipper = true;
            cpX = cp.x;
            cpY = cp.y;
            const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
            if (omega > 0.12 || (fst.justPressedTimer || 0) > 0) {
              parriedNow = true;
            }
            break;
          }
        }

        if (parriedNow) {
          ring.parried = true;
          if (state.phase === 3) {
            b.expression = "shock";
            b.expressionTimer = 30;
          } else {
            b.elle.blushTimer = 30;
            b.noel.blushTimer = 30;
          }
          if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
          state.shockwaves.push({ x: ring.x, y: ring.y, r: 6, maxR: 44, speed: 4.2, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
          Particles.add(state, ring.x, ring.y, "#e6ff00", 18, 5.0);
          Particles.addPopup(state, ring.x, ring.y - 14, "⚔️HALO PARRY!!", "#e6ff00", 1.2);
          Systems.addScore(state, 10000, ring.x, ring.y, "⚔️PARRY!");
          Systems.addFever(state, 8);
          continue;
        } else if (hitFlipper) {
          state.flipperReverseTimer = 240; // 4.0 seconds
          if (window.sfx && window.sfx.haloReverse) window.sfx.haloReverse();
          UI.showCutin("😇【呪いの天使輪！】<br>4秒間 左右パドルの操作がアベコベに逆転！！", 110);
          Particles.add(state, cpX, cpY, "#ff1493", 16, 4.0);
          Particles.addPopup(state, 198, 560, "🔄LRパドル反転!!", "#ff1493", 1.2);
          ha.rings.splice(i, 1);
          continue;
        }
      }

      if (ring.y > 660 || ring.y < 10 || ring.x < 10 || ring.x > 385) {
        ha.rings.splice(i, 1);
      }
    }

    if (b.animTick % 4 === 0) {
      this.updateStatusMonitor(state);
    }
  },

  checkCollisions(ball, state, engine, substep = 0) {
    const b = state.boss;
    if (!b || ball.inShooterLane || ball._inNavelTrap || ball._fusionStasis) return;

    const SUBSTEPS = 6;

    // A. 3D Wireform Ramp Riding
    if (ball._onWireRamp) {
      const rs = ball._onWireRamp;
      rs.dist += rs.speed / SUBSTEPS;
      const samp = this.sampleRamp(rs.rampId, rs.dist);
      ball.x = samp.x;
      ball.y = samp.y;
      rs.elev = samp.elev;

      if (substep === 0) {
        rs.tick = (rs.tick || 0) + 1;
        if (rs.tick % 5 === 0 && window.sfx && window.sfx.rampRailTick) {
          window.sfx.rampRailTick(rs.tick / 5);
        }
        if (rs.tick % 2 === 0) {
          const rampDef = this.WIRE_RAMPS[rs.rampId];
          Particles.add(state, ball.x, ball.y, rampDef.color, 3, 2.2);
        }
      }

      if (rs.dist >= samp.totalLen) {
        const rampDef = this.WIRE_RAMPS[rs.rampId];
        ball._onWireRamp = null;
        ball._rampExitCooldown = 28;
        ball.vx = rampDef.exitVx;
        ball.vy = rampDef.exitVy;
        Particles.addPopup(state, ball.x, ball.y - 12, "⚡SKYWAY DROP!", rampDef.color, 1.05);
      }
      return;
    }

    if (substep === 0 && ball._rampExitCooldown > 0) {
      ball._rampExitCooldown--;
    }

    // B. Wire Ramp Gate Entry (active only in Phases 1 & 2 before fusion!)
    if (state.phase < 3 && !(b.fusionSeq && b.fusionSeq.active) && !ball._rampExitCooldown && ball.vy < -2.6 && b.lastFlipActiveTimer > 0) {
      for (const rampKey of ["left", "right"]) {
        const rd = this.WIRE_RAMPS[rampKey];
        const dGate = Math.hypot(ball.x - rd.entryX, ball.y - rd.entryY);
        if (dGate < ball.r + rd.entryR) {
          const entrySpd = Math.max(9.5, Math.min(14.8, Math.hypot(ball.vx, ball.vy) * 1.18));
          ball._onWireRamp = {
            rampId: rampKey,
            dist: 2,
            speed: entrySpd,
            elev: 0.15,
            tick: 0
          };
          ball.trail = [];
          if (window.sfx && window.sfx.rampEnter) window.sfx.rampEnter();
          state.shockwaves.push({ x: rd.entryX, y: rd.entryY, r: 6, maxR: 44, speed: 3.8, color: rd.color, lineWidth: 2.8, alpha: 1.0 });
          Systems.addScore(state, 6000, rd.entryX, rd.entryY - 12, `⚡${rd.name} IN!!`);
          Particles.add(state, rd.entryX, rd.entryY, rd.color, 16, 4.4);
          return;
        }
      }
    }

    if (!ball.hitCooldowns) ball.hitCooldowns = {};
    if (substep === 0) {
      for (const k in ball.hitCooldowns) {
        if (ball.hitCooldowns[k] > 0) ball.hitCooldowns[k]--;
      }
    }

    const hitCircle = (key, target, bounceSpd, cooldown, onHit) => {
      if ((ball.hitCooldowns[key] || 0) > 0) return false;
      return Physics.checkCircleBumper(ball, target, bounceSpd, () => {
        ball.hitCooldowns[key] = cooldown;
        onHit();
      });
    };

    const hitRotatedEllipse = (key, h, bounceSpd, cooldown, onHit) => {
      if ((ball.hitCooldowns[key] || 0) > 0) return false;
      const dx = ball.x - h.x;
      const dy = ball.y - h.y;
      const cosT = Math.cos(-h.tilt);
      const sinT = Math.sin(-h.tilt);
      const lx = dx * cosT - dy * sinT;
      const ly = dx * sinT + dy * cosT;
      const ex = h.rx + ball.r;
      const ey = h.ry + ball.r;
      const normDistSq = (lx * lx) / (ex * ex) + (ly * ly) / (ey * ey);
      if (normDistSq <= 1.0) {
        ball.hitCooldowns[key] = cooldown;
        let lnx = lx / (h.rx * h.rx);
        let lny = ly / (h.ry * h.ry);
        const lnLen = Math.hypot(lnx, lny) || 1;
        lnx /= lnLen;
        lny /= lnLen;
        const cosB = Math.cos(h.tilt);
        const sinB = Math.sin(h.tilt);
        const nx = lnx * cosB - lny * sinB;
        const ny = lnx * sinB + lny * cosB;

        const scale = 1.0 / Math.sqrt(normDistSq);
        const borderLx = lx * scale;
        const borderLy = ly * scale;
        const borderGx = h.x + (borderLx * cosB - borderLy * sinB);
        const borderGy = h.y + (borderLx * sinB + borderLy * cosB);
        ball.x = borderGx + nx * (ball.r + 0.5);
        ball.y = borderGy + ny * (ball.r + 0.5);

        const dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx -= 1.85 * dot * nx;
          ball.vy -= 1.85 * dot * ny;
        }
        const curSpd = Math.hypot(ball.vx, ball.vy);
        if (curSpd < bounceSpd) {
          const factor = bounceSpd / (curSpd || 1);
          ball.vx *= factor;
          ball.vy *= factor;
        }
        onHit();
        return true;
      }
      return false;
    };

    // C. Gamma-Ray Burst Collision
    if (b.cosmic.mode === "gamma_fire") {
      const a = b.cosmic.angle;
      const nx = -Math.sin(a);
      const ny = Math.cos(a);
      const perpDist = Math.abs((ball.x - b.cosmic.x) * nx + (ball.y - b.cosmic.y) * ny);
      if (perpDist < ball.r + 9 && (ball.hitCooldowns.gamma || 0) <= 0) {
        ball.hitCooldowns.gamma = 20;
        const sign = ((ball.x - b.cosmic.x) * nx + (ball.y - b.cosmic.y) * ny) >= 0 ? 1 : -1;
        ball.vx = nx * sign * 7.8;
        ball.vy = ny * sign * 7.8;
        if (b.lastFlipActiveTimer <= 0) {
          ball.vy = Math.max(ball.vy, 1.8);
        }
        if (window.sfx && window.sfx.gammaBurst) window.sfx.gammaBurst();
        Systems.addScore(state, 3000, ball.x, ball.y, "💥GAMMA BURST!");
        Particles.add(state, ball.x, ball.y, "#e6ff00", 15, 4.5);
        state.shockwaves.push({ x: ball.x, y: ball.y, r: 6, maxR: 40, speed: 4.0, color: "#00f5e8", lineWidth: 2.5, alpha: 0.9 });
      }
    }

    // D. One-Way Navel-to-Navel Intercept Beam Collision (Phases 1 & 2, ONLY when active!)
    //    Passes through from ABOVE, fiercely reflects upward shots coming from BELOW!
    if (state.phase < 3 && b.navelBeam.mode === "active") {
      const x1 = 159.1 + b.elle.dx;
      const y1 = 426.9 + b.elle.dy;
      const x2 = 265.3 + b.noel.dx;
      const y2 = 288.4 + b.noel.dy;

      const cp = Physics.closestPointOnSeg(ball.x, ball.y, x1, y1, x2, y2);
      const dist = Math.hypot(ball.x - cp.x, ball.y - cp.y);
      const segLen2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1) || 1;
      const segT = ((ball.x - x1) * (x2 - x1) + (ball.y - y1) * (y2 - y1)) / segLen2;

      if (segT > 0.06 && segT < 0.94 && dist < ball.r + 6.0) {
        const bLen = Math.sqrt(segLen2);
        // Ensure normal (bnx, bny) ALWAYS points toward the lower playfield (bny > 0)
        let bnx = -(y2 - y1) / bLen;
        let bny = (x2 - x1) / bLen;
        if (bny < 0) { bnx = -bnx; bny = -bny; }

        const dotDown = ball.vx * bnx + ball.vy * bny;
        const tx = (x2 - x1) / bLen;
        const ty = (y2 - y1) / bLen;

        // Coming from ABOVE (moving downward / with bny): pass right through with a subtle ripple!
        if (ball.vy >= -0.3 || dotDown >= -0.2) {
          if ((ball.hitCooldowns.navelPass || 0) <= 0) {
            ball.hitCooldowns.navelPass = 18;
            b.navelBeam.pluckAmp = Math.max(b.navelBeam.pluckAmp, 5.0);
            if (b.elleBelly && b.noelBelly) {
              b.elleBelly.vx += tx * 2.2;
              b.elleBelly.vy += ty * 2.2;
              b.noelBelly.vx -= tx * 2.2;
              b.noelBelly.vy -= ty * 2.2;
            }
          }
        } else if ((ball.hitCooldowns.navelBeam || 0) <= 0) {
          // Coming from BELOW (shot upward against underside): slam-reflect back downward!
          ball.hitCooldowns.navelBeam = 18;
          b.navelBeam.pluckAmp = 15;
          b.navelBeam.pluckCount++;
          if (window.sfx && window.sfx.navelBeamPluck) window.sfx.navelBeamPluck();

          if (b.elleBelly && b.noelBelly) {
            b.elleBelly.vx += tx * 5.2 - bnx * 4.6;
            b.elleBelly.vy += ty * 5.2 - bny * 4.6;
            b.noelBelly.vx += -tx * 5.2 - bnx * 4.6;
            b.noelBelly.vy += -ty * 5.2 - bny * 4.6;
            b.elleBelly.flash = 16;
            b.noelBelly.flash = 16;
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
          }

          b.elleSpring.vy = -1.8;
          b.noelSpring.vy = -1.8;
          b.elle.blushTimer = 32;
          b.noel.blushTimer = 32;
          b.blushGauge = Math.min(100, (b.blushGauge || 0) + 8);

          // Push ball cleanly below the barrier line and reflect velocity downward
          ball.x = cp.x + bnx * (ball.r + 6.2);
          ball.y = cp.y + bny * (ball.r + 6.2);
          let rvx = ball.vx - 2 * dotDown * bnx;
          let rvy = ball.vy - 2 * dotDown * bny;
          rvy = Math.max(3.2, rvy);
          const outSpd = Math.max(9.2, Math.min(13.2, Math.hypot(rvx, rvy) * 1.10));
          const rMag = Math.hypot(rvx, rvy) || 1;
          ball.vx = (rvx / rMag) * outSpd;
          ball.vy = (rvy / rMag) * outSpd;

          state.shockwaves.push({ x: cp.x, y: cp.y, r: 4, maxR: 36, speed: 3.8, color: "#ff2ad4", lineWidth: 2.2, alpha: 0.95 });
          Particles.add(state, cp.x, cp.y, "#00f5e8", 12, 4.0);

          if ((b.elleBroken || b.noelBroken) && b.navelBeam.pluckCount % 3 === 0) {
            const targetPrism = (b.elleBroken && b.prismL.hp > 0) ? b.prismL : ((b.noelBroken && b.prismR.hp > 0) ? b.prismR : null);
            if (targetPrism) {
              targetPrism.hp--;
              targetPrism.flash = 20;
              Particles.add(state, cp.x, cp.y, "#e6ff00", 16, 5.0);
              Systems.addScore(state, 5000, cp.x, cp.y, "⚡へそ過負荷 -1HP!");
              if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
                this.triggerSeraphFusion(state);
              }
            }
          } else {
            Systems.addScore(state, 1800, cp.x, cp.y, "🛡️へそバリア反射!!");
          }
        }
      }
    }

    // E & F. Independent Twin Collision Checks (Phases 1 & 2)
    if (state.phase < 3) {
      // High-Five Synchro Spark exists ONLY while neither twin is broken!
      if (!b.elleBroken && !b.noelBroken) {
        hitCircle("synchro_spark", b.synchroSpark, 9.2, 16, () => {
          b.synchroSpark.flash = 20;
          const toRight = ball.vx <= 0;
          ball.vx = toRight ? 7.5 : -7.5;
          ball.vy = -6.5;
          if (window.sfx && window.sfx.slingshot) window.sfx.slingshot();
          state.shockwaves.push({ x: b.synchroSpark.x, y: b.synchroSpark.y, r: 8, maxR: 48, speed: 4.0, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
          Particles.add(state, b.synchroSpark.x, b.synchroSpark.y, "#e6ff00", 18, 5.0);
          Systems.addScore(state, 4000, b.synchroSpark.x, b.synchroSpark.y, "🏐TWIN TOSS! +4000");
          Systems.addFever(state, 5);
        });
      }

      const bothIntact = !b.elleBroken && !b.noelBroken;

      const onTwinPartHit = (obj, spring, twin) => {
        const isAlternating = bothIntact && b.lastTwinHitSide && b.lastTwinHitSide !== obj.side;
        const dmg = isAlternating ? 2 : 1;
        b.lastTwinHitSide = obj.side;
        obj.hp = Math.max(0, obj.hp - dmg);
        obj.flash = 22;
        spring.vx += (obj.side === "L" ? -1 : 1) * 3.0;
        spring.vy -= 3.0;
        twin.blushTimer = 25;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);

        const msg = isAlternating ? "⚡SYNCHRO BREAK x2!!" : `${obj.label} HP:${obj.hp}`;
        Systems.addScore(state, isAlternating ? 12000 : 5000, obj.x, obj.y - 10, msg);
        Systems.addFever(state, isAlternating ? 8 : 4);
        Particles.add(state, obj.x, obj.y, obj.color, 14, 4.5);

        if (obj.hp <= 0) {
          obj.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", obj.x, obj.y);
          if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
          this.checkIndividualTwinBreaks(state);
        } else {
          if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
        }
        UI.updateHUD(state);
      };

      // 1. Rotated Elliptical Halos
      if (!b.haloL.broken) {
        hitRotatedEllipse("haloL", b.haloL, 9.2, 14, () => onTwinPartHit(b.haloL, b.elleSpring, b.elle));
      }
      if (!b.haloR.broken) {
        hitRotatedEllipse("haloR", b.haloR, 9.2, 14, () => onTwinPartHit(b.haloR, b.noelSpring, b.noel));
      }

      // 2. Hair Ornament Targets (plays earBoing)
      if (!b.odangoL.broken) {
        hitCircle("odangoL", b.odangoL, 8.8, 14, () => {
          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          onTwinPartHit(b.odangoL, b.elleSpring, b.elle);
        });
      }
      if (!b.antennaR.broken) {
        hitCircle("antennaR", b.antennaR, 8.8, 14, () => {
          if (window.sfx && window.sfx.earBoing) window.sfx.earBoing();
          onTwinPartHit(b.antennaR, b.noelSpring, b.noel);
        });
      }

      // 3. Knee Ring Targets
      if (!b.kneeL.broken) {
        hitCircle("kneeL", b.kneeL, 9.0, 14, () => onTwinPartHit(b.kneeL, b.elleSpring, b.elle));
      }
      if (!b.kneeR.broken) {
        hitCircle("kneeR", b.kneeR, 9.0, 14, () => onTwinPartHit(b.kneeR, b.noelSpring, b.noel));
      }

      // 4. Thigh Garter Charms (Soft-Bounce Ornaments -> Hip/Buttock Quiver!)
      hitCircle("charmL", b.charmL, 8.2, 14, () => {
        b.charmL.flash = 18;
        if (b.elleHip) {
          b.elleHip.vx -= 5.8;
          b.elleHip.vy -= 5.2;
        }
        b.elleSpring.vy -= 2.5;
        b.elle.blushTimer = 30;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
        if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
        Particles.spawnHeart(state, b.charmL.x, b.charmL.y - 8, true);
        Particles.add(state, b.charmL.x, b.charmL.y, b.charmL.color, 12, 3.8);
        Systems.addScore(state, 4500, b.charmL.x, b.charmL.y - 10, "♥GARTER BOUNCE!");
        Systems.addFever(state, 4);
        UI.updateHUD(state);
      });
      hitCircle("charmR", b.charmR, 8.2, 14, () => {
        b.charmR.flash = 18;
        if (b.noelHip) {
          b.noelHip.vx += 5.8;
          b.noelHip.vy -= 5.2;
        }
        b.noelSpring.vy -= 2.5;
        b.noel.blushTimer = 30;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
        if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
        Particles.spawnHeart(state, b.charmR.x, b.charmR.y - 8, true);
        Particles.add(state, b.charmR.x, b.charmR.y, b.charmR.color, 12, 3.8);
        Systems.addScore(state, 4500, b.charmR.x, b.charmR.y - 10, "♦GARTER BOUNCE!");
        Systems.addFever(state, 4);
        UI.updateHUD(state);
      });

      // 5. Chest Brooches (Protected until broken, then primary damage core!)
      [
        { obj: b.prismL, id: "prismL", broken: b.elleBroken, spring: b.elleSpring, twin: b.elle },
        { obj: b.prismR, id: "prismR", broken: b.noelBroken, spring: b.noelSpring, twin: b.noel }
      ].forEach(({ obj, id, broken, spring, twin }) => {
        if (!broken) {
          hitCircle(id + "_guard", obj, 8.6, 14, () => {
            obj.flash = 16;
            spring.vy -= 3.2;
            twin.blushTimer = 20;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, obj.x, obj.y, obj.color, 10, 3.5);
            Systems.addScore(state, 3000, obj.x, obj.y - 10, "🛡️BROOCH GUARD");
            UI.updateHUD(state);
          });
        } else if (obj.hp > 0) {
          hitCircle(id, obj, 8.8, 15, () => {
            obj.hp = Math.max(0, obj.hp - 1);
            obj.flash = 20;
            spring.vx += (obj.side === "L" ? 1 : -1) * 3.5;
            spring.vy -= 4.0;
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 9);
            Particles.add(state, obj.x, obj.y, obj.color, 16, 4.8);
            Systems.addScore(state, 8000, obj.x, obj.y - 10, `${obj.label} HP:${obj.hp}`);
            Systems.addFever(state, 6);
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();

            if (obj.hp <= 0) {
              obj.broken = true;
              Particles.triggerArmorBreakEffect(state, "chest", obj.x, obj.y);
              if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
              if (b.elleBroken && b.noelBroken && b.prismL.hp <= 0 && b.prismR.hp <= 0) {
                this.triggerSeraphFusion(state);
              }
            }
            UI.updateHUD(state);
          });
        }
      });
    }

    // Seraphic Organ Chime Pipes (Phase 3)
    if (state.phase === 3 && b.chimePipes) {
      b.chimePipes.forEach((pipe, pIdx) => {
        hitCircle("chimePipe_" + pIdx, pipe, 8.5, 14, () => {
          pipe.lit = true;
          pipe.flash = 22;
          if (window.sfx && window.sfx.playFM) {
            window.sfx.playFM(pipe.note, pipe.note * 0.5, 220, 0.20, "triangle", pipe.note * 1.5, 0.16);
          } else if (window.sfx && window.sfx.capsuleCatch) {
            window.sfx.capsuleCatch();
          }
          Particles.add(state, pipe.x, pipe.y, pipe.col, 14, 4.0);
          Systems.addScore(state, 4000, pipe.x, pipe.y - 10, "🎹CHIME!");
          Systems.addFever(state, 4);

          if (b.chimePipes.every(p => p.lit)) {
            b.harmonyBeamTimer = 55;
            b.chimePipes.forEach(p => { p.lit = false; p.flash = 25; });
            Systems.addScore(state, 40000, 198, 120, "✨SERAPHIC HARMONY JACKPOT!! +40,000");
            Particles.addPopup(state, 198, 120, "✨HARMONY JACKPOT!!", "#e6ff00", 1.25);
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            this.damageActiveBoss(state, 3, 198, 205, "🎹HARMONY LASER -3HP!!");
          }
          UI.updateHUD(state);
        });
      });
    }

    // Rotating Cross-Seraphim Laser Collision (Phase 3)
    if (state.phase === 3 && b.seraphAttack && b.seraphAttack.mode === "cross_fire") {
      const cx = 198, cy = 224;
      const bAng = b.seraphAttack.baseAngle;
      for (let arm = 0; arm < 4; arm++) {
        const ang = bAng + (arm * Math.PI) / 2;
        const nx = -Math.sin(ang);
        const ny = Math.cos(ang);
        const perpDist = Math.abs((ball.x - cx) * nx + (ball.y - cy) * ny);
        const alongDist = (ball.x - cx) * Math.cos(ang) + (ball.y - cy) * Math.sin(ang);
        if (alongDist > 0 && perpDist < ball.r + 9 && (ball.hitCooldowns.crossLaser || 0) <= 0) {
          ball.hitCooldowns.crossLaser = 16;
          const sign = ((ball.x - cx) * nx + (ball.y - cy) * ny) >= 0 ? 1 : -1;
          ball.vx = nx * sign * 8.2;
          ball.vy = ny * sign * 8.2;
          if (b.lastFlipActiveTimer <= 0) {
            ball.vy = Math.max(ball.vy, 1.5);
          }
          if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
          Particles.add(state, ball.x, ball.y, arm % 2 === 0 ? "#ff2ad4" : "#00f5e8", 16, 4.5);
          Systems.addScore(state, 3000, ball.x, ball.y, "⚔️CROSS DEFLECTION!");
          break;
        }
      }
    }

    // G. Phase 3 Collision Checks (Seraphia)
    if (state.phase === 3) {
      // 0. Seraphia Navel Gravity Vortex (per-substep suction, drag & capture!)
      if (b.navelTrap && b.navelTrap.mode === "vortex" && !b.navelTrap.capturedBall) {
        const dNavel = Math.hypot(198.0 - ball.x, 284.6 - ball.y);
        if (!ball.hitCooldowns || (ball.hitCooldowns.crotchSpit || 0) <= 0) {
          if (dNavel < 148 && dNavel > 1) {
            const pull = (0.92 * (1 - dNavel / 148) + 26.0 / Math.max(16, dNavel)) / SUBSTEPS;
            ball.vx += ((198.0 - ball.x) / dNavel) * pull;
            ball.vy += ((284.6 - ball.y) / dNavel) * pull;
            // Orbital drag so fast shots brake & spiral unmistakably into the navel!
            if (dNavel < 115) {
              const drag = dNavel < 65 ? Math.pow(0.90, 1 / SUBSTEPS) : Math.pow(0.945, 1 / SUBSTEPS);
              ball.vx *= drag;
              ball.vy *= drag;
            }
          }
          if (dNavel < 26) {
            this.captureBallInNavel(state, b, ball);
            return;
          }
        }
      }

      // Phase 3A: Chest Armor intact
      if (!b.chestArmorBroken) {
        // Bust hits
        [
          { key: "seraBustL", cup: b.bustL, other: b.bustR },
          { key: "seraBustR", cup: b.bustR, other: b.bustL }
        ].forEach(({ key, cup, other }) => {
          hitCircle(key, cup, 9.0, 15, () => {
            const dxH = ball.x - cup.x;
            const dyH = ball.y - cup.y;
            const dL = Math.hypot(dxH, dyH) || 1;
            cup.vx += -(dxH / dL) * 5.0;
            cup.vy += -(dyH / dL) * 5.0 - 1.0;
            other.vx += (dxH / dL) * 2.5;
            other.vy += -(dyH / dL) * 2.5;
            cup.flash = 18;

            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);
            if (!b.faceAnim.sequence) {
              b.expression = b.chestArmorHP <= 4 ? "open_blush" : "wince";
              b.expressionTimer = 22;
            }
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, cup.x, cup.y, "#ff2ad4", 14, 4.4);
            Systems.addScore(state, 6000, cup.x, cup.y - 12, `ARMOR HP:${b.chestArmorHP}`);
            Systems.addFever(state, 5);

            if (b.chestArmorHP <= 0) {
              this.breakSeraphiaArmor(state);
            }
            UI.updateHUD(state);
          });
        });

        // Pauldrons
        [b.pauldronL, b.pauldronR].forEach(pld => {
          hitCircle(pld.label, pld, 9.2, 15, () => {
            pld.flash = 18;
            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            if (!b.faceAnim.sequence) {
              b.expression = "wince";
              b.expressionTimer = 18;
            }
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, pld.x, pld.y, "#00f5e8", 12, 4.0);
            Systems.addScore(state, 4000, pld.x, pld.y - 12, `ARMOR HP:${b.chestArmorHP}`);
            Systems.addFever(state, 4);

            if (b.chestArmorHP <= 0) {
              this.breakSeraphiaArmor(state);
            }
            UI.updateHUD(state);
          });
        });
      } else {
        // Phase 3B: Armor Broken (Cherub Orbs Barrier + Core + Rich Soft Bodies)

        // Cherub Spirit Orbs
        b.cherubOrbs.forEach(orb => {
          if (!orb.active) return;
          hitCircle(orb.id, orb, 9.2, 14, () => {
            orb.hp--;
            orb.flash = 18;
            Particles.add(state, orb.x, orb.y, orb.color, 16, 4.8);
            if (orb.hp <= 0) {
              orb.active = false;
              if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
              state.shockwaves.push({ x: orb.x, y: orb.y, r: 8, maxR: 55, speed: 4.2, color: orb.color, lineWidth: 3.0, alpha: 1.0 });
              Particles.add(state, orb.x, orb.y, "#e6ff00", 20, 5.5);
              Systems.addScore(state, 18000, orb.x, orb.y - 10, `💥${orb.label} SHATTER!!`);
              Systems.addFever(state, 8);
              if (b.cherubOrbs.every(o => !o.active)) {
                b.orbCooldown = 480;
                Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
              }
            } else {
              if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
              Systems.addScore(state, 4500, orb.x, orb.y - 10, `${orb.label} HP:${orb.hp}`);
            }
            UI.updateHUD(state);
          });
        });

        // Ark Core
        hitCircle("sera_core", b.core, 9.8, 16, () => {
          b.core.flash = 24;
          const isShielded = b.coreGraceTimer > 0 || b.cherubOrbs.some(o => o.active);
          if (isShielded) {
            if (window.sfx && window.sfx.slingshot) window.sfx.slingshot();
            Systems.addScore(state, 2000, b.core.x, b.core.y - 12, "🛡️精霊オーブ結界！オーブを倒せ！");
          } else {
            b.core.hp = Math.max(0, b.core.hp - 1);
            b.expression = "wince";
            b.expressionTimer = 28;
            if (window.sfx && window.sfx.exSpark) window.sfx.exSpark();
            state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 8, maxR: 64, speed: 4.6, color: "#00f5d4", lineWidth: 3.2, alpha: 1.0 });
            Particles.add(state, b.core.x, b.core.y, "#00f5d4", 24, 6.0);
            Systems.addScore(state, 15000, b.core.x, b.core.y - 14, `💎ARK CORE HP:${b.core.hp}`);
            Systems.addFever(state, 8);
            if (b.core.hp <= 0) {
              this.triggerStageClear(state);
            }
          }
          UI.updateHUD(state);
        });

        // Rich Soft Bounce: Bust L & R
        [
          { key: "seraBustL_soft", cup: b.bustL, other: b.bustR },
          { key: "seraBustR_soft", cup: b.bustR, other: b.bustL }
        ].forEach(({ key, cup, other }) => {
          hitCircle(key, cup, 8.2, 14, () => {
            const dxH = ball.x - cup.x;
            const dyH = ball.y - cup.y;
            const dL = Math.hypot(dxH, dyH) || 1;
            cup.vx += -(dxH / dL) * 8.5;
            cup.vy += -(dyH / dL) * 8.5 - 1.5;
            other.vx += (dxH / dL) * 4.2;
            other.vy += -(dyH / dL) * 4.0;
            cup.flash = 18;

            b.bustExcitement = Math.min(100, (b.bustExcitement || 0) + 16);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 15);
            if (!b.faceAnim.sequence) {
              b.expression = "open_blush";
              b.expressionTimer = 34;
            }
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.spawnHeart(state, cup.x, cup.y - 8, false);
            Particles.add(state, cup.x, cup.y, "#ff66cc", 14, 4.0);
            Systems.addScore(state, 7500, cup.x, cup.y - 12, "♥DIVINE BOUNCE!!");
            Systems.addFever(state, 6);
            UI.updateHUD(state);
          });
        });

        // Garters & Navel (Sympathetic Hip & Bust Bounce)
        [b.garterL, b.garterR].forEach((gar, gIdx) => {
          hitCircle(gar.label, gar, 8.5, 16, () => {
            gar.flash = 18;
            const mainHip = gIdx === 0 ? b.hipL : b.hipR;
            const subHip = gIdx === 0 ? b.hipR : b.hipL;
            const dir = gIdx === 0 ? -1 : 1;
            mainHip.vx += dir * 7.0;
            mainHip.vy -= 6.0;
            subHip.vx -= dir * 4.0;
            subHip.vy -= 3.5;
            b.bustL.vy -= 3.5;
            b.bustR.vy -= 3.5;

            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 8);
            if (!b.faceAnim.sequence && b.expression === "normal") {
              b.expression = "open_blush";
              b.expressionTimer = 24;
            }
            Particles.spawnHeart(state, gar.x, gar.y - 6, true);
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, gar.x, gar.y, "#00f5e8", 10, 3.4);
            Systems.addScore(state, 4000, gar.x, gar.y - 10, `✨${gar.label}`);
            Systems.addFever(state, 4);
            UI.updateHUD(state);
          });
        });

        if (!(b.navelTrap && b.navelTrap.mode !== "idle")) {
          hitCircle("seraNavel", b.navelSera, 8.2, 16, () => {
            b.navelSera.flash = 18;
            b.hipL.vy -= 6.5;
            b.hipR.vy -= 6.5;
            b.bustL.vy += 4.5;
            b.bustR.vy += 4.5;

            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 12);
            if (!b.faceAnim.sequence && b.expression === "normal") {
              b.expression = "open_blush";
              b.expressionTimer = 30;
            }
            Particles.spawnHeart(state, b.navelSera.x, b.navelSera.y - 6, false);
            if (window.sfx && window.sfx.softPuru) window.sfx.softPuru();
            Particles.add(state, b.navelSera.x, b.navelSera.y, "#ff66cc", 14, 4.2);
            Systems.addScore(state, 5500, b.navelSera.x, b.navelSera.y - 10, "💖NAVEL TOUCH!");
            Systems.addFever(state, 5);
            UI.updateHUD(state);
          });
        }
      }
    }
  },

  // -------------------------------------------------------------------------
  // Offscreen Sprite Baking & Cache Layer (ZERO runtime shadowBlur!)
  // -------------------------------------------------------------------------
  ensureStageCanvases(IMG_BOX) {
    const W = IMG_BOX.w;
    const H = IMG_BOX.h;
    if (this._srcCache && this._srcCache.w === W && this._srcCache.h === H) {
      return this._srcCache;
    }

    if (
      !this.assets.twinLIntactImg.complete || !this.assets.twinLIntactImg.naturalWidth ||
      !this.assets.twinLBrokenImg.complete || !this.assets.twinLBrokenImg.naturalWidth ||
      !this.assets.twinRIntactImg.complete || !this.assets.twinRIntactImg.naturalWidth ||
      !this.assets.twinRBrokenImg.complete || !this.assets.twinRBrokenImg.naturalWidth ||
      !this.assets.seraphiaIntactImg.complete || !this.assets.seraphiaIntactImg.naturalWidth ||
      !this.assets.seraphiaBrokenImg.complete || !this.assets.seraphiaBrokenImg.naturalWidth ||
      !this.assets.wingUpperImg.complete || !this.assets.wingUpperImg.naturalWidth ||
      !this.assets.wingMidImg.complete || !this.assets.wingMidImg.naturalWidth ||
      !this.assets.wingLowerImg.complete || !this.assets.wingLowerImg.naturalWidth
    ) {
      return null;
    }

    const makeScaledBuffer = (img, targetW, targetH) =>
      StageCommon.createPixelBuffer(targetW, targetH, (cx) => cx.drawImage(img, 0, 0, targetW, targetH));

    // Scaled Character Buffers
    const wL = Math.round((336 / 768) * W);
    const hL = Math.round((724 / 1376) * H);
    const twinLIntact = makeScaledBuffer(this.assets.twinLIntactImg, wL, hL);
    const twinLBroken = makeScaledBuffer(this.assets.twinLBrokenImg, wL, hL);

    const wR = Math.round((407 / 768) * W);
    const hR = Math.round((725 / 1376) * H);
    const twinRIntact = makeScaledBuffer(this.assets.twinRIntactImg, wR, hR);
    const twinRBroken = makeScaledBuffer(this.assets.twinRBrokenImg, wR, hR);

    const seraphiaIntact = makeScaledBuffer(this.assets.seraphiaIntactImg, W, H);
    const seraphiaBroken = makeScaledBuffer(this.assets.seraphiaBrokenImg, W, H);

    // Pre-bake Wing Feather Sprites (magenta: "#ff2ad4", cyan: "#00f5e8")
    const bakeWingFeather = (img, pivOrigX, pivOrigY, colorHex) => {
      const scale = 0.36;
      const cw = Math.round(img.naturalWidth * scale);
      const ch = Math.round(img.naturalHeight * scale);
      const c = document.createElement("canvas");
      c.width = cw;
      c.height = ch;
      const cx = c.getContext("2d");

      cx.drawImage(img, 0, 0, cw, ch);
      cx.globalCompositeOperation = "source-in";
      cx.fillStyle = colorHex;
      cx.fillRect(0, 0, cw, ch);

      cx.globalCompositeOperation = "lighter";
      cx.globalAlpha = 0.72;
      cx.drawImage(img, 0, 0, cw, ch);

      return {
        canvas: c,
        pivX: pivOrigX * scale,
        pivY: pivOrigY * scale,
        w: cw,
        h: ch
      };
    };

    const wings = {
      magenta: {
        upper: bakeWingFeather(this.assets.wingUpperImg, 8, 110, "#ff2ad4"),
        mid:   bakeWingFeather(this.assets.wingMidImg, 8, 66, "#ff2ad4"),
        lower: bakeWingFeather(this.assets.wingLowerImg, 9, 52, "#ff2ad4")
      },
      cyan: {
        upper: bakeWingFeather(this.assets.wingUpperImg, 8, 110, "#00f5e8"),
        mid:   bakeWingFeather(this.assets.wingMidImg, 8, 66, "#00f5e8"),
        lower: bakeWingFeather(this.assets.wingLowerImg, 9, 52, "#00f5e8")
      }
    };

    // Pre-bake Twinkling Cross-Star Sprites (5 colors on 20x20 canvases)
    const starColors = ["#ffffff", "#00f5d4", "#ff66cc", "#e6ff00", "#b84dff"];
    const starSprites = starColors.map(color => {
      const c = document.createElement("canvas");
      c.width = 20;
      c.height = 20;
      const cx = c.getContext("2d");

      const grad = cx.createRadialGradient(10, 10, 1, 10, 10, 9);
      grad.addColorStop(0, color);
      grad.addColorStop(0.35, color);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      cx.fillStyle = grad;
      cx.beginPath();
      cx.arc(10, 10, 9, 0, Math.PI * 2);
      cx.fill();

      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 1.2;
      cx.beginPath();
      cx.moveTo(10, 2);
      cx.lineTo(10, 18);
      cx.moveTo(2, 10);
      cx.lineTo(18, 10);
      cx.stroke();

      cx.fillStyle = "#ffffff";
      cx.fillRect(9, 9, 2, 2);

      return c;
    });

    // Pre-bake Halo Sprites (magenta, cyan, gold on 84x40 canvases)
    const haloColors = {
      magenta: "#ff2ad4",
      cyan: "#00f5e8",
      gold: "#ffd700"
    };
    const haloSprites = {};
    for (const [k, col] of Object.entries(haloColors)) {
      const c = document.createElement("canvas");
      c.width = 84;
      c.height = 40;
      const cx = c.getContext("2d");

      cx.strokeStyle = col;
      cx.globalAlpha = 0.35;
      cx.lineWidth = 7.0;
      cx.beginPath();
      cx.ellipse(42, 20, 34, 13, -0.08, 0, Math.PI * 2);
      cx.stroke();

      cx.globalAlpha = 0.65;
      cx.lineWidth = 4.0;
      cx.beginPath();
      cx.ellipse(42, 20, 34, 13, -0.08, 0, Math.PI * 2);
      cx.stroke();

      cx.globalAlpha = 1.0;
      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 1.8;
      cx.beginPath();
      cx.ellipse(42, 20, 34, 13, -0.08, 0, Math.PI * 2);
      cx.stroke();

      haloSprites[k] = c;
    }

    this.ensureRampCanvases();

    // Pre-bake 10-zone neon circuit glow overlays from Seraphia's exact suit & thigh circuit pixels!
    const bakeCircuitZones = (buf) => {
      const sd = buf.data;
      const bw = buf.w, bh = buf.h;
      const minYScan = Math.round((318 / 1376) * bh);
      const yCollarEnd = Math.round((445 / 1376) * bh);
      const yWaistEnd  = Math.round((615 / 1376) * bh);
      const yThighEnd  = Math.round((765 / 1376) * bh);
      const xSleeveL1  = Math.round((295 / 768) * bw);
      const xSleeveR1  = Math.round((473 / 768) * bw);
      const xSleeveL2  = Math.round((285 / 768) * bw);
      const xSleeveR2  = Math.round((483 / 768) * bw);
      const coreHalfW  = Math.round((28 / 768) * bw);
      const coreY0     = Math.round((366 / 1376) * bh);
      const coreY1     = Math.round((432 / 1376) * bh);
      const midX = bw * 0.5;

      const buckets = Array.from({ length: 10 }, () => ({
        pts: [],
        x0: bw, y0: bh, x1: 0, y1: 0,
        isCyan: false
      }));

      for (let py = minYScan; py < bh; py++) {
        for (let px = 0; px < bw; px++) {
          if (py >= coreY0 && py <= coreY1 && Math.abs(px - midX) <= coreHalfW) continue;
          const idx = (py * bw + px) * 4;
          const a = sd[idx + 3];
          if (a < 180) continue;
          const r = sd[idx], g = sd[idx + 1], bl = sd[idx + 2];
          const isMag = r > 155 && bl > 165 && (bl - g) > 70 && (r - g) > 62;
          const isCya = g > 165 && bl > 160 && (g - r) > 70;
          if (!isMag && !isCya) continue;

          let z = 0;
          if (py < yCollarEnd) {
            if (px < xSleeveL1) z = 2;
            else if (px > xSleeveR1) z = 3;
            else z = px < midX ? 0 : 1;
          } else if (py < yWaistEnd) {
            if (px < xSleeveL2) z = 2;
            else if (px > xSleeveR2) z = 3;
            else z = px < midX ? 4 : 5;
          } else if (py < yThighEnd) {
            z = px < midX ? 6 : 7;
          } else {
            z = px < midX ? 8 : 9;
          }

          const bk = buckets[z];
          bk.isCyan = isCya || (z % 2 === 1);
          bk.pts.push(px, py);
          if (px < bk.x0) bk.x0 = px;
          if (px > bk.x1) bk.x1 = px;
          if (py < bk.y0) bk.y0 = py;
          if (py > bk.y1) bk.y1 = py;
        }
      }

      return buckets.map(bk => {
        if (bk.pts.length === 0) return null;
        const pad = 3;
        const ox = Math.max(0, bk.x0 - pad);
        const oy = Math.max(0, bk.y0 - pad);
        const cw = Math.min(bw, bk.x1 + pad + 1) - ox;
        const ch = Math.min(bh, bk.y1 + pad + 1) - oy;
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const cx = c.getContext("2d");

        // Outer neon bloom pass (zero shadowBlur!)
        cx.fillStyle = bk.isCyan ? "rgba(0, 245, 232, 0.42)" : "rgba(255, 42, 212, 0.44)";
        for (let i = 0; i < bk.pts.length; i += 2) {
          const lx = bk.pts[i] - ox;
          const ly = bk.pts[i + 1] - oy;
          cx.fillRect(lx - 1, ly - 1, 3, 3);
        }
        // Bright inner neon-white core pass
        cx.fillStyle = bk.isCyan ? "#d8ffff" : "#ffd8fb";
        for (let i = 0; i < bk.pts.length; i += 2) {
          cx.fillRect(bk.pts[i] - ox, bk.pts[i + 1] - oy, 1, 1);
        }
        return { canvas: c, x: ox, y: oy };
      });
    };

    // Pre-bake Giant Celestial Cyber-Mandala (290x290 offscreen canvases)
    const mandalaOuter = (() => {
      const c = document.createElement("canvas");
      c.width = 290;
      c.height = 290;
      const cx = c.getContext("2d");
      const ox = 145, oy = 145;

      cx.strokeStyle = "rgba(0, 245, 232, 0.45)";
      cx.lineWidth = 5.0;
      cx.beginPath();
      cx.arc(ox, oy, 136, 0, Math.PI * 2);
      cx.stroke();

      cx.strokeStyle = "#00f5e8";
      cx.lineWidth = 2.0;
      cx.beginPath();
      cx.arc(ox, oy, 136, 0, Math.PI * 2);
      cx.stroke();

      cx.strokeStyle = "#ff2ad4";
      cx.lineWidth = 1.8;
      cx.beginPath();
      cx.arc(ox, oy, 118, 0, Math.PI * 2);
      cx.stroke();

      const colors = ["#ff2ad4", "#00f5e8", "#e6ff00"];
      for (let s = 0; s < 12; s++) {
        const a0 = (s * Math.PI * 2) / 12;
        const a1 = ((s + 1) * Math.PI * 2) / 12;

        cx.fillStyle = s % 2 === 0 ? "rgba(255, 42, 212, 0.12)" : "rgba(0, 245, 232, 0.12)";
        cx.beginPath();
        cx.arc(ox, oy, 136, a0, a1);
        cx.arc(ox, oy, 118, a1, a0, true);
        cx.closePath();
        cx.fill();

        cx.strokeStyle = colors[s % 3];
        cx.lineWidth = 1.4;
        cx.beginPath();
        cx.moveTo(ox + Math.cos(a0) * 45, oy + Math.sin(a0) * 45);
        cx.lineTo(ox + Math.cos(a0) * 136, oy + Math.sin(a0) * 136);
        cx.stroke();

        const midA = (a0 + a1) * 0.5;
        const dx = ox + Math.cos(midA) * 127;
        const dy = oy + Math.sin(midA) * 127;
        cx.save();
        cx.translate(dx, dy);
        cx.rotate(midA);
        cx.fillStyle = colors[s % 3];
        cx.beginPath();
        cx.moveTo(0, -4.5);
        cx.lineTo(3.5, 0);
        cx.lineTo(0, 4.5);
        cx.lineTo(-3.5, 0);
        cx.closePath();
        cx.fill();
        cx.restore();
      }

      cx.strokeStyle = "rgba(230, 255, 0, 0.7)";
      cx.lineWidth = 1.2;
      for (let t = 0; t < 24; t++) {
        const ang = (t * Math.PI * 2) / 24;
        cx.beginPath();
        cx.moveTo(ox + Math.cos(ang) * 92, oy + Math.sin(ang) * 92);
        cx.lineTo(ox + Math.cos(ang) * 98, oy + Math.sin(ang) * 98);
        cx.stroke();
      }

      return c;
    })();

    const mandalaInner = (() => {
      const c = document.createElement("canvas");
      c.width = 290;
      c.height = 290;
      const cx = c.getContext("2d");
      const ox = 145, oy = 145;
      const R = 98;

      // Sacred Hexagram (六芒星)
      // Upward Triangle (Magenta)
      cx.fillStyle = "rgba(255, 42, 212, 0.15)";
      cx.strokeStyle = "#ff2ad4";
      cx.lineWidth = 2.4;
      cx.beginPath();
      for (let i = 0; i < 3; i++) {
        const ang = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = ox + Math.cos(ang) * R;
        const py = oy + Math.sin(ang) * R;
        if (i === 0) cx.moveTo(px, py);
        else cx.lineTo(px, py);
      }
      cx.closePath();
      cx.fill();
      cx.stroke();

      // Downward Triangle (Cyan)
      cx.fillStyle = "rgba(0, 245, 232, 0.15)";
      cx.strokeStyle = "#00f5e8";
      cx.lineWidth = 2.4;
      cx.beginPath();
      for (let i = 0; i < 3; i++) {
        const ang = Math.PI / 2 + (i * Math.PI * 2) / 3;
        const px = ox + Math.cos(ang) * R;
        const py = oy + Math.sin(ang) * R;
        if (i === 0) cx.moveTo(px, py);
        else cx.lineTo(px, py);
      }
      cx.closePath();
      cx.fill();
      cx.stroke();

      cx.strokeStyle = "#e6ff00";
      cx.lineWidth = 2.0;
      cx.beginPath();
      cx.arc(ox, oy, 52, 0, Math.PI * 2);
      cx.stroke();

      cx.fillStyle = "#ffffff";
      cx.beginPath();
      cx.arc(ox, oy, 6, 0, Math.PI * 2);
      cx.fill();

      return c;
    })();

    // Pre-bake Cyber Light-Sword Sprite (60x24)
    const swordSprite = (() => {
      const c = document.createElement("canvas");
      c.width = 60;
      c.height = 24;
      const cx = c.getContext("2d");
      const cy = 12;

      cx.strokeStyle = "rgba(255, 215, 0, 0.45)";
      cx.lineWidth = 7;
      cx.lineCap = "round";
      cx.beginPath();
      cx.moveTo(14, cy);
      cx.lineTo(54, cy);
      cx.stroke();

      cx.strokeStyle = "#ffd700";
      cx.lineWidth = 3.5;
      cx.beginPath();
      cx.moveTo(14, cy);
      cx.lineTo(55, cy);
      cx.stroke();

      cx.strokeStyle = "#ffffff";
      cx.lineWidth = 1.6;
      cx.beginPath();
      cx.moveTo(16, cy);
      cx.lineTo(56, cy);
      cx.stroke();

      cx.fillStyle = "#00f5e8";
      cx.fillRect(12, cy - 8, 3, 16);
      cx.fillStyle = "#ff2ad4";
      cx.fillRect(4, cy - 2.5, 8, 5);
      cx.fillStyle = "#e6ff00";
      cx.beginPath();
      cx.arc(3, cy, 3, 0, Math.PI * 2);
      cx.fill();

      return c;
    })();

    const circuitSpritesIntact = bakeCircuitZones(seraphiaIntact);
    const circuitSpritesBroken = bakeCircuitZones(seraphiaBroken);

    this._srcCache = {
      w: W,
      h: H,
      twinLIntact,
      twinLBroken,
      twinRIntact,
      twinRBroken,
      seraphiaIntact,
      seraphiaBroken,
      circuitSpritesIntact,
      circuitSpritesBroken,
      mandalaOuter,
      mandalaInner,
      swordSprite,
      wings,
      starSprites,
      haloSprites,
      warpSlots: {}
    };
    return this._srcCache;
  },

  ensureRampCanvases() {
    if (this._rampStaticCanvas && this._rampUpperCanvas) return;
    this.sampleRamp("left", 0);
    const GAUGE = 7.6;
    const W = 420, H = 660;

    const staticC = document.createElement("canvas");
    staticC.width = W;
    staticC.height = H;
    const sctx = staticC.getContext("2d");

    const upperC = document.createElement("canvas");
    upperC.width = W;
    upperC.height = H;
    const uctx = upperC.getContext("2d");

    for (const rampKey of ["left", "right"]) {
      const rd = this.WIRE_RAMPS[rampKey];
      const pts = this._rampMetrics[rampKey].smoothPts;
      const totalLen = this._rampMetrics[rampKey].totalLen;

      // Drop shadow
      sctx.strokeStyle = "rgba(4, 2, 16, 0.55)";
      sctx.lineWidth = GAUGE * 2 + 4;
      sctx.lineCap = "round";
      sctx.lineJoin = "round";
      sctx.beginPath();
      pts.forEach((p, idx) => {
        const sx = p.x + p.elev * 5;
        const sy = p.y + p.elev * 8;
        if (idx === 0) sctx.moveTo(sx, sy);
        else sctx.lineTo(sx, sy);
      });
      sctx.stroke();

      // Dual base rails
      for (const side of [-1, 1]) {
        sctx.strokeStyle = rd.color;
        sctx.globalAlpha = 0.28;
        sctx.lineWidth = 5.2;
        sctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const pNext = pts[Math.min(pts.length - 1, i + 1)];
          const pPrev = pts[Math.max(0, i - 1)];
          const dx = pNext.x - pPrev.x;
          const dy = pNext.y - pPrev.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const rx = p.x + nx * side * GAUGE;
          const ry = p.y + ny * side * GAUGE;
          if (i === 0) sctx.moveTo(rx, ry);
          else sctx.lineTo(rx, ry);
        }
        sctx.stroke();

        sctx.strokeStyle = rd.color;
        sctx.globalAlpha = 0.90;
        sctx.lineWidth = 2.3;
        sctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const pNext = pts[Math.min(pts.length - 1, i + 1)];
          const pPrev = pts[Math.max(0, i - 1)];
          const dx = pNext.x - pPrev.x;
          const dy = pNext.y - pPrev.y;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const rx = p.x + nx * side * GAUGE;
          const ry = p.y + ny * side * GAUGE;
          if (i === 0) sctx.moveTo(rx, ry);
          else sctx.lineTo(rx, ry);
        }
        sctx.stroke();
      }

      // Upper ring arches
      for (let d = 24; d < totalLen - 16; d += 32) {
        const s = this.sampleRamp(rampKey, d);
        const ang = Math.atan2(s.ty, s.tx);
        uctx.save();
        uctx.translate(s.x, s.y);
        uctx.rotate(ang);
        uctx.strokeStyle = rd.accent;
        uctx.globalAlpha = 0.78;
        uctx.lineWidth = 1.7;
        uctx.beginPath();
        uctx.ellipse(0, 0, 3.4, GAUGE + 1.8, 0, -Math.PI * 0.5, Math.PI * 0.5);
        uctx.stroke();
        uctx.restore();
      }
    }

    this._rampStaticCanvas = staticC;
    this._rampUpperCanvas = upperC;
  },

  drawArticulatedWing(ctx, px, py, sideSign, colorKey, scale, tick, speedMult, baseTilt) {
    if (!this._srcCache || !this._srcCache.wings || !this._srcCache.wings[colorKey]) return;
    const wingGroup = this._srcCache.wings[colorKey];
    const foreshorten = 0.88 + 0.12 * Math.cos(tick * 0.10 * speedMult);
    const segs = [
      { seg: wingGroup.lower, angle: baseTilt + 0.34 + Math.sin(tick * 0.10 * speedMult - 0.80) * 0.24 },
      { seg: wingGroup.mid,   angle: baseTilt + 0.06 + Math.sin(tick * 0.10 * speedMult - 0.40) * 0.26 },
      { seg: wingGroup.upper, angle: baseTilt - 0.24 + Math.sin(tick * 0.10 * speedMult) * 0.28 }
    ];
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(sideSign * scale * foreshorten, scale);
      ctx.rotate(s.angle);
      ctx.drawImage(s.seg.canvas, -s.seg.pivX, -s.seg.pivY);
      ctx.restore();
    }
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };
    const b = state.boss;

    if (!this.assets.loaded) {
      ctx.fillStyle = "#07031c";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    if (isDefeat) {
      ctx.drawImage(this.assets.defeatCgImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
    ctx.clip();

    // 1. Deep space base
    ctx.fillStyle = "#07031c";
    ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    if (b) {
      const vpX = 198;
      const vpY = 324;
      const t = b.animTick;

      // Horizon glow around y = 324
      const horizonGrad = ctx.createRadialGradient(vpX, vpY, 10, vpX, vpY, 180);
      if (state.phase === 1) {
        horizonGrad.addColorStop(0, "rgba(0, 184, 212, 0.40)");
        horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
      } else if (state.phase === 2) {
        horizonGrad.addColorStop(0, "rgba(255, 42, 212, 0.35)");
        horizonGrad.addColorStop(0.5, "rgba(0, 245, 232, 0.20)");
        horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
      } else {
        horizonGrad.addColorStop(0, "rgba(230, 255, 0, 0.35)");
        horizonGrad.addColorStop(0.5, "rgba(0, 245, 212, 0.25)");
        horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
      }
      ctx.fillStyle = horizonGrad;
      ctx.fillRect(IMG_BOX.x, 220, IMG_BOX.w, 208);

      // 3D Perspective Wireframe Grids
      const gridColor = state.phase === 1 ? "rgba(0, 184, 212, 0.35)" : (state.phase === 2 ? "rgba(255, 42, 212, 0.35)" : "rgba(0, 245, 212, 0.40)");
      const crossColor = state.phase === 1 ? "rgba(0, 245, 232, 0.50)" : (state.phase === 2 ? "rgba(0, 245, 232, 0.50)" : "rgba(230, 255, 0, 0.50)");

      ctx.save();
      // Ceiling radial lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let x = IMG_BOX.x; x <= IMG_BOX.x + IMG_BOX.w; x += 28) {
        ctx.moveTo(x, 16);
        ctx.lineTo(vpX + (x - vpX) * 0.45, 182);
      }
      // Floor radial lines
      for (let x = IMG_BOX.x; x <= IMG_BOX.x + IMG_BOX.w; x += 28) {
        ctx.moveTo(x, 660);
        ctx.lineTo(vpX + (x - vpX) * 0.45, 434);
      }
      ctx.stroke();

      // Scrolling horizontal cross-lines
      const gridScroll = (t * 0.015) % 1;
      ctx.strokeStyle = crossColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      // Ceiling
      for (let k = 0; k < 6; k++) {
        const u = ((k + gridScroll) % 6) / 6;
        const cy = 16 + Math.pow(u, 1.6) * (182 - 16);
        const factor = (cy - 16) / (vpY - 16);
        const xL = 16 + (vpX - 16) * factor * 0.55;
        const xR = 380 - (380 - vpX) * factor * 0.55;
        ctx.moveTo(xL, cy);
        ctx.lineTo(xR, cy);
      }
      // Floor
      for (let k = 0; k < 7; k++) {
        const u = ((k - gridScroll + 7) % 7) / 7;
        const fy = 434 + Math.pow(u, 1.6) * (660 - 434);
        const factor = (660 - fy) / (660 - vpY);
        const xL = 16 + (vpX - 16) * factor * 0.55;
        const xR = 380 - (380 - vpX) * factor * 0.55;
        ctx.moveTo(xL, fy);
        ctx.lineTo(xR, fy);
      }
      ctx.stroke();
      ctx.restore();

      const cache = this.ensureStageCanvases(IMG_BOX);

      // Render 28 Twinkling Stars
      if (cache && cache.starSprites) {
        b.stars.forEach(st => {
          const p = 0.55 + 0.45 * Math.sin(t * st.spd + st.phase);
          const sz = 20 * p * st.baseScale;
          const half = sz * 0.5;
          ctx.drawImage(cache.starSprites[st.colorIdx], st.x - half, st.y - half, sz, sz);
        });
      }

      // Cosmic Star Anomaly rendering
      const cm = b.cosmic;
      if (cm.mode === "gamma_warn") {
        const cosA = Math.cos(cm.angle);
        const sinA = Math.sin(cm.angle);
        ctx.save();
        ctx.strokeStyle = "rgba(230, 255, 0, 0.75)";
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(cm.x - cosA * 500, cm.y - sinA * 500);
        ctx.lineTo(cm.x + cosA * 500, cm.y + sinA * 500);
        ctx.stroke();

        const pPulse = 0.6 + 0.4 * Math.sin(t * 0.35);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cm.x, cm.y, 8 * pPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (cm.mode === "gamma_fire") {
        const cosA = Math.cos(cm.angle);
        const sinA = Math.sin(cm.angle);
        ctx.save();
        ctx.strokeStyle = (t % 4 < 2) ? "rgba(0, 245, 232, 0.85)" : "rgba(255, 42, 212, 0.85)";
        ctx.lineWidth = 18;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(cm.x - cosA * 500, cm.y - sinA * 500);
        ctx.lineTo(cm.x + cosA * 500, cm.y + sinA * 500);
        ctx.stroke();

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 7;
        ctx.stroke();

        const grad = ctx.createRadialGradient(cm.x, cm.y, 2, cm.x, cm.y, 28);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, "#e6ff00");
        grad.addColorStop(1, "rgba(230, 255, 0, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cm.x, cm.y, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (cm.mode === "bh_warn") {
        const prog = (cm.timer % 20) / 20;
        ctx.save();
        for (let r = 50 * prog; r < 50; r += 14) {
          ctx.strokeStyle = "rgba(184, 77, 255, " + (1 - r / 50) + ")";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(cm.x, cm.y, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (cm.mode === "bh_active") {
        ctx.save();
        ctx.fillStyle = "#03000b";
        ctx.strokeStyle = "#b84dff";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cm.x, cm.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.translate(cm.x, cm.y);
        ctx.rotate(t * 0.08);
        const colList = ["#ff2ad4", "#00f5e8", "#e6ff00"];
        for (let e = 0; e < 3; e++) {
          ctx.rotate(Math.PI / 3);
          ctx.strokeStyle = colList[e];
          ctx.globalAlpha = 0.70;
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.ellipse(0, 0, 52, 18, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Character Rendering by Phase
      if (cache) {
        if (state.phase < 3) {
          // --- Phase 1 & 2: Twins (Elle & Noel) ---
          const boxL = {
            x: b.baseL.x + b.elle.dx,
            y: b.baseL.y + b.elle.dy,
            w: cache.twinLIntact.w,
            h: cache.twinLIntact.h
          };
          const boxR = {
            x: b.baseR.x + b.noel.dx,
            y: b.baseR.y + b.noel.dy,
            w: cache.twinRIntact.w,
            h: cache.twinRIntact.h
          };

          // Beat 1 (frame < 70) ascending double-helix ribbon trails behind twins
          if (b.fusionSeq && b.fusionSeq.active && b.fusionSeq.frame < 70) {
            const curF = b.fusionSeq.frame;
            ctx.save();
            ctx.lineWidth = 3.5;
            // Magenta trail (Elle)
            ctx.strokeStyle = "#ff2ad4";
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            for (let f = 0; f <= curF; f += 2) {
              const fu = f / 69;
              const hr = (1 - fu * 0.65) * 68;
              const ha = fu * Math.PI * 3.5;
              const hcy = 270 - Math.pow(fu, 1.85) * 430;
              const hx = 198 + Math.cos(ha) * hr;
              if (f === 0) ctx.moveTo(hx, hcy);
              else ctx.lineTo(hx, hcy);
            }
            ctx.stroke();

            // Cyan trail (Noel)
            ctx.strokeStyle = "#00f5e8";
            ctx.globalAlpha = 0.85;
            ctx.beginPath();
            for (let f = 0; f <= curF; f += 2) {
              const fu = f / 69;
              const hr = (1 - fu * 0.65) * 68;
              const ha = fu * Math.PI * 3.5 + Math.PI;
              const hcy = 270 - Math.pow(fu, 1.85) * 430;
              const hx = 198 + Math.cos(ha) * hr;
              if (f === 0) ctx.moveTo(hx, hcy);
              else ctx.lineTo(hx, hcy);
            }
            ctx.stroke();
            ctx.restore();
          }

          // Dual wings behind each twin (each twin independently switches to smaller rapid flutter when broken!)
          const wScaleL = !b.elleBroken ? 0.78 : 0.54;
          const wSpdL   = !b.elleBroken ? 1.0 : 1.75;
          const wScaleR = !b.noelBroken ? 0.78 : 0.54;
          const wSpdR   = !b.noelBroken ? 1.0 : 1.75;
          // Elle (Left Twin): outer-left wing + upper-back skyward wing
          this.drawArticulatedWing(ctx, boxL.x + 68, boxL.y + 118, -1, "magenta", wScaleL, t, wSpdL, -0.34);
          this.drawArticulatedWing(ctx, boxL.x + 102, boxL.y + 104, 1, "magenta", wScaleL * 0.76, t + 8, wSpdL, -1.12);
          // Noel (Right Twin): upper-left skyward wing + outer-right skyward wing
          this.drawArticulatedWing(ctx, boxR.x + 58, boxR.y + 106, -1, "cyan", wScaleR * 0.88, t + 14, wSpdR, -0.52);
          this.drawArticulatedWing(ctx, boxR.x + 108, boxR.y + 110, 1, "cyan", wScaleR, t + 6, wSpdR, -0.38);

          // Intact Halos & High-Five Starburst Spark (spark only while neither twin is broken!)
          if (!b.haloL.broken && cache.haloSprites.magenta) {
            ctx.save();
            ctx.translate(b.haloL.x, b.haloL.y);
            ctx.rotate(b.haloL.tilt);
            ctx.drawImage(cache.haloSprites.magenta, -42, -20);
            ctx.restore();
          }
          if (!b.haloR.broken && cache.haloSprites.cyan) {
            ctx.save();
            ctx.translate(b.haloR.x, b.haloR.y);
            ctx.rotate(b.haloR.tilt);
            ctx.drawImage(cache.haloSprites.cyan, -42, -20);
            ctx.restore();
          }
          if (!b.elleBroken && !b.noelBroken) {
            // Dazzling High-Five Starburst Spark between Elle & Noel's palms
            const sx = b.synchroSpark.x;
            const sy = b.synchroSpark.y;
            const spPulse = 0.85 + 0.25 * Math.sin(t * 0.22);
            ctx.save();
            ctx.translate(sx, sy);
            ctx.rotate(t * 0.035);
            const sGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 28 * spPulse);
            sGrad.addColorStop(0, "#ffffff");
            sGrad.addColorStop(0.45, "rgba(230, 255, 0, 0.85)");
            sGrad.addColorStop(1, "rgba(255, 42, 212, 0)");
            ctx.fillStyle = sGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 28 * spPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            for (let i = 0; i < 16; i++) {
              const rRay = (i % 2 === 0 ? 24 : 8) * spPulse;
              const aRay = (i * Math.PI) / 8;
              if (i === 0) ctx.moveTo(Math.cos(aRay) * rRay, Math.sin(aRay) * rRay);
              else ctx.lineTo(Math.cos(aRay) * rRay, Math.sin(aRay) * rRay);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Warp & draw Left Twin (Elle - switches independently on b.elleBroken!)
          const bufL = !b.elleBroken ? cache.twinLIntact : cache.twinLBroken;
          StageCommon.renderSoftWarp(ctx, boxL, bufL, [b.elleSpring, b.elleBelly, b.elleHip], {
            slotStore: cache.warpSlots,
            slotName: "twinL",
            reach: 1.35,
            minDisp: 0.08,
            rgba: true,
            shear: false
          });

          // Warp & draw Right Twin (Noel - switches independently on b.noelBroken!)
          const bufR = !b.noelBroken ? cache.twinRIntact : cache.twinRBroken;
          StageCommon.renderSoftWarp(ctx, boxR, bufR, [b.noelSpring, b.noelBelly, b.noelHip], {
            slotStore: cache.warpSlots,
            slotName: "twinR",
            reach: 1.35,
            minDisp: 0.08,
            rgba: true,
            shear: false
          });

          // Mystery Navel-to-Navel One-Way Intercept Beam (rendered when charging or active!)
          const nbMode = b.navelBeam.mode;
          if (nbMode === "charging" || nbMode === "active") {
            const x1 = 159.1 + b.elle.dx + (b.elleBelly ? b.elleBelly.dx * 0.72 : 0);
            const y1 = 426.9 + b.elle.dy + (b.elleBelly ? b.elleBelly.dy * 0.72 : 0);
            const x2 = 265.3 + b.noel.dx + (b.noelBelly ? b.noelBelly.dx * 0.72 : 0);
            const y2 = 288.4 + b.noel.dy + (b.noelBelly ? b.noelBelly.dy * 0.72 : 0);
            const beamDx = x2 - x1;
            const beamDy = y2 - y1;
            const beamLen = Math.hypot(beamDx, beamDy) || 1;
            let bnx = -beamDy / beamLen;
            let bny = beamDx / beamLen;
            if (bny < 0) { bnx = -bnx; bny = -bny; }

            ctx.save();
            if (nbMode === "charging") {
              // Brief pre-fire lock-on flash between their navels
              ctx.strokeStyle = "#e6ff00";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([5, 5]);
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
              const rPulse = 5 + (t % 8);
              ctx.setLineDash([]);
              ctx.strokeStyle = "#ff2ad4";
              ctx.beginPath(); ctx.arc(x1, y1, rPulse, 0, Math.PI * 2); ctx.stroke();
              ctx.strokeStyle = "#00f5e8";
              ctx.beginPath(); ctx.arc(x2, y2, rPulse, 0, Math.PI * 2); ctx.stroke();
            } else {
              const pAmp = b.navelBeam.pluckAmp || 0;
              const fadeAlpha = b.navelBeam.timer < 18 ? (b.navelBeam.timer / 18) : 1.0;
              const STEPS = 24;

              // Underside one-way reflectorticks (showing upward shots get bounced downward!)
              ctx.strokeStyle = "#e6ff00";
              ctx.globalAlpha = 0.65 * fadeAlpha;
              ctx.lineWidth = 1.4;
              ctx.beginPath();
              for (let k = 1; k <= 5; k++) {
                const u = k / 6;
                const mx = x1 + beamDx * u + bnx * 5.5;
                const my = y1 + beamDy * u + bny * 5.5;
                ctx.moveTo(mx - beamDx / beamLen * 4, my - beamDy / beamLen * 4);
                ctx.lineTo(mx + bnx * 4, my + bny * 4);
                ctx.lineTo(mx + beamDx / beamLen * 4, my + beamDy / beamLen * 4);
              }
              ctx.stroke();

              // Magenta braided wave
              ctx.strokeStyle = "#ff2ad4";
              ctx.lineWidth = 2.4;
              ctx.globalAlpha = 0.88 * fadeAlpha;
              ctx.beginPath();
              for (let i = 0; i <= STEPS; i++) {
                const u = i / STEPS;
                const bx = x1 + beamDx * u;
                const by = y1 + beamDy * u;
                const vib = Math.sin(u * Math.PI) * Math.sin(t * 0.75) * pAmp;
                const wave = Math.sin(u * 12.0 - t * 0.25) * 4.0;
                const px = bx + bnx * (vib + wave);
                const py = by + bny * (vib + wave);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.stroke();

              // Cyan braided wave
              ctx.strokeStyle = "#00f5e8";
              ctx.lineWidth = 2.4;
              ctx.beginPath();
              for (let i = 0; i <= STEPS; i++) {
                const u = i / STEPS;
                const bx = x1 + beamDx * u;
                const by = y1 + beamDy * u;
                const vib = Math.sin(u * Math.PI) * Math.sin(t * 0.75) * pAmp;
                const wave = Math.sin(u * 12.0 - t * 0.25 + Math.PI) * 4.0;
                const px = bx + bnx * (vib + wave);
                const py = by + bny * (vib + wave);
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.stroke();

              // Core one-way barrier line
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.5;
              ctx.globalAlpha = 0.96 * fadeAlpha;
              ctx.beginPath();
              for (let i = 0; i <= STEPS; i++) {
                const u = i / STEPS;
                const bx = x1 + beamDx * u;
                const by = y1 + beamDy * u;
                const vib = Math.sin(u * Math.PI) * Math.sin(t * 0.75) * pAmp;
                const px = bx + bnx * vib;
                const py = by + bny * vib;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.stroke();

              // Glowing navel nodes
              ctx.globalAlpha = fadeAlpha;
              ctx.fillStyle = "#ff2ad4";
              ctx.beginPath(); ctx.arc(x1, y1, 5.8, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "#ffffff";
              ctx.beginPath(); ctx.arc(x1, y1, 2.6, 0, Math.PI * 2); ctx.fill();

              ctx.fillStyle = "#00f5e8";
              ctx.beginPath(); ctx.arc(x2, y2, 5.8, 0, Math.PI * 2); ctx.fill();
              ctx.fillStyle = "#ffffff";
              ctx.beginPath(); ctx.arc(x2, y2, 2.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.restore();
          }

        } else {
          // --- Phase 3: Fused Goddess SERAPHIA ---
          // Beat 2 (frame 70..180) Heavenly God-Rays from above (198, 16)
          if (b.fusionSeq && b.fusionSeq.active && b.fusionSeq.frame >= 70 && b.fusionSeq.frame <= 180) {
            const gAlpha = Math.sin(((b.fusionSeq.frame - 70) / 110) * Math.PI) * 0.55;
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            const numRays = 14;
            for (let r = 0; r < numRays; r++) {
              const baseAngle = (r / numRays) * Math.PI * 0.85 + 0.25;
              const spread = 0.08 + Math.sin(t * 0.05 + r) * 0.02;
              const rLen = 680;
              ctx.fillStyle = (r % 2 === 0) ? `rgba(255, 230, 100, ${gAlpha})` : `rgba(0, 245, 232, ${gAlpha * 0.75})`;
              ctx.beginPath();
              ctx.moveTo(198, 16);
              ctx.lineTo(198 + Math.cos(baseAngle - spread) * rLen, 16 + Math.sin(baseAngle - spread) * rLen);
              ctx.lineTo(198 + Math.cos(baseAngle + spread) * rLen, 16 + Math.sin(baseAngle + spread) * rLen);
              ctx.closePath();
              ctx.fill();
            }
            ctx.restore();
          }

          const offY = (b.fusionSeq && b.fusionSeq.active) ? (b.fusionSeq.seraOffsetY || 0) : 0;
          const seraDy = Math.sin(t * 0.04) * 3.5;

          ctx.save();
          if (offY !== 0) {
            ctx.translate(0, offY);
          }

          // 🔯 Pre-Baked Giant Counter-Rotating Celestial Cyber-Mandala (290x290) behind Seraphia
          if (cache && cache.mandalaOuter && cache.mandalaInner) {
            ctx.save();
            ctx.translate(198, 224 + seraDy);
            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha = 0.62;

            // Outer Mandala (Clockwise)
            ctx.save();
            ctx.rotate(t * (b.chestArmorBroken ? 0.018 : 0.009));
            ctx.drawImage(cache.mandalaOuter, -145, -145);
            ctx.restore();

            // Inner Hexagram Mandala (Counter-Clockwise)
            ctx.save();
            ctx.rotate(-t * (b.chestArmorBroken ? 0.026 : 0.014));
            ctx.drawImage(cache.mandalaInner, -145, -145);
            ctx.restore();

            ctx.restore();
          }

          // 26 Rising Neon Feather Particles across the sanctuary
          if (b.sanctuaryFeathers) {
            ctx.save();
            b.sanctuaryFeathers.forEach(f => {
              ctx.save();
              ctx.translate(f.x, f.y);
              ctx.rotate(Math.sin(t * 0.05 + f.phase) * 0.35);
              ctx.fillStyle = f.col;
              ctx.globalAlpha = 0.45;
              ctx.beginPath();
              ctx.ellipse(0, 0, 4.5 * f.scale, 12 * f.scale, 0.1, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 0.8 * f.scale;
              ctx.beginPath();
              ctx.moveTo(0, -11 * f.scale);
              ctx.lineTo(0, 11 * f.scale);
              ctx.stroke();
              ctx.restore();
            });
            ctx.restore();
          }

          // 6 Articulated Skyward-Sweeping Seraphim Wings (aligned to 90s Seraphia shoulders y=196)
          // Left shoulder (172, 196 + seraDy)
          this.drawArticulatedWing(ctx, 172, 192 + seraDy, -1, "magenta", 0.96, t, 1.0, -0.52);
          this.drawArticulatedWing(ctx, 172, 200 + seraDy, -1, "magenta", 0.80, t + 6, 1.12, -0.06);
          this.drawArticulatedWing(ctx, 172, 208 + seraDy, -1, "magenta", 0.66, t + 12, 0.88, 0.42);

          // Right shoulder (224, 196 + seraDy)
          this.drawArticulatedWing(ctx, 224, 192 + seraDy, 1, "cyan", 0.96, t, 1.0, -0.52);
          this.drawArticulatedWing(ctx, 224, 200 + seraDy, 1, "cyan", 0.80, t + 6, 1.12, -0.06);
          this.drawArticulatedWing(ctx, 224, 208 + seraDy, 1, "cyan", 0.66, t + 12, 0.88, 0.42);

          // Golden Double Halo above head (y=58)
          const haloSp = cache.haloSprites.gold;
          if (haloSp) {
            ctx.save();
            ctx.translate(198, 58 + seraDy);
            ctx.drawImage(haloSp, -42, -20);
            ctx.drawImage(haloSp, -33, -24, 66, 31);
            ctx.restore();
          }

          // Warp & draw Seraphia (fixed IMG_BOX)
          const seraBuf = !b.chestArmorBroken ? cache.seraphiaIntact : cache.seraphiaBroken;
          StageCommon.renderSoftWarp(ctx, IMG_BOX, seraBuf, [b.bustL, b.bustR, b.hipL, b.hipR], {
            slotStore: cache.warpSlots,
            slotName: "seraphia",
            reach: 1.32,
            minDisp: 0.08,
            rgba: true,
            shear: false
          });

          // Render randomly glowing cyber-circuit zones on Seraphia's suit, thighs & stocking cuffs!
          const cSprites = !b.chestArmorBroken ? cache.circuitSpritesIntact : cache.circuitSpritesBroken;
          if (cSprites && b.circuitZones) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            for (let zi = 0; zi < b.circuitZones.length; zi++) {
              const alpha = b.circuitZones[zi].alpha;
              const sp = cSprites[zi];
              if (alpha > 0.03 && sp) {
                let jx = 0, jy = 0;
                if (zi === 0) { jx = b.bustL.dx * 0.32; jy = b.bustL.dy * 0.32; }
                else if (zi === 1) { jx = b.bustR.dx * 0.32; jy = b.bustR.dy * 0.32; }
                else if (zi === 6) { jx = b.hipL.dx * 0.62; jy = b.hipL.dy * 0.62; }
                else if (zi === 7) { jx = b.hipR.dx * 0.62; jy = b.hipR.dy * 0.62; }
                ctx.globalAlpha = Math.min(1.0, alpha);
                ctx.drawImage(sp.canvas, IMG_BOX.x + sp.x + jx, IMG_BOX.y + sp.y + jy);
              }
            }
            ctx.restore();
          }

          // Seraphia Face Patch
          const fb = window.STAGE5_FACE_BOX || { sx: 316, sy: 152, sw: 136, sh: 94 };
          const activePatchKey = StageCommon.getActiveFacePatchKey(b, state, { defaultExpr: "normal", halfBlink: true });
          StageCommon.drawFacePatch(ctx, this.assets.facePatchImgs, activePatchKey, IMG_BOX, { x: fb.sx, y: fb.sy, w: fb.sw, h: fb.sh });

          // Fusion flash overlay
          if (b.fusionFlashTimer > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(255, 255, 255, ${(b.fusionFlashTimer / 65 * 0.8).toFixed(2)})`;
            ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
            ctx.restore();
          }

          ctx.restore();
        }
      }

      // Fusion whiteout swell overlay
      if (b.fusionSeq && b.fusionSeq.active && b.fusionSeq.whiteout > 0.005) {
        ctx.save();
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1.0, b.fusionSeq.whiteout).toFixed(3)})`;
        ctx.fillRect(0, 0, 420, 660);
        ctx.restore();
      }
    }

    // Clear sequence smoke clouds
    StageCommon.renderSmokeClouds(ctx, state);

    ctx.restore();
  },

  drawEllipticalHaloGuide(ctx, animTick, h) {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.tilt);
    const strokeCol = h.flash > 0 ? "#ffffff" : h.color;

    // Solid inner ellipse
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sleek outer dashed guide
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(animTick * 1.5);
    ctx.strokeStyle = h.color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.rx + 3.5, h.ry + 3.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4 Perimeter Tick marks
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    const ticks = [[-h.rx, 0], [h.rx, 0], [0, -h.ry], [0, h.ry]];
    ticks.forEach(([tx, ty]) => {
      const tAng = Math.atan2(ty, tx);
      ctx.beginPath();
      ctx.moveTo(tx - Math.cos(tAng) * 2, ty - Math.sin(tAng) * 2);
      ctx.lineTo(tx + Math.cos(tAng) * 4, ty + Math.sin(tAng) * 4);
      ctx.stroke();
    });

    // Text label
    ctx.font = "bold 8.5px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = strokeCol;
    ctx.fillText(`${h.label} HP:${h.hp}/${h.maxHP}`, 0, -h.ry - 8);
    ctx.restore();
  },

  renderTargets(ctx, state, engine) {
    const b = state.boss;
    if (!b || (state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 45)) return;
    const animTick = b.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. Lower base rails of wire ramps
    this.renderWireRampRails(ctx, state, b, false);

    // 2. Targets by Phase (independent per twin in Phases 1 & 2!)
    if (state.phase < 3) {
      // Rotated Elliptical Halo Targets
      if (!b.haloL.broken) {
        this.drawEllipticalHaloGuide(ctx, animTick, b.haloL);
      }
      if (!b.haloR.broken) {
        this.drawEllipticalHaloGuide(ctx, animTick, b.haloR);
      }

      // Hair Ornament Targets (Odango & Antenna)
      if (!b.odangoL.broken) {
        drawGuide(b.odangoL.x, b.odangoL.y, b.odangoL.r, b.odangoL.color, b.odangoL.flash, animTick * 0.03, b.odangoL.label, `HP:${b.odangoL.hp}/${b.odangoL.maxHP}`);
      }
      if (!b.antennaR.broken) {
        drawGuide(b.antennaR.x, b.antennaR.y, b.antennaR.r, b.antennaR.color, b.antennaR.flash, -animTick * 0.03, b.antennaR.label, `HP:${b.antennaR.hp}/${b.antennaR.maxHP}`);
      }

      // Knee Ring Targets
      if (!b.kneeL.broken) {
        drawGuide(b.kneeL.x, b.kneeL.y, b.kneeL.r, b.kneeL.color, b.kneeL.flash, -animTick * 0.025, b.kneeL.label, `HP:${b.kneeL.hp}/${b.kneeL.maxHP}`);
      }
      if (!b.kneeR.broken) {
        drawGuide(b.kneeR.x, b.kneeR.y, b.kneeR.r, b.kneeR.color, b.kneeR.flash, animTick * 0.025, b.kneeR.label, `HP:${b.kneeR.hp}/${b.kneeR.maxHP}`);
      }

      // Front-Thigh Garter Charms (Soft-Bounce Ornaments)
      Particles.drawBounceBumperGuide(ctx, animTick, b.charmL.x, b.charmL.y, b.charmL.r, b.charmL.color, b.charmL.flash, null, b.charmL.label);
      Particles.drawBounceBumperGuide(ctx, animTick, b.charmR.x, b.charmR.y, b.charmR.r, b.charmR.color, b.charmR.flash, null, b.charmR.label);

      // Chest Brooches (Compact guide before break, HP guide after break!)
      drawGuide(b.prismL.x, b.prismL.y, b.prismL.r, b.prismL.color, b.prismL.flash, animTick * 0.04, b.prismL.label, b.elleBroken ? `HP:${b.prismL.hp}/${b.prismL.maxHP}` : "🔒BROOCH");
      drawGuide(b.prismR.x, b.prismR.y, b.prismR.r, b.prismR.color, b.prismR.flash, -animTick * 0.04, b.prismR.label, b.noelBroken ? `HP:${b.prismR.hp}/${b.prismR.maxHP}` : "🔒BROOCH");

      // High-Five Synchro Spark
      if (!b.elleBroken && !b.noelBroken) {
        drawGuide(b.synchroSpark.x, b.synchroSpark.y, b.synchroSpark.r, "#e6ff00", b.synchroSpark.flash, animTick * 0.05, "🏐TWIN TOSS", "+4000");
      }
    } else {
      // Phase 3
      // Seraphic Organ Chime Pipes
      if (b.chimePipes) {
        b.chimePipes.forEach((pipe, pi) => {
          ctx.save();
          const pCol = pipe.flash > 0 ? "#ffffff" : (pipe.lit ? "#e6ff00" : pipe.col);

          const grad = ctx.createLinearGradient(pipe.x - 7, 16, pipe.x + 7, pipe.y);
          grad.addColorStop(0, "rgba(7, 3, 28, 0.4)");
          grad.addColorStop(0.7, pipe.lit ? "rgba(230, 255, 0, 0.45)" : "rgba(0, 245, 232, 0.2)");
          grad.addColorStop(1, pCol);
          ctx.fillStyle = grad;
          ctx.fillRect(pipe.x - 7, 16, 14, pipe.y - 16);

          ctx.strokeStyle = pCol;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(pipe.x - 7, 16, 14, pipe.y - 16);

          ctx.fillStyle = pipe.lit ? "#e6ff00" : pCol;
          ctx.beginPath();
          ctx.arc(pipe.x, pipe.y, pipe.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = pipe.lit ? 2.2 : 1.2;
          ctx.stroke();

          if (pipe.lit) {
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(pipe.x, pipe.y, 4, 0, Math.PI * 2);
            ctx.fill();
          }

          const noteNames = ["C5", "E5", "G5", "B5", "D6"];
          ctx.font = "bold 8px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(noteNames[pi], pipe.x, pipe.y + 19);
          ctx.restore();
        });

        // Harmony Jackpot Beam
        if (b.harmonyBeamTimer > 0) {
          ctx.save();
          const bAlpha = (b.harmonyBeamTimer / 55);
          ctx.globalCompositeOperation = "lighter";
          ctx.lineWidth = 4.0;
          b.chimePipes.forEach((pipe, pi) => {
            const hCols = ["#ff2ad4", "#00f5e8", "#e6ff00", "#00f5e8", "#ff2ad4"];
            ctx.strokeStyle = hCols[pi];
            ctx.globalAlpha = bAlpha * 0.9;
            ctx.beginPath();
            ctx.moveTo(pipe.x, pipe.y);
            ctx.lineTo(198, 205);
            ctx.stroke();
          });
          ctx.restore();
        }
      }

      if (!b.chestArmorBroken) {
        drawGuide(b.pauldronL.x, b.pauldronL.y, b.pauldronL.r, "#00f5e8", b.pauldronL.flash, -animTick * 0.025, b.pauldronL.label, `ARMOR`);
        drawGuide(b.pauldronR.x, b.pauldronR.y, b.pauldronR.r, "#ff2ad4", b.pauldronR.flash, animTick * 0.025, b.pauldronR.label, `ARMOR`);
        drawGuide(b.bustL.x + b.bustL.dx * 0.25, b.bustL.y + b.bustL.dy * 0.25, b.bustL.r, "#e6ff00", b.bustL.flash, animTick * 0.03, "L-CHEST", `HP:${b.chestArmorHP}`);
        drawGuide(b.bustR.x + b.bustR.dx * 0.25, b.bustR.y + b.bustR.dy * 0.25, b.bustR.r, "#e6ff00", b.bustR.flash, -animTick * 0.03, "R-CHEST", `HP:${b.chestArmorHP}`);
      } else {
        // Hexagonal Barrier Polygon around Core if shielded
        const isShielded = b.coreGraceTimer > 0 || b.cherubOrbs.some(o => o.active);
        if (isShielded) {
          ctx.save();
          const hexR = 46 + Math.sin(animTick * 0.12) * 3.5;
          const hexRot = animTick * 0.015;
          ctx.beginPath();
          for (let h = 0; h < 6; h++) {
            const hAng = hexRot + (h * Math.PI) / 3;
            const hx = b.core.x + Math.cos(hAng) * hexR;
            const hy = b.core.y + Math.sin(hAng) * hexR;
            if (h === 0) ctx.moveTo(hx, hy);
            else ctx.lineTo(hx, hy);
          }
          ctx.closePath();
          ctx.fillStyle = "rgba(0, 245, 232, 0.10)";
          ctx.fill();
          ctx.strokeStyle = (animTick % 6 < 3) ? "#00f5e8" : "#ff2ad4";
          ctx.lineWidth = 2.4;
          ctx.setLineDash([8, 4]);
          ctx.lineDashOffset = -(animTick * 1.5);
          ctx.stroke();

          // Energy beam rays from active cherub orbs to core
          b.cherubOrbs.forEach(orb => {
            if (orb.active) {
              ctx.beginPath();
              ctx.strokeStyle = orb.color;
              ctx.lineWidth = 2.0;
              ctx.setLineDash([4, 4]);
              ctx.lineDashOffset = animTick * 2.0;
              ctx.moveTo(orb.x, orb.y);
              ctx.lineTo(b.core.x, b.core.y);
              ctx.stroke();
            }
          });
          ctx.restore();

          drawGuide(b.core.x, b.core.y, b.core.r, "#00f5e8", b.core.flash, -animTick * 0.02, "ARK CORE", "🛡️BARRIER");
        } else {
          drawGuide(b.core.x, b.core.y, b.core.r, "#e6ff00", b.core.flash, animTick * 0.045, "★ARK CORE★", `HP:${b.core.hp}/${b.core.maxHP}`);
        }

        // Cherub Spirit Orbs (Prominent 54x54 pixel-art / procedural sprites with flapping wings)
        b.cherubOrbs.forEach(orb => {
          if (!orb.active) return;
          const wingFlap = Math.sin(animTick * 0.35 + (orb.id === "cherub_l" ? 0 : Math.PI)) * 0.38;

          ctx.save();
          // Mini Flapping Wings
          // Left wing
          ctx.save();
          ctx.translate(orb.x - 14, orb.y);
          ctx.rotate(-0.35 + wingFlap);
          ctx.fillStyle = orb.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(-10, -2, 12, 5.5, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // Right wing
          ctx.save();
          ctx.translate(orb.x + 14, orb.y);
          ctx.rotate(0.35 - wingFlap);
          ctx.fillStyle = orb.color;
          ctx.globalAlpha = 0.85;
          ctx.beginPath();
          ctx.ellipse(10, -2, 12, 5.5, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Central sprite: 54x54 px image if available
          const orbImg = (orb.id === "cherub_l") ? this.assets.cherubOrbLImg : this.assets.cherubOrbRImg;
          if (orbImg && orbImg.complete && orbImg.naturalWidth > 0) {
            ctx.drawImage(orbImg, orb.x - 27, orb.y - 27, 54, 54);
          } else {
            ctx.fillStyle = (orb.flash > 0) ? "#ffffff" : orb.color;
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.r + 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.0;
            ctx.stroke();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(orb.x, orb.y - 8);
            ctx.lineTo(orb.x + 7, orb.y);
            ctx.lineTo(orb.x, orb.y + 8);
            ctx.lineTo(orb.x - 7, orb.y);
            ctx.closePath();
            ctx.fill();
          }

          // Tiny floating halo above cherub orb
          ctx.strokeStyle = (orb.id === "cherub_l") ? "#ff2ad4" : "#00f5e8";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(orb.x, orb.y - orb.r - 8 + Math.sin(animTick * 0.15) * 1.5, 12, 4.5, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          drawGuide(orb.x, orb.y, orb.r + 3, orb.color, orb.flash, animTick * 0.05, orb.label, `HP:${orb.hp}/${orb.maxHP}`);
        });

        // Soft bounce guides
        const bustCol = state.fever.active ? "#e6ff00" : "#ff66cc";
        Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx * 0.25, b.bustL.y + b.bustL.dy * 0.25, b.bustL.r, bustCol, b.bustL.flash, null, "♥SOFT");
        Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx * 0.25, b.bustR.y + b.bustR.dy * 0.25, b.bustR.r, bustCol, b.bustR.flash, null, "♥SOFT");
        Particles.drawBounceBumperGuide(ctx, animTick, b.garterL.x, b.garterL.y, b.garterL.r, "#00f5e8", b.garterL.flash, null, "GARTER");
        Particles.drawBounceBumperGuide(ctx, animTick, b.garterR.x, b.garterR.y, b.garterR.r, "#ff2ad4", b.garterR.flash, null, "GARTER");
        if (!(b.navelTrap && b.navelTrap.mode !== "idle")) {
          Particles.drawBounceBumperGuide(ctx, animTick, b.navelSera.x, b.navelSera.y, b.navelSera.r, "#e6ff00", b.navelSera.flash, null, "NAVEL");
        }
      }

      // Grand Phase 3 Attack Visuals: Cross-Seraphim Laser & Cyber Light-Swords
      const sa = b.seraphAttack;
      if (sa) {
        if (sa.mode === "cross_warn") {
          ctx.save();
          ctx.translate(198, 224);
          ctx.rotate(sa.baseAngle);
          ctx.strokeStyle = (animTick % 6 < 3) ? "rgba(255, 42, 212, 0.85)" : "rgba(230, 255, 0, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          for (let arm = 0; arm < 4; arm++) {
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(arm * Math.PI / 2) * 450, Math.sin(arm * Math.PI / 2) * 450);
          }
          ctx.stroke();
          ctx.restore();
        } else if (sa.mode === "cross_fire") {
          ctx.save();
          ctx.translate(198, 224);
          ctx.rotate(sa.baseAngle);
          for (let arm = 0; arm < 4; arm++) {
            const aAng = arm * Math.PI / 2;
            const cosA = Math.cos(aAng);
            const sinA = Math.sin(aAng);
            ctx.strokeStyle = arm % 2 === 0 ? "rgba(255, 42, 212, 0.85)" : "rgba(0, 245, 232, 0.85)";
            ctx.lineWidth = 14;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cosA * 450, sinA * 450);
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 4;
            ctx.stroke();
          }
          ctx.restore();
        } else if (sa.mode === "sword_warn") {
          const portalSpawns = [{ x: 110, y: 120 }, { x: 198, y: 96 }, { x: 286, y: 120 }];
          portalSpawns.forEach(p => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(animTick * 0.08);
            ctx.strokeStyle = (animTick % 6 < 3) ? "#ffd700" : "#ffffff";
            ctx.lineWidth = 2.4;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          });
        } else if (sa.mode === "sword_fire" && sa.swords) {
          const swSprite = this._srcCache && this._srcCache.swordSprite;
          sa.swords.forEach(sw => {
            if (!sw.active) return;
            for (let i = 0; i < sw.trail.length; i++) {
              const pt = sw.trail[i];
              ctx.save();
              ctx.globalAlpha = ((i + 1) / sw.trail.length) * 0.45;
              ctx.fillStyle = sw.parried ? "#e6ff00" : "#ffd700";
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4 + (i / sw.trail.length) * 4, 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            ctx.save();
            ctx.translate(sw.x, sw.y);
            ctx.rotate(sw.ang);
            if (swSprite) {
              ctx.drawImage(swSprite, -20, -12);
            } else {
              ctx.strokeStyle = sw.parried ? "#e6ff00" : "#ffd700";
              ctx.lineWidth = 3.0;
              ctx.beginPath();
              ctx.moveTo(-16, 0);
              ctx.lineTo(24, 0);
              ctx.stroke();
            }
            ctx.strokeStyle = sw.parried ? "#e6ff00" : "#ffffff";
            ctx.lineWidth = 1.4;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, sw.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          });
        }
      }

      // Seraphia Navel Gravity Vortex & Crotch Gate rendering
      const nt = b.navelTrap;
      if (nt) {
        if (nt.mode === "vortex") {
          ctx.save();
          ctx.translate(198, 284.6);
          for (let sw = 0; sw < 3; sw++) {
            ctx.save();
            ctx.rotate(animTick * 0.06 + sw * (Math.PI * 2 / 3));
            ctx.strokeStyle = sw === 0 ? "#ff2ad4" : (sw === 1 ? "#00f5e8" : "#e6ff00");
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            for (let th = 0; th < Math.PI * 2; th += 0.2) {
              const sr = 10 + th * 9.5;
              const sx = Math.cos(th) * sr;
              const sy = Math.sin(th) * sr;
              if (th === 0) ctx.moveTo(sx, sy);
              else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
            ctx.restore();
          }
          ctx.setLineDash([4, 4]);
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 96, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = "#e6ff00";
          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillText("⚠️NAVEL GRAVITY VORTEX", 0, -104);
          ctx.restore();
        } else if (nt.mode === "digesting" || nt.mode === "spit_cool") {
          const gateOpen = nt.gateOpen || 0;
          const crotchY = 346;
          ctx.save();
          ctx.translate(198, crotchY);
          const irisR = 14 * gateOpen;
          ctx.fillStyle = "rgba(255, 20, 147, 0.45)";
          ctx.beginPath();
          ctx.arc(0, 0, irisR + 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#ff1493";
          ctx.lineWidth = 2.5;
          ctx.stroke();
          for (let s = 0; s < 6; s++) {
            const sAng = s * Math.PI / 3 + animTick * 0.04;
            ctx.beginPath();
            ctx.moveTo(Math.cos(sAng) * (irisR + 5), Math.sin(sAng) * (irisR + 5));
            ctx.lineTo(Math.cos(sAng + 0.5) * irisR, Math.sin(sAng + 0.5) * irisR);
            ctx.stroke();
          }
          ctx.restore();

          // DANGER vertical trajectory dashed laser line straight down
          ctx.save();
          ctx.strokeStyle = (animTick % 6 < 3) ? "#ff0055" : "#ffe600";
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = -(animTick * 4);
          ctx.beginPath();
          ctx.moveTo(198, 350);
          ctx.lineTo(198, 655);
          ctx.stroke();

          ctx.font = "bold 9px monospace";
          ctx.textAlign = "center";
          ctx.fillStyle = (animTick % 8 < 4) ? "#ff2ad4" : "#ffffff";
          ctx.fillText("⚠️ DANGER! STRAIGHT DOWN SPIT! ⚠️", 198, 430);
          ctx.fillStyle = "#e6ff00";
          ctx.fillText("⚡ NUDGE (台揺らし) TO SAVE!! ⚡", 198, 480);
          ctx.restore();
        }
      }
    }

    // 3. Judgement Halo Attack Indicators & Rings
    const ha = b.haloAttack;
    if (ha.mode === "charging") {
      const targetX = ha.targetSide === "L" ? 142 : 254;
      const targetY = 600;
      const sx = 198;
      const sy = state.phase === 3 ? 180 : 250;
      ctx.save();
      ctx.strokeStyle = ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -(animTick * 2.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();

      ctx.strokeStyle = "#e6ff00";
      ctx.beginPath();
      ctx.arc(targetX, targetY, 20 + Math.sin(animTick * 0.2) * 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ha.rings.forEach(ring => {
      const mainCol = ring.parried ? "#e6ff00" : ring.color;
      for (let i = 0; i < ring.trail.length; i++) {
        const pt = ring.trail[i];
        ctx.save();
        ctx.globalAlpha = ((i + 1) / ring.trail.length) * 0.45;
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.0 + (i / ring.trail.length) * 4.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(ring.x, ring.y);
      ctx.rotate(ring.rot);
      const haloSp = this._srcCache && this._srcCache.haloSprites && (ring.parried ? this._srcCache.haloSprites.gold : (ring.color === "#ff2ad4" ? this._srcCache.haloSprites.magenta : this._srcCache.haloSprites.cyan));
      if (haloSp) {
        ctx.drawImage(haloSp, -21, -10, 42, 20);
      } else {
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });
  },

  renderWireRampRails(ctx, state, b, upperPass) {
    if (state.phase >= 3 || b.fused) return;
    let rampAlpha = 1.0;
    if (b.fusionSeq && b.fusionSeq.active) {
      rampAlpha = Math.max(0, 1 - b.fusionSeq.frame / 50);
      if (rampAlpha <= 0.01) return;
    }

    this.ensureRampCanvases();

    ctx.save();
    if (rampAlpha < 1.0) {
      ctx.globalAlpha = rampAlpha;
    }

    if (upperPass) {
      if (this._rampUpperCanvas) {
        ctx.drawImage(this._rampUpperCanvas, 0, 0);
      }
      ctx.restore();
      return;
    }

    if (this._rampStaticCanvas) {
      ctx.drawImage(this._rampStaticCanvas, 0, 0);
    }

    // Animated chaser arrows on ramps & oriented entrance gates + exit drop rings
    for (const rampKey of ["left", "right"]) {
      const rd = this.WIRE_RAMPS[rampKey];
      const totalLen = this._rampMetrics[rampKey].totalLen;

      const chaseOffset = (b.animTick * 3.2) % 44;
      for (let d = chaseOffset; d < totalLen - 12; d += 44) {
        const s = this.sampleRamp(rampKey, d);
        const ang = Math.atan2(s.ty, s.tx);
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(ang);
        ctx.strokeStyle = "#e6ff00";
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-4, -4.5);
        ctx.lineTo(3.5, 0);
        ctx.lineTo(-4, 4.5);
        ctx.stroke();
        ctx.restore();
      }

      // Oriented entrance gate hood (⌢ over top/forward mouth, open toward flippers)
      const s0 = this.sampleRamp(rampKey, 0);
      const inAng = Math.atan2(s0.ty, s0.tx);
      const pulse = 0.65 + 0.35 * Math.sin(b.animTick * 0.16 + (rampKey === "left" ? 0 : 2));
      ctx.save();
      ctx.globalAlpha = pulse * 0.35;
      ctx.strokeStyle = rd.color;
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.arc(rd.entryX, rd.entryY, rd.entryR - 2, inAng - Math.PI * 0.45, inAng + Math.PI * 0.45);
      ctx.stroke();

      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rd.entryX, rd.entryY, rd.entryR - 2, inAng - Math.PI * 0.45, inAng + Math.PI * 0.45);
      ctx.stroke();

      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▲" + rd.name, rd.entryX, rd.entryY + 20);
      ctx.restore();

      // Subtle pulsing exit drop ring (r = 9) at the final point of each ramp
      const sLast = this.sampleRamp(rampKey, totalLen);
      const exitPulse = 0.6 + 0.4 * Math.sin(b.animTick * 0.18 + (rampKey === "left" ? 1 : 3));
      ctx.save();
      ctx.translate(sLast.x, sLast.y);
      ctx.strokeStyle = rd.color;
      ctx.lineWidth = 2.2;
      ctx.globalAlpha = exitPulse;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 7.5px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("▼DROP", 0, 11);
      ctx.restore();
    }
    ctx.restore();
  },

  renderForeground(ctx, state, engine) {
    const b = state.boss;
    if (!b || (state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0)) return;

    // 1. Balls on wire ramp
    state.balls.forEach(ball => {
      if (!ball._onWireRamp) return;
      const elev = ball._onWireRamp.elev || 1.0;
      const rScaled = ball.r * (1.0 + elev * 0.28);
      const rd = this.WIRE_RAMPS[ball._onWireRamp.rampId];

      ctx.save();
      ctx.strokeStyle = rd.color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 5.5;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, rScaled + 1.2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1.0;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = rd.color;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, rScaled, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 2. Upper ring arches
    this.renderWireRampRails(ctx, state, b, true);

    // 3. Ball Crotch Spit Warning Alert
    state.balls.forEach(ball => {
      if (ball._crotchSpitActive) {
        ctx.save();
        ctx.strokeStyle = "#ff0055";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + 4 + Math.sin(b.animTick * 0.4) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#ff0055";
        ctx.font = "bold 10px monospace";
        ctx.textAlign = "center";
        ctx.fillText("⚠️NUDGE!", ball.x, ball.y - 12);
        ctx.restore();
      }
    });

    // 4. Crystal-Clear Flipper Reverse Visual Effects ("⇄LR反転")
    if ((state.flipperReverseTimer || 0) > 0) {
      const secLeft = (state.flipperReverseTimer / 60).toFixed(1);
      const flippers = Physics.getFlippers(state);
      ctx.save();

      // Spinning Angel Halos over each flipper
      for (let fi = 0; fi < flippers.length; fi++) {
        const f = flippers[fi];
        const fst = Physics.flipperState[fi];
        const cx = f.px + Math.cos(fst.angle) * (f.len * 0.5);
        const cy = f.py + Math.sin(fst.angle) * (f.len * 0.5);

        ctx.save();
        ctx.translate(cx, cy - 14);
        ctx.rotate(b.animTick * 0.08 + fi * Math.PI);
        ctx.strokeStyle = (fi === 0) ? "#ff2ad4" : "#00f5e8";
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 8, -0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 5.5, -0.15, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Warning pill badge at (198, 566)
      const pillW = 210, pillH = 22;
      const px = 198 - pillW / 2, py = 566 - pillH / 2;
      ctx.save();
      ctx.fillStyle = "rgba(10, 2, 24, 0.90)";
      ctx.strokeStyle = (b.animTick % 6 < 3) ? "#ff1493" : "#00f5e8";
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(px, py, pillW, pillH, 11);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 9.5px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(`⚠️ LR CONTROLS REVERSED! (${secLeft}s) ⚠️`, 198, 566);
      ctx.restore();

      // Arched cross-arrows connecting left and right flippers
      ctx.save();
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 2.2;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -(b.animTick * 2);
      ctx.beginPath();
      ctx.moveTo(142, 600);
      ctx.quadraticCurveTo(198, 580, 254, 600);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(254, 606);
      ctx.quadraticCurveTo(198, 626, 142, 606);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#e6ff00";
      ctx.beginPath(); ctx.moveTo(258, 600); ctx.lineTo(250, 595); ctx.lineTo(250, 605); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(138, 606); ctx.lineTo(146, 601); ctx.lineTo(146, 611); ctx.closePath(); ctx.fill();
      ctx.restore();

      // Electric arcs between flippers when either flipper is pressed
      if (state.leftFlipperDown || state.rightFlipperDown) {
        ctx.save();
        ctx.strokeStyle = (b.animTick % 4 < 2) ? "#ff1493" : "#00f5e8";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        let curX = 135, curY = 595;
        ctx.moveTo(curX, curY);
        for (let seg = 1; seg <= 7; seg++) {
          const tx = 135 + ((261 - 135) / 7) * seg;
          const ty = 595 + (Math.random() - 0.5) * 16;
          ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }
  }
};

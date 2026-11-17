// =========================================================================
// STAGE 5: CELESTIAL SANCTUARY (電脳天界アーク・サンクチュアリ)
// BOSS: エル＆ノエル ➔ 熾天使セラフィア (ELLE & NOEL ➔ SERAPHIA)
// =========================================================================

window.Stage5 = {
  id: "stage5",
  get name() { return t("stage5.name"); },
  get bossName() { return t("stage5.bossName"); },

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
    if (this.assets._initialized) return;
    this.assets._initialized = true;
    const v = (window.StageCommon && StageCommon.ASSET_QUERY) || "?v=190";
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

  sampleRamp(rampKey, dist, out = null) {
    return StageCommon.sampleStageRamp(this, rampKey, dist, {}, out);
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
    if (!b) return t("stage5.obj.default");
    if (state.stageCleared) return t("stage5.obj.clear");
    if (b.fusionSeq && b.fusionSeq.active) return t("stage5.obj.fusion");
    if ((state.flipperReverseTimer || 0) > 0) return t("stage5.obj.reverse");

    if (state.phase < 3) {
      if (!b.elleBroken && !b.noelBroken) {
        return t("stage5.obj.p1Both");
      }
      if (b.elleBroken && !b.noelBroken) {
        return b.prismL.hp > 0 ? t("stage5.obj.p1LPrism") : t("stage5.obj.p1Noel");
      }
      if (!b.elleBroken && b.noelBroken) {
        return b.prismR.hp > 0 ? t("stage5.obj.p1RPrism") : t("stage5.obj.p1Elle");
      }
      return t("stage5.obj.p1Brooch");
    }
    // Phase 3
    if (!b.chestArmorBroken) {
      return t("stage5.obj.p2", { hp: b.chestArmorHP });
    }
    const orbs = b.cherubOrbs.filter(o => o.active).length;
    if (orbs > 0 || b.coreGraceTimer > 0) {
      return t("stage5.obj.p3Orbs");
    }
    return t("stage5.obj.p3Core", { hp: b.core.hp });
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    UI.setBossHeader("#e6ff00", state.phase === 3 ? t("stage5.headerSeraphia") : t("stage5.headerTwins"));

    if (state.phase === 1) {
      UI.setText("targetBriefingText", t("stage5.briefing.p1"));
      UI.setText("dtArmLLabel", t("stage5.dt.p1L"));
      UI.setText("dtArmRLabel", t("stage5.dt.p1R"));
      UI.setText("dtChestLabel", t("stage5.dt.p1Chest"));
      UI.setText("dtCrotchLabel", t("stage5.dt.p1Crotch"));

      const lRemain = (!b.haloL.broken ? 1 : 0) + (!b.odangoL.broken ? 1 : 0) + (!b.kneeL.broken ? 1 : 0);
      const rRemain = (!b.haloR.broken ? 1 : 0) + (!b.antennaR.broken ? 1 : 0) + (!b.kneeR.broken ? 1 : 0);
      const lStatus = b.elleBroken ? "💥BROKEN!" : t("stage5.dt.remain", { remain: lRemain });
      const rStatus = b.noelBroken ? "💥BROKEN!" : t("stage5.dt.remain", { remain: rRemain });
      UI.setText("dtArmLStatus", lStatus);
      UI.setClass("dtArmLStatus", b.elleBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#ff2ad4]");
      UI.setText("dtArmRStatus", rStatus);
      UI.setClass("dtArmRStatus", b.noelBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#00f5e8]");
      UI.setText("dtChestStatus", "🔒FUSED LOCK");
      UI.setClass("dtChestStatus", "font-bold text-gray-400");
    } else if (state.phase === 2) {
      UI.setText("targetBriefingText", t("stage5.briefing.p2"));
      UI.setText("dtArmLLabel", t("stage5.dt.p2L"));
      UI.setText("dtArmRLabel", t("stage5.dt.p2R"));
      UI.setText("dtChestLabel", t("stage5.dt.p2Chest"));
      UI.setText("dtCrotchLabel", t("stage5.dt.p2Crotch"));

      UI.setText("dtArmLStatus", b.prismL.hp <= 0 ? "💥BROOCH DOWN" : `HP: ${b.prismL.hp}/4`);
      UI.setClass("dtArmLStatus", b.prismL.hp <= 0 ? "font-bold text-gray-400" : "font-bold text-[#ff2ad4] animate-pulse");
      UI.setText("dtArmRStatus", b.prismR.hp <= 0 ? "💥BROOCH DOWN" : `HP: ${b.prismR.hp}/4`);
      UI.setClass("dtArmRStatus", b.prismR.hp <= 0 ? "font-bold text-gray-400" : "font-bold text-[#00f5e8] animate-pulse");
      UI.setText("dtChestStatus", "⚡TETHER OVERLOAD");
      UI.setClass("dtChestStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else {
      UI.setText("targetBriefingText", t("stage5.briefing.p3"));
      UI.setText("dtArmLLabel", t("stage5.dt.p3L"));
      UI.setText("dtArmRLabel", t("stage5.dt.p3R"));
      UI.setText("dtChestLabel", t("stage5.dt.p3Chest"));
      UI.setText("dtCrotchLabel", t("stage5.dt.p3Crotch"));

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
      UI.setText("dtCrotchStatus", t("stage5.dt.reverse", { sec: secLeft }));
      UI.setClass("dtCrotchStatus", "font-bold text-[#ff1493] animate-pulse");
    } else if (b.cosmic.mode === "gamma_fire") {
      UI.setText("dtCrotchStatus", t("stage5.dt.gamma"));
      UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else if (b.cosmic.mode === "bh_active") {
      UI.setText("dtCrotchStatus", t("stage5.dt.singularity"));
      UI.setClass("dtCrotchStatus", "font-bold text-[#b84dff] animate-pulse");
    } else if (b.haloAttack.mode === "charging") {
      UI.setText("dtCrotchStatus", t("stage5.dt.haloAim"));
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5e8] animate-pulse");
    } else {
      UI.setText("dtCrotchStatus", "NORMAL");
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4]");
    }

    const blushVal = Math.min(100, Math.round(b.blushGauge || 0));
    UI.setText("blushGaugeText", `${blushVal}%`);
    UI.setWidth("blushGaugeBar", `${blushVal}%`);

    const faceMap = {
      normal: b.chestArmorBroken ? t("stage5.face.normalBroken") : t("stage5.face.normalArmor"),
      wink: t("stage5.face.wink"),
      shock: t("stage5.face.shock"),
      wince: t("stage5.face.wince"),
      shout: t("stage5.face.shout"),
      open_blush: t("stage5.face.open_blush"),
      talk: t("stage5.face.talk"),
      talk_sm: t("stage5.face.talk_sm")
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
    UI.showCutin(t("stage5.cutin.navelTrap"), 95);
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
              Particles.addPopup(state, b.core.x, b.core.y - 16, t("stage5.popup.coreOpen"), "#e6ff00", 1.15);
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
      UI.showCutin(t("stage5.cutin.elleBreak"), 175);
      Systems.addScore(state, 25000, b.prismL.x, b.prismL.y, "💥ELLE BREAK!!");
    } else if (newlyBrokenR) {
      UI.showCutin(t("stage5.cutin.noelBreak"), 175);
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
    UI.showCutin(t("stage5.cutin.twinsBreak"), 190);
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
    UI.showCutin(t("stage5.cutin.fusion"), 195);
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
    UI.showCutin(t("stage5.cutin.seraphiaArmor"), 220);
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
    UI.showCutin(t("stage5.cutin.seraphiaClear"), 260);
    UI.updateHUD(state);
  }
};

// =========================================================================
// STAGE 4: KASUMI (電脳夜桜カスミ - CYBER KUNOICHI CLIMAX)
// =========================================================================

window.Stage4 = {
  id: "stage4",
  get name() { return t("stage4.name"); },
  get bossName() { return t("stage4.bossName"); },

  assets: {
    bgAlleyImg: new Image(),
    charBodyImg: new Image(),
    charSealBrokenImg: new Image(),
    charSuitBrokenImg: new Image(),
    greavesBrokenImg: new Image(),
    stoleBackImg: new Image(),
    stoleFrontImg: new Image(),
    defeatCgImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    if (this.assets._initialized) return;
    this.assets._initialized = true;
    const v = (window.StageCommon && StageCommon.ASSET_QUERY) || "?v=190";
    this.assets.bgAlleyImg.src = "./assets/stage4/bg_alley.jpg" + v;
    this.assets.charBodyImg.src = "./assets/stage4/char_body.png" + v;
    this.assets.charSealBrokenImg.src = "./assets/stage4/char_seal_broken.png" + v;
    this.assets.charSuitBrokenImg.src = "./assets/stage4/char_suit_broken.png" + v;
    this.assets.greavesBrokenImg.src = "./assets/stage4/greaves_broken.png" + v;
    this.assets.stoleBackImg.src = "./assets/stage4/stole_back.png" + v;
    this.assets.stoleFrontImg.src = "./assets/stage4/stole_front.png" + v;
    this.assets.defeatCgImg.src = "./assets/stage4/defeat_cg.jpg" + v;
    this.assets.facePatchImgs = Systems.loadFacePatches(
      "stage4",
      window.STAGE4_FACE_PATCHES,
      ["blink_half", "blink", "wink", "shout", "shock", "wince", "open_blush", "talk", "talk_sm"]
    );
    this.assets.loaded = true;
  },

  LANTERN_DEFS: [
    { id: "L1", kanji: "夜", idx: 0, cordX: 73.3,  cordY: 16, x: 73.3,  y: 90.0,  rx: 28, ry: 48, r: 22, tassel: 26, color: "#00f5d4" },
    { id: "L2", kanji: "桜", idx: 1, cordX: 126.2, cordY: 16, x: 126.2, y: 66.0,  rx: 17, ry: 34, r: 16, tassel: 18, color: "#ff2a9d" },
    { id: "R1", kanji: "乱", idx: 2, cordX: 277.6, cordY: 16, x: 277.6, y: 58.0,  rx: 15, ry: 28, r: 15, tassel: 14, color: "#b84dff" },
    { id: "R2", kanji: "舞", idx: 3, cordX: 305.6, cordY: 16, x: 305.6, y: 83.0,  rx: 20, ry: 40, r: 18, tassel: 20, color: "#00f5d4" },
    { id: "R3", kanji: "極", idx: 4, cordX: 352.0, cordY: 16, x: 352.0, y: 118.0, rx: 24, ry: 54, r: 21, tassel: 28, color: "#ff2a9d" }
  ],

  // 3D立体ワイヤーランプの軌道定義（流れるネオンチェイサー付き高架チューブ！）
  WIRE_RAMPS: {
    left: {
      id: "left",
      name: "L-SKYWAY",
      color: "#00f5d4",
      accent: "#e6ff00",
      entryX: 58,
      entryY: 392,
      entryR: 20,
      exitVx: 3.6,
      exitVy: 0.9,
      points: [
        { x: 58,  y: 392, elev: 0.10 },
        { x: 42,  y: 335, elev: 0.50 },
        { x: 35,  y: 262, elev: 0.85 },
        { x: 42,  y: 175, elev: 1.00 },
        { x: 73,  y: 92,  elev: 1.00, lanternId: "L1" },
        { x: 126, y: 66,  elev: 1.00, lanternId: "L2" },
        { x: 176, y: 48,  elev: 0.65 }
      ]
    },
    right: {
      id: "right",
      name: "R-SKYWAY",
      color: "#ff2a9d",
      accent: "#e6ff00",
      entryX: 338,
      entryY: 392,
      entryR: 20,
      exitVx: -3.6,
      exitVy: 0.9,
      points: [
        { x: 338, y: 392, elev: 0.10 },
        { x: 354, y: 335, elev: 0.50 },
        { x: 361, y: 255, elev: 0.85 },
        { x: 356, y: 175, elev: 0.98 },
        { x: 352, y: 118, elev: 1.00, lanternId: "R3" },
        { x: 306, y: 83,  elev: 1.00, lanternId: "R2" },
        { x: 278, y: 58,  elev: 1.00, lanternId: "R1" },
        { x: 222, y: 48,  elev: 0.65 }
      ]
    }
  },

  sampleRamp(rampKey, dist, out = null) {
    return StageCommon.sampleStageRamp(this, rampKey, dist, { withLanterns: true }, out);
  },

  createBossState() {
    // 1. キャラより手前に降り注ぐ前景マトリックス 0/1 ストリーム（ボールが当たると弾けつつ減速！）
    const matrixCols = [];
    const colXs = [30, 48, 66, 84, 102, 120, 138, 156, 174, 190, 206, 222, 240, 258, 276, 294, 312, 330, 348, 364];
    colXs.forEach((x, idx) => {
      const len = 8 + (idx % 6);
      const chars = [];
      const hitTimers = [];
      for (let k = 0; k < len; k++) {
        chars.push(Math.random() < 0.5 ? "0" : "1");
        hitTimers.push(0);
      }
      matrixCols.push({
        x,
        y: Math.random() * 640,
        speed: 1.50 + (idx % 5) * 0.38 + Math.random() * 0.4,
        len,
        pink: idx % 3 === 1,
        chars,
        hitTimers
      });
    });

    // 2. 奥レイヤー＆手前レイヤーの舞い散る夜桜吹雪（手前の桜にボールが当たると舞い散りつつ減速！）
    const makePetal = (front) => ({
      x: 22 + Math.random() * 350,
      y: 20 + Math.random() * 620,
      vx: -0.35 + Math.random() * 0.85,
      vy: (front ? 0.92 : 0.58) + Math.random() * 0.6,
      size: front ? (4.6 + Math.random() * 3.0) : (2.6 + Math.random() * 2.0),
      rot: Math.random() * Math.PI * 2,
      rotSpd: (Math.random() - 0.5) * 0.10,
      swayPhase: Math.random() * Math.PI * 2,
      alpha: front ? (0.80 + Math.random() * 0.20) : (0.45 + Math.random() * 0.25),
      tint: Math.random() < 0.35 ? "#ff77cc" : (Math.random() < 0.5 ? "#e5b8ff" : "#ffb7dd"),
      hitCooldown: 0
    });
    const backPetals = Array.from({ length: 22 }, () => makePetal(false));
    const frontPetals = Array.from({ length: 24 }, () => makePetal(true));

    return {
      name: "カスミ",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 95,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,
      bustExcitement: 0,
      animTick: 0,
      lastFlipActiveTimer: 0,
      faceAnim: StageCommon.createFaceAnim(),

      // 背景＆前景リアルタイム演出
      matrixCols,
      backPetals,
      frontPetals,
      sakuraStormTimer: 0,
      stoleWind: 0,

      // 3. 上段ネオンワイヤー提灯 5基（常時ネオン発光＋漢字紋章＋振り子物理＋全点灯コンボ！）
      lanterns: [
        { ...this.LANTERN_DEFS[0], lit: false, angle: 0.03,  angleVel: 0, flash: 0 },
        { ...this.LANTERN_DEFS[1], lit: false, angle: -0.03, angleVel: 0, flash: 0 },
        { ...this.LANTERN_DEFS[2], lit: false, angle: 0.02,  angleVel: 0, flash: 0 },
        { ...this.LANTERN_DEFS[3], lit: false, angle: -0.02, angleVel: 0, flash: 0 },
        { ...this.LANTERN_DEFS[4], lit: false, angle: 0.03,  angleVel: 0, flash: 0 }
      ],
      lanternComboCount: 0,
      lanternCelebrationTimer: 0,
      fumaSlash: null,
      subLogHP: 0,
      subLogFlash: 0,

      // 4. 盤面中段・貫通型回転手裏剣スピナー (L/R)
      spinners: [
        { id: "spinL", label: "L-SHURIKEN", x: 94,  y: 256, r: 17, angle: 0, omega: 0.06, flash: 0, spinTicks: 0 },
        { id: "spinR", label: "R-SHURIKEN", x: 302, y: 256, r: 17, angle: 0.4, omega: -0.06, flash: 0, spinTicks: 0 }
      ],

      // 5. 忍法・電脳幻影分身 ＆ 九字魔法陣レーザー斉射！
      ninjutsu: {
        mode: "idle",        // "idle" | "seal_charge"
        timer: 135,
        sealKanjiIdx: 0,
        aimTargets: [],
        thrownShurikens: [],
        clones: [
          { id: "cloneL", label: "BUNSHIN-L", x: 88,  y: 196, r: 18, active: false, hp: 3, maxHP: 3, color: "#00f5d4", flash: 0, phase: 0 },
          { id: "cloneR", label: "BUNSHIN-R", x: 308, y: 196, r: 18, active: false, hp: 3, maxHP: 3, color: "#ff2a9d", flash: 0, phase: Math.PI }
        ],
        cloneCooldown: 180
      },

      // 6. Phase 2〜3 秘奥義・夜桜風魔大車輪（ランプ入口ライン y=402 を左右横断して上向きショット＆SKYWAY突入を妨害！）
      giantFuma: {
        active: false,
        x: 198,
        y: 402,
        vx: 2.15,
        r: 21,
        rot: 0,
        flash: 0
      },

      // 7. Phase 1 外装ターゲット（原画パーツ位置に1px単位で完全一致！）
      // 籠手（コテ）外側の小さな四角い装甲プレート:
      //   左コテ角パーツ: 原画 (264, 585) -> キャンバス (141.1, 289.8)
      //   右コテ角パーツ: 原画 (505, 593) -> キャンバス (255.3, 293.5)
      tekkoL: { x: 141.1, y: 289.8, r: 13, hp: 4, maxHP: 4, broken: false, flash: 0, label: "L-KOTE" },
      tekkoR: { x: 255.3, y: 293.5, r: 13, hp: 4, maxHP: 4, broken: false, flash: 0, label: "R-KOTE" },
      // 左右独立の膝当てアーマー:
      //   左膝パッド: 原画 (355, 960) -> キャンバス (184.3, 465.3)
      //   右膝パッド: 原画 (416, 964) -> キャンバス (213.2, 467.2)
      kneeL: { x: 184.3, y: 465.3, r: 13, hp: 3, maxHP: 3, broken: false, flash: 0, label: "L-KNEE" },
      kneeR: { x: 213.2, y: 467.2, r: 13, hp: 3, maxHP: 3, broken: false, flash: 0, label: "R-KNEE" },
      sealBroken: false,

      // 8. Phase 2 ターゲット：タイト忍装束バスト（気持ちよく割ってPhase 3の晒し姿メインバトルへ突入！）
      chestArmorHP: 9,
      chestArmorMaxHP: 9,
      chestArmorBroken: false,
      bustL: { x: 180.0, y: 260.3, r: 17, rx: 27, ry: 27, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      bustR: { x: 216.0, y: 260.3, r: 17, rx: 27, ry: 27, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },

      // 9. Phase 3 最終ターゲット：首元の羽衣チャクラ核 ＋ 頭頂の電脳水引（分身生存中は変わり身結界で保護！）
      core: { x: 198.0, y: 225.7, r: 15, hp: 18, maxHP: 18, unlocked: false, flash: 0 },
      coreGraceTimer: 0,
      hairpinCore: { x: 199.9, y: 132.1, r: 14, flash: 0 },

      // 10. 腰の四角いシアン発光回路ノード（太もものマークは廃止し、腰回路ヒットで腰〜太ももが連動ぷるぷる！）
      //   左腰シアン四角回路: 原画 (353, 650) -> キャンバス (183.3, 320.2)
      //   右腰シアン四角回路: 原画 (423, 650) -> キャンバス (216.5, 320.2)
      waistSensors: [
        { id: "waistL", side: "L", label: "L-WAIST", x: 183.3, y: 320.2, r: 11, flash: 0 },
        { id: "waistR", side: "R", label: "R-WAIST", x: 216.5, y: 320.2, r: 11, flash: 0 }
      ],
      hipL: { x: 168.0, y: 358.0, rx: 28, ry: 36, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      hipR: { x: 228.0, y: 358.0, rx: 28, ry: 36, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 }
    };
  },

  getPhase1Parts(b) {
    return [b.tekkoL, b.tekkoR, b.kneeL, b.kneeR];
  },

  getTargetDesc(state) {
    const b = state.boss;
    if (!b) return t("stage4.obj.default");
    if (state.stageCleared) return t("stage4.obj.clear");
    const litCnt = b.lanterns.filter(l => l.lit).length;
    const activeClones = b.ninjutsu.clones.filter(c => c.active).length;
    if (b.ninjutsu.mode === "seal_charge") {
      return t("stage4.obj.shuriken");
    }
    if (state.phase === 1) {
      const parts = [];
      if (!b.tekkoL.broken || !b.tekkoR.broken) parts.push(t("stage4.obj.tekko"));
      if (!b.kneeL.broken || !b.kneeR.broken) parts.push(t("stage4.obj.knee"));
      return t("stage4.obj.phase1", { parts: parts.join(" & "), lit: litCnt });
    }
    if (state.phase === 2) {
      return activeClones > 0
        ? t("stage4.obj.chestClones", { hp: b.chestArmorHP, clones: activeClones })
        : t("stage4.obj.chest", { hp: b.chestArmorHP });
    }
    return activeClones > 0
      ? t("stage4.obj.clones", { clones: activeClones })
      : t("stage4.obj.core", { hp: b.core.hp });
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    UI.setBossHeader("#b84dff", t("stage4.header"));
    UI.setText("targetBriefingText", t("stage4.briefing"));

    UI.setText("dtArmRLabel", t("stage4.dt.armR"));
    UI.setText("dtArmLLabel", t("stage4.dt.armL"));
    UI.setText("dtChestLabel", t("stage4.dt.chest"));
    UI.setText("dtCrotchLabel", t("stage4.dt.crotch"));

    const litCnt = b.lanterns.filter(l => l.lit).length;
    if (b.lanternCelebrationTimer > 0) {
      UI.setText("dtArmRStatus", "🌸FULL BLOOM!!");
      UI.setClass("dtArmRStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else {
      UI.setText("dtArmRStatus", `🏮LIT ${litCnt}/5`);
      UI.setClass("dtArmRStatus", "font-bold text-[#00f5d4]");
    }

    if (b.sealBroken) {
      UI.setText("dtArmLStatus", "💥SEAL BROKEN!");
      UI.setClass("dtArmLStatus", "font-bold text-[#ff1493] animate-pulse");
    } else {
      const kl = b.tekkoL.broken ? "OK" : b.tekkoL.hp;
      const kr = b.tekkoR.broken ? "OK" : b.tekkoR.hp;
      const nl = b.kneeL.broken ? "OK" : b.kneeL.hp;
      const nr = b.kneeR.broken ? "OK" : b.kneeR.hp;
      UI.setText("dtArmLStatus", t("stage4.dt.armLStatus", { kl, kr, nl, nr }));
      UI.setClass("dtArmLStatus", "font-bold text-[#e6ff00]");
    }

    if (state.phase === 3 && b.core.unlocked) {
      UI.setText("dtChestStatus", `💎CORE (${b.core.hp}/${b.core.maxHP})`);
      UI.setClass("dtChestStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else {
      UI.setText("dtChestStatus", b.chestArmorBroken ? "💥PURGED!" : `SUIT (${b.chestArmorHP}/${b.chestArmorMaxHP})`);
      UI.setClass("dtChestStatus", "font-bold text-[#ff1493]");
    }

    const activeClones = b.ninjutsu.clones.filter(c => c.active).length;
    if (b.giantFuma.active) {
      UI.setText("dtCrotchStatus", activeClones > 0 ? t("stage4.dt.wheelClones", { clones: activeClones }) : t("stage4.dt.wheel"));
      UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else if (b.ninjutsu.mode === "seal_charge") {
      UI.setText("dtCrotchStatus", t("stage4.dt.kuji"));
      UI.setClass("dtCrotchStatus", "font-bold text-[#ff2a9d] animate-pulse");
    } else if (activeClones > 0) {
      UI.setText("dtCrotchStatus", t("stage4.dt.clones", { clones: activeClones }));
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4] animate-pulse");
    } else {
      UI.setText("dtCrotchStatus", b.subLogHP > 0 ? t("stage4.dt.log", { hp: b.subLogHP }) : "READY");
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4]");
    }

    const blushVal = Math.min(100, Math.round(b.blushGauge || 0));
    UI.setText("blushGaugeText", `${blushVal}%`);
    UI.setWidth("blushGaugeBar", `${blushVal}%`);

    const faceMap = {
      normal: b.chestArmorBroken ? t("stage4.face.normalBroken") : t("stage4.face.normalArmor"),
      wink: t("stage4.face.wink"),
      shock: t("stage4.face.shock"),
      wince: t("stage4.face.wince"),
      shout: t("stage4.face.shout"),
      open_blush: t("stage4.face.open_blush"),
      talk: t("stage4.face.talk"),
      talk_sm: t("stage4.face.talk_sm")
    };
    UI.setText("bossFaceStatus", faceMap[b.expression] || faceMap.normal);
  },

  triggerDebugJiggle(state) {
    const b = state.boss;
    if (!b) return;
    if (window.sfx) window.sfx.softPuru();
    const imp = b.chestArmorBroken ? 7.6 : 5.4;
    b.bustL.vx += imp; b.bustL.vy -= imp * 1.05;
    b.bustR.vx -= imp; b.bustR.vy -= imp * 1.05;
    b.hipL.vx -= 5.8;  b.hipL.vy -= 5.2;
    b.hipR.vx += 5.8;  b.hipR.vy -= 5.2;
    b.stoleWind = Math.max(b.stoleWind, 1.0);
    b.blushGauge = Math.min(100, (b.blushGauge || 0) + 18);
    Particles.spawnHeart(state, 198, 250, false);
    StageCommon.setExpressionSequence(state, [
      { expr: "open_blush", frames: 36 },
      { expr: "wince", frames: 18 }
    ]);
  },

  onNudge(state, nx, ny, intensity) {
    const b = state.boss;
    if (!b) return;
    b.stoleWind = Math.min(1.6, (b.stoleWind || 0) + 0.85 * intensity);
    b.lanterns.forEach((lt, i) => {
      lt.angleVel += (nx * 0.05 + (i % 2 === 0 ? 0.014 : -0.014)) * intensity;
    });
    b.frontPetals.forEach(p => {
      p.vx += nx * 1.6 * intensity;
      p.vy += ny * 0.9 * intensity;
    });

    if (window.Systems && Systems.isNudgeJiggleEnabled()) {
      const bImp = (b.chestArmorBroken ? 8.8 : 6.8) * intensity;
      const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
      b.bustL.vx += sway * bImp;
      b.bustL.vy += (ny - 0.65) * bImp;
      b.bustR.vx -= sway * bImp * 0.75;
      b.bustR.vy += (ny - 0.65) * bImp;
      b.hipL.vx += sway * 6.2 * intensity;
      b.hipL.vy += (ny - 0.5) * 6.2 * intensity;
      b.hipR.vx -= sway * 4.8 * intensity;
      b.hipR.vy += (ny - 0.5) * 6.2 * intensity;
      if (!b.faceAnim.sequence && b.expression === "normal") {
        b.expression = b.chestArmorBroken ? "open_blush" : "shock";
        b.expressionTimer = 30;
      }
      if (window.sfx && window.sfx.softPuru) {
        window.sfx.softPuru();
      }
    }
  },

  summonBunshinClones(state) {
    const b = state.boss;
    if (!b) return;
    let spawned = false;
    b.ninjutsu.clones.forEach(cl => {
      if (!cl.active) {
        cl.active = true;
        cl.hp = cl.maxHP;
        cl.flash = 24;
        spawned = true;
        state.shockwaves.push({
          x: cl.x, y: cl.y, r: 6, maxR: 52, speed: 3.8, color: cl.color, lineWidth: 3.0, alpha: 1.0
        });
        Particles.add(state, cl.x, cl.y, cl.color, 18, 4.8);
      }
    });
    if (spawned) {
      if (window.sfx && window.sfx.bunshinSummon) window.sfx.bunshinSummon();
      b.sakuraStormTimer = Math.max(b.sakuraStormTimer, 120);
      b.stoleWind = Math.max(b.stoleWind, 1.3);
      Particles.addPopup(state, 198, 172, t("stage4.popup.clone"), "#e6ff00", 1.12);
    }
  },

  lightLantern(state, lt, impulseDir = 1) {
    const b = state.boss;
    lt.angleVel = Math.max(-0.24, Math.min(0.24, lt.angleVel + impulseDir * 0.12));
    lt.flash = 22;
    const wasLit = lt.lit;
    lt.lit = true;

    const allLit = b.lanterns.every(l => l.lit);
    if (window.sfx && window.sfx.lanternBell) {
      window.sfx.lanternBell(lt.idx, !wasLit && allLit);
    }
    state.shockwaves.push({
      x: lt.x, y: lt.y, r: 8, maxR: wasLit ? 34 : 52, speed: 3.4, color: lt.color, lineWidth: 2.4, alpha: 0.9
    });
    Particles.add(state, lt.x, lt.y, lt.color, wasLit ? 9 : 18, 4.2);
    Systems.addScore(state, wasLit ? 1800 : 5000, lt.x, lt.y, wasLit ? `🏮${lt.kanji}` : `🏮${lt.kanji} LIT UP!`);
    Systems.addFever(state, wasLit ? 2.5 : 6);

    if (!wasLit && !allLit && b.expression === "normal") {
      b.winkTimer = 28;
    }
    if (!wasLit && allLit) {
      this.triggerYozakuraFullBloom(state);
    }
  },

  triggerYozakuraFullBloom(state) {
    const b = state.boss;
    b.lanternComboCount++;
    b.lanternCelebrationTimer = 120;
    b.sakuraStormTimer = 280;
    b.stoleWind = 1.6;
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 32 },
      { expr: "wince", frames: 36 }
    ]);

    b.subLogHP = Math.min(3, b.subLogHP + 2);
    b.subLogFlash = 30;

    const targetObj = this.getActiveBossTarget(state);
    b.fumaSlash = {
      sx: 40,
      sy: 70,
      tx: targetObj.x,
      ty: targetObj.y,
      progress: 0,
      rot: 0,
      applied: false
    };

    Systems.addScore(state, 45000, 198, 120, "🌸YOZAKURA FULL BLOOM!!");
    Systems.addFever(state, 24);
    UI.showCutin(t("stage4.cutin.lanternFull"), 210);
  },

  isCoreShieldedByBunshin(state) {
    const b = state.boss;
    if (!b || state.phase < 3) return false;
    return b.coreGraceTimer > 0 || b.ninjutsu.clones.some(c => c.active);
  },

  getActiveBossTarget(state) {
    const b = state.boss;
    if (state.phase === 1) {
      const alive = this.getPhase1Parts(b).filter(p => !p.broken);
      return alive.length > 0 ? alive[0] : b.bustL;
    }
    if (state.phase === 2) {
      return b.bustL;
    }
    // Phase 3: 分身が生存中ならカウンターやスラッシュはまず分身を狙う！
    const activeClone = b.ninjutsu.clones.find(c => c.active);
    if (activeClone) return activeClone;
    return b.core;
  },

  damageActiveArmor(state, dmg, hitX, hitY, label = "⚡SHURIKEN COUNTER!!") {
    const b = state.boss;
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 20 },
      { expr: "wince", frames: 28 }
    ]);
    if (state.phase === 1) {
      const cands = this.getPhase1Parts(b).filter(p => !p.broken);
      if (cands.length > 0) {
        const tgt = cands[0];
        tgt.hp = Math.max(0, tgt.hp - dmg);
        tgt.flash = 22;
        state.shockwaves.push({ x: tgt.x, y: tgt.y, r: 6, maxR: 50, speed: 4.2, color: "#e6ff00", lineWidth: 3.0, alpha: 1.0 });
        Particles.add(state, tgt.x, tgt.y, "#e6ff00", 20, 5.5);
        Systems.addScore(state, 18000, tgt.x, tgt.y - 10, label);
        if (window.sfx) window.sfx.armorBreak();
        if (tgt.hp === 0) {
          tgt.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", tgt.x, tgt.y);
          this.checkPhase1Clear(state);
        }
      }
    } else if (state.phase === 2 && !b.chestArmorBroken) {
      b.chestArmorHP = Math.max(0, b.chestArmorHP - dmg);
      b.bustL.flash = 22;
      b.bustR.flash = 22;
      b.bustL.vy -= 6.8;
      b.bustR.vy -= 6.8;
      state.shockwaves.push({ x: 198, y: 260, r: 8, maxR: 60, speed: 4.5, color: "#ff2a9d", lineWidth: 3.2, alpha: 1.0 });
      Particles.add(state, 198, 260, "#ff2a9d", 22, 5.8);
      Systems.addScore(state, 22000, 198, 250, label);
      if (window.sfx) window.sfx.armorBreak();
      if (b.chestArmorHP <= 0) {
        this.breakChestSuit(state);
      }
    } else if (state.phase === 3 && b.core.unlocked && !state.stageCleared) {
      // Phase 3: 分身が生存している間は分身を優先削り、全滅後のみチャクラ核へダメージ！
      const activeClone = b.ninjutsu.clones.find(c => c.active);
      if (activeClone) {
        activeClone.hp = Math.max(0, activeClone.hp - dmg);
        activeClone.flash = 20;
        Particles.add(state, activeClone.x, activeClone.y, activeClone.color, 18, 5.0);
        Systems.addScore(state, 16000, activeClone.x, activeClone.y - 10, label);
        if (activeClone.hp <= 0) {
          activeClone.active = false;
          if (window.sfx) window.sfx.armorBreak();
          if (b.ninjutsu.clones.every(c => !c.active)) {
            b.ninjutsu.cloneCooldown = 480;
            Particles.addPopup(state, b.core.x, b.core.y - 16, t("stage4.popup.coreOpen"), "#e6ff00", 1.15);
          }
        }
      } else if (b.coreGraceTimer <= 0) {
        const coreDmg = Math.min(2, dmg);
        b.core.hp = Math.max(0, b.core.hp - coreDmg);
        b.core.flash = 24;
        state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 8, maxR: 64, speed: 4.6, color: "#00f5d4", lineWidth: 3.2, alpha: 1.0 });
        Particles.add(state, b.core.x, b.core.y, "#00f5d4", 24, 6.0);
        Systems.addScore(state, 28000, b.core.x, b.core.y - 12, label);
        if (window.sfx) window.sfx.exSpark();
        if (b.core.hp <= 0) {
          this.triggerStageClear(state);
        }
      }
    }
    UI.updateHUD(state);
  },

  checkPhase1Clear(state) {
    const b = state.boss;
    const parts = this.getPhase1Parts(b);
    const brokenCnt = parts.filter(p => p.broken).length;
    if (brokenCnt === 2 && state.phase === 1) {
      this.summonBunshinClones(state);
    }
    if (state.phase === 1 && parts.every(p => p.broken)) {
      b.sealBroken = true;
      state.phase = 2;
      b.giantFuma.active = true;
      b.giantFuma.vx = 2.15;
      b.giantFuma.flash = 26;
      b.sakuraStormTimer = 200;
      b.stoleWind = 1.6;
      this.summonBunshinClones(state);
      StageCommon.setExpressionSequence(state, [
        { expr: "shock", frames: 35 },
        { expr: "wince", frames: 40 },
        { expr: "shout", frames: 35 }
      ]);
      Systems.addScore(state, 40000, 198, 260, "🌸SEAL BROKEN! PHASE 2!");
      Systems.dropReward(state, "major", { x: 198, y: 295 });
      UI.showCutin(t("stage4.cutin.phase1Clear"), 220);
      UI.updateHUD(state);
    }
  },

  breakChestSuit(state) {
    const b = state.boss;
    if (b.chestArmorBroken) return;
    b.chestArmorBroken = true;
    b.chestArmorHP = 0;
    state.phase = 3;
    b.core.unlocked = true;
    b.coreGraceTimer = 90; // ブレイク直後のマルチボール混戦による瞬殺防止
    b.ninjutsu.thrownShurikens = b.ninjutsu.thrownShurikens.filter(s => !s.parried);
    b.ninjutsu.cloneCooldown = 480;
    b.giantFuma.active = true;
    b.giantFuma.vx = (b.giantFuma.vx >= 0 ? 1 : -1) * 3.15;
    b.giantFuma.flash = 30;
    b.sakuraStormTimer = 260;
    b.stoleWind = 1.6;
    b.blushGauge = Math.min(100, (b.blushGauge || 0) + 45);
    b.bustL.vx += 7.8; b.bustL.vy -= 8.2;
    b.bustR.vx -= 7.8; b.bustR.vy -= 8.2;
    this.summonBunshinClones(state);
    StageCommon.setExpressionSequence(state, [
      { expr: "shock", frames: 30 },
      { expr: "wince", frames: 45 },
      { expr: "open_blush", frames: 65 }
    ]);

    Particles.triggerArmorBreakEffect(state, "chest", 198, 260);
    Systems.addScore(state, 60000, 198, 260, "🌸SHINOBI SUIT PURGED!!");
    Systems.dropReward(state, "major", { x: 198, y: 268 });
    UI.showCutin(t("stage4.cutin.phase2Clear"), 240);
    UI.updateHUD(state);
  },

  triggerStageClear(state) {
    if (state.stageCleared) return;
    state.stageCleared = true;
    if (state.boss) {
      state.boss.blushGauge = 100;
      state.boss.expression = "wince";
      state.boss.sakuraStormTimer = 300;
      state.boss.giantFuma.active = false;
    }
    StageCommon.startClearSequence(state, Physics.TABLE_WALLS);
    if (window.sfx) window.sfx.burstTrigger();
    Systems.addScore(state, 160000, 198, 225, "🌸STAGE 4 CLEAR!!🌸");
    UI.showCutin(t("stage4.cutin.criticalKO"), 260);
    UI.updateHUD(state);
  }
};

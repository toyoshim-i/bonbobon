// =========================================================================
// STAGE 4: KASUMI (電脳夜桜カスミ - CYBER KUNOICHI CLIMAX)
// =========================================================================

window.Stage4 = {
  id: "stage4",
  name: "電脳夜桜カスミ",
  bossName: "カスミ (KASUMI)",

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
    const v = "?v=144";
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
    this._srcCache = null;
    this._rampStaticCanvas = null;
    this._rampUpperCanvas = null;
    this._shurikenCache = {};
  },

  setExpressionSequence(state, seq) {
    StageCommon.setExpressionSequence(state, seq);
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

  smoothControlPoints(ctrlPts, subdiv = 5) {
    const out = [];
    const n = ctrlPts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrlPts[Math.max(0, i - 1)];
      const p1 = ctrlPts[i];
      const p2 = ctrlPts[i + 1];
      const p3 = ctrlPts[Math.min(n - 1, i + 2)];
      const steps = (i === n - 2) ? subdiv : subdiv - 1;
      for (let s = 0; s <= steps; s++) {
        if (i < n - 2 && s === steps) continue;
        const t = s / subdiv;
        const t2 = t * t;
        const t3 = t2 * t;
        const cr = (a, b, c, d) =>
          0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({
          x: cr(p0.x, p1.x, p2.x, p3.x),
          y: cr(p0.y, p1.y, p2.y, p3.y),
          elev: Math.max(0, Math.min(1, cr(p0.elev, p1.elev, p2.elev, p3.elev))),
          lanternId: t < 0.28 ? p1.lanternId : (t > 0.72 ? p2.lanternId : null)
        });
      }
    }
    return out;
  },

  buildPolylineMetrics(points) {
    const smoothPts = this.smoothControlPoints(points, 5);
    const segs = [];
    let totalLen = 0;
    for (let i = 0; i < smoothPts.length - 1; i++) {
      const a = smoothPts[i];
      const b = smoothPts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      segs.push({ a, b, len, startDist: totalLen, endDist: totalLen + len });
      totalLen += len;
    }
    return { segs, totalLen, smoothPts };
  },

  sampleRamp(rampKey, dist) {
    if (!this._rampMetrics) {
      this._rampMetrics = {
        left: this.buildPolylineMetrics(this.WIRE_RAMPS.left.points),
        right: this.buildPolylineMetrics(this.WIRE_RAMPS.right.points)
      };
    }
    const m = this._rampMetrics[rampKey];
    const clamped = Math.max(0, Math.min(m.totalLen, dist));
    for (let i = 0; i < m.segs.length; i++) {
      const s = m.segs[i];
      if (clamped <= s.endDist || i === m.segs.length - 1) {
        const t = Math.max(0, Math.min(1, (clamped - s.startDist) / s.len));
        const dx = (s.b.x - s.a.x) / s.len;
        const dy = (s.b.y - s.a.y) / s.len;
        return {
          x: s.a.x + (s.b.x - s.a.x) * t,
          y: s.a.y + (s.b.y - s.a.y) * t,
          elev: s.a.elev + (s.b.elev - s.a.elev) * t,
          tx: dx,
          ty: dy,
          totalLen: m.totalLen,
          nearLanternId: t > 0.65 ? s.b.lanternId : (t < 0.35 ? s.a.lanternId : null)
        };
      }
    }
    const last = m.segs[m.segs.length - 1];
    return { x: last.b.x, y: last.b.y, elev: last.b.elev, tx: 0, ty: 1, totalLen: m.totalLen, nearLanternId: null };
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
    if (!b) return "両コテ＆両膝を破壊せよ！";
    if (state.stageCleared) return "🌸カスミ撃破！ STAGE 4 CLEAR!";
    const litCnt = b.lanterns.filter(l => l.lit).length;
    const activeClones = b.ninjutsu.clones.filter(c => c.active).length;
    if (b.ninjutsu.mode === "seal_charge") {
      return "⚠️手裏剣斉射！パドルで斬り返せ！";
    }
    if (state.phase === 1) {
      const parts = [];
      if (!b.tekkoL.broken || !b.tekkoR.broken) parts.push("両コテ");
      if (!b.kneeL.broken || !b.kneeR.broken) parts.push("両膝");
      return `${parts.join("・")}を破壊せよ！(提灯${litCnt}/5)`;
    }
    if (state.phase === 2) {
      return activeClones > 0
        ? `忍装束を破壊せよ！(HP:${b.chestArmorHP}/分身${activeClones})`
        : `胸部忍装束を破壊せよ！(HP:${b.chestArmorHP})`;
    }
    return activeClones > 0
      ? `分身を倒し結界を解除せよ！(残${activeClones})`
      : `チャクラ核を撃破せよ！(HP:${b.core.hp})`;
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const b = state.boss;

    UI.setBossHeader("#b84dff", "TYPE-KASUMI (カスミ)");
    UI.setText("targetBriefingText", "「手前に降り注ぐ電脳文字と夜桜は球速を奪う防壁よ！ 幻影分身と夜桜風魔大車輪を突破できるかしら？」");

    UI.setText("dtArmRLabel", "夜桜提灯(LANTERNS):");
    UI.setText("dtArmLLabel", "コテ＆両膝(SEAL GUARD):");
    UI.setText("dtChestLabel", "忍装束＆チャクラ核:");
    UI.setText("dtCrotchLabel", "幻影分身＆秘奥義:");

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
      UI.setText("dtArmLStatus", `籠手${kl}/${kr} 膝${nl}/${nr}`);
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
      UI.setText("dtCrotchStatus", activeClones > 0 ? `🌀大車輪＋分身×${activeClones}` : "🌀風魔大車輪 展開中!!");
      UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
    } else if (b.ninjutsu.mode === "seal_charge") {
      UI.setText("dtCrotchStatus", "⚡九字レーザー照準中!!");
      UI.setClass("dtCrotchStatus", "font-bold text-[#ff2a9d] animate-pulse");
    } else if (activeClones > 0) {
      UI.setText("dtCrotchStatus", `👥幻影分身 ×${activeClones}体`);
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4] animate-pulse");
    } else {
      UI.setText("dtCrotchStatus", b.subLogHP > 0 ? `🪵丸太GUARD×${b.subLogHP}` : "READY");
      UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4]");
    }

    const blushVal = Math.min(100, Math.round(b.blushGauge || 0));
    UI.setText("blushGaugeText", `${blushVal}%`);
    UI.setWidth("blushGaugeBar", `${blushVal}%`);

    const faceMap = {
      normal: b.chestArmorBroken ? "恥じらい忍び構え" : "クール忍法印",
      wink: "🌸夜桜くノ一ウインク🌸",
      shock: "⚡見切られた…っ!?",
      wince: "くぅっ…不覚…！",
      shout: "⚡忍法・手裏剣乱れ撃ち！",
      open_blush: "♥くっ…晒しまでっ…♥",
      talk: "忍法詠唱中…",
      talk_sm: "気配察知中…"
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
    this.setExpressionSequence(state, [
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
      const bImp = (b.chestArmorBroken ? 6.4 : 4.2) * intensity;
      b.bustL.vx += nx * bImp; b.bustL.vy += ny * bImp;
      b.bustR.vx += nx * bImp; b.bustR.vy += ny * bImp;
      b.hipL.vx += nx * 4.0 * intensity; b.hipL.vy += ny * 3.8 * intensity;
      b.hipR.vx += nx * 4.0 * intensity; b.hipR.vy += ny * 3.8 * intensity;
      if (!b.faceAnim.sequence && b.expression === "normal") {
        b.expression = b.chestArmorBroken ? "open_blush" : "shock";
        b.expressionTimer = 24;
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
      Particles.addPopup(state, 198, 172, "👥忍法・電脳幻影分身!!", "#e6ff00", 1.12);
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
    this.setExpressionSequence(state, [
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
    UI.showCutin("🌸【五灯満開・夜桜乱舞！！】🌸<br>極大・風魔大車輪スラッシュ発動 ＆ ドレインに『変わり身の丸太』展開！", 210);
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
    this.setExpressionSequence(state, [
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
            Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
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
      this.setExpressionSequence(state, [
        { expr: "shock", frames: 35 },
        { expr: "wince", frames: 40 },
        { expr: "shout", frames: 35 }
      ]);
      Systems.addScore(state, 40000, 198, 260, "🌸SEAL BROKEN! PHASE 2!");
      Systems.dropReward(state, "major", { x: 198, y: 295 });
      UI.showCutin("💥【印ガード崩壊 ＆ 風魔大車輪・幻影分身展開！】💥<br>ランプ入口ラインを横断する風魔大車輪の隙を突いて胸部忍装束を破れ！", 220);
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
    this.setExpressionSequence(state, [
      { expr: "shock", frames: 30 },
      { expr: "wince", frames: 45 },
      { expr: "open_blush", frames: 65 }
    ]);

    Particles.triggerArmorBreakEffect(state, "chest", 198, 260);
    Systems.addScore(state, 60000, 198, 260, "🌸SHINOBI SUIT PURGED!!");
    Systems.dropReward(state, "major", { x: 198, y: 268 });
    UI.showCutin("🌸【忍装束パージ ＆ 変わり身結界展開！！】🌸<br>「くっ…晒し姿まで…！ 分身を倒さない限りチャクラ核には触れさせないわ！」", 240);
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
    UI.showCutin("🌸【電脳夜桜カスミ 完全撃破！！】🌸<br>「お見事…参りました…っ！」", 260);
    UI.updateHUD(state);
  },

  update(state, engine) {
    const b = state.boss;
    if (!b) return;
    b.animTick++;

    // クリア演出進行
    if (state.stageCleared && state.clearSequence && state.clearSequence.active) {
      StageCommon.updateClearSequence(state, {
        bossDisplayName: "カスミ (KASUMI)",
        defeatQuoteHtml: "「くっ……忍びの装束も秘術も見破られるなんて……！<br>お、お見事……参りました……っ！」",
        smokeColors: ["#ffb7dd", "#00f5d4", "#b84dff", "#ff2a9d"]
      });
      return;
    }

    // 0. 表情アニメーション状態マシン更新
    StageCommon.updateFaceAnim(b, "normal");

    if (b.sakuraStormTimer > 0) b.sakuraStormTimer--;
    if (b.coreGraceTimer > 0) b.coreGraceTimer--;
    if (state.leftFlipperDown || state.rightFlipperDown) {
      b.lastFlipActiveTimer = 95;
    } else if (b.lastFlipActiveTimer > 0) {
      b.lastFlipActiveTimer--;
    }
    b.stoleWind = Math.max(0, (b.stoleWind || 0) * 0.96);

    const activePlayBalls = state.balls.filter(ball => !ball.inShooterLane && !ball._onWireRamp && ball.y < 590);

    // 1. 前景マトリックス 0/1 ストリーム更新 ＆ ボール接触時の減速（デジタル抵抗）判定！
    const fastFactor = (state.fever.active || b.sakuraStormTimer > 0) ? 1.85 : 1.0;
    b.matrixCols.forEach(col => {
      col.y += col.speed * fastFactor;
      if (col.y - col.len * 13 > 660) {
        col.y = -10 - Math.random() * 60;
      }
      if ((b.animTick + (col.x | 0)) % 8 === 0) {
        const idx = Math.floor(Math.random() * col.chars.length);
        col.chars[idx] = Math.random() < 0.5 ? "0" : "1";
      }
      for (let k = 0; k < col.len; k++) {
        if (col.hitTimers[k] > 0) {
          col.hitTimers[k]--;
          continue;
        }
        const cy = col.y - k * 12;
        if (cy < 26 || cy > 565) continue;
        for (let bi = 0; bi < activePlayBalls.length; bi++) {
          const ball = activePlayBalls[bi];
          if (Math.abs(ball.x - col.x) < ball.r + 5.5 && Math.abs(ball.y - cy) < ball.r + 5.5) {
            col.hitTimers[k] = 32;
            const spd = Math.hypot(ball.vx, ball.vy);
            if (spd > 2.4) {
              ball.vx *= 0.915;
              ball.vy *= 0.915;
            }
            Particles.add(state, col.x, cy, col.pink ? "#ff77cc" : "#00f5d4", 2, 1.8);
            break;
          }
        }
      }
    });

    // 2. 桜の花びら更新 ＆ 手前の桜にボールが当たった際の舞い散り＆減速判定！
    const stormBoost = b.sakuraStormTimer > 0 ? 2.2 : 1.0;
    const stepPetals = (arr, isFront) => {
      arr.forEach(p => {
        if (p.hitCooldown > 0) p.hitCooldown--;
        p.swayPhase += 0.048;
        p.x += (p.vx + Math.sin(p.swayPhase) * 0.5) * stormBoost;
        p.y += p.vy * stormBoost;
        p.rot += p.rotSpd * stormBoost;

        if (isFront && p.y > 26 && p.y < 570) {
          for (let bi = 0; bi < activePlayBalls.length; bi++) {
            const ball = activePlayBalls[bi];
            const dx = p.x - ball.x;
            const dy = p.y - ball.y;
            const d = Math.hypot(dx, dy);
            // 直撃時はボールを減速させつつ花びらを弾き飛ばす！
            if (d < ball.r + p.size + 3.5 && p.hitCooldown <= 0) {
              p.hitCooldown = 30;
              const spd = Math.hypot(ball.vx, ball.vy);
              if (spd > 2.4) {
                ball.vx *= 0.92;
                ball.vy *= 0.92;
              }
              const nx = d > 0.1 ? dx / d : 0;
              const ny = d > 0.1 ? dy / d : -1;
              p.vx += nx * 2.4 + (ball.vx || 0) * 0.25;
              p.vy += ny * 2.0 - 0.9;
              p.rotSpd = (Math.random() - 0.5) * 0.32;
              Particles.add(state, p.x, p.y, "#ffb7dd", 3, 2.0);
            } else if (d < 36 && d > 0.1) {
              const push = (1 - d / 36) * 0.35;
              p.vx += (dx / d) * push;
              p.vy += (dy / d) * push - 0.12;
            }
          }
        }
        p.vx = p.vx * 0.96 + 0.012;
        p.vy = Math.max(-1.8, Math.min(2.7, p.vy * 0.98 + 0.022));

        if (p.y > 658 || p.x < 12 || p.x > 382) {
          p.x = 24 + Math.random() * 345;
          p.y = 18 + Math.random() * 24;
          p.vx = -0.25 + Math.random() * 0.7;
          p.vy = (isFront ? 0.9 : 0.56) + Math.random() * 0.55;
        }
      });
    };
    stepPetals(b.backPetals, false);
    stepPetals(b.frontPetals, true);

    // 3. 提灯の振り子物理
    if (b.lanternCelebrationTimer > 0) {
      b.lanternCelebrationTimer--;
      if (b.lanternCelebrationTimer === 0) {
        b.lanterns.forEach(l => { l.lit = false; });
      }
    }
    b.lanterns.forEach((lt, idx) => {
      if (lt.flash > 0) lt.flash--;
      const windPush = Math.sin(b.animTick * 0.035 + idx * 1.3) * 0.0012;
      lt.angleVel += -lt.angle * 0.062 + windPush;
      lt.angleVel *= 0.94;
      lt.angle += lt.angleVel;
    });

    // 風魔手裏剣スラッシュ進行
    if (b.fumaSlash) {
      b.fumaSlash.progress += 0.055;
      b.fumaSlash.rot += 0.45;
      if (b.fumaSlash.progress >= 0.55 && !b.fumaSlash.applied) {
        b.fumaSlash.applied = true;
        this.damageActiveArmor(state, 3, b.fumaSlash.tx, b.fumaSlash.ty, "🌸FUMA SLASH -3HP!!");
      }
      if (b.fumaSlash.progress >= 1.15) {
        b.fumaSlash = null;
      }
    }

    // 4. 回転手裏剣スピナー回転＆連続スコア判定
    b.spinners.forEach(sp => {
      if (sp.flash > 0) sp.flash--;
      sp.angle += sp.omega;
      const absW = Math.abs(sp.omega);
      if (absW > 0.09) {
        sp.omega *= 0.983;
        sp.spinTicks++;
        if (sp.spinTicks % 6 === 0) {
          if (window.sfx && window.sfx.spinnerTick) window.sfx.spinnerTick(absW * 2.2);
          Systems.addScore(state, 450, sp.x, sp.y - 12, null);
          Systems.addFever(state, 0.5);
          Particles.add(state, sp.x + (Math.random() - 0.5) * 18, sp.y + (Math.random() - 0.5) * 18, "#00f5d4", 3, 2.4);
        }
      } else {
        const dir = sp.id === "spinL" ? 1 : -1;
        sp.omega = dir * 0.06;
      }
    });

    // 5. Phase 2〜3 秘奥義・夜桜風魔大車輪（左右のSKYWAYランプ入口〜中央ライン y=386 を幅広く横断！）
    const gf = b.giantFuma;
    if (gf.active) {
      if (gf.flash > 0) gf.flash--;
      gf.rot += state.phase >= 3 ? 0.38 : 0.26;
      gf.x += gf.vx;
      if (gf.x > 334) { gf.x = 334; gf.vx = -Math.abs(gf.vx); }
      if (gf.x < 62)  { gf.x = 62;  gf.vx = Math.abs(gf.vx); }
      if (b.animTick % 4 === 0) {
        const a = Math.random() * Math.PI * 2;
        Particles.add(state, gf.x + Math.cos(a) * gf.r, gf.y + Math.sin(a) * gf.r, b.animTick % 8 === 0 ? "#ff2a9d" : "#00f5d4", 1, 1.8);
      }
    }

    // 6. 幻影分身の浮遊＆定期再召喚＋九字レーザー照準一斉手裏剣シーケンス！
    const nj = b.ninjutsu;

    nj.clones.forEach(cl => {
      if (cl.flash > 0) cl.flash--;
      cl.phase += 0.06;
    });
    if (state.phase >= 2 && activePlayBalls.length > 0 && nj.clones.every(c => !c.active)) {
      nj.cloneCooldown--;
      if (nj.cloneCooldown <= 0) {
        nj.cloneCooldown = state.phase === 3 ? 480 : 320;
        this.summonBunshinClones(state);
      }
    }

    if (nj.mode === "idle") {
      nj.timer--;
      if (nj.timer <= 0 && activePlayBalls.length > 0) {
        nj.mode = "seal_charge";
        nj.timer = 46;
        nj.sealKanjiIdx = (nj.sealKanjiIdx + 1) % 6;
        b.stoleWind = Math.max(b.stoleWind, 1.1);

        nj.aimTargets = [];
        const mainAimX = 142 + Math.random() * 112;
        nj.aimTargets.push({ sx: 198, sy: 258, ax: mainAimX, ay: 602, color: "#ff2a9d" });
        nj.clones.forEach((cl, idx) => {
          if (cl.active) {
            nj.aimTargets.push({
              sx: cl.x,
              sy: cl.y + Math.sin(cl.phase) * 7,
              ax: idx === 0 ? 136 : 260,
              ay: 602,
              color: cl.color
            });
          }
        });

        if (!b.faceAnim.sequence) {
          b.expression = "shout";
          b.expressionTimer = 46;
        }
      }
    } else if (nj.mode === "seal_charge") {
      nj.timer--;
      if (nj.timer <= 0) {
        nj.mode = "idle";
        nj.timer = state.phase === 1 ? 175 : (state.phase === 2 ? 145 : 125);
        nj.aimTargets.forEach(aim => {
          const ang = Math.atan2(aim.ay - aim.sy, aim.ax - aim.sx);
          const spd = 4.9 + state.phase * 0.42;
          nj.thrownShurikens.push({
            x: aim.sx,
            y: aim.sy,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            r: 13,
            rot: 0,
            parried: false,
            color: aim.color,
            trail: []
          });
        });
        nj.aimTargets = [];
        if (window.sfx && window.sfx.shurikenThrow) window.sfx.shurikenThrow();
      }
    }

    // 投擲手裏剣の移動・パドルパリィ判定
    const flippers = Physics.getFlippers(state);
    for (let i = nj.thrownShurikens.length - 1; i >= 0; i--) {
      const sh = nj.thrownShurikens[i];
      sh.trail.push({ x: sh.x, y: sh.y });
      if (sh.trail.length > 9) sh.trail.shift();
      sh.x += sh.vx;
      sh.y += sh.vy;
      sh.rot += sh.parried ? 0.62 : 0.38;

      if (sh.parried) {
        const tgt = this.getActiveBossTarget(state);
        const dx = tgt.x - sh.x;
        const dy = tgt.y - sh.y;
        const dist = Math.hypot(dx, dy) || 1;
        sh.vx = (dx / dist) * 12.2;
        sh.vy = (dy / dist) * 12.2;
        if (dist < 22) {
          this.damageActiveArmor(state, sh.dmg || 2, tgt.x, tgt.y, sh.dmg === 1 ? "⚡BUNSHIN COUNTER -1HP!" : "⚡PARRY COUNTER -2HP!!");
          nj.thrownShurikens.splice(i, 1);
          continue;
        }
      } else {
        let clashedBall = false;
        for (const ball of state.balls) {
          if (ball.inShooterLane || ball._onWireRamp) continue;
          const d = Math.hypot(ball.x - sh.x, ball.y - sh.y);
          if (d < ball.r + sh.r + 3) {
            clashedBall = true;
            if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
            Particles.add(state, sh.x, sh.y, "#00f5d4", 12, 4.0);
            Systems.addScore(state, 3500, sh.x, sh.y, "⚔️CLASH!");
            nj.thrownShurikens.splice(i, 1);
            break;
          }
        }
        if (clashedBall) continue;

        let parriedNow = false;
        for (let fi = 0; fi < flippers.length; fi++) {
          const f = flippers[fi];
          const fst = Physics.flipperState[fi];
          const tipX = f.px + Math.cos(fst.angle) * f.len;
          const tipY = f.py + Math.sin(fst.angle) * f.len;
          const cp = Physics.closestPointOnSeg(sh.x, sh.y, f.px, f.py, tipX, tipY);
          const dist = Math.hypot(sh.x - cp.x, sh.y - cp.y);
          if (dist < sh.r + 7.0) {
            const omega = Math.abs(fst.angle - fst.prevAngle) * 60;
            const pinKey = f.isLeft ? "flipperPinL" : "flipperPinR";
            const alreadyPinned = (state[pinKey] || 0) > 0;
            // ジャストスイング中（かつ未拘束）のみPARRY成立！ 上げっぱなしや静止パドルには手裏剣が突き刺さって振り幅1/3拘束！
            if (!alreadyPinned && (omega > 0.12 || (fst.justPressedTimer || 0) > 0)) {
              parriedNow = true;
            } else {
              state[pinKey] = 5;
              fst.pinShake = 10;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, cp.x, cp.y, "#b84dff", 14, 3.8);
              Particles.addPopup(state, cp.x, cp.y - 16, "📌拘束! 5回ガチャで解除!", "#ff2a9d", 0.96);
              nj.thrownShurikens.splice(i, 1);
            }
            break;
          }
        }

        if (parriedNow) {
          sh.parried = true;
          sh.dmg = state.phase === 3 ? 1 : 2;
          b.expression = "shock";
          b.expressionTimer = 30;
          if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
          state.shockwaves.push({ x: sh.x, y: sh.y, r: 5, maxR: 42, speed: 4.0, color: "#e6ff00", lineWidth: 2.8, alpha: 1.0 });
          Particles.add(state, sh.x, sh.y, "#e6ff00", 18, 5.2);
          Particles.addPopup(state, sh.x, sh.y - 14, "⚔️PARRY!!", "#e6ff00", 1.2);
          Systems.addScore(state, 9000, sh.x, sh.y, "⚔️PARRY!");
          Systems.addFever(state, 7);
          continue;
        }
      }

      if (sh.y > 655 || sh.y < 10 || sh.x < 10 || sh.x > 385) {
        nj.thrownShurikens.splice(i, 1);
      }
    }

    // 7. 胸・腰〜太ももの2段階ゴム膜スプリング更新
    if (b.chestArmorBroken) {
      StageCommon.stepSoftSpring(b.bustL, 0.15, 0.89, 8.4);
      StageCommon.stepSoftSpring(b.bustR, 0.15, 0.89, 8.4);
    } else {
      StageCommon.stepSoftSpring(b.bustL, 0.21, 0.86, 4.6);
      StageCommon.stepSoftSpring(b.bustR, 0.21, 0.86, 4.6);
    }
    StageCommon.stepSoftSpring(b.hipL, 0.18, 0.87, 6.4);
    StageCommon.stepSoftSpring(b.hipR, 0.18, 0.87, 6.4);

    [b.tekkoL, b.tekkoR, b.kneeL, b.kneeR, b.core, b.hairpinCore, ...b.waistSensors].forEach(t => {
      if (t.flash > 0) t.flash--;
    });
    if (b.subLogFlash > 0) b.subLogFlash--;

    if (b.animTick % 4 === 0) {
      this.updateStatusMonitor(state);
    }
  },

  checkCollisions(ball, state, engine, substep = 0) {
    const b = state.boss;
    if (!b || ball.inShooterLane) return;

    const SUBSTEPS = 6;

    // -----------------------------------------------------------------
    // A. 空中立体ワイヤーランプ滑走中のサブステップ進行
    // -----------------------------------------------------------------
    if (ball._onWireRamp) {
      const rs = ball._onWireRamp;
      rs.dist += rs.speed / SUBSTEPS;
      const samp = this.sampleRamp(rs.rampId, rs.dist);
      ball.x = samp.x;
      ball.y = samp.y;
      rs.elev = samp.elev;
      b.stoleWind = Math.max(b.stoleWind, 0.55);

      if (substep === 0) {
        rs.tick = (rs.tick || 0) + 1;
        if (rs.tick % 5 === 0 && window.sfx && window.sfx.rampRailTick) {
          window.sfx.rampRailTick(rs.tick / 5);
        }
        if (rs.tick % 2 === 0) {
          const rampDef = this.WIRE_RAMPS[rs.rampId];
          Particles.add(state, ball.x, ball.y, rampDef.color, 3, 2.2);
        }
        b.lanterns.forEach(lt => {
          if (!rs.visitedLanterns[lt.id] && Math.hypot(ball.x - lt.x, ball.y - lt.y) < lt.r + 18) {
            rs.visitedLanterns[lt.id] = true;
            this.lightLantern(state, lt, rs.rampId === "left" ? 1 : -1);
          }
        });
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

    if (substep === 0 && ball.y > 170 && ball.y < 460 && (ball.x < 145 || ball.x > 255)) {
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd > 4.5) b.stoleWind = Math.min(1.6, b.stoleWind + spd * 0.04);
    }

    // -----------------------------------------------------------------
    // B. 左右の立体ワイヤーランプ入口ゲート突入判定
    // -----------------------------------------------------------------
    if (!ball._rampExitCooldown && ball.vy < -2.5 && b.lastFlipActiveTimer > 0) {
      for (const rampKey of ["left", "right"]) {
        const rd = this.WIRE_RAMPS[rampKey];
        const dGate = Math.hypot(ball.x - rd.entryX, ball.y - rd.entryY);
        if (dGate < ball.r + rd.entryR) {
          const entrySpd = Math.max(9.2, Math.min(14.5, Math.hypot(ball.vx, ball.vy) * 1.18));
          ball._onWireRamp = {
            rampId: rampKey,
            dist: 2,
            speed: entrySpd,
            elev: 0.15,
            tick: 0,
            visitedLanterns: {}
          };
          ball.trail = [];
          if (window.sfx && window.sfx.rampEnter) window.sfx.rampEnter();
          state.shockwaves.push({ x: rd.entryX, y: rd.entryY, r: 6, maxR: 44, speed: 3.8, color: rd.color, lineWidth: 2.8, alpha: 1.0 });
          Systems.addScore(state, 5500, rd.entryX, rd.entryY - 12, `⚡${rd.name} IN!!`);
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

    // 1. 幻影分身ホログラム撃破判定
    b.ninjutsu.clones.forEach(cl => {
      if (!cl.active) return;
      const cy = cl.y + Math.sin(cl.phase) * 7;
      const proxy = { x: cl.x, y: cy, r: cl.r, flash: cl.flash };
      hitCircle("cl_" + cl.id, proxy, 8.8, 14, () => {
        cl.hp--;
        cl.flash = 18;
        Particles.add(state, cl.x, cy, cl.color, 16, 4.8);
        if (cl.hp <= 0) {
          cl.active = false;
          if (window.sfx) window.sfx.armorBreak();
          state.shockwaves.push({ x: cl.x, y: cy, r: 8, maxR: 62, speed: 4.5, color: cl.color, lineWidth: 3.2, alpha: 1.0 });
          Particles.add(state, cl.x, cy, "#e6ff00", 22, 5.8);
          Systems.addScore(state, 20000, cl.x, cy - 10, "💥BUNSHIN SHATTER!!");
          Systems.addFever(state, 10);
          if (state.phase === 3 && b.ninjutsu.clones.every(c => !c.active)) {
            b.ninjutsu.cloneCooldown = 480;
            Particles.addPopup(state, b.core.x, b.core.y - 16, "💥結界解除! CORE OPEN!!", "#e6ff00", 1.15);
          }
          if (b.lastFlipActiveTimer > 0) {
            b.ninjutsu.thrownShurikens.push({
              x: cl.x, y: cy, vx: 0, vy: -6, r: 13, rot: 0, parried: true, dmg: 1, color: "#e6ff00", trail: []
            });
          }
        } else {
          if (window.sfx) window.sfx.metalBumper();
          Systems.addScore(state, 4500, cl.x, cy - 10, `👥BUNSHIN HP:${cl.hp}`);
        }
      });
    });

    // 2. Phase 2〜3 秘奥義・夜桜風魔大車輪（ランプ入口高度を左右パトロールし、下からの打ち上げショットを叩き落とす＆落下球に横回転をかける！）
    if (b.giantFuma.active && (ball.hitCooldowns["giant_fuma"] || 0) === 0) {
      const gf = b.giantFuma;
      const dFuma = Math.hypot(ball.x - gf.x, ball.y - gf.y);
      if (dFuma < ball.r + gf.r) {
        ball.hitCooldowns["giant_fuma"] = 14;
        gf.flash = 16;
        const spinKick = (gf.vx >= 0 ? 1 : -1) * 2.6;
        if (ball.vy < 0) {
          // 下からの打ち上げショット：回転刃で弾き落としてブロック！
          ball.y = gf.y + gf.r + ball.r + 1.5;
          ball.vy = Math.max(5.4, Math.abs(ball.vy) * 0.88);
          ball.vx = Math.max(-9.5, Math.min(9.5, ball.vx * 0.75 + spinKick));
          Systems.addScore(state, 3500, gf.x, gf.y - 16, "🌀FUMA BLOCK!");
        } else {
          // 上からの落下球：止めずに横スピンを加えて軌道を見切りにくくする！
          ball.vx = Math.max(-9.5, Math.min(9.5, ball.vx + spinKick));
          ball.vy = Math.max(4.5, ball.vy * 1.05);
        }
        if (window.sfx && window.sfx.fumaClash) window.sfx.fumaClash();
        state.shockwaves.push({ x: gf.x, y: gf.y, r: 10, maxR: 44, speed: 4.2, color: "#e6ff00", lineWidth: 2.4, alpha: 0.9 });
        Particles.add(state, ball.x, ball.y, "#e6ff00", 14, 4.8);
      }
    }

    // 3. 上段ワイヤー提灯バンパー 5基
    b.lanterns.forEach(lt => {
      const swingX = lt.x + Math.sin(lt.angle) * (lt.y - lt.cordY);
      const swingY = lt.cordY + Math.cos(lt.angle) * (lt.y - lt.cordY);
      const proxy = { x: swingX, y: swingY, r: lt.r, flash: lt.flash };
      if (hitCircle("lt_" + lt.id, proxy, 8.2, 14, () => {
        const impDir = ball.vx >= 0 ? 1 : -1;
        this.lightLantern(state, lt, impDir);
      })) {
        lt.flash = 20;
      }
    });

    // 4. 貫通型回転手裏剣スピナー（跳ね返りで難易度を下げない純粋スピナー！）
    b.spinners.forEach(sp => {
      const key = "sp_" + sp.id;
      if ((ball.hitCooldowns[key] || 0) > 0) return;
      const dx = ball.x - sp.x;
      const dy = ball.y - sp.y;
      const dist = Math.hypot(dx, dy);
      if (dist < ball.r + sp.r) {
        ball.hitCooldowns[key] = 14;
        const spinDir = sp.id === "spinL" ? 1 : -1;
        sp.omega = spinDir * Math.min(0.78, Math.abs(sp.omega) + 0.44);
        sp.flash = 18;
        if (window.sfx && window.sfx.spinnerTick) window.sfx.spinnerTick(2.2);
        Particles.add(state, sp.x, sp.y, "#00f5d4", 8, 3.4);
        Systems.addScore(state, 2500, sp.x, sp.y - 12, "🌀SPIN!");
      }
    });

    // 5. Phase 1 外装：左右のコテ角プレート ＆ 左右独立の膝当てアーマー
    [
      { key: "tekkoL", obj: b.tekkoL, title: "L-KOTE" },
      { key: "tekkoR", obj: b.tekkoR, title: "R-KOTE" },
      { key: "kneeL",  obj: b.kneeL,  title: "L-KNEE" },
      { key: "kneeR",  obj: b.kneeR,  title: "R-KNEE" }
    ].forEach(({ key, obj, title }) => {
      if (obj.broken) return;
      hitCircle(key, obj, 9.0, 16, () => {
        obj.hp = Math.max(0, obj.hp - 1);
        obj.flash = 18;
        if (!b.faceAnim.sequence) {
          b.expression = "wince";
          b.expressionTimer = 18;
        }
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, obj.x, obj.y, "#e6ff00", 14, 4.4);
        Systems.addScore(state, 3500, obj.x, obj.y - 10, `${title} HP:${obj.hp}`);
        Systems.addFever(state, 4);
        if (obj.hp === 0) {
          obj.broken = true;
          Particles.triggerArmorBreakEffect(state, "shoulder", obj.x, obj.y);
          Systems.addScore(state, 22000, obj.x, obj.y, `★${title} BROKEN!★`);
          Systems.dropReward(state, "minor", { x: obj.x, y: obj.y });
          this.setExpressionSequence(state, [
            { expr: "shock", frames: 22 },
            { expr: "wince", frames: 26 }
          ]);
          this.checkPhase1Clear(state);
        }
        UI.updateHUD(state);
      });
    });

    // 6. 胸部・忍装束スーツ（装着中も弾む揺れ -> 破壊後は晒し姿で大揺れ＋ハート！）
    [
      { key: "bustL", cup: b.bustL, other: b.bustR, side: "L" },
      { key: "bustR", cup: b.bustR, other: b.bustL, side: "R" }
    ].forEach(({ key, cup, other }) => {
      const bounce = b.chestArmorBroken ? 8.0 : 9.4;
      hitCircle(key, cup, bounce, 15, () => {
        const dxH = ball.x - cup.x;
        const dyH = ball.y - cup.y;
        const dL = Math.hypot(dxH, dyH) || 1;
        const impScale = b.chestArmorBroken ? 7.5 : 5.4;
        cup.vx += -(dxH / dL) * impScale;
        cup.vy += -(dyH / dL) * impScale - 1.2;
        other.vx += (dxH / dL) * (impScale * 0.48);
        other.vy += -(dyH / dL) * (impScale * 0.45);
        cup.flash = 18;

        if (!b.chestArmorBroken) {
          if (window.sfx) window.sfx.softPuru();
          if (state.phase >= 2) {
            b.chestArmorHP = Math.max(0, b.chestArmorHP - 1);
            b.blushGauge = Math.min(100, (b.blushGauge || 0) + 7);
            if (!b.faceAnim.sequence) {
              b.expression = b.chestArmorHP <= 4 ? "open_blush" : "wince";
              b.expressionTimer = 24;
            }
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, cup.x, cup.y, "#ff2a9d", 15, 4.6);
            Systems.addScore(state, 5000, cup.x, cup.y - 12, `SUIT HP:${b.chestArmorHP}`);
            Systems.addFever(state, 6);
            if (b.chestArmorHP <= 0) {
              this.breakChestSuit(state);
            }
          } else {
            Particles.add(state, cup.x, cup.y, "#00f5d4", 9, 3.4);
            Systems.addScore(state, 2000, cup.x, cup.y - 12, "🛡️SEAL GUARD");
          }
        } else {
          if (window.sfx) window.sfx.softPuru();
          b.bustExcitement = Math.min(100, (b.bustExcitement || 0) + 16);
          b.blushGauge = Math.min(100, (b.blushGauge || 0) + 12);
          if (!b.faceAnim.sequence) {
            b.expression = "open_blush";
            b.expressionTimer = 34;
          }
          Particles.spawnHeart(state, cup.x, cup.y - 8, false);
          Particles.add(state, cup.x, cup.y, "#ff66cc", 14, 4.0);
          Systems.addScore(state, 6500, cup.x, cup.y - 12, "♥SOFT BOUNCE!!");
          Systems.addFever(state, 5.5);
        }
        UI.updateHUD(state);
      });
    });

    // 7. 腰の四角いシアン回路センサー（ヒットでお尻〜太ももが連動して大きくぷるぷる！）
    b.waistSensors.forEach(sens => {
      const key = "sens_" + sens.id;
      if ((ball.hitCooldowns[key] || 0) > 0) return;
      if (Math.hypot(ball.x - sens.x, ball.y - sens.y) < ball.r + sens.r) {
        ball.hitCooldowns[key] = 22;
        sens.flash = 18;
        const mainHip = sens.side === "L" ? b.hipL : b.hipR;
        const subHip = sens.side === "L" ? b.hipR : b.hipL;
        const dir = sens.side === "L" ? -1 : 1;
        mainHip.vx += dir * 6.8;
        mainHip.vy -= 6.2;
        subHip.vx -= dir * 3.8;
        subHip.vy -= 3.4;
        b.blushGauge = Math.min(100, (b.blushGauge || 0) + 6);
        if (!b.faceAnim.sequence && b.expression === "normal") {
          b.expression = "open_blush";
          b.expressionTimer = 24;
        }
        Particles.spawnHeart(state, sens.x, sens.y - 6, true);
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, sens.x, sens.y, "#00f5d4", 10, 3.4);
        Systems.addScore(state, 3500, sens.x, sens.y - 10, `⚡${sens.label}`);
        Systems.addFever(state, 3.5);
      }
    });

    // 8. Phase 3 最終コア：首元の羽衣チャクラ核 ＆ 頭頂の電脳水引（分身生存中は変わり身結界で保護！）
    hitCircle("chakra_core", b.core, 9.8, 16, () => {
      b.core.flash = 22;
      b.stoleWind = Math.max(b.stoleWind, 1.3);
      if (state.phase >= 3 && b.core.unlocked && !this.isCoreShieldedByBunshin(state)) {
        b.core.hp = Math.max(0, b.core.hp - 1);
        b.expression = "wince";
        b.expressionTimer = 28;
        if (window.sfx) window.sfx.exSpark();
        state.shockwaves.push({ x: b.core.x, y: b.core.y, r: 6, maxR: 50, speed: 4.2, color: "#00f5d4", lineWidth: 2.8, alpha: 1.0 });
        Particles.add(state, b.core.x, b.core.y, "#00f5d4", 20, 5.4);
        Systems.addScore(state, 9000, b.core.x, b.core.y - 14, `💎CORE HP:${b.core.hp}`);
        Systems.addFever(state, 8);
        if (b.core.hp <= 0) {
          this.triggerStageClear(state);
        }
      } else {
        if (window.sfx) window.sfx.slingshot();
        const msg = state.phase >= 3 ? "🛡️分身結界！分身を倒せ！" : "🔒CHAKRA BARRIER";
        Systems.addScore(state, 2200, b.core.x, b.core.y - 12, msg);
      }
      UI.updateHUD(state);
    });

    hitCircle("hairpin_core", b.hairpinCore, 9.6, 18, () => {
      b.hairpinCore.flash = 22;
      if (state.phase >= 3 && b.core.unlocked && !this.isCoreShieldedByBunshin(state)) {
        b.core.hp = Math.max(0, b.core.hp - 2);
        b.core.flash = 22;
        this.setExpressionSequence(state, [
          { expr: "shock", frames: 20 },
          { expr: "wince", frames: 26 }
        ]);
        if (window.sfx) window.sfx.exSpark();
        state.shockwaves.push({ x: b.hairpinCore.x, y: b.hairpinCore.y, r: 8, maxR: 60, speed: 4.5, color: "#e6ff00", lineWidth: 3.2, alpha: 1.0 });
        Particles.add(state, b.hairpinCore.x, b.hairpinCore.y, "#e6ff00", 22, 5.8);
        Systems.addScore(state, 18000, b.hairpinCore.x, b.hairpinCore.y - 12, `⚡CRITICAL -2HP! (残${b.core.hp})`);
        Systems.addFever(state, 10);
        if (b.core.hp <= 0) {
          this.triggerStageClear(state);
        }
      } else {
        if (window.sfx) window.sfx.metalBumper();
        const msg = state.phase >= 3 ? "🛡️分身結界中！" : "✨KAMI-KAZARI BONUS!";
        Systems.addScore(state, 4200, b.hairpinCore.x, b.hairpinCore.y - 10, msg);
        Systems.addFever(state, 4);
      }
      UI.updateHUD(state);
    });

    // 9. 提灯コンボ報酬：センタードレイン上の「変わり身の丸太」一時セーブポスト
    if (b.subLogHP > 0) {
      const logTarget = { x: 198, y: 612, r: 13 };
      hitCircle("sub_log", logTarget, 9.5, 16, () => {
        ball.vy = -Math.abs(ball.vy) - 4.4;
        b.subLogHP--;
        b.subLogFlash = 22;
        b.sakuraStormTimer = Math.max(b.sakuraStormTimer, 90);
        if (window.sfx) window.sfx.armorBreak();
        Particles.add(state, 198, 612, "#ffb7dd", 18, 4.8);
        Particles.addPopup(state, 198, 592, b.subLogHP > 0 ? `🪵KAWARIMI SAVE! (残${b.subLogHP})` : "🪵KAWARIMI VANISHED!", "#e6ff00", 1.05);
      });
    }
  },

  // -------------------------------------------------------------------------
  // オフスクリーン画像・スプライトキャッシュ ＆ RGBAゴム膜ワープ
  // -------------------------------------------------------------------------
  bakeLanternCanvas(lt, mode) {
    const isLit = mode === "lit" || mode === "strobe" || mode === "flash";
    const isFlash = mode === "flash";
    const isStrobe = mode === "strobe";
    const mainCol = isStrobe ? "#e6ff00" : (isFlash ? "#ffffff" : lt.color);
    const dropLen = lt.y - lt.cordY;
    const w = Math.ceil(lt.rx * 3 + 12);
    const h = Math.ceil(dropLen + lt.ry + lt.tassel + 24);
    const anchorX = Math.round(w / 2);
    const anchorY = 4;

    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d");

    // 吊り下げワイヤー
    cx.strokeStyle = mainCol;
    cx.globalAlpha = 0.85;
    cx.lineWidth = 1.5;
    cx.beginPath();
    cx.moveTo(anchorX, anchorY);
    cx.lineTo(anchorX, anchorY + dropLen - lt.ry - 4);
    cx.stroke();

    cx.save();
    cx.translate(anchorX, anchorY + dropLen);

    // ネオン発光オーラ
    const auraRadius = Math.max(lt.rx, lt.ry) * (isLit ? 1.35 : 0.95);
    const grad = cx.createRadialGradient(0, 0, 2, 0, 0, auraRadius);
    if (isLit) {
      grad.addColorStop(0, isFlash ? "rgba(255,255,255,0.95)" : "rgba(255,250,210,0.85)");
      grad.addColorStop(0.45, isFlash ? "rgba(255,255,255,0.6)" : `${mainCol}99`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
    } else {
      grad.addColorStop(0, `${mainCol}40`);
      grad.addColorStop(1, "rgba(0,0,0,0)");
    }
    cx.globalAlpha = 1.0;
    cx.fillStyle = grad;
    cx.beginPath();
    cx.ellipse(0, 0, lt.rx * 1.35, lt.ry * 1.2, 0, 0, Math.PI * 2);
    cx.fill();

    // 提灯枠
    const alphaWire = isLit ? 1.0 : 0.72;
    cx.globalAlpha = alphaWire;
    cx.strokeStyle = isFlash ? "#ffffff" : mainCol;
    cx.lineWidth = 1.5;
    cx.strokeRect(-lt.rx * 0.42, -lt.ry - 3, lt.rx * 0.84, 3.5);
    cx.strokeRect(-lt.rx * 0.42, lt.ry - 0.5, lt.rx * 0.84, 3.5);

    // 縦リブ骨組み
    const vRibs = [-0.72, -0.36, 0, 0.36, 0.72, 1.0];
    vRibs.forEach(f => {
      cx.beginPath();
      cx.ellipse(0, 0, Math.max(1.5, lt.rx * Math.abs(f)), lt.ry, 0, 0, Math.PI * 2);
      cx.lineWidth = Math.abs(f) === 1.0 ? 1.8 : 0.95;
      cx.stroke();
    });

    // 横リブ骨組み
    const hSteps = Math.max(5, Math.round(lt.ry / 5.5));
    for (let i = -hSteps + 1; i <= hSteps - 1; i++) {
      const ny = i / hSteps;
      const halfW = lt.rx * Math.sqrt(Math.max(0, 1 - ny * ny));
      cx.beginPath();
      cx.ellipse(0, ny * lt.ry, halfW, Math.max(1.5, halfW * 0.16), 0, 0, Math.PI * 2);
      cx.lineWidth = 0.9;
      cx.stroke();
    }

    // 漢字紋章
    cx.font = `bold ${Math.round(lt.rx * 0.78)}px sans-serif`;
    cx.textAlign = "center";
    cx.textBaseline = "middle";
    cx.fillStyle = isLit ? "#ffffff" : mainCol;
    cx.globalAlpha = isLit ? 0.95 : 0.70;
    cx.fillText(lt.kanji, 0, 1);

    // 房（タッセル）
    cx.globalAlpha = alphaWire;
    cx.beginPath();
    cx.moveTo(0, lt.ry + 3);
    cx.lineTo(0, lt.ry + 3 + lt.tassel);
    cx.moveTo(-2.5, lt.ry + 7);
    cx.lineTo(-2.5, lt.ry + 3 + lt.tassel * 0.9);
    cx.moveTo(2.5, lt.ry + 7);
    cx.lineTo(2.5, lt.ry + 3 + lt.tassel * 0.9);
    cx.lineWidth = 1.2;
    cx.stroke();

    cx.restore();
    return c;
  },

  bakeBunshinCanvas(color, charSealBroken) {
    const W = 96;
    const H = 108;
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const cx = c.getContext("2d");

    const anchorX = 48;
    const anchorY = 50;

    cx.save();
    cx.translate(anchorX, anchorY);

    // オーラ
    const aura = cx.createRadialGradient(0, 0, 4, 0, 0, 44);
    aura.addColorStop(0, `${color}66`);
    aura.addColorStop(0.6, `${color}22`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    cx.fillStyle = aura;
    cx.beginPath();
    cx.arc(0, 0, 44, 0, Math.PI * 2);
    cx.fill();

    // スキャンラインスライスミニチュア
    if (charSealBroken && charSealBroken.canvas) {
      const srcC = charSealBroken.canvas;
      for (let sy = 55; sy < 305; sy += 4) {
        const destY = -44 + (sy - 55) * 0.36;
        const sliceShift = Math.sin(sy * 0.2) * 1.2;
        cx.drawImage(srcC, 90, sy, 184, 3, -33 + sliceShift, destY, 66, 1.2);
      }
    }
    cx.restore();

    return { canvas: c, anchorX, anchorY };
  },

  ensureStageCanvases(IMG_BOX) {
    const W = IMG_BOX.w;
    const H = IMG_BOX.h;
    if (this._srcCache && this._srcCache.w === W && this._srcCache.h === H) {
      return this._srcCache;
    }
    if (
      !this.assets.charBodyImg.complete ||
      !this.assets.charBodyImg.naturalWidth ||
      !this.assets.charSealBrokenImg.complete ||
      !this.assets.charSealBrokenImg.naturalWidth ||
      !this.assets.charSuitBrokenImg.complete ||
      !this.assets.charSuitBrokenImg.naturalWidth ||
      !this.assets.greavesBrokenImg.complete ||
      !this.assets.stoleBackImg.complete ||
      !this.assets.stoleFrontImg.complete
    ) {
      return null;
    }

    const splitSrcX = 386; // 原画768幅における左脚/右脚の境界X
    const splitDstX = Math.round((splitSrcX / 768) * W);

    const makeBodyVariant = (brkL, brkR) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const cx = c.getContext("2d");
      cx.drawImage(this.assets.charBodyImg, 0, 0, W, H);
      if (this.assets.greavesBrokenImg.naturalWidth) {
        if (brkL) {
          cx.drawImage(this.assets.greavesBrokenImg, 0, 0, splitSrcX, 1376, 0, 0, splitDstX, H);
        }
        if (brkR) {
          cx.drawImage(this.assets.greavesBrokenImg, splitSrcX, 0, 768 - splitSrcX, 1376, splitDstX, 0, W - splitDstX, H);
        }
      }
      return { canvas: c, ctx: cx, w: W, h: H, data: cx.getImageData(0, 0, W, H).data };
    };

    const makeScaled = (img) => {
      const c = document.createElement("canvas");
      c.width = W;
      c.height = H;
      const cx = c.getContext("2d");
      cx.drawImage(img, 0, 0, W, H);
      return { canvas: c, ctx: cx, w: W, h: H, data: cx.getImageData(0, 0, W, H).data };
    };

    const charIntact_00 = makeBodyVariant(false, false);
    const charIntact_10 = makeBodyVariant(true, false);
    const charIntact_01 = makeBodyVariant(false, true);
    const charIntact_11 = makeBodyVariant(true, true);
    const charSealBroken = makeScaled(this.assets.charSealBrokenImg);
    const charSuitBroken = makeScaled(this.assets.charSuitBrokenImg);
    const stoleBackScaled = makeScaled(this.assets.stoleBackImg);
    const stoleFrontScaled = makeScaled(this.assets.stoleFrontImg);

    // 提灯スプライトの事前レンダリング (5基分 × 4バリエーション)
    const lanternSprites = {};
    for (const lt of this.LANTERN_DEFS) {
      const dropLen = lt.y - lt.cordY;
      const w = Math.ceil(lt.rx * 3 + 12);
      const h = Math.ceil(dropLen + lt.ry + lt.tassel + 24);
      const anchorX = Math.round(w / 2);
      const anchorY = 4;
      lanternSprites[lt.id] = {
        anchorX,
        anchorY,
        unlit: this.bakeLanternCanvas(lt, "unlit"),
        lit: this.bakeLanternCanvas(lt, "lit"),
        strobe: this.bakeLanternCanvas(lt, "strobe"),
        flash: this.bakeLanternCanvas(lt, "flash")
      };
    }

    // 幻影分身ホログラムスプライトの事前レンダリング
    const bunshinSprites = {
      cloneL: this.bakeBunshinCanvas("#00f5d4", charSealBroken),
      cloneR: this.bakeBunshinCanvas("#ff2a9d", charSealBroken)
    };

    // ワイヤーランプレールの静的オフスクリーン事前ベイク
    this.ensureRampCanvases();

    this._srcCache = {
      w: W,
      h: H,
      charIntact_00,
      charIntact_10,
      charIntact_01,
      charIntact_11,
      charSealBroken,
      charSuitBroken,
      stoleBackScaled,
      stoleFrontScaled,
      lanternSprites,
      bunshinSprites,
      warpSlots: {}
    };
    return this._srcCache;
  },

  ensureRampCanvases() {
    if (this._rampStaticCanvas && this._rampUpperCanvas) return;
    this.sampleRamp("left", 0);
    const GAUGE = 7.6;
    const W = 420, H = 660;

    // 1. 静的ベースレール ＋ ドロップシャドウ
    const staticC = document.createElement("canvas");
    staticC.width = W;
    staticC.height = H;
    const sctx = staticC.getContext("2d");

    // 2. 静的上部リングアーチ
    const upperC = document.createElement("canvas");
    upperC.width = W;
    upperC.height = H;
    const uctx = upperC.getContext("2d");

    for (const rampKey of ["left", "right"]) {
      const rd = this.WIRE_RAMPS[rampKey];
      const pts = this._rampMetrics[rampKey].smoothPts;
      const totalLen = this._rampMetrics[rampKey].totalLen;

      // ドロップシャドウ
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

      // 左右ベースレール（半透明外枠グロー ＋ 内側シャープ線）
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

      // 上部リングアーチ
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

  getActiveCharBuffer(cache, boss) {
    if (boss.chestArmorBroken) {
      return cache.charSuitBroken;
    } else if (boss.sealBroken) {
      return cache.charSealBroken;
    } else {
      const kl = boss.kneeL && boss.kneeL.broken;
      const kr = boss.kneeR && boss.kneeR.broken;
      return (kl && kr) ? cache.charIntact_11 : (kl ? cache.charIntact_10 : (kr ? cache.charIntact_01 : cache.charIntact_00));
    }
  },

  drawRasterStole(ctx, stoleCanvas, IMG_BOX, boss, isFront) {
    const W = IMG_BOX.w;
    const H = IMG_BOX.h;
    const tick = boss.animTick || 0;
    const wind = boss.stoleWind || 0;
    const baseAmp = 3.6 + wind * 3.8;
    const speed = 0.08 + wind * 0.048;

    const yStart = isFront ? 214 : 164;
    const yEnd = Math.min(H, isFront ? 436 : 466);
    const stripH = 4;

    ctx.save();
    ctx.globalAlpha = isFront ? 0.92 : 0.96;
    for (let sy = yStart; sy < yEnd; sy += stripH) {
      let anchorWeight = 1.0;
      if (sy < 236) {
        anchorWeight = Math.max(0.08, (sy - 185) / 52);
      } else if (sy > 290) {
        anchorWeight = 1.0 + Math.min(0.68, (sy - 290) / 170);
      }
      const wave1 = Math.sin(sy * 0.078 - tick * speed);
      const wave2 = Math.sin(sy * 0.165 + tick * speed * 1.35) * 0.40;
      const dx = (wave1 + wave2) * baseAmp * anchorWeight;
      ctx.drawImage(
        stoleCanvas,
        0, sy, W, stripH,
        IMG_BOX.x + dx, IMG_BOX.y + sy, W, stripH
      );
    }
    ctx.restore();
  },

  drawWarpedCharacter(ctx, cache, IMG_BOX, boss) {
    const activeChar = this.getActiveCharBuffer(cache, boss);
    StageCommon.renderSoftWarp(ctx, IMG_BOX, activeChar, [boss.bustL, boss.bustR, boss.hipL, boss.hipR], {
      slotStore: cache.warpSlots,
      slotName: "char",
      reach: 1.32,
      minDisp: 0.08,
      rgba: true,
      shear: false
    });
  },

  drawBunshinHologram(ctx, cacheOrCl, clOrTick, animTickOrUndefined) {
    let cache, cl, animTick;
    if (cacheOrCl && cacheOrCl.phase !== undefined) {
      cache = this._srcCache;
      cl = cacheOrCl;
      animTick = clOrTick;
    } else {
      cache = cacheOrCl;
      cl = clOrTick;
      animTick = animTickOrUndefined;
    }
    const sp = cache && cache.bunshinSprites && cache.bunshinSprites[cl.id];
    if (!sp) return;
    const cy = cl.y + Math.sin(cl.phase) * 7;
    const glitchX = (animTick % 17 === 0) ? (Math.random() - 0.5) * 5 : 0;
    ctx.save();
    ctx.translate(cl.x + glitchX, cy);
    ctx.globalAlpha = cl.flash > 0 ? 0.95 : (0.58 + 0.16 * Math.sin(animTick * 0.25));
    ctx.drawImage(sp.canvas, -sp.anchorX, -sp.anchorY);
    if (cl.flash > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  },

  drawWireLantern(ctx, cacheOrLt, ltOrCeleb, celebrationOrTick, animTickOrUndefined) {
    let cache, lt, celebration, animTick;
    if (cacheOrLt && cacheOrLt.cordX !== undefined) {
      cache = this._srcCache;
      lt = cacheOrLt;
      celebration = ltOrCeleb;
      animTick = celebrationOrTick;
    } else {
      cache = cacheOrLt;
      lt = ltOrCeleb;
      celebration = celebrationOrTick;
      animTick = animTickOrUndefined;
    }
    const spObj = cache && cache.lanternSprites && cache.lanternSprites[lt.id];
    if (!spObj) return;
    const isStrobe = celebration > 0 && Math.floor(celebration / 4) % 2 === 0;
    const sprite = lt.flash > 0 ? spObj.flash : (isStrobe ? spObj.strobe : (lt.lit ? spObj.lit : spObj.unlit));

    ctx.save();
    ctx.translate(lt.cordX, lt.cordY);
    ctx.rotate(lt.angle);
    ctx.drawImage(sprite, -spObj.anchorX, -spObj.anchorY);
    ctx.restore();
  },

  drawSakuraPetal(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.hitCooldown > 20 ? "#ffffff" : p.tint;
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.bezierCurveTo(-s * 0.95, s * 0.35, -s * 0.85, -s * 0.8, -s * 0.22, -s);
    ctx.lineTo(0, -s * 0.55);
    ctx.lineTo(s * 0.22, -s);
    ctx.bezierCurveTo(s * 0.85, -s * 0.8, s * 0.95, s * 0.35, 0, s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  getShurikenSprite(r, mainCol, coreCol = "#ffffff", glow = false) {
    if (!this._shurikenCache) this._shurikenCache = {};
    const key = `${Math.round(r)}|${mainCol}|${coreCol}|${glow ? 1 : 0}`;
    if (this._shurikenCache[key]) return this._shurikenCache[key];

    const pad = glow ? 12 : 3;
    const rad = Math.round(r);
    const dim = (rad + pad) * 2;
    const half = dim / 2;

    const c = document.createElement("canvas");
    c.width = dim;
    c.height = dim;
    const cx = c.getContext("2d");

    cx.translate(half, half);

    // 外枠グロー（事前ベイク）
    if (glow) {
      cx.strokeStyle = mainCol;
      cx.globalAlpha = 0.38;
      cx.lineWidth = 5.0;
      cx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        const aMid = a + Math.PI / 4;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        const mx = Math.cos(aMid) * (rad * 0.34);
        const my = Math.sin(aMid) * (rad * 0.34);
        if (i === 0) cx.moveTo(px, py);
        else cx.lineTo(px, py);
        cx.lineTo(mx, my);
      }
      cx.closePath();
      cx.stroke();
    }

    cx.globalAlpha = 1.0;
    cx.fillStyle = mainCol;
    cx.strokeStyle = "#ffffff";
    cx.lineWidth = 1.5;
    cx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const aMid = a + Math.PI / 4;
      const px = Math.cos(a) * rad;
      const py = Math.sin(a) * rad;
      const mx = Math.cos(aMid) * (rad * 0.34);
      const my = Math.sin(aMid) * (rad * 0.34);
      if (i === 0) cx.moveTo(px, py);
      else cx.lineTo(px, py);
      cx.lineTo(mx, my);
    }
    cx.closePath();
    cx.fill();
    cx.stroke();

    cx.fillStyle = "#0b0420";
    cx.strokeStyle = coreCol;
    cx.lineWidth = 1.4;
    cx.beginPath();
    cx.arc(0, 0, rad * 0.25, 0, Math.PI * 2);
    cx.fill();
    cx.stroke();

    const entry = { canvas: c, half };
    this._shurikenCache[key] = entry;
    return entry;
  },

  drawShurikenSprite(ctx, x, y, r, rot, mainCol, coreCol = "#ffffff", glow = false) {
    const sp = this.getShurikenSprite(r, mainCol, coreCol, glow);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(sp.canvas, -sp.half, -sp.half);
    ctx.restore();
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };
    const b = state.boss;

    if (!this.assets.loaded || !this.assets.bgAlleyImg.complete) {
      ctx.fillStyle = "#040218";
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

    // 1. クリーン路地背景 ＋ 電脳夜桜ネオンホライゾン発光
    ctx.drawImage(this.assets.bgAlleyImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    if (b) {
      const horizonPulse = 0.20 + 0.08 * Math.sin(b.animTick * 0.05) + (state.fever.active || b.sakuraStormTimer > 0 ? 0.16 : 0);
      const bgGlow = ctx.createRadialGradient(198, 285, 25, 198, 285, 275);
      bgGlow.addColorStop(0, `rgba(255, 42, 157, ${horizonPulse.toFixed(2)})`);
      bgGlow.addColorStop(0.55, `rgba(110, 20, 210, ${(horizonPulse * 0.65).toFixed(2)})`);
      bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = bgGlow;
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

      // 2. 奥レイヤーの夜桜吹雪
      b.backPetals.forEach(p => this.drawSakuraPetal(ctx, p));

      // 3. 上段ネオンワイヤー提灯 5基
      const cache = this.ensureStageCanvases(IMG_BOX);
      b.lanterns.forEach(lt => this.drawWireLantern(ctx, cache, lt, b.lanternCelebrationTimer, b.animTick));

      // 4. 幻影分身ホログラム投影 ＆ カスミ本体（ストール背面 -> ワープキャラ -> 表情 -> ストール前面）
      if (cache) {
        b.ninjutsu.clones.forEach(cl => {
          if (cl.active) this.drawBunshinHologram(ctx, cache, cl, b.animTick);
        });

        this.drawRasterStole(ctx, cache.stoleBackScaled.canvas, IMG_BOX, b, false);

        const activeChar = this.getActiveCharBuffer(cache, b);
        StageCommon.renderSoftWarp(ctx, IMG_BOX, activeChar, [b.bustL, b.bustR, b.hipL, b.hipR], {
          slotStore: cache.warpSlots,
          slotName: "char",
          reach: 1.32,
          minDisp: 0.08,
          rgba: true,
          shear: false
        });

        // 表情差分パッチ合成 (FACE_BOX: x=312, y=304, w=144, h=120)
        const activePatchKey = StageCommon.getActiveFacePatchKey(b, state, { defaultExpr: "normal", halfBlink: true });
        StageCommon.drawFacePatch(ctx, this.assets.facePatchImgs, activePatchKey, IMG_BOX, { x: 312, y: 304, w: 144, h: 120 });

        this.drawRasterStole(ctx, cache.stoleFrontScaled.canvas, IMG_BOX, b, true);
      } else if (this.assets.charBodyImg.complete) {
        ctx.drawImage(this.assets.charBodyImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      }
    }

    // クリア演出スモーククラウド
    StageCommon.renderSmokeClouds(ctx, state);

    ctx.restore();
  },

  // 立体ワイヤーランプ＋回転サイバー照準ガイド描画
  renderTargets(ctx, state, engine) {
    const b = state.boss;
    if (!b || (state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 45)) return;
    const animTick = b.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. 立体ワイヤーランプの下側ベースレール＋高速ネオンチェイサー矢印！
    this.renderWireRampRails(ctx, b, false);

    // 2. 貫通型回転手裏剣スピナー (L / R) — バウンス円ガイドは出さず、手裏剣ブレード自体がシャープに回転発光！
    b.spinners.forEach(sp => {
      const col = sp.flash > 0 ? "#ffffff" : "#00f5d4";
      this.drawShurikenSprite(ctx, sp.x, sp.y, sp.r, sp.angle, col, "#ff2a9d", true);
      ctx.save();
      ctx.font = "bold 7.5px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.0;
      ctx.strokeText("SPIN", sp.x, sp.y + sp.r + 9);
      ctx.fillStyle = "#00f5d4";
      ctx.fillText("SPIN", sp.x, sp.y + sp.r + 9);
      ctx.restore();
    });

    // 3. 幻影分身ホログラムのサイバーターゲットガイド
    b.ninjutsu.clones.forEach(cl => {
      if (!cl.active) return;
      const cy = cl.y + Math.sin(cl.phase) * 7;
      drawGuide(cl.x, cy, cl.r, cl.color, cl.flash, animTick * 0.04, cl.label, `HP:${cl.hp}/${cl.maxHP}`);
    });

    // 4. Phase 1: 左右コテの四角プレート ＆ 左右独立の膝当てアーマー（紫ではなく視認性抜群のネオンイエロー照準！）
    if (!b.tekkoL.broken) {
      drawGuide(b.tekkoL.x, b.tekkoL.y, b.tekkoL.r, "#e6ff00", b.tekkoL.flash, -animTick * 0.025, "L-KOTE", `HP:${b.tekkoL.hp}/${b.tekkoL.maxHP}`);
    }
    if (!b.tekkoR.broken) {
      drawGuide(b.tekkoR.x, b.tekkoR.y, b.tekkoR.r, "#e6ff00", b.tekkoR.flash, animTick * 0.025, "R-KOTE", `HP:${b.tekkoR.hp}/${b.tekkoR.maxHP}`);
    }
    if (!b.kneeL.broken) {
      drawGuide(b.kneeL.x, b.kneeL.y, b.kneeL.r, "#e6ff00", b.kneeL.flash, -animTick * 0.02, "L-KNEE", `HP:${b.kneeL.hp}/${b.kneeL.maxHP}`);
    }
    if (!b.kneeR.broken) {
      drawGuide(b.kneeR.x, b.kneeR.y, b.kneeR.r, "#e6ff00", b.kneeR.flash, animTick * 0.02, "R-KNEE", `HP:${b.kneeR.hp}/${b.kneeR.maxHP}`);
    }

    // 5. Phase 2: 胸部・忍装束スーツ / パージ後のソフトバウンスガイド
    if (!b.chestArmorBroken) {
      const lx = b.bustL.x + b.bustL.dx * 0.25;
      const ly = b.bustL.y + b.bustL.dy * 0.25;
      const rx = b.bustR.x + b.bustR.dx * 0.25;
      const ry = b.bustR.y + b.bustR.dy * 0.25;
      if (state.phase < 2) {
        drawGuide(lx, ly, b.bustL.r, "#00f5d4", b.bustL.flash, -animTick * 0.015, "L-SUIT", "🛡️SEALED");
        drawGuide(rx, ry, b.bustR.r, "#00f5d4", b.bustR.flash, animTick * 0.015, "R-SUIT", "🛡️SEALED");
      } else {
        drawGuide(lx, ly, b.bustL.r, "#ff2a9d", b.bustL.flash, -animTick * 0.03, "L-SUIT", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
        drawGuide(rx, ry, b.bustR.r, "#ff2a9d", b.bustR.flash, animTick * 0.03, "R-SUIT", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
      }
    } else {
      const bustCol = state.fever.active ? "#e6ff00" : "#ff66cc";
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx * 0.25, b.bustL.y + b.bustL.dy * 0.25, b.bustL.r, bustCol, b.bustL.flash, null, "♥SOFT");
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx * 0.25, b.bustR.y + b.bustR.dy * 0.25, b.bustR.r, bustCol, b.bustR.flash, null, "♥SOFT");
    }

    // 6. Phase 3: 首元の羽衣チャクラ核 ＆ 頭頂水引クリティカルサブコア（分身生存中は六角結界表示！）
    if (state.phase >= 3 && b.core.unlocked) {
      if (this.isCoreShieldedByBunshin(state)) {
        drawGuide(b.core.x, b.core.y, b.core.r, "#00f5d4", b.core.flash, -animTick * 0.02, "CHAKRA CORE", "🛡️分身結界");
      } else {
        drawGuide(b.core.x, b.core.y, b.core.r, "#e6ff00", b.core.flash, animTick * 0.045, "★CHAKRA CORE★", `HP:${b.core.hp}/${b.core.maxHP}`);
        drawGuide(b.hairpinCore.x, b.hairpinCore.y, b.hairpinCore.r, "#00f5d4", b.hairpinCore.flash, -animTick * 0.04, "KAMI-KAZARI", "CRIT ×2!");
      }
    }

    // 7. Phase 2〜3 秘奥義・夜桜風魔大車輪（左右ランプ入口を結ぶシアン破線レール上を旋回！）
    if (b.giantFuma.active) {
      const gf = b.giantFuma;
      ctx.save();
      ctx.strokeStyle = "rgba(255, 42, 157, 0.28)";
      ctx.lineWidth = 1.4;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(62, gf.y);
      ctx.lineTo(334, gf.y);
      ctx.stroke();

      ctx.strokeStyle = gf.flash > 0 ? "#ffffff" : (state.phase >= 3 ? "#e6ff00" : "#ff2a9d");
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(gf.x, gf.y, gf.r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      this.drawShurikenSprite(ctx, gf.x, gf.y, gf.r, gf.rot, gf.flash > 0 ? "#ffffff" : "#ff2a9d", "#e6ff00", true);
      this.drawShurikenSprite(ctx, gf.x, gf.y, gf.r * 0.72, -gf.rot * 1.4, state.phase >= 3 ? "#e6ff00" : "#00f5d4", "#ffffff", false);
    }

    // 8. 腰の四角いシアン回路センサー（原画の四角いシアン端子に合わせたシャープなダイヤ／スクエア枠！太ももマークは無し！）
    b.waistSensors.forEach(sens => {
      const pulse = Particles.guidePulse(animTick);
      const half = sens.r * 0.78 * pulse;
      ctx.save();
      ctx.translate(sens.x, sens.y);
      ctx.strokeStyle = sens.flash > 0 ? "#ffffff" : "#00f5d4";
      ctx.globalAlpha = sens.flash > 0 ? 1.0 : 0.78;
      ctx.lineWidth = sens.flash > 0 ? 2.4 : 1.5;
      ctx.strokeRect(-half, -half, half * 2, half * 2);
      ctx.restore();
    });

    // 9. 忍法・大九字魔法陣チャージ ＆ パドルへのレーザー予測照準線 ＆ 巨大発光手裏剣斉射！
    const nj = b.ninjutsu;
    if (nj.mode === "seal_charge") {
      const kanjis = ["臨", "兵", "闘", "者", "皆", "陣"];
      const prog = 1 - nj.timer / 46;
      const sealR = 24 + (1 - prog) * 62;

      ctx.save();
      nj.aimTargets.forEach(aim => {
        ctx.strokeStyle = nj.timer < 14 ? "#e6ff00" : aim.color;
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = nj.timer < 14 ? 2.4 : 1.5;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -(animTick * 2.2);
        ctx.beginPath();
        ctx.moveTo(aim.sx, aim.sy);
        ctx.lineTo(aim.ax, aim.ay);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      ctx.translate(198, 258);
      ctx.rotate(animTick * 0.06);

      // 高速外枠グローストローク
      ctx.save();
      ctx.strokeStyle = "#ff2a9d";
      ctx.globalAlpha = 0.30;
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.arc(0, 0, sealR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = "#ff2a9d";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, sealR, 0, Math.PI * 2);
      ctx.stroke();

      for (let tri = 0; tri < 2; tri++) {
        ctx.strokeStyle = tri === 0 ? "#00f5d4" : "#e6ff00";
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = tri * (Math.PI / 3) + k * ((Math.PI * 2) / 3);
          const px = Math.cos(a) * sealR * 0.92;
          const py = Math.sin(a) * sealR * 0.92;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.rotate(-animTick * 0.06);
      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(kanjis[nj.sealKanjiIdx], 0, 6);
      ctx.restore();
    }

    nj.thrownShurikens.forEach(sh => {
      const mainCol = sh.parried ? "#e6ff00" : (sh.color || "#ff2a9d");
      for (let i = 0; i < sh.trail.length; i++) {
        const pt = sh.trail[i];
        ctx.save();
        ctx.globalAlpha = ((i + 1) / sh.trail.length) * 0.48;
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5 + (i / sh.trail.length) * 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      this.drawShurikenSprite(ctx, sh.x, sh.y, sh.r, sh.rot, mainCol, "#ffffff", true);
    });

    // 10. 提灯コンボ報酬：変わり身の丸太ポスト
    if (b.subLogHP > 0) {
      ctx.save();
      ctx.fillStyle = b.subLogFlash > 0 ? "#ffffff" : "#8b5a2b";
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(182, 605, 32, 14, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`丸太×${b.subLogHP}`, 198, 631);
      ctx.restore();
    }
  },

  renderWireRampRails(ctx, b, upperPass) {
    this.ensureRampCanvases();
    if (upperPass) {
      if (this._rampUpperCanvas) {
        ctx.drawImage(this._rampUpperCanvas, 0, 0);
      }
      return;
    }

    if (this._rampStaticCanvas) {
      ctx.drawImage(this._rampStaticCanvas, 0, 0);
    }

    // アニメーション付きチェイサー矢印 ＆ エントリーゲート
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

      const pulse = 0.65 + 0.35 * Math.sin(b.animTick * 0.16 + (rampKey === "left" ? 0 : 2));
      ctx.save();
      // 外枠グロー
      ctx.globalAlpha = pulse * 0.35;
      ctx.strokeStyle = rd.color;
      ctx.lineWidth = 6.0;
      ctx.beginPath();
      ctx.arc(rd.entryX, rd.entryY, rd.entryR - 2, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();

      // 内側シャープ線
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rd.entryX, rd.entryY, rd.entryR - 2, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();

      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 8.5px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▲SKYWAY", rd.entryX, rd.entryY + 19);
      ctx.restore();
    }
  },

  renderForeground(ctx, state, engine) {
    const b = state.boss;
    if (!b || (state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0)) return;
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };

    // 1. キャラより手前に降り注ぐ前景マトリックス 0/1 ストリーム（ボール接触中は白〜イエローに弾ける！）
    ctx.save();
    ctx.beginPath();
    ctx.rect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
    ctx.clip();
    ctx.font = "bold 9.5px monospace";
    ctx.textAlign = "center";
    const feverTint = state.fever.active || b.sakuraStormTimer > 0;
    b.matrixCols.forEach(col => {
      const isPink = feverTint || col.pink;
      for (let k = 0; k < col.len; k++) {
        const ht = col.hitTimers[k] || 0;
        // 弾かれた直後は一瞬弾けて消え、少し経つとフェード復帰
        if (ht > 14 && ht < 28) continue;
        const cy = col.y - k * 12;
        if (cy < 20 || cy > 654) continue;
        const isHead = k === 0;
        const fade = Math.max(0.18, 1 - k / col.len);
        if (ht >= 28) {
          ctx.fillStyle = "#e6ff00";
        } else if (isHead) {
          ctx.fillStyle = isPink ? "rgba(255, 235, 252, 0.95)" : "rgba(220, 255, 255, 0.95)";
        } else {
          ctx.fillStyle = isPink
            ? `rgba(255, 82, 195, ${(fade * 0.72).toFixed(2)})`
            : `rgba(0, 245, 220, ${(fade * 0.70).toFixed(2)})`;
        }
        ctx.fillText(col.chars[k], col.x, cy);
      }
    });
    ctx.restore();

    // 2. 立体ワイヤーランプ上を滑走中の高架ボール（高速外枠グロー ＋ 内側ボール）
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

    // 3. ワイヤーランプの上部リングアーチ
    this.renderWireRampRails(ctx, b, true);

    // 4. パドルに突き刺さった拘束手裏剣のビジュアル＆残り連打数表示（5回ガチャガチャで解除！）
    const flips = Physics.getFlippers(state);
    [
      { count: state.flipperPinL || 0, f: flips[0], st: Physics.flipperState[0] },
      { count: state.flipperPinR || 0, f: flips[1], st: Physics.flipperState[1] }
    ].forEach(({ count, f, st }) => {
      if (count <= 0) return;
      const shakeOff = (st.pinShake || 0) > 0 ? Math.sin(b.animTick * 1.8) * 3.0 : 0;
      const mx = f.px + Math.cos(st.angle) * (f.len * 0.55) + shakeOff;
      const my = f.py + Math.sin(st.angle) * (f.len * 0.55);
      this.drawShurikenSprite(ctx, mx, my - 3, 11.5, st.angle + 0.35 + shakeOff * 0.12, "#ff2a9d", "#e6ff00", true);
      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.strokeText(`連打×${count}`, mx, my - 17);
      ctx.fillStyle = "#e6ff00";
      ctx.fillText(`連打×${count}`, mx, my - 17);
      ctx.restore();
    });

    // 5. 全提灯点灯コンボ時の巨大「風魔手裏剣スラッシュ」演出
    if (b.fumaSlash) {
      const fs = b.fumaSlash;
      const t = Math.min(1, fs.progress);
      const cx = fs.sx + (fs.tx - fs.sx) * t;
      const cy = fs.sy + (fs.ty - fs.sy) * t;
      ctx.save();
      // 外枠グローストローク
      ctx.strokeStyle = "#e6ff00";
      ctx.globalAlpha = 0.32;
      ctx.lineWidth = 11.0;
      ctx.beginPath();
      ctx.moveTo(fs.sx, fs.sy);
      ctx.lineTo(cx, cy);
      ctx.stroke();

      ctx.globalAlpha = 0.90;
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(fs.sx, fs.sy);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.restore();
      this.drawShurikenSprite(ctx, cx, cy, 34, fs.rot, "#00f5d4", "#ff2a9d", true);
    }

    // 6. 最前景を舞う夜桜吹雪
    b.frontPetals.forEach(p => this.drawSakuraPetal(ctx, p));
  }
};

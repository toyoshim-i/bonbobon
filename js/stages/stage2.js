// =========================================================================
// STAGE 2: CELTY (疾風紫電セルティ)
// =========================================================================

window.Stage2 = {
  id: "stage2",
  get name() { return t("stage2.name"); },
  get bossName() { return t("stage2.bossName"); },
  // 左足付け根装甲のお尻揺れ追従率。装甲は太もも（揺れない部位）に付いているので 0 で固定。
  // 0 以外にすると、スプライトの移動で下地の原画に残る装甲輪郭がはみ出し、黒い隙間として見える。
  HIP_FOLLOW: 0,

  assets: {
    armoredImg: null,
    bareImg: new Image(),
    defeatCgImg: new Image(),
    hologramImg: new Image(),
    hipJointImg: new Image(),
    gauntletLBrokenImg: new Image(),
    gauntletRBrokenImg: new Image(),
    nozzlesBrokenImg: new Image(),
    shoulderLBrokenImg: new Image(),
    antennaBrokenImg: new Image(),
    bustBrokenImg: new Image(),
    bodyDamageImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    if (this.assets._initialized) return;
    this.assets._initialized = true;
    const v = (window.StageCommon && StageCommon.ASSET_QUERY) || "?v=190";
    this.assets.bareImg.src = "./assets/stage2/centerpiece.jpg" + v;
    this.assets.armoredImg = this.assets.bareImg;
    this.assets.defeatCgImg.src = "./assets/stage2/defeat_cg.jpg" + v;
    this.assets.hipJointImg.src = "./assets/stage2/hip_joint.png" + v;
    this.assets.gauntletLBrokenImg.src = "./assets/stage2/gauntlet_l_broken.png" + v;
    this.assets.gauntletRBrokenImg.src = "./assets/stage2/gauntlet_r_broken.png" + v;
    this.assets.nozzlesBrokenImg.src = "./assets/stage2/nozzles_broken.png" + v;
    this.assets.shoulderLBrokenImg.src = "./assets/stage2/shoulder_l_broken.png" + v;
    this.assets.antennaBrokenImg.src = "./assets/stage2/antenna_broken.png" + v;
    this.assets.bustBrokenImg.src = "./assets/stage2/bust_broken.png" + v;
    this.assets.bodyDamageImg.src = "./assets/stage2/body_damage.png" + v;

    if (window.STAGE2_HOLOGRAM_DATA) {
      this.assets.hologramImg.src = window.STAGE2_HOLOGRAM_DATA;
    } else {
      this.assets.hologramImg.src = "./assets/stage2/hologram.png";
    }

    // 表情差分パッチ初期化（assets/stage2/faces/ ＋ STAGE2_FACE_PATCHES）
    this.assets.facePatchImgs = Systems.loadFacePatches("stage2", window.STAGE2_FACE_PATCHES,
      ["blink_half", "blink", "wink", "shout", "shock", "wince", "open_blush", "talk", "talk_sm"]);

    let count = 0;
    const check = () => {
      count++;
      if (count >= 1) this.assets.loaded = true;
    };
    this.assets.bareImg.onload = check;
  },

  // 表情アニメーションシーケンス開始ヘルパー
  createBossState() {
    const boss = {
      name: "セルティ",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 100,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,
      animTick: 0,

      // 1. カチューシャのアンテナ先端（周期電撃バリア ＆ 通過ゲート）
      // 原画 768x1376 の (625, 125) に正確に配置
      antenna: {
        x: 312,
        y: 75,
        r: 18,
        hp: 4,
        maxHP: 4,
        broken: false,
        timer: 0,
        cycle: 190,          // 190フレーム周期 (~3.1秒)
        activeDuration: 65,  // 放電時間
        warningDuration: 30, // 予兆警告時間
        flash: 0,
        isWarning: false,
        isActive: false
      },

      // 2. 左手奥のホログラム（内側の小さい丸を中心にしたエネルギー充填＆防衛レーザー砲）
      // 原画 768x1376 の (61, 392) に正確に配置（ホログラム内側の円形コア）
      hologram: {
        x: 45,
        y: 199,
        r: 22,
        hp: 6,
        maxHP: 6,
        broken: false,
        isShielded: true,
        glitchShift: 0,
        laserState: "idle",  // "idle" | "charge" | "fire"
        laserTimer: 0,
        cooldown: 200,       // 次の発射までの間隔
        beamAngle: Math.PI * 0.35, // 照準角度
        beamEndX: 420,
        beamEndY: 450,
        isLocked: false,     // 発射直前ロックオン状態
        flash: 0
      },

      // 3. バウンスポイント：手前の左肩装甲（Phase 1 破壊対象：HP 6）
      // 左肩: 原画 (340, 573) -> キャンバス (177, 284)
      shoulderL: {
        x: 177,
        y: 284,
        r: 26,
        hp: 6,
        maxHP: 6,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 4. 腕部関節装甲ターゲット：肘（左肘＆右肘：Phase 1 破壊対象）
      // 左肘: 原画 (200, 835) -> キャンバス (111, 407, r: 22, HP: 5)
      elbowL: {
        x: 111,
        y: 407,
        r: 22,
        hp: 5,
        maxHP: 5,
        broken: false,
        flash: 0,
        rot: 0
      },
      // 右肘: 原画 (722, 776) -> キャンバス (358, 379, r: 22, HP: 5)
      elbowR: {
        x: 358,
        y: 379,
        r: 22,
        hp: 5,
        maxHP: 5,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 5. 胸の先端（バネ振動 ＆ 背中ジェット噴射トリガーセンサー：Phase 2 破壊対象 HP 6）
      // 原画 (207, 650) の胸の最先端ピンク突起・ハイライトに正確配置 -> キャンバス (114, 320)
      tipBust: {
        x: 114,
        y: 320,
        r: 15,
        hp: 6,
        maxHP: 6,
        broken: false,
        dx: 0,
        dy: 0,
        vx: 0,
        vy: 0,
        flash: 0,
        rot: 0
      },

      // 6. メイン動力炉：プラズマ・リアクターコア（全装甲パージ後に露出・最終撃破ターゲット：Phase 3 HP 12）
      // 原画 (290, 680) -> キャンバス (153, 334)
      core: {
        x: 153,
        y: 334,
        r: 18,
        hp: 12,
        maxHP: 12,
        unlocked: false,
        flash: 0
      },
      allArmorsPurged: false,

      // 7. 背中ジェット噴射ノズル先端（左右2基の推進スラスター：Phase 2 破壊対象 各HP 4）
      // 左ノズル: 原画 (472, 775) -> キャンバス (240, 379, r: 16)
      nozzleL: {
        x: 240,
        y: 379,
        r: 16,
        hp: 4,
        maxHP: 4,
        broken: false,
        flash: 0,
        rot: 0,
        angle: Math.PI * 0.46
      },
      // 右ノズル: 原画 (540, 770) -> キャンバス (272, 376, r: 16)
      nozzleR: {
        x: 272,
        y: 376,
        r: 16,
        hp: 4,
        maxHP: 4,
        broken: false,
        flash: 0,
        rot: 0,
        angle: Math.PI * 0.46
      },

      jet: {
        active: false,
        timer: 0,
        nozzles: null,
        get x() { return 240; },
        get y() { return 379; },
        get angle() { return Math.PI * 0.46; }
      },

      // 7. 左足付け根の丸い装甲パーツ（剛体レイヤー分離バウンスポイント）
      // 原画の円盤中心 (298, 1099) -> キャンバス (157, 531)。円盤（横22/縦27）を囲む r: 29
      // （下ラベルが円盤下端の輪郭線に重ならない位置まで下がる）
      hipJointL: {
        x: 157,
        y: 531,
        r: 29,
        flash: 0,
        rot: 0
      },

      // 8. お尻（左右2つの球体中央から揺らす ＆ 水着ライン全体を完全カバー）
      // 左臀部: 原画 (430, 1144) -> キャンバス (220, 550, rx: 28, ry: 45)
      buttL: {
        x: 220,
        y: 550,
        rx: 28,
        ry: 45,
        dx: 0, dy: 0, vx: 0, vy: 0
      },
      // 右臀部: 原画 (532, 1116) -> キャンバス (266, 538, rx: 32, ry: 46)
      buttR: {
        x: 266,
        y: 538,
        rx: 32,
        ry: 46,
        dx: 0, dy: 0, vx: 0, vy: 0
      },
      // 互換参照
      get butt() { return this.buttL; },

      // 9. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳）
      // 原画の猫耳3頂点に1ピクセル単位で正確に完全一致（右耳は外側約45度傾斜）
      // 左耳: Tip (288, 78) -> (152.5, 52.5), BaseL (268, 155) -> (143.0, 88.5), BaseR (340, 138) -> (177.2, 80.6)
      catEarL: {
        v1: { x: 152.5, y: 52.5 }, // Tip
        v2: { x: 143.0, y: 88.5 }, // Base Left
        v3: { x: 177.2, y: 80.6 }, // Base Right
        cx: 157.6, cy: 73.9, r: 18,
        flash: 0
      },
      // 右耳: Tip (544, 112) -> (273.8, 68.4), BaseL (454, 164) -> (231.2, 92.7), BaseR (522, 214) -> (263.4, 116.2)
      catEarR: {
        v1: { x: 273.8, y: 68.4 },  // Tip
        v2: { x: 231.2, y: 92.7 },  // Base Left
        v3: { x: 263.4, y: 116.2 }, // Base Right
        cx: 256.1, cy: 92.4, r: 18,
        flash: 0
      },

      // 10. 生き生きとした表情アニメーション制御ステート
      faceAnim: StageCommon.createFaceAnim(80),

      defeatTriggered: false
    };
    boss.jet.nozzles = [boss.nozzleL, boss.nozzleR];
    return boss;
  },

  triggerDebugJiggle(state) {
    if (!state || !state.boss || !state.boss.tipBust) return;
    state.boss.tipBust.vx += 8.0;
    state.boss.tipBust.vy -= 8.0;
    if (state.boss.buttL) state.boss.buttL.vy += 8.0;
    if (state.boss.buttR) state.boss.buttR.vy += 8.0;
  },

  onNudge(state, nx, ny, intensity) {
    if (!state.boss) return;
    if (window.Systems && Systems.isNudgeJiggleEnabled()) {
      const b = state.boss;
      const mult = intensity || 1.0;
      const sway = Math.abs(nx) > 0.15 ? nx : 0.55;
      if (b.tipBust) {
        b.tipBust.vx += sway * 5.5 * mult;
        b.tipBust.vy += (ny - 0.6) * 5.5 * mult;
      }
      if (b.buttL) {
        b.buttL.vx += sway * 5.2 * mult;
        b.buttL.vy += (ny - 0.5) * 5.2 * mult;
      }
      if (b.buttR) {
        b.buttR.vx -= sway * 4.2 * mult;
        b.buttR.vy += (ny - 0.5) * 5.2 * mult;
      }
      if (b.expression === "normal" || b.expression === "smug") {
        b.expression = "blush";
        b.expressionTimer = 35;
      }
      if (window.sfx && window.sfx.softPuru) {
        window.sfx.softPuru();
      }
    }
  },

  renderHUD(ctx, state) {},

  getTargetDesc(state) {
    if (!state.boss) return "---";
    if (state.stageCleared) {
      return t("stage2.obj.clear");
    }

    if (state.phase === 3) {
      return t("stage2.obj.core", { hp: state.boss.core.hp });
    }

    if (state.phase === 2) {
      const holo = state.boss.hologram;
      if (holo && holo.laserState === "charge") {
        return holo.isLocked ? t("stage2.obj.locked") : t("stage2.obj.tracking");
      }
      return t("stage2.obj.phase2");
    }

    // Phase 1
    const ant = state.boss.antenna;
    if (ant && ant.isActive) {
      return t("stage2.obj.discharge");
    }
    return t("stage2.obj.phase1");
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;

    UI.setBossHeader("#00f5d4", t("stage2.header"));
    UI.setText("targetBriefingText", t("stage2.briefing"));

    UI.setText("dtArmRLabel", t("stage2.dt.armR"));
    UI.setText("dtArmLLabel", t("stage2.dt.armL"));
    UI.setText("dtChestLabel", t("stage2.dt.chest"));
    UI.setText("dtCrotchLabel", t("stage2.dt.crotch"));

    const elbR = state.boss.elbowR;
    if (elbR) {
      UI.setText("dtArmRStatus", elbR.broken ? "💥DESTROYED!" : `ARMORED (${elbR.hp}/5)`);
      UI.setClass("dtArmRStatus", elbR.broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");
    }

    const shL = state.boss.shoulderL;
    const elbL = state.boss.elbowL;
    const isArmsBroken = (shL ? shL.broken : true) && (elbL ? elbL.broken : true);
    const curHP = (shL ? (shL.broken ? 0 : shL.hp) : 0) + (elbL ? (elbL.broken ? 0 : elbL.hp) : 0);
    UI.setText("dtArmLStatus", isArmsBroken ? "💥PURGED!" : `ARMORED (${curHP}/11)`);
    UI.setClass("dtArmLStatus", isArmsBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");

    const bTip = state.boss.tipBust;
    if (state.phase === 3) {
      const core = state.boss.core;
      UI.setText("dtChestStatus", core.hp === 0 ? "💥CORE K.O.!" : `★CORE (${core.hp}/12)`);
      UI.setClass("dtChestStatus", "font-bold text-[#00f5d4] animate-pulse");
    } else {
      UI.setText("dtChestStatus", bTip.broken ? "💥BUST PURGED!" : `BUST TIP (${bTip.hp}/6)`);
      UI.setClass("dtChestStatus", bTip.broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#ff007f]");
    }

    const holo = state.boss.hologram;
    if (holo) {
      if (holo.broken) {
        UI.setText("dtCrotchStatus", "💥HOLO SILENCED");
        UI.setClass("dtCrotchStatus", "font-bold text-[#ff1493]");
      } else if (holo.isShielded || state.phase < 2) {
        UI.setText("dtCrotchStatus", "HOLO [SHIELDED]");
        UI.setClass("dtCrotchStatus", "font-bold text-[#00f5d4]");
      } else {
        UI.setText("dtCrotchStatus", `HOLO CANNON (${holo.hp}/6)`);
        UI.setClass("dtCrotchStatus", "font-bold text-[#e6ff00] animate-pulse");
      }
    }

    const faceMap = {
      normal: t("stage2.face.normal"),
      wink: t("stage2.face.wink"),
      shock: t("stage2.face.shock"),
      wince: t("stage2.face.wince"),
      shout: t("stage2.face.shout"),
      open_blush: t("stage2.face.open_blush"),
      talk: t("stage2.face.talk"),
      talk_sm: t("stage2.face.talk_sm")
    };
    UI.setText("bossFaceStatus", faceMap[state.boss.expression] || t("stage2.face.normal"));
  }
};

// =========================================================================
// STAGE 2: CELTY (疾風紫電セルティ)
// =========================================================================

window.Stage2 = {
  id: "stage2",
  name: "疾風紫電セルティ",
  bossName: "セルティ (CELTY)",

  assets: {
    armoredImg: new Image(),
    bareImg: new Image(),
    defeatCgImg: new Image(),
    hologramImg: new Image(),
    hipJointImg: new Image(),
    gauntletLBrokenImg: new Image(),
    gauntletRBrokenImg: new Image(),
    nozzlesBrokenImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    this.assets.bareImg.src = "./assets/stage2/centerpiece.jpg";
    this.assets.armoredImg.src = "./assets/stage2/centerpiece.jpg";
    this.assets.hipJointImg.src = "./assets/stage2/hip_joint.png?v=108";
    this.assets.gauntletLBrokenImg.src = "./assets/stage2/gauntlet_l_broken.png?v=108";
    this.assets.gauntletRBrokenImg.src = "./assets/stage2/gauntlet_r_broken.png?v=108";
    this.assets.nozzlesBrokenImg.src = "./assets/stage2/nozzles_broken.png?v=108";

    if (window.STAGE2_HOLOGRAM_DATA) {
      this.assets.hologramImg.src = window.STAGE2_HOLOGRAM_DATA;
    } else {
      this.assets.hologramImg.src = "./assets/stage2/hologram.png";
    }

    // 表情差分パッチ初期化
    const faceKeys = ["blink", "wink", "shout", "shock", "wince", "open_blush", "talk", "talk_sm"];
    const faceData = window.STAGE2_FACE_PATCHES || {};
    faceKeys.forEach(k => {
      const im = new Image();
      if (faceData[k]) {
        im.src = faceData[k];
      } else {
        im.src = `./assets/stage2/face_${k}.png`;
      }
      this.assets.facePatchImgs[k] = im;
    });

    let count = 0;
    const check = () => {
      count++;
      if (count >= 1) this.assets.loaded = true;
    };
    this.assets.bareImg.onload = check;
  },

  // 表情アニメーションシーケンス開始ヘルパー
  setExpressionSequence(state, seq) {
    if (!state.boss || !state.boss.faceAnim || !seq || seq.length === 0) return;
    state.boss.faceAnim.sequence = seq;
    state.boss.faceAnim.seqIdx = 0;
    state.boss.faceAnim.seqTimer = seq[0].frames;
    state.boss.expression = seq[0].expr;
  },

  createBossState() {
    return {
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
        get nozzles() {
          const arr = [];
          if (window.state && window.state.boss) {
            const b = window.state.boss;
            if (b.nozzleL) arr.push(b.nozzleL);
            if (b.nozzleR) arr.push(b.nozzleR);
          }
          return arr.length > 0 ? arr : [
            { x: 240, y: 379, angle: Math.PI * 0.46, r: 16 },
            { x: 272, y: 376, angle: Math.PI * 0.46, r: 16 }
          ];
        },
        get x() { return 240; },
        get y() { return 379; },
        get angle() { return Math.PI * 0.46; }
      },

      // 7. 左足付け根の丸い装甲パーツ（剛体レイヤー分離バウンスポイント）
      // 原画 (298, 1091) -> キャンバス (158, 526, r: 26)
      hipJointL: {
        x: 158,
        y: 526,
        r: 26,
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
      faceAnim: {
        idleTimer: 80,
        blinkFrame: 0,     // 瞬きアニメ進行カウンタ
        talkFrame: 0,      // 口パクカウンタ
        winkFrame: 0,      // ウインクカウンタ
        sequence: null,    // 感情遷移アニメーション [{expr, frames}, ...]
        seqIdx: 0,
        seqTimer: 0
      },

      defeatTriggered: false
    };
  },

  update(state, engine) {
    if (!state.boss) return;

    state.boss.animTick = (state.boss.animTick || 0) + 1;

    // 0. クリア演出進行（撃破時）
    this.updateClearSequence(state, engine);

    // 1. 生き生きとした表情アニメーション・リップシンク制御
    const fa = state.boss.faceAnim || (state.boss.faceAnim = {});
    const isTalking = (state.boss.talkTimer > 0) || (state.cutin && state.cutin.timer > 0);

    // 被弾・アクション等の感情遷移アニメーションシーケンス実行中
    if (fa.sequence && fa.sequence.length > 0) {
      fa.seqTimer--;
      if (fa.seqTimer <= 0) {
        fa.seqIdx++;
        if (fa.seqIdx < fa.sequence.length) {
          const step = fa.sequence[fa.seqIdx];
          state.boss.expression = step.expr;
          fa.seqTimer = step.frames;
        } else {
          // シーケンス完了
          fa.sequence = null;
          state.boss.expression = "normal";
        }
      }
    } else {
      // 通常タイマー減衰
      if (state.boss.expressionTimer > 0) {
        state.boss.expressionTimer--;
        if (state.boss.expressionTimer <= 0) {
          state.boss.expression = "normal";
        }
      }

      // アイドル時の自然な表情アニメーション（瞬き・ウインク・吐息）
      if (state.boss.expression === "normal") {
        fa.idleTimer = (fa.idleTimer || 0) - 1;
        if (fa.idleTimer <= 0) {
          const r = Math.random();
          if (r < 0.55) {
            // 自然な単発瞬き（16フレーム: 閉じ始め3f -> 完全閉じ10f -> 開き3f）
            fa.blinkFrame = 16;
            fa.idleTimer = 130 + Math.floor(Math.random() * 110);
          } else if (r < 0.82) {
            // 自信満々の放電ウインク（45フレーム）
            fa.winkFrame = 45;
            fa.idleTimer = 160 + Math.floor(Math.random() * 120);
          } else {
            // ふと口が動く吐息・呼吸（24フレーム）
            fa.talkFrame = 24;
            fa.idleTimer = 140 + Math.floor(Math.random() * 100);
          }
        }
      }
    }

    if (fa.blinkFrame > 0) fa.blinkFrame--;
    if (fa.winkFrame > 0) fa.winkFrame--;
    if (fa.talkFrame > 0) fa.talkFrame--;
    if (state.boss.talkTimer > 0) state.boss.talkTimer--;

    // 2. 胸のバネ物理（ぷるぷる振動）
    const bust = state.boss.tipBust;
    if (bust) {
      const stiffness = 0.12;
      const damping = 0.88;
      const ax = -stiffness * bust.dx;
      const ay = -stiffness * bust.dy;
      bust.vx = (bust.vx + ax) * damping;
      bust.vy = (bust.vy + ay) * damping;
      bust.dx += bust.vx;
      bust.dy += bust.vy;
      bust.dx = Math.max(-14, Math.min(14, bust.dx));
      bust.dy = Math.max(-14, Math.min(14, bust.dy));
    }

    // 3. お尻のバネ物理（左右2つの円で自然に揺れる）
    const updateButtSpring = (b) => {
      if (!b) return;
      const stiffness = 0.13;
      const damping = 0.86;
      const ax = -stiffness * b.dx;
      const ay = -stiffness * b.dy;
      b.vx = (b.vx + ax) * damping;
      b.vy = (b.vy + ay) * damping;
      b.dx += b.vx;
      b.dy += b.vy;
      b.dx = Math.max(-14, Math.min(14, b.dx));
      b.dy = Math.max(-14, Math.min(14, b.dy));
    };
    updateButtSpring(state.boss.buttL);
    updateButtSpring(state.boss.buttR);

    // 4. カチューシャのアンテナ先端の周期放電サイクル
    const ant = state.boss.antenna;
    if (ant) {
      if (ant.broken) {
        // 放電機構ショート大破：放電停止、時折小火花がパチパチ散る
        ant.isActive = false;
        ant.isWarning = false;
        if (Math.random() < 0.12) {
          Particles.add(state, ant.x + (Math.random() - 0.5) * 6, ant.y + (Math.random() - 0.5) * 6, "#e6ff00", 2, 2.0);
        }
      } else {
        ant.timer = (ant.timer + 1) % ant.cycle;
        if (ant.flash > 0) ant.flash--;

        const isWarning = ant.timer >= (ant.cycle - ant.activeDuration - ant.warningDuration) &&
                          ant.timer < (ant.cycle - ant.activeDuration);
        const isActive = ant.timer >= (ant.cycle - ant.activeDuration);

        ant.isWarning = isWarning;
        ant.isActive = isActive;

        if (isActive) {
          // 放電中：激しい電撃火花
          if (Math.random() < 0.65) {
            const arcAngle = Math.random() * Math.PI * 2;
            const arcR = ant.r * (0.8 + Math.random() * 0.7);
            state.particles.push({
              x: ant.x + Math.cos(arcAngle) * arcR,
              y: ant.y + Math.sin(arcAngle) * arcR,
              vx: (Math.random() - 0.5) * 3.5,
              vy: (Math.random() - 0.5) * 3.5,
              color: Math.random() < 0.5 ? "#00f5d4" : "#e6ff00",
              life: 10,
              scale: 1.2
            });
          }
        }
      }
    }

    // 5. 左手奥ホログラムのラスターグリッジ ＆ レーザー発射
    const holo = state.boss.hologram;
    if (holo) {
      if (holo.broken) {
        // ホログラム砲台大破：レーザー完全停止、グリッチ微小ノイズのみ
        holo.laserState = "idle";
        holo.flash = 0;
        holo.glitchShift = (Math.random() < 0.15) ? (Math.random() - 0.5) * 6 : 0;
      } else {
        if (holo.flash > 0) holo.flash--;
        holo.glitchShift = (Math.random() < 0.3) ? (Math.random() - 0.5) * 10 : 0;

        if (holo.laserState === "idle") {
          if (holo.cooldown > 0) {
            holo.cooldown--;
          } else {
            holo.laserState = "charge";
            holo.laserTimer = 55; // チャージ＆エイム時間
            holo.isLocked = false;
            if (window.sfx && window.sfx.capsuleCatch) {
              window.sfx.capsuleCatch();
            }
          }
        } else if (holo.laserState === "charge") {
        holo.laserTimer--;

        // 1. 発射16フレーム前まではメインボールを追尾エイム！
        if (holo.laserTimer > 16) {
          holo.isLocked = false;
          if (state.balls.length > 0) {
            const targetBall = state.balls[0];
            const aimAngle = Math.atan2(targetBall.y - holo.y, targetBall.x - holo.x);
            // プレイフィールド全域（右上〜右下）をカバーする角度制限
            const clamped = Math.max(-Math.PI * 0.28, Math.min(Math.PI * 0.52, aimAngle));
            holo.beamAngle = holo.beamAngle * 0.82 + clamped * 0.18;
          }
        } else {
          // 2. 発射直前（残り16フレーム）：照準をロックオン固定！
          // 高速ボールなら回避でき、低速ボールは直撃して吹き飛ばされる！
          if (!holo.isLocked) {
            holo.isLocked = true;
            if (window.sfx && window.sfx.metalBumper) {
              window.sfx.metalBumper();
            }
          }
        }

        const endPt = this.getLaserEndPoint(holo, (engine && engine.W) || 420, (engine && engine.H) || 660);
        holo.beamEndX = endPt.x;
        holo.beamEndY = endPt.y;

        // チャージスパーク・エネルギー収束粒子
        const pCount = holo.isLocked ? 3 : 2;
        state.boss.expression = "shout";
        state.boss.expressionTimer = 8;
        for (let i = 0; i < pCount; i++) {
          const ca = Math.random() * Math.PI * 2;
          const cr = 18 + Math.random() * 26;
          const speed = holo.isLocked ? 4.5 : 3.0;
          state.particles.push({
            x: holo.x + Math.cos(ca) * cr,
            y: holo.y + Math.sin(ca) * cr,
            vx: -Math.cos(ca) * speed,
            vy: -Math.sin(ca) * speed,
            color: holo.isLocked ? (Math.random() < 0.5 ? "#ffffff" : "#ff0055") : (Math.random() < 0.5 ? "#00f5d4" : "#ff007f"),
            life: 10,
            scale: holo.isLocked ? 1.5 : 1.1
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "fire";
          holo.laserTimer = 36; // 36フレーム照射
          holo.flash = 35;
          state.boss.expression = "wink";
          state.boss.expressionTimer = 36;
          if (window.sfx && window.sfx.metalBumper) {
            window.sfx.metalBumper();
          }
          UI.showCutin("⚡【ホログラムレーザー発砲！】⚡<br>高速移動で射線を回避せよ！", 140);
        }
      } else if (holo.laserState === "fire") {
        holo.laserTimer--;

        const endPt = this.getLaserEndPoint(holo, (engine && engine.W) || 420, (engine && engine.H) || 660);
        holo.beamEndX = endPt.x;
        holo.beamEndY = endPt.y;

        // レーザービーム線分衝突判定（テーブルの壁セグメントで遮断された範囲で判定）
        const beamStartX = holo.x;
        const beamStartY = holo.y;
        const beamEndX = holo.beamEndX;
        const beamEndY = holo.beamEndY;

        const newSplitBalls = [];
        state.balls.forEach(ball => {
          // 発射待ち（シューターレーン内）のボールは壁で遮られるため絶対に被弾させない安全保護
          if (ball.inShooterLane || (state.plunger && state.plunger.waitingForLaunch)) return;

          const hit = Physics.checkCapsuleHit(ball, beamStartX, beamStartY, beamEndX, beamEndY, 9.5);
          if (hit) {
            // 直撃判定：レーザービームの芯線に直撃（中心線からの距離 dist <= 9.0）かつ通常サイズ（r >= 7.0）のボールの場合、2つのミニボールに核分裂！
            const centerDist = (hit.dist !== undefined) ? hit.dist : Math.hypot(ball.x - hit.qx, ball.y - hit.qy);
            const isDirectHit = centerDist <= 9.0;
            const canSplit = (ball.r >= 7.0) && (state.balls.length + newSplitBalls.length < 12);

            if (isDirectHit && canSplit && !ball._hasSplitThisBeam) {
              ball._hasSplitThisBeam = true;

              // 元のボールを小型化（ミニボールA）
              ball.r = 6.0;
              ball.x = hit.qx + hit.nx * 9.0;
              ball.y = hit.qy + hit.ny * 9.0;
              ball.vx = (hit.nx * 15.0) + (Math.random() - 0.5) * 4.0;
              ball.vy = (hit.ny * 15.0) - 4.0;

              // 新しいミニボールBの生成
              const newBall = {
                x: hit.qx - hit.nx * 9.0,
                y: hit.qy - hit.ny * 9.0,
                vx: (-hit.nx * 15.0) + (Math.random() - 0.5) * 4.0,
                vy: (-hit.ny * 15.0) - 4.0,
                r: 6.0,
                trail: [],
                inShooterLane: false,
                _hasSplitThisBeam: true
              };
              newSplitBalls.push(newBall);

              if (window.sfx) {
                if (window.sfx.metalBumper) window.sfx.metalBumper();
                if (window.sfx.capsuleCatch) window.sfx.capsuleCatch();
              }
              Particles.add(state, hit.qx, hit.qy, "#00f5d4", 26, 7.0);
              Particles.add(state, hit.qx, hit.qy, "#ffffff", 20, 6.0);
              Particles.add(state, hit.qx, hit.qy, "#ff007f", 16, 5.0);
              Particles.addPopup(state, hit.qx, hit.qy - 14, "⚡LASER FISSION!! MINI-BALLS SPLIT!⚡", "#00f5d4", 1.4);
              Systems.addScore(state, 12000, hit.qx, hit.qy, "★FISSION MULTI-BALL!★");
              UI.showCutin("⚡【高エネルギー直撃：超電導分裂！】⚡<br>レーザー直撃によりボールが2つのミニボールに核分裂！", 160);
            } else {
              // かすり当たり、または既に分裂済みのミニボール：強烈にノックバック＆吹き飛ばし！
              ball.x = hit.qx + hit.nx * (hit.minDist + 2.0);
              ball.y = hit.qy + hit.ny * (hit.minDist + 2.0);
              ball.vx = hit.nx * 16.5;
              ball.vy = hit.ny * 16.5;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, ball.x, ball.y, "#00f5d4", 18, 5.5);
              Particles.add(state, ball.x, ball.y, "#ffffff", 12, 4.5);
              Systems.addScore(state, 5000, ball.x, ball.y, "⚡LASER HIT! +5,000⚡");
            }
          } else if (holo.laserTimer === 30) {
            // ニアミス回避ボーナス判定（発射直後、至近距離を高速で通り抜けて回避）
            const abx = beamEndX - beamStartX;
            const aby = beamEndY - beamStartY;
            const lenSq = abx * abx + aby * aby;
            let t = lenSq > 0 ? ((ball.x - beamStartX) * abx + (ball.y - beamStartY) * aby) / lenSq : 0;
            t = Math.max(0, Math.min(1, t));
            const qx = beamStartX + t * abx;
            const qy = beamStartY + t * aby;
            const dist = Math.hypot(ball.x - qx, ball.y - qy);
            const ballSpeed = Math.hypot(ball.vx, ball.vy);
            if (dist < 42 && ballSpeed > 6.5) {
              Systems.addScore(state, 3000, ball.x, ball.y, "✨DODGE BONUS! +3,000✨");
              Particles.add(state, ball.x, ball.y, "#e6ff00", 12, 3.5);
            }
          }
        });

        if (newSplitBalls.length > 0) {
          state.balls.push(...newSplitBalls);
        }

        // ビーム沿いに激しいレーザー粒子
        for (let i = 0; i < 3; i++) {
          const ratio = Math.random();
          const px = beamStartX + (beamEndX - beamStartX) * ratio;
          const py = beamStartY + (beamEndY - beamStartY) * ratio;
          state.particles.push({
            x: px + (Math.random() - 0.5) * 8,
            y: py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: Math.random() < 0.6 ? "#00f5d4" : "#ffffff",
            life: 8,
            scale: 1.2
          });
        }

        // 画面端着弾点での激しい激突スパーク噴出
        if (Math.random() < 0.8) {
          state.particles.push({
            x: beamEndX + (Math.random() - 0.5) * 6,
            y: beamEndY + (Math.random() - 0.5) * 6,
            vx: -Math.cos(holo.beamAngle) * (2.0 + Math.random() * 5.0) + (Math.random() - 0.5) * 4,
            vy: -Math.sin(holo.beamAngle) * (2.0 + Math.random() * 5.0) + (Math.random() - 0.5) * 4,
            color: Math.random() < 0.5 ? "#00f5d4" : "#ffffff",
            life: 14,
            scale: 1.5
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "idle";
          holo.isLocked = false;
          holo.cooldown = 220 + Math.floor(Math.random() * 80);
          state.balls.forEach(b => { b._hasSplitThisBeam = false; });
        }
      }
    }
  }

    // 6. 背中ジェット噴射機構（左右2基のノズル先端開口部から斜め下への指向性超音速噴流）
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

      const nozzles = jet.nozzles || [{ x: jet.x, y: jet.y, angle: jet.angle || (Math.PI * 0.46) }];
      nozzles.forEach(noz => {
        // ノズル軸方向（斜め下）への高速火炎プラズマ粒子噴射
        const jetAngle = noz.angle || (Math.PI * 0.46);
        for (let i = 0; i < 3; i++) {
          const spread = (Math.random() - 0.5) * 0.35;
          const pAngle = jetAngle + spread;
          const speed = 7.0 + Math.random() * 8.5;
          state.particles.push({
            x: noz.x + (Math.random() - 0.5) * 6,
            y: noz.y + (Math.random() - 0.5) * 6,
            vx: Math.cos(pAngle) * speed,
            vy: Math.sin(pAngle) * speed,
            color: Math.random() < 0.5 ? "#ffffff" : (Math.random() < 0.6 ? "#00f5d4" : "#e6ff00"),
            life: 14,
            scale: 1.5 + Math.random() * 0.8
          });
        }

        state.balls.forEach(ball => {
          const dx = ball.x - noz.x;
          const dy = ball.y - noz.y;
          const dist = Math.hypot(dx, dy);
          const blastRadius = 210;

          if (dist < blastRadius && dist > 1.0) {
            // ノズル噴射コーン（斜め下方向）への指向性風圧
            const ballAngle = Math.atan2(dy, dx);
            let angleDiff = Math.abs(ballAngle - jetAngle);
            if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;

            // 噴流の中心コーン（広がり角90度以内）ほど強力に吹き飛ばす
            const coneFactor = Math.max(0.2, Math.cos(Math.min(Math.PI / 2, angleDiff)));
            const force = 12.0 * Math.pow(1.0 - dist / blastRadius, 1.1) * coneFactor;

            // 噴射軸方向＋放射方向の合成ベクトルで吹き飛ばす
            ball.vx += (Math.cos(jetAngle) * 0.6 + (dx / dist) * 0.4) * force;
            ball.vy += (Math.sin(jetAngle) * 0.6 + (dy / dist) * 0.4) * force;

            const spd = Math.hypot(ball.vx, ball.vy);
            if (spd > 24.0) {
              ball.vx = (ball.vx / spd) * 24.0;
              ball.vy = (ball.vy / spd) * 24.0;
            }
          }
        });
      });
    } else if (jet) {
      jet.active = false;
    }

    // Flash decay
    [state.boss.shoulderL, state.boss.elbowL, state.boss.elbowR, state.boss.nozzleL, state.boss.nozzleR, state.boss.tipBust, state.boss.hipJointL, state.boss.catEarL, state.boss.catEarR].forEach(t => {
      if (t && t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);

    // 1. カチューシャのアンテナ先端（放電時は強烈に弾く、停止時は通過！ 接触でHP減少）
    const ant = state.boss.antenna;
    if (ant) {
      const dxA = ball.x - ant.x;
      const dyA = ball.y - ant.y;
      const distA = Math.hypot(dxA, dyA);

      if (distA < ball.r + ant.r) {
        if (!ant.broken) {
          if (ant.isActive) {
            // 放電中：激しい電撃で弾き返す！
            checkBumper(ant, 11.5, () => {
              ant.flash = 24;
              if (window.sfx) window.sfx.metalBumper();
              Particles.add(state, ant.x, ant.y, "#00f5d4", 18, 5.0);
              Particles.add(state, ant.x, ant.y, "#e6ff00", 12, 4.0);
              this.setExpressionSequence(state, [
                { expr: "shock", frames: 20 },
                { expr: "shout", frames: 24 },
                { expr: "wince", frames: 32 }
              ]);

              if (ant.hp > 0) {
                ant.hp--;
                Systems.addScore(state, 4000, ant.x, ant.y, `⚡ELECTRIC REPEL! HP:${ant.hp}`);
                if (ant.hp === 0) {
                  ant.broken = true;
                  ant.isActive = false;
                  ant.isWarning = false;
                  Particles.triggerArmorBreakEffect(state, "antenna", ant.x, ant.y);
                  UI.showCutin("⚡【アンテナ放電機構 破壊！】⚡<br>電撃フィールド消失！ 放電機沈黙！", 200);
                  Systems.addScore(state, 25000, ant.x, ant.y, "★ANTENNA DESTROYED!★");
                  Systems.spawnFloatingCapsule(state, 2, "buff");
                  this.checkPhase1Clear(state);
                }
              }
            });
          } else {
            // 電撃停止中：通り抜け可能！ オービットゲート通過ボーナス ＆ ダメージ
            if (!ball._passedAntennaGate) {
              ball._passedAntennaGate = true;
              ant.flash = 18;
              if (window.sfx) window.sfx.capsuleCatch();
              Particles.add(state, ant.x, ant.y, "#00f5d4", 14, 4.0);

              if (ant.hp > 0) {
                ant.hp--;
                Systems.addScore(state, 8000, ant.x, ant.y, `★GATE PASS! HP:${ant.hp}★`);
                Particles.addPopup(state, ant.x, ant.y - 14, `★GATE PASS HP:${ant.hp}★`, "#e6ff00", 1.1);
                if (ant.hp === 0) {
                  ant.broken = true;
                  ant.isActive = false;
                  ant.isWarning = false;
                  Particles.triggerArmorBreakEffect(state, "antenna", ant.x, ant.y);
                  UI.showCutin("⚡【アンテナ放電機構 破壊！】⚡<br>電撃フィールド消失！ 放電機沈黙！", 200);
                  Systems.addScore(state, 25000, ant.x, ant.y, "★ANTENNA DESTROYED!★");
                  Systems.spawnFloatingCapsule(state, 2, "buff");
                  this.checkPhase1Clear(state);
                }
              } else {
                Systems.addScore(state, 8000, ant.x, ant.y, "★ORBIT GATE CLEAR!!★");
              }
            }
          }
        }
      } else {
        ball._passedAntennaGate = false;
      }
    }

    // 2. バウンスポイント：手前の左肩装甲（※右肩は身体の奥にあるため反射板なし）
    const handleShoulderHit = (sh, sideLabel) => {
      checkBumper(sh, 9.5, () => {
        sh.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, sh.x, sh.y, "#00f5d4", 18, 5.0);

        if (sh.hp > 0) {
          sh.hp--;
          this.setExpressionSequence(state, [
            { expr: "wince", frames: 28 },
            { expr: "talk_sm", frames: 20 }
          ]);
          Systems.addScore(state, 3000, sh.x, sh.y, `${sideLabel} SHOULDER! HP:${sh.hp}`);
          if (sh.hp === 0) {
            sh.broken = true;
            Particles.triggerArmorBreakEffect(state, sideLabel.toLowerCase() + "_shoulder", sh.x, sh.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 25 },
              { expr: "shout", frames: 30 },
              { expr: "wince", frames: 45 }
            ]);
            UI.showCutin(`💥【${sideLabel}肩装甲大破！】💥<br>肩部装甲パージ！ +30,000pts ボーナス！`, 200);
            Systems.addScore(state, 30000, sh.x, sh.y, `★${sideLabel} SHOULDER PURGED!★`);
            Systems.spawnFloatingCapsule(state, 2, "buff");
            this.checkPhase1Clear(state);
          }
        } else {
          Systems.addScore(state, 3500, sh.x, sh.y, `⚡${sideLabel} SHOULDER SPARK!`);
        }
      });
    };

    if (state.boss.shoulderL) handleShoulderHit(state.boss.shoulderL, "L");

    // 3. 腕部関節装甲ターゲット：肘（左肘＆右肘：Phase 1 破壊対象 各HP: 5）
    const handleElbowHit = (elb, sideLabel) => {
      if (!elb) return;
      checkBumper(elb, 10.0, () => {
        elb.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, elb.x, elb.y, "#ff007f", 18, 5.0);

        if (elb.hp > 0) {
          elb.hp--;
          this.setExpressionSequence(state, [
            { expr: "wince", frames: 25 },
            { expr: "talk_sm", frames: 18 }
          ]);
          Systems.addScore(state, 3500, elb.x, elb.y, `${sideLabel}-ARM! HP:${elb.hp}`);

          if (elb.hp === 0) {
            elb.broken = true;
            Particles.triggerArmorBreakEffect(state, `${sideLabel.toLowerCase()}_arm`, elb.x, elb.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 25 },
              { expr: "shout", frames: 30 },
              { expr: "wince", frames: 40 }
            ]);
            UI.showCutin(`💥【${sideLabel}腕部装甲 大破！】💥<br>関節サーボ破損・装甲欠損！ +30,000pts!`, 200);
            Systems.addScore(state, 30000, elb.x, elb.y, `★${sideLabel} ARM DESTROYED!★`);
            Systems.spawnFloatingCapsule(state, 2, "buff");
            this.checkPhase1Clear(state);
          }
        } else {
          // 破壊後：小スパーク散布
          Particles.add(state, elb.x, elb.y, "#e6ff00", 12, 3.5);
          Systems.addScore(state, 2500, elb.x, elb.y, `⚡${sideLabel} ARM SPARK!`);
        }
      });
    };

    if (state.boss.elbowL) handleElbowHit(state.boss.elbowL, "L");
    if (state.boss.elbowR) handleElbowHit(state.boss.elbowR, "R");

    // 3.5. 背中ブースターノズル噴射口ターゲット（左右2基のノズル：Phase 2 破壊対象 各HP: 4）
    const handleNozzleHit = (noz, nozLabel) => {
      if (!noz) return;
      checkBumper(noz, 10.5, () => {
        noz.flash = 24;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, noz.x, noz.y, "#ff007f", 16, 4.5);

        if (noz.hp > 0) {
          noz.hp--;
          this.setExpressionSequence(state, [
            { expr: "shock", frames: 20 },
            { expr: "wince", frames: 25 }
          ]);
          Systems.addScore(state, 4000, noz.x, noz.y, `NOZZLE-${nozLabel}! HP:${noz.hp}`);

          if (noz.hp === 0) {
            noz.broken = true;
            Particles.triggerArmorBreakEffect(state, `nozzle_${nozLabel.toLowerCase()}`, noz.x, noz.y);
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 28 },
              { expr: "shout", frames: 32 }
            ]);
            UI.showCutin(`💥【${nozLabel}ノズル 噴射口大破！】💥<br>スラスター破損・推進力低下！ +25,000pts!`, 200);
            Systems.addScore(state, 25000, noz.x, noz.y, `★NOZZLE-${nozLabel} DESTROYED!★`);
            Systems.spawnFloatingCapsule(state, 2, "buff");

            // 両ノズル大破チェック
            const bothBroken = state.boss.nozzleL.broken && state.boss.nozzleR.broken;
            if (bothBroken) {
              if (state.boss.jet) {
                state.boss.jet.timer = 0;
                state.boss.jet.active = false;
              }
              UI.showCutin("💥【背中推進機関 完全大破！】💥<br>両スラスター停止！ ジェット風圧消失！ +30,000pts!", 220);
              Systems.addScore(state, 30000, noz.x, noz.y, "★ALL THRUSTERS DOWN!★");
              this.checkPhase2Clear(state);
            }
          }
        } else {
          Particles.add(state, noz.x, noz.y, "#555555", 8, 2.5);
          Systems.addScore(state, 2000, noz.x, noz.y, "⚡NOZZLE SCRAP");
        }
      });
    };

    if (state.boss.nozzleL) handleNozzleHit(state.boss.nozzleL, "L");
    if (state.boss.nozzleR) handleNozzleHit(state.boss.nozzleR, "R");

    // 4. 左手奥ホログラム砲台コア（Phase 1はシールド防御、Phase 2で攻撃可能！）
    const holo = state.boss.hologram;
    if (holo) {
      checkBumper(holo, 9.2, () => {
        holo.flash = 22;
        if (holo.broken) {
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#00f5d4", 10, 3.5);
          Systems.addScore(state, 2000, holo.x, holo.y, "HOLO SCRAP");
        } else if (holo.isShielded || state.phase < 2) {
          // Phase 1: ホログラムシールドで反射
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#00f5d4", 14, 4.5);
          Systems.addScore(state, 1500, holo.x, holo.y, "⚡HOLO SHIELDED⚡");
        } else {
          // Phase 2: シールド解除！ ホログラム砲台コアへ直接ダメージ
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, holo.x, holo.y, "#ff007f", 20, 5.5);
          Particles.add(state, holo.x, holo.y, "#ffffff", 14, 4.5);

          if (holo.hp > 0) {
            holo.hp--;
            this.setExpressionSequence(state, [
              { expr: "shock", frames: 20 },
              { expr: "wince", frames: 28 }
            ]);
            Systems.addScore(state, 6000, holo.x, holo.y, `💥HOLO CANNON! HP:${holo.hp}`);

            if (holo.hp === 0) {
              holo.broken = true;
              holo.laserState = "idle";
              holo.laserTimer = 0;
              Particles.triggerArmorBreakEffect(state, "hologram_cannon", holo.x, holo.y);
              this.setExpressionSequence(state, [
                { expr: "shock", frames: 25 },
                { expr: "shout", frames: 32 },
                { expr: "open_blush", frames: 50 }
              ]);
              UI.showCutin("💥【ホログラム砲台 大破！】💥<br>レーザー主砲沈黙！ +40,000pts ボーナス！", 220);
              Systems.addScore(state, 40000, holo.x, holo.y, "★HOLO CANNON DESTROYED!★");
              Systems.spawnFloatingCapsule(state, 2, "buff");
              this.checkPhase2Clear(state);
            }
          }
        }
      });
    }

    // 5. 胸の先端（バネ振動 ＆ 背中ジェット暴走トリガーセンサー ＆ Phase 2装甲パージ）
    const bust = state.boss.tipBust;
    if (bust) {
      checkBumper(bust, 8.5, () => {
        bust.flash = 22;
        bust.vx += (ball.vx || 2.5) * 1.3;
        bust.vy += (ball.vy || -3.0) * 1.3;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, bust.x, bust.y, "#ff1493", 18, 5.0);
        Particles.spawnHeart(state, bust.x, bust.y, false);

        this.setExpressionSequence(state, [
          { expr: "shock", frames: 18 },
          { expr: "wince", frames: 24 },
          { expr: "open_blush", frames: 70 }
        ]);
        state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 30);
        this.triggerJetBlast(state);

        if (!bust.broken && bust.hp > 0) {
          bust.hp--;
          Systems.addScore(state, 12000, bust.x, bust.y, `♥BUST SENSITIVE! HP:${bust.hp}♥`);
          if (bust.hp === 0) {
            bust.broken = true;
            Particles.triggerArmorBreakEffect(state, "bust_armor", bust.x, bust.y);
            UI.showCutin("♥【胸部装甲パージ！】♥<br>胸部センサー限界突破！ +30,000pts！", 200);
            Systems.addScore(state, 30000, bust.x, bust.y, "★BUST ARMOR PURGED!★");
            Systems.spawnFloatingCapsule(state, 2, "buff");
            this.checkPhase2Clear(state);
          }
        } else {
          Systems.addScore(state, 12000, bust.x, bust.y, "♥BUST TIP SENSITIVE!♥");
        }
      });
    }

    // 6. メイン動力炉：プラズマ・リアクターコア（Phase 3 最終決戦ターゲット！）
    const core = state.boss.core;
    if (core) {
      checkBumper(core, 8.8, () => {
        Systems.addFever(state, 6);
        if (state.phase === 3 && core.unlocked && core.hp > 0) {
          core.hp--;
          core.flash = 26;
          this.setExpressionSequence(state, [
            { expr: "shock", frames: 25 },
            { expr: "shout", frames: 30 },
            { expr: "open_blush", frames: 60 }
          ]);
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 26, 6.0);
          Particles.add(state, core.x, core.y, "#ffffff", 20, 5.0);
          Systems.addScore(state, 15000, core.x, core.y - 18, `💥CORE HIT! HP:${core.hp}`);

          if (core.hp === 0) {
            this.triggerClear(state, engine);
          }
        } else if (core.unlocked) {
          if (window.sfx) window.sfx.burstTrigger();
          Particles.add(state, core.x, core.y, "#e6ff00", 20, 4.5);
          Systems.addScore(state, 5000, core.x, core.y - 16, "★REACTOR OVERDRIVE!★");
        } else {
          core.flash = 12;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, core.x, core.y, "#00f5d4", 10, 3.0);
          Systems.addScore(state, 1500, core.x, core.y - 14, "⚡CORE SHIELDED⚡");
        }
        UI.updateHUD(state);
      });
    }

    // 7. 左足付け根の丸い装甲パーツ（剛体バンパー ＆ お尻揺れトリガー）
    const hip = state.boss.hipJointL;
    if (hip) {
      const bL = state.boss.buttL;
      const jDx = (bL ? bL.dx : 0) * 0.35;
      const jDy = (bL ? bL.dy : 0) * 0.35;
      const dynamicHip = {
        x: hip.x + jDx,
        y: hip.y + jDy,
        r: hip.r
      };
      checkBumper(dynamicHip, 10.0, () => {
        hip.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, dynamicHip.x, dynamicHip.y, "#00f5d4", 18, 5.0);
        Particles.add(state, dynamicHip.x, dynamicHip.y, "#ff007f", 12, 4.0);

        // 当たったとき、お尻（左右2つの球体）が自然にぷるんと揺れる！
        const bR = state.boss.buttR;
        const impX = (ball.vx > 0 ? 1 : -1) * 3.6 + (Math.random() - 0.5) * 1.5;
        const impY = Math.abs(ball.vy) * 0.85 + 3.2;

        if (bL) {
          bL.vx += impX;
          bL.vy += impY;
        }
        if (bR) {
          // 右臀部には少し遅延・波及する柔らかい衝撃
          bR.vx += impX * 0.65;
          bR.vy += impY * 0.75;
        }

        this.setExpressionSequence(state, [
          { expr: "shock", frames: 18 },
          { expr: "wince", frames: 25 },
          { expr: "open_blush", frames: 55 }
        ]);
        Systems.addScore(state, 4500, dynamicHip.x, dynamicHip.y, "⚡HIP CYBER BUMPER!⚡");
      });
    }

    // 8. カチューシャ猫耳三角バウンス板（左猫耳＆右猫耳の鋭角エッジリフレクション）
    const checkCatEarBumper = (ear, earName) => {
      if (!ear) return;
      const edges = [
        [ear.v1, ear.v2],
        [ear.v2, ear.v3],
        [ear.v3, ear.v1]
      ];
      for (let i = 0; i < edges.length; i++) {
        const edge = edges[i];
        const hit = Physics.checkCapsuleHit(ball, edge[0].x, edge[0].y, edge[1].x, edge[1].y, 4.5);
        if (hit) {
          ball.x = hit.qx + hit.nx * (hit.minDist + 1.8);
          ball.y = hit.qy + hit.ny * (hit.minDist + 1.8);
          ball.vx = hit.nx * 14.0;
          ball.vy = hit.ny * 14.0;

          ear.flash = 24;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, ball.x, ball.y, "#ff007f", 16, 5.0);
          Particles.add(state, ball.x, ball.y, "#00f5d4", 10, 4.0);

          this.setExpressionSequence(state, [
            { expr: "wink", frames: 45 }
          ]);
          Systems.addScore(state, 3500, ball.x, ball.y, `⚡${earName} CAT EAR BOUNCE!⚡`);
          return;
        }
      }
    };
    checkCatEarBumper(state.boss.catEarL, "L");
    checkCatEarBumper(state.boss.catEarR, "R");
  },

  checkPhase1Clear(state) {
    const b = state.boss;
    const isArmsBroken = b.elbowL.broken && b.elbowR.broken;
    if (b.shoulderL.broken && b.antenna.broken && isArmsBroken && state.phase === 1) {
      state.phase = 2;
      b.hologram.isShielded = false;
      if (window.sfx) window.sfx.burstTrigger();
      this.setExpressionSequence(state, [
        { expr: "shock", frames: 30 },
        { expr: "shout", frames: 35 },
        { expr: "wince", frames: 50 }
      ]);
      UI.showCutin("🎉【PHASE 1 突破！】🎉<br>外郭防衛網＆両腕関節装甲壊滅！ ホログラム砲台のシールド解除！", 220);
      Systems.spawnFloatingCapsule(state, 2, "buff");
      UI.updateHUD(state);
    }
  },

  checkPhase2Clear(state) {
    const b = state.boss;
    const isNozzlesBroken = (!b.nozzleL || b.nozzleL.broken) && (!b.nozzleR || b.nozzleR.broken);
    if (b.hologram.broken && b.tipBust.broken && isNozzlesBroken && state.phase === 2) {
      state.phase = 3;
      b.core.unlocked = true;
      b.allArmorsPurged = true;
      if (window.sfx) window.sfx.burstTrigger();
      Particles.add(state, b.core.x, b.core.y, "#00f5d4", 50, 8.5);
      Particles.add(state, b.core.x, b.core.y, "#ffffff", 40, 7.5);
      Particles.add(state, b.core.x, b.core.y, "#ff007f", 35, 7.0);

      this.setExpressionSequence(state, [
        { expr: "shock", frames: 35 },
        { expr: "open_blush", frames: 999 }
      ]);
      Systems.addScore(state, 50000, b.core.x, b.core.y, "★ALL ARMORS PURGED! +50,000★");
      UI.showCutin("✨【PHASE 2 突破！ 全装甲パージ！】✨<br>プラズマ・リアクターコア露出！ コアを直撃してK.O.せよ！", 240);
      Systems.addFever(state, 100);
      Systems.spawnFloatingCapsule(state, 3, "buff");
      UI.updateHUD(state);
    }
  },

  triggerClear(state, engine) {
    if (state.stageCleared) return;
    state.stageCleared = true;
    state.clearSequence.active = true;
    state.clearSequence.frame = 0;
    state.clearSequence.phase = "shatter";

    if (window.sfx) window.sfx.burstTrigger();
    UI.showCutin("💥【CRITICAL K.O.】💥<br>セルティのプラズマコア臨界停止！ ステージクリア！", 240);
    Particles.add(state, state.boss.core.x, state.boss.core.y, "#00f5d4", 60, 9.5);
    Particles.add(state, state.boss.core.x, state.boss.core.y, "#ff007f", 60, 8.5);
    Particles.add(state, state.boss.core.x, state.boss.core.y, "#ffffff", 60, 9.0);

    state.clearSequence.shatterPieces = Particles.shatterTableFrame(Physics.TABLE_WALLS);

    state.boss.expression = "open_blush";
    state.boss.expressionTimer = 9999;

    state.balls.forEach(ball => {
      const a = Math.atan2(ball.y - state.boss.core.y, ball.x - state.boss.core.x) + (Math.random() - 0.5) * 0.5;
      const spd = 7.5 + Math.random() * 4.0;
      ball.vx = Math.cos(a) * spd;
      ball.vy = Math.sin(a) * spd - 2.5;
    });
  },

  spawnSmokeCloud(x, y, color = "#00f5d4") {
    return {
      x: x + (Math.random() - 0.5) * 36,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 3.0,
      vy: -1.5 - Math.random() * 2.5,
      r: 20 + Math.random() * 18,
      maxR: 65 + Math.random() * 35,
      growth: 0.75 + Math.random() * 0.65,
      color,
      alpha: 0.1,
      maxAlpha: 0.60 + Math.random() * 0.25,
      life: 80 + Math.floor(Math.random() * 35),
      maxLife: 100
    };
  },

  updateClearSequence(state, engine) {
    if (!state.clearSequence || !state.clearSequence.active) return;
    const seq = state.clearSequence;
    seq.frame++;

    // Step 1: 0..45 Frame -> Shatter table frame pieces
    seq.shatterPieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.16;
      p.vx *= 0.98;
      p.angle += p.vAngle;
      p.life--;
    });

    // Step 2: 25..120 Frame -> Billowing Smoke & Whiteout
    if (seq.frame >= 25 && seq.frame <= 120) {
      for (let i = 0; i < 3; i++) {
        const col = Math.random() > 0.5 ? "#00f5d4" : (Math.random() > 0.5 ? "#ff007f" : "#ffffff");
        seq.smokeClouds.push(this.spawnSmokeCloud(state.boss.core.x, state.boss.core.y, col));
      }
      if (seq.frame % 2 === 0) {
        seq.smokeClouds.push(this.spawnSmokeCloud(100 + Math.random() * 220, 580, "#ffffff"));
      }
    }

    // Whiteout buildup
    if (seq.frame >= 65 && seq.frame <= 105) {
      seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 65) / 38);
      if (seq.frame === 104 && window.sfx) {
        window.sfx.burstTrigger();
      }
    }

    // Step 3: Frame 105+ -> Soft glow & settle
    if (seq.frame >= 105) {
      seq.cgRevealAlpha = 1.0;
      seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);

      if (seq.frame % 2 === 0) {
        const colors = ["#ffffff", "#e0ffff", "#00f5d4", "#ff80df"];
        const col = colors[Math.floor(Math.random() * colors.length)];
        seq.smokeClouds.push({
          x: state.boss.core.x + (Math.random() - 0.5) * 30,
          y: state.boss.core.y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 1.6,
          vy: -1.0 - Math.random() * 2.0,
          r: 16 + Math.random() * 14,
          maxR: 50 + Math.random() * 25,
          growth: 0.6 + Math.random() * 0.5,
          color: col,
          alpha: 0.15,
          maxAlpha: 0.60 + Math.random() * 0.20,
          life: 80 + Math.floor(Math.random() * 35),
          maxLife: 95
        });
      }
    }

    // Update smoke clouds
    for (let i = seq.smokeClouds.length - 1; i >= 0; i--) {
      const smk = seq.smokeClouds[i];
      smk.x += smk.vx;
      smk.y += smk.vy;
      smk.vy *= 0.98;
      smk.vx *= 0.97;
      if (smk.r < smk.maxR) smk.r += smk.growth;
      smk.life--;
      const progress = 1 - (smk.life / smk.maxLife);
      if (progress < 0.2) {
        smk.alpha = (progress / 0.2) * smk.maxAlpha;
      } else {
        smk.alpha = Math.max(0, (1 - (progress - 0.2) / 0.8) * smk.maxAlpha);
      }
      if (smk.life <= 0 || smk.alpha <= 0.01) {
        seq.smokeClouds.splice(i, 1);
      }
    }

    // Step 4: Frame 155+ -> Show Clear Modal
    if (seq.frame >= 155 && !seq.uiShown) {
      seq.uiShown = true;
      UI.updateHUD(state);
      const modal = document.getElementById("clearModal");
      if (modal) {
        // キャラクター名とセリフをステージ2（セルティ）用に設定
        const nameEl = modal.querySelector(".text-\\[\\#ff66b2\\]");
        if (nameEl) nameEl.textContent = "セルティ (CERTI)";
        const quoteEl = modal.querySelector("p");
        if (quoteEl) quoteEl.innerHTML = "「な、なによこれぇっ…！？ プラズマ炉がオーバーヒートだなんて……！<br>あ、熱い…装甲パージが止まらないわ……っ！」";

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        void modal.offsetWidth;
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
      }
    }
  },

  getLaserEndPoint(holo, maxW = 420, maxH = 660) {
    const cos = Math.cos(holo.beamAngle);
    const sin = Math.sin(holo.beamAngle);
    let minT = 1200;

    // テーブルの境界壁セグメント（外周壁・シューターレーン仕切り壁・下部ガイド壁）
    const walls = (window.Physics && window.Physics.TABLE_WALLS) || [];
    const allWalls = [
      ...walls,
      // テーブル底辺境界（ドレイン付近）
      { x1: 0, y1: maxH - 12, x2: maxW, y2: maxH - 12 }
    ];

    allWalls.forEach(w => {
      const vx = w.x2 - w.x1;
      const vy = w.y2 - w.y1;
      const denom = cos * vy - sin * vx;
      if (Math.abs(denom) < 1e-7) return;

      const ax = w.x1 - holo.x;
      const ay = w.y1 - holo.y;
      const t = (ax * vy - ay * vx) / denom;
      const u = (ax * sin - ay * cos) / denom;

      // 前方方向の壁かつ線分区間内（u: 0..1）
      if (t > 4.0 && u >= -0.01 && u <= 1.01) {
        if (t < minT) minT = t;
      }
    });

    // 画面外枠矩形とのフォールバック交点
    if (cos > 1e-4) {
      const t = (maxW - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    } else if (cos < -1e-4) {
      const t = (0 - holo.x) / cos;
      if (t > 0 && t < minT) minT = t;
    }

    if (sin > 1e-4) {
      const t = (maxH - holo.y) / sin;
      if (t > 0 && t < minT) minT = t;
    } else if (sin < -1e-4) {
      const t = (0 - holo.y) / sin;
      if (t > 0 && t < minT) minT = t;
    }

    return {
      x: holo.x + cos * minT,
      y: holo.y + sin * minT,
      len: minT
    };
  },

  triggerJetBlast(state) {
    const jet = state.boss.jet;
    if (!jet) return;

    jet.timer = 85;
    jet.active = true;
    if (window.sfx && window.sfx.feverAlarm) {
      window.sfx.feverAlarm();
    }

    UI.showCutin("🚀【背中ジェット噴射！】🚀<br>「ひゃんっ！？ どこ当ててるのバカッ！<br>吹き飛びなさいっっ！！」", 180);

    state.shockwaves.push({
      x: jet.x,
      y: jet.y,
      r: 10,
      maxR: 175,
      color: "#00f5d4",
      alpha: 1.0
    });
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };

    if (!this.assets.loaded || !this.assets.bareImg.complete) {
      ctx.fillStyle = "#120624";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    ctx.save();
    // 1. ベース原画描画
    ctx.drawImage(this.assets.bareImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    const srcScaleX = this.assets.bareImg.width / IMG_BOX.w;
    const srcScaleY = this.assets.bareImg.height / IMG_BOX.h;

    // 2. 胸のぷるぷる揺れ処理（tipBustの振動変形）
    const bust = state.boss.tipBust;
    if (bust && Math.hypot(bust.dx, bust.dy) > 0.3) {
      ctx.save();
      const cx = bust.x + bust.dx;
      const cy = bust.y + bust.dy;
      const scaleX = 1 + (bust.dx * 0.015) - (bust.dy * 0.010);
      const scaleY = 1 + (bust.dy * 0.015) - (bust.dx * 0.010);

      ctx.translate(cx, cy);
      ctx.scale(scaleX, scaleY);
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 28, -0.2, 0, Math.PI * 2);
      ctx.clip();

      const sx = (bust.x - 24 - IMG_BOX.x) * srcScaleX;
      const sy = (bust.y - 28 - IMG_BOX.y) * srcScaleY;
      const sw = 48 * srcScaleX;
      const sh = 56 * srcScaleY;

      ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -24, -28, 48, 56);
      ctx.restore();
    }

    // 3. お尻のぷるんぷるん揺れ処理（左右2つの円近似 ＆ 中心強く周辺馴染ませ）
    const renderCheekJiggle = (b) => {
      if (!b) return;
      const disp = Math.hypot(b.dx, b.dy);
      if (disp < 0.25) return;

      // 4層同心変形（外周は滑らかなアルファブレンドで水着ラインの千切れを根絶し、中心ほど豊かに揺れる）
      const layers = [
        { ratio: 1.05, weight: 0.12, alpha: 0.35 },
        { ratio: 0.85, weight: 0.45, alpha: 0.65 },
        { ratio: 0.60, weight: 0.80, alpha: 0.85 },
        { ratio: 0.35, weight: 1.00, alpha: 1.00 }
      ];

      layers.forEach(layer => {
        ctx.save();
        const curDx = b.dx * layer.weight;
        const curDy = b.dy * layer.weight;
        const cx = b.x + curDx;
        const cy = b.y + curDy;
        const scaleX = 1 + (curDx * 0.010) - (curDy * 0.006);
        const scaleY = 1 + (curDy * 0.010) - (curDx * 0.006);

        ctx.translate(cx, cy);
        ctx.scale(scaleX, scaleY);
        ctx.beginPath();
        ctx.ellipse(0, 0, b.rx * layer.ratio, b.ry * layer.ratio, 0.05, 0, Math.PI * 2);
        ctx.clip();

        const sx = (b.x - b.rx - IMG_BOX.x) * srcScaleX;
        const sy = (b.y - b.ry - IMG_BOX.y) * srcScaleY;
        const sw = b.rx * 2 * srcScaleX;
        const sh = b.ry * 2 * srcScaleY;

        ctx.globalAlpha = layer.alpha;
        ctx.drawImage(this.assets.bareImg, sx, sy, sw, sh, -b.rx, -b.ry, b.rx * 2, b.ry * 2);
        ctx.restore();
      });
    };
    renderCheekJiggle(state.boss.buttL);
    renderCheekJiggle(state.boss.buttR);

    // 3.5. 左足付け根の丸い装甲パーツ：剛体レイヤー分離描画
    // お尻の変形によって装甲が撓むのを完全に防ぎ、形を保ったままお尻の揺れに引かれて少しだけ連動（35%）
    if (this.assets.hipJointImg && this.assets.hipJointImg.complete) {
      ctx.save();
      const bL = state.boss.buttL;
      const jDx = (bL ? bL.dx : 0) * 0.35;
      const jDy = (bL ? bL.dy : 0) * 0.35;
      const jw = (140 / 768) * IMG_BOX.w;
      const jh = (140 / 1376) * IMG_BOX.h;
      const jx = IMG_BOX.x + (298 / 768) * IMG_BOX.w + jDx;
      const jy = IMG_BOX.y + (1091 / 1376) * IMG_BOX.h + jDy;
      ctx.drawImage(this.assets.hipJointImg, jx - jw / 2, jy - jh / 2, jw, jh);
      ctx.restore();
    }

    // 4. 左手奥ホログラム：対象物（シアンのホログラム投影）のみに限定したラスターグリッジノイズ
    // 重なっている指や背景には一切影響を与えない
    const holo = state.boss.hologram;
    if (holo && this.assets.hologramImg && this.assets.hologramImg.complete) {
      const hx = IMG_BOX.x + (3 / 768) * IMG_BOX.w;
      const hy = IMG_BOX.y + (341 / 1376) * IMG_BOX.h;
      const hw = (129 / 768) * IMG_BOX.w;
      const hh = (123 / 1376) * IMG_BOX.h;

      const slices = 8;
      const sliceH = hh / slices;
      const srcSliceH = this.assets.hologramImg.height / slices;

      for (let i = 0; i < slices; i++) {
        const isGlitching = Math.random() < 0.35 || holo.laserState === "charge";
        const shift = isGlitching ? (Math.random() - 0.5) * 6.5 + (holo.glitchShift || 0) : 0;

        if (Math.abs(shift) > 0.5) {
          ctx.save();
          // シアン/マゼンタの色ズレゴースト
          if (Math.random() < 0.5) {
            ctx.globalAlpha = 0.55;
            ctx.drawImage(
              this.assets.hologramImg,
              0, i * srcSliceH, this.assets.hologramImg.width, srcSliceH,
              hx + shift * 1.4, hy + i * sliceH, hw, sliceH
            );
          }
          ctx.globalAlpha = 0.85;
          ctx.drawImage(
            this.assets.hologramImg,
            0, i * srcSliceH, this.assets.hologramImg.width, srcSliceH,
            hx + shift, hy + i * sliceH, hw, sliceH
          );
          ctx.restore();
        }
      }
    }

    // 4.5. パーツブレイク破損差分描画（左腕・右腕・背中ノズル）
    // A. 左腕関節装甲（大破時：装甲欠損・火花・内部フレーム露出差分をオーバーレイ描画）
    if (state.boss.elbowL && state.boss.elbowL.broken && this.assets.gauntletLBrokenImg && this.assets.gauntletLBrokenImg.complete) {
      ctx.save();
      const gx = IMG_BOX.x + (40 / 768) * IMG_BOX.w;
      const gy = IMG_BOX.y + (360 / 1376) * IMG_BOX.h;
      const gw = (180 / 768) * IMG_BOX.w;
      const gh = (160 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.gauntletLBrokenImg, gx, gy, gw, gh);
      if (Math.random() < 0.15) {
        Particles.add(state, state.boss.elbowL.x + (Math.random() - 0.5) * 16, state.boss.elbowL.y + (Math.random() - 0.5) * 16, "#e6ff00", 2, 2.0);
      }
      ctx.restore();
    }

    // B. 右腕関節装甲（大破時：装甲欠損・火花差分をオーバーレイ描画）
    if (state.boss.elbowR && state.boss.elbowR.broken && this.assets.gauntletRBrokenImg && this.assets.gauntletRBrokenImg.complete) {
      ctx.save();
      const gx = IMG_BOX.x + (580 / 768) * IMG_BOX.w;
      const gy = IMG_BOX.y + (650 / 1376) * IMG_BOX.h;
      const gw = (188 / 768) * IMG_BOX.w;
      const gh = (200 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.gauntletRBrokenImg, gx, gy, gw, gh);
      if (Math.random() < 0.15) {
        Particles.add(state, state.boss.elbowR.x + (Math.random() - 0.5) * 18, state.boss.elbowR.y + (Math.random() - 0.5) * 18, "#e6ff00", 2, 2.0);
      }
      ctx.restore();
    }

    // C. 背中ブースターノズル（大破時：破損ノズル・黒煙差分をオーバーレイ描画）
    const isThrustersBroken = (state.boss.nozzleL && state.boss.nozzleL.broken) || (state.boss.nozzleR && state.boss.nozzleR.broken);
    if (isThrustersBroken && this.assets.nozzlesBrokenImg && this.assets.nozzlesBrokenImg.complete) {
      ctx.save();
      const nx = IMG_BOX.x + (440 / 768) * IMG_BOX.w;
      const ny = IMG_BOX.y + (720 / 1376) * IMG_BOX.h;
      const nw = (140 / 768) * IMG_BOX.w;
      const nh = (110 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.nozzlesBrokenImg, nx, ny, nw, nh);
      if (Math.random() < 0.25) {
        const nozPos = (state.boss.nozzleL && state.boss.nozzleL.broken) ? state.boss.nozzleL : state.boss.nozzleR;
        state.particles.push({
          x: nozPos.x + (Math.random() - 0.5) * 14,
          y: nozPos.y + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 1.5,
          vy: -1.5 - Math.random() * 2.0,
          color: Math.random() < 0.5 ? "#333333" : "#552244",
          life: 20,
          scale: 1.8
        });
      }
      ctx.restore();
    }

    // 5. Dynamic Face Expression Patch (透過アルファスプライトによる自然な瞬き・ウインク・感情遷移)
    const isDefeat = state.clearSequence && state.clearSequence.active;
    const fa = state.boss.faceAnim || {};
    const isTalking = (state.boss.talkTimer > 0) || (state.cutin && state.cutin.timer > 0);
    // 自然なリズム（約200ms単位）での口パク
    const talkCycle = Math.floor(performance.now() * 0.005) % 3;

    let activePatchKey = null;
    let patchAlpha = 1.0;

    if (isDefeat) {
      activePatchKey = "open_blush";
      patchAlpha = 1.0;
    } else if (state.boss.expression && state.boss.expression !== "normal") {
      activePatchKey = state.boss.expression;
      patchAlpha = 1.0;
    } else if (isTalking) {
      activePatchKey = (talkCycle === 0) ? "talk" : ((talkCycle === 1) ? "talk_sm" : null);
      patchAlpha = 0.95;
    } else if (fa.winkFrame > 0) {
      activePatchKey = "wink";
      if (fa.winkFrame > 41) {
        patchAlpha = (45 - fa.winkFrame) / 4.0;
      } else if (fa.winkFrame <= 4) {
        patchAlpha = fa.winkFrame / 4.0;
      } else {
        patchAlpha = 1.0;
      }
    } else if (fa.blinkFrame > 0) {
      activePatchKey = "blink";
      // 16フレームの自然な瞬きイージング（閉じ始め3f -> 完全閉じ10f -> 開き3f）
      if (fa.blinkFrame > 13) {
        patchAlpha = 0.4 + (16 - fa.blinkFrame) * 0.2; // 0.4 -> 0.8
      } else if (fa.blinkFrame <= 3) {
        patchAlpha = fa.blinkFrame * 0.25; // 0.75 -> 0.25
      } else {
        patchAlpha = 1.0; // しっかり目を閉じている
      }
    } else if (fa.talkFrame > 0) {
      activePatchKey = "talk_sm";
      if (fa.talkFrame > 20) {
        patchAlpha = (24 - fa.talkFrame) / 4.0;
      } else if (fa.talkFrame <= 4) {
        patchAlpha = fa.talkFrame / 4.0;
      } else {
        patchAlpha = 0.95;
      }
    }

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (270 / 768) * IMG_BOX.w;
      const fy = IMG_BOX.y + (310 / 1376) * IMG_BOX.h;
      const fw = (190 / 768) * IMG_BOX.w;
      const fh = (170 / 1376) * IMG_BOX.h;

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1.0, patchAlpha));
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
      ctx.restore();
    }

    // 6. クリア演出時のモクモクスモーククラウド描画
    if (state.clearSequence && state.clearSequence.smokeClouds && state.clearSequence.smokeClouds.length > 0) {
      ctx.save();
      state.clearSequence.smokeClouds.forEach(smk => {
        ctx.save();
        ctx.globalAlpha = smk.alpha;
        const grad = ctx.createRadialGradient(smk.x, smk.y, smk.r * 0.15, smk.x, smk.y, smk.r);
        grad.addColorStop(0, smk.color);
        grad.addColorStop(0.65, smk.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smk.x, smk.y, smk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    ctx.restore();
  },

  renderTargets(ctx, state, engine) {
    if (!state.boss) return;
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
    if (isPostWhiteout) return;

    const animTick = state.boss.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. カチューシャのアンテナ先端（ターゲットマーク不要：放電中・予兆時のみ電撃エフェクトを描画）
    const ant = state.boss.antenna;
    if (ant) {
      if (ant.isActive) {
        // 放電中：激しいプラズマコアと四方八方に走る稲妻アーク放電
        ctx.save();
        ctx.translate(ant.x, ant.y);

        const pulse = 1.0 + Math.sin(performance.now() * 0.08) * 0.25;
        const gradCore = ctx.createRadialGradient(0, 0, 2, 0, 0, 16 * pulse);
        gradCore.addColorStop(0, "#ffffff");
        gradCore.addColorStop(0.35, "rgba(0, 245, 212, 0.90)");
        gradCore.addColorStop(0.7, "rgba(0, 245, 212, 0.40)");
        gradCore.addColorStop(1, "rgba(0, 245, 212, 0)");
        ctx.fillStyle = gradCore;
        ctx.beginPath();
        ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // 激しく走る稲妻放電ボルト（5本）
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        ctx.shadowColor = "#00f5d4";
        ctx.shadowBlur = 8;

        const bolts = 5;
        for (let b = 0; b < bolts; b++) {
          const baseAngle = (b / bolts) * Math.PI * 2 + (performance.now() * 0.006);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          let curX = 0;
          let curY = 0;
          const segments = 4;
          const boltLen = (ant.r + 6 + Math.random() * 8) / segments;
          for (let s = 1; s <= segments; s++) {
            const jag = (Math.random() - 0.5) * 8;
            const a = baseAngle + jag * 0.15;
            curX += Math.cos(a) * boltLen + (Math.random() - 0.5) * 3;
            curY += Math.sin(a) * boltLen + (Math.random() - 0.5) * 3;
            ctx.lineTo(curX, curY);
          }
          ctx.stroke();
        }

        ctx.restore();
      } else if (ant.isWarning) {
        // 放電予兆：アンテナ先端から時折パチパチと散る小スパーク
        if (Math.random() < 0.65) {
          ctx.save();
          ctx.translate(ant.x, ant.y);
          ctx.strokeStyle = Math.random() < 0.5 ? "#ffffff" : "#e6ff00";
          ctx.lineWidth = 1.5;
          ctx.shadowColor = "#e6ff00";
          ctx.shadowBlur = 6;
          const a = Math.random() * Math.PI * 2;
          const d = 5 + Math.random() * 9;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
          ctx.lineTo(Math.cos(a) * d + (Math.random() - 0.5) * 4, Math.sin(a) * d + (Math.random() - 0.5) * 4);
          ctx.stroke();
          ctx.restore();
        }
      }
      // 安全待機時：ターゲットマークは一切描画しない（原画のまま）
    }

    // 2. 左手奥ホログラム砲台（Phase 1: シールド / Phase 2: 攻撃可能ターゲット / 破壊後: 沈黙）
    const holo = state.boss.hologram;
    if (holo) {
      if (!holo.broken) {
        if (state.phase < 2 || holo.isShielded) {
          drawGuide(holo.x, holo.y, holo.r, "#00f5d4", holo.flash, 0, "HOLO CANNON", "SHIELDED");
        } else {
          drawGuide(holo.x, holo.y, holo.r, "#ff007f", holo.flash, animTick * 0.03, "HOLO CANNON", `HP:${holo.hp}`);
        }
      } else {
        drawGuide(holo.x, holo.y, holo.r, "#555555", 0, 0, "HOLO CANNON", "DESTROYED");
      }

      const endPt = this.getLaserEndPoint(holo, 420, 660);
      const ex = holo.beamEndX || endPt.x;
      const ey = holo.beamEndY || endPt.y;

      // --- エネルギー充填アニメーション ---
      if (holo.laserState === "charge") {
        ctx.save();
        const chargeRatio = Math.max(0, Math.min(1, 1 - (holo.laserTimer / 55)));

        // A. 収縮するエネルギーリング（外側から中心へ吸い込まれるインプロージョン）
        for (let rIdx = 0; rIdx < 3; rIdx++) {
          const phase = (animTick * 0.07 + rIdx * 0.33) % 1.0;
          const ringRadius = (1.0 - phase) * 28 + 3;
          ctx.strokeStyle = holo.isLocked ? `rgba(255, 0, 85, ${0.4 + phase * 0.6})` : `rgba(0, 245, 212, ${0.3 + phase * 0.5})`;
          ctx.lineWidth = 1.5 + phase * 1.5;
          ctx.beginPath();
          ctx.arc(holo.x, holo.y, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // B. 中心プラズマコア（チャージ進行で巨大化＆激しく脈動）
        const coreR = Math.max(2, 4 + chargeRatio * 9 + Math.sin(animTick * 0.4) * 2.5);

        // コア外殻グロー
        const outerR = Math.max(coreR + 2, coreR * 1.8);
        const grad = ctx.createRadialGradient(holo.x, holo.y, 1, holo.x, holo.y, outerR);
        grad.addColorStop(0, "#ffffff");
        grad.addColorStop(0.4, holo.isLocked ? "#ff0055" : "#00f5d4");
        grad.addColorStop(1, "rgba(255, 0, 127, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, outerR, 0, Math.PI * 2);
        ctx.fill();

        // コア内核（高熱ホワイト）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, coreR * 0.55, 0, Math.PI * 2);
        ctx.fill();

        // C. ロックオン臨界放電アーク（発射直前：中心から周囲へバチバチ放電）
        if (holo.isLocked) {
          ctx.strokeStyle = (Math.floor(animTick * 0.5) % 2 === 0) ? "#ffffff" : "#ff0055";
          ctx.lineWidth = 1.8;
          for (let a = 0; a < 4; a++) {
            const baseAng = a * (Math.PI / 2) + animTick * 0.25;
            const midR = 12 + Math.random() * 6;
            const endR = 20 + Math.random() * 8;
            ctx.beginPath();
            ctx.moveTo(holo.x, holo.y);
            ctx.lineTo(holo.x + Math.cos(baseAng + 0.3) * midR, holo.y + Math.sin(baseAng + 0.3) * midR);
            ctx.lineTo(holo.x + Math.cos(baseAng - 0.2) * endR, holo.y + Math.sin(baseAng - 0.2) * endR);
            ctx.stroke();
          }

          // 警告パルスエイムライン（赤白点滅）
          const isPulse = Math.floor(animTick * 0.4) % 2 === 0;
          ctx.strokeStyle = isPulse ? "#ff0055" : "#ffffff";
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(holo.x, holo.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // 画面端のロックオンレティクル
          ctx.strokeStyle = "#ff0055";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(ex, ey, 9, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          // 照準追跡中：ピンク破線エイムラインがボールをトラッキング！
          ctx.strokeStyle = "rgba(255, 0, 127, 0.75)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(holo.x, holo.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();

          // 画面端の照準レティクル
          ctx.setLineDash([]);
          ctx.strokeStyle = "#ff007f";
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(ex, ey, 5 + Math.sin(animTick * 0.1) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      } else if (holo.laserState === "fire") {
        // 強力なネオンレーザービーム本体が画面端まで貫通！
        ctx.save();

        // 1. 最外殻巨大グロー
        ctx.strokeStyle = "rgba(0, 245, 212, 0.25)";
        ctx.lineWidth = 22.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 2. 中間エナジー層
        ctx.strokeStyle = "rgba(0, 245, 212, 0.80)";
        ctx.lineWidth = 10.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 3. ビーム芯線（超高熱ホワイト）
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // 4. 砲身マズルフレア（大閃光＆十字スターバースト）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(holo.x, holo.y, 11 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        // 十字光芒
        ctx.moveTo(holo.x - 24, holo.y); ctx.lineTo(holo.x + 24, holo.y);
        ctx.moveTo(holo.x, holo.y - 24); ctx.lineTo(holo.x, holo.y + 24);
        ctx.stroke();

        // 5. 画面端での着弾衝撃波（巨大な光球・フレア）
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, ey, 8 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey, 16 + Math.random() * 6, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
      }
    }

    // 3. バウンスポイント：手前の左肩装甲（Phase 1 破壊対象 HP 6）
    const shL = state.boss.shoulderL;
    if (shL) {
      drawGuide(shL.x, shL.y, shL.r, shL.broken ? "#555555" : "#ff007f", shL.flash, animTick * 0.02, "L-SHOULDER", shL.broken ? "PURGED" : `HP:${shL.hp}/6`);
    }

    // 4. 腕部関節装甲ターゲット：肘（左肘＆右肘：Phase 1 破壊対象 各HP 5）
    const elbL = state.boss.elbowL;
    if (elbL) {
      drawGuide(elbL.x, elbL.y, elbL.r, elbL.broken ? "#555555" : "#ff007f", elbL.flash, -animTick * 0.02, "L-ARM", elbL.broken ? "DESTROYED" : `HP:${elbL.hp}/5`);
    }
    const elbR = state.boss.elbowR;
    if (elbR) {
      drawGuide(elbR.x, elbR.y, elbR.r, elbR.broken ? "#555555" : "#ff007f", elbR.flash, animTick * 0.02, "R-ARM", elbR.broken ? "DESTROYED" : `HP:${elbR.hp}/5`);
    }

    // 4.5. 背中ブースターノズル噴射口ターゲット（左右2基：Phase 2 破壊対象 各HP 4）
    const nozL = state.boss.nozzleL;
    if (nozL) {
      const colL = nozL.broken ? "#555555" : (state.phase < 2 ? "#e6ff00" : "#ff007f");
      const subL = nozL.broken ? "OFFLINE" : (state.phase < 2 ? "ARMORED" : `HP:${nozL.hp}/4`);
      drawGuide(nozL.x, nozL.y, nozL.r, colL, nozL.flash, animTick * 0.025, "NOZZLE-L", subL);
    }
    const nozR = state.boss.nozzleR;
    if (nozR) {
      const colR = nozR.broken ? "#555555" : (state.phase < 2 ? "#e6ff00" : "#ff007f");
      const subR = nozR.broken ? "OFFLINE" : (state.phase < 2 ? "ARMORED" : `HP:${nozR.hp}/4`);
      drawGuide(nozR.x, nozR.y, nozR.r, colR, nozR.flash, -animTick * 0.025, "NOZZLE-R", subR);
    }

    // 5. 胸の先端（JET SENSOR ＆ BUST TARGET：Phase 2 破壊対象 HP 6）
    const bTip = state.boss.tipBust;
    if (bTip) {
      const colB = bTip.broken ? "#555555" : (state.phase < 2 ? "#e6ff00" : "#ff1493");
      drawGuide(bTip.x, bTip.y, bTip.r, colB, bTip.flash, animTick * 0.03, "♥BUST TIP", bTip.broken ? "PURGED" : `HP:${bTip.hp}/6`);
    }

    // 6. メイン動力炉：プラズマ・リアクターコア（Phase 3 最終決戦ターゲット HP 12）
    const core = state.boss.core;
    if (core) {
      if (state.phase === 3 && core.unlocked) {
        drawGuide(core.x, core.y, core.r, "#00f5d4", core.flash, animTick * 0.04, "★REACTOR CORE★", `HP:${core.hp}/12 [K.O. TARGET]`);
      } else if (core.unlocked) {
        drawGuide(core.x, core.y, core.r, "#e6ff00", core.flash, animTick * 0.02, "★CORE UNLOCKED★", "BONUS TARGET");
      }
    }

    // 7. 【破壊不能バウンスバンパー】左足付け根の丸い装甲パーツ（剛体CYBER BUMP：照準なし・シアン波紋クッション）
    const hip = state.boss.hipJointL;
    if (hip) {
      const bL = state.boss.buttL;
      const jDx = (bL ? bL.dx : 0) * 0.35;
      const jDy = (bL ? bL.dy : 0) * 0.35;
      Particles.drawBounceBumperGuide(ctx, animTick, hip.x + jDx, hip.y + jDy, hip.r, "#00f5d4", hip.flash, "HIP JOINT", "CYBER BUMP");
    }

    // 8. 【破壊不能バウンスバンパー】カチューシャ猫耳三角バウンス板（シアン反発フレーム・照準なし）
    const drawCatEar = (ear, label) => {
      if (!ear) return;
      ctx.save();
      const f = ear.flash || 0;
      ctx.strokeStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.lineWidth = f > 0 ? 3.0 : 2.0;
      ctx.fillStyle = f > 0 ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 245, 212, 0.20)";

      // 三角形フレーム
      ctx.beginPath();
      ctx.moveTo(ear.v1.x, ear.v1.y);
      ctx.lineTo(ear.v2.x, ear.v2.y);
      ctx.lineTo(ear.v3.x, ear.v3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3頂点のサイバーノード（コーナー接点）
      [ear.v1, ear.v2, ear.v3].forEach(v => {
        ctx.fillStyle = f > 0 ? "#ffffff" : "#00f5d4";
        ctx.beginPath();
        ctx.arc(v.x, v.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.0;
        ctx.stroke();
      });

      // 内側サイバースリット（先端から底辺中点へのリブ）
      ctx.strokeStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const midBaseX = (ear.v2.x + ear.v3.x) / 2;
      const midBaseY = (ear.v2.y + ear.v3.y) / 2;
      ctx.moveTo(ear.v1.x, ear.v1.y);
      ctx.lineTo(midBaseX, midBaseY);
      ctx.stroke();

      ctx.font = "bold 8px monospace";
      ctx.fillStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.0;
      ctx.strokeText("BOUNCE", ear.cx, ear.v1.y - 6);
      ctx.fillText("BOUNCE", ear.cx, ear.v1.y - 6);
      ctx.restore();
    };
    drawCatEar(state.boss.catEarL, "L-EAR");
    drawCatEar(state.boss.catEarR, "R-EAR");

    // 9. 背中ジェット噴射火炎（左右2基のノズル先端開口部から吹き出る指向性超音速プラズマ噴流）
    const jet = state.boss.jet;
    if (jet && jet.active) {
      const pulse = 1.0 + Math.sin(performance.now() * 0.05) * 0.12;
      const nozzleR = 6.0;

      const nozzlesToFire = [];
      if (state.boss.nozzleL && !state.boss.nozzleL.broken) nozzlesToFire.push(state.boss.nozzleL);
      if (state.boss.nozzleR && !state.boss.nozzleR.broken) nozzlesToFire.push(state.boss.nozzleR);

      nozzlesToFire.forEach(noz => {
        ctx.save();
        ctx.translate(noz.x, noz.y);
        const jetAngle = noz.angle || (Math.PI * 0.46);
        ctx.rotate(jetAngle);

        const length = (78 + Math.random() * 20) * pulse;
        const plumeMaxW = 16.0 * pulse;

        // A. 外層プラズマ火炎プルーム（シアン〜マゼンタの超音速コーン）
        const gradPlume = ctx.createLinearGradient(0, 0, length, 0);
        gradPlume.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        gradPlume.addColorStop(0.12, "rgba(0, 245, 212, 0.90)");
        gradPlume.addColorStop(0.50, "rgba(255, 0, 127, 0.60)");
        gradPlume.addColorStop(1.0, "rgba(255, 0, 127, 0)");

        ctx.fillStyle = gradPlume;
        ctx.beginPath();
        ctx.moveTo(0, -nozzleR);
        ctx.lineTo(length * 0.38, -plumeMaxW);
        ctx.lineTo(length, 0);
        ctx.lineTo(length * 0.38, plumeMaxW);
        ctx.lineTo(0, nozzleR);
        ctx.closePath();
        ctx.fill();

        // B. 内層コア火炎（超音速高密度白熱プラズマ芯）
        const coreLen = length * 0.65;
        const coreW = plumeMaxW * 0.48;
        const gradCore = ctx.createLinearGradient(0, 0, coreLen, 0);
        gradCore.addColorStop(0, "#ffffff");
        gradCore.addColorStop(0.35, "rgba(0, 245, 212, 0.95)");
        gradCore.addColorStop(1.0, "rgba(0, 245, 212, 0)");

        ctx.fillStyle = gradCore;
        ctx.beginPath();
        ctx.moveTo(0, -nozzleR * 0.65);
        ctx.lineTo(coreLen * 0.32, -coreW);
        ctx.lineTo(coreLen, 0);
        ctx.lineTo(coreLen * 0.32, coreW);
        ctx.lineTo(0, nozzleR * 0.65);
        ctx.closePath();
        ctx.fill();

        // C. ショックダイヤモンド（マッハディスク：3連ひし形衝撃波）
        for (let d = 1; d <= 3; d++) {
          const dx = (length * 0.19) * d;
          const dw = 4.2 * (1 - d * 0.22) * pulse;
          const dh = 5.5 * (1 - d * 0.22) * pulse;
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.beginPath();
          ctx.moveTo(dx - dw, 0);
          ctx.lineTo(dx, -dh);
          ctx.lineTo(dx + dw, 0);
          ctx.lineTo(dx, dh);
          ctx.closePath();
          ctx.fill();
        }

        // D. ノズル先端開口部リング
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(0, 0, 2.5, nozzleR, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
      });
    }
  },

  renderHUD(ctx, state) {},

  renderOverlays(ctx, state) {
    if (!state.clearSequence || !state.clearSequence.active) return;
    const seq = state.clearSequence;

    // 1. シャッターピース（粉砕されたテーブル外枠破片）
    if (seq.shatterPieces && seq.shatterPieces.length > 0) {
      ctx.save();
      seq.shatterPieces.forEach(p => {
        if (p.life <= 0) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.fillStyle = p.color || "#00f5d4";
        ctx.globalAlpha = Math.max(0, Math.min(1.0, p.life / 30));
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      ctx.restore();
    }

    // 2. モクモクスモーククラウド
    if (seq.smokeClouds && seq.smokeClouds.length > 0) {
      ctx.save();
      seq.smokeClouds.forEach(smk => {
        ctx.save();
        ctx.globalAlpha = smk.alpha;
        const grad = ctx.createRadialGradient(smk.x, smk.y, smk.r * 0.15, smk.x, smk.y, smk.r);
        grad.addColorStop(0, smk.color);
        grad.addColorStop(0.65, smk.color);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(smk.x, smk.y, smk.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }

    // 3. ホワイトアウト閃光フラッシュ
    if (seq.whiteoutAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1.0, seq.whiteoutAlpha);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 420, 660);
      ctx.restore();
    }
  },

  getTargetDesc(state) {
    if (!state.boss) return "---";
    if (state.stageCleared) {
      return "✨セルティ撃破完了！ STAGE 2 CLEAR!!✨";
    }

    if (state.phase === 3) {
      return "💥CRITICAL TARGET: 露出したプラズマ・リアクターコア(CORE)を直撃せよ！";
    }

    if (state.phase === 2) {
      const holo = state.boss.hologram;
      if (holo && holo.laserState === "charge") {
        return holo.isLocked ? "⚠️レーザー照準ロックオン！緊急回避せよ！" : "⚠️ホログラム砲台がボールを追尾中！停止するな！";
      }
      return "TARGET: ホログラム砲台(HOLO CANNON)、背中ノズル(NOZZLE-L/R) ＆ 胸部先端センサーを破壊せよ！";
    }

    // Phase 1
    const ant = state.boss.antenna;
    if (ant && ant.isActive) {
      return "⚡アンテナ電撃放電中！ 停止タイミングでゲートを抜けろ！";
    }
    return "TARGET: 左肩装甲(L-SHOULDER)、両腕関節装甲(L/R-ARM) ＆ カチューシャアンテナを破壊せよ！";
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const dtArmR = document.getElementById("dtArmRStatus");
    if (dtArmR) {
      const elbR = state.boss.elbowR;
      if (elbR) {
        dtArmR.textContent = elbR.broken ? "💥DESTROYED!" : `R-ARM (${elbR.hp}/5)`;
        dtArmR.className = elbR.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
      }
    }
    const dtArmL = document.getElementById("dtArmLStatus");
    if (dtArmL) {
      const shL = state.boss.shoulderL;
      const elbL = state.boss.elbowL;
      const isArmsBroken = (shL ? shL.broken : true) && (elbL ? elbL.broken : true);
      const curHP = (shL ? (shL.broken ? 0 : shL.hp) : 0) + (elbL ? (elbL.broken ? 0 : elbL.hp) : 0);
      dtArmL.textContent = isArmsBroken ? "💥PURGED!" : `L-ARM/SH (${curHP}/11)`;
      dtArmL.className = isArmsBroken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtChest = document.getElementById("dtChestStatus");
    if (dtChest) {
      const bTip = state.boss.tipBust;
      if (state.phase === 3) {
        const core = state.boss.core;
        dtChest.textContent = core.hp === 0 ? "💥CORE K.O.!" : `★CORE (${core.hp}/12)`;
        dtChest.className = "font-bold text-[#00f5d4] animate-pulse";
      } else {
        dtChest.textContent = bTip.broken ? "💥BUST PURGED!" : `BUST TIP (${bTip.hp}/6)`;
        dtChest.className = bTip.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#ff007f]";
      }
    }
    const dtCrotch = document.getElementById("dtCrotchStatus");
    if (dtCrotch) {
      const holo = state.boss.hologram;
      if (holo.broken) {
        dtCrotch.textContent = "💥HOLO SILENCED";
        dtCrotch.className = "font-bold text-[#ff1493]";
      } else if (holo.isShielded || state.phase < 2) {
        dtCrotch.textContent = "HOLO [SHIELDED]";
        dtCrotch.className = "font-bold text-[#00f5d4]";
      } else {
        dtCrotch.textContent = `HOLO CANNON (${holo.hp}/6)`;
        dtCrotch.className = "font-bold text-[#e6ff00] animate-pulse";
      }
    }

    const faceMap = {
      normal: "疾風の紫電（余裕）",
      wink: "☆放電ウインク☆",
      shock: "⚡焦りショック!?",
      wince: "痛っ…負けないわ！",
      shout: "⚡全出力プラズマ！",
      open_blush: "♥赤面ハァハァ…♥",
      talk: "通信交信中…",
      talk_sm: "呼吸整え中…"
    };
    const faceEl = document.getElementById("bossFaceStatus");
    if (faceEl) faceEl.textContent = faceMap[state.boss.expression] || "疾風の紫電（余裕）";
  }
};

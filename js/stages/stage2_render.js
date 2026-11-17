// =========================================================================
// STAGE 2: RENDERING
// =========================================================================

Object.assign(window.Stage2, {
  // 原画をキャンバス表示サイズ（IMG_BOX）に縮小した画素配列を1度だけ作ってキャッシュ。
  // メイン描画と同じ drawImage 縮小を使うので、変位0の画素はベース描画と完全一致する。
  _getSrcPixels(IMG_BOX) {
    const img = this.assets.bareImg;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const key = img.src + "|" + IMG_BOX.w + "x" + IMG_BOX.h;
    if (this._srcPix && this._srcPix.key === key) return this._srcPix;
    this._srcPix = StageCommon.createPixelBuffer(IMG_BOX.w, IMG_BOX.h, (cc, w, h) => {
      cc.drawImage(img, 0, 0, w, h);
    }, key);
    return this._srcPix;
  },

  // ゴム膜ワープ：各ボディ b（キャンバス座標 x, y, rx, ry と変位 dx, dy）が
  // 重み w = (1 - r^2)^2 の変位場を持ち（中心で1、縁で0かつ傾きも0）、全ボディの変位を合算。
  // 出力画素 p は縮小済み原画の p - offset(p) をバイリニアで逆写像サンプリングする。
  renderSoftWarp(ctx, IMG_BOX, bodies, slotName = "default") {
    const src = this._getSrcPixels(IMG_BOX);
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
      ctx.fillStyle = "#120624";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    const baseImg = isDefeat ? this.assets.defeatCgImg : this.assets.bareImg;

    ctx.save();
    // 1. ベース原画描画（クリア時は大破敗北ご褒美CGを描画）
    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    const srcScaleX = this.assets.bareImg.width / IMG_BOX.w;
    const srcScaleY = this.assets.bareImg.height / IMG_BOX.h;

    // クリアシーケンス中（大破CG表示時）は余計な通常パーツやスプライトを乗せず、大破CGの美しい一枚絵を見せる
    if (!isDefeat) {
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

      // 3. お尻のぷるんぷるん揺れ処理（ゴム膜ワープ）
      this.renderSoftWarp(ctx, IMG_BOX, [state.boss.buttL, state.boss.buttR]);

      // 3.5. 左足付け根の丸い装甲パーツ：剛体レイヤー分離描画
      if (this.assets.hipJointImg && this.assets.hipJointImg.complete) {
        ctx.save();
        const bL = state.boss.buttL;
        const jDx = (bL ? bL.dx : 0) * this.HIP_FOLLOW;
        const jDy = (bL ? bL.dy : 0) * this.HIP_FOLLOW;
        const jw = (140 / 768) * IMG_BOX.w;
        const jh = (140 / 1376) * IMG_BOX.h;
        const jx = IMG_BOX.x + (298 / 768) * IMG_BOX.w + jDx;
        const jy = IMG_BOX.y + (1091 / 1376) * IMG_BOX.h + jDy;
        ctx.drawImage(this.assets.hipJointImg, jx - jw / 2, jy - jh / 2, jw, jh);
        ctx.restore();
      }

      // 4. 左手奥ホログラム：対象物（シアンのホログラム投影）のみに限定したラスターグリッジノイズ
      const holo = state.boss.hologram;
      if (holo && !holo.broken && this.assets.hologramImg && this.assets.hologramImg.complete) {
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
      } else if (holo && holo.broken) {
        // ホログラム砲台破壊時：手首デバイスから火花と黒煙
        if (Math.random() < 0.20) {
          Particles.add(state, holo.x + (Math.random() - 0.5) * 16, holo.y + (Math.random() - 0.5) * 16, "#00f5d4", 2, 2.5);
        }
        if (Math.random() < 0.15) {
          state.particles.push({
            x: holo.x + (Math.random() - 0.5) * 10,
            y: holo.y + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 1.2,
            vy: -1.2 - Math.random() * 1.5,
            color: "#333333",
            life: 20,
            scale: 1.5
          });
        }
      }

      // 4.5. パーツブレイク破損差分描画（アンテナ・左肩・肘・胸部・ノズル・Phase 3 大破）
      // A. アンテナ破損差分（折損・電撃ショート火花）
      if (state.boss.antenna && state.boss.antenna.broken && this.assets.antennaBrokenImg && this.assets.antennaBrokenImg.complete) {
        ctx.save();
        const ax = IMG_BOX.x + (550 / 768) * IMG_BOX.w;
        const ay = IMG_BOX.y + (20 / 1376) * IMG_BOX.h;
        const aw = (200 / 768) * IMG_BOX.w;
        const ah = (220 / 1376) * IMG_BOX.h;
        ctx.drawImage(this.assets.antennaBrokenImg, ax, ay, aw, ah);
        if (Math.random() < 0.25) {
          Particles.add(state, state.boss.antenna.x + (Math.random() - 0.5) * 12, state.boss.antenna.y + (Math.random() - 0.5) * 12, "#e6ff00", 2, 2.5);
        }
        ctx.restore();
      }

      // B. 左肩装甲大破パージ（ピンク装甲吹き飛び・素肌露出）
      if (state.boss.shoulderL && state.boss.shoulderL.broken && this.assets.shoulderLBrokenImg && this.assets.shoulderLBrokenImg.complete) {
        ctx.save();
        const sx = IMG_BOX.x + (260 / 768) * IMG_BOX.w;
        const sy = IMG_BOX.y + (490 / 1376) * IMG_BOX.h;
        const sw = (160 / 768) * IMG_BOX.w;
        const sh = (180 / 1376) * IMG_BOX.h;
        ctx.drawImage(this.assets.shoulderLBrokenImg, sx, sy, sw, sh);
        if (Math.random() < 0.15) {
          Particles.add(state, state.boss.shoulderL.x + (Math.random() - 0.5) * 16, state.boss.shoulderL.y + (Math.random() - 0.5) * 16, "#ff1493", 2, 2.0);
        }
        ctx.restore();
      }

      // C. 左腕関節装甲（大破時：装甲欠損・火花・内部フレーム露出差分）
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

      // D. 右腕関節装甲（大破時：装甲欠損・火花差分）
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

      // E. 胸部センサー破損差分
      if (state.boss.tipBust && state.boss.tipBust.broken && this.assets.bustBrokenImg && this.assets.bustBrokenImg.complete) {
        ctx.save();
        const bx = IMG_BOX.x + (140 / 768) * IMG_BOX.w;
        const by = IMG_BOX.y + (580 / 1376) * IMG_BOX.h;
        const bw = (120 / 768) * IMG_BOX.w;
        const bh = (140 / 1376) * IMG_BOX.h;
        ctx.drawImage(this.assets.bustBrokenImg, bx, by, bw, bh);
        if (Math.random() < 0.15) {
          Particles.add(state, state.boss.tipBust.x + (Math.random() - 0.5) * 10, state.boss.tipBust.y + (Math.random() - 0.5) * 10, "#e6ff00", 2, 2.0);
        }
        ctx.restore();
      }

      // F. 背中ブースターノズル（大破時：破損ノズル・黒煙差分）
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

      // G. 大ブレイク！ Phase 2 突破 / Phase 3 全装甲パージ躯体損壊差分（背中・ヒップ・太ももの大破露出）
      if ((state.phase >= 3 || (state.boss && state.boss.allArmorsPurged)) && this.assets.bodyDamageImg && this.assets.bodyDamageImg.complete) {
        ctx.save();
        const bx = IMG_BOX.x + (200 / 768) * IMG_BOX.w;
        const by = IMG_BOX.y + (680 / 1376) * IMG_BOX.h;
        const bw = (400 / 768) * IMG_BOX.w;
        const bh = (670 / 1376) * IMG_BOX.h;
        ctx.drawImage(this.assets.bodyDamageImg, bx, by, bw, bh);
        if (Math.random() < 0.25) {
          const core = state.boss.core;
          Particles.add(state, core.x + (Math.random() - 0.5) * 20, core.y + (Math.random() - 0.5) * 20, "#00f5d4", 2, 2.5);
        }
        ctx.restore();
      }

      // 5. Dynamic Face Expression Patch (透過アルファスプライトによる自然な瞬き・ウインク・感情遷移)
      const activePatchKey = StageCommon.getActiveFacePatchKey(state.boss, state, {
        defaultExpr: "normal",
        halfBlink: true
      });
      StageCommon.drawFacePatch(
        ctx,
        this.assets.facePatchImgs,
        activePatchKey,
        IMG_BOX,
        { x: 270, y: 310, w: 190, h: 170 },
        { w: 768, h: 1376 }
      );
    } // end if (!isDefeat)

    // 6. クリア演出時のモクモクスモーククラウド描画（大破CGの上に重なってドラマチックに演出）
    StageCommon.renderSmokeClouds(ctx, state);

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
        const bolts = 5;
        const boltPaths = [];
        for (let b = 0; b < bolts; b++) {
          const baseAngle = (b / bolts) * Math.PI * 2 + (performance.now() * 0.006);
          const pts = [{ x: 0, y: 0 }];
          let curX = 0;
          let curY = 0;
          const segments = 4;
          const boltLen = (ant.r + 6 + Math.random() * 8) / segments;
          for (let s = 1; s <= segments; s++) {
            const jag = (Math.random() - 0.5) * 8;
            const a = baseAngle + jag * 0.15;
            curX += Math.cos(a) * boltLen + (Math.random() - 0.5) * 3;
            curY += Math.sin(a) * boltLen + (Math.random() - 0.5) * 3;
            pts.push({ x: curX, y: curY });
          }
          boltPaths.push(pts);
        }

        // Fast outer glow under-stroke
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 5.2;
        boltPaths.forEach(pts => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        });
        ctx.restore();

        // Bright inner core
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.8;
        boltPaths.forEach(pts => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
          ctx.stroke();
        });

        ctx.restore();
      } else if (ant.isWarning) {
        // 放電予兆：アンテナ先端から時折パチパチと散る小スパーク
        if (Math.random() < 0.65) {
          ctx.save();
          ctx.translate(ant.x, ant.y);
          const a = Math.random() * Math.PI * 2;
          const d = 5 + Math.random() * 9;
          const x1 = Math.cos(a) * 3;
          const y1 = Math.sin(a) * 3;
          const x2 = Math.cos(a) * d + (Math.random() - 0.5) * 4;
          const y2 = Math.sin(a) * d + (Math.random() - 0.5) * 4;

          // Outer glow under-stroke
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 4.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          ctx.restore();

          // Bright inner stroke
          ctx.strokeStyle = Math.random() < 0.5 ? "#ffffff" : "#e6ff00";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
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
      const jDx = (bL ? bL.dx : 0) * this.HIP_FOLLOW;
      const jDy = (bL ? bL.dy : 0) * this.HIP_FOLLOW;
      Particles.drawBounceBumperGuide(ctx, animTick, hip.x + jDx, hip.y + jDy, hip.r, "#00f5d4", hip.flash, "HIP JOINT", "CYBER BUMP");
    }

    // 8. 【破壊不能バウンスバンパー】カチューシャ猫耳三角バウンス板（シアン反発フレーム・照準なし）
    const drawCatEar = (ear, label) => {
      if (!ear) return;
      ctx.save();
      const f = ear.flash || 0;
      // 他のガイドと同じ共通パルスで、三角形を重心中心に拡大縮小（線幅は変えない）
      const pulse = Particles.guidePulse(animTick);
      const gx = (ear.v1.x + ear.v2.x + ear.v3.x) / 3;
      const gy = (ear.v1.y + ear.v2.y + ear.v3.y) / 3;
      const P = (v) => ({ x: gx + (v.x - gx) * pulse, y: gy + (v.y - gy) * pulse });
      const v1 = P(ear.v1), v2 = P(ear.v2), v3 = P(ear.v3);
      ctx.strokeStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.lineWidth = f > 0 ? 3.0 : 2.0;
      ctx.fillStyle = f > 0 ? "rgba(255, 255, 255, 0.45)" : "rgba(0, 245, 212, 0.20)";

      // 三角形フレーム
      ctx.beginPath();
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(v2.x, v2.y);
      ctx.lineTo(v3.x, v3.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 3頂点のサイバーノード（コーナー接点）
      [v1, v2, v3].forEach(v => {
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
      const midBaseX = (v2.x + v3.x) / 2;
      const midBaseY = (v2.y + v3.y) / 2;
      ctx.moveTo(v1.x, v1.y);
      ctx.lineTo(midBaseX, midBaseY);
      ctx.stroke();

      ctx.font = "bold 8px monospace";
      ctx.fillStyle = f > 0 ? "#ffffff" : "#00f5d4";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.0;
      ctx.strokeText("BOUNCE", ear.cx, v1.y - 6);
      ctx.fillText("BOUNCE", ear.cx, v1.y - 6);
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
  }
});

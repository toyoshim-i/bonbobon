// =========================================================================
// STAGE 3: RENDERING
// =========================================================================

Object.assign(window.Stage3, {
  // ゴム膜ワープ用の縮小画素キャッシュ（固定ビット消去済みベース＋破損差分合成）
  _getSrcPixels(IMG_BOX, isChestBroken, isKneeBroken) {
    const img = this.assets.bareImg;
    if (!img || !img.complete || !img.naturalWidth) return null;
    const dmgReady = isChestBroken && this.assets.bodyDamageImg && this.assets.bodyDamageImg.complete && this.assets.bodyDamageImg.naturalWidth > 0;
    const kneeReady = isKneeBroken && this.assets.kneeBrokenImg && this.assets.kneeBrokenImg.complete && this.assets.kneeBrokenImg.naturalWidth > 0;
    const bgMidLReady = this.assets.bgBitMidLImg && this.assets.bgBitMidLImg.complete && this.assets.bgBitMidLImg.naturalWidth > 0;
    const key = `${img.src}|${IMG_BOX.w}x${IMG_BOX.h}|${dmgReady ? 1 : 0}|${kneeReady ? 1 : 0}|${bgMidLReady ? 1 : 0}`;
    if (!this._srcPixCache) this._srcPixCache = {};
    if (this._srcPixCache[key]) return this._srcPixCache[key];

    this._srcPixCache[key] = StageCommon.createPixelBuffer(IMG_BOX.w, IMG_BOX.h, (cc, w, h) => {
      cc.drawImage(img, 0, 0, w, h);
      if (bgMidLReady) {
        cc.drawImage(this.assets.bgBitMidLImg, (128 / 768) * w, (704 / 1376) * h, (80 / 768) * w, (80 / 1376) * h);
      }
      if (kneeReady) {
        cc.drawImage(this.assets.kneeBrokenImg, (420 / 768) * w, (770 / 1376) * h, (230 / 768) * w, (340 / 1376) * h);
      }
      if (dmgReady) {
        cc.drawImage(this.assets.bodyDamageImg, (250 / 768) * w, (480 / 1376) * h, (255 / 768) * w, (320 / 1376) * h);
      }
    }, key);
    return this._srcPixCache[key];
  },

  renderSoftWarp(ctx, IMG_BOX, bodies, isChestBroken, isKneeBroken, slotName = "default") {
    const src = this._getSrcPixels(IMG_BOX, isChestBroken, isKneeBroken);
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
      ctx.fillStyle = "#08031c";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    const b = state.boss;
    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && this.assets.defeatCgImg.complete;
    const baseImg = isDefeat ? this.assets.defeatCgImg : this.assets.bareImg;

    const drawSrcPatch = (img, sx, sy, sw, sh) => {
      if (!img || !img.complete || !img.naturalWidth) return;
      ctx.drawImage(
        img,
        IMG_BOX.x + (sx / 768) * IMG_BOX.w,
        IMG_BOX.y + (sy / 1376) * IMG_BOX.h,
        (sw / 768) * IMG_BOX.w,
        (sh / 1376) * IMG_BOX.h
      );
    };

    ctx.save();
    // 1. ベース原画（撃破時は敗北ご褒美CG）
    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    if (!isDefeat && b) {
      // 2. 原画に描き込まれている固定ビット3機と固定アンテナを背景パッチで消去
      drawSrcPatch(this.assets.bgAntennaImg, 172, 108, 94, 186);
      drawSrcPatch(this.assets.bgBitTopImg, 612, 248, 92, 90);
      drawSrcPatch(this.assets.bgBitMidLImg, 128, 704, 80, 80);
      drawSrcPatch(this.assets.bgBitMidRImg, 568, 698, 82, 84);

      // 3. 左右の手の握り込み差分（吸引キャッチ＆転送チャージ中）
      if (b.hands && b.hands.handLClosedTimer > 0) {
        drawSrcPatch(this.assets.handLClosedImg, 68, 396, 194, 199);
      }
      if (b.hands && b.hands.handRClosedTimer > 0) {
        drawSrcPatch(this.assets.handRClosedImg, 544, 392, 184, 196);
      }

      // 4. 膝当て破損差分 ＆ 胸部ビスチェ大ブレイク破損差分
      const isKneeBroken = !!(b.kneePad && b.kneePad.broken);
      if (isKneeBroken) {
        drawSrcPatch(this.assets.kneeBrokenImg, 420, 770, 230, 340);
      }
      if (b.chestArmorBroken) {
        drawSrcPatch(this.assets.bodyDamageImg, 250, 480, 255, 320);
      }

      // 5. 胸部（ビスチェ装着中は小揺れ／破損後は大揺れ） ＆ お尻〜太もも ゴム膜ぷるぷるワープ描画
      this.renderSoftWarp(ctx, IMG_BOX, [b.bustL, b.bustR], b.chestArmorBroken, isKneeBroken, "bust");
      this.renderSoftWarp(ctx, IMG_BOX, [b.hipButt, b.thigh], b.chestArmorBroken, isKneeBroken, "hip");

      // 6. カチューシャの揺れるアンテナスプライト描画（根元ピボット回転）
      const ant = b.antenna;
      if (ant && this.assets.antennaRodImg.complete && this.assets.antennaRodImg.naturalWidth > 0) {
        const sX = IMG_BOX.w / 768;
        const sY = IMG_BOX.h / 1376;
        const localPivotX = 253 - 172; // 81
        const localPivotY = 286 - 108; // 178
        ctx.save();
        ctx.translate(ant.pivotX, ant.pivotY);
        ctx.rotate(ant.angle || 0);
        ctx.drawImage(
          this.assets.antennaRodImg,
          -localPivotX * sX,
          -localPivotY * sY,
          94 * sX,
          186 * sY
        );
        ctx.restore();
      }

      // 7. 表情差分パッチ合成 (FACE_BOX: x=296, y=300, w=174, h=120)
      const activePatchKey = StageCommon.getActiveFacePatchKey(b, state, {
        defaultExpr: "normal",
        halfBlink: true
      });
      StageCommon.drawFacePatch(
        ctx,
        this.assets.facePatchImgs,
        activePatchKey,
        IMG_BOX,
        { x: 296, y: 300, w: 174, h: 120 },
        { w: 768, h: 1376 }
      );

      // 8. 浮遊ビット4機の可動スプライト描画（破壊済みのビットは消滅）
      if (this.assets.bitOrbImg.complete && this.assets.bitOrbImg.naturalWidth > 0) {
        const orbW = (84 / 768) * IMG_BOX.w;
        const orbH = (84 / 1376) * IMG_BOX.h;
        this.getAllBits(b).forEach(bit => {
          if (!bit || bit.broken) return;
          const bx = bit.x;
          const by = bit.y + (bit.bobY || 0);
          ctx.save();
          if (bit.flash > 0) {
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = "#00f5d4";
            ctx.beginPath();
            ctx.arc(bx, by, orbW * 0.58, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.drawImage(this.assets.bitOrbImg, bx - orbW / 2, by - orbH / 2, orbW, orbH);
          ctx.restore();
        });
      }
    }

    // 9. クリア演出スモーククラウド
    StageCommon.renderSmokeClouds(ctx, state);

    ctx.restore();
  },

  renderTargets(ctx, state, engine) {
    if (!state.boss) return;
    const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
    if (isPostWhiteout) return;

    const b = state.boss;
    const animTick = b.animTick || 0;
    const drawGuide = (x, y, r, color, flash, rot, label, sub) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub);

    // 1. カチューシャのアンテナ（破壊不能・電撃なし：共通ガイドパルスによるバウンスロッド表示）
    const ant = b.antenna;
    if (ant) {
      const ep = this.getAntennaEndpoints(ant);
      const pulse = Particles.guidePulse(animTick);
      const isHit = ant.flash > 0;
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = isHit ? "#ffffff" : "rgba(0, 245, 212, 0.55)";
      ctx.lineWidth = (isHit ? 8.5 : 5.5) * pulse;
      ctx.beginPath();
      ctx.moveTo(ep.ax, ep.ay);
      ctx.lineTo(ep.bx, ep.by);
      ctx.stroke();

      ctx.fillStyle = isHit ? "#ffffff" : "#00f5d4";
      ctx.beginPath();
      ctx.arc(ep.bx, ep.by, 3.2 * pulse, 0, Math.PI * 2);
      ctx.fill();

      if (!isHit) {
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.0;
        ctx.strokeText("BOUNCE", ep.bx, ep.by - 10);
        ctx.fillStyle = "#00f5d4";
        ctx.fillText("BOUNCE", ep.bx, ep.by - 10);
      }
      ctx.restore();
    }

    // 2. 浮遊ビット×4機 ＆ デルタビーム／ロックオン粉砕ショートレーザー描画
    const allBits = this.getAllBits(b);
    const bl = b.bitLasers;
    if (bl) {
      // (A) 3機以上時：選抜3機によるデルタビーム予兆チャージ＆本照射描画
      if (bl.triMode === "charge" || bl.triMode === "fire") {
        const edges = this.getDeltaBeamEdges(b);
        if (edges.length === 3) {
          ctx.save();
          if (bl.triMode === "charge") {
            const blink = (Math.floor(animTick * 0.35) % 2 === 0);
            ctx.strokeStyle = blink ? "rgba(230, 255, 0, 0.85)" : "rgba(0, 245, 212, 0.55)";
            ctx.lineWidth = 2.0;
            ctx.setLineDash([6, 5]);
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
          } else {
            // 結界内部の淡いサイバーフィールド
            ctx.fillStyle = (Math.floor(animTick * 0.2) % 2 === 0)
              ? "rgba(0, 245, 212, 0.08)"
              : "rgba(255, 20, 147, 0.07)";
            ctx.beginPath();
            ctx.moveTo(edges[0].rawAx, edges[0].rawAy);
            ctx.lineTo(edges[1].rawAx, edges[1].rawAy);
            ctx.lineTo(edges[2].rawAx, edges[2].rawAy);
            ctx.closePath();
            ctx.fill();

            // 3辺の極太ネオンビーム（外周グロー＋中心ホワイトコア）
            const glowCol = (Math.floor(animTick * 0.3) % 2 === 0) ? "#00f5d4" : "#ff1493";
            ctx.lineCap = "round";

            // Fast neon outer-glow under-stroke
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.strokeStyle = glowCol;
            ctx.lineWidth = 14.0;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
            ctx.restore();

            // Main neon beam
            ctx.strokeStyle = glowCol;
            ctx.lineWidth = 6.5;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });

            // Bright white inner core
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2.2;
            edges.forEach(ed => {
              ctx.beginPath();
              ctx.moveTo(ed.ax, ed.ay);
              ctx.lineTo(ed.bx, ed.by);
              ctx.stroke();
            });
          }
          ctx.restore();
        }
      }

      // (B) 1〜2機時のロックオン→発射シーケンス描画（3カウント収束サイト → 赤ロック警報＆台揺らし回避表示！）
      if ((bl.snipePhase === "tracking" || bl.snipePhase === "locked") && bl.snipeBitId) {
        const shooter = allBits.find(x => !x.broken && x.id === bl.snipeBitId);
        const tgt = bl.snipeTargetBall;
        if (shooter && tgt && state.balls.includes(tgt) && !tgt.inShooterLane && !tgt._shattered) {
          const sx = shooter.x;
          const sy = shooter.y + (shooter.bobY || 0);

          ctx.save();
          if (bl.snipePhase === "tracking") {
            const prog = Math.max(0, Math.min(1, 1 - bl.snipePhaseTimer / 45));
            const countNum = Math.max(1, Math.ceil(bl.snipePhaseTimer / 15)); // 3 -> 2 -> 1
            const bx = tgt.x;
            const by = tgt.y;
            const retR = 34 - prog * 21; // 34px -> 13px へ収束！

            // 砲台ビット周囲のチャージリング
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(sx, sy, shooter.r + 4 + (1 - prog) * 10, 0, Math.PI * 2);
            ctx.stroke();

            // 黄色破線レーザーサイト
            ctx.strokeStyle = "rgba(230, 255, 0, 0.78)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = -(animTick * 1.8);
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.setLineDash([]);

            // 時計回りのロック進行ゲージリング
            ctx.strokeStyle = "rgba(230, 255, 0, 0.9)";
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.arc(bx, by, retR + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
            ctx.stroke();

            // 回転しながら収束する4隅ターゲットブラケット
            ctx.save();
            ctx.translate(bx, by);
            ctx.rotate((1 - prog) * 0.9);
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.4;
            const arm = Math.max(4.5, retR * 0.42);
            [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([cxS, cyS]) => {
              ctx.beginPath();
              ctx.moveTo(cxS * retR, cyS * (retR - arm));
              ctx.lineTo(cxS * retR, cyS * retR);
              ctx.lineTo(cxS * (retR - arm), cyS * retR);
              ctx.stroke();
            });
            ctx.restore();

            // 視認性の高いカウントダウンピルバッジ
            const badgeX = Math.max(66, Math.min(330, bx));
            const badgeY = by > 85 ? (by - retR - 14) : (by + retR + 18);
            const labelTxt = bl.nudgedDuringLock ? "✨LOCK BROKEN!" : `🎯LOCK-ON [${countNum}]`;
            ctx.font = "bold 10px monospace";
            ctx.textAlign = "center";
            const tw = ctx.measureText(labelTxt).width + 12;
            ctx.fillStyle = "rgba(8, 3, 28, 0.88)";
            ctx.fillRect(badgeX - tw / 2, badgeY - 9, tw, 14);
            ctx.strokeStyle = bl.nudgedDuringLock ? "#00f5d4" : "#e6ff00";
            ctx.lineWidth = 1.3;
            ctx.strokeRect(badgeX - tw / 2, badgeY - 9, tw, 14);
            ctx.fillStyle = bl.nudgedDuringLock ? "#00f5d4" : "#e6ff00";
            ctx.fillText(labelTxt, badgeX, badgeY + 1.5);
          } else {
            // === LOCKED フェーズ（発射直前 0.47秒：赤ロック点滅＆台揺らし回避ウィンドウ！） ===
            const lockProg = Math.max(0, Math.min(1, bl.snipePhaseTimer / 28)); // 1 -> 0 で発射！
            if (bl.nudgedDuringLock) {
              // 台揺らし成功済み：旧予測地点にシアン破線サイトが置き去りになり、球は安全圏へ！
              const ax = bl.staleShot ? bl.staleShot.aimX : tgt.x;
              const ay = bl.staleShot ? bl.staleShot.aimY : tgt.y;
              ctx.strokeStyle = "rgba(0, 245, 212, 0.72)";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(ax, ay);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.strokeStyle = "#00f5d4";
              ctx.lineWidth = 2.0;
              ctx.beginPath();
              ctx.arc(ax, ay, 11, 0, Math.PI * 2);
              ctx.stroke();

              const badgeX = Math.max(66, Math.min(330, tgt.x));
              const badgeY = tgt.y > 76 ? (tgt.y - 22) : (tgt.y + 26);
              const txt = "✨EVADED!!";
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "center";
              const tw = ctx.measureText(txt).width + 12;
              ctx.fillStyle = "rgba(8, 3, 28, 0.90)";
              ctx.fillRect(badgeX - tw / 2, badgeY - 9, tw, 14);
              ctx.strokeStyle = "#00f5d4";
              ctx.lineWidth = 1.4;
              ctx.strokeRect(badgeX - tw / 2, badgeY - 9, tw, 14);
              ctx.fillStyle = "#00f5d4";
              ctx.fillText(txt, badgeX, badgeY + 1.5);
            } else {
              // 未回避：激しいクリムゾンレッド警報レーザーサイト＆収束発射トリガーリング！
              const fastBlink = (Math.floor(animTick * 0.5) % 2 === 0);
              const mainCol = fastBlink ? "#ff1744" : "#e6ff00";
              const bx = tgt.x;
              const by = tgt.y;

              // 砲台側の発射トリガー収束リング（0になった瞬間に発射されるのが直感的に分かる！）
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.arc(sx, sy, shooter.r + 2 + lockProg * 14, 0, Math.PI * 2);
              ctx.stroke();

              // 赤色ソリッド照準ビーム
              // Fast outer glow under-stroke
              ctx.save();
              ctx.globalAlpha = 0.28;
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = (fastBlink ? 2.8 : 2.0) + 6.0;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(bx, by);
              ctx.stroke();
              ctx.restore();

              // Inner solid targeting beam
              ctx.strokeStyle = mainCol;
              ctx.lineWidth = fastBlink ? 2.8 : 2.0;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(bx, by);
              ctx.stroke();

              // ボールに噛み付く二重クリムゾン照準クロスヘア
              ctx.strokeStyle = "#ff1744";
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.arc(bx, by, 13, 0, Math.PI * 2);
              ctx.stroke();

              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              ctx.moveTo(bx - 18, by); ctx.lineTo(bx - 8, by);
              ctx.moveTo(bx + 8, by);  ctx.lineTo(bx + 18, by);
              ctx.moveTo(bx, by - 18); ctx.lineTo(bx, by - 8);
              ctx.moveTo(bx, by + 8);  ctx.lineTo(bx, by + 18);
              ctx.stroke();

              // 台揺らし回避を促す緊急アラートバッジ
              const badgeX = Math.max(82, Math.min(314, bx));
              const badgeY = by > 82 ? (by - 24) : (by + 28);
              const alertTxt = "⚠️LOCKED! 台揺らし!";
              ctx.font = "bold 10px monospace";
              ctx.textAlign = "center";
              const tw = ctx.measureText(alertTxt).width + 14;
              ctx.fillStyle = fastBlink ? "rgba(180, 0, 36, 0.92)" : "rgba(14, 4, 28, 0.92)";
              ctx.fillRect(badgeX - tw / 2, badgeY - 10, tw, 15);
              ctx.strokeStyle = fastBlink ? "#ffffff" : "#ff1744";
              ctx.lineWidth = 1.6;
              ctx.strokeRect(badgeX - tw / 2, badgeY - 10, tw, 15);
              ctx.fillStyle = fastBlink ? "#ffffff" : "#e6ff00";
              ctx.fillText(alertTxt, badgeX, badgeY + 1.5);
            }
          }
          ctx.restore();
        }
      }

      // (C) 飛翔中のボール粉砕ショートレーザー弾描画
      if (bl.shortLasers && bl.shortLasers.length > 0) {
        ctx.save();
        ctx.lineCap = "round";
        bl.shortLasers.forEach(sl => {
          if (sl.hit) return;
          if (sl.aimTimer > 0 && sl.aimY > 24 && sl.aimY < 580 && sl.aimX > 20 && sl.aimX < 376) {
            ctx.save();
            ctx.strokeStyle = sl.ignoreBall ? "rgba(0, 245, 212, 0.45)" : "rgba(255, 23, 68, 0.55)";
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(sl.aimX, sl.aimY, 6.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          const tx = sl.x - sl.ux * sl.len;
          const ty = sl.y - sl.uy * sl.len;

          // Fast neon outer-glow under-stroke
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = "#ff1744";
          ctx.lineWidth = 14.0;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();
          ctx.restore();

          // Main laser beam
          ctx.strokeStyle = "#ff1744";
          ctx.lineWidth = 6.8;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();

          // Bright inner core
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(sl.x, sl.y);
          ctx.stroke();

          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(sl.x, sl.y, 3.0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }
    }

    allBits.forEach(bit => {
      if (!bit || bit.broken) return;
      const by = bit.y + (bit.bobY || 0);
      const isSnipeShooter = bl && (bl.snipePhase === "tracking" || bl.snipePhase === "locked") && bl.snipeBitId === bit.id;
      const isDeltaActive = bl && (bl.triMode === "charge" || bl.triMode === "fire") && bl.deltaBitIds && bl.deltaBitIds.includes(bit.id);
      const col = isSnipeShooter
        ? (bl.snipePhase === "locked" ? "#ff1744" : "#e6ff00")
        : (isDeltaActive ? "#ff1493" : (bit.mode === "move" ? "#e6ff00" : "#00f5d4"));
      drawGuide(bit.x, by, bit.r, col, bit.flash, bit.rot, bit.label, `HP:${bit.hp}/${bit.maxHP}`);
    });

    // 3. 左右の手（通常: バウンス / 吸引中: 破壊進行度LV.1〜4に応じた大渦＆吸引テザー電撃 / 転送中: 電脳ワープライン）
    const hands = b.hands;
    if (hands) {
      const lv = hands.suctionLevel || 1;
      if (hands.mode === "open") {
        const openCol = lv >= 4 ? "#ff1493" : "#ff66b2";
        Particles.drawBounceBumperGuide(ctx, animTick, b.handL.x, b.handL.y, b.handL.r, openCol, b.handL.flash, "L-HAND", `GLOVE [LV.${lv}]`);
        Particles.drawBounceBumperGuide(ctx, animTick, b.handR.x, b.handR.y, b.handR.r, openCol, b.handR.flash, "R-HAND", `GLOVE [LV.${lv}]`);
      } else if (hands.mode === "suction") {
        const ringCount = Math.min(4, 1 + lv);
        const speedMul = 0.038 + lv * 0.012;
        [b.handL, b.handR].forEach(h => {
          ctx.save();
          ctx.translate(h.x, h.y);
          for (let ring = 0; ring < ringCount; ring++) {
            const phase = ((animTick * speedMul) + ring / ringCount) % 1.0;
            const rad = hands.suctionRadius * (1.0 - phase);
            const alpha = (phase * (0.50 + lv * 0.11)).toFixed(2);
            ctx.strokeStyle = lv >= 4
              ? (ring % 2 === 0 ? `rgba(255, 20, 147, ${alpha})` : `rgba(230, 255, 0, ${alpha})`)
              : (ring % 2 === 0 ? `rgba(255, 20, 147, ${alpha})` : `rgba(0, 245, 212, ${alpha})`);
            ctx.lineWidth = 1.4 + phase * (1.0 + lv * 0.35);
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, Math.max(4, rad), 0, Math.PI * 2);
            ctx.stroke();
          }
          ctx.restore();

          // 吸引圏内に入ったボールへ伸びる電脳キャプチャ・テザービーム！
          state.balls.forEach(ball => {
            if (ball.inShooterLane || ball._capturedByHand || (ball._handThrowGrace && ball._handThrowGrace > 0)) return;
            const d = Math.hypot(h.x - ball.x, h.y - ball.y);
            if (d < hands.suctionRadius) {
              ctx.save();
              const tAlpha = Math.pow(1.0 - d / hands.suctionRadius, 0.85) * 0.92;
              ctx.strokeStyle = lv >= 3 ? `rgba(230, 255, 0, ${tAlpha.toFixed(2)})` : `rgba(0, 245, 212, ${tAlpha.toFixed(2)})`;
              ctx.lineWidth = 1.6 + lv * 0.45;
              ctx.beginPath();
              ctx.moveTo(h.x, h.y);
              const mx = (h.x + ball.x) / 2 + (Math.random() - 0.5) * (4 + lv * 2);
              const my = (h.y + ball.y) / 2 + (Math.random() - 0.5) * (4 + lv * 2);
              ctx.lineTo(mx, my);
              ctx.lineTo(ball.x, ball.y);
              ctx.stroke();
              ctx.restore();
            }
          });

          const subLbl = lv >= 4 ? "🌀MAX VACUUM!" : `🌀VACUUM LV.${lv}`;
          const gCol = lv >= 4 ? "#ff1493" : "#e6ff00";
          Particles.drawBounceBumperGuide(ctx, animTick, h.x, h.y, h.r, gCol, h.flash, h.label, subLbl);
        });
      } else if (hands.mode === "transfer") {
        const catchHand = hands.catchSide === "L" ? b.handL : b.handR;
        const exitHand = hands.exitSide === "L" ? b.handL : b.handR;
        const progress = 1 - hands.timer / (hands.transferTotal || 44);
        const midX = (catchHand.x + exitHand.x) / 2;
        const midY = (catchHand.y + exitHand.y) / 2 - 42;

        ctx.save();
        ctx.strokeStyle = lv >= 4 ? "rgba(255, 20, 147, 0.90)" : "rgba(0, 245, 212, 0.85)";
        ctx.lineWidth = 2.8;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(catchHand.x, catchHand.y);
        ctx.quadraticCurveTo(midX, midY, exitHand.x, exitHand.y);
        ctx.stroke();

        const orbX = catchHand.x + (exitHand.x - catchHand.x) * progress;
        const orbY = catchHand.y + (exitHand.y - catchHand.y) * progress - Math.sin(progress * Math.PI) * 34;
        ctx.setLineDash([]);
        ctx.fillStyle = "#e6ff00";
        ctx.beginPath();
        ctx.arc(orbX, orbY, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2.0;
        ctx.stroke();
        ctx.restore();

        Particles.drawBounceBumperGuide(ctx, animTick, catchHand.x, catchHand.y, catchHand.r, "#ff1493", 0, catchHand.label, "✊CAUGHT!");
        Particles.drawBounceBumperGuide(ctx, animTick, exitHand.x, exitHand.y, exitHand.r, "#e6ff00", 8, exitHand.label, "⚡THROW!");
      }
    }

    // 4. 腰部サイバーポート ＆ 太ももガーターリボン飾り ＆ 左下ブーツ
    if (b.hipPort) {
      const hp = b.hipPort;
      if (!hp.broken) {
        drawGuide(hp.x, hp.y, hp.r, "#00f5d4", hp.flash, -animTick * 0.025, "HIP PORT", `HP:${hp.hp}/${hp.maxHP}`);
      } else {
        Particles.drawBounceBumperGuide(ctx, animTick, hp.x, hp.y, hp.r, "#e6ff00", hp.flash, "HIP PORT", "⚡SPARK");
      }
    }
    if (b.garterRibbon) {
      const gr = b.garterRibbon;
      const tx = b.thigh ? b.thigh.dx * 0.35 : 0;
      const ty = b.thigh ? b.thigh.dy * 0.35 : 0;
      Particles.drawBounceBumperGuide(
        ctx,
        animTick,
        gr.x + tx,
        gr.y + ty,
        gr.r,
        "#ff66b2",
        gr.flash,
        "RIBBON",
        "CHARM BOING"
      );
    }
    if (b.bootKicker) {
      const bk = b.bootKicker;
      Particles.drawBounceBumperGuide(ctx, animTick, bk.x, bk.y, bk.r, "#00f5d4", bk.flash, "BOOT", "BOUNCE");
    }

    // 6. 右膝当てアーマー（未破壊時はHPガイド、破壊後はバウンスバンパー）
    const knee = b.kneePad;
    if (knee) {
      if (!knee.broken) {
        drawGuide(knee.x, knee.y, knee.r, "#b84dff", knee.flash, animTick * 0.02, "KNEE PAD", `HP:${knee.hp}/${knee.maxHP}`);
      } else {
        Particles.drawBounceBumperGuide(ctx, animTick, knee.x, knee.y, knee.r, "#ff66b2", knee.flash, "KNEE", "BOUNCE");
      }
    }

    // 7. 胸部ビスチェ装甲 / パージ後ソフトバスト（ガイド円の追従量は抑え、背景絵のぷるぷる相対変位がより映えるようにする）
    if (!b.chestArmorBroken) {
      const lx = b.bustL.x + b.bustL.dx * 0.25;
      const ly = b.bustL.y + b.bustL.dy * 0.25;
      const rx = b.bustR.x + b.bustR.dx * 0.25;
      const ry = b.bustR.y + b.bustR.dy * 0.25;
      if (state.phase < 2) {
        drawGuide(lx, ly, b.bustL.r, "#b59ce6", b.bustL.flash, -animTick * 0.015, "L-BUSTIER", "🛡️LOCKED");
        drawGuide(rx, ry, b.bustR.r, "#b59ce6", b.bustR.flash, animTick * 0.015, "R-BUSTIER", "🛡️LOCKED");
      } else {
        drawGuide(lx, ly, b.bustL.r, "#ff1493", b.bustL.flash, -animTick * 0.025, "L-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
        drawGuide(rx, ry, b.bustR.r, "#ff1493", b.bustR.flash, animTick * 0.025, "R-BUSTIER", `HP:${b.chestArmorHP}/${b.chestArmorMaxHP}`);
      }
    } else {
      const bustCol = state.fever.active ? "#e6ff00" : "#ff1493";
      const subTxt = state.fever.active ? "♥FEVER♥" : "♥SOFT";
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx, b.bustL.y + b.bustL.dy, b.bustL.r, bustCol, b.bustL.flash, "L-BUST", subTxt);
      Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx, b.bustR.y + b.bustR.dy, b.bustR.r, bustCol, b.bustR.flash, "R-BUST", subTxt);
    }

    // 8. 首元のグリーンのペンダント・コア
    const core = b.core;
    if (core) {
      if (state.phase === 3 && core.unlocked) {
        drawGuide(core.x, core.y, core.r, "#00f5d4", core.flash, animTick * 0.04, "★PENDANT CORE★", `HP:${core.hp}/${core.maxHP}`);
      } else {
        ctx.save();
        ctx.strokeStyle = core.flash > 0 ? "#ffffff" : "rgba(0, 245, 212, 0.50)";
        ctx.lineWidth = core.flash > 0 ? 2.6 : 1.4;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const ang = (Math.PI / 3) * i - Math.PI / 6;
          const px = core.x + Math.cos(ang) * (core.r - 2);
          const py = core.y + Math.sin(ang) * (core.r - 2);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
});

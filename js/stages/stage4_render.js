// =========================================================================
// STAGE 4: RENDERING & OFFSCREEN SPRITE CACHE
// =========================================================================

Object.assign(window.Stage4, {
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

    const makeBodyVariant = (brkL, brkR) =>
      StageCommon.createPixelBuffer(W, H, (cx) => {
        cx.drawImage(this.assets.charBodyImg, 0, 0, W, H);
        if (this.assets.greavesBrokenImg.naturalWidth) {
          if (brkL) {
            cx.drawImage(this.assets.greavesBrokenImg, 0, 0, splitSrcX, 1376, 0, 0, splitDstX, H);
          }
          if (brkR) {
            cx.drawImage(this.assets.greavesBrokenImg, splitSrcX, 0, 768 - splitSrcX, 1376, splitDstX, 0, W - splitDstX, H);
          }
        }
      });

    const makeScaled = (img) =>
      StageCommon.createPixelBuffer(W, H, (cx) => cx.drawImage(img, 0, 0, W, H));

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
    StageCommon.ensureWireRampCanvases(this, 420, 660, 7.6);
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
      if (!this._bgGlowCanvas) {
        const gc = document.createElement("canvas");
        gc.width = IMG_BOX.w;
        gc.height = IMG_BOX.h;
        const gctx = gc.getContext("2d");
        const cx = 198 - IMG_BOX.x;
        const cy = 285 - IMG_BOX.y;
        const bgGlow = gctx.createRadialGradient(cx, cy, 25, cx, cy, 275);
        bgGlow.addColorStop(0, "rgba(255, 42, 157, 1)");
        bgGlow.addColorStop(0.55, "rgba(110, 20, 210, 0.65)");
        bgGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
        gctx.fillStyle = bgGlow;
        gctx.fillRect(0, 0, gc.width, gc.height);
        this._bgGlowCanvas = gc;
      }
      const horizonPulse = 0.20 + 0.08 * Math.sin(b.animTick * 0.05) + (state.fever.active || b.sakuraStormTimer > 0 ? 0.16 : 0);
      ctx.save();
      ctx.globalAlpha = horizonPulse;
      ctx.drawImage(this._bgGlowCanvas, IMG_BOX.x, IMG_BOX.y);
      ctx.restore();

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
    StageCommon.renderWireRampRails(ctx, this, b.animTick, upperPass, {
      orientedGate: false,
      useRampName: false,
      gateLabelOffsetY: 19,
      drawExitRing: false
    });
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
    StageCommon.renderWireRampBalls(ctx, state, this.WIRE_RAMPS);

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
});

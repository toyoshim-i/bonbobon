// =========================================================================
// STAGE 5: RENDERING & OFFSCREEN SPRITE CACHE
// =========================================================================

Object.assign(window.Stage5, {
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
    StageCommon.ensureWireRampCanvases(this, 420, 660, 7.6);
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

      // Horizon glow + static radial wireframe grids (pre-baked per phase)
      if (!this._bgPhaseCanvases) this._bgPhaseCanvases = {};
      const phaseKey = state.phase === 1 ? 1 : (state.phase === 2 ? 2 : 3);
      let phaseBg = this._bgPhaseCanvases[phaseKey];
      if (!phaseBg) {
        phaseBg = document.createElement("canvas");
        phaseBg.width = IMG_BOX.w;
        phaseBg.height = IMG_BOX.h;
        const pctx = phaseBg.getContext("2d");
        const lvpX = vpX - IMG_BOX.x;
        const lvpY = vpY - IMG_BOX.y;

        const horizonGrad = pctx.createRadialGradient(lvpX, lvpY, 10, lvpX, lvpY, 180);
        if (phaseKey === 1) {
          horizonGrad.addColorStop(0, "rgba(0, 184, 212, 0.40)");
          horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
        } else if (phaseKey === 2) {
          horizonGrad.addColorStop(0, "rgba(255, 42, 212, 0.35)");
          horizonGrad.addColorStop(0.5, "rgba(0, 245, 232, 0.20)");
          horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
        } else {
          horizonGrad.addColorStop(0, "rgba(230, 255, 0, 0.35)");
          horizonGrad.addColorStop(0.5, "rgba(0, 245, 212, 0.25)");
          horizonGrad.addColorStop(1, "rgba(7, 3, 28, 0)");
        }
        pctx.fillStyle = horizonGrad;
        pctx.fillRect(0, 220 - IMG_BOX.y, IMG_BOX.w, 208);

        const gridColor = phaseKey === 1 ? "rgba(0, 184, 212, 0.35)" : (phaseKey === 2 ? "rgba(255, 42, 212, 0.35)" : "rgba(0, 245, 212, 0.40)");
        pctx.strokeStyle = gridColor;
        pctx.lineWidth = 1.0;
        pctx.beginPath();
        for (let x = IMG_BOX.x; x <= IMG_BOX.x + IMG_BOX.w; x += 28) {
          const lx = x - IMG_BOX.x;
          pctx.moveTo(lx, 16 - IMG_BOX.y);
          pctx.lineTo(lvpX + (lx - lvpX) * 0.45, 182 - IMG_BOX.y);
          pctx.moveTo(lx, 660 - IMG_BOX.y);
          pctx.lineTo(lvpX + (lx - lvpX) * 0.45, 434 - IMG_BOX.y);
        }
        pctx.stroke();
        this._bgPhaseCanvases[phaseKey] = phaseBg;
      }
      ctx.drawImage(phaseBg, IMG_BOX.x, IMG_BOX.y);

      const crossColor = state.phase === 1 ? "rgba(0, 245, 232, 0.50)" : (state.phase === 2 ? "rgba(0, 245, 232, 0.50)" : "rgba(230, 255, 0, 0.50)");

      ctx.save();

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

          // 26 Rising Neon Feather Particles across the sanctuary (pre-baked sprites)
          if (b.sanctuaryFeathers) {
            if (!this._featherSpriteCache) this._featherSpriteCache = {};
            ctx.save();
            ctx.globalAlpha = 0.45;
            for (let fi = 0; fi < b.sanctuaryFeathers.length; fi++) {
              const f = b.sanctuaryFeathers[fi];
              let fs = this._featherSpriteCache[f.col];
              if (!fs) {
                fs = document.createElement("canvas");
                fs.width = 16;
                fs.height = 30;
                const fctx = fs.getContext("2d");
                fctx.translate(8, 15);
                fctx.fillStyle = f.col;
                fctx.beginPath();
                fctx.ellipse(0, 0, 4.5, 12, 0.1, 0, Math.PI * 2);
                fctx.fill();
                fctx.strokeStyle = "#ffffff";
                fctx.lineWidth = 0.8;
                fctx.beginPath();
                fctx.moveTo(0, -11);
                fctx.lineTo(0, 11);
                fctx.stroke();
                this._featherSpriteCache[f.col] = fs;
              }
              ctx.save();
              ctx.translate(f.x, f.y);
              ctx.rotate(Math.sin(t * 0.05 + f.phase) * 0.35);
              if (f.scale !== 1) ctx.scale(f.scale, f.scale);
              ctx.drawImage(fs, -8, -15);
              ctx.restore();
            }
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
            minDisp: 0.28,
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
    const TC = Particles.TARGET_COLORS;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.tilt);
    const strokeCol = h.flash > 0 ? "#ffffff" : TC.ATTACK;
    const innerCol = h.flash > 0 ? "#ffffff" : h.color;

    // Solid inner ellipse (キャラ陣営色)
    ctx.strokeStyle = innerCol;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sleek outer dashed guide (進行必須: ネオンレッド)
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(animTick * 1.5);
    ctx.strokeStyle = strokeCol;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.6;
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
    const TC = Particles.TARGET_COLORS;
    const drawGuide = (x, y, r, color, flash, rot, label, sub, opts) =>
      Particles.drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, sub, opts);

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

      // Hair Ornament Targets (外周: 進行必須赤 / 内周: 双子キャラ色)
      if (!b.odangoL.broken) {
        drawGuide(b.odangoL.x, b.odangoL.y, b.odangoL.r, TC.ATTACK, b.odangoL.flash, animTick * 0.03, b.odangoL.label, `HP:${b.odangoL.hp}/${b.odangoL.maxHP}`, { innerColor: b.odangoL.color, isAttack: true });
      }
      if (!b.antennaR.broken) {
        drawGuide(b.antennaR.x, b.antennaR.y, b.antennaR.r, TC.ATTACK, b.antennaR.flash, -animTick * 0.03, b.antennaR.label, `HP:${b.antennaR.hp}/${b.antennaR.maxHP}`, { innerColor: b.antennaR.color, isAttack: true });
      }

      // Knee Ring Targets (外周: 進行必須赤 / 内周: 双子キャラ色)
      if (!b.kneeL.broken) {
        drawGuide(b.kneeL.x, b.kneeL.y, b.kneeL.r, TC.ATTACK, b.kneeL.flash, -animTick * 0.025, b.kneeL.label, `HP:${b.kneeL.hp}/${b.kneeL.maxHP}`, { innerColor: b.kneeL.color, isAttack: true });
      }
      if (!b.kneeR.broken) {
        drawGuide(b.kneeR.x, b.kneeR.y, b.kneeR.r, TC.ATTACK, b.kneeR.flash, animTick * 0.025, b.kneeR.label, `HP:${b.kneeR.hp}/${b.kneeR.maxHP}`, { innerColor: b.kneeR.color, isAttack: true });
      }

      // Front-Thigh Garter Charms (お色気ピンク × 内周キャラ色)
      Particles.drawBounceBumperGuide(ctx, animTick, b.charmL.x, b.charmL.y, b.charmL.r, TC.SEXY, b.charmL.flash, null, b.charmL.label, { innerColor: b.charmL.color });
      Particles.drawBounceBumperGuide(ctx, animTick, b.charmR.x, b.charmR.y, b.charmR.r, TC.SEXY, b.charmR.flash, null, b.charmR.label, { innerColor: b.charmR.color });

      // Chest Brooches (ロック中: 薄紫 / 解除後: 赤 + 内周キャラ色)
      drawGuide(b.prismL.x, b.prismL.y, b.prismL.r, b.elleBroken ? TC.ATTACK : TC.LOCKED, b.prismL.flash, animTick * 0.04, b.prismL.label, b.elleBroken ? `HP:${b.prismL.hp}/${b.prismL.maxHP}` : "🔒BROOCH", { innerColor: b.prismL.color, isLocked: !b.elleBroken, isAttack: b.elleBroken });
      drawGuide(b.prismR.x, b.prismR.y, b.prismR.r, b.noelBroken ? TC.ATTACK : TC.LOCKED, b.prismR.flash, -animTick * 0.04, b.prismR.label, b.noelBroken ? `HP:${b.prismR.hp}/${b.prismR.maxHP}` : "🔒BROOCH", { innerColor: b.prismR.color, isLocked: !b.noelBroken, isAttack: b.noelBroken });

      // High-Five Synchro Spark (スコア稼ぎ × サポート)
      if (!b.elleBroken && !b.noelBroken) {
        drawGuide(b.synchroSpark.x, b.synchroSpark.y, b.synchroSpark.r, TC.SCORE, b.synchroSpark.flash, animTick * 0.05, "🏐TWIN TOSS", "+4000", { innerColor: TC.SUPPORT });
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
        drawGuide(b.pauldronL.x, b.pauldronL.y, b.pauldronL.r, TC.ATTACK, b.pauldronL.flash, -animTick * 0.025, b.pauldronL.label, "ARMOR", { isAttack: true });
        drawGuide(b.pauldronR.x, b.pauldronR.y, b.pauldronR.r, TC.ATTACK, b.pauldronR.flash, animTick * 0.025, b.pauldronR.label, "ARMOR", { isAttack: true });
        drawGuide(b.bustL.x + b.bustL.dx * 0.25, b.bustL.y + b.bustL.dy * 0.25, b.bustL.r, TC.ATTACK, b.bustL.flash, animTick * 0.03, "L-CHEST", `HP:${b.chestArmorHP}`, { innerColor: TC.SEXY, isAttack: true });
        drawGuide(b.bustR.x + b.bustR.dx * 0.25, b.bustR.y + b.bustR.dy * 0.25, b.bustR.r, TC.ATTACK, b.bustR.flash, -animTick * 0.03, "R-CHEST", `HP:${b.chestArmorHP}`, { innerColor: TC.SEXY, isAttack: true });
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

          drawGuide(b.core.x, b.core.y, b.core.r, TC.LOCKED, b.core.flash, 0, "ARK CORE", "🛡️BARRIER", { isLocked: true });
        } else {
          drawGuide(b.core.x, b.core.y, b.core.r, TC.ATTACK, b.core.flash, animTick * 0.045, "★ARK CORE★", `HP:${b.core.hp}/${b.core.maxHP}`, { isCritical: true, innerColor: TC.SCORE });
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

          drawGuide(orb.x, orb.y, orb.r + 3, TC.DEFENSE, orb.flash, animTick * 0.05, orb.label, `HP:${orb.hp}/${orb.maxHP}`, { innerColor: orb.color, isAttack: true });
        });

        // Soft bounce guides (お色気統一: ローズピンク / Fever時は黄色)
        const bustCol = state.fever.active ? TC.FEVER : TC.SEXY;
        Particles.drawBounceBumperGuide(ctx, animTick, b.bustL.x + b.bustL.dx * 0.25, b.bustL.y + b.bustL.dy * 0.25, b.bustL.r, bustCol, b.bustL.flash, null, "♥SOFT");
        Particles.drawBounceBumperGuide(ctx, animTick, b.bustR.x + b.bustR.dx * 0.25, b.bustR.y + b.bustR.dy * 0.25, b.bustR.r, bustCol, b.bustR.flash, null, "♥SOFT");
        Particles.drawBounceBumperGuide(ctx, animTick, b.garterL.x, b.garterL.y, b.garterL.r, TC.SEXY, b.garterL.flash, null, "GARTER");
        Particles.drawBounceBumperGuide(ctx, animTick, b.garterR.x, b.garterR.y, b.garterR.r, TC.SEXY, b.garterR.flash, null, "GARTER");
        if (!(b.navelTrap && b.navelTrap.mode !== "idle")) {
          Particles.drawBounceBumperGuide(ctx, animTick, b.navelSera.x, b.navelSera.y, b.navelSera.r, TC.SEXY, b.navelSera.flash, null, "NAVEL");
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
          ctx.fillText(t("stage5.render.nudgeSave"), 198, 480);
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

    ctx.save();
    if (rampAlpha < 1.0) {
      ctx.globalAlpha = rampAlpha;
    }
    StageCommon.renderWireRampRails(ctx, this, b.animTick, upperPass, {
      orientedGate: true,
      useRampName: true,
      gateLabelOffsetY: 20,
      drawExitRing: true
    });
    ctx.restore();
  },

  renderForeground(ctx, state, engine) {
    const b = state.boss;
    if (!b || (state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0)) return;

    // 1. Balls on wire ramp
    StageCommon.renderWireRampBalls(ctx, state, this.WIRE_RAMPS);

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
});

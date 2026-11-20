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

    const extractNoelAntennas = (buf) => {
      if (!buf || !buf.canvas || !buf.ctx || !buf.data || buf.w <= 0 || buf.h <= 0) return null;
      const w = buf.w;
      const h = buf.h;
      const sx = w / 193;
      const sy = h / 339;
      const scaleAvg = (sx + sy) * 0.5;
      const axR = (295.0 - 187.1) * sx;
      const ayR = (162.5 - 116.6) * sy;
      const bxR = (309.5 - 187.1) * sx;
      const byR = (119.5 - 116.6) * sy;
      const axL = (217.5 - 187.1) * sx;
      const ayL = (138.0 - 116.6) * sy;

      const imgData = buf.ctx.getImageData(0, 0, w, h);
      const data = imgData.data;
      const orig = new Uint8ClampedArray(data);

      const makeCropCanvas = (x0, y0, x1, y1) => {
        const cx0 = Math.max(0, Math.floor(x0));
        const cy0 = Math.max(0, Math.floor(y0));
        const cx1 = Math.min(w, Math.ceil(x1));
        const cy1 = Math.min(h, Math.ceil(y1));
        const cw = Math.max(1, cx1 - cx0);
        const ch = Math.max(1, cy1 - cy0);
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const cx = c.getContext("2d");
        const cImg = cx.createImageData(cw, ch);
        return { canvas: c, ctx: cx, imgData: cImg, data: cImg.data, x0: cx0, y0: cy0, x1: cx1, y1: cy1, w: cw, h: ch };
      };

      const antL = makeCropCanvas(24 * sx, 0, 37 * sx, 25 * sy);
      const antR = makeCropCanvas(100 * sx, 0, 128 * sx, 50 * sy);

      for (let y = antL.y0; y < antL.y1; y++) {
        for (let x = antL.x0; x < antL.x1; x++) {
          const si = (y * w + x) * 4;
          const a = orig[si + 3];
          if (a < 10) continue;
          const lx = x / sx;
          const ly = y / sy;
          if (lx < 25 || lx > 35 || ly > 24) continue;
          const hairY = 23.0 - Math.max(0, (lx - 29.0) * 1.6);
          if (ly < hairY) {
            const di = ((y - antL.y0) * antL.w + (x - antL.x0)) * 4;
            antL.data[di] = orig[si];
            antL.data[di + 1] = orig[si + 1];
            antL.data[di + 2] = orig[si + 2];
            antL.data[di + 3] = a;
            data[si] = data[si + 1] = data[si + 2] = data[si + 3] = 0;
          }
        }
      }

      const vxR = bxR - axR;
      const vyR = byR - ayR;
      const lenR2 = vxR * vxR + vyR * vyR;
      const rodMask = new Uint8Array(w * h);
      const minRX = Math.max(0, Math.floor(101 * sx));
      const maxRX = Math.min(w - 1, Math.ceil(128 * sx));
      const maxRY = Math.min(h - 1, Math.ceil(49 * sy));

      for (let y = 0; y <= maxRY; y++) {
        for (let x = minRX; x <= maxRX; x++) {
          const si = (y * w + x) * 4;
          const a = orig[si + 3];
          if (a < 10) continue;
          const t = ((x - axR) * vxR + (y - ayR) * vyR) / lenR2;
          if (t < -0.02 || t > 1.06) continue;
          const tClamp = Math.max(0, Math.min(1, t));
          const px = axR + t * vxR;
          const py = ayR + t * vyR;
          const dist = Math.hypot(x - px, y - py);
          const halfW = (3.1 - 0.7 * tClamp) * scaleAvg;
          if (dist <= halfW) {
            const r = orig[si];
            const g = orig[si + 1];
            const b = orig[si + 2];
            const isOverlap = (y / sy) >= 26;
            const isRodColor = (b >= r - 6 && (r + g + b) > 260) || (r > 190 && g > 190 && b > 200);
            if (!isOverlap || dist <= 1.8 * scaleAvg || isRodColor) {
              if (x >= antR.x0 && x < antR.x1 && y >= antR.y0 && y < antR.y1) {
                const di = ((y - antR.y0) * antR.w + (x - antR.x0)) * 4;
                antR.data[di] = r;
                antR.data[di + 1] = g;
                antR.data[di + 2] = b;
                antR.data[di + 3] = a;
              }
              rodMask[y * w + x] = 1;
            }
          }
        }
      }

      const searchR = Math.max(4, Math.round(8 * sx));
      for (let y = 0; y <= maxRY; y++) {
        for (let x = minRX; x <= maxRX; x++) {
          if (!rodMask[y * w + x]) continue;
          const si = (y * w + x) * 4;
          if ((y / sy) < 36) {
            data[si] = data[si + 1] = data[si + 2] = data[si + 3] = 0;
            continue;
          }
          let lx = -1;
          for (let xx = x - 1; xx >= Math.max(0, x - searchR); xx--) {
            if (!rodMask[y * w + xx]) { lx = xx; break; }
          }
          let rx = -1;
          for (let xx = x + 1; xx <= Math.min(w - 1, x + searchR); xx++) {
            if (!rodMask[y * w + xx]) { rx = xx; break; }
          }
          if (lx >= 0 && rx >= 0) {
            const lsi = (y * w + lx) * 4;
            const rsi = (y * w + rx) * 4;
            if (orig[lsi + 3] > 120 && orig[rsi + 3] > 120) {
              const wt = (x - lx) / Math.max(1, rx - lx);
              data[si] = Math.round(orig[lsi] * (1 - wt) + orig[rsi] * wt);
              data[si + 1] = Math.round(orig[lsi + 1] * (1 - wt) + orig[rsi + 1] * wt);
              data[si + 2] = Math.round(orig[lsi + 2] * (1 - wt) + orig[rsi + 2] * wt);
              data[si + 3] = Math.round(orig[lsi + 3] * (1 - wt) + orig[rsi + 3] * wt);
              continue;
            }
          }
          data[si] = data[si + 1] = data[si + 2] = data[si + 3] = 0;
        }
      }

      antL.ctx.putImageData(antL.imgData, 0, 0);
      antR.ctx.putImageData(antR.imgData, 0, 0);
      buf.ctx.putImageData(imgData, 0, 0);
      buf.data = imgData.data;

      return {
        antL: { canvas: antL.canvas, pivX: axL, pivY: ayL, offX: antL.x0 - axL, offY: antL.y0 - ayL, w: antL.w, h: antL.h },
        antR: { canvas: antR.canvas, pivX: axR, pivY: ayR, offX: antR.x0 - axR, offY: antR.y0 - ayR, w: antR.w, h: antR.h }
      };
    };

    const noelAntSprites = {
      intact: extractNoelAntennas(twinRIntact),
      broken: extractNoelAntennas(twinRBroken)
    };

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
      noelAntSprites,
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

      const crossColor = b.finalCrescendo
        ? (t % 12 < 6 ? "rgba(255, 42, 212, 0.65)" : "rgba(230, 255, 0, 0.65)")
        : (state.phase === 1 ? "rgba(0, 245, 232, 0.50)" : (state.phase === 2 ? "rgba(0, 245, 232, 0.50)" : "rgba(230, 255, 0, 0.50)"));

      ctx.save();

      // Scrolling horizontal cross-lines (Phase 3 fusion & Final Crescendo accelerate warp speed!)
      const gridSpeed = b.finalCrescendo ? 0.082 : (state.phase === 3 ? (b.chestArmorBroken ? 0.048 : 0.036) : 0.015);
      const gridScroll = (t * gridSpeed) % 1;
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
        const starSpeedMult = b.finalCrescendo ? 2.2 : 1.0;
        b.stars.forEach(st => {
          const p = 0.55 + 0.45 * Math.sin(t * st.spd * starSpeedMult + st.phase);
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

          // Intact / Pass-Blinking Halos & High-Five Starburst Spark (spark only while neither twin is broken!)
          const drawTwinHalo = (h, baseSprite) => {
            if (!h || (h.broken && !(h.passFlashTimer > 0))) return;
            const pf = h.passFlashTimer || 0;
            const blinkOn = pf > 0 && (Math.floor(pf / 3) % 2 === 0);
            const sp = (pf > 0 && blinkOn && cache.haloSprites.gold) ? cache.haloSprites.gold : baseSprite;
            if (!sp) return;
            ctx.save();
            ctx.translate(h.x, h.y);
            ctx.rotate(h.tilt);
            if (pf > 0) {
              const pulseScale = 1.0 + (blinkOn ? 0.14 : 0.04) * (pf / 46);
              ctx.scale(pulseScale, pulseScale);
              ctx.globalAlpha = h.broken ? (blinkOn ? 0.95 : 0.35) : (blinkOn ? 1.0 : 0.55);
            }
            ctx.drawImage(sp, -42, -20);
            if (pf > 0 && blinkOn) {
              ctx.strokeStyle = "#ffffff";
              ctx.lineWidth = 2.6;
              ctx.beginPath();
              ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          };
          drawTwinHalo(b.haloL, cache.haloSprites.magenta);
          drawTwinHalo(b.haloR, cache.haloSprites.cyan);
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
          const antSet = cache.noelAntSprites && (!b.noelBroken ? cache.noelAntSprites.intact : cache.noelAntSprites.broken);
          const drawAntSprite = (sp, ant) => {
            if (!sp || !sp.canvas) return;
            ctx.save();
            ctx.translate(boxR.x + sp.pivX, boxR.y + sp.pivY);
            ctx.rotate((ant && ant.angle) || 0);
            ctx.drawImage(sp.canvas, sp.offX, sp.offY, sp.w, sp.h);
            ctx.restore();
          };
          if (antSet) drawAntSprite(antSet.antL, b.noelAntL);
          StageCommon.renderSoftWarp(ctx, boxR, bufR, [b.noelSpring, b.noelBelly, b.noelHip], {
            slotStore: cache.warpSlots,
            slotName: "twinR",
            reach: 1.35,
            minDisp: 0.08,
            rgba: true,
            shear: false
          });
          if (antSet) drawAntSprite(antSet.antR, b.noelAntR);

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
          // Heavenly Sanctuary God-Rays (peak during descent, then persistent shimmering beams throughout Phase 3!)
          const isDescending = !!(b.fusionSeq && b.fusionSeq.active && b.fusionSeq.frame >= 70 && b.fusionSeq.frame <= 180);
          const gAlpha = isDescending
            ? Math.sin(((b.fusionSeq.frame - 70) / 110) * Math.PI) * 0.55
            : (0.14 + 0.06 * Math.sin(t * 0.05) + (b.chestArmorBroken ? 0.07 : 0));
          if (gAlpha > 0.01) {
            ctx.save();
            ctx.globalCompositeOperation = "lighter";
            const numRays = 14;
            for (let r = 0; r < numRays; r++) {
              const baseAngle = (r / numRays) * Math.PI * 0.85 + 0.25 + Math.sin(t * 0.012) * 0.04;
              const spread = 0.08 + Math.sin(t * 0.05 + r) * 0.02;
              const rLen = 680;
              ctx.fillStyle = (r % 2 === 0) ? `rgba(255, 230, 100, ${gAlpha})` : `rgba(0, 245, 232, ${gAlpha * 0.80})`;
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
            ctx.globalAlpha = b.chestArmorBroken ? 0.85 : 0.75;

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
    const pf = h.passFlashTimer || 0;
    const isPassBlinking = pf > 0;
    const blinkOn = isPassBlinking && (Math.floor(pf / 3) % 2 === 0);
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.tilt);
    const strokeCol = isPassBlinking ? (blinkOn ? "#ffffff" : "#ffd700") : (h.flash > 0 ? "#ffffff" : TC.ATTACK);
    const innerCol = isPassBlinking ? (blinkOn ? "#ffd700" : "#ffffff") : (h.flash > 0 ? "#ffffff" : h.color);

    // Solid inner ellipse (キャラ陣営色)
    ctx.strokeStyle = innerCol;
    ctx.lineWidth = isPassBlinking && blinkOn ? 3.2 : 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 0, h.rx, h.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Sleek outer dashed guide (進行必須: ネオンレッド / 通過点滅: ゴールド)
    ctx.setLineDash([6, 4]);
    ctx.lineDashOffset = -(animTick * 1.5);
    ctx.strokeStyle = strokeCol;
    ctx.globalAlpha = isPassBlinking ? (blinkOn ? 1.0 : 0.45) : 0.85;
    ctx.lineWidth = isPassBlinking && blinkOn ? 2.4 : 1.6;
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
    const labelText = (isPassBlinking && (h.broken || blinkOn)) ? "✨PASS BONUS!" : `${h.label} HP:${h.hp}/${h.maxHP}`;
    ctx.fillText(labelText, 0, -h.ry - 8);
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
      // Rotated Elliptical Halo Targets (hidden cleanly once broken — Option 1 milk bonus!)
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

      // Elastic Wobbling Headset Antenna Guides (Noel)
      [b.noelAntR, b.noelAntL].forEach(ant => {
        if (!ant) return;
        const ep = this.getNoelAntennaEndpoints(ant);
        const pulse = Particles.guidePulse(animTick);
        const isHit = ant.flash > 0;
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = isHit ? "#ffffff" : "rgba(0, 245, 232, 0.48)";
        ctx.lineWidth = (isHit ? 6.5 : 4.0) * pulse;
        ctx.beginPath();
        ctx.moveTo(ep.ax, ep.ay);
        ctx.lineTo(ep.bx, ep.by);
        ctx.stroke();

        ctx.fillStyle = isHit ? "#ffffff" : "#00f5e8";
        ctx.beginPath();
        ctx.arc(ep.bx, ep.by, 2.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

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
        drawGuide(b.synchroSpark.x, b.synchroSpark.y, b.synchroSpark.r, TC.SCORE, b.synchroSpark.flash, animTick * 0.05, "🏐TWIN TOSS", "BONUS", { innerColor: TC.SUPPORT });
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
        // Final Crescendo Aura & Entry Flash
        if (b.finalCrescendo) {
          ctx.save();
          ctx.globalAlpha = 0.38;
          ctx.lineWidth = 2.0;
          ctx.save();
          ctx.translate(198, 205);
          ctx.rotate(animTick * 0.032);
          ctx.strokeStyle = "#ff1493";
          ctx.setLineDash([10, 6]);
          ctx.beginPath();
          ctx.arc(0, 0, 74, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.translate(198, 205);
          ctx.rotate(-animTick * 0.026);
          ctx.strokeStyle = "#e6ff00";
          ctx.setLineDash([7, 7]);
          ctx.beginPath();
          ctx.arc(0, 0, 96, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          if ((b.crescendoFlash || 0) > 0) {
            const box = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };
            ctx.globalAlpha = Math.min(0.75, (b.crescendoFlash / 50) * 0.75);
            ctx.strokeStyle = animTick % 6 < 3 ? "#ff1493" : "#e6ff00";
            ctx.lineWidth = 4.0;
            ctx.setLineDash([]);
            ctx.strokeRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
          }
          ctx.restore();
        }

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

          // Orb charge aim reticle & sightline
          if ((orb.chargeTimer || 0) > 0) {
            ctx.save();
            ctx.strokeStyle = (animTick % 4 < 2) ? "#e6ff00" : orb.color;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 4]);
            ctx.lineDashOffset = -(animTick * 2.4);
            ctx.beginPath();
            ctx.moveTo(orb.x, orb.y);
            ctx.lineTo(orb.aimX || 198, orb.aimY || 600);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(orb.x, orb.y, orb.r + 6 + Math.sin(animTick * 0.4) * 2.5, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

        // Active Cherub Orb Plasma Bolts
        if (b.orbAttack && b.orbAttack.bolts && b.orbAttack.bolts.length > 0) {
          b.orbAttack.bolts.forEach(bolt => {
            const bCol = bolt.countered ? "#ff1493" : (bolt.parried ? "#e6ff00" : bolt.color);
            if (bolt.trail) {
              for (let ti = 0; ti < bolt.trail.length; ti++) {
                const pt = bolt.trail[ti];
                ctx.save();
                ctx.globalAlpha = ((ti + 1) / bolt.trail.length) * (bolt.countered ? 0.62 : 0.45);
                ctx.fillStyle = bCol;
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, 2.2 + (ti / bolt.trail.length) * (bolt.countered ? 3.8 : 3.0), 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
              }
            }
            ctx.save();
            ctx.translate(bolt.x, bolt.y);
            ctx.rotate(Math.atan2(bolt.vy, bolt.vx));
            ctx.fillStyle = bCol;
            ctx.beginPath();
            ctx.moveTo(11, 0);
            ctx.lineTo(0, 6);
            ctx.lineTo(-9, 0);
            ctx.lineTo(0, -6);
            ctx.closePath();
            ctx.fill();

            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.moveTo(7, 0);
            ctx.lineTo(0, 3);
            ctx.lineTo(-5, 0);
            ctx.lineTo(0, -3);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = bolt.countered ? "#ffd700" : (bolt.parried ? "#e6ff00" : "#ffffff");
            ctx.lineWidth = bolt.countered ? 1.8 : 1.2;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, bolt.r, 0, Math.PI * 2);
            ctx.stroke();
            if (bolt.countered) {
              ctx.strokeStyle = "#ff1493";
              ctx.lineWidth = 1.6;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.arc(0, 0, bolt.r + 3.2, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          });
        }

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
        const armCount = sa.armCount || 4;
        if (sa.mode === "cross_warn") {
          ctx.save();
          ctx.translate(198, 224);
          ctx.rotate(sa.baseAngle);
          ctx.strokeStyle = (animTick % 6 < 3) ? "rgba(255, 42, 212, 0.85)" : "rgba(230, 255, 0, 0.85)";
          ctx.lineWidth = 2.0;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          for (let arm = 0; arm < armCount; arm++) {
            const aAng = (arm * Math.PI * 2) / armCount;
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(aAng) * 450, Math.sin(aAng) * 450);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = "rgba(230, 255, 0, 0.72)";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, 28 + Math.sin(animTick * 0.25) * 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        } else if (sa.mode === "cross_fire") {
          ctx.save();
          ctx.translate(198, 224);
          ctx.rotate(sa.baseAngle);
          for (let arm = 0; arm < armCount; arm++) {
            const aAng = (arm * Math.PI * 2) / armCount;
            const cosA = Math.cos(aAng);
            const sinA = Math.sin(aAng);
            const armCol = arm % 2 === 0 ? "rgba(255, 42, 212, 0.36)" : "rgba(0, 245, 232, 0.36)";
            const midCol = arm % 2 === 0 ? "rgba(255, 42, 212, 0.90)" : "rgba(0, 245, 232, 0.90)";
            ctx.lineCap = "round";

            ctx.strokeStyle = armCol;
            ctx.lineWidth = 20;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(cosA * 450, sinA * 450);
            ctx.stroke();

            ctx.strokeStyle = midCol;
            ctx.lineWidth = 11;
            ctx.stroke();

            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3.5;
            ctx.stroke();
          }
          // Sacred star magic ring at laser origin
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          for (let k = 0; k < armCount; k++) {
            const a1 = (k * Math.PI * 2) / armCount;
            const px = Math.cos(a1) * 26;
            const py = Math.sin(a1) * 26;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        } else if (sa.mode === "sword_warn") {
          const portalSpawns = (sa.portals && sa.portals.length > 0)
            ? sa.portals
            : [
                { x: 86,  y: 126, targetX: 132 },
                { x: 158, y: 98,  targetX: 248 },
                { x: 238, y: 98,  targetX: 148 },
                { x: 310, y: 126, targetX: 264 }
              ];
          portalSpawns.forEach(p => {
            ctx.save();
            ctx.strokeStyle = (animTick % 6 < 3) ? "rgba(255, 215, 0, 0.58)" : "rgba(255, 255, 255, 0.58)";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([6, 5]);
            ctx.lineDashOffset = -(animTick * 2.8);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.targetX, 600);
            ctx.stroke();
            ctx.restore();

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.save();
            ctx.rotate(animTick * 0.09);
            ctx.strokeStyle = (animTick % 6 < 3) ? "#ffd700" : "#ffffff";
            ctx.lineWidth = 2.4;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, 19, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            ctx.rotate(-animTick * 0.12);
            ctx.strokeStyle = "#00f5e8";
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, 12, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          });
        } else if (sa.mode === "pillars_warn" && sa.pillars) {
          sa.pillars.forEach((p, idx) => {
            const col = p.color || (idx % 2 === 0 ? "#ff2ad4" : "#00f5e8");
            const halfW = (p.w || 26) * 0.5;
            const pulse = 0.35 + 0.35 * Math.sin(animTick * 0.35 + idx);
            ctx.save();
            ctx.fillStyle = idx % 2 === 0 ? `rgba(255, 42, 212, ${(0.08 + pulse * 0.10).toFixed(2)})` : `rgba(0, 245, 232, ${(0.08 + pulse * 0.10).toFixed(2)})`;
            ctx.fillRect(p.x - halfW, 18, p.w || 26, 595);

            ctx.strokeStyle = (animTick % 6 < 3) ? col : "#e6ff00";
            ctx.lineWidth = 1.6;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -(animTick * 3.0);
            ctx.beginPath();
            ctx.moveTo(p.x - halfW, 18);
            ctx.lineTo(p.x - halfW, 612);
            ctx.moveTo(p.x + halfW, 18);
            ctx.lineTo(p.x + halfW, 612);
            ctx.stroke();

            ctx.setLineDash([]);
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.0;
            const dropY = 36 + ((animTick * 12 + idx * 90) % 540);
            ctx.beginPath();
            ctx.ellipse(p.x, dropY, halfW + 2, 5, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(p.x, 30, halfW + 4, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          });
        } else if (sa.mode === "pillars_fire" && sa.pillars) {
          sa.pillars.forEach((p, idx) => {
            const halfW = (p.w || 26) * 0.5;
            const col = p.color || (idx % 2 === 0 ? "#ff2ad4" : "#00f5e8");
            ctx.save();
            ctx.globalAlpha = 0.28;
            ctx.fillStyle = col;
            ctx.fillRect(p.x - halfW - 6, 16, (p.w || 26) + 12, 600);

            ctx.globalAlpha = 0.78;
            ctx.fillRect(p.x - halfW, 16, p.w || 26, 600);

            ctx.globalAlpha = 0.96;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(p.x - 4, 16, 8, 600);

            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.0;
            const impactR = halfW + 6 + Math.sin(animTick * 0.4 + idx) * 4;
            ctx.beginPath();
            ctx.ellipse(p.x, 588, impactR, 7, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          });
        }

        if (sa.swords && sa.swords.length > 0) {
          const swSprite = this._srcCache && this._srcCache.swordSprite;
          sa.swords.forEach(sw => {
            if (!sw.active) return;

            if (sw.stage === "lock") {
              // Lock-On Sightline & Hovering Coiled Sword
              ctx.save();
              ctx.strokeStyle = ((sw.lockTimer || 0) <= 6 && animTick % 4 < 2) ? "#ff1493" : "#ffd700";
              ctx.lineWidth = 1.7;
              ctx.setLineDash([6, 4]);
              ctx.lineDashOffset = -(animTick * 3.0);
              ctx.beginPath();
              ctx.moveTo(sw.x, sw.y);
              ctx.lineTo(sw.targetX || sw.x, 600);
              ctx.stroke();
              ctx.restore();

              ctx.save();
              ctx.translate(sw.x, sw.y);
              ctx.save();
              ctx.rotate(animTick * 0.14);
              ctx.strokeStyle = "#ffd700";
              ctx.lineWidth = 1.8;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.arc(0, 0, 15, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();

              const tremor = Math.sin(animTick * 1.4) * 1.2;
              ctx.rotate(sw.ang);
              ctx.translate(0, tremor);
              if (swSprite) {
                ctx.drawImage(swSprite, -20, -12);
              } else {
                ctx.strokeStyle = "#ffd700";
                ctx.lineWidth = 3.0;
                ctx.beginPath();
                ctx.moveTo(-16, 0);
                ctx.lineTo(24, 0);
                ctx.stroke();
              }
              ctx.restore();
              return;
            }

            for (let i = 0; i < sw.trail.length; i++) {
              const pt = sw.trail[i];
              ctx.save();
              ctx.globalAlpha = ((i + 1) / sw.trail.length) * (sw.countered ? 0.62 : 0.45);
              ctx.fillStyle = sw.countered ? "#ff1493" : (sw.parried ? "#e6ff00" : "#ffd700");
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 4 + (i / sw.trail.length) * (sw.countered ? 5.2 : 4), 0, Math.PI * 2);
              ctx.fill();
              ctx.restore();
            }

            ctx.save();
            ctx.translate(sw.x, sw.y);
            ctx.rotate(sw.ang);
            if (swSprite) {
              ctx.drawImage(swSprite, -20, -12);
            } else {
              ctx.strokeStyle = sw.countered ? "#ff1493" : (sw.parried ? "#e6ff00" : "#ffd700");
              ctx.lineWidth = 3.0;
              ctx.beginPath();
              ctx.moveTo(-16, 0);
              ctx.lineTo(24, 0);
              ctx.stroke();
            }
            ctx.strokeStyle = sw.countered ? "#ffd700" : (sw.parried ? "#e6ff00" : "#ffffff");
            ctx.lineWidth = sw.countered ? 1.8 : 1.4;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(0, 0, sw.r, 0, Math.PI * 2);
            ctx.stroke();
            if (sw.countered) {
              ctx.strokeStyle = "#ff1493";
              ctx.lineWidth = 1.7;
              ctx.setLineDash([]);
              ctx.beginPath();
              ctx.arc(0, 0, sw.r + 3.5, 0, Math.PI * 2);
              ctx.stroke();
            }
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
      const aimList = (ha.aimTargets && ha.aimTargets.length > 0)
        ? ha.aimTargets
        : [{
            sx: 198,
            sy: state.phase === 3 ? 180 : 250,
            ax: ha.targetSide === "L" ? 142 : 254,
            ay: 600,
            color: ha.targetSide === "L" ? "#ff2ad4" : "#00f5e8"
          }];
      aimList.forEach(aim => {
        ctx.save();
        ctx.strokeStyle = aim.color;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -(animTick * 2.5);
        ctx.beginPath();
        ctx.moveTo(aim.sx, aim.sy);
        if (aim.cx !== undefined && aim.cy !== undefined) {
          ctx.quadraticCurveTo(aim.cx, aim.cy, aim.ax, aim.ay);
        } else {
          ctx.lineTo(aim.ax, aim.ay);
        }
        ctx.stroke();

        ctx.strokeStyle = "#e6ff00";
        ctx.beginPath();
        ctx.arc(aim.ax, aim.ay, 20 + Math.sin(animTick * 0.2) * 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    ha.rings.forEach(ring => {
      const mainCol = ring.parried ? "#34ff8a" : ring.color;
      for (let i = 0; i < ring.trail.length; i++) {
        const pt = ring.trail[i];
        ctx.save();
        ctx.globalAlpha = ((i + 1) / ring.trail.length) * (ring.parried ? 0.55 : 0.45);
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
      if (ring.parried) {
        ctx.strokeStyle = "#34ff8a";
        ctx.lineWidth = 1.4;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(0, 0, ring.r + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    });

    // 4. Stasis Visuals on Frozen Balls (Magnetic Pillars Brackets & Star-Orbit Tether + Rotated Vector)
    if (state.balls && state.balls.length > 0) {
      state.balls.forEach(ball => {
        const st = ball && ball._seraphStasis;
        if (!st || st.grazeDelay > 0) return;
        ctx.save();
        if (st.mode === "pillar") {
          const pulse = 1 + Math.sin(animTick * 0.4) * 1.6;
          const rBox = ball.r + 6 + pulse;
          ctx.strokeStyle = (animTick % 6 < 3) ? "#00f5e8" : "#ff2ad4";
          ctx.lineWidth = 1.8;
          // Left bracket [
          ctx.beginPath();
          ctx.moveTo(ball.x - rBox + 4, ball.y - rBox);
          ctx.lineTo(ball.x - rBox, ball.y - rBox);
          ctx.lineTo(ball.x - rBox, ball.y + rBox);
          ctx.lineTo(ball.x - rBox + 4, ball.y + rBox);
          // Right bracket ]
          ctx.moveTo(ball.x + rBox - 4, ball.y - rBox);
          ctx.lineTo(ball.x + rBox, ball.y - rBox);
          ctx.lineTo(ball.x + rBox, ball.y + rBox);
          ctx.lineTo(ball.x + rBox - 4, ball.y + rBox);
          ctx.stroke();

          ctx.translate(ball.x, ball.y);
          ctx.rotate(animTick * 0.08);
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          const dR = ball.r + 3;
          ctx.moveTo(0, -dR);
          ctx.lineTo(dR, 0);
          ctx.lineTo(0, dR);
          ctx.lineTo(-dR, 0);
          ctx.closePath();
          ctx.stroke();
        } else if (st.mode === "cross") {
          // Orbital tether from star center (198, 224)
          ctx.strokeStyle = "rgba(0, 245, 232, 0.55)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = -(animTick * 2.0);
          ctx.beginPath();
          ctx.moveTo(st.originX, st.originY);
          ctx.lineTo(ball.x, ball.y);
          ctx.stroke();

          // Rotating stasis ring around ball
          ctx.save();
          ctx.translate(ball.x, ball.y);
          ctx.rotate(animTick * 0.12);
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 3]);
          ctx.beginPath();
          ctx.arc(0, 0, ball.r + 5, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Rotated release momentum vector preview arrow
          const cosR = Math.cos(st.totalRot);
          const sinR = Math.sin(st.totalRot);
          const rvX = st.savedVx * cosR - st.savedVy * sinR;
          const rvY = st.savedVx * sinR + st.savedVy * cosR;
          const rMag = Math.hypot(rvX, rvY);
          if (rMag > 0.25) {
            const ux = rvX / rMag;
            const uy = rvY / rMag;
            const aLen = Math.min(28, 12 + rMag * 1.4);
            const ex = ball.x + ux * (ball.r + 4 + aLen);
            const ey = ball.y + uy * (ball.r + 4 + aLen);
            ctx.setLineDash([]);
            ctx.strokeStyle = "#e6ff00";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(ball.x + ux * (ball.r + 3), ball.y + uy * (ball.r + 3));
            ctx.lineTo(ex, ey);
            ctx.lineTo(ex - ux * 5 + uy * 3.5, ey - uy * 5 - ux * 3.5);
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - ux * 5 - uy * 3.5, ey - uy * 5 + ux * 3.5);
            ctx.stroke();
          }
        }
        ctx.restore();
      });
    }
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

    // 4. Phase 3 中段反転ウイングパドル・サイドポッド＆下向き叩き付け指標＋統一パドル拘束UI
    if ((b.subFlipperDeploy || 0) > 0.05) {
      const dep = Math.min(1, b.subFlipperDeploy || 0);
      ctx.save();
      ctx.globalAlpha = dep;
      [
        { px: 22,  py: 324, col: "#ff2ad4", dir: 1 },
        { px: 374, py: 324, col: "#00f5e8", dir: -1 }
      ].forEach(pod => {
        // サイド展開ポッド基部＆反転叩き付けウイングオーラ
        ctx.fillStyle = "#160738";
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(pod.px, pod.py, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const wingPulse = 0.55 + 0.35 * Math.sin(b.animTick * 0.18);
        ctx.strokeStyle = pod.col;
        ctx.globalAlpha = dep * wingPulse;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(pod.px, pod.py, 13 + Math.sin(b.animTick * 0.15) * 2, pod.dir > 0 ? -0.8 : Math.PI - 1.1, pod.dir > 0 ? 1.1 : Math.PI + 0.8);
        ctx.stroke();

        // 下向き叩き付け方向を示すシェブロン矢印
        const chevX = pod.px + pod.dir * 16;
        const chevY = pod.py + 12;
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(chevX - 3.5, chevY - 3);
        ctx.lineTo(chevX, chevY + 2);
        ctx.lineTo(chevX + 3.5, chevY - 3);
        ctx.stroke();
        ctx.globalAlpha = dep;
      });
      ctx.restore();
    }

    // パドル拘束ビジュアル（拘束リング＝高耐久8連打 ／ 光剣＝5連打、4面手裏剣と同じく分かりやすい連打解除表示に統一！）
    const flips = Physics.getFlippers(state);
    [
      { count: state.flipperPinL || 0, style: b.pinStyleL || "halo", sideIdx: 0 },
      { count: state.flipperPinR || 0, style: b.pinStyleR || "halo", sideIdx: 1 }
    ].forEach(({ count, style, sideIdx }) => {
      if (count <= 0) return;
      // 同じ側のメインパドル（＋展開中なら中段パドル）に拘束エフェクトを描画
      flips.forEach((f, idx) => {
        if ((f.isLeft ? 0 : 1) !== sideIdx) return;
        const st = Physics.flipperState[idx];
        const shakeOff = (st.pinShake || 0) > 0 ? Math.sin(b.animTick * 1.8) * 3.0 : 0;
        const mx = f.px + Math.cos(st.angle) * (f.len * 0.52) + shakeOff;
        const my = f.py + Math.sin(st.angle) * (f.len * 0.52);

        ctx.save();
        ctx.translate(mx, my);
        if (style === "sword") {
          ctx.rotate(st.angle + 1.15);
          ctx.strokeStyle = "#ffd700";
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.moveTo(0, -13);
          ctx.lineTo(0, 11);
          ctx.moveTo(-6, -4);
          ctx.lineTo(6, -4);
          ctx.stroke();
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.moveTo(0, -12);
          ctx.lineTo(0, 10);
          ctx.stroke();
        } else {
          // 拘束リング（二重ネオン枷リングがパドルをガッチリ締め付ける演出）
          ctx.rotate(b.animTick * 0.10);
          ctx.strokeStyle = sideIdx === 0 ? "#ff2ad4" : "#00f5e8";
          ctx.lineWidth = 3.2;
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 7.5, -0.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = "#e6ff00";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 5.0, 0.25, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();

        if (!f.isSubFlipper) {
          ctx.save();
          ctx.font = "bold 9.5px monospace";
          ctx.textAlign = "center";
          ctx.strokeStyle = "#000000";
          ctx.lineWidth = 2.8;
          const mashTxt = t("stage4.render.mash", { count });
          ctx.strokeText(mashTxt, mx, my - 17);
          ctx.fillStyle = "#e6ff00";
          ctx.fillText(mashTxt, mx, my - 17);
          ctx.restore();
        }
      });
    });
  }
});

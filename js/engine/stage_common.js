// =========================================================================
// PINBALL ENGINE - STAGE COMMON UTILITIES & SHARED PERFORMANCE LAYER
// =========================================================================

window.StageCommon = {
  _defaultSlots: {},

  createFaceAnim() {
    return {
      blinkFrame: 0,
      winkFrame: 0,
      talkFrame: 0,
      sequence: null,
      seqIdx: 0,
      seqTimer: 0
    };
  },

  setExpressionSequence(state, seq) {
    if (!state || !state.boss || !state.boss.faceAnim || !seq || seq.length === 0) return;
    const fa = state.boss.faceAnim;
    fa.sequence = seq;
    fa.seqIdx = 0;
    fa.seqTimer = seq[0].frames;
    state.boss.expression = seq[0].expr;
    state.boss.expressionTimer = seq.reduce((a, s) => a + (s.frames || 0), 0);
  },

  updateFaceAnim(boss, defaultExpr = "normal") {
    if (!boss) return;
    if (!boss.faceAnim) boss.faceAnim = this.createFaceAnim();
    const fa = boss.faceAnim;

    if (fa.sequence && fa.sequence.length > 0) {
      fa.seqTimer--;
      if (fa.seqTimer <= 0) {
        fa.seqIdx++;
        if (fa.seqIdx < fa.sequence.length) {
          fa.seqTimer = fa.sequence[fa.seqIdx].frames;
          boss.expression = fa.sequence[fa.seqIdx].expr;
        } else {
          fa.sequence = null;
          boss.expression = defaultExpr;
          boss.expressionTimer = 0;
        }
      }
    } else if (boss.expressionTimer > 0) {
      boss.expressionTimer--;
      if (boss.expressionTimer <= 0) {
        boss.expression = defaultExpr;
      }
    }

    if (boss.winkTimer > 0) {
      boss.winkTimer--;
      fa.winkFrame = boss.winkTimer;
    } else {
      fa.winkFrame = 0;
    }

    if (boss.talkTimer > 0) boss.talkTimer--;

    if (fa.blinkFrame > 0) {
      fa.blinkFrame--;
    } else {
      if (typeof boss.blinkTimer !== "number") {
        boss.blinkTimer = 110 + Math.floor(Math.random() * 120);
      }
      boss.blinkTimer--;
      if (boss.blinkTimer <= 0) {
        fa.blinkFrame = 16;
        boss.blinkTimer = 110 + Math.floor(Math.random() * 120);
      }
    }
  },

  getActiveFacePatchKey(boss, state, opts = {}) {
    if (!boss) return null;
    const defaultExpr = opts.defaultExpr || "normal";
    const aliasMap = opts.aliasMap || null;
    const halfBlink = opts.halfBlink !== false;
    const fa = boss.faceAnim || {};

    const isTalking =
      (boss.talkTimer > 0) ||
      (state && state.cutin && state.cutin.timer > 0) ||
      (window.UI && typeof UI.isCutinVisible === "function" && UI.isCutinVisible());

    if (boss.expression && boss.expression !== defaultExpr) {
      return (aliasMap && aliasMap[boss.expression]) || boss.expression;
    } else if (isTalking) {
      const cycle = Math.floor(performance.now() * 0.0075) % 3;
      return cycle === 0 ? "talk" : (cycle === 1 ? "talk_sm" : null);
    } else if (fa.winkFrame > 0) {
      return "wink";
    } else if (fa.blinkFrame > 0) {
      const bf = fa.blinkFrame;
      if (halfBlink) {
        return (bf >= 13) ? "blink_half" : (bf >= 5) ? "blink" : (bf >= 2) ? "blink_half" : null;
      } else {
        return (bf > 12 || bf <= 7) ? "blink" : null;
      }
    } else if (fa.talkFrame > 0) {
      return "talk_sm";
    }
    return null;
  },

  drawFacePatch(ctx, facePatchImgs, key, IMG_BOX, srcRect, srcSize = { w: 768, h: 1376 }) {
    if (
      key &&
      facePatchImgs &&
      facePatchImgs[key] &&
      facePatchImgs[key].complete &&
      facePatchImgs[key].naturalWidth > 0
    ) {
      const x = IMG_BOX.x + (srcRect.x / srcSize.w) * IMG_BOX.w;
      const y = IMG_BOX.y + (srcRect.y / srcSize.h) * IMG_BOX.h;
      const w = (srcRect.w / srcSize.w) * IMG_BOX.w;
      const h = (srcRect.h / srcSize.h) * IMG_BOX.h;
      ctx.drawImage(facePatchImgs[key], x, y, w, h);
    }
  },

  stepSoftSpring(part, k, damp, maxDisp) {
    if (!part) return;
    if (part.flash > 0) part.flash--;
    part.vx = (part.vx || 0) - (part.dx || 0) * k;
    part.vy = (part.vy || 0) - (part.dy || 0) * k;
    part.vx *= damp;
    part.vy *= damp;
    part.dx = (part.dx || 0) + part.vx;
    part.dy = (part.dy || 0) + part.vy;

    const disp = Math.hypot(part.dx, part.dy);
    if (disp > maxDisp && disp > 0) {
      const scale = maxDisp / disp;
      part.dx *= scale;
      part.dy *= scale;
      part.vx *= 0.65;
      part.vy *= 0.65;
    }

    if (Math.hypot(part.dx, part.dy) < 0.06 && Math.hypot(part.vx, part.vy) < 0.06) {
      part.dx = 0;
      part.dy = 0;
      part.vx = 0;
      part.vy = 0;
    }
  },

  renderSoftWarp(ctx, IMG_BOX, src, bodies, opts = {}) {
    if (!src || !src.data) return;
    const slotName = opts.slotName || "default";
    const reach = opts.reach ?? 1.15;
    const minDisp = opts.minDisp ?? 0.12;
    const rgba = !!opts.rgba;
    const shear = opts.shear !== false;

    const active = bodies.filter(b => b && (Math.abs(b.dx) >= minDisp || Math.abs(b.dy) >= minDisp));
    if (active.length === 0) {
      if (rgba) ctx.drawImage(src.canvas, IMG_BOX.x, IMG_BOX.y);
      return;
    }

    const nF = active.length;
    const fields = new Array(nF);
    for (let i = 0; i < nF; i++) {
      const b = active[i];
      const rx = (b.rx || b.r || 24) * reach, ry = (b.ry || b.r || 24) * reach;
      fields[i] = {
        cx: b.x - IMG_BOX.x,
        cy: b.y - IMG_BOX.y,
        rx,
        ry,
        irx: 1 / rx,
        iry: 1 / ry,
        dx: b.dx,
        dy: b.dy,
        kx: shear ? (b.dx * 0.008 - b.dy * 0.005) : 0,
        ky: shear ? (b.dy * 0.008 - b.dx * 0.005) : 0
      };
    }

    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < nF; i++) {
      const f = fields[i];
      if (f.cx - f.rx < x0) x0 = f.cx - f.rx;
      if (f.cx + f.rx > x1) x1 = f.cx + f.rx;
      if (f.cy - f.ry < y0) y0 = f.cy - f.ry;
      if (f.cy + f.ry > y1) y1 = f.cy + f.ry;
    }
    const SW = src.w || (src.canvas && src.canvas.width) || IMG_BOX.w;
    const SH = src.h || (src.canvas && src.canvas.height) || IMG_BOX.h;
    x0 = Math.max(0, Math.floor(x0));
    y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(SW, Math.ceil(x1));
    y1 = Math.min(SH, Math.ceil(y1));
    const rw = x1 - x0, rh = y1 - y0;
    if (rw <= 0 || rh <= 0) {
      if (rgba) ctx.drawImage(src.canvas, IMG_BOX.x, IMG_BOX.y);
      return;
    }

    const store = opts.slotStore || (this._defaultSlots || (this._defaultSlots = {}));
    let slot = store[slotName];
    const capW = Math.ceil(rw / 16) * 16;
    const capH = Math.ceil(rh / 16) * 16;

    if (!slot || slot.capW < capW || slot.capH < capH) {
      const c = document.createElement("canvas");
      c.width = capW;
      c.height = capH;
      const cctx = c.getContext("2d", { willReadFrequently: false });
      slot = {
        canvas: c,
        ctx: cctx,
        capW,
        capH,
        img: cctx.createImageData(capW, capH)
      };
      store[slotName] = slot;
    }

    const od = slot.img.data;
    const stride = slot.capW * 4;
    for (let v = 0; v < rh; v++) {
      od.fill(0, v * stride, v * stride + rw * 4);
    }

    if (rgba) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      ctx.rect(IMG_BOX.x + x0, IMG_BOX.y + y0, rw, rh);
      ctx.clip("evenodd");
      ctx.drawImage(src.canvas, IMG_BOX.x, IMG_BOX.y);
      ctx.restore();

      const sd = src.data;
      for (let v = 0; v < rh; v++) {
        const py = y0 + v;
        for (let u = 0; u < rw; u++) {
          const px = x0 + u;
          let offX = 0, offY = 0;
          for (let fi = 0; fi < nF; fi++) {
            const f = fields[fi];
            const rxv = px - f.cx, ryv = py - f.cy;
            const nx = rxv * f.irx, ny = ryv * f.iry;
            const r2 = nx * nx + ny * ny;
            if (r2 < 1.0) {
              const t = 1.0 - r2;
              const wgt = t * t;
              offX += wgt * (f.dx + f.kx * rxv);
              offY += wgt * (f.dy + f.ky * ryv);
            }
          }

          let sx = px - offX, sy = py - offY;
          if (sx < 0) sx = 0; else if (sx > SW - 1.001) sx = SW - 1.001;
          if (sy < 0) sy = 0; else if (sy > SH - 1.001) sy = SH - 1.001;
          const ix = sx | 0, iy = sy | 0;
          const fx = sx - ix, fy = sy - iy;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;

          const i00 = (iy * SW + ix) * 4;
          const i10 = i00 + 4;
          const i01 = i00 + SW * 4;
          const i11 = i01 + 4;

          const a00 = sd[i00 + 3], a10 = sd[i10 + 3], a01 = sd[i01 + 3], a11 = sd[i11 + 3];
          const outA = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;
          const oi = (v * slot.capW + u) * 4;
          if (outA > 1) {
            const invA = 1 / outA;
            od[oi]     = (sd[i00] * a00 * w00 + sd[i10] * a10 * w10 + sd[i01] * a01 * w01 + sd[i11] * a11 * w11) * invA;
            od[oi + 1] = (sd[i00 + 1] * a00 * w00 + sd[i10 + 1] * a10 * w10 + sd[i01 + 1] * a01 * w01 + sd[i11 + 1] * a11 * w11) * invA;
            od[oi + 2] = (sd[i00 + 2] * a00 * w00 + sd[i10 + 2] * a10 * w10 + sd[i01 + 2] * a01 * w01 + sd[i11 + 2] * a11 * w11) * invA;
            od[oi + 3] = outA;
          }
        }
      }
    } else {
      const sd = src.data;
      for (let v = 0; v < rh; v++) {
        const Y = y0 + v;
        for (let u = 0; u < rw; u++) {
          const X = x0 + u;
          let ox = 0, oy = 0, inside = false;
          for (let i = 0; i < nF; i++) {
            const f = fields[i];
            const rxv = X - f.cx, ryv = Y - f.cy;
            const nx = rxv * f.irx, ny = ryv * f.iry;
            const r2 = nx * nx + ny * ny;
            if (r2 >= 1.0) continue;
            const t = 1.0 - r2;
            const wgt = t * t;
            ox += wgt * (f.dx + f.kx * rxv);
            oy += wgt * (f.dy + f.ky * ryv);
            inside = true;
          }
          if (!inside) continue;

          let sx = X - ox, sy = Y - oy;
          if (sx < 0) sx = 0; else if (sx > SW - 1.001) sx = SW - 1.001;
          if (sy < 0) sy = 0; else if (sy > SH - 1.001) sy = SH - 1.001;
          const ix = sx | 0, iy = sy | 0;
          const fx = sx - ix, fy = sy - iy;
          const i00 = (iy * SW + ix) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4;
          const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
          const oi = (v * slot.capW + u) * 4;
          od[oi]     = sd[i00] * w00 + sd[i10] * w10 + sd[i01] * w01 + sd[i11] * w11;
          od[oi + 1] = sd[i00 + 1] * w00 + sd[i10 + 1] * w10 + sd[i01 + 1] * w01 + sd[i11 + 1] * w11;
          od[oi + 2] = sd[i00 + 2] * w00 + sd[i10 + 2] * w10 + sd[i01 + 2] * w01 + sd[i11 + 2] * w11;
          od[oi + 3] = 255;
        }
      }
    }

    slot.ctx.putImageData(slot.img, 0, 0, 0, 0, rw, rh);
    ctx.drawImage(slot.canvas, 0, 0, rw, rh, IMG_BOX.x + x0, IMG_BOX.y + y0, rw, rh);
  },

  startClearSequence(state, walls) {
    if (!state) return;
    const wallDefs = walls || (window.Physics && Physics.TABLE_WALLS) || [];
    state.clearSequence = {
      active: true,
      frame: 0,
      phase: "exploding",
      whiteoutAlpha: 0,
      cgRevealAlpha: 0,
      uiShown: false,
      shatterPieces: (window.Particles && typeof Particles.shatterTableFrame === "function")
        ? Particles.shatterTableFrame(wallDefs)
        : [],
      smokeClouds: []
    };
  },

  spawnSmokeCloud(seq, x, y, color = "rgba(255, 235, 250, 0.9)", rBase = 26) {
    if (!seq || !seq.smokeClouds) return;
    seq.smokeClouds.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -0.5 - Math.random() * 1.4,
      r: rBase + Math.random() * 26,
      vGrow: 0.55 + Math.random() * 0.4,
      alpha: 0.05,
      maxAlpha: 0.78,
      life: 72,
      maxLife: 72,
      color
    });
  },

  updateClearSequence(state, cfg = {}) {
    if (!state || !state.clearSequence || !state.clearSequence.active) return;
    const seq = state.clearSequence;
    seq.frame++;

    if (seq.shatterPieces) {
      seq.shatterPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.20;
        p.angle += (p.vAngle ?? p.vRot ?? 0);
        p.life--;
      });
    }

    if (seq.frame < 95 && seq.frame % 3 === 0) {
      const x = 110 + Math.random() * 176;
      const y = 165 + Math.random() * 270;
      const cols = cfg.smokeColors || ["#ffb7dd", "#00f5d4", "#b84dff", "#ff2a9d", "rgba(255, 235, 250, 0.9)"];
      const col = cols[Math.floor(Math.random() * cols.length)];
      this.spawnSmokeCloud(seq, x, y, col);
    }

    if (seq.smokeClouds) {
      for (let i = seq.smokeClouds.length - 1; i >= 0; i--) {
        const smk = seq.smokeClouds[i];
        smk.x += smk.vx;
        smk.y += smk.vy;
        if (smk.vGrow) smk.r += smk.vGrow;
        else smk.r += 0.6;
        smk.life--;
        const maxLife = smk.maxLife || 72;
        const progress = 1 - (smk.life / maxLife);
        const maxAlpha = smk.maxAlpha || 0.78;
        if (progress < 0.2) {
          smk.alpha = (progress / 0.2) * maxAlpha;
        } else {
          smk.alpha = Math.max(0, (1 - (progress - 0.2) / 0.8) * maxAlpha);
        }
        if (smk.life <= 0 || smk.alpha <= 0.01) {
          seq.smokeClouds.splice(i, 1);
        }
      }
    }

    if (seq.frame >= 55 && seq.frame < 105) {
      seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 55) / 50);
    } else if (seq.frame >= 105) {
      seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);
      seq.cgRevealAlpha = Math.min(1.0, (seq.frame - 105) / 50);
    }

    if (typeof cfg.onFrame === "function") {
      cfg.onFrame(seq, state);
    }

    if (seq.frame >= 158 && !seq.uiShown) {
      seq.uiShown = true;
      if (window.UI && typeof UI.updateHUD === "function") {
        UI.updateHUD(state);
      }
      const modal = document.getElementById("clearModal");
      if (modal) {
        if (cfg.bossDisplayName) {
          const nameEl = modal.querySelector(".text-\\[\\#ff66b2\\]");
          if (nameEl) nameEl.textContent = cfg.bossDisplayName;
        }
        if (cfg.defeatQuoteHtml) {
          const quoteEl = modal.querySelector("p");
          if (quoteEl) quoteEl.innerHTML = cfg.defeatQuoteHtml;
        }
        const scoreEl = document.getElementById("clearFinalScore");
        if (scoreEl) scoreEl.textContent = (state.score || 0).toLocaleString();
        const ballsEl = document.getElementById("clearRemainingBalls");
        if (ballsEl) ballsEl.textContent = String(state.ballsRemaining ?? 0);

        modal.classList.remove("hidden");
        modal.classList.add("flex");
        void modal.offsetWidth;
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
      }
    }
  },

  renderSmokeClouds(ctx, state) {
    if (!state || !state.clearSequence || !state.clearSequence.smokeClouds || state.clearSequence.smokeClouds.length === 0) return;
    const clouds = state.clearSequence.smokeClouds;
    ctx.save();
    for (let i = 0; i < clouds.length; i++) {
      const smk = clouds[i];
      if (smk.alpha <= 0.01) continue;
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
    }
    ctx.restore();
  }
};

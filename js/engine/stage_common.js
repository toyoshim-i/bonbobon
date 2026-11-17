// =========================================================================
// PINBALL ENGINE - STAGE COMMON UTILITIES & SHARED PERFORMANCE LAYER
// =========================================================================

window.StageCommon = {
  ASSET_QUERY: "?v=190",
  _defaultSlots: {},

  createFaceAnim(idleTimer = 0) {
    return {
      idleTimer,
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

  updateFaceAnim(boss, defaultExpr = "normal", opts = {}) {
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
    } else {
      if (boss.expressionTimer > 0) {
        boss.expressionTimer--;
        if (boss.expressionTimer <= 0) {
          boss.expression = defaultExpr;
        }
      }
      if (opts.idleRandom && boss.expression === defaultExpr) {
        fa.idleTimer = (fa.idleTimer || 0) - 1;
        if (fa.idleTimer <= 0) {
          const r = Math.random();
          if (r < (opts.blinkProb ?? 0.55)) {
            fa.blinkFrame = opts.blinkFrames ?? 16;
            fa.idleTimer = 125 + Math.floor(Math.random() * 110);
          } else if (r < (opts.winkProb ?? 0.82)) {
            fa.winkFrame = opts.winkFrames ?? 45;
            fa.idleTimer = 160 + Math.floor(Math.random() * 120);
          } else {
            fa.talkFrame = opts.talkFrames ?? 24;
            fa.idleTimer = 140 + Math.floor(Math.random() * 100);
          }
        }
      }
    }

    if (fa.blinkFrame > 0) fa.blinkFrame--;
    if (fa.winkFrame > 0) fa.winkFrame--;
    if (fa.talkFrame > 0) fa.talkFrame--;

    if (boss.winkTimer > 0) {
      boss.winkTimer--;
      fa.winkFrame = Math.max(fa.winkFrame || 0, boss.winkTimer);
    }

    if (boss.talkTimer > 0) boss.talkTimer--;

    if (!opts.idleRandom) {
      if (fa.blinkFrame <= 0) {
        if (typeof boss.blinkTimer !== "number") {
          boss.blinkTimer = 110 + Math.floor(Math.random() * 120);
        }
        boss.blinkTimer--;
        if (boss.blinkTimer <= 0) {
          fa.blinkFrame = 16;
          boss.blinkTimer = 110 + Math.floor(Math.random() * 120);
        }
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
    }

    const sd = src.data;
    for (let v = 0; v < rh; v++) {
      const py = y0 + v;
      for (let u = 0; u < rw; u++) {
        const px = x0 + u;
        let ox = 0, oy = 0, inside = false;
        for (let fi = 0; fi < nF; fi++) {
          const f = fields[fi];
          const rxv = px - f.cx, ryv = py - f.cy;
          const nx = rxv * f.irx, ny = ryv * f.iry;
          const r2 = nx * nx + ny * ny;
          if (r2 < 1.0) {
            const t = 1.0 - r2;
            const wgt = t * t;
            ox += wgt * (f.dx + f.kx * rxv);
            oy += wgt * (f.dy + f.ky * ryv);
            inside = true;
          }
        }
        if (!rgba && !inside) continue;

        let sx = px - ox, sy = py - oy;
        if (sx < 0) sx = 0; else if (sx > SW - 1.001) sx = SW - 1.001;
        if (sy < 0) sy = 0; else if (sy > SH - 1.001) sy = SH - 1.001;
        const ix = sx | 0, iy = sy | 0;
        const fx = sx - ix, fy = sy - iy;
        const w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
        const i00 = (iy * SW + ix) * 4, i10 = i00 + 4, i01 = i00 + SW * 4, i11 = i01 + 4;
        const oi = (v * slot.capW + u) * 4;

        if (rgba) {
          const a00 = sd[i00 + 3], a10 = sd[i10 + 3], a01 = sd[i01 + 3], a11 = sd[i11 + 3];
          const outA = a00 * w00 + a10 * w10 + a01 * w01 + a11 * w11;
          if (outA > 1) {
            const invA = 1 / outA;
            od[oi]     = (sd[i00] * a00 * w00 + sd[i10] * a10 * w10 + sd[i01] * a01 * w01 + sd[i11] * a11 * w11) * invA;
            od[oi + 1] = (sd[i00 + 1] * a00 * w00 + sd[i10 + 1] * a10 * w10 + sd[i01 + 1] * a01 * w01 + sd[i11 + 1] * a11 * w11) * invA;
            od[oi + 2] = (sd[i00 + 2] * a00 * w00 + sd[i10 + 2] * a10 * w10 + sd[i01 + 2] * a01 * w01 + sd[i11 + 2] * a11 * w11) * invA;
            od[oi + 3] = outA;
          }
        } else {
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

  createClearSequenceState(active = false, walls = null) {
    const wallDefs = active ? (walls || (window.Physics && Physics.TABLE_WALLS) || []) : [];
    return {
      active: !!active,
      frame: 0,
      phase: active ? "exploding" : "playing",
      whiteoutAlpha: 0,
      cgRevealAlpha: 0,
      uiShown: false,
      shatterPieces: active && window.Particles && typeof Particles.shatterTableFrame === "function"
        ? Particles.shatterTableFrame(wallDefs)
        : [],
      smokeClouds: []
    };
  },

  startClearSequence(state, walls) {
    if (!state) return;
    state.stageCleared = true;
    state.clearSequence = this.createClearSequenceState(true, walls);
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

    // 1. Screen shake (0..45 frames) & settle
    if (state.nudgeOffset) {
      if (seq.frame < 45) {
        state.nudgeOffset.x = (Math.random() - 0.5) * 16;
        state.nudgeOffset.y = (Math.random() - 0.5) * 12;
        if (seq.frame % 10 === 0) {
          if (window.sfx && window.sfx.armorBreak) window.sfx.armorBreak();
          if (cfg.explosionOrigin && window.Particles) {
            Particles.add(
              state,
              cfg.explosionOrigin.x + (Math.random() - 0.5) * 120,
              cfg.explosionOrigin.y + (Math.random() - 0.5) * 80,
              cfg.explosionColor || "#ff1493",
              14,
              5.0
            );
          }
        }
      } else {
        state.nudgeOffset.x *= 0.84;
        state.nudgeOffset.y *= 0.84;
      }
    }

    // 2. Shatter pieces update
    if (seq.shatterPieces) {
      seq.shatterPieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.20;
        p.angle += (p.vAngle ?? p.vRot ?? 0);
        p.life--;
      });
    }

    // 3. Pre-whiteout smoke (frame 20..98)
    if (seq.frame >= 20 && seq.frame < 98) {
      if (seq.frame % 2 === 0) {
        const cols = cfg.smokeColors || ["#ffb7dd", "#00f5d4", "#b84dff", "#ff2a9d", "rgba(255, 235, 250, 0.9)"];
        const col = cols[Math.floor(Math.random() * cols.length)];
        let sx, sy;
        if (cfg.explosionOrigin && Math.random() > 0.35) {
          sx = cfg.explosionOrigin.x + (Math.random() - 0.5) * 120;
          sy = cfg.explosionOrigin.y + (Math.random() - 0.5) * 80;
        } else {
          sx = 110 + Math.random() * 176;
          sy = 165 + Math.random() * 270;
        }
        this.spawnSmokeCloud(seq, sx, sy, col);
      }
      if (seq.frame % 3 === 0) {
        this.spawnSmokeCloud(seq, 100 + Math.random() * 220, 580, "#ffffff");
      }
    }

    // 4. Update smoke clouds
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

    // 5. Whiteout buildup and peak
    if (seq.frame >= 55 && seq.frame < 105) {
      seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 55) / 50);
      if (seq.frame === 104 && window.sfx) {
        window.sfx.burstTrigger();
      }
    } else if (seq.frame >= 105) {
      if (seq.frame === 105) {
        seq.smokeClouds = [];
        seq.cgRevealAlpha = 1.0;
      }
      seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);
      seq.cgRevealAlpha = 1.0;
    }

    if (typeof cfg.onFrame === "function") {
      cfg.onFrame(seq, state);
    }

    // 6. Modal trigger
    if (seq.frame >= 158 && !seq.uiShown) {
      seq.uiShown = true;
      if (window.UI && typeof UI.presentStageClearModal === "function") {
        UI.presentStageClearModal(state, cfg);
      }
    }
  },

  renderSmokeClouds(ctx, state) {
    if (!state || !state.clearSequence || !state.clearSequence.active || !state.clearSequence.smokeClouds || state.clearSequence.smokeClouds.length === 0) return;
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
        const pt = {
          x: cr(p0.x, p1.x, p2.x, p3.x),
          y: cr(p0.y, p1.y, p2.y, p3.y),
          elev: Math.max(0, Math.min(1, cr(p0.elev, p1.elev, p2.elev, p3.elev)))
        };
        if (p1.lanternId !== undefined || p2.lanternId !== undefined) {
          pt.lanternId = t < 0.28 ? p1.lanternId : (t > 0.72 ? p2.lanternId : null);
        }
        out.push(pt);
      }
    }
    return out;
  },

  buildPolylineMetrics(points, subdiv = 5) {
    const smoothPts = this.smoothControlPoints(points, subdiv);
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

  samplePolylineRamp(metrics, dist, opts = {}) {
    const withLanterns = !!opts.withLanterns;
    const clamped = Math.max(0, Math.min(metrics.totalLen, dist));
    for (let i = 0; i < metrics.segs.length; i++) {
      const s = metrics.segs[i];
      if (clamped <= s.endDist || i === metrics.segs.length - 1) {
        const t = Math.max(0, Math.min(1, (clamped - s.startDist) / s.len));
        const dx = (s.b.x - s.a.x) / s.len;
        const dy = (s.b.y - s.a.y) / s.len;
        const res = {
          x: s.a.x + (s.b.x - s.a.x) * t,
          y: s.a.y + (s.b.y - s.a.y) * t,
          elev: s.a.elev + (s.b.elev - s.a.elev) * t,
          tx: dx,
          ty: dy,
          totalLen: metrics.totalLen
        };
        if (withLanterns) {
          res.nearLanternId = t > 0.65 ? s.b.lanternId : (t < 0.35 ? s.a.lanternId : null);
        }
        return res;
      }
    }
    const last = metrics.segs[metrics.segs.length - 1];
    const fallback = { x: last.b.x, y: last.b.y, elev: last.b.elev, tx: 0, ty: 1, totalLen: metrics.totalLen };
    if (withLanterns) fallback.nearLanternId = null;
    return fallback;
  },

  createPixelBuffer(w, h, drawFn, key = "") {
    try {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const cc = c.getContext("2d", { willReadFrequently: true });
      drawFn(cc, w, h);
      const d = cc.getImageData(0, 0, c.width, c.height);
      return { canvas: c, ctx: cc, key, w: c.width, h: c.height, data: d.data };
    } catch (e) {
      // file:// 等でキャンバスが汚染される環境では変形を諦める（原画のまま表示）
      return { canvas: null, ctx: null, key, w: 0, h: 0, data: null };
    }
  },

  stepWireRampBall(ball, state, stage, substep, substeps = 6, opts = {}) {
    const b = state.boss;
    if (ball._onWireRamp) {
      const rs = ball._onWireRamp;
      rs.dist += rs.speed / substeps;
      const samp = stage.sampleRamp(rs.rampId, rs.dist);
      ball.x = samp.x;
      ball.y = samp.y;
      rs.elev = samp.elev;

      if (substep === 0) {
        rs.tick = (rs.tick || 0) + 1;
        if (rs.tick % 5 === 0 && window.sfx && window.sfx.rampRailTick) {
          window.sfx.rampRailTick(rs.tick / 5);
        }
        if (rs.tick % 2 === 0) {
          const rampDef = stage.WIRE_RAMPS[rs.rampId];
          Particles.add(state, ball.x, ball.y, rampDef.color, 3, 2.2);
        }
      }

      if (typeof opts.onRide === "function") {
        opts.onRide(ball, rs, state, substep);
      }

      if (rs.dist >= samp.totalLen) {
        const rampDef = stage.WIRE_RAMPS[rs.rampId];
        ball._onWireRamp = null;
        ball._rampExitCooldown = 28;
        ball.vx = rampDef.exitVx;
        ball.vy = rampDef.exitVy;
        Particles.addPopup(state, ball.x, ball.y - 12, "⚡SKYWAY DROP!", rampDef.color, 1.05);
      }
      return true;
    }

    if (substep === 0 && ball._rampExitCooldown > 0) {
      ball._rampExitCooldown--;
    }

    const canEnter = opts.canEnter !== undefined ? opts.canEnter : true;
    const minVy = opts.minVy ?? -2.5;
    if (canEnter && !ball._rampExitCooldown && ball.vy < minVy && b && b.lastFlipActiveTimer > 0) {
      const minSpeed = opts.minSpeed ?? 9.2;
      const maxSpeed = opts.maxSpeed ?? 14.5;
      const entryScore = opts.entryScore ?? 5500;
      for (const rampKey of ["left", "right"]) {
        const rd = stage.WIRE_RAMPS[rampKey];
        if (!rd) continue;
        const dGate = Math.hypot(ball.x - rd.entryX, ball.y - rd.entryY);
        if (dGate < ball.r + rd.entryR) {
          const entrySpd = Math.max(minSpeed, Math.min(maxSpeed, Math.hypot(ball.vx, ball.vy) * 1.18));
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
          Systems.addScore(state, entryScore, rd.entryX, rd.entryY - 12, `⚡${rd.name} IN!!`);
          Particles.add(state, rd.entryX, rd.entryY, rd.color, 16, 4.4);
          return true;
        }
      }
    }
    return false;
  },

  renderWireRampChasers(ctx, stage, rampKey, totalLen, animTick) {
    const chaseOffset = (animTick * 3.2) % 44;
    for (let d = chaseOffset; d < totalLen - 12; d += 44) {
      const s = stage.sampleRamp(rampKey, d);
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
  },

  renderWireRampBalls(ctx, state, wireRamps) {
    state.balls.forEach(ball => {
      if (!ball._onWireRamp) return;
      const elev = ball._onWireRamp.elev || 1.0;
      const rScaled = ball.r * (1.0 + elev * 0.28);
      const rd = wireRamps[ball._onWireRamp.rampId];

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
  }
};

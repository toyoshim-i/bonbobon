// =========================================================================
// PINBALL ENGINE - PHYSICS & COLLISION SYSTEM
// =========================================================================

window.Physics = {
  // 全テーブル共通の物理・反発定数（調整時の単一参照先）※スコア値は ScoreTable で管理
  BALANCE: {
    TIME_SCALE: 0.75,
    // ステージ進行ごとの速度スケール（Stage 1 ➔ Stage 5 で段階的に加速、軌道形状や到達高度は不変）
    STAGE_TIME_SCALES: [0.75, 0.83, 0.91, 1.00, 1.10],
    GRAVITY: 0.118,
    SUBSTEPS: 8,
    MAX_BALL_SPEED: 13.2,
    PLUNGER_BASE_SPEED: 1.4,
    PLUNGER_MAX_ADD_SPEED: 16.2,
    SKILL_SHOT_MIN_RATIO: 0.70,
    SKILL_SHOT_MAX_RATIO: 0.86,
    NUDGE_IMPULSE: 6.2,
    STUCK_REMIND_FRAMES: 85,
    STUCK_KICK_FRAMES: 360,
    SLINGSHOT_KICK_SPEED: 12.5,
    SLINGSHOT_FEVER: 2
  },

  getTimeScale(state) {
    let idx = (state && state.stageIndex) || 0;
    if ((!idx || (window.GameEngine && GameEngine.state === state)) && window.GameEngine && window.currentStage && window.currentStage.id && GameEngine.getStageMeta) {
      const meta = GameEngine.getStageMeta(window.currentStage.id);
      if (meta && meta.index) idx = meta.index;
    }
    idx = Math.max(1, Math.min(5, idx || 1));
    const scales = this.BALANCE.STAGE_TIME_SCALES;
    return (scales && scales[idx - 1]) || this.BALANCE.TIME_SCALE;
  },

  getMaxBallSpeed(state) {
    const springLv = (state && state.relics && state.relics.spring) || 0;
    return this.BALANCE.MAX_BALL_SPEED * (1 + springLv * 0.08);
  },

  getPinMobility(state, isLeft) {
    const pinKey = isLeft ? "flipperPinL" : "flipperPinR";
    const maxKey = isLeft ? "flipperPinMaxL" : "flipperPinMaxR";
    const count = (state && state[pinKey]) || 0;
    if (count <= 0) {
      if (state && state[maxKey]) state[maxKey] = 0;
      return 1.0;
    }
    const maxPin = Math.max((state && state[maxKey]) || 0, count);
    if (state) state[maxKey] = maxPin;
    const progress = (maxPin - count) / Math.max(1, maxPin);
    return Math.min(0.63, 0.08 + 0.55 * progress);
  },

  TABLE_GEOM: {
    SHOOTER_MIN_X: 380,
    SHOOTER_MAX_X: 405,
    SHOOTER_CENTER_X: 393,
    PLUNGER_REST_Y: 575,
    PLUNGER_BOTTOM_Y: 635,
    CENTER_POST_X: 198,
    CENTER_POST_Y: 614,
    KICKBACK_Y: 560
  },

  TABLE_WALLS: [
    // Outer perimeter walls (Arc roof + straight sides)
    { x1: 16,  y1: 635, x2: 16,  y2: 95,  isOuterHull: true },
    { x1: 16,  y1: 95,  x2: 65,  y2: 32,  isOuterHull: true, isUpperArch: true },
    { x1: 65,  y1: 32,  x2: 210, y2: 16,  isOuterHull: true, isUpperArch: true },
    { x1: 210, y1: 16,  x2: 355, y2: 32,  isOuterHull: true, isUpperArch: true },
    { x1: 355, y1: 32,  x2: 404, y2: 95,  isOuterHull: true, isUpperArch: true },
    { x1: 404, y1: 95,  x2: 404, y2: 635, isOuterHull: true },

    // Shooter lane inner wall (right side) & bottom wall
    { x1: 380, y1: 175, x2: 380, y2: 635, isLane: true },
    { x1: 380, y1: 635, x2: 404, y2: 635, isLane: true },

    // Mid playfield upper outer guide deflectors
    { x1: 16,  y1: 280, x2: 20,  y2: 360 },
    { x1: 380, y1: 280, x2: 376, y2: 360 },

    // Lane Dividers (Inlane vertical passage + smooth feed ramp onto flipper)
    { x1: 50,  y1: 420, x2: 50,  y2: 558, isLane: true },
    { x1: 50,  y1: 558, x2: 110, y2: 598.5, isRamp: true },

    { x1: 346, y1: 420, x2: 346, y2: 558, isLane: true },
    { x1: 346, y1: 558, x2: 286, y2: 598.5, isRamp: true },

    // Slingshot Inner Walls (kept in TABLE_WALLS for rendering/effects; collision handled as solid triangles below)
    { x1: 84,  y1: 450, x2: 84,  y2: 535, isLane: true, isTriangleEdge: true },
    { x1: 84,  y1: 450, x2: 106, y2: 565, isSlingshot: true, kickDir: { x: 0.98, y: -0.19 }, isTriangleEdge: true },
    { x1: 84,  y1: 535, x2: 106, y2: 565, isLane: true, isTriangleEdge: true },

    { x1: 312, y1: 450, x2: 312, y2: 535, isLane: true, isTriangleEdge: true },
    { x1: 312, y1: 450, x2: 290, y2: 565, isSlingshot: true, kickDir: { x: -0.98, y: -0.19 }, isTriangleEdge: true },
    { x1: 312, y1: 535, x2: 290, y2: 565, isLane: true, isTriangleEdge: true },

    // Outlane Drain Slopes
    { x1: 16,  y1: 590, x2: 86,  y2: 648, isRamp: true },
    { x1: 380, y1: 590, x2: 310, y2: 648, isRamp: true }
  ],

  // Strict inward half-spaces of the convex outer perimeter (prevents upper-diagonal corner tunneling)
  OUTER_HULL_PLANES: [
    { x1: 16,  y1: 635, nx: 1, ny: 0, isUpperArch: false },
    { x1: 16,  y1: 95,  nx: 63 / Math.hypot(49, 63), ny: 49 / Math.hypot(49, 63), isUpperArch: true },
    { x1: 65,  y1: 32,  nx: 16 / Math.hypot(145, 16), ny: 145 / Math.hypot(145, 16), isUpperArch: true },
    { x1: 210, y1: 16,  nx: -16 / Math.hypot(145, 16), ny: 145 / Math.hypot(145, 16), isUpperArch: true },
    { x1: 355, y1: 32,  nx: -63 / Math.hypot(49, 63), ny: 49 / Math.hypot(49, 63), isUpperArch: true },
    { x1: 404, y1: 95,  nx: -1, ny: 0, isUpperArch: false }
  ],

  // Solid Slingshot Triangles (each edge has outward unit normal nx, ny)
  SLINGSHOT_TRIANGLES: [
    {
      edges: [
        { x1: 84, y1: 450, x2: 84,  y2: 535, nx: -1, ny: 0, isLane: true },
        { x1: 84, y1: 450, x2: 106, y2: 565, nx: 115 / Math.hypot(22, 115), ny: -22 / Math.hypot(22, 115), isSlingshot: true, kickDir: { x: 0.98, y: -0.19 } },
        { x1: 84, y1: 535, x2: 106, y2: 565, nx: -30 / Math.hypot(22, 30), ny: 22 / Math.hypot(22, 30), isLane: true }
      ]
    },
    {
      edges: [
        { x1: 312, y1: 450, x2: 312, y2: 535, nx: 1, ny: 0, isLane: true },
        { x1: 312, y1: 450, x2: 290, y2: 565, nx: -115 / Math.hypot(22, 115), ny: -22 / Math.hypot(22, 115), isSlingshot: true, kickDir: { x: -0.98, y: -0.19 } },
        { x1: 312, y1: 535, x2: 290, y2: 565, nx: 30 / Math.hypot(22, 30), ny: 22 / Math.hypot(22, 30), isLane: true }
      ]
    }
  ],

  flipperState: [
    { angle: 0.44, prevAngle: 0.44 },
    { angle: Math.PI - 0.44, prevAngle: Math.PI - 0.44 },
    { angle: 0.40, prevAngle: 0.40 },
    { angle: Math.PI - 0.40, prevAngle: Math.PI - 0.40 }
  ],

  _flippersCache: [
    { px: 110, py: 602, len: 56, restAngle: 0.44, activeAngle: -0.44, isLeft: true, isSubFlipper: false },
    { px: 286, py: 602, len: 56, restAngle: Math.PI - 0.44, activeAngle: Math.PI + 0.44, isLeft: false, isSubFlipper: false }
  ],
  _flippersWithSubCache: [
    { px: 110, py: 602, len: 56, restAngle: 0.44, activeAngle: -0.44, isLeft: true, isSubFlipper: false },
    { px: 286, py: 602, len: 56, restAngle: Math.PI - 0.44, activeAngle: Math.PI + 0.44, isLeft: false, isSubFlipper: false },
    { px: 25,  py: 392, len: 50, restAngle: 0.40, activeAngle: -0.46, isLeft: true, isSubFlipper: true },
    { px: 371, py: 392, len: 50, restAngle: Math.PI - 0.40, activeAngle: Math.PI + 0.46, isLeft: false, isSubFlipper: true }
  ],
  _cpWall: { x: 0, y: 0, t: 0 },
  _cpFlipper: { x: 0, y: 0, t: 0 },
  KICKBACK_DEFS: [
    { permKey: "kickbackL", chargeKey: "kickbackL_charges", minX: 14, maxX: 52, vx: 4.2, fxX: 33, checkLane: false, label: "⚡L-LASER SAVE!", cutinKey: "physics.kickbackL.cutin" },
    { permKey: "kickbackR", chargeKey: "kickbackR_charges", minX: 344, maxX: 382, vx: -4.2, fxX: 363, checkLane: true, label: "⚡R-LASER SAVE!", cutinKey: "physics.kickbackR.cutin" }
  ],

  closestPointOnSeg(px, py, x1, y1, x2, y2, out = null) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const res = out || { x: 0, y: 0, t: 0 };
    if (lenSq === 0) {
      res.x = x1;
      res.y = y1;
      res.t = 0;
      return res;
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
    res.x = x1 + t * dx;
    res.y = y1 + t * dy;
    res.t = t;
    return res;
  },

  getFlippers(state) {
    const ext = (state && state.perm && state.perm.wideFlipper) ? state.perm.wideFlipper * 10 : 0;
    const deploy = (state && state.stageIndex === 5 && state.boss && state.boss.subFlipperDeploy) || 0;
    if (deploy > 0.05) {
      const subExt = (state && state.perm && state.perm.wideFlipper) ? state.perm.wideFlipper * 6 : 0;
      const subLen = Math.max(8, (50 + subExt) * Math.min(1, deploy));
      this._flippersWithSubCache[0].len = 56 + ext;
      this._flippersWithSubCache[1].len = 56 + ext;
      this._flippersWithSubCache[2].len = subLen;
      this._flippersWithSubCache[3].len = subLen;
      return this._flippersWithSubCache;
    }
    this._flippersCache[0].len = 56 + ext;
    this._flippersCache[1].len = 56 + ext;
    return this._flippersCache;
  },

  pushTrailPoint(trail, x, y, maxLen = 9) {
    if (trail.length < maxLen) {
      trail.push({ x, y });
      return;
    }
    const recycled = trail[0];
    for (let i = 0; i < maxLen - 1; i++) {
      trail[i] = trail[i + 1];
    }
    recycled.x = x;
    recycled.y = y;
    trail[maxLen - 1] = recycled;
  },

  updateFlippers(state) {
    if ((state.flipperReverseTimer || 0) > 0) {
      state.flipperReverseTimer--;
    }
    const rev = (state.flipperReverseTimer || 0) > 0;
    const flippers = this.getFlippers(state);
    flippers.forEach((f, idx) => {
      const st = this.flipperState[idx];
      st.prevAngle = st.angle;
      const pressed = rev
        ? (f.isLeft ? state.rightFlipperDown : state.leftFlipperDown)
        : (f.isLeft ? state.leftFlipperDown : state.rightFlipperDown);
      const wasPressed = !!st.wasPressed;
      st.wasPressed = pressed;

      // Track active swing edge (for timed parry, whiff penalty) & tap shake-off (primary flippers only)
      const pinKey = f.isLeft ? "flipperPinL" : "flipperPinR";
      const isPinnedNow = (state[pinKey] || 0) > 0;
      if (pressed && !wasPressed) {
        st.justPressedTimer = (state.relics && state.relics.kasumi_chakra > 0) ? 20 : 12;
        if (isPinnedNow) {
          st.swingActive = false;
          if (!f.isSubFlipper) {
            state[pinKey]--;
            st.pinShake = 8;
            const mx = f.px + Math.cos(st.angle) * (f.len * 0.55);
            const my = f.py + Math.sin(st.angle) * (f.len * 0.55);
            if (state[pinKey] === 0) {
              state[f.isLeft ? "flipperPinMaxL" : "flipperPinMaxR"] = 0;
              if (window.sfx && window.sfx.shurikenParry) window.sfx.shurikenParry();
              if (window.Particles) {
                Particles.add(state, mx, my, "#e6ff00", 16, 4.8);
                Particles.addPopup(state, mx, my - 16, t("physics.pinRelease"), "#00f5d4", 1.1);
              }
            } else {
              if (window.sfx && window.sfx.metalBumper) window.sfx.metalBumper();
              if (window.Particles) {
                Particles.add(state, mx, my, "#b84dff", 5, 2.4);
                Particles.addPopup(state, mx, my - 14, t("physics.pinRemain", { count: state[pinKey] }), "#e6ff00", 0.92);
              }
            }
          } else {
            st.pinShake = 8;
          }
        } else {
          st.swingActive = true;
          st.swingHit = false;
        }
      } else {
        if ((st.justPressedTimer || 0) > 0) st.justPressedTimer--;
        if (!pressed && wasPressed) {
          if (!f.isSubFlipper && st.swingActive && !st.swingHit && !isPinnedNow && window.Systems && Systems.deductScore) {
            Systems.deductScore(
              state,
              ScoreTable.bonus.FLIPPER_WHIFF_PENALTY,
              f.px + (f.isLeft ? 22 : -22),
              f.py - 16,
              "WHIFF"
            );
          }
          st.swingActive = false;
        }
      }
      if ((st.pinShake || 0) > 0) st.pinShake--;

      // 連打に応じて段階的に拘束が緩む（8% ➔ ~56% ➔ 解除時100%）
      const mobility = this.getPinMobility(state, f.isLeft);
      const effectiveActive = mobility < 1.0
        ? (f.restAngle + (f.activeAngle - f.restAngle) * mobility)
        : f.activeAngle;

      const target = pressed ? effectiveActive : f.restAngle;
      const snapRate = Math.min(0.62, 0.44 * (this.getTimeScale(state) / 0.75));
      st.angle += (target - st.angle) * snapRate;
    });
  },

  triggerDirectionalNudge(state, dirX = 0, dirY = -1, intensity = 1.0) {
    intensity = Math.min(1.6, Math.max(0.7, intensity));
    const len = Math.hypot(dirX, dirY);
    let nx = 0, ny = -1;
    if (len > 0.001) {
      nx = dirX / len;
      ny = dirY / len;
    }

    if (window.sfx) window.sfx.flip();

    state.nudgeOffset.x = (nx * 20 + (Math.random() - 0.5) * 6) * intensity;
    state.nudgeOffset.y = (ny * 20 + (Math.random() - 0.5) * 6) * intensity;

    state.balls.forEach(b => {
      if (b._onWireRamp || b._inNavelTrap || b._fusionStasis || (b._seraphStasis && b._seraphStasis.grazeDelay <= 0)) return;
      if (b.inShooterLane && b.y > 535 && Math.abs(b.vy) < 1.5) return;
      b.vx += nx * this.BALANCE.NUDGE_IMPULSE * intensity;
      b.vy += ny * this.BALANCE.NUDGE_IMPULSE * intensity;

      // If ball was nearly stationary, give an extra impulse to break friction/traps
      if (Math.hypot(b.vx, b.vy) < 2.0) {
        b.vx += (Math.random() - 0.5) * 4.5;
        b.vy += -3.5 * intensity;
      }

      // If near crotch gravity well, give immediate outward kick
      if (state.boss && state.boss.crotch) {
        const dCr = Math.hypot(b.x - state.boss.crotch.x, b.y - state.boss.crotch.y);
        if (dCr < 50) {
          b.crotchHitTimer = 35;
          b.vy += (ny < 0 ? -4.5 : 4.5);
          b.vx += nx * 5.0 + (Math.random() - 0.5) * 3.0;
        }
      }
    });

    if (window.currentStage && window.currentStage.onNudge) {
      window.currentStage.onNudge(state, nx, ny, intensity);
    }

    let dirLabel = "UP";
    if (Math.abs(nx) > Math.abs(ny) * 1.25) {
      dirLabel = nx < 0 ? "◀ LEFT" : "▶ RIGHT";
    } else if (ny > 0.4) {
      dirLabel = "▼ DOWN";
    } else {
      dirLabel = nx < -0.3 ? "◤ UP-LEFT" : (nx > 0.3 ? "◥ UP-RIGHT" : "▲ UP");
    }

    Particles.addPopup(state, 210, 530, `${dirLabel} NUDGE!`, "#e6ff00", 1.15);
    Particles.add(state, 210, 530, "#e6ff00", 14, 4.2);
    if (window.Systems && Systems.deductScore) {
      Systems.deductScore(state, ScoreTable.bonus.NUDGE_PENALTY, 210, 555, "NUDGE", { allowPreLaunch: true });
    }
  },

  triggerNudge(state) {
    this.triggerDirectionalNudge(state, 0, -1, 1.0);
  },

  // Geometric collision helpers
  checkCircleBumper(ball, bumper, bounceSpeed, onHit) {
    const dx = ball.x - bumper.x;
    const dy = ball.y - bumper.y;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.r + bumper.r;
    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const ny = dy / dist;
      ball.x = bumper.x + nx * (minDist + 1.5);
      ball.y = bumper.y + ny * (minDist + 1.5);
      ball.vx = nx * bounceSpeed;
      ball.vy = ny * bounceSpeed;
      bumper.flash = 12;
      if (onHit) onHit(bumper);
      return true;
    }
    return false;
  },

  checkEllipseHit(ball, cx, cy, rx, ry) {
    const dx = ball.x - cx;
    const dy = ball.y - cy;
    const ndx = dx / rx;
    const ndy = dy / ry;
    const distNorm = Math.hypot(ndx, ndy);
    if (distNorm < 0.0001) return null;
    const realDist = Math.hypot(dx, dy);
    const boundR = realDist / distNorm;
    const minDist = boundR + ball.r;
    if (realDist < minDist) {
      return { nx: dx / realDist, ny: dy / realDist, minDist, cx, cy };
    }
    return null;
  },

  checkCapsuleHit(ball, ax, ay, bx, by, cr) {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = ball.x - ax;
    const apy = ball.y - ay;
    const abLenSq = abx * abx + aby * aby;
    if (abLenSq < 0.001) return null;
    let t = (apx * abx + apy * aby) / abLenSq;
    t = Math.max(0, Math.min(1, t));
    const qx = ax + t * abx;
    const qy = ay + t * aby;
    const dx = ball.x - qx;
    const dy = ball.y - qy;
    const dist = Math.hypot(dx, dy);
    const minDist = ball.r + cr;
    if (dist < minDist) {
      const len = Math.sqrt(abLenSq);
      const nx = dist > 0.0001 ? (dx / dist) : (-aby / len);
      const ny = dist > 0.0001 ? (dy / dist) : (abx / len);
      return { qx, qy, nx, ny, dist, minDist, t, abx, aby, abLenSq };
    }
    return null;
  },

  _segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
    const rx = bx - ax;
    const ry = by - ay;
    const sx = dx - cx;
    const sy = dy - cy;
    const denom = rx * sy - ry * sx;
    if (Math.abs(denom) < 1e-8) return false;
    const ux = cx - ax;
    const uy = cy - ay;
    const t = (ux * sy - uy * sx) / denom;
    const u = (ux * ry - uy * rx) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  },

  _resolveWallResponse(state, ball, w, cpX, cpY, cpT, nx, ny, effMinDist) {
    ball._crotchSpitActive = false;
    ball.x = cpX + nx * effMinDist;
    ball.y = cpY + ny * effMinDist;

    const isActiveSlingshotFace =
      w.isSlingshot &&
      cpT > 0.06 &&
      cpT < 0.94 &&
      (nx * w.kickDir.x + ny * w.kickDir.y) > 0.45;
    if (isActiveSlingshotFace) {
      const kickSpd = this.BALANCE.SLINGSHOT_KICK_SPEED;
      ball.vx = w.kickDir.x * kickSpd + (Math.random() - 0.5) * 1.5;
      ball.vy = w.kickDir.y * kickSpd - 2.0;
      if (window.sfx) window.sfx.slingshot();
      if (window.Systems) window.Systems.addScore(state, ScoreTable.common.SLINGSHOT, cpX, cpY, "SLINGSHOT");
      if (window.Systems) window.Systems.addFever(state, this.BALANCE.SLINGSHOT_FEVER);
      if (window.Particles) Particles.add(state, cpX, cpY, "#00f5d4", 12, 4.0);
    } else {
      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        const tx = -ny;
        const ty = nx;
        const vt = ball.vx * tx + ball.vy * ty;
        // 下部アウトレーン外周壁も通路壁と同様に横跳ねを抑える
        const isLowerOuterLane = (!ball.inShooterLane && cpY > 415 && (cpX < 55 || cpX > 342));
        let restN = 0.72;
        let tangFric = 0.97;
        if (w.isRamp) {
          restN = 0.04;
          tangFric = 0.992;
        } else if (w.isLane || w.isSlingshot || isLowerOuterLane) {
          restN = 0.14;
          tangFric = 0.988;
        }
        const newVn = -vn * restN;
        const newVt = vt * tangFric;
        ball.vx = nx * newVn + tx * newVt;
        ball.vy = ny * newVn + ty * newVt;
      }
    }
  },

  _resolveSolidTriangle(state, ball, tri, prevX, prevY, effMinDist) {
    const edges = tri.edges;
    let allInside = true;
    let maxSignedDist = -Infinity;
    let insideEdge = null;

    let minDist = Infinity;
    let closestEdge = null;
    let closestCpX = 0;
    let closestCpY = 0;
    let closestCpT = 0;

    let sweptEdge = null;
    let sweptPrevDist = Infinity;

    const cpTmp = this._cpWall;
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const signedDist = (ball.x - e.x1) * e.nx + (ball.y - e.y1) * e.ny;
      if (signedDist > 0) {
        allInside = false;
      }
      if (signedDist > maxSignedDist) {
        maxSignedDist = signedDist;
        insideEdge = e;
      }

      const cp = this.closestPointOnSeg(ball.x, ball.y, e.x1, e.y1, e.x2, e.y2, cpTmp);
      const d = Math.hypot(ball.x - cp.x, ball.y - cp.y);
      if (d < minDist) {
        minDist = d;
        closestEdge = e;
        closestCpX = cp.x;
        closestCpY = cp.y;
        closestCpT = cp.t;
      }

      if (this._segmentsIntersect(prevX, prevY, ball.x, ball.y, e.x1, e.y1, e.x2, e.y2)) {
        const pCp = this.closestPointOnSeg(prevX, prevY, e.x1, e.y1, e.x2, e.y2, cpTmp);
        const pd = Math.hypot(prevX - pCp.x, prevY - pCp.y);
        if (pd < sweptPrevDist) {
          sweptPrevDist = pd;
          sweptEdge = e;
        }
      }
    }

    if (allInside && insideEdge) {
      // ボール中心が三角形の内部に入った場合、最も近い辺の外向き法線方向へ確実に押し出す
      const cp = this.closestPointOnSeg(ball.x, ball.y, insideEdge.x1, insideEdge.y1, insideEdge.x2, insideEdge.y2, cpTmp);
      this._resolveWallResponse(state, ball, insideEdge, cp.x, cp.y, cp.t, insideEdge.nx, insideEdge.ny, effMinDist);
      return;
    }

    if (sweptEdge) {
      // 1サブステップで辺を貫通した場合、進入前の辺の外向き法線側へ押し戻す
      const cp = this.closestPointOnSeg(ball.x, ball.y, sweptEdge.x1, sweptEdge.y1, sweptEdge.x2, sweptEdge.y2, cpTmp);
      this._resolveWallResponse(state, ball, sweptEdge, cp.x, cp.y, cp.t, sweptEdge.nx, sweptEdge.ny, effMinDist);
      return;
    }

    if (closestEdge && minDist < effMinDist) {
      let nx = closestEdge.nx;
      let ny = closestEdge.ny;
      if ((closestCpT <= 0.001 || closestCpT >= 0.999) && minDist > 0.0001) {
        const vnx = (ball.x - closestCpX) / minDist;
        const vny = (ball.y - closestCpY) / minDist;
        if (vnx * closestEdge.nx + vny * closestEdge.ny >= 0) {
          nx = vnx;
          ny = vny;
        }
      }
      this._resolveWallResponse(state, ball, closestEdge, closestCpX, closestCpY, closestCpT, nx, ny, effMinDist);
    }
  },

  // Enforce thick inward containment against the 6 convex outer perimeter planes
  enforceOuterBounds(state, ball, stepMoveOverride = null) {
    if (!ball || ball._onWireRamp || ball._inNavelTrap || ball._fusionStasis || (ball._seraphStasis && ball._seraphStasis.grazeDelay <= 0)) return;
    const stepMove = stepMoveOverride != null
      ? stepMoveOverride
      : (Math.hypot(ball.vx, ball.vy) * this.getTimeScale(state)) / this.BALANCE.SUBSTEPS;
    const archPad = ball.inShooterLane
      ? (2.6 + Math.min(0.9, stepMove * 0.25))
      : (3.8 + Math.min(3.2, stepMove * 0.60));
    const sidePad = ball.inShooterLane
      ? (2.5 + Math.min(0.5, stepMove * 0.15))
      : (2.8 + Math.min(2.2, stepMove * 0.45));

    const planes = this.OUTER_HULL_PLANES;
    let clampedAny = false;
    for (let pass = 0; pass < 3; pass++) {
      let anyHit = false;
      for (let pi = 0; pi < planes.length; pi++) {
        const p = planes[pi];
        const minDist = ball.r + (p.isUpperArch ? archPad : sidePad);
        const signedDist = (ball.x - p.x1) * p.nx + (ball.y - p.y1) * p.ny;
        if (signedDist < minDist) {
          anyHit = true;
          clampedAny = true;
          ball._crotchSpitActive = false;
          const push = minDist - signedDist;
          ball.x += p.nx * push;
          ball.y += p.ny * push;

          const vn = ball.vx * p.nx + ball.vy * p.ny;
          if (vn < 0) {
            const tx = -p.ny;
            const ty = p.nx;
            const vt = ball.vx * tx + ball.vy * ty;
            const isLowerOuterLane = (!p.isUpperArch && !ball.inShooterLane && ball.y > 415 && (ball.x < 55 || ball.x > 342));
            const restN = isLowerOuterLane ? 0.14 : 0.72;
            const tangFric = isLowerOuterLane ? 0.988 : 0.97;
            ball.vx = p.nx * (-vn * restN) + tx * (vt * tangFric);
            ball.vy = p.ny * (-vn * restN) + ty * (vt * tangFric);
          }
        }
      }
      if (!anyHit) break;
    }

    if (clampedAny) {
      const spd = Math.hypot(ball.vx, ball.vy);
      const maxSpd = this.getMaxBallSpeed(state);
      if (spd > maxSpd) {
        ball.vx = (ball.vx / spd) * maxSpd;
        ball.vy = (ball.vy / spd) * maxSpd;
      }
    }
  },

  // Substep ball physics iteration
  stepBallPhysics(state, ball, gravity, SUBSTEPS, s) {
    // Elevated 3D wireform ramp bypasses ground-level walls & flippers
    if (ball._onWireRamp || ball._inNavelTrap || ball._fusionStasis || (ball._seraphStasis && ball._seraphStasis.grazeDelay <= 0)) return;

    if (ball._crotchSpitActive && ball.y < 340) {
      ball._crotchSpitActive = false;
    }

    const geom = this.TABLE_GEOM;
    const timeScale = this.getTimeScale(state);
    let prevX = ball.x;
    const prevY = ball.y;
    ball.vy += gravity * timeScale;
    ball.x += (ball.vx * timeScale) / SUBSTEPS;
    ball.y += (ball.vy * timeScale) / SUBSTEPS;

    // Shooter lane exit check, top re-entry & playfield-side divider guard
    if (ball.inShooterLane && ball.x < 378 && ball.y < 170) {
      ball.inShooterLane = false;
    }
    if (!ball.inShooterLane) {
      if (ball.x >= geom.SHOOTER_MIN_X && (prevY <= 182 || ball.y <= 182)) {
        // 上部ゲート開口（y <= 182）からシューターレーンへ戻った場合はレーン内扱いへ復帰
        ball.inShooterLane = true;
      } else if (ball.y > 182 && ball.x > geom.SHOOTER_MIN_X - ball.r - 1.5) {
        // 盤面中段から壁越しに押し込まれた場合は盤面側へ押し戻し、prevX も揃えて逆押し出しを防ぐ
        const safePlayX = geom.SHOOTER_MIN_X - ball.r - 2.6;
        if (ball.x > safePlayX && prevX < geom.SHOOTER_MIN_X + 12) {
          ball.x = safePlayX;
          if (prevX > safePlayX) prevX = safePlayX;
          ball.vx = -Math.abs(ball.vx) - 1.2;
        } else if (ball.x >= geom.SHOOTER_MIN_X) {
          ball.inShooterLane = true;
        }
      }
    }

    // 常時稼働の物理プランジャー・バネ判定（フラグ不要：バネ先端との実接触のみで支持＆打ち出し）
    if ((ball.inShooterLane || ball.x >= geom.SHOOTER_MIN_X) && ball.x >= geom.SHOOTER_MIN_X - 2 && ball.x <= geom.SHOOTER_MAX_X + 2) {
      ball.inShooterLane = true;
      const restTipY = geom.PLUNGER_REST_Y - 6;
      const tipY = (state.plunger.springY || geom.PLUNGER_REST_Y) - 6;

      // 1. リリース直後のバネ跳ね上がりストローク内にボールがある場合のみ物理打撃（空中多段ヒット不能）
      if (state.plunger.launchFrames > 0 && state.plunger.launchSpeed > 0 && (ball.y + ball.r) >= Math.min(tipY, restTipY) - 2.5) {
        const launchSpd = state.plunger.launchSpeed;
        const pwr = state.plunger.launchPower || 50;
        const pRatio = state.plunger.launchSkillRatio || 0;
        const pb = this.BALANCE;

        ball.x = geom.SHOOTER_CENTER_X;
        ball.y = Math.min(ball.y, restTipY - ball.r - 0.5);

        if (window.sfx) window.sfx.plungerLaunch(pwr);
        if (ball.vy > 1.8) {
          const counterBoost = ball.vy * 1.25;
          ball.vy = -(launchSpd + counterBoost);
          ball.vx = -0.3;
          if (window.sfx) window.sfx.metalBumper();
          if (window.Particles) {
            Particles.add(state, ball.x, ball.y, "#00f5d4", 16, 4.5);
            Particles.add(state, ball.x, ball.y, "#e6ff00", 12, 3.5);
            Particles.addPopup(state, ball.x - 15, ball.y - 15, "🚀SUPER COUNTER LAUNCH!", "#e6ff00", 1.2);
          }
          if (window.Systems) {
            Systems.addScore(state, ScoreTable.common.COUNTER_SHOT, ball.x, ball.y, "COUNTER SHOT!");
          }
        } else {
          ball.vy = -launchSpd;
          ball.vx = -0.3;
        }

        if (state.boss) state.boss.winkTimer = 35;
        const radarLv = (state.relics && state.relics.radar) || 0;
        const minSkill = Math.max(0.55, pb.SKILL_SHOT_MIN_RATIO - radarLv * 0.05);
        const maxSkill = Math.min(0.95, pb.SKILL_SHOT_MAX_RATIO + radarLv * 0.05);
        if (pRatio >= minSkill && pRatio <= maxSkill) {
          state.skillShotEligible = true;
        }

        state.plunger.launchSpeed = 0;
        state.plunger.launchFrames = 0;
        if (window.UI) UI.updateHUD(state);
      } else if (state.plunger.pulling && (prevY + ball.r) >= tipY - 3.0) {
        // 2. バネの上に載っている球は、バネを引くと一緒に下へ追従する（空中の球は追従せず重力落下）
        ball.x = geom.SHOOTER_CENTER_X;
        ball.y = tipY - ball.r;
        ball.vx = 0;
        ball.vy = 0;
      } else if ((ball.y + ball.r) >= tipY) {
        // 3. 常時ソリッドなバネ天面ストッパー（どんな状況でもバネより下へは貫通しない）
        ball.y = tipY - ball.r;
        ball.x = geom.SHOOTER_CENTER_X;
        ball.vx = 0;
        if (ball.vy > 0) {
          state.plunger.springVy = (state.plunger.springVy || 0) + Math.min(10, ball.vy * 0.55);
          if (ball.vy > 2.2) {
            ball.vy = -ball.vy * 0.25;
            if (window.sfx) window.sfx.metalBumper();
          } else {
            ball.vy = 0;
          }
        }
      }
    }

    // Velocity-scaled boundary thickness (tighter in narrow shooter lane to prevent wedging)
    const stepMove = (Math.hypot(ball.vx, ball.vy) * timeScale) / SUBSTEPS;
    const wallPad = ball.inShooterLane
      ? 2.5 + Math.min(0.6, stepMove * 0.15)
      : 2.5 + Math.min(2.0, stepMove * 0.45);
    const effMinDist = ball.r + wallPad;

    // Static Walls collision (with velocity-scaled thickness & swept crossing guard)
    const cpWall = this._cpWall;
    const walls = this.TABLE_WALLS;
    for (let wi = 0; wi < walls.length; wi++) {
      const w = walls[wi];
      if (w.isTriangleEdge || w.isOuterHull) continue;
      const cp = this.closestPointOnSeg(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2, cpWall);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const crossed = this._segmentsIntersect(prevX, prevY, ball.x, ball.y, w.x1, w.y1, w.x2, w.y2);

      if (crossed) {
        const prevCp = this.closestPointOnSeg(prevX, prevY, w.x1, w.y1, w.x2, w.y2);
        const pdx = prevX - prevCp.x;
        const pdy = prevY - prevCp.y;
        const pdist = Math.hypot(pdx, pdy);
        if (pdist > 0.0001) {
          this._resolveWallResponse(state, ball, w, cp.x, cp.y, cp.t, pdx / pdist, pdy / pdist, effMinDist);
        }
      } else if (dist < effMinDist && dist > 0.0001) {
        this._resolveWallResponse(state, ball, w, cp.x, cp.y, cp.t, dx / dist, dy / dist, effMinDist);
      }
    }

    // Solid Slingshot Triangles collision
    const triangles = this.SLINGSHOT_TRIANGLES;
    for (let ti = 0; ti < triangles.length; ti++) {
      this._resolveSolidTriangle(state, ball, triangles[ti], prevX, prevY, effMinDist);
    }

    // Outer perimeter thick half-space containment
    this.enforceOuterBounds(state, ball, stepMove);

    // Flippers collision (interpolated per substep with anti-tunneling sweep on active stroke)
    const flippers = this.getFlippers(state);
    const cpFlip = this._cpFlipper;
    const subT0 = s / SUBSTEPS;
    const subT1 = (s + 1) / SUBSTEPS;
    for (let idx = 0; idx < flippers.length; idx++) {
      const f = flippers[idx];
      const st = this.flipperState[idx];
      const omega = (st.angle - st.prevAngle) * 60;
      const strikeSign = f.isInverted ? -1 : 1;
      const isActiveStroke = f.isLeft ? (omega * strikeSign < -0.15) : (omega * strikeSign > 0.15);

      const subPrevAngle = st.prevAngle + (st.angle - st.prevAngle) * subT0;
      const subCurAngle = st.prevAngle + (st.angle - st.prevAngle) * subT1;
      const tipX = f.px + Math.cos(subCurAngle) * f.len;
      const tipY = f.py + Math.sin(subCurAngle) * f.len;
      const cp = this.closestPointOnSeg(ball.x, ball.y, f.px, f.py, tipX, tipY, cpFlip);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + 5.0;

      // Upper-face & strike-face unit normals at subCurAngle
      const upNx = f.isLeft ? Math.sin(subCurAngle) : -Math.sin(subCurAngle);
      const upNy = f.isLeft ? -Math.cos(subCurAngle) : Math.cos(subCurAngle);
      const strikeNx = upNx * strikeSign;
      const strikeNy = upNy * strikeSign;

      // Swept crossing check on active stroke (prevents tunneling on fast snap)
      let sweptHit = false;
      if (isActiveStroke) {
        const prevUpNx = f.isLeft ? Math.sin(subPrevAngle) : -Math.sin(subPrevAngle);
        const prevUpNy = f.isLeft ? -Math.cos(subPrevAngle) : Math.cos(subPrevAngle);
        const prevStrikeNx = prevUpNx * strikeSign;
        const prevStrikeNy = prevUpNy * strikeSign;
        const prevTipX = f.px + Math.cos(subPrevAngle) * f.len;
        const prevTipY = f.py + Math.sin(subPrevAngle) * f.len;
        const prevCp = this.closestPointOnSeg(ball.x, ball.y, f.px, f.py, prevTipX, prevTipY);
        const prevSignedDist = (ball.x - prevCp.x) * prevStrikeNx + (ball.y - prevCp.y) * prevStrikeNy;
        const curSignedDist = dx * strikeNx + dy * strikeNy;
        const along = (ball.x - f.px) * Math.cos(subCurAngle) + (ball.y - f.py) * Math.sin(subCurAngle);
        if (along >= -ball.r * 0.5 && along <= f.len + ball.r * 0.6 &&
            prevSignedDist >= -minDist * 0.45 && curSignedDist < minDist) {
          sweptHit = true;
        }
      }

      if ((dist < minDist && dist > 0.0001) || sweptHit) {
        st.swingHit = true;
        this.flipperState[f.isLeft ? 0 : 1].swingHit = true;
        ball._crotchSpitActive = false;
        let nx, ny;
        if (sweptHit && (dx * strikeNx + dy * strikeNy < 0 || dist >= minDist)) {
          nx = strikeNx;
          ny = strikeNy;
        } else {
          nx = dx / dist;
          ny = dy / dist;
        }
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        const rArm = Math.hypot(cp.x - f.px, cp.y - f.py);
        const vxSurface = -Math.sin(subCurAngle) * omega * (rArm / 50);
        const vySurface =  Math.cos(subCurAngle) * omega * (rArm / 50);

        const vRelX = ball.vx - vxSurface;
        const vRelY = ball.vy - vySurface;
        const dot = vRelX * nx + vRelY * ny;

        if (dot < 0 || sweptHit) {
          if (isActiveStroke) {
            const powerScale = this.getPinMobility(state, f.isLeft);
            const effDot = Math.min(dot, -2.0 * powerScale);
            const rest = 0.25 + 0.40 * powerScale;
            ball.vx = (vRelX - (1 + rest) * effDot * nx) + vxSurface;
            ball.vy = (vRelY - (1 + rest) * effDot * ny) + vySurface;
            const springStep = (window.ScoreTable && ScoreTable.multiplier.SPRING_ADD_POWER) || 0.15;
            const springMult = (1 + ((state.relics && state.relics.spring) || 0) * springStep);
            const magnetReleaseBoost = (state.magnetActive && (ball._magnetHeld || 0) > 0) ? 1.10 : 1.0;
            ball._magnetHeld = 0;

            if (f.isInverted) {
              if ((nx * strikeNx + ny * strikeNy) > 0.25 || sweptHit) {
                const slamBoost = Math.min(13.5, (5.8 + Math.abs(omega) * 0.14 + (rArm / f.len) * 5.2) * springMult) * powerScale;
                ball.vy = Math.abs(ball.vy) * (0.15 + 0.25 * powerScale) + slamBoost;
                ball.vx += nx * 3.8 * springMult * powerScale;
              }
            } else {
              const rawBoost = Math.min(18.5, (7.5 + Math.abs(omega) * 0.18 + (rArm / f.len) * 7.0) * springMult * magnetReleaseBoost);
              const flipBoost = rawBoost * powerScale;
              ball.vy = -Math.abs(ball.vy) * (0.15 + 0.30 * powerScale) - flipBoost;
              ball.vx += nx * 4.2 * springMult * magnetReleaseBoost * powerScale;
            }

            if (state.relics && state.relics.kasumi_chakra > 0 && powerScale >= 0.5) {
              ball._chakraTimer = 150;
            }
            if (!(ball._flipHitGrace > 0)) {
              ball._flipHitGrace = 16;
              if (state.relics && state.relics.kasumi_chakra > 0 && powerScale >= 0.5 && window.Particles) {
                Particles.add(state, cp.x, cp.y, "#ff66cc", 6, 3.2);
              }
              if (state.relics && state.relics.celty_fission > 0 && powerScale >= 0.5 && (rArm / f.len) > 0.72) {
                state._fissionHitCount = (state._fissionHitCount || 0) + 3;
              }
              if (window.sfx) window.sfx.flip();
              const fxColor = f.isSubFlipper ? "#e6ff00" : "#ff1493";
              const fxLabel = f.isSubFlipper ? (f.isInverted ? "WING SLAM!" : "WING FLIP") : "FLIP";
              Particles.add(state, cp.x, cp.y, fxColor, f.isSubFlipper ? 14 : 10, (f.isSubFlipper ? 5.2 : 4.5) * Math.max(0.45, powerScale));
              if (f.isSubFlipper && powerScale >= 0.5 && state.shockwaves) {
                state.shockwaves.push({ x: cp.x, y: cp.y, r: 5, maxR: 28, speed: 3.4, color: "#00f5e8", lineWidth: 2.2, alpha: 0.9 });
              }
              if (window.Systems) window.Systems.addScore(state, ScoreTable.common.FLIPPER_HIT, cp.x, cp.y, fxLabel, { fromDeckEffect: true });
            }
          } else {
            const rev = (state.flipperReverseTimer || 0) > 0;
            const heldUp = rev
              ? (f.isLeft ? state.rightFlipperDown : state.leftFlipperDown)
              : (f.isLeft ? state.leftFlipperDown : state.rightFlipperDown);
            const isPinnedSide = ((f.isLeft ? state.flipperPinL : state.flipperPinR) || 0) > 0;
            if (state.magnetActive && heldUp && !f.isSubFlipper && !isPinnedSide) {
              // Magnet Catch: 磁力でフリッパー上に吸着保持し精密狙い撃ちを可能にする
              const mRank = state.magnetRank || 1;
              const tx = -ny;
              const ty = nx;
              const vt = vRelX * tx + vRelY * ty;
              const dampTang = mRank >= 2 ? 0.55 : 0.78;
              const dirX = Math.cos(subCurAngle);
              const dirY = Math.sin(subCurAngle);
              const cradlePull = (0.55 - cp.t) * (mRank >= 2 ? 0.55 : 0.32);
              ball.vx = tx * (vt * dampTang) + vxSurface + dirX * cradlePull;
              ball.vy = ty * (vt * dampTang) + vySurface + dirY * cradlePull;
              ball._magnetHeld = 6;
            } else {
              // 静止中・戻し中のパドル（反転パドルは上向き傾きのためやや強めに弾いて角詰まりを防ぐ）
              const tx = -ny;
              const ty = nx;
              const vt = vRelX * tx + vRelY * ty;
              const restPassive = f.isInverted ? 0.52 : (Math.abs(dot) < 4.5 ? 0.08 : 0.26);
              const newVn = -dot * restPassive;
              const newVt = vt * 0.988;
              ball.vx = nx * newVn + tx * newVt + vxSurface;
              ball.vy = ny * newVn + ty * newVt + vySurface;
              if (f.isInverted && cp.t < 0.28 && Math.abs(ball.vx) < 1.5 && ny < 0) {
                ball.vx += (f.isLeft ? 2.4 : -2.4);
              }
            }
          }
        }
      }
    }

    // Permanent Installed Defenses (Center Post: 全サブステップで判定し5面真下排出も確実にガード！)
    if (state.perm.centerPost > 0 && state.perm.centerPostHP > 0) {
      const postR = 7 + state.perm.centerPost * 3.5;
      const px = geom.CENTER_POST_X;
      const py = geom.CENTER_POST_Y;
      const dx = ball.x - px;
      const dy = ball.y - py;
      const dist = Math.hypot(dx, dy);
      if (dist < ball.r + postR) {
        let nx = dist > 0.001 ? (dx / dist) : 0;
        const ny = dist > 0.001 ? (dy / dist) : -1;
        // 真上からど真ん中に落ちてきた球（5面真下排出など）が垂直ループしないよう左右パドル側へ逃がす
        if (Math.abs(nx) < 0.28) {
          nx = (Math.random() < 0.5 ? -1 : 1) * 0.42;
        }
        const nLen = Math.hypot(nx, ny) || 1;
        nx /= nLen;
        const effNy = ny / nLen;

        ball._crotchSpitActive = false;
        ball.x = px + nx * (ball.r + postR + 2);
        ball.y = py + effNy * (ball.r + postR + 2);
        ball.vx = nx * 9.2;
        ball.vy = -Math.max(10.5, Math.abs(effNy * 9.5) + 2.8);

        if (!(ball._postGrace > 0)) {
          ball._postGrace = 10;
          state.perm.centerPostHP--;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, px, py, "#00f5d4", 12, 3.8);
          if (state.perm.centerPostHP === 0) {
            Particles.addPopup(state, px, py - 15, "GUARD BROKEN!", "#ff1493", 1.1);
            if (window.sfx) window.sfx.armorBreak();
          } else {
            Particles.addPopup(state, px, py - 15, t("physics.centerPostSave", { hp: state.perm.centerPostHP }), "#00f5d4", 0.95);
          }
          if (window.UI) UI.updateHUD(state);
        }
      }
    }

    // Kickbacks (In the Outlanes)
    if (s === 0) {
      const kickbacks = this.KICKBACK_DEFS;
      for (let ki = 0; ki < kickbacks.length; ki++) {
        const kb = kickbacks[ki];
        if (state.perm[kb.permKey] > 0 && state.perm[kb.chargeKey] > 0 && (!kb.checkLane || !ball.inShooterLane) &&
            ball.x >= kb.minX && ball.x <= kb.maxX && ball.y >= 540 && ball.y <= 585 && ball.vy > 0) {
          ball.vy = -15.2;
          ball.vx = kb.vx;
          state.perm[kb.chargeKey] = 0;
          if (window.sfx) window.sfx.burstTrigger();
          Particles.add(state, kb.fxX, 560, "#00f5d4", 18, 5.0);
          Particles.add(state, kb.fxX, 560, "#e6ff00", 12, 4.0);
          if (window.Systems) window.Systems.addScore(state, ScoreTable.common.KICKBACK_SAVE, kb.fxX, 540, kb.label, { fromDeckEffect: true });
          if (window.UI) UI.showCutin(t(kb.cutinKey), 90);
        }
      }

      if (!ball.inShooterLane) {
        // Magnet Drain Magnetic Assist (Rank 2+)
        if (state.magnetActive && (state.magnetRank || 0) >= 2 && ball.vy > 0 &&
            ball.y > 545 && ball.y < 632 && Math.abs(ball.x - 198) < (42 + state.magnetRank * 14)) {
          ball.vy -= 0.14 * state.magnetRank;
          ball.vx += (ball.x < 198 ? -0.18 : 0.18);
        }

        // Lilith Signature Relic: Inverted Gravity Cushion (beginner clear-focused drain brake; never bounces upward on its own)
        if (state.relics && state.relics.lilith_gravity > 0 && ball.vy > 0) {
          const dxG = ball.x - 198;
          const dGrav = Math.hypot(dxG, ball.y - 610);
          if (dGrav < 46) {
            const falloff = 0.35 + 0.65 * (1 - dGrav / 46);
            const floorVy = Math.min(ball.vy, 1.15);
            ball.vy = Math.max(floorVy, ball.vy * (1 - 0.045 * falloff) - 0.14 * falloff);
            if (Math.abs(dxG) > 3) {
              ball.vx += (dxG < 0 ? -1 : 1) * (0.11 * falloff);
            }
            if (Math.random() < 0.16 && window.Particles) {
              Particles.add(state, ball.x, ball.y, Math.random() < 0.5 ? "#ff1493" : "#00f5d4", 1, 1.4);
            }
          }
        }

        // Noa Signature Relic: 1x/stage Emergency Outlane Warp Save
        if (state.relics && state.relics.noa_bit > 0 && (state._noaBitWarpCharges || 0) > 0 &&
            ball.vy > 0 && ball.y >= 585 && ball.y <= 638 && (ball.x < 68 || ball.x > 330)) {
          state._noaBitWarpCharges = 0;
          if (state.shockwaves) {
            state.shockwaves.push({ x: ball.x, y: ball.y, r: 6, maxR: 40, speed: 4.0, color: "#00f5d4", lineWidth: 2.6, alpha: 0.95 });
          }
          Particles.add(state, ball.x, ball.y, "#00f5d4", 18, 4.5);
          ball.x = 198;
          ball.y = 175;
          ball.vx = (Math.random() - 0.5) * 4;
          ball.vy = -4.5;
          if (ball.trail) ball.trail = [];
          if (state.shockwaves) {
            state.shockwaves.push({ x: 198, y: 175, r: 8, maxR: 48, speed: 4.5, color: "#e6ff00", lineWidth: 2.8, alpha: 0.95 });
          }
          Particles.add(state, 198, 175, "#e6ff00", 16, 4.5);
          if (window.sfx && window.sfx.burstTrigger) window.sfx.burstTrigger();
          if (window.Systems) {
            Systems.addScore(state, ScoreTable.common.AEGIS_WARP_SAVE, 198, 175, "🛡️AEGIS WARP!", { fromDeckEffect: true });
          }
          if (window.UI) UI.showCutin(t("physics.aegisWarpCutin"), 110);
        }
      }
    }

    // Final outer containment after flippers, center post, and lane assists
    this.enforceOuterBounds(state, ball, stepMove);

    // Velocity clamp
    const spd = Math.hypot(ball.vx, ball.vy);
    const maxSpd = this.getMaxBallSpeed(state);
    if (spd > maxSpd) {
      ball.vx = (ball.vx / spd) * maxSpd;
      ball.vy = (ball.vy / spd) * maxSpd;
    }
  }
};

// =========================================================================
// PINBALL ENGINE - PHYSICS & COLLISION SYSTEM
// =========================================================================

window.Physics = {
  // 全テーブル共通の物理・反発・スコア定数（調整時の単一参照先）
  BALANCE: {
    GRAVITY: 0.118,
    SUBSTEPS: 6,
    MAX_BALL_SPEED: 13.2,
    PLUNGER_BASE_SPEED: 1.4,
    PLUNGER_MAX_ADD_SPEED: 16.2,
    SKILL_SHOT_MIN_RATIO: 0.70,
    SKILL_SHOT_MAX_RATIO: 0.86,
    NUDGE_IMPULSE: 6.2,
    STUCK_REMIND_FRAMES: 85,
    STUCK_KICK_FRAMES: 360,
    SLINGSHOT_KICK_SPEED: 12.5,
    SLINGSHOT_SCORE: 200,
    SLINGSHOT_FEVER: 2,
    FLIPPER_HIT_SCORE: 50,
    FLIPPER_WHIFF_PENALTY: 100,
    NUDGE_PENALTY: 2000,
    KICKBACK_SAVE_SCORE: 3000
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
    { x1: 16,  y1: 635, x2: 16,  y2: 95 },
    { x1: 16,  y1: 95,  x2: 65,  y2: 32 },
    { x1: 65,  y1: 32,  x2: 210, y2: 16 },
    { x1: 210, y1: 16,  x2: 355, y2: 32 },
    { x1: 355, y1: 32,  x2: 404, y2: 95 },
    { x1: 404, y1: 95,  x2: 404, y2: 635 },

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

    // Slingshot Inner Walls (back/bottom faces form the inner wall of the inlane passage)
    { x1: 84,  y1: 450, x2: 84,  y2: 535, isLane: true },
    { x1: 84,  y1: 450, x2: 106, y2: 565, isSlingshot: true, kickDir: { x: 0.98, y: -0.19 } },
    { x1: 84,  y1: 535, x2: 106, y2: 565, isLane: true },

    { x1: 312, y1: 450, x2: 312, y2: 535, isLane: true },
    { x1: 312, y1: 450, x2: 290, y2: 565, isSlingshot: true, kickDir: { x: -0.98, y: -0.19 } },
    { x1: 312, y1: 535, x2: 290, y2: 565, isLane: true },

    // Outlane Drain Slopes
    { x1: 16,  y1: 590, x2: 86,  y2: 648, isRamp: true },
    { x1: 380, y1: 590, x2: 310, y2: 648, isRamp: true }
  ],

  flipperState: [
    { angle: 0.44, prevAngle: 0.44 },
    { angle: Math.PI - 0.44, prevAngle: Math.PI - 0.44 }
  ],

  _flippersCache: [
    { px: 110, py: 602, len: 56, restAngle: 0.44, activeAngle: -0.44, isLeft: true },
    { px: 286, py: 602, len: 56, restAngle: Math.PI - 0.44, activeAngle: Math.PI + 0.44, isLeft: false }
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
    const ext = (state.perm && state.perm.wideFlipper) ? state.perm.wideFlipper * 10 : 0;
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

      // Track active swing edge (for timed parry, whiff penalty) & 5-tap shuriken shake-off!
      const pinKey = f.isLeft ? "flipperPinL" : "flipperPinR";
      const isPinnedNow = (state[pinKey] || 0) > 0;
      if (pressed && !wasPressed) {
        st.justPressedTimer = 12;
        if (isPinnedNow) {
          st.swingActive = false;
          state[pinKey]--;
          st.pinShake = 8;
          const mx = f.px + Math.cos(st.angle) * (f.len * 0.55);
          const my = f.py + Math.sin(st.angle) * (f.len * 0.55);
          if (state[pinKey] === 0) {
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
          st.swingActive = true;
          st.swingHit = false;
        }
      } else {
        if ((st.justPressedTimer || 0) > 0) st.justPressedTimer--;
        if (!pressed && wasPressed) {
          if (st.swingActive && !st.swingHit && !isPinnedNow && window.Systems && Systems.deductScore) {
            Systems.deductScore(
              state,
              this.BALANCE.FLIPPER_WHIFF_PENALTY,
              f.px + (f.isLeft ? 22 : -22),
              f.py - 16,
              "WHIFF"
            );
          }
          st.swingActive = false;
        }
      }
      if ((st.pinShake || 0) > 0) st.pinShake--;

      // Clamp flipper lift to 1/3 range while pinned by a shuriken!
      const pinnedCount = f.isLeft ? (state.flipperPinL || 0) : (state.flipperPinR || 0);
      const effectiveActive = pinnedCount > 0
        ? (f.restAngle + (f.activeAngle - f.restAngle) * 0.33)
        : f.activeAngle;

      const target = pressed ? effectiveActive : f.restAngle;
      st.angle += (target - st.angle) * 0.44;
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
      if (b._onWireRamp) return;
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
      Systems.deductScore(state, this.BALANCE.NUDGE_PENALTY, 210, 555, "NUDGE");
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

  // Substep ball physics iteration
  stepBallPhysics(state, ball, gravity, SUBSTEPS, s) {
    // Elevated 3D wireform ramp bypasses ground-level walls & flippers
    if (ball._onWireRamp || ball._inNavelTrap || ball._fusionStasis) return;

    if (ball._crotchSpitActive && ball.y < 340) {
      ball._crotchSpitActive = false;
    }

    // Plunger resting lock
    const geom = this.TABLE_GEOM;
    if (ball.inShooterLane && state.plunger.waitingForLaunch) {
      ball.x = geom.SHOOTER_CENTER_X;
      const headY = (state.plunger.springY || geom.PLUNGER_REST_Y) - 6;
      ball.y = headY - ball.r;
      ball.vx = 0;
      ball.vy = 0;
      return;
    }

    ball.vy += gravity;
    ball.x += ball.vx / SUBSTEPS;
    ball.y += ball.vy / SUBSTEPS;

    // Shooter lane plunger spring catch & re-arm
    if (ball.inShooterLane && ball.x >= geom.SHOOTER_MIN_X && ball.x <= geom.SHOOTER_MAX_X) {
      const tipY = (state.plunger.springY || geom.PLUNGER_REST_Y) - 6;
      const contactDist = (ball.y + ball.r) - tipY;

      // 1. スプリング引き込み中にボールが落ちてきた場合：バネのヘッドに乗って一緒に引き下がる
      if (state.plunger.pulling && contactDist >= 0) {
        ball.y = tipY - ball.r;
        ball.vy = 0;
        ball.vx = 0;
      } else if (!state.plunger.waitingForLaunch && contactDist >= 0 && ball.vy > 0) {
        // 2. 落下中ボールのバネ接触
        ball.y = tipY - ball.r;
        state.plunger.springVy = (state.plunger.springVy || 0) + Math.min(12, ball.vy * 0.7);
        ball.vy = -ball.vy * 0.28;
        ball.vx = 0;

        if (Math.abs(ball.vy) > 0.6 && window.sfx) {
          window.sfx.metalBumper();
        }

        // 速度が収束したら通常待機状態にセット
        if (Math.abs(ball.vy) < 0.5 && ball.y >= 555) {
          state.plunger.waitingForLaunch = true;
          ball.vx = 0;
          ball.vy = 0;
          ball.x = 393;
          ball.y = tipY - ball.r;
          Particles.addPopup(state, 393, 545, "RE-ARMED!", "#00f5d4", 1.0);
          UI.updateHUD(state);
          return;
        }
      }
    }

    // Shooter lane exit check & one-way gate
    if (ball.inShooterLane && ball.x < 378 && ball.y < 170) {
      ball.inShooterLane = false;
    }
    if (!ball.inShooterLane && ball.x > 379 && ball.y > 175) {
      ball.x = 378;
      ball.vx = -Math.abs(ball.vx) - 1.5;
    }

    // Static Walls & Slingshots collision
    const cpWall = this._cpWall;
    const walls = this.TABLE_WALLS;
    for (let wi = 0; wi < walls.length; wi++) {
      const w = walls[wi];
      const cp = this.closestPointOnSeg(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2, cpWall);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + 2.5;
      if (dist < minDist && dist > 0.0001) {
        ball._crotchSpitActive = false;
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        const isActiveSlingshotFace =
          w.isSlingshot &&
          cp.t > 0.06 &&
          cp.t < 0.94 &&
          (nx * w.kickDir.x + ny * w.kickDir.y) > 0.45;
        if (isActiveSlingshotFace) {
          const kickSpd = this.BALANCE.SLINGSHOT_KICK_SPEED;
          ball.vx = w.kickDir.x * kickSpd + (Math.random() - 0.5) * 1.5;
          ball.vy = w.kickDir.y * kickSpd - 2.0;
          if (window.sfx) window.sfx.slingshot();
          if (window.Systems) window.Systems.addScore(state, this.BALANCE.SLINGSHOT_SCORE, cp.x, cp.y, "SLINGSHOT");
          if (window.Systems) window.Systems.addFever(state, this.BALANCE.SLINGSHOT_FEVER);
          Particles.add(state, cp.x, cp.y, "#00f5d4", 12, 4.0);
        } else {
          const vn = ball.vx * nx + ball.vy * ny;
          if (vn < 0) {
            const tx = -ny;
            const ty = nx;
            const vt = ball.vx * tx + ball.vy * ty;
            // 下部アウトレーン外周壁も通路壁と同様に横跳ねを抑える
            const isLowerOuterLane = (!ball.inShooterLane && cp.y > 415 && (cp.x < 55 || cp.x > 342));
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
      }
    }

    // Flippers collision (interpolated per substep with anti-tunneling sweep on upward swing)
    const flippers = this.getFlippers(state);
    const cpFlip = this._cpFlipper;
    const subT0 = s / SUBSTEPS;
    const subT1 = (s + 1) / SUBSTEPS;
    for (let idx = 0; idx < flippers.length; idx++) {
      const f = flippers[idx];
      const st = this.flipperState[idx];
      const omega = (st.angle - st.prevAngle) * 60;
      const isSwingingUp = f.isLeft ? (omega < -0.15) : (omega > 0.15);

      const subPrevAngle = st.prevAngle + (st.angle - st.prevAngle) * subT0;
      const subCurAngle = st.prevAngle + (st.angle - st.prevAngle) * subT1;
      const tipX = f.px + Math.cos(subCurAngle) * f.len;
      const tipY = f.py + Math.sin(subCurAngle) * f.len;
      const cp = this.closestPointOnSeg(ball.x, ball.y, f.px, f.py, tipX, tipY, cpFlip);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + 5.0;

      // Upper-face unit normal of the flipper at subCurAngle
      const upNx = f.isLeft ? Math.sin(subCurAngle) : -Math.sin(subCurAngle);
      const upNy = f.isLeft ? -Math.cos(subCurAngle) : Math.cos(subCurAngle);

      // Swept crossing check: if the upward-swinging flipper swept past a ball that was on/above
      // the upper face at subPrevAngle, force-resolve it to the upper face to prevent tunneling.
      let sweptHit = false;
      if (isSwingingUp) {
        const prevUpNx = f.isLeft ? Math.sin(subPrevAngle) : -Math.sin(subPrevAngle);
        const prevUpNy = f.isLeft ? -Math.cos(subPrevAngle) : Math.cos(subPrevAngle);
        const prevTipX = f.px + Math.cos(subPrevAngle) * f.len;
        const prevTipY = f.py + Math.sin(subPrevAngle) * f.len;
        const prevCp = this.closestPointOnSeg(ball.x, ball.y, f.px, f.py, prevTipX, prevTipY);
        const prevSignedDist = (ball.x - prevCp.x) * prevUpNx + (ball.y - prevCp.y) * prevUpNy;
        const curSignedDist = dx * upNx + dy * upNy;
        const along = (ball.x - f.px) * Math.cos(subCurAngle) + (ball.y - f.py) * Math.sin(subCurAngle);
        if (along >= -ball.r * 0.5 && along <= f.len + ball.r * 0.6 &&
            prevSignedDist >= -minDist * 0.45 && curSignedDist < minDist) {
          sweptHit = true;
        }
      }

      if ((dist < minDist && dist > 0.0001) || sweptHit) {
        st.swingHit = true;
        ball._crotchSpitActive = false;
        let nx, ny;
        if (sweptHit && (dx * upNx + dy * upNy < 0 || dist >= minDist)) {
          nx = upNx;
          ny = upNy;
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
          if (Math.abs(omega) > 0.15) {
            const effDot = Math.min(dot, -2.0);
            const rest = 0.65;
            ball.vx = (vRelX - (1 + rest) * effDot * nx) + vxSurface;
            ball.vy = (vRelY - (1 + rest) * effDot * ny) + vySurface;
            const springMult = (1 + ((state.relics && state.relics.spring) || 0) * 0.14);
            const flipBoost = Math.min(18.5, (7.5 + Math.abs(omega) * 0.18 + (rArm / f.len) * 7.0) * springMult);
            ball.vy = -Math.abs(ball.vy) * 0.45 - flipBoost;
            ball.vx += nx * 4.2 * springMult;
            if (window.sfx) window.sfx.flip();
            Particles.add(state, cp.x, cp.y, "#ff1493", 10, 4.5);
            if (window.Systems) window.Systems.addScore(state, this.BALANCE.FLIPPER_HIT_SCORE, cp.x, cp.y, "FLIP");
          } else {
            // 静止中のパドル：通路から流れてきた球が跳ねずにピタッと乗って転がるよう法線反発を抑え、接線転がりを維持
            const tx = -ny;
            const ty = nx;
            const vt = vRelX * tx + vRelY * ty;
            const restPassive = Math.abs(dot) < 4.5 ? 0.08 : 0.26;
            const newVn = -dot * restPassive;
            const newVt = vt * 0.988;
            ball.vx = nx * newVn + tx * newVt + vxSurface;
            ball.vy = ny * newVn + ty * newVt + vySurface;
          }
        }
      }
    }

    // Permanent Installed Defenses (Center Post, Kickbacks)
    if (s === 0) {
      if (state.perm.centerPost > 0 && state.perm.centerPostHP > 0 && !ball._crotchSpitActive) {
        const postR = 7 + state.perm.centerPost * 3.5;
        const px = geom.CENTER_POST_X;
        const py = geom.CENTER_POST_Y;
        const dx = ball.x - px;
        const dy = ball.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < ball.r + postR && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = px + nx * (ball.r + postR + 2);
          ball.y = py + ny * (ball.r + postR + 2);
          ball.vx = nx * 8.5;
          ball.vy = -Math.abs(ny * 8.5) - 2.5;

          state.perm.centerPostHP--;
          if (window.sfx) window.sfx.metalBumper();
          Particles.add(state, px, py, "#00f5d4", 10, 3.5);
          if (state.perm.centerPostHP === 0) {
            Particles.addPopup(state, px, py - 15, "GUARD BROKEN!", "#ff1493", 1.1);
            if (window.sfx) window.sfx.armorBreak();
          } else {
            Particles.addPopup(state, px, py - 15, t("physics.centerPostSave", { hp: state.perm.centerPostHP }), "#00f5d4", 0.95);
          }
        }
      }

      // Kickbacks (In the Outlanes)
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
          if (window.Systems) window.Systems.addScore(state, this.BALANCE.KICKBACK_SAVE_SCORE, kb.fxX, 540, kb.label);
          if (window.UI) window.UI.showCutin(t(kb.cutinKey), 90);
        }
      }
    }

    // Velocity clamp
    const spd = Math.hypot(ball.vx, ball.vy);
    if (spd > this.BALANCE.MAX_BALL_SPEED) {
      ball.vx = (ball.vx / spd) * this.BALANCE.MAX_BALL_SPEED;
      ball.vy = (ball.vy / spd) * this.BALANCE.MAX_BALL_SPEED;
    }
  }
};

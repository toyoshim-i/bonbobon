// =========================================================================
// PINBALL ENGINE - PHYSICS & COLLISION SYSTEM
// =========================================================================

window.Physics = {
  TABLE_WALLS: [
    // Outer perimeter walls (Arc roof + straight sides)
    { x1: 16,  y1: 635, x2: 16,  y2: 95 },
    { x1: 16,  y1: 95,  x2: 65,  y2: 32 },
    { x1: 65,  y1: 32,  x2: 210, y2: 16 },
    { x1: 210, y1: 16,  x2: 355, y2: 32 },
    { x1: 355, y1: 32,  x2: 404, y2: 95 },
    { x1: 404, y1: 95,  x2: 404, y2: 635 },

    // Shooter lane inner wall (right side) & bottom wall
    { x1: 380, y1: 175, x2: 380, y2: 635 },
    { x1: 380, y1: 635, x2: 404, y2: 635 },

    // Mid playfield upper outer guide deflectors
    { x1: 16,  y1: 280, x2: 20,  y2: 360 },
    { x1: 380, y1: 280, x2: 376, y2: 360 },

    // Lane Dividers
    { x1: 50,  y1: 420, x2: 50,  y2: 558 },
    { x1: 50,  y1: 558, x2: 110, y2: 600 },

    { x1: 346, y1: 420, x2: 346, y2: 558 },
    { x1: 346, y1: 558, x2: 286, y2: 600 },

    // Slingshot Inner Walls
    { x1: 84,  y1: 450, x2: 84,  y2: 535 },
    { x1: 84,  y1: 450, x2: 106, y2: 565, isSlingshot: true, kickDir: { x: 0.98, y: -0.19 } },
    { x1: 84,  y1: 535, x2: 106, y2: 565 },

    { x1: 312, y1: 450, x2: 312, y2: 535 },
    { x1: 312, y1: 450, x2: 290, y2: 565, isSlingshot: true, kickDir: { x: -0.98, y: -0.19 } },
    { x1: 312, y1: 535, x2: 290, y2: 565 },

    // Outlane Drain Slopes
    { x1: 16,  y1: 590, x2: 86,  y2: 648 },
    { x1: 380, y1: 590, x2: 310, y2: 648 }
  ],

  flipperState: [
    { angle: 0.44, prevAngle: 0.44 },
    { angle: Math.PI - 0.44, prevAngle: Math.PI - 0.44 }
  ],

  closestPointOnSeg(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { x: x1, y: y1, t: 0 };
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + t * dx, y: y1 + t * dy, t };
  },

  getFlippers(state) {
    const ext = (state.perm && state.perm.wideFlipper) ? state.perm.wideFlipper * 10 : 0;
    const mainL = {
      px: 110, py: 602,
      len: 56 + ext,
      restAngle: 0.44,
      activeAngle: -0.44,
      isLeft: true
    };
    const mainR = {
      px: 286, py: 602,
      len: 56 + ext,
      restAngle: Math.PI - 0.44,
      activeAngle: Math.PI + 0.44,
      isLeft: false
    };
    return [mainL, mainR];
  },

  updateFlippers(state) {
    const flippers = this.getFlippers(state);
    flippers.forEach((f, idx) => {
      const st = this.flipperState[idx];
      st.prevAngle = st.angle;
      const pressed = f.isLeft ? state.leftFlipperDown : state.rightFlipperDown;
      const target = pressed ? f.activeAngle : f.restAngle;
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
      b.vx += nx * 6.2 * intensity;
      b.vy += ny * 6.2 * intensity;

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
    if (dist < minDist && dist > 0.0001) {
      return { qx, qy, nx: dx / dist, ny: dy / dist, minDist, t, abx, aby, abLenSq };
    }
    return null;
  },

  // Substep ball physics iteration
  stepBallPhysics(state, ball, gravity, SUBSTEPS, s) {
    // Plunger resting lock
    if (ball.inShooterLane && state.plunger.waitingForLaunch) {
      ball.x = 393;
      ball.y = 575 + (state.plunger.power / 100) * 28;
      ball.vx = 0;
      ball.vy = 0;
      return;
    }


    ball.vy += gravity;
    ball.x += ball.vx / SUBSTEPS;
    ball.y += ball.vy / SUBSTEPS;

    // Shooter lane exit check & one-way gate
    if (ball.inShooterLane && ball.x < 378 && ball.y < 170) {
      ball.inShooterLane = false;
    }
    if (!ball.inShooterLane && ball.x > 379 && ball.y > 175) {
      ball.x = 378;
      ball.vx = -Math.abs(ball.vx) - 1.5;
    }

    // Static Walls & Slingshots collision
    for (const w of this.TABLE_WALLS) {
      const cp = this.closestPointOnSeg(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + 2.5;
      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        if (w.isSlingshot) {
          const kickSpd = 12.5;
          ball.vx = w.kickDir.x * kickSpd + (Math.random() - 0.5) * 1.5;
          ball.vy = w.kickDir.y * kickSpd - 2.0;
          if (window.sfx) window.sfx.slingshot();
          if (window.Systems) window.Systems.addScore(state, 200, cp.x, cp.y, "SLINGSHOT");
          if (window.Systems) window.Systems.addFever(state, 2);
          Particles.add(state, cp.x, cp.y, "#00f5d4", 12, 4.0);
        } else {
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            ball.vx = (ball.vx - 2 * dot * nx) * 0.88;
            ball.vy = (ball.vy - 2 * dot * ny) * 0.88;
          }
        }
      }
    }

    // Flippers collision
    const flippers = this.getFlippers(state);
    flippers.forEach((f, idx) => {
      const st = this.flipperState[idx];
      const tipX = f.px + Math.cos(st.angle) * f.len;
      const tipY = f.py + Math.sin(st.angle) * f.len;
      const cp = this.closestPointOnSeg(ball.x, ball.y, f.px, f.py, tipX, tipY);
      const dx = ball.x - cp.x;
      const dy = ball.y - cp.y;
      const dist = Math.hypot(dx, dy);
      const minDist = ball.r + 5.0;

      if (dist < minDist && dist > 0.0001) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = cp.x + nx * minDist;
        ball.y = cp.y + ny * minDist;

        const omega = (st.angle - st.prevAngle) * 60;
        const rArm = Math.hypot(cp.x - f.px, cp.y - f.py);
        const vxSurface = -Math.sin(st.angle) * omega * (rArm / 50);
        const vySurface =  Math.cos(st.angle) * omega * (rArm / 50);

        const vRelX = ball.vx - vxSurface;
        const vRelY = ball.vy - vySurface;
        const dot = vRelX * nx + vRelY * ny;

        if (dot < 0) {
          const rest = 0.65;
          ball.vx = (vRelX - (1 + rest) * dot * nx) + vxSurface;
          ball.vy = (vRelY - (1 + rest) * dot * ny) + vySurface;

          if (Math.abs(omega) > 0.15) {
            const flipBoost = Math.min(16.5, 7.5 + Math.abs(omega) * 0.18 + (rArm / f.len) * 7.0);
            ball.vy = -Math.abs(ball.vy) * 0.45 - flipBoost;
            ball.vx += nx * 4.2;
            if (window.sfx) window.sfx.flip();
            Particles.add(state, cp.x, cp.y, "#ff1493", 10, 4.5);
            if (window.Systems) window.Systems.addScore(state, 50, cp.x, cp.y, "FLIP");
          } else {
            ball.vx *= 0.88;
            ball.vy *= 0.88;
          }
        }
      }
    });

    // Permanent Installed Defenses (Center Post, Kickbacks)
    if (s === 0) {
      if (state.perm.centerPost > 0 && state.perm.centerPostHP > 0) {
        const postR = 7 + state.perm.centerPost * 3.5;
        const px = 198;
        const py = 614;
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
            Particles.addPopup(state, px, py - 15, `SAVE! 残りHP:${state.perm.centerPostHP}`, "#00f5d4", 0.95);
          }
        }
      }

      // Kickbacks (In the Outlanes)
      if (state.perm.kickbackL > 0 && state.perm.kickbackL_charges > 0 && ball.x >= 14 && ball.x <= 52 && ball.y >= 540 && ball.y <= 585 && ball.vy > 0) {
        ball.vy = -15.2;
        ball.vx = 4.2;
        state.perm.kickbackL_charges = 0;
        if (window.sfx) window.sfx.burstTrigger();
        Particles.add(state, 33, 560, "#00f5d4", 18, 5.0);
        Particles.add(state, 33, 560, "#e6ff00", 12, 4.0);
        if (window.Systems) window.Systems.addScore(state, 3000, 33, 540, "⚡L-LASER SAVE!");
        if (window.UI) window.UI.showCutin("🛡️【LEFT KICKBACK SAVE!】<br>左アウトレーンから緊急レーザー射出！", 90);
      }
      if (state.perm.kickbackR > 0 && state.perm.kickbackR_charges > 0 && !ball.inShooterLane && ball.x >= 344 && ball.x <= 382 && ball.y >= 540 && ball.y <= 585 && ball.vy > 0) {
        ball.vy = -15.2;
        ball.vx = -4.2;
        state.perm.kickbackR_charges = 0;
        if (window.sfx) window.sfx.burstTrigger();
        Particles.add(state, 363, 560, "#00f5d4", 18, 5.0);
        Particles.add(state, 363, 560, "#e6ff00", 12, 4.0);
        if (window.Systems) window.Systems.addScore(state, 3000, 363, 540, "⚡R-LASER SAVE!");
        if (window.UI) window.UI.showCutin("🛡️【RIGHT KICKBACK SAVE!】<br>右アウトレーンから緊急レーザー射出！", 90);
      }
    }

    // Velocity clamp
    const spd = Math.hypot(ball.vx, ball.vy);
    if (spd > 13.2) {
      ball.vx = (ball.vx / spd) * 13.2;
      ball.vy = (ball.vy / spd) * 13.2;
    }
  }
};

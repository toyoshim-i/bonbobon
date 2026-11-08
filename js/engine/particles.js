// =========================================================================
// PINBALL ENGINE - PARTICLES & VISUAL FX SYSTEM
// =========================================================================

window.Particles = {
  add(state, x, y, color, count = 8, speed = 3.5) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = speed * (0.6 + Math.random() * 0.8);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        color,
        life: 20 + Math.floor(Math.random() * 15)
      });
    }
  },

  addPopup(state, x, y, text, color = "#e6ff00", scale = 1.0) {
    state.popups.push({
      x,
      y,
      text,
      color,
      scale,
      life: 52
    });
  },

  spawnHeart(state, x, y, isSmall = false) {
    state.hearts.push({
      x: x + (Math.random() - 0.5) * (isSmall ? 10 : 24),
      y: y + (Math.random() - 0.5) * (isSmall ? 8 : 16),
      vx: (Math.random() - 0.5) * (isSmall ? 0.9 : 2.2),
      vy: isSmall ? (-0.9 - Math.random() * 0.9) : (-1.8 - Math.random() * 2.2),
      size: isSmall ? (4.5 + Math.random() * 3.5) : (10 + Math.random() * 8),
      scale: 0.2,
      maxScale: isSmall ? 0.7 : (1.0 + Math.random() * 0.4),
      life: isSmall ? (30 + Math.floor(Math.random() * 18)) : (50 + Math.floor(Math.random() * 25)),
      maxLife: isSmall ? 48 : 75,
      alpha: 1.0,
      color: isSmall ? "#ff69b4" : "#ff1493"
    });
  },

  triggerArmorBreakEffect(state, type, cx, cy) {
    // 1. Violent Screen Shake & Hit-stop Impact
    state.nudgeOffset.x = (Math.random() - 0.5) * 22;
    state.nudgeOffset.y = (Math.random() - 0.5) * 18;
    state.hitStopTimer = 4;

    // 2. Optical Shockwave Ring
    state.shockwaves.push({
      x: cx,
      y: cy,
      r: 8,
      maxR: type === "chest" ? 95 : 68,
      speed: type === "chest" ? 5.2 : 4.0,
      color: type === "chest" ? "#ff1493" : "#00f5d4",
      lineWidth: 3.5,
      alpha: 1.0
    });

    // 3. High-pressure steam purge exhaust
    for (let i = 0; i < 10; i++) {
      const ang = (Math.PI * 2 * i) / 10 + (Math.random() - 0.5) * 0.4;
      const spd = 2.5 + Math.random() * 3.5;
      state.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        color: "#ffffff",
        life: 28 + Math.floor(Math.random() * 18)
      });
    }

    // 4. Chunky Armor Plate Shards
    const shardCount = type === "chest" ? 16 : 10;
    for (let i = 0; i < shardCount; i++) {
      const angle = Math.atan2(cy - 300, cx - 198) + (Math.random() - 0.5) * 1.8;
      const spd = 4.2 + Math.random() * 6.8;
      state.armorDebris.push({
        x: cx + (Math.random() - 0.5) * 24,
        y: cy + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - (2.5 + Math.random() * 3.0),
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.38,
        w: 12 + Math.random() * 14,
        h: 8 + Math.random() * 10,
        color: Math.random() > 0.35 ? "#ff1493" : "#e6ff00",
        stroke: "#ffffff",
        life: 65 + Math.floor(Math.random() * 30),
        maxLife: 95
      });
    }

    // 5. Heavy Sparks & Audio
    if (window.sfx) window.sfx.armorBreak();
    this.add(state, cx, cy, "#ff1493", 26, 7.5);
    this.add(state, cx, cy, "#e6ff00", 22, 6.0);
  },

  shatterTableFrame(walls) {
    const shards = [];
    walls.forEach(w => {
      const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
      const count = Math.max(3, Math.floor(len / 18));
      const baseAngle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);

      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const px = w.x1 + (w.x2 - w.x1) * t;
        const py = w.y1 + (w.y2 - w.y1) * t;
        const blastAngle = Math.atan2(py - 307, px - 198) + (Math.random() - 0.5) * 0.5;
        const blastSpeed = 4.5 + Math.random() * 7.5;
        shards.push({
          x: px,
          y: py,
          vx: Math.cos(blastAngle) * blastSpeed,
          vy: Math.sin(blastAngle) * blastSpeed - 2.0,
          angle: baseAngle,
          vAngle: (Math.random() - 0.5) * 0.4,
          len: len / count,
          color: w.isSlingshot ? "#00f5d4" : "#ff1493",
          life: 80 + Math.floor(Math.random() * 40),
          maxLife: 120
        });
      }
    });
    return shards;
  },

  update(state) {
    // Armor plate shards physics
    for (let i = state.armorDebris.length - 1; i >= 0; i--) {
      const d = state.armorDebris[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.22;
      d.vx *= 0.985;
      d.angle += d.vAngle;
      d.life--;
      if (d.life <= 0) state.armorDebris.splice(i, 1);
    }

    // Optical shockwave rings
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
      const sw = state.shockwaves[i];
      sw.r += sw.speed;
      sw.alpha = Math.max(0, 1.0 - sw.r / sw.maxR);
      if (sw.alpha <= 0 || sw.r >= sw.maxR) state.shockwaves.splice(i, 1);
    }

    // Floating Hearts
    for (let i = state.hearts.length - 1; i >= 0; i--) {
      const h = state.hearts[i];
      h.x += h.vx;
      h.y += h.vy;
      h.vx *= 0.96;
      h.vy *= 0.97;
      h.scale = Math.min(h.maxScale, h.scale + 0.08);
      h.life--;
      h.alpha = Math.min(1.0, h.life / (h.maxLife * 0.45));
      if (h.life <= 0) state.hearts.splice(i, 1);
    }

    // Floating Particles & Popups
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.life <= 0) state.particles.splice(i, 1);
    }
    for (let i = state.popups.length - 1; i >= 0; i--) {
      const pop = state.popups[i];
      pop.y -= 0.65;
      pop.life--;
      if (pop.life <= 0) state.popups.splice(i, 1);
    }
  },

  drawCyberTargetGuide(ctx, animTick, x, y, r, color, flash, rot, label, subInfo) {
    ctx.save();
    ctx.translate(x, y);

    const isHit = flash > 0;
    const pulseFactor = 0.16;
    const baseScale = 1.0 + pulseFactor * Math.sin(animTick * 0.08);

    // 1. Afterimage Outer Ring (Trail 2)
    const scale2 = 1.0 + pulseFactor * 1.35 * Math.sin(animTick * 0.08 - 0.7);
    const r2 = r * scale2;
    ctx.save();
    ctx.rotate((rot || 0) * 0.55);
    ctx.strokeStyle = color;
    ctx.globalAlpha = isHit ? 0.5 : 0.20;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, r2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 2. Afterimage Mid Ring (Trail 1)
    const scale1 = 1.0 + pulseFactor * 1.15 * Math.sin(animTick * 0.08 - 0.35);
    const r1 = r * scale1;
    ctx.save();
    ctx.rotate((rot || 0) * 0.85);
    ctx.strokeStyle = color;
    ctx.globalAlpha = isHit ? 0.75 : 0.35;
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, r1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Main Rotating Cyber Reticle Brackets
    ctx.save();
    ctx.rotate(rot || 0);
    const rMain = r * baseScale;

    // Draw full circular ring
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.0;
    ctx.globalAlpha = isHit ? 0.7 : 0.35;
    ctx.beginPath();
    ctx.arc(0, 0, rMain, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = isHit ? "#ffffff" : color;
    ctx.lineWidth = isHit ? 3.2 : 2.0;
    ctx.globalAlpha = isHit ? 1.0 : 0.85;

    // 4 circular corner brackets [ ]
    const bracketArc = 0.42;
    for (let i = 0; i < 4; i++) {
      const startAngle = i * (Math.PI / 2) - bracketArc / 2;
      const endAngle = i * (Math.PI / 2) + bracketArc / 2;
      ctx.beginPath();
      ctx.arc(0, 0, rMain, startAngle, endAngle);
      ctx.stroke();
    }

    // Crosshair ticks
    ctx.strokeStyle = isHit ? "#e6ff00" : color;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) {
      const a = i * (Math.PI / 2);
      const cos = Math.cos(a);
      const sin = Math.sin(a);
      ctx.beginPath();
      ctx.moveTo(cos * (rMain - 4), sin * (rMain - 4));
      ctx.lineTo(cos * (rMain + 4), sin * (rMain + 4));
      ctx.stroke();
    }
    ctx.restore();

    // 4. Hit Shockwave Ring
    if (isHit) {
      const waveR = r * (1.0 + (12 - flash) * 0.15);
      ctx.save();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = flash / 12;
      ctx.beginPath();
      ctx.arc(0, 0, waveR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.globalAlpha = (flash / 12) * 0.28;
      ctx.fill();
      ctx.restore();
    }

    // 5. Small Cyber Label & HP/Status HUD
    if (label && !isHit) {
      ctx.font = "bold 8px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.5;
      ctx.strokeText(label, 0, -rMain - 4);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.95;
      ctx.fillText(label, 0, -rMain - 4);
    }
    if (subInfo && !isHit) {
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center";
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2.0;
      ctx.strokeText(subInfo, 0, rMain + 10);
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.95;
      ctx.fillText(subInfo, 0, rMain + 10);
    }

    ctx.restore();
  },

  render(ctx, state) {
    // 1. Shockwaves
    state.shockwaves.forEach(sw => {
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = sw.lineWidth;
      ctx.globalAlpha = sw.alpha;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });

    // 2. Armor Debris
    state.armorDebris.forEach(d => {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.angle);
      ctx.fillStyle = d.color;
      ctx.strokeStyle = d.stroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-d.w / 2, -d.h / 2);
      ctx.lineTo(d.w / 2, -d.h / 2 + 2);
      ctx.lineTo(d.w / 2 - 2, d.h / 2);
      ctx.lineTo(-d.w / 2 + 3, d.h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-d.w / 4, -2, 3, 3);
      ctx.restore();
    });

    // 3. Floating Hearts
    state.hearts.forEach(h => {
      ctx.save();
      ctx.globalAlpha = h.alpha;
      ctx.translate(h.x, h.y);
      ctx.scale(h.scale, h.scale);
      ctx.fillStyle = h.color || "#ff1493";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = h.size < 8 ? 1.0 : 1.5;
      ctx.beginPath();
      const topCurveHeight = h.size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(-h.size / 2, -topCurveHeight, -h.size, topCurveHeight / 3, 0, h.size);
      ctx.bezierCurveTo(h.size, topCurveHeight / 3, h.size / 2, -topCurveHeight, 0, topCurveHeight);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    // 4. Particles & Popups
    state.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });

    state.popups.forEach(pop => {
      ctx.save();
      ctx.globalAlpha = Math.min(1, pop.life / 18);
      ctx.fillStyle = pop.color;
      ctx.font = `bold ${Math.round(11 * pop.scale)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    });
  }
};

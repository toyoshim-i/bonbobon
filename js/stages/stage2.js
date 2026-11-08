// =========================================================================
// STAGE 2: CELTY (疾風紫電セルティ)
// =========================================================================

window.Stage2 = {
  id: "stage2",
  name: "疾風紫電セルティ",
  bossName: "セルティ (CELTY)",

  assets: {
    armoredImg: new Image(),
    bareImg: new Image(),
    defeatCgImg: new Image(),
    facePatchImgs: {},
    loaded: false
  },

  initAssets() {
    this.assets.bareImg.src = "./assets/stage2/centerpiece.jpg";
    this.assets.armoredImg.src = "./assets/stage2/centerpiece.jpg";

    const faceData = window.STAGE2_FACE_PATCHES || {};
    Object.entries(faceData).forEach(([k, uri]) => {
      const im = new Image();
      im.src = uri;
      this.assets.facePatchImgs[k] = im;
    });

    let count = 0;
    const check = () => {
      count++;
      if (count >= 1) this.assets.loaded = true;
    };
    this.assets.bareImg.onload = check;
  },

  createBossState() {
    return {
      name: "セルティ",
      expression: "normal",
      expressionTimer: 0,
      blinkTimer: 100,
      winkTimer: 0,
      talkTimer: 0,
      blushGauge: 0,

      // 1. カチューシャのアンテナ先端（周期電撃バリア ＆ 通過ゲート）
      // 原画 768x1376 の (625, 125) に正確に配置
      antenna: {
        x: 312,
        y: 75,
        r: 18,
        timer: 0,
        cycle: 190,          // 190フレーム周期 (~3.1秒)
        activeDuration: 65,  // 放電時間
        warningDuration: 30, // 予兆警告時間
        flash: 0,
        isWarning: false,
        isActive: false
      },

      // 2. 左手奥のホログラム（ラスターグリッジ ＆ 間欠防衛レーザー砲）
      // 原画 768x1376 の (102, 389) に正確に配置
      hologram: {
        x: 64,
        y: 198,
        r: 26,
        glitchShift: 0,
        laserState: "idle",  // "idle" | "charge" | "fire"
        laserTimer: 0,
        cooldown: 200,       // 次の発射までの間隔
        beamAngle: Math.PI * 0.35, // 斜め下方向へ貫通発射
        beamLength: 300,
        flash: 0
      },

      // 3. バウンスポイント：肩（左肩＆右肩）
      // 左肩: 原画 (340, 573) -> キャンバス (177, 284)
      shoulderL: {
        x: 177,
        y: 284,
        r: 26,
        hp: 8,
        broken: false,
        flash: 0,
        rot: 0
      },
      // 右肩: 原画 (538, 564) -> キャンバス (271, 280)
      shoulderR: {
        x: 271,
        y: 280,
        r: 26,
        hp: 8,
        broken: false,
        flash: 0,
        rot: 0
      },

      // 4. バウンスポイント：肘（左肘＆右肘）
      // 左肘: 原画 (200, 835) -> キャンバス (111, 407)
      elbowL: {
        x: 111,
        y: 407,
        r: 20,
        flash: 0,
        rot: 0
      },
      // 右肘: 原画 (722, 776) -> キャンバス (358, 379)
      elbowR: {
        x: 358,
        y: 379,
        r: 20,
        flash: 0,
        rot: 0
      },

      // 5. 胸の先端（背中ジェット噴射トリガーセンサー）
      // 原画 (205, 680) -> キャンバス (113, 334)
      tipBust: {
        x: 113,
        y: 334,
        r: 16,
        hp: 6,
        flash: 0,
        rot: 0
      },

      // 6. 背中ジェット噴射ノズル
      // 原画 (507, 766) -> キャンバス (256, 375)
      jet: {
        x: 256,
        y: 375,
        r: 26,
        active: false,
        timer: 0
      },

      defeatTriggered: false
    };
  },

  update(state, engine) {
    if (!state.boss) return;

    // 1. 自然な瞬きと表情制御
    if (state.boss.blinkTimer > 0) {
      state.boss.blinkTimer--;
    } else {
      state.boss.blinkTimer = 140 + Math.floor(Math.random() * 110);
    }
    if (state.boss.winkTimer > 0) state.boss.winkTimer--;
    if (state.boss.talkTimer > 0) state.boss.talkTimer--;
    if (state.boss.expressionTimer > 0) {
      state.boss.expressionTimer--;
      if (state.boss.expressionTimer <= 0) {
        state.boss.expression = "normal";
      }
    }

    // 2. カチューシャのアンテナ先端の周期放電サイクル
    const ant = state.boss.antenna;
    if (ant) {
      ant.timer = (ant.timer + 1) % ant.cycle;
      if (ant.flash > 0) ant.flash--;

      const isWarning = ant.timer >= (ant.cycle - ant.activeDuration - ant.warningDuration) &&
                        ant.timer < (ant.cycle - ant.activeDuration);
      const isActive = ant.timer >= (ant.cycle - ant.activeDuration);

      ant.isWarning = isWarning;
      ant.isActive = isActive;

      if (isActive) {
        // 放電中：激しい電撃火花
        if (Math.random() < 0.65) {
          const arcAngle = Math.random() * Math.PI * 2;
          const arcR = ant.r * (0.8 + Math.random() * 0.7);
          state.particles.push({
            x: ant.x + Math.cos(arcAngle) * arcR,
            y: ant.y + Math.sin(arcAngle) * arcR,
            vx: (Math.random() - 0.5) * 3.5,
            vy: (Math.random() - 0.5) * 3.5,
            color: Math.random() < 0.5 ? "#00f5d4" : "#e6ff00",
            life: 10,
            scale: 1.2
          });
        }
      }
    }

    // 3. 左手奥ホログラムのラスターグリッジ ＆ レーザー発射
    const holo = state.boss.hologram;
    if (holo) {
      if (holo.flash > 0) holo.flash--;
      holo.glitchShift = (Math.random() < 0.3) ? (Math.random() - 0.5) * 12 : 0;

      if (holo.laserState === "idle") {
        if (holo.cooldown > 0) {
          holo.cooldown--;
        } else {
          holo.laserState = "charge";
          holo.laserTimer = 50; // チャージ予兆
          if (window.sfx && window.sfx.capsuleCatch) {
            window.sfx.capsuleCatch();
          }
        }
      } else if (holo.laserState === "charge") {
        holo.laserTimer--;

        // 照準角度を一番近いボールに向けて微調整
        if (state.balls.length > 0) {
          const targetBall = state.balls[0];
          const aimAngle = Math.atan2(targetBall.y - holo.y, targetBall.x - holo.x);
          const clamped = Math.max(Math.PI * 0.20, Math.min(Math.PI * 0.58, aimAngle));
          holo.beamAngle = holo.beamAngle * 0.90 + clamped * 0.10;
        }

        // チャージスパーク粒子
        if (Math.random() < 0.5) {
          const ca = Math.random() * Math.PI * 2;
          const cr = 24 + Math.random() * 16;
          state.particles.push({
            x: holo.x + Math.cos(ca) * cr,
            y: holo.y + Math.sin(ca) * cr,
            vx: -Math.cos(ca) * 3.0,
            vy: -Math.sin(ca) * 3.0,
            color: "#ff007f",
            life: 12,
            scale: 1.0
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "fire";
          holo.laserTimer = 35; // 35フレーム照射
          holo.flash = 25;
          if (window.sfx && window.sfx.metalBumper) {
            window.sfx.metalBumper();
          }
          UI.showCutin("⚡【ホログラムレーザー発砲！】⚡<br>防衛ビームを回避せよ！", 140);
        }
      } else if (holo.laserState === "fire") {
        holo.laserTimer--;

        // レーザービーム線分衝突判定（ボールを強烈に弾き飛ばす）
        const beamStartX = holo.x;
        const beamStartY = holo.y;
        const beamEndX = holo.x + Math.cos(holo.beamAngle) * holo.beamLength;
        const beamEndY = holo.y + Math.sin(holo.beamAngle) * holo.beamLength;

        state.balls.forEach(ball => {
          const hit = Physics.checkCapsuleHit(ball, beamStartX, beamStartY, beamEndX, beamEndY, 8.0);
          if (hit) {
            ball.x = hit.qx + hit.nx * (hit.minDist + 1.5);
            ball.y = hit.qy + hit.ny * (hit.minDist + 1.5);
            ball.vx = hit.nx * 15.0;
            ball.vy = hit.ny * 15.0;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, ball.x, ball.y, "#00f5d4", 16, 5.0);
            Particles.add(state, ball.x, ball.y, "#ffffff", 10, 4.0);
            Systems.addScore(state, 5000, ball.x, ball.y, "⚡LASER DEFLECT!⚡");
          }
        });

        // ビーム沿いに激しいレーザー粒子
        for (let i = 0; i < 2; i++) {
          const ratio = Math.random();
          const px = beamStartX + (beamEndX - beamStartX) * ratio;
          const py = beamStartY + (beamEndY - beamStartY) * ratio;
          state.particles.push({
            x: px + (Math.random() - 0.5) * 8,
            y: py + (Math.random() - 0.5) * 8,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            color: Math.random() < 0.6 ? "#00f5d4" : "#ffffff",
            life: 8,
            scale: 1.2
          });
        }

        if (holo.laserTimer <= 0) {
          holo.laserState = "idle";
          holo.cooldown = 220 + Math.floor(Math.random() * 80);
        }
      }
    }

    // 4. 背中ジェット噴射機構
    const jet = state.boss.jet;
    if (jet && jet.timer > 0) {
      jet.timer--;
      jet.active = true;

      for (let i = 0; i < 3; i++) {
        const spreadAngle = Math.PI * 0.55 + (Math.random() - 0.5) * 0.75;
        const speed = 4.0 + Math.random() * 5.0;
        state.particles.push({
          x: jet.x + (Math.random() - 0.5) * 16,
          y: jet.y + (Math.random() - 0.5) * 10,
          vx: Math.cos(spreadAngle) * speed,
          vy: Math.sin(spreadAngle) * speed,
          color: Math.random() < 0.6 ? "#00f5d4" : (Math.random() < 0.5 ? "#ffffff" : "#ff007f"),
          life: 16,
          scale: 1.4 + Math.random() * 0.8
        });
      }

      state.balls.forEach(ball => {
        const dx = ball.x - jet.x;
        const dy = ball.y - jet.y;
        const dist = Math.hypot(dx, dy);
        const blastRadius = 175;

        if (dist < blastRadius && dist > 1.0) {
          const force = 13.0 * Math.pow(1.0 - dist / blastRadius, 1.25);
          ball.vx += (dx / dist) * force;
          ball.vy += (dy / dist) * force;

          const spd = Math.hypot(ball.vx, ball.vy);
          if (spd > 22.0) {
            ball.vx = (ball.vx / spd) * 22.0;
            ball.vy = (ball.vy / spd) * 22.0;
          }
        }
      });
    } else if (jet) {
      jet.active = false;
    }

    // Flash decay
    [state.boss.shoulderL, state.boss.shoulderR, state.boss.elbowL, state.boss.elbowR, state.boss.tipBust].forEach(t => {
      if (t && t.flash > 0) t.flash--;
    });
  },

  checkCollisions(ball, state, engine, s) {
    if (s !== 0) return;
    const checkBumper = (bumper, speed, cb) => Physics.checkCircleBumper(ball, bumper, speed, cb);

    // 1. カチューシャのアンテナ先端（放電時は弾く、停止時は通り抜け可能！）
    const ant = state.boss.antenna;
    if (ant) {
      const dxA = ball.x - ant.x;
      const dyA = ball.y - ant.y;
      const distA = Math.hypot(dxA, dyA);

      if (distA < ball.r + ant.r) {
        if (ant.isActive) {
          // 放電中：激しい電撃で弾き返す！
          checkBumper(ant, 11.5, () => {
            ant.flash = 24;
            if (window.sfx) window.sfx.metalBumper();
            Particles.add(state, ant.x, ant.y, "#00f5d4", 18, 5.0);
            Particles.add(state, ant.x, ant.y, "#e6ff00", 12, 4.0);
            state.boss.expression = "shock";
            state.boss.expressionTimer = 50;
            Systems.addScore(state, 4000, ant.x, ant.y, "⚡ELECTRIC SHOCK REPEL!⚡");
          });
        } else {
          // 電撃停止中：通り抜け可能！ オービットゲート通過ボーナス
          if (!ball._passedAntennaGate) {
            ball._passedAntennaGate = true;
            Systems.addScore(state, 8000, ant.x, ant.y, "★ORBIT GATE CLEAR!!★");
            Particles.addPopup(state, ant.x, ant.y - 14, "★GATE PASS +8000★", "#e6ff00", 1.1);
            if (window.sfx) window.sfx.capsuleCatch();
          }
        }
      } else {
        ball._passedAntennaGate = false;
      }
    }

    // 2. バウンスポイント：肩（左肩＆右肩）
    const handleShoulderHit = (sh, sideLabel) => {
      checkBumper(sh, 9.5, () => {
        sh.flash = 22;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, sh.x, sh.y, "#00f5d4", 18, 5.0);

        if (sh.hp > 0) {
          sh.hp--;
          state.boss.expression = "wince";
          state.boss.expressionTimer = 45;
          Systems.addScore(state, 3000, sh.x, sh.y, `${sideLabel} SHOULDER! HP:${sh.hp}`);
          if (sh.hp === 0) {
            sh.broken = true;
            Particles.triggerArmorBreakEffect(state, sideLabel.toLowerCase() + "_shoulder", sh.x, sh.y);
            UI.showCutin(`💥【${sideLabel}肩装甲大破！】💥<br>肩部装甲パージ！ +30,000pts ボーナス！`, 200);
            Systems.addScore(state, 30000, sh.x, sh.y, `★${sideLabel} SHOULDER PURGED!★`);
            Systems.spawnFloatingCapsule(state, 2, "buff");
          }
        } else {
          Systems.addScore(state, 3500, sh.x, sh.y, `⚡${sideLabel} SHOULDER SPARK!`);
        }
      });
    };

    if (state.boss.shoulderL) handleShoulderHit(state.boss.shoulderL, "L");
    if (state.boss.shoulderR) handleShoulderHit(state.boss.shoulderR, "R");

    // 3. バウンスポイント：肘（左肘＆右肘）
    const handleElbowHit = (elb, sideLabel) => {
      checkBumper(elb, 9.8, () => {
        elb.flash = 20;
        if (window.sfx) window.sfx.metalBumper();
        Particles.add(state, elb.x, elb.y, "#e6ff00", 16, 4.5);
        state.boss.expression = "wince";
        state.boss.expressionTimer = 40;
        Systems.addScore(state, 3500, elb.x, elb.y, `⚡${sideLabel} ELBOW DEFLECT!`);
      });
    };

    if (state.boss.elbowL) handleElbowHit(state.boss.elbowL, "L");
    if (state.boss.elbowR) handleElbowHit(state.boss.elbowR, "R");

    // 4. 胸の先端（背中ジェット暴走トリガーセンサー）
    const bust = state.boss.tipBust;
    if (bust) {
      checkBumper(bust, 8.5, () => {
        bust.flash = 22;
        if (window.sfx) window.sfx.softPuru();
        Particles.add(state, bust.x, bust.y, "#ff1493", 18, 5.0);
        Particles.spawnHeart(state, bust.x, bust.y, false);

        state.boss.expression = "open_blush";
        state.boss.expressionTimer = 85;
        state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 30);

        this.triggerJetBlast(state);
        Systems.addScore(state, 12000, bust.x, bust.y, "♥BUST TIP SENSITIVE!♥");
      });
    }
  },

  triggerJetBlast(state) {
    const jet = state.boss.jet;
    if (!jet) return;

    jet.timer = 50;
    if (window.sfx && window.sfx.feverAlarm) {
      window.sfx.feverAlarm();
    }

    UI.showCutin("🚀【背中ジェット噴射！】🚀<br>「ひゃんっ！？ どこ当ててるのバカッ！<br>吹き飛びなさいっっ！！」", 180);

    state.shockwaves.push({
      x: jet.x,
      y: jet.y,
      r: 10,
      maxR: 175,
      color: "#00f5d4",
      alpha: 1.0
    });
  },

  renderBackground(ctx, state, engine) {
    const IMG_BOX = (engine && engine.IMG_BOX) ? engine.IMG_BOX : { x: 16, y: 16, w: 364, h: 644 };

    if (!this.assets.loaded || !this.assets.bareImg.complete) {
      ctx.fillStyle = "#120624";
      ctx.fillRect(IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);
      return;
    }

    ctx.save();
    ctx.drawImage(this.assets.bareImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // ラスターグリッジノイズ処理（左手奥のホログラム領域: 原画の x: 20..160, y: 340..460 に対応）
    const holo = state.boss.hologram;
    if (holo) {
      const hx = IMG_BOX.x + (20 / 768) * IMG_BOX.w;
      const hy = IMG_BOX.y + (340 / 1376) * IMG_BOX.h;
      const hw = (140 / 768) * IMG_BOX.w;
      const hh = (130 / 1376) * IMG_BOX.h;

      // ラスター走査線スライス変形（ホログラムのちらつき表現）
      const slices = 8;
      const sliceH = hh / slices;
      for (let i = 0; i < slices; i++) {
        if (Math.random() < 0.45) {
          const shift = (Math.random() - 0.5) * 8.0 + (holo.glitchShift || 0);
          ctx.save();
          ctx.beginPath();
          ctx.rect(hx - 10, hy + i * sliceH, hw + 20, sliceH);
          ctx.clip();
          ctx.drawImage(this.assets.bareImg, IMG_BOX.x + shift, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

          // RGB色ズレ（シアン＆マゼンタゴースト）
          ctx.fillStyle = Math.random() < 0.5 ? "rgba(0, 245, 212, 0.25)" : "rgba(255, 0, 127, 0.22)";
          ctx.fillRect(hx - 10, hy + i * sliceH, hw + 20, sliceH);
          ctx.restore();
        }
      }
    }

    // Dynamic Face Expression Patch
    const isDefeat = state.clearSequence && state.clearSequence.active;
    const activePatchKey = isDefeat ? "open_blush" : (
      state.boss.expression === "open_blush" ? "open_blush" :
      state.boss.expression === "shock" ? "shock" :
      state.boss.expression === "wince" ? "wince" :
      (state.boss.winkTimer > 0 ? "wink" :
      (state.boss.blinkTimer > 0 && state.boss.blinkTimer < 8 ? "blink" :
      (state.boss.talkTimer > 0 ? ((state.boss.talkTimer % 12 < 6) ? "talk" : "talk_sm") : null)))
    );

    if (activePatchKey && this.assets.facePatchImgs[activePatchKey] && this.assets.facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (270 / 768) * IMG_BOX.w;
      const fy = IMG_BOX.y + (310 / 1376) * IMG_BOX.h;
      const fw = (190 / 768) * IMG_BOX.w;
      const fh = (170 / 1376) * IMG_BOX.h;
      ctx.drawImage(this.assets.facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // 背中ジェット噴射火炎
    const jet = state.boss.jet;
    if (jet && jet.active) {
      ctx.save();
      ctx.translate(jet.x, jet.y);
      const pulse = 1.0 + Math.sin(Date.now() * 0.05) * 0.25;

      const grad = ctx.createRadialGradient(0, 0, 4, 0, 10, 50 * pulse);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      grad.addColorStop(0.35, "rgba(0, 245, 212, 0.85)");
      grad.addColorStop(0.7, "rgba(255, 0, 127, 0.6)");
      grad.addColorStop(1, "rgba(0, 245, 212, 0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 45 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  },

  renderTargets(ctx, state, animTick) {
    if (!state.boss) return;

    const drawGuide = (x, y, r, color, flash, rot, label, sub) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot || 0);

      const f = flash || 0;
      ctx.strokeStyle = f > 0 ? "#ffffff" : color;
      ctx.lineWidth = f > 0 ? 3.0 : 1.8;
      ctx.fillStyle = f > 0 ? "rgba(255, 255, 255, 0.35)" : "rgba(0, 0, 0, 0.22)";

      ctx.beginPath();
      ctx.arc(0, 0, r + (f > 0 ? 3 : 0), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(r - 3, 0);
        ctx.lineTo(r + 4, 0);
        ctx.stroke();
      }

      ctx.restore();

      if (label) {
        ctx.save();
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = color;
        ctx.fillText(label, x, y - r - 3);
        if (sub) {
          ctx.font = "bold 8px monospace";
          ctx.fillStyle = "#ffffff";
          ctx.fillText(sub, x, y + r + 10);
        }
        ctx.restore();
      }
    };

    // 1. カチューシャのアンテナ先端（周期電撃バリア）
    const ant = state.boss.antenna;
    if (ant) {
      ctx.save();
      ctx.translate(ant.x, ant.y);
      if (ant.isActive) {
        // 放電中：ジグザグの電撃アークリング
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const steps = 12;
        for (let i = 0; i <= steps; i++) {
          const a = (i / steps) * Math.PI * 2;
          const r = ant.r + ((i % 2 === 0) ? 5 : -4) + Math.random() * 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = "rgba(0, 245, 212, 0.3)";
        ctx.fill();
      } else if (ant.isWarning) {
        // 放電予告（黄色点滅）
        ctx.strokeStyle = "#e6ff00";
        ctx.lineWidth = 2.0;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(0, 0, ant.r + Math.sin(animTick * 0.2) * 3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 安全・通過可能（青緑の静止リング）
        ctx.strokeStyle = "rgba(0, 245, 212, 0.55)";
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, ant.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();

      ctx.save();
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillStyle = ant.isActive ? "#00f5d4" : (ant.isWarning ? "#e6ff00" : "#00f5d4");
      ctx.fillText(ant.isActive ? "⚡SHOCK⚡" : (ant.isWarning ? "⚠️WARNING" : "OPEN GATE"), ant.x, ant.y - ant.r - 3);
      ctx.restore();
    }

    // 2. 左手奥ホログラム（照準＆レーザービーム描画）
    const holo = state.boss.hologram;
    if (holo) {
      drawGuide(holo.x, holo.y, holo.r, "#ff007f", holo.flash, animTick * 0.02, "HOLOGRAM", holo.laserState === "fire" ? "⚡LASER FIRE⚡" : (holo.laserState === "charge" ? "⚠️CHARGING" : "STANDBY"));

      if (holo.laserState === "charge") {
        // 照準予測線（細い点線）
        ctx.save();
        ctx.strokeStyle = "rgba(255, 0, 127, 0.65)";
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(holo.x + Math.cos(holo.beamAngle) * holo.beamLength, holo.y + Math.sin(holo.beamAngle) * holo.beamLength);
        ctx.stroke();
        ctx.restore();
      } else if (holo.laserState === "fire") {
        // 強力なネオンレーザービーム本体！
        ctx.save();
        const ex = holo.x + Math.cos(holo.beamAngle) * holo.beamLength;
        const ey = holo.y + Math.sin(holo.beamAngle) * holo.beamLength;

        // ビーム外殻グロー
        ctx.strokeStyle = "rgba(0, 245, 212, 0.55)";
        ctx.lineWidth = 12.0;
        ctx.beginPath();
        ctx.moveTo(holo.x, holo.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // ビーム芯線
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3.5;
        ctx.stroke();
        ctx.restore();
      }
    }

    // 3. バウンスポイント：肩（左肩＆右肩）
    const shL = state.boss.shoulderL;
    if (shL) {
      drawGuide(shL.x, shL.y, shL.r, shL.broken ? "#00f5d4" : "#e6ff00", shL.flash, animTick * 0.02, "L-SHOULDER", shL.broken ? "PURGED" : `HP:${shL.hp}`);
    }
    const shR = state.boss.shoulderR;
    if (shR) {
      drawGuide(shR.x, shR.y, shR.r, shR.broken ? "#00f5d4" : "#e6ff00", shR.flash, -animTick * 0.02, "R-SHOULDER", shR.broken ? "PURGED" : `HP:${shR.hp}`);
    }

    // 4. バウンスポイント：肘（左肘＆右肘）
    const elbL = state.boss.elbowL;
    if (elbL) {
      drawGuide(elbL.x, elbL.y, elbL.r, "#e6ff00", elbL.flash, -animTick * 0.02, "L-ELBOW", "DEFLECT");
    }
    const elbR = state.boss.elbowR;
    if (elbR) {
      drawGuide(elbR.x, elbR.y, elbR.r, "#e6ff00", elbR.flash, animTick * 0.02, "R-ELBOW", "DEFLECT");
    }

    // 5. 胸の先端（JET SENSOR）
    const bTip = state.boss.tipBust;
    if (bTip) {
      drawGuide(bTip.x, bTip.y, bTip.r, "#ff1493", bTip.flash, animTick * 0.03, "♥BUST TIP", "⚡JET SENSOR");
    }
  },

  renderHUD(ctx, state) {},
  renderOverlays(ctx, state) {},

  getTargetDesc(state) {
    if (!state.boss) return "---";
    const ant = state.boss.antenna;
    if (ant && ant.isActive) {
      return "⚡アンテナ電撃放電中！ 停止タイミングでゲートを抜けろ！";
    }
    const holo = state.boss.hologram;
    if (holo && holo.laserState === "charge") {
      return "⚠️ホログラム砲台チャージ中！ 斜めレーザーに注意！";
    }
    return "TARGET: 両肩装甲(SHOULDER)破壊 ＆ 胸先端ヒットで背中ジェット暴走！";
  },

  updateStatusMonitor(state) {
    if (!state.boss) return;
    const dtArmR = document.getElementById("dtArmRStatus");
    if (dtArmR) {
      const shR = state.boss.shoulderR;
      dtArmR.textContent = shR.broken ? "💥PURGED!" : `R-SHOULDER (${shR.hp}/8)`;
      dtArmR.className = shR.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtArmL = document.getElementById("dtArmLStatus");
    if (dtArmL) {
      const shL = state.boss.shoulderL;
      dtArmL.textContent = shL.broken ? "💥PURGED!" : `L-SHOULDER (${shL.hp}/8)`;
      dtArmL.className = shL.broken ? "font-bold text-[#ff1493]" : "font-bold text-[#e6ff00]";
    }
    const dtChest = document.getElementById("dtChestStatus");
    if (dtChest) {
      const holo = state.boss.hologram;
      if (holo && holo.laserState === "fire") {
        dtChest.textContent = "⚡LASER FIRE!";
        dtChest.className = "font-bold text-[#ff007f] animate-ping";
      } else if (holo && holo.laserState === "charge") {
        dtChest.textContent = "⚠️CHARGING...";
        dtChest.className = "font-bold text-[#e6ff00]";
      } else {
        dtChest.textContent = "HOLOGRAM STANDBY";
        dtChest.className = "font-bold text-gray-400";
      }
    }
    const dtCrotch = document.getElementById("dtCrotchStatus");
    if (dtCrotch) {
      const jet = state.boss.jet;
      if (jet && jet.active) {
        dtCrotch.textContent = "🔥JET PROPULSION!";
        dtCrotch.className = "font-bold text-[#e6ff00] animate-pulse";
      } else {
        dtCrotch.textContent = "STANDBY";
        dtCrotch.className = "font-bold text-gray-400";
      }
    }
  }
};

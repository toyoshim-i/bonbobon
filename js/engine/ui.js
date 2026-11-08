// =========================================================================
// PINBALL ENGINE - UI & INPUT CONTROLS SYSTEM
// =========================================================================

window.UI = {
  _cutinTimer: null,

  showCutin(text, durationFrames = 130) {
    const banner = document.getElementById("cutinBanner");
    const txt = document.getElementById("cutinText");
    if (!banner || !txt) return;

    txt.innerHTML = text;
    banner.classList.remove("hidden");
    banner.classList.add("flex");

    clearTimeout(this._cutinTimer);
    this._cutinTimer = setTimeout(() => {
      banner.classList.remove("flex");
      banner.classList.add("hidden");
    }, durationFrames * 16);
  },

  updateHUD(state) {
    const scoreEl = document.getElementById("hudScore");
    if (scoreEl) scoreEl.textContent = state.score.toLocaleString();

    let targetDesc = "ドローン＆両肩アーマー破壊";
    if (window.currentStage && window.currentStage.getTargetDesc) {
      targetDesc = window.currentStage.getTargetDesc(state);
    }
    const targetEl = document.getElementById("hudTargetDesc");
    if (targetEl) targetEl.textContent = targetDesc;

    const phaseEl = document.getElementById("hudPhase");
    if (phaseEl) {
      if (state.stageCleared) {
        phaseEl.textContent = "STAGE CLEAR!";
        phaseEl.className = "px-1.5 py-0.5 rounded bg-[#ff1493] text-white text-[9px] font-black tracking-wider animate-pulse shadow";
      } else {
        phaseEl.textContent = `PHASE ${state.phase}`;
        phaseEl.className = "px-1.5 py-0.5 rounded bg-[#ff1493]/20 border border-[#ff1493]/60 text-[9px] font-extrabold text-[#ff1493]";
      }
    }

    // Fever Gauge HUD
    const fBar = document.getElementById("feverGaugeBar");
    if (fBar) fBar.style.width = `${state.fever.gauge}%`;
    const fText = document.getElementById("hudBurstTimer");
    if (fText) {
      if (state.fever.active) {
        const sec = Math.ceil(state.fever.timer / 60);
        fText.textContent = `×5 (${sec}s)`;
        fText.className = "text-[9px] text-[#e6ff00] font-extrabold w-7 text-right shrink-0 leading-none animate-pulse";
      } else if (state.burstTimer > 0) {
        const sec = Math.ceil(state.burstTimer / 60);
        fText.textContent = `B×${state.burstMultiplier.toFixed(1)}`;
        fText.className = "text-[9px] text-[#ff1493] font-bold w-7 text-right shrink-0 leading-none";
      } else {
        fText.textContent = `${Math.floor(state.fever.gauge)}%`;
        fText.className = "text-[9px] text-[#00f5d4] font-bold w-7 text-right shrink-0 leading-none";
      }
    }

    const ballsEl = document.getElementById("hudBalls");
    if (ballsEl) ballsEl.textContent = "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining));

    // Buff Slots
    const slotsContainer = document.getElementById("buffSlots");
    if (slotsContainer) {
      slotsContainer.innerHTML = "";
      state.keptBuffs.forEach((slot, idx) => {
        const div = document.createElement("div");
        if (slot) {
          const def = Systems.BUFF_DEFS[slot.id];
          div.className = "rounded px-1 py-1 border text-center bg-[#230b4f] flex flex-col justify-center items-center h-10";
          div.style.borderColor = def.color;
          div.innerHTML = `
            <div class="text-[10px] font-bold leading-tight truncate w-full" style="color:${def.color}">${def.label}</div>
            <div class="text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5">★Lv.${slot.tier}</div>
          `;
        } else {
          div.className = "rounded px-1 py-1 border border-dashed border-[#00f5d4]/30 text-center bg-black/30 flex flex-col justify-center items-center h-10";
          div.innerHTML = `<div class="text-[9px] text-[#00f5d4]/40 font-mono leading-none">SLOT ${idx + 1}</div><div class="text-[9px] text-[#00f5d4]/30 leading-none mt-0.5">EMPTY</div>`;
        }
        slotsContainer.appendChild(div);
      });
    }

    // Permanent Upgrades List
    const permContainer = document.getElementById("permUpgradesList");
    if (permContainer) {
      permContainer.innerHTML = "";
      Object.values(Systems.PERM_DEFS).forEach(def => {
        const lv = state.perm[def.id] || 0;
        let extraStatus = "";
        if (def.id === "centerPost") extraStatus = ` (残HP: ${state.perm.centerPostHP})`;
        if (def.id === "kickbackL") extraStatus = ` (残弾: ${state.perm.kickbackL_charges})`;
        if (def.id === "kickbackR") extraStatus = ` (残弾: ${state.perm.kickbackR_charges})`;

        const row = document.createElement("div");
        row.className = `p-2 rounded border ${lv > 0 ? "bg-[#00f5d4]/10 border-[#00f5d4]/60" : "bg-black/20 border-[#00f5d4]/30 opacity-70"}`;
        row.innerHTML = `
          <div class="flex items-center justify-between font-bold">
            <span class="${lv > 0 ? "text-[#00f5d4]" : ""}">${def.name}</span>
            <span class="text-[#e6ff00]">Lv.${lv}/${def.maxLv}${extraStatus}</span>
          </div>
          <div class="text-xs text-[#b59ce6] mt-0.5">${def.desc}</div>
        `;
        permContainer.appendChild(row);
      });
    }

    // Stage Specific Status Monitor
    if (window.currentStage && window.currentStage.updateStatusMonitor) {
      window.currentStage.updateStatusMonitor(state);
    }

    // Plunger Button Status
    const pBtn = document.getElementById("btnPlunger");
    const pHint = document.getElementById("plungerBtnHint");
    if (pBtn && pHint) {
      if (state.plunger.waitingForLaunch) {
        pBtn.classList.remove("opacity-40", "grayscale");
        pBtn.classList.add("cursor-pointer");
        if (state.plunger.pulling) {
          pHint.textContent = `POWER ${Math.round(state.plunger.power)}%`;
          pHint.className = "text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5 animate-pulse";
        } else {
          pHint.textContent = "引いて離す";
          pHint.className = "text-[9px] text-[#00f5d4] leading-none mt-0.5";
        }
      } else {
        pBtn.classList.add("opacity-40", "grayscale");
        pHint.textContent = "発射済み";
        pHint.className = "text-[9px] text-gray-400 leading-none mt-0.5";
      }
    }

    // Desktop Right Sidebar Telemetry Sync
    const dtBall = document.getElementById("dtBallCount");
    if (dtBall) dtBall.textContent = "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining));
    const dtMult = document.getElementById("dtMultiplier");
    if (dtMult) dtMult.textContent = `B×${state.burstMultiplier.toFixed(1)}`;
    const dtFever = document.getElementById("dtFeverGauge");
    if (dtFever) dtFever.textContent = state.fever.active ? "♥FEVER♥" : `${Math.floor(state.fever.gauge)}%`;

    if (state.boss) {
      const dtArmR = document.getElementById("dtArmRStatus");
      if (dtArmR) {
        dtArmR.textContent = state.boss.armR_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armR_HP}/6)`;
        dtArmR.className = state.boss.armR_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]";
      }
      const dtArmL = document.getElementById("dtArmLStatus");
      if (dtArmL) {
        dtArmL.textContent = state.boss.armL_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armL_HP}/6)`;
        dtArmL.className = state.boss.armL_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]";
      }
      const dtChest = document.getElementById("dtChestStatus");
      if (dtChest) {
        dtChest.textContent = state.boss.chestArmorBroken ? "💥PURGED!" : `ARMORED (${state.boss.chestArmorHP}/8)`;
        dtChest.className = state.boss.chestArmorBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#00f5d4]";
      }
      const dtCrotch = document.getElementById("dtCrotchStatus");
      if (dtCrotch) {
        if (state.boss.chestArmorBroken && state.boss.crotch) {
          const ch = state.boss.crotch.charge || 0;
          const excitementRatio = Math.min(1.0, (state.boss.bustExcitement || 0) / 100);
          const isExcited = excitementRatio > 0.30;
          if (state.boss.crotch.cooldown > 0) {
            dtCrotch.textContent = "COOLING";
            dtCrotch.className = "font-bold text-purple-400";
          } else if (isExcited) {
            dtCrotch.textContent = `♥SUCTION BOOST (${Math.round(excitementRatio * 100)}%)`;
            dtCrotch.className = "font-bold text-[#e6ff00] animate-pulse";
          } else {
            dtCrotch.textContent = `CALM [${"◆".repeat(ch)}${"◇".repeat(3 - ch)}]`;
            dtCrotch.className = "font-bold text-gray-400";
          }
        } else {
          dtCrotch.textContent = "INACTIVE";
          dtCrotch.className = "font-bold text-gray-400";
        }
      }
    }
  },

  initControls(engine) {
    const setLeft = (d) => {
      engine.state.leftFlipperDown = d;
      const btn = document.getElementById("btnLeftFlip");
      if (btn) btn.classList.toggle("retro-btn-active", d);
      if (d && window.sfx) window.sfx.flip();
    };
    const setRight = (d) => {
      engine.state.rightFlipperDown = d;
      const btn = document.getElementById("btnRightFlip");
      if (btn) btn.classList.toggle("retro-btn-active", d);
      if (d && window.sfx) window.sfx.flip();
    };

    // Keyboard Bindings
    window.addEventListener("keydown", e => {
      if (["ArrowLeft", "KeyA", "KeyZ"].includes(e.code)) {
        e.preventDefault();
        setLeft(true);
      } else if (["ArrowRight", "KeyD", "Slash"].includes(e.code)) {
        e.preventDefault();
        setRight(true);
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        engine.startPlungerPull();
      } else if (e.code === "Space") {
        e.preventDefault();
        Systems.triggerBurst(engine.state);
      } else if (["ArrowUp", "KeyW"].includes(e.code)) {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, 0, -1, 1.0);
      } else if (e.code === "KeyQ") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, -1, -0.5, 1.1);
      } else if (e.code === "KeyE") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, 1, -0.5, 1.1);
      }
    });

    window.addEventListener("keyup", e => {
      if (["ArrowLeft", "KeyA", "KeyZ"].includes(e.code)) {
        setLeft(false);
      } else if (["ArrowRight", "KeyD", "Slash"].includes(e.code)) {
        setRight(false);
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        engine.releasePlunger();
      }
    });

    // Touch / Button Bindings with Pointer Capture (Prevents accidental release on slight finger drift)
    const bindHold = (id, onDown, onUp) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("pointerdown", e => {
        e.preventDefault();
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
        onDown();
      });
      const endHold = e => {
        e.preventDefault();
        try { el.releasePointerCapture(e.pointerId); } catch (_) {}
        onUp();
      };
      el.addEventListener("pointerup", endHold);
      el.addEventListener("pointercancel", endHold);
    };

    bindHold("btnLeftFlip", () => setLeft(true), () => setLeft(false));
    bindHold("btnRightFlip", () => setRight(true), () => setRight(false));

    // Plunger button (Linear charge on hold, release on lift)
    const plungerBtn = document.getElementById("btnPlunger");
    if (plungerBtn) {
      bindHold(
        "btnPlunger",
        () => engine.startPlungerPull(),
        () => engine.releasePlunger()
      );
    }

    // Direct Playfield Multi-Touch Tap & Swipe
    const activeTouches = new Map();
    const playfieldEl = document.getElementById("playfieldArea") || engine.canvas;

    playfieldEl.addEventListener("pointerdown", e => {
      e.preventDefault();
      try { playfieldEl.setPointerCapture(e.pointerId); } catch (_) {}

      const canvasRect = engine.canvas.getBoundingClientRect();
      const canvasX = (e.clientX - canvasRect.left) * (engine.W / canvasRect.width);
      const canvasY = (e.clientY - canvasRect.top) * (engine.H / canvasRect.height);

      if (engine.state.plunger.waitingForLaunch && canvasX > 370 && canvasY > 440) {
        activeTouches.set(e.pointerId, { type: "plunger", startY: canvasY, lastY: canvasY });
        engine.state.plunger.pulling = true;
        return;
      }

      const areaRect = playfieldEl.getBoundingClientRect();
      const isLeft = e.clientX < (areaRect.left + areaRect.width / 2);
      const side = isLeft ? "L" : "R";

      activeTouches.set(e.pointerId, {
        type: side,
        clientStartX: e.clientX,
        clientStartY: e.clientY,
        hasNudged: false
      });

      if (side === "L") setLeft(true);
      else setRight(true);
    });

    playfieldEl.addEventListener("pointermove", e => {
      const t = activeTouches.get(e.pointerId);
      if (!t) return;

      if (t.type === "plunger") {
        const canvasRect = engine.canvas.getBoundingClientRect();
        const y = (e.clientY - canvasRect.top) * (engine.H / canvasRect.height);
        const dragDist = Math.max(0, y - t.startY);
        engine.state.plunger.power = Math.min(100, (dragDist / 60) * 100);
        t.lastY = y;
      } else {
        const areaRect = playfieldEl.getBoundingClientRect();
        const currentSide = e.clientX < (areaRect.left + areaRect.width / 2) ? "L" : "R";
        if (currentSide !== t.type) {
          t.type = currentSide;
          const stillHoldingL = Array.from(activeTouches.values()).some(v => v.type === "L");
          const stillHoldingR = Array.from(activeTouches.values()).some(v => v.type === "R");
          setLeft(stillHoldingL);
          setRight(stillHoldingR);
        }

        if (!t.hasNudged) {
          const dx = e.clientX - t.clientStartX;
          const dy = e.clientY - t.clientStartY;
          const dist = Math.hypot(dx, dy);
          if (dist > 20) {
            t.hasNudged = true;
            Physics.triggerDirectionalNudge(engine.state, dx, dy, Math.min(1.5, dist / 28));
          }
        }
      }
    });

    const finishPlayfieldTouch = e => {
      const t = activeTouches.get(e.pointerId);
      if (!t) return;
      activeTouches.delete(e.pointerId);

      if (t.type === "plunger") {
        engine.releasePlunger();
      }

      const stillHoldingL = Array.from(activeTouches.values()).some(v => v.type === "L");
      const stillHoldingR = Array.from(activeTouches.values()).some(v => v.type === "R");
      setLeft(stillHoldingL);
      setRight(stillHoldingR);
    };

    playfieldEl.addEventListener("pointerup", finishPlayfieldTouch);
    playfieldEl.addEventListener("pointercancel", finishPlayfieldTouch);

    // Other Buttons
    const btnBurst = document.getElementById("btnBurst");
    if (btnBurst) {
      btnBurst.addEventListener("click", () => Systems.triggerBurst(engine.state));
    }

    const btnNudge = document.getElementById("btnNudge");
    if (btnNudge) {
      btnNudge.addEventListener("click", () => Physics.triggerNudge(engine.state));
    }

    const btnReset = document.getElementById("btnResetGame");
    if (btnReset) {
      btnReset.addEventListener("click", () => engine.resetGame());
    }
  }
};

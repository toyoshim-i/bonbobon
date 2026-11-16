// =========================================================================
// PINBALL ENGINE - UI & INPUT CONTROLS SYSTEM
// =========================================================================

window.UI = {
  _cutinTimer: null,
  _cutinVisible: false,
  _elCache: {},

  el(id) {
    return this._elCache[id] || (this._elCache[id] = document.getElementById(id));
  },

  isCutinVisible() {
    return !!this._cutinVisible;
  },

  setText(idOrEl, val) {
    const el = typeof idOrEl === "string" ? this.el(idOrEl) : idOrEl;
    if (!el) return;
    const s = String(val ?? "");
    if (el._lastText !== s) {
      el._lastText = s;
      el.textContent = s;
    }
  },

  setClass(idOrEl, cls) {
    const el = typeof idOrEl === "string" ? this.el(idOrEl) : idOrEl;
    if (!el) return;
    if (el._lastClass !== cls) {
      el._lastClass = cls;
      el.className = cls;
    }
  },

  setWidth(idOrEl, val) {
    const el = typeof idOrEl === "string" ? this.el(idOrEl) : idOrEl;
    if (!el) return;
    const s = typeof val === "number" ? `${val}%` : String(val ?? "");
    if (el._lastWidth !== s) {
      el._lastWidth = s;
      el.style.width = s;
    }
  },

  setBossHeader(dotColor, titleText) {
    const el = this.el("targetBossName");
    if (!el) return;
    const key = `${dotColor}|${titleText}`;
    if (el._lastBossHeaderKey !== key) {
      el._lastBossHeaderKey = key;
      const bgClass = dotColor.startsWith("bg-") ? dotColor : `bg-[${dotColor}]`;
      el.innerHTML = `<span class="w-2 h-2 rounded-full ${bgClass} animate-pulse"></span>${titleText}`;
    }
  },

  showCutin(text, durationFrames = 130) {
    const banner = this.el("cutinBanner");
    const txt = this.el("cutinText");
    if (!banner || !txt) return;

    txt.innerHTML = text;
    banner.classList.remove("hidden");
    banner.classList.add("flex");
    this._cutinVisible = true;

    clearTimeout(this._cutinTimer);
    this._cutinTimer = setTimeout(() => {
      banner.classList.remove("flex");
      banner.classList.add("hidden");
      this._cutinVisible = false;
    }, durationFrames * 16);
  },

  updateHUD(state) {
    this.setText("hudScore", state.score.toLocaleString());

    let targetDesc = "ドローン＆両肩アーマー破壊";
    if (window.currentStage && window.currentStage.getTargetDesc) {
      targetDesc = window.currentStage.getTargetDesc(state);
    }
    const targetEl = this.el("hudTargetDesc") || this.el("hudPhaseTarget");
    if (targetEl) this.setText(targetEl, targetDesc);

    const phaseEl = this.el("hudPhase");
    if (phaseEl) {
      if (state.stageCleared) {
        this.setText(phaseEl, "STAGE CLEAR!");
        this.setClass(phaseEl, "px-1.5 py-0.5 rounded bg-[#ff1493] text-white text-[9px] font-black tracking-wider animate-pulse shadow");
      } else {
        this.setText(phaseEl, `PHASE ${state.phase}`);
        this.setClass(phaseEl, "px-1.5 py-0.5 rounded bg-[#ff1493]/20 border border-[#ff1493]/60 text-[9px] font-extrabold text-[#ff1493]");
      }
    }

    // Fever Gauge HUD
    this.setWidth("feverGaugeBar", `${state.fever.gauge}%`);
    const fText = this.el("hudBurstTimer");
    if (fText) {
      if (state.fever.active) {
        const sec = Math.ceil(state.fever.timer / 60);
        this.setText(fText, `×5 (${sec}s)`);
        this.setClass(fText, "text-[9px] text-[#e6ff00] font-extrabold w-7 text-right shrink-0 leading-none animate-pulse");
      } else if (state.burstTimer > 0) {
        const sec = Math.ceil(state.burstTimer / 60);
        this.setText(fText, `B×${state.burstMultiplier.toFixed(1)}`);
        this.setClass(fText, "text-[9px] text-[#ff1493] font-bold w-7 text-right shrink-0 leading-none");
      } else {
        this.setText(fText, `${Math.floor(state.fever.gauge)}%`);
        this.setClass(fText, "text-[9px] text-[#00f5d4] font-bold w-7 text-right shrink-0 leading-none");
      }
    }

    this.setText("hudBalls", "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining)));

    // Buff Slots - only rebuild when key string changes
    const slotsContainer = this.el("buffSlots");
    if (slotsContainer && state.keptBuffs) {
      const buffKey = state.keptBuffs.map(slot => slot ? `${slot.id}:${slot.tier}` : "empty").join("|");
      if (slotsContainer._lastBuffKey !== buffKey) {
        slotsContainer._lastBuffKey = buffKey;
        slotsContainer.innerHTML = "";
        state.keptBuffs.forEach((slot, idx) => {
          const div = document.createElement("div");
          if (slot) {
            const def = window.Systems && Systems.BUFF_DEFS ? Systems.BUFF_DEFS[slot.id] : null;
            const color = def ? def.color : "#00f5d4";
            const label = def ? def.label : slot.id;
            div.className = "rounded px-1 py-1 border text-center bg-[#230b4f] flex flex-col justify-center items-center h-10";
            div.style.borderColor = color;
            div.innerHTML = `
              <div class="text-[10px] font-bold leading-tight truncate w-full" style="color:${color}">${label}</div>
              <div class="text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5">★Lv.${slot.tier}</div>
            `;
          } else {
            div.className = "rounded px-1 py-1 border border-dashed border-[#00f5d4]/30 text-center bg-black/30 flex flex-col justify-center items-center h-10";
            div.innerHTML = `<div class="text-[9px] text-[#00f5d4]/40 font-mono leading-none">SLOT ${idx + 1}</div><div class="text-[9px] text-[#00f5d4]/30 leading-none mt-0.5">EMPTY</div>`;
          }
          slotsContainer.appendChild(div);
        });
      }
    }

    // Permanent Upgrades List - only rebuild when key string changes
    const permContainer = this.el("permUpgradesList");
    if (permContainer && state.perm && window.Systems && Systems.PERM_DEFS) {
      const permKey = Object.keys(Systems.PERM_DEFS).map(id => `${id}:${state.perm[id] || 0}`).join("|") +
        `|${state.perm.centerPostHP || 0}|${state.perm.kickbackL_charges || 0}|${state.perm.kickbackR_charges || 0}`;
      if (permContainer._lastPermKey !== permKey) {
        permContainer._lastPermKey = permKey;
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
    }

    // Plunger Button Status
    const pBtn = this.el("btnPlunger");
    const pHint = this.el("plungerBtnHint");
    if (pBtn && pHint) {
      if (state.plunger.waitingForLaunch) {
        if (pBtn._lastWaiting !== true) {
          pBtn._lastWaiting = true;
          pBtn.classList.remove("opacity-40", "grayscale");
          pBtn.classList.add("cursor-pointer");
        }
        if (state.plunger.pulling) {
          this.setText(pHint, `POWER ${Math.round(state.plunger.power)}%`);
          this.setClass(pHint, "text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5 animate-pulse");
        } else {
          this.setText(pHint, "引いて離す");
          this.setClass(pHint, "text-[9px] text-[#00f5d4] leading-none mt-0.5");
        }
      } else {
        if (pBtn._lastWaiting !== false) {
          pBtn._lastWaiting = false;
          pBtn.classList.add("opacity-40", "grayscale");
          pBtn.classList.remove("cursor-pointer");
        }
        this.setText(pHint, "発射済み");
        this.setClass(pHint, "text-[9px] text-gray-400 leading-none mt-0.5");
      }
    }

    // Desktop Right Sidebar Telemetry Sync
    this.setText("dtBallCount", "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining)));
    this.setText("dtMultiplier", `B×${state.burstMultiplier.toFixed(1)}`);
    this.setText("dtFeverGauge", state.fever.active ? "♥FEVER♥" : `${Math.floor(state.fever.gauge)}%`);

    // Stage Specific Status Monitor or Default Stage 1 fallback
    if (window.currentStage && window.currentStage.updateStatusMonitor) {
      window.currentStage.updateStatusMonitor(state);
    } else if (state.boss) {
      const dtArmR = this.el("dtArmRStatus");
      if (dtArmR) {
        this.setText(dtArmR, state.boss.armR_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armR_HP}/6)`);
        this.setClass(dtArmR, state.boss.armR_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");
      }
      const dtArmL = this.el("dtArmLStatus");
      if (dtArmL) {
        this.setText(dtArmL, state.boss.armL_Broken ? "💥PURGED!" : `ARMORED (${state.boss.armL_HP}/6)`);
        this.setClass(dtArmL, state.boss.armL_Broken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#e6ff00]");
      }
      const dtChest = this.el("dtChestStatus");
      if (dtChest) {
        this.setText(dtChest, state.boss.chestArmorBroken ? "💥PURGED!" : `ARMORED (${state.boss.chestArmorHP}/8)`);
        this.setClass(dtChest, state.boss.chestArmorBroken ? "font-bold text-[#ff1493] animate-pulse" : "font-bold text-[#00f5d4]");
      }
      const dtCrotch = this.el("dtCrotchStatus");
      if (dtCrotch) {
        if (state.boss.chestArmorBroken && state.boss.crotch) {
          const ch = state.boss.crotch.charge || 0;
          const excitementRatio = Math.min(1.0, (state.boss.bustExcitement || 0) / 100);
          const isExcited = excitementRatio > 0.30;
          if (state.boss.crotch.cooldown > 0) {
            this.setText(dtCrotch, "COOLING");
            this.setClass(dtCrotch, "font-bold text-purple-400");
          } else if (isExcited) {
            this.setText(dtCrotch, `♥SUCTION BOOST (${Math.round(excitementRatio * 100)}%)`);
            this.setClass(dtCrotch, "font-bold text-[#e6ff00] animate-pulse");
          } else {
            this.setText(dtCrotch, `CALM [${"◆".repeat(ch)}${"◇".repeat(3 - ch)}]`);
            this.setClass(dtCrotch, "font-bold text-gray-400");
          }
        } else {
          this.setText(dtCrotch, "INACTIVE");
          this.setClass(dtCrotch, "font-bold text-gray-400");
        }
      }
    }
  },

  initControls(engine) {
    const setLeft = (d) => {
      engine.state.leftFlipperDown = d;
      const btn = document.getElementById("btnLeftFlip");
      if (btn) btn.classList.toggle("cyber-btn-active", d);
      if (d && window.sfx) window.sfx.flip();
    };
    const setRight = (d) => {
      engine.state.rightFlipperDown = d;
      const btn = document.getElementById("btnRightFlip");
      if (btn) btn.classList.toggle("cyber-btn-active", d);
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
        engine.state.plunger.power = Math.min(100, (dragDist / 38) * 100);
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

    // Action Buttons
    const btnBurst = document.getElementById("btnBurst");
    if (btnBurst) {
      btnBurst.addEventListener("click", () => Systems.triggerBurst(engine.state));
    }

    const btnNudge = document.getElementById("btnNudge");
    if (btnNudge) {
      btnNudge.addEventListener("click", () => Physics.triggerNudge(engine.state));
    }

    // Reset Buttons (Header RESET, In-game, and Menu Modal RESET)
    const bindResetAction = (id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("click", () => {
          if (window.sfx) window.sfx.flipperClick();
          engine.resetGame();
          closeMenu();
          UI.showCutin("🔄【GAME RESET】<br>盤面を初期化して再出撃！", 140);
        });
      }
    };
    bindResetAction("btnReset");
    bindResetAction("btnResetGame");
    bindResetAction("btnMenuReset");

    // System Menu Modal Open & Close
    const menuModal = document.getElementById("menuModal");
    const openMenu = () => {
      if (!menuModal) return;
      if (window.sfx) window.sfx.flipperClick();
      menuModal.classList.remove("hidden");
      menuModal.classList.add("flex");
      requestAnimationFrame(() => {
        menuModal.classList.remove("opacity-0");
        menuModal.classList.add("opacity-100");
      });
    };
    const closeMenu = () => {
      if (!menuModal) return;
      if (window.sfx) window.sfx.flipperClick();
      menuModal.classList.remove("opacity-100");
      menuModal.classList.add("opacity-0");
      setTimeout(() => {
        menuModal.classList.add("hidden");
        menuModal.classList.remove("flex");
      }, 200);
    };

    const btnMenu = document.getElementById("btnMenu");
    if (btnMenu) btnMenu.addEventListener("click", openMenu);

    const btnMenuClose = document.getElementById("btnMenuClose");
    if (btnMenuClose) btnMenuClose.addEventListener("click", closeMenu);

    const btnMenuResume = document.getElementById("btnMenuResume");
    if (btnMenuResume) btnMenuResume.addEventListener("click", closeMenu);

    // Stage Selection (Header Button, Menu Modal Stage 1, 2 & 3 Cards)
    const loadStageFromUI = (stage) => {
      if (!stage) return;
      if (window.sfx) window.sfx.capsuleCatch();
      engine.resetGame();
      engine.loadStage(stage);

      const txtHeader = document.getElementById("txtHeaderStage");
      if (txtHeader) {
        txtHeader.textContent = stage.id === "stage4" ? "STAGE 4" : (stage.id === "stage3" ? "STAGE 3" : (stage.id === "stage2" ? "STAGE 2" : "STAGE 1"));
      }
      closeMenu();
      UI.showCutin(`🚀【STAGE SELECT】<br>${stage.name} (${stage.bossName})`, 180);
    };

    const btnHeaderStage = document.getElementById("btnHeaderStage");
    if (btnHeaderStage) {
      btnHeaderStage.addEventListener("click", () => {
        const curId = engine.currentStage ? engine.currentStage.id : "stage1";
        const next =
          curId === "stage1" ? window.Stage2 :
          curId === "stage2" ? window.Stage3 :
          curId === "stage3" ? (window.Stage4 || window.Stage1) :
          window.Stage1;
        loadStageFromUI(next);
      });
    }

    const btnSelS1 = document.getElementById("btnSelectStage1");
    if (btnSelS1) {
      btnSelS1.addEventListener("click", () => loadStageFromUI(window.Stage1));
    }
    const btnSelS2 = document.getElementById("btnSelectStage2");
    if (btnSelS2) {
      btnSelS2.addEventListener("click", () => loadStageFromUI(window.Stage2));
    }
    const btnSelS3 = document.getElementById("btnSelectStage3");
    if (btnSelS3) {
      btnSelS3.addEventListener("click", () => loadStageFromUI(window.Stage3));
    }
    const btnSelS4 = document.getElementById("btnSelectStage4");
    if (btnSelS4) {
      btnSelS4.addEventListener("click", () => loadStageFromUI(window.Stage4));
    }

    // Audio Mute / Unmute Toggle
    const toggleAudio = () => {
      if (!window.sfx) return;
      const isEnabled = window.sfx.enabled !== false;
      const nextState = !isEnabled;
      window.sfx.enabled = nextState;

      const btnAudio = document.getElementById("btnAudio");
      if (btnAudio) {
        btnAudio.textContent = nextState ? "SFX:ON" : "SFX:MUTE";
        btnAudio.className = nextState 
          ? "px-1.5 py-0.5 rounded bg-[#281058] hover:bg-[#3a187c] text-[#e6ff00] border border-[#e6ff00]/50 text-[9px] sm:text-[10px] cursor-pointer transition"
          : "px-1.5 py-0.5 rounded bg-[#180828] text-gray-400 border border-gray-600 text-[9px] sm:text-[10px] cursor-pointer transition";
      }
      const txtMenuStatus = document.getElementById("txtMenuAudioStatus");
      if (txtMenuStatus) txtMenuStatus.textContent = nextState ? "SFX: ON" : "SFX: MUTE";
      const txtMenuIcon = document.getElementById("txtMenuAudioIcon");
      if (txtMenuIcon) txtMenuIcon.textContent = nextState ? "🔊" : "🔇";
      if (nextState && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
    };

    const btnAudio = document.getElementById("btnAudio");
    if (btnAudio) btnAudio.addEventListener("click", toggleAudio);

    const btnMenuAudio = document.getElementById("btnMenuToggleAudio");
    if (btnMenuAudio) btnMenuAudio.addEventListener("click", toggleAudio);
  }
};

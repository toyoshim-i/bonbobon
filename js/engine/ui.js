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

  openModal(idOrEl) {
    const modal = typeof idOrEl === "string" ? this.el(idOrEl) : idOrEl;
    if (!modal) return;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    void modal.offsetWidth;
    modal.classList.remove("opacity-0");
    modal.classList.add("opacity-100");
  },

  closeModal(idOrEl, delayMs = 200) {
    const modal = typeof idOrEl === "string" ? this.el(idOrEl) : idOrEl;
    if (!modal) return;
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, delayMs);
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
    const objectivePill = this.el("hudObjectivePill");
    if (!banner || !txt) return;

    txt.innerHTML = text;
    banner.classList.remove("hidden");
    banner.classList.add("flex");
    this._cutinVisible = true;
    if (objectivePill) {
      objectivePill.classList.add("opacity-0");
    }

    clearTimeout(this._cutinTimer);
    this._cutinTimer = setTimeout(() => {
      banner.classList.remove("flex");
      banner.classList.add("hidden");
      this._cutinVisible = false;
      if (objectivePill) {
        objectivePill.classList.remove("opacity-0");
      }
    }, durationFrames * 16);
  },

  isMenuOpen: false,

  updateScreenMode(state) {
    const isTitle = !!(state && state.inTitle);
    const isEnding = !!(state && state.inEnding);
    const isFullscreenMode = isTitle || isEnding;
    const hudBar = this.el("inGameHudBar");
    const buffBar = this.el("inGameBuffBar");
    const titleControls = this.el("titleControlsBar");
    const gameControls = this.el("gameControlsBar");
    const menuControls = this.el("menuControlsBar");
    const endingControls = this.el("endingControlsBar");
    const playfieldFrame = this.el("playfieldFrame");
    const objectivePill = this.el("hudObjectivePill");
    const btnHudDebugSettings = this.el("btnHudDebugSettings");

    if (playfieldFrame) {
      playfieldFrame.classList.toggle("title-screen-mode", isFullscreenMode);
    }
    if (objectivePill) {
      objectivePill.classList.toggle("hidden", isFullscreenMode);
      objectivePill.classList.toggle("flex", !isFullscreenMode);
    }

    if (hudBar) {
      if (isFullscreenMode) hudBar.classList.add("hidden");
      else hudBar.classList.remove("hidden");
    }
    if (btnHudDebugSettings) {
      const isDbg = window.Systems && typeof Systems.isDebugMenuEnabled === "function" && Systems.isDebugMenuEnabled();
      if (!isFullscreenMode && isDbg) {
        btnHudDebugSettings.classList.remove("hidden");
        btnHudDebugSettings.classList.add("flex");
      } else {
        btnHudDebugSettings.classList.add("hidden");
        btnHudDebugSettings.classList.remove("flex");
      }
    }
    if (buffBar) {
      if (isFullscreenMode) buffBar.classList.add("hidden");
      else buffBar.classList.remove("hidden");
    }

    // Bottom Controls Deck Switcher:
    // When Settings Modal is open, transform bottom bar into full-width CLOSE SETTINGS deck!
    if (this.isMenuOpen) {
      if (menuControls) {
        menuControls.classList.remove("hidden");
        menuControls.classList.add("block");
      }
      if (endingControls) {
        endingControls.classList.add("hidden");
        endingControls.classList.remove("block");
      }
      if (titleControls) {
        titleControls.classList.add("hidden");
        titleControls.classList.remove("grid");
      }
      if (gameControls) {
        gameControls.classList.add("hidden");
        gameControls.classList.remove("grid");
      }
    } else {
      if (menuControls) {
        menuControls.classList.add("hidden");
        menuControls.classList.remove("block");
      }
      if (endingControls) {
        if (isEnding) {
          endingControls.classList.remove("hidden");
          endingControls.classList.add("block");
        } else {
          endingControls.classList.add("hidden");
          endingControls.classList.remove("block");
        }
      }
      if (titleControls) {
        if (isTitle && !isEnding) {
          titleControls.classList.remove("hidden");
          titleControls.classList.add("grid");
        } else {
          titleControls.classList.add("hidden");
          titleControls.classList.remove("grid");
        }
      }
      if (gameControls) {
        if (isFullscreenMode) {
          gameControls.classList.add("hidden");
          gameControls.classList.remove("grid");
        } else {
          gameControls.classList.remove("hidden");
          gameControls.classList.add("grid");
        }
      }
    }
  },

  updatePlungerHint(state) {
    const pBtn = this.el("btnPlunger");
    const pHint = this.el("plungerBtnHint");
    if (!pBtn || !pHint) return;
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
  },

  updateHUD(state) {
    if (window.GameEngine && GameEngine._inStepPhysics && state) {
      state._hudDirty = true;
      return;
    }
    this.updateScreenMode(state);
    this.setText("hudScore", state.score.toLocaleString());

    let targetDesc = "ドローン＆両肩アーマーを破壊せよ！";
    if (window.currentStage && window.currentStage.getTargetDesc) {
      targetDesc = window.currentStage.getTargetDesc(state);
    }
    const targetEl = this.el("hudPhaseTarget") || this.el("hudTargetDesc");
    if (targetEl) this.setText(targetEl, targetDesc);

    const phaseEl = this.el("hudPhase");
    if (phaseEl) {
      if (state.stageCleared) {
        this.setText(phaseEl, "CLEAR!");
        this.setClass(phaseEl, "px-1 py-0.5 rounded bg-[#ff1493] text-white text-[8px] font-black tracking-wider whitespace-nowrap shrink-0 animate-pulse shadow");
      } else {
        this.setText(phaseEl, `PH.${state.phase}`);
        this.setClass(phaseEl, "px-1 py-0.5 rounded bg-[#ff1493]/20 border border-[#ff1493]/60 text-[8px] font-extrabold text-[#ff1493] whitespace-nowrap shrink-0");
      }
    }

    // Fever Gauge HUD
    this.setWidth("feverGaugeBar", `${state.fever.gauge}%`);
    const fText = this.el("hudBurstTimer");
    if (fText) {
      if (state.fever.active) {
        const sec = Math.ceil(state.fever.timer / 60);
        this.setText(fText, `×5 ${sec}s`);
        this.setClass(fText, "whitespace-nowrap tabular-nums w-[46px] text-right shrink-0 leading-none text-[8.5px] text-[#e6ff00] font-extrabold animate-pulse");
      } else if (state.burstTimer > 0) {
        this.setText(fText, `B×${state.burstMultiplier.toFixed(1)}`);
        this.setClass(fText, "whitespace-nowrap tabular-nums w-[46px] text-right shrink-0 leading-none text-[8.5px] text-[#ff1493] font-bold");
      } else {
        this.setText(fText, `${Math.floor(state.fever.gauge)}%`);
        this.setClass(fText, "whitespace-nowrap tabular-nums w-[46px] text-right shrink-0 leading-none text-[8.5px] text-[#00f5d4] font-bold");
      }
    }

    const hudShield = this.el("hudShield");
    if (hudShield) {
      if (state.score > 0) {
        this.setText(hudShield, "🛡️SAFE");
        this.setClass(hudShield, "px-1 py-0.5 rounded text-[8px] font-extrabold text-[#00f5d4] bg-[#00f5d4]/15 border border-[#00f5d4]/60 tracking-wider whitespace-nowrap shrink-0");
      } else {
        this.setText(hudShield, "🚨DANGER");
        this.setClass(hudShield, "px-1 py-0.5 rounded text-[8px] font-extrabold text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055] tracking-wider whitespace-nowrap shrink-0 animate-pulse");
      }
    }
    const hudMisses = this.el("hudMisses");
    if (hudMisses) {
      this.setText(hudMisses, `MISS:${state.stageMisses || 0}`);
    }

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
            div.className = "h-7 rounded px-1 border bg-[#230b4f] flex items-center justify-between gap-0.5";
            div.style.borderColor = color;
            div.innerHTML = `<span class="text-[8.5px] font-bold truncate leading-none" style="color:${color}">${label}</span><span class="text-[8px] text-[#e6ff00] font-black shrink-0 leading-none">★${slot.tier}</span>`;
          } else {
            div.className = "h-7 rounded px-1 border border-dashed border-[#00f5d4]/25 bg-black/30 flex items-center justify-center";
            div.innerHTML = `<span class="text-[8px] text-[#00f5d4]/35 font-mono leading-none">SLOT ${idx + 1}</span>`;
          }
          slotsContainer.appendChild(div);
        });
      }
    }

    // Permanent Upgrades List (Rendered dynamically when menu is open)
    if (this.isMenuOpen && state.perm && window.Systems && Systems.PERM_DEFS) {
      const permKey = Object.keys(Systems.PERM_DEFS).map(id => `${id}:${state.perm[id] || 0}`).join("|") +
        `|${state.perm.centerPostHP || 0}|${state.perm.kickbackL_charges || 0}|${state.perm.kickbackR_charges || 0}`;
      if (this._lastPermKey !== permKey) {
        this._lastPermKey = permKey;
        this.renderPermUpgrades(state);
      }
    }

    // Plunger Button Status
    this.updatePlungerHint(state);

    // Desktop Right Sidebar Telemetry Sync
    const dtShield = this.el("dtBallCount");
    if (dtShield) {
      if (state.score > 0) {
        this.setText(dtShield, `🛡️SAFE (${state.score.toLocaleString()} pts)`);
        this.setClass(dtShield, "font-black text-[#00f5d4]");
      } else {
        this.setText(dtShield, "🚨DANGER (0 pts)");
        this.setClass(dtShield, "font-black text-[#ff0055] animate-pulse");
      }
    }
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

  renderPermUpgrades(state) {
    const permContainer = document.getElementById("permUpgradesList");
    if (!permContainer || !window.Systems || !Systems.PERM_DEFS) return;
    const dp = (window.Systems && Systems.settings && Systems.settings.debugPerm) || {};
    permContainer.innerHTML = "";
    Object.values(Systems.PERM_DEFS).forEach(def => {
      const lv = (state && state.perm && typeof state.perm[def.id] === "number")
        ? state.perm[def.id]
        : (dp[def.id] || 0);
      let extraStatus = "";
      if (state && state.perm && !state.inTitle) {
        if (def.id === "centerPost") extraStatus = ` [残HP:${state.perm.centerPostHP || 0}]`;
        if (def.id === "kickbackL") extraStatus = ` [残弾:${state.perm.kickbackL_charges || 0}]`;
        if (def.id === "kickbackR") extraStatus = ` [残弾:${state.perm.kickbackR_charges || 0}]`;
      }
      const row = document.createElement("div");
      row.className = "flex items-center justify-between p-1.5 rounded-lg border bg-black/30 border-[#00f5d4]/30 text-xs";
      row.innerHTML = `
        <div class="flex flex-col min-w-0 pr-1">
          <span class="font-bold text-[10px] text-white truncate ${lv > 0 ? "text-[#00f5d4]" : ""}">${def.name}</span>
          <span class="text-[7.5px] text-[#b59ce6] leading-tight">${def.desc}${extraStatus}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button data-perm-down="${def.id}" class="w-5 h-5 rounded bg-[#281058] hover:bg-[#ff1493] text-white font-black text-[10px] flex items-center justify-center cursor-pointer transition select-none leading-none border border-[#00f5d4]/40">-</button>
          <span class="w-10 text-center font-mono font-bold text-[9.5px] text-[#e6ff00] tabular-nums">Lv.${lv}/${def.maxLv}</span>
          <button data-perm-up="${def.id}" class="w-5 h-5 rounded bg-[#281058] hover:bg-[#00f5d4] hover:text-black text-white font-black text-[10px] flex items-center justify-center cursor-pointer transition select-none leading-none border border-[#00f5d4]/40">+</button>
        </div>
      `;
      const btnDown = row.querySelector(`[data-perm-down="${def.id}"]`);
      if (btnDown) {
        btnDown.addEventListener("click", (e) => {
          e.stopPropagation();
          Systems.setDebugPermLevel(def.id, lv - 1, state);
          if (window.sfx && window.sfx.flipperClick) window.sfx.flipperClick();
          this.renderPermUpgrades(state);
        });
      }
      const btnUp = row.querySelector(`[data-perm-up="${def.id}"]`);
      if (btnUp) {
        btnUp.addEventListener("click", (e) => {
          e.stopPropagation();
          Systems.setDebugPermLevel(def.id, lv + 1, state);
          if (window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
          this.renderPermUpgrades(state);
        });
      }
      permContainer.appendChild(row);
    });
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
    const LEFT_FLIP_CODES = new Set(["KeyZ", "ShiftLeft"]);
    const RIGHT_FLIP_CODES = new Set(["KeyV", "ShiftRight"]);
    const PLUNGER_CODES = new Set(["KeyC", "Space"]);
    const heldLeftKeys = new Set();
    const heldRightKeys = new Set();
    const heldPlungerKeys = new Set();

    const releaseAllHeldKeys = () => {
      if (heldLeftKeys.size > 0) {
        heldLeftKeys.clear();
        setLeft(false);
      }
      if (heldRightKeys.size > 0) {
        heldRightKeys.clear();
        setRight(false);
      }
      if (heldPlungerKeys.size > 0) {
        heldPlungerKeys.clear();
        engine.releasePlunger();
      }
    };

    const isShown = (id) => {
      const el = document.getElementById(id);
      return !!(el && !el.classList.contains("hidden"));
    };

    window.addEventListener("blur", releaseAllHeldKeys);

    window.addEventListener("keydown", e => {
      if (e.code === "Escape") {
        if (e.repeat) return;
        e.preventDefault();
        const menuModal = document.getElementById("menuModal");
        const rankingModal = document.getElementById("rankingModal");
        if (window.GameFlow && window.GameFlow.attract && window.GameFlow.attract.active) {
          window.GameFlow.stopAttractDemo();
        } else if (menuModal && !menuModal.classList.contains("hidden")) {
          closeMenu();
        } else if (rankingModal && !rankingModal.classList.contains("hidden")) {
          if (window.GameFlow && window.GameFlow.closeRankingModal) {
            window.GameFlow.closeRankingModal();
          }
        } else {
          releaseAllHeldKeys();
          openMenu();
        }
        return;
      }

      if (e.repeat) return;

      // Dynamic Z / X / C / V mapping for non-gameplay bottom decks
      if (isShown("menuControlsBar")) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomMenuClose")?.click();
        }
        return;
      }

      if (isShown("rankingModal") || isShown("gameOverModal")) {
        return;
      }

      if (isShown("endingControlsBar")) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomEndingAction")?.click();
        }
        return;
      }

      if (isShown("titleControlsBar")) {
        if (e.code === "KeyZ") {
          e.preventDefault();
          document.getElementById("btnTitleSettings")?.click();
        } else if (e.code === "KeyX" || e.code === "KeyC") {
          e.preventDefault();
          document.getElementById("btnTitleStart")?.click();
        } else if (e.code === "KeyV") {
          e.preventDefault();
          document.getElementById("btnTitleRanking")?.click();
        }
        return;
      }

      // Gameplay controls (#gameControlsBar)
      if (!isShown("gameControlsBar")) return;

      if (LEFT_FLIP_CODES.has(e.code)) {
        e.preventDefault();
        const wasEmpty = heldLeftKeys.size === 0;
        heldLeftKeys.add(e.code);
        if (wasEmpty) setLeft(true);
      } else if (RIGHT_FLIP_CODES.has(e.code)) {
        e.preventDefault();
        const wasEmpty = heldRightKeys.size === 0;
        heldRightKeys.add(e.code);
        if (wasEmpty) setRight(true);
      } else if (PLUNGER_CODES.has(e.code)) {
        e.preventDefault();
        const wasEmpty = heldPlungerKeys.size === 0;
        heldPlungerKeys.add(e.code);
        if (wasEmpty) engine.startPlungerPull();
      } else if (e.code === "KeyX") {
        e.preventDefault();
        Physics.triggerNudge(engine.state);
      } else if (e.code === "KeyB") {
        e.preventDefault();
        Systems.triggerBurst(engine.state);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, 0, -1, 1.0);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, 0, 1, 1.0);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, -1, 0, 1.0);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        Physics.triggerDirectionalNudge(engine.state, 1, 0, 1.0);
      }
    });

    window.addEventListener("keyup", e => {
      if (LEFT_FLIP_CODES.has(e.code) && heldLeftKeys.delete(e.code)) {
        if (heldLeftKeys.size === 0) setLeft(false);
      } else if (RIGHT_FLIP_CODES.has(e.code) && heldRightKeys.delete(e.code)) {
        if (heldRightKeys.size === 0) setRight(false);
      } else if (PLUNGER_CODES.has(e.code) && heldPlungerKeys.delete(e.code)) {
        if (heldPlungerKeys.size === 0) engine.releasePlunger();
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
    let cachedCanvasRect = null;
    let cachedAreaRect = null;
    const refreshPlayfieldRects = () => {
      cachedCanvasRect = engine.canvas.getBoundingClientRect();
      cachedAreaRect = playfieldEl.getBoundingClientRect();
    };
    window.addEventListener("resize", () => {
      cachedCanvasRect = null;
      cachedAreaRect = null;
    }, { passive: true });

    playfieldEl.addEventListener("pointerdown", e => {
      e.preventDefault();
      try { playfieldEl.setPointerCapture(e.pointerId); } catch (_) {}

      refreshPlayfieldRects();
      const canvasRect = cachedCanvasRect;
      const canvasX = (e.clientX - canvasRect.left) * (engine.W / canvasRect.width);
      const canvasY = (e.clientY - canvasRect.top) * (engine.H / canvasRect.height);

      if (engine.state.plunger.waitingForLaunch && canvasX > 370 && canvasY > 440) {
        activeTouches.set(e.pointerId, { type: "plunger", startY: canvasY, lastY: canvasY });
        engine.state.plunger.pulling = true;
        return;
      }

      const areaRect = cachedAreaRect;
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

      if (!cachedCanvasRect || !cachedAreaRect) refreshPlayfieldRects();

      if (t.type === "plunger") {
        const canvasRect = cachedCanvasRect;
        const y = (e.clientY - canvasRect.top) * (engine.H / canvasRect.height);
        const dragDist = Math.max(0, y - t.startY);
        engine.state.plunger.power = Math.min(100, (dragDist / 38) * 100);
        t.lastY = y;
      } else {
        const areaRect = cachedAreaRect;
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
    UI.openMenu = (st = null) => {
      const state = st || engine.state;
      if (!menuModal) return;
      if (window.sfx) window.sfx.flipperClick();
      if (window.GameFlow && window.GameFlow.stopAttractDemo) {
        window.GameFlow.stopAttractDemo();
      }
      const isInGame = state && !state.inTitle;
      const inGameActions = document.getElementById("menuInGameActions");
      if (inGameActions) {
        if (isInGame) inGameActions.classList.remove("hidden");
        else inGameActions.classList.add("hidden");
      }
      UI.isMenuOpen = true;
      UI.updateScreenMode(state);
      UI.renderPermUpgrades(state);
      updateDebugHudUI(window.Systems && Systems.isDebugMenuEnabled());
      updateNudgeJiggleUI(window.Systems && Systems.isNudgeJiggleEnabled());
      updateAudioUI(window.Systems ? Systems.isSfxEnabled() : true);

      UI.openModal(menuModal);
    };

    UI.closeMenu = (st = null) => {
      const state = st || engine.state;
      if (!menuModal) return;
      if (window.sfx) window.sfx.flipperClick();
      UI.isMenuOpen = false;
      UI.updateScreenMode(state);
      UI.closeModal(menuModal);
    };

    const openMenu = () => UI.openMenu(engine.state);
    const closeMenu = () => UI.closeMenu(engine.state);

    const btnTitleSettings = document.getElementById("btnTitleSettings");
    if (btnTitleSettings) btnTitleSettings.addEventListener("click", openMenu);

    const btnHudDebugSettings = document.getElementById("btnHudDebugSettings");
    if (btnHudDebugSettings) btnHudDebugSettings.addEventListener("click", openMenu);

    const btnBottomMenuClose = document.getElementById("btnBottomMenuClose");
    if (btnBottomMenuClose) btnBottomMenuClose.addEventListener("click", closeMenu);

    const btnReturnToTitleFromMenu = document.getElementById("btnReturnToTitleFromMenu");
    if (btnReturnToTitleFromMenu) {
      btnReturnToTitleFromMenu.addEventListener("click", () => {
        closeMenu();
        if (window.GameFlow && window.GameFlow.showTitle) {
          window.GameFlow.showTitle();
        }
      });
    }

    // Stage Selection (Header Button, Menu Modal Stage Cards)
    const loadStageFromUI = (stage) => {
      if (!stage) return;
      if (window.sfx) window.sfx.capsuleCatch();
      if (window.GameFlow && window.GameFlow.hideAllModals) {
        window.GameFlow.hideAllModals();
      }
      const stageNum =
        stage.id === "stage5" ? 5 :
        stage.id === "stage4" ? 4 :
        stage.id === "stage3" ? 3 :
        stage.id === "stage2" ? 2 : 1;
      engine.startPracticeStage(stageNum);
      closeMenu();
    };

    const btnHeaderStage = document.getElementById("btnHeaderStage");
    if (btnHeaderStage) {
      btnHeaderStage.addEventListener("click", () => {
        const curId = engine.currentStage ? engine.currentStage.id : "stage1";
        const next =
          curId === "stage1" ? window.Stage2 :
          curId === "stage2" ? window.Stage3 :
          curId === "stage3" ? (window.Stage4 || window.Stage1) :
          curId === "stage4" ? (window.Stage5 || window.Stage1) :
          window.Stage1;
        loadStageFromUI(next);
      });
    }

    const btnSelS1 = document.getElementById("btnSelectStage1");
    if (btnSelS1) btnSelS1.addEventListener("click", () => loadStageFromUI(window.Stage1));
    const btnSelS2 = document.getElementById("btnSelectStage2");
    if (btnSelS2) btnSelS2.addEventListener("click", () => loadStageFromUI(window.Stage2));
    const btnSelS3 = document.getElementById("btnSelectStage3");
    if (btnSelS3) btnSelS3.addEventListener("click", () => loadStageFromUI(window.Stage3));
    const btnSelS4 = document.getElementById("btnSelectStage4");
    if (btnSelS4) btnSelS4.addEventListener("click", () => loadStageFromUI(window.Stage4));
    const btnSelS5 = document.getElementById("btnSelectStage5");
    if (btnSelS5) btnSelS5.addEventListener("click", () => loadStageFromUI(window.Stage5));
    const btnSelEnding = document.getElementById("btnSelectEnding");
    if (btnSelEnding) {
      btnSelEnding.addEventListener("click", () => {
        if (window.sfx && window.sfx.ensureInit) window.sfx.ensureInit();
        const menuModal = document.getElementById("menuModal");
        if (menuModal) UI.closeModal(menuModal);
        if (window.GameFlow && window.GameFlow.startEnding) {
          GameFlow.startEnding(engine.state);
        }
      });
    }

    // Permanent Upgrades Quick Presets
    const btnPermAllReset = document.getElementById("btnPermAllReset");
    if (btnPermAllReset) {
      btnPermAllReset.addEventListener("click", () => {
        if (!window.Systems) return;
        Systems.resetDebugPermLevels(engine.state);
        if (window.sfx && window.sfx.flipperClick) window.sfx.flipperClick();
        UI.renderPermUpgrades(engine.state);
      });
    }
    const btnPermAllMax = document.getElementById("btnPermAllMax");
    if (btnPermAllMax) {
      btnPermAllMax.addEventListener("click", () => {
        if (!window.Systems) return;
        Systems.maxAllDebugPermLevels(engine.state);
        if (window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
        UI.renderPermUpgrades(engine.state);
      });
    }

    // Audio Mute / Unmute Toggle (Persisted via Systems)
    const updateAudioUI = (enabled) => {
      const btnAudio = document.getElementById("btnAudio");
      if (btnAudio) {
        btnAudio.textContent = enabled ? "SFX:ON" : "SFX:MUTE";
        btnAudio.className = enabled 
          ? "px-1.5 py-0.5 rounded bg-[#281058] hover:bg-[#3a187c] text-[#e6ff00] border border-[#e6ff00]/50 text-[9px] sm:text-[10px] cursor-pointer transition"
          : "px-1.5 py-0.5 rounded bg-[#180828] text-gray-400 border border-gray-600 text-[9px] sm:text-[10px] cursor-pointer transition";
      }
      const txtMenuStatus = document.getElementById("txtMenuAudioStatus");
      if (txtMenuStatus) txtMenuStatus.textContent = enabled ? "SFX: ON" : "SFX: MUTE";
      const txtMenuIcon = document.getElementById("txtMenuAudioIcon");
      if (txtMenuIcon) txtMenuIcon.textContent = enabled ? "🔊" : "🔇";
    };

    const toggleAudio = () => {
      if (!window.Systems) return;
      const isEnabled = Systems.isSfxEnabled();
      const nextState = !isEnabled;
      Systems.setSfxEnabled(nextState);
      updateAudioUI(nextState);
      if (nextState && window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
    };

    const btnAudio = document.getElementById("btnAudio");
    if (btnAudio) btnAudio.addEventListener("click", toggleAudio);

    const btnMenuAudio = document.getElementById("btnMenuToggleAudio");
    if (btnMenuAudio) btnMenuAudio.addEventListener("click", toggleAudio);

    updateAudioUI(window.Systems ? Systems.isSfxEnabled() : true);

    // Nudge Body Jiggle Setting Toggle
    const updateNudgeJiggleUI = (enabled) => {
      const btn = document.getElementById("btnMenuToggleNudgeJiggle");
      const icon = document.getElementById("txtMenuNudgeJiggleIcon");
      const status = document.getElementById("txtMenuNudgeJiggleStatus");
      if (icon) icon.textContent = enabled ? "💓" : "🔒";
      if (status) status.textContent = enabled ? "ON" : "OFF";
      if (btn) {
        btn.className = enabled
          ? "px-3 py-1.5 rounded-lg bg-[#36092f] hover:bg-[#520e47] border border-[#ff66b2]/80 text-[#ff66b2] font-bold text-[10.5px] flex items-center gap-1.5 cursor-pointer transition shrink-0"
          : "px-3 py-1.5 rounded-lg bg-[#180828] hover:bg-[#281048] border border-gray-600 text-gray-400 font-bold text-[10.5px] flex items-center gap-1.5 cursor-pointer transition shrink-0";
      }
    };

    const initialJiggle = window.Systems && typeof Systems.isNudgeJiggleEnabled === "function"
      ? Systems.isNudgeJiggleEnabled()
      : false;
    updateNudgeJiggleUI(initialJiggle);

    const btnNudgeJiggle = document.getElementById("btnMenuToggleNudgeJiggle");
    if (btnNudgeJiggle) {
      btnNudgeJiggle.addEventListener("click", () => {
        if (!window.Systems) return;
        const current = Systems.isNudgeJiggleEnabled();
        const next = !current;
        Systems.setNudgeJiggle(next);
        updateNudgeJiggleUI(next);
        if (next && window.sfx) {
          if (typeof window.sfx.softPuru === "function") {
            window.sfx.softPuru();
          } else if (typeof window.sfx.capsuleCatch === "function") {
            window.sfx.capsuleCatch();
          }
        }
      });
    }

    // In-Game Debug HUD Icon Toggle
    const updateDebugHudUI = (enabled) => {
      const btn = document.getElementById("btnMenuToggleDebugHud");
      const icon = document.getElementById("txtMenuDebugHudIcon");
      const status = document.getElementById("txtMenuDebugHudStatus");
      if (icon) icon.textContent = enabled ? "🛠️" : "🔒";
      if (status) status.textContent = enabled ? "ON" : "OFF";
      if (btn) {
        btn.className = enabled
          ? "px-3 py-1.5 rounded-lg bg-[#3d2400] hover:bg-[#593500] border border-[#e6ff00]/80 text-[#e6ff00] font-bold text-[10.5px] flex items-center gap-1.5 cursor-pointer transition shrink-0"
          : "px-3 py-1.5 rounded-lg bg-[#180828] hover:bg-[#281048] border border-gray-600 text-gray-400 font-bold text-[10.5px] flex items-center gap-1.5 cursor-pointer transition shrink-0";
      }
      const btnHudDebug = document.getElementById("btnHudDebugSettings");
      if (btnHudDebug) {
        const inGame = engine.state && !engine.state.inTitle;
        if (inGame && enabled) {
          btnHudDebug.classList.remove("hidden");
          btnHudDebug.classList.add("flex");
        } else {
          btnHudDebug.classList.add("hidden");
          btnHudDebug.classList.remove("flex");
        }
      }
    };
    updateDebugHudUI(window.Systems && Systems.isDebugMenuEnabled());

    const btnToggleDebugHud = document.getElementById("btnMenuToggleDebugHud");
    if (btnToggleDebugHud) {
      btnToggleDebugHud.addEventListener("click", () => {
        if (!window.Systems) return;
        const current = Systems.isDebugMenuEnabled();
        const next = !current;
        Systems.setDebugMenuEnabled(next);
        updateDebugHudUI(next);
        if (next && window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
      });
    }

    this.initClearModal(engine);
    this.initDebugControls(engine);
  },

  initClearModal(engine) {
    const modal = document.getElementById("clearModal");
    if (!modal) return;

    const replayBtn = document.getElementById("btnClearReplay");
    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        this.closeModal(modal);
        const curIdx = (engine.state && engine.state.stageIndex) || 1;
        if (engine.state && engine.state.gameMode === "practice") {
          engine.startPracticeStage(curIdx);
        } else {
          engine.startArcadeCampaign();
        }
      });
    }

    const nextBtn = document.getElementById("btnClearNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this.closeModal(modal);

        const curId = engine.currentStage ? engine.currentStage.id : "stage1";
        if (curId === "stage5") {
          if (window.GameFlow && window.GameFlow.startEnding) {
            GameFlow.startEnding(engine.state);
          }
          return;
        }

        let chosenRelic = "radar";
        const selectedBtn = document.querySelector(".relic-btn.border-\\[\\#e6ff00\\]");
        if (selectedBtn && selectedBtn.dataset.relic) {
          chosenRelic = selectedBtn.dataset.relic;
        }
        engine.advanceToNextStage(chosenRelic);
      });
    }

    document.querySelectorAll(".relic-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".relic-btn").forEach(b => b.classList.remove("border-[#e6ff00]", "bg-[#ff1493]/40"));
        btn.classList.add("border-[#e6ff00]", "bg-[#ff1493]/40");
        const title = btn.querySelector(".font-bold") ? btn.querySelector(".font-bold").textContent : "パーツ";
        this.showCutin(`⚙️【パーツ換装】<br>${title} を装着！`, 160);
      });
    });
  },

  initDebugControls(engine) {
    const closeMenuIfInGame = () => {
      if (engine.state && !engine.state.inTitle && typeof this.closeMenu === "function") {
        this.closeMenu(engine.state);
      }
    };

    const dbgDropPerm = document.getElementById("dbgDropPerm");
    if (dbgDropPerm) dbgDropPerm.addEventListener("click", () => {
      closeMenuIfInGame();
      Systems.spawnFloatingCapsule(engine.state, null, "perm");
    });

    const dbgDropBuff = document.getElementById("dbgDropBuff");
    if (dbgDropBuff) dbgDropBuff.addEventListener("click", () => {
      closeMenuIfInGame();
      Systems.spawnFloatingCapsule(engine.state, null, "buff");
    });

    const dbgPuruTest = document.getElementById("dbgPuruTest");
    if (dbgPuruTest) dbgPuruTest.addEventListener("click", () => {
      closeMenuIfInGame();
      const cur = engine.currentStage;
      if (cur && typeof cur.triggerDebugJiggle === "function") {
        cur.triggerDebugJiggle(engine.state);
      }
    });

    const dbgMultiball = document.getElementById("dbgMultiball");
    if (dbgMultiball) dbgMultiball.addEventListener("click", () => {
      closeMenuIfInGame();
      Systems.startFeverMode(engine.state);
    });

    const dbgFaceAnim = document.getElementById("dbgFaceAnim");
    if (dbgFaceAnim) dbgFaceAnim.addEventListener("click", () => {
      closeMenuIfInGame();
      if (window.sfx) window.sfx.capsuleCatch();
      const modes = ["wink", "open_blush", "shock", "wince", "blink", "talk"];
      window._faceIdx = ((window._faceIdx || 0) + 1) % modes.length;
      const next = modes[window._faceIdx];
      engine.state.boss.expression = next;
      engine.state.boss.expressionTimer = 90;
      if (next === "wink") engine.state.boss.winkTimer = 60;
      if (next === "blink") engine.state.boss.blinkTimer = 6;
      if (next === "talk") engine.state.boss.talkTimer = 90;
      this.updateHUD(engine.state);
      this.showCutin(`👁【表情テスト】: ${next}`, 90);
    });

    const dbgStageToggle = document.getElementById("dbgStageToggle");
    if (dbgStageToggle) dbgStageToggle.addEventListener("click", () => {
      if (window.sfx) window.sfx.flipperClick();
      const currentIdx = (engine.state && engine.state.stageIndex) || 1;
      const total = engine.STAGE_REGISTRY ? engine.STAGE_REGISTRY.length : 5;
      const nextIdx = (currentIdx % total) + 1;
      if (window.GameFlow && GameFlow.hideAllModals) GameFlow.hideAllModals();
      engine.startPracticeStage(nextIdx);
    });
  },

  presentStageClearModal(state, cfg = {}) {
    const stageIdx = state.stageIndex || 1;
    const bal = (window.Systems && Systems.BALANCE) || {};
    const clearBonus = (bal.CLEAR_BONUS_BASE ?? 50000) * stageIdx;
    const isNoMiss = (state.stageMisses || 0) === 0;
    const noMissBonus = isNoMiss ? (bal.NO_MISS_BONUS_BASE ?? 100000) * stageIdx : 0;
    const totalBonus = clearBonus + noMissBonus;

    if (!state._clearBonusAwarded) {
      state._clearBonusAwarded = true;
      state.score = (state.score || 0) + totalBonus;
      state.peakScore = Math.max(state.peakScore || 0, state.score);
    }

    const modal = document.getElementById("clearModal");
    if (!modal) return;

    // Update clear bonus banner
    const bonusText = document.getElementById("clearBonusText");
    if (bonusText) {
      if (isNoMiss) {
        bonusText.innerHTML = `+${clearBonus.toLocaleString()} <span class="text-[#e6ff00]">/ 👑NO-MISS: +${noMissBonus.toLocaleString()}</span>`;
      } else {
        bonusText.textContent = `+${clearBonus.toLocaleString()} pts`;
      }
    }

    if (cfg.bossDisplayName) {
      const nameEl = modal.querySelector(".text-\\[\\#ff66b2\\]");
      if (nameEl) nameEl.textContent = cfg.bossDisplayName;
    }
    if (cfg.defeatQuoteHtml) {
      const quoteEl = modal.querySelector("p");
      if (quoteEl) quoteEl.innerHTML = cfg.defeatQuoteHtml;
    }

    const relicSection = document.getElementById("relicSection");
    const nextBtn = document.getElementById("btnClearNext");

    const isStage5 = stageIdx === 5 || (window.currentStage && window.currentStage.id === "stage5");
    if (isStage5) {
      if (relicSection) relicSection.classList.add("hidden");
      if (nextBtn) {
        nextBtn.innerHTML = `⚡ 統合司令AIの緊急通信を受信 (ENDING) ▶`;
        nextBtn.className = "flex-1 py-1.5 rounded bg-gradient-to-r from-[#00f5e8] via-[#34ff8a] to-[#e6ff00] active:scale-95 text-black font-extrabold text-[10px] cursor-pointer transition shadow hover:brightness-110 animate-pulse";
      }
    } else {
      if (relicSection) relicSection.classList.remove("hidden");
      if (nextBtn) {
        nextBtn.innerHTML = `次のステージへ進む ▶`;
        nextBtn.className = "flex-1 py-1.5 rounded bg-gradient-to-r from-[#ff1493]/90 to-[#e6ff00]/90 active:scale-95 text-black font-extrabold text-[10px] cursor-pointer transition shadow hover:brightness-110";
      }
    }

    this.openModal(modal);

    this.updateHUD(state);
  }
};

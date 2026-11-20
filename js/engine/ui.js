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
  isDeckOpen: false,
  isRankingOpen: false,
  isStage5ClearOpen: false,

  updateScreenMode(state) {
    const isTitle = !!(state && state.inTitle);
    const isEnding = !!(state && state.inEnding);
    const isGameOver = !!(state && state.gameOver);
    const isAttract = !!(window.GameFlow && GameFlow.attract && GameFlow.attract.active);
    const isFullscreenMode = isTitle || isEnding;
    const hudBar = this.el("inGameHudBar");
    const buffBar = this.el("inGameBuffBar");
    const titleControls = this.el("titleControlsBar");
    const gameControls = this.el("gameControlsBar");
    const menuControls = this.el("menuControlsBar");
    const deckControls = this.el("deckControlsBar");
    const rankingControls = this.el("rankingControlsBar");
    const gameOverControls = this.el("gameOverControlsBar");
    const attractControls = this.el("attractControlsBar");
    const clearEndingControls = this.el("clearEndingControlsBar");
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

    // Bottom Controls Deck Switcher (mutually exclusive 4-col / full-span decks)
    const activeDeck = this.isMenuOpen
      ? "menu"
      : (this.isDeckOpen
        ? "deck"
        : (this.isRankingOpen
          ? "ranking"
          : (isGameOver
            ? "gameover"
            : (isAttract
              ? "attract"
              : (this.isStage5ClearOpen
                ? "clearEnding"
                : (isEnding
                  ? "ending"
                  : (isTitle ? "title" : "game")))))));

    const toggleBlock = (el, on) => {
      if (!el) return;
      el.classList.toggle("hidden", !on);
      el.classList.toggle("block", on);
    };
    const toggleGrid = (el, on) => {
      if (!el) return;
      el.classList.toggle("hidden", !on);
      el.classList.toggle("grid", on);
    };

    toggleBlock(menuControls, activeDeck === "menu");
    toggleBlock(deckControls, activeDeck === "deck");
    toggleBlock(rankingControls, activeDeck === "ranking");
    toggleBlock(gameOverControls, activeDeck === "gameover");
    toggleBlock(attractControls, activeDeck === "attract");
    toggleBlock(clearEndingControls, activeDeck === "clearEnding");
    toggleBlock(endingControls, activeDeck === "ending");
    toggleGrid(titleControls, activeDeck === "title");
    toggleGrid(gameControls, activeDeck === "game");
  },

  updatePlungerHint(state) {
    const pBtn = this.el("btnPlunger");
    const pHint = this.el("plungerBtnHint");
    if (!pBtn || !pHint) return;
    const hasBallInLane = !!(state.balls && state.balls.some(b => (b.inShooterLane || b.x >= 380) && b.y > 520));
    if (hasBallInLane || state.plunger.pulling) {
      if (pBtn._lastWaiting !== true) {
        pBtn._lastWaiting = true;
        pBtn.classList.remove("opacity-40", "grayscale");
        pBtn.classList.add("cursor-pointer");
      }
      if (state.plunger.pulling) {
        this.setText(pHint, `POWER ${Math.round(state.plunger.power)}%`);
        this.setClass(pHint, "text-[9px] text-[#e6ff00] font-bold leading-none mt-0.5 animate-pulse");
      } else {
        this.setText(pHint, t("controls.plungerReady"));
        this.setClass(pHint, "text-[9px] text-[#00f5d4] leading-none mt-0.5");
      }
    } else {
      if (pBtn._lastWaiting !== false) {
        pBtn._lastWaiting = false;
        pBtn.classList.add("opacity-40", "grayscale");
        pBtn.classList.remove("cursor-pointer");
      }
      this.setText(pHint, t("controls.plungerLaunched"));
      this.setClass(pHint, "text-[9px] text-gray-400 leading-none mt-0.5");
    }
  },

  updateHUD(state) {
    if (window.GameEngine && GameEngine._inStepPhysics && state) {
      state._hudDirty = true;
      return;
    }
    this.updateScreenMode(state);
    const stTimer = (window.ScoreTable && ScoreTable.stageTimer) || { LIMIT_FRAMES: 18000, WARN_YELLOW_FRAMES: 3600, WARN_RED_FRAMES: 1800 };
    const remFrames = stTimer.LIMIT_FRAMES - (state.stagePlayFrames || 0);
    const isOvertime = remFrames <= 0 && !state.stageCleared;

    this.setText("hudScore", state.score.toLocaleString());
    this.setClass(
      "hudScore",
      isOvertime
        ? "text-[11px] sm:text-xs font-black text-[#ff0055] tabular-nums tracking-tight whitespace-nowrap"
        : "text-[11px] sm:text-xs font-black text-white tabular-nums tracking-tight whitespace-nowrap"
    );

    // Stage 5:00 Countdown / Overtime Curse HUD
    const hudTimer = this.el("hudTimer");
    const dtStageTimer = this.el("dtStageTimer");
    if (remFrames > 0) {
      const totalSec = Math.ceil(remFrames / 60);
      const mm = Math.floor(totalSec / 60);
      const ss = String(totalSec % 60).padStart(2, "0");
      const timeTxt = `${mm}:${ss}`;
      if (hudTimer) {
        this.setText(hudTimer, `⏱${timeTxt}`);
        if (remFrames <= stTimer.WARN_RED_FRAMES) {
          this.setClass(hudTimer, "px-1 py-0.5 rounded text-[8.5px] font-mono font-black tabular-nums text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055] whitespace-nowrap shrink-0 animate-pulse");
        } else if (remFrames <= stTimer.WARN_YELLOW_FRAMES) {
          this.setClass(hudTimer, "px-1 py-0.5 rounded text-[8.5px] font-mono font-black tabular-nums text-[#e6ff00] bg-[#e6ff00]/15 border border-[#e6ff00]/70 whitespace-nowrap shrink-0");
        } else {
          this.setClass(hudTimer, "px-1 py-0.5 rounded text-[8.5px] font-mono font-black tabular-nums text-[#00f5d4] bg-[#00f5d4]/15 border border-[#00f5d4]/60 whitespace-nowrap shrink-0");
        }
      }
      if (dtStageTimer) {
        this.setText(dtStageTimer, timeTxt);
        this.setClass(dtStageTimer, remFrames <= stTimer.WARN_RED_FRAMES ? "font-mono font-black tabular-nums text-[#ff0055] animate-pulse" : (remFrames <= stTimer.WARN_YELLOW_FRAMES ? "font-mono font-black tabular-nums text-[#e6ff00]" : "font-mono font-black tabular-nums text-[#00f5d4]"));
      }
    } else {
      const overSec = Math.floor((-remFrames) / 60);
      const mm = Math.floor(overSec / 60);
      const ss = String(overSec % 60).padStart(2, "0");
      const overTxt = `-${mm}:${ss}`;
      if (hudTimer) {
        this.setText(hudTimer, `☠${overTxt}`);
        this.setClass(hudTimer, "px-1 py-0.5 rounded text-[8.5px] font-mono font-black tabular-nums text-[#ff0055] bg-[#ff0055]/25 border border-[#ff0055] whitespace-nowrap shrink-0 animate-pulse");
      }
      if (dtStageTimer) {
        this.setText(dtStageTimer, `☠️OVER (${overTxt})`);
        this.setClass(dtStageTimer, "font-mono font-black tabular-nums text-[#ff0055] animate-pulse");
      }
    }

    let targetDesc = t("ui.defaultTarget");
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
        this.setText(hudShield, "🛡️");
        this.setClass(hudShield, "px-1 py-0.5 rounded text-[8px] font-extrabold text-[#00f5d4] bg-[#00f5d4]/15 border border-[#00f5d4]/60 tracking-wider whitespace-nowrap shrink-0");
      } else {
        this.setText(hudShield, "🚨0");
        this.setClass(hudShield, "px-1 py-0.5 rounded text-[8px] font-extrabold text-[#ff0055] bg-[#ff0055]/20 border border-[#ff0055] tracking-wider whitespace-nowrap shrink-0 animate-pulse");
      }
    }
    const hudMisses = this.el("hudMisses");
    if (hudMisses) {
      this.setText(hudMisses, `MISS:${state.stageMisses || 0}`);
    }

    // Buff Slots & Live BURST Hand Preview
    const slotsContainer = this.el("buffSlots");
    if (slotsContainer && state.keptBuffs) {
      const lang = (window.I18N && I18N.lang) || "ja";
      const buffKey = `${lang}|` + state.keptBuffs.map(slot => slot ? `${slot.id}:${slot.tier}` : "empty").join("|");
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

    const btnBurst = this.el("btnBurst");
    const btnBurstPreview = this.el("btnBurstPreview");
    if (btnBurst && window.Systems && typeof Systems.evaluateBurstHand === "function") {
      const evalRes = Systems.evaluateBurstHand(state);
      if (evalRes.count > 0) {
        let handTag = "";
        if (evalRes.handType === "full_drive") handTag = " FULL!";
        else if (evalRes.handType === "overclock") handTag = " OC!";
        else if (evalRes.handType === "trinity") handTag = " TRI!";
        if (btnBurstPreview) this.setText(btnBurstPreview, `×${evalRes.mult.toFixed(1)}${handTag}`);
        btnBurst.classList.remove("opacity-50");
      } else {
        if (btnBurstPreview) this.setText(btnBurstPreview, "---");
        btnBurst.classList.add("opacity-50");
      }
    }

    this.renderOwnedRelics(state);

    // Permanent Upgrades List (Rendered dynamically when menu is open)
    if (this.isMenuOpen && state.perm && window.Systems && Systems.PERM_DEFS) {
      const permKey = this.getPermKey(state);
      if (this._lastPermKey !== permKey) {
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

  renderOwnedRelics(state) {
    if (!state || !window.Systems || !Systems.RELIC_DEFS) return;
    const lang = (window.I18N && I18N.lang) || "ja";
    const relics = state.relics || {};
    const loadout = typeof Systems.getLoadout === "function" ? Systems.getLoadout() : [];
    const entries = Object.keys(Systems.RELIC_DEFS)
      .filter(id => (relics[id] || 0) > 0)
      .map(id => [id, relics[id]]);
    const key = `${lang}|` + entries.map(([k, v]) => `${k}:${v}`).join("|") + `|L:${loadout.join(",")}|W:${state._noaBitWarpCharges || 0}`;
    if (this._lastRelicHudKey === key) return;
    this._lastRelicHudKey = key;

    const hudBar = this.el("hudRelicBar");
    if (hudBar) {
      if (entries.length === 0) {
        hudBar.classList.add("hidden");
        hudBar.classList.remove("flex");
        hudBar.innerHTML = "";
      } else {
        hudBar.classList.remove("hidden");
        hudBar.classList.add("flex");
        hudBar.innerHTML = entries.map(([id, cnt]) => {
          const def = Systems.RELIC_DEFS[id];
          const stackTxt = cnt > 1 ? `×${cnt}` : "";
          const warpTxt = (id === "noa_bit" && (state._noaBitWarpCharges || 0) > 0) ? "★" : "";
          return `<span class="px-1.5 py-0.5 rounded bg-[#220a4a] border text-[8px] font-bold whitespace-nowrap shrink-0 leading-none" style="border-color:${def.color}; color:${def.color}" title="${def.desc}">${def.icon} ${def.short}${stackTxt}${warpTxt}</span>`;
        }).join("");
      }
    }

    const dtList = this.el("dtRelicsList");
    if (dtList) {
      let html = "";
      if (loadout.length > 0 && Systems.LOADOUT_DEFS) {
        const pills = loadout.map(id => {
          const m = Systems.LOADOUT_DEFS.find(x => x.id === id);
          return m ? `<span class="px-1 py-0.5 rounded bg-black/50 border border-[#00f5d4]/30 text-[8.5px] text-[#d6c4ff] whitespace-nowrap">${m.icon} ${m.name}</span>` : "";
        }).join("");
        html += `<div class="flex flex-wrap gap-1 pb-1 border-b border-white/10">${pills}</div>`;
      }
      if (entries.length === 0) {
        html += `<div class="text-[8.5px] text-gray-400 italic pt-0.5">${t("sidebar.noRelics")}</div>`;
      } else {
        html += entries.map(([id, cnt]) => {
          const def = Systems.RELIC_DEFS[id];
          const stackTxt = cnt > 1 ? ` ×${cnt}` : "";
          return `<div class="flex items-start justify-between gap-1 bg-black/35 rounded px-1.5 py-1 border" style="border-color:${def.color}55">
            <span class="font-bold text-[9px] leading-tight" style="color:${def.color}">${def.icon} ${def.name}${stackTxt}</span>
          </div>`;
        }).join("");
      }
      dtList.innerHTML = html;
    }
  },

  updateTitleDeckBadge() {
    const badge = document.getElementById("titleDeckCostBadge");
    if (!badge || !window.Systems || typeof Systems.getLoadoutCost !== "function") return;
    badge.textContent = `${Systems.getLoadoutCost()}/${Systems.LOADOUT_MAX_COST} COST`;
  },

  renderDeckModal() {
    const listEl = document.getElementById("deckModuleList");
    const costText = document.getElementById("deckCostText");
    const pipsEl = document.getElementById("deckCostPips");
    if (!listEl || !window.Systems || !Systems.LOADOUT_DEFS) return;

    const equipped = Systems.getLoadout();
    const cost = Systems.getLoadoutCost(equipped);
    const maxCost = Systems.LOADOUT_MAX_COST;

    if (costText) {
      costText.textContent = `${cost}/${maxCost}`;
    }
    if (pipsEl) {
      let pipsHtml = "";
      for (let i = 0; i < maxCost; i++) {
        pipsHtml += i < cost
          ? `<span class="w-2.5 h-2.5 rounded-sm bg-[#e6ff00] border border-white/70"></span>`
          : `<span class="w-2.5 h-2.5 rounded-sm bg-black/60 border border-[#00f5d4]/40"></span>`;
      }
      pipsEl.innerHTML = pipsHtml;
    }

    const prevScrollTop = listEl.scrollTop;
    const activeModId = (typeof document !== "undefined" && document.activeElement && document.activeElement.dataset && document.activeElement.dataset.modId) || null;
    listEl.innerHTML = "";
    Systems.LOADOUT_DEFS.forEach(def => {
      const isEq = equipped.includes(def.id);
      const cantAfford = !isEq && (cost + def.cost > maxCost);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.modId = def.id;
      btn.setAttribute("aria-pressed", isEq ? "true" : "false");
      if (cantAfford) btn.setAttribute("aria-disabled", "true");
      else btn.removeAttribute("aria-disabled");

      btn.className = "deck-card w-full p-2 rounded-xl bg-[#16063b]/80 hover:bg-[#230b4f] text-left cursor-pointer flex items-center justify-between gap-2";

      const eqBadge = `<span class="px-1.5 py-0.5 rounded bg-[#00f5d4] text-[#09031c] font-black text-[8px] tracking-wider leading-none whitespace-nowrap${isEq ? "" : " invisible"}"${isEq ? "" : ' aria-hidden="true"'}>${t("deck.equipped")}</span>`;
      const costBadge = `<span class="px-1.5 py-0.5 rounded bg-black/70 border border-[#e6ff00]/60 text-[#e6ff00] font-mono font-black text-[8.5px] leading-none whitespace-nowrap">COST ${def.cost}</span>`;

      btn.innerHTML = `
        <div class="flex items-start gap-2 min-w-0">
          <span class="text-base leading-none shrink-0 mt-0.5">${def.icon}</span>
          <div class="min-w-0">
            <div class="font-bold text-[10.5px] leading-tight truncate" style="color:${isEq ? def.color : "#ffffff"}">${def.name}</div>
            <div class="text-[8px] text-[#b59ce6] leading-snug mt-0.5">${def.desc}</div>
          </div>
        </div>
        <div class="flex flex-col items-end justify-center gap-1 shrink-0 min-w-[54px]">
          ${costBadge}
          ${eqBadge}
        </div>
      `;

      btn.addEventListener("click", () => {
        const res = Systems.toggleLoadoutModule(def.id);
        const hintEl = document.getElementById("deckStatusHint");
        if (!res.ok) {
          if (window.sfx && window.sfx.flipperClick) window.sfx.flipperClick();
          if (hintEl) hintEl.textContent = t("deck.overCostHint");
          return;
        }
        if (hintEl) hintEl.textContent = "";
        if (window.sfx) {
          if (res.equipped && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
          else if (window.sfx.flipperClick) window.sfx.flipperClick();
        }
        if (window.GameEngine && GameEngine.state && GameEngine.state.inTitle) {
          GameEngine.state = GameEngine.createInitialState();
        }
        this.renderDeckModal();
        this.updateTitleDeckBadge();
      });

      listEl.appendChild(btn);
    });
    listEl.scrollTop = prevScrollTop;
    if (activeModId && typeof listEl.querySelector === "function") {
      const nextBtn = listEl.querySelector(`button[data-mod-id="${activeModId}"]`);
      if (nextBtn && typeof nextBtn.focus === "function") {
        nextBtn.focus({ preventScroll: true });
      }
    }
  },

  renderRelicDraft(state) {
    const container = document.getElementById("relicOptions");
    if (!container || !window.Systems || !Systems.RELIC_DEFS) return;
    const ids = (state && state._currentRelicDraft) || Systems.rollRelicDraft(state);
    if (state) state._currentRelicDraft = ids;
    container.innerHTML = "";
    ids.forEach((id, idx) => {
      const def = Systems.RELIC_DEFS[id] || Systems.RELIC_DEFS.radar;
      const isBossSlot = idx === 0 && def.isBoss;
      const badgeHtml = isBossSlot
        ? `<span class="inline-block px-1 py-0.5 rounded bg-[#ff1493] text-white text-[7px] font-black tracking-wide leading-none">${t("clear.bossRelicBadge")}</span>`
        : `<span class="inline-block px-1 py-0.5 rounded bg-[#00f5d4]/20 text-[#00f5d4] border border-[#00f5d4]/40 text-[7px] font-bold leading-none">${t("clear.commonRelicBadge")}</span>`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.relic = def.id;
      btn.className = `relic-btn min-w-0 p-1 rounded bg-[#16063b]/65 hover:bg-[#ff1493]/50 active:scale-95 border border-[#00f5d4]/60 text-left cursor-pointer transition flex flex-col justify-between gap-0.5 ${isBossSlot ? "boss-relic-card" : ""}`;
      btn.innerHTML = `
        <div class="flex items-center justify-between gap-0.5">${badgeHtml}</div>
        <div class="flex items-center gap-0.5 min-w-0 font-bold text-[9px] leading-tight tracking-tight whitespace-nowrap drop-shadow-[0_1px_2px_rgba(0,0,0,1)]" style="color:${def.color}"><span class="shrink-0" aria-hidden="true">${def.icon}</span><span class="min-w-0 truncate">${def.name}</span></div>
        <div class="text-[7.5px] text-[#d6c4ff] leading-tight drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">${def.desc}</div>
      `;
      container.appendChild(btn);
    });
  },

  getPermKey(state) {
    const lang = (window.I18N && I18N.lang) || "ja";
    const inTitle = state && state.inTitle ? 1 : 0;
    const perm = (state && state.perm) || {};
    const defs = (window.Systems && Systems.PERM_DEFS) || {};
    return `${lang}|${inTitle}|` + Object.keys(defs).map(id => `${id}:${perm[id] || 0}`).join("|") +
      `|${perm.centerPostHP || 0}|${perm.kickbackL_charges || 0}|${perm.kickbackR_charges || 0}`;
  },

  renderPermUpgrades(state) {
    const permContainer = document.getElementById("permUpgradesList");
    if (!permContainer || !window.Systems || !Systems.PERM_DEFS) return;
    this._lastPermKey = this.getPermKey(state);
    const dp = (window.Systems && Systems.settings && Systems.settings.debugPerm) || {};
    permContainer.innerHTML = "";
    Object.values(Systems.PERM_DEFS).forEach(def => {
      const lv = (state && state.perm && typeof state.perm[def.id] === "number")
        ? state.perm[def.id]
        : (dp[def.id] || 0);
      let extraStatus = "";
      if (state && state.perm && !state.inTitle) {
        if (def.id === "centerPost") extraStatus = t("ui.permHp", { hp: state.perm.centerPostHP || 0 });
        if (def.id === "kickbackL") extraStatus = t("ui.permAmmo", { ammo: state.perm.kickbackL_charges || 0 });
        if (def.id === "kickbackR") extraStatus = t("ui.permAmmo", { ammo: state.perm.kickbackR_charges || 0 });
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
        const deckModal = document.getElementById("deckModal");
        const rankingModal = document.getElementById("rankingModal");
        const gameOverModal = document.getElementById("gameOverModal");
        if (window.GameFlow && window.GameFlow.attract && window.GameFlow.attract.active) {
          window.GameFlow.stopAttractDemo();
        } else if (deckModal && !deckModal.classList.contains("hidden")) {
          if (typeof UI.closeDeckModal === "function") UI.closeDeckModal(engine.state);
        } else if (menuModal && !menuModal.classList.contains("hidden")) {
          closeMenu();
        } else if (rankingModal && !rankingModal.classList.contains("hidden")) {
          if (window.GameFlow && window.GameFlow.closeRankingModal) {
            window.GameFlow.closeRankingModal();
          }
        } else if (gameOverModal && !gameOverModal.classList.contains("hidden")) {
          if (window.GameFlow && window.GameFlow.showTitle) {
            window.GameFlow.showTitle();
          }
        } else {
          releaseAllHeldKeys();
          openMenu();
        }
        return;
      }

      if (e.repeat) return;

      // Allow native <button> Space / Enter / Tab interactions inside #deckModal
      if (isShown("deckControlsBar")) {
        return;
      }

      // Dynamic Z / X / C / V / Space / Enter mapping for non-gameplay bottom decks
      if (isShown("menuControlsBar")) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV", "Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomMenuClose")?.click();
        }
        return;
      }

      if (isShown("rankingControlsBar") || isShown("rankingModal")) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV", "Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomRankingClose")?.click();
        }
        return;
      }

      if (isShown("gameOverControlsBar") || isShown("gameOverModal")) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV", "Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomGameOverTitle")?.click();
        }
        return;
      }

      if (isShown("attractControlsBar") || (window.GameFlow && GameFlow.attract && GameFlow.attract.active)) {
        if (["KeyZ", "KeyX", "KeyC", "KeyV", "Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomAttractTitle")?.click();
        }
        return;
      }

      if (isShown("endingControlsBar")) {
        const gf = window.GameFlow;
        const isUnregisteredAct3 = !!(gf && gf.ending && gf.ending.act === 3 && !gf.ending.registered);
        if (isUnregisteredAct3) {
          if (e.code === "Enter") {
            e.preventDefault();
            document.getElementById("btnBottomEndingAction")?.click();
          } else if (e.code === "Backspace") {
            e.preventDefault();
            gf.inputCallsignKey("BS");
          } else if (e.code === "Space") {
            e.preventDefault();
            gf.inputCallsignKey("SPC");
          } else if (/^Key([A-Z])$/.test(e.code)) {
            e.preventDefault();
            gf.inputCallsignKey(e.code.slice(3));
          } else if (/^Digit([0-9])$/.test(e.code)) {
            e.preventDefault();
            gf.inputCallsignKey(e.code.slice(5));
          } else if (e.code === "Minus") {
            e.preventDefault();
            gf.inputCallsignKey("-");
          }
        } else if (["KeyZ", "KeyX", "KeyC", "KeyV", "Space", "Enter"].includes(e.code)) {
          e.preventDefault();
          document.getElementById("btnBottomEndingAction")?.click();
        }
        return;
      }

      if (isShown("titleControlsBar")) {
        if (e.code === "KeyZ") {
          e.preventDefault();
          document.getElementById("btnTitleSettings")?.click();
        } else if (e.code === "KeyX") {
          e.preventDefault();
          document.getElementById("btnTitleDeck")?.click();
        } else if (e.code === "KeyC") {
          e.preventDefault();
          document.getElementById("btnTitleStart")?.click();
        } else if (e.code === "KeyV") {
          e.preventDefault();
          document.getElementById("btnTitleRanking")?.click();
        }
        return;
      }

      // Stage Clear Tally Skip via keyboard while animating (or advance Stage 5 to Ending once tally is done)
      if (isShown("clearModal")) {
        if (this._tallyState && !this._tallyState.done) {
          if (["Space", "Enter", "KeyZ", "KeyX", "KeyC", "KeyV"].includes(e.code)) {
            e.preventDefault();
            this.finishClearTallyImmediately();
            return;
          }
        } else if (isShown("clearEndingControlsBar")) {
          if (["Space", "Enter", "KeyZ", "KeyX", "KeyC", "KeyV"].includes(e.code)) {
            e.preventDefault();
            document.getElementById("btnClearNext")?.click();
            return;
          }
        }
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

      if (canvasX > 370 && canvasY > 440) {
        activeTouches.set(e.pointerId, { type: "plunger", startY: canvasY, lastY: canvasY });
        engine.startPlungerPull();
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
          UI.showCutin(t("ui.gameReset"), 140);
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
      if (typeof renderDebugAudioLog === "function") renderDebugAudioLog();

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

    // Pre-Sortie Deck Loadout Modal Open & Close
    const deckModal = document.getElementById("deckModal");
    UI.openDeckModal = (st = null) => {
      const state = st || engine.state;
      if (!deckModal) return;
      if (window.sfx) window.sfx.flipperClick();
      if (window.GameFlow && window.GameFlow.stopAttractDemo) {
        window.GameFlow.stopAttractDemo();
      }
      const titleModalEl = document.getElementById("titleModal");
      if (titleModalEl) titleModalEl.inert = true;
      const hintEl = document.getElementById("deckStatusHint");
      if (hintEl) hintEl.textContent = "";
      UI.isDeckOpen = true;
      UI.renderDeckModal();
      UI.updateScreenMode(state);
      UI.openModal(deckModal);
      deckModal.focus();
    };

    UI.closeDeckModal = (st = null) => {
      const state = st || engine.state;
      if (!deckModal) return;
      if (window.sfx) window.sfx.flipperClick();
      UI.isDeckOpen = false;
      const titleModalEl = document.getElementById("titleModal");
      if (titleModalEl) titleModalEl.inert = false;
      UI.updateScreenMode(state);
      UI.updateTitleDeckBadge();
      UI.closeModal(deckModal);
      document.getElementById("btnTitleDeck")?.focus();
    };

    const btnTitleDeck = document.getElementById("btnTitleDeck");
    if (btnTitleDeck) btnTitleDeck.addEventListener("click", () => UI.openDeckModal(engine.state));

    const btnBottomDeckClose = document.getElementById("btnBottomDeckClose");
    if (btnBottomDeckClose) btnBottomDeckClose.addEventListener("click", () => UI.closeDeckModal(engine.state));

    const btnDeckResetDefault = document.getElementById("btnDeckResetDefault");
    if (btnDeckResetDefault) {
      btnDeckResetDefault.addEventListener("click", () => {
        if (!window.Systems) return;
        Systems.resetLoadoutDefault();
        const hintEl = document.getElementById("deckStatusHint");
        if (hintEl) hintEl.textContent = "";
        if (window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
        if (engine.state && engine.state.inTitle) {
          engine.state = engine.createInitialState();
        }
        UI.renderDeckModal();
        UI.updateTitleDeckBadge();
      });
    }

    UI.updateTitleDeckBadge();
    UI.renderDeckModal();

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
    const btnSelS5B = document.getElementById("btnSelectStage5B");
    if (btnSelS5B) {
      btnSelS5B.addEventListener("click", () => {
        if (!window.Stage5) return;
        if (window.sfx) window.sfx.capsuleCatch();
        if (window.GameFlow && window.GameFlow.hideAllModals) {
          window.GameFlow.hideAllModals();
        }
        engine.startPracticeStage(5, { startPhase: 3 });
        closeMenu();
      });
    }
    const btnSelEnding = document.getElementById("btnSelectEnding");
    if (btnSelEnding) {
      btnSelEnding.addEventListener("click", () => {
        if (window.sfx && window.sfx.init) window.sfx.init();
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

    // Language Toggle (Persisted via I18N)
    const updateLanguageUI = () => {
      const status = document.getElementById("txtMenuLanguageStatus");
      if (status && window.I18N) {
        status.textContent = I18N.t("app.langName");
      }
    };
    const btnLang = document.getElementById("btnMenuToggleLanguage");
    if (btnLang) {
      btnLang.addEventListener("click", () => {
        if (window.sfx) window.sfx.flipperClick();
        if (window.I18N) I18N.toggleLang();
      });
    }
    if (window.I18N) {
      I18N.onChange(() => {
        updateLanguageUI();
        this.updateTitleDeckBadge();
        this.renderDeckModal();
        if (engine && engine.state) {
          this.renderPermUpgrades(engine.state);
          this.updateHUD(engine.state);
        }
        const clearModal = document.getElementById("clearModal");
        if (clearModal && !clearModal.classList.contains("hidden") && this._lastClearStageIdx) {
          const idx = this._lastClearStageIdx;
          const nameEl = clearModal.querySelector(".text-\\[\\#ff66b2\\]");
          const quoteEl = clearModal.querySelector("p");
          const nextBtn = document.getElementById("btnClearNext");
          if (nameEl) nameEl.textContent = idx === 5 ? t("engine.stage5.finalDisplayName") : t(`stage${idx}.bossName`);
          if (quoteEl) quoteEl.innerHTML = t(`stage${idx}.defeatQuote`);
          if (nextBtn && idx === 5) nextBtn.innerHTML = t("clear.toEnding");
          if (idx !== 5 && engine && engine.state) {
            this.renderRelicDraft(engine.state);
          }
        }
        if (window.GameFlow && typeof GameFlow.refreshLanguage === "function") {
          GameFlow.refreshLanguage();
        }
      });
      I18N.applyDom();
      updateLanguageUI();
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

    const renderDebugAudioLog = () => {
      const statusEl = document.getElementById("dbgAudioStatus");
      const logsEl = document.getElementById("dbgAudioLogs");
      if (!window.sfx || typeof window.sfx.getDebugInfo !== "function") return;
      const info = window.sfx.getDebugInfo();
      if (statusEl) {
        statusEl.textContent = `state=${info.state} en=${info.enabled} t=${info.time} buf=${info.bufUnlocked} html=${info.htmlUnlocked} sess=${info.session}`;
      }
      if (logsEl) {
        logsEl.textContent = info.logs.length > 0 ? info.logs.join("\n") : "(no errors)";
      }
    };
    const btnDbgTestBeep = document.getElementById("btnDbgTestBeep");
    if (btnDbgTestBeep) {
      btnDbgTestBeep.addEventListener("click", () => {
        if (window.sfx && window.sfx.init) window.sfx.init();
        if (window.sfx && window.sfx.capsuleCatch) window.sfx.capsuleCatch();
        renderDebugAudioLog();
        setTimeout(renderDebugAudioLog, 150);
      });
    }

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

    const tallyPanel = document.getElementById("clearTallyPanel");
    if (tallyPanel) {
      tallyPanel.addEventListener("click", () => {
        if (this._tallyState && !this._tallyState.done) {
          this.finishClearTallyImmediately();
        }
      });
    }

    const nextBtn = document.getElementById("btnClearNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        this._clearTallyTimers();
        this.isStage5ClearOpen = false;
        this.closeModal(modal);
        if (window.GameFlow && window.GameFlow.startEnding) {
          GameFlow.startEnding(engine.state);
        }
      });
    }

    const relicOptions = document.getElementById("relicOptions");
    if (relicOptions) {
      relicOptions.addEventListener("click", (e) => {
        const btn = e.target && e.target.closest ? e.target.closest(".relic-btn") : null;
        if (!btn) return;
        this._clearTallyTimers();
        const chosenRelic = btn.dataset.relic || "radar";
        const def = (window.Systems && Systems.RELIC_DEFS && Systems.RELIC_DEFS[chosenRelic]) || null;
        const title = def ? def.name : t("ui.relicPart");
        this.closeModal(modal);
        this.showCutin(t("ui.relicEquip", { title }), 160);
        engine.advanceToNextStage(chosenRelic);
      });
    }
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
      this.showCutin(t("ui.faceTest", { face: next }), 90);
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

  _clearTallyTimers() {
    if (this._tallyRaf) {
      cancelAnimationFrame(this._tallyRaf);
      this._tallyRaf = null;
    }
    if (this._tallyTimeouts) {
      this._tallyTimeouts.forEach(id => clearTimeout(id));
    }
    this._tallyTimeouts = [];
  },

  _revealTallyRow(id, isFinal = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove("hidden", "tally-slam");
    el.classList.add("flex");
    void el.offsetWidth;
    el.classList.add("tally-slam");
    if (window.sfx && window.sfx.tallySlam) {
      window.sfx.tallySlam(isFinal);
    }
  },

  finishClearTallyImmediately() {
    const ts = this._tallyState;
    if (!ts || ts.done) return;
    this._clearTallyTimers();
    ts.done = true;

    const fmtTime = (sec) => {
      const s = Math.max(0, Math.floor(sec));
      return `⏱${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };
    this.setText("tallyRemTime", fmtTime(0));
    this.setText("tallyMult", ts.targetMult.toFixed(2));
    const maxBadge = document.getElementById("tallyMaxBadge");
    if (maxBadge) {
      if (ts.bonusPct >= ts.maxPct) maxBadge.classList.remove("hidden");
      else maxBadge.classList.add("hidden");
    }

    ["tallyRowStageTotal", "tallyRowClearBonus", "tallyRowNoMissBonus"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("hidden");
        el.classList.add("flex", "tally-slam");
      }
    });
    if (ts.carryover > 0) {
      const elCarry = document.getElementById("tallyRowCarryover");
      if (elCarry) {
        elCarry.classList.remove("hidden");
        elCarry.classList.add("flex", "tally-slam");
      }
    }
    this._revealTallyRow("tallyRowGrandTotal", true);
    if (ts.state) this.updateHUD(ts.state);
  },

  presentStageClearModal(state, cfg = {}) {
    const stageIdx = state.stageIndex || 1;
    const sb = window.ScoreTable.bonus;
    const stTimer = window.ScoreTable.stageTimer;
    const limitFrames = (stTimer && stTimer.LIMIT_FRAMES) || (60 * 300);
    const remFrames = Math.max(0, limitFrames - (state.stagePlayFrames || 0));
    const remSec = Math.floor(remFrames / 60);
    const pctPerSec = (stTimer && stTimer.TIME_BONUS_PCT_PER_SEC) ?? 1;
    const maxPct = (stTimer && stTimer.TIME_BONUS_MAX_PCT) ?? 100;
    const bonusPct = Math.min(maxPct, remSec * pctPerSec);
    const targetMult = +(1 + bonusPct / 100).toFixed(2);

    const stageBaseScore = Math.min(state.score || 0, Math.max(0, state.stageEarnedScore || 0));
    const carryover = Math.max(0, (state.score || 0) - stageBaseScore);
    const multipliedStageScore = Math.round(stageBaseScore * targetMult);
    const timeBonusPts = multipliedStageScore - stageBaseScore;

    const clearBonus = Systems.scaled(sb.CLEAR_PER_STAGE * stageIdx);
    const isNoMiss = (state.stageMisses || 0) === 0;
    const noMissBonus = isNoMiss ? Systems.scaled(sb.NO_MISS_PER_STAGE * stageIdx) : 0;

    let finalTotalScore = state.score || 0;
    if (!state._clearBonusAwarded) {
      state._clearBonusAwarded = true;
      const rawNext = carryover + multipliedStageScore + clearBonus + noMissBonus;
      finalTotalScore = (window.Systems && Systems.capScore) ? Systems.capScore(rawNext) : rawNext;
      state.score = finalTotalScore;
      state.peakScore = Math.max(state.peakScore || 0, state.score);
    }

    const modal = document.getElementById("clearModal");
    if (!modal) return;
    this._lastClearStageIdx = stageIdx;
    this._clearTallyTimers();

    const dlgPanel = document.getElementById("clearDialoguePanel");
    const fmtTime = (sec) => {
      const s = Math.max(0, Math.floor(sec));
      return `⏱${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    };

    this.setText("tallyHeaderTitle", `🏆 STAGE ${stageIdx} RESULT`);
    this.setText("tallyRemTime", fmtTime(remSec));
    this.setText("tallyBaseScore", stageBaseScore.toLocaleString());
    this.setText("tallyMult", "1.00");
    const maxBadge = document.getElementById("tallyMaxBadge");
    if (maxBadge) maxBadge.classList.add("hidden");

    this.setText("tallyStageTotalVal", multipliedStageScore.toLocaleString());
    this.setText("tallyClearBonusVal", `+${clearBonus.toLocaleString()}`);
    if (isNoMiss) {
      this.setText("tallyNoMissLabel", t("clear.tallyNoMissBonus"));
      this.setClass("tallyNoMissLabel", "font-bold text-[#e6ff00]");
      this.setText("tallyNoMissBonusVal", `+${noMissBonus.toLocaleString()}`);
      this.setClass("tallyNoMissBonusVal", "font-black text-[#e6ff00]");
    } else {
      this.setText("tallyNoMissLabel", t("clear.tallyMissCount", { count: state.stageMisses || 0 }));
      this.setClass("tallyNoMissLabel", "font-bold text-gray-400");
      this.setText("tallyNoMissBonusVal", "+0");
      this.setClass("tallyNoMissBonusVal", "font-bold text-gray-400");
    }
    this.setText("tallyCarryoverVal", carryover.toLocaleString());
    this.setText("tallyGrandTotalVal", finalTotalScore.toLocaleString());

    ["tallyRowStageTotal", "tallyRowClearBonus", "tallyRowNoMissBonus", "tallyRowCarryover", "tallyRowGrandTotal"].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add("hidden");
        el.classList.remove("flex", "tally-slam");
      }
    });

    this._tallyState = {
      state,
      remSec,
      bonusPct,
      maxPct,
      targetMult,
      carryover,
      done: false
    };

    if (cfg.bossDisplayName) {
      const nameEl = dlgPanel ? dlgPanel.querySelector(".text-\\[\\#ff66b2\\]") : null;
      if (nameEl) nameEl.textContent = cfg.bossDisplayName;
    }
    if (cfg.defeatQuoteHtml) {
      const quoteEl = dlgPanel ? dlgPanel.querySelector("p") : null;
      if (quoteEl) quoteEl.innerHTML = cfg.defeatQuoteHtml;
    }

    const relicSection = document.getElementById("relicSection");
    const nextBtn = document.getElementById("btnClearNext");

    const isStage5 = stageIdx === 5 || (window.currentStage && window.currentStage.id === "stage5");
    this.isStage5ClearOpen = !!isStage5;
    if (isStage5) {
      if (relicSection) relicSection.classList.add("hidden");
      if (nextBtn) nextBtn.innerHTML = t("clear.toEnding");
    } else {
      if (relicSection) relicSection.classList.remove("hidden");
      if (!state._currentRelicDraft && window.Systems && typeof Systems.rollRelicDraft === "function") {
        state._currentRelicDraft = Systems.rollRelicDraft(state);
      }
      this.renderRelicDraft(state);
    }
    this.updateScreenMode(state);

    this.openModal(modal);

    // Run sequential tally animation:
    // 1) Count down remaining seconds while incrementing mult +0.01/sec (capped at 2.00)
    // 2) Slam STAGE SCORE -> CLEAR BONUS -> NO-MISS -> (CARRYOVER) -> TOTAL SCORE
    const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      this._tallyTimeouts.push(setTimeout(() => this.finishClearTallyImmediately(), 120));
      return;
    }

    const startSequentialSlams = () => {
      let delay = 220;
      const schedule = (fn, wait) => {
        const tid = setTimeout(() => {
          if (!this._tallyState || this._tallyState.done) return;
          fn();
        }, delay);
        this._tallyTimeouts.push(tid);
        delay += wait;
      };

      schedule(() => this._revealTallyRow("tallyRowStageTotal", false), 320);
      schedule(() => this._revealTallyRow("tallyRowClearBonus", false), 320);
      schedule(() => this._revealTallyRow("tallyRowNoMissBonus", false), carryover > 0 ? 280 : 380);
      if (carryover > 0) {
        schedule(() => this._revealTallyRow("tallyRowCarryover", false), 360);
      }
      schedule(() => {
        this._revealTallyRow("tallyRowGrandTotal", true);
        if (this._tallyState) this._tallyState.done = true;
        this.updateHUD(state);
      }, 0);
    };

    this._tallyTimeouts.push(setTimeout(() => {
      if (!this._tallyState || this._tallyState.done) return;
      if (remSec <= 0) {
        startSequentialSlams();
        return;
      }
      let consumed = 0;
      let lastTickStep = -1;
      // Step 1 second/frame (+0.01/frame, max ~1.67s to 2.00), then drain surplus rapidly
      const stepRoll = () => {
        if (!this._tallyState || this._tallyState.done) return;
        const speed = consumed < maxPct ? 1 : Math.max(3, Math.ceil((remSec - maxPct) / 15));
        consumed = Math.min(remSec, consumed + speed);
        const curRem = Math.max(0, remSec - consumed);
        const curPct = Math.min(maxPct, consumed * pctPerSec);
        const curMult = 1 + curPct / 100;

        this.setText("tallyRemTime", fmtTime(curRem));
        this.setText("tallyMult", curMult.toFixed(2));
        if (curPct >= maxPct && maxBadge) {
          maxBadge.classList.remove("hidden");
        }

        const tickStep = Math.floor(curPct / 2);
        if (tickStep > lastTickStep && curPct <= maxPct) {
          lastTickStep = tickStep;
          if (window.sfx && window.sfx.tallyTick) {
            window.sfx.tallyTick(curPct / maxPct);
          }
        }

        if (consumed < remSec) {
          this._tallyRaf = requestAnimationFrame(stepRoll);
        } else {
          this._tallyRaf = null;
          this.setText("tallyRemTime", fmtTime(0));
          this.setText("tallyMult", targetMult.toFixed(2));
          startSequentialSlams();
        }
      };
      this._tallyRaf = requestAnimationFrame(stepRoll);
    }, 320));
  }
};

// =========================================================================
// MAIN ENTRY POINT
// =========================================================================

window.addEventListener("DOMContentLoaded", () => {
  // Initialize Engine
  GameEngine.init("pinballCanvas");

  // Load Initial Stage (Stage 1: Lilith)
  GameEngine.loadStage(Stage1);

  // Expose state globally for debug / testing convenience
  window.state = GameEngine.state;

  // Start Animation Loop
  GameEngine.start();

  // Initialize Game Flow (Title Screen & High Scores)
  if (window.GameFlow) {
    GameFlow.init();
  }

  // Stage Clear Modal Actions
  const modal = document.getElementById("clearModal");
  if (modal) {
    const replayBtn = document.getElementById("btnClearReplay");
    if (replayBtn) {
      replayBtn.addEventListener("click", () => {
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        setTimeout(() => {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        }, 200);
        const curIdx = (GameEngine.state && GameEngine.state.stageIndex) || 1;
        if (GameEngine.state && GameEngine.state.gameMode === "practice") {
          GameEngine.startPracticeStage(curIdx);
        } else {
          GameEngine.startArcadeCampaign();
        }
      });
    }

    const nextBtn = document.getElementById("btnClearNext");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        modal.classList.remove("opacity-100");
        modal.classList.add("opacity-0");
        setTimeout(() => {
          modal.classList.add("hidden");
          modal.classList.remove("flex");
        }, 200);

        const curId = GameEngine.currentStage ? GameEngine.currentStage.id : "stage1";
        if (curId === "stage5") {
          // Final stage clear -> Launch 3-Act Ending!
          if (window.GameFlow && window.GameFlow.startEnding) {
            GameFlow.startEnding(GameEngine.state);
          }
          return;
        }

        // Selected relic
        let chosenRelic = "radar";
        const selectedBtn = document.querySelector(".relic-btn.border-\\[\\#e6ff00\\]");
        if (selectedBtn && selectedBtn.dataset.relic) {
          chosenRelic = selectedBtn.dataset.relic;
        }
        GameEngine.advanceToNextStage(chosenRelic);
      });
    }

    document.querySelectorAll(".relic-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".relic-btn").forEach(b => b.classList.remove("border-[#e6ff00]", "bg-[#ff1493]/40"));
        btn.classList.add("border-[#e6ff00]", "bg-[#ff1493]/40");
        const title = btn.querySelector('.font-bold') ? btn.querySelector('.font-bold').textContent : "パーツ";
        UI.showCutin(`⚙️【パーツ換装】<br>${title} を装着！`, 160);
      });
    });
  }

  // Debug Buttons
  const dbgDropPerm = document.getElementById("dbgDropPerm");
  if (dbgDropPerm) dbgDropPerm.addEventListener("click", () => Systems.spawnFloatingCapsule(GameEngine.state, null, "perm"));

  const dbgDropBuff = document.getElementById("dbgDropBuff");
  if (dbgDropBuff) dbgDropBuff.addEventListener("click", () => Systems.spawnFloatingCapsule(GameEngine.state, null, "buff"));

  const dbgPuruTest = document.getElementById("dbgPuruTest");
  if (dbgPuruTest) dbgPuruTest.addEventListener("click", () => {
    const cur = GameEngine.currentStage;
    if (cur && cur.id === "stage5" && window.Stage5) {
      Stage5.triggerDebugJiggle(GameEngine.state);
    } else if (cur && cur.id === "stage4" && window.Stage4) {
      Stage4.triggerDebugJiggle(GameEngine.state);
    } else if (cur && cur.id === "stage3" && window.Stage3) {
      const b = GameEngine.state.boss;
      if (b.chestArmorBroken) {
        Stage3.impulseBust(GameEngine.state, "L", 7.2, -7.8);
        Stage3.impulseBust(GameEngine.state, "R", -7.2, -7.8);
      } else {
        if (window.sfx) window.sfx.softPuru();
        b.bustL.vx += 5.2; b.bustL.vy -= 5.6;
        b.bustR.vx -= 5.2; b.bustR.vy -= 5.6;
      }
      Stage3.impulseHip(GameEngine.state, 6.0, -6.5, false);
    } else if (cur && cur.id === "stage2" && GameEngine.state.boss.tipBust) {
      GameEngine.state.boss.tipBust.vx += 8.0;
      GameEngine.state.boss.tipBust.vy -= 8.0;
      if (GameEngine.state.boss.buttL) GameEngine.state.boss.buttL.vy += 8.0;
      if (GameEngine.state.boss.buttR) GameEngine.state.boss.buttR.vy += 8.0;
    } else {
      GameEngine.state.boss.chestArmorBroken = true;
      Stage1.impulseBust(GameEngine.state, "L", 6.5, -7.5);
      Stage1.impulseBust(GameEngine.state, "R", -6.5, -7.5);
    }
  });

  const dbgMultiball = document.getElementById("dbgMultiball");
  if (dbgMultiball) dbgMultiball.addEventListener("click", () => Systems.startFeverMode(GameEngine.state));

  const dbgFaceAnim = document.getElementById("dbgFaceAnim");
  if (dbgFaceAnim) dbgFaceAnim.addEventListener("click", () => {
    if (window.sfx) window.sfx.capsuleCatch();
    const modes = ["wink", "open_blush", "shock", "wince", "blink", "talk"];
    window._faceIdx = ((window._faceIdx || 0) + 1) % modes.length;
    const next = modes[window._faceIdx];
    GameEngine.state.boss.expression = next;
    GameEngine.state.boss.expressionTimer = 90;
    if (next === "wink") GameEngine.state.boss.winkTimer = 60;
    if (next === "blink") GameEngine.state.boss.blinkTimer = 6;
    if (next === "talk") GameEngine.state.boss.talkTimer = 90;
    UI.updateHUD(GameEngine.state);
    UI.showCutin(`👁【表情テスト】: ${next}`, 90);
  });

  const dbgStageToggle = document.getElementById("dbgStageToggle");
  if (dbgStageToggle) dbgStageToggle.addEventListener("click", () => {
    if (window.sfx) window.sfx.flipperClick();
    const currentId = GameEngine.currentStage ? GameEngine.currentStage.id : "stage1";
    const nextStage =
      currentId === "stage1" ? window.Stage2 :
      currentId === "stage2" ? window.Stage3 :
      currentId === "stage3" ? (window.Stage4 || window.Stage1) :
      currentId === "stage4" ? (window.Stage5 || window.Stage1) :
      window.Stage1;
    if (nextStage) {
      if (window.GameFlow && GameFlow.hideAllModals) GameFlow.hideAllModals();
      const sIdx =
        nextStage.id === "stage5" ? 5 :
        nextStage.id === "stage4" ? 4 :
        nextStage.id === "stage3" ? 3 :
        nextStage.id === "stage2" ? 2 : 1;
      GameEngine.startPracticeStage(sIdx);
    }
  });
});

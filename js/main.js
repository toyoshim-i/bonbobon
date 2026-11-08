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
        GameEngine.resetGame();
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
        GameEngine.resetGame();
        if (window.Stage2) {
          GameEngine.loadStage(Stage2);
          UI.showCutin("🚀【STAGE 2 突入】<br>疾風紫電セルティ 迎撃戦開始！", 220);
        } else {
          UI.showCutin("🚀【NEXT STAGE】<br>強化を引き継いで再出撃します！", 180);
        }
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
    GameEngine.state.boss.chestArmorBroken = true;
    Stage1.impulseBust(GameEngine.state, "L", 6.5, -7.5);
    Stage1.impulseBust(GameEngine.state, "R", -6.5, -7.5);
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
    const nextStage = currentId === "stage1" ? window.Stage2 : window.Stage1;
    if (nextStage) {
      GameEngine.resetGame();
      GameEngine.loadStage(nextStage);
      UI.showCutin(`⚡【STAGE SWITCH】<br>${nextStage.name} (${nextStage.bossName})`, 180);
    }
  });
});

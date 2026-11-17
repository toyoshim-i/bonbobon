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
});

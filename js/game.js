// =========================================================================
// 1. STAGE ASSET INITIALIZATION
// =========================================================================
const FACE_PATCH_DATA = window.STAGE1_FACE_PATCHES || {};
const facePatchImgs = {};
Object.entries(FACE_PATCH_DATA).forEach(([k, uri]) => {
  const im = new Image();
  im.src = uri;
  facePatchImgs[k] = im;
});

const centerpieceImg = new Image();
let imgLoaded = false;
centerpieceImg.onload = () => { imgLoaded = true; };
centerpieceImg.onerror = () => {
  if (centerpieceImg.src !== './assets/stage1/centerpiece.jpg') {
    centerpieceImg.src = './assets/stage1/centerpiece.jpg';
  }
};
centerpieceImg.src = window.STAGE1_CENTERPIECE_URI || './assets/stage1/centerpiece.jpg';

const centerpieceArmoredImg = new Image();
centerpieceArmoredImg.src = './assets/stage1/centerpiece_armored.jpg';

const sfx = window.sfx;

// =========================================================================
// 2. GAME STATE & ENGINE CONSTANTS
// =========================================================================
const canvas = document.getElementById("pinballCanvas");
const ctx = canvas.getContext("2d");
const W = 420;
const H = 660;

// Centerpiece placement on canvas
const IMG_BOX = { x: 16, y: 16, w: 364, h: 644 };

// Permanent Upgrade Definitions (Table Installations)
const PERM_DEFS = {
  centerPost: {
    id: "centerPost",
    name: "股下ストッパー (CENTER POST)",
    desc: "フリッパー間の死に穴に電磁ピン(耐久3回)を展開",
    maxLv: 3
  },
  kickbackL: {
    id: "kickbackL",
    name: "左アウトレーン防衛 (L-KICKBACK)",
    desc: "左端落下時にレーザーで自動撃ち返し(1回)",
    maxLv: 2
  },
  kickbackR: {
    id: "kickbackR",
    name: "右アウトレーン防衛 (R-KICKBACK)",
    desc: "右端落下時にレーザーで自動撃ち返し(1回)",
    maxLv: 2
  },
  wideFlipper: {
    id: "wideFlipper",
    name: "ロングフリッパー",
    desc: "フリッパー長拡大（打撃・防衛範囲UP）",
    maxLv: 2
  },
  subBumpers: {
    id: "subBumpers",
    name: "増設プラズマバンパー",
    desc: "中段空間に連鎖電撃バンパーを2基常設",
    maxLv: 2
  }
};

// Stockable Buff Definitions (Keep & Trigger for Multiplier)
const BUFF_DEFS = {
  mult2x:   { id: "mult2x",   label: "SCORE ×2", color: "#ff1493", mult: 2.0, desc: "スコア倍率×2.0" },
  overdrive:{ id: "overdrive",label: "PIERCE弾", color: "#e6ff00", mult: 1.8, desc: "貫通電撃ボール＆倍率×1.8" },
  magnet:   { id: "magnet",   label: "MAGNET",   color: "#00f5d4", mult: 1.5, desc: "フリッパー磁力吸着＆×1.5" },
  fever:    { id: "fever",    label: "FEVER+玉", color: "#b84dff", mult: 2.2, desc: "即時フィーバーゲージ+50%" }
};

// Floating Capsule Spawner Slots (Plan A: Aim and shoot with ball!)
const CAPSULE_SLOTS = [
  { x: 74,  y: 220 }, // Under Left Drone
  { x: 322, y: 220 }, // Under Right Drone
  { x: 198, y: 110 }, // Between Ears / Upper Orbit
  { x: 80,  y: 330 }, // Left Shoulder Spot
  { x: 316, y: 330 }, // Right Shoulder Spot
  { x: 198, y: 245 }  // Upper Core Center
];

let state = {};

function createInitialState() {
  return {
    score: 0,
    phase: 1, // 1: Outer Armor, 2: Chest Armor, 3: Core KO!
    ballsRemaining: 3,
    baseMultiplier: 1.0,
    burstMultiplier: 1.0,
    burstTimer: 0,
    magnetActive: false,
    overdriveActive: false,
    droneComboCount: 0,
    stageCleared: false,
    extraBallMilestones: [100000, 250000, 500000],

    // Plunger (Spring Shooter)
    plunger: {
      power: 0,
      pulling: false,
      waitingForLaunch: true
    },
    skillShotEligible: false,

    // Fever Mode (BOMB-O-FEVER)
    fever: {
      gauge: 0, // 0..100
      active: false,
      timer: 0,
      mult: 1.0
    },

    // Permanent Upgrades with Durability
    perm: {
      centerPost: 0,
      centerPostHP: 0,
      kickbackL: 0,
      kickbackL_charges: 0,
      kickbackR: 0,
      kickbackR_charges: 0,
      wideFlipper: 0,
      subBumpers: 0
    },

    // Kept Buff Slots (max 4)
    keptBuffs: [
      { id: "mult2x", tier: 1 },
      null,
      null,
      null
    ],

    // Boss Gimmicks & Rich Multi-Stage HP Balance (Extended Gameplay)
    boss: {
      droneL_HP: 3,
      droneR_HP: 3,
      leftShoulderHP: 5,
      rightShoulderHP: 5,
      chestArmorHP: 10, // 2-Layer Heavy Armor (10 hits total to purge)
      chestArmorBroken: false,
      coreHP: 16,        // Climax Boss Core HP
      leftEarLit: false,
      rightEarLit: false,
      coreUnlocked: false,
      blushGauge: 0, // 0..100
      expression: "smile", // "smile" | "blush" | "shock" | "angry_emp" | "wink"
      expressionTimer: 0,
      blinkTimer: 120,
      winkTimer: 0,
      talkTimer: 0,
      animTick: 0,
      hairSpring: { dx: 0, dy: 0, vx: 0, vy: 0, phase: 0 },
      gaze: { x: 0, y: 0 },

      // 2D Spring oscillators for Bust (Default r: 24 for good spacing, r: 36 in Fever!)
      bustL: { x: 160, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },
      bustR: { x: 236, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0 },

      // Mecha Colliders
      droneL: { x: 58,  y: 174, r: 24, flash: 0 },
      droneR: { x: 338, y: 174, r: 24, flash: 0 },
      earL:   { x: 140, y: 68,  r: 20, flash: 0 },
      earR:   { x: 256, y: 68,  r: 20, flash: 0 },
      podL:   { x: 111, y: 296, r: 25, flash: 0 },
      podR:   { x: 285, y: 296, r: 25, flash: 0 },
      core:   { x: 198, y: 307, r: 17, flash: 0 }
    },

    balls: [],
    capsules: [], // Floating holo-capsules
    particles: [],
    popups: [],
    lightningArcs: [],

    leftFlipperDown: false,
    rightFlipperDown: false,
    nudgeOffset: { x: 0, y: 0 }
  };
}

// Prepare ball in shooter lane
function prepareBallForLaunch() {
  state.balls = [{
    x: 393,
    y: 575,
    vx: 0,
    vy: 0,
    r: 8.5,
    trail: [],
    inShooterLane: true
  }];
  state.plunger.waitingForLaunch = true;
  state.plunger.power = 0;
  state.plunger.pulling = false;
  state.skillShotEligible = true;
  showCutin("READY... 画面右下を下に引いて離すか、発射ボタンを押してスタート！", 120);
}

function spawnBall(x = 198, y = 260, vx = 0, vy = -7.5) {
  const jitter = (Math.random() - 0.5) * 1.5;
  state.balls.push({
    x,
    y,
    vx: vx + jitter,
    vy,
    r: 8.5,
    trail: [],
    inShooterLane: false
  });
}

function showCutin(text, durationFrames = 130) {
  if (state && state.boss) {
    state.boss.talkTimer = Math.max(state.boss.talkTimer || 0, Math.min(120, durationFrames));
  }
  const banner = document.getElementById("cutinBanner");
  const label = document.getElementById("cutinText");
  if (!banner || !label) return;
  label.textContent = text;
  banner.classList.remove("hidden");
  banner.classList.add("flex");
  clearTimeout(showCutin._timer);
  showCutin._timer = setTimeout(() => {
    banner.classList.add("hidden");
    banner.classList.remove("flex");
  }, (durationFrames / 60) * 1000);
}

function addPopup(x, y, text, color = "#e6ff00", scale = 1.0) {
  state.popups.push({ x, y, text, color, life: 48, maxLife: 48, scale });
}

function addParticles(x, y, color, count = 10, speed = 3.5) {
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = (0.3 + Math.random() * 0.7) * speed;
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color,
      life: 20 + Math.floor(Math.random() * 18)
    });
  }
}

// Add Fever Gauge
function addFever(amount) {
  if (state.fever.active) return;
  state.fever.gauge = Math.min(100, state.fever.gauge + amount);
  if (state.fever.gauge >= 100) {
    startFeverMode();
  }
  updateHUD();
}

function startFeverMode() {
  state.fever.active = true;
  state.fever.timer = 60 * 18; // 18 seconds
  state.fever.mult = 5.0;
  state.fever.gauge = 100;
  sfx.burstTrigger();

  // Multiball: Add 2 extra balls immediately!
  spawnBall(180, 240, -4.5, -6.5);
  spawnBall(216, 240, 4.5, -6.5);

  // Bust enlarges to Mega Puru-Puru in fever!
  state.boss.bustL.r = 36;
  state.boss.bustR.r = 36;
  state.boss.expression = "blush";
  state.boss.expressionTimer = 80;

  // Spawn 2 floating capsules
  spawnFloatingCapsule(null, "buff");
  spawnFloatingCapsule(null, "perm");

  showCutin("🔥 BOMB-O-FEVER突入!! MULTIBALL ＆ メガぷるぷる開放!! スコア×5.0!!", 200);
  addParticles(198, 350, "#e6ff00", 35, 6.0);
  updateHUD();
}

function endFeverMode() {
  state.fever.active = false;
  state.fever.gauge = 0;
  state.fever.mult = 1.0;
  state.boss.bustL.r = 24;
  state.boss.bustR.r = 24;
  showCutin("フィーバー終了！ 通常モードへ戻ります", 90);
  updateHUD();
}

// =========================================================================
// 3. PLAN A: FLOATING CAPSULE SPAWN & BALL AIM COLLECTION
// =========================================================================
function spawnFloatingCapsule(slotIdx = null, category = null) {
  sfx.capsuleDrop();
  // Find unoccupied slot
  const occupiedSlots = state.capsules.map(c => c.slotIndex);
  let available = CAPSULE_SLOTS.map((s, idx) => idx).filter(idx => !occupiedSlots.includes(idx));
  if (available.length === 0) available = [0, 1, 2, 3, 4, 5];

  const targetIdx = (slotIdx !== null && slotIdx >= 0 && slotIdx < CAPSULE_SLOTS.length)
    ? slotIdx
    : available[Math.floor(Math.random() * available.length)];

  const slotPos = CAPSULE_SLOTS[targetIdx];
  const isPerm = category ? category === "perm" : Math.random() < 0.45;

  if (isPerm) {
    const keys = Object.keys(PERM_DEFS);
    const availableUpgrades = keys.filter(k => state.perm[k] < PERM_DEFS[k].maxLv);
    const pickKey = availableUpgrades.length > 0
      ? availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)]
      : keys[Math.floor(Math.random() * keys.length)];
    const labels = {
      centerPost: "STOPPER",
      kickbackL: "L-LASER",
      kickbackR: "R-LASER",
      wideFlipper: "WIDE-FLP",
      subBumpers: "BUMPER+"
    };
    state.capsules.push({
      slotIndex: targetIdx,
      x: slotPos.x,
      y: slotPos.y,
      baseY: slotPos.y,
      phase: Math.random() * Math.PI * 2,
      r: 15,
      life: 960, // 16 seconds
      maxLife: 960,
      category: "perm",
      subId: pickKey,
      label: labels[pickKey] || "UPGRADE",
      color: "#00f5d4"
    });
  } else {
    const buffKeys = Object.keys(BUFF_DEFS);
    const pickBuff = buffKeys[Math.floor(Math.random() * buffKeys.length)];
    const def = BUFF_DEFS[pickBuff];
    state.capsules.push({
      slotIndex: targetIdx,
      x: slotPos.x,
      y: slotPos.y,
      baseY: slotPos.y,
      phase: Math.random() * Math.PI * 2,
      r: 15,
      life: 960,
      maxLife: 960,
      category: "buff",
      subId: pickBuff,
      label: def.label,
      color: def.color
    });
  }
}

function collectCapsule(cap) {
  sfx.capsuleCatch();
  addParticles(cap.x, cap.y, cap.color, 18, 4.5);
  state.boss.winkTimer = 45;
  state.boss.talkTimer = 65;
  state.boss.hairSpring.vy -= 2.2;

  if (cap.category === "perm") {
    const key = cap.subId;
    const def = PERM_DEFS[key];
    if (state.perm[key] < def.maxLv) {
      state.perm[key]++;
      if (key === "centerPost") state.perm.centerPostHP = 3;
      if (key === "kickbackL") state.perm.kickbackL_charges = 1;
      if (key === "kickbackR") state.perm.kickbackR_charges = 1;
      addPopup(cap.x, cap.y - 12, `常設設置! ${def.name} Lv.${state.perm[key]}`, "#00f5d4", 1.15);
      showCutin(`🛠 パーツ強奪＆即時設置: ${def.name} Lv.${state.perm[key]}!`);
    } else {
      if (key === "centerPost") state.perm.centerPostHP = 3;
      if (key === "kickbackL") state.perm.kickbackL_charges = 1;
      if (key === "kickbackR") state.perm.kickbackR_charges = 1;
      addScore(3500, cap.x, cap.y, "MAX REPAIR BONUS");
    }
  } else {
    const key = cap.subId;
    const def = BUFF_DEFS[key];
    if (key === "fever") {
      addFever(50);
      addPopup(cap.x, cap.y - 12, "FEVER GAUGE +50%!", "#b84dff", 1.2);
    } else {
      const existingIdx = state.keptBuffs.findIndex(b => b && b.id === key && b.tier < 3);
      if (existingIdx !== -1) {
        state.keptBuffs[existingIdx].tier++;
        const newTier = state.keptBuffs[existingIdx].tier;
        addPopup(cap.x, cap.y - 12, `バフ合成! ${def.label} ★Lv.${newTier}`, "#e6ff00", 1.2);
        showCutin(`⚡ バフ合成ランクアップ: ${def.label} が Lv.${newTier} に強化！`);
      } else {
        const emptyIdx = state.keptBuffs.findIndex(b => b === null);
        if (emptyIdx !== -1) {
          state.keptBuffs[emptyIdx] = { id: key, tier: 1 };
          addPopup(cap.x, cap.y - 12, `KEEP! ${def.label}`, def.color, 1.1);
        } else {
          state.keptBuffs[0].tier = Math.min(3, state.keptBuffs[0].tier + 1);
          addPopup(cap.x, cap.y - 12, `FULL合成! SLOT1 ★Lv.${state.keptBuffs[0].tier}`, "#e6ff00", 1.1);
        }
      }
    }
  }
  updateHUD();
}

function triggerBurstBuffs() {
  const activeList = state.keptBuffs.filter(Boolean);
  if (activeList.length === 0) {
    addPopup(W / 2, 520, "NO KEPT BUFFS!", "#ff1493", 1.0);
    return;
  }
  sfx.burstTrigger();

  let totalMult = 1.0;
  let spawnExtraBall = false;
  activeList.forEach(item => {
    const def = BUFF_DEFS[item.id];
    const tierFactor = 1 + (item.tier - 1) * 0.65;
    totalMult *= (def.mult * tierFactor);
    if (item.id === "magnet") state.magnetActive = true;
    if (item.id === "overdrive") state.overdriveActive = true;
    if (item.id === "fever") spawnExtraBall = true;
  });

  if (activeList.length >= 2) {
    totalMult *= (1 + activeList.length * 0.25);
  }

  state.burstMultiplier = Math.round(totalMult * 10) / 10;
  state.burstTimer = 60 * 10; // 10 seconds
  state.keptBuffs = [null, null, null, null];

  if (spawnExtraBall || activeList.length >= 3) {
    spawnBall(210, 260, (Math.random() - 0.5) * 6, -7);
  }

  state.boss.expression = "shock";
  state.boss.expressionTimer = 55;
  addParticles(210, 340, "#e6ff00", 28, 5.5);
  showCutin(`🔥 BURST解放!! スコア倍率 ×${state.burstMultiplier.toFixed(1)} (10秒間)!!`, 180);
  updateHUD();
}

function addScore(basePts, x, y, label = "") {
  const totalMult = state.baseMultiplier * state.burstMultiplier * state.fever.mult;
  const pts = Math.round(basePts * totalMult);
  const prevScore = state.score;
  state.score += pts;

  if (label) {
    addPopup(x, y, `${label} +${pts.toLocaleString()}`, totalMult > 1.5 ? "#e6ff00" : "#00f5d4");
  } else {
    addPopup(x, y, `+${pts.toLocaleString()}`, "#ffffff", 0.9);
  }

  // Check Extra Ball score milestones!
  if (state.extraBallMilestones && state.extraBallMilestones.length > 0) {
    const nextTarget = state.extraBallMilestones[0];
    if (prevScore < nextTarget && state.score >= nextTarget) {
      state.extraBallMilestones.shift();
      state.ballsRemaining = Math.min(5, state.ballsRemaining + 1);
      sfx.burstTrigger();
      addParticles(198, 550, "#e6ff00", 30, 6.0);
      showCutin(`⭐ スコア達成ボーナス!! ★EXTRA BALL (+1球獲得)!! 残り${state.ballsRemaining}球！`, 210);
    }
  }

  updateHUD();
}

// Stage Clear (KO!) Trigger
function triggerStageClear() {
  if (state.stageCleared) return;
  state.stageCleared = true;
  sfx.burstTrigger();
  showCutin("🏆 STAGE 1 CLEAR!! 桃色重装ラビ・メック完全沈黙!!", 240);
  addParticles(198, 300, "#e6ff00", 60, 8.0);
  addParticles(198, 300, "#ff1493", 60, 8.0);

  setTimeout(() => {
    const modal = document.getElementById("clearModal");
    if (modal) {
      document.getElementById("clearFinalScore").textContent = state.score.toLocaleString();
      document.getElementById("clearRemainingBalls").textContent = `${state.ballsRemaining} BALLS`;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
    }
  }, 1200);
}

// =========================================================================
// 4. BUST SPRING PHYSICS & CHEST INTERACTIONS
// =========================================================================
function impulseBust(which, vxImpact, vyImpact) {
  const b = which === "L" ? state.boss.bustL : state.boss.bustR;
  sfx.softPuru();
  b.vx += vxImpact * 1.35;
  b.vy += vyImpact * 1.35;
  b.flash = 16;

  const other = which === "L" ? state.boss.bustR : state.boss.bustL;
  other.vx -= vxImpact * 0.45;
  other.vy += vyImpact * 0.45;

  state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 18);
  state.boss.expression = "blush";
  state.boss.expressionTimer = 54;
  state.boss.talkTimer = 36;
  state.boss.hairSpring.vx += vxImpact * 0.55;
  state.boss.hairSpring.vy += vyImpact * 0.55;

  addFever(12);
  addParticles(b.x, b.y, "#ff66b2", 8, 2.8);
  addScore(600, b.x, b.y - 18, "♥ぷるんっ! SOFT");

  // EMP Counter at 100% Blush
  if (state.boss.blushGauge >= 100) {
    state.boss.blushGauge = 0;
    state.boss.expression = "angry_emp";
    state.boss.expressionTimer = 60;
    sfx.armorBreak();
    showCutin("⚡ 「ちょ、どこ触ってんのよ！！///」 カウンターEMP発動＆浮遊カプセル放出！", 180);
    addParticles(210, 390, "#ff1493", 32, 6.5);
    spawnFloatingCapsule(5, "buff");
    state.balls.forEach(ball => {
      ball.vy = -12 - Math.random() * 4;
      ball.vx = (Math.random() - 0.5) * 12;
    });
  }
  updateHUD();
}

function updateBossSprings() {
  const stiffness = 0.26;
  const damping = 0.80;
  [state.boss.bustL, state.boss.bustR].forEach(b => {
    const ax = -stiffness * b.dx;
    const ay = -stiffness * b.dy;
    b.vx = (b.vx + ax) * damping;
    b.vy = (b.vy + ay) * damping;
    b.dx += b.vx;
    b.dy += b.vy;
    b.dx = Math.max(-18, Math.min(18, b.dx));
    b.dy = Math.max(-18, Math.min(18, b.dy));
    if (b.flash > 0) b.flash--;
  });

  const hs = state.boss.hairSpring;
  hs.phase += 0.055;
  hs.vx = (hs.vx - 0.18 * hs.dx) * 0.86;
  hs.vy = (hs.vy - 0.18 * hs.dy) * 0.86;
  hs.dx = Math.max(-10, Math.min(10, hs.dx + hs.vx));
  hs.dy = Math.max(-8, Math.min(8, hs.dy + hs.vy));

  state.boss.animTick++;
  state.boss.blinkTimer--;
  if (state.boss.blinkTimer <= -10) {
    state.boss.blinkTimer = 130 + Math.floor(Math.random() * 110);
  }
  if (state.boss.winkTimer > 0) state.boss.winkTimer--;
  if (state.boss.talkTimer > 0) state.boss.talkTimer--;

  if (state.balls.length > 0) {
    const b = state.balls[0];
    const targetGx = Math.max(-2.3, Math.min(2.3, (b.x - 198) * 0.015));
    const targetGy = Math.max(-1.8, Math.min(2.3, (b.y - 194) * 0.011));
    state.boss.gaze.x += (targetGx - state.boss.gaze.x) * 0.25;
    state.boss.gaze.y += (targetGy - state.boss.gaze.y) * 0.25;
  }

  if (state.boss.expressionTimer > 0) {
    state.boss.expressionTimer--;
    if (state.boss.expressionTimer === 0) {
      state.boss.expression = "smile";
    }
  }
}

// =========================================================================
// 5. PINBALL GEOMETRY: CLEAN SINGLE-FLIPPER LAYOUT
// =========================================================================
function getFlippers() {
  const ext = state.perm.wideFlipper * 10;
  // ONLY Bottom Main Flippers (centered around x: 198)
  const mainL = {
    px: 110, py: 602,
    len: 56 + ext,
    restAngle: 0.44,
    activeAngle: -0.52,
    isLeft: true
  };
  const mainR = {
    px: 286, py: 602,
    len: 56 + ext,
    restAngle: Math.PI - 0.44,
    activeAngle: Math.PI + 0.52,
    isLeft: false
  };
  return [mainL, mainR];
}

// Clean static table walls & inlanes/outlanes
const TABLE_WALLS = [
  // Outer perimeter arch
  { x1: 16,  y1: 590, x2: 16,  y2: 95 },
  { x1: 16,  y1: 95,  x2: 65,  y2: 32 },
  { x1: 65,  y1: 32,  x2: 210, y2: 16 },
  { x1: 210, y1: 16,  x2: 355, y2: 32 },
  { x1: 355, y1: 32,  x2: 404, y2: 95 },
  { x1: 404, y1: 95,  x2: 404, y2: 635 },

  // Shooter lane inner wall (right side) & bottom wall
  { x1: 380, y1: 175, x2: 380, y2: 635 },
  { x1: 380, y1: 635, x2: 404, y2: 635 },

  // Mid playfield outer guide walls
  { x1: 16,  y1: 280, x2: 46,  y2: 470 },
  { x1: 380, y1: 280, x2: 350, y2: 470 },

  // Inlane walls feeding Main Flippers
  { x1: 46,  y1: 470, x2: 46,  y2: 562 },
  { x1: 46,  y1: 562, x2: 110, y2: 602 },
  { x1: 350, y1: 470, x2: 350, y2: 562 },
  { x1: 350, y1: 562, x2: 286, y2: 602 },

  // Outlane Drain Slopes
  { x1: 16,  y1: 590, x2: 86,  y2: 648 },
  { x1: 380, y1: 590, x2: 310, y2: 648 }
];

const flipperState = [
  { angle: 0.44, prevAngle: 0.44 },
  { angle: Math.PI - 0.44, prevAngle: Math.PI - 0.44 }
];

function closestPointOnSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { x: x1, y: y1, t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return { x: x1 + t * dx, y: y1 + t * dy, t };
}

// Plunger Controls
function startPlungerPull() {
  if (!state.plunger.waitingForLaunch) return;
  state.plunger.pulling = true;
}

function releasePlunger() {
  if (!state.plunger.pulling) return;
  state.plunger.pulling = false;

  const currentPower = state.plunger.power || 75;
  sfx.plungerLaunch(currentPower);

  const ballInLane = state.balls.find(b => b.inShooterLane);
  if (ballInLane) {
    const p = Math.max(0.15, currentPower / 100);
    const launchSpeed = 11.2 + p * 4.8; // 11.9 .. 16.0 (Smooth arc with lower gravity)
    ballInLane.vy = -launchSpeed;
    ballInLane.vx = -0.4;
    state.plunger.waitingForLaunch = false;

    // Check Skill Shot window (power 68%..84%)
    if (p >= 0.68 && p <= 0.84) {
      state.skillShotEligible = true;
    } else {
      state.skillShotEligible = false;
    }
  }
  state.plunger.power = 0;
}

// =========================================================================
// 6. MAIN PHYSICS STEP
// =========================================================================
function stepPhysics() {
  if (state.stageCleared) return;

  // Plunger power charge
  if (state.plunger.pulling) {
    const prevStep = Math.floor(state.plunger.power / 16);
    state.plunger.power = Math.min(100, state.plunger.power + 2.2);
    const nextStep = Math.floor(state.plunger.power / 16);
    if (nextStep > prevStep) {
      sfx.plungerPullClick();
    }
  }

  // Burst Buff Timer
  if (state.burstTimer > 0) {
    state.burstTimer--;
    if (state.burstTimer === 0) {
      state.burstMultiplier = 1.0;
      state.magnetActive = false;
      state.overdriveActive = false;
      updateHUD();
    }
  }

  // Fever Mode Timer
  if (state.fever.active) {
    state.fever.timer--;
    state.fever.gauge = Math.max(0, (state.fever.timer / (60 * 18)) * 100);
    if (state.fever.timer <= 0 || state.balls.length <= 1) {
      endFeverMode();
    }
  }

  state.nudgeOffset.x *= 0.82;
  state.nudgeOffset.y *= 0.82;

  updateBossSprings();

  // Update Flippers
  const flippers = getFlippers();
  flippers.forEach((f, idx) => {
    const st = flipperState[idx];
    st.prevAngle = st.angle;
    const pressed = f.isLeft ? state.leftFlipperDown : state.rightFlipperDown;
    const target = pressed ? f.activeAngle : f.restAngle;
    st.angle += (target - st.angle) * 0.44;
  });

  const SUBSTEPS = 6;
  const gravity = 0.118 / SUBSTEPS; // Reduced for comfortable ball tracking and aiming (less frantic drop)

  for (let s = 0; s < SUBSTEPS; s++) {
    for (let bi = state.balls.length - 1; bi >= 0; bi--) {
      const ball = state.balls[bi];

      // While resting on plunger waiting for launch, lock ball onto plunger tip!
      if (ball.inShooterLane && state.plunger.waitingForLaunch) {
        ball.x = 393;
        ball.y = 575 + (state.plunger.power / 100) * 28;
        ball.vx = 0;
        ball.vy = 0;
        continue;
      }

      ball.vy += gravity;
      ball.x += ball.vx / SUBSTEPS;
      ball.y += ball.vy / SUBSTEPS;

      // Shooter lane exit check & one-way gate
      if (ball.inShooterLane && ball.x < 378 && ball.y < 170) {
        ball.inShooterLane = false;
      }
      // Once in playfield, one-way gate blocks ball from re-entering shooter lane
      if (!ball.inShooterLane && ball.x > 379 && ball.y > 175) {
        ball.x = 378;
        ball.vx = -Math.abs(ball.vx) - 1.5;
      }

      // 1. Collide with Static Walls
      for (const w of TABLE_WALLS) {
        const cp = closestPointOnSeg(ball.x, ball.y, w.x1, w.y1, w.x2, w.y2);
        const dx = ball.x - cp.x;
        const dy = ball.y - cp.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + 2.5;
        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = cp.x + nx * minDist;
          ball.y = cp.y + ny * minDist;
          const dot = ball.vx * nx + ball.vy * ny;
          if (dot < 0) {
            ball.vx = (ball.vx - 1.75 * dot * nx) * 0.96;
            ball.vy = (ball.vy - 1.75 * dot * ny) * 0.96;
          }
        }
      }

      // 2. Collide with Flippers
      flippers.forEach((f, idx) => {
        const st = flipperState[idx];
        const x2 = f.px + Math.cos(st.angle) * f.len;
        const y2 = f.py + Math.sin(st.angle) * f.len;
        const cp = closestPointOnSeg(ball.x, ball.y, f.px, f.py, x2, y2);
        const dx = ball.x - cp.x;
        const dy = ball.y - cp.y;
        const dist = Math.hypot(dx, dy);
        const minDist = ball.r + 5.5;

        if (dist < minDist && dist > 0.0001) {
          const nx = dx / dist;
          const ny = dy / dist;
          ball.x = cp.x + nx * minDist;
          ball.y = cp.y + ny * minDist;

          const angVel = (st.angle - st.prevAngle) * SUBSTEPS;
          const tipSpeed = Math.abs(angVel) * (cp.t * f.len);

          const heldUp = (f.isLeft && state.leftFlipperDown) || (!f.isLeft && state.rightFlipperDown);
          if (state.magnetActive && heldUp && tipSpeed < 0.8) {
            ball.vx *= 0.65;
            ball.vy *= 0.65;
          } else {
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              const restitution = tipSpeed > 0.4 ? 1.85 : 1.42;
              ball.vx -= restitution * dot * nx;
              ball.vy -= restitution * dot * ny;
            }
            if (tipSpeed > 0.25) {
              const kick = Math.min(12.8, 5.0 + tipSpeed * 1.6);
              ball.vy -= kick * Math.abs(ny);
              ball.vx += nx * kick * 0.55;
            }
          }
        }
      });

      // 3. Collide with Chest (Armor vs Exposed Bust)
      if (s === 0) {
        if (!state.boss.chestArmorBroken) {
          // CHEST ARMOR TARGET (Compact Hard Bumper at center x: 198, y: 350)
          const armorX = 198;
          const armorY = 352;
          const armorR = 26;
          const dx = ball.x - armorX;
          const dy = ball.y - armorY;
          const dist = Math.hypot(dx, dy);
          if (dist < ball.r + armorR && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = armorX + nx * (ball.r + armorR + 2);
            ball.y = armorY + ny * (ball.r + armorR + 2);
            ball.vx = nx * 9.5;
            ball.vy = ny * 9.5;
            sfx.metalBumper();

            if (state.phase === 2 && state.boss.chestArmorHP > 0) {
              state.boss.chestArmorHP--;
              addParticles(armorX, armorY, "#ff1493", 16, 5.0);
              if (state.boss.chestArmorHP === 5) {
                sfx.armorBreak();
                addScore(4000, armorX, armorY, "💥ARMOR CRACK!!");
                showCutin("⚠️ 胸部第1装甲が破壊され亀裂発生！ あと5回で完全装甲パージ！", 180);
              } else if (state.boss.chestArmorHP === 0) {
                state.boss.chestArmorBroken = true;
                state.phase = 3;
                sfx.armorBreak();
                state.boss.expression = "blush";
                state.boss.expressionTimer = 85;
                showCutin("💥 CHEST ARMOR FULL PURGE!! バスト露出＆クライマックスPHASE 3突入！", 240);
                addScore(12000, armorX, armorY, "FULL PURGE!!");
                spawnFloatingCapsule(2, "buff");
                spawnFloatingCapsule(5, "buff");

                // Big armor break debris explosion!
                for (let i = 0; i < 40; i++) {
                  const ang = Math.random() * Math.PI * 2;
                  const spd = 2.5 + Math.random() * 6.5;
                  state.particles.push({
                    x: armorX + (Math.random() - 0.5) * 60,
                    y: armorY + (Math.random() - 0.5) * 40,
                    vx: Math.cos(ang) * spd,
                    vy: Math.sin(ang) * spd,
                    color: Math.random() < 0.5 ? "#ff1493" : (Math.random() < 0.5 ? "#00f5d4" : "#e6ff00"),
                    life: 35 + Math.floor(Math.random() * 25)
                  });
                }
              } else {
                addScore(1500, armorX, armorY, `CHEST HP:${state.boss.chestArmorHP}`);
              }
            } else {
              addScore(800, armorX, armorY, "CHEST SHIELD");
            }
            addFever(6);
          }
        } else {
          // EXPOSED SOFT BUST ("ぷるぷる" soft bounce)
          [
            { key: "L", obj: state.boss.bustL },
            { key: "R", obj: state.boss.bustR }
          ].forEach(({ key, obj }) => {
            const cx = obj.x + obj.dx;
            const cy = obj.y + obj.dy;
            const dx = ball.x - cx;
            const dy = ball.y - cy;
            const dist = Math.hypot(dx, dy);
            const minDist = ball.r + obj.r;
            if (dist < minDist && dist > 0.001) {
              const nx = dx / dist;
              const ny = dy / dist;
              ball.x = cx + nx * (minDist + 2);
              ball.y = cy + ny * (minDist + 2);

              const speed = Math.hypot(ball.vx, ball.vy);
              const softSpeed = state.fever.active
                ? Math.max(7.5, Math.min(13.0, speed * 1.3)) // High bounce in Fever!
                : Math.max(3.2, Math.min(6.5, speed * 0.58)); // Soft cushion normally

              ball.vx = nx * softSpeed;
              ball.vy = ny * softSpeed - 1.2;
              impulseBust(key, -nx * Math.min(8, speed), -ny * Math.min(8, speed));
            }
          });
        }

        // 4. Mecha Colliders
        const checkCircleBumper = (bObj, kickSpeed, onHit) => {
          const dx = ball.x - bObj.x;
          const dy = ball.y - bObj.y;
          const dist = Math.hypot(dx, dy);
          const minDist = ball.r + bObj.r;
          if (dist < minDist && dist > 0.001) {
            const nx = dx / dist;
            const ny = dy / dist;
            ball.x = bObj.x + nx * (minDist + 2);
            ball.y = bObj.y + ny * (minDist + 2);
            if (!state.overdriveActive) {
              ball.vx = nx * kickSpeed;
              ball.vy = ny * kickSpeed;
            }
            bObj.flash = 12;
            onHit(bObj);
          }
        };

        // Drones (Phase 1 Shield Generators + Capsule Dispensers)
        [
          { d: state.boss.droneL, hpKey: "droneL_HP", slot: 0, tag: "L-DRONE" },
          { d: state.boss.droneR, hpKey: "droneR_HP", slot: 1, tag: "R-DRONE" }
        ].forEach(({ d, hpKey, slot, tag }) => {
          checkCircleBumper(d, 10.5, () => {
            sfx.metalBumper();
            state.droneComboCount++;
            addFever(8);
            addParticles(d.x, d.y, "#00f5d4", 10, 4.0);

            if (state.phase === 1 && state.boss[hpKey] > 0) {
              state.boss[hpKey]--;
              if (state.boss[hpKey] === 0) {
                sfx.armorBreak();
                addScore(3000, d.x, d.y - 15, `💥${tag} DOWN!!`);
                showCutin(`💥 ${tag} 撃破！ 肩アーマーの電磁シールド解除！`);
                spawnFloatingCapsule(slot, "buff");
              } else {
                addScore(1000, d.x, d.y - 15, `${tag} HP:${state.boss[hpKey]}`);
              }
            } else {
              addScore(800, d.x, d.y - 15, "DRONE HIT");
              if (state.droneComboCount % 4 === 0) {
                spawnFloatingCapsule(slot);
              }
            }
          });
        });

        // Bunny Ear Sensors (Skill Shot target & Core unlock)
        checkCircleBumper(state.boss.earL, 8.2, ear => {
          sfx.metalBumper();
          state.boss.leftEarLit = true;
          addFever(10);
          if (state.skillShotEligible) {
            state.skillShotEligible = false;
            addScore(25000, ear.x, ear.y, "★SKILL SHOT!!");
            showCutin("🎯 ★SKILL SHOT 炸裂!! +25,000pts ＆ レアカプセル出現！", 180);
            spawnFloatingCapsule(2, "buff");
          } else {
            addScore(1200, ear.x, ear.y, "L-EAR SENSOR!");
          }
          if (state.boss.leftEarLit && state.boss.rightEarLit && !state.boss.coreUnlocked) {
            state.boss.coreUnlocked = true;
            showCutin("🔓 両耳センサー達成！ 胸元の黄色いコアのロック解除！");
            spawnFloatingCapsule(5, "buff");
          }
          updateHUD();
        });

        checkCircleBumper(state.boss.earR, 8.2, ear => {
          sfx.metalBumper();
          state.boss.rightEarLit = true;
          addFever(10);
          if (state.skillShotEligible) {
            state.skillShotEligible = false;
            addScore(25000, ear.x, ear.y, "★SKILL SHOT!!");
            showCutin("🎯 ★SKILL SHOT 炸裂!! +25,000pts ＆ レアカプセル出現！", 180);
            spawnFloatingCapsule(2, "buff");
          } else {
            addScore(1200, ear.x, ear.y, "R-EAR SENSOR!");
          }
          if (state.boss.leftEarLit && state.boss.rightEarLit && !state.boss.coreUnlocked) {
            state.boss.coreUnlocked = true;
            showCutin("🔓 両耳センサー達成！ 胸元の黄色いコアのロック解除！");
            spawnFloatingCapsule(5, "buff");
          }
          updateHUD();
        });

        // Left Shoulder Armor Pod (Phase 1 Target, HP 5)
        checkCircleBumper(state.boss.podL, 9.5, pod => {
          sfx.metalBumper();
          addFever(8);
          if (state.boss.leftShoulderHP > 0) {
            const shielded = state.phase === 1 && state.boss.droneL_HP > 0;
            if (shielded) {
              addScore(500, pod.x, pod.y, "L-DRONE SHIELDED");
              addPopup(pod.x, pod.y - 15, "先にL-DRONEを倒せ!", "#00f5d4", 0.95);
            } else {
              state.boss.leftShoulderHP--;
              addParticles(pod.x, pod.y, "#ff1493", 14, 4.5);
              if (state.boss.leftShoulderHP === 0) {
                sfx.armorBreak();
                state.boss.expression = "shock";
                state.boss.expressionTimer = 65;
                addScore(5000, pod.x, pod.y, "💥L-ARMOR BREAK!!");
                showCutin("💥 左肩アーマー破壊！ 常設強化カプセル放出！");
                spawnFloatingCapsule(3, "perm");
                checkPhase1Clear();
              } else {
                addScore(1500, pod.x, pod.y, `L-POD HP:${state.boss.leftShoulderHP}`);
              }
            }
          } else {
            addScore(1800, pod.x, pod.y, "WEAK SPOT!");
          }
          updateHUD();
        });

        // Right Shoulder Armor Pod (Phase 1 Target, HP 5)
        checkCircleBumper(state.boss.podR, 9.5, pod => {
          sfx.metalBumper();
          addFever(8);
          if (state.boss.rightShoulderHP > 0) {
            const shielded = state.phase === 1 && state.boss.droneR_HP > 0;
            if (shielded) {
              addScore(500, pod.x, pod.y, "R-DRONE SHIELDED");
              addPopup(pod.x, pod.y - 15, "先にR-DRONEを倒せ!", "#00f5d4", 0.95);
            } else {
              state.boss.rightShoulderHP--;
              addParticles(pod.x, pod.y, "#ff1493", 14, 4.5);
              if (state.boss.rightShoulderHP === 0) {
                sfx.armorBreak();
                state.boss.expression = "shock";
                state.boss.expressionTimer = 65;
                addScore(5000, pod.x, pod.y, "💥R-ARMOR BREAK!!");
                showCutin("💥 右肩アーマー破壊！ 常設強化カプセル放出！");
                spawnFloatingCapsule(4, "perm");
                checkPhase1Clear();
              } else {
                addScore(1500, pod.x, pod.y, `R-POD HP:${state.boss.rightShoulderHP}`);
              }
            }
          } else {
            addScore(1800, pod.x, pod.y, "WEAK SPOT!");
          }
          updateHUD();
        });

        function checkPhase1Clear() {
          if (state.boss.leftShoulderHP === 0 && state.boss.rightShoulderHP === 0 && state.phase === 1) {
            state.phase = 2;
            sfx.burstTrigger();
            state.boss.expression = "shock";
            state.boss.expressionTimer = 90;
            showCutin("🎉 PHASE 1 突破!! 外装防衛網壊滅！ PHASE 2: 胸部複合装甲(HP 10)を撃ち抜け！", 240);
            spawnFloatingCapsule(2, "buff");
          }
        }

        // Chest Core Gem (Phase 3 Final Target)
        checkCircleBumper(state.boss.core, 11.2, core => {
          addFever(14);
          if (state.phase === 3) {
            state.boss.coreHP--;
            sfx.burstTrigger();
            state.boss.expression = "shock";
            state.boss.expressionTimer = 60;
            addParticles(core.x, core.y, "#e6ff00", 25, 5.5);
            addScore(8000, core.x, core.y - 20, `★CORE HIT!! HP:${state.boss.coreHP}`);

            if (state.boss.coreHP <= 0) {
              triggerStageClear();
            } else {
              spawnFloatingCapsule(5, "buff");
            }
          } else if (state.boss.coreUnlocked) {
            sfx.burstTrigger();
            addParticles(core.x, core.y, "#e6ff00", 20, 4.5);
            addScore(5000, core.x, core.y - 18, "★JACKPOT!!");
            spawnFloatingCapsule(5, "buff");
          } else {
            sfx.metalBumper();
            addScore(1500, core.x, core.y - 16, "CORE SHIELDED");
          }
          updateHUD();
        });

        // 5. Permanent Installed Upgrades
        // (A) Center Post with 3-Hit Durability!
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
            sfx.metalBumper();
            addParticles(px, py, "#00f5d4", 10, 3.5);
            if (state.perm.centerPostHP === 0) {
              addPopup(px, py - 15, "GUARD BROKEN!", "#ff1493", 1.1);
              sfx.armorBreak();
            } else {
              addPopup(px, py - 15, `SAVE! 残りHP:${state.perm.centerPostHP}`, "#00f5d4", 0.95);
            }
          }
        }

        // (B) Kickbacks with 1-charge consumption
        if (state.perm.kickbackL > 0 && state.perm.kickbackL_charges > 0 && ball.x < 46 && ball.y > 530 && ball.vy > 0) {
          ball.vy = -14.5;
          ball.vx = 4.0;
          state.perm.kickbackL_charges = 0;
          sfx.metalBumper();
          addParticles(32, 565, "#00f5d4", 14, 4.2);
          addScore(1500, 50, 545, "L-LASER SAVE!");
        }
        if (state.perm.kickbackR > 0 && state.perm.kickbackR_charges > 0 && !ball.inShooterLane && ball.x > 350 && ball.x < 380 && ball.y > 530 && ball.vy > 0) {
          ball.vy = -14.5;
          ball.vx = -4.0;
          state.perm.kickbackR_charges = 0;
          sfx.metalBumper();
          addParticles(364, 565, "#00f5d4", 14, 4.2);
          addScore(1500, 345, 545, "R-LASER SAVE!");
        }

        // (C) Sub-Bumpers
        if (state.perm.subBumpers > 0) {
          [
            { x: 146, y: 465, r: 15 },
            { x: 250, y: 465, r: 15 }
          ].forEach(sb => {
            checkCircleBumper(sb, 9.2, () => {
              sfx.metalBumper();
              addFever(6);
              addParticles(sb.x, sb.y, "#e6ff00", 10, 3.8);
              addScore(950 * state.perm.subBumpers, sb.x, sb.y - 12, "⚡PLASMA");
            });
          });
        }
      }

      // Clamp max ball speed for stable control
      const spd = Math.hypot(ball.vx, ball.vy);
      if (spd > 13.2) {
        ball.vx = (ball.vx / spd) * 13.2;
        ball.vy = (ball.vy / spd) * 13.2;
      }
    }
  }

  // Update Balls & Drain Check
  for (let bi = state.balls.length - 1; bi >= 0; bi--) {
    const ball = state.balls[bi];
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 9) ball.trail.shift();

    if (ball.y > H + 18) {
      state.balls.splice(bi, 1);
      if (state.balls.length === 0) {
        state.ballsRemaining--;
        if (state.ballsRemaining > 0) {
          addPopup(210, 580, `BALL LOST... 残り${state.ballsRemaining}球`, "#ff1493", 1.1);
          prepareBallForLaunch();
        } else {
          // Reset balls for seamless play
          state.ballsRemaining = 3;
          showCutin("🔄 3球終了！ コンティニュー補充しました");
          prepareBallForLaunch();
        }
        updateHUD();
      }
    }
  }

  // Update Floating Hologram Capsules & Ball Collision Check (Plan A)
  for (let ci = state.capsules.length - 1; ci >= 0; ci--) {
    const cap = state.capsules[ci];
    cap.phase += 0.06;
    cap.y = cap.baseY + Math.sin(cap.phase) * 3.5;
    cap.life--;

    let caught = false;
    for (const ball of state.balls) {
      if (Math.hypot(ball.x - cap.x, ball.y - cap.y) < ball.r + cap.r + 2) {
        caught = true;
        break;
      }
    }

    if (caught) {
      collectCapsule(cap);
      state.capsules.splice(ci, 1);
    } else if (cap.life <= 0) {
      // Disappear after timeout
      state.capsules.splice(ci, 1);
    }
  }

  // Update Particles, Popups & Lightning
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
  [
    state.boss.droneL, state.boss.droneR,
    state.boss.earL, state.boss.earR,
    state.boss.podL, state.boss.podR,
    state.boss.core
  ].forEach(g => { if (g.flash > 0) g.flash--; });
}

// =========================================================================
// 7. RETRO-16BIT PIXEL-ART CANVAS RENDERER
// =========================================================================
function renderTable() {
  ctx.save();
  ctx.translate(state.nudgeOffset.x, state.nudgeOffset.y);

  // Background
  ctx.fillStyle = "#09031c";
  ctx.fillRect(0, 0, W, H);

  // Subtle ambient horizontal floor glow
  ctx.strokeStyle = state.fever.active ? "rgba(255, 20, 147, 0.25)" : "rgba(130, 35, 205, 0.15)";
  ctx.lineWidth = 1;
  for (let y = 460; y < H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(370, y);
    ctx.stroke();
  }

  // Draw Centerpiece Illustration (Armored Breastplate vs Exposed Inner-Suit)
  if (imgLoaded) {
    const isArmored = !state.boss.chestArmorBroken && centerpieceArmoredImg.complete;
    const baseImg = isArmored ? centerpieceArmoredImg : centerpieceImg;
    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // If Chest Armor is Broken -> Draw Dynamic "Puru-Puru" Bust Sprites!
    if (state.boss.chestArmorBroken) {
      const drawSpringBustPatch = (b) => {
        const disp = Math.hypot(b.dx, b.dy);
        ctx.save();
        const cx = b.x + b.dx;
        const cy = b.y + b.dy;
        const scaleX = 1 + (b.dx * 0.008) - (b.dy * 0.006);
        const scaleY = 1 + (b.dy * 0.008) - (b.dx * 0.006);

        ctx.translate(cx, cy);
        ctx.scale(scaleX, scaleY);
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.clip();

        const srcScaleX = centerpieceImg.width / IMG_BOX.w;
        const srcScaleY = centerpieceImg.height / IMG_BOX.h;
        const sx = (b.x - b.r - IMG_BOX.x) * srcScaleX;
        const sy = (b.y - b.r - IMG_BOX.y) * srcScaleY;
        const sw = (b.r * 2) * srcScaleX;
        const sh = (b.r * 2) * srcScaleY;

        ctx.drawImage(centerpieceImg, sx, sy, sw, sh, -b.r, -b.r, b.r * 2, b.r * 2);

        if (b.flash > 0 || disp > 0.6 || state.fever.active) {
          ctx.strokeStyle = state.fever.active ? "#e6ff00" : "rgba(255, 20, 147, 0.75)";
          ctx.lineWidth = b.flash > 0 ? 3 : 2;
          ctx.beginPath();
          ctx.arc(0, 0, b.r - 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      };
      drawSpringBustPatch(state.boss.bustL);
      drawSpringBustPatch(state.boss.bustR);
    } else {
      // In Phase 2 (Chest Armor under active attack), show cyber-lock targeting bracket & HP
      if (state.phase === 2) {
        ctx.save();
        const ax = 198, ay = 352;
        const pulse = (Math.floor(state.boss.animTick / 8) % 2 === 0);
        ctx.strokeStyle = pulse ? "#e6ff00" : "#ff1493";
        ctx.lineWidth = 2;
        // Cybernetic targeting corner brackets around the armored chest
        const bw = 55, bh = 34;
        const len = 10;
        // Top-left
        ctx.beginPath(); ctx.moveTo(ax - bw, ay - bh + len); ctx.lineTo(ax - bw, ay - bh); ctx.lineTo(ax - bw + len, ay - bh); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(ax + bw - len, ay - bh); ctx.lineTo(ax + bw, ay - bh); ctx.lineTo(ax + bw, ay - bh + len); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(ax - bw, ay + bh - len); ctx.lineTo(ax - bw, ay + bh); ctx.lineTo(ax - bw + len, ay + bh); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(ax + bw - len, ay + bh); ctx.lineTo(ax + bw, ay + bh); ctx.lineTo(ax + bw, ay + bh - len); ctx.stroke();

        ctx.fillStyle = "#e6ff00";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "center";
        ctx.fillText(`CHEST ARMOR [${"■".repeat(state.boss.chestArmorHP)}]`, ax, ay + bh + 12);
        ctx.restore();
      }
    }

    // Face Patch Compositing
    let activePatchKey = null;
    const isTalking = state.boss.talkTimer > 0;
    const talkPhase = Math.floor(state.boss.animTick / 5) % 3;
    const isBriefFlinch = state.boss.expressionTimer > 38;

    if (state.boss.expression === "angry_emp" || state.boss.expression === "shock") {
      activePatchKey = isBriefFlinch ? "shout" : ((isTalking && talkPhase === 0) ? "talk" : "open_blush");
    } else if (state.boss.expression === "blush") {
      activePatchKey = isBriefFlinch ? "wince" : ((isTalking && talkPhase === 0) ? "talk" : "open_blush");
    } else if (state.boss.winkTimer > 0) {
      activePatchKey = "wink";
    } else if (state.boss.blinkTimer <= 0 && state.boss.blinkTimer >= -5) {
      activePatchKey = "blink";
    } else if (isTalking) {
      if (talkPhase === 0) activePatchKey = "talk";
      else if (talkPhase === 1) activePatchKey = "talk_sm";
    }

    if (activePatchKey && facePatchImgs[activePatchKey] && facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (135 / 384) * IMG_BOX.w;
      const fy = IMG_BOX.y + (160 / 688) * IMG_BOX.h;
      const fw = (115 / 384) * IMG_BOX.w;
      const fh = (75 / 688) * IMG_BOX.h;
      ctx.drawImage(facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }
  }

  // Draw Gimmick Overlays
  const drawRingGimmick = (g, color, label, active = true) => {
    ctx.save();
    ctx.strokeStyle = g.flash > 0 ? "#ffffff" : color;
    ctx.lineWidth = g.flash > 0 ? 3.5 : 2;
    ctx.setLineDash(active ? [] : [4, 4]);
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.stroke();
    if (g.flash > 0) {
      ctx.fillStyle = "rgba(230, 255, 0, 0.35)";
      ctx.fill();
    }
    if (label) {
      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(label, g.x, g.y - g.r - 4);
    }
    ctx.restore();
  };

  drawRingGimmick(state.boss.droneL, "#00f5d4", "DRONE");
  drawRingGimmick(state.boss.droneR, "#00f5d4", "DRONE");
  drawRingGimmick(state.boss.earL, state.boss.leftEarLit ? "#e6ff00" : "#ff1493", state.boss.leftEarLit ? "EAR:OK" : "EAR-L");
  drawRingGimmick(state.boss.earR, state.boss.rightEarLit ? "#e6ff00" : "#ff1493", state.boss.rightEarLit ? "EAR:OK" : "EAR-R");

  // Shoulder Armor HP
  [
    { pod: state.boss.podL, hp: state.boss.leftShoulderHP, tag: "ARMOR-L" },
    { pod: state.boss.podR, hp: state.boss.rightShoulderHP, tag: "ARMOR-R" }
  ].forEach(({ pod, hp, tag }) => {
    const col = hp > 0 ? "#ff1493" : "#00f5d4";
    drawRingGimmick(pod, col, hp > 0 ? `${tag}[${"■".repeat(hp)}]` : "BREAK!", hp > 0);
  });

  // Chest Core Gem
  ctx.save();
  const core = state.boss.core;
  ctx.strokeStyle = core.flash > 0 ? "#ffffff" : (state.phase === 3 ? "#ff1493" : (state.boss.coreUnlocked ? "#e6ff00" : "#00f5d4"));
  ctx.lineWidth = (state.phase === 3 || state.boss.coreUnlocked) ? 3 : 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const ang = (Math.PI / 3) * i - Math.PI / 6;
    const px = core.x + Math.cos(ang) * core.r;
    const py = core.y + Math.sin(ang) * core.r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = state.phase === 3 ? "#ff1493" : (state.boss.coreUnlocked ? "#e6ff00" : "#00f5d4");
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.phase === 3 ? `KO HIT[${state.boss.coreHP}]` : (state.boss.coreUnlocked ? "★JACKPOT★" : "CORE"), core.x, core.y - core.r - 5);
  ctx.restore();

  // Draw Permanent Upgrades
  // Sub-Bumpers
  if (state.perm.subBumpers > 0) {
    [
      { x: 146, y: 465, r: 15 },
      { x: 250, y: 465, r: 15 }
    ].forEach(sb => {
      ctx.save();
      ctx.fillStyle = "rgba(0, 245, 212, 0.22)";
      ctx.strokeStyle = "#00f5d4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(sb.x, sb.y, sb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`⚡Lv${state.perm.subBumpers}`, sb.x, sb.y + 3);
      ctx.restore();
    });
  }

  // Laser Kickbacks
  if (state.perm.kickbackL > 0) {
    ctx.save();
    ctx.strokeStyle = state.perm.kickbackL_charges > 0 ? "#00f5d4" : "#442255";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(18, 558);
    ctx.lineTo(44, 558);
    ctx.stroke();
    ctx.restore();
  }
  if (state.perm.kickbackR > 0) {
    ctx.save();
    ctx.strokeStyle = state.perm.kickbackR_charges > 0 ? "#00f5d4" : "#442255";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(352, 558);
    ctx.lineTo(378, 558);
    ctx.stroke();
    ctx.restore();
  }

  // Center Post (with Durability Bar!)
  if (state.perm.centerPost > 0 && state.perm.centerPostHP > 0) {
    const postR = 7 + state.perm.centerPost * 3.5;
    ctx.save();
    ctx.fillStyle = "rgba(0, 245, 212, 0.35)";
    ctx.strokeStyle = "#e6ff00";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(198, 614, postR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(`HP:${state.perm.centerPostHP}`, 198, 638);
    ctx.restore();
  }

  // Walls & Neon Rails
  ctx.save();
  ctx.strokeStyle = "#ff1493";
  ctx.lineWidth = 3;
  TABLE_WALLS.forEach(w => {
    ctx.beginPath();
    ctx.moveTo(w.x1, w.y1);
    ctx.lineTo(w.x2, w.y2);
    ctx.stroke();
  });
  ctx.restore();

  // Draw Flippers
  const flippers = getFlippers();
  flippers.forEach((f, idx) => {
    const st = flipperState[idx];
    const x2 = f.px + Math.cos(st.angle) * f.len;
    const y2 = f.py + Math.sin(st.angle) * f.len;

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = state.magnetActive ? "#e6ff00" : "#00f5d4";
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.moveTo(f.px, f.py);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.px, f.py);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    ctx.fillStyle = "#e6ff00";
    ctx.beginPath();
    ctx.arc(f.px, f.py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Draw Floating Hologram Capsules (Plan A)
  state.capsules.forEach(cap => {
    ctx.save();
    const w = 44;
    const h = 20;
    const alpha = (cap.life < 180 && Math.floor(cap.life / 8) % 2 === 0) ? 0.35 : 1.0;
    ctx.globalAlpha = alpha;
    ctx.translate(cap.x, cap.y);

    ctx.fillStyle = "#160638";
    ctx.strokeStyle = cap.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = cap.color;
    ctx.beginPath();
    ctx.roundRect(-w / 2 + 2, -h / 2 + 2, 8, h - 4, 4);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.textAlign = "center";
    ctx.fillText(cap.label, 3, 3);
    ctx.restore();
  });

  // Plunger Visualizer in Shooter Lane (x: 393, y: 580..635)
  if (state.plunger.waitingForLaunch || state.plunger.pulling) {
    ctx.save();
    const pullOffset = (state.plunger.power / 100) * 32;
    const py = 592 + pullOffset;

    // Spring coils behind plunger
    ctx.strokeStyle = "#e6ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(393, py + 12);
    const coils = 6;
    for (let i = 0; i <= coils; i++) {
      const cy = py + 12 + (i / coils) * (635 - (py + 12));
      const cx = 393 + (i % 2 === 0 ? -6 : 6);
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();

    // Plunger head
    ctx.fillStyle = state.plunger.pulling ? "#ff1493" : "#00f5d4";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fillRect(386, py, 14, 12);
    ctx.strokeRect(386, py, 14, 12);

    // Guide text and pulse arrow when ready
    if (state.plunger.waitingForLaunch && !state.plunger.pulling) {
      const bounce = Math.sin(state.boss.animTick * 0.15) * 4;
      ctx.fillStyle = "#e6ff00";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("▼", 393, 545 + bounce);
      ctx.fillText("PULL", 393, 532 + bounce);
    } else if (state.plunger.pulling) {
      // Power percentage
      ctx.fillStyle = "#ff1493";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.floor(state.plunger.power)}%`, 393, 545);
    }
    ctx.restore();
  }

  // Draw Balls
  state.balls.forEach(ball => {
    ball.trail.forEach((pt, idx) => {
      const alpha = (idx + 1) / ball.trail.length;
      ctx.fillStyle = state.fever.active
        ? `rgba(255, 20, 147, ${alpha * 0.5})`
        : `rgba(0, 245, 212, ${alpha * 0.38})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, ball.r * (0.4 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.save();
    ctx.fillStyle = state.overdriveActive ? "#e6ff00" : "#ffffff";
    ctx.strokeStyle = state.fever.active ? "#e6ff00" : (state.burstTimer > 0 ? "#ff1493" : "#00f5d4");
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });

  // Particles & Popups
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

  ctx.restore();
}

// =========================================================================
// 8. DOM HUD UPDATES & CONTROLS BINDING
// =========================================================================
function updateHUD() {
  document.getElementById("hudScore").textContent = state.score.toLocaleString();

  const phaseTargets = {
    1: "P1: 両肩アーマーを撃破せよ!",
    2: "P2: 胸部装甲パージを狙え!",
    3: "P3: 露出コアを叩き込め!!"
  };
  document.getElementById("hudPhaseTarget").textContent = phaseTargets[state.phase] || "外装破壊せよ!";
  document.getElementById("hudPhase").textContent = `PHASE ${state.phase}`;

  // Fever Gauge HUD (Strict single-line text, never expands or breaks layout)
  const fBar = document.getElementById("feverGaugeBar");
  if (fBar) fBar.style.width = `${state.fever.gauge}%`;
  const fText = document.getElementById("hudBurstTimer");
  if (fText) {
    if (state.fever.active) {
      const sec = Math.ceil(state.fever.timer / 60);
      fText.textContent = `🔥FEVER ×5 (${sec}s)`;
      fText.className = "text-[9px] text-[#e6ff00] font-extrabold truncate whitespace-nowrap leading-none animate-pulse";
    } else if (state.burstTimer > 0) {
      const sec = Math.ceil(state.burstTimer / 60);
      fText.textContent = `BURST ×${state.burstMultiplier.toFixed(1)} (${sec}s)`;
      fText.className = "text-[9px] text-[#ff1493] font-bold truncate whitespace-nowrap leading-none";
    } else {
      fText.textContent = `FEVER: ${Math.floor(state.fever.gauge)}%`;
      fText.className = "text-[9px] text-[#00f5d4] font-bold truncate whitespace-nowrap leading-none";
    }
  }

  document.getElementById("hudBalls").textContent = "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining));

  // Buff Slots
  const slotsContainer = document.getElementById("buffSlots");
  slotsContainer.innerHTML = "";
  state.keptBuffs.forEach((slot, idx) => {
    const div = document.createElement("div");
    if (slot) {
      const def = BUFF_DEFS[slot.id];
      div.className = "rounded px-1.5 py-1 border text-center bg-[#230b4f]";
      div.style.borderColor = def.color;
      div.innerHTML = `
        <div class="text-xs font-bold truncate" style="color:${def.color}">${def.label}</div>
        <div class="text-xs text-[#e6ff00] font-bold">★Lv.${slot.tier}</div>
      `;
    } else {
      div.className = "rounded px-1.5 py-1 border border-dashed border-[#00f5d4]/30 text-center bg-black/30 flex flex-col justify-center";
      div.innerHTML = `<div class="text-xs text-[#00f5d4]/40">SLOT ${idx + 1}</div><div class="text-xs text-[#00f5d4]/30">EMPTY</div>`;
    }
    slotsContainer.appendChild(div);
  });

  // Permanent Upgrades List
  const permContainer = document.getElementById("permUpgradesList");
  permContainer.innerHTML = "";
  Object.values(PERM_DEFS).forEach(def => {
    const lv = state.perm[def.id];
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

  // Boss Status Monitor
  document.getElementById("blushGaugeText").textContent = `${state.boss.blushGauge}%`;
  document.getElementById("blushGaugeBar").style.width = `${state.boss.blushGauge}%`;
  document.getElementById("statusShoulders").textContent = `L:${state.boss.leftShoulderHP}/3 R:${state.boss.rightShoulderHP}/3`;
  document.getElementById("statusChestArmor").textContent = state.boss.chestArmorBroken ? "💥PURGED!" : `HP: ${state.boss.chestArmorHP}/4`;
  document.getElementById("statusEars").textContent = `L:${state.boss.leftEarLit ? "ON" : "OFF"} / R:${state.boss.rightEarLit ? "ON" : "OFF"}`;
  document.getElementById("statusCore").textContent = state.phase === 3 ? `HP: ${state.boss.coreHP}/6 [KO可]` : (state.boss.coreUnlocked ? "★UNLOCKED★" : "SHIELDED");

  const faceMap = {
    smile: "余裕スマイル",
    blush: "赤面ぷるぷる///",
    shock: "ダメージ焦り顔!?",
    angry_emp: "EMP逆上カウンター⚡"
  };
  document.getElementById("bossFaceStatus").textContent = faceMap[state.boss.expression] || "余裕スマイル";
}

function setLeftFlip(down) {
  if (down && !state.leftFlipperDown) sfx.flip();
  state.leftFlipperDown = down;
}

function setRightFlip(down) {
  if (down && !state.rightFlipperDown) sfx.flip();
  state.rightFlipperDown = down;
}

function triggerNudge() {
  sfx.flip();
  state.nudgeOffset.x = (Math.random() - 0.5) * 10;
  state.nudgeOffset.y = -5;
  state.balls.forEach(b => {
    b.vy -= 2.4;
    b.vx += (Math.random() - 0.5) * 3.8;
  });
  if (state.boss.chestArmorBroken) {
    impulseBust("L", 2.5, -3.5);
  }
}

// ----------------------------------------------------
// MOBILE BROWSER ZOOM & GESTURE PREVENTION (Strict Fullscreen)
// ----------------------------------------------------
// Prevent Safari/Chrome double-tap zoom & pinch-to-zoom
document.addEventListener("gesturestart", e => e.preventDefault(), { passive: false });
document.addEventListener("gesturechange", e => e.preventDefault(), { passive: false });
document.addEventListener("gestureend", e => e.preventDefault(), { passive: false });

let lastTouchEnd = 0;
document.addEventListener("touchend", e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 320) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener("touchstart", e => {
  if (e.touches && e.touches.length > 1) {
    // Block multi-touch browser pinch-zoom while allowing canvas multi-touch pointer events
    e.preventDefault();
  }
}, { passive: false });

// Keyboard Bindings
window.addEventListener("keydown", e => {
  if (["ArrowLeft", "KeyA", "KeyZ"].includes(e.code)) {
    e.preventDefault();
    setLeftFlip(true);
  } else if (["ArrowRight", "KeyD", "Slash"].includes(e.code)) {
    e.preventDefault();
    setRightFlip(true);
  } else if (["ArrowDown", "KeyS"].includes(e.code)) {
    e.preventDefault();
    startPlungerPull();
  } else if (e.code === "Space") {
    e.preventDefault();
    triggerBurstBuffs();
  } else if (["ArrowUp", "KeyW"].includes(e.code)) {
    e.preventDefault();
    triggerNudge();
  }
});

window.addEventListener("keyup", e => {
  if (["ArrowLeft", "KeyA", "KeyZ"].includes(e.code)) {
    setLeftFlip(false);
  } else if (["ArrowRight", "KeyD", "Slash"].includes(e.code)) {
    setRightFlip(false);
  } else if (["ArrowDown", "KeyS"].includes(e.code)) {
    releasePlunger();
  }
});

// Touch / Button Bindings for Smartphone & Mouse
const bindHold = (id, onDown, onUp) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("pointerdown", e => { e.preventDefault(); onDown(); });
  el.addEventListener("pointerup", e => { e.preventDefault(); onUp(); });
  el.addEventListener("pointerleave", () => onUp());
  el.addEventListener("pointercancel", () => onUp());
};

bindHold("btnLeftFlip", () => setLeftFlip(true), () => setLeftFlip(false));
bindHold("btnRightFlip", () => setRightFlip(true), () => setRightFlip(false));

// Smartphone Direct Plunger Button (Press & Hold or Tap)
const plungerBtn = document.getElementById("btnPlunger");
if (plungerBtn) {
  let plungerInterval = null;
  plungerBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    if (!state.plunger.waitingForLaunch) return;
    state.plunger.pulling = true;
    if (plungerInterval) clearInterval(plungerInterval);
    plungerInterval = setInterval(() => {
      state.plunger.power = Math.min(100, state.plunger.power + 4.0);
    }, 25);
  });
  const finishPlungerBtn = () => {
    if (plungerInterval) {
      clearInterval(plungerInterval);
      plungerInterval = null;
    }
    if (state.plunger.pulling) {
      if (state.plunger.power < 20) state.plunger.power = 76;
      releasePlunger();
    }
  };
  plungerBtn.addEventListener("pointerup", finishPlungerBtn);
  plungerBtn.addEventListener("pointerleave", finishPlungerBtn);
  plungerBtn.addEventListener("pointercancel", finishPlungerBtn);
}

// Full Multi-Touch Support for Direct Canvas Play
const activeTouches = new Map();

canvas.addEventListener("pointerdown", e => {
  e.preventDefault();
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (W / rect.width);
  const y = (e.clientY - rect.top) * (H / rect.height);

  if (state.plunger.waitingForLaunch) {
    // If waiting for launch, touch anywhere on right side or lower screen pulls the plunger!
    if (x > 220 || y > 420) {
      activeTouches.set(e.pointerId, { type: "plunger", startY: y, lastY: y });
      state.plunger.pulling = true;
      return;
    }
  }

  // Normal Gameplay Multi-Touch
  const side = x < W / 2 ? "L" : "R";
  activeTouches.set(e.pointerId, { type: side });
  if (side === "L") setLeftFlip(true);
  else setRightFlip(true);
});

canvas.addEventListener("pointermove", e => {
  const t = activeTouches.get(e.pointerId);
  if (t && t.type === "plunger") {
    const rect = canvas.getBoundingClientRect();
    const y = (e.clientY - rect.top) * (H / rect.height);
    const dragDist = Math.max(0, y - t.startY);
    state.plunger.power = Math.min(100, (dragDist / 60) * 100);
    t.lastY = y;
  }
});

const handlePointerEnd = e => {
  const t = activeTouches.get(e.pointerId);
  if (!t) return;
  activeTouches.delete(e.pointerId);

  if (t.type === "plunger") {
    if (state.plunger.power < 15) state.plunger.power = 76; // Tap-to-launch default power
    releasePlunger();
  } else if (t.type === "L") {
    const stillHoldingL = Array.from(activeTouches.values()).some(v => v.type === "L");
    if (!stillHoldingL) setLeftFlip(false);
  } else if (t.type === "R") {
    const stillHoldingR = Array.from(activeTouches.values()).some(v => v.type === "R");
    if (!stillHoldingR) setRightFlip(false);
  }
};

canvas.addEventListener("pointerup", handlePointerEnd);
canvas.addEventListener("pointercancel", handlePointerEnd);

document.getElementById("btnNudge").addEventListener("click", triggerNudge);
document.getElementById("btnBurst").addEventListener("click", triggerBurstBuffs);
document.getElementById("btnAudio").addEventListener("click", e => {
  sfx.enabled = !sfx.enabled;
  e.currentTarget.textContent = `FM: ${sfx.enabled ? "ON" : "OFF"}`;
});

// Menu Drawer Modal Toggle
const menuDrawer = document.getElementById("menuDrawer");
const btnMenu = document.getElementById("btnMenu");
const btnCloseMenu = document.getElementById("btnCloseMenu");

if (btnMenu && menuDrawer) {
  btnMenu.addEventListener("click", () => {
    menuDrawer.classList.remove("hidden");
    menuDrawer.classList.add("flex");
  });
}
if (btnCloseMenu && menuDrawer) {
  btnCloseMenu.addEventListener("click", () => {
    menuDrawer.classList.add("hidden");
    menuDrawer.classList.remove("flex");
  });
  menuDrawer.addEventListener("click", e => {
    if (e.target === menuDrawer) {
      menuDrawer.classList.add("hidden");
      menuDrawer.classList.remove("flex");
    }
  });
}
document.getElementById("btnReset").addEventListener("click", () => {
  state = createInitialState();
  prepareBallForLaunch();
  updateHUD();
  showCutin("🔄 テーブル＆ビルドを初期化しました");
});

// Modal Actions
const modal = document.getElementById("clearModal");
if (modal) {
  document.getElementById("btnClearReplay").addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    state = createInitialState();
    prepareBallForLaunch();
    updateHUD();
  });
  document.getElementById("btnClearNext").addEventListener("click", () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    state = createInitialState();
    prepareBallForLaunch();
    updateHUD();
    showCutin("🚀 STAGE 2 開発中... STAGE 1を強化状態でリプレイ開始！");
  });
  document.querySelectorAll(".relic-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll(".relic-btn").forEach(b => b.classList.remove("border-[#e6ff00]", "bg-[#ff1493]/40"));
      btn.classList.add("border-[#e6ff00]", "bg-[#ff1493]/40");
      const relic = btn.dataset.relic;
      showCutin(`⚙️ 鹵獲パーツ [${btn.querySelector('.font-bold').textContent}] を装着しました！`);
    });
  });
}

// Shortcuts
document.getElementById("dbgDropPerm").addEventListener("click", () => spawnFloatingCapsule(null, "perm"));
document.getElementById("dbgDropBuff").addEventListener("click", () => spawnFloatingCapsule(null, "buff"));
document.getElementById("dbgPuruTest").addEventListener("click", () => {
  state.boss.chestArmorBroken = true;
  impulseBust("L", 6.5, -7.5);
  impulseBust("R", -6.5, -7.5);
});
document.getElementById("dbgMultiball").addEventListener("click", () => startFeverMode());
document.getElementById("dbgFaceAnim").addEventListener("click", () => {
  sfx.capsuleCatch();
  const modes = ["wink", "blush", "shock", "angry_emp"];
  const next = modes[(state.boss.animTick) % modes.length];
  state.boss.expression = next;
  state.boss.expressionTimer = 65;
  state.boss.talkTimer = 100;
  updateHUD();
});

// =========================================================================
// 9. ANIMATION LOOP
// =========================================================================
let rafId = null;
let isSimulationRunning = false;

function loop() {
  if (!isSimulationRunning) return;
  stepPhysics();
  renderTable();
  rafId = requestAnimationFrame(loop);
}

function startSimulation() {
  if (!isSimulationRunning) {
    isSimulationRunning = true;
    rafId = requestAnimationFrame(loop);
  }
}

function stopSimulation() {
  isSimulationRunning = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

// Boot
state = createInitialState();
prepareBallForLaunch();
updateHUD();
startSimulation();

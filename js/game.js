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

const earTipLImg = new Image();
earTipLImg.src = './assets/stage1/ear_tip_L.png';
const earTipRImg = new Image();
earTipRImg.src = './assets/stage1/ear_tip_R.png';

const defeatCgImg = new Image();
defeatCgImg.src = './assets/stage1/defeat_cg.jpg';

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
    name: "股下ストッパー",
    desc: "フリッパー間の死に穴に電磁ピン(耐久3回)を展開",
    maxLv: 3
  },
  kickbackL: {
    id: "kickbackL",
    name: "左レーザーガード",
    desc: "左端落下時にレーザーで自動撃ち返し(1回)",
    maxLv: 2
  },
  kickbackR: {
    id: "kickbackR",
    name: "右レーザーガード",
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
  mult2x:   { id: "mult2x",   label: "スコア×2", color: "#ff1493", mult: 2.0, desc: "スコア倍率×2.0" },
  overdrive:{ id: "overdrive",label: "電撃貫通", color: "#e6ff00", mult: 1.8, desc: "貫通電撃ボール＆倍率×1.8" },
  magnet:   { id: "magnet",   label: "磁力吸着", color: "#00f5d4", mult: 1.5, desc: "フリッパー磁力吸着＆×1.5" },
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
      bustL: { x: 160, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },
      bustR: { x: 236, y: 354, r: 24, dx: 0, dy: 0, vx: 0, vy: 0, flash: 0, rot: 0 },

      // Mecha Colliders (Calibrated 1:1 with centerpiece pixel art landmarks)
      // Drones (Spherical pods)
      droneL: { x: 61,  y: 175, r: 16, flash: 0, rot: 0 },
      droneR: { x: 335, y: 175, r: 16, flash: 0, rot: 0 },
      // Hanging Rabbit Ear Tips (Capsule collider from hinge joint to dangling tip with swing physics)
      earL:   {
        ax: 137, ay: 49,   // Hinge joint pivot
        bx: 68,  by: 105,  // Tip
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },
      earR:   {
        ax: 258, ay: 49,   // Hinge joint pivot
        bx: 329, by: 105,  // Tip
        r: 17,
        angle: 0, angleVel: 0,
        dx: 0, dy: 0, vx: 0, vy: 0,
        flash: 0
      },
      // Shoulder Armor Clusters (Spherical collider tracing outer shoulder pad radius R)
      podL:   { x: 108, y: 290, r: 23, flash: 0, rot: 0 },
      podR:   { x: 288, y: 290, r: 23, flash: 0, rot: 0 },
      // Waist / Hip Cyber Units (Belt side units, active and animated from Phase 1)
      hipL:   { x: 110, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },
      hipR:   { x: 285, y: 450, r: 15, flash: 0, rot: 0, hp: 4 },
      // Crotch Secret Gravity Well (Activated when chest armor is shattered; powerful gravitational suction!)
      crotch: { x: 198, y: 556, r: 17, gravRadius: 120, flash: 0, rot: 0, charge: 0, maxCharge: 3, cooldown: 0 },
      // Core Gem at chest center
      core:   { x: 198, y: 311, r: 16, flash: 0 }
    },

    balls: [],
    capsules: [], // Floating holo-capsules
    particles: [],
    popups: [],
    lightningArcs: [],
    armorDebris: [],   // Flying shattered armor plates
    shockwaves: [],    // Expanding optical shockwave rings
    hearts: [],        // Floating pink heart particles on bust hit
    hitStopTimer: 0,   // Freeze-frame impact feedback (frames)

    leftFlipperDown: false,
    rightFlipperDown: false,
    nudgeOffset: { x: 0, y: 0 },

    // Stage Clear Cinematic Transition Sequence
    clearSequence: {
      active: false,
      frame: 0,
      phase: "none", // "shatter" | "smoke" | "whiteout" | "reveal" | "done"
      whiteoutAlpha: 0,
      cgRevealAlpha: 0,
      shatterPieces: [],
      smokeClouds: [],
      uiShown: false
    }
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

  // Recharge table defenses on new ball
  if (state.perm.kickbackL > 0) state.perm.kickbackL_charges = 1;
  if (state.perm.kickbackR > 0) state.perm.kickbackR_charges = 1;
  if (state.perm.centerPost > 0) state.perm.centerPostHP = 3;

  showCutin("【ゲーム開始】<br>画面の左右タップでパドル操作！ 発射ボタン または 右下スワイプで発射！", 150);
}

function spawnBall(x = 198, y = 260, vx = 0, vy = -7.5) {
  // Cap active multiballs to 3 balls max to prevent endless cascading loops
  if (state.balls.length >= 3) return;
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
  label.innerHTML = text;
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

  showCutin("🔥【BOMB-O-FEVER 突入】🔥<br>マルチボール発動＆スコア倍率×5.0！", 200);
  addParticles(198, 350, "#e6ff00", 35, 6.0);
  updateHUD();
}

function endFeverMode() {
  state.fever.active = false;
  state.fever.gauge = 0;
  state.fever.mult = 1.0;
  state.boss.bustL.r = 24;
  state.boss.bustR.r = 24;
  showCutin("【FEVER 終了】<br>通常モードへ復帰します", 100);
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
      addPopup(cap.x, cap.y - 12, `🛠 ${def.name} Lv.${state.perm[key]}`, "#00f5d4", 1.15);
      showCutin(`🛠【パーツ鹵獲設置】<br>${def.name} Lv.${state.perm[key]} を展開！`, 160);
    } else {
      if (key === "centerPost") state.perm.centerPostHP = 3;
      if (key === "kickbackL") state.perm.kickbackL_charges = 1;
      if (key === "kickbackR") state.perm.kickbackR_charges = 1;
      addScore(3500, cap.x, cap.y, "MAX REPAIR");
    }
  } else {
    const key = cap.subId;
    const def = BUFF_DEFS[key];
    if (key === "fever") {
      addFever(50);
      addPopup(cap.x, cap.y - 12, "FEVER +50%!", "#b84dff", 1.2);
    } else {
      const existingIdx = state.keptBuffs.findIndex(b => b && b.id === key && b.tier < 3);
      if (existingIdx !== -1) {
        state.keptBuffs[existingIdx].tier++;
        const newTier = state.keptBuffs[existingIdx].tier;
        addPopup(cap.x, cap.y - 12, `合成 ★Lv.${newTier}`, "#e6ff00", 1.2);
        showCutin(`⚡【バフ合成強化】<br>${def.label} が ★Lv.${newTier} にランクアップ！`, 160);
      } else {
        const emptyIdx = state.keptBuffs.findIndex(b => b === null);
        if (emptyIdx !== -1) {
          state.keptBuffs[emptyIdx] = { id: key, tier: 1 };
          addPopup(cap.x, cap.y - 12, `KEEP! ${def.label}`, def.color, 1.1);
        } else {
          state.keptBuffs[0].tier = Math.min(3, state.keptBuffs[0].tier + 1);
          addPopup(cap.x, cap.y - 12, `FULL合成 ★Lv.${state.keptBuffs[0].tier}`, "#e6ff00", 1.1);
        }
      }
    }
  }
  updateHUD();
}

function triggerBurstBuffs() {
  const activeList = state.keptBuffs.filter(Boolean);
  if (activeList.length === 0) {
    addPopup(W / 2, 520, "NO BUFFS!", "#ff1493", 1.0);
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
  showCutin(`🔥【BURST解放】🔥<br>スコア倍率 ×${state.burstMultiplier.toFixed(1)} (10秒間発動)！`, 180);
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
      showCutin(`⭐【EXTRA BALL 獲得】⭐<br>スコアボーナス！ ボール＋1球 (残り${state.ballsRemaining}球)`, 210);
    }
  }

  updateHUD();
}

// =========================================================================
// 3.4. DYNAMIC ARMOR BREAK & PURGE EFFECTS
// =========================================================================
function triggerArmorBreakEffect(type, cx, cy) {
  // type: "shoulder_l" | "shoulder_r" | "chest"
  // 1. Violent Screen Shake & Hit-stop Impact
  state.nudgeOffset.x = (Math.random() - 0.5) * 22;
  state.nudgeOffset.y = (Math.random() - 0.5) * 18;
  state.hitStopTimer = 4; // 4 frames of micro-freeze for heavy impact sensation

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

  // 4. Chunky Armor Plate Shards (Metal debris flying off!)
  const shardCount = type === "chest" ? 16 : 10;
  for (let i = 0; i < shardCount; i++) {
    const angle = Math.atan2(cy - 300, cx - 198) + (Math.random() - 0.5) * 1.8;
    const spd = 4.2 + Math.random() * 6.8;
    state.armorDebris.push({
      x: cx + (Math.random() - 0.5) * 24,
      y: cy + (Math.random() - 0.5) * 20,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - (2.5 + Math.random() * 3.0), // Kick upwards first
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
  sfx.armorBreak();
  addParticles(cx, cy, "#ff1493", 26, 7.5);
  addParticles(cx, cy, "#e6ff00", 22, 6.0);
}

function spawnHeartParticle(x, y, isSmall = false) {
  state.hearts.push({
    x: x + (Math.random() - 0.5) * (isSmall ? 10 : 24),
    y: y + (Math.random() - 0.5) * (isSmall ? 8 : 16),
    vx: (Math.random() - 0.5) * (isSmall ? 0.9 : 2.2),
    vy: isSmall ? (-0.9 - Math.random() * 0.9) : (-1.8 - Math.random() * 2.2), // Rising up
    size: isSmall ? (4.5 + Math.random() * 3.5) : (10 + Math.random() * 8),
    scale: 0.2,
    maxScale: isSmall ? 0.7 : (1.0 + Math.random() * 0.4),
    life: isSmall ? (30 + Math.floor(Math.random() * 18)) : (50 + Math.floor(Math.random() * 25)),
    maxLife: isSmall ? 48 : 75,
    alpha: 1.0,
    color: isSmall ? "#ff69b4" : "#ff1493"
  });
}

// =========================================================================
// 3.5. STAGE CLEAR CINEMATIC TRANSITION (SHATTER, SMOKE & WHITEOUT)
// =========================================================================
function shatterTableFrame() {
  const shards = [];
  TABLE_WALLS.forEach(w => {
    const len = Math.hypot(w.x2 - w.x1, w.y2 - w.y1);
    const count = Math.max(3, Math.floor(len / 18));
    const baseAngle = Math.atan2(w.y2 - w.y1, w.x2 - w.x1);

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const px = w.x1 + (w.x2 - w.x1) * t;
      const py = w.y1 + (w.y2 - w.y1) * t;

      // Blast direction away from Core (x: 198, y: 307)
      const blastAngle = Math.atan2(py - 307, px - 198) + (Math.random() - 0.5) * 0.7;
      const spd = 3.5 + Math.random() * 6.5;

      shards.push({
        x: px,
        y: py,
        vx: Math.cos(blastAngle) * spd,
        vy: Math.sin(blastAngle) * spd - (Math.random() * 3.0),
        len: 10 + Math.random() * 8,
        angle: baseAngle + (Math.random() - 0.5) * 0.4,
        vAngle: (Math.random() - 0.5) * 0.28,
        color: Math.random() > 0.4 ? "#ff1493" : "#00f5d4",
        life: 160,
        maxLife: 160
      });
    }
  });
  return shards;
}

function spawnSmokeCloud(x, y, color = "#ff66b2") {
  return {
    x: x + (Math.random() - 0.5) * 50,
    y: y + (Math.random() - 0.5) * 40,
    vx: (Math.random() - 0.5) * 3.2,
    vy: -1.6 - Math.random() * 2.8, // Rising smoke
    r: 22 + Math.random() * 20,
    maxR: 70 + Math.random() * 40,
    growth: 0.8 + Math.random() * 0.7,
    color,
    alpha: 0.1,
    maxAlpha: 0.55 + Math.random() * 0.25,
    life: 100 + Math.floor(Math.random() * 40),
    maxLife: 120
  };
}

// Stage Clear (KO!) Cinematic Trigger
function triggerStageClear() {
  if (state.stageCleared) return;
  state.stageCleared = true;
  state.clearSequence.active = true;
  state.clearSequence.frame = 0;
  state.clearSequence.phase = "shatter";

  // Massive explosion audio & visual shockwave
  sfx.burstTrigger();
  showCutin("💥【CRITICAL K.O.】💥<br>機体制御崩壊！ 装甲強制パージ！", 180);
  addParticles(198, 307, "#ffffff", 60, 9.5);
  addParticles(198, 307, "#ff1493", 60, 8.0);
  addParticles(198, 307, "#e6ff00", 60, 8.0);

  // Generate shattering table frame pieces
  state.clearSequence.shatterPieces = shatterTableFrame();

  // Blast active balls away with dramatic explosion shockwave
  state.balls.forEach(ball => {
    const blastAngle = Math.atan2(ball.y - 307, ball.x - 198) + (Math.random() - 0.5) * 0.6;
    const blastSpeed = 8.0 + Math.random() * 4.5;
    ball.vx = Math.cos(blastAngle) * blastSpeed;
    ball.vy = Math.sin(blastAngle) * blastSpeed - 3.0;
  });
}

function updateClearSequence() {
  const seq = state.clearSequence;
  if (!seq.active) return;
  seq.frame++;

  // Step 1: 0..45 Frame -> Table Frame Shatter & Violent Screen Shake, then smoothly dampen
  if (seq.frame < 45) {
    state.nudgeOffset.x = (Math.random() - 0.5) * 16;
    state.nudgeOffset.y = (Math.random() - 0.5) * 12;
    if (seq.frame % 10 === 0) {
      sfx.armorBreak();
      addParticles(198 + (Math.random() - 0.5) * 120, 307 + (Math.random() - 0.5) * 80, "#ff1493", 16, 5.0);
    }
  } else {
    // Smoothly restore screen to normal center position!
    state.nudgeOffset.x *= 0.84;
    state.nudgeOffset.y *= 0.84;
  }

  // Update flying wall shards
  seq.shatterPieces.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.16; // Gravity pulling shards down
    p.vx *= 0.98;
    p.angle += p.vAngle;
    p.life--;
  });

  // Step 2: 25..120 Frame -> Billowing Smoke & Blinding Whiteout Flash
  if (seq.frame >= 25 && seq.frame <= 120) {
    // Continuously spawn smoke clouds from core & bottom
    for (let i = 0; i < 3; i++) {
      const col = Math.random() > 0.5 ? "#ff66b2" : (Math.random() > 0.5 ? "#b84dff" : "#e6e0f8");
      seq.smokeClouds.push(spawnSmokeCloud(198, 320, col));
    }
    if (seq.frame % 2 === 0) {
      seq.smokeClouds.push(spawnSmokeCloud(100 + Math.random() * 220, 580, "#ffffff"));
    }
  }

  // Whiteout buildup (Frame 65..105): 0 -> 1.0
  if (seq.frame >= 65 && seq.frame <= 105) {
    seq.whiteoutAlpha = Math.min(1.0, (seq.frame - 65) / 38);
    if (seq.frame === 104) {
      sfx.burstTrigger();
    }
  }

  // Step 3: Frame 105+ -> Background switches to Defeat CG! Whiteout fades out
  if (seq.frame >= 105) {
    seq.cgRevealAlpha = 1.0;
    // Whiteout fading out (1.0 -> 0)
    seq.whiteoutAlpha = Math.max(0, 1.0 - (seq.frame - 105) / 45);

    // Continuous real-time billowing smoke and rising steam from damage zones:
    // Ensures REAL-TIME smoke animation is constantly, actively billowing behind the translucent dialogue box!
    // 1. Thigh breach active combustion (around x: 295, y: 450) - dense, live billows covering the static art!
    if (seq.frame % 2 === 0) {
      const colors = ["#ffffff", "#f0e6ff", "#d8c8ff", "#ffd1e6", "#6c528a"];
      const col = colors[Math.floor(Math.random() * colors.length)];
      const thighCloud = spawnSmokeCloud(295 + (Math.random() - 0.5) * 16, 455 + (Math.random() - 0.5) * 12, col);
      thighCloud.r = 14 + Math.random() * 10;
      thighCloud.maxR = 44 + Math.random() * 18;
      thighCloud.vy = -1.5 - Math.random() * 1.8;
      thighCloud.vx = -0.4 + (Math.random() - 0.5) * 1.2;
      thighCloud.alpha = 0.25;
      thighCloud.maxAlpha = 0.65;
      seq.smokeClouds.push(thighCloud);

      // Thigh electrical fire sparks!
      if (Math.random() < 0.8) {
        state.particles.push({
          x: 295 + (Math.random() - 0.5) * 14,
          y: 455 + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -1.5 - Math.random() * 3.0,
          color: Math.random() > 0.4 ? "#ffdd00" : "#ff55aa",
          life: 25 + Math.floor(Math.random() * 20),
          scale: 1.2
        });
      }
    }

    // 2. Playfield bottom smoke continuously drifting upward through translucent dialogue box (y: 580-620)
    if (seq.frame % 3 === 0) {
      const botCloud = spawnSmokeCloud(60 + Math.random() * 300, 610, Math.random() > 0.5 ? "#ffffff" : "#c4b5fd");
      botCloud.r = 22 + Math.random() * 16;
      botCloud.maxR = 60 + Math.random() * 25;
      botCloud.vy = -1.6 - Math.random() * 1.8;
      botCloud.alpha = 0.2;
      botCloud.maxAlpha = 0.55;
      seq.smokeClouds.push(botCloud);
    }

    // 3. Chest breach smoke & sparks (around x: 215, y: 270)
    if (seq.frame % 6 === 0) {
      const chestCloud = spawnSmokeCloud(215 + (Math.random() - 0.5) * 15, 270 + (Math.random() - 0.5) * 15, "#e0d0ff");
      chestCloud.r = 12 + Math.random() * 10;
      chestCloud.maxR = 38 + Math.random() * 14;
      chestCloud.vy = -1.0 - Math.random() * 1.2;
      seq.smokeClouds.push(chestCloud);
    }

    // Ambient floating glowing dust & electrical sparks over defeat CG (Keeps screen alive!)
    if (Math.random() < 0.7) {
      state.particles.push({
        x: 60 + Math.random() * 280,
        y: 440 + Math.random() * 180,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -1.0 - Math.random() * 2.0,
        color: Math.random() > 0.5 ? "#ff66b2" : (Math.random() > 0.5 ? "#00f5d4" : "#e6ff00"),
        life: 55 + Math.floor(Math.random() * 40)
      });
    }
  }

  // Update rising & expanding smoke clouds
  seq.smokeClouds.forEach(s => {
    s.x += s.vx;
    s.y += s.vy;
    s.vx *= 0.98;
    if (s.r < s.maxR) s.r += s.growth;
    s.life--;
    // If post-whiteout (defeat CG view), smoothly fade smoke near character's face
    // (x: 130..266, y: 140..270) so the expressive face remains crisp and clear!
    const nearFace = seq.frame >= 105 && s.y > 140 && s.y < 270 && Math.abs(s.x - 198) < 68;
    if (nearFace) {
      s.alpha = Math.max(0, s.alpha - 0.045);
    } else if (s.life < 30) {
      s.alpha = Math.max(0, s.alpha - 0.025);
    } else if (s.alpha < s.maxAlpha) {
      s.alpha = Math.min(s.maxAlpha, s.alpha + 0.04);
    }
  });
  seq.smokeClouds = seq.smokeClouds.filter(s => s.life > 0 && s.alpha > 0.01);

  // Step 4: Frame 155+ -> Seamlessly Fade in Clear Modal Overlay!
  if (seq.frame >= 155 && !seq.uiShown) {
    seq.uiShown = true;
    updateHUD();
    const modal = document.getElementById("clearModal");
    if (modal) {
      const scoreEl = document.getElementById("clearFinalScore");
      if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
      const ballsEl = document.getElementById("clearRemainingBalls");
      if (ballsEl) ballsEl.textContent = "●".repeat(state.ballsRemaining) + ` (${state.ballsRemaining})`;
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      // Smooth fade-in
      setTimeout(() => {
        modal.classList.remove("opacity-0");
        modal.classList.add("opacity-100");
      }, 30);
    }
  }
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
    showCutin("⚡「ちょ、どこ触ってんのよっ！！」<br>カウンターEMP発動＆カプセル放出！", 180);
    addParticles(210, 390, "#ff1493", 32, 6.5);
    spawnFloatingCapsule(5, "buff");
    state.balls.forEach(ball => {
      ball.vy = -12 - Math.random() * 4;
      ball.vx = (Math.random() - 0.5) * 12;
    });
  }
  updateHUD();
}

function impulseEar(which, torque, vxImpact, vyImpact) {
  const ear = which === "L" ? state.boss.earL : state.boss.earR;
  sfx.earBoing();
  ear.angleVel += torque * 0.15;
  ear.vx += (vxImpact || 0) * 0.8;
  ear.vy += (vyImpact || 0) * 0.8;
  ear.flash = 18;
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

  // Hanging Rabbit Ear Tips Soft Elastic Spring Physics (Angular pivot + linear bounce)
  const earAngStiffness = 0.09;
  const earAngDamping = 0.93;
  [state.boss.earL, state.boss.earR].forEach(ear => {
    // Angular pendulum spring around hinge pivot
    const angAcc = -earAngStiffness * ear.angle;
    ear.angleVel = (ear.angleVel + angAcc) * earAngDamping;
    ear.angle += ear.angleVel;
    ear.angle = Math.max(-0.35, Math.min(0.35, ear.angle));

    // Linear translation damping
    const ax = -0.12 * ear.dx;
    const ay = -0.12 * ear.dy;
    ear.vx = (ear.vx + ax) * earAngDamping;
    ear.vy = (ear.vy + ay) * earAngDamping;
    ear.dx += ear.vx;
    ear.dy += ear.vy;
    ear.dx = Math.max(-14, Math.min(14, ear.dx));
    ear.dy = Math.max(-14, Math.min(14, ear.dy));

    if (ear.flash > 0) ear.flash--;
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

// Clean static table walls & inlanes/outlanes (True Pinball Inlane/Outlane Architecture)
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

  // Mid playfield upper outer guide deflectors (funnels stray balls toward outlane entrance)
  { x1: 16,  y1: 280, x2: 20,  y2: 360 },
  { x1: 380, y1: 280, x2: 376, y2: 360 },

  // Lane Dividers (Separates Outlane from Inlane; Top is open for ball entry!)
  // Left Divider: Outlane width = 34px (x: 16..50), Inlane width = 32px (x: 50..82)
  { x1: 50,  y1: 420, x2: 50,  y2: 558 },
  { x1: 50,  y1: 558, x2: 110, y2: 600 }, // Inlane floor feeding left flipper

  // Right Divider: Outlane width = 34px (x: 346..380), Inlane width = 32px (x: 314..346)
  { x1: 346, y1: 420, x2: 346, y2: 558 },
  { x1: 346, y1: 558, x2: 286, y2: 600 }, // Inlane floor feeding right flipper

  // Slingshot Inner Walls (Forms inner boundary of inlane + triangular slingshot body)
  { x1: 84,  y1: 450, x2: 84,  y2: 535 },
  { x1: 84,  y1: 450, x2: 106, y2: 565, isSlingshot: true, kickDir: { x: 0.98, y: -0.19 } }, // Left Slingshot kicker face
  { x1: 84,  y1: 535, x2: 106, y2: 565 },

  { x1: 312, y1: 450, x2: 312, y2: 535 },
  { x1: 312, y1: 450, x2: 290, y2: 565, isSlingshot: true, kickDir: { x: -0.98, y: -0.19 } }, // Right Slingshot kicker face
  { x1: 312, y1: 535, x2: 290, y2: 565 },

  // Outlane Drain Slopes (below kickback)
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
function updateDebrisAndEffects() {
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

  // Shockwaves
  for (let i = state.shockwaves.length - 1; i >= 0; i--) {
    const sw = state.shockwaves[i];
    sw.r += sw.speed;
    sw.alpha = Math.max(0, 1 - sw.r / sw.maxR);
    if (sw.r >= sw.maxR) state.shockwaves.splice(i, 1);
  }

  // Floating Hearts
  for (let i = state.hearts.length - 1; i >= 0; i--) {
    const h = state.hearts[i];
    h.x += h.vx + Math.sin(h.life * 0.15) * 0.6;
    h.y += h.vy;
    h.scale = Math.min(h.maxScale, h.scale + 0.08);
    h.alpha = Math.min(1.0, h.life / (h.maxLife * 0.4));
    h.life--;
    if (h.life <= 0) state.hearts.splice(i, 1);
  }
}

function stepPhysics() {
  if (state.clearSequence && state.clearSequence.active) {
    updateClearSequence();
    updateBossSprings();
    updateDebrisAndEffects();

    // Keep ball physics and gravity active until blinded by whiteout! (Frame < 105)
    if (state.clearSequence.frame < 105) {
      state.balls.forEach(ball => {
        ball.x += ball.vx;
        ball.y += ball.vy;
        ball.vy += 0.22; // Gravity
        ball.vx *= 0.99;
        ball.trail.push({ x: ball.x, y: ball.y });
        if (ball.trail.length > 9) ball.trail.shift();
      });

      // Update flippers smoothly during shatter sequence
      const flippers = getFlippers();
      flippers.forEach((f, idx) => {
        const st = flipperState[idx];
        const pressed = f.isLeft ? state.leftFlipperDown : state.rightFlipperDown;
        const target = pressed ? f.activeAngle : f.restAngle;
        st.angle += (target - st.angle) * 0.44;
      });
    }

    // Continue running particle and popup physics even after clear!
    state.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
    });
    state.particles = state.particles.filter(p => p.life > 0);
    state.popups.forEach(pop => {
      pop.y -= 0.6;
      pop.life--;
    });
    state.popups = state.popups.filter(pop => pop.life > 0);
    return;
  }

  // Hit-stop micro freeze on heavy armor break impact
  if (state.hitStopTimer > 0) {
    state.hitStopTimer--;
    updateDebrisAndEffects();
    return;
  }

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
          if (w.isSlingshot && dot < 0) {
            // Slingshot powerful elastic kicker!
            ball.vx = w.kickDir.x * 11.2;
            ball.vy = w.kickDir.y * 11.2;
            sfx.metalBumper();
            addParticles(cp.x, cp.y, "#e6ff00", 10, 4.0);
            addParticles(cp.x, cp.y, "#ff1493", 6, 3.0);
            addScore(500, cp.x, cp.y, "SLINGSHOT!");
          } else if (dot < 0) {
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

      // 3. Collide with Chest (Heavy Armor Plate vs Exposed Bust)
      if (s === 0) {
        // Helper: Elliptical collision detection matching visual contours
        const checkEllipseHit = (cx, cy, rx, ry) => {
          const dx = ball.x - cx;
          const dy = ball.y - cy;
          const ndx = dx / rx;
          const ndy = dy / ry;
          const distNorm = Math.hypot(ndx, ndy);
          if (distNorm < 0.0001) return null;
          const realDist = Math.hypot(dx, dy);
          const boundR = realDist / distNorm;
          const minDist = boundR + ball.r;
          if (realDist < minDist) {
            return { nx: dx / realDist, ny: dy / realDist, minDist, cx, cy };
          }
          return null;
        };

        // Helper: Capsule collision detection for diagonal/hanging parts
        const checkCapsuleHit = (ax, ay, bx, by, cr) => {
          const abx = bx - ax;
          const aby = by - ay;
          const apx = ball.x - ax;
          const apy = ball.y - ay;
          const abLenSq = abx * abx + aby * aby;
          if (abLenSq < 0.001) return null;
          let t = (apx * abx + apy * aby) / abLenSq;
          t = Math.max(0, Math.min(1, t));
          const qx = ax + t * abx;
          const qy = ay + t * aby;
          const dx = ball.x - qx;
          const dy = ball.y - qy;
          const dist = Math.hypot(dx, dy);
          const minDist = ball.r + cr;
          if (dist < minDist && dist > 0.0001) {
            return {
              qx, qy,
              nx: dx / dist,
              ny: dy / dist,
              minDist,
              t,
              abx, aby, abLenSq
            };
          }
          return null;
        };

        if (!state.boss.chestArmorBroken) {
          // CHEST COMPOSITE ARMOR PLATE (Contour matching illustration: cx: 198, cy: 353, rx: 54, ry: 26)
          const hit = checkEllipseHit(198, 353, 54, 26);
          if (hit) {
            ball.x = hit.cx + hit.nx * (hit.minDist + 1.5);
            ball.y = hit.cy + hit.ny * (hit.minDist + 1.5);
            ball.vx = hit.nx * 7.5;
            ball.vy = hit.ny < 0 ? Math.max(-6.5, hit.ny * 7.5) : hit.ny * 7.5;
            sfx.metalBumper();

            if (state.phase === 2 && state.boss.chestArmorHP > 0) {
              state.boss.chestArmorHP--;
              addParticles(hit.cx, hit.cy, "#ff1493", 16, 5.0);
              if (state.boss.chestArmorHP === 5) {
                triggerArmorBreakEffect("chest", hit.cx, hit.cy);
                addScore(4000, hit.cx, hit.cy, "💥ARMOR CRACK!!");
                showCutin("⚠️【胸部装甲に亀裂発生】<br>第1装甲破壊！ あと5回直撃で完全パージ！", 180);
              } else if (state.boss.chestArmorHP === 0) {
                state.boss.chestArmorBroken = true;
                state.phase = 3;
                triggerArmorBreakEffect("chest", hit.cx, hit.cy);
                state.boss.expression = "blush";
                state.boss.expressionTimer = 85;
                showCutin("💥【CHEST ARMOR PURGE】💥<br>完全装甲パージ！ 秘密のグラビティコア起動！", 240);
                addScore(15000, hit.cx, hit.cy, "FULL PURGE!!");
                spawnFloatingCapsule(2, "buff");
                spawnFloatingCapsule(5, "buff");
              } else {
                addScore(1500, hit.cx, hit.cy, `CHEST HP:${state.boss.chestArmorHP}`);
              }
            } else {
              addScore(800, hit.cx, hit.cy, "CHEST SHIELD");
            }
            addFever(3);
          }
        } else {
          // EXPOSED SOFT BUST ("ぷるぷる" soft bounce + Heart Splash & Sexy SFX)
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
                ? Math.max(8.5, Math.min(14.0, speed * 1.35)) // High bounce in Fever!
                : Math.max(3.8, Math.min(7.2, speed * 0.65)); // Elastic cushion

              ball.vx = nx * softSpeed;
              ball.vy = ny * softSpeed - 1.2;
              impulseBust(key, -nx * Math.min(10, speed * 1.2), -ny * Math.min(10, speed * 1.2));

              // Soft bounce SFX, floating hearts & boss blushing reaction!
              sfx.softPuru();
              for (let i = 0; i < 5; i++) {
                spawnHeartParticle(cx, cy);
              }
              state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 14);
              state.boss.expression = "blush";
              state.boss.expressionTimer = 55;
              addFever(10);
              addScore(3000, cx, cy, "💖PURU-PURU HIT!");
              updateHUD();
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
              // Cap upward rebound speed so the ball returns to flippers naturally
              ball.vy = ny < 0 ? Math.max(-7.2, ny * kickSpeed) : ny * kickSpeed;
            }
            bObj.flash = 12;
            onHit(bObj);
          }
        };

        // Drones (Floating mecha pods near top corners)
        [
          { d: state.boss.droneL, hpKey: "droneL_HP", slot: 0, tag: "L-DRONE" },
          { d: state.boss.droneR, hpKey: "droneR_HP", slot: 1, tag: "R-DRONE" }
        ].forEach(({ d, hpKey, slot, tag }) => {
          const isDestroyed = state.boss[hpKey] === 0;
          const spd = isDestroyed ? 8.5 : 7.2;
          checkCircleBumper(d, spd, () => {
            sfx.metalBumper();
            state.droneComboCount++;
            addFever(4);
            addParticles(d.x, d.y, isDestroyed ? "#e6ff00" : "#00f5d4", 12, 4.5);

            if (state.phase === 1 && state.boss[hpKey] > 0) {
              state.boss[hpKey]--;
              if (state.boss[hpKey] === 0) {
                triggerArmorBreakEffect("shoulder_l", d.x, d.y);
                addScore(4000, d.x, d.y - 15, `💥${tag} DOWN!!`);
                showCutin(`💥【${tag} 撃破】<br>肩アーマーの電磁シールドが解除！`, 160);
                spawnFloatingCapsule(slot, "buff");
              } else {
                addScore(1000, d.x, d.y - 15, `${tag} HP:${state.boss[hpKey]}`);
              }
            } else {
              addScore(2500, d.x, d.y - 15, "⚡LASER RICOCHET!");
              if (state.droneComboCount % 4 === 0) {
                spawnFloatingCapsule(slot);
              }
            }
          });
        });

        // Hanging Rabbit Ear Tips (Soft "ふにょん" Capsule Damper matching diagonal dangling purple ear tip contours)
        [
          { which: "L", ear: state.boss.earL, litKey: "leftEarLit", tag: "L-EAR" },
          { which: "R", ear: state.boss.earR, litKey: "rightEarLit", tag: "R-EAR" }
        ].forEach(({ which, ear, litKey, tag }) => {
          // Dynamic tip position taking into account swing angle and spring offset
          const localBx = ear.bx - ear.ax;
          const localBy = ear.by - ear.ay;
          const cosA = Math.cos(ear.angle);
          const sinA = Math.sin(ear.angle);
          const curBx = ear.ax + (localBx * cosA - localBy * sinA) + ear.dx;
          const curBy = ear.ay + (localBx * sinA + localBy * cosA) + ear.dy;
          const curAx = ear.ax + ear.dx * 0.25;
          const curAy = ear.ay + ear.dy * 0.25;

          const hit = checkCapsuleHit(curAx, curAy, curBx, curBy, ear.r);
          if (hit) {
            ball.x = hit.qx + hit.nx * (hit.minDist + 1.5);
            ball.y = hit.qy + hit.ny * (hit.minDist + 1.5);

            // "ふにょん" speed damper: Absorbs & cushions ball velocity (kills speed to ~45%)
            const speed = Math.hypot(ball.vx, ball.vy);
            const dampSpeed = Math.max(2.6, Math.min(5.0, speed * 0.45));
            ball.vx = hit.nx * dampSpeed;
            ball.vy = hit.ny * dampSpeed + 0.6;

            // Angular torque impulse on the ear hinge (tip swings more!)
            const lever = 0.5 + hit.t * 0.9;
            const earLen = Math.sqrt(hit.abLenSq);
            const earDirX = hit.abx / earLen;
            const earDirY = hit.aby / earLen;
            const cross = earDirX * hit.ny - earDirY * hit.nx;
            const torque = cross * (speed * 0.08 + 0.6) * lever;
            impulseEar(which, torque, -hit.nx * 2, -hit.ny * 2);

            // Soft elastic sound & cute violet/cyan particles
            sfx.earBoing();
            addParticles(hit.qx, hit.qy, "#b84dff", 10, 3.5);
            addParticles(hit.qx, hit.qy, "#00f5d4", 6, 2.5);

            state.boss[litKey] = true;
            addFever(5);

            if (state.skillShotEligible) {
              state.skillShotEligible = false;
              addScore(25000, hit.qx, hit.qy, "★SKILL SHOT!!");
              showCutin("🎯【SKILL SHOT 炸裂】<br>垂れ耳クッションキャッチ！ +25,000pts ＆ レアカプセル！", 180);
              spawnFloatingCapsule(2, "buff");
            } else {
              addScore(2000, hit.qx, hit.qy, "🐰FUNYON DAMP!");
              addPopup(hit.qx, hit.qy - 18, "🐰ふにょん (SPEED DAMP)", "#e6ff00", 1.0);
            }

            // Boss tickled reaction
            state.boss.expression = "wink";
            state.boss.winkTimer = 35;

            if (state.boss.leftEarLit && state.boss.rightEarLit && !state.boss.coreUnlocked) {
              state.boss.coreUnlocked = true;
              showCutin("🔓【両耳センサー達成】<br>胸部コアのロックが一時解除！", 180);
              spawnFloatingCapsule(5, "buff");
            }
            updateHUD();
          }
        });

        // Shoulder Armor Clusters (Calibrated 1:1 to circular shoulder pad outer radius R)
        [
          { which: "L", pod: state.boss.podL, hpKey: "leftShoulderHP", droneKey: "droneL_HP", tag: "L-ARMOR" },
          { which: "R", pod: state.boss.podR, hpKey: "rightShoulderHP", droneKey: "droneR_HP", tag: "R-ARMOR" }
        ].forEach(({ which, pod, hpKey, droneKey, tag }) => {
          const isDestroyed = state.boss[hpKey] === 0;
          const kickSpd = isDestroyed ? 9.2 : 7.5;
          checkCircleBumper(pod, kickSpd, () => {
            if (state.boss[hpKey] > 0) {
              sfx.metalBumper();
              addFever(4);
              const shielded = state.phase === 1 && state.boss[droneKey] > 0;
              if (shielded) {
                addScore(500, pod.x, pod.y, `${tag} SHIELDED`);
                addPopup(pod.x, pod.y - 15, `先に${which}-DRONEを倒せ!`, "#00f5d4", 0.95);
              } else {
                state.boss[hpKey]--;
                addParticles(pod.x, pod.y, "#ff1493", 14, 4.5);
                if (state.boss[hpKey] === 0) {
                  triggerArmorBreakEffect(which === "L" ? "shoulder_l" : "shoulder_r", pod.x, pod.y);
                  state.boss.expression = "shock";
                  state.boss.expressionTimer = 65;
                  addScore(5000, pod.x, pod.y, `💥${tag} BREAK!!`);
                  showCutin(`💥【${which === "L" ? "左" : "右"}肩アーマー破壊】<br>内部ジェネレータ露出！ ⚡EX-BOUNCE活性化！`, 180);
                  spawnFloatingCapsule(which === "L" ? 3 : 4, "perm");
                  checkPhase1Clear();
                } else {
                  addScore(1500, pod.x, pod.y, `${tag} HP:${state.boss[hpKey]}`);
                }
              }
            } else {
              // Overheat Generator: Plasma Ricochet
              sfx.exSpark();
              addFever(5);
              addParticles(pod.x, pod.y, "#00f5d4", 18, 5.0);
              addParticles(pod.x, pod.y, "#e6ff00", 12, 4.0);
              addScore(5000, pod.x, pod.y, "⚡EX-SPARK!!");
              state.nudgeOffset.x = (Math.random() - 0.5) * 8;
              state.nudgeOffset.y = (Math.random() - 0.5) * 6;
            }
            updateHUD();
          });
        });

        // Waist / Hip Cyber Units (Belt side units, active and animated from Phase 1!)
        [
          { hip: state.boss.hipL, tag: "L-HIP", side: "L" },
          { hip: state.boss.hipR, tag: "R-HIP", side: "R" }
        ].forEach(({ hip, tag, side }) => {
          checkCircleBumper(hip, 7.5, () => {
            sfx.metalBumper();
            addFever(4);
            addParticles(hip.x, hip.y, "#ff66b2", 14, 4.5);
            addParticles(hip.x, hip.y, "#00f5d4", 8, 3.5);
            if (hip.hp > 0) {
              hip.hp--;
              addScore(2500, hip.x, hip.y - 12, `${tag} HIT! HP:${hip.hp}`);
              if (hip.hp === 0) {
                sfx.armorBreak();
                triggerArmorBreakEffect(side === "L" ? "shoulder_l" : "shoulder_r", hip.x, hip.y);
                addScore(8000, hip.x, hip.y - 15, `💥${tag} OVERHEAT!`);
                showCutin(`💥【${side === "L" ? "左" : "右"}腰ユニット過熱】<br>冷却系ダウン！ スコア倍率UP！`, 160);
                state.baseMultiplier += 0.5;
                addFever(15);
              }
            } else {
              sfx.exSpark();
              addScore(3000, hip.x, hip.y - 12, "⚡HIP SPARK!");
            }
            updateHUD();
          });
        });

        // Crotch Secret Gravity Well (Active ONLY after Chest Armor is broken; strong gravitational pull & orbital curve!)
        if (state.boss.chestArmorBroken) {
          const crotch = state.boss.crotch;
          const dxCr = crotch.x - ball.x;
          const dyCr = crotch.y - ball.y;
          const distCr = Math.hypot(dxCr, dyCr);

          // 1. Strong Gravitational Pull (Distinct trajectory curvature & suction towards the core!)
          if (distCr < crotch.gravRadius && distCr > 2.0) {
            const pullFactor = Math.pow(1.0 - distCr / crotch.gravRadius, 1.2);
            // Peak force 0.44 is DOUBLE table gravity (0.22)! Curves paths dramatically!
            const force = 0.44 * pullFactor;
            ball.vx += (dxCr / distCr) * force;
            ball.vy += (dyCr / distCr) * force;

            // Inward particle suction stream toward core
            if (Math.random() < 0.7) {
              const pAngle = Math.atan2(dyCr, dxCr) + (Math.random() - 0.5) * 0.4;
              state.particles.push({
                x: ball.x,
                y: ball.y,
                vx: Math.cos(pAngle) * (2.8 + Math.random() * 2.2),
                vy: Math.sin(pAngle) * (2.8 + Math.random() * 2.2),
                color: Math.random() > 0.4 ? "#b84dff" : "#00f5d4",
                life: 16,
                scale: 1.1
              });
            }

            // Subtle tiny hearts floating when pulled deep into crotch gravity!
            if (distCr < crotch.gravRadius * 0.65 && Math.random() < 0.08) {
              spawnHeartParticle(ball.x, ball.y, true);
            }
          }

          // 2. Core Penetration & Slingshot Dynamics (Traversing the inner event horizon)
          if (distCr < ball.r + crotch.r) {
            if (!ball.crotchHitTimer || ball.crotchHitTimer <= 0) {
              ball.crotchHitTimer = 40; // Debounce per traversal
              crotch.flash = 18;
              sfx.burstTrigger();
              // Spawn modest little heart on crotch core penetration
              spawnHeartParticle(crotch.x, crotch.y, true);

              // Tangential deflection boost: curves the ball through and ejects toward flippers
              const spinDir = ball.vx >= 0 ? 1 : -1;
              ball.vx += spinDir * 2.4;
              ball.vy = Math.max(ball.vy * 0.8, 1.8); // Always maintain downward flow!

              if (crotch.cooldown && crotch.cooldown > 0) {
                sfx.metalBumper();
                addScore(1500, crotch.x, crotch.y - 14, "GRAV RESIDUE");
              } else {
                crotch.charge++;
                state.boss.expression = "blush";
                state.boss.expressionTimer = 85;
                state.boss.blushGauge = Math.min(100, state.boss.blushGauge + 25);
                addParticles(crotch.x, crotch.y, "#e6ff00", 22, 5.0);
                addParticles(crotch.x, crotch.y, "#ff1493", 16, 4.0);

                if (crotch.charge < crotch.maxCharge) {
                  addScore(4000 * crotch.charge, crotch.x, crotch.y - 16, `🌀GRAVITY CHARGE ${crotch.charge}/${crotch.maxCharge}`);
                  addPopup(crotch.x, crotch.y - 30, "「きゃあっ……重力炉に触らないでっ！」", "#ff66b2", 1.1);
                } else {
                  // GRAVITY OVERLOAD TRIGGERED!
                  crotch.charge = 0;
                  crotch.cooldown = 60 * 18; // 18 seconds cooldown
                  sfx.burstTrigger();
                  sfx.exSpark();
                  addScore(30000, crotch.x, crotch.y - 20, "★GRAVITY OVERLOAD!! +30,000");
                  addPopup(crotch.x, crotch.y - 35, "「きゃあああっ！？ 重力場が反転しちゃう……っ！！」", "#e6ff00", 1.3);
                  showCutin("🌀【GRAVITY OVERLOAD!!】🌀<br>重力特異点崩壊！ 秘密のマルチボール＆全開フィーバー！", 220);

                  // Repulsion shockwave blasts ball outward!
                  ball.vy = -8.5;
                  ball.vx = (Math.random() - 0.5) * 6;

                  // Spawn extra ball (Capped at 3 total balls on table)
                  if (state.balls.length < 3) {
                    spawnBall(crotch.x + (Math.random() - 0.5) * 16, crotch.y - 20, (Math.random() - 0.5) * 6, -7.5);
                  }
                  startFeverMode();
                  state.burstMultiplier = Math.max(state.burstMultiplier, 2.0);
                  state.burstTimer = 360;
                }
              }
              updateHUD();
            }
          }
        }

        function checkPhase1Clear() {
          if (state.boss.leftShoulderHP === 0 && state.boss.rightShoulderHP === 0 && state.phase === 1) {
            state.phase = 2;
            sfx.burstTrigger();
            state.boss.expression = "shock";
            state.boss.expressionTimer = 90;
            showCutin("🎉【PHASE 1 突破】外装防衛網壊滅！<br>PHASE 2: 胸部装甲＆秘密のデルタコア露出！", 240);
            spawnFloatingCapsule(2, "buff");
          }
        }

        // Chest Core Gem (Phase 3 Final Target)
        checkCircleBumper(state.boss.core, 7.8, core => {
          addFever(6);
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

        // (B) Kickbacks with 1-charge consumption (In the Outlanes)
        if (state.perm.kickbackL > 0 && state.perm.kickbackL_charges > 0 && ball.x >= 14 && ball.x <= 52 && ball.y >= 540 && ball.y <= 585 && ball.vy > 0) {
          ball.vy = -15.2;
          ball.vx = 4.2;
          state.perm.kickbackL_charges = 0;
          sfx.burstTrigger();
          addParticles(33, 560, "#00f5d4", 18, 5.0);
          addParticles(33, 560, "#e6ff00", 12, 4.0);
          addScore(3000, 33, 540, "⚡L-LASER SAVE!");
          showCutin("🛡️【LEFT KICKBACK SAVE!】<br>左アウトレーンから緊急レーザー射出！", 90);
        }
        if (state.perm.kickbackR > 0 && state.perm.kickbackR_charges > 0 && !ball.inShooterLane && ball.x >= 344 && ball.x <= 382 && ball.y >= 540 && ball.y <= 585 && ball.vy > 0) {
          ball.vy = -15.2;
          ball.vx = -4.2;
          state.perm.kickbackR_charges = 0;
          sfx.burstTrigger();
          addParticles(363, 560, "#00f5d4", 18, 5.0);
          addParticles(363, 560, "#e6ff00", 12, 4.0);
          addScore(3000, 363, 540, "⚡R-LASER SAVE!");
          showCutin("🛡️【RIGHT KICKBACK SAVE!】<br>右アウトレーンから緊急レーザー射出！", 90);
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
    if (ball.crotchHitTimer > 0) ball.crotchHitTimer--;

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
          showCutin("🔄【コンティニュー】<br>ボールを3球補充しました！", 150);
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
    state.boss.hipL, state.boss.hipR,
    state.boss.bustL, state.boss.bustR,
    state.boss.crotch,
    state.boss.core
  ].forEach(g => {
    if (!g) return;
    if (g.flash > 0) g.flash--;
    if (g.rot !== undefined) {
      // Normal continuous rotation loop; ultra-fast spin when impacted!
      g.rot += g.flash > 0 ? (0.28 + (g.flash / 12) * 0.18) : 0.035;
    }
  });

  if (state.boss.crotch && state.boss.crotch.cooldown > 0) {
    state.boss.crotch.cooldown--;
  }

  updateDebrisAndEffects();
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

  // Draw Centerpiece Illustration (Armored Breastplate vs Exposed Inner-Suit vs Defeat CG)
  if (imgLoaded) {
    const isDefeat = state.clearSequence && state.clearSequence.active && state.clearSequence.cgRevealAlpha > 0 && defeatCgImg.complete;
    const isArmored = !state.boss.chestArmorBroken && centerpieceArmoredImg.complete;
    const baseImg = isDefeat ? defeatCgImg : (isArmored ? centerpieceArmoredImg : centerpieceImg);
    ctx.drawImage(baseImg, IMG_BOX.x, IMG_BOX.y, IMG_BOX.w, IMG_BOX.h);

    // If Chest Armor is Broken AND actively jiggling/fever -> Draw Bust Dynamics
    if (state.boss.chestArmorBroken && !isDefeat) {
      const dispL = Math.hypot(state.boss.bustL.dx, state.boss.bustL.dy);
      const dispR = Math.hypot(state.boss.bustR.dx, state.boss.bustR.dy);
      if (state.fever.active || dispL > 0.6 || dispR > 0.6) {
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
          ctx.restore();
        };
        drawSpringBustPatch(state.boss.bustL);
        drawSpringBustPatch(state.boss.bustR);
      }
    }

    // Face Patch Compositing (Skip if in Defeat CG)
    let activePatchKey = null;
    if (!isDefeat) {
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
    }

    if (activePatchKey && facePatchImgs[activePatchKey] && facePatchImgs[activePatchKey].complete) {
      const fx = IMG_BOX.x + (135 / 384) * IMG_BOX.w;
      const fy = IMG_BOX.y + (160 / 688) * IMG_BOX.h;
      const fw = (115 / 384) * IMG_BOX.w;
      const fh = (75 / 688) * IMG_BOX.h;
      ctx.drawImage(facePatchImgs[activePatchKey], fx, fy, fw, fh);
    }

    // Rabbit Ear Tips Sprite Rendering (Always rendered over background; swings with elastic pendulum physics)
    if (!isDefeat) {
      const drawEarTipSprite = (which, ear) => {
        const img = which === "L" ? earTipLImg : earTipRImg;
        if (!img.complete) return;

        const isLeft = which === "L";
        const pivotX = ear.ax;
        const pivotY = ear.ay;

        // Image scaling from 768x1376 to IMG_BOX
        const sX = IMG_BOX.w / 768;
        const sY = IMG_BOX.h / 1376;

        // Pivot in sprite pixel coords
        // Bboxes: L=(92, 22, 257, 185) -> hinge (255, 70) => (163, 48)
        //         R=(512, 22, 677, 185) -> hinge (510, 70) => (-2, 48)
        const sprPivotX = isLeft ? 163 : -2;
        const sprPivotY = 48;

        ctx.save();
        ctx.translate(pivotX, pivotY);
        ctx.rotate(ear.angle);

        // Subtle elastic squash/stretch during bounce
        const squash = Math.sin(ear.angle * 6) * 0.05;
        ctx.scale(1 - squash, 1 + squash);

        const drawX = -sprPivotX * sX;
        const drawY = -sprPivotY * sY;
        const drawW = img.width * sX;
        const drawH = img.height * sY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();
      };

      drawEarTipSprite("L", state.boss.earL);
      drawEarTipSprite("R", state.boss.earR);
    }
  }

  // Stage Clear Cinematic Status Flags
  const isPostWhiteout = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 105;
  const isShattered = state.clearSequence && state.clearSequence.active && state.clearSequence.frame >= 25;

  // Billowing Smoke Clouds (Drawn over centerpiece/defeat CG)
  if (state.clearSequence && state.clearSequence.smokeClouds.length > 0) {
    ctx.save();
    state.clearSequence.smokeClouds.forEach(smk => {
      ctx.save();
      ctx.globalAlpha = smk.alpha;
      const grad = ctx.createRadialGradient(smk.x, smk.y, smk.r * 0.15, smk.x, smk.y, smk.r);
      grad.addColorStop(0, smk.color);
      grad.addColorStop(0.65, smk.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(smk.x, smk.y, smk.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  // Cyber Target Guides & Reticles (Pulsing Afterimage Loop + High-Speed Spin Impact Feedback)
  if (!isPostWhiteout) {
    const drawCyberTargetGuide = (x, y, r, color, flash, rot, label, subInfo) => {
      ctx.save();
      ctx.translate(x, y);

      const isHit = flash > 0;
      const animTick = (state.boss && state.boss.animTick) || 0;
      const pulseFactor = 0.16; // 1.0 to 1.16 scale oscillation
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

      // 3. Main Rotating Cyber Reticle Brackets (Fast spin on hit!)
      ctx.save();
      ctx.rotate(rot || 0);
      const rMain = r * baseScale;

      // Draw subtle full circular ring so it's always clearly ONE cohesive target!
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

      // Draw 4 circular corner brackets [ ]
      const bracketArc = 0.42; // radians per bracket
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

      // 4. Hit Shockwave Ring (When flash > 0)
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
    };

    // 1. Drones (Spherical pods)
    const dL = state.boss.droneL;
    const dR = state.boss.droneR;
    const dL_HP = state.boss.droneL_HP;
    const dR_HP = state.boss.droneR_HP;
    drawCyberTargetGuide(dL.x, dL.y, dL.r, dL_HP > 0 ? "#00f5d4" : "#e6ff00", dL.flash, dL.rot, "L-DRONE", dL_HP > 0 ? `HP:${dL_HP}` : "EX-BUMP");
    drawCyberTargetGuide(dR.x, dR.y, dR.r, dR_HP > 0 ? "#00f5d4" : "#e6ff00", dR.flash, dR.rot, "R-DRONE", dR_HP > 0 ? `HP:${dR_HP}` : "EX-BUMP");

    // 2. Shoulder Armor Clusters (Spherical pods contoured to outer pad radius R)
    const pL = state.boss.podL;
    const pR = state.boss.podR;
    const shL_HP = state.boss.leftShoulderHP;
    const shR_HP = state.boss.rightShoulderHP;
    const pL_shielded = state.phase === 1 && state.boss.droneL_HP > 0;
    const pR_shielded = state.phase === 1 && state.boss.droneR_HP > 0;
    const colL = shL_HP === 0 ? "#e6ff00" : (pL_shielded ? "#b59ce6" : "#ff1493");
    const colR = shR_HP === 0 ? "#e6ff00" : (pR_shielded ? "#b59ce6" : "#ff1493");
    drawCyberTargetGuide(pL.x, pL.y, pL.r, colL, pL.flash, pL.rot, "L-ARMOR", shL_HP === 0 ? "⚡EX-SPARK" : (pL_shielded ? "🛡️SHIELD" : `HP:${shL_HP}`));
    drawCyberTargetGuide(pR.x, pR.y, pR.r, colR, pR.flash, pR.rot, "R-ARMOR", shR_HP === 0 ? "⚡EX-SPARK" : (pR_shielded ? "🛡️SHIELD" : `HP:${shR_HP}`));

    // 3. Waist / Hip Cyber Units (Belt side units, animated from Phase 1!)
    const hL = state.boss.hipL;
    const hR = state.boss.hipR;
    drawCyberTargetGuide(hL.x, hL.y, hL.r, hL.hp > 0 ? "#ff66b2" : "#00f5d4", hL.flash, hL.rot, "L-HIP", hL.hp > 0 ? `HP:${hL.hp}` : "⚡OVERHEAT");
    drawCyberTargetGuide(hR.x, hR.y, hR.r, hR.hp > 0 ? "#ff66b2" : "#00f5d4", hR.flash, hR.rot, "R-HIP", hR.hp > 0 ? `HP:${hR.hp}` : "⚡OVERHEAT");

    // 4. Exposed Bust Cyber Targets (Activated when chest armor is shattered in Phase 2/3)
    if (state.boss.chestArmorBroken) {
      const bL = state.boss.bustL;
      const bR = state.boss.bustR;
      const bustCol = state.fever.active ? "#e6ff00" : "#ff1493";
      drawCyberTargetGuide(bL.x + bL.dx, bL.y + bL.dy, bL.r, bustCol, bL.flash, bL.rot, "L-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");
      drawCyberTargetGuide(bR.x + bR.dx, bR.y + bR.dy, bR.r, bustCol, bR.flash, bR.rot, "R-BUST", state.fever.active ? "♥FEVER♥" : "♥SOFT");
    }

    // 5. Crotch Secret Gravity Well (Activated ONLY after Chest Armor is purged!)
    if (state.boss.chestArmorBroken) {
      const cr = state.boss.crotch;
      const crChargeStr = "◆".repeat(cr.charge) + "◇".repeat(cr.maxCharge - cr.charge);
      const isCooling = cr.cooldown && cr.cooldown > 0;
      const sub = isCooling ? "COOLING" : `[${crChargeStr}]`;
      const col = isCooling ? "#9933ff" : (cr.charge > 0 ? "#e6ff00" : "#ff1493");

      // Inward Gravitational Pull Waves (Distortion rings converging into the core)
      ctx.save();
      ctx.translate(cr.x, cr.y);
      const animTick = (state.boss && state.boss.animTick) || 0;
      const inwardPhase = (animTick * 0.04) % 1.0;
      const waveRadius = cr.r + (cr.gravRadius - cr.r) * (1.0 - inwardPhase);
      ctx.strokeStyle = "rgba(184, 77, 255, " + (0.45 * inwardPhase).toFixed(2) + ")";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Active Gravitational Tether & Flux Lightning to nearby balls!
      state.balls.forEach(b => {
        const d = Math.hypot(cr.x - b.x, cr.y - b.y);
        if (d < cr.gravRadius) {
          ctx.save();
          const beamAlpha = Math.pow(1.0 - d / cr.gravRadius, 1.1) * 0.95;
          ctx.strokeStyle = `rgba(230, 255, 0, ${beamAlpha.toFixed(2)})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(cr.x, cr.y);
          const midX = (cr.x + b.x) / 2 + (Math.random() - 0.5) * 8;
          const midY = (cr.y + b.y) / 2 + (Math.random() - 0.5) * 8;
          ctx.lineTo(midX, midY);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();

          // Glowing aura around affected ball
          ctx.strokeStyle = `rgba(184, 77, 255, ${beamAlpha.toFixed(2)})`;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r + 4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      });

      drawCyberTargetGuide(cr.x, cr.y, cr.r, col, cr.flash, cr.rot, "GRAV CORE", sub);
    }

    // 5. Chest Core Gem Flash (Phase 3 Core Gem)
    if (state.boss.core.flash > 0) {
      ctx.save();
      const core = state.boss.core;
      ctx.strokeStyle = "#e6ff00";
      ctx.lineWidth = 3;
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
      ctx.fillStyle = "rgba(230, 255, 0, 0.3)";
      ctx.fill();
      ctx.restore();
    }

    // Overheat Generator Sparks (Only intermittent sparks from broken shoulder frames, no fake circle rings!)
    [
      { pod: state.boss.podL, hp: state.boss.leftShoulderHP },
      { pod: state.boss.podR, hp: state.boss.rightShoulderHP }
    ].forEach(({ pod, hp }) => {
      if (hp === 0 && Math.random() < 0.35) {
        ctx.save();
        const ang = Math.random() * Math.PI * 2;
        const len = 12 + Math.random() * 16;
        ctx.strokeStyle = Math.random() > 0.5 ? "#e6ff00" : "#00f5d4";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(pod.x + (Math.random() - 0.5) * 10, pod.y + (Math.random() - 0.5) * 10);
        ctx.lineTo(pod.x + Math.cos(ang) * len, pod.y + Math.sin(ang) * len);
        ctx.stroke();
        ctx.restore();
      }
    });

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

    // Laser Kickbacks (In the Outlanes)
    if (state.perm.kickbackL > 0) {
      ctx.save();
      const charged = state.perm.kickbackL_charges > 0;
      ctx.strokeStyle = charged ? (Math.floor(Date.now() / 120) % 2 === 0 ? "#00f5d4" : "#e6ff00") : "#3d1852";
      ctx.lineWidth = charged ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(16, 560);
      ctx.lineTo(50, 560);
      ctx.stroke();
      if (charged) {
        ctx.fillStyle = "#00f5d4";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LASER", 33, 554);
      }
      ctx.restore();
    }
    if (state.perm.kickbackR > 0) {
      ctx.save();
      const charged = state.perm.kickbackR_charges > 0;
      ctx.strokeStyle = charged ? (Math.floor(Date.now() / 120) % 2 === 0 ? "#00f5d4" : "#e6ff00") : "#3d1852";
      ctx.lineWidth = charged ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(346, 560);
      ctx.lineTo(380, 560);
      ctx.stroke();
      if (charged) {
        ctx.fillStyle = "#00f5d4";
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "center";
        ctx.fillText("LASER", 363, 554);
      }
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
  }

  // Walls & Neon Rails (Or Shattered Pieces during Stage Clear)
  if (!isShattered && !isPostWhiteout) {
    ctx.save();
    // Slingshot triangular bodies
    ctx.fillStyle = "rgba(45, 12, 60, 0.8)";
    ctx.beginPath();
    ctx.moveTo(84, 450);
    ctx.lineTo(84, 535);
    ctx.lineTo(106, 565);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(312, 450);
    ctx.lineTo(312, 535);
    ctx.lineTo(290, 565);
    ctx.closePath();
    ctx.fill();

    TABLE_WALLS.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.x1, w.y1);
      ctx.lineTo(w.x2, w.y2);
      if (w.isSlingshot) {
        ctx.strokeStyle = "#00f5d4";
        ctx.lineWidth = 4;
      } else {
        ctx.strokeStyle = "#ff1493";
        ctx.lineWidth = 3;
      }
      ctx.stroke();
    });
    ctx.restore();
  } else if (isShattered && !isPostWhiteout) {
    // Render flying shattered wall shards!
    ctx.save();
    state.clearSequence.shatterPieces.forEach(p => {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.beginPath();
      ctx.moveTo(-p.len / 2, 0);
      ctx.lineTo(p.len / 2, 0);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  // Flippers, Capsules, Plunger & Balls (Hidden after whiteout purge)
  if (!isPostWhiteout) {
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
  }

  // 1. Optical Shockwaves
  state.shockwaves.forEach(sw => {
    ctx.save();
    ctx.globalAlpha = sw.alpha;
    ctx.strokeStyle = sw.color;
    ctx.lineWidth = sw.lineWidth;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // 2. Chunky Armor Plate Shards (Metal debris flying off!)
  state.armorDebris.forEach(d => {
    ctx.save();
    const alpha = Math.min(1.0, d.life / (d.maxLife * 0.4));
    ctx.globalAlpha = alpha;
    ctx.translate(d.x, d.y);
    ctx.rotate(d.angle);

    // Chunky trapezoid/angular armor plate
    ctx.fillStyle = d.color;
    ctx.strokeStyle = d.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-d.w / 2, -d.h / 2);
    ctx.lineTo(d.w / 2 - 4, -d.h / 2);
    ctx.lineTo(d.w / 2, d.h / 2);
    ctx.lineTo(-d.w / 2 + 3, d.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rivet / neon highlight on plate
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-d.w / 4, -2, 3, 3);
    ctx.restore();
  });

  // 3. Floating Pink Hearts (Bust / Crotch hit splash)
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

  // Blinding Whiteout Flash (Blinds table, then clears to reveal Defeat CG)
  if (state.clearSequence && state.clearSequence.active && state.clearSequence.whiteoutAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${state.clearSequence.whiteoutAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  ctx.restore();
}

// =========================================================================
// 8. DOM HUD UPDATES & CONTROLS BINDING
// =========================================================================
function updateHUD() {
  document.getElementById("hudScore").textContent = state.score.toLocaleString();

  let targetDesc = "ドローン＆両肩アーマー破壊";
  if (state.stageCleared) {
    targetDesc = "大破・強制装甲パージ 成功！";
  } else if (state.phase === 1) {
    if (state.boss.droneL_HP > 0 || state.boss.droneR_HP > 0) {
      targetDesc = `ドローン撃破 (残 L:${state.boss.droneL_HP} R:${state.boss.droneR_HP})`;
    } else {
      targetDesc = `両肩アーマー破壊 (残 L:${state.boss.leftShoulderHP} R:${state.boss.rightShoulderHP})`;
    }
  } else if (state.phase === 2) {
    targetDesc = `胸部装甲パージ (残HP: ${state.boss.chestArmorHP})`;
  } else if (state.phase === 3) {
    targetDesc = `露出コア直撃KO (残HP: ${state.boss.coreHP})`;
  }
  document.getElementById("hudPhaseTarget").textContent = targetDesc;

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

  // Fever Gauge HUD (Strict single-line text, never expands or breaks layout)
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

  document.getElementById("hudBalls").textContent = "●".repeat(state.ballsRemaining) + "○".repeat(Math.max(0, 3 - state.ballsRemaining));

  // Buff Slots (Balanced spacing, zero truncation)
  const slotsContainer = document.getElementById("buffSlots");
  slotsContainer.innerHTML = "";
  state.keptBuffs.forEach((slot, idx) => {
    const div = document.createElement("div");
    if (slot) {
      const def = BUFF_DEFS[slot.id];
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
  document.getElementById("statusShoulders").textContent = `L:${state.boss.leftShoulderHP}/5 R:${state.boss.rightShoulderHP}/5`;
  document.getElementById("statusChestArmor").textContent = state.boss.chestArmorBroken ? "💥PURGED!" : `HP: ${state.boss.chestArmorHP}/10`;
  document.getElementById("statusEars").textContent = `L:${state.boss.leftEarLit ? "ON" : "OFF"} / R:${state.boss.rightEarLit ? "ON" : "OFF"}`;
  document.getElementById("statusCore").textContent = state.phase === 3 ? `HP: ${state.boss.coreHP}/16 [KO可]` : (state.boss.coreUnlocked ? "★UNLOCKED★" : "SHIELDED");

  const faceMap = {
    smile: "余裕スマイル",
    blush: "赤面ぷるぷる",
    shock: "ダメージ焦り顔!?",
    angry_emp: "EMP逆上カウンター⚡"
  };
  document.getElementById("bossFaceStatus").textContent = faceMap[state.boss.expression] || "余裕スマイル";
}

function setLeftFlip(down) {
  if (down && !state.leftFlipperDown) sfx.flip();
  state.leftFlipperDown = down;
  const btn = document.getElementById("btnLeftFlip");
  if (btn) {
    if (down) {
      btn.classList.add("bg-[#00f5d4]", "text-[#09031c]", "scale-95");
      btn.classList.remove("bg-[#1b0b42]", "text-[#00f5d4]");
    } else {
      btn.classList.remove("bg-[#00f5d4]", "text-[#09031c]", "scale-95");
      btn.classList.add("bg-[#1b0b42]", "text-[#00f5d4]");
    }
  }
}

function setRightFlip(down) {
  if (down && !state.rightFlipperDown) sfx.flip();
  state.rightFlipperDown = down;
  const btn = document.getElementById("btnRightFlip");
  if (btn) {
    if (down) {
      btn.classList.add("bg-[#00f5d4]", "text-[#09031c]", "scale-95");
      btn.classList.remove("bg-[#1b0b42]", "text-[#00f5d4]");
    } else {
      btn.classList.remove("bg-[#00f5d4]", "text-[#09031c]", "scale-95");
      btn.classList.add("bg-[#1b0b42]", "text-[#00f5d4]");
    }
  }
}

function triggerDirectionalNudge(dirX = 0, dirY = -1, intensity = 1.0) {
  // Clamp intensity
  intensity = Math.min(1.6, Math.max(0.7, intensity));
  
  // Normalize direction vector
  const len = Math.hypot(dirX, dirY);
  let nx = 0, ny = -1;
  if (len > 0.001) {
    nx = dirX / len;
    ny = dirY / len;
  }

  sfx.flip();

  // Visual screen shake offset
  state.nudgeOffset.x = nx * 14 * intensity;
  state.nudgeOffset.y = ny * 14 * intensity;

  // Physical impulse on all active balls
  state.balls.forEach(b => {
    b.vx += nx * 4.6 * intensity;
    b.vy += ny * 4.6 * intensity;
  });

  // Inertial reaction on Lilith's bust springs
  if (state.boss.chestArmorBroken) {
    impulseBust("L", nx * 5.5 * intensity, ny * 5.5 * intensity);
    impulseBust("R", nx * 5.5 * intensity, ny * 5.5 * intensity);
  }

  // Inertial reaction on Lilith's hanging ears
  impulseEar("L", nx * 4.2 * intensity, ny * 4.2 * intensity);
  impulseEar("R", nx * 4.2 * intensity, ny * 4.2 * intensity);

  // Direction label for visual feedback popup
  let dirLabel = "UP";
  if (Math.abs(nx) > Math.abs(ny) * 1.25) {
    dirLabel = nx < 0 ? "◀ LEFT" : "▶ RIGHT";
  } else if (ny > 0.4) {
    dirLabel = "▼ DOWN";
  } else {
    dirLabel = nx < -0.3 ? "◤ UP-LEFT" : (nx > 0.3 ? "◥ UP-RIGHT" : "▲ UP");
  }

  addPopup(W / 2, 530, `${dirLabel} NUDGE!`, "#e6ff00", 1.15);
  addParticles(W / 2, 530, "#e6ff00", 14, 4.2);
}

function triggerNudge() {
  triggerDirectionalNudge(0, -1, 1.0);
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
    triggerDirectionalNudge(0, -1, 1.0);
  } else if (e.code === "KeyQ") {
    e.preventDefault();
    triggerDirectionalNudge(-1, -0.5, 1.1);
  } else if (e.code === "KeyE") {
    e.preventDefault();
    triggerDirectionalNudge(1, -0.5, 1.1);
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

// Full Multi-Touch Support for Direct Screen / Playfield Tap Play
const activeTouches = new Map();
const playfieldEl = document.getElementById("playfieldArea") || canvas;

const handlePlayfieldDown = e => {
  e.preventDefault();
  try { playfieldEl.setPointerCapture(e.pointerId); } catch (_) {}

  const canvasRect = canvas.getBoundingClientRect();
  const canvasX = (e.clientX - canvasRect.left) * (W / canvasRect.width);
  const canvasY = (e.clientY - canvasRect.top) * (H / canvasRect.height);

  // Dedicated Plunger Pull: Only when waiting for launch AND touching specifically near the right shooter lane!
  if (state.plunger.waitingForLaunch && canvasX > 370 && canvasY > 440) {
    activeTouches.set(e.pointerId, { type: "plunger", startY: canvasY, lastY: canvasY });
    state.plunger.pulling = true;
    return;
  }

  // Left vs Right half of screen/playfield:
  // Using playfield horizontal center ensures reliable detection on all screen sizes & aspect ratios!
  const areaRect = playfieldEl.getBoundingClientRect();
  const isLeft = e.clientX < (areaRect.left + areaRect.width / 2);
  const side = isLeft ? "L" : "R";

  activeTouches.set(e.pointerId, {
    type: side,
    clientStartX: e.clientX,
    clientStartY: e.clientY,
    hasNudged: false
  });

  if (side === "L") setLeftFlip(true);
  else setRightFlip(true);
};

const handlePlayfieldMove = e => {
  const t = activeTouches.get(e.pointerId);
  if (!t) return;

  if (t.type === "plunger") {
    const canvasRect = canvas.getBoundingClientRect();
    const y = (e.clientY - canvasRect.top) * (H / canvasRect.height);
    const dragDist = Math.max(0, y - t.startY);
    state.plunger.power = Math.min(100, (dragDist / 60) * 100);
    t.lastY = y;
  } else {
    // Check if dragging across centerline
    const areaRect = playfieldEl.getBoundingClientRect();
    const currentSide = e.clientX < (areaRect.left + areaRect.width / 2) ? "L" : "R";
    if (currentSide !== t.type) {
      // Switched sides while holding!
      t.type = currentSide;
      const stillHoldingL = Array.from(activeTouches.values()).some(v => v.type === "L");
      const stillHoldingR = Array.from(activeTouches.values()).some(v => v.type === "R");
      setLeftFlip(stillHoldingL);
      setRightFlip(stillHoldingR);
    }

    // Quick flick/swipe on screen triggers directional nudge
    if (!t.hasNudged) {
      const dx = e.clientX - t.clientStartX;
      const dy = e.clientY - t.clientStartY;
      const dist = Math.hypot(dx, dy);
      if (dist > 38) {
        t.hasNudged = true;
        triggerDirectionalNudge(dx, dy, Math.min(1.5, dist / 45));
      }
    }
  }
};

const handlePlayfieldEnd = e => {
  const t = activeTouches.get(e.pointerId);
  if (!t) return;
  activeTouches.delete(e.pointerId);

  if (t.type === "plunger") {
    if (state.plunger.power < 15) state.plunger.power = 76; // Tap-to-launch default power
    releasePlunger();
  }

  const stillHoldingL = Array.from(activeTouches.values()).some(v => v.type === "L");
  const stillHoldingR = Array.from(activeTouches.values()).some(v => v.type === "R");
  if (!stillHoldingL) setLeftFlip(false);
  if (!stillHoldingR) setRightFlip(false);
};

playfieldEl.addEventListener("pointerdown", handlePlayfieldDown);
playfieldEl.addEventListener("pointermove", handlePlayfieldMove);
playfieldEl.addEventListener("pointerup", handlePlayfieldEnd);
playfieldEl.addEventListener("pointercancel", handlePlayfieldEnd);

// Direct Swipe-to-Nudge Button Handler
const nudgeBtn = document.getElementById("btnNudge");
if (nudgeBtn) {
  let touchStartX = 0;
  let touchStartY = 0;
  let isTouchingNudge = false;

  nudgeBtn.addEventListener("pointerdown", e => {
    e.preventDefault();
    try { nudgeBtn.setPointerCapture(e.pointerId); } catch (_) {}
    touchStartX = e.clientX;
    touchStartY = e.clientY;
    isTouchingNudge = true;
  });

  const finishNudgeTouch = e => {
    if (!isTouchingNudge) return;
    isTouchingNudge = false;
    const dx = e.clientX - touchStartX;
    const dy = e.clientY - touchStartY;
    const dist = Math.hypot(dx, dy);

    if (dist > 14) {
      // Swiped in a distinct direction!
      const intensity = Math.min(1.5, Math.max(0.8, dist / 35));
      triggerDirectionalNudge(dx, dy, intensity);
    } else {
      // Simple tap -> upward nudge
      triggerDirectionalNudge(0, -1, 1.0);
    }
  };

  nudgeBtn.addEventListener("pointerup", finishNudgeTouch);
  nudgeBtn.addEventListener("pointercancel", () => { isTouchingNudge = false; });
}

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
  showCutin("🔄 テーブルとビルドを初期化しました", 100);
});

// Modal Actions
const modal = document.getElementById("clearModal");
if (modal) {
  document.getElementById("btnClearReplay").addEventListener("click", () => {
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 200);
    state = createInitialState();
    prepareBallForLaunch();
    updateHUD();
  });
  document.getElementById("btnClearNext").addEventListener("click", () => {
    modal.classList.remove("opacity-100");
    modal.classList.add("opacity-0");
    setTimeout(() => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
    }, 200);
    state = createInitialState();
    prepareBallForLaunch();
    updateHUD();
    showCutin("🚀【NEXT STAGE】<br>強化を引き継いで再出撃します！", 180);
  });
  document.querySelectorAll(".relic-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      document.querySelectorAll(".relic-btn").forEach(b => b.classList.remove("border-[#e6ff00]", "bg-[#ff1493]/40"));
      btn.classList.add("border-[#e6ff00]", "bg-[#ff1493]/40");
      const relic = btn.dataset.relic;
      showCutin(`⚙️【パーツ換装】<br>${btn.querySelector('.font-bold').textContent} を装着！`, 160);
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

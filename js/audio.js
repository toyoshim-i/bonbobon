// =========================================================================
// FM SYNTHESIS SOUND ENGINE (Web Audio API)
// =========================================================================
class RetroSoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playFM(carrierFreq, modFreq, modDepth, duration, type = "square", slideTo = null, gainVal = 0.14) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const mod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const masterGain = this.ctx.createGain();

    osc.type = type;
    mod.type = "sine";
    osc.frequency.setValueAtTime(carrierFreq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), now + duration);
    }
    mod.frequency.setValueAtTime(modFreq, now);
    modGain.gain.setValueAtTime(modDepth, now);
    modGain.gain.exponentialRampToValueAtTime(1, now + duration);

    masterGain.gain.setValueAtTime(gainVal, now);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    mod.connect(modGain);
    modGain.connect(osc.frequency);
    osc.connect(masterGain);
    masterGain.connect(this.ctx.destination);

    osc.start(now);
    mod.start(now);
    osc.stop(now + duration);
    mod.stop(now + duration);
  }

  flip() {
    this.playFM(220, 90, 60, 0.065, "triangle", 520, 0.12);
  }

  metalBumper() {
    this.playFM(680, 340, 220, 0.11, "square", 1280, 0.13);
  }

  softPuru() {
    this.playFM(190, 12, 85, 0.22, "sine", 390, 0.18);
    setTimeout(() => this.playFM(320, 18, 60, 0.15, "sine", 240, 0.12), 55);
  }

  capsuleDrop() {
    this.playFM(880, 440, 120, 0.16, "square", 440, 0.1);
  }

  capsuleCatch() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      setTimeout(() => this.playFM(f, f * 0.5, 80, 0.09, "square", null, 0.12), i * 45);
    });
  }

  burstTrigger() {
    [440, 554.37, 659.25, 880, 1108.73, 1318.5].forEach((f, i) => {
      setTimeout(() => this.playFM(f, 220, 180, 0.14, "sawtooth", f * 1.15, 0.15), i * 50);
    });
  }

  armorBreak() {
    this.playFM(150, 65, 400, 0.32, "sawtooth", 42, 0.2);
  }

  // High-energy Overheat Generator Spark bounce
  exSpark() {
    this.playFM(1200, 800, 300, 0.12, "sawtooth", 2400, 0.18);
    setTimeout(() => this.playFM(440, 220, 200, 0.15, "square", 880, 0.14), 30);
  }

  // Plunger pull / ratchet click sound
  plungerPullClick() {
    this.playFM(420, 840, 90, 0.025, "triangle", 320, 0.08);
  }

  // Spring release & ball launch: "BASHIIIN!! Biyo-yo-yo-n!"
  plungerLaunch(powerPct = 80) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const intensity = Math.max(0.3, Math.min(1.0, powerPct / 100));

    // 1. Heavy mechanical steel strike impact (Punchy FM bass)
    this.playFM(180 * intensity, 90, 320 * intensity, 0.14, "sawtooth", 40, 0.22);

    // 2. High-speed metal ping
    setTimeout(() => {
      this.playFM(880 + intensity * 400, 440, 220, 0.18, "square", 1200, 0.18);
    }, 20);

    // 3. Spring coil oscillation "Biyo-yo-n" resonance
    setTimeout(() => {
      this.playFM(340, 28, 160 * intensity, 0.38, "sine", 180, 0.15);
    }, 45);
  }
}

window.sfx = new RetroSoundEngine();

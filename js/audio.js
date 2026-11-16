// =========================================================================
// FM SYNTHESIS SOUND ENGINE (Web Audio API)
// =========================================================================
class FMSoundEngine {
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

  slingshot() {
    this.playFM(580, 290, 180, 0.08, "triangle", 840, 0.14);
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

  // Sharp predictive short laser "Pi-t!" shot
  laserPew() {
    this.playFM(1920, 640, 260, 0.12, "sawtooth", 420, 0.15);
    setTimeout(() => this.playFM(1280, 320, 180, 0.09, "square", 300, 0.11), 28);
  }

  // Rhythmic target tracking beep (step = 1, 2, 3 ascending pitch)
  lockBeep(step = 1) {
    const freqs = [1080, 1320, 1620];
    const f = freqs[Math.max(0, Math.min(2, (step || 1) - 1))];
    this.playFM(f, f * 0.5, 60, 0.075, "square", f * 0.85, 0.11);
  }

  // Urgent double-chirp alarm when lock-on finishes (NUDGE NOW!)
  lockComplete() {
    this.playFM(2150, 1075, 140, 0.085, "square", 2480, 0.14);
    setTimeout(() => this.playFM(2560, 1280, 160, 0.11, "sawtooth", 2880, 0.15), 70);
  }

  // Pinball shattered into fragments by sniper laser
  ballShatter() {
    this.playFM(1850, 430, 520, 0.16, "sawtooth", 340, 0.18);
    setTimeout(() => this.playFM(920, 195, 420, 0.22, "square", 120, 0.17), 35);
    setTimeout(() => this.playFM(165, 58, 360, 0.30, "sawtooth", 45, 0.20), 70);
  }

  // Delta beam formation hum & activation
  triangleLaser() {
    this.playFM(660, 330, 260, 0.18, "sawtooth", 1320, 0.14);
    setTimeout(() => this.playFM(990, 247.5, 180, 0.22, "square", 880, 0.12), 45);
  }

  // Wireform ramp entry gate click & upward whoosh
  rampEnter() {
    this.playFM(980, 490, 140, 0.05, "triangle", 1560, 0.12);
    setTimeout(() => this.playFM(420, 210, 180, 0.22, "sine", 1320, 0.14), 30);
  }

  // Wireform rail glide tick
  rampRailTick(step = 0) {
    const f = 740 + (step % 6) * 95;
    this.playFM(f, f * 1.5, 65, 0.04, "sine", f * 1.12, 0.065);
  }

  // Japanese pentatonic cyber-lantern chime (idx = 0..4)
  lanternBell(idx = 0, fullCombo = false) {
    const scale = [587.33, 659.25, 783.99, 880.0, 1174.66]; // D5, E5, G5, A5, D6 (Japanese Yo/Min'yo scale)
    const f = scale[Math.max(0, Math.min(4, idx | 0))];
    this.playFM(f, f * 2.0, 220, 0.28, "sine", f * 0.995, 0.16);
    setTimeout(() => this.playFM(f * 2, f, 90, 0.18, "triangle", null, 0.09), 25);
    if (fullCombo) {
      [587.33, 783.99, 880.0, 1174.66, 1567.98].forEach((cf, i) => {
        setTimeout(() => this.playFM(cf, cf * 0.5, 160, 0.22, "square", cf * 1.04, 0.14), 70 + i * 42);
      });
    }
  }

  // High-RPM shuriken spinner metallic whirr
  spinnerTick(rpmFactor = 1.0) {
    const f = 1150 + Math.min(900, rpmFactor * 520);
    this.playFM(f, f * 0.75, 120, 0.035, "triangle", f * 1.18, 0.08);
  }

  // Cyber-shuriken throw slash
  shurikenThrow() {
    this.playFM(1680, 840, 320, 0.09, "sawtooth", 520, 0.13);
    setTimeout(() => this.playFM(2240, 1120, 180, 0.06, "triangle", 960, 0.09), 30);
  }

  // Crisp katana/steel clang when parrying a thrown shuriken!
  shurikenParry() {
    this.playFM(2480, 1240, 540, 0.16, "square", 1760, 0.20);
    setTimeout(() => this.playFM(3120, 780, 360, 0.24, "sine", 2640, 0.16), 22);
    setTimeout(() => this.playFM(1560, 390, 240, 0.20, "sawtooth", 2080, 0.13), 48);
  }

  // Japanese koto/shamisen electric string twang for Cyber Chakra Wires!
  kotoWireTwang(idx = 0, snapOverload = false) {
    const scale = [440, 493.88, 523.25, 659.25, 698.46, 880]; // Hirajoshi minor pentatonic!
    const f = scale[idx % scale.length];
    this.playFM(f, f * 2.0, 480, 0.26, "sawtooth", f * 0.99, 0.17);
    setTimeout(() => this.playFM(f * 2, f, 200, 0.20, "triangle", f * 1.5, 0.11), 24);
    if (snapOverload) {
      [0, 2, 3, 5].forEach((s, i) => {
        const sf = scale[s] * 1.5;
        setTimeout(() => this.playFM(sf, sf * 0.5, 320, 0.22, "square", sf * 1.25, 0.15), 55 + i * 38);
      });
    }
  }

  // Dramatic ninjutsu smoke-poof + cyber synth chord for Hologram Clones!
  bunshinSummon() {
    this.playFM(220, 65, 520, 0.18, "sawtooth", 90, 0.19);
    [440, 523.25, 659.25, 987.77].forEach((f, i) => {
      setTimeout(() => this.playFM(f, f * 1.5, 220, 0.16, "square", f * 1.12, 0.14), 35 + i * 32);
    });
  }

  // Heavy metallic spinning blade grind/clang for Giant Fuma Shuriken!
  fumaClash() {
    this.playFM(1320, 330, 680, 0.18, "sawtooth", 880, 0.19);
    setTimeout(() => this.playFM(1980, 495, 420, 0.15, "square", 1540, 0.15), 26);
  }

  // Elastic soft damp "Funyon" sound for rabbit ear tips
  earBoing() {
    this.playFM(260, 22, 120, 0.26, "sine", 160, 0.16);
    setTimeout(() => this.playFM(180, 14, 90, 0.22, "sine", 280, 0.14), 70);
  }

  // Plunger pull / ratchet click sound
  plungerPullClick() {
    this.playFM(420, 840, 90, 0.025, "triangle", 320, 0.08);
  }

  // Fever start fanfare arpeggio
  feverStart() {
    [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
      setTimeout(() => this.playFM(f, f * 0.5, 140, 0.16, "square", f * 1.08, 0.16), i * 40);
    });
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

const rawSfx = new FMSoundEngine();
window.sfx = new Proxy(rawSfx, {
  get(target, prop) {
    if (prop in target) {
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    }
    return () => {}; // Safe fallback for undefined audio methods
  }
});

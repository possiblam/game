export class AudioManager {
  constructor(initialMuted = false) {
    this.ctx = null;
    this.muted = initialMuted;
    this.musicTimer = null;
    this.currentTheme = 'none';
    this.stepIndex = 0;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) {
      this.stopMusic();
    } else if (this.currentTheme !== 'none') {
      this.startMusicLoop(this.currentTheme);
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  playTone({ freq = 440, duration = 0.14, type = 'sine', gain = 0.12, slideTo = null, delay = 0 }) {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const vol = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), now + duration);
    }

    vol.gain.setValueAtTime(0.001, now);
    vol.gain.linearRampToValueAtTime(gain, now + 0.015);
    vol.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(vol);
    vol.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playClick() {
    this.playTone({ freq: 580, slideTo: 760, duration: 0.07, type: 'triangle', gain: 0.09 });
  }

  playMechanism() {
    this.playTone({ freq: 220, slideTo: 330, duration: 0.12, type: 'sawtooth', gain: 0.06 });
    this.playTone({ freq: 440, duration: 0.08, type: 'triangle', gain: 0.07, delay: 0.07 });
  }

  playKeyPickup() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone({ freq: n, duration: 0.18, type: 'sine', gain: 0.11, delay: idx * 0.07 });
    });
  }

  playGateOpen() {
    this.playTone({ freq: 140, slideTo: 260, duration: 0.36, type: 'triangle', gain: 0.12 });
    this.playTone({ freq: 392, duration: 0.25, type: 'sine', gain: 0.1, delay: 0.18 });
    this.playTone({ freq: 523.25, duration: 0.35, type: 'sine', gain: 0.12, delay: 0.32 });
  }

  playJump() {
    this.playTone({ freq: 310, slideTo: 620, duration: 0.13, type: 'sine', gain: 0.1 });
  }

  playLaserZap() {
    this.playTone({ freq: 340, slideTo: 95, duration: 0.2, type: 'sawtooth', gain: 0.09 });
  }

  playError() {
    this.playTone({ freq: 240, slideTo: 155, duration: 0.18, type: 'square', gain: 0.06 });
    this.playTone({ freq: 185, slideTo: 120, duration: 0.22, type: 'square', gain: 0.06, delay: 0.11 });
  }

  playStageClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone({ freq: n, duration: 0.24, type: 'triangle', gain: 0.12, delay: idx * 0.09 });
    });
  }

  playVictoryFanfare() {
    const melody = [
      { f: 523.25, d: 0.16, t: 0 },
      { f: 659.25, d: 0.16, t: 0.14 },
      { f: 783.99, d: 0.16, t: 0.28 },
      { f: 1046.5, d: 0.34, t: 0.44 },
      { f: 987.77, d: 0.16, t: 0.8 },
      { f: 1046.5, d: 0.52, t: 0.96 },
    ];
    melody.forEach((m) => {
      this.playTone({ freq: m.f, duration: m.d, type: 'triangle', gain: 0.13, delay: m.t });
    });
  }

  playCrestActivate(kind = 'sun') {
    if (kind === 'sun') {
      [392.0, 493.88, 587.33, 783.99].forEach((freq, idx) => {
        this.playTone({ freq, duration: 0.25, type: 'triangle', gain: 0.1, delay: idx * 0.06 });
      });
    } else {
      [440.0, 523.25, 659.25, 880.0].forEach((freq, idx) => {
        this.playTone({ freq, duration: 0.28, type: 'sine', gain: 0.1, delay: idx * 0.06 });
      });
    }
  }

  playChestRumble() {
    this.playTone({ freq: 95, slideTo: 220, duration: 0.58, type: 'sawtooth', gain: 0.07 });
    this.playTone({ freq: 261.63, slideTo: 523.25, duration: 0.55, type: 'triangle', gain: 0.08, delay: 0.06 });
  }

  playGrandTreasureFanfare() {
    // Triumphant multi-voice royal fanfare + high crystal sparkles
    const brass = [
      { f: 523.25, d: 0.18, t: 0.0 },
      { f: 659.25, d: 0.18, t: 0.13 },
      { f: 783.99, d: 0.22, t: 0.26 },
      { f: 1046.5, d: 0.42, t: 0.40 },
      { f: 880.0, d: 0.18, t: 0.84 },
      { f: 987.77, d: 0.18, t: 1.0 },
      { f: 1046.5, d: 0.72, t: 1.16 },
    ];
    brass.forEach((m) => {
      this.playTone({ freq: m.f, duration: m.d, type: 'triangle', gain: 0.14, delay: m.t });
      this.playTone({ freq: m.f * 0.5, duration: m.d, type: 'sine', gain: 0.09, delay: m.t });
    });
    const sparkles = [1318.5, 1567.98, 1760.0, 2093.0];
    sparkles.forEach((f, idx) => {
      this.playTone({ freq: f, duration: 0.24, type: 'sine', gain: 0.07, delay: 0.48 + idx * 0.12 });
    });
  }

  setMusicTheme(theme) {
    if (this.currentTheme === theme && this.musicTimer) return;
    this.currentTheme = theme;
    this.stopMusic();
    if (!this.muted && theme !== 'none') {
      this.startMusicLoop(theme);
    }
  }

  startMusicLoop(theme) {
    this.stopMusic();
    this.stepIndex = 0;

    // Bright adventurous pentatonic for Daytime; mysterious crystalline celesta for Nighttime; warm harp for Title/Map
    const daytimeNotes = [392.0, 440.0, 493.88, 587.33, 659.25, 587.33, 493.88, 440.0];
    const nighttimeNotes = [293.66, 349.23, 440.0, 523.25, 440.0, 392.0, 329.63, 293.66];
    const mapNotes = [329.63, 392.0, 440.0, 523.25, 493.88, 392.0, 440.0, 329.63];

    const intervalMs = theme === 'nighttime' ? 680 : theme === 'daytime' ? 480 : 620;
    const notes = theme === 'daytime' ? daytimeNotes : theme === 'nighttime' ? nighttimeNotes : mapNotes;
    const wave = theme === 'nighttime' ? 'sine' : 'triangle';

    this.musicTimer = setInterval(() => {
      if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
      const note = notes[this.stepIndex % notes.length];
      this.playTone({
        freq: note,
        duration: theme === 'nighttime' ? 0.5 : 0.32,
        type: wave,
        gain: 0.032,
      });
      this.stepIndex += 1;
    }, intervalMs);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

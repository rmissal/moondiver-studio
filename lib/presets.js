/**
 * Mastering Presets & Genre Acoustic Profiles
 * Studio Audio Toolchain - Conservative, Pristine Audiophile Settings
 * Designed for 100% Apple Digital Masters Compliance without artificial phasing or metallic coloration
 */

const PRESETS = {
  auto: {
    name: 'Intelligent Auto-Detect (Default)',
    description: 'Analyzes the acoustic DNA in Pass 1 and applies transparent, calibrated mastering.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 14.0,
    stereoWidth: 1.02,
    highpassFreq: 20,
    bassGainDb: 0.4,
    bassFreq: 80,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 320,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.05, highpass: 60, trebleGain: 0.0, trebleFreq: 8000 },
      bass: { volume: 0.95, mono: false, lowpass: 0, boostFreq: 80, boostGain: 0.0 },
      drums: { volume: 0.95, punchFreq: 3500, punchGain: 0.0 },
      other: { volume: 1.00, width: 1.02, deMudFreq: 320, deMudGain: -0.4 }
    }
  },
  new_age_ambient: {
    name: 'New Age & Ambient',
    description: 'Natural acoustic purity, silky highs, gentle warmth, and transparent dynamic space.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.03,
    highpassFreq: 20,
    bassGainDb: 0.5,
    bassFreq: 80,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 320,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 12000,
    stemMix: {
      vocals: { volume: 1.05, highpass: 60, trebleGain: 0.0, trebleFreq: 8500 },
      bass: { volume: 0.95, mono: false, lowpass: 0, boostFreq: 75, boostGain: 0.0 },
      drums: { volume: 0.90, punchFreq: 4000, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.04, deMudFreq: 320, deMudGain: -0.4 }
    }
  },
  cinematic_orchestral: {
    name: 'Cinematic & Orchestral',
    description: 'Wide dynamic range for orchestral swells, rich low-end support, and uncompressed acoustic transparency.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 18.0,
    stereoWidth: 1.03,
    highpassFreq: 20,
    bassGainDb: 0.6,
    bassFreq: 65,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 350,
    airTrebleGainDb: 0.4,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.05, highpass: 60, trebleGain: 0.0, trebleFreq: 9000 },
      bass: { volume: 1.00, mono: false, lowpass: 0, boostFreq: 65, boostGain: 0.4 },
      drums: { volume: 1.02, punchFreq: 3000, punchGain: 0.3 },
      other: { volume: 1.02, width: 1.04, deMudFreq: 350, deMudGain: -0.4 }
    }
  },
  acoustic_instrumental: {
    name: 'Folk & Acoustic',
    description: 'Natural timbre for acoustic instruments, strings, and vocals with authentic room acoustics.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 14.0,
    stereoWidth: 1.01,
    highpassFreq: 25,
    bassGainDb: 0.3,
    bassFreq: 100,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 260,
    airTrebleGainDb: 0.2,
    airTrebleFreq: 10000,
    stemMix: {
      vocals: { volume: 1.05, highpass: 60, trebleGain: 0.0, trebleFreq: 8000 },
      bass: { volume: 0.95, mono: false, lowpass: 0, boostFreq: 100, boostGain: 0.0 },
      drums: { volume: 0.90, punchFreq: 3500, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.02, deMudFreq: 260, deMudGain: -0.4 }
    }
  },
  meditation_chillout: {
    name: 'Meditation & Deep Chillout',
    description: 'Gentle, soothing depth, zero listening fatigue, transparent warmth, and expansive peaceful soundstage.',
    targetLufs: -18.0,
    truePeak: -1.5,
    lra: 16.0,
    stereoWidth: 1.04,
    highpassFreq: 20,
    bassGainDb: 0.5,
    bassFreq: 75,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 300,
    airTrebleGainDb: 0.2,
    airTrebleFreq: 12000,
    stemMix: {
      vocals: { volume: 1.00, highpass: 60, trebleGain: 0.0, trebleFreq: 9000 },
      bass: { volume: 0.95, mono: false, lowpass: 0, boostFreq: 70, boostGain: 0.0 },
      drums: { volume: 0.85, punchFreq: 4000, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.04, deMudFreq: 300, deMudGain: -0.4 }
    }
  },
  streaming_pop_standard: {
    name: 'Streaming Pop / Modern Standard',
    description: 'Balanced streaming impact adhering to modern streaming normalization standards.',
    targetLufs: -14.0,
    truePeak: -1.0,
    lra: 10.0,
    stereoWidth: 1.00,
    highpassFreq: 25,
    bassGainDb: 0.5,
    bassFreq: 90,
    midDeMudGainDb: -0.6,
    midDeMudFreq: 400,
    airTrebleGainDb: 0.4,
    airTrebleFreq: 10000,
    stemMix: {
      vocals: { volume: 1.10, highpass: 70, trebleGain: 0.5, trebleFreq: 9000 },
      bass: { volume: 1.00, mono: false, lowpass: 0, boostFreq: 90, boostGain: 0.4 },
      drums: { volume: 1.05, punchFreq: 3500, punchGain: 0.5 },
      other: { volume: 0.95, width: 1.02, deMudFreq: 400, deMudGain: -0.6 }
    }
  },
  stadium_live_rock: {
    name: 'Stadium Live Rock',
    description: 'Dynamic live sound, punchy percussion, clear presence, and natural room atmosphere.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.04,
    highpassFreq: 22,
    bassGainDb: 0.6,
    bassFreq: 70,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 300,
    airTrebleGainDb: 0.5,
    airTrebleFreq: 10000,
    stemMix: {
      vocals: { volume: 1.10, highpass: 70, trebleGain: 0.4, trebleFreq: 7500 },
      bass: { volume: 1.02, mono: false, lowpass: 0, boostFreq: 70, boostGain: 0.5 },
      drums: { volume: 1.05, punchFreq: 2500, punchGain: 0.5 },
      other: { volume: 1.02, width: 1.03, deMudFreq: 300, deMudGain: -0.4 }
    }
  },
  custom: {
    name: 'Custom',
    description: 'Manual configuration of all parameters.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.0,
    highpassFreq: 20,
    bassGainDb: 0,
    bassFreq: 80,
    midDeMudGainDb: 0,
    midDeMudFreq: 320,
    airTrebleGainDb: 0,
    airTrebleFreq: 10500,
    stemMix: {
      vocals: { volume: 1.0, highpass: 0, trebleGain: 0, trebleFreq: 8000 },
      bass: { volume: 1.0, mono: false, lowpass: 0, boostFreq: 80, boostGain: 0 },
      drums: { volume: 1.0, punchFreq: 3500, punchGain: 0 },
      other: { volume: 1.0, width: 1.0, deMudFreq: 320, deMudGain: 0 }
    }
  }
};

module.exports = { PRESETS };

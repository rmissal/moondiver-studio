/**
 * Mastering Presets & Genre Acoustic Profiles
 * Studio Audio Toolchain
 */

const PRESETS = {
  auto: {
    name: 'Intelligent Auto-Detect (Default)',
    description: 'Analyzes the spectral and dynamic DNA of the track in Pass 1 and automatically selects the optimal profile.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.15,
    highpassFreq: 25,
    bassGainDb: 1.0,
    bassFreq: 80,
    midDeMudGainDb: -0.8,
    midDeMudFreq: 320,
    airTrebleGainDb: 0.8,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.20, highpass: 100, trebleGain: 1.2, trebleFreq: 8000 },
      bass: { volume: 0.90, mono: true, lowpass: 400, boostFreq: 80, boostGain: 1.0 },
      drums: { volume: 1.00, punchFreq: 3500, punchGain: 0.8 },
      other: { volume: 0.90, width: 1.20, deMudFreq: 320, deMudGain: -1.5 }
    }
  },
  new_age_ambient: {
    name: 'New Age & Ambient',
    description: 'Wide soundscapes, gentle overtones, silky treble sheen for flutes/pads, and spherical stereo width.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.15,
    highpassFreq: 25,
    bassGainDb: 1.0,
    bassFreq: 80,
    midDeMudGainDb: -0.8,
    midDeMudFreq: 320,
    airTrebleGainDb: 0.8,
    airTrebleFreq: 11500,
    stemMix: {
      vocals: { volume: 1.15, highpass: 100, trebleGain: 1.2, trebleFreq: 8500 },
      bass: { volume: 0.85, mono: true, lowpass: 350, boostFreq: 75, boostGain: 1.0 },
      drums: { volume: 0.75, punchFreq: 4000, punchGain: 0.5 }, // softer drums
      other: { volume: 1.05, width: 1.30, deMudFreq: 320, deMudGain: -1.5 } // wide lush pads
    }
  },
  cinematic_orchestral: {
    name: 'Cinematic & Orchestral',
    description: 'Increased dynamic range for large orchestral swells, powerful timpani/basses, and cinematic width.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 18.0,
    stereoWidth: 1.10,
    highpassFreq: 22,
    bassGainDb: 1.5,
    bassFreq: 65,
    midDeMudGainDb: -0.8,
    midDeMudFreq: 350,
    airTrebleGainDb: 0.8,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.10, highpass: 90, trebleGain: 1.5, trebleFreq: 9000 },
      bass: { volume: 1.10, mono: true, lowpass: 300, boostFreq: 65, boostGain: 1.5 }, // massive sub/timpani
      drums: { volume: 1.15, punchFreq: 3000, punchGain: 1.2 }, // impactful percussion
      other: { volume: 1.05, width: 1.20, deMudFreq: 350, deMudGain: -1.2 }
    }
  },
  acoustic_instrumental: {
    name: 'Folk & Acoustic',
    description: 'Organic string and vocal presence, warm acoustic guitar resonance, intimate soundstage, and velvety highs.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 14.0,
    stereoWidth: 1.06,
    highpassFreq: 32,
    bassGainDb: 0.8,
    bassFreq: 100,
    midDeMudGainDb: -1.0,
    midDeMudFreq: 260,
    airTrebleGainDb: 0.6,
    airTrebleFreq: 9500,
    stemMix: {
      vocals: { volume: 1.30, highpass: 100, trebleGain: 1.5, trebleFreq: 8000 }, // intimate lead vocal
      bass: { volume: 0.85, mono: true, lowpass: 450, boostFreq: 100, boostGain: 0.8 },
      drums: { volume: 0.70, punchFreq: 3500, punchGain: 0.5 }, // subtle acoustic rhythm
      other: { volume: 1.15, width: 1.08, deMudFreq: 260, deMudGain: -1.5, bodyFreq: 220, bodyGain: 1.0 } // warm guitars
    }
  },
  meditation_chillout: {
    name: 'Meditation & Deep Chillout',
    description: 'Hypnotic tranquility, softest transients, extra warm basses, and maximal spherical relaxation.',
    targetLufs: -18.0,
    truePeak: -1.5,
    lra: 16.0,
    stereoWidth: 1.20,
    highpassFreq: 25,
    bassGainDb: 1.2,
    bassFreq: 75,
    midDeMudGainDb: -0.8,
    midDeMudFreq: 300,
    airTrebleGainDb: 0.5,
    airTrebleFreq: 12000,
    stemMix: {
      vocals: { volume: 1.00, highpass: 100, trebleGain: 1.0, trebleFreq: 9000 },
      bass: { volume: 0.80, mono: true, lowpass: 300, boostFreq: 70, boostGain: 1.0 },
      drums: { volume: 0.65, punchFreq: 4000, punchGain: 0.0 }, // minimal percussion
      other: { volume: 1.10, width: 1.35, deMudFreq: 300, deMudGain: -1.2 } // maximum spherical pads
    }
  },
  streaming_pop_standard: {
    name: 'Streaming Pop / Modern Standard',
    description: 'Punchy and assertive, crisp impact in the low-mids, present leads, and radio readiness.',
    targetLufs: -14.0,
    truePeak: -1.0,
    lra: 10.0,
    stereoWidth: 1.00,
    highpassFreq: 30,
    bassGainDb: 0.5,
    bassFreq: 90,
    midDeMudGainDb: -1.2,
    midDeMudFreq: 400,
    airTrebleGainDb: 0.8,
    airTrebleFreq: 10000,
    stemMix: {
      vocals: { volume: 1.35, highpass: 100, trebleGain: 2.0, trebleFreq: 9000 }, // radio upfront
      bass: { volume: 1.05, mono: true, lowpass: 450, boostFreq: 90, boostGain: 1.2 },
      drums: { volume: 1.25, punchFreq: 3500, punchGain: 1.8 }, // punchy kick/snare
      other: { volume: 0.85, width: 1.15, deMudFreq: 400, deMudGain: -2.0 }
    }
  },
  stadium_live_rock: {
    name: 'Stadium Live Rock',
    description: 'Massive stadium rock sound with powerful bass punch, wide live stage, biting electric guitars, and airy highs for reverb tails and crowd atmosphere.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.25,
    highpassFreq: 24,
    bassGainDb: 1.8,
    bassFreq: 70,
    midDeMudGainDb: -0.8,
    midDeMudFreq: 300,
    airTrebleGainDb: 1.2,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.25, highpass: 90, trebleGain: 2.0, trebleFreq: 7500 },
      bass: { volume: 1.15, mono: true, lowpass: 500, boostFreq: 70, boostGain: 1.8 },
      drums: { volume: 1.30, punchFreq: 2500, punchGain: 2.0 }, // snappy live snare & kick
      other: { volume: 1.15, width: 1.20, deMudFreq: 300, deMudGain: -1.2, guitarBiteFreq: 2200, guitarBiteGain: 1.2 } // electric guitar bite
    }
  },
  custom: {
    name: 'Custom',
    description: 'Manual configuration of all parameters.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.0,
    highpassFreq: 25,
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

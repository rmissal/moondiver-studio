/**
 * Mastering Presets & Genre Acoustic Profiles
 * SinnTaucher Studio Audio Toolchain
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
    midDeMudGainDb: -1.0,
    midDeMudFreq: 320,
    airTrebleGainDb: 1.5,
    airTrebleFreq: 10500
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
    midDeMudGainDb: -1.0,
    midDeMudFreq: 320,
    airTrebleGainDb: 1.5,
    airTrebleFreq: 10500
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
    airTrebleGainDb: 1.2,
    airTrebleFreq: 11000
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
    midDeMudGainDb: -1.2,
    midDeMudFreq: 260,
    airTrebleGainDb: 1.0,
    airTrebleFreq: 9000
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
    midDeMudGainDb: -1.0,
    midDeMudFreq: 300,
    airTrebleGainDb: 1.8,
    airTrebleFreq: 11500
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
    midDeMudGainDb: -1.5,
    midDeMudFreq: 400,
    airTrebleGainDb: 0.8,
    airTrebleFreq: 10000
  },
  stadium_live_rock: {
    name: 'Stadium Live Rock',
    description: 'Massive stadium rock sound with powerful bass punch, wide live stage, biting electric guitars, and airy highs for reverb tails and crowd atmosphere.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 15.0,
    stereoWidth: 1.25,
    highpassFreq: 24,
    bassGainDb: 2.0,
    bassFreq: 70,
    midDeMudGainDb: -1.0,
    midDeMudFreq: 300,
    airTrebleGainDb: 1.8,
    airTrebleFreq: 11000
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
    airTrebleFreq: 10500
  }
};

module.exports = { PRESETS };

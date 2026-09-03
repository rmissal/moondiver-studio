/**
 * Mastering Presets & Genre Acoustic Profiles
 * Studio Audio Toolchain - Conservative, Pristine Audiophile Settings
 * Designed for 100% Apple Digital Masters Compliance without artificial phasing or metallic coloration
 */

export interface StemMixConfig {
  volume: number;
  highpass?: number;
  lowpass?: number;
  trebleGain?: number;
  trebleFreq?: number;
  mono?: boolean;
  boostFreq?: number;
  boostGain?: number;
  punchFreq?: number;
  punchGain?: number;
  width?: number;
  deMudFreq?: number;
  deMudGain?: number;
}

export interface PresetStemMix {
  vocals: StemMixConfig;
  bass: StemMixConfig;
  drums: StemMixConfig;
  other: StemMixConfig;
}

export interface DSPProfile {
  name: string;
  description: string;
  targetLufs: number;
  truePeak: number;
  lra: number;
  stereoWidth: number;
  highpassFreq: number;
  bassGainDb: number;
  bassFreq: number;
  midDeMudGainDb: number;
  midDeMudFreq: number;
  airTrebleGainDb: number;
  airTrebleFreq: number;
  stemMix: PresetStemMix;
}

export const PRESETS: Record<string, DSPProfile> = {
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
      other: { volume: 1.0, width: 1.02, deMudFreq: 320, deMudGain: -0.4 }
    }
  },
  chillout_lounge: {
    name: 'Chillout & Balearic Lounge',
    description: 'Silky, sun-drenched warmth, gentle organic low-end, smooth transients, and wide relaxing soundstage.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 14.0,
    stereoWidth: 1.03,
    highpassFreq: 20,
    bassGainDb: 0.5,
    bassFreq: 80,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 320,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 11500,
    stemMix: {
      vocals: { volume: 1.02, highpass: 60, trebleGain: 0.2, trebleFreq: 8500 },
      bass: { volume: 0.98, mono: false, lowpass: 0, boostFreq: 80, boostGain: 0.2 },
      drums: { volume: 0.92, punchFreq: 3500, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.03, deMudFreq: 320, deMudGain: -0.4 }
    }
  },
  nu_jazz_lounge: {
    name: 'Nu-Jazz & Acid Jazz Groove',
    description:
      'Warm acoustic Rhodes, lush brass, deep round upright bass, dynamic organic drumming, and silky tape warmth.',
    targetLufs: -15.5,
    truePeak: -1.5,
    lra: 13.0,
    stereoWidth: 1.02,
    highpassFreq: 22,
    bassGainDb: 0.5,
    bassFreq: 85,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 300,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 10500,
    stemMix: {
      vocals: { volume: 1.04, highpass: 65, trebleGain: 0.2, trebleFreq: 8000 },
      bass: { volume: 1.0, mono: false, lowpass: 0, boostFreq: 85, boostGain: 0.3 },
      drums: { volume: 0.96, punchFreq: 3200, punchGain: 0.2 },
      other: { volume: 1.02, width: 1.03, deMudFreq: 300, deMudGain: -0.4 }
    }
  },
  jazz_acoustic: {
    name: 'Acoustic Jazz & Classic Trio',
    description:
      'Pristine acoustic dynamics for double bass, grand piano, brass, and brush drums with zero compression fatigue.',
    targetLufs: -16.5,
    truePeak: -1.5,
    lra: 16.0,
    stereoWidth: 1.02,
    highpassFreq: 20,
    bassGainDb: 0.4,
    bassFreq: 75,
    midDeMudGainDb: -0.3,
    midDeMudFreq: 280,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.02, highpass: 60, trebleGain: 0.0, trebleFreq: 8000 },
      bass: { volume: 0.98, mono: false, lowpass: 0, boostFreq: 75, boostGain: 0.2 },
      drums: { volume: 0.92, punchFreq: 3000, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.03, deMudFreq: 280, deMudGain: -0.3 }
    }
  },
  easy_listening: {
    name: 'Easy Listening & Smooth Groove',
    description: 'Warm acoustic depth, transparent clarity, silky highs, and effortless listening comfort.',
    targetLufs: -16.0,
    truePeak: -1.5,
    lra: 13.0,
    stereoWidth: 1.02,
    highpassFreq: 22,
    bassGainDb: 0.4,
    bassFreq: 90,
    midDeMudGainDb: -0.4,
    midDeMudFreq: 300,
    airTrebleGainDb: 0.3,
    airTrebleFreq: 11000,
    stemMix: {
      vocals: { volume: 1.04, highpass: 65, trebleGain: 0.2, trebleFreq: 8000 },
      bass: { volume: 0.96, mono: false, lowpass: 0, boostFreq: 90, boostGain: 0.0 },
      drums: { volume: 0.94, punchFreq: 3500, punchGain: 0.0 },
      other: { volume: 1.0, width: 1.02, deMudFreq: 300, deMudGain: -0.4 }
    }
  },
  melodic_dance_club: {
    name: 'Melodic House & Dance Club',
    description: 'Punchy club low-end, tight mono bass, crisp airy percussion, and high-energy dynamic impact.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 11.0,
    stereoWidth: 1.02,
    highpassFreq: 25,
    bassGainDb: 0.6,
    bassFreq: 65,
    midDeMudGainDb: -0.5,
    midDeMudFreq: 380,
    airTrebleGainDb: 0.4,
    airTrebleFreq: 10500,
    stemMix: {
      vocals: { volume: 1.08, highpass: 75, trebleGain: 0.4, trebleFreq: 9000 },
      bass: { volume: 1.02, mono: true, lowpass: 0, boostFreq: 65, boostGain: 0.5 },
      drums: { volume: 1.05, punchFreq: 3000, punchGain: 0.4 },
      other: { volume: 0.98, width: 1.03, deMudFreq: 380, deMudGain: -0.5 }
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
      drums: { volume: 0.9, punchFreq: 4000, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.04, deMudFreq: 320, deMudGain: -0.4 }
    }
  },
  cinematic_orchestral: {
    name: 'Cinematic & Orchestral',
    description:
      'Wide dynamic range for orchestral swells, rich low-end support, and uncompressed acoustic transparency.',
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
      bass: { volume: 1.0, mono: false, lowpass: 0, boostFreq: 65, boostGain: 0.4 },
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
      drums: { volume: 0.9, punchFreq: 3500, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.02, deMudFreq: 260, deMudGain: -0.4 }
    }
  },
  meditation_chillout: {
    name: 'Meditation & Deep Chillout',
    description:
      'Gentle, soothing depth, zero listening fatigue, transparent warmth, and expansive peaceful soundstage.',
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
      vocals: { volume: 1.0, highpass: 60, trebleGain: 0.0, trebleFreq: 9000 },
      bass: { volume: 0.95, mono: false, lowpass: 0, boostFreq: 70, boostGain: 0.0 },
      drums: { volume: 0.85, punchFreq: 4000, punchGain: 0.0 },
      other: { volume: 1.02, width: 1.04, deMudFreq: 300, deMudGain: -0.4 }
    }
  },
  streaming_pop_standard: {
    name: 'Streaming Pop / Modern Standard',
    description: 'Balanced streaming impact adhering to modern streaming normalization standards.',
    targetLufs: -15.0,
    truePeak: -1.5,
    lra: 11.0,
    stereoWidth: 1.01,
    highpassFreq: 22,
    bassGainDb: 0.5,
    bassFreq: 85,
    midDeMudGainDb: -0.5,
    midDeMudFreq: 360,
    airTrebleGainDb: 0.35,
    airTrebleFreq: 10500,
    stemMix: {
      vocals: { volume: 1.08, highpass: 70, trebleGain: 0.3, trebleFreq: 9000 },
      bass: { volume: 1.0, mono: false, lowpass: 0, boostFreq: 85, boostGain: 0.3 },
      drums: { volume: 1.02, punchFreq: 3500, punchGain: 0.3 },
      other: { volume: 0.98, width: 1.02, deMudFreq: 360, deMudGain: -0.5 }
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
      vocals: { volume: 1.1, highpass: 70, trebleGain: 0.4, trebleFreq: 7500 },
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

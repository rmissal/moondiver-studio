/**
 * Mastering Presets & Genre Acoustic Profiles
 * SinnTaucher Studio Audio Toolchain
 */

const PRESETS = {
  auto: {
    name: 'Intelligente Auto-Erkennung (Standard)',
    description: 'Analysiert in Pass 1 die spektrale und dynamische DNA des Tracks und wählt automatisch das optimale Profil.',
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
    description: 'Weite Klangflächen, sanfte Obertöne, seidiger Höhenglanz für Flöten/Pads und sphärische Stereobreite.',
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
    description: 'Erhöhte Dynamikspanne für große orchestrale Steigerungen, kraftvolle Pauken/Bässe und filmische Weite.',
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
    description: 'Organische Saiten- und Gesangspräsenz, warmer Akustikgitarren-Resonanzkörper, intime Bühne und samtige Höhen.',
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
    description: 'Hypnotische Ruhe, weicheste Transienten, extra warme Bässe und maximale sphärische Entspannung.',
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
    description: 'Durchsetzungsstark, knackiger Punch im Tiefmittenbereich, präsente Leads und Radio-Präsenz.',
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
    description: 'Wuchtiger Stadion-Rocksound mit mächtigem Bass-Punch, breiter Live-Bühne, präsenter E-Gitarren-Biss und luftigen Höhen für Hallfahnen und Publikums-Atmosphäre.',
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
    name: 'Benutzerdefiniert',
    description: 'Manuelle Konfiguration aller Parameter.',
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

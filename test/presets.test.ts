import { describe, it, expect } from 'vitest';
import { PRESETS } from '../lib/presets';

describe('Mastering Presets Library Tests', () => {
  const requiredPresets = [
    'auto',
    'chillout_lounge',
    'nu_jazz_lounge',
    'jazz_acoustic',
    'easy_listening',
    'melodic_dance_club',
    'new_age_ambient',
    'cinematic_orchestral',
    'acoustic_instrumental',
    'meditation_chillout',
    'streaming_pop_standard',
    'stadium_live_rock',
    'custom'
  ];

  it('Should define all expected mastering profiles', () => {
    for (const presetKey of requiredPresets) {
      expect(PRESETS).toHaveProperty(presetKey);
      expect(PRESETS[presetKey].name).toBeDefined();
      expect(PRESETS[presetKey].description).toBeDefined();
    }
  });

  it('Should have target loudness within standard professional range (-20 to -12 LUFS)', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      expect(preset.targetLufs).toBeLessThanOrEqual(-12.0);
      expect(preset.targetLufs).toBeGreaterThanOrEqual(-20.0);
      expect(preset.truePeak).toBeLessThanOrEqual(-1.0);
    }
  });

  it('Should have realistic frequency bands without clipping or out-of-range EQ', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      // Highpass frequency check
      expect(preset.highpassFreq).toBeGreaterThanOrEqual(15);
      expect(preset.highpassFreq).toBeLessThanOrEqual(40);

      // Bass EQ check
      expect(preset.bassFreq).toBeGreaterThanOrEqual(50);
      expect(preset.bassFreq).toBeLessThanOrEqual(120);

      // Mid de-mud check
      expect(preset.midDeMudFreq).toBeGreaterThanOrEqual(200);
      expect(preset.midDeMudFreq).toBeLessThanOrEqual(500);

      // Treble air frequency check
      expect(preset.airTrebleFreq).toBeGreaterThanOrEqual(8000);
      expect(preset.airTrebleFreq).toBeLessThanOrEqual(15000);
    }
  });

  it('Should have complete stemMix configuration with valid volume multipliers', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      expect(preset.stemMix).toBeDefined();
      expect(preset.stemMix.vocals).toBeDefined();
      expect(preset.stemMix.bass).toBeDefined();
      expect(preset.stemMix.drums).toBeDefined();
      expect(preset.stemMix.other).toBeDefined();

      expect(preset.stemMix.vocals.volume).toBeGreaterThan(0);
      expect(preset.stemMix.vocals.volume).toBeLessThanOrEqual(2.0);

      expect(preset.stemMix.bass.volume).toBeGreaterThan(0);
      expect(preset.stemMix.drums.volume).toBeGreaterThan(0);
      expect(preset.stemMix.other.volume).toBeGreaterThan(0);
    }
  });
});

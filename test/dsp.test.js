import { describe, it, expect } from 'vitest';
import { buildFilterChain } from '../lib/dsp';
import { PRESETS } from '../lib/presets';

describe('DSP Filter Chain Builder Tests', () => {
  it('Should build a valid PASS 1 loudness measurement string', () => {
    const pass1 = buildFilterChain({ preset: 'new_age_ambient' }, null, null);

    // loudnorm print_format=json must be in the filter string for pass 1
    expect(pass1.filterString).toContain('loudnorm=');
    expect(pass1.filterString).toContain('print_format=json');
  });

  it('Should build a valid PASS 2 mastering string with preset EQs', () => {
    const measured = {
      input_i: -20,
      input_tp: -2.5,
      input_lra: 8.0,
      input_thresh: -30,
      target_offset: 2.5
    };
    const pass2 = buildFilterChain({ preset: 'new_age_ambient' }, measured, 120);

    // Should include linear true in pass 2 loudnorm
    expect(pass2.filterString).toContain('linear=true');
    expect(pass2.filterString).toContain('measured_I=-20');
    // Should include a fade out (areverse is used for tail fadeout)
    expect(pass2.filterString).toContain('areverse');
  });

  it('Should fall back to new_age_ambient if unknown preset is used', () => {
    const pass1 = buildFilterChain({ preset: 'invalid_preset_name' }, null, null);
    const pass1Ambient = buildFilterChain({ preset: 'new_age_ambient' }, null, null);
    expect(pass1.filterString).toBe(pass1Ambient.filterString);
  });
});

describe('Presets Configuration Tests', () => {
  it('All presets should have valid required DSP properties', () => {
    for (const [key, preset] of Object.entries(PRESETS)) {
      expect(preset.targetLufs).toBeTypeOf('number');
      expect(preset.stereoWidth).toBeTypeOf('number');
      expect(preset.stereoWidth).toBeGreaterThan(0);
      expect(preset.stereoWidth).toBeLessThanOrEqual(2.0);
    }
  });
});

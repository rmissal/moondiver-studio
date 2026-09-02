import { describe, it, expect } from 'vitest';
import { detectGenre } from '../lib/analyzer';

describe('Analyzer Genre Detection Tests', () => {
  it('Should default to new_age_ambient if no clear acoustic clues exist', () => {
    const result = detectGenre('track.wav', {}, {});
    expect(result.detectedPreset).toBe('new_age_ambient');
    expect(result.genreName).toBe('New Age & Ambient');
  });

  it('Should detect meditation_chillout based on keywords in filename', () => {
    const result = detectGenre('Deep_Meditation_Relax.wav', {}, {});
    expect(result.detectedPreset).toBe('meditation_chillout');
  });

  it('Should detect cinematic_orchestral based on high dynamic range (LRA > 16)', () => {
    // Large LRA gives +2.0 to cinematic
    const result = detectGenre('symphony.wav', { input_lra: 18.0 }, {});
    expect(result.detectedPreset).toBe('cinematic_orchestral');
  });

  it('Should detect streaming_pop_standard based on low dynamic range and loud input', () => {
    // Low LRA < 8 gives +2.0 to pop, Input I > -12 gives +1.5 to pop
    const result = detectGenre('radio_hit.wav', { input_lra: 6.0, input_i: -10.0 }, {});
    expect(result.detectedPreset).toBe('streaming_pop_standard');
  });

  it('Should weight metadata tags appropriately', () => {
    const result = detectGenre('track.wav', {}, { format: { tags: { genre: 'soundtrack' } } });
    expect(result.detectedPreset).toBe('cinematic_orchestral');
  });
});

import { describe, it, expect } from 'vitest';
import { calculateAppleMusicScore } from '../lib/apple-music';

describe('Apple Music Compliance & Quality Scoring Engine Tests', () => {
  it('Should award full score (100%) for ideal Apple Digital Masters specifications', () => {
    const idealTrack = {
      truePeakDbtp: -1.5,
      integratedLoudnessLufs: -16.0,
      codec: 'pcm_s24le',
      loudnessRangeLra: 10.0
    };

    const result = calculateAppleMusicScore(idealTrack);

    expect(result.scorePercent).toBe(100);
    expect(result.confidenceRating).toBe('Excellent');
    expect(result.badge).toContain('Apple Digital Masters Certified');
    expect(result.breakdown.truePeakCompliance.score).toBe(30);
    expect(result.breakdown.soundCheckLoudness.score).toBe(25);
    expect(result.breakdown.studioFormatQuality.score).toBe(25);
    expect(result.breakdown.dynamicIntegrity.score).toBe(20);
  });

  it('Should penalize True Peak clipping (> 0 dBTP)', () => {
    const clippingTrack = {
      truePeakDbtp: 0.5,
      integratedLoudnessLufs: -16.0,
      codec: 'pcm_s24le',
      loudnessRangeLra: 8.0
    };

    const result = calculateAppleMusicScore(clippingTrack);

    expect(result.breakdown.truePeakCompliance.score).toBe(0);
    expect(result.breakdown.truePeakCompliance.evaluation).toContain('Critical');
  });

  it('Should penalize 16-bit audio compared to 24-bit studio masters', () => {
    const track16 = {
      truePeakDbtp: -1.5,
      integratedLoudnessLufs: -16.0,
      codec: 'pcm_s16le',
      loudnessRangeLra: 8.0
    };

    const result = calculateAppleMusicScore(track16);

    expect(result.breakdown.studioFormatQuality.score).toBe(18);
    expect(result.breakdown.studioFormatQuality.evaluation).toContain('16-bit');
  });

  it('Should evaluate non-ideal loudness correctly for Apple Sound Check', () => {
    const tooLoudTrack = {
      truePeakDbtp: -1.0,
      integratedLoudnessLufs: -9.0, // Very loud EDM/Pop
      codec: 'pcm_s24le',
      loudnessRangeLra: 4.0
    };

    const result = calculateAppleMusicScore(tooLoudTrack);

    expect(result.breakdown.soundCheckLoudness.score).toBe(5);
    expect(result.breakdown.soundCheckLoudness.evaluation).toContain('Noticeably too loud or quiet');
  });

  it('Should use safe defaults when track properties are omitted', () => {
    const emptyResult = calculateAppleMusicScore({});

    expect(emptyResult.scorePercent).toBeGreaterThan(0);
    expect(emptyResult.breakdown.truePeakCompliance.measured).toBe('-3 dBTP');
    expect(emptyResult.breakdown.soundCheckLoudness.measured).toBe('-16 LUFS');
  });
});

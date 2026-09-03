/**
 * Apple Music Quality & Compliance Confidence Scoring Engine
 * Apple Digital Masters (ADM), EBU R128 Sound Check, and Intersample Distortion Protection
 */

function calculateAppleMusicScore(track = {}) {
  const tp = track.truePeakDbtp !== null && track.truePeakDbtp !== undefined ? track.truePeakDbtp : -3.0;
  const lufs = track.integratedLoudnessLufs !== null && track.integratedLoudnessLufs !== undefined ? track.integratedLoudnessLufs : -16.0;
  const bitDepth = track.codec && track.codec.includes('24') ? 24 : (track.codec && track.codec.includes('32') ? 32 : 16);
  const lra = track.loudnessRangeLra !== null && track.loudnessRangeLra !== undefined ? track.loudnessRangeLra : 7.0;

  // 1. True Peak Headroom Compliance (30 Pts)
  let truePeakScore = 0;
  let truePeakNote = '';
  if (tp <= -1.5) {
    truePeakScore = 30;
    truePeakNote = 'Excellent (Zero risk of AAC intersample clipping)';
  } else if (tp <= -1.0) {
    truePeakScore = 26;
    truePeakNote = 'Fully Apple Digital Masters compliant (<= -1.0 dBTP)';
  } else if (tp <= -0.1) {
    truePeakScore = 12;
    truePeakNote = 'Warning: Slight distortion risk during Apple AAC encoding';
  } else {
    truePeakScore = 0;
    truePeakNote = 'Critical: Exceeds 0 dBTP True Peak (Clipping risk)';
  }

  // 2. Apple Sound Check Loudness Matching (25 Pts)
  let loudnessScore = 0;
  let loudnessNote = '';
  if (lufs >= -16.5 && lufs <= -15.5) {
    loudnessScore = 25;
    loudnessNote = 'Perfect alignment with Apple Sound Check (-16 LUFS)';
  } else if (lufs >= -18.5 && lufs <= -14.0) {
    loudnessScore = 22;
    loudnessNote = 'Very Good (Optimally placed in streaming target window)';
  } else if (lufs >= -13.9 && lufs <= -11.0) {
    loudnessScore = 12;
    loudnessNote = 'Accepted, but will be attenuated by Apple Sound Check';
  } else {
    loudnessScore = 5;
    loudnessNote = 'Noticeably too loud or quiet for Apple Sound Check';
  }

  // 3. Studio Master Bit Depth Format (25 Pts)
  let formatScore = 0;
  let formatNote = '';
  if (bitDepth >= 24) {
    formatScore = 25;
    formatNote = '24-bit Lossless Studio Master (Apple Digital Masters ready)';
  } else {
    formatScore = 18;
    formatNote = '16-bit Standard Master (Accepted for standard streaming)';
  }

  // 4. Dynamic Range Integrity (20 Pts)
  let dynamicsScore = 0;
  let dynamicsNote = '';
  if (lra >= 5.0) {
    dynamicsScore = 20;
    dynamicsNote = 'High dynamic transparency without over-compression';
  } else {
    dynamicsScore = 12;
    dynamicsNote = 'More compact dynamic range';
  }

  const totalScore = truePeakScore + loudnessScore + formatScore + dynamicsScore;
  let confidenceRating = 'High';
  let badge = '⭐️⭐️⭐️⭐️⭐️ Apple Digital Masters Ready (100% Safe)';

  if (totalScore >= 95) {
    confidenceRating = 'Excellent';
    badge = '⭐️⭐️⭐️⭐️⭐️ Apple Digital Masters Certified (100% Acceptance)';
  } else if (totalScore >= 85) {
    confidenceRating = 'High';
    badge = '⭐️⭐️⭐️⭐️ High Confidence (Full Apple Music Compatibility)';
  } else if (totalScore >= 70) {
    confidenceRating = 'Medium';
    badge = '⭐️⭐️⭐️ Moderate Confidence (Accepted with Sound Check gain adjustment)';
  } else {
    confidenceRating = 'Low';
    badge = '⚠️ Action Recommended (Adjust True Peak or Loudness)';
  }

  return {
    scorePercent: totalScore,
    confidenceRating,
    badge,
    breakdown: {
      truePeakCompliance: { score: truePeakScore, max: 30, measured: `${tp} dBTP`, evaluation: truePeakNote },
      soundCheckLoudness: { score: loudnessScore, max: 25, measured: `${lufs} LUFS`, evaluation: loudnessNote },
      studioFormatQuality: { score: formatScore, max: 25, measured: `${bitDepth}-bit`, evaluation: formatNote },
      dynamicIntegrity: { score: dynamicsScore, max: 20, measured: `${lra} LU`, evaluation: dynamicsNote }
    }
  };
}

module.exports = { calculateAppleMusicScore };

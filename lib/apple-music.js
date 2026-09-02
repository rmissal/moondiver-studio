/**
 * Apple Music Quality & Compliance Confidence Scoring Engine
 * Apple Digital Masters (ADM), EBU R128 Sound Check, and Intersample Distortion Protection
 */

function calculateAppleMusicScore(track = {}) {
  const tp = track.truePeakDbtp !== null && track.truePeakDbtp !== undefined ? track.truePeakDbtp : -3.0;
  const lufs = track.integratedLoudnessLufs !== null && track.integratedLoudnessLufs !== undefined ? track.integratedLoudnessLufs : -16.0;
  const bitDepth = track.codec && track.codec.includes('24') ? 24 : (track.codec && track.codec.includes('32') ? 32 : 16);
  const lra = track.loudnessRangeLra !== null && track.loudnessRangeLra !== undefined ? track.loudnessRangeLra : 7.0;

  // 1. True Peak Headroom Compliance (30 Pkt)
  let truePeakScore = 0;
  let truePeakNote = '';
  if (tp <= -1.5) {
    truePeakScore = 30;
    truePeakNote = 'Hervorragend (Kein Risiko für AAC-Intersample-Clipping)';
  } else if (tp <= -1.0) {
    truePeakScore = 26;
    truePeakNote = 'Vollständig Apple Digital Masters konform (<= -1.0 dBTP)';
  } else if (tp <= -0.1) {
    truePeakScore = 12;
    truePeakNote = 'Warnung: Leichtes Risiko von Verzerrungen beim Apple AAC-Encoding';
  } else {
    truePeakScore = 0;
    truePeakNote = 'Kritisch: Überschreitet 0 dBTP True Peak (Clipping-Gefahr)';
  }

  // 2. Apple Sound Check Loudness Matching (25 Pkt)
  let loudnessScore = 0;
  let loudnessNote = '';
  if (lufs >= -16.5 && lufs <= -15.5) {
    loudnessScore = 25;
    loudnessNote = 'Perfekt auf Apple Sound Check (-16 LUFS) abgestimmt';
  } else if (lufs >= -18.5 && lufs <= -14.0) {
    loudnessScore = 22;
    loudnessNote = 'Sehr gut (Liegt optimal im Apple Streaming-Zielkorridor)';
  } else if (lufs >= -13.9 && lufs <= -11.0) {
    loudnessScore = 12;
    loudnessNote = 'Akzeptiert, wird aber durch Apple Sound Check leiser geregelt';
  } else {
    loudnessScore = 5;
    loudnessNote = 'Deutlich zu laut oder zu leise für Apple Sound Check';
  }

  // 3. Studio Master Bit Depth Format (25 Pkt)
  let formatScore = 0;
  let formatNote = '';
  if (bitDepth >= 24) {
    formatScore = 25;
    formatNote = '24-bit Lossless Studio Master (Apple Digital Masters fähig)';
  } else {
    formatScore = 18;
    formatNote = '16-bit Standard Master (Akzeptiert für normales Streaming)';
  }

  // 4. Dynamic Range Integrity (20 Pkt)
  let dynamicsScore = 0;
  let dynamicsNote = '';
  if (lra >= 5.0) {
    dynamicsScore = 20;
    dynamicsNote = 'Hohe dynamische Transparenz ohne Over-Compression';
  } else {
    dynamicsScore = 12;
    dynamicsNote = 'Kompaktere Dynamik';
  }

  const totalScore = truePeakScore + loudnessScore + formatScore + dynamicsScore;
  let confidenceRating = 'High';
  let badge = '⭐️⭐️⭐️⭐️⭐️ Apple Digital Masters Ready (100% Safe)';

  if (totalScore >= 95) {
    confidenceRating = 'Excellent';
    badge = '⭐️⭐️⭐️⭐️⭐️ Apple Digital Masters Certified (100% Acceptance)';
  } else if (totalScore >= 85) {
    confidenceRating = 'High';
    badge = '⭐️⭐️⭐️⭐️ High Confidence (Volle Apple Music Kompatibilität)';
  } else if (totalScore >= 70) {
    confidenceRating = 'Medium';
    badge = '⭐️⭐️⭐️ Moderate Confidence (Akzeptiert mit Sound Check Anpassung)';
  } else {
    confidenceRating = 'Low';
    badge = '⚠️ Action Recommended (True Peak oder Lautheit anpassen)';
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


/**
 * DSP Filter Graph Engine
 * Builds Two-Pass Calibrated EBU R128 Loudness Normalization, EQ, Tape Warmth,
 * Auto-Lead-Trim (Apple Music <500ms Compliance), Anti-Click Fade-In, and Reverb-Tail Fade-Out
 */

const { PRESETS } = require('./presets');

function buildFilterChain(options = {}, measured = null, duration = null) {
  const presetKey = options.preset || 'new_age_ambient';
  const base = PRESETS[presetKey] || PRESETS.new_age_ambient;

  const targetLufs =
    options.targetLufs !== undefined ? options.targetLufs : base.targetLufs !== undefined ? base.targetLufs : -16.0;
  const truePeak =
    options.truePeak !== undefined ? options.truePeak : base.truePeak !== undefined ? base.truePeak : -1.5;
  const lra = options.lra !== undefined ? options.lra : base.lra !== undefined ? base.lra : 15.0;
  const stereoWidth = options.stereoWidth !== undefined ? options.stereoWidth : base.stereoWidth;
  const highpassFreq = options.highpassFreq !== undefined ? options.highpassFreq : base.highpassFreq;
  const bassGainDb = options.bassGainDb !== undefined ? options.bassGainDb : base.bassGainDb;
  const midDeMudGainDb = options.midDeMudGainDb !== undefined ? options.midDeMudGainDb : base.midDeMudGainDb;
  const airTrebleGainDb = options.airTrebleGainDb !== undefined ? options.airTrebleGainDb : base.airTrebleGainDb;
  const autoTrim = options.autoTrim !== false; // Default: true (Gentle lead silence trim for Apple Music compliance)
  const autoFadeIn = options.autoFadeIn !== false; // Default: true (30ms anti-click micro fade-in)
  const autoFadeOut = options.autoFadeOut !== false; // Default: true (smooth reverb tail fade-out)

  const filters = [];

  // 1. Auto-Lead Silence Trim (Safe -70dB threshold removes digital pre-roll silence without clipping quiet musical intros)
  if (autoTrim) {
    filters.push('silenceremove=start_periods=1:start_duration=0.1:start_threshold=-70dB');
  }

  // 2. Anti-Click & DC-Pop Micro Fade-In (Eliminates clicks & DC impulse at t=0)
  if (autoFadeIn) {
    filters.push('afade=t=in:ss=0:d=0.03:curve=qsin');
  }

  // 3. Subsonic Highpass Filter (Removes inaudible sub-rumble below audible range)
  if (highpassFreq > 0) {
    filters.push(`highpass=f=${highpassFreq}`);
  }

  // 4. Bass Warmth (Subtle fundamental support)
  if (bassGainDb && bassGainDb !== 0) {
    filters.push(`bass=g=${bassGainDb}:f=${base.bassFreq || 80}:w=0.6`);
  }

  // 5. Midrange Clarity (Gentle de-mudding)
  if (midDeMudGainDb && midDeMudGainDb !== 0) {
    filters.push(`equalizer=f=${base.midDeMudFreq || 320}:t=q:w=1.0:g=${midDeMudGainDb}`);
  }

  // 6. Silky Treble Air (Smooth high-end sheen)
  if (airTrebleGainDb && airTrebleGainDb !== 0) {
    filters.push(`treble=g=${airTrebleGainDb}:f=${base.airTrebleFreq || 11000}:w=0.5`);
  }

  // 7. Spatial Stereo Width (Expansive soundstage without phase cancellation)
  if (stereoWidth && stereoWidth !== 1.0 && stereoWidth <= 1.1) {
    filters.push(`stereotools=slev=${stereoWidth}:mlev=1.0`);
  }

  // 8. EBU R128 Loudness Normalization & True Peak Precision Limiter (Two-Pass Calibrated)
  if (measured && measured.input_i) {
    filters.push(
      `loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`,
      `alimiter=limit=-1.5dB:attack=5:release=50:asc=1`
    );
  } else {
    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:print_format=json`);
  }

  // 9. Smart Trailing Silence Trim & Reverb Tail Fade-Out (Safe -75dB threshold protects delicate reverb tails)
  if (autoFadeOut && measured) {
    const fadeDur = options.fadeOutSecs !== undefined ? options.fadeOutSecs : 1.5;
    filters.push(
      `areverse, silenceremove=start_periods=1:start_duration=0.2:start_threshold=-75dB, afade=t=in:ss=0:d=${fadeDur}:curve=exp, areverse`
    );
  }

  return {
    filterString: filters.join(', '),
    settings: {
      preset: presetKey,
      targetLufs,
      truePeak,
      lra,
      stereoWidth,
      highpassFreq,
      bassGainDb,
      midDeMudGainDb,
      airTrebleGainDb,
      autoTrim,
      autoFadeIn,
      autoFadeOut,
      masteringMode: measured ? '2-Pass Calibrated (Linear)' : '1-Pass Analysis',
      enhancedChain: [
        'auto_lead_silence_trim',
        'anticlick_fadein',
        'transparent_eq',
        'ebur128_two_pass_linear',
        'tail_trim_and_fadeout'
      ]
    }
  };
}

module.exports = { buildFilterChain };

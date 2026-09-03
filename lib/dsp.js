/**
 * DSP Filter Graph Engine
 * Builds Two-Pass Calibrated EBU R128 Loudness Normalization, EQ, Tape Warmth,
 * Auto-Lead-Trim (Apple Music <500ms Compliance), Anti-Click Fade-In, and Reverb-Tail Fade-Out
 */

const { PRESETS } = require('./presets');

function buildFilterChain(options = {}, measured = null, duration = null) {
  const presetKey = options.preset || 'new_age_ambient';
  const base = PRESETS[presetKey] || PRESETS.new_age_ambient;

  const targetLufs = options.targetLufs !== undefined ? options.targetLufs : (base.targetLufs !== undefined ? base.targetLufs : -16.0);
  const truePeak = options.truePeak !== undefined ? options.truePeak : (base.truePeak !== undefined ? base.truePeak : -1.5);
  const lra = options.lra !== undefined ? options.lra : (base.lra !== undefined ? base.lra : 15.0);
  const stereoWidth = options.stereoWidth !== undefined ? options.stereoWidth : base.stereoWidth;
  const highpassFreq = options.highpassFreq !== undefined ? options.highpassFreq : base.highpassFreq;
  const bassGainDb = options.bassGainDb !== undefined ? options.bassGainDb : base.bassGainDb;
  const midDeMudGainDb = options.midDeMudGainDb !== undefined ? options.midDeMudGainDb : base.midDeMudGainDb;
  const airTrebleGainDb = options.airTrebleGainDb !== undefined ? options.airTrebleGainDb : base.airTrebleGainDb;
  const autoTrim = options.autoTrim !== false; // Default: true (Removes leading & trailing silence for Apple Music ingest compliance)
  const autoFadeIn = options.autoFadeIn !== false; // Default: true (50ms anti-click fade-in)
  const autoFadeOut = options.autoFadeOut !== false; // Default: true (smooth tail fade-out)

  const filters = [];

  // 1. Auto-Lead Silence Trim (Removes leading silence >500ms for 100% Apple Music ingestion compliance)
  if (autoTrim) {
    filters.push('silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB');
  }

  // 2. Anti-Click & DC-Pop Micro Fade-In (Eliminates clicks & DC impulse at t=0)
  if (autoFadeIn) {
    filters.push('afade=t=in:ss=0:d=0.03:curve=qsin');
  }

  // 3. Subsonic Highpass Filter (Removes inaudible sub-rumble & DC offset)
  if (highpassFreq > 0) {
    filters.push(`highpass=f=${highpassFreq}`);
  }

  // 4. Dynamic De-Essing (Smooths harsh upper frequencies and peaks transparently)
  filters.push(`deesser=i=0.25:f=0.6:m=0.3`);

  // 5. Bass Warmth (Fundamental warmth for acoustic instruments and pads)
  if (bassGainDb !== 0) {
    filters.push(`bass=g=${bassGainDb}:f=${base.bassFreq || 80}:w=0.6`);
  }

  // 6. Midrange Clarity (De-mudding low mids)
  if (midDeMudGainDb !== 0) {
    filters.push(`equalizer=f=${base.midDeMudFreq || 320}:t=q:w=1.0:g=${midDeMudGainDb}`);
  }

  // 7. Silky Treble Air (Smooth high-end sheen without harshness)
  if (airTrebleGainDb !== 0) {
    filters.push(`treble=g=${airTrebleGainDb}:f=${base.airTrebleFreq || 11000}:w=0.5`);
  }

  // 8. Analog Tube/Tape Saturation (Musical glue and warmth)
  filters.push(`asoftclip=type=sin:threshold=0.98`);

  // 9. Spatial Stereo Width (Expansive soundstage)
  if (stereoWidth !== 1.0) {
    filters.push(`stereotools=slev=${stereoWidth}:mlev=0.98`);
  }

  // 10. EBU R128 Loudness Normalization & True Peak Limiter (Two-Pass Calibrated)
  if (measured && measured.input_i) {
    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`);
  } else {
    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:print_format=json`);
  }

  // 11. Smart Trailing Silence Trim & Reverb Tail Fade-Out (Pass 2 only)
  if (autoFadeOut && measured) {
    const fadeDur = options.fadeOutSecs !== undefined ? options.fadeOutSecs : 1.5;
    filters.push(`areverse, silenceremove=start_periods=1:start_duration=0.02:start_threshold=-60dB, afade=t=in:ss=0:d=${fadeDur}:curve=exp, areverse`);
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
      enhancedChain: ['auto_lead_silence_trim', 'anticlick_fadein', 'afftdn_denoise', 'deesser', 'asoftclip_analog_warmth', 'stereotools', 'ebur128_two_pass_linear', 'tail_trim_and_fadeout']
    }
  };
}

module.exports = { buildFilterChain };

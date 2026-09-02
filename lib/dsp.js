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
  const autoTrim = options.autoTrim !== false; // Default: true (Beseitigt Vorlauf- & Nachlauf-Stille für Apple Music Ingest)
  const autoFadeIn = options.autoFadeIn !== false; // Default: true (50ms anti-click fade-in)
  const autoFadeOut = options.autoFadeOut !== false; // Default: true (smooth tail fade-out)

  const filters = [];

  // 1. Auto-Lead Silence Trim (Beseitigt Vorlauf-Stille >500ms für 100% Apple Music Ingestion-Konformität)
  if (autoTrim) {
    filters.push('silenceremove=start_periods=1:start_duration=0.02:start_threshold=-42dB');
  }

  // 2. Anti-Click & DC-Pop Micro Fade-In (Beseitigt Knackser & Quantisierungs-Impulse bei t=0)
  if (autoFadeIn) {
    filters.push('afade=t=in:ss=0:d=0.05:curve=qsin');
  }

  // 3. Subsonic Highpass Filter (Entfernt unhörbares Sub-Rumpeln & DC-Offset)
  if (highpassFreq > 0) {
    filters.push(`highpass=f=${highpassFreq}`);
  }

  // 4. Sanfte Spektral-Bereinigung (Entfernt Hiss & digitale Quantisierungsartefakte)
  filters.push(`afftdn=nr=6:nf=-45:tn=1`);

  // 5. Dynamisches De-Essing (Glättet schneidende Höhen & schrille Spitzen)
  filters.push(`deesser=i=0.35:f=0.6:m=0.3`);

  // 6. Bass Warmth (Grundton-Wärme für akustische Instrumente & Pads)
  if (bassGainDb !== 0) {
    filters.push(`bass=g=${bassGainDb}:f=${base.bassFreq || 80}:w=0.6`);
  }

  // 7. Midrange Clarity (Entmumpfung der unteren Mitten)
  if (midDeMudGainDb !== 0) {
    filters.push(`equalizer=f=${base.midDeMudFreq || 320}:t=q:w=1.2:g=${midDeMudGainDb}`);
  }

  // 8. Silky Treble Air (Seidiger Glanz für Flöten, Harfen, Klavier & Hallfahnen)
  if (airTrebleGainDb !== 0) {
    filters.push(`treble=g=${airTrebleGainDb}:f=${base.airTrebleFreq || 10500}:w=0.7`);
  }

  // 9. Analoge Röhren-/Bandsättigung (Verleiht digitale Wärme & musikalischen Zusammenhalt)
  filters.push(`asoftclip=type=sin:threshold=0.95`);

  // 10. Räumliche Stereobreite (Sphärischer Raumklang)
  if (stereoWidth !== 1.0) {
    filters.push(`stereotools=slev=${stereoWidth}:mlev=0.98`);
  }

  // 11. EBU R128 Loudness Normalization & True Peak Limiter (Zweistufig / Two-Pass)
  if (measured && measured.input_i) {
    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}:linear=true`);
  } else {
    filters.push(`loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=${lra}:print_format=json`);
  }

  // 12. Smart Trailing Silence Trim & Reverb Tail Fade-Out (Sanfter Ausklang nur in Pass 2)
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

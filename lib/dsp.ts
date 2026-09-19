/**
 * DSP Filter Graph Engine
 * Builds Two-Pass Calibrated EBU R128 Loudness Normalization, EQ, Tape Warmth,
 * Audible Boundary Calibration (Apple Music <500ms Lead Compliance), Anti-Click Micro Fade-In,
 * Gentle Tail Fade-Out, and Clean 0.5s Pause Padding.
 */

import { PRESETS } from './presets';

export function buildFilterChain(options: any = {}, measured: any = null, boundariesOrDuration: any = null) {
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
  const autoTrim = options.autoTrim !== false; // Default: true (Acoustic lead & tail boundary trim)
  const autoFadeIn = options.autoFadeIn !== false; // Default: true (30ms anti-click micro fade-in)
  const autoFadeOut = options.autoFadeOut !== false; // Default: true (gentle reverb tail fade-out)
  const pauseDurationSecs = options.pauseDurationSecs !== undefined ? options.pauseDurationSecs : 0.5; // 0.5s pause

  // Normalize boundaries or duration
  let boundaries: any = null;
  let totalDuration: number | null = null;
  if (boundariesOrDuration && typeof boundariesOrDuration === 'object') {
    boundaries = boundariesOrDuration;
    totalDuration = boundaries.totalDuration || null;
  } else if (typeof boundariesOrDuration === 'number') {
    totalDuration = boundariesOrDuration;
  }

  const filters: string[] = [];

  // 1. Time-Calibrated Acoustic Boundary Trim
  // Removes excessive digital lead-in while preserving a safe 150ms pre-roll buffer, and keeps full natural tail decay
  if (
    autoTrim &&
    boundaries &&
    typeof boundaries.trimStart === 'number' &&
    typeof boundaries.trimEnd === 'number' &&
    boundaries.trimEnd > boundaries.trimStart
  ) {
    filters.push(
      `atrim=start=${boundaries.trimStart.toFixed(3)}:end=${boundaries.trimEnd.toFixed(3)}`,
      'asetpts=PTS-STARTPTS'
    );
  }

  // 2. Anti-Click & DC-Pop Micro Fade-In (30ms smooth qsin curve at the start of audio)
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

  // 9. Natural Reverb Tail Fade-Out (Gentle quarter-sine decay over the end of the active audio)
  if (autoFadeOut) {
    const activeDur = boundaries?.activeDuration || totalDuration;
    if (typeof activeDur === 'number' && activeDur > 2.0) {
      const fadeDur =
        options.fadeOutSecs !== undefined ? options.fadeOutSecs : Math.min(1.5, Math.max(0.6, activeDur * 0.02));
      const fadeStart = Math.max(0, activeDur - fadeDur);
      filters.push(`afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeDur.toFixed(3)}:curve=qsin`);
    }
  }

  // 10. Clean 0.5s Digital Pause Padding (Apple Music & Streaming album spacing)
  if (autoTrim && pauseDurationSecs > 0) {
    filters.push(`apad=pad_dur=${pauseDurationSecs.toFixed(2)}`);
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
      pauseDurationSecs,
      boundaries,
      masteringMode: measured ? '2-Pass Calibrated (Linear)' : '1-Pass Analysis',
      enhancedChain: [
        'audible_boundary_calibration',
        'anticlick_fadein',
        'transparent_eq',
        'ebur128_two_pass_linear',
        'natural_tail_fadeout',
        'clean_pause_padding'
      ]
    }
  };
}

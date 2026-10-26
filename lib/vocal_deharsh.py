import sys
import os
import json
import shutil
import time
import numpy as np
import soundfile as sf
import scipy.signal
import scipy.ndimage

try:
    import lameenc
    HAS_LAME = True
except ImportError:
    HAS_LAME = False


def analyze_and_process(target_file, mode="analyze", strength="medium", apply_target=False):
    if not os.path.exists(target_file):
        return {"status": "error", "message": f"File not found: {target_file}"}

    t0 = time.time()
    info = sf.info(target_file)
    data, sr = sf.read(target_file, dtype="float64")
    orig_len = len(data)
    is_mono = data.ndim == 1
    if is_mono:
        data = np.column_stack([data, data])

    nperseg = 2048
    noverlap = 1536
    f, t, Z_L = scipy.signal.stft(data[:, 0], fs=sr, nperseg=nperseg, noverlap=noverlap)
    _, _, Z_R = scipy.signal.stft(data[:, 1], fs=sr, nperseg=nperseg, noverlap=noverlap)

    mag = 0.5 * (np.abs(Z_L) + np.abs(Z_R)) + 1e-9
    mag_db = 20.0 * np.log10(mag)

    # Local spectral envelope (~400 Hz frequency smoothing, ~75ms time smoothing)
    env_db = scipy.ndimage.uniform_filter(mag_db, size=(17, 3))
    prom_db = mag_db - env_db

    # Core vocal harshness / Suno metallic clink band: 2800 Hz - 11000 Hz
    idx_core = (f >= 2800) & (f <= 11000)
    idx_presence = (f >= 2800) & (f <= 5500)
    idx_sibilance = (f >= 5500) & (f <= 10500)
    idx_warm = (f >= 250) & (f <= 2500)

    # Active vocal/music frames in the harsh band (> -42 dB)
    active_mask = mag_db[idx_core, :] > -42.0
    if np.sum(active_mask) > 0:
        harsh_spikes_before = float(np.mean(np.maximum(0.0, prom_db[idx_core, :][active_mask] - 4.5)))
        presence_spikes = float(np.mean(np.maximum(0.0, prom_db[idx_presence, :][mag_db[idx_presence, :] > -42.0] - 4.5))) if np.any(mag_db[idx_presence, :] > -42.0) else 0.0
        sibilance_spikes = float(np.mean(np.maximum(0.0, prom_db[idx_sibilance, :][mag_db[idx_sibilance, :] > -42.0] - 4.5))) if np.any(mag_db[idx_sibilance, :] > -42.0) else 0.0
    else:
        harsh_spikes_before = 0.0
        presence_spikes = 0.0
        sibilance_spikes = 0.0

    # Frame-by-frame harsh-to-warm energy ratio
    warm_rms_db = 10.0 * np.log10(np.mean(mag[idx_warm, :] ** 2, axis=0) + 1e-12)
    harsh_rms_db = 10.0 * np.log10(np.mean(mag[idx_core, :] ** 2, axis=0) + 1e-12)
    active_frames = warm_rms_db > -45.0

    # Detect hotspot timestamps where harshness spikes significantly
    frame_spike_energy = np.mean(np.maximum(0.0, prom_db[idx_core, :] - 5.5), axis=0)
    hotspots = []
    if len(t) > 10:
        smooth_hotspot = scipy.ndimage.uniform_filter1d(frame_spike_energy, size=30)
        thresh_hs = np.percentile(smooth_hotspot, 88)
        in_region = False
        start_t = 0.0
        for idx_t, val in enumerate(smooth_hotspot):
            if val > thresh_hs and not in_region and active_frames[idx_t]:
                in_region = True
                start_t = float(t[idx_t])
            elif (val <= thresh_hs or not active_frames[idx_t]) and in_region:
                in_region = False
                end_t = float(t[idx_t])
                if end_t - start_t >= 0.6:
                    hotspots.append({
                        "start": round(start_t, 1),
                        "end": round(end_t, 1),
                        "intensity": round(float(np.max(smooth_hotspot[max(0, idx_t-20):idx_t+1])), 1)
                    })
        # Sort by intensity and take top 8
        hotspots = sorted(hotspots, key=lambda x: x["intensity"], reverse=True)[:8]
        hotspots = sorted(hotspots, key=lambda x: x["start"])

    # Normalize harshness score (0 - 100)
    # Typical clean studio audio has harsh_spikes_before around 3.0 - 5.0 dB
    # Typical Suno metallic vocals have 6.5 - 11.5 dB
    raw_score = max(0.0, min(100.0, (harsh_spikes_before - 3.5) * 14.5))
    severity = "Clean / Low"
    recommended_strength = "gentle"
    if raw_score >= 65:
        severity = "High (Strong Suno Metallic Glare)"
        recommended_strength = "aggressive"
    elif raw_score >= 35:
        severity = "Moderate (Audible Vocal Ringing)"
        recommended_strength = "medium"

    if mode == "analyze":
        return {
            "status": "success",
            "mode": "analyze",
            "harshnessScore": round(raw_score, 1),
            "severity": severity,
            "recommendedStrength": recommended_strength,
            "metrics": {
                "spikeProminenceDb": round(harsh_spikes_before, 2),
                "presenceGlareDb": round(presence_spikes, 2),
                "sibilanceFizzDb": round(sibilance_spikes, 2),
                "hotspotCount": len(hotspots)
            },
            "hotspots": hotspots,
            "durationSeconds": round(orig_len / sr, 2),
            "analysisTimeSec": round(time.time() - t0, 2)
        }

    # --- DSP PROCESSING MODE ---
    # Configure parameters by strength
    if strength == "gentle":
        spike_thresh = 5.5
        spike_ratio = 2.2
        max_spike_cut = -6.0
        dyn_thresh_offset = -10.5
        dyn_max_cut = -3.0
        warmth_drive = 1.05
    elif strength == "aggressive":
        spike_thresh = 3.6
        spike_ratio = 4.0
        max_spike_cut = -12.0
        dyn_thresh_offset = -13.5
        dyn_max_cut = -6.5
        warmth_drive = 1.15
    else:  # medium (default)
        spike_thresh = 4.5
        spike_ratio = 3.0
        max_spike_cut = -9.0
        dyn_thresh_offset = -12.0
        dyn_max_cut = -4.5
        warmth_drive = 1.10

    # Frequency mask with smooth cosine transitions (2200 Hz -> 2800 Hz ... 11000 Hz -> 13500 Hz)
    f_mask = np.zeros_like(f)
    f_mask[(f >= 2800) & (f <= 11000)] = 1.0
    idx_lo = (f >= 2100) & (f < 2800)
    f_mask[idx_lo] = 0.5 * (1.0 - np.cos(np.pi * (f[idx_lo] - 2100.0) / 700.0))
    idx_hi = (f > 11000) & (f <= 13500)
    f_mask[idx_hi] = 0.5 * (1.0 + np.cos(np.pi * (f[idx_hi] - 11000.0) / 2500.0))

    # Stage 1: Spectral Resonance & Whistle Suppressor (De-Clink)
    excess_db = np.maximum(0.0, prom_db - spike_thresh)
    atten_spikes_db = -excess_db * (1.0 - 1.0 / spike_ratio) * f_mask[:, None]
    atten_spikes_db = np.maximum(max_spike_cut, atten_spikes_db)

    # Stage 2: Dynamic Sibilance & Harshness Soother (3.2 - 9.0 kHz relative to warm body)
    rel_excess = np.maximum(0.0, harsh_rms_db - (warm_rms_db + dyn_thresh_offset))
    dyn_atten_db = -np.minimum(abs(dyn_max_cut), rel_excess * 0.65)
    dyn_atten_db = scipy.ndimage.uniform_filter1d(dyn_atten_db, size=5)

    # Combine spectral and dynamic attenuation
    total_gain_db = atten_spikes_db + (dyn_atten_db[None, :] * f_mask[:, None] * 0.75)
    # Smooth gain slightly across frequency (3 bins) to avoid musical noise artifacts
    total_gain_db = scipy.ndimage.uniform_filter(total_gain_db, size=(3, 2))
    gain_lin = 10.0 ** (total_gain_db / 20.0)

    Z_L_clean = Z_L * gain_lin
    Z_R_clean = Z_R * gain_lin

    # Measure post-processing harshness
    mag_after = 0.5 * (np.abs(Z_L_clean) + np.abs(Z_R_clean)) + 1e-9
    mag_after_db = 20.0 * np.log10(mag_after)
    prom_after_db = mag_after_db - scipy.ndimage.uniform_filter(mag_after_db, size=(17, 3))
    harsh_spikes_after = float(np.mean(np.maximum(0.0, prom_after_db[idx_core, :][active_mask] - 4.5))) if np.sum(active_mask) > 0 else 0.0
    after_score = max(0.0, min(100.0, (harsh_spikes_after - 3.5) * 14.5))
    reduction_pct = round((1.0 - (harsh_spikes_after / max(0.01, harsh_spikes_before))) * 100.0, 1)

    # Reconstruct time-domain stereo audio
    _, out_L = scipy.signal.istft(Z_L_clean, fs=sr, nperseg=nperseg, noverlap=noverlap)
    _, out_R = scipy.signal.istft(Z_R_clean, fs=sr, nperseg=nperseg, noverlap=noverlap)
    out = np.column_stack([out_L[:orig_len], out_R[:orig_len]])

    # Stage 3: Subtle Analog Tape Warmth on High-Mid Transients (Soft-Clipping saturation)
    if warmth_drive > 1.0:
        out = np.tanh(out * warmth_drive) / np.tanh(warmth_drive)

    # Match original peak ceiling so volume stays identical for A/B comparison
    orig_peak = np.max(np.abs(data)) + 1e-9
    new_peak = np.max(np.abs(out)) + 1e-9
    out = out * (orig_peak / new_peak)

    if is_mono:
        out = out[:, 0]

    # Save output file
    base_no_ext = os.path.splitext(target_file)[0]
    preview_wav = f"{base_no_ext}.deharsh.wav"
    subtype = info.subtype if info.format == "WAV" and info.subtype else "PCM_24"
    sf.write(preview_wav, out, sr, subtype=subtype)

    applied_to_master = False
    backup_file = None

    if apply_target:
        backup_file = f"{base_no_ext}.pre_deharsh.bak.wav"
        if not os.path.exists(backup_file):
            shutil.copy2(target_file, backup_file)
        shutil.copy2(preview_wav, target_file)
        applied_to_master = True

        # Check if there is a companion MP3 in ../mp3/ (because /api/stream uses companion MP3 if present!)
        norm_target = os.path.normpath(target_file)
        if f"{os.sep}wav{os.sep}" in norm_target.lower():
            mp3_candidate = norm_target.replace(f"{os.sep}wav{os.sep}", f"{os.sep}mp3{os.sep}").replace(".wav", ".mp3").replace(".WAV", ".mp3")
            if os.path.exists(os.path.dirname(mp3_candidate)) and HAS_LAME:
                try:
                    encoder = lameenc.Encoder()
                    encoder.set_bit_rate(320)
                    encoder.set_in_sample_rate(sr)
                    encoder.set_channels(1 if is_mono else 2)
                    encoder.set_quality(2)
                    pcm16 = (np.clip(out, -1.0, 1.0) * 32767.0).astype(np.int16)
                    mp3_data = encoder.encode(pcm16.tobytes()) + encoder.flush()
                    with open(mp3_candidate, "wb") as mf:
                        mf.write(mp3_data)
                except Exception:
                    pass

    return {
        "status": "success",
        "mode": "process",
        "strength": strength,
        "appliedToMaster": applied_to_master,
        "previewFile": preview_wav,
        "targetFile": target_file,
        "backupFile": backup_file,
        "beforeScore": round(raw_score, 1),
        "afterScore": round(after_score, 1),
        "reductionPercent": reduction_pct,
        "metrics": {
            "beforeSpikesDb": round(harsh_spikes_before, 2),
            "afterSpikesDb": round(harsh_spikes_after, 2),
            "maxAttenuationDb": round(float(np.min(total_gain_db)), 1)
        },
        "hotspots": hotspots,
        "processingTimeSec": round(time.time() - t0, 2)
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Usage: vocal_deharsh.py <file> [analyze|process] [gentle|medium|aggressive] [apply]"}))
        sys.exit(1)

    target_file = sys.argv[1]
    mode = sys.argv[2] if len(sys.argv) > 2 else "analyze"
    strength = sys.argv[3] if len(sys.argv) > 3 else "medium"
    apply_flag = (sys.argv[4].lower() == "true" or sys.argv[4] == "1" or sys.argv[4].lower() == "apply") if len(sys.argv) > 4 else False

    try:
        res = analyze_and_process(target_file, mode=mode, strength=strength, apply_target=apply_flag)
        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()

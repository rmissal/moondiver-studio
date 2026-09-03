/**
 * Two-Pass Adaptive Linear Mastering Engine
 * Executes Pass 1 Acoustic Analysis, Auto-Genre, Auto-Fade, and Pass 2 Linear Rendering
 */

const fs = require('fs');
const path = require('path');
const { PRESETS } = require('./presets');
const { buildFilterChain } = require('./dsp');
const { findLocalFfmpeg, runCommand } = require('./metadata');
const { findLocalFfprobe, detectGenre, resolveAudioFiles } = require('./analyzer');
const { calculateAppleMusicScore } = require('./apple-music');

// Master a single file (2-Pass Calibrated WAV + High Quality MP3 mit Auto-Genre & SinnTaucher Metadaten)
async function masterSingleFile(inputFile, outputFolder, options = {}) {
  const ffmpegBin = findLocalFfmpeg();
  const ffprobeBin = findLocalFfprobe();

  const bitDepth = options.bitDepth || 24;
  const suffix = options.suffix !== undefined ? options.suffix : '';
  const createMp3 = options.createMp3 !== false; // Default: true
  const mp3Bitrate = options.mp3Bitrate || '320k';

  // Automatische Unterordner wav/ und mp3/ erstellen
  const wavDir = path.join(outputFolder, 'wav');
  const mp3Dir = path.join(outputFolder, 'mp3');
  fs.mkdirSync(wavDir, { recursive: true });
  if (createMp3) {
    fs.mkdirSync(mp3Dir, { recursive: true });
  }

  // Probe metadata and duration
  let probeData = {};
  let duration = 0;
  try {
    const probeRes = await runCommand(ffprobeBin, [
      '-v', 'error',
      '-show_entries', 'format=duration,tags',
      '-of', 'json',
      inputFile
    ]);
    const parsed = JSON.parse(probeRes.stdout)?.format;
    probeData = parsed?.tags || {};
    duration = parsed?.duration ? parseFloat(parsed.duration) : 0;
  } catch {}

  // --- PASS 1: Akustische Analyse & Lautheitsmessung ---
  const pass1 = buildFilterChain(options, null, null);
  const pass1Args = ['-i', inputFile, '-af', pass1.filterString, '-f', 'null', '-'];
  const pass1Result = await runCommand(ffmpegBin, pass1Args);

  let measured = {};
  const jsonMatch = pass1Result.stderr.match(/\{[\s\r\n]*"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      measured = JSON.parse(jsonMatch[0]);
    } catch {}
  }
  if (!measured.input_i) {
    const fallback = pass1Result.stderr.match(/\[Parsed_loudnorm_\d+[^\]]*\][\s\S]*?(\{[\s\S]*?\})/);
    if (fallback) {
      try {
        measured = JSON.parse(fallback[1]);
      } catch {}
    }
  }

  // Auto-Genre Erkennung
  const isAuto = !options.preset || options.preset === 'auto';
  const genreInfo = detectGenre(inputFile, measured, probeData);
  const effectivePreset = isAuto ? genreInfo.detectedPreset : options.preset;
  const effectiveOptions = { ...options, preset: effectivePreset };

  // --- PASS 2: Lineare Präzisions-Berechnung mit erkanntem Profil, Auto-Fade & Metadaten ---
  const pass2 = buildFilterChain(effectiveOptions, measured, duration);

  const ext = path.extname(inputFile);
  const baseName = path.basename(inputFile, ext);
  
  // Resolve clean track title (especially when inputFile is auto_mixdown.wav or stem mix)
  let trackTitle = options.trackName;
  if (!trackTitle) {
    if (baseName.startsWith('auto_mixdown')) {
      trackTitle = path.basename(path.resolve(inputFile, '..', '..'));
    } else {
      trackTitle = baseName.replace(/_Mixed$/i, '');
    }
  }
  const cleanTitle = trackTitle.replace(/^\d+[\s_-]*/, '');
  const outBaseName = cleanTitle || baseName;
  let outputWavName = `${outBaseName}${suffix}.wav`;
  let outputWavPath = path.join(wavDir, outputWavName);

  // Single-File Versioning (so we never overwrite an existing master in this folder)
  if (fs.existsSync(outputWavPath)) {
    let ver = 1;
    while (fs.existsSync(path.join(wavDir, `${outBaseName}${suffix}_v${ver}.wav`))) ver++;
    outputWavName = `${outBaseName}${suffix}_v${ver}.wav`;
    outputWavPath = path.join(wavDir, outputWavName);
  }

  const artistName = options.artist || 'SinnTaucher';
  const albumName = options.album || path.basename(path.resolve(outputFolder).replace(/[/\\]mastered_versions(_v\d+)?$/i, ''));
  const dateStr = options.year || '2026';
  const genreStr = genreInfo.genreName || 'New Age & Ambient';
  const commentStr = `${bitDepth}-bit Lossless Studio Master (EBU R128 -16 LUFS)`;

  const metaArgs = [
    '-map_metadata', '-1', // Entfernt alle Suno-Wasserzeichen restlos
    '-metadata', `title=${cleanTitle}`,
    '-metadata', `artist=${artistName}`,
    '-metadata', `album_artist=${artistName}`,
    '-metadata', `album=${albumName}`,
    '-metadata', `date=${dateStr}`,
    '-metadata', `genre=${genreStr}`,
    '-metadata', `comment=${commentStr}`,
    '-metadata', 'encoded_by=Antigravity DSP Engine'
  ];

  const pcmCodec = bitDepth === 16 ? 'pcm_s16le' : bitDepth === 32 ? 'pcm_s32le' : 'pcm_s24le';

  const args = [
    '-i', inputFile
  ];

  args.push(
    '-af', pass2.filterString,
    ...metaArgs,
    '-c:a', pcmCodec,
    outputWavPath
  );

  let outputMp3Path = null;
  let outputMp3Name = null;
  if (createMp3) {
    let mp3Name = `${outBaseName}${suffix}.mp3`;
    let mp3Path = path.join(mp3Dir, mp3Name);
    if (fs.existsSync(mp3Path)) {
      let ver = 1;
      while (fs.existsSync(path.join(mp3Dir, `${outBaseName}${suffix}_v${ver}.mp3`))) ver++;
      mp3Name = `${outBaseName}${suffix}_v${ver}.mp3`;
      mp3Path = path.join(mp3Dir, mp3Name);
    }
    outputMp3Name = mp3Name;
    outputMp3Path = mp3Path;
    args.push(...metaArgs, '-c:a', 'libmp3lame', '-b:a', mp3Bitrate, outputMp3Path);
  }

  args.push('-y');

  await runCommand(ffmpegBin, args);

  const wavStats = fs.statSync(outputWavPath);
  const result = {
    input: inputFile,
    outputWav: outputWavPath,
    autoDetectedGenre: isAuto ? genreInfo : { preset: options.preset, name: PRESETS[options.preset]?.name || options.preset },
    
    // BEFORE / AFTER COMPARISON (KPIs)
    kpi_vergleich: {
      lufs: {
        before_measured: measured.input_i ? `${measured.input_i} LUFS` : 'N/A',
        after_target: `${pass2.settings.targetLufs} LUFS`
      },
      truePeak: {
        before_measured: measured.input_tp ? `${measured.input_tp} dBTP` : 'N/A',
        after_target: `${pass2.settings.truePeak} dBTP`
      },
      loudnessRange: {
        before_measured: measured.input_lra ? `${measured.input_lra} LU` : 'N/A',
        after_target: `${pass2.settings.lra} LU`
      }
    },
    
    // APPLIED APPLE MUSIC / STUDIO OPTIMIZATIONS
    optimizations: {
      antiClickFadeIn: "50ms (0.05s) Micro-Fade-In at start (prevents clicks & DC pop)",
      tailFadeOut: "Smart Silence Trim & 1.5s Reverb Tail Fade-Out at end (prevents abrupt cut-off)",
      dcOffsetRemoval: `Subsonic Highpass Filter @ ${pass2.settings.highpassFreq} Hz (removes inaudible rumble)`,
      stereoBreite: `Stereo Widening Faktor: ${pass2.settings.stereoWidth}x (better spatial depth)`,
      normalizationEngine: "Two-Pass Linear Loudness (EBU R128) - 100% Pumping-Free without compressor artifacts"
    },

    appleMusicConfidence: calculateAppleMusicScore({
      truePeakDbtp: pass2.settings.truePeak,
      integratedLoudnessLufs: pass2.settings.targetLufs,
      codec: `${bitDepth}-bit PCM WAV`,
      loudnessRangeLra: pass2.settings.lra
    }),
    
    // FILE STATISTICS
    stats: {
      wavSizeMb: (wavStats.size / (1024 * 1024)).toFixed(2),
      bitDepth: `${bitDepth}-bit PCM WAV`
    }
  };

  if (createMp3 && fs.existsSync(outputMp3Path)) {
    const mp3Stats = fs.statSync(outputMp3Path);
    result.outputMp3 = outputMp3Path;
    result.mp3FileName = outputMp3Name;
    result.mp3SizeBytes = mp3Stats.size;
    result.mp3SizeMb = (mp3Stats.size / (1024 * 1024)).toFixed(2);
    result.mp3Bitrate = mp3Bitrate;
  }

  // Save stats to a JSON file for the UI dashboard to read
  const statsJsonPath = outputWavPath.replace(/\.wav$/i, '.json');
  fs.writeFileSync(statsJsonPath, JSON.stringify(result, null, 2));

  return result;
}

// Master single file or entire directory
async function masterAudio(targetPath, options = {}) {
  const { files, isSingleFile, directory } = resolveAudioFiles(targetPath);

  if (files.length === 0) {
    throw new Error(`No matching audio files found in '${targetPath}' `);
  }

  let outputFolder = options.outputFolder;
  if (!outputFolder) {
    if (isSingleFile) {
      const normDir = directory.replace(/\\/g, '/');
      if (normDir.includes('/suno_exports')) {
        const albumRoot = normDir.substring(0, normDir.indexOf('/suno_exports'));
        outputFolder = path.join(path.resolve(albumRoot), 'mastered_versions');
      } else {
        outputFolder = path.join(directory, 'mastered_versions');
      }
    } else {
      outputFolder = path.join(path.resolve(targetPath), 'mastered_versions');
    }
  } else {
    outputFolder = path.resolve(outputFolder);
  }

  // Auto-Versioning: Backup existing output folder
  if (!isSingleFile && fs.existsSync(outputFolder)) {
    let version = 1;
    let backupFolder = `${outputFolder}_v${version}`;
    while (fs.existsSync(backupFolder)) {
      version++;
      backupFolder = `${outputFolder}_v${version}`;
    }
    try {
      fs.renameSync(outputFolder, backupFolder);
      console.log(`Moved existing master directory to ${path.basename(backupFolder)} `);
    } catch (e) {
      console.error(`Could not version existing directory: ${e.message}`);
    }
  }

  const results = [];
  for (const file of files) {
    const res = await masterSingleFile(file, outputFolder, options);
    results.push(res);
  }

  return {
    status: 'success',
    message: `${results.length} file(s) successfully mastered with Two-Pass Linear Mastering.`,
    outputFolder,
    processedTracks: results
  };
}

module.exports = {
  masterSingleFile,
  masterAudio
};


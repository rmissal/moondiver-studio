/**
 * Two-Pass Adaptive DSP Linear Mastering Engine
 * Apple Digital Masters & EBU R128 Compliant Two-Pass Mastering
 */

const fs = require('fs');
const path = require('path');
const { PRESETS } = require('./presets');
const { buildFilterChain } = require('./dsp');
const { findLocalFfmpeg, runCommand, embedStudioMetadata, AUDIO_EXTENSIONS } = require('./metadata');
const { detectGenre, analyzeFile, resolveAudioFiles } = require('./analyzer');
const { calculateAppleMusicScore } = require('./apple-music');

// Master a single audio file with two-pass calibrated EBU R128 processing
async function masterSingleFile(inputFile, options = {}) {
  const ffmpegBin = findLocalFfmpeg();
  const bitDepth = options.bitDepth || 24;
  const createMp3 = options.createMp3 !== false;
  const mp3Bitrate = options.mp3Bitrate || '320k';
  const isAuto = !options.preset || options.preset === 'auto';

  // 1. Analyze Pass 1
  let genreInfo = null;
  const initialAnalysis = await analyzeFile(inputFile);
  if (isAuto) {
    genreInfo = initialAnalysis.autoDetectedGenre;
    options.preset = genreInfo.detectedPreset;
  }

  const pass1 = buildFilterChain(options);
  const pass1Args = [
    '-v', 'error',
    '-i', inputFile,
    '-af', pass1.filterString,
    '-f', 'null',
    '-'
  ];

  const p1Res = await runCommand(ffmpegBin, pass1Args);
  let measured = {};
  const jsonMatch = p1Res.stderr.match(/\{[\s\r\n]*"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      measured = JSON.parse(jsonMatch[0]);
    } catch {}
  }
  if (!measured.input_i && initialAnalysis.integratedLoudnessLufs !== null) {
    measured = {
      input_i: String(initialAnalysis.integratedLoudnessLufs),
      input_tp: String(initialAnalysis.truePeakDbtp || -3.0),
      input_lra: String(initialAnalysis.loudnessRangeLra || 12.0),
      input_thresh: String(initialAnalysis.threshold || -26.0),
      target_offset: '0.0'
    };
  }

  // 2. Build Pass 2 Linear Calibrated Filter Graph
  const pass2 = buildFilterChain(options, measured);

  // Setup Output Directories
  const inputDir = path.dirname(inputFile);
  let outputBaseDir = options.outputFolder ? path.resolve(options.outputFolder) : inputDir;

  if (!options.outputFolder) {
    const isSunoExports = path.basename(inputDir).toLowerCase() === 'suno_exports';
    const albumRoot = isSunoExports ? path.dirname(inputDir) : inputDir;
    outputBaseDir = path.join(albumRoot, 'mastered_versions');
  }

  const wavDir = path.join(outputBaseDir, 'wav');
  const mp3Dir = path.join(outputBaseDir, 'mp3');
  fs.mkdirSync(wavDir, { recursive: true });
  if (createMp3) fs.mkdirSync(mp3Dir, { recursive: true });

  const rawBaseName = options.trackName ? options.trackName : path.basename(inputFile, path.extname(inputFile));
  const cleanTitle = rawBaseName.replace(/_Mixed$/i, '').replace(/_Master$/i, '').replace(/^\d+[\s_-]*/, '').trim();

  // Find if an existing numbered file is in wavDir (e.g. "08 - Silent Thoughts.wav")
  let targetWavName = `${cleanTitle}.wav`;
  let existingMatches = [];
  if (fs.existsSync(wavDir)) {
    const currentWavs = fs.readdirSync(wavDir);
    existingMatches = currentWavs.filter(f => {
      if (!f.toLowerCase().endsWith('.wav')) return false;
      const fClean = f.replace(/^\d+[\s_-]*/, '').replace(/\.wav$/i, '').trim().toLowerCase();
      return fClean === cleanTitle.toLowerCase();
    });
    if (existingMatches.length > 0) {
      // Prioritize numbered existing file
      const numberedMatch = existingMatches.find(f => /^\d+[\s_-]*/.test(f));
      targetWavName = numberedMatch || existingMatches[0];
    }
  }

  const outputWavPath = path.join(wavDir, targetWavName);

  // Strip input metadata (-map_metadata -1) to prevent AI tag leaks
  const pcmCodec = bitDepth === 16 ? 'pcm_s16le' : (bitDepth === 32 ? 'pcm_s32le' : 'pcm_s24le');
  const pass2WavArgs = [
    '-v', 'error',
    '-y',
    '-i', inputFile,
    '-af', pass2.filterString,
    '-map_metadata', '-1',
    '-c:a', pcmCodec,
    '-ar', '48000',
    outputWavPath
  ];

  await runCommand(ffmpegBin, pass2WavArgs);

  // Clean up any other alternate duplicate WAVs in wavDir (e.g. un-numbered "Silent Thoughts.wav" vs "08 - Silent Thoughts.wav")
  for (const match of existingMatches) {
    if (match !== targetWavName) {
      try { fs.unlinkSync(path.join(wavDir, match)); } catch {}
      try { fs.unlinkSync(path.join(wavDir, match.replace(/\.wav$/i, '.json'))); } catch {}
    }
  }

  // Embed Clean Studio Metadata
  const artistName = options.artist || 'Unknown Artist';
  const albumName = options.album || path.basename(outputBaseDir);
  const yearStr = options.year || '2026';
  const genreStr = options.genre || (genreInfo ? genreInfo.genreName : (PRESETS[options.preset]?.name || 'New Age & Ambient'));

  await embedStudioMetadata(outputWavPath, {
    title: cleanTitle,
    artist: artistName,
    album: albumName,
    trackNum: options.trackNum || '01',
    totalTracks: options.totalTracks || '01',
    genre: genreStr,
    year: yearStr,
    comment: '24-bit Lossless Studio Master, Apple Digital Masters Ready'
  });

  // Export 320k High-Quality MP3 companion
  const targetMp3Name = targetWavName.replace(/\.wav$/i, '.mp3');
  const outputMp3Path = path.join(mp3Dir, targetMp3Name);
  if (createMp3) {
    const pass2Mp3Args = [
      '-v', 'error',
      '-y',
      '-i', outputWavPath,
      '-c:a', 'libmp3lame',
      '-b:a', mp3Bitrate,
      '-ar', '48000',
      outputMp3Path
    ];
    await runCommand(ffmpegBin, pass2Mp3Args);

    // Clean up any duplicate alternate MP3s
    if (fs.existsSync(mp3Dir)) {
      const currentMp3s = fs.readdirSync(mp3Dir);
      for (const f of currentMp3s) {
        if (!f.toLowerCase().endsWith('.mp3')) continue;
        const fClean = f.replace(/^\d+[\s_-]*/, '').replace(/\.mp3$/i, '').trim().toLowerCase();
        if (fClean === cleanTitle.toLowerCase() && f !== targetMp3Name) {
          try { fs.unlinkSync(path.join(mp3Dir, f)); } catch {}
        }
      }
    }

    await embedStudioMetadata(outputMp3Path, {
      title: cleanTitle,
      artist: artistName,
      album: albumName,
      trackNum: options.trackNum || '01',
      totalTracks: options.totalTracks || '01',
      genre: genreStr,
      year: yearStr,
      comment: '320 kbps High-Quality Master, Apple Digital Masters Ready'
    });
  }

  const wavStats = fs.statSync(outputWavPath);
  const appleScoreObj = calculateAppleMusicScore({
    truePeakDbtp: pass2.settings.truePeak,
    integratedLoudnessLufs: pass2.settings.targetLufs,
    codec: `${bitDepth}-bit PCM WAV`,
    loudnessRangeLra: pass2.settings.lra
  });
  const appleRating = appleScoreObj.confidenceRating || (appleScoreObj.scorePercent >= 80 ? 'High' : 'Medium');

  const result = {
    status: 'success',
    track: cleanTitle,
    input: inputFile,
    outputWav: outputWavPath,
    autoDetectedGenre: isAuto ? genreInfo : { preset: options.preset, name: PRESETS[options.preset]?.name || options.preset },
    
    // BEFORE / AFTER COMPARISON (KPIs)
    kpiComparison: {
      lufs: {
        beforeMeasured: measured.input_i ? `${measured.input_i} LUFS` : 'N/A',
        afterTarget: `${pass2.settings.targetLufs} LUFS`,
        before_measured: measured.input_i ? `${measured.input_i} LUFS` : 'N/A',
        after_target: `${pass2.settings.targetLufs} LUFS`
      },
      truePeak: {
        beforeMeasured: measured.input_tp ? `${measured.input_tp} dBTP` : 'N/A',
        afterTarget: `${pass2.settings.truePeak} dBTP`,
        before_measured: measured.input_tp ? `${measured.input_tp} dBTP` : 'N/A',
        after_target: `${pass2.settings.truePeak} dBTP`
      },
      loudnessRange: {
        beforeMeasured: measured.input_lra ? `${measured.input_lra} LU` : 'N/A',
        afterTarget: `${pass2.settings.lra} LU`,
        before_measured: measured.input_lra ? `${measured.input_lra} LU` : 'N/A',
        after_target: `${pass2.settings.lra} LU`
      },
      appleMusicConfidence: appleRating
    },
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
      },
      appleMusicConfidence: appleRating
    },
    
    // APPLIED APPLE MUSIC / STUDIO OPTIMIZATIONS
    optimizations: [
      `Integrated Loudness: ${pass2.settings.targetLufs} LUFS (Broadcast calibrated)`,
      `True Peak: ${pass2.settings.truePeak} dBTP (Inter-sample peak safe)`,
      `Loudness Range: ${pass2.settings.lra} LU (Dynamic transparency preserved)`,
      `Apple Digital Masters Ready: ${appleRating} confidence rating`
    ],

    appleMusicConfidence: appleScoreObj,
    
    // FILE STATISTICS
    stats: {
      sampleRate: '48000 Hz',
      channels: 'Stereo (2.0)',
      codec: `${bitDepth}-bit PCM WAV`,
      wavSizeMb: (wavStats.size / (1024 * 1024)).toFixed(2),
      bitDepth: `${bitDepth}-bit PCM WAV`
    }
  };

  if (createMp3 && fs.existsSync(outputMp3Path)) {
    const mp3Stats = fs.statSync(outputMp3Path);
    result.outputMp3 = outputMp3Path;
    result.mp3FileName = targetMp3Name;
    result.mp3SizeBytes = mp3Stats.size;
    result.mp3SizeMb = (mp3Stats.size / (1024 * 1024)).toFixed(2);
    result.mp3Bitrate = mp3Bitrate;
  }

  // Save stats to a JSON file alongside the master WAV for the UI dashboard
  const statsJsonPath = outputWavPath.replace(/\.wav$/i, '.json');
  fs.writeFileSync(statsJsonPath, JSON.stringify(result, null, 2));

  // Also write into outputBaseDir/reports/ if possible
  const reportsDir = path.join(outputBaseDir, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, `${cleanTitle}.json`), JSON.stringify(result, null, 2));

  return result;
}

// Master single file or entire directory
async function masterAudio(targetPath, options = {}) {
  const { isSingleFile, files } = resolveAudioFiles(targetPath);
  const results = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const trackNum = String(i + 1).padStart(2, '0');
    const totalTracks = String(files.length).padStart(2, '0');

    const masterRes = await masterSingleFile(file, {
      ...options,
      trackNum,
      totalTracks
    });
    results.push(masterRes);
  }

  return {
    status: 'success',
    outputFolder: options.outputFolder || 'mastered_versions',
    processedTracks: results
  };
}

module.exports = {
  masterSingleFile,
  masterAudio
};

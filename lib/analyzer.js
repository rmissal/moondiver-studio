/**
 * Audio Acoustic Analyzer & Auto-Genre Classifier
 * Measures EBU R128 Integrated LUFS, True Peak, LRA, Crest Factor, and classifies musical genre
 */

const fs = require('fs');
const path = require('path');
const { AUDIO_EXTENSIONS, findLocalFfmpeg, runCommand } = require('./metadata');
const { calculateAppleMusicScore } = require('./apple-music');

function findLocalFfprobe() {
  const localFfprobe = path.resolve(__dirname, '..', 'ffmpeg', 'bin', 'ffprobe.exe');
  if (fs.existsSync(localFfprobe)) {
    return localFfprobe;
  }
  return 'ffprobe';
}

// Intelligente Genre-Erkennung anhand von akustischer DNA und Metadaten
function detectGenre(filePath, acousticData = {}, metadata = {}) {
  const fileName = path.basename(filePath).toLowerCase();
  const metaText = JSON.stringify(metadata).toLowerCase();
  const fullContext = `${fileName} ${metaText}`;

  const lra = acousticData.input_lra ? parseFloat(acousticData.input_lra) : 12.0;
  const inputI = acousticData.input_i ? parseFloat(acousticData.input_i) : -16.0;
  const truePeak = acousticData.input_tp ? parseFloat(acousticData.input_tp) : -3.0;
  const crestFactor = truePeak - inputI;

  const scores = {
    new_age_ambient: 1.0,
    cinematic_orchestral: 0.5,
    acoustic_instrumental: 0.5,
    meditation_chillout: 0.5,
    streaming_pop_standard: 0.2,
    stadium_live_rock: 0.2
  };

  // 1. Keyword-Scoring
  const keywords = {
    meditation_chillout: ['meditation', 'sleep', 'relax', 'zen', 'calm', 'tranquil', 'peaceful', 'spa', 'healing', 'binaural', 'deep space', 'solfeggio', 'whisper', 'soft', 'savasana'],
    new_age_ambient: ['ambient', 'new age', 'dream', 'ethereal', 'atmosphere', 'spheric', 'echo', 'lush', 'fantasy', 'chill', 'pad', 'drone', 'aurora', 'space', 'subnautica', 'taurio', 'anderswelt', 'truth', 'hope', 'continuity', 'springs', 'frozen', 'time', 'flow', 'current', 'glow', 'gleam', 'cosmos', 'weightless', 'water'],
    cinematic_orchestral: ['cinematic', 'orchestra', 'epic', 'soundtrack', 'score', 'movie', 'symphon', 'strings', 'heroic', 'dramatic', 'brass', 'trailer', 'film', 'battle', 'legend'],
    stadium_live_rock: ['stadium', 'live', 'unreal live', 'arena', 'rock', 'electric', 'crowd', 'concert'],
    acoustic_instrumental: ['acoustic', 'guitar', 'piano', 'harp', 'cello', 'violin', 'unplugged', 'folk', 'woodwind', 'flute', 'solo', 'organic', 'nature', 'seven days', 'duet', 'draussen', 'händen', 'haenden', 'bleiben', 'heute', 'endlich', 'königin', 'koenigin', 'nacht'],
    streaming_pop_standard: ['pop', 'radio', 'beat', 'dance', 'club', 'house', 'synthwave', 'electronic', 'energy', 'vocal', 'earth dance']
  };

  for (const [genre, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (fullContext.includes(w)) {
        scores[genre] += 2.5;
      }
    }
  }

  // Live overrides acoustic folk keywords
  if (fullContext.includes('live') || fullContext.includes('stadium') || fullContext.includes('arena')) {
    scores.stadium_live_rock += 5.0;
  }

  // 2. Akustik-DNA Heuristiken
  if (lra >= 16.0) scores.cinematic_orchestral += 1.2;
  if (lra <= 8.5) scores.streaming_pop_standard += 0.8;
  if (inputI <= -17.5) scores.meditation_chillout += 1.2;
  if (crestFactor >= 13.0) scores.new_age_ambient += 0.8;

  let bestGenre = 'new_age_ambient';
  let highestScore = -1;
  for (const [genre, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestGenre = genre;
    }
  }

  const genreNames = {
    new_age_ambient: 'New Age & Ambient',
    cinematic_orchestral: 'Cinematic & Orchestral',
    acoustic_instrumental: 'Folk & Acoustic',
    folk_acoustic: 'Folk & Acoustic',
    stadium_live_rock: 'Stadium Live Rock',
    meditation_chillout: 'Meditation & Deep Chillout',
    streaming_pop_standard: 'Streaming Pop / Modern Standard'
  };

  return {
    detectedPreset: bestGenre,
    genreName: genreNames[bestGenre] || 'New Age & Ambient',
    confidenceScore: highestScore >= 3.0 ? 'High' : 'Medium',
    acousticFeatures: {
      lra,
      integratedLufs: inputI,
      truePeakDbtp: truePeak,
      crestFactor: parseFloat(crestFactor.toFixed(1))
    }
  };
}

// Analyze audio loudness, metadata, auto-detected genre and Apple Music Compliance
async function analyzeFile(filePath) {
  const ffmpegBin = findLocalFfmpeg();
  const ffprobeBin = findLocalFfprobe();

  const probeArgs = [
    '-v', 'error',
    '-show_entries', 'stream=sample_rate,channels,bits_per_raw_sample,codec_name:format=duration,size,bit_rate,tags',
    '-of', 'json',
    filePath
  ];

  let probeData = null;
  try {
    const probeRes = await runCommand(ffprobeBin, probeArgs);
    probeData = JSON.parse(probeRes.stdout);
  } catch (e) {
    // ffprobe fallback
  }

  // EBU R128 Loudness measurement with loudnorm
  const ffmpegArgs = [
    '-i', filePath,
    '-af', 'loudnorm=I=-16:TP=-1.5:LRA=15:print_format=json',
    '-f', 'null',
    '-'
  ];

  const analysisRes = await runCommand(ffmpegBin, ffmpegArgs);
  let loudnormData = {};
  const jsonMatch = analysisRes.stderr.match(/\{[\s\r\n]*"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      loudnormData = JSON.parse(jsonMatch[0]);
    } catch {}
  }
  if (!loudnormData.input_i) {
    const fallback = analysisRes.stderr.match(/\[Parsed_loudnorm_\d+[^\]]*\][\s\S]*?(\{[\s\S]*?\})/);
    if (fallback) {
      try {
        loudnormData = JSON.parse(fallback[1]);
      } catch {}
    }
  }

  const stream = probeData?.streams?.[0] || {};
  const format = probeData?.format || {};
  const tags = format.tags || {};

  const genreInfo = detectGenre(filePath, loudnormData, tags);

  const fileMetrics = {
    file: path.basename(filePath),
    fullPath: filePath,
    sampleRate: stream.sample_rate ? `${stream.sample_rate} Hz` : 'Unknown',
    channels: stream.channels === 2 ? 'Stereo (2.0)' : stream.channels ? `${stream.channels} ch` : 'Stereo',
    codec: stream.codec_name || path.extname(filePath).replace('.', '').toUpperCase(),
    durationSeconds: format.duration ? parseFloat(format.duration).toFixed(2) : null,
    integratedLoudnessLufs: loudnormData.input_i ? parseFloat(loudnormData.input_i) : null,
    truePeakDbtp: loudnormData.input_tp ? parseFloat(loudnormData.input_tp) : null,
    loudnessRangeLra: loudnormData.input_lra ? parseFloat(loudnormData.input_lra) : null,
    threshold: loudnormData.input_thresh ? parseFloat(loudnormData.input_thresh) : null,
    autoDetectedGenre: genreInfo
  };

  fileMetrics.appleMusicConfidence = calculateAppleMusicScore(fileMetrics);

  return fileMetrics;
}

// Collect audio files from path
function resolveAudioFiles(targetPath) {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Target path does not exist: ${targetPath}`);
  }

  const stat = fs.statSync(resolved);
  if (stat.isFile()) {
    const ext = path.extname(resolved).toLowerCase();
    if (!AUDIO_EXTENSIONS.has(ext)) {
      throw new Error(`Unsupported audio format: ${ext}`);
    }
    return {
      isSingleFile: true,
      directory: path.dirname(resolved),
      files: [resolved]
    };
  }

  // Directory scan (checks suno_exports or project root)
  let scanDir = resolved;
  const sunoExports = path.join(resolved, 'suno_exports');
  if (fs.existsSync(sunoExports) && fs.statSync(sunoExports).isDirectory()) {
    const sunoFiles = fs.readdirSync(sunoExports)
      .map((f) => path.join(sunoExports, f))
      .filter((f) => fs.statSync(f).isFile() && AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()));
    if (sunoFiles.length > 0) {
      return {
        isSingleFile: false,
        directory: sunoExports,
        files: sunoFiles
      };
    }
  }

  const files = fs.readdirSync(scanDir)
    .map((f) => path.join(scanDir, f))
    .filter((f) => fs.statSync(f).isFile() && AUDIO_EXTENSIONS.has(path.extname(f).toLowerCase()));

  return {
    isSingleFile: false,
    directory: scanDir,
    files
  };
}

module.exports = {
  findLocalFfprobe,
  detectGenre,
  analyzeFile,
  resolveAudioFiles
};


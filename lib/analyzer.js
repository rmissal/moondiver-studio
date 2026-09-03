/**
 * Acoustic Analyzer & Genre Classifier Engine
 * Measures integrated LUFS, True Peak, LRA, Spectral DNA, and Apple Music Readiness
 */

const fs = require('fs');
const path = require('path');
const { PRESETS } = require('./presets');
const { findLocalFfmpeg, findLocalFfprobe, runCommand, AUDIO_EXTENSIONS } = require('./metadata');
const { calculateAppleMusicScore } = require('./apple-music');

// Auto-detect musical genre & acoustic profile using keywords, metadata & spectral DNA
function detectGenre(arg1 = {}, arg2 = {}, arg3 = '') {
  let metadata = {};
  let audioMetrics = {};
  let filePath = '';

  if (typeof arg1 === 'string') {
    filePath = arg1;
    audioMetrics = arg2 || {};
    metadata = arg3 && arg3.format && arg3.format.tags ? arg3.format.tags : arg3 || {};
  } else {
    metadata = arg1 && arg1.format && arg1.format.tags ? arg1.format.tags : arg1 || {};
    audioMetrics = arg2 || {};
    filePath = typeof arg3 === 'string' ? arg3 : '';
  }

  const title = (metadata.title || '').toLowerCase();
  const artist = (metadata.artist || '').toLowerCase();
  const album = (metadata.album || '').toLowerCase();
  const rawGenre = (metadata.genre || '').toLowerCase();
  const fileBasename = filePath ? path.basename(filePath, path.extname(filePath)).toLowerCase() : '';

  const fullContext = `${title} ${artist} ${album} ${rawGenre} ${fileBasename}`;

  const lra = audioMetrics.loudnessRangeLra ?? audioMetrics.input_lra ?? 10.0;
  const inputI = audioMetrics.integratedLoudnessLufs ?? audioMetrics.input_i ?? -16.0;
  const truePeak = audioMetrics.truePeakDbtp ?? audioMetrics.input_tp ?? -2.0;
  const crestFactor = Math.abs(inputI) - Math.abs(truePeak);

  const scores = {
    chillout_lounge: 0.0,
    nu_jazz_lounge: 0.0,
    jazz_acoustic: 0.0,
    easy_listening: 0.0,
    melodic_dance_club: 0.0,
    new_age_ambient: 0.0,
    cinematic_orchestral: 0.0,
    acoustic_instrumental: 0.0,
    meditation_chillout: 0.0,
    streaming_pop_standard: 0.0,
    stadium_live_rock: 0.0
  };

  // 1. Keyword Scoring
  const keywords = {
    chillout_lounge: [
      'chill',
      'lounge',
      'chillout',
      'balearic',
      'sail',
      'adriatic',
      'aegean',
      'waves',
      'beach',
      'sunset',
      'sunrise',
      'sea',
      'ocean',
      'summer',
      'island',
      'lagoon',
      'coast',
      'breeze',
      'lemonade',
      'cliffs',
      'ibiza',
      'holiday',
      'resort',
      'vacation',
      'amalfi',
      'bonifacio',
      'cretan',
      'algarve',
      'alexandria',
      'mediterranean'
    ],
    nu_jazz_lounge: [
      'nu-jazz',
      'nu jazz',
      'nujazz',
      'acid jazz',
      'jazz lounge',
      'rhodes',
      'brass',
      'trumpet',
      'sax',
      'saxophone',
      'groove',
      'urban jazz',
      'smooth jazz'
    ],
    jazz_acoustic: [
      'jazz',
      'swing',
      'bebop',
      'big band',
      'jazz trio',
      'double bass',
      'upright bass',
      'jazz ballad',
      'trio',
      'quartet',
      'quintet'
    ],
    easy_listening: [
      'easy listening',
      'smooth',
      'mellow',
      'soft groove',
      'acoustic groove',
      'unplugged groove',
      'cafe',
      'afternoon'
    ],
    melodic_dance_club: [
      'dance',
      'club',
      'house',
      'deep house',
      'melodic house',
      'techno',
      'edm',
      'synthwave',
      'beat',
      'electronic',
      'earth dance'
    ],
    meditation_chillout: [
      'meditation',
      'sleep',
      'relax',
      'zen',
      'calm',
      'tranquil',
      'peaceful',
      'spa',
      'healing',
      'binaural',
      'deep space',
      'solfeggio',
      'whisper',
      'soft',
      'savasana'
    ],
    new_age_ambient: [
      'ambient',
      'new age',
      'dream',
      'ethereal',
      'atmosphere',
      'spheric',
      'echo',
      'lush',
      'fantasy',
      'pad',
      'drone',
      'aurora',
      'space',
      'truth',
      'hope',
      'continuity',
      'springs',
      'frozen',
      'time',
      'glow',
      'gleam',
      'cosmos',
      'weightless'
    ],
    cinematic_orchestral: [
      'cinematic',
      'orchestra',
      'epic',
      'soundtrack',
      'score',
      'movie',
      'symphon',
      'strings',
      'heroic',
      'dramatic',
      'brass',
      'trailer',
      'film',
      'battle',
      'legend'
    ],
    stadium_live_rock: ['stadium', 'live', 'unreal live', 'arena', 'rock', 'electric', 'crowd', 'concert'],
    acoustic_instrumental: [
      'acoustic',
      'guitar',
      'piano',
      'harp',
      'cello',
      'violin',
      'unplugged',
      'folk',
      'woodwind',
      'flute',
      'solo',
      'organic',
      'nature',
      'duet'
    ],
    streaming_pop_standard: ['pop', 'radio', 'energy', 'vocal', 'chart', 'hit']
  };

  for (const [genre, words] of Object.entries(keywords)) {
    for (const w of words) {
      if (fullContext.includes(w)) {
        scores[genre] += 3.0;
      }
    }
  }

  // Live overrides acoustic folk keywords
  if (fullContext.includes('live') || fullContext.includes('stadium') || fullContext.includes('arena')) {
    scores.stadium_live_rock += 6.0;
  }

  // 2. Acoustic DNA Heuristics
  if (lra >= 16.0) scores.cinematic_orchestral += 2.0;
  if (lra <= 8.0) scores.streaming_pop_standard += 2.0;
  if (inputI >= -11.0) scores.streaming_pop_standard += 1.5;
  if (inputI <= -17.5) scores.meditation_chillout += 1.5;
  if (crestFactor >= 13.0) scores.new_age_ambient += 0.5;

  let bestGenre = 'new_age_ambient';
  let highestScore = 0;
  for (const [genre, score] of Object.entries(scores)) {
    if (score > highestScore) {
      highestScore = score;
      bestGenre = genre;
    }
  }

  return {
    detectedPreset: bestGenre,
    genreName: PRESETS[bestGenre]?.name || 'New Age & Ambient',
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
    '-v',
    'error',
    '-show_entries',
    'stream=sample_rate,channels,bits_per_raw_sample,codec_name:format=duration,size,bit_rate,tags',
    '-of',
    'json',
    filePath
  ];

  let tags = {};
  let duration = 0;
  let sampleRate = '48000';
  let channels = 2;
  let codecName = 'pcm_s24le';

  try {
    const probeRes = await runCommand(ffprobeBin, probeArgs);
    const info = JSON.parse(probeRes.stdout);
    if (info.format && info.format.tags) tags = info.format.tags;
    if (info.format && info.format.duration) duration = parseFloat(info.format.duration);
    if (info.streams && info.streams[0]) {
      sampleRate = info.streams[0].sample_rate || '48000';
      channels = info.streams[0].channels || 2;
      codecName = info.streams[0].codec_name || 'pcm_s24le';
    }
  } catch (_e) {}

  // Run EBU R128 Pass 1 Loudness Analysis
  const ebuArgs = ['-v', 'info', '-i', filePath, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'];

  const ebuRes = await runCommand(ffmpegBin, ebuArgs);
  let integratedLufs = -16.0;
  let truePeakDbtp = -2.0;
  let loudnessRangeLra = 10.0;
  let threshold = -26.0;

  const jsonMatch = ebuRes.stderr.match(/\{[\s\r\n]*"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      integratedLufs = parseFloat(parsed.input_i);
      truePeakDbtp = parseFloat(parsed.input_tp);
      loudnessRangeLra = parseFloat(parsed.input_lra);
      threshold = parseFloat(parsed.input_thresh);
    } catch (_e) {
      console.error('JSON PARSE FAILED:', _e, jsonMatch[0]);
    }
  } else {
    console.error('JSON MATCH FAILED:', ebuRes.stderr);
  }

  const rawAnalysis = {
    filePath,
    fileName: path.basename(filePath),
    durationSeconds: duration,
    sampleRate: `${sampleRate} Hz`,
    channels: channels === 1 ? 'Mono' : 'Stereo',
    codec: codecName.toUpperCase(),
    integratedLoudnessLufs: integratedLufs,
    truePeakDbtp: truePeakDbtp,
    loudnessRangeLra: loudnessRangeLra,
    threshold: threshold,
    metadataTags: tags
  };

  rawAnalysis.autoDetectedGenre = detectGenre(
    tags,
    {
      integratedLoudnessLufs: integratedLufs,
      truePeakDbtp: truePeakDbtp,
      loudnessRangeLra: loudnessRangeLra
    },
    filePath
  );

  rawAnalysis.appleMusicConfidence = calculateAppleMusicScore(rawAnalysis);

  return rawAnalysis;
}

// Find all audio tracks in directory
function resolveAudioFiles(targetPath) {
  const resolved = path.resolve(targetPath);
  const stats = fs.statSync(resolved);

  if (stats.isFile()) {
    return {
      isSingleFile: true,
      files: [resolved]
    };
  }

  const files = fs
    .readdirSync(resolved)
    .filter(f => {
      const ext = path.extname(f).toLowerCase();
      return AUDIO_EXTENSIONS.includes(ext) && !f.endsWith('_Master.wav') && !f.endsWith('_Mixed.wav');
    })
    .map(f => path.join(resolved, f));

  return {
    isSingleFile: false,
    files
  };
}

module.exports = {
  detectGenre,
  analyzeFile,
  resolveAudioFiles
};

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { PRESETS } = require('./presets');

// Fallback FFmpeg locator
function findLocalFfmpeg() {
  const localPaths = [
    path.join(__dirname, '..', 'ffmpeg', 'bin', 'ffmpeg.exe'),
    path.join(__dirname, '..', 'ffmpeg', 'ffmpeg.exe')
  ];
  for (const p of localPaths) {
    if (fs.existsSync(p)) return p;
  }
  return 'ffmpeg';
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const ffmpegPath = findLocalFfmpeg();
    const process = spawn(ffmpegPath, args);
    let stderr = '';
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: \n${stderr}`));
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

async function mixStems(targetFolder, options = {}) {
  const {
    preset = 'auto',
    outputFolder = 'mixed_stems'
  } = options;

  let resolvedFolder = path.resolve(targetFolder);

  // If user passed a .wav or .mp3 file, automatically resolve to the htdemucs_ft folder!
  try {
    const stats = fs.statSync(resolvedFolder);
    if (stats.isFile()) {
      const parsed = path.parse(resolvedFolder);
      resolvedFolder = path.join(parsed.dir, 'htdemucs_ft', parsed.name);
    }
  } catch (e) {
    // Ignore and let it fail naturally below if path doesn't exist
  }

  const outDir = path.isAbsolute(outputFolder) ? outputFolder : path.join(resolvedFolder, outputFolder);
  
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Find stem files
  const files = fs.readdirSync(resolvedFolder);
  const getStem = (name) => {
    const match = files.find(f => f.toLowerCase() === `${name}.wav` || f.toLowerCase() === `${name}.flac`);
    return match ? path.join(resolvedFolder, match) : null;
  };

  const vocalsPath = getStem('vocals');
  const bassPath = getStem('bass');
  const drumsPath = getStem('drums');
  const otherPath = getStem('other');

  if (!vocalsPath && !bassPath && !drumsPath && !otherPath) {
    throw new Error(`No stems (vocals.wav, bass.wav, drums.wav, other.wav) found in ${resolvedFolder}.`);
  }

  // Load preset parameters or use defaults
  const cfg = PRESETS[preset] || PRESETS['auto'];
  const sm = cfg.stemMix || PRESETS['auto'].stemMix;

  const inputs = [];
  const filterChains = [];
  let mixInputs = '';
  let inputCount = 0;

  // 1. Vocals
  if (vocalsPath) {
    inputs.push('-i', vocalsPath);
    const v = sm.vocals || { volume: 1.2, highpass: 100, trebleGain: 2.5, trebleFreq: 8000 };
    const vFilters = [];
    if (v.highpass > 0) vFilters.push(`highpass=f=${v.highpass}`);
    if (v.trebleGain !== 0) vFilters.push(`treble=g=${v.trebleGain}:f=${v.trebleFreq || 8000}`);
    if (v.volume) vFilters.push(`volume=${v.volume}`);
    filterChains.push(`[${inputCount}:a]${vFilters.join(',')}[v_out]`);
    mixInputs += `[v_out]`;
    inputCount++;
  }

  // 2. Bass
  if (bassPath) {
    inputs.push('-i', bassPath);
    const b = sm.bass || { volume: 0.9, mono: true, lowpass: 400, boostFreq: 80, boostGain: 1.0 };
    const bFilters = [];
    if (b.mono) bFilters.push(`pan=mono|c0=0.5*c0+0.5*c1`);
    if (b.lowpass > 0) bFilters.push(`lowpass=f=${b.lowpass}`);
    if (b.boostGain && b.boostGain !== 0) bFilters.push(`equalizer=f=${b.boostFreq || 80}:t=q:w=1.2:g=${b.boostGain}`);
    if (b.volume) bFilters.push(`volume=${b.volume}`);
    filterChains.push(`[${inputCount}:a]${bFilters.join(',')}[b_out]`);
    mixInputs += `[b_out]`;
    inputCount++;
  }

  // 3. Drums
  if (drumsPath) {
    inputs.push('-i', drumsPath);
    const d = sm.drums || { volume: 1.0, punchFreq: 3500, punchGain: 1.0 };
    const dFilters = [];
    if (d.punchGain && d.punchGain !== 0) dFilters.push(`equalizer=f=${d.punchFreq || 3500}:t=q:w=1.0:g=${d.punchGain}`);
    if (d.volume) dFilters.push(`volume=${d.volume}`);
    filterChains.push(`[${inputCount}:a]${dFilters.join(',')}[d_out]`);
    mixInputs += `[d_out]`;
    inputCount++;
  }

  // 4. Other (Instruments/Synths)
  if (otherPath) {
    inputs.push('-i', otherPath);
    const o = sm.other || { volume: 0.85, width: 1.2, deMudFreq: 320, deMudGain: -2.0 };
    const oFilters = [];
    if (o.deMudGain && o.deMudGain !== 0) oFilters.push(`equalizer=f=${o.deMudFreq || 320}:t=q:w=1.0:g=${o.deMudGain}`);
    if (o.bodyGain && o.bodyGain !== 0) oFilters.push(`equalizer=f=${o.bodyFreq || 220}:t=q:w=1.2:g=${o.bodyGain}`);
    if (o.guitarBiteGain && o.guitarBiteGain !== 0) oFilters.push(`equalizer=f=${o.guitarBiteFreq || 2200}:t=q:w=1.0:g=${o.guitarBiteGain}`);
    if (o.width && o.width !== 1.0) oFilters.push(`stereotools=slev=${o.width}:mlev=0.9`);
    if (o.volume) oFilters.push(`volume=${o.volume}`);
    filterChains.push(`[${inputCount}:a]${oFilters.join(',')}[o_out]`);
    mixInputs += `[o_out]`;
    inputCount++;
  }

  // Combine filters
  const mixFilter = `${mixInputs}amix=inputs=${inputCount}:duration=longest:dropout_transition=2:normalize=0[mixout]`;
  const fullFilterGraph = filterChains.join('; ') + '; ' + mixFilter;

  const targetName = path.basename(resolvedFolder);
  const outPath = path.join(outDir, `${targetName}_Mixed.wav`);

  const ffmpegArgs = [
    '-v', 'warning',
    ...inputs,
    '-filter_complex', fullFilterGraph,
    '-map', '[mixout]',
    '-ac', '2',
    '-ar', '48000',
    '-c:a', 'pcm_s24le',
    '-y',
    outPath
  ];

  await runFfmpeg(ffmpegArgs);

  return {
    status: 'success',
    mixdownFile: outPath,
    stemsMixed: inputCount,
    appliedDeMud: `${midDeMudGain}dB at ${midDeMudFreq}Hz on instruments`
  };
}

module.exports = { mixStems };

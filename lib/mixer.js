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

  const resolvedFolder = path.resolve(targetFolder);
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
    throw new Error(`Keine Stems (vocals.wav, bass.wav, drums.wav, other.wav) in ${resolvedFolder} gefunden.`);
  }

  // Load preset parameters or use defaults
  const cfg = PRESETS[preset] || PRESETS['auto'];
  // We extract mud freq/gain from preset if available, to cut mud from instruments
  const midDeMudFreq = cfg.midDeMudFreq || 320;
  const midDeMudGain = (cfg.midDeMudGainDb || -1.0) * 2; // Double the cut for stems!

  const inputs = [];
  const filterChains = [];
  let mixInputs = '';
  let inputCount = 0;

  // 1. Vocals
  if (vocalsPath) {
    inputs.push('-i', vocalsPath);
    // Highpass to remove rumble, Treble boost for Air, slight volume bump
    filterChains.push(`[${inputCount}:a]highpass=f=100,treble=g=2.5:f=8000,volume=1.2[v_out]`);
    mixInputs += `[v_out]`;
    inputCount++;
  }

  // 2. Bass
  if (bassPath) {
    inputs.push('-i', bassPath);
    // Strict Mono (average L+R), lowpass to keep it focused, slight volume cut to balance
    filterChains.push(`[${inputCount}:a]pan=mono|c0=0.5*c0+0.5*c1,lowpass=f=400,volume=0.9[b_out]`);
    mixInputs += `[b_out]`;
    inputCount++;
  }

  // 3. Drums
  if (drumsPath) {
    inputs.push('-i', drumsPath);
    // Keep raw punch, slight high-mid presence
    filterChains.push(`[${inputCount}:a]equalizer=f=3500:t=q:w=1:g=1.0,volume=1.0[d_out]`);
    mixInputs += `[d_out]`;
    inputCount++;
  }

  // 4. Other (Instruments/Synths)
  if (otherPath) {
    inputs.push('-i', otherPath);
    // Heavy De-Mud, slight stereo widen, reduce volume
    filterChains.push(`[${inputCount}:a]equalizer=f=${midDeMudFreq}:t=q:w=1.0:g=${midDeMudGain},stereotools=slev=1.2:mlev=0.9,volume=0.85[o_out]`);
    mixInputs += `[o_out]`;
    inputCount++;
  }

  // Combine filters
  const mixFilter = `${mixInputs}amix=inputs=${inputCount}:duration=longest:dropout_transition=2:normalize=0[mixout]`;
  const fullFilterGraph = filterChains.join('; ') + '; ' + mixFilter;

  let baseOutName = 'auto_mixdown';
  let outPath = path.join(outDir, `${baseOutName}.wav`);
  if (fs.existsSync(outPath)) {
    let ver = 1;
    while (fs.existsSync(path.join(outDir, `${baseOutName}_v${ver}.wav`))) ver++;
    outPath = path.join(outDir, `${baseOutName}_v${ver}.wav`);
  }

  const ffmpegArgs = [
    '-v', 'warning',
    ...inputs,
    '-filter_complex', fullFilterGraph,
    '-map', '[mixout]',
    '-ac', '2',
    '-ar', '48000',
    '-sample_fmt', 's24le',
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

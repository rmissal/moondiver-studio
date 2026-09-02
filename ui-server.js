const express = require('express');
const path = require('path');
const { masterAudio } = require('./lib/masterer');
const { sequenceAlbum } = require('./lib/sequencer');
const { mixStems } = require('./lib/mixer');
const { PRESETS } = require('./lib/presets');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: Split Stems using Demucs
app.post('/api/split', (req, res) => {
  const { targetFile } = req.body;
  if (!targetFile) return res.status(400).json({ error: 'targetFile is required' });

  const outDir = path.dirname(targetFile);

  // We use python3 explicitly so it works on Windows, macOS, and Linux
  const procFull = spawn('python3', ['-m', 'demucs.separate', '-n', 'htdemucs_ft', targetFile, '-o', outDir]);

  let log = '';
  procFull.stderr.on('data', d => { log += d.toString() });
  
  procFull.on('close', code => {
    if (code === 0) res.json({ status: 'success', message: 'Stems successfully split!', outDir: path.join(outDir, 'htdemucs_ft') });
    else res.status(500).json({ error: `Demucs failed: ${log}` });
  });
});

// API: Open Explorer
app.post('/api/open-explorer', (req, res) => {
  const { targetFolder } = req.body;
  if (targetFolder) {
    const { exec } = require('child_process');
    exec(`explorer "${targetFolder}"`, (error) => {
      if (error) console.error("Explorer Error: ", error);
    });
    return res.json({ success: true });
  }
  res.status(400).json({ error: 'No folder provided' });
});

const os = require('os');

let lastCpuTime = { idle: 0, total: 0 };

function getCpuUsage() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      total += cpu.times[type];
    }
    idle += cpu.times.idle;
  }
  
  if (lastCpuTime.total === 0) {
    lastCpuTime = { idle, total };
    return 0;
  }
  
  const idleDiff = idle - lastCpuTime.idle;
  const totalDiff = total - lastCpuTime.total;
  lastCpuTime = { idle, total };
  
  return 100 - ~~(100 * idleDiff / totalDiff);
}

// API: System Stats
app.get('/api/system-stats', (req, res) => {
  const usage = getCpuUsage();
  
  const { exec } = require('child_process');
  exec('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', (err, stdout) => {
    let gpu = 0;
    if (!err && stdout) {
      gpu = parseInt(stdout.trim(), 10);
      if (isNaN(gpu)) gpu = 0;
    }
    res.json({ cpu: usage, gpu });
  });
});

// API: Get Presets
app.get('/api/presets', (req, res) => {
  res.json(PRESETS);
});

// API: Mix Stems
app.post('/api/mix', async (req, res) => {
  try {
    const { targetFolder, preset } = req.body;
    const result = await mixStems(targetFolder, { preset });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Master Audio
app.post('/api/master', async (req, res) => {
  try {
    const { targetPath, preset } = req.body;
    const result = await masterAudio(targetPath, { preset });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Sequence Album
app.post('/api/sequence', async (req, res) => {
  try {
    const { targetPath, arcModel, applyRenumbering } = req.body;
    const result = await sequenceAlbum(targetPath, { arcModel, applyRenumbering });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SinnTaucher Studio Dashboard runs on http://localhost:${PORT}`);
});

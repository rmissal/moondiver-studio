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
const fs = require('fs');

// API: Scan Folder for Audio Files and check their pipeline state
app.post('/api/scan-folder', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Valid folderPath is required' });
  }

  try {
    const files = fs.readdirSync(folderPath);
    const audioFiles = files.filter(f => f.toLowerCase().endsWith('.wav') || f.toLowerCase().endsWith('.flac') || f.toLowerCase().endsWith('.mp3'));
    
    const results = audioFiles.map(file => {
      const parsed = path.parse(file);
      const name = parsed.name;
      const fullPath = path.join(folderPath, file);
      
      // Check states
      const htdemucsFolder = path.join(folderPath, 'htdemucs_ft', name);
      const mixedStemsFolder = path.join(htdemucsFolder, 'mixed_stems');
      const hasSplit = fs.existsSync(htdemucsFolder) && fs.readdirSync(htdemucsFolder).filter(f => f.endsWith('.wav')).length >= 4;
      
      const mixedFile = path.join(mixedStemsFolder, `${name}_Mixed.wav`);
      const hasMixed = fs.existsSync(mixedFile);
      
      // Determine album root (one folder up if we are in suno_exports)
      let albumRoot = folderPath;
      if (albumRoot.endsWith('\\') || albumRoot.endsWith('/')) {
        albumRoot = albumRoot.slice(0, -1);
      }
      if (albumRoot.toLowerCase().endsWith('suno_exports')) {
        albumRoot = albumRoot.substring(0, Math.max(albumRoot.lastIndexOf('\\'), albumRoot.lastIndexOf('/')));
      }

      const masteredFolder = path.join(albumRoot, 'mastered_versions', 'wav');
      let hasMastered = false;
      let masteredFile = null;
      let masterStats = null;
      if (fs.existsSync(masteredFolder)) {
         const match = fs.readdirSync(masteredFolder).find(f => f.includes(name) && f.endsWith('.wav'));
         if (match) {
            hasMastered = true;
            masteredFile = path.join(masteredFolder, match);
            
            // Look for matching stats JSON
            const jsonPath = masteredFile.replace(/\.wav$/i, '.json');
            if (fs.existsSync(jsonPath)) {
               try {
                  masterStats = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
               } catch (e) {}
            }
         }
      }

      return {
        name,
        fileName: file,
        fullPath,
        hasSplit,
        hasMixed,
        hasMastered,
        mixedFile: hasMixed ? mixedFile : null,
        masteredFile,
        masterStats
      };
    });

    res.json({ folder: folderPath, tracks: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Browse for folder (native OS dialog via PowerShell)
app.get('/api/browse-folder', (req, res) => {
  const startDir = req.query.start || 'E:\\Music Projects';
  const ps = spawn('powershell.exe', ['-NoProfile', '-Command', `
    Add-Type -AssemblyName System.Windows.Forms
    $dlg = New-Object System.Windows.Forms.FolderBrowserDialog
    $dlg.Description = 'Select Album suno_exports Folder'
    $dlg.SelectedPath = '${startDir.replace(/'/g, "''")}'
    $dlg.ShowNewFolderButton = $false
    if ($dlg.ShowDialog() -eq 'OK') { Write-Output $dlg.SelectedPath }
  `]);
  let result = '';
  ps.stdout.on('data', d => result += d.toString());
  ps.on('close', () => {
    const folder = result.trim();
    if (folder) {
      res.json({ folder });
    } else {
      res.json({ folder: null });
    }
  });
});

// API: Stream Audio File for Playback
app.get('/api/stream', (req, res) => {
  const filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Audio file not found');
  }
  
  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes'
  });
  
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

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

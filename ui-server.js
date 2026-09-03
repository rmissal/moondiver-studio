const express = require('express');
const path = require('path');
const { masterAudio } = require('./lib/masterer');
const { sequenceAlbum } = require('./lib/sequencer');
const { mixStems } = require('./lib/mixer');
const { PRESETS } = require('./lib/presets');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Find all version folders (mastered_versions, mastered_versions_v1, etc.)
function getMasterVersionFolders(albumRoot) {
  if (!fs.existsSync(albumRoot)) return ['mastered_versions'];
  try {
    const entries = fs.readdirSync(albumRoot, { withFileTypes: true });
    const dirs = entries
      .filter(d => d.isDirectory() && (d.name === 'mastered_versions' || /^mastered_versions_v\d+$/i.test(d.name)))
      .map(d => d.name)
      .sort((a, b) => {
        if (a === 'mastered_versions') return -1;
        if (b === 'mastered_versions') return 1;
        const numA = parseInt(a.match(/\d+$/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+$/)?.[0] || '0', 10);
        return numA - numB;
      });
    if (!dirs.includes('mastered_versions')) dirs.unshift('mastered_versions');
    return dirs;
  } catch {
    return ['mastered_versions'];
  }
}

// API: List available albums in E:\Music Projects
app.get('/api/albums', (req, res) => {
  const rootDir = 'E:\\Music Projects';
  if (!fs.existsSync(rootDir)) return res.json({ albums: [] });
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true });
    const albums = entries
      .filter(d => d.isDirectory() && d.name !== 'Moondiver-Studio' && !d.name.startsWith('.'))
      .map(d => {
        const albumPath = path.join(rootDir, d.name);
        const sunoPath = path.join(albumPath, 'suno_exports');
        const hasSuno = fs.existsSync(sunoPath);
        return {
          name: d.name,
          path: hasSuno ? sunoPath : albumPath,
          albumRoot: albumPath
        };
      });
    res.json({ albums });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Scan Folder for Audio Files and check their pipeline state
app.post('/api/scan-folder', (req, res) => {
  const { folderPath, targetVersion } = req.body;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Valid folderPath is required' });
  }

  try {
    const files = fs.readdirSync(folderPath);
    const audioFiles = files.filter(f => f.toLowerCase().endsWith('.wav') || f.toLowerCase().endsWith('.flac') || f.toLowerCase().endsWith('.mp3'));
    
    // Determine album root (one folder up if we are in suno_exports)
    let albumRoot = folderPath;
    if (albumRoot.endsWith('\\') || albumRoot.endsWith('/')) {
      albumRoot = albumRoot.slice(0, -1);
    }
    if (albumRoot.toLowerCase().endsWith('suno_exports')) {
      albumRoot = albumRoot.substring(0, Math.max(albumRoot.lastIndexOf('\\'), albumRoot.lastIndexOf('/')));
    }

    const versionFolders = getMasterVersionFolders(albumRoot);
    const selectedVersion = targetVersion && versionFolders.includes(targetVersion) ? targetVersion : 'mastered_versions';
    const masteredFolder = path.join(albumRoot, selectedVersion, 'wav');

    const results = audioFiles.map(file => {
      const parsed = path.parse(file);
      const name = parsed.name;
      const fullPath = path.join(folderPath, file);
      
      // Check Step 1: Demucs Stems
      const htdemucsFolder = path.join(folderPath, 'htdemucs_ft', name);
      const mixedStemsFolder = path.join(htdemucsFolder, 'mixed_stems');
      const hasSplit = fs.existsSync(htdemucsFolder) && fs.readdirSync(htdemucsFolder).filter(f => f.endsWith('.wav')).length >= 4;
      
      // Check Step 2: Auto-Mix (supports both Drifting_Mixed.wav and auto_mixdown.wav)
      const mixedCandidates = [
        path.join(mixedStemsFolder, `${name}_Mixed.wav`),
        path.join(mixedStemsFolder, 'auto_mixdown.wav'),
        path.join(mixedStemsFolder, 'auto_mixdown_v1.wav'),
        path.join(mixedStemsFolder, 'auto_mixdown_v2.wav')
      ];
      const mixedFile = mixedCandidates.find(f => fs.existsSync(f)) || null;
      const hasMixed = !!mixedFile;

      // Check Step 3: Mastered in selected version folder
      let hasMastered = false;
      let masteredFile = null;
      let masterStats = null;
      if (fs.existsSync(masteredFolder)) {
         const wavFiles = fs.readdirSync(masteredFolder);
         const cleanName = name.replace(/^\d+[\s_-]*/, '').toLowerCase();
         const match = wavFiles.find(f => {
           if (!f.toLowerCase().endsWith('.wav')) return false;
           const fClean = f.replace(/^\d+[\s_-]*/, '').replace(/\.wav$/i, '').toLowerCase();
           return fClean === cleanName || f.toLowerCase().includes(cleanName);
         });
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

    res.json({
      folder: folderPath,
      albumRoot,
      availableVersions: versionFolders,
      currentVersion: selectedVersion,
      tracks: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Create new version folder (mastered_versions_v1, v2, etc.)
app.post('/api/create-version', (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath) return res.status(400).json({ error: 'folderPath is required' });

  let albumRoot = folderPath;
  if (albumRoot.endsWith('\\') || albumRoot.endsWith('/')) albumRoot = albumRoot.slice(0, -1);
  if (albumRoot.toLowerCase().endsWith('suno_exports')) {
    albumRoot = albumRoot.substring(0, Math.max(albumRoot.lastIndexOf('\\'), albumRoot.lastIndexOf('/')));
  }

  const existing = getMasterVersionFolders(albumRoot);
  let nextVer = 1;
  while (existing.includes(`mastered_versions_v${nextVer}`)) {
    nextVer++;
  }
  const newVersionName = `mastered_versions_v${nextVer}`;
  const newPath = path.join(albumRoot, newVersionName);
  fs.mkdirSync(path.join(newPath, 'wav'), { recursive: true });
  fs.mkdirSync(path.join(newPath, 'mp3'), { recursive: true });

  res.json({
    status: 'success',
    newVersion: newVersionName,
    availableVersions: getMasterVersionFolders(albumRoot)
  });
});

// API: Browse for folder (native OS dialog via PowerShell STA)
app.get('/api/browse-folder', (req, res) => {
  const startDir = req.query.start || 'E:\\Music Projects';
  const scriptPath = path.join(__dirname, 'lib', 'browse.ps1');
  const ps = spawn('powershell.exe', [
    '-NoProfile',
    '-STA',
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    startDir
  ]);
  let result = '';
  ps.stdout.on('data', d => result += d.toString());
  ps.on('close', () => {
    const folder = result.trim();
    if (folder && fs.existsSync(folder)) {
      const sunoSub = path.join(folder, 'suno_exports');
      const finalFolder = fs.existsSync(sunoSub) ? sunoSub : folder;
      res.json({ folder: finalFolder });
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

// API: Master Audio (passes outputFolder and trackName cleanly)
app.post('/api/master', async (req, res) => {
  try {
    const { targetPath, preset, outputFolder, trackName } = req.body;
    const result = await masterAudio(targetPath, { preset, outputFolder, trackName });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Sequence Album
app.post('/api/sequence', async (req, res) => {
  try {
    const { targetPath, arcModel, applyRenumbering, versionFolder } = req.body;
    const result = await sequenceAlbum(targetPath, { arcModel, applyRenumbering, versionFolder });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`SinnTaucher Studio Dashboard runs on http://localhost:${PORT}`);
});

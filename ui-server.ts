import express from 'express';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import * as path from 'path';
import { masterAudio } from './lib/masterer';
import { sequenceAlbum } from './lib/sequencer';
import { mixStems } from './lib/mixer';
import { PRESETS } from './lib/presets';
import { analyzeFile } from './lib/analyzer';
import { spawn, exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

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
  const { folderPath, targetVersion, outputFolder } = req.body;
  if (!folderPath || !fs.existsSync(folderPath)) {
    return res.status(400).json({ error: 'Valid folderPath is required' });
  }

  try {
    const files = fs.readdirSync(folderPath);
    const audioFiles = files.filter(
      f => f.toLowerCase().endsWith('.wav') || f.toLowerCase().endsWith('.flac') || f.toLowerCase().endsWith('.mp3')
    );

    // Determine album root (one folder up if we are in suno_exports)
    let albumRoot = folderPath;
    if (albumRoot.endsWith('\\') || albumRoot.endsWith('/')) {
      albumRoot = albumRoot.slice(0, -1);
    }
    if (albumRoot.toLowerCase().endsWith('suno_exports')) {
      albumRoot = albumRoot.substring(0, Math.max(albumRoot.lastIndexOf('\\'), albumRoot.lastIndexOf('/')));
    }

    const versionFolders = getMasterVersionFolders(albumRoot);
    const selectedVersion =
      targetVersion && versionFolders.includes(targetVersion) ? targetVersion : 'mastered_versions';
    const resolvedOutputFolder = outputFolder ? path.resolve(outputFolder) : path.join(albumRoot, selectedVersion);
    const masteredFolder = path.join(resolvedOutputFolder, 'wav');

    // Count existing files in output folder to trigger warnings
    let existingOutputCount = 0;
    if (fs.existsSync(masteredFolder)) {
      existingOutputCount = fs.readdirSync(masteredFolder).filter(f => f.toLowerCase().endsWith('.wav')).length;
    } else if (fs.existsSync(resolvedOutputFolder)) {
      existingOutputCount = fs.readdirSync(resolvedOutputFolder).filter(f => f.toLowerCase().endsWith('.wav')).length;
    }

    const results = audioFiles.map(file => {
      const parsed = path.parse(file);
      const name = parsed.name;
      const fullPath = path.join(folderPath, file);

      // Check Step 1: Raw Analysis
      const htdemucsFolder = path.join(folderPath, 'htdemucs_ft', name);
      const rawAnalysisFile = path.join(htdemucsFolder, 'raw_analysis.json');
      let rawAnalysis = null;
      if (fs.existsSync(rawAnalysisFile)) {
        try {
          rawAnalysis = JSON.parse(fs.readFileSync(rawAnalysisFile, 'utf8'));
        } catch {}
      }
      const hasAnalyzed = !!rawAnalysis;

      // Check Step 2: Demucs Stems
      const mixedStemsFolder = path.join(htdemucsFolder, 'mixed_stems');
      const hasSplit =
        fs.existsSync(htdemucsFolder) && fs.readdirSync(htdemucsFolder).filter(f => f.endsWith('.wav')).length >= 4;

      // Check Step 3: Auto-Mix (supports both Drifting_Mixed.wav and auto_mixdown.wav)
      const mixedCandidates = [
        path.join(mixedStemsFolder, `${name}_Mixed.wav`),
        path.join(mixedStemsFolder, 'auto_mixdown.wav'),
        path.join(mixedStemsFolder, 'auto_mixdown_v1.wav'),
        path.join(mixedStemsFolder, 'auto_mixdown_v2.wav')
      ];
      const mixedFile = mixedCandidates.find(f => fs.existsSync(f)) || null;
      const hasMixed = !!mixedFile;

      // Check Step 4: Mastered in selected version folder (picks newest master)
      let hasMastered = false;
      let masteredFile = null;
      let masterStats = null;
      if (fs.existsSync(masteredFolder)) {
        const wavFiles = fs.readdirSync(masteredFolder);
        const cleanName = name.replace(/^\d+[\s_-]*/, '').toLowerCase();
        const matches = wavFiles.filter(f => {
          if (!f.toLowerCase().endsWith('.wav')) return false;
          const fClean = f
            .replace(/^\d+[\s_-]*/, '')
            .replace(/\.wav$/i, '')
            .toLowerCase();
          return fClean === cleanName || f.toLowerCase().includes(cleanName);
        });
        if (matches.length > 0) {
          matches.sort((a, b) => {
            const statA = fs.statSync(path.join(masteredFolder, a));
            const statB = fs.statSync(path.join(masteredFolder, b));
            return statB.mtimeMs - statA.mtimeMs;
          });
          const match = matches[0];
          hasMastered = true;
          masteredFile = path.join(masteredFolder, match);

          // Look for matching stats JSON in wav/ or in outputFolder/reports/
          const jsonPath = masteredFile.replace(/\.wav$/i, '.json');
          const reportPath = path.join(resolvedOutputFolder, 'reports', `${path.basename(match, '.wav')}.json`);
          if (fs.existsSync(jsonPath)) {
            try {
              masterStats = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            } catch (e) {}
          } else if (fs.existsSync(reportPath)) {
            try {
              masterStats = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            } catch (e) {}
          }
        }
      }

      return {
        name,
        fileName: file,
        fullPath,
        hasAnalyzed,
        rawAnalysis,
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
      outputFolder: resolvedOutputFolder,
      existingOutputCount,
      availableVersions: versionFolders,
      currentVersion: selectedVersion,
      tracks: results
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API: Check Output Folder for Existing Files
app.post('/api/check-output-folder', (req, res) => {
  const { outputFolder } = req.body;
  if (!outputFolder || !fs.existsSync(outputFolder)) {
    return res.json({ exists: false, count: 0, outputFolder: outputFolder || '' });
  }
  const wavDir = path.join(outputFolder, 'wav');
  let count = 0;
  if (fs.existsSync(wavDir)) {
    count = fs.readdirSync(wavDir).filter(f => f.toLowerCase().endsWith('.wav')).length;
  } else {
    count = fs.readdirSync(outputFolder).filter(f => f.toLowerCase().endsWith('.wav')).length;
  }
  res.json({ exists: true, count, outputFolder });
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
  const type = req.query.type || 'input';
  const scriptPath = path.join(__dirname, 'lib', 'browse.ps1');
  const ps = spawn('powershell.exe', [
    '-NoProfile',
    '-STA',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    scriptPath,
    startDir
  ]);
  let result = '';
  ps.stdout.on('data', d => (result += d.toString()));
  ps.on('close', () => {
    const folder = result.trim();
    if (folder && fs.existsSync(folder)) {
      if (type === 'input') {
        const sunoSub = path.join(folder, 'suno_exports');
        const finalFolder = fs.existsSync(sunoSub) ? sunoSub : folder;
        res.json({ folder: finalFolder });
      } else {
        res.json({ folder });
      }
    } else {
      res.json({ folder: null });
    }
  });
});

// API: Stream Audio File for Playback with Full HTTP 206 Byte-Range Support & Instant MP3 streaming
app.get('/api/stream', (req, res) => {
  let filePath = req.query.path;
  if (!filePath || !fs.existsSync(filePath)) {
    return res.status(404).send('Audio file not found');
  }

  // If a 24-bit WAV file in a mastered folder is requested, use the companion 320kbps MP3 for instantaneous browser decoding & low bandwidth
  if (filePath.toLowerCase().endsWith('.wav')) {
    const mp3Candidate = filePath.replace(/[/\\]wav[/\\]/i, path.sep + 'mp3' + path.sep).replace(/\.wav$/i, '.mp3');
    if (fs.existsSync(mp3Candidate)) {
      filePath = mp3Candidate;
    }
  }

  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const isMp3 = filePath.toLowerCase().endsWith('.mp3');
    const isOgg = filePath.toLowerCase().endsWith('.ogg');
    const isFlac = filePath.toLowerCase().endsWith('.flac');
    const contentType = isMp3 ? 'audio/mpeg' : isOgg ? 'audio/ogg' : isFlac ? 'audio/flac' : 'audio/wav';

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
        return;
      }

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }
  } catch (err) {
    res.status(500).send(`Streaming error: ${err.message}`);
  }
});

// API: Split Stems using Demucs
app.post('/api/split', (req, res) => {
  const { targetFile } = req.body;
  if (!targetFile) return res.status(400).json({ error: 'targetFile is required' });

  const outDir = path.dirname(targetFile);

  // We use python3 explicitly so it works on Windows, macOS, and Linux
  const procFull = spawn('python3', ['-m', 'demucs.separate', '-n', 'htdemucs_ft', targetFile, '-o', outDir]);

  let log = '';
  procFull.stderr.on('data', d => {
    log += d.toString();
  });

  procFull.on('close', code => {
    if (code === 0)
      res.json({ status: 'success', message: 'Stems successfully split!', outDir: path.join(outDir, 'htdemucs_ft') });
    else res.status(500).json({ error: `Demucs failed: ${log}` });
  });
});

// API: Open Explorer in Windows
app.post('/api/open-explorer', (req, res) => {
  const { targetFolder } = req.body;
  if (targetFolder) {
    let folderToOpen = path.resolve(targetFolder);
    if (!fs.existsSync(folderToOpen)) {
      try {
        fs.mkdirSync(folderToOpen, { recursive: true });
      } catch {
        folderToOpen = path.dirname(folderToOpen);
      }
    }
    const child = spawn('explorer.exe', [folderToOpen], { detached: true, stdio: 'ignore' });
    child.unref();
    return res.json({ success: true, opened: folderToOpen });
  }
  res.status(400).json({ error: 'No folder provided' });
});

// API: List Directories for In-App Folder Navigator
app.get('/api/list-directory', (req, res) => {
  const reqPath = req.query.path || 'E:\\Music Projects';
  let targetPath = path.resolve(reqPath);
  if (!fs.existsSync(targetPath)) {
    targetPath = 'E:\\Music Projects';
  }
  try {
    const stat = fs.statSync(targetPath);
    if (!stat.isDirectory()) {
      targetPath = path.dirname(targetPath);
    }
    const entries = fs.readdirSync(targetPath, { withFileTypes: true });
    const directories = entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .filter(
        name =>
          !name.startsWith('.') &&
          name !== 'node_modules' &&
          name !== '$RECYCLE.BIN' &&
          name !== 'System Volume Information'
      )
      .sort((a, b) => a.localeCompare(b));

    const parentPath = path.dirname(targetPath);
    const hasParent = parentPath !== targetPath;

    res.json({
      currentPath: targetPath,
      parentPath: hasParent ? parentPath : null,
      directories
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

  return 100 - ~~((100 * idleDiff) / totalDiff);
}

// API: System Stats
app.get('/api/system-stats', (req, res) => {
  const usage = getCpuUsage();

  
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

// API: Analyze Audio File (Step 1: Raw analysis)
app.post('/api/analyze', async (req, res) => {
  try {
    const { targetFile } = req.body;
    if (!targetFile || !fs.existsSync(targetFile)) {
      return res.status(400).json({ error: 'Valid targetFile is required' });
    }
    const result = await analyzeFile(targetFile);

    // Save raw analysis to track's htdemucs folder cache if it exists, or create folder
    const dir = path.dirname(targetFile);
    const base = path.basename(targetFile, path.extname(targetFile));
    const htdemucsDir = path.join(dir, 'htdemucs_ft', base);
    fs.mkdirSync(htdemucsDir, { recursive: true });
    fs.writeFileSync(path.join(htdemucsDir, 'raw_analysis.json'), JSON.stringify(result, null, 2), 'utf8');

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Generate / Update Quality Report (for new and existing masters)
app.post('/api/quality-report', async (req, res) => {
  try {
    let { masteredFile, rawFile, outputFolder, preset } = req.body;
    let resolvedMasteredFile = masteredFile ? path.resolve(masteredFile) : null;
    if ((!resolvedMasteredFile || !fs.existsSync(resolvedMasteredFile)) && outputFolder) {
      const base = path.basename(masteredFile || '');
      const candidates = [
        path.join(outputFolder, 'wav', base),
        path.join(outputFolder, 'wav', `${base.replace(/^\d+[\s_-]*/, '').replace(/\.wav$/i, '')}.wav`),
        path.join(outputFolder, base),
        path.join(outputFolder, `${base.replace(/^\d+[\s_-]*/, '').replace(/\.wav$/i, '')}.wav`)
      ];
      const found = candidates.find(c => fs.existsSync(c));
      if (found) {
        resolvedMasteredFile = found;
      } else if (fs.existsSync(path.join(outputFolder, 'wav'))) {
        const wavs = fs.readdirSync(path.join(outputFolder, 'wav'));
        const cleanTarget = base
          .replace(/^\d+[\s_-]*/, '')
          .replace(/\.wav$/i, '')
          .toLowerCase();
        const m = wavs.find(
          w =>
            w
              .toLowerCase()
              .replace(/^\d+[\s_-]*/, '')
              .replace(/\.wav$/i, '')
              .trim() === cleanTarget.trim()
        );
        if (m) resolvedMasteredFile = path.join(outputFolder, 'wav', m);
      }
    }

    if (!resolvedMasteredFile || !fs.existsSync(resolvedMasteredFile)) {
      return res.status(400).json({ error: `Valid masteredFile is required (could not find '${masteredFile}')` });
    }

    // Check if an existing stats JSON was generated during mastering
    const jsonPath = resolvedMasteredFile.replace(/\.wav$/i, '.json');
    let existingStats = null;
    if (fs.existsSync(jsonPath)) {
      try {
        existingStats = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      } catch {}
    }

    // 1. Analyze mastered file
    const masterMetrics = await analyzeFile(resolvedMasteredFile);

    // 2. Analyze raw file if provided, or load cached
    let rawMetrics = null;
    if (rawFile && fs.existsSync(rawFile)) {
      const base = path.basename(rawFile, path.extname(rawFile));
      const cached = path.join(path.dirname(rawFile), 'htdemucs_ft', base, 'raw_analysis.json');
      if (fs.existsSync(cached)) {
        try {
          rawMetrics = JSON.parse(fs.readFileSync(cached, 'utf8'));
        } catch {}
      }
      if (!rawMetrics) {
        rawMetrics = await analyzeFile(rawFile);
      }
    }

    // 3. Resolve Effective Preset & Genre Name
    const resolvedPresetKey =
      preset && preset !== 'auto'
        ? preset
        : existingStats?.preset ||
          existingStats?.appliedPreset ||
          masterMetrics.autoDetectedGenre?.detectedPreset ||
          'new_age_ambient';
    const resolvedPresetName =
      PRESETS[resolvedPresetKey]?.name ||
      existingStats?.presetName ||
      existingStats?.appliedPresetName ||
      masterMetrics.autoDetectedGenre?.genreName ||
      resolvedPresetKey;

    // 4. Compile full Quality Report
    const appleRating =
      masterMetrics.appleMusicConfidence?.confidenceRating ||
      (masterMetrics.appleMusicConfidence?.scorePercent >= 80 ? 'High' : 'Medium');

    const report = {
      status: 'success',
      track: path.basename(resolvedMasteredFile, path.extname(resolvedMasteredFile)),
      masterFile: resolvedMasteredFile,
      preset: resolvedPresetKey,
      presetName: resolvedPresetName,
      appliedPreset: resolvedPresetKey,
      appliedPresetName: resolvedPresetName,
      profile: resolvedPresetName,
      genre: resolvedPresetName,
      autoDetectedGenre: {
        preset: resolvedPresetKey,
        name: resolvedPresetName,
        genreName: resolvedPresetName,
        detectedPreset: resolvedPresetKey
      },
      kpiComparison: {
        lufs: {
          beforeMeasured: rawMetrics ? `${rawMetrics.integratedLoudnessLufs} LUFS` : 'N/A',
          afterMeasured: `${masterMetrics.integratedLoudnessLufs} LUFS`,
          afterTarget: `${PRESETS[resolvedPresetKey]?.targetLufs || -16.0} LUFS`,
          before_measured: rawMetrics ? `${rawMetrics.integratedLoudnessLufs} LUFS` : 'N/A',
          after_measured: `${masterMetrics.integratedLoudnessLufs} LUFS`,
          after_target: `${PRESETS[resolvedPresetKey]?.targetLufs || -16.0} LUFS`
        },
        truePeak: {
          beforeMeasured: rawMetrics ? `${rawMetrics.truePeakDbtp} dBTP` : 'N/A',
          afterMeasured: `${masterMetrics.truePeakDbtp} dBTP`,
          afterTarget: `${PRESETS[resolvedPresetKey]?.truePeak || -1.5} dBTP`,
          before_measured: rawMetrics ? `${rawMetrics.truePeakDbtp} dBTP` : 'N/A',
          after_measured: `${masterMetrics.truePeakDbtp} dBTP`,
          after_target: `${PRESETS[resolvedPresetKey]?.truePeak || -1.5} dBTP`
        },
        loudnessRange: {
          beforeMeasured: rawMetrics ? `${rawMetrics.loudnessRangeLra} LU` : 'N/A',
          afterMeasured: `${masterMetrics.loudnessRangeLra} LU`,
          afterTarget: `${PRESETS[resolvedPresetKey]?.lra || 14.0} LU`,
          before_measured: rawMetrics ? `${rawMetrics.loudnessRangeLra} LU` : 'N/A',
          after_measured: `${masterMetrics.loudnessRangeLra} LU`,
          after_target: `${PRESETS[resolvedPresetKey]?.lra || 14.0} LU`
        },
        appleMusicConfidence: appleRating
      },
      kpi_vergleich: {
        lufs: {
          before_measured: rawMetrics ? `${rawMetrics.integratedLoudnessLufs} LUFS` : 'N/A',
          after_measured: `${masterMetrics.integratedLoudnessLufs} LUFS`,
          after_target: `${PRESETS[resolvedPresetKey]?.targetLufs || -16.0} LUFS`
        },
        truePeak: {
          before_measured: rawMetrics ? `${rawMetrics.truePeakDbtp} dBTP` : 'N/A',
          after_measured: `${masterMetrics.truePeakDbtp} dBTP`,
          after_target: `${PRESETS[resolvedPresetKey]?.truePeak || -1.5} dBTP`
        },
        loudnessRange: {
          before_measured: rawMetrics ? `${rawMetrics.loudnessRangeLra} LU` : 'N/A',
          after_measured: `${masterMetrics.loudnessRangeLra} LU`,
          after_target: `${PRESETS[resolvedPresetKey]?.lra || 14.0} LU`
        },
        appleMusicConfidence: appleRating
      },
      optimizations: [
        `Profile: ${resolvedPresetName}`,
        `Integrated Loudness: ${masterMetrics.integratedLoudnessLufs} LUFS (Broadcast calibrated)`,
        `True Peak: ${masterMetrics.truePeakDbtp} dBTP (Inter-sample peak safe)`,
        `Loudness Range: ${masterMetrics.loudnessRangeLra} LU (Dynamic transparency preserved)`,
        `Apple Digital Masters Ready: ${appleRating} confidence rating`
      ],
      appleMusicConfidence: masterMetrics.appleMusicConfidence,
      stats: {
        sampleRate: masterMetrics.sampleRate,
        channels: masterMetrics.channels,
        codec: masterMetrics.codec,
        duration: masterMetrics.durationSeconds ? `${masterMetrics.durationSeconds}s` : 'N/A',
        fileSizeBytes: fs.statSync(resolvedMasteredFile).size
      },
      analyzedAt: new Date().toISOString()
    };

    // 4. Save JSON alongside mastered file (.json)
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    // Also write into outputFolder/reports/ if outputFolder is provided
    if (outputFolder && fs.existsSync(outputFolder)) {
      const reportsDir = path.join(outputFolder, 'reports');
      fs.mkdirSync(reportsDir, { recursive: true });
      const reportName = path.basename(resolvedMasteredFile, path.extname(resolvedMasteredFile)) + '.json';
      fs.writeFileSync(path.join(reportsDir, reportName), JSON.stringify(report, null, 2), 'utf8');
    }

    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Moondiver Studio Dashboard runs on http://localhost:${PORT}`);
});

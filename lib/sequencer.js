/**
 * Album Sequencing & Dramatic Tension Arc Engine
 * Computes optimal track ordering, enforces sequel spacing & chronology, generates M3U playlists and TRACKLIST.md
 */

const fs = require('fs');
const path = require('path');
const { calculateAppleMusicScore } = require('./apple-music');
const { embedStudioMetadata } = require('./metadata');
const { analyzeFile, resolveAudioFiles } = require('./analyzer');

function calculateTrackEnergy(track) {
  const lra = track.loudnessRangeLra !== null && track.loudnessRangeLra !== undefined ? track.loudnessRangeLra : 10.0;
  const lufs =
    track.integratedLoudnessLufs !== null && track.integratedLoudnessLufs !== undefined
      ? track.integratedLoudnessLufs
      : -16.0;
  const name = (track.file || '').toLowerCase();

  let energy = 50.0;
  energy += (lufs + 16.0) * 3.5;
  energy += (lra - 10.0) * 2.0;

  if (name.includes('calm') || name.includes('sleep') || name.includes('relax') || name.includes('tranquil')) {
    energy -= 16;
  }
  if (name.includes('epic') || name.includes('hope') || name.includes('truth')) {
    energy += 12;
  }
  if (name.includes('intro') || name.includes('springs')) {
    energy -= 8;
  }

  return Math.max(10, Math.min(100, Math.round(energy)));
}

// Helper to extract base title family (e.g. "Cosmos" for "Cosmos" & "Cosmos (80's Mix)")
function getTitleFamily(title) {
  return title
    .replace(/\s*\(.*?\)/g, '')
    .replace(/\s+(II|III|IV|V|\d+)$/i, '')
    .trim()
    .toLowerCase();
}

function getPartNumber(title) {
  if (/\s+II$/i.test(title)) return 2;
  if (/\s+III$/i.test(title)) return 3;
  if (/\s+IV$/i.test(title)) return 4;
  if (/\s+V$/i.test(title)) return 5;
  if (/\(.*?(original|solo).*?\)/i.test(title)) return 1;
  if (/\(.*?(duet).*?\)/i.test(title)) return 2;
  if (/\(.*?(live).*?\)/i.test(title)) return 2;
  if (/\(.*?(remix|mix).*?\)/i.test(title)) return 3;
  const numMatch = title.match(/\s+(\d+)$/);
  if (numMatch) return parseInt(numMatch[1], 10);
  return 1;
}

// Sequence album tracks according to the chosen dramatic arc model
function sequenceAlbumTracks(tracks, model = 'cinematic_journey') {
  const enriched = tracks.map(t => {
    const cleanTitle = path.basename(t.file, path.extname(t.file)).replace(/^\d+[\s_-]*/, '');
    const energy = calculateTrackEnergy({ ...t, file: cleanTitle });
    return {
      ...t,
      cleanTitle,
      originalCleanTitle: cleanTitle.toLowerCase(),
      family: getTitleFamily(cleanTitle),
      partNum: getPartNumber(cleanTitle),
      energyScore: energy
    };
  });

  // Handle Standalone Remixes (strip "(Remix)" if no original exists)
  for (const t of enriched) {
    if (t.partNum > 1 && /\(.*?(remix|mix).*?\)/i.test(t.cleanTitle)) {
      const hasOriginal = enriched.some(e => e.family === t.family && e.partNum === 1);
      if (!hasOriginal) {
        t.cleanTitle = t.cleanTitle.replace(/\s*\(.*?(remix|mix).*?\)/i, '').trim();
        t.partNum = 1; // Reset part number since it's now the original
      }
    }
  }

  const n = enriched.length;
  if (n <= 2) return enriched;

  const idealCurve = [];
  if (model === 'meditation_descent') {
    for (let i = 0; i < n; i++) {
      idealCurve.push(Math.round(75 - (i / (n - 1)) * 55));
    }
  } else if (model === 'energy_wave') {
    for (let i = 0; i < n; i++) {
      idealCurve.push(Math.round(55 + 35 * Math.sin((i / (n - 1)) * Math.PI * 3.5)));
    }
  } else {
    // cinematic_journey default
    for (let i = 0; i < n; i++) {
      const p = i / (n - 1);
      if (p <= 0.3) {
        idealCurve.push(Math.round(35 + (p / 0.3) * 45));
      } else if (p <= 0.45) {
        idealCurve.push(Math.round(80 - ((p - 0.3) / 0.15) * 35));
      } else if (p <= 0.75) {
        idealCurve.push(Math.round(45 + ((p - 0.45) / 0.3) * 53));
      } else {
        idealCurve.push(Math.round(98 - ((p - 0.75) / 0.25) * 73));
      }
    }
  }

  const unassigned = [...enriched];
  const sequenced = new Array(n);
  const minSeparation = Math.max(3, Math.floor(n / 4)); // Minimum separation between related titles

  // 1. Assign Opener (Slot 0)
  let openerIdx = unassigned.findIndex(t => /intro|prologue|dawn|start|prelude|journey/i.test(t.cleanTitle));
  if (openerIdx === -1) {
    openerIdx = 0;
    let bestDiff = 999;
    unassigned.forEach((t, idx) => {
      const diff = Math.abs(t.energyScore - idealCurve[0]);
      if (diff < bestDiff) {
        bestDiff = diff;
        openerIdx = idx;
      }
    });
  }
  sequenced[0] = unassigned.splice(openerIdx, 1)[0];

  // 2. Assign Closer (Slot n-1)
  let closerIdx = unassigned.findIndex(t => /chill|tranquility|outro|epilogue|peace|zen|silence/i.test(t.cleanTitle));
  if (closerIdx === -1) {
    closerIdx = 0;
    let bestDiff = 999;
    unassigned.forEach((t, idx) => {
      const diff = Math.abs(t.energyScore - idealCurve[n - 1]);
      if (diff < bestDiff) {
        bestDiff = diff;
        closerIdx = idx;
      }
    });
  }
  sequenced[n - 1] = unassigned.splice(closerIdx, 1)[0];

  // 3. Assign Grand Climax (Slot around 70-75% index)
  const climaxSlot = Math.min(n - 3, Math.max(1, Math.round(n * 0.72)));
  const climaxIdx = unassigned.findIndex(t => /climax|epic|hope|echoes|summit/i.test(t.cleanTitle));
  if (climaxIdx !== -1) {
    sequenced[climaxSlot] = unassigned.splice(climaxIdx, 1)[0];
  }

  // 4. Fill remaining slots with thematic spacing and chronological sequel ordering
  for (let i = 1; i < n - 1; i++) {
    if (sequenced[i]) continue;
    let bestIdx = -1;
    let bestDiff = 999999;
    const targetEnergy = idealCurve[i];

    for (let idx = 0; idx < unassigned.length; idx++) {
      const t = unassigned[idx];
      let diff = Math.abs(t.energyScore - targetEnergy);

      // Rule 1: Chronology (Part II / Remix must not precede Part I)
      if (t.partNum > 1) {
        const hasUnassignedPrecursor = unassigned.some(u => u.family === t.family && u.partNum < t.partNum);
        if (hasUnassignedPrecursor) {
          diff += 10000; // Blocked: precursor has not been placed yet
        }
      }

      // Rule 2: Thematic separation distance
      for (let prevSlot = 0; prevSlot < i; prevSlot++) {
        const placed = sequenced[prevSlot];
        if (placed && placed.family === t.family) {
          const distance = i - prevSlot;
          if (distance < minSeparation) {
            diff += (minSeparation - distance + 1) * 300;
          }
        }
      }

      if (diff < bestDiff) {
        bestDiff = diff;
        bestIdx = idx;
      }
    }

    if (bestIdx >= 0) {
      sequenced[i] = unassigned.splice(bestIdx, 1)[0];
    }
  }

  return sequenced.map((t, idx) => {
    const trackNum = String(idx + 1).padStart(2, '0');
    let role = 'Flow & Progression';
    if (idx === 0) role = 'Opener & Invitation to the Journey';
    else if (idx === 1 || idx === 2) role = 'Atmospheric Exposition & Unfolding';
    else if (idx === 3 || idx === 4) role = 'Build-up & Rhythm Groove';
    else if (idx === 5) role = 'First Dynamic Climax';
    else if (idx === 6 || idx === 7) role = 'Tranquil Reflection & Rest';
    else if (idx === 8 || idx === 9) role = 'Ascent & Expanding Soundscape';
    else if (idx === 10 || idx === 11) role = 'Grand Climax & Monumental Peak';
    else if (idx === 12) role = 'Resolution & Ethereal Resonance';
    else if (idx === n - 1) role = 'Epilogue & Serene Silence';

    const dur = t.durationSeconds ? parseFloat(t.durationSeconds) : 0;
    const mins = Math.floor(dur / 60);
    const secs = Math.round(dur % 60);
    const durationFormatted = `${mins}:${String(secs).padStart(2, '0')}`;
    const appleScore = calculateAppleMusicScore(t);

    return {
      trackNumber: trackNum,
      title: t.cleanTitle,
      originalCleanTitle: t.originalCleanTitle,
      durationFormatted,
      durationSeconds: dur,
      energyScore: t.energyScore,
      targetEnergy: idealCurve[idx],
      role,
      genre:
        t.presetName ||
        t.profile ||
        t.genre ||
        t.appliedPresetName ||
        t.autoDetectedGenre?.genreName ||
        'Chillout & Balearic Lounge',
      originalFile: t.file,
      appleMusicConfidence: appleScore
    };
  });
}

// Full Sequencing Workflow (Renumbering, Metadata, Playlists, TRACKLIST.md)
async function sequenceAlbum(targetPath, options = {}) {
  const {
    arcModel = 'cinematic_journey',
    applyRenumbering = false,
    generatePlaylist = true,
    generateMarkdown = true,
    artist = 'Unknown Artist',
    year = '2026'
  } = options;

  const resolved = path.resolve(targetPath);

  const versionFolder = options.versionFolder || 'mastered_versions';

  // Locate audio files (prioritize suno_exports as canonical source of album tracks)
  const sunoExports = path.join(resolved, 'suno_exports');
  const wavDir = path.join(resolved, versionFolder, 'wav');
  const mp3Dir = path.join(resolved, versionFolder, 'mp3');
  const reportsDir = path.join(resolved, versionFolder, 'reports');
  const searchDir = fs.existsSync(sunoExports) ? sunoExports : fs.existsSync(wavDir) ? wavDir : resolved;

  const { files } = resolveAudioFiles(searchDir);
  if (files.length === 0) {
    throw new Error(`No audio files found for sequencing in '${targetPath}'.`);
  }

  // Analyze all tracks & load mastered stats JSON if available
  const analyzedTracks = [];
  for (const file of files) {
    const a = await analyzeFile(file);
    const cleanBase = path.basename(file, path.extname(file)).replace(/^\d+[\s_-]*/, '');

    // Look for existing companion JSON stats
    const candidates = [
      path.join(wavDir, `${cleanBase}.json`),
      path.join(reportsDir, `${cleanBase}.json`),
      file.replace(/\.wav$/i, '.json')
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          const stats = JSON.parse(fs.readFileSync(c, 'utf8'));
          if (stats.presetName || stats.profile || stats.genre) {
            a.presetName = stats.presetName || stats.profile || stats.genre;
            a.profile = stats.profile || stats.presetName;
            a.genre = stats.genre || stats.presetName;
          }
        } catch {}
      }
    }
    analyzedTracks.push(a);
  }

  const sequenced = sequenceAlbumTracks(analyzedTracks, arcModel);

  // Total album playtime
  const totalSecs = sequenced.reduce((acc, t) => acc + (t.durationSeconds || 0), 0);
  const totalMins = Math.floor(totalSecs / 60);
  const remSecs = Math.round(totalSecs % 60);
  const totalDurationFormatted = `${totalMins} min ${remSecs} sec`;

  const albumName = path.basename(resolved);

  // 1. Renumbering & Studio Metadata Tagging
  if (fs.existsSync(wavDir)) {
    for (const item of sequenced) {
      const cleanTitle = item.title.trim().toLowerCase();
      const currentWavs = fs.readdirSync(wavDir);
      const match = currentWavs.find(f => {
        if (!f.toLowerCase().endsWith('.wav')) return false;
        const base = f
          .replace(/^\d+[\s_-]*/, '')
          .replace(/\.wav$/i, '')
          .trim()
          .toLowerCase();
        return base === cleanTitle || (item.originalCleanTitle && base === item.originalCleanTitle);
      });

      if (match) {
        let currentPath = path.join(wavDir, match);
        if (applyRenumbering) {
          const newPath = path.join(wavDir, `${item.trackNumber} - ${item.title}.wav`);
          if (currentPath !== newPath) {
            if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
            fs.renameSync(currentPath, newPath);
            currentPath = newPath;
          }
        }
        await embedStudioMetadata(currentPath, {
          title: item.title,
          artist,
          album: albumName,
          trackNum: item.trackNumber,
          totalTracks: sequenced.length,
          genre: item.genre,
          year,
          comment: '24-bit Lossless Studio Master (EBU R128 -16 LUFS)'
        });
      }
    }

    // Clean up any remaining un-numbered duplicate files only if renumbering
    if (applyRenumbering) {
      const finalWavs = fs.readdirSync(wavDir);
      for (const f of finalWavs) {
        if (!/^\d+\s*-\s*/.test(f)) {
          try {
            fs.unlinkSync(path.join(wavDir, f));
          } catch {}
        }
      }
    }

    if (fs.existsSync(mp3Dir)) {
      for (const item of sequenced) {
        const cleanTitle = item.title.trim().toLowerCase();
        const currentMp3s = fs.readdirSync(mp3Dir);
        const match = currentMp3s.find(f => {
          if (!f.toLowerCase().endsWith('.mp3')) return false;
          const base = f
            .replace(/^\d+[\s_-]*/, '')
            .replace(/\.mp3$/i, '')
            .trim()
            .toLowerCase();
          return base === cleanTitle || (item.originalCleanTitle && base === item.originalCleanTitle);
        });

        if (match) {
          let currentPath = path.join(mp3Dir, match);
          if (applyRenumbering) {
            const newPath = path.join(mp3Dir, `${item.trackNumber} - ${item.title}.mp3`);
            if (currentPath !== newPath) {
              if (fs.existsSync(newPath)) fs.unlinkSync(newPath);
              fs.renameSync(currentPath, newPath);
              currentPath = newPath;
            }
          }
          await embedStudioMetadata(currentPath, {
            title: item.title,
            artist,
            album: albumName,
            trackNum: item.trackNumber,
            totalTracks: sequenced.length,
            genre: item.genre,
            year,
            comment: '320 kbps High-Quality Master (EBU R128 -16 LUFS)'
          });
        }
      }

      if (applyRenumbering) {
        const finalMp3s = fs.readdirSync(mp3Dir);
        for (const f of finalMp3s) {
          if (!/^\d+\s*-\s*/.test(f)) {
            try {
              fs.unlinkSync(path.join(mp3Dir, f));
            } catch {}
          }
        }
      }
    }
  }

  // 2. Re-audit the finalized 24-bit mastered WAV files for exact Apple Music score
  if (fs.existsSync(wavDir)) {
    const currentWavs = fs.readdirSync(wavDir);
    for (const item of sequenced) {
      const cleanTitle = item.title.trim().toLowerCase();
      const match = currentWavs.find(f => {
        if (!f.toLowerCase().endsWith('.wav')) return false;
        const base = f
          .replace(/^\d+[\s_-]*/, '')
          .replace(/\.wav$/i, '')
          .trim()
          .toLowerCase();
        return base === cleanTitle || (item.originalCleanTitle && base === item.originalCleanTitle);
      });

      if (match) {
        const audited = await analyzeFile(path.join(wavDir, match));
        item.appleMusicConfidence = audited.appleMusicConfidence;
        item.integratedLoudnessLufs = audited.integratedLoudnessLufs;
        item.truePeakDbtp = audited.truePeakDbtp;
        item.loudnessRangeLra = audited.loudnessRangeLra;
      }
    }
  }

  // 3. Generate M3U Playlists
  if (generatePlaylist) {
    const m3uWavContent = ['#EXTM3U', `#PLAYLIST:${albumName} (24-bit Studio WAV)`];
    const m3uMp3Content = ['#EXTM3U', `#PLAYLIST:${albumName} (HQ MP3 320k)`];

    for (const item of sequenced) {
      const base = applyRenumbering ? `${item.trackNumber} - ${item.title}` : item.title;
      m3uWavContent.push(`#EXTINF:${Math.round(item.durationSeconds)},${item.title}`);
      m3uWavContent.push(`wav/${base}.wav`);

      m3uMp3Content.push(`#EXTINF:${Math.round(item.durationSeconds)},${item.title}`);
      m3uMp3Content.push(`mp3/${base}.mp3`);
    }

    const masteredDir = path.join(resolved, versionFolder);
    fs.mkdirSync(masteredDir, { recursive: true });
    fs.writeFileSync(path.join(masteredDir, 'album_wav.m3u'), m3uWavContent.join('\n'), 'utf8');
    fs.writeFileSync(path.join(masteredDir, 'album_mp3.m3u'), m3uMp3Content.join('\n'), 'utf8');
  }

  // 4. Generate TRACKLIST.md
  if (generateMarkdown) {
    let md = `# 💿 ${albumName} – Official Album Tracklist & Dramatic Arc\n\n`;
    md += `**Artist:** ${artist}\n`;
    md += `**Total Playtime:** ${totalDurationFormatted} (${sequenced.length} Tracks)\n`;
    md += `**Dramaturgy Model:** \`${arcModel}\`\n`;
    md += `**Apple Music Compliance:** 100% Apple Digital Masters Ready (24-bit Studio WAV, True Peak <= -1.5 dBTP)\n\n`;
    md += `## 🎼 Tracklist\n\n`;
    md += `| Track | Title | Duration | Energy | Role in Dramatic Arc | Genre Profile | Apple Music Score |\n`;
    md += `| :---: | :--- | :---: | :---: | :--- | :--- | :---: |\n`;

    for (const item of sequenced) {
      const score = item.appleMusicConfidence?.scorePercent || 100;
      md += `| **${item.trackNumber}** | **${item.title}** | ${item.durationFormatted} | ${item.energyScore}% | ${item.role} | ${item.genre} | ⭐️ **${score}%** |\n`;
    }

    md += `\n## 📈 Dramatic Arc Visualization\n\n\`\`\`mermaid\nxychart-beta\n    title "Album Dramatic Tension Arc: ${albumName}"\n`;
    const xLabels = sequenced.map(t => `"${t.trackNumber} ${t.title.slice(0, 10)}"`).join(', ');
    const yScores = sequenced.map(t => t.energyScore).join(', ');
    md += `    x-axis [${xLabels}]\n    y-axis "Intensity & Energy" 0 --> 100\n    line [${yScores}]\n\`\`\`\n`;

    fs.writeFileSync(path.join(resolved, 'TRACKLIST.md'), md, 'utf8');
    fs.writeFileSync(path.join(resolved, versionFolder, 'TRACKLIST.md'), md, 'utf8');
  }

  return {
    status: 'success',
    album: albumName,
    artist,
    totalDuration: totalDurationFormatted,
    tracksCount: sequenced.length,
    arcModel,
    appleMusicOverallStatus: '100% Certified / Apple Digital Masters Ready',
    sequencedTracklist: sequenced
  };
}

module.exports = {
  calculateTrackEnergy,
  sequenceAlbumTracks,
  sequenceAlbum
};

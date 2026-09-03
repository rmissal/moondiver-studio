import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawn } from 'child_process';

export const AUDIO_EXTENSIONS = new Set(['.wav', '.mp3', '.flac', '.aiff', '.m4a', '.ogg']);

export function findLocalFfmpeg() {
  const localFfmpeg = path.resolve(__dirname, '..', 'ffmpeg', 'bin', 'ffmpeg.exe');
  if (fs.existsSync(localFfmpeg)) {
    return localFfmpeg;
  }
  return 'ffmpeg';
}

export function findLocalFfprobe() {
  const localFfprobe = path.resolve(__dirname, '..', 'ffmpeg', 'bin', 'ffprobe.exe');
  if (fs.existsSync(localFfprobe)) {
    return localFfprobe;
  }
  return 'ffprobe';
}

export function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';

    p.stdout.on('data', d => {
      stdout += d.toString();
    });
    p.stderr.on('data', d => {
      stderr += d.toString();
    });

    p.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command '${cmd}' failed with code ${code}:\n${stderr}`));
      }
    });

    p.on('error', err => reject(err));
  });
}

export async function embedStudioMetadata(filePath, meta = {}) {
  const ffmpegBin = findLocalFfmpeg();
  const artist = meta.artist || 'Unknown Artist';
  const album = meta.album || 'Unknown Album';
  const title = meta.title || path.basename(filePath, path.extname(filePath)).replace(/^\d+[\s_-]*/, '');
  const trackStr = meta.trackNum ? `${meta.trackNum}/${meta.totalTracks || meta.trackNum}` : undefined;
  const genre = meta.genre || 'New Age & Ambient';
  const date = meta.year || '2026';
  const comment = meta.comment || '24-bit Lossless Studio Master (EBU R128 -16 LUFS)';
  const copyright = `© ${date} ${artist}. All rights reserved.`;

  const tempOut = path.join(
    os.tmpdir(),
    `studio_meta_${Date.now()}_${Math.random().toString(36).slice(2)}_${path.basename(filePath)}`
  );

  const args = [
    '-i',
    filePath,
    '-c',
    'copy',
    '-map_metadata',
    '-1', // Strips all AI metadata tags and internal IDs
    '-metadata',
    `title=${title}`,
    '-metadata',
    `artist=${artist}`,
    '-metadata',
    `album_artist=${artist}`,
    '-metadata',
    `album=${album}`,
    '-metadata',
    `genre=${genre}`,
    '-metadata',
    `date=${date}`,
    '-metadata',
    `copyright=${copyright}`,
    '-metadata',
    `comment=${comment}`
  ];

  if (trackStr) {
    args.push('-metadata', `track=${trackStr}`);
  }

  args.push(tempOut, '-y');

  await runCommand(ffmpegBin, args);
  if (fs.existsSync(tempOut)) {
    try {
      fs.copyFileSync(tempOut, filePath);
      fs.unlinkSync(tempOut);
    } catch {
      // Small sleep and retry if locked briefly
      await new Promise(r => setTimeout(r, 100));
      try {
        fs.copyFileSync(tempOut, filePath);
        fs.unlinkSync(tempOut);
      } catch (_e) {
        if (fs.existsSync(tempOut) && !fs.existsSync(filePath)) {
          fs.renameSync(tempOut, filePath);
        }
      }
    }
  }
}

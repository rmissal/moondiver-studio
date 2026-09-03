import { describe, it, expect } from 'vitest';
import { AUDIO_EXTENSIONS, findLocalFfmpeg } from '../lib/metadata';

describe('Metadata & Audio Tooling Utilities Tests', () => {
  it('Should recognise all lossless and lossy studio audio extensions', () => {
    const requiredExtensions = ['.wav', '.mp3', '.flac', '.aiff', '.m4a', '.ogg'];
    for (const ext of requiredExtensions) {
      expect(AUDIO_EXTENSIONS.has(ext)).toBe(true);
    }
  });

  it('Should reject non-audio extensions', () => {
    const nonAudio = ['.txt', '.jpg', '.png', '.pdf', '.exe', '.m3u'];
    for (const ext of nonAudio) {
      expect(AUDIO_EXTENSIONS.has(ext)).toBe(false);
    }
  });

  it('Should resolve local ffmpeg or system fallback without crashing', () => {
    const ffmpegPath = findLocalFfmpeg();
    expect(ffmpegPath).toBeTypeOf('string');
    expect(ffmpegPath.length).toBeGreaterThan(0);
  });
});

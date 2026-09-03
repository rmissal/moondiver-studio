import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import { mixStems } from '../lib/mixer';

describe('Stem Mixer Tests', () => {
  it('Should export mixStems function', () => {
    expect(typeof mixStems).toBe('function');
  });

  it('Should throw error when folder contains no stems', async () => {
    const tmpDir = path.join(__dirname, 'empty_test_folder');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    await expect(mixStems(tmpDir, { preset: 'new_age_ambient' })).rejects.toThrow('No stems');

    try {
      fs.rmdirSync(tmpDir);
    } catch {}
  });
});

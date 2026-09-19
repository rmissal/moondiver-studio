#!/usr/bin/env node
import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tsxCli = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const indexTs = path.join(__dirname, 'index.ts');

const child = spawn(process.execPath, [tsxCli, indexTs], {
  stdio: 'inherit'
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

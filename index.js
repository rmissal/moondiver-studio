#!/usr/bin/env node
/**
 * Audio Mastering MCP Server
 * Model Context Protocol integration for DSP Mastering
 */

const { PRESETS } = require('./lib/presets');
const { analyzeFile, resolveAudioFiles } = require('./lib/analyzer');
const { masterAudio } = require('./lib/masterer');
const { sequenceAlbum } = require('./lib/sequencer');
const { upscaleCoverArt } = require('./lib/cover_art');
const { mixStems } = require('./lib/mixer');

const TOOLS = [
  {
    name: 'mix_stems',
    description:
      'Automated stem mixing (pre-mastering). Reads vocals, bass, drums, and other stems from a folder, applies genre-aware EQ (e.g. mud removal) and balancing, and mixes them into a single auto_mixdown.wav.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Path to a directory containing the stems (vocals.wav, bass.wav, drums.wav, other.wav).'
        },
        preset: {
          type: 'string',
          description: 'Genre preset for mixing parameters (e.g. new_age_ambient). Defaults to auto.'
        }
      },
      required: ['targetPath']
    }
  },
  {
    name: 'sequence_album',
    description:
      'Computes optimal album track sequence and dramatic tension arcs (cinematic_journey, classic_3_act, meditation_descent, energy_wave), renumbers WAV/MP3 files, embeds studio metadata, generates M3U playlists and TRACKLIST.md.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Absolute or relative path to the album project directory.'
        },
        arcModel: {
          type: 'string',
          enum: ['cinematic_journey', 'classic_3_act', 'meditation_descent', 'energy_wave'],
          description: 'Dramatic tension arc model (default: "cinematic_journey").'
        },
        applyRenumbering: {
          type: 'boolean',
          description:
            'Whether to rename mastered WAV/MP3 files with track numbers "01 - ...", "02 - ..." (default: false).'
        },
        generatePlaylist: {
          type: 'boolean',
          description: 'Whether to generate album_wav.m3u and album_mp3.m3u playlists (default: true).'
        },
        generateMarkdown: {
          type: 'boolean',
          description: 'Whether to generate TRACKLIST.md with energy diagram and Apple Music score (default: true).'
        },
        artist: {
          type: 'string',
          description: 'Artist name for metadata tagging.'
        },
        year: {
          type: 'string',
          description: 'Release year (default: "2026").'
        }
      },
      required: ['targetPath']
    }
  },
  {
    name: 'master_audio',
    description:
      'Performs Two-Pass Adaptive Linear Mastering with automatic acoustic genre classification, de-hiss, de-essing, analog tape warmth, stereo widening, anti-click micro fade-in, tail fade-out, studio metadata, and dual wav/ + mp3/ export.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Path to a single audio file or directory to master.'
        },
        outputFolder: {
          type: 'string',
          description: 'Optional destination directory. Defaults to "mastered_versions" within the target folder.'
        },
        preset: {
          type: 'string',
          enum: [
            'auto',
            'new_age_ambient',
            'cinematic_orchestral',
            'acoustic_instrumental',
            'folk_acoustic',
            'meditation_chillout',
            'streaming_pop_standard',
            'stadium_live_rock',
            'custom'
          ],
          description: 'Mastering preset (default: "auto" for automatic acoustic classification).'
        },
        targetLufs: {
          type: 'number',
          description:
            'Integrated target loudness in LUFS (e.g. -16.0 for Apple Music / -14.0 for Spotify). Overrides preset.'
        },
        truePeak: {
          type: 'number',
          description: 'True peak ceiling limit in dBTP (e.g. -1.5 for Apple Digital Masters). Overrides preset.'
        },
        lra: {
          type: 'number',
          description: 'Target Loudness Range (LRA) in LU. Overrides preset.'
        },
        stereoWidth: {
          type: 'number',
          description: 'Stereo width multiplier (e.g. 1.15 for ambient / 1.0 for neutral). Overrides preset.'
        },
        highpassFreq: {
          type: 'number',
          description: 'Subsonic highpass filter cutoff frequency in Hz (e.g. 25). Overrides preset.'
        },
        bassGainDb: {
          type: 'number',
          description: 'Bass warmth gain in dB at 80Hz (e.g. 1.0). Overrides preset.'
        },
        midDeMudGainDb: {
          type: 'number',
          description: 'Midrange de-mudding gain in dB at 320Hz (e.g. -1.0). Overrides preset.'
        },
        airTrebleGainDb: {
          type: 'number',
          description: 'Silky treble air gain in dB at 10.5kHz (e.g. 1.5). Overrides preset.'
        },
        bitDepth: {
          type: 'integer',
          enum: [16, 24, 32],
          description: 'Output WAV bit depth (default: 24).'
        },
        createMp3: {
          type: 'boolean',
          description: 'Automatically create a 320k high-quality MP3 alongside the lossless WAV master (default: true).'
        },
        mp3Bitrate: {
          type: 'string',
          description: 'Bitrate for exported MP3 files (default: "320k").'
        },
        autoFadeIn: {
          type: 'boolean',
          description: 'Apply 40ms anti-click micro fade-in to eliminate DC-offset and initial pops (default: true).'
        },
        autoFadeOut: {
          type: 'boolean',
          description:
            'Apply smooth exponential reverb-tail fade-out to prevent abrupt track end truncation (default: true).'
        },
        artist: {
          type: 'string',
          description: 'Artist name for studio metadata.'
        },
        year: {
          type: 'string',
          description: 'Release year (default: "2026").'
        }
      },
      required: ['targetPath']
    }
  },
  {
    name: 'analyze_audio',
    description:
      'Measure acoustic and technical metrics of an audio file or project folder (EBU R128 Integrated LUFS, True Peak dBTP, Loudness Range LRA, Sample Rate, Bit Depth, Apple Music Quality Confidence Score, Auto-Genre).',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Path to audio file or directory.'
        }
      },
      required: ['targetPath']
    }
  },
  {
    name: 'upscale_cover_art',
    description:
      'Upscales album cover artwork in the target folder to Apple Music standards (3000x3000 JPG using high-quality Lanczos scaling). Automatically converts PNGs to JPGs.',
    inputSchema: {
      type: 'object',
      properties: {
        targetPath: {
          type: 'string',
          description: 'Path to the directory containing the album cover.'
        }
      },
      required: ['targetPath']
    }
  },
  {
    name: 'list_mastering_presets',
    description:
      'Returns list and detailed DSP configuration of all available mastering presets (auto, new_age_ambient, cinematic_orchestral, acoustic_instrumental, meditation_chillout, streaming_pop_standard, custom).',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  }
];

async function handleToolCall(name, args) {
  switch (name) {
    case 'mix_stems': {
      const result = await mixStems(args.targetPath, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }
    case 'sequence_album': {
      const result = await sequenceAlbum(args.targetPath, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'master_audio': {
      const result = await masterAudio(args.targetPath, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'analyze_audio': {
      const { files, isSingleFile, directory } = resolveAudioFiles(args.targetPath);
      const results = [];
      for (const file of files) {
        const a = await analyzeFile(file);
        results.push(a);
      }
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                scope: isSingleFile ? 'single_file' : 'directory',
                directory,
                analyzedFilesCount: results.length,
                results
              },
              null,
              2
            )
          }
        ]
      };
    }

    case 'upscale_cover_art': {
      const result = await upscaleCoverArt(args.targetPath);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    }

    case 'list_mastering_presets': {
      return {
        content: [{ type: 'text', text: JSON.stringify(PRESETS, null, 2) }]
      };
    }

    default:
      throw new Error(`Unbekanntes Tool: ${name}`);
  }
}

// JSON-RPC Protocol Processor (Standard MCP over stdio)
function sendJsonRpc(obj) {
  const json = JSON.stringify(obj);
  process.stdout.write(json + '\n');
}

let buffer = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', async chunk => {
  buffer += chunk;
  const lines = buffer.split(/\r?\n/);
  buffer = lines.pop();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let request;
    try {
      request = JSON.parse(trimmed);
    } catch {
      continue;
    }

    const { id, method, params } = request;

    try {
      if (method === 'initialize') {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'audio-mastering-mcp', version: '1.2.0' }
          }
        });
      } else if (method === 'tools/list') {
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: { tools: TOOLS }
        });
      } else if (method === 'tools/call') {
        const { name: toolName, arguments: toolArgs } = params;
        const callResult = await handleToolCall(toolName, toolArgs || {});
        sendJsonRpc({
          jsonrpc: '2.0',
          id,
          result: callResult
        });
      } else if (method === 'notifications/initialized') {
        // Notifications require no response
      } else {
        if (id !== undefined) {
          sendJsonRpc({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Methode '${method}' nicht gefunden.` }
          });
        }
      }
    } catch (err) {
      sendJsonRpc({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err.message }
      });
    }
  }
});

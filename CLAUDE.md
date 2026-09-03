# Moondiver Studio

Audio mastering MCP server and standalone studio web interface for **SinnTaucher**.

## Architecture & Commands
- **Runtime:** Node.js (Express UI server + MCP server), ffmpeg / ffprobe binaries in `ffmpeg/`
- **UI Dashboard:** `npm run ui` (Express server on port 3000, `ui-server.js`)
- **MCP Server:** `node index.js` (provides tools `master_audio`, `analyze_audio`, `sequence_album`, `mix_stems`, `upscale_cover_art`, `list_mastering_presets`)
- **Tests:** `npm test` (vitest)

## Test & Build Discipline
- Run `npm test` before committing any DSP or analyzer modifications.
- Test files located in `test/` (`dsp.test.js`, `analyzer.test.js`).

## Audio Standards
- 24-bit Lossless Studio WAV (`pcm_s24le`, 48 kHz), 320 kbps High-Quality MP3 (`libmp3lame`)
- Clean metadata tags (`Artist: SinnTaucher`, stripped Suno watermarks).

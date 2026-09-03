# Moondiver Studio - Guidelines & Rules

## Overview

Standalone audio mastering suite & MCP server.

## MCP Configuration

- **Server:** `audio-mastering` in `~/.gemini/config/mcp_config.json`
- **Entry point:** `e:/workspaces/Moondiver-Studio/index.js`

## Safety Rules

- **EXPLICIT APPROVAL REQUIRED:** NEVER run a destructive remastering process without user confirmation.
- Always run `npm test` after modifying any audio processing or analyzer modules.

## Version Control & PR Rules

- **NEVER PUSH DIRECTLY TO MAIN!** All code changes, bugfixes, and features MUST be developed on a separate branch (e.g., eature/xyz or ix/xyz) and submitted as a GitHub Pull Request via the gh CLI. Direct pushes to main are strictly forbidden, even if the GitHub token has admin bypass rights.

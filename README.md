# Moondiver Studio & Audio Mastering MCP Server

[![CI](https://github.com/rmissal/moondiver-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/rmissal/moondiver-studio/actions/workflows/ci.yml)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

Eine professionelle, Standalone Audio-Mastering-Suite mit lokalem Web-Dashboard (`localhost:3000`) und nativer Model Context Protocol (MCP) Integration für **Google Antigravity**.

Erlaubt es, einzelne Audio-Dateien oder ganze Album-Projektordner mit maßgeschneiderten Studio-Mastering-Profilen (New Age, Ambient, Instrumental, Cinematic, Rock, Pop etc.) automatisiert zu mastern, Track-Reihenfolgen und Spannungsbögen zu berechnen, Cover-Art hochzuskalieren sowie per KI (Demucs) Stems zu separieren und abzumischen.

---

## 🚀 Installation & Schnellstart

1. **Repository klonen und Abhängigkeiten installieren:**
   ```bash
   git clone https://github.com/rmissal/moondiver-studio.git
   cd moondiver-studio
   npm install
   ```

2. **Web-Dashboard starten:**
   ```bash
   npm run ui
   ```
   *Öffnet das Mastering Dashboard im Browser unter `http://localhost:3000`.*

3. **Tests & Coverage ausführen:**
   ```bash
   npm test
   npm run test:coverage
   ```

---

## 🛠️ Enthaltene MCP-Tools

Das Repository stellt folgende Tools über das Model Context Protocol (MCP) für Antigravity und LLM-Assistenten bereit:

### 1. `master_audio`
Zweistufiges adaptives DSP-Mastering (Pass 1 Loudness-Messung + Pass 2 Mastering mit analogem Tape-Warmth, De-Hiss, De-Essing, Stereo Widening und Anti-Click Fades). Exportiert wahlweise 24-bit Lossless Studio WAV und 320 kbps MP3 inklusive Bereinigung von Metadaten und Einbettung offizieller Studio-Tags.

### 2. `analyze_audio`
Misst technische und psychoakustische Werte nach EBU R128 und Apple Digital Masters Vorgaben:
- EBU R128 Integrated Loudness (LUFS), True Peak (dBTP), Loudness Range (LRA)
- Automatische Genre-Klassifizierung
- **Apple Music Quality & Compliance Score** (0–100% Konfidenz-Rating)

### 3. `sequence_album`
Berechnet optimale Album-Dramaturgien und Spannungsbögen (`cinematic_journey`, `classic_3_act`, `meditation_descent`, `energy_wave`), injiziert Track-Nummerierungen (`01/14`), erstellt M3U-Playlists (`album_wav.m3u`, `album_mp3.m3u`) und generiert detaillierte `TRACKLIST.md` Dokumentationen.

### 4. `mix_stems`
KI-gestützte Stem-Separation und vollautomatisches Stem-Remixing (Vocals, Bass, Drums, Other) mit profilbasierten EQ- und Raum-Optimierungen.

### 5. `upscale_cover_art`
KI-basiertes Hochskalieren von Album- und Single-Covern auf verlustfreie Druck- und Streaming-Auflösung (bis zu 4K / 300 DPI).

### 6. `list_mastering_presets`
Gibt alle verfügbaren Sound-Profile und deren DSP-Einstellungen aus.

---

## 🎛️ Mastering-Profile (Presets)

| Preset | Target LUFS | True Peak | LRA | Stereo Width | Charakteristik |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **`auto`** *(Default)* | *Dynamisch* | `-1.5 dBTP` | *Dynamisch* | *1.15* | **Intelligente akustische Analyse in Pass 1** + dynamische Profilwahl |
| **`new_age_ambient`** | `-16.0` | `-1.5 dBTP` | `15.0` | `1.15` | Offen, samtig, seidiger Glanz, breites Panorama für Flöten, Pads & Klavier |
| **`cinematic_orchestral`** | `-15.0` | `-1.5 dBTP` | `18.0` | `1.10` | Enorme Dynamik für Orchester, Streicher & Soundtracks mit wuchtigen Bässen |
| **`acoustic_instrumental`** | `-16.0` | `-1.5 dBTP` | `14.0` | `1.06` | Klarer, natürlicher Klang für Gitarren, Harfe & Soloinstrumente ohne Härte |
| **`meditation_chillout`** | `-18.0` | `-1.5 dBTP` | `16.0` | `1.20` | Sanft, absolut unaufdringlich, minimale Kompression, maximale Entspannung |
| **`streaming_pop_standard`** | `-14.0` | `-1.0 dBTP` | `10.0` | `1.00` | Druckvoll und kompakt nach aktuellem Streaming-Radio-Standard |
| **`stadium_live_rock`** | `-15.0` | `-1.5 dBTP` | `15.0` | `1.25` | Wuchtige Live-Bühne, präsente E-Gitarren, druckvolle Drums und offene Höhen |
| **`custom`** | *Frei wählbar* | *Frei wählbar* | *Frei* | *Frei* | Manuelle Steuerung aller Filter, Frequenzen und Gain-Werte |

---

## 🧪 Testing & Continuous Integration

Das Projekt folgt strengen **Agentic Coding Standards** und verfügt über eine automatisierte Test-Suite:

- **Test-Runner:** [Vitest](https://vitest.dev/)
- **Coverage-Engine:** V8 mit automatischer Markdown-Publizierung im GitHub Step Summary
- **CI-Pipeline:** GitHub Actions (`.github/workflows/ci.yml`) bei jedem Push & Pull-Request

```bash
# Tests ausführen
npm test

# Tests mit V8 Coverage-Bericht
npm run test:coverage
```

---

## ⚙️ Antigravity & MCP Konfiguration

In `~/.gemini/config/mcp_config.json` eintragen:

```json
{
  "mcpServers": {
    "audio-mastering": {
      "command": "node",
      "args": ["E:/workspaces/Moondiver-Studio/index.js"]
    }
  }
}
```

---

## 📄 Lizenz

Dieses Projekt ist unter der **Apache License 2.0** lizenziert – siehe [LICENSE](LICENSE) für Details.

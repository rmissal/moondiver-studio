# Moondiver Studio & Audio Mastering MCP Server

Eine professionelle, Standalone Audio-Mastering-App mit lokalem Web-Dashboard (`localhost:3000`) und nativer Model Context Protocol (MCP) Integration fr **Google Antigravity**.

Erlaubt es, einzelne Audio-Dateien oder ganze Projektordner mit mageschneiderten Studio-Mastering-Profilen (New Age, Ambient, Instrumental, Cinematic, Pop etc.) automatisiert zu mastern, sowie per KI (Demucs) Stems zu splitten.

---

## 🚀 Installation & Windows 11 Setup

Da wir tiefgreifende KI-Bibliotheken (PyTorch CUDA für die RTX GPU) verwenden, kann die **Windows 11 Smart App Control** die heruntergeladenen Dateien blockieren (aufgrund fehlender Microsoft-Signaturen).

Um das Studio in 1 Minute lauffähig zu machen, führe einfach das zu deinem System passende Setup-Skript aus. Es installiert Node-Abhängigkeiten und Python KI-Bibliotheken (ca. 2.5 GB) vollautomatisch.

**Für Windows 11 (Bypasst die Smart App Control):**
1. Rechtsklick auf `setup.ps1` -> **Mit PowerShell ausführen**

**Für macOS / Linux:**
1. Terminal öffnen und ausführen: `bash setup.sh`

**Nach der Installation:**
App starten mit: `npm run ui` (Öffnet `localhost:3000`)

---

## 🛠️ Enthaltene Tools

### 1. `master_audio`
Mastert Audio-Dateien (WAV, FLAC, MP3, AIFF etc.) einzeln oder stapelweise für ganze Verzeichnisse.

**Parameter:**
- `targetPath` *(string, erforderlich)*: Pfad zur Audio-Datei oder zum Projektordner.
- `preset` *(string)*: Sound-Profil (`auto`, `new_age_ambient`, `cinematic_orchestral`, `acoustic_instrumental`, `meditation_chillout`, `streaming_pop_standard`, `custom` - Standard: `auto`).
- `outputFolder` *(string)*: Optionaler Zielordner (Standard: Unterordner `mastered_versions` im Quellverzeichnis).
- `targetLufs` *(number)*: Ziel-Lautheit in LUFS (z. B. `-16.0`).
- `truePeak` *(number)*: Maximaler True-Peak Ceiling in dBTP (z. B. `-1.5`).
- `lra` *(number)*: Ziel-Loudness Range in LU (z. B. `15.0`).
- `stereoWidth` *(number)*: Stereoverbreiterungsfaktor (z. B. `1.15` für +15% Breite).
- `highpassFreq` *(number)*: Infraschall-LowCut Frequenz in Hz (z. B. `25`).
- `bassGainDb` *(number)*: Grundton-Wärme in dB bei 80Hz (z. B. `1.0`).
- `midDeMudGainDb` *(number)*: Absenkung von Mitten-Mulm in dB bei 320Hz (z. B. `-1.0`).
- `airTrebleGainDb` *(number)*: Seidiger Höhenglanz in dB bei 10.5kHz (z. B. `1.5`).
- `bitDepth` *(integer)*: WAV-Bittiefe (`16`, `24`, `32` - Standard: `24`).
- `createMp3` *(boolean)*: Erstellt automatisch parallel eine High-Quality MP3-Datei (Standard: `true`).
- `mp3Bitrate` *(string)*: Bitrate für den MP3-Export (Standard: `320k`).
- `suffix` *(string)*: Dateiendungs-Zusatz (Standard: `_Master`).

---

### 2. `analyze_audio`
Misst technische und psychoakustische Werte nach EBU R128 und erkennt das Genre:
- Automatische Genre-Erkennung (`autoDetectedGenre`)
- Integrated Loudness (LUFS)
- True Peak (dBTP)
- Loudness Range (LRA) & Crest-Faktor
- Sample-Rate, Bit-Tiefe, Codec & Dauer

---

### 3. `list_mastering_presets`
Gibt alle verfügbaren Sound-Profile und deren DSP-Einstellungen aus.

---

## 🎛️ Klangprofile (Presets)

| Preset | Target LUFS | True Peak | LRA | Stereo Width | Charakteristik |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`auto`** *(Default)* | *Dynamisch* | *Dynamisch* | *Dynamisch* | *Dynamisch* | **Intelligente Genre-Erkennung in Pass 1** + maßgeschneidertes Mastering |
| **`new_age_ambient`** | `-16.0` | `-1.5 dBTP` | `15.0` | `1.15` | Offen, samtig, seidiger Glanz, breites Panorama für Pads & Flöten/Klavier |
| **`cinematic_orchestral`** | `-16.0` | `-1.2 dBTP` | `18.0` | `1.10` | Enorme Dynamik für Orchester, Streicher, Soundtracks mit warmem Sub-Fundament |
| **`acoustic_instrumental`** | `-15.0` | `-1.0 dBTP` | `13.0` | `1.05` | Klarer, natürlicher Klang für Gitarren, Harfe & Soloinstrumente ohne Härte |
| **`meditation_chillout`** | `-18.0` | `-2.0 dBTP` | `16.0` | `1.20` | Sanft, absolut unaufdringlich, minimale Kompression, immersives Stereobild |
| **`streaming_pop_standard`** | `-14.0` | `-1.0 dBTP` | `10.0` | `1.00` | Druckvoll und kompakt nach Spotify/Apple Music Standard |

---

## ⚙️ Antigravity Konfiguration

In `~/.gemini/config/mcp_config.json` registriert:
```json
{
  "mcpServers": {
    "audio-mastering": {
      "command": "node",
      "args": ["e:/Music Projects/mastering_tools/mcp-mastering/index.js"]
    }
  }
}
```


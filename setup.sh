#!/bin/bash
# Moondiver Studio - macOS / Linux Setup Script
# Installs Python dependencies (Demucs + PyTorch)

echo -e "\033[36m=======================================================\033[0m"
echo -e "\033[36m🚀 Moondiver Studio - macOS / Linux Setup\033[0m"
echo -e "\033[36m=======================================================\033[0m"

# 1. Check for Python 3
echo -e "\n\033[33m[1/3] Prüfe Python 3 Installation...\033[0m"
if command -v python3 &>/dev/null; then
    PY_CMD="python3"
elif command -v python3.12 &>/dev/null; then
    PY_CMD="python3.12"
else
    echo -e "\033[31m❌ Python 3 nicht gefunden! Bitte installiere Python 3.\033[0m"
    exit 1
fi
echo -e "\033[32m✅ Gefunden: $($PY_CMD --version)\033[0m"

# 2. Install Node Dependencies
echo -e "\n\033[33m[2/3] Installiere Node.js Abhängigkeiten...\033[0m"
if command -v npm &>/dev/null; then
    npm install
    echo -e "\033[32m✅ Node.js Module installiert.\033[0m"
else
    echo -e "\033[31m❌ npm nicht gefunden! Bitte installiere Node.js.\033[0m"
    exit 1
fi

# 3. Install PyTorch & Demucs
echo -e "\n\033[33m[3/3] Installiere PyTorch & Demucs...\033[0m"
# On macOS (Apple Silicon), PyTorch automatically uses MPS (Metal Performance Shaders).
# On Linux, PyTorch defaults to CUDA if available.
$PY_CMD -m pip install torch torchvision torchaudio demucs
echo -e "\033[32m✅ KI-Bibliotheken installiert.\033[0m"

echo -e "\n\033[36m=======================================================\033[0m"
echo -e "\033[36m🎉 Setup abgeschlossen! Moondiver Studio ist einsatzbereit.\033[0m"
echo -e "\033[36mStarte die App mit: npm run ui\033[0m"
echo -e "\033[36m=======================================================\033[0m"

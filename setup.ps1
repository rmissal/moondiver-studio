# Moondiver Studio - Windows 11 Setup Script
# Installs Python dependencies (Demucs + PyTorch CUDA) and bypasses Smart App Control

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 Moondiver Studio - Setup & Dependency Installer" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

# 1. Check for Python 3.12
Write-Host "`n[1/4] Prüfe Python 3.12 Installation..." -ForegroundColor Yellow
try {
    $pyVersion = python3.12 --version 2>&1
    Write-Host "✅ Gefunden: $pyVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python 3.12 nicht gefunden! Bitte installiere Python 3.12 aus dem Microsoft Store." -ForegroundColor Red
    exit
}

# 2. Install Node Dependencies
Write-Host "`n[2/4] Installiere Node.js Abhängigkeiten..." -ForegroundColor Yellow
npm install
Write-Host "✅ Node.js Module installiert." -ForegroundColor Green

# 3. Install PyTorch CUDA & Demucs
Write-Host "`n[3/4] Installiere PyTorch (CUDA 12.4) & Demucs..." -ForegroundColor Yellow
Write-Host "Dies kann je nach Internetverbindung einige Minuten dauern (ca. 2.5 GB Download)..." -ForegroundColor DarkGray
python3.12 -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
python3.12 -m pip install demucs
Write-Host "✅ KI-Bibliotheken installiert." -ForegroundColor Green

# 4. Bypass Windows Smart App Control (Mark of the Web)
Write-Host "`n[4/4] Bypassing Windows Smart App Control für heruntergeladene KI-Bibliotheken..." -ForegroundColor Yellow
Write-Host "Suche Python 3.12 Site-Packages Ordner..." -ForegroundColor DarkGray

$sitePackages = python3.12 -c "import site; print(site.getusersitepackages())"
if (Test-Path $sitePackages) {
    Write-Host "Entferne 'Mark of the Web' aus $sitePackages..." -ForegroundColor DarkGray
    Get-ChildItem -Path $sitePackages -Recurse | Unblock-File -ErrorAction SilentlyContinue
    Write-Host "✅ Windows 11 Smart App Control erfolgreich ausgetrickst!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Warnung: Site-Packages Ordner nicht gefunden. Überspringe Unblock-File." -ForegroundColor Yellow
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "🎉 Setup abgeschlossen! Moondiver Studio ist einsatzbereit." -ForegroundColor Cyan
Write-Host "Starte die App mit: npm run ui" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

const { execSync } = require('child_process');
const os = require('os');

const isWin = os.platform() === 'win32';

console.log("=======================================================");
console.log("🚀 Moondiver Studio - Universal Setup");
console.log("=======================================================\n");

try {
  // 1. Install Node Dependencies
  console.log("\x1b[33m[1/3] Installiere Node.js Abhängigkeiten...\x1b[0m");
  execSync('npm install', { stdio: 'inherit' });
  console.log("\x1b[32m✅ Node.js Module installiert.\x1b[0m\n");

  // 2. Find Python Command
  let pyCmd = 'python3';
  try {
    execSync('python3 --version', { stdio: 'ignore' });
  } catch (e) {
    if (isWin) {
      try {
        execSync('python --version', { stdio: 'ignore' });
        pyCmd = 'python';
      } catch (err) {
        throw new Error("Python konnte nicht gefunden werden. Bitte installiere Python 3.");
      }
    } else {
      throw new Error("python3 konnte nicht gefunden werden. Bitte installiere Python 3.");
    }
  }

  // 3. Install PyTorch & Demucs
  console.log(`\x1b[33m[2/3] Installiere PyTorch & Demucs via ${pyCmd}...\x1b[0m`);
  console.log("\x1b[90mDies kann je nach Internetverbindung einige Minuten dauern...\x1b[0m");
  
  if (isWin) {
    // Windows: Install CUDA-accelerated PyTorch
    execSync(`${pyCmd} -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124`, { stdio: 'inherit' });
  } else {
    // Mac/Linux: Install Default PyTorch (MPS/CUDA)
    execSync(`${pyCmd} -m pip install torch torchvision torchaudio`, { stdio: 'inherit' });
  }
  
  // Install Demucs universally
  execSync(`${pyCmd} -m pip install demucs`, { stdio: 'inherit' });
  console.log("\x1b[32m✅ KI-Bibliotheken installiert.\x1b[0m\n");

  // 4. Smart App Control Bypass (Windows Only)
  console.log("\x1b[33m[3/3] Konfiguriere System-Sicherheit...\x1b[0m");
  if (isWin) {
    console.log("\x1b[90mEntferne 'Mark of the Web' für Windows 11 Smart App Control...\x1b[0m");
    const sitePackages = execSync(`${pyCmd} -c "import site; print(site.getusersitepackages())"`).toString().trim();
    if (sitePackages) {
      execSync(`powershell -Command "Get-ChildItem -Path '${sitePackages}' -Recurse | Unblock-File -ErrorAction SilentlyContinue"`, { stdio: 'inherit' });
      console.log("\x1b[32m✅ Windows Smart App Control erfolgreich ausgetrickst!\x1b[0m");
    }
  } else {
    console.log("\x1b[32m✅ macOS/Linux benötigt keinen Security-Bypass. Übersprungen.\x1b[0m");
  }

  console.log("\n=======================================================");
  console.log("🎉 Setup abgeschlossen! Moondiver Studio ist einsatzbereit.");
  console.log("Starte die App mit: npm run ui");
  console.log("=======================================================\n");

} catch (error) {
  console.error("\n\x1b[31m❌ Ein Fehler ist aufgetreten:\x1b[0m", error.message);
  process.exit(1);
}

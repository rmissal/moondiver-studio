const { execSync } = require('child_process');
const os = require('os');

const isWin = os.platform() === 'win32';

console.log("=======================================================");
console.log("🚀 Moondiver Studio - Universal Setup");
console.log("=======================================================\n");

try {
  // 1. Install Node Dependencies
  console.log("\x1b[33m[1/3] Installing Node.js dependencies...\x1b[0m");
  execSync('npm install', { stdio: 'inherit' });
  console.log("\x1b[32m✅ Node.js modules installed.\x1b[0m\n");

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
        throw new Error("Python was not found. Please install Python 3.");
      }
    } else {
      throw new Error("python3 was not found. Please install Python 3.");
    }
  }

  // 3. Install PyTorch & Demucs
  console.log(`\x1b[33m[2/3] Installing PyTorch & Demucs via ${pyCmd}...\x1b[0m`);
  console.log("\x1b[90mThis may take a few minutes depending on your internet connection...\x1b[0m");
  
  if (isWin) {
    // Windows: Install CUDA-accelerated PyTorch
    execSync(`${pyCmd} -m pip install --pre torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu128 --upgrade`, { stdio: 'inherit' });
  } else {
    // Mac/Linux: Install Default PyTorch (MPS/CUDA)
    execSync(`${pyCmd} -m pip install torch torchvision torchaudio`, { stdio: 'inherit' });
  }
  
  // Install Demucs universally
  execSync(`${pyCmd} -m pip install demucs`, { stdio: 'inherit' });
  console.log("\x1b[32m✅ AI stem separation libraries installed.\x1b[0m\n");

  // 4. Smart App Control Bypass (Windows Only)
  console.log("\x1b[33m[3/3] Configuring system security...\x1b[0m");
  if (isWin) {
    console.log("\x1b[90mRemoving 'Mark of the Web' for Windows 11 Smart App Control...\x1b[0m");
    const sitePackages = execSync(`${pyCmd} -c "import site; print(site.getusersitepackages())"`).toString().trim();
    if (sitePackages) {
      execSync(`powershell -Command "Get-ChildItem -Path '${sitePackages}' -Recurse | Unblock-File -ErrorAction SilentlyContinue"`, { stdio: 'inherit' });
      console.log("\x1b[32m✅ Windows Smart App Control configured successfully!\x1b[0m");
    }
  } else {
    console.log("\x1b[32m✅ macOS/Linux does not require security bypass. Skipped.\x1b[0m");
  }

  console.log("\n=======================================================");
  console.log("🎉 Setup complete! Moondiver Studio is ready for use.");
  console.log("Start the app with: npm run ui");
  console.log("=======================================================\n");

} catch (error) {
  console.error("\n\x1b[31m❌ An error occurred:\x1b[0m", error.message);
  process.exit(1);
}

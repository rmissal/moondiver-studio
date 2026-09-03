const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { findLocalFfmpeg } = require('./metadata');

/**
 * Upscales album cover artwork to Apple Music standards (3000x3000 JPG).
 */
async function upscaleCoverArt(targetPath) {
  return new Promise((resolve, reject) => {
    // Resolve target folder
    const resolvedPath = path.resolve(targetPath);
    if (!fs.existsSync(resolvedPath)) {
      return reject(new Error(`Directory not found: ${targetPath}`));
    }

    // Find cover art
    const files = fs.readdirSync(resolvedPath);
    const coverFiles = files.filter(f => f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.png'));
    if (coverFiles.length === 0) {
      return reject(new Error(`No .jpg or .png cover art found in ${targetPath}`));
    }

    const ffmpegPath = findLocalFfmpeg();
    const results = [];

    let processed = 0;
    let errors = 0;

    const processFile = (idx) => {
      if (idx >= coverFiles.length) {
        if (errors > 0 && processed === 0) {
          reject(new Error("Failed to process cover art."));
        } else {
          resolve({
            status: "success",
            message: "Cover art upscaled successfully to Apple Music standard (3000x3000 JPG).",
            details: results
          });
        }
        return;
      }

      const fileName = coverFiles[idx];
      const filePath = path.join(resolvedPath, fileName);
      const baseName = path.parse(fileName).name;
      const finalOut = path.join(resolvedPath, baseName + ".jpg");
      const tempOut = path.join(resolvedPath, "temp_cover.jpg");

      const cmd = `"${ffmpegPath}" -hide_banner -y -i "${filePath}" -vf scale=3000:3000:flags=lanczos -q:v 2 "${tempOut}"`;

      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          results.push({ file: fileName, status: "error", error: error.message });
          errors++;
        } else {
          try {
            if (fs.existsSync(tempOut)) {
              if (filePath.toLowerCase() !== finalOut.toLowerCase()) {
                fs.unlinkSync(filePath);
              } else {
                fs.unlinkSync(filePath);
              }
              fs.renameSync(tempOut, finalOut);
              results.push({ file: fileName, status: "success", resolution: "3000x3000", format: "jpg" });
              processed++;
            }
          } catch (fsErr) {
            results.push({ file: fileName, status: "error", error: fsErr.message });
            errors++;
          }
        }
        processFile(idx + 1);
      });
    };

    processFile(0);
  });
}

module.exports = { upscaleCoverArt };

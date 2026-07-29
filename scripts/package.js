const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.join(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'pt_frontend');
const TEMP_RELEASE_DIR = path.join(ROOT_DIR, 'release-temp');
const ZIP_PATH = path.join(ROOT_DIR, 'release.zip');

function main() {
  console.log('🚀 Starting PeachtreesCMS release package generation...');

  // 1. Build the frontend
  console.log('\n📦 1. Building React frontend...');
  try {
    execSync('pnpm install', { cwd: FRONTEND_DIR, stdio: 'inherit' });
    execSync('pnpm build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
  } catch (err) {
    console.error('❌ Frontend build failed:', err.message);
    process.exit(1);
  }

  // 2. Clean and create temporary staging directory
  console.log('\n📁 2. Preparing staging area...');
  if (fs.existsSync(TEMP_RELEASE_DIR)) {
    fs.rmSync(TEMP_RELEASE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEMP_RELEASE_DIR, { recursive: true });

  // 3. Copy frontend build assets
  console.log('🚚 3. Copying frontend built assets...');
  const distDir = path.join(FRONTEND_DIR, 'dist');
  fs.cpSync(distDir, TEMP_RELEASE_DIR, { recursive: true });

  // Ensure upload directory exists and has a .gitkeep to force inclusion in ZIP
  const tempUploadDir = path.join(TEMP_RELEASE_DIR, 'upload');
  if (fs.existsSync(tempUploadDir)) {
    fs.rmSync(tempUploadDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempUploadDir, { recursive: true });
  fs.writeFileSync(path.join(tempUploadDir, '.gitkeep'), '');

  // 4. Copy backend API (pt_api) with exclusion filter
  console.log('🚚 4. Copying backend API and applying security filters...');
  const apiSrcDir = path.join(ROOT_DIR, 'pt_api');
  const apiDestDir = path.join(TEMP_RELEASE_DIR, 'pt_api');
  
  fs.mkdirSync(apiDestDir, { recursive: true });
  
  fs.cpSync(apiSrcDir, apiDestDir, {
    recursive: true,
    filter: (src) => {
      const relative = path.relative(apiSrcDir, src);
      // Exclude env files and install lock files
      if (relative === '.env' || relative === '.installed') {
        return false;
      }
      // Exclude individual session files in sessions/
      if (relative.startsWith('sessions') && relative !== 'sessions') {
        return false;
      }
      return true;
    }
  });

  // 5. Copy root files (.htaccess, LICENSE, README, SQL files)
  console.log('🚚 5. Copying root configuration and documentation...');
  const filesToCopy = [
    '.htaccess',
    'LICENSE',
    'README.md'
  ];

  for (const file of filesToCopy) {
    const srcFile = path.join(ROOT_DIR, file);
    if (fs.existsSync(srcFile)) {
      fs.cpSync(srcFile, path.join(TEMP_RELEASE_DIR, file));
    }
  }

  // 6. Compress staging area into release.zip
  console.log('\n🗜️ 6. Compressing package into release.zip...');
  if (fs.existsSync(ZIP_PATH)) {
    fs.unlinkSync(ZIP_PATH);
  }

  try {
    if (process.platform === 'win32') {
      // Use PowerShell to create the ZIP
      const psCommand = `Compress-Archive -Path "${TEMP_RELEASE_DIR}\\*" -DestinationPath "${ZIP_PATH}" -Force`;
      execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
    } else {
      // Use standard Unix zip command
      execSync(`zip -r "${ZIP_PATH}" ./*`, { cwd: TEMP_RELEASE_DIR, stdio: 'inherit' });
    }
    console.log(`\n🎉 Release package successfully created at:\n👉 ${ZIP_PATH}`);
  } catch (err) {
    console.error('❌ Compression failed:', err.message);
  } finally {
    // 7. Cleanup staging area
    console.log('\n🧹 Cleaning up staging area...');
    if (fs.existsSync(TEMP_RELEASE_DIR)) {
      fs.rmSync(TEMP_RELEASE_DIR, { recursive: true, force: true });
    }
    console.log('Done.');
  }
}

main();

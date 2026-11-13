const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
if (process.platform !== 'darwin') throw Error('macOS icon tools required');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'sv-icons-'));
try {
  for (const [name, source] of [['icon', 'assets/icon.png'], ['chrome', 'tools/logo.ico']]) {
    const iconset = path.join(temp, `${name}.iconset`);
    execFileSync('/usr/bin/swift', [path.join(__dirname, 'make-mac-icons.swift'), path.join(root, source), iconset], { stdio: 'inherit' });
    execFileSync('/usr/bin/iconutil', ['-c', 'icns', iconset, '-o', path.join(root, 'assets', `${name}.icns`)], { stdio: 'inherit' });
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }

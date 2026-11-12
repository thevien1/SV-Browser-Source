const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const root = process.argv[2];
const output = process.argv[3];
if (!root || !output) throw Error('Usage: node scripts/merge-mac-metadata.cjs <artifact-root> <output-file>');
function find(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const p = path.join(dir, entry.name);
    return entry.isDirectory() ? find(p) : entry.name === 'latest-mac.yml' ? [p] : [];
  });
}
const inputs = find(root).map(p => yaml.load(fs.readFileSync(p, 'utf8')));
if (inputs.length !== 2 || inputs.some(m => m.version !== inputs[0].version)) throw Error('Need two Mac manifests with the same version');
const files = inputs.flatMap(m => m.files);
for (const arch of ['arm64', 'x64']) {
  if (!files.some(f => f.url.includes(`mac-${arch}.zip`))) throw Error(`Missing ${arch} ZIP`);
}
fs.writeFileSync(output, yaml.dump({ ...inputs[0], files }));

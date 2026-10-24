const https = require('https');
const fs = require('fs');
const path = require('path');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'node' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetch(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed with status ${res.statusCode}`));
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function run() {
  console.log('Downloading browser logos...');
  
  const sources = {
    chrome: 'https://raw.githubusercontent.com/alrra/browser-logos/main/src/chrome/chrome.svg',
    firefox: 'https://raw.githubusercontent.com/alrra/browser-logos/main/src/firefox/firefox.svg',
    edge: 'https://raw.githubusercontent.com/alrra/browser-logos/main/src/edge/edge.svg',
    brave: 'https://raw.githubusercontent.com/alrra/browser-logos/main/src/brave/brave.svg',
    opera: 'https://raw.githubusercontent.com/alrra/browser-logos/main/src/opera/opera.svg'
  };

  const icons = {};
  for (const [name, url] of Object.entries(sources)) {
    try {
      const svg = await fetch(url);
      icons[name] = svg.trim();
      console.log(`✓ Fetched ${name}: ${svg.length} bytes`);
    } catch (e) {
      console.error(`✗ Error fetching ${name}:`, e.message);
    }
  }

  // Also save to src/assets/browsers/
  const destDir = path.join(__dirname, '..', 'src', 'assets', 'browsers');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  for (const [name, svg] of Object.entries(icons)) {
    fs.writeFileSync(path.join(destDir, `${name}.svg`), svg, 'utf8');
  }

  // Create base64 data URIs for fast rendering in <img> tags
  const dataUris = {};
  for (const [name, svg] of Object.entries(icons)) {
    const b64 = Buffer.from(svg, 'utf8').toString('base64');
    dataUris[name] = `data:image/svg+xml;base64,${b64}`;
  }

  // Generate src/data/browserIcons.js
  const outJs = `// SV Browser - Official high-definition browser icons
export const browserIconsDataUri = ${JSON.stringify(dataUris, null, 2)};

export function getBrowserIconHtml(browserType, size = 20) {
  const type = (browserType || 'chrome').toLowerCase();
  let uri = browserIconsDataUri.chrome;
  let title = 'Google Chrome / Chromium';

  if (type.includes('firefox')) {
    uri = browserIconsDataUri.firefox;
    title = 'Mozilla Firefox';
  } else if (type.includes('edge')) {
    uri = browserIconsDataUri.edge;
    title = 'Microsoft Edge';
  } else if (type.includes('brave')) {
    uri = browserIconsDataUri.brave;
    title = 'Brave Browser';
  } else if (type.includes('opera')) {
    uri = browserIconsDataUri.opera;
    title = 'Opera Browser';
  }

  return \`<img src="\${uri}" alt="\${title}" title="\${title}" class="browser-type-icon" style="width: \${size}px; height: \${size}px; object-fit: contain; vertical-align: middle; display: inline-block;" />\`;
}
`;

  fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'browserIcons.js'), outJs, 'utf8');
  console.log('✓ Generated src/data/browserIcons.js successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

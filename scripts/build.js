'use strict';
const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '..');
const output = path.join(project, 'dist');
const assets = ['index.html', 'styles.css', 'app.js', 'schedule-core.js', 'logo.png'];
const expected = new Set([...assets, '.nojekyll']);

fs.mkdirSync(output, { recursive: true });
// Refuse unexpected files so only the app's public assets can be published.
for (const entry of fs.readdirSync(output)) {
  if (!expected.has(entry) || !fs.lstatSync(path.join(output, entry)).isFile()) {
    throw new Error(`Unexpected item in dist: ${entry}. Move it out before building.`);
  }
}
for (const asset of assets) fs.copyFileSync(path.join(project, asset), path.join(output, asset));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log('Built dist/ with only the five public app files and .nojekyll.');

import fs from 'node:fs';
import path from 'node:path';

const stylesDir = path.resolve('frontend/src/styles');
const tokenFile = path.join(stylesDir, 'tokens.css');
const files = fs.readdirSync(stylesDir).filter((file) => file.endsWith('.css') && file !== 'tokens.css');
const pattern = /rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*([0-9.]+)\s*\)/g;

const tokens = new Map();

function alphaKey(value) {
  const normalized = Number(value);
  return String(Math.round(normalized * 1000)).padStart(3, '0');
}

function tokenName(r, g, b, a) {
  return `--ss-alpha-${r}-${g}-${b}-${alphaKey(a)}`;
}

for (const file of files) {
  const source = fs.readFileSync(path.join(stylesDir, file), 'utf8');
  for (const match of source.matchAll(pattern)) {
    const [, r, g, b, a] = match;
    tokens.set(tokenName(r, g, b, a), `rgba(${r}, ${g}, ${b}, ${a})`);
  }
}

const tokenLines = [...tokens.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, value]) => `  ${name}: ${value};`);

const block = `\n/* Opacidades semánticas derivadas del CSS existente */\n:root {\n${tokenLines.join('\n')}\n}\n`;
const current = fs.readFileSync(tokenFile, 'utf8');
if (!current.includes('--ss-alpha-')) {
  fs.appendFileSync(tokenFile, block, 'utf8');
}

let replacements = 0;
for (const file of files) {
  const target = path.join(stylesDir, file);
  const source = fs.readFileSync(target, 'utf8');
  const next = source.replace(pattern, (full, r, g, b, a) => {
    replacements += 1;
    return `var(${tokenName(r, g, b, a)})`;
  });
  if (next !== source) fs.writeFileSync(target, next, 'utf8');
}

console.log(`alpha tokens: ${tokens.size}; replacements: ${replacements}`);

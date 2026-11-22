import fs from 'node:fs';
import path from 'node:path';

const stylesDir = path.resolve('frontend/src/styles');
const tokenFile = path.join(stylesDir, 'tokens.css');
const files = fs.readdirSync(stylesDir).filter((file) => file.endsWith('.css') && file !== 'tokens.css');

const values = new Set();
for (const file of files) {
  const source = fs.readFileSync(path.join(stylesDir, file), 'utf8');
  for (const match of source.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
    values.add(match[1].toLowerCase());
  }
}

for (const value of [
  'ffffff', 'f8fafc', 'f1f5f9', '0f172a', '1e293b', '475569', '64748b', '94a3b8',
  'e2e8f0', 'eef2f7', 'cbd5e1', '047664', '065e51', '10b894', 'ecfdf8', 'a7f3dd',
  '047857', 'b45309', 'fffbeb', 'be123c', 'fff1f2', '0369a1', 'f0f9ff',
  '0c1829', '060f1c', '0a1423', 'f1f5f9', '334155', '34d3ac', '6ee7b7', '0a1524',
  '1e2f47', 'fcd34d', '1c1917', 'fda4af', '1f1319', '7dd3fc', '0b1728',
]) {
  values.add(value);
}

const sorted = [...values].sort();
const primitiveLines = sorted.map((value) => `  --ss-palette-${value}: #${value};`);
const alias = (value) => `var(--ss-palette-${value})`;
const has = (value) => values.has(value);

const semantic = {
  '--ss-color-surface': alias('ffffff'),
  '--ss-color-surface-page': alias('f8fafc'),
  '--ss-color-surface-subtle': alias('f1f5f9'),
  '--ss-color-text': alias('0f172a'),
  '--ss-color-text-strong': alias('1e293b'),
  '--ss-color-text-muted': alias('475569'),
  '--ss-color-text-subtle': alias('64748b'),
  '--ss-color-text-faint': alias('94a3b8'),
  '--ss-color-border': alias('e2e8f0'),
  '--ss-color-border-soft': alias('eef2f7'),
  '--ss-color-border-strong': alias('cbd5e1'),
  '--ss-color-brand': alias('047664'),
  '--ss-color-brand-strong': alias('065e51'),
  '--ss-color-brand-bright': alias('10b894'),
  '--ss-color-brand-soft': alias('ecfdf8'),
  '--ss-color-brand-line': alias('a7f3dd'),
  '--ss-color-success': alias('047857'),
  '--ss-color-warning': alias('b45309'),
  '--ss-color-warning-soft': alias('fffbeb'),
  '--ss-color-danger': alias('be123c'),
  '--ss-color-danger-soft': alias('fff1f2'),
  '--ss-color-info': alias('0369a1'),
  '--ss-color-info-soft': alias('f0f9ff'),
};
const semanticLines = Object.entries(semantic)
  .filter(([, value]) => {
    const match = /var\(--ss-palette-([0-9a-f]+)\)/.exec(value);
    return !match || has(match[1]);
  })
  .map(([name, value]) => `  ${name}: ${value};`);

const output = `/* ==========================================================================
   SmartSys Design Tokens
   Capa de primitivos generada desde el CSS existente + alias semanticos.
   Los primitivos conservan exactamente el valor visual historico; los alias
   permiten evolucionar temas sin tocar cada modulo.
   ========================================================================== */

:root {
  /* Primitivos de color (hex) */
${primitiveLines.join('\n')}

  /* Alias semanticos */
${semanticLines.join('\n')}

  /* Radios, elevacion, movimiento y capas */
  --ss-radius-xs: 6px;
  --ss-radius-sm: 9px;
  --ss-radius-md: 12px;
  --ss-radius-lg: 16px;
  --ss-radius-xl: 22px;
  --ss-shadow-card: 0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -12px rgba(15, 23, 42, 0.18);
  --ss-shadow-pop: 0 24px 60px -28px rgba(2, 6, 23, 0.55);
  --ss-duration-fast: 0.15s;
  --ss-duration-base: 0.2s;
  --ss-ease-standard: cubic-bezier(0.22, 1, 0.36, 1);
  --ss-z-dropdown: 200;
  --ss-z-modal: 300;
  --ss-z-toast: 400;
}

html.theme-dark {
  --ss-color-surface: ${alias('0c1829')};
  --ss-color-surface-page: ${alias('060f1c')};
  --ss-color-surface-subtle: ${alias('0a1423')};
  --ss-color-text: ${alias('e2e8f0')};
  --ss-color-text-strong: ${alias('f1f5f9')};
  --ss-color-text-muted: ${alias('cbd5e1')};
  --ss-color-text-subtle: ${alias('94a3b8')};
  --ss-color-text-faint: ${alias('64748b')};
  --ss-color-border: ${alias('1e2f47')};
  --ss-color-border-soft: ${alias('13253d')};
  --ss-color-border-strong: ${alias('334155')};
  --ss-color-brand: ${alias('34d3ac')};
  --ss-color-brand-strong: ${alias('6ee7b7')};
  --ss-color-brand-bright: ${alias('6ee7b7')};
  --ss-color-brand-soft: ${alias('0a1524')};
  --ss-color-brand-line: ${alias('1e2f47')};
  --ss-color-success: ${alias('6ee7b7')};
  --ss-color-warning: ${alias('fcd34d')};
  --ss-color-warning-soft: ${alias('1c1917')};
  --ss-color-danger: ${alias('fda4af')};
  --ss-color-danger-soft: ${alias('1f1319')};
  --ss-color-info: ${alias('7dd3fc')};
  --ss-color-info-soft: ${alias('0b1728')};
  --ss-shadow-card: 0 22px 50px -40px rgba(0, 0, 0, 0.9);
}
`;

fs.writeFileSync(tokenFile, output, 'utf8');

let migrated = 0;
for (const file of files) {
  const filePath = path.join(stylesDir, file);
  const source = fs.readFileSync(filePath, 'utf8');
  const next = source.replace(/#([0-9a-fA-F]{3,8})\b/g, (full, value) => {
    migrated += 1;
    return `var(--ss-palette-${value.toLowerCase()})`;
  });
  if (next !== source) fs.writeFileSync(filePath, next, 'utf8');
}

console.log(`tokens: ${sorted.length}; replacements: ${migrated}; files: ${files.length}`);

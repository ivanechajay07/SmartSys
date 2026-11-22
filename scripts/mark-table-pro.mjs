import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('frontend/src');
let updated = 0;

function walk(directory) {
  for (const file of fs.readdirSync(directory)) {
    const target = path.join(directory, file);
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      walk(target);
      continue;
    }
    if (!target.endsWith('.tsx')) continue;
    const source = fs.readFileSync(target, 'utf8');
    const next = source.replace(/<table className="table">/g, '<table className="table table-pro">');
    if (next !== source) {
      updated += 1;
      fs.writeFileSync(target, next, 'utf8');
    }
  }
}

walk(root);
console.log(`archivos actualizados: ${updated}`);

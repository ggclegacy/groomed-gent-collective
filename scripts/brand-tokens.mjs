import { readFileSync, writeFileSync } from 'node:fs';
const brand = JSON.parse(readFileSync(new URL('../lib/brand.json', import.meta.url), 'utf8'));
const kebab = (key) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const css = `/* Generated from lib/brand.json. Run node scripts/brand-tokens.mjs after palette edits. */\n:root, .dark {\n${Object.entries(brand).map(([key, value]) => `  --brand-${kebab(key)}: ${value};`).join('\n')}\n}\n`;
const target = new URL('../app/brand-tokens.css', import.meta.url);
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== css) throw new Error('Brand tokens are out of date. Run node scripts/brand-tokens.mjs.');
} else writeFileSync(target, css);

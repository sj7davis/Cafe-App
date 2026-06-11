// Summarise eslint JSON output: errors only, grouped, non-unused-vars listed.
import { readFileSync } from 'fs';
let raw = readFileSync(process.argv[2], 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
const data = JSON.parse(raw);
const errs = [];
for (const f of data) for (const m of f.messages) if (m.severity === 2)
  errs.push({ file: f.filePath.split(/[\\/]/).slice(-2).join('/'), line: m.line, rule: m.ruleId, msg: (m.message || '').slice(0, 70) });
console.log('total errors:', errs.length);
const byRule = {};
for (const e of errs) byRule[e.rule] = (byRule[e.rule] || 0) + 1;
console.log(byRule);
for (const e of errs.filter(e => e.rule !== '@typescript-eslint/no-unused-vars'))
  console.log(`${e.file}:${e.line} [${e.rule}] ${e.msg}`);

/**
 * split-staff-dashboard.mjs
 * Splits StaffDashboard.tsx into per-tab files under src/pages/staff/.
 * Same approach as split-dashboard.mjs (which split OwnerDashboard):
 * generated files start with the full original import block; run
 * `npx eslint src/pages/staff --fix` afterwards to strip unused imports.
 * Run: node scripts/split-staff-dashboard.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src/pages/StaffDashboard.tsx');
const DEST = join(ROOT, 'src/pages/staff');

const source = readFileSync(SRC, 'utf8');
const lines  = source.split('\n');

// ── Landmarks ─────────────────────────────────────────────────────────────────
const typeStart = lines.findIndex(l => l.startsWith('type RoleName'));
const defaultExportLine = lines.findIndex(l => l.startsWith('export default function StaffDashboard'));
if (typeStart === -1 || defaultExportLine === -1) throw new Error('landmarks not found');

const importBlock = lines.slice(0, typeStart).join('\n');          // imports only
const headerBlock = lines.slice(typeStart, defaultExportLine).join('\n'); // types + buildTabs

// ── Brace-counted extraction ──────────────────────────────────────────────────
function extractBlock(startLine) {
  let depth = 0, started = false;
  const body = [];
  for (let i = startLine; i < lines.length; i++) {
    body.push(lines[i]);
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
    }
    if (started && depth === 0) return { body: body.join('\n'), endLine: i };
  }
  throw new Error(`unbalanced braces from line ${startLine + 1}`);
}

// ── Collect top-level functions after the default export ─────────────────────
const funcRegex = /^function ([A-Za-z]+)\b/;
const functions = [];
for (let i = defaultExportLine; i < lines.length; i++) {
  const m = lines[i].match(funcRegex);
  if (m) {
    const { body, endLine } = extractBlock(i);
    functions.push({ name: m[1], body });
    i = endLine;
  }
}
console.log(`Found ${functions.length} top-level functions:`);
functions.forEach(f => console.log('  ' + f.name));

// Top-level consts living between functions (used by AnalyticsTab)
const constNames = ['CHART_COLORS', 'DOW_LABELS'];
const consts = lines.filter(l => constNames.some(n => l.startsWith(`const ${n} =`)));

const sharedNames = [
  'playNewOrderChime', 'SidebarItem', 'printReceipt', 'getPasswordStrength',
  'PasswordStrengthBar', 'getWeekStart', 'getWeekDays', 'formatDayLabel',
  'formatWeekRange', 'StatCard', 'StatusBadge',
];
const sharedFuncs = functions.filter(f => sharedNames.includes(f.name));
const tabFuncs    = functions.filter(f => f.name.endsWith('Tab'));
const leftovers   = functions.filter(f => !sharedNames.includes(f.name) && !f.name.endsWith('Tab'));
if (leftovers.length) console.log('NOTE leftovers kept in index:', leftovers.map(f => f.name).join(', '));

// ── shared.tsx ────────────────────────────────────────────────────────────────
mkdirSync(join(DEST, 'tabs'), { recursive: true });
const sharedImportLine = `import { ${[...sharedNames, ...constNames].join(', ')} } from '../shared';`;

writeFileSync(join(DEST, 'shared.tsx'), [
  '// Shared helpers and small components for the staff dashboard tabs.',
  importBlock,
  '',
  ...consts.map(c => 'export ' + c),
  '',
  ...sharedFuncs.map(f => 'export ' + f.body.trimEnd() + '\n'),
].join('\n'), 'utf8');
console.log('Wrote shared.tsx');

// ── tabs/*.tsx ────────────────────────────────────────────────────────────────
for (const tab of tabFuncs) {
  writeFileSync(join(DEST, 'tabs', `${tab.name}.tsx`), [
    importBlock,
    sharedImportLine,
    '',
    'export ' + tab.body.trimEnd(),
    '',
  ].join('\n'), 'utf8');
  console.log(`Wrote tabs/${tab.name}.tsx`);
}

// ── index.tsx ─────────────────────────────────────────────────────────────────
const mainBlock = extractBlock(defaultExportLine).body;
const tabImports = tabFuncs.map(t => `import { ${t.name} } from './tabs/${t.name}';`).join('\n');

writeFileSync(join(DEST, 'index.tsx'), [
  '// StaffDashboard — shell, nav and tab switching. Tabs live in ./tabs/.',
  importBlock,
  sharedImportLine,
  tabImports,
  '',
  headerBlock,
  mainBlock,
  '',
  ...leftovers.map(f => f.body.trimEnd() + '\n'),
].join('\n'), 'utf8');
console.log('Wrote index.tsx');

// ── Re-export shim ────────────────────────────────────────────────────────────
writeFileSync(SRC, [
  '// Structural refactor: StaffDashboard split into per-tab modules in ./staff/.',
  "export { default } from './staff/index';",
  '',
].join('\n'), 'utf8');
console.log('StaffDashboard.tsx is now a re-export shim.');
console.log('Next: npx eslint src/pages/staff --fix && npx tsc -p tsconfig.app.json --noEmit');

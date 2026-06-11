/**
 * split-venue-public.mjs
 * Extracts VenuePublic.tsx's pre-component helpers and post-component leaf
 * components into src/pages/venue-public/{helpers,components}.tsx.
 * The main component stays in VenuePublic.tsx (it shares too much state to
 * split safely without tests). Run eslint --fix afterwards to trim imports.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src/pages/VenuePublic.tsx');
const DEST = join(ROOT, 'src/pages/venue-public');

const lines = readFileSync(SRC, 'utf8').split('\n');

const firstHelper = lines.findIndex(l => l.startsWith('function parseHourValue'));
const mainStart = lines.findIndex(l => l.startsWith('export default function VenuePublic'));
const compStart = lines.findIndex(l => l.startsWith('function OrderAgainRow'));
if (firstHelper === -1 || mainStart === -1 || compStart === -1) throw new Error('landmarks missing');

// brace-counted end of the main component
function blockEnd(start) {
  let depth = 0, started = false;
  for (let i = start; i < lines.length; i++) {
    for (const ch of lines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') depth--;
    }
    if (started && depth === 0) return i;
  }
  throw new Error('unbalanced');
}
const mainEnd = blockEnd(mainStart);

const importBlock = lines.slice(0, firstHelper).join('\n');
const helpersBlock = lines.slice(firstHelper, mainStart).join('\n');
const mainBlock = lines.slice(mainStart, mainEnd + 1).join('\n');
const componentsBlock = lines.slice(compStart, lines.length).join('\n');

// export every top-level declaration in the extracted blocks
const exportify = (block) =>
  block.replace(/^(function |const |type |interface )/gm, 'export $1');

mkdirSync(DEST, { recursive: true });

writeFileSync(join(DEST, 'helpers.tsx'), [
  '// Opening-hours / cart / formatting helpers + website block renderer for VenuePublic.',
  importBlock,
  '',
  exportify(helpersBlock),
].join('\n'), 'utf8');

writeFileSync(join(DEST, 'components.tsx'), [
  '// Leaf components used by VenuePublic (menu cards, modifier modal, split bill...).',
  importBlock,
  "import { formatCountdown, cartKey, type CartItem } from './helpers';",
  '',
  exportify(componentsBlock),
].join('\n'), 'utf8');

writeFileSync(SRC, [
  '// VenuePublic — public ordering page. Helpers and leaf components are in ./venue-public/.',
  importBlock,
  "import { parseHourValue, parseOpenClose, formatMinutes, getOpenStatus, formatCountdown, cartKey, isWithinHappyHour, renderWebsiteBlocks, type CartItem } from './venue-public/helpers';",
  "import { OrderAgainRow, ModifierModal, SplitBillPanel, MenuCard, type ModifierGroup, type MenuItemWithExtras } from './venue-public/components';",
  '',
  mainBlock,
  '',
].join('\n'), 'utf8');

console.log(`helpers: ${mainStart - firstHelper} lines, main: ${mainEnd - mainStart + 1} lines, components: ${lines.length - compStart} lines`);
console.log('Next: npx eslint src/pages/VenuePublic.tsx src/pages/venue-public --fix && tsc');

/**
 * split-dashboard.mjs
 * Splits OwnerDashboard.tsx into per-tab files.
 * Run: node app/scripts/split-dashboard.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC  = join(ROOT, 'src/pages/OwnerDashboard.tsx');
const DEST = join(ROOT, 'src/pages/dashboard');

const source = readFileSync(SRC, 'utf8');
const lines  = source.split('\n');

// ── 1. Extract the shared header (imports + DS constants) ─────────────────────
// Everything up to (but not including) the first `export default function`
const defaultExportLine = lines.findIndex(l => l.startsWith('export default function OwnerDashboard'));
const sharedHeaderLines = lines.slice(0, defaultExportLine);

// ── 2. Find all top-level function declarations ───────────────────────────────
// Pattern: line starts with `function ` or `export function `
const funcRegex = /^(?:export )?function ([A-Za-z]+)\b/;

const funcStarts = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(funcRegex);
  if (m && i > defaultExportLine) {
    funcStarts.push({ name: m[1], startLine: i });
  }
}

// ── 3. Extract each function body using brace counting ────────────────────────
function extractFunction(startLine) {
  let depth = 0;
  let started = false;
  const body = [];
  for (let i = startLine; i < lines.length; i++) {
    const line = lines[i];
    body.push(line);
    for (const ch of line) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') { depth--; }
    }
    if (started && depth === 0) break;
  }
  return body.join('\n');
}

const functions = funcStarts.map(({ name, startLine }, idx) => {
  const body = extractFunction(startLine);
  return { name, startLine, body };
});

console.log(`Found ${functions.length} top-level functions after OwnerDashboard:`);
functions.forEach(f => console.log(`  ${f.name} (line ${f.startLine + 1})`));

// ── 4. Build shared.ts ─────────────────────────────────────────────────────────
// Contains: DS constants + helper functions + sub-components that multiple tabs use
const sharedNames = [
  'DS', 'WEEK_DAYS', 'FONTS', 'PALETTES',
  'getMonday', 'addWeekDays', 'TemplatePreviewCard', 'ImageUpload',
  'SortableMenuRow', 'TabletPinSection', 'ModifierModal',
];

const sharedFuncs = functions.filter(f => sharedNames.includes(f.name));
const tabFuncs    = functions.filter(f => !sharedNames.includes(f.name) && f.name.endsWith('Tab'));

// The DS object is defined before functions — extract from sharedHeaderLines
const dsStart = sharedHeaderLines.findIndex(l => l.startsWith('const DS ='));
const dsBlockLines = [];
if (dsStart !== -1) {
  let depth = 0, started = false;
  for (let i = dsStart; i < sharedHeaderLines.length; i++) {
    dsBlockLines.push(sharedHeaderLines[i]);
    for (const ch of sharedHeaderLines[i]) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') { depth--; }
    }
    if (started && depth === 0) break;
  }
}

// Standard imports for shared.ts
const sharedImports = `import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send,
  Tag, DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp,
  CalendarDays, Clock, Shield, Building2, Percent, MessageSquare,
  QrCode, Link2, CreditCard, MapPin, Briefcase, Edit2, Trash2,
  GripVertical, Download, ChevronDown, ChevronUp, Monitor, Smartphone,
  RefreshCw, Bell, Eye, EyeOff, ArrowRight, CheckCircle, Users,
  PieChart as PieChartIcon, Circle,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import QRCode from 'qrcode';
`;

// Build shared file as concatenated strings (avoid spreading joined strings as chars)
const sharedFileContent = [
  '// Shared constants, helpers and sub-components for OwnerDashboard tabs.',
  '// Exported from here and imported by each tab file.',
  '',
  sharedImports,
  '',
  ...(dsBlockLines.length > 0 ? ['export ' + dsBlockLines.join('\n'), ''] : []),
  // Each shared function as its own array element — no .join() spread
  ...sharedFuncs.map(f => 'export ' + f.body.trimEnd() + '\n'),
].join('\n');

mkdirSync(join(DEST, 'tabs'), { recursive: true });
// shared.tsx (not .ts) because it contains JSX from React components
writeFileSync(join(DEST, 'shared.tsx'), sharedFileContent, 'utf8');
console.log('\nWrote shared.tsx');

// ── 5. Standard tab file imports ───────────────────────────────────────────────
const TAB_IMPORTS = `import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { trpc } from '@/providers/trpc';
import {
  Loader2, Check, Plus, X, AlertCircle, Star, Gift, Ticket, Send, Tag,
  DollarSign, Globe, Settings, Coffee, BarChart3, TrendingUp, CalendarDays,
  Clock, Shield, Building2, Percent, MessageSquare, QrCode, Link2, CreditCard,
  MapPin, Briefcase, Edit2, Trash2, GripVertical, Download, ChevronDown,
  ChevronUp, Monitor, Smartphone, RefreshCw, Bell, Eye, EyeOff, CheckCircle,
  Users, PieChart as PieChartIcon, Circle,
} from 'lucide-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import QRCode from 'qrcode';
import { SetupChecklist } from '@/components/SetupChecklist';
import { DS, getMonday, addWeekDays, WEEK_DAYS, FONTS, PALETTES, TemplatePreviewCard, ImageUpload, SortableMenuRow, TabletPinSection, ModifierModal } from '../shared.tsx';
`;

// ── 6. Write each tab file ─────────────────────────────────────────────────────
for (const tab of tabFuncs) {
  const filename = join(DEST, 'tabs', `${tab.name}.tsx`);
  const content = [
    TAB_IMPORTS,
    '',
    `export ${tab.body.trimEnd()}`,
    '',
  ].join('\n');
  writeFileSync(filename, content, 'utf8');
  console.log(`Wrote tabs/${tab.name}.tsx`);
}

// ── 7. Write index.tsx (AppShell + nav + tab switcher) ────────────────────────
// Extract the OwnerDashboard function itself
function extractOwnerDashboard() {
  const start = defaultExportLine;
  let depth = 0, started = false;
  const body = [];
  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    body.push(line);
    for (const ch of line) {
      if (ch === '{') { depth++; started = true; }
      if (ch === '}') { depth--; }
    }
    if (started && depth === 0) break;
  }
  return body.join('\n');
}

const dashboardBody = extractOwnerDashboard();

// Build tab import list
const tabImports = tabFuncs
  .map(t => `import { ${t.name} } from './tabs/${t.name}';`)
  .join('\n');

const indexContent = `/**
 * OwnerDashboard — AppShell + nav + tab switching.
 * Tab components are split into individual files in ./tabs/.
 * Shared helpers and DS constants are in ./shared.ts.
 */
import { useState, useEffect, useRef, type CSSProperties } from 'react';
import { useNavigate } from 'react-router';
import { useVenueAuth } from '@/hooks/useVenueAuth';
import { useVenueSSE } from '@/hooks/useVenueSSE';
import { trpc } from '@/providers/trpc';
import {
  ArrowLeft, Settings, CreditCard, Coffee, Link2, Loader2, Check, Zap,
  Globe, BarChart3, Users, LogOut, Shield, Plus, Edit2, Trash2, X,
  AlertCircle, Star, Gift, Ticket, MapPin, Briefcase, QrCode, Download,
  Send, TrendingUp, ChevronDown, ChevronUp, Tag, DollarSign,
  PieChart as PieChartIcon, Building2, MessageSquare, Percent, GripVertical,
  Bell, CalendarDays, Clock,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { ThemeProvider } from '@/components/layout/ThemeContext';
import type { SidebarNavGroup } from '@/components/layout/SidebarNav';

${tabImports}

${dashboardBody}
`;

writeFileSync(join(DEST, 'index.tsx'), indexContent, 'utf8');
console.log('\nWrote index.tsx');

// ── 8. Update the original OwnerDashboard.tsx to re-export ────────────────────
const reExport = `// Structural refactor: OwnerDashboard split into per-tab modules.
// This file kept for backward compatibility — do not import from here in new code.
export { default } from './dashboard/index';
`;
writeFileSync(SRC, reExport, 'utf8');
console.log('Updated OwnerDashboard.tsx to re-export from ./dashboard/index');

console.log('\n✅ Split complete. Run: npx tsc --noEmit to verify.');

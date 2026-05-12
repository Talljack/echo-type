import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const root = url.fileURLToPath(new URL('..', import.meta.url));

const builtinPath = path.join(root, 'src/lib/builtin-collections.ts');
const tailJsonPath = path.join(root, 'scripts/builtin-collections.tail.json');

function esc(s) {
  return `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** @typedef {{ items: Array<{text:string,type:'phrase'|'sentence'}>; category: string }} Col */

/** @type {Col[]} */
const tailCollections = JSON.parse(fs.readFileSync(tailJsonPath, 'utf8'));

function sectionBanner(category) {
  switch (category) {
    case 'travel':
      return '  /* ─── Travel ─── */';
    case 'work':
      return '  /* ─── Work & Business ─── */';
    case 'social':
      return '  /* ─── Social ─── */';
    case 'emergency':
      return '  /* ─── Emergency & Services ─── */';
    case 'housing':
      return '  /* ─── Housing ─── */';
    case 'education':
      return '  /* ─── Education ─── */';
    case 'tech':
      return '  /* ─── Technology & Services ─── */';
    case 'health':
      return '  /* ─── Health & Wellness ─── */';
    default:
      return '';
  }
}

function emitCollection(c) {
  const tags = c.tags.map((t) => esc(t)).join(', ');
  const itemsText = c.items.map((it) => `      { text: ${esc(it.text)}, type: '${it.type}' },`).join('\n');
  return `  {
    id: ${esc(c.id)},
    title: ${esc(c.title)},
    titleZh: ${esc(c.titleZh)},
    description: ${esc(c.description)},
    descriptionZh: ${esc(c.descriptionZh)},
    scenario: ${esc(c.scenario)},
    category: ${esc(c.category)},
    difficulty: '${c.difficulty}',
    icon: ${esc(c.icon)},
    tags: [${tags}],
    items: [
${itemsText}
    ],
  },`;
}

function applyDailyFixes(src) {
  let s = src;
  s = s.replace(
    "{ text: 'Thanks — I'll take both.', type: 'sentence' },",
    "{ text: 'Thanks — I will take both.', type: 'sentence' },",
  );
  s = s.replace(
    "description: 'Speedy combos, customizing orders, napkins, napkins, and ketchup.',",
    "description: 'Speedy combos, toppings, napkins, ketchup, and order numbers.',",
  );
  s = s.replace(
    "descriptionZh: '套餐点餐、Customization、配菜饮料与取餐号。'",
    "descriptionZh: '套餐点餐、定制化口味、配菜饮料与取餐号。'",
  );

  const docNeedle = `{ text: 'See you for follow-up.', type: 'phrase' },
    ],`;
  const docIns = `{ text: 'See you for follow-up.', type: 'phrase' },
      { text: 'My fever peaked last night, but it feels lower today.', type: 'sentence' },
      { text: 'I have been coughing for a week—and my chest hurts when I breathe deeply.', type: 'sentence' },
      { text: 'Would you recommend any tests—for example a chest X‑ray?', type: 'sentence' },
    ],`;
  if (!s.includes('Would you recommend any tests—for example a chest X‑ray')) {
    s = s.replace(docNeedle, docIns);
  }

  const phNeedle = `{ text: 'Ask the pharmacist.', type: 'phrase' },
    ],
  },
  {
    id: 'haircut',`;

  const phIns = `{ text: 'Ask the pharmacist.', type: 'phrase' },
      { text: 'Generic is fine if it is cheaper.', type: 'sentence' },
      { text: 'Could you print the patient leaflet in English, please?', type: 'sentence' },
    ],
  },
  {
    id: 'haircut',`;

  if (!s.includes('Could you print the patient leaflet in English')) {
    s = s.replace(phNeedle, phIns);
  }

  const dirNeedle = `{ text: 'Thanks — I appreciate it!', type: 'sentence' },
    ],
  },
  {
    id: 'taking-taxi',`;

  const dirIns = `{ text: 'Thanks — I appreciate it!', type: 'sentence' },
      { text: 'Is it about a ten-minute walk from here?', type: 'sentence' },
      { text: 'Is there a restroom inside that station?', type: 'sentence' },
    ],
  },
  {
    id: 'taking-taxi',`;

  if (!s.includes('Is there a restroom inside that station?')) {
    s = s.replace(dirNeedle, dirIns);
  }

  return s;
}

const travelMarker = '  /* ─── Travel ─── */';

let src = fs.readFileSync(builtinPath, 'utf8');
src = applyDailyFixes(src);

const idx = src.indexOf(travelMarker);
if (idx === -1) {
  throw new Error(`Missing travel marker: ${travelMarker}`);
}

const prefix = src.slice(0, idx).trimEnd();

const parts = [];
let prevCat = null;
for (const c of tailCollections) {
  if (c.category !== prevCat) {
    const banner = sectionBanner(c.category);
    if (banner) {
      parts.push(banner);
    }
    prevCat = c.category;
  }
  parts.push(emitCollection(c));
}

const body = `${prefix}\n\n${parts.join('\n\n')}\n];\n`;
fs.writeFileSync(builtinPath, body);

console.error(`Wrote ${builtinPath} (${15 + tailCollections.length} collections; tail ${tailCollections.length})`);

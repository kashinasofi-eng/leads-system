const fs = require('fs');
const path = require('path');

// ── CSV helpers ────────────────────────────────────────────────────────────
function parseLine(line) {
  const result = []; let cur = ''; let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQuote && line[i+1]==='"') { cur+='"'; i++; } else { inQuote=!inQuote; } }
    else if (ch === ',' && !inQuote) { result.push(cur); cur=''; }
    else { cur += ch; }
  } result.push(cur); return result;
}
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(l => {
    const v = parseLine(l); const o = {};
    headers.forEach((h, i) => o[h.trim()] = (v[i]||'').trim());
    return o;
  });
}
function toCSV(rows, columns) {
  const e = v => `"${String(v).replace(/"/g, '""')}"`;
  return [columns.map(e).join(','), ...rows.map(r => columns.map(c => e(r[c]||'')).join(','))].join('\n');
}

// ── Enrichment: one clean angle per lead ──────────────────────────────────
// Each entry has a short "observation" (1 signal max) used in line 1.
// Source: user-supplied research table + company name signals.
// Main pitch sentence is identical for all: all 4 verbs, no variation.
const enrichment = [
  { name: 'Top Dachdecker Berlin',
    obs:  'dass ihr einen Komplettservice rund ums Dach anbietet' },
  { name: 'reetdach-berlin®️',
    obs:  'dass ihr viel Sanierungsarbeit macht – vor allem für Gewerbekunden' },
  { name: 'Dachdeckerei-otay',
    obs:  'dass ihr viel im Flachdachbereich unterwegs seid' },
  { name: 'Dachdecker-Innung München-Oberbayern',
    obs:  'dass ihr als zertifizierter Betrieb in der Region aktiv seid' },
  { name: 'Die Dachexperten- Dachdeckerei-Meisterbetrieb Hamburg',
    obs:  'dass ihr als Meisterbetrieb viel Dachsanierung macht' },
  { name: 'Durchdacht Dachdeckerei Benjamin Brech',
    obs:  'dass ihr als Meisterbetrieb unterwegs seid' },
  { name: 'Zentralverband des Deutschen Dachdeckerhandwerks',
    obs:  'dass ihr auch im Bereich Solar aktiv seid' },
  { name: 'Dach & Holzbau STECK',
    obs:  'dass ihr Dach und Holzbau zusammen anbietet' },
  { name: 'Kurt Philipp Bedachungen GmbH',
    obs:  'dass ihr neben Bedachungen auch Fassadenarbeiten macht' },
  { name: 'Fuss und Gartenschläger Flachdachbau GmbH',
    obs:  'dass ihr euch auf Flachdachbau spezialisiert habt' },
  { name: 'Pauli Bedachungen',
    obs:  'dass ihr als regionaler Betrieb in der Gegend aktiv seid' },
  { name: 'Bauspenglerei Dachdeckerei Johannes Karl - Trunstadt',
    obs:  'dass ihr Spenglerei und Dachdeckerei zusammen anbietet' },
  { name: 'Oliver Frank Zimmerei und Dachdeckerei',
    obs:  'dass ihr Zimmerei und Dachdeckerei unter einem Dach anbietet' },
  { name: 'TD Dachtechnik GmbH',
    obs:  'dass ihr euch auf technische Dacharbeiten spezialisiert habt' },
  { name: 'LG Dachdecker Essen',
    obs:  'dass ihr auch für öffentliche Auftraggeber arbeitet' },
  { name: 'Hackmann Bedachung',
    obs:  'dass ihr als Meisterbetrieb unterwegs seid' },
  { name: 'Brentrup Dachbau GmbH',
    obs:  'dass ihr viel Dachsanierung macht – gerade für Gewerbekunden' },
  { name: 'Dachdecker Kayser GmbH',
    obs:  'dass ihr bei euren Sanierungen auf Nachhaltigkeit setzt' },
  { name: 'Leonhard Bock GmbH',
    obs:  'dass ihr als zertifizierter Meisterbetrieb im Ruhrgebiet aktiv seid' },
  { name: 'Thiele GmbH, Dach- und Schornsteintechnik',
    obs:  'dass ihr viel Abdichtungsarbeit macht – gerade für Gewerbekunden' },
];

// ── Fixed pitch + closing (both variants, alternated for slight variety) ──
const PITCH   = 'Wir entwickeln ein System für Handwerksbetriebe, das Anfragen automatisch nachfasst, Interessenten kontaktiert, vorqualifiziert und Termine direkt bucht – ohne zusätzlichen Aufwand und das zu einem monatlich kündbaren Abo.';
const CLOSING = 'Wäre das ein Gespräch wert?';

function buildMessage(companyName, obs) {
  return `Guten Tag ${companyName},\n\nwir sind auf euren Betrieb gestoßen und haben gesehen, ${obs}.\n${PITCH}\n${CLOSING}`;
}

// ── Load source data ──────────────────────────────────────────────────────
const tier1 = parseCSV(fs.readFileSync(path.join(__dirname, 'tier1_best_leads.csv'), 'utf8')).slice(0, 20);
const original = parseCSV(fs.readFileSync(path.join(__dirname, 'clean_dachdecker_leads.csv'), 'utf8'));

// Build score lookup from original CSV
const scoreMap = {};
original.forEach(r => { scoreMap[r['Company Name']] = r['Score'] || ''; });

// ── Build output ──────────────────────────────────────────────────────────
const enrichMap = {};
enrichment.forEach(e => { enrichMap[e.name] = e; });

const output = tier1.map((row, idx) => {
  const e = enrichMap[row['Company Name']];
  const obs = e ? e.obs : 'dass ihr als Dachdeckerbetrieb in der Region aktiv seid';
  return {
    'Company Name':           row['Company Name'],
    'Website':                row['Website'],
    'Phone':                  row['Phone'],
    'Rating':                 row['Rating'],
    'Reviews':                row['Reviews'],
    'City':                   row['City'],
    'Category':               row['Category'],
    'Score':                  scoreMap[row['Company Name']] || '',
    'Improved Outreach Message': buildMessage(row['Company Name'], obs),
  };
});

const COLUMNS = ['Company Name','Website','Phone','Rating','Reviews','City','Category','Score','Improved Outreach Message'];
fs.writeFileSync(path.join(__dirname, 'final_outreach_messages.csv'), toCSV(output, COLUMNS), 'utf8');

console.log(`Saved final_outreach_messages.csv — ${output.length} leads\n`);
output.forEach((r, i) => {
  console.log(`--- ${i+1}. ${r['Company Name']} ---`);
  console.log(r['Improved Outreach Message']);
  console.log();
});

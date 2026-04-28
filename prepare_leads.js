const fs = require('fs');
const path = require('path');

// ── CSV parser (handles quoted fields with commas inside) ──────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || '').trim(); });
    return obj;
  });
}

function parseLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === ',' && !inQuote) {
      result.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

// ── CSV serialiser ─────────────────────────────────────────────────────────
function toCSV(rows, columns) {
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const header = columns.map(escape).join(',');
  const body = rows.map(r => columns.map(c => escape(r[c] || '')).join(','));
  return [header, ...body].join('\n');
}

// ── German outreach messages ───────────────────────────────────────────────
function buildMessage(row, tier) {
  const name = row['Company Name'];
  const city = row['City'] ? ` in ${row['City']}` : '';

  const openers = [
    `Hallo, wir haben Ihr Unternehmen ${name}${city} entdeckt`,
    `Guten Tag, wir sind auf ${name}${city} aufmerksam geworden`,
    `Hallo, wir haben ${name}${city} in unserer Recherche gefunden`,
  ];
  const opener = openers[Math.abs(hashStr(name)) % openers.length];

  if (tier === 1) {
    return `${opener} und möchten kurz vorstellen, womit wir Handwerksbetrieben wie Ihrem helfen: Wir entwickeln ein automatisiertes System, das Interessenten anschreibt, nachfasst, vorqualifiziert und Termine direkt in Ihren Kalender bucht – ohne zusätzlichen Aufwand für Sie. Wäre ein kurzes Gespräch dazu interessant?`;
  }
  if (tier === 2) {
    return `${opener} und wollten Sie kurz auf etwas aufmerksam machen: Viele Dachdecker-Betriebe verlieren täglich potenzielle Aufträge, weil Anfragen nicht schnell genug bearbeitet werden. Unser System kontaktiert Interessenten automatisch, qualifiziert sie vor und bucht Termine – damit Sie sich nur noch um die wirklich relevanten Aufträge kümmern müssen. Darf ich Ihnen kurz erklären, wie das konkret funktioniert?`;
  }
  return `${opener} und möchten Ihnen zeigen, wie andere Dachdeckerbetriebe mit einem automatisierten Anfrage- und Terminbuchungssystem ihre Auslastung deutlich verbessert haben. Das System läuft vollständig im Hintergrund und sorgt dafür, dass keine Anfrage mehr verloren geht. Haben Sie kurz Zeit für ein Gespräch?`;
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

// ── Relevance check ────────────────────────────────────────────────────────
const DACHDECKER_KEYWORDS = [
  'dach', 'reet', 'ziegel', 'spengel', 'flach', 'steildach', 'bedachung',
  'bedachungs', 'dachbau', 'dachsanierung', 'dachreparatur', 'dachrinne',
  'schornstein', 'isolierung', 'dämm', 'abdichtung',
];

function isRelevant(row) {
  const name = (row['Company Name'] || '').toLowerCase();
  const cat  = (row['Category']     || '').toLowerCase();
  if (cat.includes('dach') || cat.includes('roofi')) return true;
  return DACHDECKER_KEYWORDS.some(kw => name.includes(kw));
}

function hasContact(row) {
  return (row['Website'] || '').trim() !== '' || (row['Phone'] || '').trim() !== '';
}

// ── Dedup key ─────────────────────────────────────────────────────────────
function dedupKey(row) {
  return [
    (row['Company Name'] || '').toLowerCase().trim(),
    (row['Phone']        || '').toLowerCase().trim(),
    (row['Website']      || '').toLowerCase().trim(),
  ].join('|');
}

// ── Tier logic (calibrated to actual data: all ratings 3.0–4.4, reviews <50)
//
// Tier 1 – BEST: highest potential for ScalePilot outreach
//   • Rating 3.5–4.3  (sweet spot: not so low they look unreliable, not so
//                       high they already have strong word-of-mouth)
//   • Reviews ≤ 10     (very few – most likely to be hungry for more leads)
//   • Has BOTH website AND phone (easiest to reach + research)
//
// Tier 2 – GOOD: slightly less ideal but still strong candidates
//   • Rating 3.0–4.4
//   • Reviews 11–30   (some traction but still growth-hungry)
//   • Has website OR phone
//   • Not already in Tier 1
//
// Tier 3 – ALL RELEVANT: remaining relevant leads with any contact info
//   • Relevant + has contact, not in Tier 1 or 2

// ── Main ──────────────────────────────────────────────────────────────────
const raw = fs.readFileSync(path.join(__dirname, 'clean_dachdecker_leads.csv'), 'utf8');
const leads = parseCSV(raw);

// Deduplicate
const seen = new Set();
const unique = leads.filter(r => {
  const k = dedupKey(r);
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

console.log(`Total rows: ${leads.length}  |  After dedup: ${unique.length}`);

const tier1 = [], tier2 = [], tier3 = [];
const inTier1 = new Set();
const inTier2 = new Set();

const hasBothContacts = r =>
  (r['Website'] || '').trim() !== '' && (r['Phone'] || '').trim() !== '';

// Tier 1
for (const r of unique) {
  const rating  = parseFloat(r['Rating']  || '0');
  const reviews = parseInt(r['Reviews'] || '0', 10);
  if (
    isRelevant(r) &&
    hasBothContacts(r) &&
    rating >= 3.5 && rating <= 4.3 &&
    reviews <= 10
  ) {
    const row = { ...r, Tier: '1', Reason: `Rating ${rating}, nur ${reviews} Bewertung(en) – idealer Kandidat für Neukundengewinnung`, 'Outreach Message': buildMessage(r, 1) };
    tier1.push(row);
    inTier1.add(dedupKey(r));
  }
}

// Tier 2
for (const r of unique) {
  if (inTier1.has(dedupKey(r))) continue;
  const rating  = parseFloat(r['Rating']  || '0');
  const reviews = parseInt(r['Reviews'] || '0', 10);
  if (
    isRelevant(r) &&
    hasContact(r) &&
    rating >= 3.0 && rating <= 4.4 &&
    reviews >= 11 && reviews <= 30
  ) {
    const row = { ...r, Tier: '2', Reason: `Rating ${rating}, ${reviews} Bewertungen – guter Lead mit Wachstumspotenzial`, 'Outreach Message': buildMessage(r, 2) };
    tier2.push(row);
    inTier2.add(dedupKey(r));
  }
}

// Tier 3
for (const r of unique) {
  if (inTier1.has(dedupKey(r)) || inTier2.has(dedupKey(r))) continue;
  if (isRelevant(r) && hasContact(r)) {
    const rating  = parseFloat(r['Rating']  || '0');
    const reviews = parseInt(r['Reviews'] || '0', 10);
    const row = { ...r, Tier: '3', Reason: `Rating ${rating}, ${reviews} Bewertungen – weiterer relevanter Lead`, 'Outreach Message': buildMessage(r, 3) };
    tier3.push(row);
  }
}

const COLUMNS = ['Company Name', 'Website', 'Phone', 'Rating', 'Reviews', 'City', 'Category', 'Tier', 'Reason', 'Outreach Message'];

fs.writeFileSync(path.join(__dirname, 'tier1_best_leads.csv'),      toCSV(tier1, COLUMNS), 'utf8');
fs.writeFileSync(path.join(__dirname, 'tier2_good_leads.csv'),      toCSV(tier2, COLUMNS), 'utf8');
fs.writeFileSync(path.join(__dirname, 'tier3_all_relevant_leads.csv'), toCSV(tier3, COLUMNS), 'utf8');

console.log('\n=== Results ===');
console.log(`Tier 1 (Best leads):     ${tier1.length} leads  → tier1_best_leads.csv`);
console.log(`Tier 2 (Good leads):     ${tier2.length} leads  → tier2_good_leads.csv`);
console.log(`Tier 3 (All relevant):   ${tier3.length} leads  → tier3_all_relevant_leads.csv`);
console.log(`Total exported:          ${tier1.length + tier2.length + tier3.length} leads`);

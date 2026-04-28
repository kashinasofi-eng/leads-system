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
    headers.forEach((h,i) => o[h.trim()] = (v[i]||'').trim());
    return o;
  });
}
function toCSV(rows, columns) {
  const e = v => `"${String(v).replace(/"/g, '""')}"`;
  return [columns.map(e).join(','), ...rows.map(r => columns.map(c => e(r[c]||'')).join(','))].join('\n');
}

// ── Enrichment data (website insight + angle + improved message) ───────────
// Source: user-supplied research table + company name signals
// Rules: 1 main service insight, optionally 1 detail (target OR positioning),
//        no lists, no "+" signs, 3-4 lines max, natural German.
const enrichment = [
  {
    name: 'Top Dachdecker Berlin',
    websiteInsight: 'Flachdach + Steildach; Komplettservice; Langjährige Erfahrung',
    personalizationAngle: 'Komplettservice rund ums Dach',
    improvedMessage: 'Mir ist aufgefallen, dass ihr einen Komplettservice rund ums Dach anbietet. Wir haben für Betriebe wie euren ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne zusätzlichen Aufwand für euch. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'reetdach-berlin®️',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Gewerbekunden; Langjährige Erfahrung',
    personalizationAngle: 'Dachsanierung, vor allem für Gewerbekunden',
    improvedMessage: 'Mir ist aufgefallen, dass ihr viel im Bereich Dachsanierung macht – vor allem für Gewerbekunden. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit keine Anfrage mehr verloren geht. Darf ich kurz erklären, wie das funktioniert?',
  },
  {
    name: 'Dachdeckerei-otay',
    websiteInsight: 'Flachdach + Dachsanierung; Gewerbekunden; Schnelle Umsetzung',
    personalizationAngle: 'Flachdacharbeiten, vor allem für Gewerbekunden',
    improvedMessage: 'Mir ist aufgefallen, dass ihr viel im Flachdachbereich unterwegs seid – vor allem für Gewerbekunden. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit ihr euch auf die richtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Dachdecker-Innung München-Oberbayern',
    websiteInsight: 'Reparatur/Notdienst + Abdichtung; Privat- und Gewerbekunden; Zertifizierter Betrieb',
    personalizationAngle: 'Zertifizierter Betrieb in der Region München-Oberbayern',
    improvedMessage: 'Mir ist aufgefallen, dass ihr als zertifizierter Betrieb in München-Oberbayern aktiv seid. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit ihr euch auf die Arbeit konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Die Dachexperten- Dachdeckerei-Meisterbetrieb Hamburg',
    websiteInsight: 'Flachdach + Dachsanierung; Gewerbekunden; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb mit Fokus auf Dachsanierung für Gewerbekunden',
    improvedMessage: 'Mir ist aufgefallen, dass ihr als Meisterbetrieb viel Dachsanierung macht – vor allem für Gewerbekunden. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, vorqualifiziert und Termine bucht, damit keine Anfrage mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Durchdacht Dachdeckerei Benjamin Brech',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb mit Fokus auf Sanierung',
    improvedMessage: 'Mir ist aufgefallen, dass ihr als Meisterbetrieb viel Sanierung macht. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne zusätzlichen Aufwand. Hätte Benjamin kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Zentralverband des Deutschen Dachdeckerhandwerks',
    websiteInsight: 'Photovoltaik/Solar + Fassade; Privat- und Gewerbekunden; Nachhaltigkeit/Energieeffizienz',
    personalizationAngle: 'Photovoltaik als wachsendes Thema im Portfolio',
    improvedMessage: 'Mir ist aufgefallen, dass ihr auch im Bereich Photovoltaik aktiv seid – ein Thema mit stark wachsender Nachfrage. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, qualifiziert und Termine bucht, damit kein Interessent mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Dach & Holzbau STECK',
    websiteInsight: 'Holzbau kombiniert mit Dacharbeiten',
    personalizationAngle: 'Kombination aus Dach und Holzbau',
    improvedMessage: 'Mir ist aufgefallen, dass ihr Dach und Holzbau kombiniert. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit ihr euch auf die eigentliche Arbeit konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Kurt Philipp Bedachungen GmbH',
    websiteInsight: 'Reparatur/Notdienst + Fassadenarbeiten',
    personalizationAngle: 'Fassadenarbeiten neben klassischen Bedachungen',
    improvedMessage: 'Mir ist aufgefallen, dass ihr neben Bedachungen auch Fassadenarbeiten macht. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst und Termine bucht, damit kein Auftrag mehr verloren geht. Hätten Sie kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Fuss und Gartenschläger Flachdachbau GmbH',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf Flachdach-Spezialisierung hin',
    personalizationAngle: 'Flachdachspezialisierung (aus Firmenname)',
    improvedMessage: 'Mir ist aufgefallen, dass ihr euch auf Flachdachbau spezialisiert habt. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit keine Anfrage mehr unbeantwortet bleibt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Pauli Bedachungen',
    websiteInsight: 'Keine klare Website-Info gefunden',
    personalizationAngle: 'Regionaler Handwerksbetrieb in Walsdorf',
    improvedMessage: 'Guten Tag, wir sind auf Pauli Bedachungen in Walsdorf aufmerksam geworden. Wir entwickeln für Handwerksbetriebe ein System, das Anfragen automatisch nachfasst und Termine direkt bucht – damit kein Auftrag mehr durch die Finger geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Bauspenglerei Dachdeckerei Johannes Karl - Trunstadt',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf kombinierte Spenglerei und Dachdeckerei hin',
    personalizationAngle: 'Kombination aus Spenglerei und Dachdeckerei',
    improvedMessage: 'Mir ist aufgefallen, dass ihr Spenglerei und Dachdeckerei kombiniert. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit kein Auftrag mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Oliver Frank Zimmerei und Dachdeckerei',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf kombinierte Zimmerei und Dachdeckerei hin',
    personalizationAngle: 'Zimmerei und Dachdeckerei unter einem Dach',
    improvedMessage: 'Mir ist aufgefallen, dass ihr Zimmerei und Dachdeckerei unter einem Dach anbietet. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, vorqualifiziert und Termine bucht – damit Oliver sich auf die eigentliche Arbeit konzentrieren kann. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'TD Dachtechnik GmbH',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf technisch orientierte Dacharbeiten hin',
    personalizationAngle: 'Technisch orientierte Dacharbeiten',
    improvedMessage: 'Mir ist aufgefallen, dass ihr euch auf technische Dacharbeiten spezialisiert habt. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne manuellen Aufwand. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'LG Dachdecker Essen',
    websiteInsight: 'Allgemeine Dacharbeiten; Öffentliche Auftraggeber',
    personalizationAngle: 'Arbeitet auch für öffentliche Auftraggeber',
    improvedMessage: 'Mir ist aufgefallen, dass ihr auch für öffentliche Auftraggeber arbeitet – das zeigt, dass ihr professionell aufgestellt seid. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet und Termine bucht, damit ihr euch auf die wichtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Hackmann Bedachung',
    websiteInsight: 'Flachdach + Steildach; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb in Wülfrath',
    improvedMessage: 'Mir ist aufgefallen, dass ihr als Meisterbetrieb in Wülfrath aktiv seid. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit ihr euch auf die richtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Brentrup Dachbau GmbH',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Gewerbekunden; Meisterbetrieb',
    personalizationAngle: 'Dachsanierung, vor allem für Gewerbekunden',
    improvedMessage: 'Mir ist aufgefallen, dass ihr viel Dachsanierung macht – vor allem für Gewerbekunden. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht, damit kein Auftrag mehr verloren geht. Darf ich kurz erklären, wie das funktioniert?',
  },
  {
    name: 'Dachdecker Kayser GmbH',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Nachhaltigkeit/Energieeffizienz',
    personalizationAngle: 'Dachsanierung mit Fokus auf Nachhaltigkeit',
    improvedMessage: 'Mir ist aufgefallen, dass ihr viel Dachsanierung macht – mit einem klaren Fokus auf Nachhaltigkeit. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit kein Interessent verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Leonhard Bock GmbH',
    websiteInsight: 'Flachdach + Steildach; Meisterbetrieb + Zertifizierter Betrieb',
    personalizationAngle: 'Meisterbetrieb im Ruhrgebiet',
    improvedMessage: 'Mir ist aufgefallen, dass ihr als Meisterbetrieb im Ruhrgebiet aktiv seid. Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – ohne zusätzlichen Aufwand. Hätten Sie kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Thiele GmbH, Dach- und Schornsteintechnik',
    websiteInsight: 'Abdichtung; Gewerbekunden',
    personalizationAngle: 'Abdichtungsarbeiten für Gewerbekunden',
    improvedMessage: 'Mir ist aufgefallen, dass ihr viel im Bereich Abdichtung macht – vor allem für Gewerbekunden. Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit kein Auftrag mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
];

// ── Load first 20 tier1 leads ─────────────────────────────────────────────
const raw = fs.readFileSync(path.join(__dirname, 'tier1_best_leads.csv'), 'utf8');
const tier1 = parseCSV(raw).slice(0, 20);

// ── Merge enrichment ──────────────────────────────────────────────────────
const enrichMap = {};
enrichment.forEach(e => { enrichMap[e.name] = e; });

const output = tier1.map(row => {
  const e = enrichMap[row['Company Name']] || {};
  return {
    ...row,
    'Website Insight':        e.websiteInsight        || 'Keine klare Website-Info gefunden',
    'Personalization Angle':  e.personalizationAngle  || '',
    'Improved Outreach Message': e.improvedMessage    || row['Outreach Message'],
  };
});

const COLUMNS = [
  'Company Name', 'Website', 'Phone', 'Rating', 'Reviews', 'City', 'Category',
  'Tier', 'Reason', 'Website Insight', 'Personalization Angle', 'Improved Outreach Message',
];

fs.writeFileSync(path.join(__dirname, 'deep_personalization_test.csv'), toCSV(output, COLUMNS), 'utf8');
console.log(`Saved deep_personalization_test.csv with ${output.length} rows.`);
output.forEach((r, i) => {
  console.log(`\n${i+1}. ${r['Company Name']}`);
  console.log(`   Angle: ${r['Personalization Angle']}`);
  console.log(`   Msg:   ${r['Improved Outreach Message']}`);
});

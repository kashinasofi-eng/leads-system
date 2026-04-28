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
    improvedMessage: 'Hey, ihr macht doch alles rund ums Dach, oder? Wir haben für solche Betriebe ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne zusätzlichen Aufwand. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'reetdach-berlin®️',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Gewerbekunden; Langjährige Erfahrung',
    personalizationAngle: 'Dachsanierung, vor allem für Gewerbekunden',
    improvedMessage: 'Ihr macht hauptsächlich Sanierungen für Gewerbe, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit keine Anfrage mehr verloren geht. Darf ich kurz erklären, wie das funktioniert?',
  },
  {
    name: 'Dachdeckerei-otay',
    websiteInsight: 'Flachdach + Dachsanierung; Gewerbekunden; Schnelle Umsetzung',
    personalizationAngle: 'Flachdacharbeiten, vor allem für Gewerbekunden',
    improvedMessage: 'Macht ihr viel Flachdach – auch für Gewerbe? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht, damit ihr euch auf die richtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Dachdecker-Innung München-Oberbayern',
    websiteInsight: 'Reparatur/Notdienst + Abdichtung; Privat- und Gewerbekunden; Zertifizierter Betrieb',
    personalizationAngle: 'Zertifizierter Betrieb in der Region München-Oberbayern',
    improvedMessage: 'Ihr seid in München-Oberbayern aktiv, oder? Wir helfen Handwerksbetrieben, Anfragen automatisch nachzufassen und Termine zu buchen – damit keine Anfrage mehr unbeantwortet bleibt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Die Dachexperten- Dachdeckerei-Meisterbetrieb Hamburg',
    websiteInsight: 'Flachdach + Dachsanierung; Gewerbekunden; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb mit Fokus auf Dachsanierung für Gewerbekunden',
    improvedMessage: 'Ihr macht viel Sanierung für Gewerbe, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, vorqualifiziert und Termine bucht – damit keine Anfrage mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Durchdacht Dachdeckerei Benjamin Brech',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb mit Fokus auf Sanierung',
    improvedMessage: 'Hey Benjamin, macht ihr hauptsächlich Sanierungen? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne zusätzlichen Aufwand. Hast du kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Zentralverband des Deutschen Dachdeckerhandwerks',
    websiteInsight: 'Photovoltaik/Solar + Fassade; Privat- und Gewerbekunden; Nachhaltigkeit/Energieeffizienz',
    personalizationAngle: 'Photovoltaik als wachsendes Thema im Portfolio',
    improvedMessage: 'Macht ihr auch Solar – neben dem normalen Dach? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, qualifiziert und Termine bucht – damit kein Interessent mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Dach & Holzbau STECK',
    websiteInsight: 'Holzbau kombiniert mit Dacharbeiten',
    personalizationAngle: 'Kombination aus Dach und Holzbau',
    improvedMessage: 'Ihr macht Dach und Holzbau zusammen, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit ihr euch auf die eigentliche Arbeit konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Kurt Philipp Bedachungen GmbH',
    websiteInsight: 'Reparatur/Notdienst + Fassadenarbeiten',
    personalizationAngle: 'Fassadenarbeiten neben klassischen Bedachungen',
    improvedMessage: 'Macht ihr auch Fassaden – neben den Dächern? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst und Termine bucht – damit kein Auftrag mehr verloren geht. Hätten Sie kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Fuss und Gartenschläger Flachdachbau GmbH',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf Flachdach-Spezialisierung hin',
    personalizationAngle: 'Flachdachspezialisierung (aus Firmenname)',
    improvedMessage: 'Ihr macht hauptsächlich Flachdach, oder? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit keine Anfrage mehr unbeantwortet bleibt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Pauli Bedachungen',
    websiteInsight: 'Keine klare Website-Info gefunden',
    personalizationAngle: 'Regionaler Handwerksbetrieb in Walsdorf',
    improvedMessage: 'Ihr seid lokal in Walsdorf unterwegs, oder? Wir entwickeln für Handwerksbetriebe ein System, das Anfragen automatisch nachfasst und Termine direkt bucht – damit kein Auftrag mehr durch die Finger geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Bauspenglerei Dachdeckerei Johannes Karl - Trunstadt',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf kombinierte Spenglerei und Dachdeckerei hin',
    personalizationAngle: 'Kombination aus Spenglerei und Dachdeckerei',
    improvedMessage: 'Ihr macht Spenglerei und Dachdeckerei zusammen, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit kein Auftrag mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Oliver Frank Zimmerei und Dachdeckerei',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf kombinierte Zimmerei und Dachdeckerei hin',
    personalizationAngle: 'Zimmerei und Dachdeckerei unter einem Dach',
    improvedMessage: 'Hey Oliver, ihr macht Zimmerei und Dachdeckerei zusammen, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, vorqualifiziert und Termine bucht – damit du dich auf die eigentliche Arbeit konzentrieren kannst. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'TD Dachtechnik GmbH',
    websiteInsight: 'Keine klare Website-Info gefunden – Firmenname deutet auf technisch orientierte Dacharbeiten hin',
    personalizationAngle: 'Technisch orientierte Dacharbeiten',
    improvedMessage: 'Ihr habt euch auf Dachtechnik spezialisiert, oder? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine direkt bucht – ohne manuellen Aufwand. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'LG Dachdecker Essen',
    websiteInsight: 'Allgemeine Dacharbeiten; Öffentliche Auftraggeber',
    personalizationAngle: 'Arbeitet auch für öffentliche Auftraggeber',
    improvedMessage: 'Ihr arbeitet auch für die öffentliche Hand, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet und Termine bucht – damit ihr euch auf die wichtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Hackmann Bedachung',
    websiteInsight: 'Flachdach + Steildach; Meisterbetrieb',
    personalizationAngle: 'Meisterbetrieb in Wülfrath',
    improvedMessage: 'Ihr seid Meisterbetrieb in Wülfrath? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit ihr euch auf die richtigen Aufträge konzentrieren könnt. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Brentrup Dachbau GmbH',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Gewerbekunden; Meisterbetrieb',
    personalizationAngle: 'Dachsanierung, vor allem für Gewerbekunden',
    improvedMessage: 'Ihr macht viel Sanierung – auch für Gewerbe, oder? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – damit kein Auftrag mehr verloren geht. Darf ich kurz erklären, wie das funktioniert?',
  },
  {
    name: 'Dachdecker Kayser GmbH',
    websiteInsight: 'Dachsanierung + Reparatur/Notdienst; Nachhaltigkeit/Energieeffizienz',
    personalizationAngle: 'Dachsanierung mit Fokus auf Nachhaltigkeit',
    improvedMessage: 'Macht ihr auch energieeffiziente Sanierungen? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit kein Interessent verloren geht. Wäre ein kurzes Gespräch interessant?',
  },
  {
    name: 'Leonhard Bock GmbH',
    websiteInsight: 'Flachdach + Steildach; Meisterbetrieb + Zertifizierter Betrieb',
    personalizationAngle: 'Meisterbetrieb im Ruhrgebiet',
    improvedMessage: 'Ihr arbeitet hauptsächlich im Ruhrgebiet, oder? Wir haben ein System entwickelt, das Anfragen automatisch nachfasst, vorqualifiziert und Termine bucht – ohne zusätzlichen Aufwand. Hätten Sie kurz Zeit für ein Gespräch?',
  },
  {
    name: 'Thiele GmbH, Dach- und Schornsteintechnik',
    websiteInsight: 'Abdichtung; Gewerbekunden',
    personalizationAngle: 'Abdichtungsarbeiten für Gewerbekunden',
    improvedMessage: 'Ihr macht viel Abdichtung – auch für Gewerbe, oder? Wir haben ein System entwickelt, das Anfragen automatisch bearbeitet, nachfasst und Termine bucht – damit kein Auftrag mehr verloren geht. Wäre ein kurzes Gespräch interessant?',
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

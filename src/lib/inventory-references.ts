// Split the inventory's free-text “Lien du site ou référence de l'ouvrage”
// cell into one entry per link, keeping the contributor's labels and any
// bibliographic text.

export type InventoryReference =
  | { kind: "link"; url: string; label: string; source: string }
  | { kind: "text"; text: string };

const URL_PATTERN = /https?:\/\/[^\s<>"]+/gi;

const KNOWN_SOURCES: { pattern: RegExp; name: string }[] = [
  { pattern: /^fiches-risques\.brgm\.fr\/georisques\/casias\//, name: "Fiche CASIAS (BRGM)" },
  { pattern: /^fiches-risques\.brgm\.fr\/georisques\/infosols\//, name: "Fiche InfoSols (BRGM)" },
  { pattern: /^georisques\.gouv\.fr\/risques\/installations\//, name: "Installation classée (Géorisques)" },
  { pattern: /^georisques\.gouv\.fr\/risques\/registre-des-emissions-polluantes\//, name: "Registre des émissions (Géorisques)" },
  { pattern: /^assainissement\.developpement-durable\.gouv\.fr\//, name: "Portail de l’assainissement" },
  { pattern: /^auvergne-rhone-alpes\.developpement-durable\.gouv\.fr\//, name: "DREAL Auvergne-Rhône-Alpes" },
  { pattern: /^atmo-auvergnerhonealpes\.fr\//, name: "Atmo Auvergne-Rhône-Alpes" },
];

function sourceName(url: string): string {
  let host: string;
  let path: string;
  try {
    const parsed = new URL(url);
    host = parsed.hostname.replace(/^www\./, "");
    path = `${host}${parsed.pathname}`;
  } catch {
    return url;
  }
  return KNOWN_SOURCES.find(({ pattern }) => pattern.test(path))?.name ?? host;
}

function cleanLabel(text: string): string {
  return text.trim().replace(/\s*:$/, "").trim();
}

export function parseInventoryReferences(value: string): InventoryReference[] {
  const references: InventoryReference[] = [];
  // A label (“Cartes des nuisances sonores :”) names the links that follow it
  // until the next blank line or label.
  let label = "";

  for (const rawLine of value.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      label = "";
      continue;
    }

    const matches = [...line.matchAll(URL_PATTERN)];
    if (matches.length === 0) {
      if (line.endsWith(":")) label = cleanLabel(line);
      else references.push({ kind: "text", text: line });
      continue;
    }

    const lead = cleanLabel(line.slice(0, matches[0].index));
    if (lead) label = lead;

    matches.forEach((match, index) => {
      // Sentence punctuation directly after a link is not part of it.
      const url = match[0].replace(/[).,;]+$/, "");
      references.push({ kind: "link", url, label, source: sourceName(url) });

      const end = (match.index ?? 0) + match[0].length;
      const next = matches[index + 1]?.index ?? line.length;
      const between = cleanLabel(line.slice(end, next).replace(/^[\s).,;]+/, ""));
      if (between) {
        if (index + 1 < matches.length) label = between;
        else references.push({ kind: "text", text: between });
      }
    });
  }

  return references;
}

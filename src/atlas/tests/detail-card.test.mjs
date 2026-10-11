import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render the actual TSX primitives without requiring a Next/CSS build.
const require = createRequire(import.meta.url);
function componentModule(file) {
  return sourceModule(new URL(`../components/${file}.tsx`, import.meta.url));
}
function sourceModule(url) {
  const source = readFileSync(url, "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true } });
  const exports = {};
  const localRequire = name => {
    if (name.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name.startsWith("./") || name.startsWith("@/")) {
      const base = name.startsWith("@/") ? new URL(`../../${name.slice(2)}`, import.meta.url) : new URL(name, url);
      return sourceModule(new URL(base.href + (existsSync(new URL(base.href + ".tsx")) ? ".tsx" : ".ts")));
    }
    return require(name);
  };
  new Function("require", "exports", outputText)(localRequire, exports);
  return exports;
}
const { DetailData, DetailHeadline, DetailTable, DetailGauges, DetailStats } = componentModule("DetailCard");
const { DetailFacts } = componentModule("AtlasDetailDialog");
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const Inventory = componentModule("AtlasInventoryDetails").default;
const site = {
  id: "S-test", name: "Site", commune: "Passy", sector: "Industrie",
  activityStatus: "Actuelle", activityPeriod: "Actuelle depuis 1898", activity: "Description intégrale\nDeuxième ligne",
  emissionTiming: "Continue", localizationType: "Localisée", localizationDetail: "Site industriel",
  knowledgeLevel: "Bon\nJustification publiée", risk: "Risque déclaré < sans interprétation",
  link: "https://annuaire-entreprises.data.gouv.fr/entreprise/site-123456789",
  coordinates: { lat: 45.9, lng: 6.7 },
  pollutions: [{ environmentalCompartment: "Air", process: "Cuisson", chemicalFamilies: "HAP", chemicalForm: "Gazeuse", transferPathway: "Cheminée", receivingEnvironments: "Vallée" }],
};
const emissions = { year: 2024, fetchedAt: "2026-10-11", downloadUrl: "https://files.georisques.fr/irep/2024.zip", facilities: [{
  id: "test", name: "Établissement", siret: "12345678900001", commune: "Passy", communeCode: "74208",
  emissions: [
    { medium: "Air", pollutant: "SO₂", quantity: 0, unit: "kg/an" },
    { medium: "Air", pollutant: "HAP", quantity: "< seuil", unit: "kg/an" },
    { medium: "Eau (direct)", pollutant: "HAP", quantity: 0.00001, unit: "kg/an" },
  ],
}] };

test("inventory shows full description, risk and emission rows before collapsed IREP", () => {
  const html = render(Inventory, { site, emissions });
  const main = html.slice(0, html.indexOf("<details"));
  for (const text of ["Description intégrale", "Deuxième ligne", "Justification publiée", "Risque déclaré &lt;", "Cuisson", "HAP", "Gazeuse", "Cheminée → Vallée"]) assert.ok(main.includes(text), text);
  assert.match(html, /background:#9932CC/);
  assert.match(html, /2 milieux · 2 polluants/);
  assert.match(html, /12345678900001/);
  assert.match(html, /0\*/);
  assert.match(html, /0,00001/);
  assert.match(html, /&lt; seuil/);
  assert.match(html, /donnée inexacte ou indisponible/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
  assert.equal((html.match(/<details/g) ?? []).length, 1);
  const disclosure = html.slice(html.indexOf("<details"), html.indexOf("</details>"));
  assert.doesNotMatch(disclosure, /Référence de l’inventaire|Ouvrir la fiche/);
  const afterDisclosure = html.slice(html.indexOf("</details>"));
  assert.match(afterDisclosure, /Référence de l’inventaire/);
  assert.doesNotMatch(html, /Ouvrir la fiche/);
  assert.equal((html.match(/Référence de l’inventaire/g) ?? []).length, 1);
});
test("inventory without a match or risk keeps links without an empty disclosure", () => {
  const html = render(Inventory, { site: { ...site, risk: " ", link: "Référence imprimée", pollutions: [] }, emissions });
  assert.doesNotMatch(html, /<details|inventoryRisk|data-industrial-emissions/);
  assert.match(html, /Référence imprimée/);
  assert.doesNotMatch(html, /Ouvrir la fiche/);
  assert.match(html, /Aucune description/);
});

test("standalone inventory supports unmapped records without an emissions dataset", () => {
  const { coordinates, ...unmappedSite } = site;
  assert.ok(coordinates);
  const html = render(Inventory, { site: unmappedSite });
  assert.match(html, /Description intégrale/);
  assert.match(html, /Risque déclaré &lt;/);
  assert.match(html, /Référence de l’inventaire/);
  assert.doesNotMatch(html, /<details|data-industrial-emissions|Données IREP récupérées/);
});

test("all compartments use icons with readable labels outside the badges", () => {
  const labels = ["Air", "Eau", "Sol", "Sols", "Odeur", "Bruit", "Nuisance paysagère", "Sous-sol", ""];
  const html = render(Inventory, { site: { ...site, pollutions: labels.map(environmentalCompartment => ({ ...site.pollutions[0], environmentalCompartment })) } });
  const badges = [...html.matchAll(/<span class="compartmentTag"[^>]*>(.*?)<\/span>/g)].map(match => match[1]);
  assert.equal(badges.length, labels.length);
  for (const badge of badges) assert.match(badge, /<svg/);
  for (const label of labels) assert.ok(html.includes(`class="compartmentLabel">${label || "Compartiment non renseigné"}</p>`));
});

test("all-data disclosure is collapsed but retains its content", () => {
  const html = render(DetailData, { hint: "Historique", children: "Résultats complets" });
  assert.match(html, /Toutes les données/);
  assert.match(html, /Résultats complets/);
  assert.doesNotMatch(html, /<details[^>]*\sopen/);
});
test("facts and summary tiles retain zero, qualifiers and missing values", () => {
  const html = render(DetailFacts, { items: [{ label: "Zéro publié", value: 0 }, { label: "Absent", value: null }] });
  assert.match(html, /<dd>0<\/dd>/);
  assert.match(html, /Non renseigné/);
  assert.match(render(DetailStats, { items: [{ label: "E. coli", value: "<15", unit: "/100 mL" }] }), /&lt;15/);
});
test("neutral summary does not manufacture a quality class or divide by zero", () => {
  const html = render(DetailHeadline, { title: "Aucune donnée", subtitle: "Aucun score", count: { value: 0, total: 0 } });
  assert.doesNotMatch(html, /NaN|Infinity/);
  assert.match(html, /#cbd5e1/);
  assert.match(render(DetailHeadline, { title: "Inventaire", subtitle: "Statut publié" }), /#e2e8f0/);
});
test("gauges use existing class boundaries and omit a marker for missing values", () => {
  const bands = [{ max: 10, color: "#fff", label: "< 10" }, { max: Infinity, color: "#000", label: "≥ 10" }];
  const html = render(DetailGauges, { label: "Classes de quantité", bands, rows: [{ label: "Zéro", value: 0, text: "0 kg" }, { label: "Limite", value: 10, text: "10 kg" }, { label: "Absent", value: null, text: "Non disponible" }] });
  assert.match(html, /left:25%/);
  assert.match(html, /left:75%/);
  assert.equal((html.match(/<i style="left:/g) ?? []).length, 2);
});
test("full data tables retain published qualifiers, dates and validation codes", () => {
  const html = render(DetailTable, { caption: "Analyses", headers: ["Date", "Valeur", "Statut"], rows: [["26/11/2024", "< 0,005 µg/L", "Correcte · Brute"], ["27/11/2024", 0, null]] });
  assert.match(html, /26\/11\/2024/);
  assert.match(html, /&lt; 0,005 µg\/L/);
  assert.match(html, /Correcte · Brute/);
  assert.match(html, /<td>0<\/td>/);
  assert.match(html, /Non renseigné/);
});

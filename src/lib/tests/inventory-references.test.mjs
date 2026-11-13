import test from "node:test";
import assert from "node:assert/strict";
import { parseInventoryReferences } from "../inventory-references.ts";

test("one entry per link, named after its source", () => {
  const refs = parseInventoryReferences(
    "https://fiches-risques.brgm.fr/georisques/casias/SSP4081065\n\n" +
    "https://www.georisques.gouv.fr/risques/installations/donnees/details/0010800463 \n\n" +
    "https://mesures-environnementales.suez.fr/",
  );

  assert.deepEqual(refs, [
    { kind: "link", url: "https://fiches-risques.brgm.fr/georisques/casias/SSP4081065", label: "", source: "Fiche CASIAS (BRGM)" },
    { kind: "link", url: "https://www.georisques.gouv.fr/risques/installations/donnees/details/0010800463", label: "", source: "Installation classée (Géorisques)" },
    { kind: "link", url: "https://mesures-environnementales.suez.fr/", label: "", source: "mesures-environnementales.suez.fr" },
  ]);
});

test("a label names the links that follow it until a blank line", () => {
  const refs = parseInventoryReferences(
    "Cartes des nuisances sonores : https://www.haute-savoie.gouv.fr/bruit\nhttps://www.orhane.fr/\n\n" +
    "https://example.org/sans-titre\n\n" +
    "Salage des routes :\nhttps://example.org/salage.pdf",
  );

  assert.deepEqual(refs.map(({ label, url }) => [label, url]), [
    ["Cartes des nuisances sonores", "https://www.haute-savoie.gouv.fr/bruit"],
    ["Cartes des nuisances sonores", "https://www.orhane.fr/"],
    ["", "https://example.org/sans-titre"],
    ["Salage des routes", "https://example.org/salage.pdf"],
  ]);
});

test("bibliographic text is kept as text", () => {
  const refs = parseInventoryReferences(
    "Questionnaire participatif de l'IECPMB\n\nEtude INGEOS : https://example.org/ingeos.pdf, consultée en 2026",
  );

  assert.deepEqual(refs, [
    { kind: "text", text: "Questionnaire participatif de l'IECPMB" },
    { kind: "link", url: "https://example.org/ingeos.pdf", label: "Etude INGEOS", source: "example.org" },
    { kind: "text", text: "consultée en 2026" },
  ]);
});

test("an empty cell has no references", () => {
  assert.deepEqual(parseInventoryReferences(""), []);
  assert.deepEqual(parseInventoryReferences("  \n "), []);
});

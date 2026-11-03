import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPollutionSites } from "../google-sheets.ts";

const headers = [
  "Source",
  "Identification",
  "Commune",
  "Latitude",
  "Longitude",
  "Activité",
  "Secteur d'activité",
  "Activité actuelle/passée",
  "Temporalité de l'émission",
  "Source localisée ou diffuse",
  "Niveau de connaissance",
  "Processus d'émission",
  "Famille(s) chimique(s) de/des polluant(s) identifié(s)",
  "Forme physico-chimique",
  "Compartiment environnemental d'émission (eau,air,sol) et nuisance",
  "Voie de transfert",
  "Milieu(x) récepteur(s)",
  "Risque associé",
  "Lien du site ou référence de l'ouvrage",
];

const row = (values) => ({ c: values.map((v) => v === null ? null : { v }) });
const response = (rows, cols = []) => new Response(
  `/*O_o*/\ngoogle.visualization.Query.setResponse(${JSON.stringify({
    status: "ok",
    table: { cols, rows },
  })});`,
  { headers: { date: "Tue, 03 Nov 2026 10:00:00 GMT" } },
);

test("inventory loads when Google would infer the source rows as headers", async (t) => {
  const rows = [
    row(["INFORMATIONS SUR LA SOURCE"]),
    row(headers),
    row([
      "S001", "Source de test", "PASSY", "45.92", "6.72",
      "Collecte", "Gestion des déchets et effluents", "Actuelle", "Continue",
      "Localisée", "Confirmée", "Combustion", "CO₂", "Gaz", "Air",
      "Dispersion", "Air", "/", "https://example.com/source",
    ]),
    row([
      null, null, null, null, null, null, null, null, null, null, null,
      "Ruissellement", "Hydrocarbures", "Liquide", "Eau", "Infiltration", "Sol",
    ]),
    row(["S002", "Source diffuse de test", "PASSY", "/", "/"]),
  ];
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    assert.equal(url.searchParams.get("gid"), "0");
    // The live sheet's automatic inference consumes the header and source rows
    // into column labels. Explicit headers=0 preserves them as ordinary rows.
    return url.searchParams.get("headers") === "0"
      ? response(rows)
      : response([], [{ id: "A", type: "string", label: "INFORMATIONS SUR LA SOURCE Source S001 S002" }]);
  });

  const result = await fetchAllPollutionSites();

  assert.equal(result.sites.length, 1);
  assert.equal(result.unmappedSites.length, 1);
  assert.equal(result.lastUpdated, "2026-11-03T10:00:00.000Z");
  assert.equal(result.sites[0].id, "S001");
  assert.equal(result.sites[0].name, "Source de test");
  assert.deepEqual(result.sites[0].coordinates, { lat: 45.92, lng: 6.72 });
  assert.deepEqual(result.sites[0].pollutions.map(({ process }) => process), [
    "Combustion", "Ruissellement",
  ]);
  assert.equal(result.unmappedSites[0].id, "S002");
  assert.equal(result.unmappedSites[0].coordinates, null);
});

test("inventory still rejects a sheet missing a required column", async (t) => {
  t.mock.method(globalThis, "fetch", async () => response([
    row(headers.filter((header) => header !== "Latitude")),
  ]));

  await assert.rejects(fetchAllPollutionSites, /Missing Google Sheets column: Latitude/);
});

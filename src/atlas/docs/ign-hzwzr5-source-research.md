# Info PFAS: provenance, access and reuse checks

Checked 23 October 2026. Research only; no importer or website changes.

## What the map is

The requested [Ma carte page](https://macarte.ign.fr/carte/HzWzr5/) is **Info PFAS**. Its public [story configuration](https://macarte.ign.fr/api/maps/HzWzr5/file) embeds map `Lp5yEM` and advertises updates on the first day of each month. IGN supplies the viewer and Plan IGN background; the thematic service is hosted by BRGM, not IGN. The [embedded map configuration](https://macarte.ign.fr/api/maps/Lp5yEM/file) gives this mapping:

| Display category | WFS feature type | Named upstream source |
| --- | --- | --- |
| Industrial surveillance | `POINTS_ICPE` | GIDAF |
| Distributed drinking water | `POINTS_EAU_DISTRIBUEE` | SISE-Eaux |
| Surface water | `POINTS_OSUP` | Naïades |
| Groundwater | `POINTS_OSOUT` | ADES |

The same configuration sets category-specific symbols and colours, with no conditional concentration styling: the colours are **not pollution severity grades**. Popup fields include surveillance type, point/site identifier, commune, analysis count and date range, number of PFAS searched, and quantified-analysis summaries. All four thematic layers have empty copyright fields. [Configuration](https://macarte.ign.fr/api/maps/Lp5yEM/file).

## Technical access

The public BRGM service is `https://mapsref.brgm.fr/wxs/pfas/pfas`. Its [WFS capabilities](https://mapsref.brgm.fr/wxs/pfas/pfas?service=WFS&version=2.0.0&request=GetCapabilities) advertise WFS 1.0/1.1/2.0, JSON/GeoJSON and CSV, paging, the four point feature types above, a combined `POINTS_PAR_TYPE_DE_SURVEILLANCE`, and `ANALYSES`. The live capabilities were retrieved without credentials. They specify `AccessConstraints=None`, but `Fees=conditions unknown` and blank metadata URLs; this is not an explicit dataset licence.

Each popup links to CSV using the following observed template, with the point identifier URL-encoded:

```text
https://mapsref.brgm.fr/wxs/pfas/pfas?service=wfs&version=2.0.0&request=getfeature&typename=ANALYSES&outputformat=csv&point=<identifiant_point>
```

This is an actual download link in the map, not a guessed API. [Popup configuration](https://macarte.ign.fr/api/maps/Lp5yEM/file). IGN also documents read-only `/api/maps/{view_id}` metadata and `/api/maps/{view_id}/file` configuration retrieval in its [official OpenAPI schema](https://github.com/IGNF-Ma-carte/macarte-api/blob/main/public/swagger/swagger.yaml).

## Interpretation limitations

The [ministry methodology](https://www.ecologie.gouv.fr/politiques-publiques/pfas-surveillance-letat-eaux-france), updated 7 October 2026 in the main investigation's live check (the search index initially returned a September version), describes 34 selected substances and data since 2016, not all PFAS or all historical surveillance. Measurements have heterogeneous validation levels and may contain input/measurement errors. It also mentions the ANSES 2023–2025 exploratory campaign as a fifth source; four map categories therefore do not imply only four underlying producers.

Coordinates have different precision: exact monitoring locations, industrial-site coordinates (about 75% of GIDAF points), commune centres for protected drinking-water captages, or the main commune centre for a distribution network. Do not label all markers as exact sampling sites or use proximity to infer which drinking-water network serves an address. [Ministry methodology](https://www.ecologie.gouv.fr/politiques-publiques/pfas-surveillance-letat-eaux-france).

The [editorial note](https://www.ecologie.gouv.fr/sites/default/files/documents/note_editoriale_outil_visualisation_PFAS.pdf) describes exported SANDRE qualification labels including correct, incorrect, uncertain and unqualified. Preserve these and detection/quantification qualifiers. Retrieval caveat: the search index exposed the note, but opening the PDF returned the ministry maintenance page during this check.

Implementation inference: presence of a marker means surveillance data exist, not that contamination was demonstrated; absence of quantification is not a zero concentration. Avoid applying drinking-water thresholds to river samples or industrial discharge by default.

## Pays du Mont-Blanc observations

The main investigation tested the service in the browser on the same day. It retrieved a regional bounding box (longitude 6.45–6.90, latitude 45.65–46.05, sent as EPSG:3857) then matched the returned commune names against the ten CCPMB communes. This is a commune-name membership check, not a full geometry intersection audit. [WFS service](https://mapsref.brgm.fr/wxs/pfas/pfas?service=WFS&version=2.0.0&request=GetCapabilities).

| Category | Returned local features | Distinct point identifiers | Reported analyses |
| --- | ---: | ---: | ---: |
| Surface water | 5 | 5 | 281 |
| Groundwater | 20 | 20 | 747 |
| Distributed water | 25 | 24 | 640 |

The distributed-water identifier `074000878` occurs under both Combloux and Demi-Quartier; its [CSV export](https://mapsref.brgm.fr/wxs/pfas/pfas?service=wfs&version=2.0.0&request=getfeature&typename=ANALYSES&outputformat=csv&point=074000878) also contains both. These counts are service observations, not independent-sample totals; avoid double-counting shared network results.

The industrial regional request returned HTTP 200 with an empty body, not an empty valid GeoJSON collection. A separate replay of the map's national request returned 5,367 features, with no CCPMB commune matches and no features in the regional bounding box. Therefore no local industrial surveillance points were found in that response; do not interpret the malformed regional response alone as proof of zero sites.

Verified CSV examples:

- [BSS001SGSB, Sallanches](https://mapsref.brgm.fr/wxs/pfas/pfas?service=wfs&version=2.0.0&request=getfeature&typename=ANALYSES&outputformat=csv&point=BSS001SGSB): point summary reports 33 PFAS and 367 analyses over 2017–2026; TFA result 0.92 µg/L on 21 May 2026.
- [06580009, Passy](https://mapsref.brgm.fr/wxs/pfas/pfas?service=wfs&version=2.0.0&request=getfeature&typename=ANALYSES&outputformat=csv&point=06580009): PFOS result 0.0019 µg/L on 7 November 2023.

Exports include surveillance type, point identifier, commune, sampling date, parameter, analytical result, unit and measurement qualification. Results such as `< 0.002` must remain qualified results, not become zero. `Correcte` describes data qualification, not environmental safety. The ministry also links a [national Excel export](https://info-pfas.brgm.fr/api/export/excel), which may be preferable to many per-point requests after checking its documentation and licence.

## Reuse position

- **SISE-Eaux upstream:** [official data.gouv dataset](https://www.data.gouv.fr/datasets/resultats-du-controle-sanitaire-de-leau-distribuee-commune-par-commune) explicitly states Licence Ouverte 2.0. It includes validated ARS samples and network/commune relationships; updates are monthly at month+1.
- **Naïades upstream:** its [official reuse warning](https://naiades.eaufrance.fr/avertissement) permits free reuse, including commercial reuse, under Licence Ouverte, with author/source, extraction criteria and date attribution; transformations must preserve meaning and geographic precision limitations.
- **Whole BRGM aggregation:** no explicit blanket licence was found in the inspected map configuration or WFS metadata. Confirm BRGM export terms, including GIDAF/ADES/ANSES coverage, before publishing the full aggregate in the IEC data repository. Public access and the two upstream permissions above are not proof for every source.
- **IGN platform:** [CGU articles 8.1–8.2](https://macarte.ign.fr/cgu) distinguish IGN content from imported user data. IGN's open licence does not automatically cover another organisation's thematic imports. The viewer software's open-source licence is also distinct from data licensing.

Recommended attribution if integration is approved: “BRGM · Info PFAS; original producer/application per record”, with source link, sampling dates, retrieval date, validation and location precision retained.

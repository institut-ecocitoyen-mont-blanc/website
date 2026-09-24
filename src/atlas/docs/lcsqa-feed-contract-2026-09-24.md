# National LCSQA feed: integration contract

Checked 24 September 2026. Documentation research was followed by a bounded live comparison of three daily CSV files and the current station-reference XML. No active source, published dataset or scheduled workflow was changed.

## Live probe conclusion

**A good fresh source for Passy, not a complete replacement for all three atlas stations.** The read-only probe at 12:39 UTC inspected 24 September, 23 September and 3 February 2026, matching exact station IDs against the published atlas snapshots. The February day overlaps the old regional hourly feed.

| Atlas station | National observations on the three sampled dates | National station reference |
| --- | --- | --- |
| Passy `FR33220` | PM2.5, PM10, NO2 and O3 present | Exact ID and name match |
| Sallanches Régie `FR33236` | No rows | No station record |
| Passy Chedde `ET00909` | No rows | No station record |

No alternative Passy/Chedde/Sallanches station ID appeared in the sampled CSV site names. Absence on these dates or from this reference does not establish permanent absence or station closure.

Latest usable Passy values in the [24 September CSV](https://files.data.gouv.fr/ineris/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/2026/FR_E2_2026-09-24.csv), retrieved 12:39 UTC (14:39 Paris):

| Pollutant | UTC interval | Paris interval | Published rounded value | Quality / validity |
| --- | --- | --- | --- | --- |
| PM2.5 | 09:00–10:00 | 11:00–12:00 | 2.9 µg/m³ | A / 1 |
| PM10 | 09:00–10:00 | 11:00–12:00 | 20.9 µg/m³ | A / 1 |
| NO2 | 10:00–11:00 | 12:00–13:00 | 9.4 µg/m³ | A / 1 |
| O3 | 10:00–11:00 | 12:00–13:00 | 70.9 µg/m³ | A / 4 |

All four have 11 hourly rows that day. The latest 10:00 UTC particle rows are invalid (`-1`, quality `N`) and must not replace the preceding usable values with zero. Yesterday has 24 usable hourly rows for each pollutant, supporting an actual hourly history. These are provisional measurements, not a regulatory compliance conclusion. All local units are `µg-m3`; there were no duplicate local station/pollutant/hour rows in the sample.

The [25 August Dataset D XML](https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20260825-130000/fr-2026-d-07082026-1.xml) contains 878 station records. `STA-FR33220` / `natlStationCode=FR33220` has EPSG:4326 coordinates **latitude 45.92361, longitude 6.713611**, around 9 metres from the atlas's regional published coordinates (45.9235346048, 6.7136422954). Use the national reference coordinates with national data, not copied regional coordinates relabelled as national. Its activity period begins 6 July 2006, with an unknown end. Neither complementary station ID has an `AQD_Station` record.

### Historical comparison caveat

Direct same-UTC comparisons against the regional snapshot on 3 February differ. As a diagnostic only, matching each national hour to the regional timestamp **one hour later** produces exact matches for 9/9 overlapping NO2 values, 9/9 O3 values and 8/9 PM2.5 values. One PM2.5 difference remains (8.6 µg/m³). PM10 has no overlapping regional hourly series in the published snapshot.

Both providers document UTC (see below); the offset correlation is not proof of a timezone cause. It could involve upstream encoding, interval convention or subsequent corrections. **Do not merge the old regional series and new national series into one apparently seamless history or silently shift either source.** A replacement Passy history should be fetched consistently from the national source with explicit UTC parsing and its own provenance. The two complementary sites need a separate regional feed investigation.

### Reproduction and limits

Run `node src/atlas/checks/probe-lcsqa-source.mjs 2026-09-24 2026-09-23 2026-02-03`. It makes read-only public requests, caps each CSV at 20 MB, stores only the local-station evidence/summary in a temporary JSON report, and never publishes or modifies application datasets. Explicitly pass dates: this is a bounded test, not a production importer. File hashes and last-modified times are recorded because these files can change after this check.

The main probe downloaded 5,745,975 / 12,606,660 / 12,886,800 bytes for the three respective dates; the first CSV hash was `2e4d13f478d06c3b695c8717adf582508007bd72ef0013957af541470be45f49`. The coordinate check read one current 41,113,477-byte XML reference. This confirms access and coverage at test time, not an uptime guarantee or complete station history.

## Access and coverage

The [LCSQA catalogue](https://www.data.gouv.fr/datasets/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1) publishes observations from automatic analysers participating in national regulatory monitoring. It is a redistribution of AASQA measurements through Geod'air, not an independent measuring network. A regional study site is not guaranteed to be present. Absence from this feed alone does not establish that a station has closed.

- Catalogue API: `https://www.data.gouv.fr/api/1/datasets/5b98b648634f415309d52a50/`
- Download directory: `https://files.data.gouv.fr/ineris/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/`
- Daily file: `2026/FR_E2_2026-09-24.csv` (same-day XML sibling also listed).
- No API token was needed for the catalogue, listing or CSV range request.

On this check, the year directory listed today's CSV at 5,745,975 bytes, modified 12:30:03 UTC; yesterday's was 12,606,660 bytes, modified today at 11:30:10 UTC. These are file observations, not measurement freshness guarantees. Re-fetching recent days matters because data can be revised.

## CSV semantics

The current sample is UTF-8 with BOM, semicolon-separated and quoted, with 23 columns. Preserve a proper CSV parser and header validation. Observed headers:

```text
Date de début; Date de fin; Organisme; code zas; Zas; code site;
nom site; type d'implantation; Polluant; type d'influence; discriminant;
Réglementaire; type d'évaluation; procédure de mesure; type de valeur;
valeur; valeur brute; unité de mesure; taux de saisie; couverture temporelle;
couverture de données; code qualité; validité
```

The official [export dictionary, version 16 August 2023](https://www.geodair.fr/themes/custom/geodair_gp_theme/images/Geodair_Description_exports.pdf) establishes:

- Metropolitan beginning/end times are UTC; do not parse the timezone-less `2026/09/24 00:00:00` as Paris local time.
- `valeur` is rounded; `valeur brute` retains the unrounded value.
- `validité >= 1` means valid; other values mean invalid. Missing values must not become zero.
- `code qualité` is a management code, not an explicit verified/provisional flag.
- Units belong to each observation and must be retained.

Live sample evidence: a row simultaneously had `type de valeur = moyenne horaire brute`, `code qualité = A`, and `validité = 1`. Therefore **A/1 cannot be mapped to “technically verified”**. Keep value type, validity and quality code separately. The sample unit was `µg-m3`; normalize only known equivalent spellings for display.

## Verification and history

The [LCSQA explanatory note](https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20180919-090120/mise-a-disposition-des-donnees-qa-e2-20180919.pdf) distinguishes validity from verification. Initially usable provisional observations can later be corrected or invalidated. It describes hourly publication and separately transmitted verified observations. It cautions against using provisional readings to demonstrate regulatory compliance or rigorously estimate population exposure.

That note describes the older `_T.xml` / `_V.xml` organisation. Today's directory instead has daily CSV/XML pairs; do not assume the old filenames or verification representation without inspecting current files. For CSV, report its actual `type de valeur`; use explicit XML verification metadata if stronger validation labels are needed.

## Coordinates and station reference

The CSV has no coordinates. Join by exact `code site`, never approximate station-name matching. The catalogue's Dataset D carries station and sampling-point metadata, including location, operational periods, typology and methods. It can include closed stations and measurements outside the real-time feed.

At this check the current resource was published 25 August 2026:

- [Dataset D XLS, approximately 7.7 MB](https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20260825-125844/fr-2026-d-07082026-1.xls)
- [Dataset D XML, approximately 39.2 MB](https://static.data.gouv.fr/resources/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1/20260825-130000/fr-2026-d-07082026-1.xml)

The documentation pass identified these resources; the subsequent live probe parsed the XML for all three target stations, as recorded above. Their resource URLs should be discovered through the catalogue rather than treated as permanent filenames.

## Redistribution

The national catalogue declares `lov2` / Licence Ouverte 2.0. The [licence](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0) permits redistribution and adaptation, including commercially, with source attribution and the reused information's update date; presentation must not mislead about meaning, source or freshness. Attribute the producing AASQA and LCSQA/Geod'air, retain observation dates and source links. This licence applies to the national resource; it does not retrospectively replace ODbL notices on separately obtained regional Atmo records.

## Suggested migration checks

1. Compare each exact local station ID and pollutant against recent daily files; distinguish an absent row, invalid row and stale row.
2. Explicit UTC parsing, units, invalid/missing values, BOM and revision handling need parser tests.
3. Preserve provisional status; avoid turning `A` into a verification claim.
4. Cache a bounded rolling history and last successful download; refresh recent history to pick up revisions.
5. Keep national and regional provenance separate if study-station coverage requires a regional fallback.

## Regional timestamp comparison

The current [Atmo hourly FeatureServer layer metadata](https://services3.arcgis.com/o7Q3o5SkiSeZD5LK/arcgis/rest/services/Concentrations%20moyennes%20horaires/FeatureServer/layers?f=pjson) explicitly declares `dateFieldsTimeReference.timeZone = UTC`, `timeZoneIANA = Etc/UTC`, and `respectsDaylightSaving = false` on all eight pollutant layers, including the four displayed by the atlas. Both `date_debut` and `date_fin` are ArcGIS Date fields. The service root itself has no timezone override.

Neither the [CRAIG metadata record](https://ids.craig.fr/geocat/srv/api/records/4e9c6cda-450c-4e19-a9ff-97095002df5d/formatters/xml) nor the [official ArcGIS item description](https://www.arcgis.com/sharing/rest/content/items/08264f6574e844b8800ee0e18ca5ff9e?f=pjson) documents a local-time exception. Therefore both feeds should initially be compared as UTC intervals. If a value comparison finds a constant offset, investigate upstream timestamp encoding or interval-boundary mistakes; do not silently apply a timezone correction on the strength of correlation alone.

The regional CRAIG lineage separately documents validity (usable or invalid) and validation (raw versus operator-validated). It also describes rounding that may differ from the national export. These are additional comparison dimensions, not proof explaining any observed discrepancy.

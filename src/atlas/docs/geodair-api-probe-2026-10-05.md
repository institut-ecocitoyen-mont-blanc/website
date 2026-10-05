# Geod'air API: documentation and bounded probe

Checked 5 October 2026. The documentation pass used only public pages, the public Swagger specification and official export dictionaries. No credentials or authenticated export endpoints were accessed during that pass. Live probe results must be recorded separately below; documented capabilities alone do not establish local station coverage or account permissions.

## Documented capabilities and limits

Geod'air exposes hourly means, daily hourly maxima, daily means and annual means for regulatory measurement points, plus station and sampling-point metadata. Registration is required. Measurements enter the platform once an hour; the operator asks for at most one interrogation per date/hour/pollutant/statistic combination and warns that recurring excessive use can suspend an account. The API page also points to the public national hourly feed on data.gouv.fr. Cache exports and avoid independent duplicate requests for the same interval. [API access and usage rules](https://www.geodair.fr/donnees/api).

The public site describes history from **2013 to the present**, not guaranteed continuity for every station or pollutant. It excludes one-off measurement campaigns. Consequently, this is not documentation that complementary regional sites such as Sallanches Régie or Passy Chedde exist in the API. [Coverage description](https://www.geodair.fr/a-propos).

## Request contract

The [Swagger UI](https://www.geodair.fr/api-ext/swagger) loads [swagger.yaml](https://www.geodair.fr/api-ext/swagger.yaml). Use HTTPS and the `apikey` request header, never a browser-visible token or query-string secret.

| Endpoint under `/api-ext` | Documented inputs / purpose |
| --- | --- |
| `/polluant/export` | Pollutant reference; `code` supplies request IDs. |
| `/type-donnees/export` | Required `codes_polluants`; `Identifiant` supplies statistic IDs. |
| `/statistique/export` | Required `date_debut`, `date_fin` (`dd/MM/YYYY hh:mm`), `type_donnee`; `polluant` unless `famille_polluant` supplied. Optional exact `station`, `departement`, `region`, `zas`, `typologie`, `influence`, `date_calcul`. |
| `/download` | Required returned export `id`. |
| `/station/export` | Optional `dateDebut`, `dateFin` (`YYYY-MM-DD`), `commune`, `uniteUrbaine`, `departement`, `region`, `zas`, `typologie`. No exact-station parameter documented. |
| `/pointdeprelevement/export` | Optional `dateDebut`, `dateFin`, exact `code_station`. |

Statistics use **two steps**: request generation, then download the returned identifier. Download statuses: `200` CSV, `204` no content, `412` not finished, `404` unknown identifier, `500` export failure. Retry the same download with bounded backoff; do not repeatedly regenerate it. `date_calcul=true` adds the database insertion date. The YAML has no response schemas, pagination, range-size limit, boundary-inclusion rule or explicit timezone for request parameters. Inspect actual returned intervals before claiming a boundary convention. [Specification](https://www.geodair.fr/api-ext/swagger.yaml).

Advanced siblings ending in `/export-avance` exist; the statistics, station and sampling-point variants add `reglementaire`. Their broader eligibility/default behavior is not explained by the schema. The [public UI filter](https://www.geodair.fr/api-ext/swagger-role-filter.js) hides these operations unless its `auth_exportavance` flag is enabled. This indicates differentiated UI access, not proof that a particular account has permission or that a missing station will become available. Do not attempt to bypass access controls.

The official example uses hourly statistic `a1`. Resolve daily/annual IDs through the reference endpoint instead of inventing them. The official pollutant dictionary lists:

| Pollutant | Code | Unit |
| --- | --- | --- |
| NO2 | `03` | µg-m3 |
| O3 | `08` | µg-m3 |
| PM10 | `24` | µg-m3 |
| PM2.5 | `39` | µg-m3 |

Codes are strings: preserve leading zeroes. Not every pollutant uses µg/m³ (CO uses mg/m³; some metals use ng/m³). [Pollutant dictionary, 11 May 2022](https://www.geodair.fr/sites/default/files/media-files/2022-05/liste_polluants.pdf).

## Export interpretation

The [official CSV dictionary, 16 August 2023](https://www.geodair.fr/themes/custom/geodair_gp_theme/images/Geodair_Description_exports.pdf) defines:

- Beginning/end timestamps: UTC in metropolitan France, local time in overseas departments/regions. For this atlas's metropolitan stations, parse explicitly as UTC; do not assume the same rule globally.
- `valeur` is rounded; `valeur brute` is unrounded. Preserve the observation's unit.
- `validité >= 1` means usable; other values mean invalid. Missing/invalid values are not zero.
- `code qualité` is a database-management field, not a documented expert-validation indicator.
- `type de valeur`, regulatory status, evaluation type, measuring procedure, station identity, producing AASQA and coverage fields remain relevant provenance.

Recommended importer rule: retain value type, quality code and validity independently. A valid reading need not be expert-validated. Automatic hourly means distinguish raw observations checked automatically from observations reviewed by experts. Validity can change after publication; the site considers a year's measurements stable in June of the next year. Current-year annual statistics are deliberately invalid until the following January. Refresh recent history to capture revisions. [Validation and revision explanation](https://www.geodair.fr/a-propos).

The statistics dictionary has no coordinates. The API advertises separate station metadata but the Swagger file does not define its CSV headers, coordinate CRS/order or operational-period columns. These require live inspection. Join by exact station ID; do not relabel regional coordinates as national metadata or silently combine histories with different interval conventions.

## Reuse and attribution

The API-registration page embeds the site's **Conditions générales d'utilisation**, section **Réutilisation des contenus** (HTML block `block-useragreementsblockforgeodairgp`). Public/environmental information held or produced by Ineris is offered by default under Licence Ouverte, subject to third-party intellectual-property rights. Reuse must preserve meaning, identify sources and the last update date, and must not imply Ineris endorsement. Logos and other protected site content have separate restrictions. This supports attributed reuse of covered environmental data, not blanket reuse of all website assets. [Registration page and embedded CGU](https://www.geodair.fr/donnees/api#block-useragreementsblockforgeodairgp).

The Swagger `Apache 2.0` / `swagger.io` metadata is not the environmental dataset licence. The CGU does not identify a Licence Ouverte version; do not derive a version-specific data-licence claim from the Swagger boilerplate. Preserve the producing AASQA, Geod'air/LCSQA/Ineris provenance, observation/update times and transformations in any extract. This is a source-based implementation assessment, not legal advice.

## Live evidence

Authenticated read-only probes on **5 October 2026, approximately 06:46–06:53 UTC (08:46–08:53 Paris)** succeeded using the local key in the `apikey` header. No key, request-header dump or credential-bearing URL was saved. No atlas source, scheduled importer or published dataset was changed. Each statistical slice was generated once and downloaded once; returned data were reused locally. Direct reference endpoints return CSV; statistical generation returns a plain-text identifier, followed by a CSV download. All six generation/download pairs returned HTTP 200 without a pending retry.

### Local station coverage

The [standard station query](https://www.geodair.fr/api-ext/station/export?departement=74) returned nine Haute-Savoie station rows. Filtering `Code commune` to the exact ten CCPMB codes leaves **PASSY `FR33220` only**. Its published longitude/latitude **6.713611, 45.92361** is inside the pinned territory polygon. Metadata includes Impasse des Primeveres, altitude 588 m, periurban/fixed/background descriptors and a station start date of 6 July 2006.

The [2013–2026 station query](https://www.geodair.fr/api-ext/station/export?departement=74&dateDebut=2013-01-01&dateFin=2026-10-05) returned 22 version rows, again only Passy locally (two administrative versions, not two stations). Exact standard sampling-point requests for `FR33236` (Sallanches Régie) and `ET00909` (Passy Chedde) both returned HTTP 400 with an incorrect-station-code message. This establishes that these IDs are unavailable through the tested standard API, not that the physical stations are closed or that no alternative source exists.

The [advanced station query](https://www.geodair.fr/api-ext/station/export-avance?departement=74&reglementaire=false) returned **HTTP 403: You cannot consume this service**. No attempt was made to bypass this restriction. Broader non-regulatory access would require provider permission; even that would not guarantee these two stations are present.

The [Passy sampling-point reference](https://www.geodair.fr/api-ext/pointdeprelevement/export?code_station=FR33220) lists seven in-service pollutant points: **NO (`02`), NO2 (`03`), O3 (`08`), NOx as NO2 (`12`), PM10 (`24`), PM2.5 (`39`), BaP in PM10 (`P6`)**. They share the coordinates above and publish inlet height 3.6 m. BaP starts in 2012, PM2.5 in 2015 and NOx in 2023 according to metadata; this alone does not prove observation continuity.

### Downloaded observations, not just metadata

All queries below used `/statistique/export`, `station=FR33220`, followed by `/download`. Family `2000` is the regulatory-pollutant family from the live pollutant reference. The live [statistic reference](https://www.geodair.fr/api-ext/type-donnees/export?codes_polluants=03,08,24,39) confirmed `a1` hourly, `a2` daily, `a7` annual and `01` deferred analyses. It additionally advertises daily maxima, O3 rolling eight-hour means, exceedance counts and AOT40; those extra products were **not** downloaded in this probe.

| Statistic | Requested dates (dd/MM/YYYY hh:mm, metropolitan UTC) | Actual result |
| --- | --- | --- |
| `a1`, family `2000`, `date_calcul=true` | 01/10/2026 00:00 to 05/10/2026 23:59 | 606 rows: 101 hours each for NO, NO2, O3, NOx, PM10 and PM2.5; 600 usable nonempty rows. No future observations returned. |
| `a2`, family `2000` | 01/09/2026 00:00 to 30/09/2026 23:59 | 180 rows for those six pollutants; 172 usable nonempty daily values. |
| `a7`, family `2000` | 01/01/2023 00:00 to 31/12/2025 23:59 | 21 usable annual rows: all seven Passy pollutants, including BaP. |
| `a7`, family `2000` | 01/01/2013 00:00 to 31/12/2022 23:59 | 59 annual rows; 57 usable. NO, NO2, O3, PM10 and BaP have usable annual values in every year 2013–2022. PM2.5 begins in 2015 but that annual row is invalid; usable annual values start in 2016. One SO2 row for 2013 is invalid, not evidence of a current SO2 series. |
| `01`, pollutant `P6` | 01/01/2026 00:00 to 05/10/2026 06:00 | Only one boundary-overlapping sample, **31 December 2025–1 January 2026**, 2.58 ng/m³. No returned sample starts in 2026. |
| `01`, pollutant `P6` | 01/01/2025 00:00 to 30/12/2025 23:59 | 119 usable deferred-analysis rows, first interval 2–3 January and last 28–29 December 2025. Discrete historical samples, not a live continuous series. |

Latest usable hourly intervals in the downloaded slice:

| Pollutant | Beginning–end UTC on 5 October | Paris time | Value (µg/m³) | Published value type / validity |
| --- | --- | --- | ---: | --- |
| PM2.5 | 03:00–04:00 | 05:00–06:00 | 5.7 | raw hourly / 1 |
| PM10 | 03:00–04:00 | 05:00–06:00 | 11.6 | raw hourly / 1 |
| NO2 | 04:00–05:00 | 06:00–07:00 | 7.2 | raw hourly / 1 |
| O3 | 04:00–05:00 | 06:00–07:00 | 3.3 | raw hourly / 4 |
| NO | 04:00–05:00 | 06:00–07:00 | 2.2 | raw hourly / 1 |
| NOx as NO2 | 04:00–05:00 | 06:00–07:00 | 10.6 | raw hourly / 1 |

PM10 and PM2.5 each have three empty/invalid hourly rows, including 04:00–05:00 on 5 October; do not convert them to zero or silently present an older value as the same hour as the gases. The hourly CSV contains both `moyenne horaire validée` and `moyenne horaire brute`, while quality `A` occurs with both. Preserve the explicit type; validity `4` for the latest O3 is usable under the documented >=1 rule, but is not independently an expert-validation claim.

### Concrete integration differences

Unlike the previously tested public national CSV, these API statistics **include `Latitude` and `Longitude`**. They also return rounded/unrounded values, unit, producer, station identity, regulatory/evaluation flags, coverage fields, quality code and validity. `date_calcul=true` supplied `Date de calcul`. Current hourly exports use `YYYY-MM-DD hh:mm:ss`, whereas the tested daily/annual/deferred exports use `YYYY/MM/DD hh:mm:ss`; parse both explicitly in UTC. Neither contains the national-file `discriminant` or measuring-procedure columns in these samples.

The BaP 2025 annual rounded value is `1.0` ng/m³ while `valeur brute` is `0.9614998438946614`. Preserve both rather than inferring threshold exceedance from a heavily rounded display. Annual BaP coverage is around one third of the year, reflecting intermittent sampling; do not label it continuous monitoring. PM2.5 usable annual history verified here is 2016–2025; NOx annual history is 2023–2025; the other five listed pollutants have usable annual history 2013–2025. This verifies annual availability only, not complete hourly history across that period.

Practical conclusion: a strong candidate to refresh **Passy** in the existing station layer, add NO/NOx if desired, and provide historical BaP plus longer annual charts. It does not solve Sallanches Régie or Passy Chedde coverage with this key. Keep those regional sources and their provenance separate if retained. None of this changes the four modelled-map layers.

### Local evidence files

Measurement-only downloads are retained temporarily under `/tmp/iec-geodair-probe-2026-10-05/`; no secrets are in them. CSVs were parsed with `csv-parse`, semicolon delimiter, headers and empty-value preservation. These files are a probe, not published atlas datasets. Sizes and SHA-256 hashes below identify the inspected revisions; provider observations can later change.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `hourly.csv` | 169713 | `bb450ae317e15eabe590ba879104641feebb09aafa90c3cf4ed1a40d03d91712` |
| `daily.csv` | 50316 | `1e6ea74b3013fcaf838e9dbff34dc0bf654d2e914211b320461437240b7220cf` |
| `annual.csv` | 6225 | `0dd05178128d813cb056cc2529267c5be0d3b9402884d58ce42261ef5a451657` |
| `bap.csv` | 613 | `47ba1013d9f5acda59f2ff56a0826bfe3b0ac77f96fa8e9efa789f441d8809b8` |
| `olderAnnual.csv` | 16525 | `4747042e3eda78009c431ed0ab71f387bad32c051f43291bb92c2ec8ea85bf90` |
| `bap2025.csv` | 31624 | `f6d926bd58955a9d15c8a8bd3412e14a934d57acd3e6a0c78e52b15368fd3cc1` |

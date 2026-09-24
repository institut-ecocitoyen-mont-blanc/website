# Atlas API readiness — 24 September 2026

Follow-up: [the dataset-specific Atmo licence investigation](atmo-redistribution-2026-09-24.md) resolved the licence uncertainty below: both current feeds are ODbL 1.0. The scheduled ingestion implementation is tracked in [iec-atlas-data](https://github.com/institut-ecocitoyen-mont-blanc/iec-atlas-data). This document otherwise preserves the initial assessment.

Scope: existing real-data layers only; documentation review, not implementation. Provider identities were checked against `lib/*-source.ts`, `lib/atmo-stations.ts`, `lib/environmental-layers.ts`, and the existing atlas notes. Public documentation/catalogues were consulted online today. No measurement queries, bulk station downloads, IREP archives, credentials, or deployment changes were made.

## Conclusions and priorities

### 1. Resolve fresh air data before requesting arbitrary API keys

The current code uses Atmo AURA ArcGIS hourly concentrations plus a separate daily feed for additional particulate stations. The [hourly service directory](https://services3.arcgis.com/o7Q3o5SkiSeZD5LK/arcgis/rest/services/Concentrations%20moyennes%20horaires/FeatureServer) still advertises JSON, 2,000 records per response, and the expected pollutant layers. This confirms the published interface, **not recent observations**.

The [Atmo NO₂ data.gouv catalogue](https://www.data.gouv.fr/datasets/mes-aura-horaire-no2) is explicitly harvested from an external portal; its REST resource redirects to the same ArcGIS service. It describes seven days of hourly history and links a one-year CSV source. Switching to this catalogue does not produce a new upstream feed. Its licence is unspecified: confirm the applicable dataset licence and validation-code definitions with Atmo before production reuse.

There is, however, a **different** [national LCSQA/Geod’air real-time dataset](https://www.data.gouv.fr/datasets/donnees-temps-reel-de-mesure-des-concentrations-de-polluants-atmospheriques-reglementes-1), published under Licence Ouverte 2.0, with hourly NO₂/O₃/PM₁₀/PM₂.₅ and other regulated pollutants. Its public object-store files are a credible no-key ingestion candidate, not a verified drop-in replacement. First test one small local station/time slice, dates, station matching, units, validation fields and coverage of non-regulatory study stations.

Alternatively, the [Geod’air API](https://www.geodair.fr/donnees/api) requires registration; its [Swagger](https://www.geodair.fr/api-ext/swagger) specifies an `apikey` header and generate-file/download workflow. Geod’air integrates measurements hourly and asks clients not to repeat the same date/hour/pollutant/statistic request. **If selected**, obtain the key and use shared server-side ingestion/cache; never put it in the public static bundle. Neither account creation nor a provider switch was performed. The 3 February 2026 last-observation date in the earlier atlas notes was not revalidated today.

### 2. Decide a refresh policy for the static atlas

Current repository notes identify build-time snapshots for bathing results, ecological assessments, traffic, IREP and groundwater availability. A browser refresh cannot renew those exported files. Decide who owns periodic ingestion/rebuilds, which layers retain a dated last-successful snapshot, and what age triggers a warning. This is an architectural requirement, not evidence that every provider needs a proxy.

Match the refresh policy to source cadence: [drinking-water controls are monthly](https://www.data.gouv.fr/dataservices/hubeau-qualite-de-leau-potable); [river chemistry synchronizes continuously with Naïades](https://www.data.gouv.fr/dataservices/hubeau-qualite-des-cours-deau); [groundwater chemistry follows ADES updates](https://www.data.gouv.fr/dataservices/hubeau-qualite-des-nappes-deau-souterraine). Continuous synchronization does not mean each sampling point has recent measurements.

### 3. Treat Hub’Eau as open access, then verify browser delivery and completeness

All three official Hub’Eau catalogue entries above mark access as open: no missing account requirement was established. The drinking-water API separates commune/network membership (`communes_udi`) from results (`resultats_dis`); river chemistry is not the separate official ecological assessment.

Before calling the layers production-ready, run bounded origin-aware smoke tests from the deployed site: one catalogue/result per family, expected station/network identity, pagination, dated results, timeout/429/5xx behavior, and recovery. Do not describe a ten-result list or 200-row groundwater window as a full history. These checks should target remaining gaps, not replace existing parser tests and safeguards. No numeric quota or uptime SLA was verified in this review; confirm them with the provider rather than inventing polling limits.

### 4. Preserve groundwater location obfuscation

The [provider's groundwater changelog](https://www.data.gouv.fr/dataservices/hubeau-qualite-des-nappes-deau-souterraine) explicitly states that drinking-water catchment coordinates were replaced with commune-seat coordinates in December 2025. These pins must remain labelled approximate/public-source positions, not exact sampling points. Verify precision metadata survives every ingest and avoid apparent contamination hotspots caused by coincident commune-centre points. Do not try to recover restricted locations. Chemistry, groundwater level, and drinking-water compliance remain separate concepts.

### 5. Make the two page/export integrations explicit operational dependencies

Bathing currently parses Ministry `consultSite.do` HTML, while ecological status uses the AERMC CSV export; these are not interchangeable with a general “ARS API” or Hub’Eau chemistry. Pin representative fixtures, validate identity/year/schema, retain official links, and alert when the page/export contract changes.

The Ministry's [bathing open-data catalogue](https://www.data.gouv.fr/datasets/donnees-de-rapportage-de-la-saison-balneaire-1) provides site locations, seasonal classifications/events and analyses under an open licence. Evaluate those structured seasonal resources for historical imports, but do not assume they are a current-season live API. A sample's bacterial result, seasonal classification and current bathing prohibition are different information. This review did not establish a public general-purpose ARS API or verify current HTML/export operation.

### 6. Keep road traffic annual and schema-driven

The [DDT74 catalogue](https://www.data.gouv.fr/datasets/trafic-routier-en-haute-savoie) publishes the structural road network plus counted non-structural sections, using annual counts, under Licence Ouverte 2.0. It links WFS and shapefile resources; its July 2026 catalogue update is not proof of 2026 traffic values.

The current loader depends on a specific Geo-IDE MapServer path, WFS 1.1/GML geometry and annual columns. Revalidate capabilities/schema and one bounded response before claiming readiness; retain axis-order and truncation checks. Confirm the newest populated annual field, not a PDF's year or catalogue-modification date. No account prerequisite was found; current WFS operation and latest year were not retested.

### 7. Keep IREP as bounded archival ingestion, not another live API

The [official IREP page](https://www.georisques.gouv.fr/donnees/bases-de-donnees/installations-industrielles-rejetant-des-polluants) specifies twice-yearly register updates, national annual CSV downloads, and no API. Continue discovering available reporting years from the existing download catalogue and importing only required files. Schedule modest checks, retain reporting year/retrieval date, and keep annual declared releases distinct from ambient concentrations.

No Géorisques API token is established as a prerequisite for these downloads. A token for a separate API product would not solve archive freshness. The earlier note's latest archive year (2024) was not revalidated and must not be presented as today's confirmed latest year.

## Verification boundary

The browser retrieval tool returned 403 for the three main Hub’Eau documentation URLs; the provider-authored data.gouv API entries were readable. Atmo's dedicated API documentation and the AERMC search page were not retrievable through that tool; the bathing home page yielded no extractable content. These are research-tool limitations, **not proof of production outages**. The ArcGIS directory was readable, but observation freshness, CORS, actual quotas, local completeness, HTML parsing, WFS operation and IREP archive availability remain live acceptance checks. Existing September 8–10 repository probes are historical evidence only.

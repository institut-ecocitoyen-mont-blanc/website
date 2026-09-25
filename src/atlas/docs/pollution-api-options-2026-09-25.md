# Additional pollution data for the CCPMB atlas

Research date: 25 September 2026. Read-only provider checks; no application changes.

## Scope and recommendation

Only the ten CCPMB communes: Combloux, Les Contamines-Montjoie, Cordon, Demi-Quartier, Domancy, Megève, Passy, Praz-sur-Arly, Saint-Gervais-les-Bains and Sallanches. Use the repository's pinned commune polygons to clip geometries, not a regional bounding box alone. Servoz, Chamonix and Les Houches are excluded.

The strongest additional chemical-pollution layer is **Atmo's annual modelled concentration map**: it adds spatial information between the measurement stations already displayed. **Pesticide purchases** add an indicator of potential pressure, with much coarser geography. **Wastewater treatment records** are useful mostly as enrichment of existing inventory sites. Noise and artificial-light services are investigated separately in [the companion note](./pollution-api-noise-radiation-2026-09-25.md).

Do not duplicate the existing Atmo stations, water analyses, IREP or Géorisques layers merely because another catalogue republishes them. PFAS/pesticide/metal views of existing water measurements would be useful, but require checking actual local analyte coverage before promising a new thematic view.

## 1. Modelled air pollution: Atmo annual maps

Atmo publishes 2025 maps for PM₂.₅, PM₁₀, NO₂ and ozone-related metrics, with downloadable data and a geographic web service. These are modelled annual statistics, **not current sensor readings**. Atmo explicitly warns about uncertainty at building scale. The dataset does not isolate residential wood-heating emissions. [Official publication](https://www.atmo-auvergnerhonealpes.fr/carte/exposition-la-pollution-atmospherique-en-2025), [official map configuration](https://atmoaura.maps.arcgis.com/sharing/rest/content/items/73141a0eb89d46acaa2c548d9750e9b6/data?f=json).

- WMS: `https://sig.atmo-auvergnerhonealpes.fr/geoserver/mod_aura_region_2025/wms`
- Example layer: `mod_aura_region_2025:mod_aura_2025_pm25_moyan`
- Other layers advertised by the official map include `mod_aura_2025_no2_moyan`, `mod_aura_2025_pm10_moyan`, `mod_aura_2025_pm10_nbjdep50` and `mod_aura_2025_o3_nbjdep120_2023_2025` in the same namespace.
- [GeoTIFF downloads](https://depot.atmo-aura.fr/modelisation/opendata_geotiff/2025/).
- Access tested without a key. Dataset-specific redistribution terms still need verification before publishing copied raster data; the existing station-dataset licence review does not automatically cover these rasters.

### Live local coverage

`GetFeatureInfo` returned HTTP 200 and non-null values at the official geographic centre of **each of the ten communes**. These centres are geometric reference points, not necessarily the town centre or a monitoring station. Points came from `https://geo.api.gouv.fr/communes/{code}?fields=centre,codesPostaux`.

| Commune | Longitude, latitude tested | Returned PM₂.₅ `GRAY_INDEX` |
| --- | --- | --- |
| Combloux | 6.6362, 45.8879 | 6 |
| Les Contamines-Montjoie | 6.7362, 45.7855 | 5 |
| Cordon | 6.5677, 45.9079 | 5 |
| Demi-Quartier | 6.6287, 45.8728 | 5 |
| Domancy | 6.6644, 45.9090 | 9 |
| Megève | 6.6241, 45.8397 | 4 |
| Passy | 6.7507, 45.9579 | 9 |
| Praz-sur-Arly | 6.5859, 45.8280 | 4 |
| Saint-Gervais-les-Bains | 6.7637, 45.8554 | 7 |
| Sallanches | 6.6041, 45.9323 | 7 |

Reproducible [Passy valley query](https://sig.atmo-auvergnerhonealpes.fr/geoserver/mod_aura_region_2025/wms?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&LAYERS=mod_aura_region_2025%3Amod_aura_2025_pm25_moyan&QUERY_LAYERS=mod_aura_region_2025%3Amod_aura_2025_pm25_moyan&SRS=EPSG%3A4326&BBOX=6.699%2C45.919%2C6.701%2C45.921&WIDTH=101&HEIGHT=101&X=50&Y=50&INFO_FORMAT=application%2Fjson) separately returned `GRAY_INDEX: 11` near 6.700, 45.920. The layer describes annual concentration in µg/m³; values here document coverage, not a health assessment or commune-wide average.

Suggested display: clipped continuous raster with pollutant and year controls, source legend and measurement/model distinction. Keep separate from the illustrative heating layer. Validate the chosen raster's units, nodata and legend before assigning colours.

## 2. Pesticide purchases: Hub'Eau / BNV-D

Hub'Eau provides annual purchases by postal zone and sales by department, with product/substance quantities. Purchases are available since 2013. This is an open, keyless API under Licence Ouverte 2.0. [Official documentation](https://hubeau.eaufrance.fr/page/api-vente-et-achat-de-produits-phytopharmaceutiques), [OpenAPI contract](https://hubeau.eaufrance.fr/api/v1/vente_achat_phyto/api-docs), [official API catalogue](https://www.data.gouv.fr/dataservices/hubeau-vente-et-achat-de-produits-phytopharmaceutiques).

Endpoint: `https://hubeau.eaufrance.fr/api/v1/vente_achat_phyto/achats/substances`.

Use `type_territoire=Zone postale` (not `Code postal`), `code_territoire`, `annee_min`, and pagination. Example [74190 request](https://hubeau.eaufrance.fr/api/v1/vente_achat_phyto/achats/substances?type_territoire=Zone%20postale&code_territoire=74190&annee_min=2023&size=2).

Live checks all succeeded with HTTP 206 (paginated success), including 2024 records:

| Postal code | API count with `annee_min=2023` |
| --- | --- |
| 74190 | 59 |
| 74700 | 147 |
| 74120 | 19 |
| 74170 | 45 |
| 74920 | 28 |

These counts are product/substance purchase records across the requested years, **not** site counts, unique-substance counts or kilogram totals. `quantite_substance` is expressed in kg according to the contract. Aggregate only with the relevant year, product and substance dimensions understood; respect suppressed/unknown fields. Check API pagination URLs when importing: returned links may use HTTP even when the initial request uses HTTPS.

Suggested display: annual pressure indicator with substance breakdown, not exact-location pins. **Purchase location is not application location; purchase quantity is not measured environmental contamination.** Postal zones are not communes and can cross our boundary. Never silently redistribute a postal total among communes or label a clipped postal total as a CCPMB-only measurement. A sidebar summary may be more honest than a fine-grained map.

## 3. Wastewater treatment: SANDRE and the national sanitation portal

SANDRE publishes a public WFS of treatment infrastructure. The national sanitation portal additionally publishes annual operational/compliance files. These are complementary products: location/capacity records alone do not tell us the pollution concentration in a discharge. [Official WFS catalogue](https://www.data.gouv.fr/dataservices/service-web-geographique-ogc-wfs-du-referentiel-des-stations-de-traitement-des-eaux-usees-ouvrages-de-depollution), [dataset and licence](https://www.data.gouv.fr/en/datasets/stations-de-traitement-des-eaux-usees-france-entiere-1/), [national downloads](https://www.assainissement.developpement-durable.gouv.fr/pages/data/basededonnee.php).

- WFS base: `https://services.sandre.eaufrance.fr/geo/odp`
- Feature type: `sa:SysTraitementEauxUsees`
- No key required; catalogue lists Licence Ouverte 2.0.
- Tested WFS 2.0, EPSG:4326, GML output. EPSG:4326 bounding boxes use latitude/longitude order in this request. Do not assume GeoJSON support: the tested JSON output request was rejected.

[Tested bounding-box request](https://services.sandre.eaufrance.fr/geo/odp?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=sa%3ASysTraitementEauxUsees&SRSNAME=EPSG%3A4326&BBOX=45.7%2C6.45%2C46.05%2C6.95%2CEPSG%3A4326&COUNT=100) returned HTTP 200 and 12 nearby features. Filtering commune codes and checking coordinates against the pinned CCPMB polygons verified these three local plants:

| Identifier | Published name | Commune | Record update | Nominal capacity (population equivalent) |
| --- | --- | --- | --- | --- |
| 060974215001 | PRAZ SUR ARLY - MEGEVE | Praz-sur-Arly | 2025-07-24 | 45,000 |
| 060974208001 | PASSY | Passy | 2025-07-30 | 43,050 |
| 060974256001 | SALLANCHES | Sallanches | 2025-04-24 | 53,000 |

This is a verified local sample, not a claim that the query exhaustively found every possible wastewater asset. Record update dates are not measurement dates. Autosurveillance conformity must not be interpreted as discharge-quality compliance.

Suggested integration: match these plants to existing inventory records, then join the official annual sanitation export for the relevant year's performance and compliance. Verify that export's fields before implementing a colour scale; do not label a plant polluting merely because it exists. The location API is verified; a complete machine-readable compliance join is not yet tested.

## 4. Additional environmental nuisances

**Cerema artificial night light is locally verified:** its public ArcGIS REST service returns all ten commune records and 52 subcommunal urban zones. It provides monthly satellite radiance and inferred changes in lighting, not ground-level lux or direct human exposure measurements. The official publication describes the 2024–2025 data. Dataset redistribution terms remain unconfirmed. See the [official Cerema explanation](https://www.cerema.fr/fr/actualites/extinction-eclairage-public-nouvelles-donnees-2024-2025) and the [companion note for endpoints and live-query evidence](./pollution-api-noise-radiation-2026-09-25.md).

**Road noise remains a promising follow-up, not a verified working import.** Official A40/RN205 strategic noise maps exist, and the WFS capabilities respond, but feature requests did not return usable local data during this check. Establish a working export and its model year before implementation. [Official DDT74 source](https://www.haute-savoie.gouv.fr/Actions-de-l-Etat/Votre-departement/Deplacements/Bruit-des-transports/Exposition-des-populations).

**Do not add radiation solely for completeness:** the working Téléray station catalogue did not establish a station inside our strict ten-commune scope; nearby Aiguille-du-Midi and Annecy are outside it. Details and limitations are in the companion note.

## Integration constraints and next checks

1. Confirm dataset-specific reuse terms for modelled air and any other shortlisted service before redistributing snapshots.
2. Reuse the scheduled importer, last-good snapshots and provider dates. Annual datasets need annual versions, not a misleading live-data presentation.
3. Clip all geometries to the ten commune polygons. Preserve source geography for postal or other aggregated statistics.
4. Separate measured concentrations, modelled concentrations, purchased quantities, infrastructure and regulatory status in the legend and details.
5. For chemical pollution, prioritize the Atmo raster; pesticide purchases and wastewater records provide additional context rather than direct exposure measurements. Check local PFAS/HAP coverage separately before promising an analyte-specific layer.

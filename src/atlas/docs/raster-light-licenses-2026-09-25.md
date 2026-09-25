# Atmo raster and Cerema night-light reuse licences

Checked 25 September 2026 against the publishers' catalogues and live metadata. This supersedes the unconfirmed-licence caveats in the earlier pollution API research for the datasets below; it does not grant permission for unrelated datasets.

## Decision

| Dataset | Verified licence | Integration conclusion |
| --- | --- | --- |
| Atmo Auvergne-Rhône-Alpes, Cartes annuelles 2025 | ODbL 1.0 | Use annual modelled concentration data, including the published WMS and GeoTIFF sources, with source/licence attribution. Preserve ODbL for any redistributed derived database. |
| Cerema, Cartographie nationale des pratiques d'éclairage nocturne, communal 2026 edition | Licence Ouverte 2.0 | Reuse the ten commune records and their monthly radiance series, with Cerema attribution and the source update date. |
| Cerema's separate subcommunal polygons | Not independently established | Do not infer a grant from API accessibility. The cleared implementation should use the commune dataset; obtain specific confirmation before redistributing subcommunal data. |

## Atmo: dataset-specific evidence

The [official 2025 catalogue](https://www.data.gouv.fr/datasets/cartes-annuelles-2025) identifies Atmo Auvergne-Rhône-Alpes as publisher and explicitly lists ODbL. It links the exact [2025 GeoTIFF directory](https://depot.atmo-aura.fr/modelisation/opendata_geotiff/2025/) used by the proposed overlay, not the unrelated station dataset. The [machine-readable catalogue](https://www.data.gouv.fr/api/1/datasets/cartes-annuelles-2025/) returned `license: "odc-odbl"`, dataset ID `69f9341517bd070949eff6a4`, last modified `2026-06-05T00:00:00+00:00`.

Atmo's own [ArcGIS application metadata](https://atmoaura.maps.arcgis.com/sharing/rest/content/items/73141a0eb89d46acaa2c548d9750e9b6?f=json) independently returned title `Cartes annuelles 2025` and `licenseInfo` linking ODbL 1.0. Its description links the same GeoTIFF directory and [CRAIG metadata record](https://ids.craig.fr/geocat/srv/fre/catalog.search#/metadata/1b843bb2-1914-4c74-84d6-1dff578b7ae3). The application's [configuration](https://atmoaura.maps.arcgis.com/sharing/rest/content/items/73141a0eb89d46acaa2c548d9750e9b6/data?f=json) connects those annual maps to `https://sig.atmo-auvergnerhonealpes.fr/geoserver/mod_aura_region_2025/wms`.

ODbL permits database reuse and adaptation. Public outputs must identify their database source and licence; public derivative databases must retain compatible share-alike terms and be available in machine-readable form (or with the alteration method). Keep independent source datasets separately licensed rather than relabelling all atlas data under one licence. [ODbL full text, sections 3–4](https://opendatacommons.org/licenses/odbl/1-0/).

Suggested visible attribution: **Atmo Auvergne-Rhône-Alpes — Cartes annuelles 2025 — ODbL 1.0**, with links to the catalogue and licence. Mark any cropped or restyled presentation as such. Preserve the distinction between annual modelled concentrations and recent station measurements. No claim is made that Atmo endorses our atlas.

## Cerema: dataset-specific evidence and scope

The [official Cerema catalogue](https://www.data.gouv.fr/datasets/cartographie-nationale-des-pratiques-declairage-nocturne) explicitly lists Licence Ouverte 2.0 and describes commune-level lighting-practice classifications plus radiance histories from 2014–2025. The [catalogue API](https://www.data.gouv.fr/api/1/datasets/cartographie-nationale-des-pratiques-declairage-nocturne/) returned `license: "lov2"`, certified producer `Cerema`, dataset ID `683ef7d1be0f78757411a7fd`, and last catalogue update `2026-08-12T08:50:50.450000+00:00`.

Its main data resource is [carte_extinction_maille_communale_2026.gpkg](https://static.data.gouv.fr/resources/cartographie-nationale-des-pratiques-declairage-nocturne/20260615-080637/carte-extinction-maille-communale-2026.gpkg), updated **15 June 2026**. The later August change concerns the technical report: do not mistake catalogue modification for a new measurement period. The catalogue links the exact [Cartagene dashboard](https://cartagene.cerema.fr/portal/apps/dashboards/e811c1f42ea846a68dedcf94946dc5a3) from which the API was identified. Its [communal API layer](https://cartagene.cerema.fr/server/rest/services/Hosted/COUCHE_FRANCE_ENTIERE_MAJ_2026/FeatureServer/1?f=json) is named `vecteur_extinction_communes`.

Licence Ouverte 2.0 permits copying, adapting and redistributing data, including commercially, while requiring the source and last update to be identified. Reuse must not imply official endorsement or misrepresent the information. [Licence Ouverte 2.0 text](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0).

Suggested attribution: **Cerema — Cartographie nationale des pratiques d'éclairage nocturne, édition 2026 — données publiées le 15 juin 2026 — Licence Ouverte 2.0**. Identify DarkSkyLab/OFB collaboration in the details where useful; retain the catalogue link. Label displayed dates as observation periods (latest monthly field checked: December 2025), not current lighting status. Satellite observations in the [official explanation](https://www.cerema.fr/fr/actualites/extinction-eclairage-public-nouvelles-donnees-2024-2025) concern the middle of the night, approximately 02:00–04:00; radiance is not ground-level lux.

The [ArcGIS service item's metadata](https://cartagene.cerema.fr/portal/sharing/rest/content/items/a8fe63112f3e4035a3ae6d153b152569?f=json) still has empty `licenseInfo`. That is no longer a blocker for the **commune dataset**, whose publisher catalogue supplies the missing terms. However, the catalogue separately describes subcommunal results as available for viewing, while its downloadable data file is expressly communal. This review does not extend the communal licence conclusion to the 52 subcommunal local zones without further evidence.

### Radiance contract

The [2026 technical report](https://static.data.gouv.fr/resources/cartographie-nationale-des-pratiques-declairage-nocturne/20260812-085049/rapport-technique-cartographie-extinctions-2026.pdf), section 3.3 (page 26), defines monthly fields through **December 2025** as mean VIIRS radiance in **nW·cm⁻²·sr⁻¹**. Section 1.2.1 (page 6) describes the VNP46A3 `AllAngle_Composite_Snow_Free` monthly composites and corrections. Sections 1.2.3 and 2.1 (pages 8–10) describe selected illuminated pixels, missing values as NaNs, and the January 2014–December 2025 series. The article's June 2025 cutoff concerns the lighting-practice analysis; do not apply it to the later monthly radiance fields. A commune-level value does not mean uniform illumination across its entire polygon.

Live checks found numeric, nonnegative `f2025_12` for all ten communes and no negative or null monthly values in their returned histories. No numeric missing-value sentinel was documented in the report. Preserve null/non-finite values as missing rather than zero; a negative value should be treated as unvalidated rather than silently clamped. The dashboard's [configuration](https://cartagene.cerema.fr/portal/sharing/rest/content/items/e811c1f42ea846a68dedcf94946dc5a3/data?f=json) reads monthly fields without a scale factor, uses means only when several communes are selected, and labels the subcommunal chart in the same radiance units.

Practice codes, per report section 3.3: `E` likely complete public-lighting switch-off; `R` renovation and/or partial switch-off; `D` expansion of public/private lighting; `A` expansion and/or abandonment of switch-off; `X` no detected change; `HT` outside the studied light footprint. They are inferred changes, not exposure or health-risk classes.

## Operational notes

- The licences do not promise API availability or stability. Cache modest local extracts through the existing importer and keep last-good snapshots.
- Preserve source, edition, observation period and licence URLs in published dataset metadata and UI.
- Clip display geometry to the ten CCPMB communes without presenting the data as finer-grained measurements than the source actually provides.
- No provider was contacted and no application code was changed by this licence review.

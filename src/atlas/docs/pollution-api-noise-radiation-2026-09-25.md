# Additional pollution APIs: light, noise and radiation

Checked 25 September 2026. Scope: the ten communes in `src/atlas/lib/data/ccpmb-boundaries.json`, not the wider Mont-Blanc area. No application changes.

## 1. Artificial night light — verified local API coverage

**Best actionable candidate from this review.** Cerema publishes satellite-derived monthly radiance and estimated changes in lighting practices (extinction, partial extinction/renovation, expansion), including July 2024–June 2025. These are night-time satellite observations, not ground-level lux measurements or an all-night exposure index; observations correspond to approximately 02:00–04:00. [Official explanation](https://www.cerema.fr/fr/actualites/extinction-eclairage-public-nouvelles-donnees-2024-2025).

The [official dashboard](https://cartagene.cerema.fr/portal/apps/dashboards/e811c1f42ea846a68dedcf94946dc5a3) uses a public, unauthenticated ArcGIS REST service:

- [Communes, FeatureServer/1](https://cartagene.cerema.fr/server/rest/services/Hosted/COUCHE_FRANCE_ENTIERE_MAJ_2026/FeatureServer/1).
- [Subcommunal urban areas, FeatureServer/0](https://cartagene.cerema.fr/server/rest/services/Hosted/COUCHE_FRANCE_ENTIERE_MAJ_2026/FeatureServer/0).

Live `query` requests filtering `code_insee` on layer 1 and `insee` on layer 0 with the ten INSEE codes returned **all ten communes** and **52 subcommunal urban areas** (layer 0 also includes ten commune records: 62 total). Responses were complete, without a transfer-limit warning. Example fields: `nom`, `d_extinct`, `d_renov`, `changes_ep`, monthly `f2025_06`. Passy returned estimated extinction `2022-11`; Combloux `2022-12`; Praz-sur-Arly returned renovation/partial-extinction date `2019-07`. These are inferred dates, not assertions about current municipal policy.

Query contract: `/query?where=code_insee IN ('74083','74085','74089','74099','74103','74173','74208','74215','74236','74256')&outFields=*&returnGeometry=true&outSR=4326&f=geojson` (URL-encode parameters). JSON attribute requests were verified; GeoJSON geometry export still needs integration testing. Clip geometry to the existing commune boundaries.

**License caveat:** the [published ArcGIS item metadata](https://cartagene.cerema.fr/portal/sharing/rest/content/items/a8fe63112f3e4035a3ae6d153b152569?f=json) has empty `licenseInfo` and `accessInformation`. Do not assume the article image's CC-BY label licenses the dataset. Confirm dataset redistribution terms with Cerema before committing snapshots to the public data repository. No authentication was required in the verified calls.

## 2. Road-noise exposure — relevant, local data extraction not yet verified

DDT74 officially publishes strategic noise maps for the A40/RN205 and other qualifying roads; there is no corresponding strategic rail map in Haute-Savoie because rail traffic falls below the mapping threshold. Lden and Ln are **modelled long-term noise indicators**, not real-time microphone measurements. The latest prefectural page refers to 2022/2023 approvals and explains the 1:25,000 interpretation limit. [DDT74 source](https://www.haute-savoie.gouv.fr/Actions-de-l-Etat/Votre-departement/Deplacements/Bruit-des-transports/Exposition-des-populations).

The [DDT74 Ln dataset on data.gouv](https://www.data.gouv.fr/datasets/zones-exposees-au-bruit-en-haute-savoie-ln-1) lists Licence Ouverte 2.0, downloadable Shapefiles, WMS and WFS. Public WFS capabilities responded successfully without authentication:

`https://ogc.geo-ide.developpement-durable.gouv.fr/wxs?map=/opt/data/stack/mapfiles/1.4/org_38090/b23d429f-30a6-44b8-8f1b-2af8f80da690.internet.map&SERVICE=WFS&REQUEST=GetCapabilities`

Advertised type: `ms:N_BRUIT_ZBR_INFRA_R_A_LN_S_074`; native CRS EPSG:2154; GML output, with Ln bands above 50 dB(A) in 5 dB steps. However, bounded feature probes did not produce usable local records (one empty collection and subsequent empty bodies), including a one-record unfiltered request. **Do not call this ready to integrate or claim a verified local feature count.** Resolve the working WFS/WMS or Shapefile export and its reference year first: catalogue modification time is not the noise-model year. A40 exposure makes this relevant, but that is distinct from successful API extraction.

## 3. Ambient gamma radiation — working API, no confirmed station inside scope

[ASNR explains Téléray](https://recherche-expertise.asnr.fr/savoir-comprendre/environnement/reseaux-telesurveillance): it monitors ambient gamma radiation; this is not PM or chemical air-pollution measurement.

The official [Téléray map](https://teleray.asnr.fr/) currently uses `/api` services. A live unauthenticated request to [stations](https://teleray.asnr.fr/api/stations?$limit=1000) returned all **479 stations** (479 features). Nearby records were **AIGUILLE-DU-MIDI**, coordinates `[6.887,45.879]`, and **ANNECY**, `[6.13,45.904]`. The first lies outside the strict CCPMB polygon union; Annecy is also out of scope. No station inside the ten communes was established, so this is not recommended as a local atlas layer. Avoid expanding the territory simply to include radiation data.

The older `https://api.teleray.asnr.fr/wfs/collections/measures/items` endpoint encountered a certificate-chain error and returned 404 in a diagnostic credential-free request with verification disabled. Do not copy that workaround into production. `/api/stations` is a discovered public-map service, not a stability guarantee; measurement contract and reuse license were not verified. The general [ASNR API portal](https://api.asnr.fr/static/index.html) warns that some APIs require a token, but that does not mean this station request did.

## Recommendation

Prioritize the Cerema light layer after license confirmation; it adds a genuinely different pollution topic with verified data for every commune. Continue noise extraction as the next investigation. Exclude Téléray under the current strict geographic scope.

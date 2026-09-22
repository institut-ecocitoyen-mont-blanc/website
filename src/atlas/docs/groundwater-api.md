# Groundwater chemistry API checks

Verified 2026-09-10 against the public Hub’Eau quality-of-groundwater API, version 1.4.0. This is chemistry from ADES, not the groundwater-level API. Scope: the ten CCPMB communes and their existing atlas polygons.

## Working requests

The [official OpenAPI specification](https://hubeau.eaufrance.fr/api/v1/qualite_nappes/api-docs) names the station commune filter `code_commune`; its response field is instead `code_insee`. Analysis commune filtering uses `code_insee_actuel`. Unknown parameters can be silently ignored: never use `code_insee` on stations or `code_bss` on analyses as a filter.

- [Ten-commune station catalogue](https://hubeau.eaufrance.fr/api/v1/qualite_nappes/stations?code_commune=74083,74085,74089,74099,74103,74173,74208,74215,74236,74256&size=1000): HTTP 200, 85 entries, `next: null`; all 85 published points pass the existing exact polygon filter, and 78 have `date_fin_mesure`.
- [Souffray station, Sallanches](https://hubeau.eaufrance.fr/api/v1/qualite_nappes/stations?bss_id=BSS001SGUE): source named `SOUFFRAY`, `code_bss: 06796X0066/SCE`, latitude 45.93646107670436, longitude 6.632064318357569, last catalogue measurement 2021-11-16.
- [Souffray analyses](https://hubeau.eaufrance.fr/api/v1/qualite_nappes/analyses?bss_id=BSS001SGUE&size=200&sort=desc): 1,543 total, paginated, latest sampling timestamp 2021-11-16T09:07:00Z. Example: Clomazone `< 0.005 µg/L`, below detection, controlled level 1 and qualified correct.
- [Cordon analyses](https://hubeau.eaufrance.fr/api/v1/qualite_nappes/analyses?bss_id=BSS001SGTA&size=200&sort=desc): 2,565 total. The first 200 are all from 2024-11-26T08:53:00Z; include nitrates 0.9 mg(NO3)/L and aluminium 11.9 µg(Al)/L. Thus even 200 rows need not contain a complete latest sampling campaign or any historical period.

`bss_id` is the correct documented analysis filter and accepts old or new BSS identifiers. The earlier Cayenne failure was not a parameter problem: BSS001SGSB and its legacy identifier returned zero analyses, despite a 2026-05-21 catalogue date. Keep catalogue and retrieved-analysis dates distinct; show a genuine empty state rather than inventing measurements.

Both JSON endpoints support `fields`, `page`, and `size`; analyses support `sort=desc` by sampling date. Follow response `next` for pagination or explicitly label a bounded window. Validate every returned `bss_id` against the selected station even when the API accepts the query. Live requests included `Origin: http://localhost:3000` and returned `Access-Control-Allow-Origin: *`; no token was needed.

## Presentation contracts

Analysis fields: `date_debut_prelevement`, `code_param`, `nom_param`, `resultat`, `symbole_unite`, `nom_unite`, `code_remarque_analyse`, `nom_remarque_analyse`, `code_statut_analyse`, `nom_statut_analyse`, `code_qualification`, `nom_qualification`, `limite_quantification`, `limite_detection`. Preserve parameter-specific units and sampling timestamps. A provider’s “Correcte” qualification describes data validity, not environmental health.

Per [Sandre remark nomenclature 155](https://id.eaufrance.fr/nsa/155), code 1 is a numerical measurement, including zero; 2 is below detection, 7 is traces below quantification, 10 below quantification, and 3 above saturation. Values accompanying these bounds are thresholds, not exact measured concentrations. Codes 8 and 9 indicate counts above/below the number. Code 4 is categorical: 1 present, 2 absent, 0 unquantified/undetected; code 0 means no analysis. Retain the explanatory remark and appropriate inequality rather than plotting bounds as exact values.

Station `precision_coordonnees` requires visible caution: 74 catalogue entries have code 18 and 11 have code 0. [Sandre nomenclature 916](https://id.eaufrance.fr/nsa/916) defines 18 as commune-seat coordinates, 17 as commune-centroid coordinates, and 0 as unknown precision. Hub’Eau also documents coordinates as potentially blurred. Do not call these exact sampling locations or try to reconstruct protected locations. Place published points and explain their provider-declared precision.

Do not infer a green/red health score from raw groundwater chemistry, absence of measurements, or a data-validation flag. Groundwater sampled before treatment is not interchangeable with distributed drinking-water compliance. Use a neutral layer colour and report measurements and metadata without an unsupported overall quality assessment.

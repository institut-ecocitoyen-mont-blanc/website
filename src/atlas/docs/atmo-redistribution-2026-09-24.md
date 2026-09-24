# Atmo Auvergne-Rhône-Alpes redistribution check

Checked 24 September 2026. Scope: the exact public hourly and daily ArcGIS concentration services currently used by `lib/atmo-stations.ts`, including their published station coordinates. This is a source-based implementation assessment, not a legal opinion or a review of other providers.

## Conclusion

**The linked, dataset-specific official metadata licenses both datasets under ODbL 1.0.** Republishing a local, normalized extract in a public GitHub repository and on GitHub Pages is supported by that licence, provided the attribution, licence notices and database share-alike requirements are met. Do not label the Atmo extracts MIT, public domain or Etalab merely because the surrounding repository uses another licence. [Hourly metadata](https://ids.craig.fr/geocat/srv/api/records/4e9c6cda-450c-4e19-a9ff-97095002df5d/formatters/xml), [daily metadata](https://ids.craig.fr/geocat/srv/api/records/1b30ec84-e656-466b-96a2-2c0161f3a4b8/formatters/xml), [ODbL 1.0, sections 3–4](https://opendatacommons.org/licenses/odbl/1-0/).

## Evidence chain

| Current service | Its ArcGIS item | Official metadata linked by the item |
| --- | --- | --- |
| `Concentrations moyennes horaires/FeatureServer` | [08264f6574e844b8800ee0e18ca5ff9e](https://www.arcgis.com/sharing/rest/content/items/08264f6574e844b8800ee0e18ca5ff9e?f=pjson) | [CRAIG 4e9c6cda-450c-4e19-a9ff-97095002df5d](https://ids.craig.fr/geocat/srv/fre/catalog.search#/metadata/4e9c6cda-450c-4e19-a9ff-97095002df5d) |
| `Concentrations moyennes journalières/FeatureServer` | [2708bbd3ff464850bc112032cee40525](https://www.arcgis.com/sharing/rest/content/items/2708bbd3ff464850bc112032cee40525?f=pjson) | [CRAIG 1b30ec84-e656-466b-96a2-2c0161f3a4b8](https://ids.craig.fr/geocat/srv/fre/catalog.search#/metadata/1b30ec84-e656-466b-96a2-2c0161f3a4b8) |

Both item records are owned by `atmoaura`; their `licenseInfo` and `accessInformation` fields are null. Their descriptions explicitly link the CRAIG records above. Both CRAIG XML documents returned HTTP 200 and contain `Licence ODbL`, a link to ODbL 1.0, and this requested acknowledgement:

> Source ATMO Auvergne - Rhône-Alpes : Mesure de la pollution atmosphérique sur la région Auvergne - Rhône-Alpes

The corresponding [hourly data.gouv catalogue entry](https://www.data.gouv.fr/datasets/concentrations-moyennes-horaires) and [daily entry](https://www.data.gouv.fr/fr/datasets/concentrations-moyennes-journalieres/) show “License Not Specified”. That is an omission in the harvested catalogue, not the end of the evidence chain: the dataset owner's linked metadata supplies the licence.

Atmo's general [website CGU](https://www.atmo-auvergnerhonealpes.fr/article/conditions-generales-dutilisation), sections 2.1–2.3, restrict reuse of website elements and its branding. Those generic clauses are not the permission relied upon here: the exact open-data metadata is. Do not copy the logo, illustrations or other website content under this database licence.

## Publication checklist

- Publish the normalized Atmo database under **ODbL 1.0**; retain the requested attribution and include the licence URI in the JSON envelope and accompanying documentation. Preserve existing rights notices. [Sections 4.2 and 4.4](https://opendatacommons.org/licenses/odbl/1-0/).
- Associate the atlas display with an accessible source/database link and ODbL notice, not just an unlabelled upstream link. [Section 4.3](https://opendatacommons.org/licenses/odbl/1-0/).
- Provide the complete derived local extract in machine-readable form, freely downloadable online. A public JSON snapshot satisfies this practical requirement; a rendered map alone does not. [Section 4.6](https://opendatacommons.org/licenses/odbl/1-0/).
- Keep Atmo data independently identifiable from other providers. Collection-level share-alike is not automatic, and the licence does not cover application programs. Do not impose additional restrictions on Atmo reuse. [Sections 2.3, 4.5 and 4.7](https://opendatacommons.org/licenses/odbl/1-0/).

## Dates, validation and remaining limits

Neither metadata record adds a specific retrieval-date attribution requirement. Nevertheless, preserve measurement timestamps, units, period, validation fields and fetch time; document clipping and schema normalization as IEC transformations. Both records warn that Atmo is not responsible for third-party use of measurements subsequently invalidated. Refresh overlapping history so corrections can replace older values; never portray a retained snapshot as newly measured data. [Hourly constraints and quality statement](https://ids.craig.fr/geocat/srv/api/records/4e9c6cda-450c-4e19-a9ff-97095002df5d/formatters/xml), [daily constraints and quality statement](https://ids.craig.fr/geocat/srv/api/records/1b30ec84-e656-466b-96a2-2c0161f3a4b8/formatters/xml).

This check covers these ArcGIS datasets, not authenticated Atmo-France/Geod'air services, unrelated imagery or new datasets. No provider contact, credentials, publication or application changes were used. The remaining work is implementing the above notices and verifying that the exported files actually preserve them; there is no unresolved licence-identification blocker for these two datasets.

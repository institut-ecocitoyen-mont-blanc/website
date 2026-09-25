# Environmental atlas

The atlas feature lives here. `src/app/(front)/atlas/page.tsx` remains the static Next.js route entry for `/atlas`, with its page metadata. Provider imports now run in [iec-atlas-data](https://github.com/institut-ecocitoyen-mont-blanc/iec-atlas-data), independently of website builds.

`lib/published-data.ts` reads the version-1 manifest and snapshots published on GitHub Pages. `NEXT_PUBLIC_ATLAS_DATA_URL` optionally overrides the data origin (set at build time). The atlas checks published data on opening and every five minutes; it never needs a provider token. Failed imports retain their last good snapshot; import diagnostics are reported in the manifest and browser console, not a global UI banner. Layer-specific availability messages and observation dates remain unchanged. `/carte` is not changed by this pipeline.

The data repository owns the operational parsers (initially copied from website commit `8114d37021ea242eba32bc68653a40b5e060625a`). Existing local provider helpers/tests remain for compatibility and source-link construction, but editing them here does not update the scheduled importer. Make ingestion changes in the data repository as well until the shared models are extracted into a package. GitHub Actions schedules are best-effort; consult the manifest and Actions run summaries for health.

- `AtlasClient.tsx`: client entry and lazy map loading.
- `components/`: map layers, controls, report dialogs and their CSS modules.
- `lib/`: provider loaders, data models, demo datasets and territory geometry (`lib/data/`).
- `tests/`: Node data/geometry regression tests.
- `checks/`: browser checks using Playwright and Chrome.
- `docs/`: provider research and implementation notes.

Shared inventory imports (`src/lib/google-sheets.ts`), the inventory map (`src/components/Map.tsx`), and site-wide SEO/image helpers stay outside this feature. The standalone `/carte` page is unchanged.

Illustrative Institut layers are temporarily commented out in `AtlasMap.tsx`: lichens, bio-accumulation, residential heating, vegetable-growing soils, and the two Institut water layers. Their controls, map content and detail dialogs are disabled; their components/data remain available for later reuse. Demo-specific browser checks require re-enabling them; data-only demo tests still apply.

Atmo has **five independent layers**: PM₂.₅, PM₁₀, NO₂ and O₃ modelled maps, plus measurement stations. Each model has its own checkbox, opacity, legend, loading state and retry. The provider's **2025 annual modelled maps** are exported by the data repository as pre-rendered PNGs embedded in four JSON snapshots (`atmo-model-pm25`, `atmo-model-pm10`, `atmo-model-no2`, `atmo-model-o3`), using its official WMS colour scale. The importer masks them to the ten communes in EPSG:3857; the browser samples these images into canvas tiles with a final boundary mask, without WMS requests. Each image is bounded to 4096 pixels on its longest side: a presentation raster, not numeric concentration data or extra precision at high zoom. Station snapshots remain independent. Multiple models may be overlaid in a fixed order (PM₂.₅ below PM₁₀ below NO₂ below O₃); changing a model never filters station pollutants. Ozone uses the published 2023–2025 average annual exceedance-day indicator, not annual concentration. All five are off initially.

The **Cerema night-light** layer loads the `cerema-light` published snapshot on demand. The scheduled data-repository importer queries the public Cartagene API and validates all ten commune records. The UI keeps explicit retry/error handling. Geometry comes from our pinned commune contours, not from the provider's illuminated-pixel footprints: the colour represents a commune-associated mean, not uniform light at every location. Null, negative and non-finite readings are missing, not zero. Both additions are off initially; inventory remains the only default layer. See [dataset-specific licences and measurement definitions](docs/raster-light-licenses-2026-09-25.md).

The **pesticide-purchases** layer (Sol) loads the `pesticide-purchases` published snapshot, off by default, under Licence Ouverte 2.0. Its data-repository importer loads every Hub’Eau page over HTTPS (including HTTP 206 responses) and checks completeness before publication. The UI defaults to the latest available year and retains the selected year when toggled. Official contract: <https://hubeau.eaufrance.fr/api/v1/vente_achat_phyto/api-docs>; `quantite` is the active-substance mass in kg, not commercial-product volume.

Postal codes 74190, 74700, 74120, 74170 and 74920 are linked to our ten communes using the geo.api.gouv.fr correspondence verified on 2026-09-25. The shaded geometry is a union of pinned commune boundaries, **not official postal contours**. Values always refer to the entire source postal area, never allocated across communes or presented as CCPMB-only totals. Blue classes describe known purchased masses, not contamination, exposure or toxicity. Missing/confidential quantities remain null; a partially known sum has a dashed outline and explicit partial labels in tooltips, details and history. No records is not zero. See `tests/pesticide-purchases.test.mjs` and `checks/check-atlas-pesticides.mjs` (live desktop/mobile, retry and console diagnostics).

All six new snapshots refresh monthly through the data repository's existing hourly scheduler; manual `overlays` mode forces only these six imports. Failed imports retain their last-good snapshot and original success date. Provider-specific licences and transformations accompany each dataset and manifest entry. No visitor requests to Hub’Eau, Cerema or Atmo WMS are needed for these layers; OSM basemap tiles remain separate.

Run from the repository root:

```sh
node --experimental-strip-types --test src/atlas/tests/*.test.mjs
npx tsc --noEmit
npx eslint src/atlas
node src/atlas/checks/check-atlas-institute.mjs
node src/atlas/checks/check-atlas-sidebar.mjs
```

Browser checks require Playwright to be available and a local preview at `http://localhost:3000/atlas`; set `ATLAS_URL` to use another preview. Checks that inspect the static export also require a completed build in `out/`.

See [the atlas implementation notes](docs/environmental-atlas.md) and [groundwater API notes](docs/groundwater-api.md).

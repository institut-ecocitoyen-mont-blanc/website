# Environmental atlas

The atlas feature lives here. `src/app/(front)/atlas/page.tsx` remains the static Next.js route entry for `/atlas`, with its page metadata. Provider imports now run in [iec-atlas-data](https://github.com/institut-ecocitoyen-mont-blanc/iec-atlas-data), independently of website builds.

`lib/published-data.ts` reads the version-1 manifest and snapshots published on GitHub Pages. `NEXT_PUBLIC_ATLAS_DATA_URL` optionally overrides the data origin (set at build time). The atlas checks published data on opening and every five minutes; it never needs a provider token. Failed imports retain their last good snapshot and are reported in the manifest/UI. Observation dates and provider precision remain unchanged. `/carte` is not changed by this pipeline.

The data repository owns the operational parsers (initially copied from website commit `8114d37021ea242eba32bc68653a40b5e060625a`). Existing local provider helpers/tests remain for compatibility and source-link construction, but editing them here does not update the scheduled importer. Make ingestion changes in the data repository as well until the shared models are extracted into a package. GitHub Actions schedules are best-effort; consult the manifest and Actions run summaries for health.

- `AtlasClient.tsx`: client entry and lazy map loading.
- `components/`: map layers, controls, report dialogs and their CSS modules.
- `lib/`: provider loaders, data models, demo datasets and territory geometry (`lib/data/`).
- `tests/`: Node data/geometry regression tests.
- `checks/`: browser checks using Playwright and Chrome.
- `docs/`: provider research and implementation notes.

Shared inventory imports (`src/lib/google-sheets.ts`), the inventory map (`src/components/Map.tsx`), and site-wide SEO/image helpers stay outside this feature. The standalone `/carte` page is unchanged.

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

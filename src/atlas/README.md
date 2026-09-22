# Environmental atlas

The atlas feature lives here. `src/app/(front)/atlas/page.tsx` remains the Next.js route entry for `/atlas`, with its page metadata and server-side data loading.

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

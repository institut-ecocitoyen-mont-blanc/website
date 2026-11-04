# Institut Ecocitoyen du Pays du Mont Blanc

## Comment mettre à jour le contenu du site web?

### Accès à l'editeur de contenu

L'éditeur de contenu se trouve à l'adresse suivante: https://institut-ecocitoyen-pmb.fr/outstatic.

Seules certaines personnes y ont accès. Pour se faire, suivre la procédure suivante:

1. Créer un compte sur [GitHub](https://github.com/signup)
2. Envoyer le nom d'utilisateur à Mathieu par email
3. Accepter l'invitation reçu par email pour rejoindre l'organisation sur GitHub

Vous pourrez maintenant vous connecter sur l'editeur de contenu.

### Editer du contenu

Il existe plusieurs catégories de contenu, regroupées par "Collection".

Seules 2 sont peuvent être éditées sans soucis (les autres peuvent potentiellement demander des mises à jours du code source du site et sont à voir avec Mathieu):

- les actualitées
- les projets

Chacunes des deux collections contiennent des données structurées qui apparaissent sur le site:

#### Actualité

![Actualité](./docs/actualite.png)

#### Projet

![Projet](./docs/projet.png)

## Architecture

The public website and its content editor are deployed independently:

- The repository root is a statically exported Next.js site served by a
  Cloudflare Worker with static assets at `https://institut-ecocitoyen-pmb.fr`
  (configured in [`wrangler.jsonc`](./wrangler.jsonc)).
- [`cms/`](./cms) is a minimal dynamic Next.js application hosted as a separate
  Vercel project at `https://cms.institut-ecocitoyen-pmb.fr`.
- Outstatic stores content in this repository under [`outstatic/`](./outstatic).
  Saving content creates a commit on `main`, which triggers a new Cloudflare
  build.
- Vercel's free plan can't deploy organization repositories through Git, so
  the [deploy workflow](./.github/workflows/deploy.yml) builds the CMS and
  uploads it with the Vercel CLI (`VERCEL_TOKEN` secret) when `cms/` changes on
  `main`. Run it by hand from the Actions tab to redeploy after changing the
  Vercel project's environment variables.
- Spreadsheet edits trigger a Cloudflare build through the Google Apps Script
  in [`integrations/google-sheets/`](./integrations/google-sheets).

The Cloudflare Workers Builds project uses:

```text
Production branch: main
Build command: npm run build
Deploy command: npx wrangler deploy
```

`wrangler deploy` uploads `out/` as static assets and serves `404.html` for
unknown paths. `workers.dev` and preview URLs are disabled.

The build fails when the pollution inventory spreadsheet can't be read or is
empty, so the previous deployment stays online rather than an empty `/carte`.

After attaching the production domain, enable Cloudflare Web Analytics for the
site in the Cloudflare dashboard.

The Vercel CMS project uses `cms` as its Root Directory. Copy
[`cms/.env.example`](./cms/.env.example) into the Vercel project environment and
fill in the secrets. The production GitHub OAuth callback is:

```text
https://cms.institut-ecocitoyen-pmb.fr/api/outstatic/callback
```

## Developers

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

To run the CMS locally, create `cms/.env.local` from `cms/.env.example`, use a
separate local GitHub OAuth app whose callback is
`http://localhost:3000/api/outstatic/callback`, then run:

```bash
cd cms
npm install
npm run dev
```

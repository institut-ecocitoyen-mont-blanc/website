# Rebuild the site when the spreadsheet changes

The public site reads the pollution-source spreadsheet during `next build`.
This Apps Script, bound to that spreadsheet, calls a Cloudflare Workers Builds
Deploy Hook whenever an editor changes a value or the spreadsheet structure.

A bound script belongs to one spreadsheet. Whenever the site switches to
another spreadsheet (`SPREADSHEET_ID` in
[`src/lib/google-sheets.ts`](../../src/lib/google-sheets.ts)), install the
script again on the new one: edits to the new sheet rebuild nothing until then.

## Setup

1. In Cloudflare, open **Workers & Pages → `icc-website` → Settings → Builds →
   Deploy Hooks**.
2. Create a hook named `google-sheets` for the `main` branch and copy its URL
   (`https://api.cloudflare.com/client/v4/workers/builds/deploy_hooks/…`).
   A `…/pages/webhooks/deploy_hooks/…` URL belongs to the former Pages project
   and does not rebuild the site.
3. Open the source spreadsheet and select **Extensions → Apps Script**.
4. Replace the editor contents with `Code.gs` from this directory.
5. In Apps Script, open **Project Settings → Script properties** and add:
   - Property: `CLOUDFLARE_PAGES_DEPLOY_HOOK`
   - Value: the Deploy Hook URL
6. Run `installCloudflarePagesTriggers` once and approve the requested scopes.
7. Run `testCloudflarePagesDeploy` and confirm a build triggered by the deploy
   hook appears in the Worker's build history. After it deploys, the
   “Dernière mise à jour” date at the bottom of `/carte` shows the time of
   that build.

The hook URL is an unauthenticated bearer secret. Keep it in Script Properties,
never paste it into this repository. Delete and recreate the hook if it leaks.

Installable edit triggers run for user edits, and change triggers cover
structural operations such as adding a sheet or column. Google does not fire
these triggers for changes made through the Sheets API or another script; if
the spreadsheet is updated that way—or only changes because a formula is
recalculated—the updater must call the Deploy Hook itself.

The atlas does not depend on this hook: `iec-atlas-data` re-reads the same
spreadsheet every hour.

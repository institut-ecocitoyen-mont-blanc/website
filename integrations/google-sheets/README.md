# Rebuild Cloudflare Pages when the spreadsheet changes

The public site reads the pollution-source spreadsheet during `next build`.
This bound Google Apps Script calls a Cloudflare Pages Deploy Hook whenever an
editor changes a value or the spreadsheet structure.

## Setup

1. In Cloudflare, open the Pages project, then go to **Settings → Builds →
   Deploy hooks**.
2. Create a hook named `google-sheets` for the `main` branch and copy its URL.
3. Open the source spreadsheet and select **Extensions → Apps Script**.
4. Replace the editor contents with `Code.gs` from this directory.
5. In Apps Script, open **Project Settings → Script properties** and add:
   - Property: `CLOUDFLARE_PAGES_DEPLOY_HOOK`
   - Value: the secret Cloudflare Deploy Hook URL
6. Run `installCloudflarePagesTriggers` once and approve the requested scopes.
7. Run `testCloudflarePagesDeploy` and confirm a deployment appears in
   Cloudflare Pages.

The hook URL is an unauthenticated bearer secret. Keep it in Script Properties,
never paste it into this repository. Delete and recreate the hook if it leaks.

Installable edit triggers run for user edits, and change triggers cover
structural operations such as adding a sheet or column. Google does not fire
these triggers for changes made through the Sheets API or another script; if
the spreadsheet is updated that way—or only changes because a formula is
recalculated—the updater must call the Deploy Hook itself.

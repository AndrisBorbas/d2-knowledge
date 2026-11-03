# d2-knowledge

This repo contains the website for the **Owl Sector** project. It uses next.js and custom parsers to generate a static site from the [compendium sheet](https://docs.google.com/spreadsheets/d/1WaxvbLx7UoSZaBqdFr1u32F2uWVLo-CJunJB4nlGUE4/edit) and [clarity](https://www.d2clarity.com/).

## Weekly data refresh

The `Refresh data` GitHub Action runs every Tuesday at 18:00 UTC (and on demand from the Actions tab). It runs `bun run data:compile`, builds the site to make sure the new data is valid, and pushes the updated `data/` snapshots to `main`, which makes Cloudflare rebuild and deploy. It needs these repository secrets:

- `GOOGLE_SHEETS_API_KEY`: Google Sheets API key for the Compendium and Aegis sheets.
- `BUNGIE_API_KEY`: Bungie API key for the manifest.
- `CLOUDFLARE_DEPLOY_HOOK_URL` (optional): a Cloudflare build hook, used to still rebuild the site in weeks where the data did not change.

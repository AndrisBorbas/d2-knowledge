// The compiled dataset is served as a plain static asset instead of being
// serialized into the glossary's RSC payload. On Vercel that keeps it out of the
// (metered) ISR cache and lets the browser cache it across navigations; on
// Cloudflare it is just a Workers static asset.
//
// Kept in sync by hand with the literal path in `load.ts` - passing segments
// through a variable would defeat Next's static filesystem tracing.
export const COMPENDIUM_ASSET_URL = "/assets/data/compendium.min.json";

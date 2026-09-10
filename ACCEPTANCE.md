# Acceptance report

## Checked locally in this delivery

- [x] Greek public routes and Greek admin labels are present.
- [x] Responsive desktop/mobile CSS and a mobile navigation menu are present.
- [x] Public database queries expose only `active` motorcycle listings.
- [x] Sold and hidden motorcycle detail URLs return 404 through the active-only query.
- [x] Optional price is modeled as `NULL` and rendered as «Ρωτήστε μας».
- [x] Registration month was removed; only required year is stored.
- [x] 20-photo motorcycle limit is enforced on client and server.
- [x] No watermark processing is present.
- [x] Viber is present; WhatsApp is intentionally absent.
- [x] Business email is intentionally absent.
- [x] Separate accessories/accessory-images schema and admin-managed workflow are present.
- [x] Private originals, public display images and thumbnails use Netlify Blobs.
- [x] Public media route refuses original image keys.
- [x] Server image processing uses Sharp, actual format validation and input pixel limits.
- [x] Every privileged admin API request calls shared server-side `requireAdmin()`.
- [x] Mutations verify same-origin requests for CSRF mitigation.
- [x] SQL is parameterized through tagged-template queries.
- [x] Fullscreen gallery includes close, arrows, Escape, keyboard arrows, mobile swipe, scroll lock and focus restoration.
- [x] Dynamic metadata, canonical URLs, OpenGraph, sitemap, robots and admin noindex are implemented.
- [x] Moto Prionas logo supplied by the owner is included in the site assets.

## Requires a linked Netlify project to verify

These cannot be truthfully marked as runtime-tested in this isolated environment:

- [ ] Production/preview migration execution against Netlify Database.
- [ ] Real Netlify Identity invite, login cookie and role flow.
- [ ] Real Blob write/read/delete lifecycle on Netlify.
- [ ] Real deploy of Next.js 16 through Netlify's adapter/runtime.
- [ ] Physical-phone camera upload and Viber deep-link behavior.
- [ ] Production Lighthouse measurements.
- [ ] Custom-domain DNS and HTTPS for `motoprionas.gr`.

Run these before considering the production launch complete.

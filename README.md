# Moto Prionas

Production-oriented Greek motorcycle dealership/listings site for **Moto Prionas**, built with Next.js App Router, TypeScript, Netlify Database, Netlify Blobs, Netlify Identity and Netlify Functions.

## Business configuration

Fixed business information is centralized in `lib/config/site.ts`:

- Seller: Κωνσταντίνος Πριόνας
- Address: Τριών Ιεραρχών 57, Νέα Έφεσος Πιερίας, 60150
- Phone: 698 041 2648 / E.164 `+306980412648`
- Viber: same number
- WhatsApp: intentionally not used
- Email: intentionally not displayed
- Instagram: configured
- Domain: `https://motoprionas.gr`
- Maximum motorcycle photos: 20
- Watermark: intentionally disabled

## Accessories schema decision

Because ΑΞΕΣΟΥΑΡ - ΑΝΤΑΛΛΑΚΤΙΚΑ is admin-managed, it uses separate `accessories` and `accessory_images` tables. Motorcycle-only fields such as year, km and cc are not reused. Accessories support title, optional price (blank = «Ρωτήστε μας»), description, status and images.

## Local setup

Requirements: Node.js 22.13+ (the current Netlify CLI requires it), npm and a Netlify account.

```bash
npm install
npx netlify login
npx netlify init
npx netlify database status
npm run dev
```

Netlify Database migrations live in `netlify/database/migrations/`. When running through Netlify Dev, Functions, Identity runtime context, Database and Blobs are available using the Netlify-compatible workflow.

## Identity setup

1. Open the Netlify project dashboard and enable **Identity**.
2. Set registration to **Invite only**.
3. Do not expose any public signup page (the project does not include one).
4. Invite exactly the administrator email.
5. Open the Identity user in Netlify and assign role `admin`.
6. Add `ADMIN_EMAIL` in Netlify environment variables for defense in depth.
7. Log out and back in after changing roles so the JWT refreshes.

The current `@netlify/identity` package is used. Privileged Functions call `getUser()` through the shared `requireAdmin()` helper and require the `admin` role. Cookie-based state-changing endpoints also verify request origin for CSRF protection.

## Environment variables

- `ADMIN_EMAIL`: recommended; the only administrator account allowed to mutate data.
- `NEXT_PUBLIC_SITE_URL`: optional convenience value; canonical URL is already centralized in `lib/config/site.ts`.

Do not place secrets in `NEXT_PUBLIC_*` variables.

## Deployment

1. Create a Git repository and commit the project.
2. Push it to GitHub/GitLab/Bitbucket.
3. In Netlify choose **Add new project → Import an existing project** and connect the repository.
4. Netlify detects Next.js. Build command is `npm run build`.
5. Create/enable Netlify Database under **Data & Storage → Database** if it is not provisioned automatically.
6. Migrations under `netlify/database/migrations/` are applied by Netlify as part of deploys.
7. Enable Netlify Identity and set **Invite only**.
8. Invite the administrator and assign role `admin`.
9. Add `ADMIN_EMAIL` to production environment variables.
10. Deploy production.
11. Test creating, editing, hiding, marking sold and deleting a motorcycle.
12. Test a real multi-photo upload from the seller's phone.
13. Add custom domain `motoprionas.gr` in **Domain management** and complete the DNS instructions Netlify gives you.
14. Confirm Netlify HTTPS is active.
15. Verify `/sitemap.xml`, `/robots.txt`, listing OpenGraph preview, telephone and Viber links.

## Administrator guide (Greek)

### Σύνδεση

Ανοίξτε `/admin/login`, γράψτε το email και τον κωδικό πρόσβασης του λογαριασμού που έχει προσκληθεί στο Netlify Identity και πατήστε **Σύνδεση**.

### Νέα αγγελία

Από `/admin` πατήστε **+ Νέα Αγγελία**. Συμπληρώστε τίτλο, τιμή (ή αφήστε κενή για «Ρωτήστε μας»), χρονολογία, χιλιόμετρα, κυβικά, προαιρετικό καύσιμο και περιγραφή.

### Φωτογραφίες

Επιλέξτε έως 20 φωτογραφίες. Μεγάλες φωτογραφίες μειώνονται στον browser πριν σταλούν μία-μία. Με τα βελάκια αλλάζετε σειρά. Η πρώτη νέα φωτογραφία γίνεται κύρια όταν δημιουργείται μια αγγελία. Στην επεξεργασία μπορείτε να ορίσετε άλλη κύρια φωτογραφία και να αφαιρέσετε υπάρχουσες.

### Κατάσταση

- **Ενεργή**: εμφανίζεται δημόσια.
- **Κρυφή**: φαίνεται μόνο στο admin.
- **Πουλήθηκε**: δεν εμφανίζεται δημόσια, σύμφωνα με την τελική επιχειρηματική απόφαση.

### Επεξεργασία / διαγραφή

Από τη λίστα διαχείρισης πατήστε **Επεξεργασία**. Για διαγραφή υπάρχει επιβεβαίωση και γίνεται καθαρισμός των σχετικών Blob αντικειμένων μετά τη διαγραφή της βάσης.

## Image pipeline

The browser resizes selected JPEG/PNG/WebP images to a maximum long edge of 2560px and aims for an upload below 4MB. Each image is uploaded separately. The Function validates actual image content with Sharp, enforces a pixel limit, auto-rotates, and writes:

- private original upload copy
- high-resolution WebP display image
- WebP thumbnail

Public `/media/*` requests only serve `display.webp` and `thumb.webp` keys. Original keys are rejected. No watermark is applied because the owner explicitly opted out.

## Notes on verification

`scripts/static-check.mjs` validates required project structure, expected schema and key security/upload patterns without requiring a Netlify account. Full runtime acceptance testing still requires a linked Netlify project because Database, Identity and Blobs are platform services.

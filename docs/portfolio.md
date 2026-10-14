# Portfolio publishing

The [project site](https://bay-compassion.github.io/food-market-app/) introduces the product and
engineering decisions. The repository README uses the same screenshot assets. Presentations live
under `/presentations/market-day-reel/`, `/presentations/guest-guide/`, and
`/presentations/queue-desk/`.

## Refresh the screenshots

```bash
npx playwright install chromium # once
npm run capture:portfolio
```

The command starts isolated Vite and Storybook servers on ports 5198 and 6098 and closes them when
finished. It writes the curated assets to `docs/images/portfolio/`:

- `registration.png`: English registration, captured from the app.
- `farsi.png`: the same screen in Farsi, showing right-to-left layout.
- `waiting.png`: a selected guest's place in line, captured from the app.
- `queue.png`: Storybook's **Admin/Queue/Queue → During Service**, at phone width.
- `social.png`: a 1200 × 630 social preview rendered from the project's HTML card.

Guest captures reuse the review document's `AppServer`, `SceneFixtures`, and `Screenshotter`:
a fixed clock, fictional guest identity, fresh browser storage, and intercepted APIs. They need
no backend, production credentials, or real guest records. The queue story supplies fictional
data and the real admin shell. Only a fully captured set replaces the public images.

Commit refreshed images with a UI change when it affects these screens. The Pages workflow also
runs the capture before assembling the site, so deployed screenshots follow the built source.
The README displays the committed images; CI uploads a refreshed set as the `portfolio-images`
artifact for review and copying into a subsequent commit. Automation does not write back to a branch.

## Edit and preview the site

Start with [Shopping for food shouldn’t start with a race](project-purpose.md) when changing
editorial copy. It explains the market’s purpose, registration barriers, and aims for the new app
in the organization’s voice. The README and landing page should tell that story before describing
features.

- `packages/presentations/portfolio/index.html`: editorial project story and walkthrough links.
- `packages/presentations/portfolio/portfolio.css`: landing page styles.
- `packages/presentations/portfolio/social.html`: social preview source; recapture after editing.
- `packages/presentations/site.html`: individual presentation page template.
- `packages/presentations/videos.ts`: presentation registry and publication paths.

These project pages are English editorial documentation. Guest interfaces and presentation
controls continue to use the app's translation dictionaries.

```bash
node packages/presentations/publish.ts
node packages/presentations/verify.ts --site-only
python3 -m http.server 8080 --directory packages/presentations/out/site
```

Open `http://localhost:8080`. The build writes to ignored `packages/presentations/out/site/` and
never pushes or deploys. It copies the committed screenshots, so a local site build needs no
browser unless you are refreshing them or running verification. Narration timings and soundtracks
must be current; see the [presentation guide](../packages/presentations/README.md).

## GitHub Pages

The **Publish project site** workflow builds on `main` when site or app sources change and can be
run manually. Only a run on `main` deploys; other branches produce a Pages artifact for review.
`PAGES_BASE_URL` comes from GitHub Pages configuration and supplies canonical and social image URLs.
The root `source.json` records the source commit, branch, and whether local changes were present.

Previously shared `/guest-guide/`, `/queue-desk/`, and `/reel.html` URLs redirect to their new
presentation locations. The root is now the project overview. No live guest-facing application
is deployed to GitHub Pages; Netlify remains the app's deployment target.

## Sharing the project

Use the project root URL when sharing a portfolio entry; it has a description and PNG social
preview. Link a guide directly when the audience needs instructions rather than the case study.
The README's opening paragraph provides a reusable project description.

The case study uses first-person copy for the sole technical contributor’s architecture, product
management, requirements gathering, and implementation work, including stakeholder interviews and
observation of market practices. Add lessons from field use and outcome numbers when they can be
verified; the current copy does not assert adoption or measured impact.

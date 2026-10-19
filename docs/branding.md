# Brand Assets

The source artwork comes from Canva’s **Compassion 2026** Brand Kit
(`kAHLdhChAkI`), collected October 14, 2026. The original SVGs live in `public/`:

| File Prefix `bay-compassion-`                                          | Use                                                             |
| ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| `primary.svg`                                                          | Original full horizontal logo, retained as an alternative       |
| `icon-closed.svg`                                                      | App bar, favicon, PWA icons, notifications                      |
| `wordmark-primary.svg`, `wordmark-secondary.svg`                       | Supplied horizontal and stacked wordmark source assets (unused) |
| `secondary-open.svg`, `secondary-closed.svg`, `alternate-centered.svg` | Alternative logo layouts                                        |
| `icon-open.svg`, `crest-open.svg`, `crest-closed.svg`                  | Alternative icon and crest artwork                              |
| `together-we-flourish.svg`                                             | Supplied tagline graphic                                        |

The names “open” and “closed” identify artwork variants, not market status.
Document headers are composed from the closed logo and live Area Normal text, with shared
proportions in `src/styles/brand.css`. The app imports this stylesheet; the asset generator copies
it to `public/brand.css` for static flyers, and presentation builds embed it. React documents use
`BrandLockup`; plain HTML documents use the same markup and classes. Supplied wordmark artwork is
retained as source material but is not used by the current documents.

`bay-compassion-icon-digital.svg` is derived from the supplied closed logo: a white circle behind
the teal path makes every interior cutout white, while the space outside the circle stays
transparent. Its artboard is cropped to the circle for small-screen legibility. Favicons, PWA icons,
app-bar icons, and document lockups all use this version. Notification badges keep the original
silhouette because the platform treats their alpha channel as a monochrome mask.

Dark document headers use white live text beside the full-color digital logo. The logo has a fine
white edge so its closed outline remains visible against a Harbor Blue background.

## Colors and Typography

- **Harbor Blue:** `#275C63`, primary brand color; pair with white text.
- **Lake Blue:** `#7EBDC5`, secondary accents; pair with dark text.
- **Black:** `#000000`, primary text on light surfaces.
- **White:** `#FFFFFF`, text on Harbor Blue and the page/PWA launch background.

Hover (`#1E474D`), dark presentation (`#142F33`), and soft surface (`#EEF7F8`) shades are derived
from the palette. Functional status colors and the amber keyboard-focus ring retain their existing
meaning. App tokens live in `src/styles/base.css`; concrete MUI palette values in `src/theme.ts`
must stay aligned. Static flyers and presentation styles carry equivalent values.

Headings, structural labels, buttons, and counts use **Area Normal** (ExtraBold 800 and Black 900).
App headings and labels use tighter tracking through `--tracking-heading` and `--tracking-label`
in `src/styles/base.css`; RTL containers reset these to zero to preserve joined letterforms.
Document headings and brand lockups keep their own spacing.
Body text uses **DM Sans** (400–900, plus regular italic). Existing heading weights below 800
resolve to the supplied ExtraBold face; no artificial bold is needed. Both families are self-hosted
as WOFF2 in `public/fonts/`, with `font-display: swap`. The shared stylesheet is
`public/fonts/brand.css`, imported by the app and linked by static pages. Standalone presentation
builds embed the same font declarations and binary files.

Area falls back to DM Sans. Body text falls back to Roboto, then Arial and the system sans-serif;
Arabic/Farsi and Chinese use Noto Sans Arabic and Noto Sans SC where available. Roboto and Noto
web fallbacks are loaded from Google Fonts; the primary brand fonts need no external font service.
The original DM Sans files include the SIL Open Font License, preserved as
`public/fonts/dm-sans-ofl.txt`. The organization confirmed Area’s website use is licensed.
SVG logo lettering is outlined and requires no font file.

The WOFF2 files were losslessly converted from the supplied static TTF/OTF files with
FontTools 4.60.2 and Brotli 1.2.0. The archive’s DM Sans README mentions variable fonts, but no
variable font was included; these are the supplied static weights. The original desktop files
remain outside the public repository.

## Raster Derivatives

Run `pnpm exec tsx scripts/generate-brand-assets.mts` to regenerate the compatibility PNGs from the SVGs.
It requires the project’s Playwright Chromium installation. It produces:

- `bay-compassion-logo.png`: digital icon with opaque white counters and transparent corners, preserving the URL used by Auth0 and other consumers.
- `brand-lockup.png` and `brand-lockup-white.png`: logo and custom text rasterized from the shared
  composition for README renderers on light and dark backgrounds.
- `wordmark.png`: a compatibility copy of the custom lockup, preserving the existing public URL.
- `favicon.png`: 64px digital-logo fallback, with white counters.
- `icon-192.png` and `icon-512.png`: padded icons on white for the PWA and Apple touch icon.
- `notification-badge.png`: white silhouette on transparency for notification badges.

The SVG favicon and app bar use `bay-compassion-icon-digital.svg` directly. Presentation builds
embed the digital logo and compose the brand name as live text. The project site copies the digital
logo to `logo.svg` for its HTML lockups.

The kit’s photographs have no direct counterpart among the repo’s UI screenshots. They, the
crests, and the tagline graphic have no automatic editorial placement. The QR artwork and map data
are functional assets and retain their contents. Unreferenced older `docs/images/` screenshots are
historical captures; current README and portfolio images are regenerated with `pnpm run capture:portfolio`.

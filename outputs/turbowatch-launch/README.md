# TurboWatch launch kit

Original reusable identity and launch artwork for the existing TurboWatch app. The visual system pairs paper, pine and coral with a recurring orbital line and the existing lightning mark. Nothing in this folder has been posted externally.

## Files

| Asset | Format / dimensions | Use |
| --- | --- | --- |
| `brand-sheet.svg`, `brand-sheet.png` | 1600 × 1200 | Visual style guide and component direction |
| `social-preview.svg`, `social-preview.png` | 1200 × 630 | Landscape social / link preview |
| `portrait-promo.svg`, `portrait-promo.png` | 1080 × 1350 | Portrait promotion |
| `product-desktop.png` | 1440 × 1050 | Actual redesigned local product screen |
| `product-mobile.png` | 390 × 844 | Actual redesigned local guest preview used in portrait art |
| `product-feed-mobile.png` | 390 × 844 | Additional actual sample-feed screen; not used in promotional compositions |
| `logo-primary.svg`, `logo-inverse.svg`, `icon.svg` | SVG | Reusable logo variants copied from the app brand assets |
| `launch-copy.md` | Markdown | Concise prepared copy with a fact-check note |
| `manrope.ttf`, `MANROPE-OFL.txt` | TTF / text | Bundled open-source typography and its license |
| `MEDIA-CREDITS.md`, `licenses/` | Markdown / text | Product sample-media attribution and retained source licenses |
| `generate-kit.py`, `export-png.py` | Python | Rebuild the SVG compositions and local PNG exports |
| `turbowatch-launch-kit.zip` | ZIP | Complete portable collection of the kit files, excluding the ZIP itself |

The SVG compositions embed their screenshot and Manrope font data so they travel as standalone files. The PNG files are exact-size raster exports. The screenshots show the actual local application; **sample content is labeled and is not evidence of published community posts**.

## Identity

- **Promise:** Follow your curiosity.
- **Product language:** Watch short stories. Save good finds. Share a point of view.
- **Pine:** `#24382B` — primary text, inverse panels.
- **Paper:** `#F7F5EF` — main canvas.
- **Coral:** `#E64C36` — identity accent and emphasis; use dark ink or an appropriately darkened action background when contrast requires it.
- **Sage:** `#EDF1E6` — quiet interface grouping.
- **Butter:** `#E4B96E` — small editorial highlights.
- **Typography:** Manrope for controls, information and strong headings; Georgia italic for one editorial accent at a time. Avoid long all-caps text and tiny supporting copy.
- **Shape:** softly rounded cards and simple orbital hairlines. Keep a generous clear zone around the lightning mark.
- **Motion:** restrained opacity / short vertical entrances and brief hover feedback. Respect reduced motion and keep core actions available without animation.

## Use responsibly

These are prepared launch assets, not proof of a public launch. The existing production address is `https://turbo-watch-turbo-twitch.vercel.app`; Vercel protection currently prevents independent live app/auth verification. The existing Supabase project is installed, but public confirmation/reset email delivery remains limited while custom SMTP is disabled. Do not publish copy claiming public sign-in works until that setup is complete and verified. This work preserves the GitHub-only delivery preference and makes no deployment or account changes. The verified service details and remaining delivery limits are recorded in [hosted status](../../docs/hosted-status.md).

The horizontal logo wordmarks use outlined Manrope glyphs and remain portable without installed fonts. Manrope is © 2019 The Manrope Project Authors, SIL Open Font License 1.1; see `MANROPE-OFL.txt`. Product sample-media credits are bundled in [MEDIA-CREDITS.md](MEDIA-CREDITS.md), with retained source licenses in `licenses/`; they are also available in [the app media credits](../../public/media/SOURCES.md). The artwork uses existing licensed product media and original layout / vector treatments; no vendor reel artwork, koala, testimonials, predictions or invented performance statistics are included.

## Export

Run `python3 outputs/turbowatch-launch/generate-kit.py` from the repository root after the product screenshots exist. Export the resulting standalone SVGs to PNG at their declared dimensions using a browser. Run `python3 outputs/turbowatch-launch/export-png.py` to rasterize with the existing local Inkscape tool and bundled Manrope font. No paid API or external generation service is required.

# Brand export helpers

These source helpers live outside the downloadable launch assets.

From the repository root, after capturing the current product screens:

```sh
python3 scripts/brand/generate-kit.py --promos-only
python3 scripts/brand/export-png.py --promos-only
```

The first command creates self-contained screenshot-based SVG promotions in
`outputs/turbowatch-launch/`. The second uses the existing local Inkscape tool
and bundled Manrope font to export PNGs. No network or paid service is used.
Omit `--promos-only` only when deliberately regenerating the reusable brand
sheet. The portrait uses `showcase-mobile.png`; the landscape uses
`product-desktop.png`.

Keep generators, traces, credentials, caches, and application storage out of the
asset ZIP and its export manifest. Include the supplied font/media credits.

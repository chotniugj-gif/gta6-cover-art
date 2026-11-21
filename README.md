# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/chotniugj-gif/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/chotniugj-gif/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Sunset Cover Studio turns your own photo and a caption into GTA-style poster cover art: five layouts, bold Anton lettering with a sunset blend, a striped setting sun and palm silhouettes drawn in code, and sunset, neon or Vice heat colour grades, exported as a PNG in the post sizes people actually share — 1080 × 1080, 1080 × 1350 and 1920 × 1080.

## What it does

- **Your photos, your machine.** Pick one photo or several from your files. They are read locally and never uploaded anywhere.
- **Crop and position each photo.** Click a panel to select it, then drag the photo inside it and scroll to zoom. A zoom slider and Fit / Fill buttons do the same job precisely, and one photo can fill every panel at once. Photos sit top-anchored in their panels, so a portrait photo keeps the sitter's head in frame instead of cropping it out.
- **Five layouts.** A four-panel grid, a hero split with one big panel, three vertical strips, a single full-bleed photo, or a center band — one photo shown whole against a blurred bleed of itself, with the caption band across the bottom.
- **Five colour grades.** Sunset, neon night, palm dusk, Vice heat, or the photo as it is — each with a vignette and a fine film grain so the panels sit in one poster.
- **Lettering you control.** A caption and a tagline, four lettering colours, top or bottom placement, and a size slider. The caption is filled with a sunset blend and outlined in dark ink. The lettering is Anton, shipped under the SIL Open Font License.
- **Live preview, one-click export.** What the preview shows is what the PNG holds. Pick a size, hit Export PNG, and the file downloads at exactly that size.

Everything in the app is original: the art, the lettering and the code are ours, and the app ships no game logo, artwork, character or font. It is plain static files under `app/` with no build step, and it works offline — every script, font and image it loads is a file under `app/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080

MAKEFUN_OUTPUT_DIR=out node main.ts
```

`node serve.ts` serves `app/` at http://localhost:8080 for trying the studio in a desktop browser. `MAKEFUN_OUTPUT_DIR=out node main.ts` hands the app in, writing `out/` with the app, the screenshots and `dossier.json`.

## How a cover is made

1. Choose photos, or load a sample photo to try it.
2. Click a photo in the tray, then click a panel to place it. Drag inside a panel to move the photo, scroll to zoom it.
3. Pick a layout and a colour grade.
4. Write the caption and tagline, choose the lettering colour and where it sits.
5. Pick an export size and press Export PNG.

---

<sub>Entered on [make.fun](https://make.fun/?ref=c8w435wv&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

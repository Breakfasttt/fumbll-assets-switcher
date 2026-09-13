# FUMBBL Assets Switcher

A local desktop tool (Electron + React + TypeScript) to customize the official FUMBBL Java client's graphical assets — player icons, portraits, pitches (by weather) — without ever modifying the client itself.

It works entirely through the client's own **Local Icon Cache** mechanism: FUMBBL caches downloaded assets in a local folder with a `map.json` index (URL → file). This tool lets you drop in your own images for that same index, so the official client loads your custom art instead of the default one — no patched jar, no unofficial client.

## Features

- **Rosters**: browse any FUMBBL roster (BB2025 and special/legacy rosters), see every position's portrait and iconset, and override either with your own image.
- **Portraits**: fixed 95×147 aspect ratio, with a built-in crop/resize tool and an AI image-generation prompt helper.
- **Iconsets**: visual breakdown of the 4-pose sprite sheet grid, a pixel editor to touch up individual cells, and a "repeat a variant across every row" tool.
- **Pitches**: per-roster and special-competition pitch backgrounds, one override per weather condition, also with crop/resize.
- **Packs**: bundle your currently active overrides into a shareable `.zip` pack, import someone else's, and switch between packs (activating a pack deactivates everything else, so exactly one "theme" is live at a time).
- **Orphans**: clean up disabled overrides and stray cache files left behind by manual edits.
- Local language: English, French, Spanish, German.

## Requirements

- Windows (registry-based auto-detection of the FUMBBL client's cache folder is Windows-only; manual folder selection works everywhere the FUMBBL client itself runs).
- The FUMBBL client's **Local Icon Cache** must be enabled: in the client, go to *Settings → Local Icon Cache*, turn it on, and pick a folder.

## Getting started

```bash
npm install
npm run dev     # starts the app in development mode
```

```bash
npm run build   # type-checks and builds the app
npm run typecheck
```

On first launch, open **Configuration** and either auto-detect your FUMBBL cache folder or pick it manually — it must be the same folder configured in the FUMBBL client's Local Icon Cache setting.

## How it works

- Custom images are stored in the app's own data folder, never directly inside the FUMBBL cache folder — this keeps the tool's bookkeeping separate from the real client. Activating an override copies the file into the real cache folder under the MD5 hash of its source URL, exactly the naming convention the FUMBBL client itself uses, and updates `map.json` accordingly.
- Deactivating an override removes it from the real cache (falling back to the original asset) without deleting your custom file, so you can turn it back on later.
- Nothing here touches the FUMBBL client's jar or source — it only ever writes to the cache folder the client already reads from.

## Disclaimer

This is an unofficial, community tool. It is not affiliated with or endorsed by FUMBBL.

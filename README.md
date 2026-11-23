# The Road Warrior — staging copy

Pool tournament tracker and trainer. It runs in the browser on your phone, works offline, and keeps everything on the device (no account).

- **Live app:** https://scottanium.github.io/road-warrior/
- **Staging (test copy):** https://scottanium.github.io/road-warrior-staging/
- **Version:** v26 = v25 features, with the content moved into `data/` files (code overhaul; nothing you see should have changed). Offline cache: `road-warrior-staging-v26`.

> **This is the STAGING copy.** It shows a red STAGING banner and stores everything under a `stg_` prefix so it never touches the live app's saved data. It is generated from the live copy: see "Staging vs live" below.

## What it does

- Tracks tournaments and trips: finder, trip cost, payout projection, history, optional money ledger.
- Trains: daily plan, drill library, Shot Lab, Table Capture, skill tests, practice log, step timer.
- Extras: Geometry diagrams, Rules Compare, Right-Cut Fix, Credits, Get Started tour.
- First launch shows an I Agree notice. The answer is stored only on that phone.

## How the files are organised

- `index.html` loads the files in this order: `shared/` helpers, `data/` content + config, then the feature code. Add a new file there if you add one.
- `data/` — **content and settings only** (no logic). This is where you edit things.
- `shared/util.js` — small helpers used by many files (`window.RW`: `Lg`, `Sg`, `esc`). Fix a helper once, here.
- Everything else (`app.js`, `adaptive.js`, `tournaments.js`, ...) is the code. It reads the `data/` files.
- `pool-trainer-single.html` is a generated one-file copy. Never edit it by hand.

## How to change common things (which file to edit)

| I want to change... | Edit this |
|---|---|
| Default location (Scottsburg, IN), shared tournament sheet URL, place-lookup limits | `data/config.js` |
| Gas prices used in Trip Cost (update weekly) | `data/gas-prices.js` |
| Tournament listings snapshot and its date | `data/tourdata.js` |
| Library drills/lessons, instructor directory | `data/library.js` |
| Library category/type/level/platform/game labels | `data/labels.js` |
| Mon–Fri daily regimen blocks (times + instructions) | `data/plan-days.js` |
| Weekly overview, benchmarks, progression, back notes, plan intro, watch-example videos per step | `data/weekly-plan.js` |
| Which diagram/link/video goes with a plan step | `data/layouts.js` |
| Adaptive plan: skill tests, BU/Fargo charts, drill text, warm-up steps, day sets | `data/adaptive.js` |
| Rules Compare books and rule cells | `data/rulesets.js` (screen code: `rulescmp.js`) |
| Credits: add a creator, creator links, contact email | `data/credits.js` |
| Right-Cut Fix text | `data/rightcut.js` |
| App name, theme color, home-screen icon | `manifest.json`, `icons/` |
| Look of tabs/page chrome | `index.html`; theme controls in `theme.js` |

After ANY change, run the self-test (below). If you add or remove a file, run `python3 tools/sw_files.py` (or the helper script that does everything: `tools/after_change.sh`) so the offline list stays right.

## What not to touch

- `legal.js`, `LICENSE.txt`, the I Agree notice text, and the disclaimer wording in `credits.js`.
- **Storage key names** (anything starting `pt_` or `poolTrainer.`). Phones have saved data under them.
- Never put passwords, keys, or tokens in any file here; this repo is public.
- `pool-trainer-single.html` (generated).
- The `sw.js` cache-name pattern: it must change (bump the number) on every release, and keep its prefix (`pool-trainer-` live, `road-warrior-staging-` staging).
- `staging.js`, the banner, the `stg_` prefix and the staging cache name stay in this copy only. Never copy them to live.

## Staging vs live

Live and staging use the same code and data. Staging adds a banner, the `stg_` storage shim and its own cache name. In the working folder the staging copy is regenerated from the live copy with `tools/make_staging.py`, so they cannot drift. Staging is feel-tested first; the same files go live only after Scott says yes.

## Where the helper scripts live

The scripts mentioned here (`tools/*.py`, `tools/after_change.sh`, `selftest.py`, `qa/`) live in `/workspace/road-warrior-overhaul/` on the agent box, next to the `live/` and `staging/` folders. They are dev tools and are NOT part of the GitHub repo.

## Tests

See `TESTS.md`. After each change run `selftest.py` (loads every screen on a phone-sized window, fails on any console error, compares content tables and each screen against the pre-overhaul baseline, takes screenshots).

## Rebuild the single-file copy

`python3 tools/build_single.py staging` (reads the script list from `index.html`).

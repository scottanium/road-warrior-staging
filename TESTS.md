# Road Warrior v26 staging (cache v26b) — self-test checklist

Rerunnable. After EVERY change run (about 40 s; the full `selftest.py both` run adds the deeper geocode and staging scripts, about 2 more minutes):

```
cd /workspace/road-warrior-overhaul
tools/after_change.sh          # syntax check, sw.js file list, regenerate staging, rebuild both single files, quick self-test
/workspace/pwenv/bin/python selftest.py both        # full: also runs qa/qa_geocode.py (live) and qa/qa_staging.py (staging)
```

Screenshots land in `/workspace/road-warrior-overhaul/shots/<live|staging>/` (every screen, plus the single-file build). The self-test passes only if every line below passes.

## Automated by selftest.py

- [ ] Every screen loads on a phone-sized window with real content: today, lib, plan, log, ins, geo, lab, tests, tour, more, warm, rate, prof, backup, rules, license, install, money, credits.
- [ ] No console errors and no page errors on any screen.
- [ ] Content tables are unchanged vs the pre-overhaul baseline (fingerprints): library `DATA`/`XD`/`DIRECTORY`/`DAYS`, labels, tournament snapshot, Rules Compare, layouts, adaptive tests/charts/warm-up/videos, weekly plan pack, Right-Cut Fix, credits, gas prices.
- [ ] The rendered text of every screen is unchanged vs the baseline (no UI change). If you change content on purpose, regenerate the baseline: `python3 selftest.py both --quick --write-golden --base <folder with live/ and staging/ to treat as the new baseline>`.
- [ ] Tournaments tab shows the default location and listings; 50+ snapshot events; library has 250+ items; Credits shows the contact email.
- [ ] `pool-trainer-single.html` loads with no errors and renders.
- [ ] `sw.js` FILES lists every file that exists and every `<script src>`; the cache name has the right prefix; no secrets in code; live has no staging bits.
- [ ] Staging only: TEST banner present; storage keys all `stg_`-prefixed.

## Tournament location lookup (Nominatim / Zippopotam) — `qa/qa_geocode.py` (live)

- [ ] Typing in City or ZIP does not start a lookup.
- [ ] Tapping **Set location** runs exactly one lookup; Enter in the field also runs exactly one.
- [ ] **Set location** is disabled while a lookup runs; a second tap is ignored.
- [ ] A repeat of the same place is served from the `pt_geocache` cache with zero network calls; the cache keeps at most about 50 entries.
- [ ] A 5-digit ZIP (and ZIP+4, first five digits) goes only to Zippopotam; city/address text goes only to Nominatim with `format=json` and `limit=1`.
- [ ] Nominatim requests are at least 1 second apart; only one is in flight at a time.
- [ ] A failed or empty lookup shows `Couldn't find that place. Try a ZIP code or check the spelling.`; HTTP 429 shows `The map lookup service is busy. Try again in a minute or use a ZIP code.`; failures are not saved persistently.
- [ ] OpenStreetMap attribution stays visible; Find list, filters, Add manually, Sources & links and Use my location still work.

## Staging only — `qa/qa_staging.py`

- [ ] A red/orange **TEST COPY - staging** bar on iPhone-sized and desktop-sized screens, not covering the title, refresh button or tabs.
- [ ] **I Agree** saves `stg_poolTrainer.legalAgreed` and does not write the bare key; live-style keys are never read or cleared (`localStorage.clear()` only drops `stg_` keys).
- [ ] The service worker cache is `road-warrior-staging-v26b` (never `pool-trainer-*`).
- [ ] Shot Lab, the Tournaments lookup (network stubbed) and Credits load with no console errors; the single-file build works.

## Manual spot checks (Scott's feel test, on the phone)

- [ ] Open each tab once; nothing looks different from v25.
- [ ] Tournaments: the list, your location and Trip Cost numbers look the same as before.
- [ ] Library search, the Daily plan with its layout pictures, Rules Compare and Credits look the same.
- [ ] After re-adding the staging app to the home screen, the icon has a red/orange TEST banner and the name is RW TEST (not the live Road Warrior icon).

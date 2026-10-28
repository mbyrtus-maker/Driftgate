# Driftgate browser tests

Each test opens the built game (`index.html` at the repo root) in headless Chromium with Playwright and drives it through
`window.__dg.ev(code)`, which runs code inside the game. Build first, then run:

    python3 tools/build.py
    tools/tests/run.sh          # quick tests
    tools/tests/run.sh full     # plus every training course

Set `DG_GAME` to test another file, and `DG_OUT` for where screenshots go (default: the temp folder).

| Test | Checks |
|---|---|
| load.py | the game loads with no page errors |
| start_screen.py | the Training button stands out without moving the other buttons |
| keys.py | key list, rebinding with swap, saved bindings, the keys strip |
| brood_ui.py | Brood HUD chip, alerts at 5/6/7 systems, map meter |
| dock.py | five dock tabs, keys 1-5, Overview cards, sell hold, beacon purchase |
| jobs.py | the Jobs list: filters, sort, detail, delivery; 12 t beacon, scouts can't load one |
| ship.py | shipping a vault's goods: quote, fee, freighter, arrival, loss |
| limpet.py | limpet plant, damage bonus, turrets ignore it, fighters shoot it off, drones go dark when jammed |
| map.py | sector panel without ore tonnage, scanned prices, the map key |
| mining_sight.py | only the charge reticle on a mining hull aimed at a rock (screenshots) |
| stores.py | depots and freeports trade from their own stores, treasuries shared, ledger balances, old saves migrate |
| haul_rates.py | trade bots per hauler hull for an hour of game time: cr/hour against the pay ladder (slow, run by hand) |
| dock_sweep.py | renders every dock tab at every station and outpost (and a Lair) for each faction and the Unbound, clicks the buttons on one of each kind; prints any exception (slow, ~20 min) |
| soak.py | a bot pilot fights, jumps, docks, lands, mines and fires missiles for N sim minutes in eight hull/faction setups; prints frame errors: `python3 tools/tests/soak.py 15` |
| mine_rates.py | mining pay model per miner hull at real market prices (relative check against an older build; optimistic in absolute terms) |
| training.py | flies a training course end to end; `TRK=full\|combat\|mining\|hauling\|scouting` |
| mp_loopback.py | two pages joined over a faked link: `python3 tools/tests/mp_loopback.py index.html shot.png` |
| mp_subtargets.py | sub-targets over the faked link: a hostile escort's damaged systems reach the guest, the guest's Shift+T, systems panel, lead point and HUD markers, a guest's shots disable a turret on the host, ledger: `python3 tools/tests/mp_subtargets.py $PWD/index.html` |
| mp_guest_faction.py | a faction guest over the faked link: hired wingman follows, stands down when docked or dead, rejoins; insurance and a covered loss; patronage; charge reticle; ledger: `python3 tools/tests/mp_guest_faction.py $PWD/index.html` |

Run them before publishing a change that touches what they cover; training.py after any change to lessons or the dock.
`tools/old/` holds one-off patch scripts from before the source split: history only, not to be run again.

# Driftgate design notes

Agreed designs. Each entry says what it is, how it works, and what must stay true. Entries marked (built) are in the game.

---

## Fighter hangar (built)
A station works module that only depots can build. Each level adds 2 fighter bays, a heavier class and +10% depot hull and shields.

| Level | Builds | Bays |
|---|---|---|
| 1 | Light Fighters (the free tier) | 2 |
| 2 | adds Medium Fighters | 4 |
| 3 | adds Heavy Fighters and Bombers | 6 |
| 4 | adds Heavy Bombers (advanced) | 8 |

- **Building:** every minute or two the hangar builds one fighter's kit from the owner's stores (the depot store for a pilot-owned depot). It keeps back enough for the faction's next shipyard or frigate.
- **Launching:** when hostiles come within about 3.4 km, or the depot is hit, it scrambles a fighter every couple of seconds, up to about two per attacker.
- **Returning:** 20 seconds after the last threat, the fighters fly back to the hangar and land. A fight on the way sends them back out.
- **Unwatched sieges:** the fighters in the bays add to the depot's defence. Some are lost in every siege, more if the depot falls.
- **Losses:** a destroyed hangar loses all its levels and every fighter in its bays, and the materials fall as debris. A captured depot keeps its fighters for the new owner.
- **Economy:** a fighter in a bay is its kit of goods held by the station, so the ledger stays exact.

## Fighter weapons against capitals (built)
Fighter guns do 10% of their damage, and missiles 25%, to frigate hulls (once the shield is down), stations and station works. Torpedoes and capital guns are unchanged. A Mk I Heavy Fighter alone needs about 15 minutes to kill a frigate; four Mk V Heavy Fighters need under 2.

---

## Pilot leaderboard and Legendary status (built)

### The idea
Every time a pilot is part of a winning faction, they earn **1 Legend point**. A galaxy ends at most every 2 hours (the 7-system hold, or the 2-hour deadline), so points come slowly. Points raise a pilot through **10 Legendary levels**, from Victor to Legendary Ace. Each level unlocks a **permanent perk**: once earned, a pilot keeps it in every galaxy from then on.

### Earning a point
- The pilot must have flown for the winning faction for **at least 30 minutes of game time** in that galaxy. This stops someone joining in the last minute to collect a point.
- If a pilot switched factions during the galaxy, only the faction they flew for the longest counts.
- One point per galaxy win, however much the pilot did. The existing campaign and victory bonuses still reward effort within the galaxy.
- A Brood win gives no points: no pilot flies for the Brood.

### Status on radar
Other pilots see your standing next to your callsign on radar, in the contacts list and on the roster:

| Levels | Radar tag | Callsign |
|---|---|---|
| 1–2 | none | faction colour |
| 3–6 | **(Heroic Pilot)** | faction colour |
| 7–9 | **(Legend)** | faction colour, brighter |
| 10 | **(Legendary Ace)** | gold |

### Levels and permanent perks

| Level | Title | Total wins needed | Perk (permanent from this level on) |
|---|---|---|---|
| 1 | Pathfinder | 1 | **Scout's instinct**: in a Scout or Advanced Scout, beacons flip in 7 seconds instead of 10, and beacon bounties pay 20% more. |
| 2 | Freighter | 2 | **Freight licence**: hauler hulls (Courier, Freighter, Bulker) get 10% more hold, the full-hold handling penalty is cut by a third, and hauling Orders pay 10% more. |
| 3 | Prospector | 4 | **Miner's eye**: mining hulls (Light, Medium and Heavy Miner) drill 10% faster and mine from 400 m instead of 300 m. (The target panel already shows a rock's full ore breakdown at any range, so the reach replaced that idea.) |
| 4 | Veteran | 6 | **Your own ship**: start each new galaxy in the hull class you finished the last one in. It can't be a capital class (no frigates or escorts), and upgrades don't carry. Name your ship (shown to other pilots) and choose an engine-trail colour. |
| 5 | Heroic Pilot | 9 | **Head start**: one system of your choice starts every galaxy at Mk II instead of Mk I. |
| 6 | Ace | 12 | **Second head start**: choose a second system that starts at Mk II. |
| 7 | Commander | 16 | **Command rank**: campaign bonuses pay 15% more, and your comms constructor needs 1 escort fighter instead of 2 (see below). |
| 8 | Paragon | 20 | **Reserve hull**: start each galaxy with a second hull in your Ship Bay (Medium Fighter or Medium Miner, your choice), and your faction's next frigate each galaxy is named after you. |
| 9 | Champion | 25 | **Contractor**: a flat 150 cr bonus, paid by your faction's treasury, for every mission or order you complete: hauling and mining Orders, combat and strategic missions, beacon missions and campaign moves. It stacks with the level 2 and 7 bonuses. |
| 10 | Legendary Ace | 30 | **Legendary Ace**: gold callsign, plus the **Wraith**, a stealth fighter only Legendary Aces can fly (below). |

The wins needed between levels grow (1, 1, 2, 2, 3, 3, 4, 4, 5, 5). With four sides near even odds and a galaxy every 2 hours or less, a regular pilot reaches Legendary Ace after roughly 150 to 250 hours of play.

The scout, hauler and miner perks come first (levels 1 to 3) so every role gets something from its first wins.

**Why the constructor change is a perk (level 7).** When you call a constructor through comms, your faction only sends it once it has at least 2 escort fighters free at the nearest station to fly with it. In a busy war those fighters are often out on strikes or defence, so your request can sit waiting for minutes while the area you cleared fills back up. Command rank lets the constructor leave with 1 escort, so a Commander's requests get answered sooner. It doesn't make building cheaper or safer: the constructor costs the faction the same, and with one escort it's easier to lose on the way. It trades a little risk for speed, which is why it sits with the command perks rather than the combat ones.

### The Wraith (level 10 only)
A stealth fighter that hits hard but can't fight while hidden. Stealth is a mode you switch on, and it shuts the ship down to do it.
- **Weapons:** quad cannons and quad lasers (4 guns, switch between kinetic and laser like other fighters), plus 2 swarm pod batteries that reload on the normal magazine cooldowns. No mining laser and no cargo hold.
- **Frame:** Light Fighter hull and shields, so it's fragile when caught.
- **Stealth mode (its own key, K):**
  - **Visibility:** visible only within 600 m. Beyond that it drops off enemy radar and target lists, and missiles already chasing it lose their lock.
  - **Shut down while hidden:** shields at zero, no weapons fire, no missile locks and no afterburner. Normal thrusters still work, so it can manoeuvre and creep up on targets, just not boost.
- **Breaking stealth:** pressing K again, or being hit, drops stealth. The ship then powers back up exactly as after lifting off an asteroid: 4 seconds before weapons work, and shields charge from empty after that.
- **Scanning:** it counts as a scout for sensors. The system it's in, and its neighbours, show up in faction intel and on the map, so it can scout ahead and send updates. It cannot flip beacons.
- **Limits:** it can't dock with or command capital ships.
- **Availability:** free to switch to at any core station once unlocked, like the starter hulls.

### Balance rules (these must hold when it is built)
1. **Combat edge stays small.** The only stat gains from status are two systems starting at Mk II, which any pilot reaches with a little upgrading anyway, and the Wraith. The Wraith's heavy weapons are offset by a Light Fighter hull and by stealth that leaves it unable to fight and slow to power back up. A level 10 should beat a level 1 because of skill, not perks.
2. **Every role gets something, early.** Scouts, haulers and miners get their role perks at levels 1, 2 and 3, before the combat and command perks.
3. **Most perks are quality of life or cosmetic:** titles, radar tags, colours, ship names, keeping your hull, a reserve hull, mission pay.
4. **Perks are permanent but small.** Because they never expire, each has to be modest on its own. Bonuses stop at 10 to 20%.
5. **The economy stays exact.** Anything a perk adds at the start of a galaxy (a reserve hull, Mk II parts) is added before that galaxy's ledger baseline is recorded, so nothing is created or lost mid-galaxy. Pay bonuses (Orders, bounties, campaign moves, the flat mission bonus) come out of a faction treasury, never from nowhere. If the treasury is empty, the bonus isn't paid. Percentage perks (hold size, drill speed) change how fast pilots move existing material, not how much exists.

### Leaderboard
- **Where:** a Leaderboard panel on the start screen, plus a tab in the galaxy map.
- **Columns:** rank, callsign, Legendary level and title, total wins, wins by faction, last win (date and faction).
- **Single player:** stored on the device, next to the existing galaxy-win history.
- **Multiplayer:** the host records points for every pilot who meets the 30-minute rule when the galaxy ends. Each player's own device keeps their record. Callsigns are the identity, so the rules for a clean, unique callsign matter.
- **Reset:** a "reset my legend" button in settings with a confirmation, for players who want to start over.

### As built
- Records are stored on each device under `driftgate.legend`, keyed by callsign. The Leaderboard button on the start screen shows them, the current callsign's perks, and its perk settings.
- The Wraith uses the Light Fighter model for now. Stealth is synced in multiplayer, and other pilots lose a hidden Wraith from radar and target lists beyond 600 m.
- Ship names, ranks and engine colours travel with the pilot's label to other players.

### Open questions
- Should a Brood win give everyone a small consolation so Brood galaxies don't feel wasted?
- In multiplayer, can a host's record be trusted, or should Legend points only count in a pilot's own single-player galaxies until there is an account system?

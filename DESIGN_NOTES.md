# Driftgate design notes

Ideas that are agreed but not built yet. Each entry says what it is, how it should work, and what must stay true when it is built.

---

## Pilot leaderboard and Legendary status (not built)

### The idea
Every time a pilot is part of a winning faction, they earn **1 Legend point**. A galaxy ends at most every 2 hours (the 8-system hold, or the 2-hour deadline), so points come slowly. Points raise a pilot through **10 Legendary levels**. Each level unlocks a **permanent perk**: once earned, a pilot keeps it in every galaxy from then on.

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
| 7–9 | **(Legendary Ace)** | faction colour, brighter |
| 10 | **(Legend)** | gold |

### Levels and permanent perks

| Level | Title | Total wins needed | Perk (permanent from this level on) |
|---|---|---|---|
| 1 | Victor | 1 | **Laurel**: Victor title on the leaderboard and roster. |
| 2 | Prospector | 2 | **Miner's eye**: mining hulls (Light, Medium and Heavy Miner) drill 10% faster, and the target panel shows a rock's full ore breakdown from twice the usual range. |
| 3 | Veteran | 4 | **Your own ship**: start each new galaxy in the hull class you finished the last one in (not capital ships; upgrades don't carry). Name your ship (shown to other pilots) and choose an engine-trail colour. |
| 4 | Heroic Pilot | 6 | **Head start**: one system of your choice starts every galaxy at Mk II instead of Mk I. |
| 5 | Licensed Hauler | 9 | **Freight licence**: hauler hulls (Courier, Freighter, Bulker) get 10% more hold, the full-hold handling penalty is cut by a third, and hauling Orders pay 10% more. |
| 6 | Ace | 12 | **Second head start**: choose a second system that starts at Mk II. |
| 7 | Commander | 16 | **Command rank**: campaign bonuses pay 15% more, and your comms constructor needs 1 escort instead of 2. |
| 8 | Pathfinder | 20 | **Scout's instinct**: in a Scout or Advanced Scout, beacons flip in 7 seconds instead of 10, and beacon bounties pay 20% more. |
| 9 | Champion | 25 | **Reserve hull**: start each galaxy with a second hull in your Ship Bay (Medium Fighter or Medium Miner, your choice), and your faction's next frigate each galaxy is named after you. |
| 10 | Legend | 30 | **Legend**: gold callsign, plus the **Wraith**, a Legend-only stealth fighter (below). |

The wins needed between levels grow (1, 1, 2, 2, 3, 3, 4, 4, 5, 5). With four sides near even odds and a galaxy every 2 hours or less, a regular pilot reaches Legend after roughly 150 to 250 hours of play.

The two Mk II perks are at levels 4 and 6. The second Mk II choice replaced a vault carry-over that had been at level 4.

### The Wraith (level 10 only)
A light stealth fighter that trades firepower for not being seen. It is a different way to fly, not a better ship.
- **Stats:** Light Fighter frame and hull, about 15% less firepower, no cargo hold, no mining laser, one missile launcher, no swarm pod.
- **Stealth:** while it isn't firing, boosting or locking, enemies beyond 600 m lose it from radar and target lists, the same masking as landing on an asteroid but in flight.
- **Giving itself away:** firing, a missile lock or the afterburner reveals it for 8 seconds. Taking a hit reveals it for 4 seconds.
- **Limits:** it can't flip beacons (it isn't a scout) and can't dock with or command capital ships. It's an assassin and a raider.
- **Availability:** free to switch to at any core station once unlocked, like the starter hulls.

### Balance rules (these must hold when it is built)
1. **Combat edge stays small.** The only stat gains from status are two systems starting at Mk II, which any pilot reaches with a little upgrading anyway, and the Wraith, which is a sidegrade. A level 10 should beat a level 1 because of skill, not perks.
2. **Every role gets something.** Miners (level 2), haulers (level 5) and scouts (level 8) each get a role perk, alongside the combat and command perks.
3. **Most perks are quality of life or cosmetic:** titles, radar tags, colours, ship names, keeping your hull, a reserve hull.
4. **Perks are permanent but small.** Because they never expire, each has to be modest on its own. Bonuses stop at 10 to 20%.
5. **The economy stays exact.** Anything a perk adds at the start of a galaxy (a reserve hull, Mk II parts) is added before that galaxy's ledger baseline is recorded, so nothing is created or lost mid-galaxy. Percentage perks (hold size, drill speed, pay) change how fast pilots move existing material, not how much exists.

### Leaderboard
- **Where:** a Leaderboard panel on the start screen, plus a tab in the galaxy map.
- **Columns:** rank, callsign, Legendary level and title, total wins, wins by faction, last win (date and faction).
- **Single player:** stored on the device, next to the existing galaxy-win history.
- **Multiplayer:** the host records points for every pilot who meets the 30-minute rule when the galaxy ends. Each player's own device keeps their record. Callsigns are the identity, so the rules for a clean, unique callsign matter.
- **Reset:** a "reset my legend" button in settings with a confirmation, for players who want to start over.

### Open questions
- Should a Brood win give everyone a small consolation so Brood galaxies don't feel wasted?
- In multiplayer, can a host's record be trusted, or should Legend points only count in a pilot's own single-player galaxies until there is an account system?

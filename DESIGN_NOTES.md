# Driftgate design notes

Ideas that are agreed but not built yet. Each entry says what it is, how it should work, and what must stay true when it is built.

---

## Pilot leaderboard and Legendary status (not built)

### The idea
Every time a pilot is part of a winning faction, they earn **1 Legend point**. A galaxy ends at most every 2 hours (the 8-system hold, or the 2-hour deadline), so points come slowly. Points raise a pilot through **10 Legendary levels**. Each level unlocks one more **victory perk**: a benefit the pilot receives **when their faction wins**, carried into the next galaxy. A perk never applies while you are losing, and it lasts one galaxy.

### Earning a point
- The pilot must have flown for the winning faction for **at least 30 minutes of game time** in that galaxy. This stops someone joining in the last minute to collect a point.
- If a pilot switched factions during the galaxy, only the faction they flew for the longest counts.
- One point per galaxy win, however much the pilot did. The existing campaign and victory bonuses still reward effort within the galaxy.
- A Brood win gives no points: no pilot flies for the Brood.

### Levels

| Level | Title | Total wins needed | Perk unlocked (applies at the start of the galaxy after your faction wins) |
|---|---|---|---|
| 1 | Victor | 1 | **Laurel**: callsign shown in your faction colour on the roster and leaderboard, with the Victor title. |
| 2 | Decorated | 2 | **Fuller crate**: the winner's crate of parts adds 2 Flux Coils and 1 Guard Drone. |
| 3 | Veteran | 4 | **Keep your hull**: start the next galaxy in the same hull class you finished in (not capital ships; upgrades do not carry). |
| 4 | Quartermaster | 6 | **Veteran's vault**: carry 10% of your vault into the next galaxy, up to 120 t. |
| 5 | Trusted | 9 | **Faction prices**: 5% better buying and selling at your own faction's stations for the first hour. |
| 6 | Ace | 12 | **Head start**: one system of your choice starts at Mk II instead of Mk I. |
| 7 | Commander | 16 | **Command rank**: campaign bonuses pay 15% more, and your comms constructor needs 1 escort instead of 2. |
| 8 | Paragon | 20 | **Insignia**: name your ship (shown to other pilots), choose an engine-trail colour, and your faction's next frigate is named after you. |
| 9 | Champion | 25 | **Reserve hull**: start with a second hull in your Ship Bay (Medium Fighter or Medium Miner, your choice). |
| 10 | Legend | 30 | **Rally**: once per galaxy, your distress call (U) brings a wing of 5 instead of 3, and its recharge is halved for that call. Gold callsign with the Legend title. |

The wins needed between levels grow (1, 1, 2, 2, 3, 3, 4, 4, 5, 5). With four sides near even odds and a galaxy every 2 hours or less, a regular pilot reaches Legend after roughly 150 to 250 hours of play.

### Balance rules (these must hold when it is built)
1. **No combat stat above Mk II comes from Legendary status.** The only combat-touching perks are Head start (one Mk II system) and Rally (once per galaxy). A level 10 should beat a level 1 because of skill, not because of perks.
2. **Perks only follow a faction win and last one galaxy.** A Legend who loses starts the next galaxy like anyone else, so no one snowballs.
3. **Perks add up but stay small.** A level 10 who just won gets all ten, about as strong as a new pilot with an hour's head start.
4. **Most perks are quality of life or cosmetic:** titles, colours, names, keeping a hull, carrying a little cargo, price comfort.
5. **The economy stays exact.** Anything carried into a new galaxy (vault share, crate items, reserve hull) is added before the new galaxy's ledger baseline is recorded, so it can never be created or lost mid-galaxy.

### Leaderboard
- **Where:** a Leaderboard panel on the start screen, plus a tab in the galaxy map.
- **Columns:** rank, callsign, Legendary level and title, total wins, wins by faction, last win (date and faction).
- **Single player:** stored on the device, next to the existing galaxy-win history.
- **Multiplayer:** the host records points for every pilot who meets the 30-minute rule when the galaxy ends. Each player's own device keeps their record. Callsigns are the identity, so the rules for a clean, unique callsign matter.
- **Reset:** a "reset my legend" button in settings with a confirmation, for players who want to start over.

### Open questions
- Should a Brood win give everyone a small consolation, such as keeping 5% of the vault, so Brood galaxies don't feel wasted?
- Should Legendary status show up in combat at all (for example, a Legend's ship has a faint gold trim), or stay on the roster only?

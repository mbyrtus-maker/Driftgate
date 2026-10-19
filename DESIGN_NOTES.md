# Driftgate design notes

Agreed designs. Each entry says what it is, how it works, and what must stay true. Entries marked (built) are in the game.

---

## War effort (built)
Human pilots earn their faction War effort points, which make its fleets fight harder in battles fought out of sight.

- **Sources:**

| Action | Points |
|---|---|
| Order delivered | 2 |
| Supply-drive delivery | 0.04 per unit |
| Campaign move | 4 |
| Beacon flip | 2 |
| Beacon mission | 3 |
| Fighter shot down | 1 |
| Heavy fighter or bomber shot down | 1.5 |
| Freighter shot down | 1 |
| Constructor shot down | 3 |
| Escort shot down | 6 |
| Frigate shot down | 12 |

  Unbound pirate kills count half.
- **Fade:** points shrink by two-thirds every 20 minutes.
- **Effect:** a faction's strength in outpost assaults, station sieges and hunter-group strikes rises by up to 65%, as `0.65 × (1 − e^(−points/10))`. It applies on both sides of each fight.
- **Calibration** (fast simulator, 384 games each): a typical engaged pilot (about 24 points an hour) lifts their faction from 28% to 38%, and a strong one (48 points an hour) by about 11 points. The levers are `WE.max`, `WE.scale` and `WE.tau`.
- **Where it shows:** the faction's current bonus appears in the station campaign panel.

## Per-station vaults (built)
Each friendly station and outpost keeps its own vault. Goods stored at one station stay there, so moving them means hauling them. The vault tab lists where else you have goods stored. Rewards that arrive while you're away (campaign items, frigate cargo) go to the vault where you last docked. A razed station takes its vaults down as debris. Old saves keep their single vault at the first station you dock at after updating.

---

## Fleet carrier (design, not built)

### The idea
A faction capital ship that fights with its fighters instead of guns. It jumps like a frigate and has no main cannon, lance or torpedoes. It carries 6 fighters or bombers, and its turrets defend against fighters and torpedoes. It replaces the picket fighters frigates and escorts carry today (see below).

### Ship
| | Fleet carrier | For comparison: frigate |
|---|---|---|
| Hull / shield | about 5,000 / 2,400 | 6,000 / 2,400 |
| Main weapon | none | lance, torpedoes |
| Turrets | 6 point-defence turrets that shoot down torpedoes and missiles and engage fighters within about 1.4 km | turrets plus lance |
| Hangar | 6 craft: any mix of Light, Medium and Heavy Fighters and Bombers (Heavy Bombers at Mk III+) | 2 pickets |
| Jump | own drive, same spin-up as a frigate | |
| Speed | a little slower than a frigate | |

- **Cost:** about a frigate's kit minus the lance and torpedo parts, plus hangar parts (more frames and coil). The fighters are extra: kits drawn from stores, like the fighter hangar works.
- **Limit:** 1 per faction (the Brood gets none). It counts toward the capital cap alongside frigates and escorts.

### How it fights
- **Launching:** it launches its wing when hostiles come within about 4 km, two craft every few seconds. Bombers go for capitals, structures and Overgrowth; fighters screen the carrier and hunt enemy bombers.
- **Recovery and rearming:** the wing lands again when the area is quiet. Landed craft rearm missiles and torpedoes from the carrier's stores and repair over a couple of minutes.
- **Losses:** a craft shot down is gone; its kit falls as debris. The carrier refills empty bays from faction stores when it next visits a friendly station with a shipyard.
- **Weakness:** on its own it is a big target. Its turrets keep fighters and torpedoes off it, but an enemy frigate's lance and torpedoes will hurt it. It needs either its wing in the air or a frigate alongside.

### Commanding one (pilots)
Pilot-owned carriers, from the shipyard like frigates and escorts, use the existing bridge and console. The orders tab gains a wing section:
- **Wing stance:** Screen (stay within 2 km of the carrier), Attack my target, or Hold (stay docked).
- **Loadout:** pick the 6 craft from your own vault kits, and the carrier fills them when docked.
- **Bombing run:** pick a target in range and the bombers go. This is the best tool against Overgrowth, which capital ships can reach by jumping when gates are sealed.

### Off-screen
In strategic battles a carrier counts as its hull plus its wing. Its wing adds strength to assaults and sieges like a fighter group, and its point defence cuts the torpedoes that land on it, like an escort's screen. Use the fast simulator to tune its value so carriers don't tip the faction balance.

### Rules
1. It never carries a main gun or torpedoes of its own: all its hitting power is in its wing.
2. The economy stays exact: craft in its bays are kits held aboard, lost craft fall as debris, and refills come out of faction stores.
3. Re-tune all four sides with the fast simulator after it lands.

## Picket fighters removed from frigates and escorts (design, not built)
- Frigates and escorts stop carrying pickets. The fleet carrier takes over carrying fighters for the fleet.
- The `picket` item leaves the frigate kit. Factions stop making pickets, and anything already in stock or aboard is broken down into its materials, so nothing is created or lost.
- To make up for it, frigates gain 2 more point-defence turrets, so they still have some answer to fighters without the pickets.
- Re-tune the Brood (its frigates carry Spawnling pickets) and each faction's capital strength with the fast simulator.

## Guard drones that react in time (design, not built)
**Problem:** you can kill a hauler before its drones do anything. Today a drone engages only when an attacker is its own target, or the ship it guards was hit in the last 5 seconds and the attacker is within 700 m. So a pilot shooting from 800 m, or killing the hauler in a single pass, never gets engaged.

**Changes:**
- **Wider triggers:** drones engage any hostile ship that:
  - has the guarded ship targeted or missile-locked,
  - has fired on it in the last 8 seconds, from up to 1.5 km, or
  - comes within 600 m.
- **Faster reaction:** drones re-check targets 5 times a second instead of about twice, and boost toward an attacker for the first 3 seconds.
- **Warning:** when a hostile locks on or fires, the guarded ship's drones break formation at once, and the hauler turns away and boosts.
- **Leash:** drones stay within 1.5 km of the ship they guard, as now, so they can't be pulled away and left behind.
- **Pilot drones:** a pilot's own guard drones follow the same rules.

## Station menus: a simpler layout (proposal)
**What's confusing today:** four groups with a second row of sub-tabs (Economy: Market, Trade, Orders · Construction: Fabricate, Upgrades, Refits, Station works, Outpost · Hangar: Shipyard, Storage, Ship Bay · Missions). Several pairs sound alike: Market and Trade, Orders and Missions, Shipyard and Ship Bay, Fabricate and Upgrades. And your ship is split across three groups.

**Proposal: five task tabs on one row, no sub-tabs.** Each tab is named for what you came to do:

| Tab | What it holds (today's tabs) |
|---|---|
| **Trade** | Market and Trade merged: one list of goods with Sell and Buy beside each, your hold and vault counts, and the best price nearby. |
| **Jobs** | Orders, Missions, supply drives and the campaign move in one list, sorted by pay. Filter chips: Haul · Mine · Fight · Scout. Shows what you can deliver right now. |
| **My ship** | Your current ship at the top (repair, upgrades, refits, loadout), then your other ships (Ship Bay), then hulls for sale (Shipyard). |
| **Vault** | Storage: hold and this station's vault side by side, plus where else you have goods stored. |
| **Station** | Fabricate, station works (with the hangar), outpost controls and the capital programme: everything about the station itself. |

- **Keys 1–5** switch tabs, and each kind of dock remembers your last tab.
- **Dots on tabs** mark something you can act on now: a job you can deliver, an affordable upgrade, a full vault.
- **First visit:** a one-line hint under the tabs ("Jobs: paid work for your faction. Trade: sell what you mined.").
- Tabs that don't apply are hidden, not greyed out. For example, an outpost shows Trade, Jobs, Vault and Station.

---

## Brood Overgrowth (design, not built)

### The idea
The Brood can grow a living mass over a jump gate. While it stands, that gate is sealed in both directions: no pilots, fighter wings, freighters, miners or scouts can pass until someone destroys it. Capital ships (frigates and escorts) are not stopped, because they jump on their own drives without using gates. That makes capitals the natural answer to an Overgrowth: one can jump in beside it when nothing else can get through. Torpedoes are the right tool, and everything else helps more slowly.

### How the Brood uses it
- **Where:** gates on the edge of Brood space, picked for one of three reasons:
  - **Cut reinforcements:** seal the gates a faction would use to relieve a system the Brood is about to attack.
  - **Shield a hive:** seal gates leading into The Bloom or a hive system.
  - **Strand a fleet:** seal the way home for a fighter wing or freighter convoy deep in Brood space. A frigate with them can still jump out, but it leaves its smaller ships behind.
- **How many:** at most 2 Overgrowths at once, or 3 when the Brood holds 6 or more systems. After each planting there is an 8–12 minute wait.
- **Cost:** each Overgrowth takes about 40 iron, 20 copper and 4 plate from Brood stores. The materials stay in the growth and fall as debris when it dies, so the economy stays exact.
- **Never total isolation:** a faction's core home system always keeps at least one open gate.

### Life of an Overgrowth
| Stage | Time | Gate | Hit points |
|---|---|---|---|
| Spore seeding | 90 s | still open | 25% |
| Grown | from 90 s | sealed both ways | 100% |
| Mature | from 10 min | sealed | 100%; grows 2 Brood Mites a minute (up to 4) to guard it |

- Seeding is the window to stop it cheaply: factions with an eye on the system get a warning ("Brood spores on the gate to Kestrel Drift").
- **Which side:** the growth sits on one side of the gate. From the other side the gate shows as dark and sealed, with "Overgrowth on the far side". To clear it you must reach that side by another route.

### Destroying it
- **Health:** about 6,000, like a frigate hull. It has no shield.
- **Damage by weapon:**

| Weapon | Damage dealt |
|---|---|
| Torpedoes | 100% |
| Capital guns and frigate lances | 75% |
| Missiles and swarm pods | 40% |
| Fighter guns and lasers | 15% |

- **Regrowth:** left alone for 20 seconds, it regrows 1% of its health a second. Chipping at it with guns only works if the pressure is kept up, or if a wing does it together.
- **Defences:** spore tendrils shoot down incoming torpedoes, catching about 30% of them, so a few bombers firing together beat one firing alone. Brood patrols in the system come to defend it.
- **When it dies:** the gate reopens at once and its materials fall as debris. The faction that killed it gets a bounty and 6 War effort points.

### How factions respond
- AI factions treat an Overgrowth on a route into their space as a structure to clear. They send a bomber strike, reusing the hunter-group and siege machinery. They give it more priority the more of their space it cuts off.
- Off-screen, it resolves like a hunter group against a frigate: torpedoes land, the tendrils and regrowth reduce the damage, and the strike either clears the gate or falls back.
- AI routing, freighters, fighter offensives and the player's route planner treat a sealed gate the way they treat a collapsed gate today, except that it never reopens on a timer. Frigate and escort jumps ignore it.
- A faction with a frigate nearby can jump it in to clear the growth: its lances deal 75%, and its escort's torpedoes 100%.

### Look and interface
- **Look:** a bulbous, pulsing mass wrapping the gate ring in Brood colours, with glowing spore sacs. While seeding, a thin film spreads over the ring.
- **Map and radar:** sealed links show in Brood colour on the galaxy map. On radar it is a Brood target, and the target panel shows health and the weapon damage table.
- **Feeds:** "The gate to X is sealed by Brood Overgrowth" for factions with an eye on it, and a cheer when it is cleared.

### Balance rules (must hold when built)
1. It must not lock a faction in: the home-gate rule above, and at most 2–3 at once.
2. Torpedoes clear it in a reasonable time: 3–4 bombers in about a minute. Fighters alone should take a determined wing several minutes.
3. Re-tune the Brood's win rate afterwards with the fast simulator. Expect the Brood to gain; pull it back with the existing Brood levers so it stays near 20%.
4. Multiplayer: the host owns Overgrowth state, as with gate collapses, and sends it to pilots with the gate status.

### Open questions
- Should a pilot cut off on the sealed side be able to call help, for example by marking the growth so a friendly frigate jumps in to clear it?
- Should Mature Overgrowths spread: after 20 minutes, a chance to seed a neighbouring gate?

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

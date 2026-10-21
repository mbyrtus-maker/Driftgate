# Driftgate design notes

Agreed designs. Each entry says what it is, how it works, and what must stay true. Entries marked (built) are in the game.

## Design ethos
Every system should follow these, and new work is checked against them.

- **Credits go to pilots who fight and scout.** Scouts are paid for beacons. Fighters are paid for enemies destroyed, and larger enemies pay more. Damage earns a share of the credit, so you don't need the kill shot.
- **Materials are real and they move.** Raw ore is mined, then turned into components at stations and depots with forges. Components are hauled to wherever they're needed to build station upgrades, ships and station works.
- **Missions serve the war.** They're set up to flip beacons, take control of sectors, destroy enemy assets and disrupt enemy logistics.

---

## Kill credit and bounties (built)
- **Shared credit.** Every pilot who damaged a ship is paid a share of its bounty, and of the War effort points, equal to their share of the damage dealt (shield plus hull). You don't need the kill shot.
- **AI damage.** It counts in the total but pays no one, so pilots aren't paid for what their wingmates did.
- **Minimum share.** Below 5% of the damage, nothing is paid. The kill shot only adds to the pilot's kill count.
- **Bounties scale with size.** The formula is `(25 + 20 × tier) × (hull ÷ striker hull)^0.6`:

  | Ship (tier 1 unless stated) | Bounty |
  |---|---|
  | Interceptor | 35 cr |
  | Striker | 45 cr |
  | Heavy | 55 cr |
  | Bomber | 60 cr |
  | Gunboat | 70 cr |
  | Bulker | 75 cr |
  | Tier 3 heavy | 110 cr |
  | Escort | 600 cr |
  | Carrier or Hive Ship | 1,200 cr |
  | Drone | 10 cr |

  A supply freighter also pays the convoy raid bounty, split the same way.
- **Payer.** Bounties are paid out of the pilot's faction treasury, so credits stay zero-sum.

## Convoy escort (built)
A Missions-tab contract to protect your own side's logistics.

- **Signing on.** The Convoy escort table lists friendly supply convoys under way within 3 jumps. Pressing Escort signs you on (one contract at a time, one escort per convoy) and sets your course to the convoy.
- **Counting jumps.** Each jump the convoy makes while you're in the system it leaves or the one it enters counts.
- **Payment.** The contract needs 60% of the jumps left when you signed on. When the convoy docks, Command pays `60 + 45 per escorted jump + 4% of cargo value`. You also get War effort points (2, plus 0.5 per jump) and the Contractor bonus at Legend level 9.
- **Protection and ambush.** With its escort along, the convoy's chance of being caught out of sight drops to 40% of normal. But each escorted jump may set up an ambush: three raiders from a hostile faction (or Unbound) jump in and go for the freighter while you're there. The chance is 2.5 times the system's convoy risk, clamped to between 12% and 55%.
- **Failure.** If the convoy is destroyed, the contract fails. If you weren't with it for enough jumps, it pays nothing.
- **Raiders and pirates go after supply freighters** as readily as haulers.

## Logistics (built)
AI factions move their goods by freight convoy, so supply lines are real and can be cut.

- **Depot stores.** Each faction depot keeps its own store (up to 260 mass). Its extraction goes there, and so does its forge output: a depot with production level 1 or higher turns ore into plates, conduit and coils, up to a small stock.
- **Ore goes home.** When a depot holds more than 120 mass of raw ore, it ships the surplus to its faction's core station. A convoy carries up to 80 mass; AI haulers work at 70% of a pilot's efficiency.
- **Components go out.** A depot that needs materials asks the core warehouse. That covers building works, expanding a forward depot and stocking a hangar. The warehouse ships what it can spare, keeping half of the next capital kit back.
- **Carriers are supplied by convoy.** These convoys come from the nearest depot store or the core (see Carrier fabrication).
- **Convoys are real freighters.** In a live system they fly as freighters and bulkers. Out of sight, each jump carries a risk:

  | Risk on entering a system | Chance |
  |---|---|
  | Hostile capital present | 10% |
  | Hostile station | 6% |
  | Brood space | 5% |
  | Outside the faction's territory | 3% |

- **A destroyed freighter spills half its hold as a salvage crate.** The rest is wrecked into debris. Killing a hostile convoy pays a raid bounty and 3 War effort points.
- **Raid board.** The Missions tab has a "Convoy raids" table that lists hostile convoys under way and what they carry. Each row's Intercept button sets your course to the first system on the convoy's remaining route you can reach in time. It allows one jump of slack, since a convoy spends about 45 s crossing each system. Failing that, it aims for the point on the route nearest you.
- **Ledger.** Depot stores and convoy holds are counted, so the economy stays exact.
- **Measured** (fast simulator, per 2-hour game):
  - about 245 ore runs, 88 supply runs and 52 carrier runs;
  - 10 to 15 convoys lost;
  - 7 to 10 depot works built.


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
| Carrier shot down | 12 |
| Supply convoy shot down | 3 |

  Unbound pirate kills count half.
- **Fade:** points shrink by two-thirds every 20 minutes.
- **Effect:** a faction's strength in outpost assaults, station sieges and hunter-group strikes rises by up to 80%, as `0.8 × (1 − e^(−points/10))`. It applies on both sides of each fight.
- **Calibration** (fast simulator, 384 games each, on the logistics build): a typical engaged pilot (about 24 points an hour) lifts their faction from 26% to 34%. The levers are `WE.max`, `WE.scale` and `WE.tau`.
- **Where it shows:** the faction's current bonus appears in the station campaign panel.

## Per-station vaults (built)
Each friendly station and outpost keeps its own vault. Goods stored at one station stay there, so moving them means hauling them. Two places show where else you have goods stored:
- **Stored elsewhere** (Vault tab): every other vault, nearest first, with its contents, mass, value and distance in jumps. Each has a Set course button, and it flags vaults at stations you can no longer dock at (captured or breached).
- **The map:** a ▣ VAULT tag marks each system holding your goods, and the side panel shows the selected system's vault and lists all your vaults. Rewards that arrive while you're away (campaign items, frigate cargo) go to the vault where you last docked. A razed station takes its vaults down as debris. Old saves keep their single vault at the first station you dock at after updating.

---

## Capital roster: escorts and carriers, no frigates (built)
A live carrier takes capital-ship damage, like the frigate did:
- fighter guns and missiles only chip it;
- torpedoes do four times their damage;
- its shield regenerates slowly;
- it keeps its full hull when a system loads.

### The decision
Frigates are removed. The capital roster becomes the **fleet carrier**, one per faction, as the main capital ship, with **escorts** as its smaller supporting capitals. This ends the race to frigates: ground is held by structures, taken by assault ships after bombers and fighters breach it, and capitals support that instead of deciding it.

### What replaces each frigate job
| Frigate job today | Replaced by |
|---|---|
| Holding an empty system | Nothing: only homes, stations, depots and outposts hold systems. |
| Capturing depots | Assault ships, after a breach (see below). |
| Lance and torpedoes against structures and capitals | Bomber wings, escort torpedoes and the carrier's bombers. |
| Pickets | The carrier's wing (pickets are removed). |
| What hunter groups chase, and the "enemy capital nearby" war footing | Escorts and carriers. |
| Brood Leviathan | The Brood Prowler (its escort) and the Hive Ship (its carrier). |

### Escort changes (kept small: the carrier is the main capital)
Escorts stay light supporting capitals that guard the carrier and screen convoys, with only a modest upgrade:
- Hull about 2,800 → 3,100.
- The torpedo weakness drops from ×7 to ×5: still the bomber's natural prey.
- The limit stays at 2 per faction (3 for Ostrova).
- They keep their torpedoes, anti-fighter batteries and point defence. Their default job is to stay with the carrier, or to screen a stand-off position while its wing is away.
- **Assault:** each escort has 1 assault bay holding one assault ship (one load). Unlike the carrier, an escort doesn't stand off: it jumps into the target system, helps strip key points with its torpedoes, and launches its assault ship at a breached depot or outpost from close range. That makes escorts the quick way to take a lightly held depot, and they're exposed while they do it.
- **On their own:** a pair of escorts can take a 1–2 load target alone. A 3-load target needs the carrier, a third ship called in, or a second wave inside the 3-minute window.

### Knock-on changes
- **Victory:** systems are counted from structures only, so the 7-system hold and the 2-hour tiebreak need re-tuning. Captures get harder, and more games may run to the deadline.
- **Truce against the leader:** it is triggered by systems held, so it still works, but re-check its threshold.
- **Pilot capitals:** the shipyard offers escorts and, if your faction has none, a carrier. The bridge, helm and guest rules carry over.
- **Legend level 8:** "your faction's next frigate is named after you" becomes its next carrier or escort.
- **War effort:** the frigate kill value (12) moves to carriers, and escorts stay at 6.
- **Vantium and keels:** now used for escorts and carriers. Vantium may need an extra use (torpedoes or depot armour) so it still matters.
- **Old saves:** frigates in a save are broken down into their kits (materials into the owner's stores), so nothing is lost and the economy stays exact. A pilot's own frigate is refunded as kit materials in their vault.
- **Overgrowth:** unchanged. Escorts and carriers still jump past it.

### Build order (so the game always works)
1. **Assault ships and station key points:** captures work without frigates.
2. **Fleet carrier and Hive Ship.**
3. **Remove frigates and pickets:** the escort upgrades and old-save conversion, then re-balance all four sides with the fast simulator.
4. **Overgrowth** (independent, any time after step 1).

## Cheaper forward depots (built)

### Why
With frigates gone, systems are only held by structures, and taking one now needs a breach plus assault ships. That makes holding ground slower on both sides. Cheaper level 1 depots let factions and pilots claim systems faster, so the map keeps moving.

### Depot levels
Today a depot costs 2 Depot Frames (20 plate, 12 wire, 6 coil) plus the constructor's kit, and comes with 2,000 shield, 4,000 hull and 4 turrets.

| Level | Cost | Build time | Shield / hull | Turrets | Station works | Garrison |
|---|---|---|---|---|---|---|
| **1: forward depot** | 1 Depot Frame (half today's cost) | about 60% of today's | 1,200 / 2,500 | 2 | 2 module slots, no fighter hangar | 1 load |
| **2: depot** (today's depot) | +1 Depot Frame, upgraded in place | about 60 s | 2,000 / 4,000 | 4 | as today | 1, rising with works as in the garrison table |

- **Holding:** a forward depot holds its system for victory the moment it's finished, like a full depot.
- **Upgrading:** an upgrade is a station-works item ("Expand to full depot"). AI factions do it when they can spare a frame; pilots can pay for it from the depot's own store.
- **Vulnerable:** forward depots are easy targets. Garrison 1, weak key points, two turrets: one escort with its assault ship, or a called-in assault, can take one once it's breached. Claiming is cheap, but keeping a claim means upgrading or defending it.
- **Constructors:** a constructor called in by a pilot builds a forward depot by default. The call comes faster because the faction only needs 1 frame in stock.

### Balance
- Watch the victory pace: cheap claims could make the 7-system hold come too fast. The fast simulator should check game length and the share of games decided at the deadline against today's.
- Levers: forward depot cost and build time, their shield and hull, and how eagerly the AI expands them.
- Off-screen siege defence for a forward depot: about 800, against 1,300 for a full depot.

## Assault ships and capturing structures (partly built: loads on carriers, escorts and AI sieges; pilot call-ins and visible assault ships still to come)

### The idea
Depots and outposts are captured by landing marines, not by parking a frigate. Assault ships carry them. A pilot calls one in, like a constructor; it flies to the breached target, unloads, and disappears. This replaces frigate capture, so holding ground comes from structures, and taking them is a combined-arms job: bombers break the defences, fighters clear the wing, assault ships land under cover.

### Garrisons
Each capturable structure has a garrison, counted in assault-ship loads. One assault ship carries one load.

| Target | Loads |
|---|---|
| Outpost | 1 (2 if fortified to its top level) |
| Depot, base | 1 |
| Depot with a defence platform at level 2 or higher | +1 |
| Depot with a fighter hangar at level 2 or higher | +1 |
| **Most any target can need** | **3** |

Core stations and freeports can't be captured, only razed. The target panel shows the garrison ("Garrison: 2 of 3 loads landed").

### The limits match the garrisons
Every limit equals the largest possible garrison, 3, so one well-organised assault can always take any target in one go:
- **In flight:** a faction can have up to 3 assault ships flying at once.
- **On a carrier:** a carrier has 3 assault bays of its own, separate from its 6 craft bays, so it can carry a full 3-load assault without giving up any fighters or bombers.
- **On escorts:** each escort carries 1 assault ship. Ships launched from escorts count toward the same limit of 3 in flight.
- **Per call:** a pilot can call in as many ships as the target's remaining garrison, up to 3. The comms menu shows the number ("Call in 2 assault ships: 2 loads left").
- **AI sieges:** the AI sends exactly enough for the garrison.

If the garrison grows during the assault (for example, a defence platform finishes building), the new number shows straight away, and the limits still cover it because nothing goes above 3.

### Capturing
- **Breached first:** a target can be landed on only once it is breached (see key points below): its shield generator is down and either its hull is below 50% or its power plant is down. Calling ships in before then is refused ("Breach the shield first").
- **Landing:**
  - The assault ship flies to a docking port and spends about 8 seconds unloading; it is most exposed then.
  - Once unloaded it disappears and its load counts toward the garrison.
  - A ship destroyed before it finishes unloading loses its marines.
- **Progress:** landed loads hold for 3 minutes. If the rest don't land in time, the garrison is back at full strength.
- **Capture:** when landed loads reach the garrison, the structure changes hands, as captureDepot does today. It keeps its fighters, works and half its stores.

### Calling one in
- **Through comms,** like a constructor. The faction launches assault ships from the nearest friendly station with a shipyard, each with a 2-fighter escort, paid from faction stores. A carrier in the system launches its own instead, which is much faster.
- **Cooldown:** 3 minutes per pilot.
- **Reward:** a capture gives the faction 10 War effort points, split among the pilots who escorted or flew in that system.
- **Flying one yourself:** open question. Option: a pilot can take one from a carrier hangar and fly it in personally.

### Off-screen
A siege only captures if its force includes enough assault loads for the garrison and the target is breached. Otherwise it batters the target or razes it, as now. The Brood never captures; it razes.

## Station and depot key points (design, not built)

### The idea
Stations and depots have key points that fighters and bombers can target and destroy individually: the shield generator, the power plant and each turret. Knocking them out is how a target gets breached without grinding down its whole hull. It gives fighters a real job against structures, and it's what opens the way for assault ships.

### The key points
| Key point | Health | Effect while destroyed |
|---|---|---|
| **Shield generator** | about 1,800 | Shield drops to zero and can't recharge. |
| **Power plant** | about 2,400 | Turrets fire at half rate, the hangar can't launch, production and the missile battery stop, and the hull doesn't repair. |
| **Turret** (each one, including defence-platform mounts) | about 300 | That turret is out. |

- **Damage by weapon:** key points take more from fighters than armour does.

| Weapon | Damage dealt |
|---|---|
| Fighter guns and lasers | 40% |
| Missiles | 60% |
| Torpedoes and capital guns | 100% |

  A wing of fighters can strip the turrets and a heavy wing can bring down the shield generator, but the power plant really wants bombers.
- **Shield first:** the shield generator and turrets can be hit with the shield up; that's the point. The power plant is armoured inside the hull and can only be hit once the shield is down.
- **Repairs:** a destroyed key point is repaired by the crew after 90 seconds without hits. The repair takes 2–3 minutes and uses materials from the station's stores, so a starved station repairs slowly or not at all.
- **Breach:** a target is breached when its shield generator is down and either its hull is below 50% or its power plant is down. That is the condition for assault-ship landings.

### Targeting
- Key points show on the station model: glowing emitters for the shield generator, a reactor housing for the power plant, and the turret mounts.
- With a station or depot targeted, a key cycles through its key points (the station, shield generator, power plant, turrets). The target panel shows each one's health.
- Locks and torpedoes go for the selected key point.
- **AI:** bombers go for the shield generator, then the power plant; fighters strip turrets; defenders' hangar fighters prioritise whoever is hitting the generator.
- **Off-screen:** a siege battle knocks out key points in proportion to the force (like wkAbstractHit), which feeds the breach and capture rules above.

### Balance notes
- Make sure a lone fighter can't breach a defended station: turrets and the hangar should punish one ship, while a wing of 4–6 should manage a depot in a few minutes.
- Re-tune the factions with the fast simulator once captures depend on breaches.

## Fleet carrier (first version built: AI carriers with wings and assault loads, stand-off; own model, helm, landing and guests still to come)

### The idea
A faction capital ship that fights with its fighters instead of guns. It jumps like a frigate and has no main cannon, lance or torpedoes. It carries 6 fighters or bombers, and its turrets defend against fighters and torpedoes. It replaces the picket fighters frigates and escorts carry today (see below).

### Ship
| | Fleet carrier | For comparison: today's frigate (to be removed) |
|---|---|---|
| Hull / shield | about 5,000 / 2,400 | 6,000 / 2,400 |
| Main weapon | none | lance, torpedoes |
| Turrets | 6 point-defence turrets that shoot down torpedoes and missiles and engage fighters within about 1.4 km | turrets plus lance |
| Hangar | 6 craft bays: any mix of Light, Medium and Heavy Fighters and Bombers (Heavy Bombers at Mk III+), plus 3 separate assault bays for assault ships only | 2 pickets |
| Jump | own drive, same spin-up as a frigate | |
| Speed | a little slower than a frigate | |

- **Cost:** about a frigate's kit minus the lance and torpedo parts, plus hangar parts (more frames and coil). The fighters are extra: kits drawn from stores, like the fighter hangar works.
- **Limit:** only one carrier per faction can exist at a time, the Brood included (see Brood carrier below). A faction can't lay down a new one while its carrier is alive, and a pilot-owned carrier counts as that faction's one carrier. It counts toward the capital cap alongside frigates and escorts.

### How it fights
- **Launching:** it launches its wing when hostiles come within about 4 km, two craft every few seconds. Bombers go for capitals, structures and Overgrowth; fighters screen the carrier and hunt enemy bombers.
- **Recovery and rearming:** the wing lands again when the area is quiet. Landed craft rearm missiles and torpedoes from the carrier's stores and repair over a couple of minutes.
- **Losses:** a craft shot down is gone; its kit falls as debris. The carrier refills empty bays from faction stores when it next visits a friendly station with a shipyard.
- **Stand-off position:**
  - **One system back:** an AI carrier sits one system away from the system it is attacking, in a friendly or quiet neighbour next to the gate that leads in.
  - **Launching through the gate:** its wing and assault ships fly through that gate to strike, and come back through it to land, rearm and repair. The carrier itself stays out of reach of the target's turrets, hangar fighters and any defending frigate's lance.
  - **When the gate is sealed:** if Overgrowth seals the gate into the target system, the craft can't get through. The carrier then jumps into the target system itself (capitals ignore gates), launches from there and accepts the risk. Clearing the Overgrowth comes first: its bombers go for the growth, and once the gate reopens the carrier jumps back to its stand-off position.
  - **Defending its own space:** for defence, the carrier sits in the threatened system itself.
  - **Pilots:** pilot carriers are free to sit wherever they like. The wing console marks the suggested stand-off system on the map.
  - **Counterplay:** defenders who find the carrier's stand-off system can raid it with bombers while its wing is away. That makes guarding the carrier a real job, typically a screen of 2 craft kept back, or a frigate alongside.
  - **Off-screen:** a carrier adjacent to a siege adds its wing and assault loads to that siege, as if it were present. Its own hull is only at risk if the target faction sends a raid into the stand-off system.
- **Weakness:** on its own it is a big target. Its turrets keep fighters and torpedoes off it, but an enemy frigate's lance and torpedoes will hurt it. It needs either its wing in the air or a frigate alongside.

### Commanding one (pilots)
Pilots can command a carrier, commissioned at a shipyard like a frigate or escort, as long as their faction has no carrier yet.

**Helm and landing**
- **Helm like a frigate's:** the carrier has a bridge you walk around, with the same helm and console: helm, nav and jump, plus a wing console in place of the frigate's weapons console.
- **Landing aboard:** fly your ship into the carrier's landing bay. It lands, is drawn into the hangar and disappears from space; you walk onto the bridge. Your ship counts as one of the 6 hangar craft while it is aboard.
- **Launching from the hangar:** from the bridge (or a launch console by the hangar door) pick any craft in the hangar, your own ship or one of the carrier's fighters or bombers. You launch from the bay like a fighter, with the carrier keeping its last helm orders (hold, follow you, or hold at a point) while you're out. Fly back in to land and return to the bridge.

**Wing orders** (wing console)
- **Wing stance:** Screen (stay within 2 km of the carrier), Attack my target, or Hold (stay docked).
- **Loadout:** pick the 6 craft from your own vault kits, and the carrier fills them when docked. The 3 assault bays refill with assault ships from faction stores at a shipyard station.
- **Assault:** launch 1–3 assault ships at a breached target in the system (see Assault ships); they come out of the assault bays, not the craft bays.
- **Bombing run:** pick a target in range and the bombers go. This is the best tool against Overgrowth, which capital ships can reach by jumping when gates are sealed.

**Multiplayer: owner commands, others are guests**
- Only the pilot who owns the carrier can take the helm or give wing orders.
- Other pilots of the same faction can land aboard as guests. Their ships go into the hangar using free bays, and they can walk the bridge, watch the consoles and ride along through jumps. They can't take the helm or give wing orders.
- Guests launch their own ship from the hangar whenever they like. If the carrier is destroyed with guests aboard, they eject in their own ships, as a frigate's crew does today.

### Off-screen
In strategic battles a carrier counts as its hull plus its wing. Its wing adds strength to assaults and sieges like a fighter group, and its point defence cuts the torpedoes that land on it, like an escort's screen. Use the fast simulator to tune its value so carriers don't tip the faction balance.

### Rules
1. It never carries a main gun or torpedoes of its own: all its hitting power is in its wing.
2. The economy stays exact: craft in its bays are kits held aboard, lost craft fall as debris, and refills come out of faction stores.
3. Re-tune all four sides with the fast simulator after it lands.

### Carrier fabrication (built; replaced the wing-replacement chain)
Carriers build their own craft. The old system (ready fighters answering a request, then the nearest builder) has been removed.

- **The store.** Each carrier keeps a store of materials aboard. It always tries to fill it completely: a full wing of heavy-craft kits, plus three assault loads for a faction carrier.
- **The fabricator.** The carrier's deck fabricator turns one kit at a time into a fighter or bomber for an empty bay (14 s each, `BAL.carFab`). When the wing is full, it builds assault loads. In a live system the new craft launches from the deck.
- **Supply.** When the store is short, the carrier asks every 30 s (`BAL.carAsk`). A convoy is sent from the nearest depot store or the core warehouse and can be intercepted on the way. If the faction can't cover the shortfall, it posts an Order ("for the carrier X to build fighters").
- **Kits.** These don't use wire:

  | Craft | Kit |
  |---|---|
  | Heavy or bomber | 6 plates, 2 coils |
  | Striker | 5 plates, 1 coil |
  | Anything else | 4 plates, 1 coil |

- **Ledger and loss.** The store and the kit in the fabricator are counted in the ledger. If the carrier dies, they become debris.
- **Brood.** The Hive Ship regrows one craft about every 4 minutes from its store (`BAL.hiveRegrow`).
- **Measured:** an AI carrier holds 4.5 craft on average (target 4.5).

Carriers have their own model: a flight deck with runway lights, a bow hangar mouth, side bays, an island bridge and four drives.

## Brood carrier (first version built as the Hive Ship)
The Brood's version is a living carrier, the **Hive Ship**: a swollen, living vessel that grows its own wing. It jumps like the Leviathan and has no lance or spitters of its own.

- **Limit:** only one Hive Ship can exist at a time. The Brood grows it at The Bloom once it holds 4 or more systems.
- **Hull:** high health (about 7,000), no shield. It regenerates slowly like other Brood growth, and its spore tendrils shoot down about 30% of incoming torpedoes.
- **Wing:** up to 6 Brood craft (Mites, Thrashers and Sporemaw bombers). Lost craft are not refilled at a shipyard: the Hive Ship regrows one every 90 seconds from biomass it carries, topped up by grazing in Brood space. Each regrown craft uses real materials from the Brood's stores, so the economy stays exact.
- **Behaviour:** it hangs back while its wing does the fighting, and swarms Overgrowths it is defending and systems the Brood is attacking. With its wing gone and its biomass spent, it retreats to the nearest Brood system to regrow.
- **Counterplay:** kill the wing to stall it, or reach it with torpedoes. Its tendrils punish a single bomber, so a group is needed.
- **Balance:** tune its biomass cost and regrowth rate with the fast simulator so the Brood stays near 20%.

## Picket fighters removed from frigates and escorts (built)
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

## Faction balance (current)
These figures are from the fast simulator: 384 games, two-hour games, no human pilot.

- **Result:** Halcyon, Varkesh, Brood and Ostrova all land between about 21% and 28%. Games are decided by holding systems or, at the two-hour deadline, by who holds the most.
- **Levers:**

  | Lever | Value | What it does |
  |---|---|---|
  | `BAL.brGraze` | 1.7 | Brood ore income |
  | `BAL.ext.halcyon` | 0.7 | Halcyon extraction |
  | `BAL.ext.varkesh` | 1.24 | Varkesh extraction |
  | `BAL.ext.ostrova` | 1.22 | Ostrova extraction |
  | `BAL.halProsp` | 0.5 | Halcyon prospecting chance |

- **Why the Brood's graze rate came down:** with logistics, factions lose time and goods to convoys. At the old Brood income (3.5), the Brood won about 60% of games.

## Victory bonus (built)
- **Who earns it.** Every pilot who served a faction's campaign (helped at least one move) earns it when that faction wins the galaxy. Reaching 7 systems isn't enough; the faction has to hold them for 20 minutes and win.
- **How it's paid.** The galaxy ends at the win, so the bonus is held in the device's legacy record. It is shown on the win screen and paid at the start of the next real galaxy: 3,000 cr, 2 Crystal Lattice and 1 Resonance Core into the starting vault, whatever faction the pilot picks. Flight school doesn't use it up.
- **History.** It used to be paid the moment the faction first reached 7 systems.

## Carrier hangar console (built)
On a carrier's bridge the Weapons station is the **Hangar** (carriers have no main battery).

- **Flight deck.** It shows:
  - craft aboard against the 6 bays, split into flying and in the hangar;
  - what the fabricator is building and how long is left;
  - how many more craft the materials aboard can build, and whether a supply convoy is on the way;
  - assault loads (3 bays) and, if a hostile depot is in the system, the garrison it will need.
- **Wing orders** apply to every craft without an order of its own:

  | Order | What the craft do |
  |---|---|
  | Guard | Stay with the carrier and fight off anything that comes for it (the default) |
  | Strike | Attack the strike target, or the nearest hostile to the carrier |
  | Hunt | Range across the system and attack any hostile craft, bombers first |
  | Land | Fly home and land |

  Landed craft wait in the hangar, repaired; their kits go back aboard. Launch them one at a time or all at once.
- **Per-craft orders.** Each flying craft can be given its own order, or set back to follow the wing.
- **Strike target.** A list of hostile ships in range, bombers and capitals first. Picking one sets the wing to Strike.
- **Point defence.** Torpedoes first, fighters first, or hold fire.
- **Strike next door (sorties).** A carrier fights from one system back, so the Hangar lists every hostile station, depot or outpost in the neighbouring systems, plus hostile capital ships your sensors can see there, each with its condition and a Strike button. A sortie runs like this:
  1. **Who goes.** Every flying craft goes, along with anything in the hangar, except craft you've given their own Guard order; they stay to screen the carrier.
  2. **Through the gate.** The craft fly to the gate and go through, taking their kits with them so the ledger stays exact.
  3. **The strike.** It lasts up to 3 minutes, and breaks off early once the target is down or half the craft are lost. You can call it back at any time.
     - **Out of sight:** it plays out like an AI carrier's stand-off strike. It wears down shields, then hull, using wing power (bomber 1.6, heavy 1.2, others 1). The target counts as under siege, so its shields stop regenerating. A sortie still running counts toward capturing a depot it breaks, so assault loads aboard the carrier are used.
     - **Defence fire:** each craft has a chance of being lost every 10 s: 0.8%, plus 1.2% at a depot (3% at a core station, 2.5% at a hive), plus 2% for each hostile capital.
     - **If someone is in that system,** the craft arrive through its gate and fight there for real.
  4. **Back home.** Survivors return through the gate and rejoin the wing. If the carrier has left the system they join its wing; if it's been destroyed their kits go back to faction stores.
  5. **Bays.** Craft away on a sortie still count as occupied bays, so the fabricator doesn't build extras.
- **Measured:** a 5-craft strike (2 bombers, 2 heavies, a striker) on a fresh depot broke it in about 2½ minutes, losing 0–2 craft, and captured it with the carrier's assault loads in 4 of 5 trials.
- **Fabricator under command.** A faction carrier on loan to a pilot keeps fabricating and calling in supply convoys. Only a pilot's own carrier is restocked by hand.
- **Saving.** A save made while the carrier is in your system keeps its wing.

## Bridge sound
- Console beeps: once every 2–4 minutes.
- The computer room tone: once every 2–4 minutes. It used to loop every 4 seconds.
- Crew radio chatter: every 30–60 seconds.

## Developer menu (Ctrl+Alt+D)
Spawns a friendly carrier or escort, or an enemy carrier, escort or Brood Hive Ship (side picker).

## Escort bridge stations (built)
- **Helm (every capital ship).** The Helm shows the sector's tactical map, the same one as Strategic: click empty space to move, click a hostile to target it. Helm controls, the jump drive and course plotting sit beside it.
- **Escort Weapons.** It shows what the escort carries:
  - **Twin torpedo bays.** A homing pair every 12 s at 3/6 power, 2.7 km range. The launchers reload by themselves and use no stores. Modes: Automatic, Selected target, Hold fire, Launch now.
  - **Point defence.** Six turrets: torpedoes first, fighters first, or hold fire.
  - **Fighter screen.**

  There's no capital-battery text and no pickets section. The bridge HUD card reads "Torpedo target", using the torpedo range.
- **Engineering's third power slot** depends on the ship:

  | Ship | Third slot |
  |---|---|
  | Escort | Torpedo bays |
  | Carrier | Flight deck: build speed. Fabricator time is divided by power ÷ 3, with a floor of 0.34 |
  | Others | Capital battery |

## Robustness
- **The frame loop can't die.** Each part of a frame (simulation, camera, 3D, HUD, bridge console, audio) runs in its own error guard, and the next frame is scheduled first. A bug shows a one-line flash and is logged once per kind to the console and to `window.__dgErr` (the last 20), instead of freezing the game.
- **`wrapA`** can no longer loop forever on an infinite angle.
- **Full-frame soak test** (`test/t252_soak.py`): it runs 3D, HUD, map, every dock tab, bridge consoles, carrier orders and sorties, dev spawns and system hops for 25–40 game minutes, tracking errors and any ledger change caused by each action.

## Assault ships return (built; replaces "assault ships disappear")
Assault ships aren't used up. At a capture they land their marines and fly home.

- **Depot capture.** Each assault ship has a 20% chance of being shot down; its materials fall as debris. Survivors are back aboard their carrier or escort after 60 s. Until then they don't count toward another capture (the Hangar shows "ready of total, n flying back").
- **Outpost capture.** It uses one assault ship, with a 10% risk.
- **AI siege groups.** Survivors go home with the group and back into faction stores. Lost ones fall as debris.
- **Fabricator.** A carrier's fabricator only rebuilds the assault ships that were lost.
- **Balance check** (384 games): Ostrova 27%, Brood 25%, Varkesh 25%, Halcyon 23%.

## Fixed: a destroyed carrier's store
A carrier destroyed in a live system used to lose its onboard store and the craft half-built in its fabricator; they vanished from the economy. They now spill with the rest of its hold: half as salvage, the rest as debris. Found by the full-frame soak test (16 plates and 14 coils missing in one 40-minute run). Five more soaks since, 25–60 game minutes each, came back clean.

## Capital ship models (built)
- **Fleet carrier** (`tools/capitals.py`, `build_carrier`). It's assembled from Kenney Space Kit parts in the escort's kit style, with lines after Wing Commander's Concordia:
  - a broad, low flight-deck bow of twin hangar bays; the bays' open fronts are the launch mouths;
  - escort-style sponsons with point defence down the bow flanks;
  - a narrow waist under a roofed spine, with turret sponsons;
  - a tall aft hull with a tower that steps up in corridor tiers to a domed bridge with a dish;
  - engine nacelles on pylons, so the stern is the broadest part;
  - three main drives in a triangle (one over two), plus a drive on each nacelle.

  Its turret mounts, engine flares and deck landing spots come from the model.
  - **Docking.** Players land on the bow flight deck from above, at two spots fore and two aft. They board the bridge, then lift straight off the deck.
  - **Escort docking.** The escort uses hull berths found from its model.
  - **Other designs.** Earlier and alternate carriers (Bengal-style, smooth Concordia, slab concept) are kept in `capitals.py` for reference, unused.
- **Escort.** Also built from Kenney parts. It's a lean torpedo destroyer:
  - an armoured prow and twin forward torpedo tubes;
  - three point-defence turrets a side on flank sponsons;
  - a small bridge dome, one ventral assault bay, and a main drive with two auxiliaries.
- **Brood Hive Ship** (`b_hive`, the Brood carrier):
  - a swollen brood-queen abdomen caged by bone arches, with glowing brood sacs between them;
  - birthing pores down the flanks, some with nymph craft half out;
  - a horned, armoured head with mandibles, eyes and a glowing maw, behind a ribbed waist;
  - aft membrane fins, vestigial legs, and trailing tendrils around twin drive vents.
- **Brood Prowler** (`b_prowler`, the Brood escort):
  - a hammer head with eyes at the tips;
  - twin bone spore-torpedo launchers with glowing mouths;
  - a dorsal sail of spines strung with membrane;
  - three spitter polyps a side (its point defence);
  - folded mantis forelimbs, hooked legs, and tail fins.
- **Retired from the pack:** the frigate and the Leviathan. The code-built carrier remains only as a fallback.
- **Engine glow.** Capitals build their drives first, and only those triangles may glow. This stops flat aft faces of the hull from reading as engines.
- **Bridge consoles** speak per ship. A carrier's Strategic map and bridge HUD show the wing's strike target and orders, and clicking a hostile sends the wing. An escort's show its torpedo target and range.
- **Size.** The model pack grew from 706 KB to 806 KB (base64).

## Ambient music (built)
- **Tracks.** Each kind of space has its own recorded track:
  - Halcyon, Ostrova and Varkesh space each have one;
  - freeports have one;
  - Brood space has one, as do Brood hive systems even before the Brood take them;
  - open space (unbound, contested, deep, junction) has one.
- **Battle music.** It starts when your shots land on shields, or your own shields take fire; a hit on bare hull doesn't start it.
  - Any further hit either way keeps it going.
  - It cuts in over 1.5 s.
  - It hands back to the space's own track 25 s after the last exchange of fire, or as soon as you dock.
  - After 40 s of quiet, the next fight starts it from the top.
  - A multiplayer guest gets the same behaviour: it watches its own shields, which the host updates.
- **Choosing the track.** The track follows whoever holds the sector now (`sectorOwner`), so it changes when a system is captured. A freeport sector takes priority.
- **Playback.** Files stream from `music/` beside the game, so the page stays light. Each loads only when first needed, then loops. Changing space crossfades over 4 s.
- **Repeating.** A track plays to its end and fades out over its last 6 s. After 3 s of silence it starts again from the top with a fade-in, for as long as you stay in that kind of space.
- **Sound panel.** Click the Sound button to open it. It has on/off switches and volume sliders for effects and for music, saved between sessions. The music slider also sets the level of the fallback score. N still cycles all on → music off → muted. When music is off, or the tab is hidden, the tracks fade out and pause.
- **Fallback.** If a track can't load (the page was opened without its `music/` folder), the old generated score plays instead.

## Developer carrier spawn (built)
A carrier spawned from the developer menu comes fully loaded: three fighters (light, medium, heavy), three bombers, and all three assault bays filled. The kits ride aboard and the ledger records them.

## Beacon lock and decay (built)
- **Secured.** For 3 minutes after a flip, nobody can flip the beacon. The map marker shows a ring that empties as the lock runs out.
- **Fading.** For the next 2 minutes, an enemy scout can flip it. A friendly scout can re-secure it with the normal hold (10 s, or 7 s with the Pathfinder perk), which starts a fresh 3-minute lock. A pilot who re-secures a beacon takes over its residual. The map marker pulses while it fades.
- **Lapsed.** If nobody re-secures it, it drops to neutral and its scan and residual stop. Residuals pay only up to the moment it lapses.
- **Held space.** In a system the holder's side holds (its home space, or its station or outpost there), the local crew keeps the beacon secured. Out in contested and open space, only a scout can keep it.
- **AI scouts.** They skip locked beacons and route toward beacons they can flip, or their own fading ones. Off-screen they re-secure their side's fading beacons where they are.
- **Effect on the map.** In the churn test, AI factions hold about 2–6 beacons at a time, down from about 21. More of the map is neutral, beacon jobs come up more often, and beacon intel follows where scouts are actually active.

## Capital wrecks (built)
Carriers, escorts, and the Brood Hive Ship and Prowler leave a wreck when they die in a live system. Other kills still drop crates and debris as before.
- **Contents.** The wreck holds exactly what would have gone into crates and debris: hold, store, kits, and the build materials it carries. A third of it, by raw-material mass, comes out as intact components (conduit, plate, coil). The rest is raw ore. Components are broken down or built up by their own recipes, so the ledger stays exact (it has a new **Capital wrecks** line).
- **Salvage points.** Up to six:
  - reactor core: conduit, rare ores and forge parts, plus some xenocrystal from a Brood hulk;
  - drive block: coil and copper;
  - two torn bulkheads: plate and iron;
  - two cargo bays: everything else.
  Any mining laser cuts them: the player's, remote pilots', and NPC miners'.
- **Reactor core hazard.** Every unit cut out of the core heats it by the larger of 4.5% and 150% ÷ the core's starting size, and it cools 12% a second. At 100% it blows: up to 340 damage within 380 m, and its contents scatter as debris. Cutting the whole core out in one go always blows it, so it has to be mined in bursts. The target panel shows the core's heat, and a warning flashes at 60%.
- **Life.** 5 minutes. Then whatever is left breaks up into the system's debris, which is the old behaviour.
- **Brood advantage.** Brood miners always go for wrecks and digest them twice as fast. A wreck within 3 jumps of Brood space draws a Brood scavenger party through a gate after 20–90 s, sooner the closer it is. Faction miners also salvage wrecks some of the time.
- **Map and alerts.** A feed alert announces each wreck. An amber ✕ with time left shows on the galaxy map in systems you have intel on, and the system panel lists each wreck's tonnage and time left.

## Scout pings on capital ships (built)
- **How.** In a Scout or Advanced Scout, keep an enemy carrier or escort (or the Brood's capitals) targeted within 4 km for 4 s. A HUD chip shows progress.
- **Effect.** For 5 minutes, the scout's whole side sees the ship on the galaxy map (M), even without sensor cover, marked with a pulsing ring. Capital ships' Strategic and Helm maps ring it when it's in the same system and list every pinged enemy capital with its system, jumps away and time left. You can re-ping a ship once at least a minute of its tag has run.
- **Pay.** If a pinged ship is destroyed while tagged, live or off-screen, the scout who pinged it gets 500 cr for a carrier or 300 cr for an escort, from their faction's treasury.
- **Multiplayer.** A guest's ping goes to the host, which records it.

## Legend points for a loss (built)
- **Rule.** A win earns 1 Legend point, as before. A loss earns ½, under the same condition as a win: at least 30 minutes, and most of your time, flown for that faction.
- **Records.** Losses are counted per faction. The leaderboard shows points (½ steps allowed). Level thresholds are unchanged, so old records carry over.

## Hauling for the war (built)
### Front-line resupply
- **Unloading.** Land on a friendly carrier's flight deck carrying materials its store lacks (kits for its wing and assault ships). They unload straight into its store, so the fabricator can start at once instead of waiting for a faction shipment.
- **Pay.** It comes from the faction treasury at 1.5× base value, times a front-line bonus capped at ×2.2:
  - +0.3 when the carrier is outside friendly space;
  - +0.6 with hostiles within 5 km;
  - +0.4 if it has been hit in the last 90 s.
- **Orders.** An open Order for that carrier pays its own rate if that's higher, and shrinks by what you deliver. Economy → Orders lists which carriers need what, where they are, and their current bonus.
- **Multiplayer.** A guest's delivery goes through the host.

### Blockade runs
- **Which stations.** A faction station is eligible if it's under siege (a hostile offensive on it), blockaded (a hostile capital in its system), or cut off behind the lines (no friendly system next door). Up to two blockade runs per faction are open at a time.
- **The contract.** Deliver plate, coil, conduit, missiles or iridium in person, for 3.6–4.6× value. Anything you own counts, including goods bought on a market elsewhere. A delivery also patches 10% of the station's hull.
- **Interdiction.** Carrying the cargo through hostile space next to the station, or inside it, draws an interdiction wing: two fighters, or three in the station's own system. It hunts you, at most once every 3 minutes per system.
- **Expiry.** A run is cancelled when the station stops being cut off or besieged.

### Player convoys
- **Calling one.** In a hauling ship, docked at a friendly station with a course set and at least 10 t aboard, call a convoy from Economy → Orders. The faction assigns two escort fighters from its stores, or three if the route leaves friendly space.
- **The flight.** The escorts launch with you, fly escort, and jump with you: between systems they ride along as kits, like guard drones.
- **Ending.** Docking at a friendly station (or a freeport) in the destination ends the convoy, and the survivors go home to faction stores. Destroyed escorts are lost. The convoy also ends if you die or after 30 minutes.
- **Escort pay.** Other pilots of your faction who stay within 4 km at each jump are paid 120 cr a jump from the treasury.
- **Multiplayer.** Every pilot can call a convoy. The host runs a guest's convoy: the guest's request goes to the host, and the escorts launch with the guest's ship, pack up when it leaves a system or docks, count its jumps, and go home when it docks at the destination. Escort pay counts any pilot of the faction (host or guest) within 4 km at each jump. Blockade interceptor wings hunt guests carrying blockade cargo as well as the host.

## Training (rebuilt)
There are 12 lessons and 67 steps. Hands-on steps check what you did; "Got it" cards cover what can't be practised safely in the training galaxy. Together they cover:
1. **Flight:** gates and the sound panel.
2. **Weapons:** bounties, swarms and wings.
3. **Mining and trade:** ores, hulls and drones.
4. **The station:** vaults.
5. **Scouts and beacons:** lock and fade, pings, sensors.
6. **Hugging a rock.**
7. **Salvage and wrecks:** a practice hulk to mine, crates and galaxy events.
8. **Hauling for the war:** Orders, front-line resupply, blockade runs, convoys.
9. **Logistics and raiding:** convoy raids and escort, war effort.
10. **Comms and capital ships:** comms, landing on the deck, Take command, Hangar and Helm tabs, escorts, crewing, the shipyard.
11. **Fighting for territory:** structures, stations, depots and fighter hangars, outposts, operations, the Brood, special hulls.
12. **Winning the war:** map, victory rules, the Brood, Legend points, multiplayer.

`test/t214_train.py` walks all 67 steps.

## Balance check (after the beacon, wreck and hauling changes)
200 strategic-only galaxies (2.2 h cap) on the current build, against the build from before the beacon lock:
- **Current build:**
  - Halcyon 30%, Varkesh 28%, Ostrova 22%, Brood 21%.
  - 54% of galaxies end by a 7-system hold, 46% at the deadline.
- **Previous build:**
  - Varkesh 34%, Halcyon 26%, Ostrova 20%, Brood 20%.
  - 51% end by hold.

- **Follow-up, 1,000 games on the current build:** Halcyon 27.3%, Varkesh 26.0%, Brood 23.7%, Ostrova 23.0%. Each figure is ±2.6–2.8 points at 95% confidence, so Ostrova's gap to an even 25% is inside the noise, and no lever was changed.

All four sides stay within the 20–34% band. No faction runs away, and the Brood remain a real contender. The live-only features (wrecks, convoys, front-line resupply, blockade interceptors) don't run in the strategic sim.

## Medium Hauler speed (built)
The Medium Hauler's speed went from 0.86 to 0.95, while its hold stays at 100 t.

| Hull | Price | Hold | Speed | Cargo moved per hour vs Light |
|---|---|---|---|---|
| Light Hauler | free | 60 t | 1.05 | — |
| Medium Hauler | 2,100 cr | 100 t | 0.95 | +51% (was +37%) |
| Heavy Hauler | 4,700 cr | 180 t | 0.72 | +106% |

It's now the workhorse between the quick Light Hauler and the crawling Heavy Hauler. The extra speed helps on every run, including part-full ones, and cuts time exposed to raiders. Off-screen convoy timing uses a fixed hop time, so the strategic balance is unchanged.

## Job sizes and partial delivery (built)
- **Size bands.** Delivery contracts, freeport requests and blockade runs each pick a band when posted:
  - **Small** (50%): the old sizes, which fit a Light Hauler.
  - **Medium** (33%): 60–100 t.
  - **Large** (17%): 100–180 t.

  Only common goods (iron, copper and iridium ore, and plate) come in the medium and large bands. Scarce parts always stay small.
- **Pay and time.** The rate per unit never changes, so a big job pays more only because it moves more. Medium jobs get 1.5× the usual time to fill, and large jobs 2×.
- **Partial delivery.** Any job can be delivered in parts, each at least a quarter of the job or 10 units, whichever is less. Each part is paid pro-rata from the remaining reward, and the job stays posted with what's left. Several pilots can fill one job.
  - War effort and the Contractor perk's 150 cr bonus are pro-rata too, so splitting a job never earns more than delivering it whole.
  - A blockade delivery patches station hull in proportion to its share.
- **Orders screen.** Each job shows its tonnage, how much has already been delivered, and a warning when it's bigger than your hold.

## Economy pass: closing risk-free loops (built)
- **Stations fabricate their own ore.** Faction stations turn all raw iron and copper above an 80-unit reserve into plate and conduit every tick. (Those ores make nothing else, and at 80 the faction doesn't fall below its 60-unit import trigger.) Freeports do the same above 40; depots with a production module do it above 20, at 10 a tick per production level. Coil stays at its old rate, because iridium is needed for missiles, torpedoes and keels.
  - **Result:** raw ore on markets is scarce and dear (about 14 cr), while plate is plentiful (about 20 cr). Buying ore to fabricate into plate for a contract now loses money (it used to make +41%). Miners get better ore prices.
- **Carrier resupply pays the local rate.** The base rate is what the goods would sell for there: the local price if a friendly station is in the carrier's system, otherwise the faction's sell price. That rate is multiplied by the front-line bonus (up to ×2.2). Unloading at a carrier parked at home now roughly breaks even (−5 cr in the test, down from +31%); the profit is out at the front. An open Order's rate applies only to goods you mined or made, never to bought ones.
- **Mining lasers only on mining ships.** Light, Medium and Heavy Miners keep their lasers; fighters, bombers, scouts, haulers and the constructor have none. Pressing F in another hull explains why. Wreck salvage is now miners' work. Training moves the cadet into a Light Miner for the mining and salvage lessons.
- **Convoy escort pay only where it's dangerous.** Escort pilots near the hauler as it jumps are paid only when the system it leaves or the one it enters is outside friendly space. Runs between home systems pay nothing.
- **Balance, 1,000 galaxies:** Varkesh 27.0%, Halcyon 25.7%, Brood 25.5%, Ostrova 21.8% (±2.7). That's inside the 21–28% band. Speeding up coil production as well had pushed the Brood to 40% by starving the factions of iridium, so coil was left at its old rate.
- **Still open:** the developer menu works for multiplayer guests, and two pilots on opposite sides can trade a beacon back and forth for flip bonuses.


## The pay ladder (v158)

Income follows risk. Hauling pays most: it crosses the least friendly systems the furthest. Mining comes next, since it can
happen in enemy fields. Combat is third, and beacon running, the safest work, pays least.

- **Mining.** A pilot's mining laser cuts rock at a per-hull fraction of its rated drill (`MINE_RATE`): Light Miner 0.036,
  Medium 0.0324, Heavy 0.0257. Holds fill in about 4, 5 and 7.5 minutes. Salvage points on capital wrecks cut at
  `SALVAGE_RATE` = 0.5, since a wreck only lasts five minutes. AI miners are unchanged, so faction economies and the
  strategic balance don't move. The shipyard shows the pilot rate.
- **Hauling.** Pilots pay a market fee on every trade: 6%, 5.5% in a Medium Hauler and 4% in a Heavy Hauler (`HAUL_FEE`,
  `mFee`). A bigger hold soon moves prices against itself (a 300 t hold makes barely more a trip than 180 t), so the Heavy
  Hauler's edge is a thinner fee rather than more tonnage. A buy-and-sell round trip at one station still loses money.
- **Combat.** Kill bounties ×4 (drones 40), escorts 1,400, carriers 2,800. Convoy raid bounty = cargo value × 0.85 + 400.
- **Beacons.** Flip bonus 180, beacon missions 240, residual 12 cr/min, paid only for `BCN_RES_T` = 10 minutes after the
  pilot last flipped or re-secured that beacon (`B.byT`). Holding a beacon no longer pays forever.

Measured per hour (Mk I, 20 simulated galaxies, realistic overheads):

| Role | Light | Medium | Heavy |
|---|---|---|---|
| Hauling, trade only | 15.6k | 19.9k | 25.2k |
| Mining, best field ≤2 jumps | 12.0k | 15.5k | 20.0k |
| Mining, home system | 3.7k | 4.7k | 5.8k |

Combat 4.9k (casual) / 9.8k (average) / 14.8k (strong). Scouting 3.5k / 5.4k / 7.3k. Hauling also has blockade runs
(median profit about 1,070 a run), carrier resupply at up to ×2.2 on the front, and convoy work on top of trade.

## Combat hulls, pirates and aces (v159)

**Duel balance.** `test/t279_duel.py` (scratchpad) runs AI-vs-AI 1v1 duels between every pair of combat hulls at equal Mk.
Before this pass the Heavy Bomber won about 90% of its duels and the Bomber 61%: AI bombers torpedoed fighters at close
range and a torpedo all but one-shots a fighter. Changes:

- **Torpedoes are siege weapons.** A torpedo's blast hits any ship that isn't a capital ship for `TORP_SMALL` = 0.3 of its
  damage, and AI bombers only torpedo capital ships (stations and outposts as before).
- **Heavy Bomber:** hull 240 → 185, shield 1.25 → 1.0, forward guns 1.15 → 1.05.
- **Wraith +10%:** hull 78 → 82, shield .85 → .89, guns 1.8 → 1.89 (about +10% fighting strength overall).

Win % of the row hull against the column hull, 150 duels each:

| Mk I | Light | Medium | Heavy | Bomber | Heavy Bomber | Wraith | Overall |
|---|---|---|---|---|---|---|---|
| Light Fighter | — | 50 | 40 | 81 | 65 | 18 | 51% |
| Medium Fighter | 50 | — | 40 | 86 | 62 | 26 | 53% |
| Heavy Fighter | 60 | 60 | — | 97 | 82 | 24 | 65% |
| Bomber | 19 | 14 | 3 | — | 18 | 5 | 12% |
| Heavy Bomber | 35 | 38 | 18 | 82 | — | 12 | 37% |
| Wraith | 82 | 74 | 76 | 95 | 88 | — | 83% |

| Mk II | Light | Medium | Heavy | Bomber | Heavy Bomber | Wraith | Overall |
|---|---|---|---|---|---|---|---|
| Light Fighter | — | 37 | 17 | 84 | 56 | 25 | 44% |
| Medium Fighter | 63 | — | 25 | 83 | 73 | 30 | 55% |
| Heavy Fighter | 83 | 75 | — | 97 | 96 | 56 | 81% |
| Bomber | 16 | 17 | 3 | — | 15 | 6 | 11% |
| Heavy Bomber | 44 | 27 | 4 | 85 | — | 16 | 35% |
| Wraith | 75 | 70 | 44 | 94 | 84 | — | 73% |

**Pirate bounties.** Unbound ships pay `PIRATE_MUL` = 1.2 times a rival faction's bounty.

**Aces.** The live build carries the ace system from a parallel session (v158 + enemy aces that hunt you after you kill
enough of a side's ships, a Wanted list, kill records kept on the device, Unbound ambushes from the rocks, quiet-space
signals and the end-of-galaxy debrief). This pass sets ace prices: `ACE_BOUNTY` = 3,500 cr to start (4,200 for an
Unbound captain, `PIRATE_MUL`), above a carrier's 2,800 so an ace is the biggest bounty in the game, +600 for every pilot
it kills up to `ACE_CAP` = 8,400. A separate ace roster written in this session was dropped in favour of that one.

Strategic check after the hull changes (500 games, 2.2 h): Halcyon 27%, Ostrova 26%, Varkesh 24%, Brood 22%.

## Mk curve, hull balance and tuning (v160)

Measured with `tools/duel.py` (jobs file of `[clsA,mkA,tuneA,clsB,mkB,tuneB]`): AI pilots with equal aim (`e.aimT=1`),
a player's magazines (missile rack or torpedo bay by Mk, swarm pods), flaring missiles like a player (`e.flares`).

- **Mk curve.** Each Mk now adds a fraction of the old step to combat stats (hull, shields, armour, guns, energy, missile
  and swarm damage): `MK_LV=[0,0,.17,.29,.46,.72]` old steps at Mk I..V, times a hull's `mkK` (Heavy Fighter .8). Engines,
  holds, mining lasers, payload reloads and torpedoes keep their full steps. Same hull, Mk I wins about 39% against Mk II,
  33% against Mk III, 29% against Mk IV, 23% against Mk V (it was 0-16%).
- **Aurorite tuning** adds `TUNE_CMB` = 3% a level to shields, guns, armour and power (6% to engines, holds and lasers).
  Fully tuned beats the same ship untuned about 60% of the time, worth about a Mk.
- **Swarm pods** do `SWARM_K` = 0.35 of their old damage: any swarm-carrying hull was winning almost every duel.
- **Heavy Fighter** hull 165 → 125, shield 1.25 → .95, guns 1.55 → 1.22, missile rack 1.5 → 1.0.
  **Light Fighter** hull 78 → 86, guns 1.0 → 1.05.
- **AI flares** no longer fire at swarm micro-missiles (that let a swarm bait the flares for the real missile).

Overall win % against the other five hulls at the same Mk (Mk I / III / V): Light 49/49/54, Medium 56/57/51,
Heavy 66/65/65, Bomber 15/16/20, Heavy Bomber 32/35/37, Wraith 81/77/72.
## The Brood: contained, scary, rarely winning (built)
Full spec: the Claude doc [Driftgate: The Brood](https://claude.ai/artifact/3gHjQB1NpmToqsxUEnLpja).

### The idea
The Brood is the galaxy's shared threat: an alien growth the three factions must keep contained. It can still win a galaxy, by the same 7-system hold as anyone, but the target is about 1 galaxy in 10 with real pilots fighting, down from about 1 in 4 today.

- **Scary.** Fighting in Bloom space wears you down a little at a time, and the Brood hunts anything that's bleeding.
- **Contained.** Its spread is visible in stages, each a chance to stop it, and the factions drop their rivalries to fight it when it grows.
- **Truce ground.** In any system the Brood holds, the factions can't harm each other.
- **An ecology, not just an enemy.** The Brood concentrates the ore it eats, so burning it back pays miners, haulers and scouts as well as fighters.

The Unbound stay out of all of it: they avoid Bloom space, and the Brood leaves them alone.

### Fear
| Mechanic | What it does | Counter |
|---|---|---|
| Bloom haze | In Brood-held systems, shields recharge 15% slower and radar range drops by a quarter | Fight short, leave to recharge |
| Latching spores | Each Brood hit leaves a spore that nibbles 0.5 hull a second for 4 s, stacking to 3 | Break off; docking or leaving clears them |
| Blood scent | Brood wings turn toward the most damaged ship and fresh wrecks | Pull damaged wingmen out early |

These stack with what the Brood already has: hulls 50% tougher that regrow out of combat, shields 40% weaker (kinetics beat lasers), and swarms that strip wrecks.

### Spread and containment
The Bloom spreads one system at a time through three visible stages:
1. **Seeded:** a Seeder drifts toward a system next to Bloom space; the map marks its target and arrival time. Kill it and the spread stops.
2. **Rooting:** the Seeder plants a young Bloom Node, fragile for 3 minutes, with a countdown on the map.
3. **Infested:** the node roots, the system belongs to the Bloom and becomes a truce zone.

Containment orders in every faction's Missions tab: kill a Seeder 600 cr, burn a rooting node 900 cr, burn an infested node 1,500 cr, spot a Seeder before it plants 250 cr (scouts).

**The Containment Accord:** once the Brood holds 5 systems, all three factions stop fighting each other everywhere until it's back below 4, and their strike groups and capitals turn on the Bloom.

### Truce zones
Every Brood-held system, The Bloom included: rival factions' shots, missiles and torpedoes pass harmlessly through each other, AI and capitals ignore rivals, and players can lock only Brood targets. A HUD banner reads "Truce zone: only the Brood is a target" and the map hatches truce systems. The truce outlasts the last node by 30 s. No depots or claims start in a truce zone. Pilots of every faction can work the same feeding ground side by side.

### Ecology
- **The gut.** Ore the Brood grazes goes into the nearest Bloom Node's store, shown on its target panel.
- **The feast after the fire.** A burned node's gut spills as dense, rich rock where it stood.
- **Every role:** miners work feeding grounds under the truce; haulers run containment supply to border depots at a front-line bonus; scouts spot Seeders and find feeding grounds; fighters take containment bounties, the Hive Ship, Prowlers and Grazers, whose bellies spill real ore.
- The Brood never turns one ore into another, so the closed economy stays exact.

### The Brood and the Unbound
AI Unbound never enter or route through Brood-held systems. The Brood never targets Scrapheart Haven or Unbound Lairs (today it can attack the haven; that's removed). Unbound pilots can fly into Bloom space, but nothing there is for them.

### Winning rarely
- **The "hungrier next galaxy" bonus is removed.** A Brood win no longer strengthens the next galaxy's Brood.
- **A Brood victory is a total loss:** no pilot earns a Legend point, not even the half point for serving a losing faction.
- **Slower growth**, starting values to tune:

| Setting | Controls | Now | Proposed start |
|---|---|---|---|
| `brBuild` | Time between Seeder launches (higher is slower) | 0.8 | 1.0 |
| `brOff` | Time between Brood offensives (higher is slower) | 0.8 | 0.95 |
| `brHive` | Ore the Bloom Heart mines per tick | 6.5 | 5.5 |
| `brGraze` | Rock the swarms strip from nearby systems | 1.7 | 1.3 |
| `brLevT` | Seconds before the Brood can grow capital ships | 1,800 | 2,400 |

### Build stages
1. Balance and boundaries: remove the "hungrier" bonus, retune the growth settings by simulation, the Brood and the Unbound ignore each other.
2. Truce zones and the Containment Accord.
3. Spread stages, containment orders, guts and the feast, feeding grounds, Grazer bellies, scout spotting, supply orders.
4. Fear: haze, spores and blood scent, tuned small.

### As built
- **Stage 1:** the "hungrier next galaxy" bonus is gone; a Brood win earns no pilot a Legend point, not even the half point; the Brood and the Unbound are not hostile and don't plan offensives on each other's outposts. AI pirate routes still pass through Bloom space.
- **Stage 2:** truce zones in every Brood-held system and for 30 s after the last node burns (live combat only: the strategic layer keeps its own rules), a HUD banner, no building. Map hatching is not built. The Containment Accord reuses the coalition: at 5 Brood systems all three factions join it, until the Bloom is below 4.
- **Stage 3:** containment orders pay as bounties: 600 cr for a Seeder (shared by damage), 900 cr for a Bloom Node burned in its first 3 minutes, 1,500 cr after, to every pilot who hit the node in its last minute, multiplayer guests included.
  - **The map** rings an inbound Seeder's target with its countdown ("SEEDER 1:14"), shows "ROOTING 2:19" over a young node, hatches every truce system and marks feeding grounds ("◆ FEED 320 t") once a scout has flown through or the system is covered.
  - **Guts and the feast:** what the swarms graze is split: half to Brood stores, a quarter into the nearest Bloom Node's gut (up to 240 t, shown on its target panel), a quarter piled as a feeding ground of rich rock in the nearest Brood-held system (up to 600 t; Aurorite and Vantium never leave their fields). A burned node spills its gut as one to five big rocks where it stood. Every ton moves; none is made.
  - **Grazer bellies:** Brood miners fly with 14–36 t of ore from Brood stores; it goes home if they leave and spills as salvage if they're shot down. The target panel shows the belly.
  - **Scouts:** holding a lock on a Seeder for 3 s inside 5 km, before it plants, pays 250 cr once per Seeder. Flying a scout through Brood space reports its feeding ground to every pilot's map.
  - **Containment supply:** each faction posts one order at a time for torpedoes, missiles or plate at a station bordering Brood space, paid at about 2.5× value and delivered in person, listed with the blockade runs.
- **Growth settings (tuned by simulation, 240 AI-only galaxies):** `brBuild` 1.65, `brOff` 1.42, `brHive` 4, `brGraze` 1.0, `brLevT` 3,300, `antiBrood` 2.8. Result: Brood 12.1%, Varkesh 32.5%, Ostrova 28.3%, Halcyon 27.1%, median length 113 minutes.
  - Why they moved this far: with the Brood and the Unbound ignoring each other the pirates stopped wearing the Brood down, and at the old settings it won 69% (27% with that one change undone; the Accord on or off made little difference). The gut and feeding-ground split alone brought it to 50%; the proposed starting values to 29%.
- **Stage 4:** Bloom haze (shields recharge 15% slower, radar 25% shorter), latching spores (0.5 hull a second for 4 s per Brood hull hit, at most 3, never below 1 hull, cleared by docking), blood scent (Brood wings weight their targets by damage).
- **The six anti-Brood variants** are built (see Ship upgrade choices).

### Balance rules (must hold when built)
- AI-only simulation puts the Brood at 12–15% with each faction near 28–30%; real pilots should then pull it to about 10%.
- Median galaxy length doesn't grow.
- The closed economy balances to the unit.

## Playing as the Unbound (built)
Full spec: the Claude doc [Driftgate: Playing as the Unbound](https://claude.ai/artifact/SoHpuwfLLe9Myivh9JTkBc).

### The idea
A pilot, or a crew of friends, flies for the pirates. They never race for the 7-system win; they get rich and infamous off the three powers who do, while the faction race runs on, AI-driven. The core loop: the Raider finds a mark, the crew strips its shields and jams it, the hook takes its cargo, and the loot is fenced or poured into Scrapheart Haven.

- **Take, don't kill.** A jammed ship gives up its whole hold; a destroyed one spills half. Takes earn more Infamy and less heat.
- **Heat is the clock.** Every faction you hit remembers it, and its response escalates until you lie low.
- **Pirates don't work.** No mining, hauling or scouting hulls.
- **Earned, not chosen.** Unlocked only after a callsign has earned a Legend point flying for a faction.

### Setup
A fourth start card, locked until the callsign has 1 Legend point. Solo starts docked at Scrapheart Haven in The Wrack. Multiplayer: the host creates an Unbound crew galaxy and every pilot needs their own Legend point; no mixed galaxies, so no player-versus-player. The crew shares the haven, its upgrades and fleet; Infamy, heat, Deeds and Legend points stay per pilot.

### Hulls
| Hull | Role | Price | Hull | Shield | Top speed | Turn | Hold | Special |
|---|---|---|---|---|---|---|---|---|
| Raider | light, eyes | free | 85 | ×0.85 | ×1.25 | 2.95 | 40 t | Scout-range radar, spots landed ships at 1.6 km |
| Corsair | medium, muscle | 2,600 cr | 120 | ×1.0 | ×1.10 | 2.50 | 70 t | Best jammer output |
| Plunderer | heavy, hold | 5,000 cr | 180 | ×1.25 | ×0.86 | 1.55 | 110 t | Jamming torpedoes, the only way to disable a capital |

About 85% of the matching fighter's turn and acceleration (the Plunderer 80%), no swarm pods, laden penalty at half strength. Sold at the haven's black market about 10% dearer than the nearest faction hull.

### Weapons and jamming
Keys stay the same: 1 kinetic (15% harder on hull), 2 lasers (25% stronger against shields), 3 not fitted, 4 jam mode (guns fire jammers, missiles become shock harpoons; never kills). Unbound missiles hit shields 25% harder.

- **Shields first.** A jammer hit on a shielded ship does nothing.
- The **Jam bar** appears with the first hit on an unshielded ship; it fills at the rate guns would deal damage and its size equals the target's full hull.
- Jam hits keep shields down. Stop for 1.5 s and the bar drains 10% a second.
- **One disable per ship**, then 60 s hardened.
- **Shock harpoon:** fills 35% of the bar and stretches the hook's reach from 150 m to 400 m.
- **Jamming torpedo** (Plunderer): 2 in the magazine, 40 s reload; a third of an escort's bar, a sixth of a carrier's, disables anything smaller outright.

### The take
Jam the mark dark, fly within 150 m, hold E to run the cargo hook (8 t/s) for the window: fighters 5 s, miners and light haulers 10 s, medium and heavy haulers 12 s. Two hooks double the rate. Then let them go (mercy take, half heat) or finish it (five times the kill's heat). Taken goods are flagged stolen until fenced or laundered. Freighters call distress when their bar appears; AI pilots raise shields once it drains.

Being jammed runs in stages from edge flicker to a total blackout at 100%. Keeping shields up is the faction pilot's defence. AI pirates take only from the hold, never fitted parts or the vault.

### Capital takes
Strip the capital's shields (1,800 escort, 2,400 carrier), jam its turrets one at a time (offline about 15 s, then hardened 60 s), and land Plunderer torpedoes through the gap. A full jam takes the ship offline for about 20 s (escort) or 15 s (carrier) while hooks pull from its material store. Its launched wing keeps fighting.

### Heat
Per faction, 0–100: Cool (ignored, transponder works), Warm 25 (scanned on sight), Hot 50 (hunter wings, aces interested), Wanted 75 (Freeports refuse you, gates take 10 s to charge). Mercy take +2, take +4, kill a freighter or miner +8, kill an escort or patrol +3, jam a capital turret +2, capital take +15, caught under false colours +10; double in home space. Cools about 1 a minute, 2 in quiet systems; Freeport fixers sell 1 point for about 150 cr once a visit.

### False transponder
`K` toggles it. While Cool with a faction, its ships and stations see a neutral trader. Patrol scans within 1.5 km catch you at about 5%, +2% per 10 t of stolen goods, +10% at heat 15–24. Blown cover: +10 heat, instant hostility, transponder dead for 5 minutes. Any shot blows it with everyone in sight.

### Raiding faction space
Player crews can enter core and frontier systems (AI Unbound never do). Loud entry sounds the alarm at once; a quiet entry under cover lasts until the first shot. Lockdown: response wings at 45 s (3) and 2 min 15 s (5, Heavy Fighter-led), an ace at 3 min 45 s, then a wing every 90 s. Targets: freight lanes, supply convoys, vault heists with Plunderer torpedoes. Takes in home space earn double Infamy.

### Scrapheart Haven
Nine works fed with real goods and shares (credits): the Rusty Tankard (marks), Fence's Den (fence at 70/80/90%, laundering), Powder Magazine (jammers +10%, harpoon reload, 3 torpedoes), Chop Shop (hook 10 then 12 t/s, cheaper hulls), Crow's Nest (intel), Forger's Shack (scan chance −25%, faster cooling, shorter burnout), Grog Still (bigger, braver AI wings), Trophy Wall (+5% Infamy per downed ace), Graving Dock (faster capitals, call a sloop, call the destroyer). About 40 t and 1,500 shares at level 1 to 160 t and 6,000 at level 3. A battered haven loses a level; one upgrade carries into a pilot's next Unbound galaxy.

### Lairs, fleet, Infamy
- **Lairs:** a Rigger builds one into a large asteroid in contested, hub, deep or quiet space (1 Depot Frame + 20 plate). Stash 200 t, repairs only, hidden until a scout pings it. One per pilot, one per system.
- **Fleet:** the AI capitals become the Corsair Sloop (replaces the escort) and the Destroyer (replaces the carrier: capital guns, two boarding pinnaces, no wing), with named rotations. Pilots call a sloop from Graving Dock 2; no Unbound capital enters faction home space.
- **Infamy and Legend points:** ranks Nuisance, Cutthroat 200, Buccaneer 600, Dread Captain 1,500, Pirate King 3,000. One Legend point, never half, for a rank above Nuisance plus at least one Deed (Heist, Capital take, Ace-breaker, Clean sweep, Three for three, The long con).

### AI Unbound in faction galaxies
AI wings fly the three Unbound hulls with the same jamming rules, go after haulers, miners and full holds first, and feed what they take into Unbound stores, so a faction that lets its haulers be robbed pays for the Drowned Crown.

### Build stages
1. Jamming arrives in faction galaxies: the three hulls, jammers, the Jam bar, jammed-player effects, AI takes, capital names.
2. Unbound mode core, solo first.
3. Raids and lockdown, capital takes, the haven works, fleet call-ins, Lairs, crew multiplayer.

### As built (stage 1, jamming in faction galaxies)
- **The three hulls** fly for the AI Unbound, built off the fighter frames and models: Raider (scout radar, 40 t), Corsair (jammer output ×1.3, 70 t), Plunderer (110 t). Every pirate fighter spawn uses them.
- **Jammers:** an AI pirate switches to jammers once its mark's shields are down and keeps firing in jam mode. The Jam bar, drain, disable windows (5, 10, 12 s) and 60 s hardening follow the design. Jammers do no damage.
- **Takes:** pirates beside a dark ship hook its hold at 8 t/s, most valuable first, then leave with it into Unbound stores. Freighters call distress when their bar appears.
- **Being jammed:** thrust stutters and gun misfires scale with the bar, the afterburner dies above half, the screen flickers, and at a full bar every system goes offline and the radar blanks.
- **Names:** pirate escorts and carriers use the Corsair Sloop and Destroyer name rotations.
- **Anti-jam variants:** Faraday plating, Fast-reboot reactor, Snap-back emitter and Sealed hold are built. Tether cutter waits for harpoons.
- **Not built:** harpoons, jamming torpedoes, capital takes, and all of Unbound mode for pilots (stages 2 and 3). In multiplayer a guest's own jam effects don't show on their screen yet.

### As built (stage 2, Unbound mode for pilots)
- **Unlock:** a fourth start card, locked until the callsign has a Legend point. Solo starts docked at Scrapheart Haven in a Raider.
- **Haven dock:** Fence (70% of value, 80% and 90% with the Den; stolen goods marked ☠), Black market (Corsair 2,600 cr, Plunderer 5,000 cr, half back on a trade-in), Marks (Tankard rumours of faction freight with value, escorts and Set course), Wanted (heat by faction with its band, Infamy and rank, transponder state, Deeds). No faction Shipyard, Trade, Orders or Missions for the Unbound.
- **Jam mode (4):** guns fire jammers, missiles become shock harpoons (35% of the bar and a 30 s tether that stretches the hook to 400 m). Harpoons count a target with shields at 5% or less as stripped.
- **The hook:** hold E within 150 m (or tethered) of a ship jammed dark: 8 t/s into your hold, most valuable first, flagged stolen. The take ends when the window closes: a mercy take is +2 heat, a kill after a take is five times the kill's heat. Infamy 1 per 2 t.
- **Heat** per faction 0–100 with the four bands; cools 1 a minute, 2 in quiet systems; doubles in that faction's home space. Hot sends 3-ship hunter wings every 2–3 minutes; Wanted makes Freeports refuse you and its gates take 10 s.
- **False colours (K):** works only while Cool with a faction. Patrol scans every 4 s within 1.5 km (5%, +2% per 10 t stolen, +10% at heat 15–24, three times as often near a core station). Blown cover: +10 heat, transponder dead 5 minutes. Any shot blows it with every faction in sight. Freeports dock and trade only under false colours; stolen goods sell there only under cover.
- **Infamy, ranks, Deeds:** Nuisance, Cutthroat 200, Buccaneer 600, Dread Captain 1,500, Pirate King 3,000; ×2 in home space. Deeds built: Three for three, Clean sweep, Ace-breaker, The long con, Heist, Capital take. The debrief lists each Unbound pilot's rank, Infamy and Deeds; one Legend point for a rank above Nuisance plus a Deed (none if the Brood wins).
- **Freeport fixer:** about 150 cr a point, up to 10 points, once a visit.

### As built (stage 3)
- **The nine works** (Works tab at the haven): goods from your hold and vault go into Unbound stores, shares to the Unbound treasury. Costs about 40 t and 1,500 cr, 90 t and 3,500 cr, 170 t and 6,000 cr. Every level listed in the design does what it says, with these readings: Tankard 0 lists supply convoys only and hides values; Crow's Nest 2 shows masked ships within 2 km; Grog Still 2 makes Unbound wings break at one ship, not two. A haven battered dark loses a random level.
- **Mirror variants** (black market only, any Mk): Scan baffles (scans 30% less likely, −10% energy), Jammer emitters (bar fills 45% faster, −15% damage in normal fire), Long harpoons (tether reach 600 m, −25% rack). **Tether cutter** (anti-jam, stocked by factions): flares cut a harpoon line, −25% rack. AI Unbound now fire harpoons in jam mode.
- **Jamming torpedoes:** a Plunderer's missile key in jam mode; 2 in the magazine (3 with the Powder Magazine), 40 s reload. A third of an escort's jam bar, a sixth of a carrier's, drains 2% a second after 5 s; anything smaller is disabled outright.
- **Capital takes:** jam-mode gunfire on a stripped capital jams its nearest turret for 15 s (then hardened 60 s; +2 heat). A full jam darkens the capital (no turrets, launches or jump: 20 s escort, 15 s carrier) and the hook pulls from its store; +300 Infamy, +15 heat, the Capital take Deed.
- **Raids:** entering a faction's home system without cover sounds a lockdown: wings of 3 at 45 s, 5 at 2:15, the faction's ace at 3:45, then 3 every 90 s; that faction's heat doesn't cool while you stay. A jamming torpedo into its core station during a lockdown cracks the vault: up to 45 t of its stores spill as salvage (+6 heat, Heist).
- **Fleet call-ins:** Graving Dock 2 calls a Corsair Sloop to a mark (5-minute cooldown), 3 calls the Destroyer (10 minutes); never into home space. A called capital lost puts 10 heat on the caller.
- **Lairs:** comms 3 sends a Rigger (1 Depot Frame + 20 plate from haven stores, 90 s) into contested, hub, deep or quiet space with no station. Stash 200 t, repairs, heat cools at the quiet rate while docked. Hidden until a faction patrol comes within 2 km; then it is worn down (two light turrets fight back) and its stash spills when it falls. A new Lair abandons the old one.
- **Crew multiplayer:** a host can create an Unbound crew galaxy; every guest flies Unbound and needs a Legend point of their own; no mixed galaxies. The haven, works and fleet are shared; heat, Infamy, Deeds, stolen goods and the Legend point are per pilot. Guests' jam mode, false colours, hook, harpoons, jamming torpedoes, Freeport and Lair docking run on the host. Tested over a loopback link between two browsers (join, hook, take, cover, Legend points); not over the real matchmaking server, which the build sandbox can't reach.

### Balance rules (proposed; must hold when built)
- The faction win race is unchanged in AI-only simulation.
- Every haven cost comes from real goods; the closed economy balances to the unit.
- Jamming never kills and can't touch a shielded ship.

## Ship upgrade choices (built)
Full spec: the Claude doc [Driftgate: Ship Upgrade Choices](https://claude.ai/artifact/RKuLFjS9Gvxz2cHZ9azXq7).

### The idea
Today every Mk is a pure gain (a Mk V Drive gives about +64% thrust, +44% top speed and +24% turn), so upgrading is never a decision. Instead, every system becomes a fork: each variant buys a real strength with a real weakness, ideally one you feel in how the ship flies. Two pilots in the same hull should fly differently, and what you fit should depend on where you're going.

### How it works
- **Mk I–III stay vertical** on the v160 curve: combat stats gain a fraction of the old step (`MK_LV` .17 at Mk II, .29 at Mk III; the Heavy Fighter 80% of that), while engines, holds, the Blast Rig and payload reloads keep full steps. Mk IV and V are retired; their value moves into variants.
- **One variant per system**, opening at Mk II. You can own several; only one is fitted to each system.
- **General variants** cost the usual Mk materials. **Specialist variants** guard against one enemy (Unbound jammers or the Brood), cost plate and wire only and need no Mk level.
- **Swapping is free** at any Shipyard. Everything fitted goes down with the ship: 50% spills into the wreck as salvage, the rest is lost as debris. Spares in a station vault are safe.
- **Aurorite tuning** stays the one purely vertical upgrade (+6% a level, up to 2).
- **Refits stay as they are:** pure gains bought at Freeports.

| System | Mk II | Mk III |
|---|---|---|
| Drive | +16% thrust, +11% top speed, +6% turn | +32% thrust, +22% top speed, +12% turn |
| Reactor | +4% energy, +4% recharge | +7% energy, +6% recharge |
| Shield Emitter | +5% shields | +9% shields |
| Weapons | +4% damage, 2% more energy per shot | +8% damage, 3% more energy per shot |
| Armor | +4% hull, 0.9% damage reduction | +6% hull, 1.5% damage reduction |
| Blast Rig | +1 charge per launcher, +20% collector rate | +2 charges per launcher, +40% collector rate |
| Cargo Hold | +30% hold | +60% hold |
| Payload Bay | −15% reload time, +2 missiles, 7% faster lock, +3% missile damage | −30% reload time, +4 missiles, 14% faster lock, +6% missile damage |

### General variants
| System | Variant | Gain | Cost |
|---|---|---|---|
| Drive | Sprint drive | +25% top speed, longer afterburner | −20% turn |
| Drive | Vector drive | +30% turn, sharper braking | −12% top speed |
| Drive | Long-burn drive | Afterburner uses 40% less energy | −15% acceleration |
| Reactor | Surge core | +40% energy capacity | Recharge pauses after firing or boosting |
| Reactor | Steady core | +35% energy recharge | −25% energy capacity |
| Shield Emitter | Bastion | +45% shield capacity | Recharge waits 4.5 s after a hit, not 2.5 s |
| Shield Emitter | Flicker | Recharge starts after 1 s, runs twice as fast | −30% shield capacity |
| Shield Emitter | Tuned emitter | +30% against kinetic (or laser) fire | −20% against the other |
| Weapons | Heavy cannons | +40% damage per shot | −30% fire rate, slower shells |
| Weapons | Rapid fire | +45% fire rate | −25% damage, higher energy drain |
| Weapons | Long barrel | +30% range | −15% fire rate |
| Armor | Ablative plating | +40% hull | −10% speed and acceleration |
| Armor | Light frame | +10% turn and acceleration | −20% hull |
| Armor | Reactive plating | +8% damage reduction | −15% shields |
| Blast Rig | Shaped charges | On-point window 8 m instead of 5 m | At most 80% of a rock released |
| Blast Rig | Long launcher | Charges reach 450 m instead of 300 m | Charges fly 25% slower |
| Blast Rig | Survey rig | Scans last 60 s and mark every rock within 2 km | One charge fewer |
| Cargo Hold | Bulk hold | +50% capacity | Always handles as at least half laden |
| Cargo Hold | Stabilised hold | Half the laden handling penalty | −20% capacity |
| Payload Bay | Deep magazine | +50% missiles in the rack | Always flies as at least a third laden |
| Payload Bay | Quick-cycle rack | Reloads twice as fast | −40% rack size |
| Payload Bay | Smart seekers | −40% lock time | −20% missile damage |

### Specialist variants
| Against | System | Variant | Gain | Cost |
|---|---|---|---|---|
| Jammers | Armor | Faraday plating | Jam bar 50% larger | −10% hull |
| Jammers | Reactor | Fast-reboot reactor | Jam bar drains after 0.75 s at 25%/s (not 1.5 s at 10%/s) | −15% energy capacity |
| Jammers | Shield Emitter | Snap-back emitter | Shields jump back to 30% when a Jam bar first appears; once per 60 s | −20% shield capacity |
| Jammers | Cargo Hold | Sealed hold | A hooked hold gives up half, not all | −15% capacity |
| Jammers | Payload Bay | Tether cutter | Flares break shock-harpoon tethers | −25% rack size |
| Brood | Weapons (kinetic) | Shredder rounds | +35% to Brood hulls; a hit stops regrowth for 10 s | −15% to faction shields |
| Brood | Weapons (laser) | Cautery lance | +40% to Bloom Nodes and Seeders | −20% to ships |
| Brood | Payload Bay | Incendiary warheads | Missiles +50% to nodes and Seeders | −25% to ships |
| Brood | Armor | Spore-sealed plating | Spores stack to 1, not 3 | −8% hull |
| Brood | Shield Emitter | Haze-tuned emitter | Ignores Bloom haze's recharge penalty | −10% shields everywhere |
| Brood | Drive | Scent baffles | Blood scent ignores you above 25% hull | −8% top speed |

Unbound pilots get a mirror set at the haven's black market (scan baffles, jammer emitters, long harpoons), with numbers left open until simulation so they don't stack with the haven upgrades into automatic takes. Core stations stock anti-jam parts; front-line depots on the Bloom border stock anti-Brood parts.

### Knock-on changes
- Legend perks 5 and 6 become "start each galaxy with one variant fitted for free", then a second.
- Each faction's AI wings favour certain variants (Halcyon: Bastion and Flicker), so enemies can be read and countered.
- Saves convert Mk IV and V systems to Mk III plus a free variant chosen at the first Shipyard visit.

### Build stages
1. Prototype: Drive and Payload Bay variants with free swaps and loss on destruction.
2. All general variants, Mk I–III, save conversion, perk rewording.
3. Specialists, then the Unbound mirror once jamming is in the build.
4. Faction doctrines and stocking.

### As built
- **Mk I–III only.** Upgrades stop at Mk III and the Forge requirement is gone. Saves bring Mk IV and V systems back to Mk III with the parts above Mk III in the pilot's vault (the ledger doesn't move).
- **A stronger Mk curve, by choice** (stronger Mk steps rather than weaker variants): `MK_LV` 0.45 at Mk II and 0.85 at Mk III (v160 had 0.17 and 0.29), so the Mk table above is now larger for combat stats. Duels, same hull, 100 each: Mk II beats Mk I 61–68%, Mk III beats Mk I 76–86%.
- **Variants are items** (`v_<id>`, built from plate 2, coil 2 and lattice 1; specialists plate 3 and wire 3), fitted per ship in `tune.vr`. They can be fitted or swapped free at any dock with an Upgrades tab, from Mk II.
- **Losing a ship:** fitted variants go half to the crate and half to debris. Mk parts still go to the crate whole, as before; whether they should also split is open.
- **Tuned by duel** so none is a trap: Surge core +50% energy with a 0.5 s pause, Reactive plating +12% damage reduction and −10% shields, Light frame −15% hull, Long barrel −10% fire rate. Flicker (recharge after 1.5 s at ×1.6, −30% shields) and Bastion (+30% shields, 5 s wait) were then cut back as outliers (they had won 70% and 63%). Built variants against a plain ship of the same hull at Mk II, 100 duels each: all 15 win 43–56%, with Flicker 52% and Bastion 53% (62% on the Heavy Fighter); Long barrel 43% (AI pilots don't use range). Wraith guns 1.89 → 1.6.
- **Specialists built:** six anti-Brood and four anti-jam. Tether cutter waits for harpoons; the Unbound mirror set waits for Unbound mode.
- **Legend perks 5 and 6** start a system at Mk II and fit a free variant of the pilot's choice to it.
- **Blast Rig variants** (Shaped charges, Long launcher, Survey rig) replace the laser ones.
- **Faction doctrines:** AI combat wings fit their faction's variants: Halcyon Bastion or Flicker; Varkesh Ablative or Reactive plating, or Heavy cannons; Ostrova a Surge or Steady core, or Rapid fire. 30% of ships at tier 1, 50% at 2, 70% at 3. The target panel names the variant and its cost, so it can be read and countered. Stats only: nothing is built or dropped.
- **Stocking:** a faction with a station on the Bloom border keeps two of each anti-Brood part on its market; one whose convoys the Unbound have hit in the last half hour (or any faction after the first half hour) keeps two of each anti-jam part. Built from its own plate and wire.
- **Specialists fit at any Mk** (the design said so; the first build wrongly gated them at Mk II).

### Balance rules (proposed; must hold when built)
- No variant wins more than about 60% of mirror duels against the same hull with another variant at equal Mk.
- The duel tables keep their shape: no hull class jumps a tier.
- The pay ladder holds: hauling over mining over combat over beacon running.

## Blast mining (built)
Full spec: the Claude doc [Driftgate: Blast Mining](https://claude.ai/artifact/1hGfqjnu4axL6uLLAxb1LP).

### The idea
The mining laser is removed. Mining and salvage both work by blasting: survey a rock, fire charges at its fault points, crack it open and vacuum up the ore. Placement decides yield, so skill, not hours on one rock, sets a miner's income.

### The loop
1. **Survey.** Pulse a scan; for 20 s the rock's fault lines glow and its fault points are marked. Faint cracks are visible within 100 m without one.
2. **Fire charges** from up to 300 m. They fly straight at 300 m/s with a lead marker and stick where they hit; a ring on each fault point turns green while your aim would land on point.
3. **Back off and detonate.** The HUD warns until you're 120 m clear; detonating inside that takes a second press.
4. **Vacuum.** The collector pulls nuggets within 250 m in front of you. After 90 s the cloud disperses.

Controls on mining hulls (which carry no swarm launcher): `F` fires a charge, `3` detonates, `4` cancels (charges go inert and return to the magazine), hold `F` on a cloud to collect. Set charges cancel themselves if you leave the system.

### Fault points and yield
Small rocks (up to 50 units) have 2 fault points, medium (51–90) 3, large (over 90) 4. On point is within 5 m, near within 15 m. Aurorite and Vantium shrink the window to 3 m.

| Placement | Share released |
|---|---|
| Every fault point has exactly one charge on point | 90% |
| All on or near, at least one near | 70% |
| Half or more on or near | 50% |
| Mostly off point | 25% |
| Extra charges beyond the fault-point count | −10% each |

Too few charges crack the rock partly; the rest stays as a smaller rock. Unreleased ore and nuggets left when a cloud disperses go into the system's debris pool, which regrows into rock, so nothing is created or destroyed. In Wrack the Salvage Yard harvests that pool for whoever holds it.

### Salvage
Capital wrecks crack the same way. Each salvage point sits on the joint where its section meets the hull; a charge on the joint bursts that section into a cloud, scored as above. **The reactor core must be perfect:** one near or off charge sets it off, a 600 m blast that heavily damages every ship inside and destroys the whole wreck, sending its salvage to the debris pool. The HUD warning reaches 600 m while core charges are set. Smaller ships still spill crates.

### Gear
| Hull | Today | Launchers | Charges (Mk I / II / III) | Collector (Mk I / II / III) |
|---|---|---|---|---|
| Light Miner | 1 laser | 1 | 4 / 5 / 6 | 6 / 7.2 / 8.4 units/s |
| Medium Miner | 2 lasers | 2 | 6 / 8 / 10 | 9 / 10.8 / 12.6 units/s |
| Heavy Miner | 3 lasers | 3 | 10 / 13 / 16 | 12 / 14.4 / 16.8 units/s |

Charges work like missiles: the magazine refills after a 20 s countdown, and no matter is used. Launchers fire a volley per press. Only mining hulls blast or collect; haulers stay out of mining.

### Risk
- Anything within 120 m of a blast takes shield and hull damage; hitting another faction's ship counts as hostile fire.
- Clouds show on every radar in the system and anyone with a collector can take from them.
- Ships and guard drones inside a cloud show on radar only within 300 m and can't be missile-locked from outside it.
- AI Unbound turn toward fresh clouds; clouds near Bloom space draw Brood Grazers.
- Charges stick only to rocks and wrecks and can't be fired within 400 m of a station or jumpgate.

### What changes with the laser gone
The Mining Laser system becomes the Blast Rig (Mk I–III; variants in Ship upgrade choices). Legend perk 3, Miner's eye, becomes "charges reach 400 m, on-point window 2 m wider". Hull descriptions, the training lessons (crack a practice rock, crack a practice wreck), HUD and help text change. In multiplayer the host resolves where charges land, the release and the cloud. AI miners, simulated off-screen, and guard drones are unchanged. Comets get fault points too. Saves convert a Mining Laser to a Blast Rig at the same Mk, capped at III.

### Build stages
1. Rock blasting on the Light Miner; the laser removed.
2. Every mining hull, Blast Rig Mk I–III, training, HUD, perk rewording, income tuning.
3. Salvage: wreck joints and the volatile core.
4. Risk and multiplayer.

### Balance rules (must hold when built)
- At good placement each hull earns what it does today: about 12k an hour for a Light Miner, 15.5k for a Medium and 20k for a Heavy on the best field within 2 jumps.
- Mining stays below hauling on the pay ladder.
- The closed economy balances to the unit: every unit not collected reaches the debris pool.

### As built (where it differs from the design above)
- **Pacing is by the magazine**, as agreed after the pay-ladder check: each charge releases one fault-point section, and magazines are small with long reloads so a perfect hold takes about as long as the laser did. Light Miner 2 charges and a 348 s reload, Medium 3 and 408 s, Heavy 4 and 552 s; one charge every 1, 0.5 or 0.34 s. A trip model fitted to the v158 mining pay puts perfect placement at about 12k, 15.6k and 19.9k an hour, near-point charges at 8k to 12k, and off-point charges at 4k to 6k.
- **A Blast Rig Mk level adds one charge**, not one per launcher: one per launcher would have more than doubled a Heavy Miner's pay at Mk III.
- **Collector rates** are 6, 9 and 12 units a second (+20% a Mk level).
- **Scanning** happens when a rock or salvage point is targeted (fault-point rings for 20 s; faint rings within 100 m without a scan).
- **Rocks don't tumble**, so charges fly straight along the nose.
- **Clouds hide ships and drones** from radar and missile locks beyond 300 m, for their 90 s.
- **AI and clouds:** AI Unbound with nothing to shoot, and Brood Grazers in or next to Bloom space, turn toward a fresh cloud within 5 km and scoop it at 4 t/s into their hold (home with them, or salvage if shot down). A pilot near the cloud is warned. A cloud's cover slowing locks rather than blocking them is still open.
- **Multiplayer:** guests send fire, detonate and cancel to the host and collect by cloud id; untested here (no matchmaking server in the build sandbox).

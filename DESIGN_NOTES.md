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

## Capital roster: escorts and carriers, no frigates (first version built; tuning live)

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

### Wing replacements (built)
A carrier with empty bays requests replacements every 20 seconds, in this order:
1. **Ready fighters answer first.**
   - Patrol fighters of its side in a live system acknowledge, fly to the carrier and land into the wing.
   - A fighter waiting in the nearest friendly depot hangar (up to 4 jumps away) flies over.
   - Otherwise, a pilot from the faction's muster pool does.
2. **The closest builder builds one.** That's the nearest core station, or a full depot with a hangar or production level 2. It builds a basic craft (45 s) and sends it; flight time is 40 s per jump.
3. **Short of materials, it posts an Order** in the Orders tab ("for the carrier X's replacement fighters"). Pilot deliveries go into faction stores, and the build follows.

The Brood's Hive Ship regrows one craft about every 4 minutes from Brood stores (`BAL.hiveRegrow`). Craft in flight are counted in the ledger as fleets in muster.

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

# Driftgate Economy Design: Depot Shares and Market Reforms

Oct 26, 2026 · @Matt

## Summary

Four changes are planned. Two give players somewhere to spend credits, and two make faction trade and pilot risk respond to prices. None creates or destroys a credit: every flow is a transfer between the player, the three faction treasuries and the Freeport Compact.

| # | Change | What it fixes |
| --- | --- | --- |
| 1 | Patronage | Late-game credits have nothing strategic to buy |
| 2 | Hired wingmen | Wealthy pilots, traders above all, have no recurring cost |
| 4 | AI imports at market prices | Factions buy from freeports at a fixed price, and the goods teleport home |
| 6 | Hull insurance (optional) | Losing a 2,100–5,500 cr hull costs its full price, with no way to spread the risk |

Not yet decided: market-pegged rewards (3) and consumption-based targets (5). The review recommends reworking the first and cutting the second.

Out of scope: faction upkeep (it snowballs a losing faction), war bonds, depot shares (an investment pays credits back instead of sinking them) and any change to the Hollow Relay toll.

Numbers below are starting points for tuning. Where a number is my estimate rather than read from the code, it says so.

## 1. Patronage

A pilot pledges credits toward their faction's next build, and the faction spends them right away on the imports that build is short of. Nothing comes back as credits. The return is a faster build, the right to name it, and standing with the faction.

### How it works

- **Where.** A new Station → Patronage tab at your faction's core station.
- **Projects.** The faction's next capital step (shipyard, then carrier, as capNeed already decides), escorts it is short of, and any depot it is planning. The tab shows each project, the goods still missing, and what they cost at the nearest freeport.
- **Pledging.** Any amount from 500 cr. The credits go to the treasury, earmarked for that project.
- **Spending.** Each strategic tick, the faction uses earmarked credits first to buy the project's missing goods from freeports at market price, shipped home by convoy as in section 4. If no freeport stocks a missing good, the pledge waits until one does.
- **Leftovers.** Earmarked credits can't be spent on anything else. If the project finishes or is cancelled, the remainder rolls to the faction's next project. No refunds.

### What a project costs

At base value, before market markups:

| Project | Goods at base value |
| --- | --- |
| Carrier | 16,000 cr, plus 3 Compact Seals (1,200 cr) |
| Shipyard | 11,300 cr, plus 2 Compact Seals (800 cr) |
| Escort | 4,000 cr, plus 1 Compact Seal (400 cr) |
| Depot | 1,400 cr in Depot Frames |

A 5,000 cr pledge buys roughly a third of a carrier's missing goods, which is enough to be felt.

### Rewards

- **Naming.** The top patron of a carrier or escort names it, in place of a name drawn from the built-in list, and the launch is credited to them in the feed.
- **Standing.** Pledges count toward the faction's war effort, like delivered goods. Pledges to the faction holding the least territory count 1.5×, so backing the underdog is rewarded.
- **Open question.** Whether a top patron should also get first call on the capital (for example, it joins their operations first) depends on how far you want players steering AI capitals.

### Why it is a sink and stays conserved

Credits move from the pilot to the treasury, then to the Compact when the faction buys imports. The Compact pays them back out to players and merchants who supply the freeports. No credit is created, and the pilot gets none back.

### Limits and abuse

- **No cap needed on pledges.** A pledge only buys what a project is missing, limited by freeport stock, so a rich pilot can speed up a build but can't buy power beyond it.
- **Unbound play.** Not available; the haven's works already serve as the Unbound sink.
- **Multiplayer.** Pledges are recorded per pilot (P.pledges) so the top patron of each project is clear.

## 2. Hired wingmen

A pilot pays their faction by the half hour for an AI wingman who flies escort on them. It is a recurring cost that scales with how much protection a pilot wants, aimed at traders, the game's biggest earners.

### How it works

- **Where.** A Hire panel on the Ship tab at your faction's core station or depots.
- **Contract.** 30 minutes of game time, paid up front to the faction treasury, renewable at any friendly dock. One wingman at a time.
- **Behaviour.** The wingman falls in beside you whenever you are in space, in every system you enter, and flies the same escort order the Unbound captain already uses (captainTick). It despawns while you are docked.
- **Ship and kit.** It spawns like a faction patrol, drawing its loadout from the faction's fleet and warehouse stock at the faction's current tier, and returns it when it despawns. Nothing is created.
- **Losses.** If it dies, its kit spills as salvage like any ship and a replacement arrives after 4 minutes, as the Unbound captain does. The contract clock keeps running.
- **Bounties.** Bounties count only your own damage, as they do today, so a wingman's kills don't pay its wage.

### Wages

| Wingman | Per 30 min | Per hour |
| --- | --- | --- |
| Interceptor | 600 cr | 1,200 cr |
| Striker | 1,000 cr | 2,000 cr |
| Heavy | 1,600 cr | 3,200 cr |

A trader earning 15–25k an hour who keeps a Heavy on their wing spends 13–21% of earnings, inside the 10–25% target.

### Limits

- **Faction stock.** If the warehouse can't kit the hull, that class isn't for hire. This hits a losing faction's pilots hardest; if testing shows it, add Compact mercenaries at freeports, kitted from the freeport store.
- **Unbound play.** Not available; the Rusty Tankard captain already covers it.
- **Capitals.** Not while you command a capital ship, which has its own wing.
- **Multiplayer.** Contracts are per pilot (P.hire); the host spawns each wingman in its pilot's system.

## 3. Market-pegged rewards

Contract pay should be the destination's market price plus a premium for the trip, locked when the contract posts. Today every contract pays a fixed multiple of base value, so a contract to a station that is drowning in plate pays the same as one to a station that has none.

### Today and proposed

| Contract | Pays today (× base value) | Proposed premium over destination price |
| --- | --- | --- |
| Blockade run | 3.6–4.6 | +120% |
| Freeport request | 2.6–3.4 | +60% |
| Containment supply | 2.2–2.8 | +40% |
| Carrier order | 1.8 | +10%; carrier resupply already pays warehouse price × a front-line bonus, so this changes little |

The premiums are first guesses. Calibrate them so a test galaxy's average contract pay matches today's, then let the market move individual contracts up or down.

### Rules

- **Locked quote.** The per-unit price is fixed at posting and shown on the job ("priced at 34 cr a unit when posted"). The pilot carries no price risk during the trip.
- **Guard rails.** Per-unit pay stays between 1.5× and 5× base value, so a freak price spike or glut can't produce an absurd job.
- **Purchased goods.** Blockade and containment runs already accept bought goods, and freeport requests already refuse only goods bought at that freeport. Carrier orders and drives still refuse all bought goods; apply the freeport rule to carrier orders too.
- **Faction drives stay as they are.** Mining and haul drives (1.15–1.35× base) deliver into the faction's own warehouse and work as campaigns, not markets.

### Code touch points

- fpContracts, blkContracts, contContracts, carOrder and the 1.7× supply contract compute reward from baseValue; switch each to stPrice of the destination station.
- Per-station purchase tracking already exists (P.fpBought\[sector\]\[item\]), so no new tracking is needed.

## 4. AI imports at market prices

When a faction imports from a freeport it should pay that freeport's market price, move that price, and ship the goods home on a raidable convoy. Today it pays a fixed price, the freeport's price doesn't react, and the goods appear in the warehouse instantly.

### How imports work today

In factionIndustry, once 120 s have passed, a faction short of a good buys from whichever freeport holds the most of it:

| Good | Buys when stock is below | Units per tick | Price paid (× base) |
| --- | --- | --- | --- |
| Ferrite, Cuprite | 60 | 8 (Halcyon 16) | 1.1 (Halcyon 0.85) |
| Vantium | 16, or 48 while saving for a capital | 4 (Halcyon 8) | 1.6 (Halcyon 1.2) |
| Plate, Conduit (Halcyon only) | 30 | 16 | 0.85 |

It buys only if its treasury stays above 20,000 cr after paying. Halcyon's Trade Charter terms apply on 8% of ticks.

### Proposed

- **Price.** Pay the freeport's buy price (stPrice × 1.06). Halcyon's Trade Charter becomes a 20% discount on that price instead of a separate fixed price.
- **Price moves.** Each purchase lowers the freeport's local supply level (mk) the way a player purchase does, so a desperate faction visibly drives freeport prices up.
- **Source.** Pick the freeport with the lowest price after a per-jump cost, not the one with the most stock.
- **Shipping.** Send the goods home with haulSend instead of adding them to the warehouse. The convoy can be raided or escorted like any other.
- **Unchanged.** Thresholds, lot sizes and the 20,000 cr floor stay. Unbound imports (fixed 1.4–1.5× base) can follow the same rule later.

### Why it matters

A faction's shortage becomes visible and actionable: freeport prices rise, convoys appear on the raid board, and a player can profit by supplying the freeport or by raiding the convoy.

## 5. Consumption-based stock targets

A station's price should compare its stock with how fast it is using the good, not with a fixed number. Then a faction gearing up for war pays more for coil before its shelves run dry, and prices warn instead of just reporting.

### Today

The price formula is base value × ((target + D) / (stock + D))^0.45, clamped to 0.5–2.8×, where D is a small market-depth term. The target is fixed per good:

| Good | Target stock |
| --- | --- |
| Raw ores | 300 |
| Plate, Conduit | 90 |
| Flux Coil | 40 |
| Compact Seal | 6 |
| Everything else | 16 |

Depots and freeports use the same targets scaled down (25% and 33%).

Each station's price is also multiplied by a local supply factor (0.55–1.9×). It moves with trade and mining, and drifts back toward a fixed make-and-use profile for that kind of station.

### Proposed

```latex
\text{target} = \max\left(\text{floor},\ \text{burn rate} \times \text{cover}\right)
```

- **Burn rate.** A smoothed average of units the station uses per strategic tick: crafting inputs, fleet loadouts, life support, depot and carrier shipments out. Smoothing half-life about 3 minutes, so one big build doesn't whipsaw prices.
- **Cover.** Set per good so that at peacetime burn the target equals today's fixed number. Today's balance is the starting point, and only deviations from normal use move prices.
- **Floor.** Half of today's target, so an idle station doesn't price a good as worthless.
- **Rate limit.** The target moves at most 10% per tick.

### Risk

Wider wartime price gaps draw AI merchants. The code notes that merchants once sold warehouses thin and the Brood won twice as often. Add a guard: merchants don't buy from a faction station whose stock is below its target.

## 6. Hull insurance

Insurance is optional. A pilot who wants it pays a premium at a shipyard for 30 minutes of cover; if the hull is destroyed in that time, the faction issues a voucher for 70% of its price toward the same hull class. Premiums go to the faction treasury and payouts come from it, so credits stay conserved.

### What a loss costs today

When a bought hull dies, the pilot relaunches in the role's starter hull and must buy the hull again (2,100–5,500 cr). Cargo and fitted upgrades go into a wreck crate that can be scooped for 7 minutes. Only the hull price is lost outright, so insurance covers only that.

### Policy terms

| Term | Value | Why |
| --- | --- | --- |
| Cover period | 30 min, renewable at any shipyard | Short enough that the price tracks recent behaviour |
| Payout | Voucher for 70% of hull price, toward the same class | A voucher can't be cashed, so dying never beats the 50% trade-in |
| Base premium | 12% of hull price per period | Fair is 7% at one loss every 5 hours; the 5-point margin makes cover a net sink |
| Loss loading | +50% per loss in the last 3 hours, up to 3× | Prices risk from your own record |
| Starts | On undock after purchase | No buying cover mid-fight |
| Not covered | Starter hulls, Unbound hulls, upgrades, cargo | Starters are free; the rest is salvageable |

### Example

A 4,400 cr hull costs 528 cr per 30 minutes with a clean record, and 792 cr after one loss in the last 3 hours. A loss returns a 3,080 cr voucher toward a new hull of that class, so losing it costs 1,320 cr plus premiums instead of 4,400.

### Why it is safe

- **No profit from dying.** The voucher covers 70% of the same class and can't be turned into cash, so a loss always costs at least 30%.
- **Adverse selection is priced in.** Pilots who buy cover only before risky sorties pay more per minute of risk, and the loss loading raises the price for those who die often.
- **Treasury impact is small.** A faction's 250,000 cr treasury can absorb many payouts; if a treasury can't pay in full, it pays what it has and the feed says so.

## Interactions, risks and test plan

The changes reinforce each other. Patronage hands a faction credits it spends on imports at market prices (4), which raises freeport prices and freeport request pay, which sends players to supply the freeports. If adopted, pegged rewards (3) and consumption-based targets (5) sharpen that chain.

### Risks

- **Treasury drain.** Insurance vouchers and, if adopted, higher war-time contract pay come out of faction treasuries, while patronage and wingman wages flow in. If player extraction pushes a treasury toward the 20,000 cr import floor, the weaker faction stops importing, which is the snowball this design avoids. Watch treasury minimums in testing before adding any guard.
- **Stacked war pricing.** A blockade run to a starved station gets a high market price and a +120% premium. The 5× base value ceiling caps it.
- **Merchant drain.** Covered in section 5: merchants don't buy below a station's target.
- **Save compatibility.** New fields (P.pledges, P.hire, P.policy, burn rates) default to empty on old saves. None move matter or credits, so the conservation audit is unaffected.

### Build order

1. AI imports at market prices: self-contained in factionIndustry, counting goods already in transit.
2. Hull insurance: one shipyard panel and a hook in playerDeath.
3. Patronage: a tab at core stations, pledges that buy imports, naming and call priority.
4. Hired wingmen: a hire panel reusing the escort order the Unbound captain already flies.
5. Pegged rewards and consumption-based targets, only if approved.

### What to measure

Run several galaxies before and after each step, same seeds where possible.

| Metric | Today's reference | Acceptable change |
| --- | --- | --- |
| Brood win rate | Current baseline | No increase |
| Time to each faction's first carrier | Current baseline | Within ±10% |
| Lowest faction treasury | 250,000 cr start | Stays above 60,000 cr |
| Player income, active play | 3–8k cr an hour combat, 15–25k trade | Within the same band |
| Credits spent on patronage and wingmen | 0 | 10–25% of player earnings |
| Conservation audit | Balanced | Balanced |

## Review and feedback

This review covers the first draft. Depot shares have since been replaced by patronage and hired wingmen, and insurance now follows the review's fixes. Section numbers below refer to that draft.

Build AI imports (3) as written. Rework depot shares, pegged rewards and insurance before building them, and cut consumption-based targets. The biggest problem is that the losing faction pays for most of the new flows, which recreates the snowball the upkeep idea was dropped for.

This review checked each claim against the game code. Factual errors it found are already corrected in the sections above.

### Verdict by change

| Change | Verdict | Main issue |
| --- | --- | --- |
| 3. AI imports at market prices | Build first | Must count goods already in transit |
| 2. Market-pegged rewards | Rework | Besieged stations hit the 5× cap routinely, paid by the loser |
| 5. Hull insurance | Rework | Dying sells the hull for more than trade-in |
| 1. Depot shares | Rework | Pays back in one hour, and the quote can be gamed |
| 4. Consumption-based targets | Cut | The local supply factor already does this job |

### Problems, worst first

1. **Shares pay back in an hour.** A price of 60 minutes of dividend is a 100% return every hour, forever. A galaxy lasts about 2 hours, so a stake must pay back inside it, but income has to stay modest. Fix: pay 1–2% of mined-ore value per stake and price it at about 90 minutes of expected dividend.
2. **The share quote can be gamed.** Buying at the threat-halved price and selling once the threat passes returns 60% at once. In multiplayer, a friend in another faction can park a capital ship to trigger it. A depot also mines nothing while a pilot is present, so camping it drags the trailing quote down. Fix: quote from the mining formula, not realised output; drop the threat discount; buy back at the lower of purchase price and 80% of the quote.
3. **Dividends on parts double-count.** Plate is made from ore already counted as output, and selling ferrite into a depot creates output on demand. Fix: pay on mined ore only.
4. **Contracts can be farmed within one faction.** Buy plate at a faction depot, deliver it to that faction's contract, and collect market price plus a premium from the treasury that sold it. Fix: goods bought from the issuing faction, anywhere, don't count.
5. **Pegging inflates the loser's costs.** Besieged stores are low on stock, so market price × 2.2 routinely hits the 5× ceiling, against 3.6–4.6× today. A player can also empty a freeport shelf to trigger a request near 5×. Fix: peg to a 10-minute average of the faction warehouse price, cap at today's maximum, and compute the premium on base value.
6. **Imports over-order.** Stock stays below the threshold while freight is in flight, so the faction re-buys every tick. Fix: count goods en route, as the seal purchases already do, and allow one shipment per good in flight.
7. **Insurance turns death into a sale.** A 70% payout less a 9% premium nets 61%, above the 50% trade-in, and upgrades are still scooped from the wreck. A pilot dying every 61 minutes dodges the one-hour loss loading. Fix: pay out as a voucher toward the same hull class, and rate losses over 3 hours.
8. **The losing faction pays.** Dividends, higher blockade pay, insurance payouts and market-price imports all come from treasuries, and the loser's is under the most strain. Share holders also earn nothing while defending in the system, which undercuts the anti-snowball argument. Fix: simulate treasury drain per faction before shipping 1, 2 or 5.
9. **Section 4 duplicates existing code.** Prices already include a local supply factor that drifts toward each station's make-and-use profile. Fix: add a war term to that profile instead of a new target system.

### Keep

- AI imports at market price, shipped by convoy. It follows the seal-purchase precedent and conserves money and goods.
- Locked per-unit contract quotes and the 1.5×–5× clamp.
- The 4-stake cap per depot, and voiding stakes when a depot is razed.
- Dividends on output rather than fees, so shares work in single player.
- Insurance's fair-premium arithmetic and the conservation and Brood win-rate metrics.

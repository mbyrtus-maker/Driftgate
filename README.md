# Driftgate

A 3D space game you play in the browser: three rival factions and an alien Brood fight over fifteen star systems in a closed economy where every plate, coil and crystal was mined from a rock that already existed. Mine, haul, trade, upgrade your ship, claim outposts, and fly with up to three friends.

**Play:** https://mbyrtus-maker.github.io/Driftgate/

## Playing with friends

1. One of you opens the link above, types a callsign, and presses **Create a galaxy for friends**. That makes a galaxy code (like `amber-falcon-42`) and an **invite link**: copy it and send it to your friends, then press **Launch**.
2. Friends open the invite link, choose a callsign, faction and ship, and press **Launch**. (Or they open the game normally and type the code into "enter a friend's code".)
3. Pick the same faction to start in the same system. Each pilot's callsign floats over their ship. Need the link again later? Press **Invite** in flight, or **Copy invite link** when docked.

- **Drop in and out.** Your ship, cargo and position are saved. Come back with the same browser and you pick up where you left off.
- **Anyone can host.** Every pilot's browser keeps the latest save, so whoever opens the galaxy first next time hosts it. If the host leaves mid-game, another pilot takes over within a few seconds.
- **Frozen while empty.** When nobody is online, nothing happens in the galaxy.
- **Chat:** press **Enter** in flight.
- **Quit:** the **Quit** button (top right, press twice) or **Save & quit** when docked saves your pilot and returns you to the title screen. If you were hosting, another pilot takes over within a few seconds.
- Up to four pilots per galaxy. Capital shipyards and frigates are single-player only for now.

### If friends can't connect

Pilots connect to each other directly, browser to browser. A free public matchmaking server ([PeerJS](https://peerjs.com/)) only introduces the browsers to each other; no game data goes through it. Most home networks work. Some strict networks (corporate Wi-Fi, some mobile hotspots) block direct connections; PeerJS's public relay is tried as a fallback, but it can be busy. Try a different network if a friend can't join.

Your pilot is tied to your browser. Playing from a different browser or computer creates a new pilot.

## Controls

Mouse steers (offset from centre) · **W** thrust · **S** brake · **A/D** roll · **Shift** afterburner · click or **Space** fires · **1/2** kinetic or laser · **T/Q** target hostiles · **C** missile when locked · **B** flares · **F** mines · **E** docks · **V** camera · **M** map · **H** full manual

## How it's built

One self-contained HTML file: a small WebGL renderer, the game simulation, and the multiplayer layer (WebRTC data channels). The host's browser runs the authoritative simulation for every system a pilot is in. Each other pilot flies their own ship locally and sends its position and trigger state 20 times a second; the host streams back their system 15 times a second.

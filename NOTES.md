# Iron Dominion: handover notes

Design doc ("Iron Dominion: design workings"): https://claude.ai/artifact/3ooFem8pxQZZeWWfDHQo94

## Kris's decisions (20 Nov 2026)
- Keep the name Iron Dominion. Own repo (this one). A 500-point Skirmish version may later port into the Grand Tabletop Compendium.
- First armies: Ironclad Covenant and Rust Tide. Squad models on a grid.
- He loves the dice: keep rolling hands-on (roll, sweep misses, tap re-rolls, defender rolls saves). Quick dice is an option, not the default.
- IP: everything original. Never use Games Workshop names (Space Marines, Chapters by name, Orks, bolters, Stratagems as a term), datasheets, lore or art.

## Current state: v0.1.0 Stage 1 "First blood" (20 Nov 2026)
- Files: src/data.js (WEAPONS, UNITS, ARMIES, OBJECTIVES, TERRAIN; board 15x21 squares, 1 square = 2"), src/engine.js (state G, grid helpers, formation(), LOS, cover, objective control, scoring 5/5/5, wound table, saves with ward, resolveAttack() which routes every roll through Tray.step, AI object), src/battle.js (Tray: the dice tray; Battle: turn loop, human input, rendering), src/shell.js (Settings, Sfx, Shell menus, saves, review form, Ko-fi), src/page.html (CSS + template), build.py.
- Rules: Command (+1 CP each, battle-shock for units below half), Movement (move/advance/hold/fall back; formation fill around an anchor), Shooting (per-model range + LOS; rapid, torrent, heavy, twin, melta, assault), Charge (2D6 vs distance-2", Shock Assault re-roll, Fury of the Tide +1), Fight (chargers first, then alternate). Round 1 no scoring; game ends after round 5 or a wipe.
- Re-rolls in the tray: re-roll 1s (Lead from the Front aura), re-roll fails (twin), Oath of Iron (once per unit per battle), command re-roll (1 CP, once per phase per player).
- Balance: 40 AI-v-AI games on Hard after tuning came out 19-20-1. Tweaks made: Iron Sentinel Sv3 W7 130pts, Hacker A3, Smog Gunners Sv4, Rustborn Sv5.
- Testing: in the browser set window.SPEED_MUL=0 and Tray.headless=true, override Shell.endScreen, and start Battle with two AI players.
- GitHub Pages: Kris needs to enable it (Settings > Pages > main / root). The gh API is blocked from Claude's sandbox.

## Next: Stage 2 "Muster"
Army builder (points, unit sizes, wargear swaps), sub-factions (3 per army), leaders attaching to squads, saved lists.

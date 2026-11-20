# Iron Dominion: handover notes

Design doc ("Iron Dominion: design workings"): https://claude.ai/artifact/3ooFem8pxQZZeWWfDHQo94

## Kris's decisions (20 Nov 2026)
- Keep the name Iron Dominion. Own repo (this one). A 500-point Skirmish version may later port into the Grand Tabletop Compendium.
- First armies: Ironclad Covenant and Rust Tide. Squad models on a grid.
- He loves the dice: keep rolling hands-on (roll, sweep misses, tap re-rolls, defender rolls saves). Quick dice is an option, not the default.
- IP: everything original. Never use Games Workshop names (Space Marines, Chapters by name, Orks, bolters, Stratagems as a term), datasheets, lore or art.

## v0.1.0 Stage 1 "First blood" (20 Nov 2026)
- Files: src/data.js (WEAPONS, UNITS, ARMIES, OBJECTIVES, TERRAIN; board 15x21 squares, 1 square = 2"), src/engine.js (state G, grid helpers, formation(), LOS, cover, objective control, scoring 5/5/5, wound table, saves with ward, resolveAttack() which routes every roll through Tray.step, AI object), src/battle.js (Tray: the dice tray; Battle: turn loop, human input, rendering), src/shell.js (Settings, Sfx, Shell menus, saves, review form, Ko-fi), src/page.html (CSS + template), build.py.
- Rules: Command (+1 CP each, battle-shock for units below half), Movement (move/advance/hold/fall back; formation fill around an anchor), Shooting (per-model range + LOS; rapid, torrent, heavy, twin, melta, assault), Charge (2D6 vs distance-2", Shock Assault re-roll, Fury of the Tide +1), Fight (chargers first, then alternate). Round 1 no scoring; game ends after round 5 or a wipe.
- Re-rolls in the tray: re-roll 1s (Lead from the Front aura), re-roll fails (twin), Oath of Iron (once per unit per battle), command re-roll (1 CP, once per phase per player).
- Balance: 40 AI-v-AI games on Hard after tuning came out 19-20-1. Tweaks made: Iron Sentinel Sv3 W7 130pts, Hacker A3, Smog Gunners Sv4, Rustborn Sv5.
- Testing: in the browser set window.SPEED_MUL=0 and Tray.headless=true, override Shell.endScreen, and start Battle with two AI players.
- GitHub Pages: Kris needs to enable it (Settings > Pages > main / root). The gh API is blocked from Claude's sandbox.

## v0.2.0 Stage 2 "Muster" (20 Nov 2026)
- New file src/muster.js: list entries are { k, d, s (size index), o (option choices), at (key of the unit a leader joins) }. buildModels(), starterList(), listProblems() (points, needs a Leader, max 3 per datasheet / 6 core / 2 leader, model cap per battle size), bodyguards(), randomList() (the AI's force), and the Muster screens (home list, editor, add-unit sheet, unit sheet). Lists save under idom_lists.
- Data: UNITS have sizes [{n, pts}], opts [{id, n, g (model group), f (guns/melee), ch, x2 (doubles in a full squad)}], leaders have lead {id, n, txt} and leads [...]. Wargear is free (as in the current edition of the big game). SUBS: 3 per army. POINTS: 500 Skirmish (4-row deployment, 42 models max) and 750 Clash (5 rows, 55 max).
- Engine: models carry their own profile (m.p) and ldr flag; a led unit keeps the bodyguard's T/Sv for attacks and the leader takes wounds last; when the bodyguard dies the leader becomes its own unit. atkMods() gathers every modifier (Rust Fury, lead bonuses, Fervour AP, heavy, Choking Smog). Bodge Job is a hands-on dice step ('fnp'). migrate() upgrades v0.1 saves. Deployment keeps the Stage 1 slots and falls back to scanning the zone.
- Leader bonuses: Knight-Captain +1 OC per model; Oathkeeper +1 to wound in melee; Scrapking re-roll charges; Wrenchwright +1 armour save (best 3+).
- Sub-factions: Anvil (incoming AP worsened by 1), Flame (melee -1 AP, +1 charge), Hunt (ranged re-roll hit 1s and wound 1s); Gutstompers (+1 charge, max +2), Smogchoked (-1 to hit from over 18"), Scrapheap Crew (6+ ignore wounds).
- Balance: attaching the Scrapking to a mob swung games to about 70% Rust, so the Rustborn Mob went to T4, Hackers to AP0, and the Scrapking's lead bonus became charge re-rolls. Then: starter forces 29-25-4 over 58 games; random 500-pt lists 18-14-4; random 750 6-4. Scrap Riders, Smog Gunners and Wrenchwright were made cheaper; Rust starter now costs 485.
- Testing: /tmp harness pattern: page.evaluate with Tray.headless, SPEED_MUL=0, players with list: starterList(a) or randomList(a, pts), cfg.pts.

## Next: Stage 3 "The full war"
Two more armies, fuller rosters, Gambits (our name for command tricks), secondary missions, deployment maps, bigger board for 1,000 and 2,000 points. Random-force balance is an ongoing job.

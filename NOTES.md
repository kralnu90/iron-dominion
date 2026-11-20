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
- Balance: attaching the Scrapking to a mob swung games to about 70% Rust, so the Rustborn Mob went to T4 (back to T5 in v0.3.0), Hackers to AP0, and the Scrapking's lead bonus became charge re-rolls. Then: starter forces 29-25-4 over 58 games; random 500-pt lists 18-14-4; random 750 6-4. Scrap Riders, Smog Gunners and Wrenchwright were made cheaper; Rust starter now costs 485.
- Testing: /tmp harness pattern: page.evaluate with Tray.headless, SPEED_MUL=0, players with list: starterList(a) or randomList(a, pts), cfg.pts.

## Stage 3 plan (agreed with Kris 20 Nov 2026, released in four parts)
- 3a Tactics v0.3.0 (done): Gambits, secondary missions, 3 battlefields.
- 3b v0.3.1: the Auric Concord (long-range gunline: battlesuits, gun drones, marksmen).
- 3c v0.3.2: the Chitin Brood (fast alien swarm: hunting beasts, burrowers, a hive leader).
- 3d v0.3.3: 1,000-point Strike Force on a bigger scrolling board, a four-army balance pass, 2,000 only if phones cope.
Kris may swap the two new armies for others: check before building 3b.

## v0.3.0 Stage 3a "Tactics" (20 Nov 2026)
- data.js: MAPS (hab, cross, pincer; zone 'lines' or 'corners'), setMap(id) rebuilds OBJECTIVES/TERRAIN (now let), inZone(side, x, y, pts, extra). GAMBITS (focus, rapid, ground, hold, oath [covenant], surge [rust]). MISSIONS (8 cards).
- engine.js: setPhase() resets per-phase Gambit use (G.gamb) and Focused Fire; canGamb/useGamb; AI.shootGambits/rapidGambit/surgeGambit; Go to Ground asked inside resolveAttack (choose() for humans, a rule for the AI); Hold Fast in the battle-shock step. Missions: G.sec {hand, deck, vp, done, swapped}, drawMissions at each command phase, scoreMissions at end of turn, G.kills tracks units/leaders/walkers slain this turn. G.gstat counts Gambit use (handy for tests).
- Settings has Battlefield (random or one map). The round box in the HUD opens the missions + Gambits sheet. Zones are shaded in round 1.
- Balance: a v0.2.0 control run showed the Covenant actually winning about 70% of AI-v-AI starter games (earlier small samples were lucky), so the Rustborn Mob went back to T5 (hackers stay AP0). Now starters ~38-25, random 500 6-8, random 750 5-3.

## v0.3.1 Stage 3b "The Auric Concord" (20 Nov 2026)
- Third army (col #5fd0c0): factorPrime (aura re-roll ranged wound 1s; lead -1 AP ranged), droneMarshal (lead 5+ ward), lumenWardens (T3 Sv4, seeker launcher option x2), longshots (camo: always in cover), skimDrones, aegisSuits (ion repeater / scorch emitter / lance projector), railStrider (rail lance / twin ion).
- Army rule Measured Fire: +1 to ranged hits unless the unit advanced; can shoot after falling back. Subs: fleet (half-range -1 AP), veil (cover vs attacks from over 12"), ledger (+1 OC). Gambit: overc (Overcharge: re-roll failed wounds this phase).
- ARMIES entries can use pairs [[leaderIdx, unitIdx]] and list items 'id:sizeIndex'. Play flow now asks for the enemy army (or Surprise me).
- Balance (starters): Concord v Covenant 13-19 once the Covenant starter switched to the Order of the Hunt (Anvil shut down the Concord's AP-1 guns: 6-25); Covenant v Rust 15-16 with Hunt; Concord v Rust 22-10 (revisit in 3d).
- /tmp/idsoak5.py args: N mode pts covSub rustSub extraJS armyA armyB.

## v0.3.2 Stage 3c "The Chitin Brood" (20 Nov 2026)
- Fourth army (col #b77be0): broodMatriarch (monster leader, no attach; aura Brood Link auto-passes battle-shock within 9"), spawnWarden (lead +1 T via unitT()), skitterlings (10/20 cheap swarm), razorfiends (no guns, re-roll charges), vexwings, tunnelWyrm (burrow(): placed after both deployments outside zones, >9" from enemies), behemoth.
- Army rule Relentless Swarm: charge after advancing, +1 to charge (shares the +2 cap). Subs: gorge (Feeding Frenzy +1 hit in melee when charging), shell (Hardened Carapace: -1 Damage vs Monsters), swarm (+2" Move). Gambit adrenal (re-roll the charge). Monsters use the vehicle flag (square tokens, count for Bring It Down).
- Balance after buffs (skitter claws A3, razorfiends W4 A5, vexwings Sv4, wyrm T9 W10): Brood v Covenant 11-21, v Rust 7-9, v Concord 8-8. The Covenant is the strongest army overall: nerf it a touch in 3d.

## Next: 3d, Strike Force
1,000 points on a bigger scrolling board, a four-army balance pass, 2,000 only if phones cope.

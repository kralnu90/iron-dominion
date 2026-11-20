# Iron Dominion

*A grimdark sci-fi tabletop wargame for your phone, by Kralnu Games.*

Command squads of models on a gridded battlefield, roll the dice yourself, and hold the objectives over five battle rounds.

**Play:** https://kralnugames.com/iron-dominion/ (once GitHub Pages is on)

## Stage 1: First blood (v0.1.0)

- Two original armies at 500 points: **The Ironclad Covenant** (elite gene-forged knights) and **The Rust Tide** (a scrap-built horde)
- Six units each, with squads of individual models on a grid where each square is 2"
- Five phases a turn: Command, Movement, Shooting, Charge, Fight
- **Hands-on dice:** roll to hit, sweep away the misses, tap to re-roll, roll to wound, and the defender rolls their own saves. Quick dice in Settings for when you're in a hurry
- Five objectives, scored from round 2; battle-shock; command re-rolls; Oath of Iron and Rusted Fury army rules
- vs AI (Easy, Normal, Hard) or Pass & Play
- Offline play, install to home screen, auto-save

## Coming next

- **Stage 2, Muster (v0.2.0, done):** army builder with points, unit sizes and wargear swaps; sub-factions; leaders joining squads; saved lists
- **Stage 3, The full war** (3a Tactics, v0.3.0, done: Gambits, secondary missions, 3 battlefields): two more armies, full rosters, Gambits, secondary missions, deployment maps, 1,000 and 2,000 point games
- **Stage 4, Polish:** mission pack, campaign, balance passes

## Building

Edit files in `src/`, then run `python3 build.py`. It writes `index.html`, `version.json` and `sw.js`. Bump `GAME_VERSION` in `src/data.js` for each release.

All armies, units, names, rules text and art are original. Iron Dominion is an independent game inspired by tabletop wargaming and is not affiliated with any wargame company.

Ideas, design and testing by Kris. Built with Claude, an AI by Anthropic.

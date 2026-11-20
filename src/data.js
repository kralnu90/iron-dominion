
/* ============================================================================
   IRON DOMINION: armies, weapons, battlefield (all original names and numbers)
   Distances are in inches; the board is a grid of 2" squares.
   ============================================================================ */
const GAME_VERSION = '0.2.0';
const COLS = 15, ROWS = 21, SQ = 2;   // 30" x 42" skirmish board

/* Weapon keywords: rapid N (+N attacks at half range), torrent (auto-hits), heavy (+1 to hit if stationary),
   twin (re-roll wounds), melta N (+N damage at half range), assault (may fire after advancing), pistol */
const WEAPONS = {
  arcPistol:   { n: 'Arc pistol', r: 12, A: 1, sk: 2, S: 5, AP: -1, D: 2, kw: { pistol: 1 } },
  powerSword:  { n: 'Power sword', r: 0, A: 5, sk: 2, S: 5, AP: -2, D: 1, kw: {} },
  arcCarbine:  { n: 'Arc carbine', r: 24, A: 2, sk: 3, S: 4, AP: -1, D: 1, kw: { rapid: 1 } },
  fusionGun:   { n: 'Fusion gun', r: 12, A: 1, sk: 3, S: 9, AP: -4, D: 'D6', kw: { melta: 2, assault: 1 } },
  combatBlade: { n: 'Combat blade', r: 0, A: 3, sk: 3, S: 4, AP: 0, D: 1, kw: {} },
  powerMaul:   { n: 'Power maul', r: 0, A: 3, sk: 3, S: 6, AP: -1, D: 1, kw: {} },
  scatterPistol: { n: 'Scatter pistol', r: 12, A: 1, sk: 3, S: 4, AP: 0, D: 1, kw: { pistol: 1, assault: 1 } },
  chainblade:  { n: 'Chainblade', r: 0, A: 4, sk: 3, S: 4, AP: -1, D: 1, kw: {} },
  twinCarbine: { n: 'Twin arc carbine', r: 24, A: 2, sk: 3, S: 4, AP: -1, D: 1, kw: { rapid: 1, twin: 1, assault: 1 } },
  riderBlade:  { n: 'Lance blade', r: 0, A: 3, sk: 3, S: 5, AP: -1, D: 1, kw: {} },
  assaultCannon: { n: 'Assault cannon', r: 24, A: 6, sk: 3, S: 6, AP: 0, D: 1, kw: {} },
  powerFist:   { n: 'Siege fist', r: 0, A: 4, sk: 3, S: 12, AP: -2, D: 3, kw: {} },
  rivetGun:    { n: 'Rivet gun', r: 18, A: 3, sk: 5, S: 6, AP: -1, D: 1, kw: {} },
  bigCleaver:  { n: 'Gut cleaver', r: 0, A: 5, sk: 2, S: 8, AP: -2, D: 2, kw: {} },
  scrapPistol: { n: 'Scrap pistol', r: 12, A: 1, sk: 5, S: 4, AP: 0, D: 1, kw: { pistol: 1, assault: 1 } },
  hacker:      { n: 'Hacker', r: 0, A: 3, sk: 3, S: 4, AP: 0, D: 1, kw: {} },
  smasher:     { n: 'Smasher', r: 0, A: 3, sk: 3, S: 6, AP: -1, D: 2, kw: {} },
  smogThrower: { n: 'Smog thrower', r: 12, A: 'D6', sk: 0, S: 4, AP: 0, D: 1, kw: { torrent: 1, assault: 1 } },
  twinRivets:  { n: 'Twin rivet guns', r: 18, A: 3, sk: 5, S: 6, AP: -1, D: 1, kw: { twin: 1, assault: 1 } },
  riderHook:   { n: 'Ripper hooks', r: 0, A: 3, sk: 3, S: 5, AP: -1, D: 1, kw: {} },
  roarCannon:  { n: 'Roar cannon', r: 36, A: 4, sk: 5, S: 7, AP: -1, D: 2, kw: { heavy: 1 } },
  crusher:     { n: 'Crusher claws', r: 0, A: 4, sk: 4, S: 12, AP: -2, D: 3, kw: {} },
  /* Stage 2 wargear */
  masterCarbine: { n: 'Master-forged carbine', r: 24, A: 2, sk: 2, S: 4, AP: -1, D: 2, kw: { rapid: 1 } },
  stormHammer: { n: 'Storm hammer', r: 0, A: 4, sk: 3, S: 8, AP: -2, D: 2, kw: {} },
  sunRifle:    { n: 'Sun rifle', r: 24, A: 2, sk: 3, S: 7, AP: -2, D: 1, kw: { rapid: 1 } },
  arcCannon:   { n: 'Arc cannon', r: 36, A: 3, sk: 3, S: 8, AP: -1, D: 2, kw: { heavy: 1 } },
  fusionLance: { n: 'Fusion lance', r: 12, A: 1, sk: 3, S: 9, AP: -4, D: 'D6', kw: { melta: 2, twin: 1, assault: 1 } },
  lanceCannon: { n: 'Lance cannon', r: 36, A: 2, sk: 3, S: 10, AP: -3, D: 'D6+1', kw: { heavy: 1 } },
  oathMaul:    { n: 'Oath maul', r: 0, A: 5, sk: 2, S: 6, AP: -1, D: 2, kw: {} },
  wreckerClaw: { n: 'Wrecker claw', r: 0, A: 4, sk: 3, S: 10, AP: -2, D: 2, kw: {} },
  spikeLauncher: { n: 'Spike launcher', r: 24, A: 1, sk: 5, S: 9, AP: -2, D: 'D3', kw: {} },
  flameBelcher: { n: 'Flame belcher', r: 12, A: '2D6', sk: 0, S: 5, AP: -1, D: 1, kw: { torrent: 1 } },
  sparkWelder: { n: 'Spark welder', r: 12, A: 'D6', sk: 0, S: 5, AP: -1, D: 1, kw: { torrent: 1, pistol: 1 } },
  bigWrench:   { n: 'Big wrench', r: 0, A: 3, sk: 3, S: 7, AP: -1, D: 2, kw: {} }
};

/* Each unit lists its models: [count, guns, melee]. Plain models die first, specialists last.
   sizes: squad sizes and their points (extra models join the first group).
   opts: free wargear swaps; choice 0 is the starting loadout. g = model group, f = guns or melee.
   Leaders can join one of the units in "leads"; their "lead" ability then applies to that unit. */
const UNITS = {
  /* ---------------- THE IRONCLAD COVENANT ---------------- */
  knightCaptain: { n: 'Knight-Captain', role: 'Leader', pts: 60, ic: '♛', M: 6, T: 4, Sv: 3, W: 5, Ld: 6, OC: 1, ward: 4,
    models: [[1, ['arcPistol'], ['powerSword']]], rule: { id: 'rerollOnes', n: 'Lead from the Front', txt: 'Friendly units within 6" may re-roll hit rolls of 1.' },
    lead: { id: 'ocBoost', n: 'Hold This Ground', txt: 'Every model in the unit gets +1 OC.' }, leads: ['shieldbrothers', 'breachers'],
    opts: [{ id: 'gun', n: 'Ranged weapon', g: 0, f: 'guns', ch: [['arcPistol'], ['masterCarbine']] }, { id: 'mel', n: 'Melee weapon', g: 0, f: 'melee', ch: [['powerSword'], ['stormHammer']] }] },
  oathkeeper: { n: 'Oathkeeper', role: 'Leader', pts: 55, ic: '✠', M: 6, T: 4, Sv: 3, W: 4, Ld: 6, OC: 1, ward: 4,
    models: [[1, ['arcPistol'], ['oathMaul']]],
    lead: { id: 'meleeWound', n: 'Litany of Wrath', txt: 'The unit adds 1 to wound rolls in melee.' }, leads: ['shieldbrothers', 'breachers'] },
  shieldbrothers: { n: 'Shieldbrothers', role: 'Core troops', pts: 80, ic: '⛨', M: 6, T: 4, Sv: 3, W: 2, Ld: 6, OC: 2,
    models: [[3, ['arcCarbine'], ['combatBlade']], [1, ['fusionGun'], ['combatBlade']], [1, ['arcCarbine'], ['powerMaul']]],
    sizes: [{ n: 5, pts: 80 }, { n: 10, pts: 160 }],
    opts: [{ id: 'spec', n: 'Special weapon', x2: 1, g: 1, f: 'guns', ch: [['fusionGun'], ['sunRifle'], ['arcCannon']] }, { id: 'sgt', n: 'Sergeant', g: 2, f: 'melee', ch: [['powerMaul'], ['powerSword'], ['chainblade']] }] },
  breachers: { n: 'Breacher Squad', role: 'Assault', pts: 75, ic: '⚔', M: 6, T: 4, Sv: 3, W: 2, Ld: 6, OC: 1,
    models: [[4, ['scatterPistol'], ['chainblade']], [1, ['scatterPistol'], ['chainblade']]], rule: { id: 'rerollCharge', n: 'Shock Assault', txt: 'May re-roll charge rolls.' },
    sizes: [{ n: 5, pts: 75 }, { n: 10, pts: 150 }],
    opts: [{ id: 'sgt', n: 'Sergeant', g: 1, f: 'melee', ch: [['chainblade'], ['powerSword'], ['stormHammer']] }] },
  talonRiders: { n: 'Talon Riders', role: 'Fast attack', pts: 80, ic: '➹', M: 12, T: 5, Sv: 3, W: 3, Ld: 6, OC: 2,
    models: [[3, ['twinCarbine'], ['riderBlade']]], sizes: [{ n: 3, pts: 80 }, { n: 6, pts: 160 }],
    opts: [{ id: 'gun', n: 'Bike guns', g: 0, f: 'guns', ch: [['twinCarbine'], ['fusionLance']] }] },
  ironSentinel: { n: 'Iron Sentinel', role: 'Walker', pts: 125, ic: '♜', M: 5, T: 9, Sv: 3, W: 7, Ld: 6, OC: 3, vehicle: 1,
    models: [[1, ['assaultCannon'], ['powerFist']]], opts: [{ id: 'gun', n: 'Main gun', g: 0, f: 'guns', ch: [['assaultCannon'], ['lanceCannon']] }] },
  /* ---------------- THE RUST TIDE ---------------- */
  scrapking: { n: 'Scrapking', role: 'Leader', pts: 65, ic: '♚', M: 6, T: 5, Sv: 4, W: 6, Ld: 7, OC: 1, ward: 5,
    models: [[1, ['rivetGun'], ['bigCleaver']]], rule: { id: 'chargeAura', n: 'Fury of the Tide', txt: 'Friendly units within 6" add 1 to charge rolls.' },
    lead: { id: 'chargeRR', n: 'Follow the Boss', txt: 'The unit can re-roll charge rolls.' }, leads: ['rustbornMob', 'smogGunners'],
    opts: [{ id: 'gun', n: 'Ranged weapon', g: 0, f: 'guns', ch: [['rivetGun'], ['smogThrower']] }, { id: 'mel', n: 'Melee weapon', g: 0, f: 'melee', ch: [['bigCleaver'], ['wreckerClaw']] }] },
  wrenchwright: { n: 'Wrenchwright', role: 'Leader', pts: 45, ic: '⚙', M: 6, T: 5, Sv: 4, W: 4, Ld: 7, OC: 1,
    models: [[1, ['sparkWelder'], ['bigWrench']]],
    lead: { id: 'saveUp', n: 'Bolted-On Plates', txt: 'The unit adds 1 to its armour saves (best 3+).' }, leads: ['rustbornMob', 'smogGunners'] },
  rustbornMob: { n: 'Rustborn Mob', role: 'Core troops', pts: 80, ic: '☗', M: 6, T: 4, Sv: 5, W: 1, Ld: 7, OC: 2,
    models: [[8, ['scrapPistol'], ['hacker']], [1, ['scrapPistol'], ['hacker']], [1, ['scrapPistol'], ['smasher']]],
    sizes: [{ n: 10, pts: 80 }, { n: 20, pts: 150 }],
    opts: [{ id: 'heavy', n: 'Mob gunner', x2: 1, g: 1, f: 'guns', ch: [['scrapPistol'], ['spikeLauncher']] }, { id: 'boss', n: 'Mob boss', g: 2, f: 'melee', ch: [['smasher'], ['wreckerClaw']] }] },
  smogGunners: { n: 'Smog Gunners', role: 'Specialists', pts: 60, ic: '♨', M: 6, T: 5, Sv: 4, W: 1, Ld: 7, OC: 1,
    models: [[5, ['smogThrower'], ['hacker']]], sizes: [{ n: 5, pts: 60 }, { n: 10, pts: 110 }] },
  scrapRiders: { n: 'Scrap Riders', role: 'Fast attack', pts: 75, ic: '➶', M: 10, T: 6, Sv: 4, W: 4, Ld: 7, OC: 2,
    models: [[3, ['twinRivets'], ['riderHook']]], sizes: [{ n: 3, pts: 75 }, { n: 6, pts: 150 }] },
  junkStomper: { n: 'Junk Stomper', role: 'Walker', pts: 125, ic: '♖', M: 6, T: 9, Sv: 3, W: 9, Ld: 7, OC: 3, vehicle: 1,
    models: [[1, ['roarCannon'], ['crusher']]], opts: [{ id: 'gun', n: 'Main gun', g: 0, f: 'guns', ch: [['roarCannon'], ['flameBelcher']] }] }
};
for (const [k, U] of Object.entries(UNITS)) { U.id = k; if (!U.sizes) U.sizes = [{ n: U.models.reduce((a, g) => a + g[0], 0), pts: U.pts }]; U.opts = U.opts || []; }

/* Sub-factions: each army picks one, and its rule applies to the whole army. */
const SUBS = {
  covenant: {
    anvil: { n: 'Order of the Anvil', tag: 'Hold the line', id: 'bulwark', rn: 'Iron Bulwark', txt: 'Enemy attacks against your units have their AP worsened by 1 (AP-1 becomes AP0).' },
    flame: { n: 'Order of the Flame', tag: 'Close and kill', id: 'fervour', rn: 'Fervour', txt: 'Your melee weapons get an extra -1 AP, and your units add 1 to charge rolls.' },
    hunt: { n: 'Order of the Hunt', tag: 'Gun them down', id: 'prey', rn: 'Marked Prey', txt: 'Your ranged attacks may re-roll hit rolls of 1 and wound rolls of 1.' }
  },
  rust: {
    gut: { n: 'The Gutstompers', tag: 'Charge everything', id: 'stampede', rn: 'Stampede', txt: 'Your units add 1 to charge rolls (up to +2 with Fury of the Tide).' },
    smog: { n: 'The Smogchoked', tag: 'Hide in the haze', id: 'haze', rn: 'Choking Smog', txt: 'Enemy ranged attacks from more than 18" away get -1 to hit.' },
    heap: { n: 'The Scrapheap Crew', tag: 'Too stubborn to die', id: 'bodge', rn: 'Bodge Job', txt: 'Each time one of your models would lose a wound, roll a D6: on a 6 it is ignored.' }
  }
};
const POINTS = [{ pts: 500, n: 'Skirmish', depth: 4, maxModels: 42 }, { pts: 750, n: 'Clash', depth: 5, maxModels: 55 }];

const ARMIES = {
  covenant: { n: 'The Ironclad Covenant', short: 'Covenant', col: '#9cc2f0', dark: '#1f3a66', blurb: 'Gene-forged knights: few, elite and hard to kill.',
    roster: ['knightCaptain', 'oathkeeper', 'shieldbrothers', 'breachers', 'talonRiders', 'ironSentinel'],
    rule: { n: 'Oath of Iron', txt: 'Once per battle, each unit can re-roll all its failed hit rolls for one attack.' },
    list: ['knightCaptain', 'shieldbrothers', 'shieldbrothers', 'breachers', 'talonRiders', 'ironSentinel'], leadsInto: 1, sub: 'anvil' },
  rust: { n: 'The Rust Tide', short: 'Rust Tide', col: '#d0702c', dark: '#4f6b22', blurb: 'A scrap-built horde: cheap, many and brutal up close.',
    roster: ['scrapking', 'wrenchwright', 'rustbornMob', 'smogGunners', 'scrapRiders', 'junkStomper'],
    rule: { n: 'Rusted Fury', txt: 'Units get +1 Strength in melee on a turn they charged.' },
    list: ['scrapking', 'rustbornMob', 'rustbornMob', 'smogGunners', 'scrapRiders', 'junkStomper'], leadsInto: 1, sub: 'gut' }
};

/* Battlefield: rotationally symmetric so both sides get the same ground. */
const OBJECTIVES = [[7, 10], [7, 3], [7, 17], [2, 10], [12, 10]];
const TERRAIN = (() => {
  const t = {};
  const add = (type, cells) => cells.forEach(([c, r]) => { t[c + ',' + r] = type; t[(COLS - 1 - c) + ',' + (ROWS - 1 - r)] = type; });
  add('ruin', [[3, 7], [4, 7], [3, 8], [9, 5], [10, 5], [10, 6], [0, 12], [1, 12]]);
  add('crater', [[6, 9], [5, 11]]);
  add('wall', [[7, 7], [12, 13], [13, 13], [2, 4], [3, 4]]);
  return t;
})();
const TERRAIN_INFO = { ruin: { n: 'Ruins', cover: 1, blocks: 1 }, crater: { n: 'Crater', cover: 1, blocks: 0 }, wall: { n: 'Barricade', cover: 1, blocks: 0 } };

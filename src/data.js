
/* ============================================================================
   IRON DOMINION: armies, weapons, battlefield (all original names and numbers)
   Distances are in inches; the board is a grid of 2" squares.
   ============================================================================ */
const GAME_VERSION = '0.1.0';
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
  hacker:      { n: 'Hacker', r: 0, A: 3, sk: 3, S: 4, AP: -1, D: 1, kw: {} },
  smasher:     { n: 'Smasher', r: 0, A: 3, sk: 3, S: 6, AP: -1, D: 2, kw: {} },
  smogThrower: { n: 'Smog thrower', r: 12, A: 'D6', sk: 0, S: 4, AP: 0, D: 1, kw: { torrent: 1, assault: 1 } },
  twinRivets:  { n: 'Twin rivet guns', r: 18, A: 3, sk: 5, S: 6, AP: -1, D: 1, kw: { twin: 1, assault: 1 } },
  riderHook:   { n: 'Ripper hooks', r: 0, A: 3, sk: 3, S: 5, AP: -1, D: 1, kw: {} },
  roarCannon:  { n: 'Roar cannon', r: 36, A: 4, sk: 5, S: 7, AP: -1, D: 2, kw: { heavy: 1 } },
  crusher:     { n: 'Crusher claws', r: 0, A: 4, sk: 4, S: 12, AP: -2, D: 3, kw: {} }
};

/* Each unit lists its models: [count, guns, melee]. Plain models die first, specialists last. */
const UNITS = {
  /* ---------------- THE IRONCLAD COVENANT ---------------- */
  knightCaptain: { n: 'Knight-Captain', role: 'Leader', pts: 65, ic: '♛', M: 6, T: 4, Sv: 3, W: 5, Ld: 6, OC: 1, ward: 4,
    models: [[1, ['arcPistol'], ['powerSword']]], rule: { id: 'rerollOnes', n: 'Lead from the Front', txt: 'Friendly units within 6" may re-roll hit rolls of 1.' } },
  shieldbrothers: { n: 'Shieldbrothers', role: 'Core troops', pts: 85, ic: '⛨', M: 6, T: 4, Sv: 3, W: 2, Ld: 6, OC: 2,
    models: [[3, ['arcCarbine'], ['combatBlade']], [1, ['fusionGun'], ['combatBlade']], [1, ['arcCarbine'], ['powerMaul']]] },
  breachers: { n: 'Breacher Squad', role: 'Assault', pts: 80, ic: '⚔', M: 6, T: 4, Sv: 3, W: 2, Ld: 6, OC: 1,
    models: [[5, ['scatterPistol'], ['chainblade']]], rule: { id: 'rerollCharge', n: 'Shock Assault', txt: 'May re-roll charge rolls.' } },
  talonRiders: { n: 'Talon Riders', role: 'Fast attack', pts: 80, ic: '➹', M: 12, T: 5, Sv: 3, W: 3, Ld: 6, OC: 2,
    models: [[3, ['twinCarbine'], ['riderBlade']]] },
  ironSentinel: { n: 'Iron Sentinel', role: 'Walker', pts: 130, ic: '♜', M: 5, T: 9, Sv: 3, W: 7, Ld: 6, OC: 3, vehicle: 1,
    models: [[1, ['assaultCannon'], ['powerFist']]] },
  /* ---------------- THE RUST TIDE ---------------- */
  scrapking: { n: 'Scrapking', role: 'Leader', pts: 70, ic: '♚', M: 6, T: 5, Sv: 4, W: 6, Ld: 7, OC: 1, ward: 5,
    models: [[1, ['rivetGun'], ['bigCleaver']]], rule: { id: 'chargeAura', n: 'Fury of the Tide', txt: 'Friendly units within 6" add 1 to charge rolls.' } },
  rustbornMob: { n: 'Rustborn Mob', role: 'Core troops', pts: 80, ic: '☗', M: 6, T: 5, Sv: 5, W: 1, Ld: 7, OC: 2,
    models: [[9, ['scrapPistol'], ['hacker']], [1, ['scrapPistol'], ['smasher']]] },
  smogGunners: { n: 'Smog Gunners', role: 'Specialists', pts: 65, ic: '♨', M: 6, T: 5, Sv: 4, W: 1, Ld: 7, OC: 1,
    models: [[5, ['smogThrower'], ['hacker']]] },
  scrapRiders: { n: 'Scrap Riders', role: 'Fast attack', pts: 85, ic: '➶', M: 10, T: 6, Sv: 4, W: 4, Ld: 7, OC: 2,
    models: [[3, ['twinRivets'], ['riderHook']]] },
  junkStomper: { n: 'Junk Stomper', role: 'Walker', pts: 125, ic: '♖', M: 6, T: 9, Sv: 3, W: 9, Ld: 7, OC: 3, vehicle: 1,
    models: [[1, ['roarCannon'], ['crusher']]] }
};

const ARMIES = {
  covenant: { n: 'The Ironclad Covenant', short: 'Covenant', col: '#9cc2f0', dark: '#1f3a66', blurb: 'Gene-forged knights: few, elite and hard to kill.',
    rule: { n: 'Oath of Iron', txt: 'Once per battle, each unit can re-roll all its failed hit rolls for one attack.' },
    list: ['knightCaptain', 'shieldbrothers', 'shieldbrothers', 'breachers', 'talonRiders', 'ironSentinel'] },
  rust: { n: 'The Rust Tide', short: 'Rust Tide', col: '#d0702c', dark: '#4f6b22', blurb: 'A scrap-built horde: cheap, many and brutal up close.',
    rule: { n: 'Rusted Fury', txt: 'Units get +1 Strength in melee on a turn they charged.' },
    list: ['scrapking', 'rustbornMob', 'rustbornMob', 'smogGunners', 'scrapRiders', 'junkStomper'] }
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

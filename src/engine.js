
/* ============================================================================
   IRON DOMINION: rules engine (state, measuring, attacks) and the AI general
   ============================================================================ */
let G = null;
const WP = id => WEAPONS[id];
const UD = u => UNITS[u.def];
const d6 = () => 1 + Math.floor(Math.random() * 6);
const rollExpr = e => typeof e === 'number' ? e : e === 'D3' ? Math.ceil(d6() / 2) : e === 'D6+1' ? d6() + 1 : e === '2D6' ? d6() + d6() : d6();
const avgExpr = e => typeof e === 'number' ? e : e === 'D3' ? 2 : e === 'D6+1' ? 4.5 : e === '2D6' ? 7 : 3.5;
const key = (c, r) => c + ',' + r;
const inBoard = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const enemyOf = s => 1 - s;
const unitsOf = s => G.units.filter(u => u.side === s && u.models.length);
const liveUnits = () => G.units.filter(u => u.models.length);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const sqd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let NEXT_ID = 1;
const nd = n => n === 1 ? '1 die' : n + ' dice';
const MW = m => UNITS[m.p].W;
const unitM = u => Math.min(...u.models.map(m => UNITS[m.p].M)) + (subIs(u.side, 'swift') ? 2 : 0);
const unitLd = u => Math.min(...u.models.map(m => UNITS[m.p].Ld));
const hasRule = (u, id) => u.models.some(m => UNITS[m.p].rule && UNITS[m.p].rule.id === id);
const leadIs = (u, id) => !!(u.lead && UNITS[u.lead].lead && UNITS[u.lead].lead.id === id);
const subOf = s => { const p = G.players[s], L = p.list; return L && SUBS[p.army] && SUBS[p.army][L.sub] || null; };
const subIs = (s, id) => { const x = subOf(s); return !!(x && x.id === id); };
const unitT = u => UD(u).T + (leadIs(u, 'toughUp') ? 1 : 0);
const modelOC = (u, m) => UNITS[m.p].OC + (leadIs(u, 'ocBoost') ? 1 : 0) + (subIs(u.side, 'ledger') ? 1 : 0);
const unitOC = u => u.models.reduce((a, m) => a + modelOC(u, m), 0);

/* ---------- building armies ---------- */
function makeUnit(e, side, leaders = []) {
  if (typeof e === 'string') e = { d: e, s: 0, o: {} };
  const D = UNITS[e.d], models = [];
  const add = (le, isLdr) => buildModels(le).forEach(([n, guns, melee], gi) => { for (let k = 0; k < n; k++) models.push({ id: NEXT_ID++, x: -1, y: -1, p: le.d, w: UNITS[le.d].W, guns: guns.slice(), melee: melee.slice(), spec: isLdr || gi > 0, ldr: isLdr }); });
  add(e, false); let pts = entryPts(e), lead = null;
  for (const le of leaders) { add(le, true); lead = le.d; pts += entryPts(le); }
  return { uid: NEXT_ID++, def: e.d, lead, side, models, startN: models.length, pts, wStart: models.reduce((a, m) => a + m.w, 0), moved: false, advanced: false, fellBack: false, shot: false, charged: false, fought: false, shaken: false, oath: false };
}
function newBattle(cfg) {
  NEXT_ID = 1; cfg.pts = cfg.pts || 500;
  if (!MAPS[cfg.map]) cfg.map = Object.keys(MAPS)[Math.floor(Math.random() * Object.keys(MAPS).length)];
  setMap(cfg.map);
  G = { cfg, round: 1, turn: 0, phase: 'command', cp: [0, 0], vp: [0, 0], players: cfg.players, units: [], log: [], over: null, first: 0, cmdUsed: [false, false], score: [[], []] };
  cfg.players.forEach((p, s) => {
    const L = p.list = p.list || starterList(p.army);
    const ks = new Set(L.units.map(e => e.k)), leaders = L.units.filter(e => e.at && ks.has(e.at));
    L.units.forEach(e => { if (!leaders.includes(e)) G.units.push(makeUnit(e, s, leaders.filter(l => l.at === e.k))); });
  });
  cfg.players.forEach((p, s) => { const x = subOf(s); log(`${p.name}: ${p.list.name}, ${x ? x.n : ARMIES[p.army].short} (${listPts(p.list)} pts).`); });
  log(`The battlefield: ${MAPS[cfg.map].n}.`);
  deploy(0); deploy(1); burrow(0); burrow(1);
  G.first = G.turn = Math.random() < .5 ? 0 : 1;
  log(`${pverb(G.first, 'wins', 'win')} the roll-off and ${pname(G.first) === 'You' ? 'take' : 'takes'} the first turn.`);
  return G;
}
/* saves from v0.1 had no per-model profiles */
function migrate(state) {
  for (const u of state.units) { for (const m of u.models) if (!m.p) m.p = u.def; if (u.pts == null) { u.pts = UNITS[u.def].pts; u.wStart = u.startN * UNITS[u.def].W; } }
  if (!state.cfg.pts) state.cfg.pts = 500;
  setMap(state.cfg.map || 'hab');
  return state;
}
const pname = s => G.players[s].name;
const pverb = (s, one, you) => `${pname(s)} ${pname(s) === 'You' ? you : one}`;
function log(t) { G.log.push(t); if (G.log.length > 60) G.log.shift(); }

/* ---------- the grid ---------- */
function occMap() { const o = {}; for (const u of G.units) for (const m of u.models) o[key(m.x, m.y)] = { u, m }; return o; }
function adjEnemy(c, r, side, occ, except) {
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) { const h = occ[key(c + dc, r + dr)]; if (h && h.u.side !== side && h.u !== except) return true; }
  return false;
}
/* place a unit's models around an anchor cell, keeping them together */
function formation(u, anchor, ok) {
  const occ = occMap(); for (const m of u.models) delete occ[key(m.x, m.y)];
  const cells = [], seen = new Set([key(anchor.x, anchor.y)]), q = [anchor];
  while (q.length && cells.length < u.models.length) {
    const c = q.shift();
    if (inBoard(c.x, c.y) && !occ[key(c.x, c.y)] && ok(c.x, c.y, occ)) cells.push(c);
    else if (cells.length === 0 && !(inBoard(c.x, c.y) && !occ[key(c.x, c.y)])) { /* anchor blocked: keep searching nearby */ }
    const nb = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
    for (const [dx, dy] of nb) { const n = { x: c.x + dx, y: c.y + dy }, k = key(n.x, n.y); if (!seen.has(k) && inBoard(n.x, n.y) && Math.hypot(n.x - anchor.x, n.y - anchor.y) <= 4) { seen.add(k); q.push(n); } }
  }
  if (cells.length < u.models.length) return false;
  // keep specialists near the middle: sort models so the anchor gets model 0
  u.models.forEach((m, i) => { m.x = cells[i].x; m.y = cells[i].y; });
  return true;
}
function deploy(side) {
  const pts = G.cfg.pts, corners = MAPS[MAP_ID].zone === 'corners';
  const us = G.units.filter(u => u.side === side);
  const slots = corners ? [] : [[7, 1], [3, 1], [11, 1], [5, 3], [9, 3], [1, 3], [13, 3], [7, 2], [3, 3], [11, 3]];
  const all = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) all.push([c, r]);
  if (corners) all.sort((a, b) => Math.hypot(a[0] - 3, a[1] - 3.5) - Math.hypot(b[0] - 3, b[1] - 3.5));
  else all.sort((a, b) => Math.abs(a[0] - 7) - Math.abs(b[0] - 7) + (b[1] - a[1]) * .3);
  us.forEach((u, i) => {
    const cands = (slots.length ? [slots[i % slots.length]] : []).concat(all);
    for (const extra of [0, 1, 2]) {
      let ok = false;
      for (let [c, r] of cands) { if (side === 0) { c = COLS - 1 - c; r = ROWS - 1 - r; } if (!inZone(side, c, r, pts, extra)) continue; if (formation(u, { x: c, y: r }, (x, y) => inZone(side, x, y, pts, extra))) { ok = true; break; } }
      if (ok) break;
    }
  });
}
/* burrowers pop up in no-man's land, more than 9" from the enemy */
function burrow(side) {
  const pts = G.cfg.pts;
  for (const u of G.units.filter(u => u.side === side && hasRule(u, 'burrow'))) {
    const foes = G.units.filter(v => v.side !== side).flatMap(v => v.models);
    const ok = (x, y) => !inZone(0, x, y, pts) && !inZone(1, x, y, pts) && foes.every(m => Math.hypot(m.x - x, m.y - y) * SQ > 9);
    const cells = []; for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) if (ok(c, r)) cells.push([c, r, Math.min(...foes.map(m => Math.hypot(m.x - c, m.y - r))) + Math.abs(c - 7) * .3]);
    cells.sort((a, b) => a[2] - b[2]);
    const save = u.models.map(m => [m.x, m.y]); let placed = false;
    for (const [c, r] of cells.slice(0, 40)) if (formation(u, { x: c, y: r }, ok)) { placed = true; break; }
    if (!placed) u.models.forEach((m, i) => { m.x = save[i][0]; m.y = save[i][1]; });
    else log(`${UD(u).n} bursts up from below!`);
  }
}
/* ---------- phases and Gambits ---------- */
function setPhase(p) { G.phase = p; G.gamb = [{}, {}]; for (const u of G.units) { u.focus = false; u.overc = false; } }
const canGamb = (s, id) => { const g = GAMBITS[id]; return G.cp[s] >= g.cp && !(G.gamb && G.gamb[s][id]) && (!g.army || G.players[s].army === g.army); };
function useGamb(s, id) { G.gstat = G.gstat || {}; G.gstat[id] = (G.gstat[id] || 0) + 1; G.cp[s] -= GAMBITS[id].cp; G.gamb = G.gamb || [{}, {}]; G.gamb[s][id] = true; log(`${pverb(s, 'uses', 'use')} ${GAMBITS[id].n}.`); Sfx.play('tap'); }
/* ---------- secondary missions ---------- */
function missionDeck() { const d = Object.keys(MISSIONS); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; }
function missionPossible(s, id) {
  const e = unitsOf(enemyOf(s));
  if (id === 'bringdown') return e.some(u => UD(u).vehicle);
  if (id === 'assassinate') return e.some(u => u.models.some(m => UNITS[m.p].role === 'Leader'));
  return true;
}
function drawMissions(s) {
  const S = G.sec = G.sec || { hand: [[], []], deck: [missionDeck(), missionDeck()], vp: [0, 0], done: [[], []], swapped: [false, false] };
  S.swapped[s] = false; S.hand[s] = S.hand[s].filter(id => missionPossible(s, id));
  for (let g = 0; S.hand[s].length < 2 && g < 60; g++) {
    if (!S.deck[s].length) S.deck[s] = missionDeck();
    const id = S.deck[s].shift(); if (!S.hand[s].includes(id) && missionPossible(s, id)) S.hand[s].push(id);
  }
}
function swapMission(s, i) {
  const S = G.sec, old = S.hand[s][i]; G.cp[s]--; S.swapped[s] = true; S.hand[s].splice(i, 1);
  for (let g = 0; S.hand[s].length < 2 && g < 60; g++) { if (!S.deck[s].length) S.deck[s] = missionDeck(); const id = S.deck[s].shift(); if (id !== old && !S.hand[s].includes(id) && missionPossible(s, id)) S.hand[s].push(id); }
  log(`${pverb(s, 'swaps', 'swap')} ${MISSIONS[old].n} for new orders.`);
}
function quarters(s) { const q = new Set(); for (const u of unitsOf(s)) for (const m of u.models) { if (m.x === 7 || m.y === 10) continue; q.add((m.x > 7 ? 1 : 0) + (m.y > 10 ? 2 : 0)); } return q.size; }
function missionMet(s, id) {
  const K = (G.kills || []).filter(k => k.side !== s), e = enemyOf(s), pts = G.cfg.pts;
  switch (id) {
    case 'assassinate': return K.some(k => k.leader) ? 5 : 0;
    case 'bringdown': return K.some(k => k.vehicle) ? 5 : 0;
    case 'noprisoners': return K.filter(k => k.unit).length >= 2 ? 4 : 0;
    case 'overwhelm': return K.some(k => k.unit && k.onObj) ? 4 : 0;
    case 'behind': return unitsOf(s).some(u => !u.shaken && u.models.some(m => inZone(e, m.x, m.y, pts))) ? 4 : 0;
    case 'fronts': { const n = quarters(s); return n >= 4 ? 4 : n >= 3 ? 3 : 0; }
    case 'nomans': { const ctl = objControl(); return OBJECTIVES.filter(([c, r], i) => ctl[i] === s && !inZone(0, c, r, pts) && !inZone(1, c, r, pts)).length >= 2 ? 4 : 0; }
    case 'denial': { const [c, r] = OBJECTIVES[0], near = (side, d) => unitsOf(side).some(u => u.models.some(m => Math.hypot(m.x - c, m.y - r) * SQ <= d)); return near(s, 3.2) && !near(e, 6) ? 4 : 0; }
  }
  return 0;
}
function scoreMissions(s) {
  const S = G.sec; if (!S) return [];
  const out = [];
  for (const id of S.hand[s].slice()) { const vp = missionMet(s, id); if (vp) { G.vp[s] += vp; S.vp[s] += vp; S.done[s].push(id); S.hand[s].splice(S.hand[s].indexOf(id), 1); out.push([id, vp]); } }
  return out;
}
const onObjective = u => OBJECTIVES.some(([c, r]) => u.models.some(m => Math.hypot(m.x - c, m.y - r) <= 1.6));
function engagedWith(u) { const out = new Set(); for (const v of liveUnits()) if (v.side !== u.side) for (const a of u.models) for (const b of v.models) if (cheb(a, b) <= 1) out.add(v); return [...out]; }
const engaged = u => engagedWith(u).length > 0;
function unitDistIn(u, v) { let d = 1e9; for (const a of u.models) for (const b of v.models) d = Math.min(d, sqd(a, b)); return d * SQ; }
/* line of sight: ruins between the two squares block it */
function los(a, b) {
  const n = Math.ceil(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) * 3);
  for (let i = 1; i < n; i++) { const t = i / n, c = Math.round(a.x + (b.x - a.x) * t), r = Math.round(a.y + (b.y - a.y) * t); if ((c !== a.x || r !== a.y) && (c !== b.x || r !== b.y) && TERRAIN[key(c, r)] === 'ruin') return false; }
  return true;
}
function inCover(target, from) {
  if (hasRule(target, 'camo') || (subIs(target.side, 'veil') && unitDistIn(target, from) > 12)) return true;
  let n = 0;
  for (const m of target.models) {
    if (TERRAIN[key(m.x, m.y)]) { n++; continue; }
    const a = from.models[0], steps = Math.ceil(sqd(a, m) * 3);
    for (let i = 1; i < steps; i++) { const t = i / steps, c = Math.round(a.x + (m.x - a.x) * t), r = Math.round(a.y + (m.y - a.y) * t); const tt = TERRAIN[key(c, r)]; if (tt && tt !== 'ruin' && Math.hypot(c - m.x, r - m.y) <= 1.5) { n++; break; } }
  }
  return n * 2 >= target.models.length;
}
const stationary = u => !u.moved;

/* ---------- objectives and scoring ---------- */
function objControl() {
  return OBJECTIVES.map(([c, r]) => {
    const oc = [0, 0];
    for (const u of liveUnits()) { if (u.shaken) continue; for (const m of u.models) if (Math.hypot(m.x - c, m.y - r) <= 1.6) oc[u.side] += modelOC(u, m); }
    return oc[0] > oc[1] ? 0 : oc[1] > oc[0] ? 1 : -1;
  });
}
function scoreTurn(side) {
  if (G.round < 2) return 0;
  const ctl = objControl(), mine = ctl.filter(x => x === side).length, theirs = ctl.filter(x => x === enemyOf(side)).length;
  let vp = 0; if (mine >= 1) vp += 5; if (mine >= 2) vp += 5; if (mine > theirs) vp += 5;
  G.vp[side] += vp; G.score[side].push(vp);
  return vp;
}

/* ---------- attack maths ---------- */
function woundNeed(S, T) { return S >= 2 * T ? 2 : S > T ? 3 : S === T ? 4 : S * 2 <= T ? 6 : 5; }
function saveNeed(def, AP, cover) {
  const D = UD(def); if (AP < 0 && subIs(def.side, 'bulwark')) AP++;
  let sv = Math.max(2, D.Sv - AP - (cover ? 1 : 0)); if (leadIs(def, 'saveUp') && sv > 3) sv--;
  const ward = Math.min(D.ward || 7, leadIs(def, 'wardShield') ? 5 : 7); if (ward < sv) sv = ward; return sv;
}
/* everything that tweaks one weapon's attack: Strength, wound roll, AP and the hit roll */
function atkMods(att, def, w, melee, g) {
  const rust = melee && att.chargedNow && G.players[att.side].army === 'rust';
  const S = w.S + (rust ? 1 : 0) + (melee && leadIs(att, 'meleeStr') ? 1 : 0);
  const wn = Math.max(2, woundNeed(S, unitT(def)) - (melee && leadIs(att, 'meleeWound') ? 1 : 0));
  const AP = w.AP - (melee && subIs(att.side, 'fervour') ? 1 : 0) - (!melee && leadIs(att, 'apRanged') ? 1 : 0) - (!melee && g && g.half && subIs(att.side, 'halfAP') ? 1 : 0);
  const heavy = !melee && w.kw.heavy && stationary(att), measured = !melee && !att.advanced && G.players[att.side].army === 'concord', haze = !melee && g && g.far && subIs(def.side, 'haze');
  const need = Math.min(6, Math.max(2, w.sk - (heavy ? 1 : 0) - (leadIs(att, 'hitPlus') ? 1 : 0) - (!melee && att.focus ? 1 : 0) - (!melee && !att.advanced && G.players[att.side].army === 'concord' ? 1 : 0) - (melee && att.chargedNow && subIs(att.side, 'frenzy') ? 1 : 0)) + (haze ? 1 : 0));
  return { S, wn, AP, need, heavy, haze, measured };
}
/* the weapons a unit can bring to bear on a target: [{wid, attacks, half}] */
function shootingGroups(att, def) {
  const groups = {}, moved = att.advanced;
  for (const m of att.models) for (const wid of m.guns) {
    const w = WP(wid); if (moved && !w.kw.assault) continue;
    let best = 1e9, seen = false;
    for (const t of def.models) { const d = sqd(m, t) * SQ; if (d <= w.r && los(m, t)) { seen = true; best = Math.min(best, d); } }
    if (!seen) continue;
    const g = groups[wid] = groups[wid] || { wid, models: 0, half: true, far: true };
    g.models++; if (best > w.r / 2) g.half = false; if (best <= 18) g.far = false;
  }
  return Object.values(groups);
}
function meleeGroups(att) { const g = {}; for (const m of att.models) for (const wid of m.melee) { g[wid] = g[wid] || { wid, models: 0, half: true, far: false }; g[wid].models++; } return Object.values(g); }
function canShoot(u) { if (!u.models.length || u.shot || (u.fellBack && G.players[u.side].army !== 'concord') || engaged(u)) return false; return shootTargets(u).length > 0; }
function shootTargets(u) { return liveUnits().filter(v => v.side !== u.side && shootingGroups(u, v).length && !engaged(v)); }
function chargeTargets(u) { return liveUnits().filter(v => v.side !== u.side && unitDistIn(u, v) <= 12); }
function canCharge(u) { return u.models.length && (!u.advanced || u.rapid || G.players[u.side].army === 'brood') && !u.fellBack && !u.charged && !engaged(u) && chargeTargets(u).length; }
function chargeBonus(u) { let b = 0; for (const v of unitsOf(u.side)) if (hasRule(v, 'chargeAura') && (v === u || unitDistIn(u, v) <= 6)) b = 1; if (subIs(u.side, 'stampede') || subIs(u.side, 'fervour')) b++; if (G.players[u.side].army === 'brood') b++; return Math.min(2, b) + (u.surge ? 2 : 0); }
const chargeNeed = (u, v) => Math.max(2, Math.ceil(unitDistIn(u, v) - SQ));
function woundRerollOnes(u) { for (const v of unitsOf(u.side)) if (hasRule(v, 'rrWoundAura') && (v === u || unitDistIn(u, v) <= 6)) return true; return false; }
function hitRerollOnes(u) { for (const v of unitsOf(u.side)) if (hasRule(v, 'rerollOnes') && (v === u || unitDistIn(u, v) <= 6)) return true; return false; }
/* expected damage (for the AI and the hint line) */
function expected(att, def, melee) {
  const groups = melee ? meleeGroups(att) : shootingGroups(att, def); let dmg = 0;
  const cover = !melee && inCover(def, att), Wt = UD(def).W;
  for (const g of groups) {
    const w = WP(g.wid), M = atkMods(att, def, w, melee, g); let A = avgExpr(w.A) * g.models; if (w.kw.rapid && g.half) A += w.kw.rapid * g.models;
    const pH = w.kw.torrent ? 1 : (7 - M.need) / 6;
    let pW = (7 - M.wn) / 6; if (w.kw.twin) pW = 1 - (1 - pW) * (1 - pW);
    const sv = saveNeed(def, M.AP, cover), pF = sv >= 7 ? 1 : (sv - 1) / 6;
    let D = avgExpr(w.D) + (w.kw.melta && g.half ? w.kw.melta : 0); D = Math.min(D, Wt);
    dmg += A * pH * pW * pF * D;
  }
  if (subIs(def.side, 'bodge')) dmg *= 5 / 6;
  return dmg;
}

/* ---------- resolving an attack (dice go through the Tray) ---------- */
async function resolveAttack(att, def, melee) {
  const groups = melee ? meleeGroups(att) : shootingGroups(att, def), onObj = onObjective(def);
  let cover = !melee && inCover(def, att);
  if (!melee && !cover && canGamb(def.side, 'ground') && groups.length) {
    let use = false;
    if (isAI(def.side)) use = expected(att, def, false) >= Math.max(2, def.models.reduce((a, m) => a + m.w, 0) * .3) && (G.cp[def.side] >= 2 || !!def.lead || UD(def).role === 'Leader' || UD(def).vehicle);
    else if (!Tray.headless) { Tray.close(); use = await choose(`${UD(def).n} under fire!`, `${UD(att).n} is shooting at them. Spend 1 CP on <b>Go to Ground</b>? They count as in cover (+1 save) against this attack. You have ${G.cp[def.side]} CP.`, [{ l: '⛉ Go to Ground (1 CP)', v: true, p: 1 }, { l: 'No', v: false }]); }
    if (use) { useGamb(def.side, 'ground'); cover = true; if (!Tray.headless) toast(`${UD(def).n} goes to ground`); }
  }
  let killed = 0;
  for (const g of groups) {
    if (!def.models.length) break;
    const w = WP(g.wid);
    let A = 0; for (let k = 0; k < g.models; k++) A += rollExpr(w.A); if (w.kw.rapid && g.half) A += w.kw.rapid * g.models;
    const M = atkMods(att, def, w, melee, g), S = M.S, T = unitT(def), head = `${UD(att).n} → ${UD(def).n}: ${g.models > 1 ? g.models + '× ' : ''}${w.n}`;
    // hit
    let hits;
    if (w.kw.torrent) { hits = A; await Tray.note(head, `${A} automatic hit${A === 1 ? '' : 's'} (torrent).`); }
    else {
      const need = M.need;
      const dice = await Tray.step({ kind: 'hit', title: head, label: `Roll to hit: ${nd(A)}, ${need}+ to hit${M.heavy ? ' (heavy, stood still)' : ''}${M.measured ? ' (measured fire)' : ''}${M.haze ? ' (−1: choking smog)' : ''}`, n: A, need, side: att.side, rrOnes: hitRerollOnes(att) || (!melee && subIs(att.side, 'prey')), oath: G.players[att.side].army === 'covenant' && !att.oath ? att : null });
      hits = dice.filter(v => v >= need).length;
    }
    if (!hits) { log(`${head}: no hits.`); continue; }
    // wound
    const wn = M.wn, prey = !melee && (subIs(att.side, 'prey') || woundRerollOnes(att)), overc = !melee && att.overc;
    const wd = await Tray.step({ kind: 'wound', title: head, label: `Roll to wound: ${nd(hits)}, S${S} vs T${T} needs ${wn}+${w.kw.twin ? ' (twin: re-roll fails)' : overc ? ' (overcharge: re-roll fails)' : prey ? ' (re-roll 1s)' : ''}`, n: hits, need: wn, side: att.side, rrFails: !!w.kw.twin || overc, rrOnes: prey });
    const wounds = wd.filter(v => v >= wn).length;
    if (!wounds) { log(`${head}: ${hits} hit${hits > 1 ? 's' : ''}, no wounds.`); continue; }
    // save (the defender rolls)
    const sv = saveNeed(def, M.AP, cover);
    let fails = wounds;
    if (sv <= 6) {
      const sd = await Tray.step({ kind: 'save', title: `${UD(def).n} save`, label: `Roll saves: ${nd(wounds)}, ${sv}+ to save${cover ? ' (in cover)' : ''}${UD(def).ward && UD(def).ward === sv ? ' (ward)' : ''}`, n: wounds, need: sv, side: def.side });
      fails = sd.filter(v => v < sv).length;
    } else await Tray.note(`${UD(def).n} save`, `No save possible against AP${M.AP}.`);
    if (!fails) { log(`${head}: ${wounds} wound${wounds > 1 ? 's' : ''}, all saved.`); continue; }
    // damage
    let dmgs = [];
    if (typeof w.D === 'number') dmgs = Array(fails).fill(w.D);
    else { const dd = await Tray.step({ kind: 'damage', title: head, label: `Roll damage: ${fails} × ${w.D}`, n: fails, need: 0, side: att.side, plain: true }); dmgs = dd.map(v => w.D === 'D3' ? Math.ceil(v / 2) : w.D === 'D6+1' ? v + 1 : v); }
    if (w.kw.melta && g.half) dmgs = dmgs.map(d => d + w.kw.melta);
    if (subIs(def.side, 'carapace') && UD(def).vehicle) dmgs = dmgs.map(d => Math.max(1, d - 1));
    if (subIs(def.side, 'bodge')) {
      dmgs = dmgs.map(d => Math.min(d, UD(def).W)); const tot = dmgs.reduce((a, b) => a + b, 0);
      const fd = await Tray.step({ kind: 'fnp', title: `${UD(def).n}: Bodge Job`, label: `Roll for each lost wound: ${nd(tot)}, a 6 ignores it`, n: tot, need: 6, side: def.side });
      let saved = fd.filter(v => v >= 6).length;
      for (let i = 0; i < dmgs.length && saved; i++) { const t = Math.min(saved, dmgs[i]); dmgs[i] -= t; saved -= t; }
      dmgs = dmgs.filter(d => d > 0);
      if (!dmgs.length) { log(`${head}: every wound shrugged off.`); await Tray.result(`${UD(def).n} bodges it back together: no models lost.`, def); continue; }
    }
    const before = def.models.length;
    for (const d of dmgs) { if (!def.models.length) break; allocate(def, d); }
    killed += before - def.models.length;
    const msg = `${head}: ${wounds} wound${wounds > 1 ? 's' : ''}, ${fails} unsaved, ${before - def.models.length} model${before - def.models.length === 1 ? '' : 's'} slain.`;
    log(msg); await Tray.result(msg, def);
  }
  if (!def.models.length) { log(`${UD(def).n} is wiped out!`); Sfx.play('lose'); (G.kills = G.kills || []).push({ side: def.side, unit: 1, vehicle: !!UD(def).vehicle, onObj }); }
  checkWipe();
  return killed;
}
function allocate(def, dmg) {
  // wounded models take damage first, then plain models, specialists, and an attached leader last
  const ms = def.models, body = ms.filter(x => !x.ldr);
  const m = body.find(x => x.w < MW(x)) || body.filter(x => !x.spec).slice(-1)[0] || body.slice(-1)[0] || ms.find(x => x.w < MW(x)) || ms[ms.length - 1];
  m.w -= dmg; if (m.w <= 0) { ms.splice(ms.indexOf(m), 1); if (UNITS[m.p].role === 'Leader') (G.kills = G.kills || []).push({ side: def.side, leader: 1 }); }
  if (ms.length && !ms.some(x => !x.ldr)) { // the bodyguard is gone: the leader fights on alone
    log(`${UD(def).n} falls. ${UNITS[def.lead].n} fights on alone.`);
    def.def = def.lead; def.lead = null; def.startN = ms.length; ms.forEach(x => { x.ldr = false; x.spec = false; });
  }
}
function checkWipe() {
  if (G.over) return;
  const a = unitsOf(0).length, b = unitsOf(1).length;
  if (!a || !b) G.over = { winner: !a && !b ? -1 : a ? 0 : 1, why: 'wipe' };
}

/* ---------- moving ---------- */
function reachable(u, mode, adv = 0) {
  const a = u.models[0], range = (unitM(u) + adv) / SQ, occ = occMap(), out = new Set();
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (Math.hypot(c - a.x, r - a.y) > range + .01) continue;
    const h = occ[key(c, r)]; if (h && h.u !== u) continue;
    if (adjEnemy(c, r, u.side, occ)) continue;
    out.add(key(c, r));
  }
  return out;
}
function moveUnit(u, c, r) {
  const save = u.models.map(m => [m.x, m.y]);
  const ok = formation(u, { x: c, y: r }, (x, y, occ) => !adjEnemy(x, y, u.side, occ));
  if (!ok) { u.models.forEach((m, i) => { m.x = save[i][0]; m.y = save[i][1]; }); return false; }
  return true;
}
function chargeMove(u, v, roll) {
  const occ = occMap(); for (const m of u.models) delete occ[key(m.x, m.y)];
  const reach = roll / SQ + .5;
  // best spot next to the target that the leading model can reach
  let best = null;
  for (const t of v.models) for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) {
    const c = t.x + dc, r = t.y + dr; if (!inBoard(c, r) || occ[key(c, r)]) continue;
    const d = Math.min(...u.models.map(m => Math.hypot(m.x - c, m.y - r)));
    if (d <= reach && (!best || d < best.d)) best = { x: c, y: r, d };
  }
  if (!best) return false;
  return formation(u, best, (x, y, o) => { for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) { const h = o[key(x + dc, y + dr)]; if (h && h.u.side !== u.side && h.u !== v) return false; } return true; });
}

/* ---------- the AI general ---------- */
const AI = {
  noise() { return G.cfg.diff === 'easy' ? Math.random() * 6 : G.cfg.diff === 'hard' ? 0 : Math.random() * 1.5; },
  isMelee(u) { const fake = { models: [{ x: 0, y: 0 }] }; let m = 0, r = 0; for (const g of meleeGroups(u)) { const w = WP(g.wid); m += avgExpr(w.A) * g.models * w.S * avgExpr(w.D); } for (const md of u.models) for (const wid of md.guns) { const w = WP(wid); r += avgExpr(w.A) * w.S * avgExpr(w.D) * (w.kw.torrent ? 1.5 : 1); } return m > r * 1.3; },
  maxRange(u) { let r = 0; for (const m of u.models) for (const wid of m.guns) r = Math.max(r, WP(wid).r); return r; },
  cellScore(u, c, r, side) {
    const ctl = objControl(), melee = AI.isMelee(u), oc = unitOC(u);
    let s = 0;
    OBJECTIVES.forEach(([oc0, or0], i) => {
      const d = Math.hypot(c - oc0, r - or0);
      const want = ctl[i] === side ? 3 : ctl[i] === -1 ? 9 : 11;
      if (d <= 1.6) s += want + Math.min(6, oc * .5); else s -= d * (melee ? .15 : .35) * (want / 9);
    });
    const enemies = unitsOf(enemyOf(side)); let nearest = 1e9;
    for (const v of enemies) for (const m of v.models) nearest = Math.min(nearest, Math.hypot(m.x - c, m.y - r) * SQ);
    if (melee) s -= nearest * .35;
    else { const R = AI.maxRange(u); if (nearest <= R) s += 4; else s -= (nearest - R) * .25; if (nearest < 6 && !UD(u).vehicle) s -= 3; }
    if (TERRAIN[key(c, r)] && TERRAIN[key(c, r)] !== 'ruin') s += 1.5; else if (TERRAIN[key(c, r)] === 'ruin') s += 2;
    return s;
  },
  bestMove(u, adv) {
    const R = reachable(u, 'move', adv); let best = null;
    for (const k of R) { const [c, r] = k.split(',').map(Number); const s = AI.cellScore(u, c, r, u.side) + AI.noise(); if (!best || s > best.s) best = { c, r, s }; }
    return best;
  },
  pickShot(u) {
    let best = null;
    for (const v of shootTargets(u)) {
      let s = expected(u, v, false); const left = v.models.reduce((a, m) => a + m.w, 0), val = v.pts / v.wStart;
      s *= val; if (s * 1.2 >= left * val) s += 3;
      if (objControl().some((x, i) => x !== u.side && v.models.some(m => Math.hypot(m.x - OBJECTIVES[i][0], m.y - OBJECTIVES[i][1]) <= 1.6))) s *= 1.4;
      s += AI.noise() * .3;
      if (!best || s > best.s) best = { v, s };
    }
    return best && best.s > .05 ? best.v : null;
  },
  chargeOdds(need, bonus, reroll) { let p = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a + b + bonus >= need) p++; p /= 36; return reroll ? 1 - (1 - p) * (1 - p) : p; },
  pickCharge(u) {
    let best = null;
    for (const v of chargeTargets(u)) {
      const p = AI.chargeOdds(chargeNeed(u, v), chargeBonus(u), hasRule(u, 'rerollCharge') || leadIs(u, 'chargeRR') || u.adrenal);
      const gain = expected(u, v, true) - expected(v, u, true) * .5;
      const s = p * gain + (AI.isMelee(u) ? 1.5 : -1) + AI.noise() * .2;
      if (p > .25 && (!best || s > best.s)) best = { v, s };
    }
    return best && best.s > .8 ? best.v : null;
  },
  shootGambits(u, v) {
    const s = u.side, e = expected(u, v, false);
    if (e >= 3 && canGamb(s, 'focus')) { useGamb(s, 'focus'); u.focus = true; }
    if (u.oath && e >= 3 && G.cp[s] >= 2 && canGamb(s, 'oath')) { useGamb(s, 'oath'); u.oath = false; }
    if (e >= 3 && G.cp[s] >= 2 && canGamb(s, 'overc')) { useGamb(s, 'overc'); u.overc = true; }
  },
  rapidGambit(u) {
    if (!u.models.length || !u.advanced || u.charged || u.fellBack || engaged(u) || !AI.isMelee(u) || !canGamb(u.side, 'rapid') || !chargeTargets(u).length) return;
    u.rapid = true; if (AI.pickCharge(u)) useGamb(u.side, 'rapid'); else u.rapid = false;
  },
  surgeGambit(u, v) {
    if (canGamb(u.side, 'surge') && chargeNeed(u, v) - chargeBonus(u) >= 8) { useGamb(u.side, 'surge'); u.surge = true; }
    if (canGamb(u.side, 'adrenal') && !hasRule(u, 'rerollCharge') && chargeNeed(u, v) - chargeBonus(u) >= 7) { useGamb(u.side, 'adrenal'); u.adrenal = true; }
  },
  pickFight(u) { let best = null; for (const v of engagedWith(u)) { const s = expected(u, v, true); if (!best || s > best.s) best = { v, s }; } return best ? best.v : null; }
};

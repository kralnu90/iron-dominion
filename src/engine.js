
/* ============================================================================
   IRON DOMINION: rules engine (state, measuring, attacks) and the AI general
   ============================================================================ */
let G = null;
const WP = id => WEAPONS[id];
const UD = u => UNITS[u.def];
const d6 = () => 1 + Math.floor(Math.random() * 6);
const rollExpr = e => typeof e === 'number' ? e : e === 'D3' ? Math.ceil(d6() / 2) : e === 'D6+1' ? d6() + 1 : e === '2D6' ? d6() + d6() : d6();
const avgExpr = e => typeof e === 'number' ? e : e === 'D3' ? 2 : e === 'D6+1' ? 4.5 : 3.5;
const key = (c, r) => c + ',' + r;
const inBoard = (c, r) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const enemyOf = s => 1 - s;
const unitsOf = s => G.units.filter(u => u.side === s && u.models.length);
const liveUnits = () => G.units.filter(u => u.models.length);
const cheb = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const sqd = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let NEXT_ID = 1;
const nd = n => n === 1 ? '1 die' : n + ' dice';

/* ---------- building armies ---------- */
function makeUnit(def, side) {
  const D = UNITS[def], models = [];
  D.models.forEach(([n, guns, melee], gi) => { for (let k = 0; k < n; k++) models.push({ id: NEXT_ID++, x: -1, y: -1, w: D.W, guns: guns.slice(), melee: melee.slice(), spec: gi > 0 }); });
  return { uid: NEXT_ID++, def, side, models, startN: models.length, moved: false, advanced: false, fellBack: false, shot: false, charged: false, fought: false, shaken: false, oath: false };
}
function newBattle(cfg) {
  NEXT_ID = 1;
  G = { cfg, round: 1, turn: 0, phase: 'command', cp: [0, 0], vp: [0, 0], players: cfg.players, units: [], log: [], over: null, first: 0, cmdUsed: [false, false], score: [[], []] };
  cfg.players.forEach((p, s) => ARMIES[p.army].list.forEach(def => G.units.push(makeUnit(def, s))));
  deploy(0); deploy(1);
  G.first = G.turn = Math.random() < .5 ? 0 : 1;
  log(`${pname(G.first)} wins the roll-off and takes the first turn.`);
  return G;
}
const pname = s => G.players[s].name;
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
  const us = G.units.filter(u => u.side === side), slots = [[7, 1], [3, 1], [11, 1], [5, 3], [9, 3], [1, 3], [13, 3], [7, 2]];
  us.forEach((u, i) => {
    let [c, r] = slots[i % slots.length]; if (side === 0) { c = COLS - 1 - c; r = ROWS - 1 - r; }
    formation(u, { x: c, y: r }, (x, y) => side === 1 ? y <= 3 : y >= ROWS - 4);
  });
}
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
    for (const u of liveUnits()) { if (u.shaken) continue; for (const m of u.models) if (Math.hypot(m.x - c, m.y - r) <= 1.6) oc[u.side] += UD(u).OC; }
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
function saveNeed(def, AP, cover) { const D = UD(def); let sv = D.Sv - AP - (cover ? 1 : 0); sv = Math.max(2, sv); if (D.ward && D.ward < sv) sv = D.ward; return sv; }
/* the weapons a unit can bring to bear on a target: [{wid, attacks, half}] */
function shootingGroups(att, def) {
  const groups = {}, moved = att.advanced;
  for (const m of att.models) for (const wid of m.guns) {
    const w = WP(wid); if (moved && !w.kw.assault) continue;
    let best = 1e9, seen = false;
    for (const t of def.models) { const d = sqd(m, t) * SQ; if (d <= w.r && los(m, t)) { seen = true; best = Math.min(best, d); } }
    if (!seen) continue;
    const g = groups[wid] = groups[wid] || { wid, models: 0, half: true };
    g.models++; if (best > w.r / 2) g.half = false;
  }
  return Object.values(groups);
}
function meleeGroups(att) { const g = {}; for (const m of att.models) for (const wid of m.melee) { g[wid] = g[wid] || { wid, models: 0, half: true }; g[wid].models++; } return Object.values(g); }
function canShoot(u) { if (!u.models.length || u.shot || u.fellBack || engaged(u)) return false; return shootTargets(u).length > 0; }
function shootTargets(u) { return liveUnits().filter(v => v.side !== u.side && shootingGroups(u, v).length && !engaged(v)); }
function chargeTargets(u) { return liveUnits().filter(v => v.side !== u.side && unitDistIn(u, v) <= 12); }
function canCharge(u) { return u.models.length && !u.advanced && !u.fellBack && !u.charged && !engaged(u) && chargeTargets(u).length; }
function chargeBonus(u) { let b = 0; for (const v of unitsOf(u.side)) if (UD(v).rule && UD(v).rule.id === 'chargeAura' && v !== u && unitDistIn(u, v) <= 6) b = 1; if (UD(u).rule && UD(u).rule.id === 'chargeAura') b = 1; return b; }
const chargeNeed = (u, v) => Math.max(2, Math.ceil(unitDistIn(u, v) - SQ));
function hitRerollOnes(u) { for (const v of unitsOf(u.side)) if (UD(v).rule && UD(v).rule.id === 'rerollOnes' && unitDistIn(u, v) <= 6) return true; return false; }
/* expected damage (for the AI and the hint line) */
function expected(att, def, melee) {
  const groups = melee ? meleeGroups(att) : shootingGroups(att, def); let dmg = 0;
  const T = UD(def).T, cover = !melee && inCover(def, att), Wt = UD(def).W;
  for (const g of groups) {
    const w = WP(g.wid); let A = avgExpr(w.A) * g.models; if (w.kw.rapid && g.half) A += w.kw.rapid * g.models;
    const S = w.S + (melee && att.chargedNow && att.side !== undefined && G.players[att.side].army === 'rust' ? 1 : 0);
    const pH = w.kw.torrent ? 1 : Math.min(5 / 6, Math.max(1 / 6, (7 - Math.max(2, w.sk - (w.kw.heavy && stationary(att) ? 1 : 0))) / 6));
    let pW = (7 - woundNeed(S, T)) / 6; if (w.kw.twin) pW = 1 - (1 - pW) * (1 - pW);
    const sv = saveNeed(def, w.AP, cover), pF = sv >= 7 ? 1 : (sv - 1) / 6;
    let D = avgExpr(w.D) + (w.kw.melta && g.half ? w.kw.melta : 0); D = Math.min(D, Wt);
    dmg += A * pH * pW * pF * D;
  }
  return dmg;
}

/* ---------- resolving an attack (dice go through the Tray) ---------- */
async function resolveAttack(att, def, melee) {
  const groups = melee ? meleeGroups(att) : shootingGroups(att, def), cover = !melee && inCover(def, att);
  const T = UD(def).T, rustFury = melee && att.chargedNow && G.players[att.side].army === 'rust';
  let killed = 0;
  for (const g of groups) {
    if (!def.models.length) break;
    const w = WP(g.wid);
    let A = 0; for (let k = 0; k < g.models; k++) A += rollExpr(w.A); if (w.kw.rapid && g.half) A += w.kw.rapid * g.models;
    const S = w.S + (rustFury ? 1 : 0), head = `${UD(att).n} → ${UD(def).n}: ${g.models > 1 ? g.models + '× ' : ''}${w.n}`;
    // hit
    let hits;
    if (w.kw.torrent) { hits = A; await Tray.note(head, `${A} automatic hit${A === 1 ? '' : 's'} (torrent).`); }
    else {
      const need = Math.max(2, w.sk - (w.kw.heavy && stationary(att) ? 1 : 0));
      const dice = await Tray.step({ kind: 'hit', title: head, label: `Roll to hit: ${nd(A)}, ${need}+ to hit${w.kw.heavy && stationary(att) ? ' (heavy, stood still)' : ''}`, n: A, need, side: att.side, rrOnes: hitRerollOnes(att), oath: G.players[att.side].army === 'covenant' && !att.oath ? att : null });
      hits = dice.filter(v => v >= need).length;
    }
    if (!hits) { log(`${head}: no hits.`); continue; }
    // wound
    const wn = woundNeed(S, T);
    const wd = await Tray.step({ kind: 'wound', title: head, label: `Roll to wound: ${nd(hits)}, S${S} vs T${T} needs ${wn}+${w.kw.twin ? ' (twin: re-roll fails)' : ''}`, n: hits, need: wn, side: att.side, rrFails: !!w.kw.twin });
    const wounds = wd.filter(v => v >= wn).length;
    if (!wounds) { log(`${head}: ${hits} hit${hits > 1 ? 's' : ''}, no wounds.`); continue; }
    // save (the defender rolls)
    const sv = saveNeed(def, w.AP, cover);
    let fails = wounds;
    if (sv <= 6) {
      const sd = await Tray.step({ kind: 'save', title: `${UD(def).n} save`, label: `Roll saves: ${nd(wounds)}, ${sv}+ to save${cover ? ' (in cover)' : ''}${UD(def).ward && UD(def).ward === sv ? ' (ward)' : ''}`, n: wounds, need: sv, side: def.side });
      fails = sd.filter(v => v < sv).length;
    } else await Tray.note(`${UD(def).n} save`, `No save possible against AP${w.AP}.`);
    if (!fails) { log(`${head}: ${wounds} wound${wounds > 1 ? 's' : ''}, all saved.`); continue; }
    // damage
    let dmgs = [];
    if (typeof w.D === 'number') dmgs = Array(fails).fill(w.D);
    else { const dd = await Tray.step({ kind: 'damage', title: head, label: `Roll damage: ${fails} × ${w.D}`, n: fails, need: 0, side: att.side, plain: true }); dmgs = dd.map(v => w.D === 'D3' ? Math.ceil(v / 2) : w.D === 'D6+1' ? v + 1 : v); }
    if (w.kw.melta && g.half) dmgs = dmgs.map(d => d + w.kw.melta);
    const before = def.models.length;
    for (const d of dmgs) { if (!def.models.length) break; allocate(def, d); }
    killed += before - def.models.length;
    const msg = `${head}: ${wounds} wound${wounds > 1 ? 's' : ''}, ${fails} unsaved, ${before - def.models.length} model${before - def.models.length === 1 ? '' : 's'} slain.`;
    log(msg); await Tray.result(msg, def);
  }
  if (!def.models.length) { log(`${UD(def).n} is wiped out!`); Sfx.play('lose'); }
  checkWipe();
  return killed;
}
function allocate(def, dmg) {
  // wounded models take damage first, then plain models, specialists last
  let m = def.models.find(x => x.w < UD(def).W) || def.models.filter(x => !x.spec).slice(-1)[0] || def.models[def.models.length - 1];
  m.w -= dmg; if (m.w <= 0) def.models.splice(def.models.indexOf(m), 1);
}
function checkWipe() {
  if (G.over) return;
  const a = unitsOf(0).length, b = unitsOf(1).length;
  if (!a || !b) G.over = { winner: !a && !b ? -1 : a ? 0 : 1, why: 'wipe' };
}

/* ---------- moving ---------- */
function reachable(u, mode, adv = 0) {
  const a = u.models[0], range = (UD(u).M + adv) / SQ, occ = occMap(), out = new Set();
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
    const ctl = objControl(), melee = AI.isMelee(u), oc = UD(u).OC * u.models.length;
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
      let s = expected(u, v, false); const left = v.models.reduce((a, m) => a + m.w, 0);
      s *= UD(v).pts / (UD(v).W * v.startN);
      if (s * 1.2 >= left * UD(v).pts / (UD(v).W * v.startN)) s += 3;
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
      const p = AI.chargeOdds(chargeNeed(u, v), chargeBonus(u), UD(u).rule && UD(u).rule.id === 'rerollCharge');
      const gain = expected(u, v, true) - expected(v, u, true) * .5;
      const s = p * gain + (AI.isMelee(u) ? 1.5 : -1) + AI.noise() * .2;
      if (p > .25 && (!best || s > best.s)) best = { v, s };
    }
    return best && best.s > .8 ? best.v : null;
  },
  pickFight(u) { let best = null; for (const v of engagedWith(u)) { const s = expected(u, v, true); if (!best || s > best.s) best = { v, s }; } return best ? best.v : null; }
};

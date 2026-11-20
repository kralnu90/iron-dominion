/* ============================================================================
   IRON DOMINION: Muster. Army lists (points, squad sizes, wargear, leaders),
   saved lists, random forces for the AI, and the army builder screens.
   A list entry is { k: key, d: datasheet id, s: size index, o: { optionId: choice }, at: key of the unit a leader joins }
   ============================================================================ */
const newKey = () => Math.random().toString(36).slice(2, 9);
const entryPts = e => UNITS[e.d].sizes[e.s || 0].pts;
const entryModels = e => UNITS[e.d].sizes[e.s || 0].n;
const listPts = L => L.units.reduce((a, e) => a + entryPts(e), 0);
const listModels = L => L.units.reduce((a, e) => a + entryModels(e), 0);
const armyOf = d => Object.keys(ARMIES).find(a => ARMIES[a].roster.includes(d));
const maxOf = d => UNITS[d].role === 'Core troops' ? 6 : UNITS[d].role === 'Leader' ? 2 : 3;
const sizeCfg = pts => POINTS.find(p => p.pts === pts) || POINTS[0];

/* the models an entry fields: [[count, guns, melee], ...] after size and wargear */
function buildModels(e) {
  const U = UNITS[e.d];
  const groups = U.models.map(([n, g, m]) => [n, g.slice(), m.slice()]);
  for (const o of U.opts) if (o.x2 && e.s) groups[o.g][0] *= 2; // big squads get two special weapons
  groups[0][0] += entryModels(e) - groups.reduce((a, g) => a + g[0], 0);
  for (const o of U.opts) { const c = (e.o || {})[o.id] || 0; groups[o.g][o.f === 'guns' ? 1 : 2] = o.ch[c].slice(); }
  return groups;
}
function starterList(army) {
  const A = ARMIES[army], units = A.list.map(d => ({ k: newKey(), d, s: 0, o: {} }));
  if (A.leadsInto != null) units[0].at = units[A.leadsInto].k;
  return { id: 'starter-' + army, name: 'Starter force', army, sub: A.sub, pts: 500, units, builtIn: true };
}
/* problems that stop a list from being taken to battle */
function listProblems(L) {
  const P = [], pts = listPts(L), cfg = sizeCfg(L.pts), cnt = {};
  if (!L.units.length) return ['Add some units'];
  if (pts > L.pts) P.push(`${pts - L.pts} points over the ${L.pts} limit`);
  if (!L.units.some(e => UNITS[e.d].role === 'Leader')) P.push('Needs at least one Leader to command it');
  L.units.forEach(e => cnt[e.d] = (cnt[e.d] || 0) + 1);
  for (const [d, n] of Object.entries(cnt)) if (n > maxOf(d)) P.push(`Too many ${UNITS[d].n} (max ${maxOf(d)})`);
  const m = listModels(L); if (m > cfg.maxModels) P.push(`${m} models won't fit the deployment zone (max ${cfg.maxModels})`);
  return P;
}
/* units a leader could join: the right datasheet, not already led */
function bodyguards(L, le) {
  return L.units.filter(e => UNITS[le.d].leads && UNITS[le.d].leads.includes(e.d) && !L.units.some(x => x !== le && x.at === e.k));
}
function tidyList(L) { const ks = new Set(L.units.map(e => e.k)); for (const e of L.units) if (e.at && (!ks.has(e.at) || !bodyguards(L, e).some(b => b.k === e.at))) delete e.at; }

/* a random, legal force: used for the AI general and the "Random force" option */
function randomList(army, pts) {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const L = { id: 'random', name: 'Random force', army, sub: pick(Object.keys(SUBS[army])), pts, units: [] };
  const roster = ARMIES[army].roster, cfg = sizeCfg(pts);
  const fits = (d, s) => { const e = { d, s }; return listPts(L) + entryPts(e) <= pts && listModels(L) + entryModels(e) <= cfg.maxModels && L.units.filter(x => x.d === d).length < maxOf(d); };
  const add = (d, s) => { const o = {}; UNITS[d].opts.forEach(op => o[op.id] = Math.random() < .5 ? 0 : Math.floor(Math.random() * op.ch.length)); L.units.push({ k: newKey(), d, s, o }); };
  add(pick(roster.filter(d => UNITS[d].role === 'Leader')), 0);
  const core = roster.find(d => UNITS[d].role === 'Core troops'); add(core, Math.random() < .3 && pts > 500 ? 1 : 0);
  for (let guard = 0; guard < 40; guard++) {
    const opts = [];
    for (const d of roster) UNITS[d].sizes.forEach((_, s) => { if (!fits(d, s)) return; const w = UNITS[d].role === 'Leader' ? .5 : UNITS[d].role === 'Core troops' ? 2.5 : 2; opts.push([d, s, s ? w * .5 : w]); });
    if (!opts.length) break;
    let r = Math.random() * opts.reduce((a, x) => a + x[2], 0); const ch = opts.find(x => (r -= x[2]) <= 0) || opts[0];
    add(ch[0], ch[1]);
  }
  for (const le of L.units.filter(e => UNITS[e.d].role === 'Leader')) { const bg = bodyguards(L, le); if (bg.length && Math.random() < .8) le.at = pick(bg).k; }
  return L;
}

/* ---------- saved lists and the builder screens ---------- */
const Muster = {
  cur: null,
  all() { return Store.get('lists', []); },
  put(ls) { Store.set('lists', ls); },
  get(id) { return this.all().find(L => L.id === id); },
  L() { return this.get(this.cur); },
  commit(L) { tidyList(L); const ls = this.all(), i = ls.findIndex(x => x.id === L.id); if (i >= 0) ls[i] = L; else ls.push(L); this.put(ls); this.draw(); },
  col(army) { return ARMIES[army].col; },
  /* the list of saved armies */
  home() {
    this.cur = null;
    const ls = this.all();
    Shell.screen(`<div class="mus">
      <div class="mus-top"><button class="b" onclick="Shell.menu()">← Back</button><h2>Muster</h2><span></span></div>
      <p class="tag">Build your armies: pick units, squad sizes and wargear, and attach your leaders. Lists save on your phone.</p>
      ${ls.length ? ls.map(L => { const P = listProblems(L); return `<button class="lrow" onclick="Muster.edit('${L.id}')" style="--c:${this.col(L.army)}"><b>${esc(L.name)}</b><span>${ARMIES[L.army].short} · ${SUBS[L.army][L.sub].n} · ${listPts(L)}/${L.pts} pts</span>${P.length ? `<em>⚠ ${P[0]}</em>` : `<i>Ready for battle</i>`}</button>`; }).join('') : `<div class="empty">No army lists yet. The starter forces are always there when you play.</div>`}
      <button class="tile big" onclick="Muster.create()"><span>＋</span>New army list</button></div>`);
  },
  async create() {
    const army = await choose('Which army?', Object.values(ARMIES).map(a => `<b style="color:${a.col}">${a.n}</b>: ${a.blurb}`).join('<br><br>'), Object.entries(ARMIES).map(([k, a]) => ({ l: a.short, v: k })).concat([{ l: 'Back', v: null }]));
    if (!army) return;
    const pts = await choose('Battle size', 'How many points can this army spend?', POINTS.map(p => ({ l: `${p.pts} pts · ${p.n}`, v: p.pts })).concat([{ l: 'Back', v: null }]));
    if (!pts) return;
    const sub = await this.pickSub(army); if (!sub) return;
    const start = await choose('Start from', '', [{ l: 'An empty list', v: 'empty', p: 1 }, { l: 'The starter force', v: 'starter' }]);
    const L = { id: newKey(), name: `${ARMIES[army].short} ${pts}`, army, sub, pts, units: [] };
    if (start === 'starter') L.units = starterList(army).units;
    this.cur = L.id; this.commit(L);
  },
  pickSub(army) {
    return choose('Choose a sub-faction', 'Its rule applies to your whole army.', Object.entries(SUBS[army]).map(([k, x]) => ({ l: `<b>${x.n}</b><small>${x.tag}. ${x.rn}: ${x.txt}</small>`, v: k })).concat([{ l: 'Back', v: null }]));
  },
  edit(id) { this.cur = id; this.draw(); },
  /* the list editor */
  draw() {
    const L = this.L(); if (!L) return this.home();
    const pts = listPts(L), P = listProblems(L), sub = SUBS[L.army][L.sub], pct = Math.min(100, pts / L.pts * 100);
    const leadOf = e => L.units.find(x => x.at === e.k), rows = [];
    for (const e of L.units) {
      if (e.at && L.units.some(x => x.k === e.at)) continue; // leaders show under their unit
      const U = UNITS[e.d], le = leadOf(e);
      rows.push(`<button class="urow" onclick="Muster.unit('${e.k}')"><span class="ic">${U.ic}</span><span class="nm"><b>${U.n}${U.sizes.length > 1 || entryModels(e) > 1 ? ` ×${entryModels(e)}` : ''}</b><small>${this.gearText(e) || U.role}</small></span><span class="pt">${entryPts(e)}</span></button>`);
      if (le) rows.push(`<button class="urow led" onclick="Muster.unit('${le.k}')"><span class="ic">${UNITS[le.d].ic}</span><span class="nm"><b>${UNITS[le.d].n}</b><small>Leading the ${U.n}${this.gearText(le) ? ' · ' + this.gearText(le) : ''}</small></span><span class="pt">${entryPts(le)}</span></button>`);
    }
    Shell.screen(`<div class="mus">
      <div class="mus-top"><button class="b" onclick="Muster.home()">← Lists</button><input class="lname" value="${esc(L.name)}" maxlength="28" onchange="Muster.rename(this.value)" aria-label="List name"><button class="b" onclick="Muster.more()">⋯</button></div>
      <div class="lhead" style="--c:${this.col(L.army)}"><b>${ARMIES[L.army].n}</b><button class="chip" onclick="Muster.changeSub()">${sub.n} ▾</button>
        <div class="sub-txt"><b>${sub.rn}:</b> ${sub.txt}</div>
        <div class="bar"><div style="width:${pct}%;background:${pts > L.pts ? '#c0261c' : 'var(--c)'}"></div></div>
        <div class="bar-l"><span>${pts} / ${L.pts} pts</span><span>${listModels(L)} models</span></div>
        ${P.length ? `<div class="probs">${P.map(x => `<div>⚠ ${x}</div>`).join('')}</div>` : `<div class="okay">✔ Ready for battle</div>`}</div>
      <div class="urows">${rows.join('') || '<div class="empty">No units yet.</div>'}</div>
      <button class="tile" onclick="Muster.addSheet()"><span>＋</span>Add unit</button>
      <button class="tile big" ${P.length ? 'disabled' : ''} onclick="Muster.battle()"><span>⚔</span>Battle with this list</button></div>`);
  },
  gearText(e) {
    const U = UNITS[e.d], out = [];
    for (const o of U.opts) { const c = (e.o || {})[o.id] || 0; if (c) out.push(o.ch[c].map(w => WEAPONS[w].n).join(' + ')); }
    return out.join(', ');
  },
  rename(v) { const L = this.L(); L.name = v.trim().slice(0, 28) || 'My army'; this.commit(L); },
  async changeSub() { const L = this.L(), s = await this.pickSub(L.army); if (s) { L.sub = s; this.commit(L); } },
  async more() {
    const L = this.L();
    const v = await choose(esc(L.name), '', [{ l: '⧉ Duplicate list', v: 'dup' }, { l: '⇄ Change battle size', v: 'size' }, { l: '🗑 Delete list', v: 'del' }, { l: 'Back', v: null, p: 1 }]);
    if (v === 'dup') { const c = JSON.parse(JSON.stringify(L)); c.id = newKey(); c.name = (L.name + ' copy').slice(0, 28); this.cur = c.id; this.commit(c); toast('List copied'); }
    else if (v === 'size') { const p = await choose('Battle size', '', POINTS.map(p => ({ l: `${p.pts} pts · ${p.n}`, v: p.pts, p: p.pts === L.pts }))); if (p) { L.pts = p; this.commit(L); } }
    else if (v === 'del') { const ok = await choose('Delete this list?', `"${esc(L.name)}" will be gone for good.`, [{ l: 'Delete', v: 1 }, { l: 'Keep', v: 0, p: 1 }]); if (ok) { this.put(this.all().filter(x => x.id !== L.id)); this.home(); } }
  },
  statLine(U) { return `M${U.M}" T${U.T} Sv${U.Sv}+ W${U.W} Ld${U.Ld}+ OC${U.OC}${U.ward ? ` · ward ${U.ward}+` : ''}`; },
  addSheet() {
    const L = this.L(), left = L.pts - listPts(L);
    sheet(`<h2>Add a unit</h2><p class="small">${left} points left.</p><div class="dlist">${ARMIES[L.army].roster.map(d => {
      const U = UNITS[d], n = L.units.filter(e => e.d === d).length, full = n >= maxOf(d), cheap = U.sizes[0].pts <= left;
      return `<div class="ds"><div class="ds-h"><span class="ic">${U.ic}</span><b>${U.n}</b><span class="pt">${U.sizes.map(s => s.pts).join(' / ')} pts</span></div>
        <div class="small">${U.role} · ${U.sizes.map(s => s.n).join(' or ')} model${U.sizes[0].n > 1 ? 's' : ''} · ${this.statLine(U)}</div>
        ${U.rule ? `<div class="small rl">${U.rule.n}: ${U.rule.txt}</div>` : ''}${U.lead ? `<div class="small rl">Leading: ${U.lead.n}: ${U.lead.txt} Joins ${U.leads.map(x => UNITS[x].n).join(' or ')}.</div>` : ''}
        <button class="b ${cheap && !full ? 'gold' : ''}" ${full ? 'disabled' : ''} onclick="Muster.add('${d}')">${full ? `Max ${maxOf(d)}` : cheap ? '＋ Add' : '＋ Add (over points)'}</button></div>`;
    }).join('')}</div>`);
  },
  add(d) { const L = this.L(), e = { k: newKey(), d, s: 0, o: {} }; L.units.push(e); if (UNITS[d].lead) { const bg = bodyguards(L, e); if (bg.length) e.at = bg[0].k; } closeSheet(); this.commit(L); toast(`${UNITS[d].n} added`); },
  unit(k) {
    const L = this.L(), e = L.units.find(x => x.k === k); if (!e) return;
    const U = UNITS[e.d], ws = {};
    buildModels(e).forEach(([n, g, m]) => g.concat(m).forEach(w => ws[w] = (ws[w] || 0) + n));
    const wl = Object.entries(ws).map(([w, n]) => { const x = WEAPONS[w]; return `<div class="wl"><b>${n > 1 ? n + '× ' : ''}${x.n}</b> <span>${x.r ? x.r + '"' : 'Melee'} · A${x.A} · ${x.kw.torrent ? 'auto' : x.sk + '+'} · S${x.S} · AP${x.AP} · D${x.D}${Object.keys(x.kw).length ? ' · ' + Object.keys(x.kw).join(', ') : ''}</span></div>`; }).join('');
    const sizes = U.sizes.length > 1 ? `<div class="set"><span>Squad size</span><div class="seg">${U.sizes.map((s, i) => `<button class="b ${(e.s || 0) === i ? 'gold' : ''}" onclick="Muster.setSize('${k}',${i})">${s.n} · ${s.pts} pts</button>`).join('')}</div></div>` : '';
    const opts = U.opts.map(o => `<label class="set"><span>${o.n}</span><select onchange="Muster.setOpt('${k}','${o.id}',+this.value)">${o.ch.map((c, i) => `<option value="${i}" ${((e.o || {})[o.id] || 0) === i ? 'selected' : ''}>${c.map(w => WEAPONS[w].n).join(' + ')}</option>`).join('')}</select></label>`).join('');
    let lead = '';
    if (U.lead) { const bg = bodyguards(L, e); lead = `<label class="set"><span>Leads</span><select onchange="Muster.setLead('${k}',this.value)"><option value="">Nobody (fights alone)</option>${bg.map(b => `<option value="${b.k}" ${e.at === b.k ? 'selected' : ''}>${UNITS[b.d].n} ×${entryModels(b)}</option>`).join('')}</select></label><p class="small">${U.lead.n}: ${U.lead.txt} The leader takes wounds last.</p>`; }
    sheet(`<h2>${U.ic} ${U.n}</h2><p class="small">${U.role} · ${entryPts(e)} pts · ${this.statLine(U)}</p>${wl}
      ${U.rule ? `<div class="rule"><b>${U.rule.n}:</b> ${U.rule.txt}</div>` : ''}${sizes}${opts}${lead}
      ${U.opts.length ? `<p class="small">Wargear swaps are free: pick what suits your plan.${U.opts.some(o => o.x2) && U.sizes.length > 1 ? ' A full-size squad carries two special weapons.' : ''}</p>` : ''}
      <div class="dlg-btns"><button class="b" onclick="Muster.dup('${k}')">⧉ Copy unit</button><button class="b danger" onclick="Muster.remove('${k}')">🗑 Remove</button></div>`);
  },
  edit1(k, fn) { const L = this.L(), e = L.units.find(x => x.k === k); if (!e) return; fn(e, L); this.commit(L); this.unit(k); },
  setSize(k, i) { this.edit1(k, e => e.s = i); },
  setOpt(k, id, i) { this.edit1(k, e => { e.o = e.o || {}; e.o[id] = i; }); },
  setLead(k, t) { this.edit1(k, e => { if (t) e.at = t; else delete e.at; }); },
  dup(k) { const L = this.L(), e = L.units.find(x => x.k === k); const c = JSON.parse(JSON.stringify(e)); c.k = newKey(); delete c.at; L.units.splice(L.units.indexOf(e) + 1, 0, c); closeSheet(); this.commit(L); toast('Unit copied'); },
  remove(k) { const L = this.L(); L.units = L.units.filter(x => x.k !== k); closeSheet(); this.commit(L); },
  async battle() { const L = this.L(); if (listProblems(L).length) return; Shell.play(L); }
};
function esc(t) { return String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

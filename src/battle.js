
/* ============================================================================
   IRON DOMINION: the dice tray, the battlefield view and the turn flow
   ============================================================================ */
const sleep = ms => new Promise(r => setTimeout(r, ms * (window.SPEED_MUL ?? 1)));
const isAI = s => G.players[s].type === 'ai';

/* ---------- the hands-on dice tray ---------- */
const Tray = {
  headless: false, el: null,
  quick() { return this.headless || Settings.quick; },
  rollN(n) { return Array.from({ length: n }, d6); },
  die(v, cls = '', i = -1) {
    const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v] || [];
    return `<div class="die ${cls}" ${i >= 0 ? `data-i="${i}"` : ''}>${Array.from({ length: 9 }, (_, k) => `<span class="${P.includes(k) ? 'pip' : ''}"></span>`).join('')}</div>`;
  },
  open(html) {
    if (!this.el) { this.el = document.createElement('div'); this.el.id = 'tray'; document.body.appendChild(this.el); }
    this.el.innerHTML = `<div class="tray-in">${html}</div>`; this.el.classList.add('on');
  },
  close() { if (this.el) this.el.classList.remove('on'); },
  autoPolicy(o, d) { // rerolls the AI (or quick dice) takes on its own
    const fail = v => o.need ? v < o.need : false;
    if (o.kind === 'save' || o.kind === 'fnp') return d;
    if (o.rrFails) d = d.map(v => fail(v) ? d6() : v);
    else if (o.rrOnes) d = d.map(v => v === 1 ? d6() : v);
    if (o.oath && d.filter(fail).length > d.length / 2) { o.oath.oath = true; d = d.map(v => fail(v) ? d6() : v); }
    if (o.sum && o.rrAll && d.reduce((a, b) => a + b, 0) + (o.bonus || 0) < o.need) d = this.rollN(d.length);
    return d;
  },
  async step(o) {
    if (!o.n) return [];
    let d = this.rollN(o.n);
    if (this.quick() || isAI(o.side)) {
      d = this.autoPolicy(o, d);
      if (this.quick()) return d;
      await this.show(o, d, true);
      return d;
    }
    return this.interactive(o);
  },
  ok(o, v) { return o.plain ? true : o.kind === 'save' ? v >= o.need : v >= o.need; },
  sumLine(o, d) { const s = d.reduce((a, b) => a + b, 0) + (o.bonus || 0); return `<div class="tray-sum ${s >= o.need ? 'good' : 'bad'}">${s}${o.bonus ? ` (incl. +${o.bonus})` : ''} ${s >= o.need ? '✔' : '✘'} needs ${o.need}</div>`; },
  async show(o, d, auto) { // the AI rolling in front of you
    Sfx.play('dice');
    this.open(`<div class="tray-title">${o.title}</div><div class="tray-label">${G.players[o.side].name} rolls · ${o.label}</div><div class="dice rolling">${d.map(() => this.die(d6())).join('')}</div>`);
    await this.tumble(d);
    const html = d.map(v => this.die(v, o.sum || o.plain ? '' : this.ok(o, v) ? 'good' : 'bad')).join('');
    this.el.querySelector('.dice').classList.remove('rolling'); this.el.querySelector('.dice').innerHTML = html;
    if (o.sum) this.el.querySelector('.tray-in').insertAdjacentHTML('beforeend', this.sumLine(o, d));
    else if (!o.plain) this.el.querySelector('.tray-in').insertAdjacentHTML('beforeend', `<div class="tray-sum">${d.filter(v => this.ok(o, v)).length} of ${d.length} ${o.kind === 'save' ? 'saved' : o.kind === 'fnp' ? 'ignored' : 'succeed'}</div>`);
    await this.waitTap(Settings.fast ? 700 : 1500);
  },
  async tumble(d) { const box = this.el.querySelector('.dice'); for (let k = 0; k < 6; k++) { box.innerHTML = d.map(() => this.die(d6())).join(''); await sleep(55); } },
  waitTap(ms) { return new Promise(res => { let done = false; const go = () => { if (done) return; done = true; this.el.removeEventListener('click', go); res(); }; this.el.addEventListener('click', go); setTimeout(go, ms); }); },
  interactive(o) {
    return new Promise(res => {
      let d = Array(o.n).fill(0), rolled = false, swept = false, usedOnes = false, usedFails = false, picking = false, cmdUsed = G.cmdUsed[o.side];
      const fail = v => o.plain || o.sum ? false : !this.ok(o, v);
      const draw = () => {
        const btns = [];
        if (!rolled) btns.push(`<button class="b gold big" data-a="roll">🎲 Roll ${o.n} ${o.n === 1 ? 'die' : 'dice'}</button>`);
        else if (!swept) {
          if (o.rrOnes && !usedOnes && d.some(v => v === 1)) btns.push(`<button class="b" data-a="ones">↻ Re-roll 1s</button>`);
          if (o.rrFails && !usedFails && d.some(fail)) btns.push(`<button class="b" data-a="fails">↻ Re-roll fails</button>`);
          if (o.oath && !o.oath.oath && d.some(fail)) btns.push(`<button class="b" data-a="oath">⚜ Oath of Iron: re-roll fails</button>`);
          if (o.sum && o.rrAll && !usedFails) btns.push(`<button class="b" data-a="all">↻ Re-roll the charge</button>`);
          if (!cmdUsed && G.cp[o.side] >= 1) btns.push(`<button class="b ${picking ? 'gold' : ''}" data-a="cmd">${picking ? 'Tap a die to re-roll' : '✦ Command re-roll (1 CP)'}</button>`);
          if (o.sum || o.plain) btns.push(`<button class="b gold" data-a="done">Continue →</button>`);
          else btns.push(`<button class="b gold" data-a="sweep">${o.kind === 'save' ? '🧹 Clear saved dice' : o.kind === 'fnp' ? '🧹 Sweep away failed rolls' : '🧹 Sweep away misses'}</button>`);
        } else btns.push(`<button class="b gold big" data-a="done">Continue →</button>`);
        const shown = d.map((v, i) => [v, i]).filter(([v]) => !swept || (o.kind === 'save' ? !this.ok(o, v) : this.ok(o, v)));
        const n = shown.length;
        const after = swept ? `<div class="tray-sum ${n ? 'good' : 'bad'}">${o.kind === 'save' ? `${n} unsaved` : o.kind === 'fnp' ? `${n} ignored` : `${n} ${o.kind === 'hit' ? 'hit' : 'wound'}${n === 1 ? '' : 's'}`}</div>` : '';
        this.open(`<div class="tray-title">${o.title}</div><div class="tray-label">${G.players[o.side].name} · ${o.label}</div>
          <div class="dice ${picking ? 'picking' : ''}">${shown.map(([v, i]) => rolled ? this.die(v, o.sum || o.plain ? '' : fail(v) ? 'bad' : 'good', i) : this.die(0, 'blank', i)).join('')}</div>
          ${rolled && o.sum ? this.sumLine(o, d) : ''}${after}<div class="tray-btns">${btns.join('')}</div>`);
        this.el.querySelectorAll('[data-a]').forEach(b => b.onclick = e => { e.stopPropagation(); act(b.dataset.a); });
        if (picking) this.el.querySelectorAll('.die[data-i]').forEach(x => x.onclick = e => { e.stopPropagation(); const i = +x.dataset.i; d[i] = d6(); G.cp[o.side]--; G.cmdUsed[o.side] = true; cmdUsed = true; picking = false; Sfx.play('dice'); draw(); Battle.render(); });
      };
      const reroll = async (pred) => { const idx = d.map((v, i) => pred(v) ? i : -1).filter(i => i >= 0); Sfx.play('dice'); for (let k = 0; k < 5; k++) { idx.forEach(i => d[i] = d6()); draw(); await sleep(50); } idx.forEach(i => d[i] = d6()); draw(); };
      const act = async a => {
        if (a === 'roll') { rolled = true; Sfx.play('dice'); this.open(`<div class="tray-title">${o.title}</div><div class="dice rolling">${d.map(() => this.die(d6())).join('')}</div>`); await this.tumble(d); d = this.rollN(o.n); draw(); }
        else if (a === 'ones') { usedOnes = true; await reroll(v => v === 1); }
        else if (a === 'fails') { usedFails = true; await reroll(fail); }
        else if (a === 'oath') { o.oath.oath = true; await reroll(fail); }
        else if (a === 'all') { usedFails = true; await reroll(() => true); }
        else if (a === 'cmd') { picking = !picking; draw(); }
        else if (a === 'sweep') { swept = true; Sfx.play('sweep'); draw(); }
        else if (a === 'done') { res(d); }
      };
      draw();
    });
  },
  async note(title, text) { if (this.quick()) return; this.open(`<div class="tray-title">${title}</div><div class="tray-label">${text}</div>`); await this.waitTap(Settings.fast ? 600 : 1200); },
  async result(msg) { if (this.quick()) return; this.open(`<div class="tray-title">Result</div><div class="tray-label">${msg}</div>`); Sfx.play('hit'); await this.waitTap(Settings.fast ? 700 : 1400); this.close(); }
};

/* ---------- battlefield view and turn flow ---------- */
const Battle = {
  root: null, ui: { sel: null, mode: null, reach: null, targets: null }, endPhase: null, sid: 0,
  start(cfg) { newBattle(cfg); this.sid++; this.ui = {}; Tray.close(); this.render(); this.loop(this.sid); },
  resume(state) { G = migrate(state); NEXT_ID = Math.max(...G.units.flatMap(u => [u.uid, ...u.models.map(m => m.id)])) + 1; this.sid++; this.ui = {}; this.render(); this.loop(this.sid, true); },
  alive(my) { if (my !== this.sid) throw 'abort'; },
  async loop(my, resumed) {
    try {
      let skipStart = resumed;
      while (!G.over) {
        await this.playerTurn(G.turn, my, skipStart); skipStart = false; this.alive(my);
        if (G.over) break;
        const vp = scoreTurn(G.turn); if (vp) { log(`${pverb(G.turn, 'scores', 'score')} ${vp} VP from objectives.`); toast(`${pverb(G.turn, 'scores', 'score')} ${vp} VP`); }
        for (const [id, v] of scoreMissions(G.turn)) { log(`${pverb(G.turn, 'completes', 'complete')} ${MISSIONS[id].n}: +${v} VP.`); toast(`${MISSIONS[id].n}: +${v} VP`); Sfx.play('win'); await sleep(Settings.fast ? 500 : 1100); this.alive(my); }
        if (G.turn !== G.first) { if (G.round >= 5) { G.over = { winner: G.vp[0] > G.vp[1] ? 0 : G.vp[1] > G.vp[0] ? 1 : -1, why: 'vp' }; break; } G.round++; }
        G.turn = enemyOf(G.turn); this.render();
      }
      this.finish();
    } catch (e) { if (e !== 'abort') console.error(e); }
  },
  async playerTurn(s, my, resumed) {
    if (!resumed) {
      for (const u of unitsOf(s)) Object.assign(u, { moved: false, advanced: false, fellBack: false, shot: false, charged: false, chargedNow: false, fought: false, mvDone: false, rapid: false, surge: false, focus: false, adrenal: false });
      G.kills = [];
      for (const u of unitsOf(enemyOf(s))) Object.assign(u, { chargedNow: false, fought: false });
      setPhase('command'); G.cp[0]++; G.cp[1]++; G.cmdUsed = [false, false]; drawMissions(s);
      this.banner(`Round ${G.round} · ${pname(s)}`, 'Command phase'); this.render(); await sleep(Settings.fast ? 300 : 700); this.alive(my);
      for (const u of unitsOf(s)) {
        u.shaken = false;
        const D = UD(u), Ld = unitLd(u), below = u.startN > 1 ? u.models.length * 2 < u.startN : u.models[0].w * 2 <= MW(u.models[0]);
        if (!below) continue;
        if (unitsOf(s).some(v => hasRule(v, 'linkAura') && (v === u || unitDistIn(u, v) <= 9))) { log(`${D.n} is held by the Brood Link.`); continue; }
        const d = await Tray.step({ kind: 'test', sum: true, title: `${D.n}: battle-shock test`, label: `Below half strength. Roll 2D6, needs ${Ld}+`, n: 2, need: Ld, side: s }); this.alive(my);
        const t = d[0] + d[1];
        if (t < Ld) {
          let hold = false;
          if (canGamb(s, 'hold')) { if (isAI(s)) hold = onObjective(u); else if (!Tray.headless) { Tray.close(); hold = await choose(`${D.n} wavers`, `They rolled ${t} and failed the battle-shock test. Spend 1 CP on <b>Hold Fast</b> to pass it instead? You have ${G.cp[s]} CP.`, [{ l: '⚑ Hold Fast (1 CP)', v: true, p: 1 }, { l: 'Let them waver', v: false }]); this.alive(my); } }
          if (hold) { useGamb(s, 'hold'); log(`${D.n} holds fast.`); } else { u.shaken = true; log(`${D.n} is shaken (rolled ${t}).`); }
        } else log(`${D.n} holds firm (rolled ${t}).`);
      }
      Tray.close();
    }
    if (isAI(s)) {
      await this.aiTurn(s, my);
    } else {
      if (!resumed || G.phase === 'command') setPhase('move');
      const order = ['move', 'shoot', 'charge'];
      for (let k = order.indexOf(G.phase); k < 3 && !G.over; k++) {
        if (G.phase !== order[k]) setPhase(order[k]); this.ui = {}; this.banner(`${pname(s)}`, { move: 'Movement phase', shoot: 'Shooting phase', charge: 'Charge phase' }[G.phase]);
        Shell.save(); this.render();
        await new Promise(r => this.endPhase = r); this.alive(my);
      }
    }
    if (!G.over) await this.fightPhase(s, my);
  },
  async aiTurn(s, my) {
    const pause = async ms => { this.render(); await sleep(Settings.fast ? ms * .4 : ms); this.alive(my); };
    setPhase('move'); this.banner(pname(s), 'Movement phase'); await pause(500);
    for (const u of unitsOf(s)) {
      if (engaged(u)) { if (!AI.isMelee(u) && expected(engagedWith(u)[0], u, true) > expected(u, engagedWith(u)[0], true)) { const b = AI.bestMove(u, 0); if (b) { moveUnit(u, b.c, b.r); u.fellBack = true; u.moved = true; log(`${UD(u).n} falls back.`); await pause(500); } } continue; }
      let adv = 0;
      if (AI.isMelee(u)) { const near = Math.min(...unitsOf(enemyOf(s)).map(v => unitDistIn(u, v))); if (near > unitM(u) + 9) { adv = d6(); u.advanced = true; } }
      const b = AI.bestMove(u, adv);
      if (b && (b.c !== u.models[0].x || b.r !== u.models[0].y)) { moveUnit(u, b.c, b.r); u.moved = true; if (adv) log(`${UD(u).n} advances ${adv}".`); this.ui.flash = u.uid; await pause(450); }
    }
    this.ui.flash = null;
    setPhase('shoot'); this.banner(pname(s), 'Shooting phase'); await pause(500);
    for (const u of unitsOf(s)) { if (!canShoot(u)) continue; const v = AI.pickShot(u); if (!v) continue; this.ui = { sel: u.uid, aim: v.uid }; this.render(); AI.shootGambits(u, v); Sfx.play('shot'); await resolveAttack(u, v, false); u.shot = true; this.alive(my); Tray.close(); await pause(300); if (G.over) return; }
    setPhase('charge'); this.ui = {}; this.banner(pname(s), 'Charge phase'); await pause(500);
    for (const u of unitsOf(s)) { AI.rapidGambit(u); if (!canCharge(u)) continue; const v = AI.pickCharge(u); if (!v) continue; AI.surgeGambit(u, v); this.ui = { sel: u.uid, aim: v.uid }; await this.doCharge(u, v, my); await pause(400); }
    this.ui = {};
  },
  async doCharge(u, v, my) {
    const need = chargeNeed(u, v), bonus = chargeBonus(u);
    const d = await Tray.step({ kind: 'charge', sum: true, title: `${UD(u).n} charges ${UD(v).n}!`, label: `Roll 2D6${bonus ? ' +' + bonus : ''}, needs ${need}" to reach`, n: 2, need, bonus, side: u.side, rrAll: hasRule(u, 'rerollCharge') || leadIs(u, 'chargeRR') || !!u.adrenal });
    this.alive(my); Tray.close();
    u.charged = true; u.surge = false; u.adrenal = false;
    const roll = d[0] + d[1] + bonus;
    if (roll >= need && chargeMove(u, v, roll)) { u.chargedNow = true; u.moved = true; log(`${UD(u).n} charges into ${UD(v).n} (rolled ${roll}).`); Sfx.play('charge'); toast(`${UD(u).n} charges home!`); }
    else { log(`${UD(u).n} fails the charge (rolled ${roll}, needed ${need}).`); toast('Charge failed'); }
    this.render();
  },
  async fightPhase(s, my) {
    setPhase('fight'); this.ui = {};
    const queue = () => liveUnits().filter(u => !u.fought && engaged(u));
    if (!queue().length) return;
    this.banner(pname(s), 'Fight phase'); this.render(); await sleep(Settings.fast ? 300 : 700); this.alive(my);
    let side = s, guard = 0;
    while (queue().length && guard++ < 40 && !G.over) {
      const q = queue(), chargers = q.filter(u => u.chargedNow && u.side === s);
      let u = chargers[0] || q.find(x => x.side === side) || q[0];
      let v;
      if (!isAI(u.side) && engagedWith(u).length > 1) v = await this.pickTarget(u, engagedWith(u), `${UD(u).n} fights: tap the enemy to attack`);
      else v = AI.pickFight(u) || engagedWith(u)[0];
      this.alive(my);
      if (v) { this.ui = { sel: u.uid, aim: v.uid }; this.render(); Sfx.play('clash'); await resolveAttack(u, v, true); this.alive(my); Tray.close(); }
      u.fought = true; side = enemyOf(u.side); this.render();
    }
    this.ui = {};
  },
  pickTarget(u, list, msg) {
    return new Promise(res => { this.ui = { sel: u.uid, mode: 'pick', targets: new Set(list.map(v => v.uid)), pickRes: res, msg }; this.render(); });
  },
  finish() {
    Tray.close(); this.render(); Shell.clearSave();
    const o = G.over, w = o.winner, human = G.players.findIndex(p => p.type === 'human');
    const title = w === -1 ? 'A bloody stalemate' : G.players.every(p => p.type === 'human') ? `${pname(w)} is victorious!` : w === human ? 'Victory!' : 'Defeat';
    Sfx.play(w === human || (w >= 0 && G.players[w].type === 'human') ? 'win' : 'lose');
    const sv = s => G.sec ? ` <small>(${G.vp[s] - G.sec.vp[s]} objectives, ${G.sec.vp[s]} missions)</small>` : '';
    Shell.endScreen(title, `${o.why === 'wipe' ? 'An army was wiped out.' : 'Five battle rounds are over.'}<br>${pname(0)} ${G.vp[0]} VP${sv(0)}<br>${pname(1)} ${G.vp[1]} VP${sv(1)}`);
  },
  /* ---------- player input ---------- */
  mySide() { return isAI(G.turn) ? null : G.turn; },
  tapCell(c, r) {
    if (!G || G.over) return;
    const h = occMap()[key(c, r)], ui = this.ui;
    if (ui.mode === 'pick') { if (h && ui.targets.has(h.u.uid)) { const res = ui.pickRes; this.ui = {}; res(h.u); } return; }
    const s = this.mySide(); if (s === null || G.phase === 'fight' || G.phase === 'command') { if (h) { this.ui.view = h.u.uid; this.render(); } return; }
    if ((ui.mode === 'move' || ui.mode === 'advance' || ui.mode === 'fallback') && ui.reach.has(key(c, r)) && (!h || h.u.uid === ui.sel)) {
      const u = this.unit(ui.sel);
      if (moveUnit(u, c, r)) { u.moved = true; u.mvDone = true; if (ui.mode === 'fallback') u.fellBack = true; if (ui.mode === 'advance') u.advanced = true; Sfx.play('move'); log(`${UD(u).n} ${ui.mode === 'advance' ? 'advances' : ui.mode === 'fallback' ? 'falls back' : 'moves'}.`); }
      else toast('Not enough room there.');
      this.ui = { sel: u.uid }; this.render(); return;
    }
    if ((ui.mode === 'shoot' || ui.mode === 'charge') && h && ui.targets.has(h.u.uid)) { this.fire(h.u); return; }
    if (h) { this.ui = { sel: h.u.side === s ? h.u.uid : null, view: h.u.uid }; Sfx.play('tap'); this.render(); }
    else { this.ui = {}; this.render(); }
  },
  unit(uid) { return G.units.find(u => u.uid === uid); },
  async act(a) {
    const u = this.unit(this.ui.sel), my = this.sid;
    if (a === 'end') { const r = this.endPhase; this.endPhase = null; this.ui = {}; if (r) r(); return; }
    if (!u) return;
    if (a === 'move' || a === 'fallback') { this.ui = { sel: u.uid, mode: a, reach: reachable(u, a, 0) }; }
    else if (a === 'advance') { const d = await Tray.step({ kind: 'adv', plain: true, title: `${UD(u).n} advances`, label: 'Roll 1D6 for extra inches', n: 1, need: 0, side: u.side }); if (my !== this.sid) return; Tray.close(); this.ui = { sel: u.uid, mode: 'advance', reach: reachable(u, 'advance', d[0]), adv: d[0] }; toast(`+${d[0]}" this move. No shooting (except assault weapons) or charging.`); }
    else if (a === 'hold') { u.mvDone = true; this.ui = {}; }
    else if (a === 'shoot') { this.ui = { sel: u.uid, mode: 'shoot', targets: new Set(shootTargets(u).map(v => v.uid)) }; }
    else if (a === 'charge') { this.ui = { sel: u.uid, mode: 'charge', targets: new Set(chargeTargets(u).map(v => v.uid)) }; }
    else if (a === 'cancel') { this.ui = { sel: u.uid }; }
    else if (a.startsWith('g_')) {
      const id = a.slice(2); if (!canGamb(u.side, id)) return;
      useGamb(u.side, id);
      if (id === 'focus') { u.focus = true; toast(`${UD(u).n}: +1 to hit this phase`); }
      else if (id === 'oath') { u.oath = false; toast(`${UD(u).n} renews its Oath of Iron`); }
      else if (id === 'rapid') { u.rapid = true; toast(`${UD(u).n} can charge this turn`); }
      else if (id === 'surge') { u.surge = true; toast(`${UD(u).n}: +2 to its charge roll`); }
      else if (id === 'adrenal') { u.adrenal = true; toast(`${UD(u).n} can re-roll its charge`); }
      else if (id === 'overc') { u.overc = true; toast(`${UD(u).n} re-rolls failed wounds this phase`); }
    }
    this.render();
  },
  async fire(v) {
    const u = this.unit(this.ui.sel), my = this.sid, mode = this.ui.mode; this.ui = { sel: u.uid, aim: v.uid }; this.render();
    try {
      if (mode === 'shoot') { Sfx.play('shot'); await resolveAttack(u, v, false); this.alive(my); u.shot = true; Tray.close(); }
      else await this.doCharge(u, v, my);
    } catch (e) { if (e !== 'abort') console.error(e); return; }
    this.ui = {}; this.render();
    if (G.over && this.endPhase) this.act('end');
  },
  banner(a, b) { this.bannerText = [a, b]; const el = document.getElementById('bf-banner'); if (el) { el.innerHTML = `<b>${a}</b><span>${b}</span>`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); } },
  /* ---------- drawing ---------- */
  render() {
    const root = this.root; if (!root || !G) return;
    const W = Math.min(520, root.clientWidth || 380), cell = Math.floor(W / COLS), ui = this.ui, ctl = objControl();
    const col = s => ARMIES[G.players[s].army].col, dark = s => ARMIES[G.players[s].army].dark;
    let tiles = '';
    for (const [k, t] of Object.entries(TERRAIN)) { const [c, r] = k.split(',').map(Number); tiles += `<div class="terr t-${t}" style="left:${c * cell}px;top:${r * cell}px;width:${cell}px;height:${cell}px"></div>`; }
    if (G.round === 1 && G.phase !== 'fight') for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) for (const sd of [0, 1]) if (inZone(sd, c, r, G.cfg.pts)) tiles += `<div class="zone" style="left:${c * cell}px;top:${r * cell}px;width:${cell}px;height:${cell}px;background:${col(sd)}"></div>`;
    if (ui.reach) for (const k of ui.reach) { const [c, r] = k.split(',').map(Number); tiles += `<div class="reach" style="left:${c * cell}px;top:${r * cell}px;width:${cell}px;height:${cell}px"></div>`; }
    const objs = OBJECTIVES.map(([c, r], i) => `<div class="obj" style="left:${(c - 1.1) * cell}px;top:${(r - 1.1) * cell}px;width:${cell * 3.2}px;height:${cell * 3.2}px;border-color:${ctl[i] >= 0 ? col(ctl[i]) : 'rgba(255,255,255,.35)'};background:${ctl[i] >= 0 ? col(ctl[i]) + '22' : 'transparent'}"><span style="background:${ctl[i] >= 0 ? col(ctl[i]) : '#777'}">${i + 1}</span></div>`).join('');
    const models = liveUnits().map(u => {
      const D = UD(u), sel = ui.sel === u.uid, tgt = ui.targets && ui.targets.has(u.uid), aim = ui.aim === u.uid, view = ui.view === u.uid, fl = ui.flash === u.uid;
      return u.models.map((m, i) => `<div class="mdl ${D.vehicle ? 'veh' : ''} ${m.ldr ? 'ldr' : ''} ${sel ? 'sel' : ''} ${tgt ? 'tgt' : ''} ${aim ? 'aim' : ''} ${view && !sel ? 'view' : ''} ${fl ? 'fl' : ''} ${u.shaken ? 'shk' : ''}" style="left:${m.x * cell + cell * .08}px;top:${m.y * cell + cell * .08}px;width:${cell * .84}px;height:${cell * .84}px;background:radial-gradient(circle at 35% 30%,${col(u.side)},${dark(u.side)});font-size:${cell * .48}px">${m.ldr ? UNITS[m.p].ic : i === 0 || D.vehicle ? D.ic : ''}${m.w < MW(m) ? `<i class="wd">${m.w}</i>` : ''}</div>`).join('');
    }).join('');
    const s = this.mySide(), u = this.unit(ui.sel), vu = this.unit(ui.view || ui.sel);
    root.innerHTML = `
      <div class="hud">
        <div class="side s0" style="--c:${col(0)}"><b>${pname(0)}</b><span>${G.vp[0]} VP · ${G.cp[0]} CP</span></div>
        <div class="rnd" onclick="Shell.missions()"><b>Round ${G.round}/5 <i class="mi">📜</i></b><span>${{ command: 'Command', move: 'Movement', shoot: 'Shooting', charge: 'Charge', fight: 'Fight' }[G.phase] || ''}</span></div>
        <div class="side s1" style="--c:${col(1)}"><b>${pname(1)}</b><span>${G.vp[1]} VP · ${G.cp[1]} CP</span></div>
      </div>
      <div class="board-wrap"><div id="board" class="board" style="width:${cell * COLS}px;height:${cell * ROWS}px;background-size:${cell}px ${cell}px">${tiles}${objs}${models}<div id="bf-banner" class="banner">${this.bannerText ? `<b>${this.bannerText[0]}</b><span>${this.bannerText[1]}</span>` : ''}</div></div></div>
      <div class="panel">${this.panelHtml(s, u, vu)}</div>`;
    const b = root.querySelector('#board');
    b.onclick = e => { const r = b.getBoundingClientRect(); this.tapCell(Math.floor((e.clientX - r.left) / cell), Math.floor((e.clientY - r.top) / cell)); };
    root.querySelectorAll('[data-act]').forEach(x => x.onclick = () => this.act(x.dataset.act));
  },
  unitCard(u) {
    if (!u) return '';
    const D = UD(u), ws = {};
    u.models.forEach(m => m.guns.concat(m.melee).forEach(w => ws[w] = (ws[w] || 0) + 1));
    const wl = Object.entries(ws).map(([w, n]) => { const x = WP(w); return `<div class="wl"><b>${n > 1 ? n + '× ' : ''}${x.n}</b> <span>${x.r ? x.r + '"' : 'Melee'} · A${x.A} · ${x.kw.torrent ? 'auto' : x.sk + '+'} · S${x.S} · AP${x.AP} · D${x.D}${Object.keys(x.kw).length ? ' · ' + Object.keys(x.kw).join(', ') : ''}</span></div>`; }).join('');
    const flags = [u.shaken && 'Shaken', u.moved && (u.advanced ? 'Advanced' : u.fellBack ? 'Fell back' : 'Moved'), u.shot && 'Shot', u.chargedNow && 'Charged', engaged(u) && 'In combat'].filter(Boolean);
    return `<div class="card"><div class="card-h"><b style="color:${ARMIES[G.players[u.side].army].col}">${D.ic} ${D.n}</b><span>${u.models.length}/${u.startN} models · ${u.lead ? 'Led unit' : D.role}</span></div>
      <div class="stats">${['M', 'T', 'Sv', 'W', 'Ld', 'OC'].map(k => `<div><i>${k}</i><b>${k === 'M' ? unitM(u) + '"' : k === 'T' ? unitT(u) : k === 'Sv' ? saveNeed(u, 0, false) + '+' : k === 'Ld' ? unitLd(u) + '+' : k === 'OC' ? modelOC(u, u.models.find(m => !m.ldr) || u.models[0]) : D[k]}</b></div>`).join('')}${D.ward ? `<div><i>Ward</i><b>${D.ward}+</b></div>` : ''}</div>
      ${wl}${D.rule ? `<div class="rule"><b>${D.rule.n}:</b> ${D.rule.txt}</div>` : ''}${(() => { if (!u.lead) return ''; const L = UNITS[u.lead]; return `<div class="rule ldr-line"><b>${L.ic} Led by ${L.n}</b> (W${L.W}, Sv${L.Sv}+${L.ward ? `, ward ${L.ward}+` : ''}, takes wounds last)${L.rule ? `<br><b>${L.rule.n}:</b> ${L.rule.txt}` : ''}<br><b>${L.lead.n}:</b> ${L.lead.txt}</div>`; })()}${(() => { const x = subOf(u.side); return x ? `<div class="rule sub-line"><b>${x.rn}</b> (${x.n}): ${x.txt}</div>` : ''; })()}${flags.length ? `<div class="flags">${flags.map(f => `<span>${f}</span>`).join('')}</div>` : ''}</div>`;
  },
  panelHtml(s, u, vu) {
    const ui = this.ui, B = (a, t, cls = '') => `<button class="b ${cls}" data-act="${a}">${t}</button>`;
    if (G.over) return `<div class="msg">The battle is over.</div>`;
    if (ui.mode === 'pick') return `<div class="msg">${ui.msg}</div>`;
    if (s === null) return `<div class="msg">${pverb(G.turn, 'is', 'are')} ${{ move: 'moving', shoot: 'shooting', charge: 'charging', fight: 'fighting', command: 'giving orders' }[G.phase] || 'thinking'}…</div>${this.unitCard(vu)}`;
    if (G.phase === 'fight' || G.phase === 'command') return `<div class="msg">${G.phase === 'fight' ? 'Combat is being resolved…' : 'Command phase'}</div>${this.unitCard(vu)}`;
    let act = '', hint = '';
    const phaseHint = { move: 'Tap one of your units, then choose how it moves.', shoot: 'Tap a unit that can shoot, then tap Shoot and pick a target.', charge: 'Tap a unit within 12" of the enemy to charge.' }[G.phase];
    if (u && u.side === s) {
      if (ui.mode && ui.mode !== 'pick') { hint = ui.mode === 'shoot' ? 'Tap a glowing enemy unit to shoot it.' : ui.mode === 'charge' ? 'Tap a glowing enemy unit to charge it.' : 'Tap a highlighted square to move there.'; act = B('cancel', 'Cancel'); }
      else if (G.phase === 'move') {
        if (u.mvDone) hint = `${UD(u).n} has finished moving.`;
        else if (engaged(u)) act = B('fallback', '↩ Fall back') + B('hold', 'Stay in combat');
        else act = B('move', `➜ Move ${unitM(u)}"`, 'gold') + B('advance', '⇶ Advance') + B('hold', 'Hold');
      } else if (G.phase === 'shoot') { if (canShoot(u)) { act = B('shoot', '🔫 Shoot', 'gold') + (!u.focus && canGamb(s, 'focus') ? B('g_focus', '🎯 Focused Fire · 1 CP', 'gmb') : '') + (u.oath && canGamb(s, 'oath') ? B('g_oath', '⚜ Renewed Oath · 1 CP', 'gmb') : '') + (!u.overc && canGamb(s, 'overc') ? B('g_overc', '⚡ Overcharge · 1 CP', 'gmb') : ''); hint = `Best target: ${(() => { const t = AI.pickShot(u); return t ? UD(t).n + ` (about ${expected(u, t, false).toFixed(1)} damage)` : 'none'; })()}`; } else hint = u.shot ? 'Already fired this turn.' : u.fellBack ? "Can't shoot after falling back." : u.advanced ? 'Advanced units can only fire assault weapons.' : engaged(u) ? 'Locked in combat.' : 'No targets in range and sight.'; }
      else if (G.phase === 'charge') { if (canCharge(u)) act = B('charge', '⚔ Charge', 'gold') + (!u.surge && canGamb(s, 'surge') ? B('g_surge', '⚙ Scrap Surge · 1 CP', 'gmb') : '') + (!u.adrenal && !hasRule(u, 'rerollCharge') && canGamb(s, 'adrenal') ? B('g_adrenal', '♨ Adrenal Surge · 1 CP', 'gmb') : ''); else if (u.advanced && !u.rapid && !u.charged && !engaged(u) && !u.fellBack && chargeTargets(u).length && canGamb(s, 'rapid')) { act = B('g_rapid', '⇶ Rapid Assault · 1 CP', 'gmb'); hint = 'This unit advanced. Rapid Assault lets it charge anyway.'; } else hint = u.charged ? 'Already charged.' : u.advanced || u.fellBack ? "Can't charge after advancing or falling back." : engaged(u) ? 'Already in combat.' : 'No enemy within 12".'; }
    } else hint = phaseHint;
    const next = { move: 'End movement →', shoot: 'End shooting →', charge: 'End charges → Fight' }[G.phase];
    return `${hint ? `<div class="msg">${hint}</div>` : ''}<div class="acts">${act}${B('end', next, 'end')}</div>${this.unitCard(vu)}`;
  }
};
function toast(t) { let el = document.getElementById('toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); } el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), 2200); }

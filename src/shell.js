
/* ============================================================================
   IRON DOMINION: settings, sound, menus, saves (the Kralnu Standard shell)
   ============================================================================ */
const Store = { get(k, d) { try { const v = localStorage.getItem('idom_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('idom_' + k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem('idom_' + k); } catch (e) {} } };
const Settings = Object.assign({ music: 35, sfx: 70, quick: false, fast: false, diff: 'normal', map: 'random' }, Store.get('settings', {}));
const saveSettings = () => { Store.set('settings', Settings); Sfx.apply(); };
const FORM_ID = '1FAIpQLSe__mPhU5YGi9um01BreqNND9mJwaaChi_4ZCp-7P5JcCJKcw';
const FORM_FIELDS = { rating: 'entry.1904387170', liked: 'entry.2084220988', change: 'entry.1413261780', name: 'entry.1767709403', version: 'entry.1994593489' };
const CHANGES = [
  ['0.3.0', '20 Nov 2026', 'Tactics', ['Gambits: spend command points on Focused Fire, Rapid Assault, Go to Ground, Hold Fast, plus one special order per army', 'Secondary missions: hold two mission cards and score them for bonus VP; swap one for 1 CP', 'Three battlefields: the Ruined Hab-Block, the Crossroads and the Pincer (deploy from opposite corners)', 'Deployment zones are shaded in round 1, and the end screen splits objective and mission VP']],
  ['0.2.0', '20 Nov 2026', 'Muster', ['Muster: build and save your own army lists from the main menu', 'Squad sizes and free wargear swaps (sun rifles, storm hammers, lance cannons, spike launchers and more)', 'Leaders can join a squad: they share its fight, take wounds last and give it a bonus', 'Two new leaders: the Oathkeeper and the Wrenchwright', 'Three sub-factions per army, each with its own army rule', 'Choose 500-point Skirmish or 750-point Clash battles; the AI fields a random force', 'The Rustborn Mob is now Toughness 4 and its hackers are AP0, and attached Scrapkings let their mob re-roll charges, after balance testing']],
  ['0.1.0', '20 Nov 2026', 'First blood', ['The first playable battle: the Ironclad Covenant against the Rust Tide at 500 points', 'Hands-on dice: roll, sweep away misses, tap to re-roll', 'Hold the objectives over five battle rounds, against the AI or a friend', 'Movement, shooting, charges, fights, battle-shock and command re-rolls']]
];

/* ---------- sound: synthesised, no audio files ---------- */
const Sfx = (() => {
  let ctx = null, out = null, mus = null, musT = null, noise = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); out = ctx.createGain(); out.connect(ctx.destination); mus = ctx.createGain(); mus.connect(ctx.destination); const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noise = b; apply(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  function apply() { if (!ctx) return; out.gain.value = Settings.sfx / 100 * .8; mus.gain.value = Settings.music / 100 * .25; if (Settings.music > 0) startMusic(); else stopMusic(); }
  function tone(f, dur, type = 'sine', vol = .5, when = 0, slide = 0, dest) { const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g); g.connect(dest || out); o.start(t); o.stop(t + dur + .05); }
  function burst(dur, cut, vol = .6, when = 0) { const t = ctx.currentTime + when, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noise; f.type = 'lowpass'; f.frequency.value = cut; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * .5); s.stop(t + dur + .05); }
  const S = {
    tap() { tone(700, .05, 'sine', .2); }, move() { burst(.08, 900, .4); tone(120, .1, 'triangle', .25); },
    dice() { for (let i = 0; i < 7; i++) burst(.04, 3000, .5 - i * .05, i * .05 + Math.random() * .03); }, sweep() { burst(.25, 1800, .25); },
    shot() { for (let i = 0; i < 3; i++) { burst(.06, 2500, .5, i * .09); tone(180, .08, 'square', .12, i * .09, 60); } },
    charge() { tone(110, .5, 'sawtooth', .18, 0, 70); burst(.4, 600, .3); }, clash() { for (let i = 0; i < 3; i++) { tone(1400 + Math.random() * 600, .09, 'triangle', .18, i * .12); burst(.05, 4000, .3, i * .12); } },
    hit() { tone(90, .25, 'sine', .5, 0, 45); burst(.1, 700, .4); }, win() { [262, 330, 392, 523].forEach((f, i) => tone(f, .6, 'sawtooth', .12, i * .18)); }, lose() { [220, 196, 147].forEach((f, i) => tone(f, .7, 'sawtooth', .12, i * .25)); }
  };
  function startMusic() { if (musT || !ctx) return; let n = 0; const chords = [[55, 82.4, 110], [49, 73.4, 98], [41.2, 61.7, 82.4], [46.2, 69.3, 92.5]]; const step = () => { if (Settings.music <= 0 || document.hidden) return; const c = chords[n++ % 4]; c.forEach(f => tone(f, 5.5, 'sawtooth', .07, 0, 0, mus)); tone(c[2] * 4, 1.2, 'sine', .04, Math.random() * 3, 0, mus); }; step(); musT = setInterval(step, 5200); }
  function stopMusic() { clearInterval(musT); musT = null; }
  return { play(n) { if (!Settings.sfx || !ensure()) return; try { S[n] && S[n](); } catch (e) {} }, apply, unlock() { ensure(); } };
})();

/* ---------- menus ---------- */
const Shell = {
  screen(html) { document.getElementById('app').innerHTML = html; },
  menu() {
    Battle.sid++; Tray.close(); G = null;
    const save = Store.get('save', null);
    document.body.classList.remove('in-battle');
    this.screen(`<div class="menu">
      <div class="crest"><img src="icons/icon-192.png" alt=""></div>
      <h1>Iron Dominion</h1><p class="tag">A grim war for the last worlds. Hold the line.</p>
      ${save ? `<button class="tile big" onclick="Shell.resume()"><span>▶</span>Continue battle<small>Round ${save.round} · ${save.players[0].name} vs ${save.players[1].name}</small></button>` : ''}
      <button class="tile ${save ? '' : 'big'}" onclick="Shell.play()"><span>⚔</span>${save ? 'New battle' : 'Play'}</button>
      <div class="row3"><button class="tile" onclick="Muster.home()"><span>⚑</span>Muster</button><button class="tile" onclick="Shell.settings()"><span>⚙</span>Settings</button><button class="tile" onclick="Shell.more()"><span>☰</span>More</button></div>
      <button class="tile" data-install><span>⬇</span>Install</button>
      <div class="ver">v${GAME_VERSION} · Stage 3a: Tactics</div></div>`);
  },
  async play(fromList) {
    const mode = await choose('New battle', fromList ? `Taking <b>${esc(fromList.name)}</b> to war. Hold the objectives over five battle rounds.` : 'Hold the objectives over five battle rounds.', [{ l: '🤖 vs AI', v: 'ai', p: 1 }, { l: '👥 Pass & Play', v: 'pp' }, { l: 'Back', v: null }]);
    if (!mode) return;
    const pts = fromList ? fromList.pts : await choose('Battle size', POINTS.map(p => `<b>${p.pts} pts · ${p.n}</b>: about ${p.pts === 500 ? '5 or 6' : '7 to 9'} units a side.`).join('<br>'), POINTS.map((p, i) => ({ l: `${p.pts} pts · ${p.n}`, v: p.pts, p: !i })).concat([{ l: 'Back', v: null }]));
    if (!pts) return;
    const army = fromList ? fromList.army : await choose(mode === 'pp' ? 'Player 1: choose your army' : 'Choose your army', Object.entries(ARMIES).map(([k, a]) => `<b style="color:${a.col}">${a.n}</b>: ${a.blurb}`).join('<br><br>'), Object.entries(ARMIES).map(([k, a]) => ({ l: a.short, v: k })).concat([{ l: 'Back', v: null }]));
    if (!army) return;
    const l1 = fromList ? JSON.parse(JSON.stringify(fromList)) : await this.pickList(army, pts, mode === 'pp' ? 'Player 1' : 'Your');
    if (!l1) return;
    const other = Object.keys(ARMIES).find(k => k !== army);
    const l2 = mode === 'ai' ? randomList(other, pts) : await this.pickList(other, pts, 'Player 2');
    if (!l2) return;
    const players = mode === 'ai' ? [{ name: 'You', army, type: 'human', list: l1 }, { name: 'The AI', army: other, type: 'ai', list: l2 }] : [{ name: 'Player 1', army, type: 'human', list: l1 }, { name: 'Player 2', army: other, type: 'human', list: l2 }];
    this.startBattle({ players, diff: Settings.diff, pts, map: Settings.map });
  },
  async pickList(army, pts, who) {
    const mine = Muster.all().filter(L => L.army === army && L.pts === pts && !listProblems(L).length), opts = [];
    if (pts === 500) opts.push({ l: 'Starter force', v: 'starter', p: 1 });
    mine.forEach(L => opts.push({ l: `${esc(L.name)}<small>${SUBS[army][L.sub].n} · ${listPts(L)} pts</small>`, v: L.id }));
    opts.push({ l: '🎲 Random force', v: 'random', p: !opts.length }, { l: 'Back', v: null });
    const v = await choose(`${who} army list`, `<b style="color:${ARMIES[army].col}">${ARMIES[army].n}</b> at ${pts} points.${mine.length ? '' : ' Build and save your own lists in Muster on the main menu.'}`, opts);
    if (!v) return null;
    return v === 'starter' ? starterList(army) : v === 'random' ? randomList(army, pts) : JSON.parse(JSON.stringify(Muster.get(v)));
  },
  startBattle(cfg) { Store.del('save'); this.battleScreen(); Battle.start(cfg); },
  battleScreen() {
    document.body.classList.add('in-battle');
    this.screen(`<div class="topbar"><button onclick="Shell.pause()">☰</button><span>Iron Dominion</span><button onclick="Shell.howto()">?</button></div><div id="bf"></div>`);
    Battle.root = document.getElementById('bf');
  },
  resume() { const s = Store.get('save', null); if (!s) return this.menu(); this.battleScreen(); Battle.resume(s); },
  save() { if (G && !G.over && Battle.mySide() !== null) Store.set('save', G); },
  clearSave() { Store.del('save'); },
  async pause() {
    const v = await choose('Paused', '', [{ l: '▶ Resume', v: 'r', p: 1 }, { l: '⚙ Settings', v: 's' }, { l: '? How to play', v: 'h' }, { l: '🏠 Main menu', v: 'm' }]);
    if (v === 's') this.settings(true); else if (v === 'h') this.howto(); else if (v === 'm') { this.save(); this.menu(); }
  },
  missions() {
    if (!G || !G.sec) return toast('Missions are drawn at the start of each turn.');
    const me = !isAI(G.turn) ? G.turn : G.players.findIndex(p => p.type === 'human'), s = me < 0 ? 0 : me, o = enemyOf(s), S = G.sec;
    const canSwap = s === G.turn && !isAI(s) && !S.swapped[s] && G.cp[s] >= 1 && ['move', 'shoot', 'charge'].includes(G.phase);
    const card = (id, i, mine) => `<div class="mcard"><div><span class="vp">${MISSIONS[id].vp} VP</span><b>${MISSIONS[id].n}</b></div><div class="small">${MISSIONS[id].txt}</div>${mine && canSwap ? `<button class="b" style="align-self:flex-end" onclick="Shell.swap(${i})">↻ New orders · 1 CP</button>` : ''}</div>`;
    const gl = Object.values(GAMBITS).filter(g => !g.army || g.army === G.players[s].army).map(g => `<div class="gref"><b>${g.ic} ${g.n} · ${g.cp} CP</b> <span class="small">${g.when}.</span> ${g.txt}</div>`).join('');
    sheet(`<h2>📜 ${pname(s) === 'You' ? 'Your' : pname(s) + "'s"} missions</h2>
      <p class="small">Score them at the end of your turn for bonus VP. ${S.vp[s]} VP from missions so far. ${S.swapped[s] ? 'You have already changed orders this turn.' : 'Once per turn you can swap one for 1 CP.'}</p>
      ${S.hand[s].map((id, i) => card(id, i, true)).join('') || '<p class="small">New missions are drawn at the start of your turn.</p>'}
      <h3>${pname(o)}'s missions</h3>${S.hand[o].map(id => card(id, 0, false)).join('') || '<p class="small">None held right now.</p>'}
      <h3>Gambits <small>(you have ${G.cp[s]} CP)</small></h3>${gl}<p class="small">Each Gambit can be used once per phase. Buttons appear on a unit's panel when one can be played, and you'll be asked when one can be used during the enemy's turn.</p>`);
  },
  swap(i) { const s = G.turn; if (isAI(s) || G.sec.swapped[s] || G.cp[s] < 1) return; swapMission(s, i); Sfx.play('tap'); this.missions(); },
  async endScreen(title, msg) {
    const v = await choose(title, msg, [{ l: '⚔ Battle again', v: 'a', p: 1 }, { l: '🏠 Main menu', v: 'm' }, { l: 'Look at the field', v: 's' }]);
    if (v === 'a') this.startBattle(G.cfg); else if (v === 'm') this.menu();
  },
  settings(inBattle) {
    const slider = (k, l) => `<label class="set"><span>${l}</span><input type="range" min="0" max="100" value="${Settings[k]}" oninput="Settings.${k}=+this.value;saveSettings()"></label>`;
    const toggle = (k, l, on, off) => `<label class="set"><span>${l}</span><select onchange="Settings.${k}=this.value==='1';saveSettings()"><option value="0" ${!Settings[k] ? 'selected' : ''}>${off}</option><option value="1" ${Settings[k] ? 'selected' : ''}>${on}</option></select></label>`;
    sheet(`<h2>Settings</h2>${slider('music', 'Music')}${slider('sfx', 'Sound effects')}
      ${toggle('quick', 'Dice', 'Quick (rolled for you)', 'Hands-on (roll them yourself)')}
      ${toggle('fast', 'Game speed', 'Fast', 'Normal')}
      <label class="set"><span>AI general</span><select onchange="Settings.diff=this.value;saveSettings()">${['easy', 'normal', 'hard'].map(d => `<option value="${d}" ${Settings.diff === d ? 'selected' : ''}>${d[0].toUpperCase() + d.slice(1)}</option>`).join('')}</select></label>
      <label class="set"><span>Battlefield</span><select onchange="Settings.map=this.value;saveSettings()"><option value="random">Random</option>${Object.entries(MAPS).map(([k, m]) => `<option value="${k}" ${Settings.map === k ? 'selected' : ''}>${m.n}</option>`).join('')}</select></label>
      <p class="small">The AI and battlefield settings apply from the next battle.</p>
      <button class="b danger" onclick="Shell.reset()">Reset save data</button>`);
  },
  async reset() { const v = await choose('Reset save data?', 'This deletes your battle in progress and your settings.', [{ l: 'Delete', v: 1 }, { l: 'Keep', v: 0, p: 1 }]); if (v) { Store.del('save'); Store.del('settings'); location.reload(); } },
  more() {
    sheet(`<h2>More</h2><div class="grid2">
      <button class="tile" onclick="Shell.howto()"><span>?</span>How to play</button>
      <button class="tile" onclick="Shell.news()"><span>✦</span>What's new</button>
      <button class="tile" onclick="Shell.credits()"><span>★</span>Credits</button>
      <button class="tile" onclick="Shell.review()"><span>✎</span>Review</button>
      <button class="tile" onclick="Shell.support()"><span>♥</span>Support</button>
      <button class="tile" data-get-latest><span>⟳</span>Get latest version</button></div>`);
  },
  howto() {
    sheet(`<h2>How to play</h2><div class="prose">
      <p><b>Goal:</b> score the most victory points (VP) over five battle rounds by holding the five numbered objectives, or wipe out the enemy army.</p>
      <p><b>Your turn</b> has five phases:</p>
      <ol><li><b>Command:</b> both sides gain 1 command point (CP). Your units below half strength take a battle-shock test (2D6, needing their Leadership). Failed units are <i>shaken</i> and can't hold objectives.</li>
      <li><b>Movement:</b> tap a unit, then Move (its M in inches; each square is 2"), Advance (extra D6", but no charging and only assault weapons can fire) or Hold. Units in combat can Fall Back.</li>
      <li><b>Shooting:</b> tap a unit, tap Shoot, then tap a glowing enemy in range and sight. Ruins block sight. Cover gives +1 to saves.</li>
      <li><b>Charge:</b> a unit within 12" of an enemy can charge: roll 2D6 and reach them to get stuck in. Chargers strike first.</li>
      <li><b>Fight:</b> every unit in combat fights, chargers first.</li></ol>
      <p><b>The dice:</b> roll to hit (the weapon's skill or better), sweep away the misses, roll to wound (Strength against Toughness), then the defender rolls saves (worsened by AP). Each unsaved wound deals the weapon's Damage. Re-rolls show up as buttons: tap them, or spend 1 CP on a command re-roll and tap the die you want again.</p>
      <p><b>Objectives:</b> a marker belongs to the side with the most Objective Control (OC) within 3". From round 2, at the end of your turn you score 5 VP for holding one, 5 more for holding two or more, and 5 more for holding more than the enemy.</p>
      <p><b>Battlefields:</b> three maps with their own terrain, objectives and deployment zones (shaded in round 1). Pick one in Settings or leave it on Random.</p>
      <p><b>Gambits:</b> spend command points on special orders such as Focused Fire (+1 to hit), Rapid Assault (charge after advancing), Go to Ground (+1 save when shot) and Hold Fast (pass a battle-shock test). Each one works once per phase. Tap the round box at the top to see them all.</p>
      <p><b>Secondary missions:</b> you hold two mission cards, such as Assassinate or Behind Enemy Lines. Complete one by the end of your turn for 3 to 5 bonus VP, then draw a new one. Tap the 📜 round box to see your cards, and swap one for 1 CP if it's out of reach.</p>
      <p><b>Muster:</b> build your own armies from the main menu. Spend points on units, pick squad sizes and swap wargear for free. Every list needs a Leader.</p>
      <p><b>Leaders</b> can join a squad (gold-ringed on the field). The squad keeps its own stats, the leader takes wounds last, and the squad gets the leader's bonus. If the squad dies, the leader fights on alone.</p>
      <p><b>Sub-factions:</b> each army picks one, and its rule covers the whole army. Tap any unit to see your army's rule on its card.</p>
      <p><b>Tap any model</b> to see its unit's datasheet. Prefer the dice rolled for you? Choose Quick dice in Settings.</p></div>`);
  },
  news() { sheet(`<h2>What's new</h2>${CHANGES.map(([v, d, t, items]) => `<h3>${v} · ${t} <small>${d}</small></h3><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('')}`); },
  credits() {
    sheet(`<h2>Credits</h2><div class="prose center"><img src="icons/icon-192.png" width="72" alt=""><p><b>Iron Dominion</b><br>A Kralnu Games title</p>
      <p>Ideas, design and testing by Kris. Built with Claude, an AI by Anthropic.</p>
      <p>All armies, units, rules text and artwork are original. Iron Dominion is an independent game inspired by tabletop wargaming and is not affiliated with any wargame company.</p>
      <p>Sounds and music are synthesised in the game. No third-party assets.</p>
      <p><a href="https://kralnugames.com" target="_blank" rel="noopener">kralnugames.com</a> · hello@kralnugames.com</p></div>`);
  },
  review() {
    sheet(`<h2>Review</h2><div class="prose"><p>How's the war going? Tell Kris what you think.</p>
      <label class="set"><span>Rating</span><select id="rv-r">${[5, 4, 3, 2, 1].map(n => `<option>${n}</option>`).join('')}</select></label>
      <textarea id="rv-l" placeholder="What did you like?"></textarea><textarea id="rv-c" placeholder="What would you change?"></textarea><input id="rv-n" placeholder="Your name (optional)">
      <button class="b gold" onclick="Shell.sendReview()">Send review</button>
      <p class="small">Or email hello@kralnugames.com</p></div>`);
  },
  sendReview() {
    const q = new URLSearchParams(); const g = id => (document.getElementById(id) || {}).value || '';
    q.set(FORM_FIELDS.rating, g('rv-r')); q.set(FORM_FIELDS.liked, g('rv-l')); q.set(FORM_FIELDS.change, g('rv-c')); q.set(FORM_FIELDS.name, g('rv-n')); q.set(FORM_FIELDS.version, 'Iron Dominion ' + GAME_VERSION);
    fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, { method: 'POST', mode: 'no-cors', body: q }).catch(() => {});
    closeSheet(); toast('Thanks! Your review is on its way.');
  },
  support() { sheet(`<h2>Support</h2><div class="prose center"><p>Enjoying Iron Dominion? You can support Kralnu Games on Ko-fi. It's always free to play, with no ads.</p><a class="b gold" href="https://ko-fi.com/kralnu90" target="_blank" rel="noopener">♥ Ko-fi</a></div>`); }
};

/* ---------- little dialog helpers ---------- */
function choose(title, html, btns) {
  return new Promise(res => {
    const ov = document.createElement('div'); ov.className = 'ov';
    ov.innerHTML = `<div class="dlg"><h2>${title}</h2>${html ? `<div class="dlg-b">${html}</div>` : ''}<div class="dlg-btns">${btns.map((b, i) => `<button class="b ${b.p ? 'gold' : ''}" data-i="${i}">${b.l}</button>`).join('')}</div></div>`;
    ov.onclick = e => { const i = e.target.closest('[data-i]'); if (i) { ov.remove(); res(btns[+i.dataset.i].v); } };
    document.body.appendChild(ov);
  });
}
function sheet(html) { closeSheet(); const ov = document.createElement('div'); ov.className = 'ov'; ov.id = 'sheet'; ov.innerHTML = `<div class="dlg wide">${html}<div class="dlg-btns"><button class="b gold" onclick="closeSheet()">Back</button></div></div>`; ov.onclick = e => { if (e.target === ov) closeSheet(); }; document.body.appendChild(ov); }
function closeSheet() { document.getElementById('sheet')?.remove(); if (G && Battle.root) Battle.render(); }

/* ---------- start ---------- */
window.kgBeforeUpdate = () => Shell.save();
addEventListener('pagehide', () => Shell.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) Shell.save(); });
document.addEventListener('pointerdown', () => Sfx.unlock(), { once: true });
addEventListener('resize', () => { if (G && Battle.root) Battle.render(); });
setTimeout(() => { document.getElementById('splash')?.classList.add('gone'); Shell.menu(); }, 1400);

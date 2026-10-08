// Trusted Tradesmen: tradespeople Willian residents and owners of other accommodation have actually used.
// New tradespeople wait for admin approval; "I've used them too" recommendations go straight on.
// Two or more recommendations = Trusted.
const TRADE_TYPES = ['Builder', 'Plumber', 'Electrician', 'Heating & boilers', 'Roofer', 'Carpenter & joiner',
  'Decorator', 'Gardener', 'Tree surgeon', 'Cleaner', 'Handyman', 'Locksmith', 'Window cleaner', 'Mechanic', 'Other'];
const TRUST_ROLES = ['Resident', 'Accommodation Owner'];
const canRecommend = () => profileOk() && TRUST_ROLES.includes(profile().role);
const whenText = v => v ? new Date(v + '-01').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : null;

function renderTrades(main, hero) {
  let me = null, trades = [], recs = [], filter = '';
  main.innerHTML = hero('Tradespeople Willian residents and owners of other accommodation have used and would use again.')
    + '<div class="btns"><button class="btn terra" id="new">Recommend a tradesperson</button></div>'
    + '<div id="gatebox"></div>'
    + '<form class="card" id="form" hidden>'
    +   '<p class="note" id="who"></p>'
    +   '<label class="f">Name or business<input type="text" id="tname" maxlength="80" minlength="2" required placeholder="e.g. J Smith Plumbing"></label>'
    +   '<label class="f">Trade<select id="ttrade" required><option value="">Choose…</option>' + TRADE_TYPES.map(t => '<option>' + t + '</option>').join('') + '</select></label>'
    +   '<label class="f">Phone<input type="tel" id="tphone" maxlength="30" placeholder="Optional"></label>'
    +   '<label class="f">Website<input type="url" id="tweb" maxlength="200" placeholder="Optional"></label>'
    +   '<label class="f">What did they do for you?<textarea id="tcomment" maxlength="300" rows="3" placeholder="e.g. Fixed our boiler the same day, fair price"></textarea></label>'
    +   '<label class="f">When (roughly)?<input type="month" id="twhen"></label>'
    +   '<p class="note">New tradespeople are checked before they appear, usually within a day.</p>'
    +   '<div class="btns"><button class="btn" id="send">Send</button><button type="button" class="btn ghost" id="cancel">Cancel</button></div>'
    + '</form>'
    + '<p class="note" id="msg" hidden></p>'
    + '<div class="chips" id="chips"></div>'
    + '<div id="list"><p class="note">Loading…</p></div>';
  const $ = id => document.getElementById(id);
  const say = t => { $('msg').textContent = t; $('msg').hidden = !t; };

  const gateMsg = () => !profileOk()
    ? '<section class="card"><b>First, tell us who you are</b><p>To recommend a tradesperson we need your name and whether you’re a resident or own other accommodation here.</p>'
      + '<div class="btns"><a class="btn" href="profile.html?back=' + encodeURIComponent('place.html?p=trades') + '">Fill in my profile</a></div></section>'
    : '<section class="card"><b>Recommendations come from residents and owners</b><p>Only Willian residents and owners of other accommodation can recommend tradespeople, so the list stays first-hand. You can still browse and call anyone here.</p></section>';

  async function load() {
    try {
      me = await ensureUser();
      const [t, r] = await Promise.all([
        sb.from('trades').select('*').eq('village', VILLAGE).neq('status', 'removed'),
        sb.from('trade_recs').select('*')
      ]);
      if (t.error) throw t.error;
      trades = t.data; recs = r.data || [];
      draw();
    } catch (e) { $('list').innerHTML = '<p class="note">Couldn’t load the list. Check your signal and try again.</p>'; }
  }

  function draw() {
    const by = {}; recs.forEach(r => (by[r.trade_id] = by[r.trade_id] || []).push(r));
    const types = [...new Set(trades.map(t => t.trade))].sort();
    $('chips').innerHTML = types.length > 1 ? ['', ...types].map(t => '<button class="fchip" data-f="' + esc(t) + '" aria-pressed="' + (t === filter) + '">' + (t ? esc(t) : 'All') + '</button>').join('') : '';
    const list = trades.filter(t => !filter || t.trade === filter).map(t => ({ ...t, recs: (by[t.id] || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) }))
      .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.recs.length - a.recs.length || a.name.localeCompare(b.name));
    if (!list.length) return $('list').innerHTML = '<section class="card"><p class="note">No tradespeople yet. If you’ve used someone good, be the first to recommend them!</p></section>';
    $('list').innerHTML = list.map(t => {
      const n = t.recs.length, mine = t.recs.some(r => r.user_id === me.id);
      const tel = t.phone && /^[0-9 +()-]+$/.test(t.phone) ? t.phone.replace(/[^0-9+]/g, '') : '';
      const web = t.web && /^https?:\/\//i.test(t.web) ? t.web : t.web ? 'https://' + t.web : '';
      return '<section class="card trade" data-id="' + t.id + '">'
        + '<div class="row"><div><b class="tn">' + esc(t.name) + '</b><div class="muted">' + esc(t.trade) + '</div></div>'
        + (t.status === 'pending' ? '<span class="chip s-pending">Waiting for approval</span>'
           : n >= 2 ? '<span class="chip trusted">✓ Trusted</span>' : '') + '</div>'
        + '<small class="muted">Recommended by ' + n + ' ' + (n === 1 ? 'person' : 'people') + (n === 1 ? ' so far' : '') + '</small>'
        + t.recs.map(r => '<div class="rec">' + (r.comment ? '“' + esc(r.comment) + '” ' : '')
            + '<small>— ' + esc(r.name) + ' (' + esc(r.role) + ')' + (r.used_when ? ', ' + esc(r.used_when) : '') + '</small></div>').join('')
        + '<div class="btns">'
        +   (tel ? '<a class="btn" href="tel:' + tel + '">Call</a>' : '')
        +   (web ? '<a class="btn ghost" target="_blank" rel="noopener" href="' + esc(web) + '">Website</a>' : '')
        +   (t.status === 'live' ? (mine ? '<button class="btn ghost" data-a="unrec">Remove my recommendation</button>' : '<button class="btn ghost" data-a="rec">I’ve used them too</button>') : '')
        + '</div><div class="recform"></div></section>';
    }).join('');
  }

  $('chips').onclick = e => { const b = e.target.closest('.fchip'); if (b) { filter = b.dataset.f; draw(); } };

  $('list').onclick = async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const card = b.closest('.trade'), id = +card.dataset.id;
    if (b.dataset.a === 'unrec') {
      if (!confirm('Remove your recommendation?')) return;
      await sb.from('trade_recs').delete().eq('trade_id', id).eq('user_id', me.id);
      return load();
    }
    if (b.dataset.a === 'rec') {
      if (!canRecommend()) { $('gatebox').innerHTML = gateMsg(); $('gatebox').scrollIntoView({ block: 'center' }); return; }
      const box = card.querySelector('.recform');
      box.innerHTML = '<form class="adm">'
        + '<label class="f">What did they do for you?<textarea maxlength="300" rows="2" placeholder="Optional, but it really helps"></textarea></label>'
        + '<label class="f">When (roughly)?<input type="month"></label>'
        + '<div class="btns"><button class="btn">Add my recommendation</button></div></form>';
      box.querySelector('form').onsubmit = async ev => {
        ev.preventDefault();
        const pr = profile();
        const { error } = await sb.from('trade_recs').insert({ trade_id: id, name: pr.name, role: pr.role,
          comment: box.querySelector('textarea').value.trim() || null, used_when: whenText(box.querySelector('input').value) });
        if (error) return say('Sorry, that didn’t save. Check your signal and try again.');
        say('Thanks! Your recommendation has been added.'); load();
      };
    }
  };

  $('new').onclick = () => {
    say('');
    if (!canRecommend()) { $('gatebox').innerHTML = gateMsg(); $('new').hidden = true; return; }
    const pr = profile(); $('who').textContent = 'Recommending as ' + pr.name + ' (' + pr.role + ')';
    $('form').hidden = false; $('new').hidden = true;
    $('form').scrollIntoView({ block: 'start' }); $('tname').focus({ preventScroll: true });
  };
  $('cancel').onclick = () => { $('form').hidden = true; $('new').hidden = false; };
  $('form').onsubmit = async e => {
    e.preventDefault(); $('send').disabled = true;
    try {
      if (!canRecommend()) throw new Error('profile');
      const pr = profile();
      const { data, error } = await sb.from('trades').insert({ village: VILLAGE, name: $('tname').value.trim(), trade: $('ttrade').value,
        phone: $('tphone').value.trim() || null, web: $('tweb').value.trim() || null }).select('id').single();
      if (error) throw error;
      const r = await sb.from('trade_recs').insert({ trade_id: data.id, name: pr.name, role: pr.role,
        comment: $('tcomment').value.trim() || null, used_when: whenText($('twhen').value) });
      if (r.error) throw r.error;
      $('form').reset(); $('form').hidden = true; $('new').hidden = false;
      say('Thanks! They’ll appear on the list once they’ve been checked.');
      load();
    } catch (err) {
      say(/Too many/.test(err && err.message) ? 'You already have 5 things waiting for approval. Please wait for those to be checked.' : 'Sorry, that didn’t send. Check your signal and try again.');
    }
    $('send').disabled = false;
  };

  if (location.hash === '#post') { history.replaceState(null, '', location.pathname + location.search); $('new').onclick(); }
  load();
}

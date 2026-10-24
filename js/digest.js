// Weekly digest pages (Properties for sale; News later). Villagers see only the latest APPROVED ('live') digest.
async function renderDigest(main, hero, esc, kind, intro, emptyText) {
  main.innerHTML = hero(intro) + '<section class="card" id="dg"><p class="note">Loading…</p></section>';
  const box = document.getElementById('dg');
  try {
    await ensureUser();
    const { data, error } = await sb.from('digests').select('body,published_at').eq('village', VILLAGE).eq('kind', kind).eq('status', 'live')
      .order('published_at', { ascending: false }).limit(1);
    if (error) throw error;
    if (!data.length) { box.innerHTML = '<p class="note">' + esc(emptyText) + '</p>'; return; }
    const when = new Date(data[0].published_at).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    // One row per home, spaced like the Diary: "Street - price - beds/type - Listed by Agent"
    const rows = data[0].body.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
      const parts = l.split(' - ').map(x => x.trim());
      if (parts.length < 2) return '<div class="item"><span>' + esc(l) + '</span></div>';
      const agent = /^listed by /i.test(parts[parts.length - 1]) ? parts.pop() : '';
      return '<div class="item"><b>' + esc(parts.shift()) + '</b>' + (parts.length ? '<span>' + esc(parts.join(' · ')) + '</span>' : '')
        + (agent ? '<small>' + esc(agent) + '</small>' : '') + '</div>';
    }).join('');
    box.innerHTML = rows + '<p class="note">Updated ' + when + '. Prices and availability change, so please check with the agent.</p>';
  } catch (e) {
    box.innerHTML = '<p class="note">Couldn’t reach the latest list. Check your signal and try again.</p>';
  }
}

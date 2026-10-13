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
    box.innerHTML = '<div class="item"><span style="white-space:pre-line">' + esc(data[0].body) + '</span></div>'
      + '<p class="note">Updated ' + when + '. Prices and availability change, so please check with the agent.</p>';
  } catch (e) {
    box.innerHTML = '<p class="note">Couldn’t reach the latest list. Check your signal and try again.</p>';
  }
}

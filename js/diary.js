// Village diary: one-off and repeating entries (bin days, events). Dates are plain 'YYYY-MM-DD' strings.
const DAY = 86400000;
const toDay = s => { const p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY; };
const fromDay = n => new Date(n * DAY).toISOString().slice(0, 10);
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// Every date this entry happens on, between two day numbers (inclusive)
function occurrences(e, from, to) {
  const out = [], s = toDay(e.starts_on), end = e.ends_on ? Math.min(toDay(e.ends_on), to) : to;
  if (!e.every_days) { if (s >= from && s <= end) out.push(s); return out; }
  let d = s < from ? s + Math.ceil((from - s) / e.every_days) * e.every_days : s;
  for (; d <= end; d += e.every_days) out.push(d);
  return out;
}

const REPEATS = [[0, 'Once only'], [7, 'Every week'], [14, 'Every 2 weeks'], [28, 'Every 4 weeks']];
const repeatText = n => (REPEATS.find(r => r[0] === (n || 0)) || [0, 'Every ' + n + ' days'])[1];

// Upcoming list for the diary page: next 28 days, grouped by date
function renderDiary(main, hero, esc) {
  main.innerHTML = hero('What’s coming up in Willian.') + '<section class="card" id="dlist"><p class="note">Loading…</p></section>';
  (async () => {
    try {
      await ensureUser();
      const { data, error } = await sb.from('diary').select('*').eq('village', VILLAGE);
      if (error) throw error;
      const t = toDay(todayStr()), days = {};
      (data || []).forEach(e => occurrences(e, t, t + 27).forEach(d => (days[d] = days[d] || []).push(e)));
      const keys = Object.keys(days).map(Number).sort((a, b) => a - b);
      const label = d => d === t ? 'Today' : d === t + 1 ? 'Tomorrow'
        : new Date(d * DAY).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' });
      document.getElementById('dlist').innerHTML = keys.length
        ? keys.map(d => '<div class="item"><b>' + label(d) + '</b>' + days[d].map(e => '<span>' + esc(e.title)
            + (e.details ? ' <small>' + esc(e.details) + '</small>' : '') + '</span>').join('') + '</div>').join('')
        : '<p class="note">Nothing in the diary yet.</p>';
    } catch (e) {
      document.getElementById('dlist').innerHTML = '<p class="note">Couldn’t reach the diary. Check your signal and try again.</p>';
    }
  })();
}

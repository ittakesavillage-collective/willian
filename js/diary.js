// Village diary: one-off and repeating entries (bin days, events). Dates are plain 'YYYY-MM-DD' strings.
const DAY = 86400000;
const toDay = s => { const p = s.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / DAY; };
const fromDay = n => new Date(n * DAY).toISOString().slice(0, 10);
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

// Every date this entry happens on, between two day numbers (inclusive)
// Day number of the nth (1-4) or last (5) given weekday (0 = Sunday) in a month
function nthWeekday(y, m, wd, n) {
  if (n === 5) { const last = Date.UTC(y, m + 1, 0) / DAY; return last - ((new Date(last * DAY).getUTCDay() - wd + 7) % 7); }
  const first = Date.UTC(y, m, 1) / DAY;
  return first + ((wd - new Date(first * DAY).getUTCDay() + 7) % 7) + (n - 1) * 7;
}

function occurrences(e, from, to) {
  const out = [], s = toDay(e.starts_on), end = e.ends_on ? Math.min(toDay(e.ends_on), to) : to;
  if (e.nth) {
    // Monthly on the first/second/.../last weekday of the starting date's weekday (e.g. first Tuesday)
    const wd = new Date(s * DAY).getUTCDay(), b = new Date(Math.max(from, s) * DAY);
    let y = b.getUTCFullYear(), m = b.getUTCMonth();
    for (let i = 0; i < 40; i++, m++) {
      if (m > 11) { m = 0; y++; }
      const d = nthWeekday(y, m, wd, e.nth);
      if (d > end) break;
      if (d >= s && d >= from) out.push(d);
    }
    return out;
  }
  if (!e.every_days) { if (s >= from && s <= end) out.push(s); return out; }
  let d = s < from ? s + Math.ceil((from - s) / e.every_days) * e.every_days : s;
  for (; d <= end; d += e.every_days) out.push(d);
  return out;
}

// Values: 0 = once, a number = every N days, 'nK' = monthly on the Kth (5 = last) weekday of the first date's weekday
const REPEATS = [[0, 'Once only'], [7, 'Every week'], [14, 'Every 2 weeks'], [21, 'Every 3 weeks'], [28, 'Every 4 weeks'],
  ['n1', 'Monthly, first (same weekday)'], ['n2', 'Monthly, second (same weekday)'], ['n3', 'Monthly, third (same weekday)'],
  ['n4', 'Monthly, fourth (same weekday)'], ['n5', 'Monthly, last (same weekday)']];
const repeatText = n => (REPEATS.find(r => r[0] === (n || 0)) || [0, 'Every ' + n + ' days'])[1];
const ORD = ['', 'first', 'second', 'third', 'fourth', 'last'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const repeatLabel = e => e.nth ? 'Monthly, ' + ORD[e.nth] + ' ' + WEEKDAYS[new Date(toDay(e.starts_on) * DAY).getUTCDay()] : repeatText(e.every_days);

// Upcoming list for the diary page: next six weeks, grouped by date
function renderDiary(main, hero, esc) {
  main.innerHTML = hero('What’s coming up in Willian.') + '<section class="card" id="dlist"><p class="note">Loading…</p></section>';
  (async () => {
    try {
      await ensureUser();
      const { data, error } = await sb.from('diary').select('*').eq('village', VILLAGE);
      if (error) throw error;
      const t = toDay(todayStr()), days = {};
      (data || []).forEach(e => occurrences(e, t, t + 41).forEach(d => (days[d] = days[d] || []).push(e)));
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

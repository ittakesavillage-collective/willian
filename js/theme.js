// Apply saved theme + text size before first paint. Storage can be blocked; never let that break the page.
(function () {
  try {
    var t = localStorage.getItem('willian.theme'), s = localStorage.getItem('willian.size');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    if (s === 'large') document.documentElement.dataset.size = 'large';
  } catch (e) {}
})();

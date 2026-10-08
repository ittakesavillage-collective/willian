// Web push. The public VAPID key belongs in the app; its private half never leaves Michael's
// machine / the Supabase function secrets.
const VAPID_PUBLIC = 'BNhGapFFVYezresAT1VmceLzSsT65GX3k-wc7uwEpapc6EluBva9fkYEf0v9XL6xFxMWQpXFz503V8Bhd6gNQPY';

const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
// iPhones only allow notifications once Willian is on the home screen
const pushNeedsInstall = () => isIOS && !isStandalone;

const b64ToBytes = s => {
  const b = atob((s + '='.repeat((4 - s.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, c => c.charCodeAt(0));
};

async function currentSub() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Must be called straight from a tap (browsers only show the prompt after a user action).
// Returns 'on', 'denied', 'unsupported' or 'error'.
async function enablePush() {
  if (!pushSupported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return 'denied';
  try {
    const reg = await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) });
    const j = sub.toJSON();
    await ensureUser();
    const { error } = await sb.rpc('save_push', { p_village: VILLAGE, p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_role: profile().role || null });
    if (error) throw error;
    try { localStorage.setItem('willian.push', 'on'); } catch (e) {}
    return 'on';
  } catch (e) { return 'error'; }
}

async function disablePush() {
  const sub = await currentSub();
  if (sub) {
    try { await ensureUser(); await sb.rpc('remove_push', { p_endpoint: sub.endpoint }); } catch (e) {}
    await sub.unsubscribe();
  }
  try { localStorage.setItem('willian.push', 'off'); } catch (e) {}
}

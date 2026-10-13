// send-push. Two jobs:
//  1. Admin sends (signed-in admin only): { village, title, body, url?, role?, user_id? }
//  2. Admin alerts from DB triggers (new message / idea / profile / tradesperson): { alert, key } -> admin phones only
// Secret needed (Supabase > Edge Functions > Secrets): VAPID_PRIVATE_KEY
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const VAPID_PUBLIC = "BNhGapFFVYezresAT1VmceLzSsT65GX3k-wc7uwEpapc6EluBva9fkYEf0v9XL6xFxMWQpXFz503V8Bhd6gNQPY";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...CORS, "Content-Type": "application/json" } });

function serviceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default ?? ""; } catch { return ""; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!priv) return json({ error: "VAPID_PRIVATE_KEY secret is not set" }, 500);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, serviceKey(), { auth: { persistSession: false } });
  webpush.setVapidDetails("mailto:broadfords@gmail.com", VAPID_PUBLIC, priv);
  const b = await req.json().catch(() => ({}));

  // Diary evening reminders, fired by pg_cron at 18:00 and 19:00 UTC: only the run that is 7pm in London does anything.
  if (b.diary) return json(await diaryEve(admin));

  // Admin alerts, fired by database triggers: { alert: 'posts'|'requests'|'profiles', key }.
  // No sign-in needed: we look the row up ourselves and alert at most once per row, so it can't be abused.
  if (b.alert) return json(await adminAlert(admin, String(b.alert), String(b.key ?? "")));

  // Who is calling? Must be signed in and listed in public.admins.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: uerr } = await admin.auth.getUser(token);
  if (uerr || !u?.user) return json({ error: "Not signed in" }, 401);
  const { data: isAdm } = await admin.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
  if (!isAdm) return json({ error: "Admins only" }, 403);

  const title = String(b.title ?? "").slice(0, 80).trim();
  const body = String(b.body ?? "").slice(0, 240).trim();
  if (!b.village || !title) return json({ error: "village and title are required" }, 400);

  let q = admin.from("push_subs").select("endpoint,p256dh,auth").eq("village", b.village);
  if (b.role) q = q.eq("role", b.role);
  if (b.user_id) q = q.eq("user_id", b.user_id);
  const { data: subs, error } = await q;
  if (error) return json({ error: error.message }, 500);

  return json(await sendAll(admin, subs ?? [], { title, body, url: String(b.url ?? "./") }));
});

type Sub = { endpoint: string; p256dh: string; auth: string };
// deno-lint-ignore no-explicit-any
async function sendAll(admin: any, subs: Sub[], msg: { title: string; body: string; url: string }) {
  const payload = JSON.stringify(msg);
  let sent = 0, gone = 0, failed = 0;
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) { gone++; await admin.from("push_subs").delete().eq("endpoint", s.endpoint); }
      else failed++;
    }
  }));
  return { sent, gone, failed, total: subs.length };
}

// deno-lint-ignore no-explicit-any
async function adminAlert(admin: any, table: string, key: string) {
  const keyCol = table === "profiles" ? "user_id" : "id";
  if (!["posts", "requests", "profiles", "trades"].includes(table) || !key) return { skipped: "bad alert" };
  // Claim the row: only the first call within 10 minutes of creation wins
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: row } = await admin.from(table).update({ alerted_at: new Date().toISOString() })
    .eq(keyCol, key).is("alerted_at", null).gte("created_at", since).select("*").maybeSingle();
  if (!row) return { skipped: "already alerted or not found" };

  const who = `${row.name} (${row.role})`;
  const msg = table === "trades" ? { title: "New tradesperson to approve", body: `${row.name} · ${row.trade}`, url: "admin.html" }
    : table === "posts" ? { title: "New message to approve", body: `${row.title} · ${who}`, url: "admin.html" }
    : table === "requests" ? { title: "New idea to approve", body: `${row.title} · ${who}`, url: "admin.html" }
    : { title: "New Willian user", body: who, url: "admin.html" };

  const { data: admins } = await admin.from("admins").select("user_id");
  const ids = (admins ?? []).map((a: { user_id: string }) => a.user_id);
  if (!ids.length) return { skipped: "no admins" };
  const { data: subs } = await admin.from("push_subs").select("endpoint,p256dh,auth").eq("village", row.village).in("user_id", ids);
  return await sendAll(admin, subs ?? [], msg);
}

// Diary: at 7pm London time, tell everyone about tomorrow's diary entries that have "alert the evening before" set.
// deno-lint-ignore no-explicit-any
async function diaryEve(admin: any) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(new Date()).reduce((o: Record<string, string>, p) => (o[p.type] = p.value, o), {});
  if (parts.hour !== "19") return { skipped: "not 7pm in London" };
  const DAY = 86400000;
  const today = Date.UTC(+parts.year, +parts.month - 1, +parts.day) / DAY;
  const tomorrow = today + 1;
  const tomorrowStr = new Date(tomorrow * DAY).toISOString().slice(0, 10);
  // Claim the evening so a retry can never send twice
  const { error: claim } = await admin.from("diary_sent").insert({ day: tomorrowStr });
  if (claim) return { skipped: "already sent for " + tomorrowStr };

  const { data: rows } = await admin.from("diary").select("*").eq("alert_eve", true);
  const hit = (rows ?? []).filter((e: { starts_on: string; every_days: number | null; ends_on: string | null }) => {
    const s = new Date(e.starts_on + "T00:00:00Z").getTime() / DAY;
    if (tomorrow < s) return false;
    if (e.ends_on && tomorrow > new Date(e.ends_on + "T00:00:00Z").getTime() / DAY) return false;
    return e.every_days ? (tomorrow - s) % e.every_days === 0 : tomorrow === s;
  });
  if (!hit.length) return { skipped: "nothing to alert for " + tomorrowStr };

  const { data: subs } = await admin.from("push_subs").select("endpoint,p256dh,auth").eq("village", "willian");
  const body = hit.map((e: { title: string }) => e.title).join(", ");
  return await sendAll(admin, subs ?? [], { title: "Tomorrow in Willian", body, url: "place.html?p=diary" });
}

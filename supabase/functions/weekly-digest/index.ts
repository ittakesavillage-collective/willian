// weekly-digest: asks Claude (with web search, limited to the sites in digest_config) for a plain-text summary,
// and saves it as a DRAFT in public.digests. Michael approves it on the admin page; only 'live' digests are shown.
// Two callers: pg_cron on Fridays ({cron:true}, acts only at 7pm London, once per Friday) and the admin page
// ({now:true}, signed-in admin only). Secret needed: ANTHROPIC_API_KEY (Supabase > Edge Functions > Secrets).
import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = "claude-sonnet-5-5";
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

const SYSTEM = `You write the weekly "Properties for sale in Willian" summary for a village app.
Willian is a small village in Hertfordshire, England, on the edge of Letchworth Garden City (postcodes SG6 2xx).
Use web search to find residential properties that are currently for sale IN WILLIAN ONLY. Ignore other parts of Letchworth, Hitchin and any other place called Willian.
Rules:
- Use only facts shown in the search results. Never invent or guess a price, size or agent. If a detail is missing, leave it out.
- Check the agent named on the listing itself; do not assume it from anywhere else.
- Leave out anything sold, let or sold subject to contract. Say "under offer" if a listing is under offer.
- Plain text only: no markdown, no links, no photos, no marketing language, no opinions.
- One property per line, exactly in this form: Street or property name - guide price or price - N bed property type - Listed by Agent name
- Maximum 8 lines. If there are no current properties, write exactly: No properties found this week.
- Output only the lines, nothing before or after.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY secret is not set" }, 500);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey(), { auth: { persistSession: false } });
  const b = await req.json().catch(() => ({}));
  const kind = "properties";

  if (b.cron) {
    // Fridays only, and only the run that is 7pm in London; one run per day
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).reduce((o: Record<string, string>, x) => (o[x.type] = x.value, o), {});
    if (p.weekday !== "Fri" || p.hour !== "19") return json({ skipped: "not Friday 7pm in London" });
    const { error } = await admin.from("digest_runs").insert({ day: `${p.year}-${p.month}-${p.day}`, kind });
    if (error) return json({ skipped: "already ran today" });
  } else if (b.now) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u, error: uerr } = await admin.auth.getUser(token);
    if (uerr || !u?.user) return json({ error: "Not signed in" }, 401);
    const { data: isAdm } = await admin.from("admins").select("user_id").eq("user_id", u.user.id).maybeSingle();
    if (!isAdm) return json({ error: "Admins only" }, 403);
  } else {
    return json({ error: "nothing to do" }, 400);
  }

  const { data: cfg } = await admin.from("digest_config").select("domains,max_searches").eq("kind", kind).maybeSingle();
  const domains: string[] = cfg?.domains ?? [];
  const maxSearches: number = cfg?.max_searches ?? 8;
  if (!domains.length) return json({ error: "No websites set in digest_config for " + kind }, 400);

  const messages: unknown[] = [{ role: "user", content: "Find the homes currently for sale in Willian, Hertfordshire and write this week's summary." }];
  let data: any = null, searches = 0, inTok = 0, outTok = 0;
  const seen = new Set<string>();
  for (let i = 0; i < 3; i++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, system: SYSTEM, messages,
        output_config: { effort: "medium" },
        tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches, allowed_domains: domains,
                  user_location: { type: "approximate", city: "Letchworth Garden City", region: "Hertfordshire", country: "GB", timezone: "Europe/London" } }],
      }),
    });
    data = await res.json();
    if (!res.ok) return json({ error: "Anthropic error", detail: data?.error?.message ?? data }, 502);
    searches += data.usage?.server_tool_use?.web_search_requests ?? 0;
    inTok += data.usage?.input_tokens ?? 0; outTok += data.usage?.output_tokens ?? 0;
    // Remember which websites the searches actually returned, to help tune the allowed list
    for (const blk of data.content ?? []) {
      if (blk.type === "web_search_tool_result" && Array.isArray(blk.content)) {
        for (const r of blk.content) { try { seen.add(new URL(r.url).hostname.replace(/^www\./, "")); } catch { /* ignore */ } }
      }
    }
    if (data.stop_reason === "pause_turn") { messages.push({ role: "assistant", content: data.content }); continue; }
    break;
  }
  const text = (data?.content ?? []).filter((x: { type: string }) => x.type === "text").map((x: { text: string }) => x.text).join("")
    .replace(/https?:\/\/\S+/g, "").replace(/[*_#`]/g, "").trim().slice(0, 3900);
  if (!text) return json({ error: "The model returned no text", stop_reason: data?.stop_reason }, 502);

  const costUsd = (inTok * 2 + outTok * 10) / 1e6 + searches * 0.01;
  const { data: row, error: ierr } = await admin.from("digests")
    .insert({ kind, body: text, status: "draft", meta: { model: MODEL, searches, domains_seen: [...seen], input_tokens: inTok, output_tokens: outTok, est_cost_usd: Math.round(costUsd * 1000) / 1000 } })
    .select("id").single();
  if (ierr) return json({ error: ierr.message }, 500);
  return json({ id: row.id, searches, input_tokens: inTok, output_tokens: outTok, est_cost_usd: Math.round(costUsd * 1000) / 1000, preview: text.slice(0, 300) });
});

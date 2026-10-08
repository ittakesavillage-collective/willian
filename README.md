# Willian

The village app for Willian, Hertfordshire, part of the **It Takes a Village** collective.
Lives at https://ittakesavillagecollective.co.uk/willian/ (GitHub Pages, served under the org's custom domain).

Started 2026-10-08 as a copy of the Hurley app, and now fully independent: its own Supabase project,
its own push keys, its own admin. It can diverge from Hurley freely.

Public repo: no secrets, tokens or personal data in here. The Supabase publishable key and the VAPID
*public* key are designed to be public; Row Level Security (`supabase/schema.sql`) protects the data.

## Structure
- `index.html` home: top bar (admin `!` hidden until admin sign-in, Profile, Settings, About Us) + 8-button grid
- `place.html?p=<id>` one page for every button; content lives in `js/data.js` (`PLACES`, `ROLES`, `VERSION`)
- `js/db.js` Supabase connection + anonymous sign-in; `js/push.js` notifications; `js/trades.js` Trusted Tradesmen
- `admin.html` admin-only: approve messages/ideas/tradespeople, notify, notes to Claude
- `install.html` device-aware install guide; `about.html` collective About Us (shared master)
- `sw.js` network-first, so updates arrive automatically; bump `VERSION` (data.js) and the `CACHE` name together
- `supabase/schema.sql` the complete database (one file); `supabase/functions/send-push/` the push edge function
- `icons/make_icons.py` rebuilds every icon size from `icons/willian-icon-source.jpg`

## Backend (Supabase project `willian`, ref avmfvctonokvlliwcpxf, eu-west-2)
- Anonymous sign-in must be ON (Authentication > Sign In / Providers).
- Admin = a user in `public.admins` (email + password sign-in on admin.html).
- Edge function secret `VAPID_PRIVATE_KEY` (private half lives only in Michael's `_secrets` folder, never in git).

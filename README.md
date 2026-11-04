# Personal Messenger

A mobile-first private one-to-one messaging web app. Visitors have separate conversations with one administrator; visitor identities use Supabase Anonymous Auth and persist per browser/device.

## Stack

React, TypeScript, Vite, Tailwind CSS v4, Lucide, Supabase (Auth, Postgres/RLS, Realtime, Storage and Edge Functions), Vite PWA and Vercel.

## Build

The source bundle is stored in source-parts/ as ordered Base64 segments. npm install runs scripts/bootstrap.mjs, verifies and joins all 28 segments, then materializes the normal project tree from the compressed source archive before Vercel executes the build.

Commands: npm install; npm run dev; npm run build.

## Environment variables

Set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY and optionally VITE_VAPID_PUBLIC_KEY in Vercel Production, Preview and Development.

Only a Supabase publishable key belongs in browser variables. Never expose Supabase secret/service-role keys or VAPID private keys via a VITE_ variable.

## Supabase operator setup still required

1. Enable Authentication → Providers → Anonymous sign-ins.
2. Create the administrator in Authentication → Users and add that Auth UID to private.admin_users.
3. Verify Realtime private-channel mode is enforced (public access disabled).
4. Configure VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT as Supabase Edge Function secrets to enable push notifications.

The hosted project already has the application migrations, RLS policies, private Storage bucket and notify-new-message Edge Function. Visitor A/B transactional security tests previously confirmed conversation isolation and message retry idempotency.

## Scope notes

The application includes visitor onboarding, private chat, message receipts, typing state, file messages, visitor-side clear, preferences, an owner inbox, reply, archive/star/block, visitor details and private notes. Admin-side attachment sending, new outbound conversations, full history pages, image normalization, backup/retention policy and end-to-end browser/device validation remain later work. Web Push is inactive until VAPID secrets are configured. CAPTCHA is intentionally omitted; server-side rate limits and upload controls are used instead.
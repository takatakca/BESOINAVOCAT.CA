# Supabase — handoff for the developer (2026-11-26)

Claude has stopped all Supabase work. **Nothing was changed in Supabase or Coolify**: no setting, no data, no pause, no downgrade, no new service. Everything is exactly as it was.

## What is billed today
Supabase org `takatakca` (id `twjuxarqywtonfcvxacw`), **Pro plan**, 5 active projects (about 65 USD/month).

| Project | ref | Region | Auth users | DB size | Notes |
|---|---|---|---|---|---|
| TAKATAK User Official Dashboard V1 | `pcjfahhlozsseqqevimi` | eu-west-1 | 60 (6 active in last 7 days) | 83 MB | The only project really used. Includes real users (pilot client, restaurants), not only tests. |
| ALKAO | `ysghtkallwuoodwqgkjm` | ca-central-1 | 1 (last login 2026-10-10) | 142 MB | |
| TAKATAK STAGING | `utuvzrqvivqyziibobvu` | ca-central-1 | 0 | 81 MB | Referenced in takatak-v1 |
| takatak-foodhub | `uwowuktwcsxbvnfjjpwh` | ca-central-1 | 0 | 14 MB | |
| FESTI ICE | `anyiaszbjsyrxfgjbwdt` | ca-central-1 | 0 | 11 MB | |

Main project contents: schemas `public` (155 tables, 56 MB), `isexy`, `rentauto`, `foodhub`, `auth`, `storage` (about 1.6 MB of files). Extensions: btree_gist, pg_stat_statements, pgcrypto, supabase_vault, uuid-ossp.

## What depends on it
1. **BesoinAvocat portal** (`takatakca/BESOINAVOCAT.CA`, `platform/lib/browser-session.mjs`): only the Auth API (`/auth/v1/token`, `/user`, `/otp`, `/verify`, `/authorize` for Google). Case files live on our own server. Env vars in Coolify app `besoinavocat-portail`: `TAKATAK_SUPABASE_URL`, `TAKATAK_SUPABASE_PUBLISHABLE_KEY`. If you move Auth, change these two and redeploy (autodeploy is off).
2. **takatak.ca** (`takatakca/takatak-v1`, Next.js): Supabase Auth (email/SMS OTP, Google, OAuth server, MFA), PostgREST tables, Edge Functions (`identity-context`, `rentauto-*`), and Prisma on the same Postgres (`DATABASE_URL`, `DIRECT_URL`). Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`.
3. **Auth emails**: custom SMTP through Resend, sender `noreply@mimt.ca`.

## Pending items that need Supabase (left for you)
- Portal Google sign-in: add redirect URL `https://portail.besoinavocat.ca/**` in Auth > URL Configuration, then set `BESOINAVOCAT_GOOGLE_SIGNIN_ENABLED=true` on the portal and redeploy.
- Brand rule: a client who signs up on BesoinAvocat must never see "TAKATAK" in auth emails or links.

More detail: `docs/SORTIE-SUPABASE-2026-11-21.md` in `takatakca/BESOINAVOCAT.CA` (branch `claude/project-thread-e6gocn`).

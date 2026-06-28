---
name: Supabase migration for Dishari Mess
description: How the Supabase migration is architected — auth, data, realtime, and member management via API server
---

# Supabase Migration Architecture

## Auth email convention
- Admin logs in with identifier "admin" → maps to `admin@dishari.app`
- Members log in with phone number → maps to `{phone}@dishari.app`
- `toEmail()` in `lib/supabase.ts` handles the conversion

## Client initialization — must be lazy
Both `lib/supabase.ts` (Expo) and `lib/supabaseAdmin.ts` (API server) use lazy Proxy pattern.
They throw `SUPABASE_NOT_CONFIGURED` if env vars are missing.
The app shows a graceful "Supabase Not Configured" screen (`app/index.tsx`) when `isSupabaseConfigured()` returns false.

**Why:** createClient() from @supabase/supabase-js throws immediately if supabaseUrl is empty, which crashes the app/server at module load time before env vars can be set.

## Metro config for @supabase/supabase-js
`artifacts/dishari/metro.config.js` must have `config.resolver.unstable_enablePackageExports = true`.

**Why:** @supabase/supabase-js uses the `exports` field in package.json. Metro doesn't follow this by default and throws "Unable to resolve @supabase/supabase-js".

## Member management via API server
- Create/Delete member auth users → API server (needs SUPABASE_SERVICE_KEY)
- Password reset → API server
- Update member fields (name, status, etc.) → direct Supabase client (admin JWT + RLS)
- All other data (meals, expenses, advances, eggs, settings) → direct Supabase client

## Required env vars
Expo app: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
API server: SUPABASE_URL, SUPABASE_SERVICE_KEY

## First launch flow
1. index.tsx checks `supabaseReady` and `needsSetup`
2. If no admin exists → `/setup` screen
3. Setup screen calls `POST /api/setup` (API server creates admin with service role)
4. Admin email is always `admin@dishari.app`, login ID is "admin"

## RLS strategy
- members: admin full access + member reads own; INSERT/DELETE via service role (API server)
- meals/expenses/eggs/fines/announcements: all auth can read; admin writes
- advances: admin reads all, member reads own; admin writes
- settings: all auth can read; admin writes

## SQL schema location
`supabase/schema.sql` — run in Supabase SQL Editor to set up all tables + RLS

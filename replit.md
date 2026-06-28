# Dishari Mess

A mobile app for automating meal tracking, expense management, advance payments, and monthly bill settlement for shared messes, hostels, and student accommodations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (if backend needed)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (React Native) with expo-router
- API: Express 5 (api-server)
- DB: PostgreSQL + Drizzle ORM (not yet provisioned — app uses AsyncStorage)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dishari/` — Expo mobile app
- `artifacts/dishari/app/` — Expo Router screens
  - `app/login.tsx` — login screen
  - `app/index.tsx` — auth redirect
  - `app/admin/` — admin tab screens (Dashboard, Members, Meals, Expenses, More)
  - `app/member/` — member tab screens (Home/Bill, Meals, Expenses, Advances)
- `artifacts/dishari/context/AuthContext.tsx` — login/logout state
- `artifacts/dishari/context/DataContext.tsx` — all app data + monthly calculations
- `artifacts/dishari/constants/colors.ts` — warm saffron/terracotta color palette

## Architecture decisions

- Frontend-only (AsyncStorage) — all data stored locally on device; no backend provisioned
- Role-based auth: admin (ID: `admin` / PW: `admin123`) vs members (phone + password set by admin)
- Monthly calculation engine: expense ÷ total meals = per-meal rate; each member billed proportionally
- Egg costs tracked separately from meal costs and added to gross bill
- Cook salary charged as fixed amount per active member per month

## Product

- Admin: full CRUD over members, meals, expenses, egg entries, advances, settings
- Member: read-only views of their bill, meals, shared expenses, advance history
- Monthly bill = (meals × per-meal rate) + egg bill − advance payments
- Demo credentials: Admin → ID: `admin` / Pass: `admin123`
- Demo members: Rahul (01711111111/rahul123), Amit (01722222222/amit123), Priya (01733333333/priya123)

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Data is stored in AsyncStorage; clearing app data resets everything
- `Alert.prompt` (used for egg price / cook salary editing) only works on iOS natively; on web/Android it falls back or may not appear — consider inline TextInput modals for those fields in future iterations
- The `(tabs)` directory in `app/` is vestigial from the scaffold; it redirects to root

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details

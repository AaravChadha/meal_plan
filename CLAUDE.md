@AGENTS.md

# NutriTrack — Personal Nutrition Tracking App

## Overview
Personal nutrition tracking web app built with Next.js 14 (App Router). Built by a college freshman learning web dev through vibe coding. Goal is personal use first, then portfolio piece, then potentially a mobile app (Expo/React Native).

## Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript
- **Database**: SQLite via better-sqlite3 (WAL mode, file: `data/nutritrack.db`)
- **Auth**: bcryptjs + httpOnly session cookies (stored in SQLite `sessions` table)
- **Charts**: Chart.js + react-chartjs-2
- **Path alias**: `@/*` → `./src/*`

## Architecture

### Route Groups
- `(app)/` — protected pages (dashboard, food log, analytics, grades, profile) with Sidebar layout
- `(auth)` — login, register (no sidebar)

### Key Files
- `src/lib/tdee.ts` — BMR/TDEE/macro formulas (Mifflin-St Jeor, Katch-McArdle), evidence-based with citations
- `src/lib/grades.ts` — Nutrition grading system (A+ through F)
- `src/lib/auth.ts` — Session management (create/validate/delete)
- `src/lib/db.ts` — SQLite schema, migrations, food seeding
- `src/middleware.ts` — Auth guard (Edge runtime — CANNOT import better-sqlite3, hardcodes cookie name)

### Database
- Schema changes use `try { ALTER TABLE } catch {}` migration pattern
- 1,274 Purdue dining court foods imported with full nutrition data (brand = 'Purdue Dining')
- Common foods seeded on first run (~50 items)
- Day types table tracks workout vs rest per user per date

### Nutrition Formulas (all in tdee.ts, research-backed)
- **BMR**: Mifflin-St Jeor (no body fat), Katch-McArdle (with body fat). Age 50+ correction for Katch-McArdle.
- **Protein**: 2.2 g/kg total BW on cut (or 2.4 g/kg lean mass if BF% known). Age 40+: +0.2 g/kg. (Helms 2014, Morton 2018)
- **Fat**: 0.7 g/kg on cut, 1.0 g/kg maintain/bulk. Floor 0.5 men, 0.8 women. Weight-based, NOT % of calories. (Dorgan 1996, DGA 2020)
- **Carbs**: fills remaining calories (flexes up on workout days, down on rest days)
- **Sodium**: base 2300mg (DGA), +500-2000 for activity level, +500 on workout days, age 50+ base 1500 (AHA). Cap 4500mg.
- **Fiber**: 14g per 1000 kcal (IOM 2005), floor 25g, cap 50g.
- **Custom TDEE**: user can override computed TDEE with Apple Health value

## What's Built
- [x] Multi-user auth (register/login/logout with sessions)
- [x] Profile page with independent weight (kg/lbs) and height (cm/ft) toggles
- [x] Smart recommendations: workout day vs rest day targets
- [x] Custom TDEE override (for Apple Health data)
- [x] Customizable deficits per day type
- [x] Body composition tracking (lean mass / fat mass when BF% entered)
- [x] Food log with search (1,274 Purdue dining + 50 common foods)
- [x] Dashboard with daily summary
- [x] Analytics with trends
- [x] Grades page (daily report card, 7-day history, target calibration)
- [x] Sidebar navigation with user info
- [x] Day type toggle (workout/rest) on dashboard

## Known Issues / TODO (Web)
- [ ] +/- letter grades (A+, A, A-, B+, etc.) — grades.ts still uses A/B/C/D/F only
- [ ] Deficit display may be confusing — make the TDEE → deficit → target math more explicit in the UI
- [ ] Auto-update daily targets when deficit changes (targets should reflect suggestions automatically)
- [ ] Workout day should be on left consistently (both recommendation cards AND deficit inputs)
- [ ] Grading should favor being under calories vs over when goal is cut
- [ ] Profile page sometimes shows black screen if session is invalid (partially fixed with 401 redirect)

## Future: Mobile App (Expo/React Native)
- [ ] Set up Expo project alongside web
- [ ] Move shared logic (tdee.ts, grades.ts, nutrients.ts, types) to a shared package
- [ ] Build mobile UI (View/Text/Pressable instead of div/span/button)
- [ ] On-device SQLite (expo-sqlite) instead of API routes
- [ ] Apple HealthKit integration for real TDEE data
- [ ] Both iOS and Android from same codebase

## Rules
- **NEVER delete the database** — use ALTER TABLE migrations. User hates re-registering.
- **Explain concepts while coding** — user is learning, use Python/Java analogies when helpful.
- **Middleware is Edge runtime** — cannot import better-sqlite3 or anything from src/lib/auth.ts.
- **Session cookie name**: `nt_session` — hardcoded in both middleware.ts and auth.ts, keep in sync.
- **SQLite strings**: use single quotes in SQL (`datetime('now')`), double quotes = column identifiers.

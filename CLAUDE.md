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

## Project Roadmap

Current phase: **Phase 1 — Fix & Polish**

---

### Phase 1 — Fix & Polish (Web)
Get the existing app working correctly before adding anything new.

#### 1.1 Fix Grades System
- [x] 1.1.1 Add +/- letter grades (A+ through F) — update `LetterGrade` type in grades.ts ✅
- [x] 1.1.2 Expand `scoreToGrade()` with finer thresholds (≥97=A+, ≥93=A, ≥90=A-, etc.) ✅
- [x] 1.1.3 Update `GRADE_COLORS` to handle +/- variants ✅
- [x] 1.1.4 Grading should favor being under calories vs over when goal is cut ✅
- [ ] 1.1.5 Penalize going too far over OR under — extreme deficits (e.g. eating 800 cal on a 2100 target) and extreme surpluses should both grade poorly, not just missing targets
- [ ] 1.1.6 Update grades page UI (GradeBadge, report card, history) for new grade types
- [ ] 1.1.7 Add a visual grading rubric section explaining how grades work

#### 1.2 Fix Profile & Recommendations
- [x] 1.2.1 Deficit must visibly subtract from target — show "TDEE − deficit = what you eat" ✅
- [x] 1.2.2 Auto-update daily targets when deficit/TDEE/workout burn changes (no manual "Apply" needed) ✅
- [x] 1.2.3 Layout consistency — workout day on LEFT everywhere (recommendation cards AND deficit inputs) ✅
- [x] 1.2.4 Fix profile black screen on invalid session (redirect to /login on any 401) ✅
- [ ] 1.2.5 All API-fetching pages should handle 401 with redirect (not just profile) — grades, food log, analytics still missing

#### 1.3 Security & Backup
- [x] 1.3.1 Create a clean template DB (`data/nutritrack.seed.db`) with only Purdue foods + common foods, no user data ✅
- [x] 1.3.2 Set up git-crypt — encrypt live DB (`data/nutritrack.db`) so it's committed but unreadable on GitHub (AES-256) ✅
- [x] 1.3.3 Configure `.gitattributes` so `nutritrack.db` + WAL/SHM files auto-encrypt, `nutritrack.seed.db` stays public ✅
- [x] 1.3.4 Export git-crypt key file — save to iCloud/Drive as backup. Key at ~/Downloads/nutritrack-git-crypt-key.key ✅
- [x] 1.3.5 Scrub personal data from git history (old commits had unencrypted DB) ✅
- [ ] 1.3.6 App auto-creates live DB from seed on first run if no live DB exists (for new users cloning the repo)

#### 1.4 Fix Data & Display
- [ ] 1.4.1 Verify all nutrition formulas produce sensible numbers at user's stats (100kg, cut, 2500 TDEE)
- [ ] 1.4.2 Ensure Purdue dining items display properly in food search with "Purdue Dining" badge
- [ ] 1.4.3 Test food log → summary → grades pipeline end-to-end

---

### Phase 2 — Complete Web Features
Fill in missing functionality and make the app actually usable day-to-day.

#### 2.1 Dashboard Improvements
- [x] 2.1.1 Workout/rest day toggle that switches which targets are shown for today ✅
- [ ] 2.1.2 Auto-suggest day type from weekly schedule (Mon/Wed/Fri/Sun = workout)
- [ ] 2.1.3 Show today's grade live as you log food (updates with each entry)
- [ ] 2.1.4 Quick-add buttons for frequently logged foods

#### 2.2 Daily Baseline (the stuff you eat every day)
- [ ] 2.2.1 Create custom foods (e.g. "My protein shake", "Greek yogurt + granola") with nutrition info — saved in profile
- [ ] 2.2.2 Baseline section on profile page — a list of your daily staples that you always eat
- [ ] 2.2.3 Add/remove items from baseline, reorder them
- [ ] 2.2.4 Baseline checklist on Food Log page — shows your baseline items with checkboxes
- [ ] 2.2.5 Checking off a baseline item logs it for that day and adds its macros to the daily total
- [ ] 2.2.6 Unchecking removes it from that day's log
- [ ] 2.2.7 Visual indicator showing how much of your daily target the baseline covers (e.g. "Baseline = 800 cal, 60g protein — 38% of your day done before dining court")

#### 2.3 Food Log Enhancements
- [ ] 2.3.0 Custom foods, combos, favorites, and baselines must persist in the database (not code) — survive server restarts, code updates, and redeployments. Tied to user ID so each person keeps their own.
- [ ] 2.3.1 Favorite foods — star items for quick access
- [ ] 2.3.2 Recent foods — show last 10 logged items at top of search
- [ ] 2.3.3 Custom food entry — add your own foods with nutrition info
- [ ] 2.3.4 Edit/delete logged entries
- [ ] 2.3.5 Drag and drop food items between meals — move an item from breakfast to lunch if added to the wrong meal
- [ ] 2.3.6 Copy meals from a previous day
- [ ] 2.3.6 Food combos — save groups of items you regularly eat together (e.g. "Wiley rice + guac + salsa")
- [ ] 2.3.7 Adding a combo logs each item separately so you can remove/edit individual items after
- [ ] 2.3.8 Combo manager — create/edit/delete combos from food log or profile page

#### 2.4 Purdue Dining Court Integration (live menu)
- [ ] 2.4.1 Dining court picker — select which court you're at (Earhart, Wiley, Ford, Hillenbrand, Windsor)
- [ ] 2.4.2 Meal picker — select breakfast, lunch, or dinner (only show meals currently available based on time/hours)
- [ ] 2.4.3 Station-based food list — items grouped by station (e.g. "Granite Grill", "The Pastry Shop") matching dining court layout
- [ ] 2.4.4 Serving size input per item — tap an item, set number of servings, add to today's log
- [ ] 2.4.5 Running total bar — as you add items, show live running total of calories/protein/carbs/fat for this meal
- [ ] 2.4.6 "Planned menu" caveat banner — note that menu may differ from what's actually available
- [ ] 2.4.7 Remaining macros helper — show "you need X more protein today" alongside each item's nutrition so you pick smarter
- [ ] 2.4.8 Cache today's menu locally — don't re-fetch from API on every page load, refresh once per hour
- [ ] 2.4.9 Dining court hours — show open/closed status, grey out courts that are closed

#### 2.5 Water Tracking
- [ ] 2.5.1 Water intake tracker — simple glasses/oz counter on dashboard
- [ ] 2.5.2 Daily water goal based on body weight (~0.5 oz per lb or 33 ml per kg)
- [ ] 2.5.3 Visual progress (fill animation or progress bar)
- [ ] 2.5.4 Include in daily grade as a bonus factor

#### 2.6 Grades Improvements
- [ ] 2.6.1 "Why did I get this grade?" breakdown — show exactly which macros pulled you up or down (e.g. "protein 40g short → dropped from A to B-")
- [ ] 2.6.2 Grade trend chart — average grade over weeks/months, are you improving?
- [ ] 2.6.3 Streak tracking — consecutive days of A/B grades, longest streak

#### 2.7 Comparison Table & Insights
- [ ] 2.7.1 Visual workout vs rest day comparison table (side-by-side targets, color-coded)
- [ ] 2.7.2 Weekly summary — average intake, days on target, best/worst day

#### 2.8 Analytics Upgrades
- [ ] 2.8.1 Weight trend chart with moving average
- [ ] 2.8.2 Body fat % tracking over time (if entered)
- [ ] 2.8.3 Macro distribution pie chart per day
- [ ] 2.8.4 Calorie trend line with target overlay

#### 2.9 Body Recomp Tracking
- [ ] 2.9.1 Progress photos — upload weekly photos, view side-by-side comparison over time
- [ ] 2.9.2 Body measurements — waist, chest, arms, legs. Track over time with charts
- [ ] 2.9.3 Recomp indicators — "scale stalled but waist dropped 0.5 inches = recomp is working"

#### 2.10 Onboarding Flow
- [ ] 2.10.1 First-time user setup wizard — step by step: enter stats → pick goal → see recommendations → set targets → done
- [ ] 2.10.2 Skip option for experienced users who just want to set everything manually
- [ ] 2.10.3 Explain what each field means as they fill it in (educational tooltips)

#### 2.11 Data & Export
- [ ] 2.11.1 Backup API — export all user data (profile, custom foods, combos, baselines, food log, weight history) as JSON
- [ ] 2.11.2 Restore API — import a backup JSON to rebuild account and all personal data
- [ ] 2.11.3 Backup/restore UI on profile page — "Download Backup" + "Restore from Backup"
- [ ] 2.11.4 Export food log, weight history, grades as CSV
- [ ] 2.11.5 Shows you care about user data ownership (good for portfolio)

#### 2.12 Polish & UX
- [ ] 2.12.1 Loading states for all pages (skeleton screens, not blank)
- [ ] 2.12.2 Error toasts when API calls fail
- [ ] 2.12.3 Mobile-responsive CSS (usable on phone browser before native app)
- [ ] 2.12.4 Dark/light theme toggle

---

### Phase 3 — Mobile App (Expo/React Native)
Rebuild the UI for iOS and Android. Backend logic carries over.

#### 3.1 Project Setup
- [ ] 3.1.1 Create Expo project alongside web (`/mobile` directory)
- [ ] 3.1.2 Move shared logic to `/shared` (tdee.ts, grades.ts, nutrients.ts, types)
- [ ] 3.1.3 Configure both web and mobile to import from `/shared`
- [ ] 3.1.4 Set up expo-sqlite for on-device database
- [ ] 3.1.5 Set up expo-router for navigation

#### 3.2 Core Screens
- [ ] 3.2.1 Login / Register screens
- [ ] 3.2.2 Dashboard screen with day type toggle
- [ ] 3.2.3 Food log screen with search
- [ ] 3.2.4 Profile screen with recommendations
- [ ] 3.2.5 Grades screen

#### 3.3 Mobile-Specific Features
- [ ] 3.3.1 Apple HealthKit integration — pull real TDEE, steps, workout data
- [ ] 3.3.2 Auto-detect workout day from HealthKit activity
- [ ] 3.3.3 Barcode scanner for packaged foods
- [ ] 3.3.4 Push notifications — meal reminders, grade updates
- [ ] 3.3.5 Widget — today's calories/macros on home screen

#### 3.4 Camera & Vision Features (uses phone camera + AI)
- [ ] 3.4.1 Scan nutrition label → auto-create custom food (OCR extracts calories, protein, carbs, fat, serving size)
- [ ] 3.4.2 Photo food logging — take a picture of your plate, AI estimates portion sizes/serving amounts
- [ ] 3.4.3 Full AI calorie estimation — snap a photo, AI identifies the food AND estimates calories/macros
- [ ] 3.4.4 Save photo with food log entry so you can look back at what you ate

#### 3.5 Ship It
- [ ] 3.5.1 App icon and splash screen
- [ ] 3.5.2 Build with EAS for iOS and Android
- [ ] 3.5.3 TestFlight beta (iOS)
- [ ] 3.5.4 App Store / Play Store submission

---

### Phase 4 — AI Meal Suggestion Engine
Fine-tuned AI model that knows Purdue dining, your macros, and your preferences.

#### 4.1 Data Collection & Training Set
- [ ] 4.1.1 Build training dataset — map meals to macro outcomes (e.g. "at Earhart lunch, picking X+Y+Z hits 600 cal, 45g P")
- [ ] 4.1.2 Log user preferences over time — what they pick, what they skip, ratings
- [ ] 4.1.3 Create meal combinations from menu items that hit common macro targets
- [ ] 4.1.4 Label good vs bad combos (hit targets = good, way over/under = bad)

#### 4.2 Model & Integration
- [ ] 4.2.1 Choose approach — fine-tuned LLM, recommendation engine, or constraint solver (research trade-offs)
- [ ] 4.2.2 User picks foods they want to eat — "I want the burger and fries" + optionally picks healthy sides they're OK with
- [ ] 4.2.3 AI builds a balanced meal around those picks — adjusts servings, suggests additions/swaps to hit macros (e.g. "get the burger but skip fries, add grilled chicken side + broccoli to hit protein")
- [ ] 4.2.4 Only sends the user's selected items + a few suggested healthy options to the AI — NOT the entire 40-item menu, keeps token usage low
- [ ] 4.2.5 Multiple suggestion styles — "high protein", "balanced", "I want comfort food but keep it reasonable"
- [ ] 4.2.6 Learn from user — if they reject a suggestion or always pick certain foods, adapt over time

#### 4.3 Smart Features
- [ ] 4.3.1 Meal planning for the week — given your workout/rest schedule, suggest dining court meals for each day
- [ ] 4.3.2 "I already ate X for breakfast" → adjust lunch/dinner suggestions to balance macros
- [ ] 4.3.3 Allergen/preference awareness — avoid foods user has flagged (vegetarian, no peanuts, etc.)
- [ ] 4.3.4 Budget-aware — if user is running low on meal swipes, suggest efficient combos

### Phase 5 — Portfolio & Ship
#### 5.1 Portfolio
- [ ] 5.1.1 Write project README with screenshots, tech stack, what you learned
- [ ] 5.1.2 Deploy web version (Vercel or similar)
- [ ] 5.1.3 Add to resume with bullet points on what it demonstrates
- [ ] 5.1.4 Consider multi-user features if turning into a real product

## Rules
- **NEVER delete the database** — use ALTER TABLE migrations. User hates re-registering.
- **Explain concepts while coding** — user is learning, use Python/Java analogies when helpful.
- **Middleware is Edge runtime** — cannot import better-sqlite3 or anything from src/lib/auth.ts.
- **Session cookie name**: `nt_session` — hardcoded in both middleware.ts and auth.ts, keep in sync.
- **SQLite strings**: use single quotes in SQL (`datetime('now')`), double quotes = column identifiers.

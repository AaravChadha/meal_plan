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
- [x] 1.1.5 Penalize going too far over OR under — extreme deficits (e.g. eating 800 cal on a 2100 target) and extreme surpluses should both grade poorly, not just missing targets ✅
- [x] 1.1.6 Update grades page UI (GradeBadge, report card, history) for new grade types ✅
- [x] 1.1.7 Add a visual grading rubric section explaining how grades work ✅

#### 1.2 Fix Profile & Recommendations
- [x] 1.2.1 Deficit must visibly subtract from target — show "TDEE − deficit = what you eat" ✅
- [x] 1.2.2 Auto-update daily targets when deficit/TDEE/workout burn changes (no manual "Apply" needed) ✅
- [x] 1.2.3 Layout consistency — workout day on LEFT everywhere (recommendation cards AND deficit inputs) ✅
- [x] 1.2.4 Fix profile black screen on invalid session (redirect to /login on any 401) ✅
- [x] 1.2.5 All API-fetching pages should handle 401 with redirect (not just profile) — grades, food log, analytics still missing ✅

#### 1.3 Security & Backup
- [x] 1.3.1 Create a clean template DB (`data/nutritrack.seed.db`) with only Purdue foods + common foods, no user data ✅
- [x] 1.3.2 Set up git-crypt — encrypt live DB (`data/nutritrack.db`) so it's committed but unreadable on GitHub (AES-256) ✅
- [x] 1.3.3 Configure `.gitattributes` so `nutritrack.db` + WAL/SHM files auto-encrypt, `nutritrack.seed.db` stays public ✅
- [x] 1.3.4 Export git-crypt key file — save to iCloud/Drive as backup. Key at ~/Downloads/nutritrack-git-crypt-key.key ✅
- [x] 1.3.5 Scrub personal data from git history (old commits had unencrypted DB) ✅
- [x] 1.3.6 App auto-creates live DB from seed on first run if no live DB exists (for new users cloning the repo) ✅

#### 1.4 Fix Data & Display
- [x] 1.4.1 Verify all nutrition formulas produce sensible numbers at user's stats (100kg, cut, 2500 TDEE) ✅
- [x] 1.4.2 Ensure Purdue dining items display properly in food search with "Purdue Dining" badge ✅
- [x] 1.4.3 Test food log → summary → grades pipeline end-to-end ✅

---

### Phase 2 — Daily Driver (make the app usable every day)
The minimum features needed to actually use this app for daily nutrition tracking.

#### 2.1 Dashboard Improvements
- [x] 2.1.1 Workout/rest day toggle that switches which targets are shown for today ✅
- [x] 2.1.2 Auto-suggest day type from weekly schedule (Mon/Wed/Fri/Sun = workout) ✅
- [x] 2.1.3 Show today's grade live as you log food (updates with each entry) ✅
- [x] 2.1.4 Quick-add buttons for frequently logged foods ✅

#### 2.2 Daily Baseline (the stuff you eat every day)
- [x] 2.2.1 Create custom foods (e.g. "My protein shake", "Greek yogurt + granola") with nutrition info — saved per user in DB ✅
- [x] 2.2.2 Baseline uses **slots** not fixed items — e.g. a "Yogurt" slot that can be filled by any of your custom yogurts ✅
- [x] 2.2.3 Baseline section on profile page — add/remove/reorder slots, assign a default item to each slot ✅
- [x] 2.2.4 Each slot shows a dropdown/search of your custom foods in that category — easy to swap between variants ✅
  - ~~Fix needed: search only works after clicking "Swap"~~ Fixed — clicking "No default item set" now opens search
- [x] 2.2.5 Baseline checklist on Food Log page — shows your slots with checkboxes, pre-filled with the default item. Changing a slot's default only affects future days — past food log entries stay as they were. ✅
- [x] 2.2.6 Tap the item name to swap to a different variant from your custom foods (without leaving the checklist) ✅
- [x] 2.2.7 Checking off a slot logs that item for the day and adds its macros to the daily total ✅
- [x] 2.2.8 Unchecking removes it from that day's log ✅
- [x] 2.2.9 Visual indicator showing how much of your daily target the baseline covers ✅

#### 2.3 Food Log Enhancements
- [x] 2.3.1 All custom foods, combos, favorites, and baselines persist in DB (not code) — tied to user ID, survive restarts/deploys ✅
- [x] 2.3.2 Favorite foods — star items for quick access ✅
- [x] 2.3.3 Recent foods — show last 10 logged items at top of search ✅ (done in 2.1.4)
- [ ] 2.3.4 "My Foods" section — view, edit, and delete your custom foods, favorites, and combos in one place
- [ ] 2.3.5 Edit logged entries — tap a logged item to change servings, swap to a different food, or delete it (inline edit, no page navigation)
- [ ] 2.3.6 Drag and drop food items between meals — move an item from breakfast to lunch if added to the wrong meal
- [ ] 2.3.7 Copy meals from a previous day
- [ ] 2.3.8 Food combos — save groups of items you regularly eat together (e.g. "Wiley rice + guac + salsa"). NOT full meals — just a few station items that go together.
- [ ] 2.3.9 Adding a combo logs each item separately so you can remove/edit individual items after
- [ ] 2.3.10 Combo manager — create/edit/delete combos from food log or profile page

#### 2.4 Grades Improvements
- [ ] 2.4.1 Asymmetric grading per nutrient — not all macros should penalize going over equally:
  - **Protein**: over is GOOD up to ~150% of target (muscle preservation), under is bad
  - **Fiber**: over is fine up to cap (~50g), under is bad
  - **Carbs/Fat**: over is bad (extra calories), slightly under is ok on a cut
  - **Calories**: over is bad on cut, slightly under is ok (already partially done in 1.1.4)
  - **Sodium**: over is bad, under is fine
- [ ] 2.4.2 "Why did I get this grade?" breakdown — show exactly which macros pulled you up or down (e.g. "protein 40g short → dropped from A to B-")
- [ ] 2.4.3 Time-aware grading — toggle between "so far" (scales targets to current time of day, e.g. at 2pm only judge against ~60% of daily targets) and "full day" (current behavior). Default to "so far" on today, "full day" on past dates. This way you see a realistic grade throughout the day instead of F until dinner.
- [ ] 2.4.4 Grade trend chart — average grade over weeks/months, are you improving?
- [ ] 2.4.4 Streak tracking — consecutive days of A/B grades, longest streak

#### 2.5 Input UX Fixes
- [ ] 2.5.1 Number inputs (servings, weight, deficit, etc.) allow clearing to empty while typing — only enforce min on blur, not on every keystroke
- [ ] 2.5.2 All dates/times use user's local timezone, not UTC

---

### Phase 3 — Purdue Integration & Analytics
Make it smart at Purdue dining courts and give useful insights over time.

#### 3.1 Purdue Dining Court Integration (live menu)
- [ ] 3.1.1 Dining court picker — select which court you're at (Earhart, Wiley, Ford, Hillenbrand, Windsor)
- [ ] 3.1.2 Meal picker — select breakfast, lunch, or dinner (only show meals currently available based on time/hours)
- [ ] 3.1.3 Station-based food list — items grouped by station (e.g. "Granite Grill", "The Pastry Shop") matching dining court layout
- [ ] 3.1.4 Serving size input per item — tap an item, set number of servings, add to today's log
- [ ] 3.1.5 Running total bar — as you add items, show live running total of calories/protein/carbs/fat for this meal
- [ ] 3.1.6 "Planned menu" caveat banner — note that menu may differ from what's actually available
- [ ] 3.1.7 Remaining macros helper — show "you need X more protein today" alongside each item's nutrition so you pick smarter
- [ ] 3.1.8 Cache today's menu locally — don't re-fetch from API on every page load, refresh once per hour
- [ ] 3.1.9 Dining court hours — show open/closed status, grey out courts that are closed

#### 3.2 Water Tracking
- [ ] 3.2.1 Water intake tracker — simple glasses/oz counter on dashboard
- [ ] 3.2.2 Daily water goal based on body weight (~0.5 oz per lb or 33 ml per kg)
- [ ] 3.2.3 Visual progress (fill animation or progress bar)
- [ ] 3.2.4 Include in daily grade as a bonus factor

#### 3.3 Analytics & Insights
- [ ] 3.3.1 Visual workout vs rest day comparison table (side-by-side targets, color-coded)
- [ ] 3.3.2 Weekly summary — average intake, days on target, best/worst day
- [ ] 3.3.3 Weight trend chart with moving average
- [ ] 3.3.4 Body fat % tracking over time (if entered)
- [ ] 3.3.5 Macro distribution pie chart per day
- [ ] 3.3.6 Calorie trend line with target overlay
- [ ] 3.3.7 Analytics UI polish — fix colors for consistency, use bar charts for daily data (not line — we're not tracking time within a day), better chart legends and labels

#### 3.4 Body Recomp Tracking
- [ ] 3.4.1 Progress photos — upload weekly photos, view side-by-side comparison over time
- [ ] 3.4.2 Body measurements — waist, chest, arms, legs. Track over time with charts
- [ ] 3.4.3 Recomp indicators — "scale stalled but waist dropped 0.5 inches = recomp is working"

---

### Phase 4 — Polish & Deploy Web App
Get the app ready for other people to use, then ship it.

#### 4.1 Goal-Aware UX (not just cut)
The app currently works for all goals in formulas but the UX/tips/grading are cut-biased. Fix so bulk and maintain users get an equally good experience.
- [ ] 4.1.1 Profile recommendations: surplus display for bulk (show "TDEE + surplus = target" not "TDEE − deficit"), maintain shows "eating at TDEE"
- [ ] 4.1.2 Grading for bulk: penalize being UNDER calories (you need the surplus), reward hitting/slightly exceeding. Opposite of cut logic.
- [ ] 4.1.3 Grading for maintain: symmetric — penalize going too far over OR under equally
- [ ] 4.1.4 Tips and advice adapt to goal — bulk tips about eating enough, not "you're in a deficit"
- [ ] 4.1.5 Rest vs workout day for bulk: workout days might have slightly more carbs (fuel), rest days slightly more than cut rest days since you're in surplus
- [ ] 4.1.6 Dashboard messaging: "X cal remaining" on cut, "X cal left to hit surplus" on bulk, "on track" for maintain
- [ ] 4.1.7 Test full flow for a bulk user and a maintain user end-to-end (register, set goal, log food, check grades)

#### 4.2 Flexible Macro Suggestions
- [ ] 4.2.1 Let users customize macro priority order (e.g. "Protein > Carbs > Fat" vs "Protein > Fat > Carbs") — currently hardcoded
- [ ] 4.2.2 Adjustable protein/fat/carb ratios per day type — sliders or presets ("balanced", "high carb", "keto-ish")
- [ ] 4.2.3 Adapt suggestions based on user's actual workout schedule (not just binary rest/workout — account for heavy leg day vs light cardio vs full rest)
- [ ] 4.2.4 "What if" mode — preview how changing one macro target affects the others (since carbs fill remaining calories)

#### 4.3 Onboarding Flow
- [ ] 4.3.1 First-time user setup wizard — step by step: enter stats → pick goal → see recommendations → set targets → done
- [ ] 4.3.2 Skip option for experienced users who just want to set everything manually
- [ ] 4.3.3 Explain what each field means as they fill it in (educational tooltips)

#### 4.4 Data & Export
- [ ] 4.4.1 Backup API — export all user data (profile, custom foods, combos, baselines, food log, weight history) as JSON
- [ ] 4.4.2 Restore API — import a backup JSON to rebuild account and all personal data
- [ ] 4.4.3 Backup/restore UI on profile page — "Download Backup" + "Restore from Backup"
- [ ] 4.4.4 Export food log, weight history, grades as CSV

#### 4.5 Polish & UX
- [ ] 4.5.1 Loading states for all pages (skeleton screens, not blank)
- [ ] 4.5.2 Error toasts when API calls fail
- [ ] 4.5.3 Mobile-responsive CSS (usable on phone browser before native app)
- [ ] 4.5.4 Dark/light theme toggle

#### 4.6 Deploy & Portfolio (Web)
- [ ] 4.6.1 Deploy to Vercel (or Railway/Render) — move from SQLite to Turso or keep SQLite with persistent disk
- [ ] 4.6.2 Set up environment variables for production (session secret, etc.)
- [ ] 4.6.3 Write project README with screenshots, tech stack, what you learned
- [ ] 4.6.4 Add to resume with bullet points on what it demonstrates
- [ ] 4.6.5 Share with friends/classmates at Purdue for real-world testing
- [ ] 4.6.6 Collect feedback, fix bugs from real users

---

### Phase 5 — Mobile App (Expo/React Native)
Rebuild the UI for iOS and Android. Backend logic carries over.

#### 5.1 Project Setup
- [ ] 5.1.1 Create Expo project alongside web (`/mobile` directory)
- [ ] 5.1.2 Move shared logic to `/shared` (tdee.ts, grades.ts, nutrients.ts, types)
- [ ] 5.1.3 Configure both web and mobile to import from `/shared`
- [ ] 5.1.4 Set up expo-sqlite for on-device database
- [ ] 5.1.5 Set up expo-router for navigation

#### 5.2 Core Screens
- [ ] 5.2.1 Login / Register screens
- [ ] 5.2.2 Dashboard screen with day type toggle
- [ ] 5.2.3 Food log screen with search
- [ ] 5.2.4 Profile screen with recommendations
- [ ] 5.2.5 Grades screen

#### 5.3 Mobile-Specific Features
- [ ] 5.3.1 Apple HealthKit integration — pull real TDEE, steps, workout data
- [ ] 5.3.2 Auto-detect workout day from HealthKit activity
- [ ] 5.3.3 Barcode scanner for packaged foods
- [ ] 5.3.4 Push notifications — meal reminders, grade updates
- [ ] 5.3.5 Widget — today's calories/macros on home screen

#### 5.4 Camera & Vision Features (uses phone camera + AI)
- [ ] 5.4.1 Scan nutrition label → auto-create custom food (OCR extracts calories, protein, carbs, fat, serving size)
- [ ] 5.4.2 Photo food logging — take a picture of your plate, AI estimates portion sizes/serving amounts
- [ ] 5.4.3 Full AI calorie estimation — snap a photo, AI identifies the food AND estimates calories/macros
- [ ] 5.4.4 Save photo with food log entry so you can look back at what you ate

---

### Phase 6 — AI Meal Suggestion Engine
Fine-tuned AI model that knows Purdue dining, your macros, and your preferences.

#### 6.1 Data Collection & Training Set
- [ ] 6.1.1 Build training dataset — map meals to macro outcomes (e.g. "at Earhart lunch, picking X+Y+Z hits 600 cal, 45g P")
- [ ] 6.1.2 Log user preferences over time — what they pick, what they skip, ratings
- [ ] 6.1.3 Create meal combinations from menu items that hit common macro targets
- [ ] 6.1.4 Label good vs bad combos (hit targets = good, way over/under = bad)

#### 6.2 Model & Integration
- [ ] 6.2.1 Choose approach — fine-tuned LLM, recommendation engine, or constraint solver (research trade-offs)
- [ ] 6.2.2 User picks foods they want to eat — "I want the burger and fries" + optionally picks healthy sides they're OK with
- [ ] 6.2.3 AI builds a balanced meal around those picks — adjusts servings, suggests additions/swaps to hit macros (e.g. "get the burger but skip fries, add grilled chicken side + broccoli to hit protein")
- [ ] 6.2.4 Only sends the user's selected items + a few suggested healthy options to the AI — NOT the entire 40-item menu, keeps token usage low
- [ ] 6.2.5 Multiple suggestion styles — "high protein", "balanced", "I want comfort food but keep it reasonable"
- [ ] 6.2.6 Learn from user — if they reject a suggestion or always pick certain foods, adapt over time

#### 6.3 Privacy & IP Protection
Keep the main repo PUBLIC (portfolio). AI-specific assets go in a SEPARATE PRIVATE repo or cloud storage.
- [ ] 6.3.1 Create a private repo (e.g. `nutritrack-ai`) for training data, model weights, and evaluation scripts
- [ ] 6.3.2 Store fine-tuned model on private cloud (HuggingFace private, S3, etc.) — main app calls it via API
- [ ] 6.3.3 Add `/ai-data/` to `.gitignore` in main repo so training data never leaks to public
- [ ] 6.3.4 The API endpoint code that calls the model stays in the public repo — it's just fetch calls, the model itself is private

#### 6.4 Smart Features
- [ ] 6.4.1 Meal planning for the week — given your workout/rest schedule, suggest dining court meals for each day
- [ ] 6.4.2 "I already ate X for breakfast" → adjust lunch/dinner suggestions to balance macros
- [ ] 6.4.3 Allergen/preference awareness — avoid foods user has flagged (vegetarian, no peanuts, etc.)
- [ ] 6.4.4 Budget-aware — if user is running low on meal swipes, suggest efficient combos

---

### Phase 7 — Ship Mobile App & Scale

#### 7.1 Launch Mobile
- [ ] 7.1.1 App icon and splash screen
- [ ] 7.1.2 Build with EAS for iOS and Android
- [ ] 7.1.3 TestFlight beta (iOS) — share with friends for testing
- [ ] 7.1.4 App Store / Play Store submission
- [ ] 7.1.5 Update resume with both web + mobile versions

#### 7.2 Scale (if turning into a real product)
- [ ] 7.2.1 Cloud database (Supabase/Turso) for web + mobile sync
- [ ] 7.2.2 User accounts sync across web and mobile
- [ ] 7.2.3 Analytics dashboard — how many users, popular foods, etc.
- [ ] 7.2.4 Consider monetization if there's demand

## Rules
- **NEVER delete the database** — use ALTER TABLE migrations. User hates re-registering.
- **Explain concepts while coding** — user is learning, use Python/Java analogies when helpful.
- **Middleware is Edge runtime** — cannot import better-sqlite3 or anything from src/lib/auth.ts.
- **Session cookie name**: `nt_session` — hardcoded in both middleware.ts and auth.ts, keep in sync.
- **SQLite strings**: use single quotes in SQL (`datetime('now')`), double quotes = column identifiers.

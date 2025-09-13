## GoalForge — Frontend (Next.js)

GoalForge is a goal-tracking web app. The frontend is built with Next.js (App Router) and Tailwind CSS and talks to the backend via REST APIs. It features AI-assisted planning, an in-app tutor, check-ins, and simple analytics.

Live/deploy-ready with Vercel and monorepo-friendly rewrites.

## Features

- Authentication
	- Login and Register pages with localStorage token handling
	- Automatic redirect to /login on 401 via an Axios interceptor
- Dashboard
	- Top-level metrics (total/completed/active goals, learning velocity, session lengths)
	- Goals created vs completed per week chart
	- Recent check-ins list and quick “Log Check-in” action
- Goals
	- Goals list with progress preview and create/edit/delete
	- Create Goal with optional AI suggestion (fallback to heuristic when rate-limited or error)
	- Goal detail shows journeys and milestones, progress bars, and actions
	- Update milestone progress with guard rails for unmet dependencies
	- History of past AI/heuristic suggestions
- Check-ins
	- Create schedules (daily/weekly/biweekly), optionally tied to a milestone
	- Log check-ins (confidence slider, optional notes, optional milestone progress update)
	- See recent check-ins globally and per goal
- Tutor (AI assistant)
	- Contextual chat by goal or milestone (Use AI toggle)
	- Fetch/create sessions, send messages, view history
	- Generate and view session summaries (markdown with key points and action items)
	- One-click copy of action items
- Analytics
	- Dashboard overview
	- Per-goal analytics: completion per milestone, completions per week, and session summaries
- UI/UX
	- App Router, client components where needed
	- Catppuccin Latte theme with Tailwind v4
	- Responsive SVG charts (no heavy chart library)

## High-level Architecture

- App Router
	- `src/app/` with routes like `/login`, `/register`, `/dashboard`, `/goals`, `/goals/[id]`, `/checkins`
	- Authenticated area in `src/app/(authenticated)/` with a 2-column layout and sidebar
- Components
	- `components/checkin/*` — lists, create form, log modal
	- `components/tutor/*` — chat panel and summary display
	- `components/analytics/*` — small metric cards and custom SVG bar charts
	- `components/Sidebar.tsx` — primary navigation
- Data layer
	- `src/lib/auth.ts` creates an Axios instance (`apiClient`) with:
		- Base URL from `NEXT_PUBLIC_API_BASE_URL` (browser) or rewritten `/api` (server)
		- LocalStorage bearer token (client) and cookies (`withCredentials: true`)
		- 401 handling that clears token and redirects to `/login?next=...`
- API access (selected endpoints)
	- Auth: `/api/auth/login`, `/api/auth/register`, `/api/auth/me`
	- Goals: `/api/goals`, `/api/goals/:id`, `/api/goals/:id/suggest`, `/api/goals/:id/suggestions`, `/api/goals/:id/journeys`
	- Journeys & Milestones: `/api/journeys/:id/milestones` (POST), `/api/milestones/:id` (PUT)
	- Check-ins: `/api/checkins/schedules`, `/api/checkins/schedules/:id/entries`, `/api/checkins/entries`
	- Tutor: `/api/tutor/sessions`, `/api/tutor/sessions/:id/messages`, `/api/tutor/sessions/:id/summary`
	- Analytics: `/api/analytics/overview`, `/api/analytics/goal/:id`
- Networking
	- `next.config.ts` defines a rewrite: frontend `/api/*` → `${API_BASE_URL}/*`
	- Prefer rewrites for server-to-server calls; optionally set `NEXT_PUBLIC_API_BASE_URL` to hit the backend directly from the browser

## Environment Variables

Set these in `frontend/.env.local` (local) and in your Vercel project settings (Production/Preview as appropriate):

- API_BASE_URL (server-only)
	- Used by Next.js rewrites for `/api/*` → `${API_BASE_URL}/*`
	- Example: `http://localhost:4000` (dev) or `https://your-backend.example.com` (prod)
- NEXT_PUBLIC_API_BASE_URL (optional, public)
	- If set, the browser will call the backend directly; otherwise, it relies on `/api/*` rewrites
	- Example: `https://your-backend.example.com`

Note: When deploying over HTTPS, ensure the backend is also available via HTTPS or enable proxies to avoid mixed-content issues. If you rely on cookie auth, ensure CORS and cookie settings are compatible.

## Local Development

Prereqs: Node 18+ recommended.

1) Install dependencies

```bash
npm install
```

2) Configure env (optional in pure local if backend at default)

```bash
# fish shell examples
printf "API_BASE_URL=http://localhost:4000\n" > .env.local
# Optionally, call backend directly from browser (bypass rewrites):
printf "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000\n" >> .env.local
```

3) Start the dev server

```bash
npm run dev
```

4) Open http://localhost:3000

You’ll be redirected to `/login` when unauthenticated. A successful login stores a token in localStorage.

## Project Structure (frontend)

```
frontend/
	next.config.ts            # /api/* → API_BASE_URL rewrites
	src/
		app/                    # App Router pages
			(authenticated)/      # Layout + pages requiring auth
				dashboard/
				goals/
				checkins/
			login/
			register/
		components/
			analytics/            # MetricCard, charts
			checkin/              # Create, list, log modals
			tutor/                # TutorPanel, SummaryCard
			Sidebar.tsx
		lib/
			auth.ts               # Axios client + auth helpers
```

## Scripts

- `npm run dev` — Start Next.js in development
- `npm run build` — Production build
- `npm run start` — Start the production server
- `npm run lint` — Run ESLint

## Deploying to Vercel

This repo’s root contains a monorepo-friendly `vercel.json`. In Vercel:

- Project root: repository root
- Framework preset: Next.js
- Install command: auto
- Build command: `npm run build` (Vercel detects `frontend/` workspace)
- Output directory: auto
- Environment Variables (Project → Settings → Environment Variables):
	- `API_BASE_URL` → Your backend URL (e.g., `https://your-backend.example.com`)
	- Optionally `NEXT_PUBLIC_API_BASE_URL` to call backend directly from browsers

The app uses Next.js rewrites so `/api/*` from the frontend will proxy to `API_BASE_URL`.

## Troubleshooting

- Redirect loop to /login
	- Your token might be missing/expired or the backend returns 401. Ensure `API_BASE_URL` is correct and CORS/cookies are set when needed.
- API calls fail in production but work locally
	- Check that `API_BASE_URL` is HTTPS and reachable from Vercel. If calling directly from the browser, set `NEXT_PUBLIC_API_BASE_URL`.
- 429 or AI errors when suggesting journeys
	- The UI falls back to a heuristic plan and surfaces a message. Try again later or reduce frequency.
- Mixed content warnings
	- Use HTTPS for both frontend and backend.

## Notes

- Styling uses Tailwind v4 with Catppuccin palette (Latte). See `src/app/globals.css`.
- Charts are lightweight responsive SVGs (no external chart libs).
- Most data fetching is client-side via Axios; some routes are marked `"use client"` intentionally.

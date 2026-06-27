
# PhishGuard — Phase 2: RBAC, Admin Console & Backend Schema Alignment

Building on the existing landing + auth + inbox + analyzer + report scaffold. All work stays in the frontend; backend stays mocked behind a typed service layer so you can later swap `VITE_API_BASE_URL` to your FastAPI without touching components.

## 1. Schema alignment to your FastAPI

Update `src/types/api.ts` and `src/lib/mocks/analyzer.ts` to your exact contract:

```ts
type RiskLevel = "Low Risk" | "Medium Risk" | "High Risk" | "Critical Threat";

interface ScanResult {
  id: string;
  is_phishing: boolean;
  phishing_probability: number;     // 0..1
  risk_score: number;               // 0..100
  risk_level: RiskLevel;
  flags: string[];
  sender: string;
  subject: string;
  date: string;                     // ISO
  snippet: string;
  body: string;
  url_guard_flagged: number;
  employee_id: string;              // for admin filtering
}
```

`ResultPanel.tsx` is rewired:
- Single radial gauge = `risk_score` (0–100), color-mapped by `risk_level`
- Secondary linear meter = `phishing_probability`
- Badge = `risk_level` with theme color (Low=emerald, Medium=cyber-blue, High=neon-orange, Critical=crimson)
- Flags list driven by `flags[]`
- URL Guard chip showing `url_guard_flagged` count

Service layer in `src/services/api/`:
- `analyzer.ts` → `POST /scan/text`
- `history.ts` → `GET /history`
- `stats.ts` → `GET /stats`
- `rules.ts` → `GET/POST/DELETE /rules`
- `employees.ts` (frontend-only for now) → list/create/update/delete + credential mapping

All call a shared `client.ts` that falls back to typed mocks when `VITE_API_BASE_URL` is unset.

## 2. Theme refresh — Luxury Cybersecurity

Update `src/styles.css` tokens:
- Background: premium navy/slate (lighter than current near-black)
- Glass surfaces: frosted white/slate translucency with stronger blur + inner highlight
- Accents: `--cyber-blue`, `--safe-emerald`, `--warn-amber`, `--threat-crimson`
- New `risk-{low|medium|high|critical}` semantic tokens consumed by badges/gauges/charts

Subtle 3D depth via layered shadows + gradient borders; keep existing R3F aurora on landing only.

## 3. Role-Based Access Control

Extend `authStore.ts`:
```ts
type Role = "admin" | "employee";
interface AuthUser { id; email; name; picture; role: Role; orgId; }
```

Demo mode seeds two profiles: `admin@phishguard.dev` (admin) and `analyst@phishguard.dev` (employee). A role-switcher chip in the topbar (demo-only) makes both views explorable without real Google accounts.

New `src/routes/_authenticated/_admin.tsx` pathless layout uses `beforeLoad` + `redirect()` to `/dashboard` when `auth.role !== "admin"`. Admin-only routes live under it.

Sidebar items conditionally render by role.

## 4. Route map (additions)

```
src/routes/
  _authenticated.dashboard.tsx          (already exists — becomes role-aware)
  _authenticated.inbox.tsx              (employee scope OR impersonated)
  _authenticated.analyzer.tsx
  _authenticated.reports.$messageId.tsx
  _authenticated.rules.tsx              NEW — sender rules (both roles)
  _authenticated._admin.tsx             NEW — admin gate
  _authenticated._admin.admin.tsx       NEW — admin dashboard (charts)
  _authenticated._admin.admin.employees.tsx        NEW — employee table
  _authenticated._admin.admin.employees.$id.tsx    NEW — employee detail + credential mapping + "View inbox as"
```

## 5. Admin Dashboard (`/admin`)

Built with `recharts` (add dependency). Cards:
- KPI row: Total scans today, Safe, Phishing, Critical, Avg risk score — animated counters
- Doughnut: Safe vs Phishing vs Suspicious distribution
- Bar: Scans per day (last 14 days)
- Horizontal bar: Top attacked domains (derived from `sender` domains of flagged scans)
- Stacked area: Risk-level trend over time

All driven by `GET /stats` + `GET /history` mock data with realistic distributions.

## 6. Employee Management (`/admin/employees`)

Table (shadcn `Table`):
- Avatar, name, email, role, # scans, # threats caught, last active, status
- Row click → `/admin/employees/$id`

Detail page:
- Profile header + stats strip
- **Google API Credentials card** (admin-only): inputs for `client_id`, `client_secret`, `refresh_token`, mapped to the employee's DB id. Stored in mock store; field labels make clear these belong on the backend in production and the form posts to a future `POST /admin/employees/$id/credentials` endpoint
- **"View inbox as this employee"** button → sets `impersonatedEmployeeId` in `authStore`, navigates to `/inbox`. Persistent topbar banner with "Exit impersonation" while active. Inbox/reports filter by impersonated id.

## 7. Custom Sender Rules (`/rules`)

Single page, two tabs: **Whitelist** / **Blacklist**.
- Add form: domain or email + label (Safe/Spam) + optional note
- List with delete + bulk select
- Admin sees org-wide toggle ("My rules" vs "Organization rules"); employees see only their own
- Mock store keyed by employee id; admin can edit any

## 8. Inbox & Report polish

- Left pane email rows show a colored `RiskBadge` derived from `risk_level`
- Right pane keeps current detail layout; "Security Report" glass card upgraded to use new gauge + risk-level palette
- Quick actions: "Mark sender Safe / Spam" → writes to rules store

## 9. State

Zustand slices:
- `authStore` — user, role, impersonation
- `analyzerStore` — current scan, history cache
- `employeesStore` — list, selected, credential map (mock)
- `rulesStore` — per-user rules
- `statsStore` — dashboard aggregates

## 10. Out of scope (Phase 3)

- Real FastAPI wiring (one-line `VITE_API_BASE_URL` swap; service layer is ready)
- Real Google credential persistence (currently mocked client-side)
- Notifications center, audit log, settings/account
- Org/multi-tenant management beyond a single seeded org

## Deliverables

- New routes + components above
- Updated types + mocks matching your FastAPI contract
- Theme tokens refreshed to luxury cybersecurity palette
- Recharts dependency added
- README section explaining demo role switch + impersonation

# Phase 1: Owner Access & Menu Management - Research

**Researched:** 2026-05-23
**Domain:** React SPA login flow + tRPC menu CRUD + image URL display
**Confidence:** HIGH

## Summary

Phase 1 adds a dedicated `/login` route for returning venue owners and upgrades the owner dashboard with full menu CRUD (create, edit, delete) plus per-item image URL support. The backend already has all required logic: `venue.login` mutation is complete, JWT/bcrypt auth is wired, and `createMenuItem` exists. The gaps are purely frontend: no `/login` page exists, the dashboard has no menu management tab, and the `image` field on menu items is never surfaced in the UI or on the public venue page.

All DB schema work is done. `menuItems.image` is a `varchar(255)` column that already migrates and persists. No backend schema migrations are needed for this phase. The only backend addition required is `updateMenuItem` and `deleteMenuItem` mutations in `venue-router.ts` — these do not exist yet.

**Primary recommendation:** Build a `/login` page that mirrors the visual style of `StaffLogin.tsx` (card layout, consistent Geist Mono typography), wire it to the already-working `venue.login` tRPC mutation, and add a "Menu" tab to `OwnerDashboard.tsx` backed by two new mutations on `venueRouter`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Returning venue owner can log in at `/login` with email and password | `venue.login` mutation is complete in `venue-router.ts` (lines 72-95). Frontend `/login` page does not exist — must be created. |
| AUTH-02 | Logged-in owner is redirected to `/dashboard` after login | `useVenueAuth.login()` stores token to `localStorage`; redirect via `useNavigate` to `/dashboard`. Pattern exists in `Onboarding.tsx` `setStep(3)` flow. |
| AUTH-03 | Owner login page links to `/onboarding` for new registrations | Simple `<Link>` or anchor to `/onboarding`. No backend work needed. |
| MENU-01 | Venue owner can add an image URL to a menu item | `menuItems.image` column exists in schema (line 99). `createMenuItem` accepts `image` param. `updateMenuItem` mutation must be added to `venue-router.ts`. |
| MENU-02 | Public venue menu displays item images when available | `VenuePublic.tsx` renders menu items but never reads `item.image`. Conditional `<img>` must be added to the item card render. |
| MENU-03 | Owner can create, edit, and delete menu items from the dashboard | `createMenuItem` exists. `updateMenuItem` and `deleteMenuItem` mutations are missing from `venue-router.ts`. Dashboard needs a "Menu" tab. |
</phase_requirements>

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 19 + TypeScript | 19.x | Frontend UI | Project stack |
| react-router (v7) | 7.x | Client-side routing | Already used — `<Routes>`, `useNavigate`, `useParams` |
| tRPC (client) | current | Type-safe API calls | All existing pages use `trpc.venue.*` pattern |
| Drizzle ORM | current | DB queries in venue-router | All backend queries use Drizzle |
| jose + bcrypt-ts | current | JWT verify + password compare | Already used in `venue.login` |
| Tailwind CSS + shadcn/ui | current | Styling | Project convention |
| lucide-react | current | Icons | Used throughout — `LogIn`, `Shield`, `Coffee`, etc. |

### No new dependencies required for this phase.

**Installation:** None needed.

---

## Architecture Patterns

### Existing Project Structure (relevant paths)

```
app/
├── api/
│   └── venue-router.ts        # Add updateMenuItem, deleteMenuItem here
├── src/
│   ├── App.tsx                # Add <Route path="/login"> here
│   ├── hooks/
│   │   └── useVenueAuth.ts    # Reuse login(), logout(), owner, venue
│   └── pages/
│       ├── Login.tsx          # NEW — owner login page
│       ├── OwnerDashboard.tsx # ADD MenuTab component here
│       └── VenuePublic.tsx    # ADD conditional image render in menu item card
```

### Pattern 1: Owner Login Page

**What:** A new `Login.tsx` page at `/login` that calls `trpc.venue.login.useMutation`, stores the token via `useVenueAuth.login()`, then navigates to `/dashboard`.

**When to use:** Whenever a returning owner needs to authenticate.

**Key facts from codebase inspection:**
- `venue.login` mutation already exists and returns `{ token, owner, venue }`
- `useVenueAuth.login(token)` writes to `localStorage('b1-owner-token')` and triggers the `venue.me` query reactively
- After `login()`, navigate to `/dashboard` — `OwnerDashboard` reads from `useVenueAuth` which will now be populated
- Visual style: match `OwnerDashboard.tsx` design system — `#F3F2EE` background, `#181818` text, `Geist Mono` font-data class for labels, uppercase buttons
- The existing "Login Required" guard in `OwnerDashboard.tsx` (line 27) currently sends users to `/onboarding` — this should be updated to `/login` once the page exists

**Example (pattern from StaffLogin.tsx and Onboarding.tsx):**
```typescript
// src/pages/Login.tsx
const { login } = useVenueAuth();
const navigate = useNavigate();

const loginMutation = trpc.venue.login.useMutation({
  onSuccess: (data) => {
    login(data.token);          // writes to localStorage
    navigate('/dashboard');     // redirect to dashboard
  },
  onError: (err) => setError(err.message),
});
```

### Pattern 2: Menu Tab in OwnerDashboard

**What:** Add a `'menu'` option to the existing tab union type and render a `MenuTab` component.

**Key facts:**
- `OwnerDashboard.tsx` line 10: `useState<'overview' | 'settings' | 'billing' | 'integrations'>('overview')`
- Extend to `'overview' | 'settings' | 'billing' | 'integrations' | 'menu'`
- `trpc.venue.listMenu.useQuery({ venueId })` is the query to fetch items — already exists
- `trpc.venue.createMenuItem.useMutation` exists
- `updateMenuItem` and `deleteMenuItem` must be added to `venue-router.ts`

**Pattern for new mutations in venue-router.ts:**
```typescript
updateMenuItem: publicQuery.input(z.object({
  token: z.string(),
  menuItemId: z.number().int().positive(),
  data: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    price: z.string().or(z.number()).optional(),
    category: z.enum(["coffee", "pastries", "bread"]).optional(),
    image: z.string().optional(),
    dietary: z.string().optional(),
  }),
})).mutation(async ({ input }) => {
  const db = getDb();
  await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 }); // verify auth
  await db.update(menuItems).set(input.data).where(eq(menuItems.id, input.menuItemId));
  return { success: true };
}),

deleteMenuItem: publicQuery.input(z.object({
  token: z.string(),
  menuItemId: z.number().int().positive(),
})).mutation(async ({ input }) => {
  const db = getDb();
  await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
  await db.delete(menuItems).from(menuItems).where(eq(menuItems.id, input.menuItemId));
  return { success: true };
}),
```

Note: `delete` in Drizzle MySQL uses `db.delete(table).where(...)` — not `db.delete(table).from(table).where(...)`. Verify exact Drizzle API at call time.

### Pattern 3: Conditional Image in VenuePublic

**What:** In the menu item card render in `VenuePublic.tsx`, conditionally show an `<img>` only when `item.image` is truthy.

**Key facts:**
- `menuItems.image` is a `varchar(255)` — it will be `null` when unset (Drizzle returns null for unset nullable varchar)
- The `listMenu` query already returns the `image` field — `menuItems.$inferSelect` includes all columns
- No backend changes needed for MENU-02

**Example:**
```tsx
{item.image && (
  <img
    src={item.image}
    alt={item.name}
    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
    onError={(e) => { e.currentTarget.style.display = 'none'; }}
  />
)}
```

The `onError` handler hides the slot cleanly if the URL is broken — satisfies success criterion 5.

### Anti-Patterns to Avoid

- **Do not create a separate auth context/provider:** `useVenueAuth` hook with localStorage is the established pattern. Do not introduce React Context or a new provider.
- **Do not add token to tRPC headers:** The project passes `token` as a direct input to mutations (see `venue.update`, `venue.updateLogo`). Follow this pattern — do not change the tRPC setup.
- **Do not redirect with `window.location.reload()`:** `StaffLogin.tsx` does this due to hash routing quirks. For the owner `/login` page, use `useNavigate('/dashboard')` — the owner dashboard uses React Router path-based routing, not hash routing.
- **Do not add a new auth route to the Hono backend:** The `venue.login` tRPC mutation is the correct entry point. No new REST endpoints needed.
- **Do not use `db.delete(menuItems).from(menuItems)` if Drizzle doesn't support it:** Drizzle MySQL delete is `db.delete(menuItems).where(...)`. Check exact syntax.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification in new mutations | Custom token parsing | `jwtVerify(token, JWT_SECRET)` from `jose` | Same pattern as all other authed mutations in venue-router.ts |
| Password hashing | Custom bcrypt | `compare` from `bcrypt-ts` | Already imported and used in `venue.login` |
| Form state management | Redux/Zustand | `useState` | All existing forms in the project use local state only |
| Image upload | S3/file upload widget | URL text input | Explicitly decided: "Menu images via URL input first; S3/Cloudflare R2 deferred to v1.2+" |

**Key insight:** This phase is almost entirely about wiring existing pieces together. The backend auth and menu infrastructure is mostly complete. The work is UI + two missing mutations.

---

## Common Pitfalls

### Pitfall 1: OwnerDashboard "Login Required" redirect still points to /onboarding

**What goes wrong:** After building `/login`, owners who visit `/dashboard` unauthenticated are sent to `/onboarding` (registration), not `/login`. Auth-02 test fails.

**Why it happens:** Line 27 of `OwnerDashboard.tsx` has `navigate('/onboarding')` as the fallback.

**How to avoid:** Update that button's `onClick` to `navigate('/login')` when building the login page.

**Warning signs:** Manual test of visiting `/dashboard` without a token.

### Pitfall 2: `venue.me` query returns stale null after login

**What goes wrong:** After calling `useVenueAuth.login(token)`, the `venue.me` query may not refetch immediately, causing the dashboard to briefly show "Login Required."

**Why it happens:** The query is keyed on `token` state; `useState` setter is async.

**How to avoid:** `useVenueAuth` already uses `{ enabled: !!token }` — after `setToken(newToken)` React will re-render and the query will fire. Use `navigate` after `login()` call, not `window.location.reload()`. The `OwnerDashboard` loading state handles the brief window.

### Pitfall 3: `deleteMenuItem` cascade — orderItems reference menuItemId

**What goes wrong:** Deleting a menu item that has existing `orderItems` referencing it via FK will throw a MySQL FK constraint error.

**Why it happens:** `orderItems.menuItemId` has a foreign key to `menuItems.id` in the schema (line 177 of schema.ts).

**How to avoid:** Two options:
1. Soft-delete (add `isActive: boolean` to menuItems) — not in current schema, requires migration
2. Check for existing order items before deletion and return a user-friendly error
3. Use a DB-level cascade delete — requires migration

**Recommendation for v1.1:** Before calling `db.delete`, query `orderItems` for any row referencing `menuItemId`. If found, throw a `TRPCError({ code: "CONFLICT", message: "Cannot delete item with existing orders" })`. No migration needed.

### Pitfall 4: `image` field in `createMenuItem` — slug uniqueness

**What goes wrong:** `createMenuItem` requires a `slug` field but there is no uniqueness constraint scoped per-venue in the schema — only a primary key. Two items with the same slug in a venue will silently succeed.

**Why it happens:** Schema has `slug: varchar(64)` without a unique constraint at the row level.

**How to avoid:** In the menu management UI, auto-generate the slug from the item name (e.g., `name.toLowerCase().replace(/\s+/g, '-')`). The owner does not need to set it manually. Do not surface the slug field in the creation form.

### Pitfall 5: `useVenueAuth` venue shape vs OwnerDashboard expectations

**What goes wrong:** After login, `venue.me` returns the full venue row, but `useVenueAuth` casts it to a subset interface. If the planner adds fields to the MenuTab that aren't in the `Venue` interface defined in `useVenueAuth.ts`, TypeScript errors appear.

**Why it happens:** The `Venue` interface in `useVenueAuth.ts` (lines 13-21) only includes 8 fields.

**How to avoid:** The `venue` object passed to `MenuTab` only needs `venueId` for queries. Pass `venue.id` explicitly.

---

## Code Examples

### Existing: How venue.login is called (backend, venue-router.ts lines 72-95)

The mutation validates credentials, signs a 7-day JWT, updates `lastLoginAt`, and returns `{ token, owner, venue }`. No changes needed to this mutation.

### Existing: How other authed mutations verify tokens

```typescript
// Pattern from venue-router.ts update mutation (line 128)
const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
const venueId = payload.payload.venueId as number;
```

Use this exact pattern in `updateMenuItem` and `deleteMenuItem`.

### Existing: How listMenu is queried (line 256-266 venue-router.ts)

```typescript
listMenu: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  category: z.string().optional(),
})).query(async ({ input }) => {
  const db = getDb();
  return db.select().from(menuItems).where(and(...conditions));
}),
```

The MenuTab fetches with `trpc.venue.listMenu.useQuery({ venueId: venue.id })`.

### Existing: Drizzle update pattern (from venue-router.ts line 131)

```typescript
await db.update(venues).set({ ...input.data, updatedAt: new Date() }).where(eq(venues.id, venueId));
```

Mirror this for `updateMenuItem` using `menuItems` table and `eq(menuItems.id, input.menuItemId)`.

---

## State of the Art

| Old Approach | Current Approach | Status | Impact |
|--------------|------------------|--------|--------|
| No `/login` route — owners reached dashboard only via onboarding success | Dedicated `/login` page with email+password | To be built | AUTH-01/02/03 |
| Menu management: "Coming soon" button in OverviewTab | Full CRUD in a Menu tab | To be built | MENU-03 |
| `image` field stored in DB but never displayed | Conditional image render in VenuePublic | To be built | MENU-01/02 |
| `updateMenuItem` / `deleteMenuItem` mutations: absent | Add to venue-router | To be built | MENU-03 |

---

## Open Questions

1. **Drizzle MySQL delete exact syntax**
   - What we know: `db.delete(table).where(condition)` is the standard Drizzle MySQL pattern
   - What's unclear: Whether the project's Drizzle version uses `.from()` chaining or not
   - Recommendation: Check Drizzle source in node_modules or use the same pattern as the existing `db.update` calls — if `db.delete` throws, fall back to raw `db.execute`

2. **OwnerDashboard token access in MenuTab**
   - What we know: `SettingsTab` and `BillingTab` both do `const token = localStorage.getItem('b1-owner-token') || ''` directly (lines 124, 167)
   - What's unclear: Whether to continue this pattern or thread token down from parent via props
   - Recommendation: Continue the established pattern — read from localStorage in the tab component. This is consistent with the codebase.

3. **category enum for new menu items**
   - What we know: `category` is `mysqlEnum("category", ["coffee", "pastries", "bread"])` — only 3 values
   - What's unclear: Whether owners need additional categories for v1.1
   - Recommendation: Implement with these 3 categories for now — this matches the enum in the schema and is in scope.

---

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — `app/api/venue-router.ts` (complete file read)
- Direct codebase inspection — `app/db/schema.ts` (complete file read)
- Direct codebase inspection — `app/src/hooks/useVenueAuth.ts` (complete file read)
- Direct codebase inspection — `app/src/pages/OwnerDashboard.tsx` (complete file read)
- Direct codebase inspection — `app/src/pages/VenuePublic.tsx` (lines 1-200)
- Direct codebase inspection — `app/src/pages/StaffLogin.tsx` (complete file read)
- Direct codebase inspection — `app/src/App.tsx` (routes)
- `.planning/STATE.md` — confirmed "Menu images via URL input first" decision

### Secondary (MEDIUM confidence)

- Drizzle ORM MySQL delete syntax — based on established project patterns and Drizzle documentation conventions. Verify at implementation time.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct codebase inspection, no new dependencies required
- Architecture: HIGH — all patterns observed directly in existing pages and router
- Pitfalls: HIGH (FK cascade, slug, redirect) / MEDIUM (Drizzle delete syntax) — based on schema and code inspection

**Research date:** 2026-05-23
**Valid until:** 2026-06-23 (stable codebase, no fast-moving dependencies)

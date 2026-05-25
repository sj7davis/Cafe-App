# Phase 5: Venue Expansion — Research

**Researched:** 2026-05-25
**Domain:** Multi-location management + catering enquiries (Drizzle/MySQL/tRPC/React)
**Confidence:** HIGH

---

## Summary

Phase 5 adds two independent feature tracks on top of the existing venue-router pattern. The schema is already complete — `locations` and `cateringRequests` tables exist in `app/db/schema.ts` with all required columns. `listLocations` is already registered in venue-router.ts. No Drizzle migrations are needed; all new work is router procedures and UI.

The locations track requires: CRUD procedures for owner-managed locations, a location selector in the VenuePublic checkout drawer (saved as `locationId` on the order — the column already exists in `orders`), per-location hours displayed on the public page, and a location filter in StaffDashboard OrdersTab. The catering track requires: a public `submitCateringRequest` procedure, a catering enquiry form on VenuePublic, and a CateringTab in OwnerDashboard with status-update mutation.

**Primary recommendation:** Follow the exact procedure and UI patterns established in Phases 1–3. Use the union-mode state pattern for location CRUD in the owner dashboard (matching MenuTab). Use SELECT-then-condition for filtering rather than raw SQL WHERE clauses.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LOC-01 | Owner can add and manage multiple locations from the dashboard | `locations` table exists; need addLocation/updateLocation/deleteLocation procedures + LocationsTab UI |
| LOC-02 | Customer can select a pickup location when placing an order; saved with order | `orders.locationId` column exists (nullable bigint); extend createOrder input + VenuePublic selector |
| LOC-03 | Each location's operating hours displayed on public venue page | `locations` has hoursWeekday/hoursSaturday/hoursSunday; extend VenuePublic hours section to iterate locations |
| LOC-04 | Staff dashboard filterable by location | Extend listOrders with optional `locationId` param; add location filter dropdown to StaffDashboard OrdersTab |
| CAT-01 | Public venue page has catering enquiry form (name, phone, date, guest count, details) | `cateringRequests` table has all columns; need submitCateringRequest public procedure + form in VenuePublic |
| CAT-02 | Catering request saved to DB and visible in owner dashboard | submitCateringRequest inserts row; listCateringRequests procedure + CateringTab in OwnerDashboard |
| CAT-03 | Owner can update catering request status (new → quoted → confirmed → completed) | `cateringRequests.status` enum has all four values; need updateCateringStatus mutation + UI in CateringTab |
</phase_requirements>

---

## Schema Confirmation (HIGH confidence — read directly from source)

### locations table (schema.ts lines 76–87)
```typescript
{ id, venueId, name (varchar 128), address (varchar 255), phone (varchar 32),
  isDefault (boolean), hoursWeekday (varchar 64), hoursSaturday (varchar 64),
  hoursSunday (varchar 64), createdAt }
```
No unique constraint on name — app-level validation sufficient.

### orders table — locationId column confirmed (schema.ts line 165)
```typescript
locationId: bigint("location_id", { mode: "number", unsigned: true })
// nullable — no .notNull() — existing orders unaffected
// no .references() — intentionally loose FK (safe for MVP)
```

### cateringRequests table (schema.ts lines 293–304)
```typescript
{ id, venueId, name (varchar 255), phone (varchar 32), email (varchar 320, nullable),
  eventDate (varchar 32), guestCount (int), details (text, nullable),
  status: mysqlEnum("status", ["new", "quoted", "confirmed", "completed"]).default("new").notNull(),
  createdAt }
```

### Existing router baseline
- `listLocations` exists at line 496 — public, takes `{ venueId }` — no auth.
- No other location mutations exist yet.
- No catering procedures exist yet.

---

## Architecture Patterns

### Procedure patterns (from venue-router.ts analysis)

**Auth pattern** — owner-only mutations use `jwtVerify` + venueId ownership from JWT payload:
```typescript
const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
const venueId = payload.payload.venueId as number;
```

**FK ownership guard** — before mutating a child row, verify it belongs to the JWT venueId:
```typescript
const existing = await db.select().from(locations).where(eq(locations.id, input.locationId)).limit(1);
if (!existing[0] || existing[0].venueId !== venueId) {
  throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
}
```
This pattern mirrors `deleteMenuItem` (confirmed in Phase 1 decisions).

**Public procedure pattern** — catering submission (no auth, same as createOrder):
```typescript
submitCateringRequest: publicQuery.input(...).mutation(async ({ input }) => { ... })
```

**Filtering pattern** — listOrders uses conditions array:
```typescript
const conditions = [eq(orders.venueId, input.venueId)];
if (input.status) conditions.push(eq(orders.status, input.status as any));
// Extend: if (input.locationId) conditions.push(eq(orders.locationId, input.locationId));
```

### UI patterns (from OwnerDashboard.tsx analysis)

**Tab registration pattern** — tabs array at line 62:
```typescript
{ id: 'locations' as const, label: 'Locations', icon: MapPin },
{ id: 'catering' as const, label: 'Catering', icon: Briefcase },
```
Tab state type must be extended to include new IDs.

**CRUD mode pattern** (from MenuTab — established Phase 1 decision):
```typescript
const [mode, setMode] = useState<'list' | 'create' | { type: 'edit'; id: number }>('list');
```
Use this same union-mode state for LocationsTab.

**Import pattern** — OwnerDashboard.tsx already imports `MapPin` and `Briefcase` from lucide-react (visible in StaffDashboard imports). Verify before assuming.

**Token access** — `const token = localStorage.getItem('b1-owner-token') || '';` (line 128 pattern, consistent).

### VenuePublic patterns

**Location selector placement** — goes inside the checkout drawer, after the "Your details" section, before Place Order button. Mirrors the milk/sugar select pattern with `useState`.

**Conditional render** — only show location selector when `locations.length > 1` (single-location venues should not see unnecessary UI).

**Hours per location** — currently the hours section (lines 466–485) renders `venue.hoursWeekday/Saturday/Sunday`. When locations exist, iterate the locations array and render per-location hours block. Keep the venue-level hours as fallback when no locations defined.

**createOrder mutation extension** — add optional `locationId?: number` to input. Backend must accept it without breaking existing calls (optional field).

### StaffDashboard filter pattern

OrdersTab currently has status filter (lines 319–338). Add a second filter row for location:
```typescript
const [locationFilter, setLocationFilter] = useState<number | null>(null);
```
Pass `locationId: locationFilter ?? undefined` to `listOrders` query. Fetch locations with `trpc.venue.listLocations` for the dropdown labels.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Unique location code | Custom UUID/nanoid | Not needed — locations identified by DB id |
| Status machine enforcement | Frontend guard only | Server-side status validation on updateCateringStatus |
| Ownership verification | Trust client venueId | Extract venueId from JWT payload always |
| Duplicate catering guard | Block re-submits | Not required — catering requests are independent events |

---

## Common Pitfalls

### Pitfall 1: Trusting client venueId for mutations
**What goes wrong:** Owner could mutate another venue's locations by passing a different venueId.
**How to avoid:** Always extract `venueId` from the verified JWT payload, never from `input.venueId` in mutating procedures. Read-only queries like `listLocations` may accept venueId from input (same as listOrders).

### Pitfall 2: Breaking existing orders when adding locationId
**What goes wrong:** Making locationId required in createOrder breaks all existing orders and in-flight clients.
**How to avoid:** locationId is nullable in schema and must be optional in the Zod input (`z.number().int().positive().optional()`). Do not add `.notNull()` to schema.

### Pitfall 3: Rendering hours section when no locations exist
**What goes wrong:** Location-based hours section shows empty when venue only uses venue-level hours.
**How to avoid:** Guard: `if (locations && locations.length > 0)` render location hours; else render existing venue-level hours block. Never remove the existing venue-level hours code — it is the fallback.

### Pitfall 4: listOrders locationId filter breaking no-filter case
**What goes wrong:** Passing `locationId: null` or `locationId: 0` to listOrders adds a spurious WHERE clause.
**How to avoid:** Use same pattern as status filter — only push condition when value is truthy. `if (input.locationId) conditions.push(eq(orders.locationId, input.locationId))`.

### Pitfall 5: deleteLocation without checking for orders
**What goes wrong:** Deleting a location that has associated orders leaves orphan locationId references.
**How to avoid:** Before delete, verify no orders reference this location, or simply null out the locationId on the location (soft approach). For MVP: block delete with CONFLICT if orders exist for this locationId. Mirror the `deleteMenuItem` FK guard pattern.

### Pitfall 6: catering form submitting empty required fields
**What goes wrong:** Blank eventDate or guestCount=0 passes client validation but hits DB constraint.
**How to avoid:** Add Zod validation: `eventDate: z.string().min(1)`, `guestCount: z.number().int().min(1)`. Client-side: disable submit button until all required fields filled.

### Pitfall 7: Tab state type not extended
**What goes wrong:** TypeScript error when adding new tab IDs to OwnerDashboard if the union type on line 10 is not updated.
**How to avoid:** Update `useState<'overview' | 'settings' | 'billing' | 'integrations' | 'menu' | 'reviews'>` to include `'locations' | 'catering'`.

---

## Code Examples

### addLocation procedure
```typescript
// Pattern: jwtVerify → venueId from payload → insert
addLocation: publicQuery.input(z.object({
  token: z.string(),
  name: z.string().min(1).max(128),
  address: z.string().min(1).max(255),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
  hoursWeekday: z.string().optional(),
  hoursSaturday: z.string().optional(),
  hoursSunday: z.string().optional(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
  const venueId = payload.payload.venueId as number;
  const result = await db.insert(locations).values({
    venueId,
    name: input.name,
    address: input.address,
    phone: input.phone,
    isDefault: input.isDefault ?? false,
    hoursWeekday: input.hoursWeekday,
    hoursSaturday: input.hoursSaturday,
    hoursSunday: input.hoursSunday,
  });
  return { locationId: Number(result[0].insertId) };
}),
```

### deleteLocation procedure (with FK guard)
```typescript
deleteLocation: publicQuery.input(z.object({
  token: z.string(),
  locationId: z.number().int().positive(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const payload = await jwtVerify(input.token, JWT_SECRET, { clockTolerance: 60 });
  const venueId = payload.payload.venueId as number;
  // Ownership check
  const loc = await db.select().from(locations).where(eq(locations.id, input.locationId)).limit(1);
  if (!loc[0] || loc[0].venueId !== venueId) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Location not found" });
  }
  // FK guard — block if orders reference this location
  const orderCheck = await db.select({ id: orders.id }).from(orders)
    .where(eq(orders.locationId, input.locationId)).limit(1);
  if (orderCheck[0]) {
    throw new TRPCError({ code: "CONFLICT", message: "Cannot delete location with existing orders" });
  }
  await db.delete(locations).where(eq(locations.id, input.locationId));
  return { success: true };
}),
```

### submitCateringRequest procedure (public, no auth)
```typescript
submitCateringRequest: publicQuery.input(z.object({
  venueId: z.number().int().positive(),
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  eventDate: z.string().min(1),
  guestCount: z.number().int().min(1),
  details: z.string().optional(),
})).mutation(async ({ input }) => {
  const db = getDb();
  const result = await db.insert(cateringRequests).values({
    venueId: input.venueId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    eventDate: input.eventDate,
    guestCount: input.guestCount,
    details: input.details,
  });
  return { requestId: Number(result[0].insertId) };
}),
```

### createOrder locationId extension
```typescript
// Extend existing input schema — add optional field
locationId: z.number().int().positive().optional(),

// In db.insert(orders).values(...):
locationId: input.locationId,   // undefined becomes NULL in MySQL — safe
```

### listOrders locationId filter extension
```typescript
// In listOrders handler, after status condition:
if (input.locationId) {
  conditions.push(eq(orders.locationId, input.locationId));
}
```

---

## State of the Art

| Old Approach | Current Approach |
|--------------|-----------------|
| Venue-level hours only | Per-location hours (locations table) — fallback to venue if no locations |
| Single-location ordering | Location selector in checkout (optional, hidden for single-location venues) |
| No catering workflow | cateringRequests table with status enum (new→quoted→confirmed→completed) |

---

## Import Extensions Required

### venue-router.ts (line 5)
Current:
```typescript
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews } from "@db/schema";
```
Phase 5 adds `cateringRequests` — extend to:
```typescript
import { venues, venueOwners, orders, orderItems, menuItems, inventory, locations, loyaltyAccounts, loyaltyTransactions, customerPreferences, reviews, cateringRequests } from "@db/schema";
```

Also need `delete` from drizzle-orm (for deleteLocation). Verify whether `db.delete` is already used; if not import it. Actually in Drizzle ORM, `delete` is called as `db.delete(table)` — no additional import needed from `drizzle-orm` beyond what is already there.

### OwnerDashboard.tsx
Add to lucide-react imports: `MapPin` (for Locations tab), `Briefcase` (for Catering tab). Check current imports first — they may already be present.

### VenuePublic.tsx
Already imports `MapPin`. Catering form may need `Send` or `Briefcase` from lucide-react for the section icon.

---

## Plan Decomposition

Three plans, wave-sequential:

**Plan 01 — Backend (venue-router.ts only)**
- addLocation, updateLocation, deleteLocation procedures (owner-authed)
- extend createOrder with optional locationId
- extend listOrders with optional locationId filter
- submitCateringRequest (public)
- listCateringRequests (owner-authed)
- updateCateringStatus (owner-authed)
- Import `cateringRequests` into venue-router.ts

**Plan 02 — Owner Dashboard UI (OwnerDashboard.tsx)**
- Add `locations` and `catering` tabs to tab strip + state union type
- LocationsTab: list, add, edit, delete locations (union-mode pattern)
- CateringTab: list requests, update status via confirm-gate pattern

**Plan 03 — Public-facing UI (VenuePublic.tsx + StaffDashboard.tsx)**
- VenuePublic: location selector in checkout, per-location hours section, catering enquiry form
- StaffDashboard OrdersTab: location filter dropdown

---

## Sources

### Primary (HIGH confidence)
- `app/db/schema.ts` — direct read, schema confirmed
- `app/api/venue-router.ts` — direct read, procedure patterns confirmed
- `app/src/pages/OwnerDashboard.tsx` — direct read, tab/CRUD patterns confirmed
- `app/src/pages/VenuePublic.tsx` — direct read, checkout and hours patterns confirmed
- `app/src/pages/StaffDashboard.tsx` — direct read, OrdersTab filter pattern confirmed
- `.planning/STATE.md` — decisions log confirmed (deleteMenuItem FK guard, union-mode state, JWT pattern)

### Secondary (MEDIUM confidence)
- `.planning/phases/03-customer-engagement/03-01-PLAN.md` — procedure shape template confirmed

---

## Metadata

**Confidence breakdown:**
- Schema: HIGH — read directly from source
- Existing procedures: HIGH — read directly from source
- UI patterns: HIGH — read directly from source
- Plan decomposition: HIGH — mirrors established Phase 1-3 structure

**Research date:** 2026-05-25
**Valid until:** Stable — schema and patterns do not change between phases

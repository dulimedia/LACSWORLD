# CONTEXT BUNDLE (AUTO-GENERATED) — DO NOT EDIT
## Source of truth
- docs/AGENT_SPEC.md
- docs/INTERACTION_CONTRACT.md

---
# AGENT_SPEC.md


# Explore Units — One-Sheet (Repo-Aware Spec for Vite + R3F)

**Repo:** `threejs-visualizer-/project`
**Last updated:** 2025-08-28
**Goal:** A fast, deterministic **Explore Units** UX that links the **left panel list** ⇄ **3D overlay** with smooth highlight, **Show Available** filter, a **Details** panel (floor plan, share, email request).

**Hard rules:**

* Don’t traverse large GLBs every render.
* Don’t load 100+ unit GLBs for hover. Use a **lightweight overlay**.
* Only touch scene colors/layers from one place.
* Email goes through a **serverless function**, not from the browser.

---

## 0) How this fits your current structure

You already have these:

* `public/models/*` + `public/models/boxes/*` — static GLBs
* `src/components/UnitWarehouse.tsx` — main 3D scene manager
* `src/components/UnitDetailPopup.tsx` — details modal
* `src/components/FilterDropdown.tsx` — current search/filter UI
* `src/hooks/useCsvUnitData.ts` — Google Sheets CSV fetch
* `src/shaders/*` — visual FX
* `src/types/types.ts` — shared types

**We will add/rename (small set):**

```
src/
  data/
    useUnitData.ts          # wrap/replace useCsvUnitData.ts (normalized Map + helpers)
    useUnitIndex.ts         # unit_key -> instance handle/bounds
  effects/
    PostFX.tsx              # Selective bloom on highlight layer
  lib/
    events.ts               # mitt event bus (UI↔Scene sync)
    email.ts                # client → /api/request-quote payload helper
  store/
    exploreState.ts         # single zustand store for hover/select/filter
  ui/
    ExploreUnitsPanel.tsx   # left panel (buildings/floors/units)
    HoverToast.tsx          # bottom-center hover label
  api/ (choose one deployment target; see §11)
    request-quote.(ts|js)   # serverless email sender
docs/
  EXPLORE_UNITS_SPEC.md     # this file
```

> Keep `UnitDetailPopup.tsx` as the **Details Panel**. Keep `UnitWarehouse.tsx` as the **scene**. You can retire `FilterDropdown.tsx` after `ExploreUnitsPanel.tsx` lands (or mount both temporarily).

---

## 1) Data Contract (Google Sheets CSV via Published URL)

**Sheet headers (exact):**

```
unit_key, building, floor, unit_name, status, area_sqft, price_per_sqft, lease_term,
floorplan_url, thumbnail_url, node_name, recipients_csv, notes
```

* `status` ∈ {`Available`,`Unavailable`,`Hold`} (treat `Hold` as unavailable for filtering)
* `recipients_csv` overrides global recipients for this unit
* `node_name` is a fallback if the overlay index needs a different identifier

**Types (`src/types/types.ts`):**

```ts
export type UnitStatus = 'Available' | 'Unavailable' | 'Hold';

export interface UnitRecord {
  unit_key: string;     // e.g. "F_02_280" or "A_01_101"
  building: string;     // e.g. "F"
  floor: string;        // e.g. "02"
  unit_name: string;    // e.g. "Suite 280"
  status: UnitStatus;
  area_sqft?: number;
  price_per_sqft?: number;
  lease_term?: string;
  floorplan_url?: string;
  thumbnail_url?: string;
  node_name?: string;   // optional fallback
  recipients: string[]; // parsed from recipients_csv or default
  notes?: string;
}
```

**Parsing rules in `data/useUnitData.ts`:**

* Trim + uppercase `unit_key`
* Default recipients = `ENV.QUOTE_RECIPIENTS` if `recipients_csv` blank
* If `node_name` blank ⇒ use `unit_key`
* Unknown `status` ⇒ `Unavailable`

---

## 2) Scene Strategy (works with your `/public/models/boxes/*`)

### Why change?

Loading 100+ **per-unit GLBs** just to hover-highlight is wasteful. We’ll create a **lightweight overlay** (instanced boxes) for interaction and keep the big GLBs as static backdrop.

### Overlay source of truth:

* We’ll build an **overlay index** from one of two sources (pick now):

**Option A (Recommended — fastest path):**
Precompute and store **overlay boxes** in JSON (`public/models/boxes_index.json`) with `unit_key`, `position`, `scale`, `rotation`, and **bounds**. Generate it once (small Node script) from your existing per-unit GLBs.
→ Hover uses overlay only; **no unit GLB loads on hover**.

**Option B (If you refuse A right now):**
At app start, **lazy scan** `public/models/boxes/` metadata (no mesh load), and build rough boxes from a tiny sidecar JSON you hand-author temporarily (position/size only), then migrate to A.

**Decision:** Pick **Option A**. Refactor later if needed.

### Layers & visuals:

* `L.STATIC = 0` — all big environment GLBs (buildings, roads, frames, walls, etc.)
* `L.UNITS  = 1` — **overlay InstancedMesh** (raycastable, ultra-cheap)
* `L.HL     = 2` — **highlight layer** used by bloom

**Highlight policy:**

* Hover or Select ⇒ move/toggle the instance to `L.HL` (or draw a twin instance) so **Selective Bloom** only hits highlights.

---

## 3) State Model (single source of truth)

`src/store/exploreState.ts` (Zustand or tiny context):

```ts
type ExploreState = {
  showAvailableOnly: boolean;
  hoveredUnitKey?: string | null;
  selectedUnitKey?: string | null;
  unitsByBuilding: Record<string, Record<string, string[]>>; // building→floor→unit_keys
  setShowAvailableOnly(b: boolean): void;
  setHovered(k: string | null): void;
  setSelected(k: string | null): void;
  setUnitsIndex(idx: ExploreState['unitsByBuilding']): void;
};
```

**No duplicated booleans.** UI and scene subscribe to the same store.

---

## 4) Event Bus (UI ↔ Scene sync)

`src/lib/events.ts`:

```
'ui:hover'       { unit_key: string | null }
'ui:select'      { unit_key: string | null }
'state:filter'   { showAvailableOnly: boolean }
'data:unitsReady'{ count: number }
```

* Only the **overlay** changes materials/layers.
* Camera framing reacts to `'ui:select'` only.

---

## 5) UI Contract

### 5.1 Explore Units Panel — `src/ui/ExploreUnitsPanel.tsx`

* Left panel, tree: **Building → Floor → UnitRow\[]**
* Top controls: `☑ Show Available` + search (unit\_key/unit\_name)
* **Filter behavior:**

  * When ON: `Available` rows normal; `Unavailable/Hold` rows **dimmed + disabled click** (but still listed)
* **Hover UnitRow:** emit `ui:hover(unit_key)`
* **Click UnitRow:** emit `ui:select(unit_key)` → open `UnitDetailPopup` and frame camera

> You can keep `FilterDropdown.tsx` mounted for now, but plan to retire it once `ExploreUnitsPanel.tsx` is stable.

### 5.2 Hover Toast — `src/ui/HoverToast.tsx`

* Bottom-center, small label
* Text: `Building {A} · Floor {02} · {unit_name}`
* Appears on any hover (list or 3D), hides 800ms after hover clears

### 5.3 Details Panel — reuse `src/components/UnitDetailPopup.tsx`

* Show: `unit_name, building, floor, area_sqft, price_per_sqft, lease_term, status`
* Floor plan: inline image if PNG/JPG, otherwise “Open Floor Plan”
* **Share:** copy URL with `?unit=UNIT_KEY`
* **Request Quote:** form `name, email, phone?, message` → POST `/api/request-quote`

---

## 6) Scene Contract — `src/components/UnitWarehouse.tsx`

* Load **big GLBs** (buildings, frame, roads, sidewalks, walls, etc.) once to `L.STATIC`
* Mount **UnitOverlay** (new child component or inline) that:

  * Builds **InstancedMesh** of unit proxies from `boxes_index.json`
  * Sets `layers = L.UNITS` for base instances
  * On hover/select: toggles/mirrors the instance into `L.HL`
  * Handles raycast (`onPointerMove`, debounced \~16ms)
  * Keeps invisible boxes raycastable: `transparent: true`, `opacity: 0.01`
* **PostFX**: mount `effects/PostFX.tsx` with **SelectiveBloom** on `L.HL` only
* **Camera framing:** maintain `Map<unit_key, Box3>` from index; ease 450–600ms

---

## 7) Coloring & Filtering (centralized, deterministic)

```ts
const COLOR = {
  AVAILABLE: 0x4cc3ff,  // blue
  UNAVAILABLE: 0xff4c4c,
  DIMMED: 0x111315
};

function instanceColor(unit: UnitRecord, selected: string|null, hovered: string|null, showAvailOnly: boolean) {
  if (unit.unit_key === selected) return COLOR.AVAILABLE;  // selected wins
  if (unit.unit_key === hovered)  return COLOR.AVAILABLE;  // hover next

  if (showAvailOnly)
    return unit.status === 'Available' ? COLOR.AVAILABLE : COLOR.DIMMED;

  return unit.status === 'Available' ? COLOR.AVAILABLE : COLOR.UNAVAILABLE;
}
```

Batch updates: keep a dirty set of instanceIds; call `setColorAt()` in one pass; then `instanceColor.needsUpdate = true`.

---

## 8) Data Flow & Indexing

### `src/data/useUnitData.ts`

* Wrap/replace `useCsvUnitData.ts`: fetch CSV, parse to `Map<string,UnitRecord>`
* Build `unitsByBuilding` for the tree panel
* Emit `data:unitsReady` with count

### `src/data/useUnitIndex.ts`

* Build overlay index from `public/models/boxes_index.json`
* API:

```ts
getHandle(unit_key): { instanceId: number; bbox: THREE.Box3 } | undefined
setColor(unit_key, hexColor): void
setHighlight(unit_key | null): void  // toggle L.HL
```

> **Migration helper:** provide a tiny Node script `scripts/gen_boxes_index.mjs` that loads each `/public/models/boxes/*.glb`, computes its AABB, and writes `boxes_index.json` with `{ unit_key, position, scale, rotation, bbox }`. Run it once offline.

---

## 9) URL Deep-Linking

* If URL has `?unit=...`, after `data:unitsReady` and overlay mount, do:
  `events.emit('ui:select', { unit_key: param })` → open Details + frame camera.

---

## 10) Animations

* Hover/Select highlight fade: 150–180ms ease in/out
* Selected pulse (optional): scale 1.00→1.02 at 1.2s loop, very subtle
* Panel open/close: 220–260ms

---

## 11) Email Sending (serverless endpoint choices)

You’re on **Vite** (not Next). Pick **one** deployment target and stick to it:

* **Vercel:** put `api/request-quote.ts` under project root (Vercel Functions).
* **Netlify:** `netlify/functions/request-quote.ts`.
* **Cloudflare Workers:** `functions/request-quote.ts`.
* **Express behind Vite (dev only):** separate `server/index.ts`.

**Payload (client → server):**

```ts
POST /api/request-quote
{
  unit_key: string,
  form: { name: string; email: string; phone?: string; message: string }
}
```

**Server behavior:**

1. Validate & rate-limit (IP or header)
2. Resolve recipients: `unit.recipients` or `ENV.QUOTE_RECIPIENTS`
3. Compose subject `Lease Inquiry — ${unit.unit_name} (${unit.unit_key})`
4. Send via **Resend** or **SendGrid** (preferred); Nodemailer+Gmail only if needed
5. Return `{ ok: true }`

**Env (root `.env` for Vite + your platform secrets):**

```
VITE_SHEET_CSV_URL=...
VITE_BOXES_INDEX_URL=/models/boxes_index.json
QUOTE_RECIPIENTS="leasing@company.com,owner@company.com"
RESEND_API_KEY=...          # or SENDGRID_API_KEY=...
```

> Client never holds mail API keys. `src/lib/email.ts` only calls your `/api/request-quote`.

---

## 12) Acceptance Checklist (must pass)

* [ ] Hover **list row** highlights the correct 3D unit (blue + bloom + HoverToast).
* [ ] Hover **3D unit** highlights the correct list row.
* [ ] **Show Available** dims others without clearing current selection.
* [ ] Details panel opens from list or 3D click with floor plan visible.
* [ ] **Email** request reaches correct recipients (per-unit overrides respected).
* [ ] No per-frame GLB traversals; overlay is the only interactive mesh.
* [ ] FPS ≥ 50 on a mid laptop with 300 units; ≥ 30 on phone.
* [ ] URL `?unit=...` opens and frames that unit.

---

## 13) Where each piece lives (your repo mapping)

* **Scene**: `src/components/UnitWarehouse.tsx`

  * Loads static GLBs to `L.STATIC`, mounts overlay, mounts `PostFX`
* **Overlay**: inline in `UnitWarehouse` or `src/components/UnitOverlay.tsx` (new)

  * Uses `useUnitIndex`, subscribes to store + events, handles raycast
* **Panel**: `src/ui/ExploreUnitsPanel.tsx` (new)

  * Can temporarily live alongside `FilterDropdown.tsx` during migration
* **Details**: `src/components/UnitDetailPopup.tsx` (reuse)
* **Hover label**: `src/ui/HoverToast.tsx` (new)
* **Effects**: `src/effects/PostFX.tsx` (new; SelectiveBloom only)
* **Data**:

  * `src/data/useUnitData.ts` (replace `useCsvUnitData.ts` imports)
  * `src/data/useUnitIndex.ts` (overlay handles)
* **Store**: `src/store/exploreState.ts` (new)
* **Events**: `src/lib/events.ts` (new)
* **Email**: `src/lib/email.ts` (client helper) + `api/request-quote.*` (serverless)
* **Generated asset**: `public/models/boxes_index.json` (overlay geometry/bounds)

---

## 14) Minimal Type/Module Stubs (Claude must reuse)

```ts
// lib/events.ts
import mitt from 'mitt';
type Events = {
  'ui:hover': { unit_key: string | null };
  'ui:select': { unit_key: string | null };
  'state:filter': { showAvailableOnly: boolean };
  'data:unitsReady': { count: number };
};
export const events = mitt<Events>();
```

```ts
// store/exploreState.ts
import { create } from 'zustand';
export const useExploreState = create<ExploreState>((set) => ({
  showAvailableOnly: false,
  hoveredUnitKey: null,
  selectedUnitKey: null,
  unitsByBuilding: {},
  setShowAvailableOnly: (b) => set({ showAvailableOnly: b }),
  setHovered: (k) => set({ hoveredUnitKey: k }),
  setSelected: (k) => set({ selectedUnitKey: k }),
  setUnitsIndex: (idx) => set({ unitsByBuilding: idx })
}));
```

```ts
// effects/PostFX.tsx
// One EffectComposer with SelectiveBloom applied to camera layers = L.HL
```

```ts
// lib/email.ts
export async function requestQuote(unit_key: string, form: {name:string;email:string;phone?:string;message:string}) {
  const res = await fetch('/api/request-quote', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ unit_key, form })
  });
  if (!res.ok) throw new Error('Failed to send request');
  return res.json();
}
```

---

## 15) UX Behaviors (edge cases)

* Toggling **Show Available** does **not** clear selection. If selected unit is unavailable under filter, keep panel open and show a small badge “Unavailable under current filter”.
* Accordions (building/floor) **do not unmount** rows (keep handlers hot).
* Invisible units remain raycastable (`opacity: 0.01`, not `visible=false`).
* Camera framing uses stored `Box3` bounds; add small padding; do not jolt Bloom.

---

## 16) Performance Guardrails (for your asset sizes)

* Keep **overlay** as **InstancedMesh** (one per building or floor); target < 10 instanced groups.
* Draco-compressed big GLBs are fine; load once to `L.STATIC`.
* If unit count grows > 1k: virtualize list (`react-window`) and consider BVH for raycast.
* Never allocate materials per instance; color via `setColorAt()` only.

---

## 17) Dev Workflow (Claude guardrails)

1. Ship Overlay + Panel + Email path **before** any cosmetic FX.
2. All UI/scene coordination via **event bus + store**—no prop drilling.
3. Keep PRs ≤ 200 LOC. After each change, run the **Acceptance Checklist**.
4. If a unit exists in CSV but not in overlay index, **warn once**—don’t crash.
5. Remove reliance on legacy `FilterDropdown.tsx` once `ExploreUnitsPanel` is stable.

---

## 18) Env & Test Data

**.env**

```
VITE_SHEET_CSV_URL=https://docs.google.com/.../pub?output=csv
VITE_BOXES_INDEX_URL=/models/boxes_index.json
QUOTE_RECIPIENTS="leasing@lacenter.com,owner@lacenter.com"
RESEND_API_KEY=...   # or SENDGRID_API_KEY=...
```

**CSV sample row (paste in Sheet):**

```
unit_key,building,floor,unit_name,status,area_sqft,price_per_sqft,lease_term,floorplan_url,thumbnail_url,node_name,recipients_csv,notes
F_02_280,F,02,Suite 280,Available,1200,3.75,12 mo,/floorplans/f280.png,,F_02_280,leasing@lacenter.com,
```

---

## 19) Migration plan from current UI

* Phase 1: Add `ExploreUnitsPanel.tsx` **next to** `FilterDropdown.tsx`; wire it to the store/events.
* Phase 2: Add **overlay** and connect to panel hover/select.
* Phase 3: Mount `PostFX` (SelectiveBloom).
* Phase 4: Swap `UnitDetailPopup.tsx` to read selected unit from the store and submit to `/api/request-quote`.
* Phase 5: Remove `FilterDropdown.tsx`.

---

## 20) Common Failure Modes (blockers)

* Loading `/public/models/boxes/*.glb` per hover. **Don’t.**
* Traversing big GLBs on state change. **Index once, then stop.**
* Making overlay non-raycastable (`visible=false`). **Use opacity \~0.01.**
* Sending email from the browser with a secret key. **Serverless only.**
* Duplicating availability logic in UI and scene. **Centralize (§7).**

---

## 21) Post-MVP Ideas (later)

* ETag polling of CSV for live updates
* Saved camera presets per unit
* Search chips (building/floor)
* SSR prefetch of CSV to cut TTFB

---

### Final directive to Claude Code

> Implement **Option A** overlay with `boxes_index.json`. Wire UI ↔ Scene via `events.ts` and a single store. Ship **ExploreUnitsPanel**, Hover highlight, Details + Email. If any ambiguity, choose the simpler behavior that preserves FPS and passes the Acceptance Checklist. Do not introduce new state outside `store/exploreState.ts`.


---
# INTERACTION_CONTRACT.md

# Interaction & Event Contract — Studio Lot Viewer

**Purpose:** This spec defines all **commands**, **events**, **payload schemas**, and **interaction flows** for the 3D Studio Lot Viewer. It complements `AGENT_SPEC.md` and is the single source of truth for how UI ⇄ State ⇄ Scene ⇄ Data communicate.

---

## 1) Vocabulary

* **Command**: Imperative function the app exposes for UI/agents to call. Always returns a `Promise` (resolve on success, reject on error). Namespaced as `cmd.*`.
* **Event**: Immutable notification emitted after state changes or notable milestones. Namespaced as `evt.*` and dispatched via both an internal emitter and DOM `CustomEvent` on `window`.
* **Query**: Pure function that reads state/derived data. Namespaced as `qry.*`.
* **Topic**: Pub/Sub channel name (for analytics or external listeners). Mirrors event names.

---

## 2) Global Transport & Conventions

* **Internal bus:** lightweight emitter (mitt/EventEmitter). All events also mirrored as `window.dispatchEvent(new CustomEvent(name, { detail }))`.
* **Time:** All timestamps ISO 8601 UTC.
* **IDs:** Canonical IDs per `AGENT_SPEC.md §3`.
* **Error shape:**

```ts
interface AppError { code: string; message: string; cause?: unknown; }
```

* **Result shape:**

```ts
interface Ok<T> { ok: true; data: T }
interface Fail { ok: false; error: AppError }
```

---

## 3) Command Surface (`cmd.*`)

> All commands are idempotent where reasonable and must emit the matching `evt.*` on success.

### 3.1 Scene & Camera

```ts
cmd.loadScene(canvas: HTMLCanvasElement): Promise<Ok<{ sceneId: string }>>
cmd.resetView(): Promise<Ok<void>>
cmd.frameScope(scope: { buildingId?: string; floorNum?: number; unitId?: string }): Promise<Ok<void>>
cmd.highlight(scope: { type: 'building'|'floor'|'unit'; id: string }): Promise<Ok<void>>
```

**Emits:** `evt.viewer.ready`, `evt.camera.reset`, `evt.scope.framed`, `evt.highlight.changed`

### 3.2 Data & Availability

```ts
cmd.refreshInventory(): Promise<Ok<{ updatedAt: string }>>
cmd.setAvailabilityFilter(on: boolean): Promise<Ok<{ on: boolean }>>
```

**Emits:** `evt.inventory.updated`, `evt.availability.toggled`

### 3.3 Selection & Request Flow

```ts
cmd.selectUnits(unitIds: string[], on?: boolean): Promise<Ok<{ selected: string[] }>>
cmd.clearSelection(): Promise<Ok<void>>
cmd.openRequestModal(): Promise<Ok<{ selected: string[] }>>
cmd.submitRequest(payload: { unit_ids: string[]; scope?: { buildingId?: string; floorNum?: number }; utm?: Record<string,string> }): Promise<Ok<{ requestId: string }>>
```

**Emits:** `evt.selection.changed`, `evt.request.opened`, `evt.request.submitted`, `evt.request.succeeded` | `evt.request.failed`

### 3.4 Deep Links & Share

```ts
cmd.applyDeepLink(params: URLSearchParams): Promise<Ok<{ applied: boolean }>>
cmd.copyShareUrl(mode: 'scope'|'selection'): Promise<Ok<{ url: string }>>
```

**Emits:** `evt.deeplink.applied`, `evt.share.copied`

### 3.5 UI Surface

```ts
cmd.openExplore(): Promise<Ok<void>>
cmd.closeExplore(): Promise<Ok<void>>
cmd.showFloorPlan(pngUrl: string, pdfUrl?: string): Promise<Ok<void>>
```

**Emits:** `evt.ui.drawer.opened` | `evt.ui.drawer.closed`, `evt.ui.floorplan.opened`

---

## 4) Events (`evt.*`) & Payload Schemas

> Always include the minimal payload shown below. Extra fields allowed but must be additive and documented in a CHANGELOG.

### 4.1 Lifecycle

```ts
evt.viewer.init         : { ts: string }
evt.viewer.ready        : { ts: string, assets: { env: string; overlays: string } }
evt.viewer.error        : { ts: string, error: AppError }
```

### 4.2 Inventory & Availability

```ts
evt.inventory.updated   : { ts: string, updatedAt: string, rows: number }
evt.availability.toggled: { ts: string, on: boolean }
```

### 4.3 Scope, Highlight, Camera

```ts
evt.highlight.changed   : { ts: string, scope: 'building'|'floor'|'unit', ids: string[] }
evt.scope.framed        : { ts: string, scope: 'building'|'floor'|'unit', id: string }
evt.camera.reset        : { ts: string }
```

### 4.4 UI & Navigation

```ts
evt.ui.drawer.opened    : { ts: string, source?: 'button'|'deeplink' }
evt.ui.drawer.closed    : { ts: string }
evt.ui.floorplan.opened : { ts: string, kind: 'unit'|'floor', id: string, png: string, pdf?: string }
```

### 4.5 Selection & Requests

```ts
evt.selection.changed   : { ts: string, selected: string[] }
evt.request.opened      : { ts: string, selected: string[] }
evt.request.submitted   : { ts: string, unit_ids: string[], scope?: { buildingId?: string; floorNum?: number } }
evt.request.succeeded   : { ts: string, requestId: string }
evt.request.failed      : { ts: string, error: AppError }
```

### 4.6 Deep Links & Share

```ts
evt.deeplink.applied    : { ts: string, params: Record<string,string>, valid: boolean }
evt.share.copied        : { ts: string, url: string, mode: 'scope'|'selection' }
```

---

## 5) DOM Custom Events

All `evt.*` are also dispatched on `window` for integrations:

```ts
window.dispatchEvent(new CustomEvent('evt.selection.changed', { detail: { ts, selected } }));
```

**Listener example:**

```ts
window.addEventListener('evt.selection.changed', (e: any) => {
  console.log(e.detail.selected);
});
```

---

## 6) Queries (`qry.*`)

```ts
qry.getScope(): { buildingId?: string; floorNum?: number; unitId?: string|null }
qry.getSelection(): string[]
qry.getAvailability(): boolean
qry.getInventory(): Inventory
qry.getShareUrl(mode?: 'scope'|'selection'): string
```

* **Pure**: No side effects; never throw—return sensible defaults.

---

## 7) Interaction Flows

### 7.1 Explore → Highlight → Frame

1. `cmd.openExplore()` → `evt.ui.drawer.opened`
2. User clicks **Maryland Building** → `cmd.highlight({ type:'building', id:'maryland' })`
3. → `evt.highlight.changed` (ids = \[`maryland`])
4. `cmd.frameScope({ buildingId:'maryland' })` → `evt.scope.framed`

### 7.2 Floor Plan Open

1. Item menu → **Floor Plan** → `cmd.showFloorPlan(png, pdf)`
2. → `evt.ui.floorplan.opened`

### 7.3 Availability Toggle

1. UI switch → `cmd.setAvailabilityFilter(true)`
2. → `evt.availability.toggled` (on: true)
3. Overlay visibility updates (units only)

### 7.4 Deep Link Round Trip

1. `cmd.copyShareUrl('scope')` → `evt.share.copied`
2. Paste URL → app boots → `cmd.applyDeepLink(params)` → `evt.deeplink.applied{ valid:true }`
3. App sets highlight + selection

### 7.5 Request Flow

1. **Request Info** → `cmd.openRequestModal()` → `evt.request.opened`
2. Submit → `cmd.submitRequest({ unit_ids, scope, utm })`
3. → `evt.request.submitted` → (server 200) → `evt.request.succeeded`

---

## 8) State Machine (conceptual)

States: `idle → loading → ready → error`

* **idle → loading**: `cmd.loadScene`
* **loading → ready**: assets resolved → `evt.viewer.ready`
* **any → error**: uncaught → `evt.viewer.error`

Sub-state for **drawer**: `closed ⇄ open`
Sub-state for **availability**: `off ⇄ on`

---

## 9) Analytics Mapping

* **Session start**: `evt.viewer.init`
* **Engagements**: count `evt.ui.drawer.opened`, `evt.ui.floorplan.opened`, `evt.share.copied`
* **Conversion**: `evt.request.submitted` → `evt.request.succeeded`
* **Content**: which `building|floor|unit` ids appear in `evt.scope.framed`

---

## 10) Error Codes (non-exhaustive)

* `SCENE_LOAD_FAILED` — GLB/HDRI failed to fetch/parse
* `OVERLAY_ID_MISSING` — Highlight requested for unknown id
* `SHEET_FETCH_FAILED` — Upstream data unavailable
* `REQUEST_SUBMIT_FAILED` — `/api/request` non-200 or network error
* `DEEPLINK_INVALID` — Query params malformed or refer to unknown ids

---

## 11) Contract Tests (must pass in CI)

* **E1** `cmd.highlight(unit)` → emits exactly 1 `evt.highlight.changed` with that unit id
* **E2** `cmd.setAvailabilityFilter(true)` → `evt.availability.toggled.on===true` and all unavailable units hidden
* **E3** `cmd.copyShareUrl('selection')` after selecting 2 units → URL contains `sel=` with both ids
* **E4** Invalid deeplink → `evt.deeplink.applied.valid===false` and no throw
* **E5** `cmd.submitRequest` success path emits `evt.request.submitted` then `evt.request.succeeded`

---

## 12) Versioning & Change Control

* Start at **v1.0.0**. Only **additive** changes without bumping major.
* Breaking changes to command signatures or event payloads ⇒ **major bump** and update both this doc and `AGENT_SPEC.md`.

---

## 13) Minimal Implementation Notes

* Centralize bus in `/src/lib/bus.ts` to fan-out internal + DOM events.
* Provide a tiny `telemetry.ts` that subscribes to all `evt.*` and forwards to `window.dataLayer` if present.
* Guard commands with runtime validation (zod/yup) to keep agents honest.

---

## 14) Appendix: Type Declarations (TS)

```ts
export type ScopeType = 'building'|'floor'|'unit';
export interface Scope { buildingId?: string; floorNum?: number; unitId?: string|null }

export namespace CMD {
  type LoadScene = (canvas: HTMLCanvasElement) => Promise<Ok<{sceneId:string}>>
  type ResetView = () => Promise<Ok<void>>
  type FrameScope = (s: Scope) => Promise<Ok<void>>
  type Highlight = (p: { type: ScopeType; id: string }) => Promise<Ok<void>>
  type RefreshInventory = () => Promise<Ok<{updatedAt:string}>>
  type SetAvailability = (on: boolean) => Promise<Ok<{on:boolean}>>
  type SelectUnits = (ids: string[], on?: boolean) => Promise<Ok<{selected:string[]}>>
  type ClearSelection = () => Promise<Ok<void>>
  type OpenRequest = () => Promise<Ok<{selected:string[]}>>
  type SubmitRequest = (p: { unit_ids: string[]; scope?: Scope; utm?: Record<string,string> }) => Promise<Ok<{requestId:string}>>
  type ApplyDeepLink = (p: URLSearchParams) => Promise<Ok<{applied:boolean}>>
  type CopyShareUrl = (mode: 'scope'|'selection') => Promise<Ok<{url:string}>>
  type OpenExplore = () => Promise<Ok<void>>
  type CloseExplore = () => Promise<Ok<void>>
  type ShowFloorPlan = (png: string, pdf?: string) => Promise<Ok<void>>
}
```

---

## 15) Changelog (keep here)

* **v1.0.0 (2025-08-31):** Initial event/command contract established.

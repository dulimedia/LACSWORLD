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

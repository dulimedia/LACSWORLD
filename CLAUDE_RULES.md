# Edit Rules (Claude must follow exactly)
Plan → Diff → Validate.

Before code:
1) Output PLAN: exact files to touch/create (paths).
2) Only edit files listed in PLAN.
3) Keep diffs surgical. No renames. No new deps without approval.

After code:
- VALIDATION: how to run, what to measure (FPS, bundle size, memory). Rollback note.

Style/Perf:
- TypeScript strict; no `any`.
- R3F: suspense/preload; avoid side-effects in JSX.
- Keep first-load ≤ 7MB, fail if over.
- Mobile: no dynamic shadows. Desktop: CSM allowed.
- One ACES tone mapper on renderer; no material-level tonemapping/exposure.

Forbidden:
- Adding heavy deps
- Changing `/models/boxes/*` or `/src/lib/events/*`
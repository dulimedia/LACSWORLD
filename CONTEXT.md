# Project Context (last updated: 2025-10-05)
Goal: Mobile-smooth R3F/Three.js architectural viewer with **realistic** lighting, **no glitches**, **tiny payload**.

Targets:
- iPhone 13: ≥55 FPS on default scene
- First-load ≤ 7 MB gzipped
- Desktop: high-quality GI look; Mobile: baked/SSGI-lite, **no dynamic shadows**

Non-negotiables:
- Keep `/models/boxes/*` untouched
- Keep public API of `/src/lib/events/*`
- Cesium tiles replace bespoke environment meshes where possible
- Single color pipeline: **ACES** at renderer only (no per-material tone mapping/exposure)
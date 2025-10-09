# Architecture Map
/src/App.tsx                  // scene shell + router
/src/perf/PerfFlags.ts        // device caps + feature toggles
/src/scene/Lighting.tsx       // Sun/HDRI/PMREM/CSM gates
/src/scene/PostFX.tsx         // SMAA/TAA -> SSR -> SSGI -> AO -> Bloom -> ToneMap
/src/scene/Loaders.ts         // GLTF+KTX2+DRACO loader
/src/scene/Materials/*.ts     // PBR material builders
/src/tests/Playground/*.tsx   // minimal repro scenes (no app deps)

Contracts:
- Renderer owns tone mapping (ACES), exposure default 0.9
- PostFX order must remain: AA → SSR → SSGI → AO → Bloom → Color
- `PerfFlags` controls all quality tiers (no ad-hoc per-component flags)
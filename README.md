# LA Center Studios 3D Visualization

Professional web-based 3D visualization for LA Center Studios warehouse units using React Three Fiber.

## Quick Start

```bash
npm install
npm run dev
```

Visit http://localhost:3092/

## Tech Stack

- **React** 18.3.1
- **Three.js** 0.162.0
- **React Three Fiber** 8.0.0
- **React Three Drei** 9.99.7
- **React Three Postprocessing** 2.19.1
- **Zustand** 5.0.8 (State Management)
- **TypeScript** 5.5.3
- **Vite** 5.4.2

## Features

### Core Functionality
- ✅ Interactive 3D warehouse visualization
- ✅ Unit selection and filtering
- ✅ CSV-driven unit availability
- ✅ Responsive mobile/desktop optimization
- ✅ Dynamic shadows (desktop only)
- ✅ HDRI-based lighting
- ✅ Post-processing effects (SSAO, Bloom, God Rays)

### Performance
- **Desktop:** 60+ FPS (high-quality rendering)
- **Mobile:** 55+ FPS (optimized rendering)
- **Asset Size:** ~30MB total
- **GPU Memory:** ~91MB (optimized)

## Project Structure

```
LACS_WORLD_/
├── public/
│   ├── models/          # GLB/FBX 3D models
│   ├── env/             # HDRI environment maps
│   ├── textures/        # PBR textures
│   └── floorplans/      # Unit floorplan images
├── src/
│   ├── components/      # React components
│   ├── scene/           # Three.js scene setup
│   ├── lighting/        # Lighting systems
│   ├── materials/       # Custom materials
│   ├── stores/          # Zustand state stores
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   └── App.tsx          # Main application
└── scripts/             # Build & utility scripts
```

## Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main app component & scene setup |
| `src/components/UnitWarehouse.tsx` | Model loading & unit management |
| `src/scene/Lighting.tsx` | Lighting & shadow system |
| `src/scene/GodRays.tsx` | Post-processing effects |
| `src/stores/useFilterStore.ts` | Unit filtering state |
| `src/perf/PerfFlags.ts` | Performance configuration |
| `public/unit-data.csv` | Unit availability data |

## Performance Configuration

Edit `src/perf/PerfFlags.ts` to adjust quality settings:

```typescript
export const PerfFlags = {
  tier: "desktopHigh" | "mobileLow",
  dynamicShadows: true,    // Desktop only
  ssgi: true,
  ao: true,
  bloom: true,
  anisotropy: 8,           // Texture filtering
  maxTextureSize: 4096,
};
```

## Build & Deploy

```bash
# Development
npm run dev

# Production build
npm run build

# Preview production
npm run preview
```

## Optimization Tips

### Improving FPS
1. Reduce `samples` in GodRays.tsx (line 27)
2. Lower shadow map size in Lighting.tsx (line 61)
3. Disable post-processing effects in GodRays.tsx

### Reducing Asset Size
1. Compress textures to JPG/JPEG
2. Use Draco compression for GLB models
3. Reduce HDRI resolution (2K instead of 4K)

### Mobile Optimization
- All expensive effects auto-disabled via `PerfFlags.tier`
- Shadow rendering disabled on mobile
- Lower texture resolution on low-end devices

## Troubleshooting

### Shader Errors
- Check console for specific error messages
- Disable post-processing effects one by one
- Ensure Three.js version matches (0.162.0)

### Performance Issues
- Open browser DevTools > Performance
- Check GPU usage in Task Manager
- Reduce post-processing samples
- Lower shadow map resolution

### Model Loading Errors
- Verify GLB files exist in `public/models/`
- Check browser console for 404 errors
- Ensure Draco decoder files in `public/draco/`

## Documentation

- **OPTIMIZATION_REPORT.md** - Comprehensive optimization guide
- **ARCHITECTURE.md** - System architecture overview
- **ROUND2_VALIDATION.md** - Feature validation checklist

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+ (iOS 14+)
- ✅ Edge 90+

## Contributing

1. Follow existing code style
2. Test on both desktop and mobile
3. Ensure FPS targets met (60+ desktop, 55+ mobile)
4. Update documentation for new features

## Performance Benchmarks

| Device | FPS | GPU Memory |
|--------|-----|------------|
| Desktop (RTX 3080) | 60+ | 91MB |
| Desktop (GTX 1660) | 50 | 91MB |
| iPhone 12 | 60 | 45MB |
| Android Mid-Range | 55 | 50MB |

## Known Issues

- SSR (Screen-Space Reflections) disabled due to shader compilation errors
- RectAreaLight removed to prevent rendering glitches
- Some models may have z-fighting (overlapping geometry)

## Future Enhancements

- [ ] Re-enable SSR when stable
- [ ] Add PBR texture maps for materials
- [ ] Implement dynamic time-of-day lighting
- [ ] Add user quality settings slider
- [ ] LOD (Level of Detail) system for distant models

## License

Proprietary - LA Center Studios

## Support

For issues or questions, check the GitHub issues or contact the development team.

---

**Last Updated:** 2025-10-08  
**Version:** 0.1.0  
**Status:** ✅ Optimized & Stable

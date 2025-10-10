import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from '../perf/PerfFlags';

export function MobilePerformanceMonitor() {
  const { gl } = useThree();

  useEffect(() => {
    if (!PerfFlags.isMobile) return;

    const logPerformance = () => {
      const info = gl.info;
      const memory = info.memory;
      const render = info.render;

      console.log('📊 Mobile Performance Stats:', {
        geometries: memory.geometries,
        textures: memory.textures,
        calls: render.calls,
        triangles: render.triangles,
        points: render.points,
        lines: render.lines,
        fps: Math.round(1000 / performance.now()),
      });

      // Check for memory pressure
      if (memory.textures > 50) {
        console.warn('⚠️ High texture count:', memory.textures);
      }
      if (render.triangles > 500000) {
        console.warn('⚠️ High triangle count:', render.triangles);
      }

      // Check WebGL context
      const ctx = gl.getContext();
      if (ctx.isContextLost()) {
        console.error('❌ WebGL context lost!');
      }
    };

    // Log on mount and every 10 seconds
    logPerformance();
    const interval = setInterval(logPerformance, 10000);

    return () => clearInterval(interval);
  }, [gl]);

  return null;
}

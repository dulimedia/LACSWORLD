import React, { useEffect, useState, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { isLowMemoryDevice } from '../runtime/mobileProfile';

interface GPUStats {
  geometries: number;
  textures: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
}

export const GPUTelemetry: React.FC = () => {
  const { gl } = useThree();
  const [stats, setStats] = useState<GPUStats>({
    geometries: 0,
    textures: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0
  });
  const [gpuCaps, setGpuCaps] = useState<any>(null);
  
  useEffect(() => {
    if (!isLowMemoryDevice()) return;
    
    const ctx = gl.getContext() as WebGLRenderingContext;
    const caps = {
      maxTex: ctx.getParameter(ctx.MAX_TEXTURE_SIZE),
      maxCube: ctx.getParameter(ctx.MAX_CUBE_MAP_TEXTURE_SIZE),
      maxTexUnits: ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS)
    };
    setGpuCaps(caps);
    console.log('🧪 GPU caps', caps);
    
    const interval = setInterval(() => {
      const info = gl.info;
      const newStats = {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines
      };
      setStats(newStats);
      console.log(`📊 GPU: geoms=${newStats.geometries} tex=${newStats.textures} drawCalls=${newStats.drawCalls}`);
    }, 1500);
    
    return () => clearInterval(interval);
  }, [gl]);
  
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      console.log('❌ window.onerror', e.message || e);
    };
    
    const handleRejection = (e: PromiseRejectionEvent) => {
      console.log('❌ unhandledrejection', e.reason);
    };
    
    const handleVisibility = () => {
      console.log('👁 visibility', document.visibilityState);
    };
    
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  
  if (!isLowMemoryDevice()) return null;
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      left: '10px',
      background: 'rgba(0, 0, 0, 0.7)',
      color: '#00ff00',
      padding: '8px 12px',
      borderRadius: '4px',
      fontFamily: 'monospace',
      fontSize: '11px',
      zIndex: 10000,
      pointerEvents: 'none'
    }}>
      <div>📊 GPU Memory</div>
      <div>Geoms: {stats.geometries} | Tex: {stats.textures}</div>
      <div>Draws: {stats.drawCalls} | Tris: {stats.triangles}</div>
      {gpuCaps && (
        <div style={{ marginTop: '4px', fontSize: '10px', opacity: 0.7 }}>
          Max Tex: {gpuCaps.maxTex} | Units: {gpuCaps.maxTexUnits}
        </div>
      )}
    </div>
  );
};

import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  triangles: number;
  drawCalls: number;
  memoryUsage: number;
}

export function PerformanceMonitor({ enabled = true }: { enabled?: boolean }) {
  const { gl } = useThree();
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    triangles: 0,
    drawCalls: 0,
    memoryUsage: 0
  });
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsArray = useRef<number[]>([]);

  useFrame(() => {
    if (!enabled) return;
    
    frameCount.current++;
    const currentTime = performance.now();
    const deltaTime = currentTime - lastTime.current;
    
    // Calculate FPS every 60 frames or 1 second
    if (frameCount.current % 60 === 0 || deltaTime >= 1000) {
      const fps = Math.round(1000 / (deltaTime / frameCount.current));
      fpsArray.current.push(fps);
      
      // Keep only last 30 readings for averaging
      if (fpsArray.current.length > 30) {
        fpsArray.current.shift();
      }
      
      const avgFps = fpsArray.current.reduce((a, b) => a + b, 0) / fpsArray.current.length;
      
      setStats(prev => ({
        ...prev,
        fps: Math.round(avgFps),
        frameTime: Math.round(deltaTime / frameCount.current * 100) / 100,
        triangles: gl.info.render.triangles,
        drawCalls: gl.info.render.calls,
        memoryUsage: (performance as any).memory?.usedJSHeapSize 
          ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
          : 0
      }));
      
      frameCount.current = 0;
      lastTime.current = currentTime;
    }
  });

  if (!enabled) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-black bg-opacity-70 text-white p-3 rounded-lg text-xs font-mono">
      <div className="space-y-1">
        <div className={`${stats.fps < 30 ? 'text-red-400' : stats.fps < 50 ? 'text-yellow-400' : 'text-green-400'}`}>
          FPS: {stats.fps}
        </div>
        <div>Frame: {stats.frameTime}ms</div>
        <div>Triangles: {stats.triangles.toLocaleString()}</div>
        <div>Draw Calls: {stats.drawCalls}</div>
        {stats.memoryUsage > 0 && (
          <div className={stats.memoryUsage > 500 ? 'text-red-400' : 'text-white'}>
            Memory: {stats.memoryUsage}MB
          </div>
        )}
      </div>
    </div>
  );
}

// Performance optimization component that automatically adjusts settings
export function AdaptivePerformance() {
  const { gl, scene } = useThree();
  const [pixelRatio, setPixelRatio] = useState(window.devicePixelRatio);
  const frameCount = useRef(0);
  const fpsHistory = useRef<number[]>([]);
  const lastTime = useRef(performance.now());

  useFrame(() => {
    frameCount.current++;
    const currentTime = performance.now();
    
    // Check performance every 2 seconds
    if (frameCount.current % 120 === 0) {
      const deltaTime = currentTime - lastTime.current;
      const fps = 1000 / (deltaTime / 120);
      fpsHistory.current.push(fps);
      
      // Keep only last 10 readings
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift();
      }
      
      const avgFps = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;
      
      // Adaptive pixel ratio based on performance
      if (avgFps < 30 && pixelRatio > 0.5) {
        const newPixelRatio = Math.max(0.5, pixelRatio - 0.1);
        setPixelRatio(newPixelRatio);
        gl.setPixelRatio(newPixelRatio);
        console.log(`📉 Performance: Reduced pixel ratio to ${newPixelRatio.toFixed(1)}`);
      } else if (avgFps > 55 && pixelRatio < window.devicePixelRatio) {
        const newPixelRatio = Math.min(window.devicePixelRatio, pixelRatio + 0.1);
        setPixelRatio(newPixelRatio);
        gl.setPixelRatio(newPixelRatio);
        console.log(`📈 Performance: Increased pixel ratio to ${newPixelRatio.toFixed(1)}`);
      }
      
      lastTime.current = currentTime;
      frameCount.current = 0;
    }
  });

  return null;
}
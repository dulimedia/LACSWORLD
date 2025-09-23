import React from 'react';
import { useThree } from '@react-three/fiber';
import { useGLBState } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import { useUnitStore } from '../stores/useUnitStore';

export const CanvasClickHandler: React.FC = () => {
  const { gl } = useThree();
  const { setDrawerOpen } = useExploreState();

  React.useEffect(() => {
    const canvas = gl.domElement;

    const handleCanvasClick = (event: MouseEvent) => {
      // Only handle clicks on the canvas background (not on UI elements)
      const target = event.target as HTMLElement;
      if (target === canvas) {
        // Close explore units panel when clicking off into 3D scene
        setDrawerOpen(false);
        console.log('🖱️ Canvas background clicked - explore units panel closed');
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gl]);

  return null;
};
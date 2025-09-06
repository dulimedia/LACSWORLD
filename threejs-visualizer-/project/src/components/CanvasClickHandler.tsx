import React from 'react';
import { useThree } from '@react-three/fiber';
import { useGLBState } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import { useUnitStore } from '../stores/useUnitStore';

export const CanvasClickHandler: React.FC = () => {
  const { gl } = useThree();

  React.useEffect(() => {
    const canvas = gl.domElement;

    const handleCanvasClick = (event: MouseEvent) => {
      // Only handle clicks on the canvas background (not on UI elements)
      const target = event.target as HTMLElement;
      if (target === canvas) {
        // Preserve all selections when navigating 3D scene
        console.log('🖱️ Canvas background clicked - all selections preserved');
      }
    };

    canvas.addEventListener('click', handleCanvasClick);
    
    return () => {
      canvas.removeEventListener('click', handleCanvasClick);
    };
  }, [gl]);

  return null;
};
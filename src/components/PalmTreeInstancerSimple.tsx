import React, { Suspense, useMemo, useRef, useCallback } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface PalmTreeInstancerSimpleProps {
  visible?: boolean;
}

// Memoized palm tree loader to prevent infinite re-renders
const PalmTreeLoader = React.memo(() => {
  const palmTreePath = `${import.meta.env.BASE_URL}palm-tree.glb`;
  const placeholdersPath = `${import.meta.env.BASE_URL}palm-placeholders.glb`;
  
  const palmTreeGltf = useGLTF(palmTreePath);
  const placeholdersGltf = useGLTF(placeholdersPath);
  
  // Memoize the placeholder positions to prevent recalculation
  const { placeholderPositions, processedPalmTree, processedPlaceholders } = useMemo(() => {
    if (!palmTreeGltf?.scene || !placeholdersGltf?.scene) {
      return { placeholderPositions: [], processedPalmTree: null, processedPlaceholders: null };
    }
    
    // Extract placeholder positions
    const positions: THREE.Vector3[] = [];
    const placeholderScene = placeholdersGltf.scene.clone();
    
    placeholderScene.traverse((child) => {
      if (child.type === 'Mesh' || child.type === 'Object3D') {
        const localPosition = child.position.clone();
        positions.push(localPosition);
        
        // Hide the original placeholder objects
        if (child.type === 'Mesh') {
          (child as THREE.Mesh).visible = false;
        }
      }
    });
    
    // Process palm tree
    const palmTreeScene = palmTreeGltf.scene.clone();
    palmTreeScene.traverse((child) => {
      if (child.type === 'Mesh') {
        (child as THREE.Mesh).visible = false;
      }
    });
    
    return { 
      placeholderPositions: positions, 
      processedPalmTree: palmTreeScene,
      processedPlaceholders: placeholderScene
    };
  }, [palmTreeGltf?.scene, placeholdersGltf?.scene]);
  
  // Memoize the palm tree instances
  const palmTreeInstances = useMemo(() => {
    if (!processedPalmTree || placeholderPositions.length === 0) {
      return [];
    }
    
    return placeholderPositions.map((position, index) => {
      const clonedPalmTree = processedPalmTree.clone();
      
      // Make the cloned palm tree visible
      clonedPalmTree.traverse((child) => {
        if (child.type === 'Mesh') {
          (child as THREE.Mesh).visible = true;
        }
      });
      
      // Adjust positions
      const adjustedX = position.x - 1.0;
      const adjustedZ = position.z + 4.8;
      
      return (
        <primitive
          key={`palm-${index}`}
          object={clonedPalmTree}
          position={[adjustedX, position.y, adjustedZ]}
          scale={[1, 1, 1]}
        />
      );
    });
  }, [processedPalmTree, placeholderPositions]);
  
  if (!processedPlaceholders || palmTreeInstances.length === 0) {
    return null;
  }

  return (
    <group>
      <primitive object={processedPlaceholders} />
      {palmTreeInstances}
    </group>
  );
});

// Fallback component for when loading fails
function PalmTreeFallback() {
  return null;
}

// Error boundary component
function PalmTreeErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <React.Fragment>
      {children}
    </React.Fragment>
  );
}

const PalmTreeInstancerSimple = React.memo(({ visible = true }: PalmTreeInstancerSimpleProps) => {
  if (!visible) {
    return null;
  }
  
  return (
    <PalmTreeErrorBoundary>
      <Suspense fallback={<PalmTreeFallback />}>
        <PalmTreeLoader />
      </Suspense>
    </PalmTreeErrorBoundary>
  );
});

PalmTreeInstancerSimple.displayName = 'PalmTreeInstancerSimple';
PalmTreeLoader.displayName = 'PalmTreeLoader';

export default PalmTreeInstancerSimple;

// Preload the files
try {
  useGLTF.preload(`${import.meta.env.BASE_URL}palm-tree.glb`);
  useGLTF.preload(`${import.meta.env.BASE_URL}palm-placeholders.glb`);
} catch (err) {
  console.warn('🚫 Could not preload palm tree files:', err);
}
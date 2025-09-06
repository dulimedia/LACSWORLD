/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { useGLBState, type GLBNodeInfo } from '../store/glbState';
import { useExploreState } from '../store/exploreState';
import FresnelMaterial from '../materials/FresnelMaterial';

interface GLBUnitProps {
  node: GLBNodeInfo;
}

const GLBUnit: React.FC<GLBUnitProps> = ({ node }) => {
  const { scene } = useGLTF(node.path);
  const groupRef = useRef<THREE.Group>(null);
  const fresnelMaterialRef = useRef<FresnelMaterial>();
  const originalMaterialsRef = useRef<Map<string, THREE.Material>>(new Map());
  const { selectUnit } = useGLBState();
  const { setSelected } = useExploreState();
  
  // Update the GLB state store with the loaded object
  useEffect(() => {
    if (groupRef.current && !node.isLoaded) {
      const { updateGLBObject } = useGLBState.getState();
      updateGLBObject(node.key, groupRef.current);
    }
  }, [node.key, node.isLoaded]);

  // Create fresnel material
  const fresnelMaterial = useMemo(() => {
    const material = new FresnelMaterial({
      fresnelColor: '#00d5ff',
      baseColor: '#0777fd', 
      intensity: 2.0,
      fresnelAlpha: 0.8,
      alpha: true
    });
    fresnelMaterialRef.current = material;
    return material;
  }, []);

  // Store original materials when component mounts
  useEffect(() => {
    if (!groupRef.current) return;
    
    const originalMaterials = new Map<string, THREE.Material>();
    
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material, index) => {
          const key = `${child.uuid}_${index}`;
          originalMaterials.set(key, material.clone());
        });
      }
    });
    
    originalMaterialsRef.current = originalMaterials;
  }, [scene]);

  // Unit clicking disabled - selection only through Explore Units panel
  // const handleClick = (event: any) => {
  //   event.stopPropagation();
  //   console.log(`🖱️ GLB Unit clicked: ${node.building}/${node.floor}/${node.unitName}`);
  //   
  //   // Clear any existing selections first, then select this unit
  //   selectUnit(node.building, node.floor, node.unitName);
  //   
  //   // Also notify the explore state for any UI updates
  //   setSelected(`${node.building}_${node.floor}_${node.unitName}`);
  // };

  // Update visibility based on GLB state
  // Keep units invisible to let SelectedUnitOverlay handle highlighting
  useEffect(() => {
    if (!groupRef.current) return;

    // Always keep GLB units invisible - the overlay handles selection highlighting
    groupRef.current.visible = false;
  }, [node.state]);

  // Restore original materials when switching away from glowing
  useEffect(() => {
    return () => {
      if (!groupRef.current) return;
      
      // Restore original materials on cleanup or when switching states
      if (node.state !== 'glowing') {
        groupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const materials = Array.isArray(child.material) ? child.material : [child.material];
            materials.forEach((_, index) => {
              const key = `${child.uuid}_${index}`;
              const originalMaterial = originalMaterialsRef.current.get(key);
              if (originalMaterial) {
                if (Array.isArray(child.material)) {
                  child.material[index] = originalMaterial;
                } else {
                  child.material = originalMaterial;
                }
              }
            });
          }
        });
      }
    };
  }, [node.state]);

  // Animate the fresnel material
  useFrame(() => {
    if (fresnelMaterialRef.current && node.state === 'glowing') {
      fresnelMaterialRef.current.update();
    }
  });

  // Clone the scene to avoid sharing materials between instances
  const clonedScene = useMemo(() => scene.clone(), [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
};

// Initialize GLB state on mount
const GLBInitializer: React.FC = () => {
  const { glbNodes, initializeGLBNodes } = useGLBState();
  
  useEffect(() => {
    // Initialize GLB nodes if not already done
    if (glbNodes.size === 0) {
      initializeGLBNodes();
    }
  }, [glbNodes.size, initializeGLBNodes]);

  return null;
};

export const GLBManager: React.FC = () => {
  const { glbNodes } = useGLBState();
  
  return (
    <group>
      <GLBInitializer />
      {Array.from(glbNodes.values()).map(node => (
        <GLBUnit key={node.key} node={node} />
      ))}
    </group>
  );
};

// Export individual components for flexibility
export { GLBUnit, GLBInitializer };
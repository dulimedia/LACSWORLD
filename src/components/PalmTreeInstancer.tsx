import { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface PalmTreeInstancerProps {
  visible?: boolean;
}

export default function PalmTreeInstancer({ visible = true }: PalmTreeInstancerProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  
  const palmTreePath = `${import.meta.env.BASE_URL}palm-tree.glb`;
  const placeholdersPath = `${import.meta.env.BASE_URL}palm-placeholders.glb`;
  
  console.log('🌴 PalmTreeInstancer: Attempting to load files from:', { 
    palmTreePath, 
    placeholdersPath,
    baseUrl: import.meta.env.BASE_URL 
  });
  
  // Always call hooks in the same order - never conditionally
  const palmTreeGltf = useGLTF(palmTreePath);
  const placeholdersGltf = useGLTF(placeholdersPath);
  
  useEffect(() => {
    // Early return if GLTFs aren't loaded yet
    if (!palmTreeGltf?.scene || !placeholdersGltf?.scene) {
      console.log('🌴 Waiting for GLB files to load...');
      return;
    }
    
    if (!instancedMeshRef.current) {
      console.log('🌴 Waiting for instanced mesh ref...');
      return;
    }

    console.log('🌴 Processing palm tree instances...');

    try {
      // Extract placeholder positions from the placeholders GLB
      const placeholderPositions: THREE.Vector3[] = [];
      
      placeholdersGltf.scene.traverse((child) => {
        if (child.type === 'Mesh' || child.type === 'Object3D') {
          // Get world position of each placeholder object
          const worldPosition = new THREE.Vector3();
          child.getWorldPosition(worldPosition);
          placeholderPositions.push(worldPosition);
          console.log('🌴 Found placeholder at:', worldPosition);
        }
      });

      console.log(`🌴 Found ${placeholderPositions.length} placeholder positions`);

      if (placeholderPositions.length === 0) {
        console.warn('🚫 No placeholder positions found');
        return;
      }

      // Get the palm tree mesh from the loaded model
      let palmTreeMesh: THREE.Mesh | null = null;
      palmTreeGltf.scene.traverse((child) => {
        if (child.type === 'Mesh' && !palmTreeMesh) {
          palmTreeMesh = child as THREE.Mesh;
          console.log('🌴 Found palm tree mesh:', child.name);
        }
      });

      if (!palmTreeMesh) {
        console.warn('🚫 No palm tree mesh found in GLB');
        return;
      }

      // Update instance count
      instancedMeshRef.current.count = placeholderPositions.length;

      // Set up instanced mesh with palm tree geometry and material
      const matrix = new THREE.Matrix4();
      
      placeholderPositions.forEach((position, index) => {
        // Create transformation matrix for this instance
        matrix.setPosition(position.x, position.y, position.z);
        instancedMeshRef.current!.setMatrixAt(index, matrix);
      });

      // Update the instance matrix
      instancedMeshRef.current.instanceMatrix.needsUpdate = true;
      setIsLoaded(true);
      console.log('✅ Palm tree instancing complete!');
      
    } catch (err) {
      console.error('🚫 Error processing palm tree instances:', err);
    }
    
  }, [palmTreeGltf, placeholdersGltf]);

  // Don't render until we have the GLTF data
  if (!palmTreeGltf?.scene || !placeholdersGltf?.scene) {
    console.log('🌴 GLB files not ready yet...');
    return null;
  }

  // Get palm tree geometry and material
  let palmTreeGeometry: THREE.BufferGeometry | null = null;
  let palmTreeMaterial: THREE.Material | null = null;

  palmTreeGltf.scene.traverse((child) => {
    if (child.type === 'Mesh' && !palmTreeGeometry) {
      const mesh = child as THREE.Mesh;
      palmTreeGeometry = mesh.geometry;
      palmTreeMaterial = mesh.material as THREE.Material;
    }
  });

  if (!palmTreeGeometry || !palmTreeMaterial) {
    console.log('🚫 Palm tree geometry or material not found');
    return null;
  }

  console.log('🌴 Rendering palm tree instances...');
  
  return (
    <group visible={visible && isLoaded}>
      <instancedMesh
        ref={instancedMeshRef}
        args={[palmTreeGeometry, palmTreeMaterial, 100]} // Max 100 instances
        frustumCulled={false}
      />
    </group>
  );
}

// Preload the GLB files
useGLTF.preload(`${import.meta.env.BASE_URL}palm-tree.glb`);
useGLTF.preload(`${import.meta.env.BASE_URL}palm-placeholders.glb`);
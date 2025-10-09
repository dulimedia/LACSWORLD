import React from 'react';
import * as THREE from 'three';

/**
 * Ground Plane Component for Shadow Reception
 * Provides a large invisible ground plane to receive shadows from buildings
 */
export const GroundPlane: React.FC<{ visible?: boolean }> = ({ visible = false }) => {
  return (
    <mesh 
      receiveShadow 
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, 0, 0]}
    >
      <planeGeometry args={[200, 200]} />
      <meshStandardMaterial 
        color="#808080"
        transparent={false}
        opacity={1}
        shadowSide={THREE.DoubleSide}
        visible={true}
      />
    </mesh>
  );
};
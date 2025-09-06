import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLBState } from '../store/glbState';
import { createFresnelHighlightMaterial } from '../materials/FresnelHighlightMaterial';

export const SelectedUnitOverlay: React.FC = () => {
  const { 
    selectedUnit, 
    selectedBuilding, 
    selectedFloor, 
    getGLBByUnit, 
    getGLBsByBuilding,
    getGLBsByFloor,
    glbNodes 
  } = useGLBState();
  const overlayGroupRef = useRef<THREE.Group>(null);
  const overlayMeshesRef = useRef<THREE.Mesh[]>([]);
  
  // Create the Fresnel highlight material
  const fresnelMaterial = useMemo(() => {
    return createFresnelHighlightMaterial({
      color: '#3aa7ff',    // vibrant blue
      opacity: 0.4,        // translucent
      bias: 0.1,
      scale: 1.8,
      power: 2.5
    });
  }, []);

  // Function to clone meshes from a GLB object and apply Fresnel material
  const createOverlayMeshes = (sourceObject: THREE.Group): THREE.Mesh[] => {
    const overlayMeshes: THREE.Mesh[] = [];
    
    sourceObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        // Clone the mesh but with our highlight material
        const overlayMesh = new THREE.Mesh(
          child.geometry.clone(),
          fresnelMaterial
        );
        
        // Copy transform from original mesh
        overlayMesh.matrix.copy(child.matrixWorld);
        overlayMesh.matrix.decompose(
          overlayMesh.position,
          overlayMesh.quaternion,
          overlayMesh.scale
        );
        
        // Set high render order to draw on top
        overlayMesh.renderOrder = 999;
        overlayMesh.userData.isHighlightOverlay = true;
        
        overlayMeshes.push(overlayMesh);
      }
    });
    
    return overlayMeshes;
  };

  // Update overlay when selection changes
  useEffect(() => {
    if (!overlayGroupRef.current) return;
    
    // Clear existing overlay meshes
    overlayMeshesRef.current.forEach(mesh => {
      overlayGroupRef.current?.remove(mesh);
      mesh.geometry?.dispose();
    });
    overlayMeshesRef.current = [];

    let unitsToHighlight = [];

    // Determine which units to highlight based on selection level
    console.log(`🔍 SelectedUnitOverlay - selectedBuilding:'${selectedBuilding}' selectedFloor:'${selectedFloor}' selectedUnit:'${selectedUnit}'`);
    
    if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
      // Single unit selection (note: selectedFloor can be empty string "" for some buildings)
      console.log(`🎯 SelectedUnitOverlay attempting single unit selection for ${selectedBuilding}/${selectedFloor}/${selectedUnit}`);
      const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
      console.log(`🔍 SelectedUnitOverlay getGLBByUnit result:`, unitGLB);
      
      if (unitGLB?.object && unitGLB.isLoaded) {
        unitsToHighlight.push(unitGLB);
        console.log(`✅ SelectedUnitOverlay found single unit - will highlight 1 unit`);
      } else {
        console.log(`❌ SelectedUnitOverlay failed to find unit - falling back to building selection`);
      }
    } else if (selectedFloor !== null && selectedFloor !== undefined && selectedBuilding) {
      // Floor selection - highlight all units on that floor
      const floorUnits = getGLBsByFloor(selectedBuilding, selectedFloor);
      unitsToHighlight = floorUnits.filter(unit => unit.object && unit.isLoaded);
    } else if (selectedBuilding) {
      // Building selection - highlight all units in the building
      const buildingUnits = getGLBsByBuilding(selectedBuilding);
      unitsToHighlight = buildingUnits.filter(unit => unit.object && unit.isLoaded);
    }

    // Create overlays for all selected units
    if (unitsToHighlight.length > 0) {
      try {
        unitsToHighlight.forEach(unitGLB => {
          const overlayMeshes = createOverlayMeshes(unitGLB.object!);
          
          overlayMeshes.forEach(mesh => {
            overlayGroupRef.current?.add(mesh);
          });
          
          overlayMeshesRef.current.push(...overlayMeshes);
        });
        
        const selectionType = selectedUnit ? 'unit' : selectedFloor ? 'floor' : 'building';
        const selectionName = selectedUnit || selectedFloor || selectedBuilding;
        console.log(`✨ Created highlight overlay for ${selectionType}: ${selectionName} (${unitsToHighlight.length} units, ${overlayMeshesRef.current.length} meshes)`);
      } catch (error) {
        console.error('Error creating overlay:', error);
      }
    }
  }, [selectedUnit, selectedBuilding, selectedFloor, getGLBByUnit, getGLBsByBuilding, getGLBsByFloor, glbNodes, fresnelMaterial]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      overlayMeshesRef.current.forEach(mesh => {
        mesh.geometry?.dispose();
      });
    };
  }, []);

  return <group ref={overlayGroupRef} />;
};
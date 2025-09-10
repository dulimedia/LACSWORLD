import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useGLBState } from '../store/glbState';
import { createFresnelHighlightMaterial } from '../materials/FresnelHighlightMaterial';
import { GHOST_MATERIAL_CONFIG } from '../config/ghostMaterialConfig';

export const SelectedUnitOverlay: React.FC = () => {
  const { 
    selectedUnit, 
    selectedBuilding, 
    selectedFloor, 
    hoveredUnit,
    hoveredFloor,
    getGLBByUnit, 
    getGLBsByBuilding,
    getGLBsByFloor,
    glbNodes 
  } = useGLBState();
  const overlayGroupRef = useRef<THREE.Group>(null);
  const overlayMeshesRef = useRef<THREE.Mesh[]>([]);
  
  // Create the Fresnel highlight material using configuration
  const fresnelMaterial = useMemo(() => {
    return createFresnelHighlightMaterial({
      color: GHOST_MATERIAL_CONFIG.color,
      opacity: GHOST_MATERIAL_CONFIG.opacity,
      bias: GHOST_MATERIAL_CONFIG.fresnelBias,
      scale: GHOST_MATERIAL_CONFIG.fresnelScale,
      power: GHOST_MATERIAL_CONFIG.fresnelPower,
      doubleSide: GHOST_MATERIAL_CONFIG.doubleSide
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

    // Small delay to ensure the original mesh is hidden first
    const timeoutId = setTimeout(() => {
      let unitsToHighlight = [];

      // Determine which units to highlight based on hover state (priority) or selection level
      console.log(`🔍 SelectedUnitOverlay - hoveredFloor:`, hoveredFloor, `hoveredUnit:'${hoveredUnit}' selectedBuilding:'${selectedBuilding}' selectedFloor:'${selectedFloor}' selectedUnit:'${selectedUnit}'`);
      
      if (hoveredFloor) {
        // Floor hover takes highest priority - show all units in the hovered floor
        console.log(`🏢 SelectedUnitOverlay showing hovered floor: ${hoveredFloor.building}/${hoveredFloor.floor}`);
        const floorUnits = getGLBsByFloor(hoveredFloor.building, hoveredFloor.floor);
        unitsToHighlight = floorUnits.filter(unit => unit.object && unit.isLoaded);
        console.log(`✅ SelectedUnitOverlay found ${unitsToHighlight.length} units for hovered floor`);
      } else if (hoveredUnit) {
        // Single unit hover - show only the hovered unit
        console.log(`🐭 SelectedUnitOverlay showing hovered unit: ${hoveredUnit}`);
        const hoveredUnitGLB = glbNodes.get(hoveredUnit);
        
        if (hoveredUnitGLB?.object && hoveredUnitGLB.isLoaded) {
          hoveredUnitGLB.object.visible = false;
          unitsToHighlight.push(hoveredUnitGLB);
          console.log(`✅ SelectedUnitOverlay found hovered unit - will highlight 1 unit`);
        } else {
          console.log(`❌ SelectedUnitOverlay failed to find hovered unit: ${hoveredUnit}`);
        }
      } else if (selectedUnit && selectedBuilding && selectedFloor !== null && selectedFloor !== undefined) {
        // Single unit selection (note: selectedFloor can be empty string "" for some buildings)
        console.log(`🎯 SelectedUnitOverlay attempting single unit selection for ${selectedBuilding}/${selectedFloor}/${selectedUnit}`);
        const unitGLB = getGLBByUnit(selectedBuilding, selectedFloor, selectedUnit);
        console.log(`🔍 SelectedUnitOverlay getGLBByUnit result:`, unitGLB);
        
        if (unitGLB?.object && unitGLB.isLoaded) {
          // Double-check that the original is hidden before creating overlay
          if (unitGLB.object) {
            unitGLB.object.visible = false;
          }
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
            // Ensure original is hidden before creating overlay
            if (unitGLB.object) {
              unitGLB.object.visible = false;
              unitGLB.object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.visible = false;
                }
              });
            }
            
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
    }, 50); // 50ms delay to ensure original mesh is hidden
    
    return () => clearTimeout(timeoutId);
  }, [hoveredFloor, hoveredUnit, selectedUnit, selectedBuilding, selectedFloor, getGLBByUnit, getGLBsByBuilding, getGLBsByFloor, glbNodes, fresnelMaterial]);

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
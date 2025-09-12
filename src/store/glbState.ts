/** Spec reference:
 * See ./docs/AGENT_SPEC.md (§10 Acceptance) and ./docs/INTERACTION_CONTRACT.md (§3-4).
 * Do not change ids/schema without updating docs.
 */
import { create } from 'zustand';
import * as THREE from 'three';

export type GLBVisibilityState = 'invisible' | 'glowing';

export interface GLBNodeInfo {
  key: string;        // e.g., "Maryland Building/First Floor/M-140"
  building: string;   // e.g., "Maryland Building"
  floor: string;      // e.g., "First Floor"  
  unitName: string;   // e.g., "M-140"
  path: string;       // full file path to GLB
  object?: THREE.Group; // loaded GLB object
  state: GLBVisibilityState;
  isLoaded: boolean;
}

export interface GLBState {
  // Map of GLB nodes by their key
  glbNodes: Map<string, GLBNodeInfo>;
  
  // Current selection context
  selectedBuilding: string | null;
  selectedFloor: string | null;
  selectedUnit: string | null;
  
  // Hover state
  hoveredUnit: string | null;
  hoveredFloor: { building: string; floor: string } | null;
  
  // Loading states
  isLoadingGLBs: boolean;
  loadedCount: number;
  totalCount: number;
  
  // Actions
  initializeGLBNodes: () => void;
  updateGLBObject: (key: string, object: THREE.Group) => void;
  setGLBState: (key: string, state: GLBVisibilityState) => void;
  selectBuilding: (building: string | null) => void;
  selectFloor: (building: string | null, floor: string | null) => void;
  selectUnit: (building: string | null, floor: string | null, unit: string | null) => void;
  hoverUnit: (building: string | null, floor: string | null, unit: string | null) => void;
  hoverFloor: (building: string | null, floor: string | null) => void;
  clearSelection: () => void;
  clearUnitSelection: () => void;
  setLoadingState: (loading: boolean, loaded?: number, total?: number) => void;
  
  // Getters
  getGLBsByBuilding: (building: string) => GLBNodeInfo[];
  getGLBsByFloor: (building: string, floor: string) => GLBNodeInfo[];
  getGLBByUnit: (building: string, floor: string, unit: string) => GLBNodeInfo | undefined;
  getVisibleGLBs: () => GLBNodeInfo[];
  getBuildingList: () => string[];
  getFloorList: (building: string) => string[];
}

// GLB file structure mapping based on the actual file system (exact match)
const GLB_STRUCTURE = {
  "Fifth Street Building": {
    "Gound Floor": ["F-10", "F-15", "F-20", "F-25", "F-30", "F-35", "F-40", "F-50", "F-60", "F-70", "FG - Library", "FG - Restroom"],
    "First Floor": ["F-100", "F-105", "F-110 CR", "F-115", "F-140", "F-150", "F-160", "F-170", "F-175", "F-180 ", "F-185", "F-187", "F-190", "F1 Restrooms"],
    "Second Floor": ["F-200", "F-240", "F-250", "F-280", "F-290", "F2 Restrooms"],
    "Third Floor": ["F-300", "F-330", "F-340", "F-350", "F-360", "F-363", "F-365", "F-380", "F3 Restrooms"]
  },
  "Maryland Building": {
    "Ground Floor": ["ET Lab", "M-20", "M-40", "M-45", "M-50", "MG - Stage 7", "Studio O.M."],
    "First Floor": ["M-120", "M-130", "M-140", "M-145", "M-150", "M-160", "M-170", "M-180", "M1 Restrooms"],
    "Second Floor": ["M-210", "M-220", "M-230", "M-240", "M-250", "M-260", "M-270", "M2 Restroom"],
    "Third Floor": ["M-300", "M-320", "M-340", "M-345", "M-350", "M3 Restroom"]
  },
  "Tower Building": {
    "Main Floor": ["T-950", "T-100", "T-1000", "T-110", "T-1100", "T-1200", "T-200", "T-210", "T-220", "T-230", "T-300", "T-320", "T-400", "T-410", "T-420", "T-430", "T-450", "T-500", "T-530", "T-550", "T-600", "T-700", "T-800", "T-900"]
  },
  "Other": {
    "Event Space": ["Event Area 1", "Flix Cafe", "Theater"],
    "Mills": ["MILL 2", "MILL 3 OFFICE", "MILL 3", "MILL 4"],
    "Parking": ["Park", "Surface Parking 2", "Surface Parking"],
    "Shops": ["Kiosk", "Lobby - 2 "]
  },
  "Stages": {
    "Production": ["Production Support - A", "Production Support - B", "Production Support - D", "Production Support C"],
    "": ["Stage 7", "Stage 8", "Stage A", "Stage B", "Stage C", "Stage D", "Stage E", "Stage F"]
  }
};

export const useGLBState = create<GLBState>((set, get) => ({
  // Initial state
  glbNodes: new Map(),
  selectedBuilding: null,
  selectedFloor: null,
  selectedUnit: null,
  hoveredUnit: null,
  hoveredFloor: null,
  isLoadingGLBs: false,
  loadedCount: 0,
  totalCount: 0,

  // Actions
  initializeGLBNodes: () => {
    const nodes = new Map<string, GLBNodeInfo>();
    let total = 0;

    Object.entries(GLB_STRUCTURE).forEach(([building, floors]) => {
      Object.entries(floors).forEach(([floor, units]) => {
        units.forEach(unit => {
          // Special cases for key generation
          let key;
          if (building === "Tower Building") {
            key = `${building}/${unit}`;
          } else if (building === "Stages" && floor === "") {
            key = `${building}/${unit}`; // Stages with empty floor - no floor in key
          } else {
            key = `${building}/${floor}/${unit}`;
          }
          
          // Special case for Tower Building - files are directly in building folder
          let path;
          if (building === "Tower Building") {
            // For Tower Building, check if we need to add trailing space for file compatibility
            const fileUnit = unit === "T-950" ? "T- 950" : 
                           ["T-1000", "T-1100", "T-1200", "T-400", "T-410", "T-420", "T-430", "T-450", "T-700", "T-800", "T-900"].includes(unit) ? unit + " " : unit;
            path = import.meta.env.BASE_URL + `models/boxes/${building}/${fileUnit}.glb`;
          } else {
            // Handle empty floor strings to avoid double slashes
            const floorPath = floor ? `/${floor}` : '';
            // For Fifth Street Building, check if we need trailing space for F-180
            const fileUnit = (building === "Fifth Street Building" && unit === "F-180") ? "F-180 " :
                           (building === "Maryland Building" && unit === "MG - Stage 7") ? "MG - Stage 7 " : unit;
            path = import.meta.env.BASE_URL + `models/boxes/${building}${floorPath}/${fileUnit}.glb`;
          }
          
          
          nodes.set(key, {
            key,
            building,
            floor,
            unitName: unit,
            path,
            state: 'invisible', // Default state - units are always invisible
            isLoaded: false
          });
          total++;
        });
      });
    });

    set({ glbNodes: nodes, totalCount: total, loadedCount: 0 });
  },

  updateGLBObject: (key: string, object: THREE.Group) => {
    const { glbNodes, loadedCount } = get();
    const node = glbNodes.get(key);
    
    if (node) {
      // Ensure the object is hidden immediately when stored
      object.visible = false;
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.visible = false;
        }
      });
      
      const updatedNode = { ...node, object, isLoaded: true };
      const newNodes = new Map(glbNodes);
      newNodes.set(key, updatedNode);
      
      set({ 
        glbNodes: newNodes, 
        loadedCount: loadedCount + 1 
      });
    }
  },

  setGLBState: (key: string, state: GLBVisibilityState) => {
    const { glbNodes } = get();
    const node = glbNodes.get(key);
    
    if (node) {
      const updatedNode = { ...node, state };
      const newNodes = new Map(glbNodes);
      newNodes.set(key, updatedNode);
      
      set({ glbNodes: newNodes });
      
      
      // Apply the visual state to the Three.js object if loaded
      if (node.object) {
        if (state === 'invisible') {
          node.object.visible = false;
        } else {
          node.object.visible = true;
          // The FresnelMaterial will be applied by the component
        }
      }
    }
  },

  selectBuilding: (building: string | null) => {
    console.log(`🏢 selectBuilding called with: '${building}'`);
    const { glbNodes } = get();
    
    // Reset all GLBs to invisible first
    glbNodes.forEach((node, key) => {
      get().setGLBState(key, 'invisible');
    });
    
    if (building) {
      // Set building GLBs to glowing
      const buildingUnits = get().getGLBsByBuilding(building);
      console.log(`🏢 Setting ${buildingUnits.length} units to glowing for building '${building}'`);
      buildingUnits.forEach(node => {
        get().setGLBState(node.key, 'glowing');
      });
    }
    
    set({ 
      selectedBuilding: building,
      selectedFloor: null,
      selectedUnit: null 
    });
  },

  selectFloor: (building: string | null, floor: string | null) => {
    const { glbNodes } = get();
    
    // Reset all GLBs to invisible first
    glbNodes.forEach((node, key) => {
      get().setGLBState(key, 'invisible');
    });
    
    if (building && floor) {
      // Set floor GLBs to glowing
      get().getGLBsByFloor(building, floor).forEach(node => {
        get().setGLBState(node.key, 'glowing');
      });
    }
    
    set({ 
      selectedBuilding: building,
      selectedFloor: floor,
      selectedUnit: null 
    });
  },

  selectUnit: (building: string | null, floor: string | null, unit: string | null) => {
    console.log(`🎯 selectUnit called with: building:'${building}' floor:'${floor}' unit:'${unit}'`);
    if (building === "Stages") {
      console.log(`🎭 Stages selectUnit - will look for key based on floor:'${floor}'`);
    }
    const { glbNodes } = get();
    
    // Reset all GLBs to invisible first
    glbNodes.forEach((node, key) => {
      get().setGLBState(key, 'invisible');
    });
    
    if (building && floor && unit) {
      // Set only the specific unit GLB to glowing
      const unitGLB = get().getGLBByUnit(building, floor, unit);
      console.log(`🔍 selectUnit Debug: building:'${building}' floor:'${floor}' unit:'${unit}'`);
      console.log(`🎯 Found unitGLB:`, unitGLB);
      
      if (unitGLB) {
        get().setGLBState(unitGLB.key, 'glowing');
        console.log(`✅ Set unit '${unitGLB.key}' to glowing - should show ONLY this unit`);
      } else {
        console.log(`❌ No unitGLB found for ${building}/${floor}/${unit}`);
        console.log(`📋 Available GLB keys:`, Array.from(glbNodes.keys()));
        
        // Debug: Show all GLBs for this building
        const buildingGLBs = get().getGLBsByBuilding(building);
        console.log(`🏢 All GLBs in '${building}':`, buildingGLBs.map(g => g.key));
      }
    }
    
    set({ 
      selectedBuilding: building,
      selectedFloor: floor,
      selectedUnit: unit 
    });
  },

  hoverUnit: (building: string | null, floor: string | null, unit: string | null) => {
    const { selectedUnit, selectedBuilding, selectedFloor } = get();
    const { glbNodes } = get();
    
    if (building && unit) {
      // Construct the key to find the unit
      let key;
      if (building === "Tower Building") {
        key = `${building}/${unit}`;
      } else if (building === "Stages" && (!floor || floor === "")) {
        key = `${building}/${unit}`;
      } else {
        key = `${building}/${floor}/${unit}`;
      }
      
      console.log(`🎯 HOVER DEBUG: building:'${building}' floor:'${floor}' unit:'${unit}' constructed key:'${key}'`);
      
      // Set hover state
      set({ hoveredUnit: key });
      
      // Hide all units first
      let hiddenCount = 0;
      glbNodes.forEach((node, nodeKey) => {
        get().setGLBState(nodeKey, 'invisible');
        hiddenCount++;
      });
      
      console.log(`🎯 HOVER DEBUG: Hidden ${hiddenCount} units`);
      
      // Then make ONLY the hovered unit glow
      const hoveredNode = glbNodes.get(key);
      if (hoveredNode) {
        get().setGLBState(key, 'glowing');
        console.log(`🎯 HOVER DEBUG: Made unit '${key}' glow - SUCCESS`);
      } else {
        console.log(`🎯 HOVER DEBUG: Unit '${key}' NOT FOUND in glbNodes`);
        console.log(`🎯 HOVER DEBUG: Available keys:`, Array.from(glbNodes.keys()).filter(k => k.includes(unit)));
      }
    } else {
      // Clear hover
      set({ hoveredUnit: null });
      
      // Restore previous selection state when hover is cleared
      if (selectedUnit) {
        // Restore single unit selection
        get().selectUnit(selectedBuilding, selectedFloor, selectedUnit);
      } else if (selectedFloor) {
        // Restore floor selection
        get().selectFloor(selectedBuilding, selectedFloor);
      } else if (selectedBuilding) {
        // Restore building selection
        get().selectBuilding(selectedBuilding);
      } else {
        // No selections, hide all
        glbNodes.forEach((node, key) => {
          get().setGLBState(key, 'invisible');
        });
      }
    }
  },

  hoverFloor: (building: string | null, floor: string | null) => {
    
    if (building && floor) {
      // Set the floor hover state - let SelectedUnitOverlay handle the rendering
      set({ hoveredFloor: { building, floor }, hoveredUnit: null });
    } else {
      // Clear floor hover
      set({ hoveredFloor: null });
    }
  },

  clearSelection: () => {
    const { glbNodes } = get();
    
    // Reset all GLBs to invisible
    glbNodes.forEach((node, key) => {
      get().setGLBState(key, 'invisible');
    });
    
    set({ 
      selectedBuilding: null,
      selectedFloor: null,
      selectedUnit: null,
      hoveredUnit: null,
      hoveredFloor: null
    });
  },

  clearUnitSelection: () => {
    const { selectedBuilding, selectedFloor } = get();
    
    // Only clear the unit selection, preserve building/floor
    if (selectedBuilding && selectedFloor) {
      // Re-select the floor to show all units in that floor
      get().selectFloor(selectedBuilding, selectedFloor);
    } else if (selectedBuilding) {
      // Re-select the building to show all units in that building
      get().selectBuilding(selectedBuilding);
    }
    
    set({ 
      selectedUnit: null,
      hoveredUnit: null
    });
  },

  setLoadingState: (loading: boolean, loaded?: number, total?: number) => {
    const updates: Partial<GLBState> = { isLoadingGLBs: loading };
    if (loaded !== undefined) updates.loadedCount = loaded;
    if (total !== undefined) updates.totalCount = total;
    set(updates);
  },

  // Getters
  getGLBsByBuilding: (building: string) => {
    const { glbNodes } = get();
    const result: GLBNodeInfo[] = [];
    
    glbNodes.forEach(node => {
      if (node.building === building) {
        result.push(node);
      }
    });
    
    return result;
  },

  getGLBsByFloor: (building: string, floor: string) => {
    const { glbNodes } = get();
    const result: GLBNodeInfo[] = [];
    
    
    glbNodes.forEach(node => {
      // Special cases for buildings with simplified key structures
      if (building === "Tower Building") {
        // Tower Building - match by building only since all units are on one "floor"
        if (node.building === building) {
          result.push(node);
        }
      } else if (building === "Stages" && floor === "") {
        // Stages with empty floor - match by building and empty floor
        if (node.building === building && node.floor === "") {
          result.push(node);
        }
      } else {
        if (node.building === building && node.floor === floor) {
          result.push(node);
        } else if (node.building === building) {
        }
      }
    });
    
    return result;
  },

  getGLBByUnit: (building: string, floor: string, unit: string) => {
    const { glbNodes } = get();
    
    // Special cases for key generation
    let key;
    if (building === "Tower Building") {
      key = `${building}/${unit}`;
    } else if (building === "Stages" && floor === "") {
      key = `${building}/${unit}`; // Stages with empty floor - no floor in key
    } else {
      key = `${building}/${floor}/${unit}`;
    }
    
    // Debug logging
    console.log(`🔎 getGLBByUnit looking for key: '${key}' (building: '${building}', floor: '${floor}', unit: '${unit}')`);
    
    const result = glbNodes.get(key);
    if (!result) {
      // Try to find similar keys for debugging
      const similarKeys = Array.from(glbNodes.keys()).filter(k => 
        k.includes(building) && k.includes(unit)
      );
      console.log(`🔍 Similar keys found:`, similarKeys);
    }
    
    return result;
  },

  getVisibleGLBs: () => {
    const { glbNodes } = get();
    const result: GLBNodeInfo[] = [];
    
    glbNodes.forEach(node => {
      if (node.state === 'glowing') {
        result.push(node);
      }
    });
    
    return result;
  },

  getBuildingList: () => {
    return Object.keys(GLB_STRUCTURE);
  },

  getFloorList: (building: string) => {
    const floors = Object.keys(GLB_STRUCTURE[building as keyof typeof GLB_STRUCTURE] || {});
    
    // Custom floor sorting: Ground, First, Second, Third, then alphabetical
    return floors.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Define floor priorities
      const getFloorPriority = (floorName: string) => {
        if (floorName.includes('ground') || floorName.includes('gound')) return 0; // Handle typo
        if (floorName.includes('first')) return 1;
        if (floorName.includes('second')) return 2;
        if (floorName.includes('third')) return 3;
        return 999; // Other floors go last
      };
      
      const aPriority = getFloorPriority(aLower);
      const bPriority = getFloorPriority(bLower);
      
      // Sort by priority first
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort alphabetically
      return a.localeCompare(b);
    });
  }
}));
import { create } from 'zustand';
import { emitEvent, getTimestamp, type ScopeType } from '../lib/events';

export type UnitStatus = boolean; // true = Available, false = Unavailable

export interface UnitRecord {
  unit_key: string;     // e.g. "F_02_280" or "A_01_101"
  building: string;     // e.g. "F"
  floor: string;        // e.g. "02"
  unit_name: string;    // e.g. "Suite 280"
  status: UnitStatus;
  area_sqft?: number;
  price_per_sqft?: number;
  lease_term?: string;
  floorplan_url?: string;
  thumbnail_url?: string;
  node_name?: string;   // optional fallback
  recipients: string[]; // parsed from recipients_csv or default
  notes?: string;
  kitchen_size?: string; // Kitchen size from CSV (Full, Compact, Kitchenette, None)
  unit_type?: string;   // Unit type from CSV (Suite, Event Space, Other, Parking, etc.)
}

export interface ExploreState {
  // Core state
  showAvailableOnly: boolean;
  hoveredUnitKey: string | null;
  selectedUnitKey: string | null;
  drawerOpen: boolean;
  unitDetailsOpen: boolean;
  show3DPopup: boolean;
  
  // Hierarchical structure: building → floor → unit_keys
  unitsByBuilding: Record<string, Record<string, string[]>>;
  
  // Unit data map for quick lookups
  unitsData: Map<string, UnitRecord>;
  
  // Loading states
  isLoadingUnits: boolean;
  
  // Actions
  setShowAvailableOnly: (show: boolean) => void;
  setHovered: (unitKey: string | null) => void;
  setSelected: (unitKey: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setUnitDetailsOpen: (open: boolean) => void;
  setShow3DPopup: (open: boolean) => void;
  setUnitsIndex: (index: ExploreState['unitsByBuilding']) => void;
  setUnitsData: (data: Map<string, UnitRecord>) => void;
  setLoadingUnits: (loading: boolean) => void;
  
  // Derived getters
  getFilteredUnits: () => string[];
  getUnitsByFloor: (building: string, floor: string) => string[];
  getUnitData: (unitKey: string) => UnitRecord | undefined;
  getBuildingList: () => string[];
  getFloorList: (building: string) => string[];
}

export const useExploreState = create<ExploreState>((set, get) => ({
  // Initial state
  showAvailableOnly: false,
  hoveredUnitKey: null,
  selectedUnitKey: null,
  drawerOpen: false,
  unitDetailsOpen: false,
  show3DPopup: false,
  unitsByBuilding: {},
  unitsData: new Map(),
  isLoadingUnits: false,

  // Actions
  setShowAvailableOnly: (show: boolean) => {
    set({ showAvailableOnly: show });
    // Emit availability filter event
    emitEvent('evt.availability.toggled', {
      ts: getTimestamp(),
      on: show
    });
  },

  setHovered: (unitKey: string | null) => {
    const currentHovered = get().hoveredUnitKey;
    if (currentHovered !== unitKey) {
      set({ hoveredUnitKey: unitKey });
      
      if (unitKey) {
        // Emit highlight changed event
        emitEvent('evt.highlight.changed', {
          ts: getTimestamp(),
          scope: 'unit' as ScopeType,
          ids: [unitKey]
        });
      }
    }
  },

  setSelected: (unitKey: string | null) => {
    const currentSelected = get().selectedUnitKey;
    if (currentSelected !== unitKey) {
      set({ selectedUnitKey: unitKey });
      
      // Emit selection changed event
      const selected = unitKey ? [unitKey] : [];
      emitEvent('evt.selection.changed', {
        ts: getTimestamp(),
        selected
      });
      
      if (unitKey) {
        // Emit scope framed event for camera to focus on the unit
        emitEvent('evt.scope.framed', {
          ts: getTimestamp(),
          scope: 'unit' as ScopeType,
          id: unitKey
        });
      }
    }
  },

  setDrawerOpen: (open: boolean) => {
    const wasOpen = get().drawerOpen;
    if (wasOpen !== open) {
      set({ drawerOpen: open });
      
      // Emit drawer events
      if (open) {
        emitEvent('evt.ui.drawer.opened', {
          ts: getTimestamp(),
          source: 'button'
        });
      } else {
        emitEvent('evt.ui.drawer.closed', {
          ts: getTimestamp()
        });
      }
    }
  },

  setUnitDetailsOpen: (open: boolean) => {
    set({ unitDetailsOpen: open });
  },

  setShow3DPopup: (open: boolean) => {
    set({ show3DPopup: open });
  },

  setUnitsIndex: (index: ExploreState['unitsByBuilding']) => {
    set({ unitsByBuilding: index });
  },

  setUnitsData: (data: Map<string, UnitRecord>) => {
    set({ unitsData: data });
    
    // Emit inventory updated event
    emitEvent('evt.inventory.updated', {
      ts: getTimestamp(),
      updatedAt: getTimestamp(),
      rows: data.size
    });
  },

  setLoadingUnits: (loading: boolean) => {
    set({ isLoadingUnits: loading });
  },

  // Derived getters
  getFilteredUnits: () => {
    const { showAvailableOnly, unitsData, unitsByBuilding } = get();
    const allUnitKeys: string[] = [];
    
    // Flatten all unit keys from the building structure
    Object.values(unitsByBuilding).forEach(floors => {
      Object.values(floors).forEach(unitKeys => {
        allUnitKeys.push(...unitKeys);
      });
    });

    if (!showAvailableOnly) {
      return allUnitKeys;
    }

    // Filter by availability
    return allUnitKeys.filter(unitKey => {
      const unit = unitsData.get(unitKey);
      return unit?.status === true;
    });
  },

  getUnitsByFloor: (building: string, floor: string) => {
    const { unitsByBuilding } = get();
    return unitsByBuilding[building]?.[floor] || [];
  },

  getUnitData: (unitKey: string) => {
    return get().unitsData.get(unitKey);
  },

  getBuildingList: () => {
    const buildings = Object.keys(get().unitsByBuilding).sort();
    console.log('🏢 getBuildingList: Available buildings:', buildings);
    console.log('🏢 getBuildingList: unitsByBuilding data:', get().unitsByBuilding);
    return buildings;
  },

  getFloorList: (building: string) => {
    console.log(`🚨 EXPLORE STATE getFloorList CALLED for building: "${building}"`);
    const { unitsByBuilding } = get();
    const floors = Object.keys(unitsByBuilding[building] || {});
    console.log(`🏢 FLOOR DEBUG: Building "${building}" - Raw floors:`, floors);
    
    // FORCE CORRECT ORDER: Ground → First → Second → Third
    const floorOrder = ['Ground Floor', 'Gound Floor', 'First Floor', 'Second Floor', 'Third Floor'];
    
    const sortedFloors = floors.sort((a, b) => {
      // Find index in our desired order (-1 if not found)
      let aIndex = floorOrder.findIndex(orderFloor => 
        a.toLowerCase().includes(orderFloor.toLowerCase()) || 
        orderFloor.toLowerCase().includes(a.toLowerCase())
      );
      let bIndex = floorOrder.findIndex(orderFloor => 
        b.toLowerCase().includes(orderFloor.toLowerCase()) || 
        orderFloor.toLowerCase().includes(b.toLowerCase())
      );
      
      // If not found in our order list, put at end (high index)
      if (aIndex === -1) aIndex = 999;
      if (bIndex === -1) bIndex = 999;
      
      console.log(`🔢 FORCE SORTING: "${a}" (index ${aIndex}) vs "${b}" (index ${bIndex})`);
      
      // Sort by index in our desired order
      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }
      
      // If same index, sort alphabetically
      return a.localeCompare(b);
    });
    
    console.log(`🏢 FLOOR DEBUG: Building "${building}" - FINAL SORTED floors:`, sortedFloors);
    return sortedFloors;
  }
}));

// Helper function to build the hierarchical structure from unit data
export const buildUnitsIndex = (units: Map<string, UnitRecord>): Record<string, Record<string, string[]>> => {
  const index: Record<string, Record<string, string[]>> = {};
  
  units.forEach((unit, unitKey) => {
    const { building, floor } = unit;
    
    if (!index[building]) {
      index[building] = {};
    }
    
    if (!index[building][floor]) {
      index[building][floor] = [];
    }
    
    index[building][floor].push(unitKey);
  });
  
  // Sort units within each floor
  Object.keys(index).forEach(building => {
    Object.keys(index[building]).forEach(floor => {
      index[building][floor].sort();
    });
  });
  
  return index;
};
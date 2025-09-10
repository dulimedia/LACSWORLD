import { create } from 'zustand';

interface UnitState {
  selectedUnit: string | null;
  hoveredUnit: string | null;
  setSelectedUnit: (unitName: string | null) => void;
  setHoveredUnit: (unitName: string | null) => void;
}

export const useUnitStore = create<UnitState>((set) => ({
  selectedUnit: null,
  hoveredUnit: null,
  setSelectedUnit: (unitName) => set({ selectedUnit: unitName }),
  setHoveredUnit: (unitName) => set({ hoveredUnit: unitName }),
}));
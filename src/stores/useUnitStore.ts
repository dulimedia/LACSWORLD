import { create } from 'zustand';

interface UnitState {
  selectedUnit: string | null;
  setSelectedUnit: (unitName: string | null) => void;
}

export const useUnitStore = create<UnitState>((set) => ({
  selectedUnit: null,
  setSelectedUnit: (unitName) => set({ selectedUnit: unitName }),
}));
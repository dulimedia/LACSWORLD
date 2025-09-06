import { useState, useEffect } from 'react';
import { UnitRecord, UnitStatus, buildUnitsIndex } from '../store/exploreState';
import { emitEvent, getTimestamp } from '../lib/events';

type TreeNode = { name: string; children?: Array<TreeNode | string> };

/**
 * Utility: normalize a filename like "F-100.glb" => "f-100"
 * - removes extension
 * - trims spaces
 * - normalizes dashes and spaces to single dash
 * - lowercases
 */
const filenameToUnitName = (filename: string) => {
  let base = filename.replace(/\.glb$/i, '').trim();
  // Normalize spaces around dashes and remaining spaces
  base = base.replace(/\s*-\s*/g, '-');
  base = base.replace(/\s+/g, '-');
  // Remove any characters except letters, numbers and dashes
  base = base.replace(/[^a-zA-Z0-9\-]/g, '');
  return base.toLowerCase();
};

// Default recipients fallback
const DEFAULT_RECIPIENTS = ['leasing@example.com'];

/**
 * Create unit record from GLB file data
 */
const createUnitRecord = (building: string, floor: string, glbFilename: string): UnitRecord => {
  const unitName = filenameToUnitName(glbFilename);
  const displayName = glbFilename.replace(/\.glb$/i, '');
  const unit_key = `${building}/${floor}/${unitName}`;
  
  // Mock some realistic data for the units
  const mockStatus: UnitStatus = Math.random() > 0.3 ? 'Available' : 'Unavailable';
  const mockArea = Math.floor(Math.random() * 2000) + 500; // 500-2500 sqft
  
  return {
    unit_key,
    building,
    floor: floor || 'Main Floor', // Handle empty floor names
    unit_name: displayName, // Use the display name (without .glb)
    status: mockStatus,
    area_sqft: mockArea,
    price_per_sqft: Math.random() * 5 + 15, // $15-20 per sqft
    lease_term: Math.random() > 0.5 ? '12 months' : '24 months',
    node_name: unitName,
    recipients: DEFAULT_RECIPIENTS,
    notes: `3D model unit in ${building} - ${glbFilename}`
  };
};

/**
 * Process the tree structure from boxes_index.json to extract units
 */
const processTreeNode = (node: TreeNode | string, parentPath: string[] = []): UnitRecord[] => {
  const units: UnitRecord[] = [];
  
  if (typeof node === 'string') {
    // This is a GLB file
    if (node.endsWith('.glb')) {
      const building = parentPath[0] || 'Unknown';
      const floor = parentPath[1] || 'Main Floor';
      const unit = createUnitRecord(building, floor, node);
      units.push(unit);
      console.log(`🏢 Created unit: ${unit.unit_key} in ${building}/${floor}`);
    }
  } else {
    // This is a folder node
    if (node.children) {
      const currentPath = [...parentPath, node.name];
      console.log(`📁 Processing folder: ${node.name}, path: ${currentPath.join('/')}`);
      node.children.forEach(child => {
        units.push(...processTreeNode(child, currentPath));
      });
    }
  }
  
  return units;
};

export interface UseUnitDataResult {
  unitsMap: Map<string, UnitRecord>;
  unitsByBuilding: Record<string, Record<string, string[]>>;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to load unit data from boxes_index.json (actual GLB files)
 * This matches the approach used by FilterDropdown
 */
export const useUnitData = (): UseUnitDataResult => {
  const [unitsMap, setUnitsMap] = useState<Map<string, UnitRecord>>(new Map());
  const [unitsByBuilding, setUnitsByBuilding] = useState<Record<string, Record<string, string[]>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGLBData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the pre-generated index from public/
      const response = await fetch('/models/boxes_index.json');
      if (!response.ok) {
        throw new Error(`Failed to load boxes_index.json: ${response.status}`);
      }
      
      const tree: TreeNode = await response.json();
      console.log('🌳 Loaded tree structure:', tree);
      
      const newUnitsMap = new Map<string, UnitRecord>();
      let totalUnits = 0;

      // Process the tree structure to extract all units
      // Start processing from the children of the root "boxes" node
      let allUnits: UnitRecord[] = [];
      if (tree.children) {
        tree.children.forEach(child => {
          allUnits.push(...processTreeNode(child));
        });
      }
      console.log('🔍 Processed units:', allUnits.length, allUnits.slice(0, 5));
      
      allUnits.forEach(unit => {
        newUnitsMap.set(unit.unit_key, unit);
        totalUnits++;
      });

      // Build hierarchical index
      const hierarchicalIndex = buildUnitsIndex(newUnitsMap);
      console.log('🏗️ Built hierarchical index:', Object.keys(hierarchicalIndex));
      
      setUnitsMap(newUnitsMap);
      setUnitsByBuilding(hierarchicalIndex);

      console.log(`📊 Loaded ${totalUnits} units from boxes_index.json`);

      // Emit data ready event
      emitEvent('evt.inventory.updated', {
        ts: getTimestamp(),
        updatedAt: getTimestamp(),
        rows: totalUnits
      });

    } catch (loadError: any) {
      const errorMessage = loadError.message || 'Failed to load boxes_index.json';
      setError(errorMessage);
      console.error('boxes_index.json load error:', loadError);
      
      // Emit error event
      emitEvent('evt.viewer.error', {
        ts: getTimestamp(),
        error: {
          code: 'BOXES_INDEX_FAILED',
          message: errorMessage,
          cause: loadError
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    loadGLBData();
  }, []);

  return {
    unitsMap,
    unitsByBuilding,
    loading,
    error,
    refetch: loadGLBData
  };
};
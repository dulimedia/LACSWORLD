import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  ChevronDown, 
  ChevronRight, 
  Search, 
  Filter, 
  Circle, 
  Square, 
  Building, 
  MapPin,
  X,
  ArrowLeft,
  Expand,
  Share,
  MessageCircle 
} from 'lucide-react';
import { useExploreState, type UnitRecord } from '../store/exploreState';
import { useGLBState } from '../store/glbState';
import { useUnitStore } from '../stores/useUnitStore';
import { UnitHoverPreview } from '../components/UnitHoverPreview';
import { FloorplanViewer } from '../components/FloorplanViewer';
import { preloadFloorFloorplans } from '../services/floorplanService';

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

type TreeNode = { name: string; children?: Array<TreeNode | string> };

interface ExploreUnitsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRequest?: (unitKey: string, unitName: string) => void;
  onExpandFloorplan?: (floorplanUrl: string, unitName: string, unitData?: any) => void;
}

interface BuildingNodeProps {
  building: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onBuildingClick: () => void;
  onUnitSelect?: (unitData: any) => void;
}

interface FloorNodeProps {
  building: string;
  floor: string;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onFloorClick: () => void;
  onUnitSelect?: (unitData: any) => void;
}

interface UnitRowProps {
  unit: UnitRecord;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: (unitKey: string | null) => void;
  onSelect: (unitKey: string) => void;
}

const UnitRow: React.FC<UnitRowProps> = ({
  unit,
  isSelected,
  isHovered,
  isDimmed,
  onHover,
  onSelect
}) => {
  const isAvailable = unit.status === 'Available';
  
  return (
    <div
      className={`
        px-4 py-2 cursor-pointer transition-all duration-150 border-l-4
        ${isSelected 
          ? 'bg-blue-50 border-blue-500 shadow-sm' 
          : isHovered 
            ? 'bg-gray-50 border-gray-300' 
            : 'border-transparent hover:bg-gray-25'
        }
        ${isDimmed ? 'opacity-40 pointer-events-none' : ''}
      `}
      onMouseEnter={() => onHover(unit.unit_key)}
      onMouseLeave={() => onHover(null)}
      onClick={() => {
        if (!isDimmed) {
          onHover(null); // Clear hover immediately on click
          onSelect(unit.unit_key);
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {isAvailable ? (
            <Circle size={8} className="text-green-500 fill-current" />
          ) : (
            <Square size={8} className="text-red-500 fill-current" />
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {unit.unit_name}
            </div>
            <div className="text-xs text-gray-500">
              {unit.unit_key}
            </div>
          </div>
        </div>
        <div className="text-right">
          {/* Square footage removed per user request */}
        </div>
      </div>
    </div>
  );
};

const FloorNode: React.FC<FloorNodeProps> = ({
  building,
  floor,
  isExpanded,
  onToggleExpanded,
  onFloorClick,
  onUnitSelect
}) => {
  const { getUnitsByFloor, getUnitData, showAvailableOnly, hoveredUnitKey, selectedUnitKey, setHovered, setSelected } = useExploreState();
  const { selectUnit } = useGLBState();
  const { setHoveredUnit } = useUnitStore();
  
  // Wrapper function to handle both hover states
  const handleUnitHover = (unitKey: string | null) => {
    setHovered(unitKey); // For the explore panel UI state
    
    // Convert unitKey to unit name for the 3D highlighting
    if (unitKey) {
      const unitData = getUnitData(unitKey);
      if (unitData && unitData.unit_name) {
        setHoveredUnit(unitData.unit_name);
      }
    } else {
      setHoveredUnit(null);
    }
  };
  
  const handleUnitSelect = (unitKey: string) => {
    // Extract unit name from the unit data
    const unitData = getUnitData(unitKey);
    if (unitData) {
      // Call original selection handler
      setSelected(unitKey);
      
      // Update GLB state for 3D visualization
      selectUnit(building, floor, unitData.unit_name);
      
      console.log(`Selected unit ${building}/${floor}/${unitData.unit_name} - GLB updated`);
      
      // Navigate to details view if we have the handler
      if (onUnitSelect) {
        // Clear hover state when selecting a unit
        handleUnitHover(null);
        onUnitSelect(unitData);
      }
    }
  };
  
  const unitKeys = getUnitsByFloor(building, floor);
  const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
  
  // Filter units based on availability toggle
  const visibleUnits = useMemo(() => {
    if (!showAvailableOnly) return units;
    return units; // Show all units but dim unavailable ones
  }, [units, showAvailableOnly]);

  const availableCount = units.filter(unit => unit.status === 'Available').length;
  const totalCount = units.length;
  
  // Preload floorplans when floor is expanded
  useEffect(() => {
    if (isExpanded && units.length > 0) {
      preloadFloorFloorplans(units).then(() => {
        console.log(`✅ Preloaded ${units.length} floorplans for ${building}/${floor}`);
      }).catch(error => {
        console.warn(`Failed to preload some floorplans for ${building}/${floor}`, error);
      });
    }
  }, [isExpanded, units, building, floor]);

  return (
    <div className="border-t border-gray-100">
      <div 
        className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={() => {
          onFloorClick();
          onToggleExpanded();
        }}
      >
        <div className="flex items-center space-x-2">
          {isExpanded ? (
            <ChevronDown size={16} className="text-gray-400 transition-transform duration-200" />
          ) : (
            <ChevronRight size={16} className="text-gray-400 transition-transform duration-200" />
          )}
          <MapPin size={14} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">Floor {floor}</span>
        </div>
        <div className="text-xs text-gray-500">
          <span className="text-green-600 font-medium">{availableCount}</span>
          <span className="mx-1">/</span>
          <span>{totalCount}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-25">
          {visibleUnits.map(unit => (
            <UnitRow
              key={unit.unit_key}
              unit={unit}
              isSelected={selectedUnitKey === unit.unit_key}
              isHovered={hoveredUnitKey === unit.unit_key}
              isDimmed={showAvailableOnly && unit.status !== 'Available'}
              onHover={handleUnitHover}
              onSelect={handleUnitSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BuildingNode: React.FC<BuildingNodeProps> = ({
  building,
  isExpanded,
  onToggleExpanded,
  onBuildingClick,
  onUnitSelect
}) => {
  console.log(`🚨 BuildingNode RENDER for building: "${building}", isExpanded: ${isExpanded}`);
  const { getFloorList, getUnitsByFloor, getUnitData } = useExploreState();
  const [expandedFloors, setExpandedFloors] = useState<Record<string, boolean>>({});
  
  const floors = getFloorList(building);
  console.log(`🏗️ BuildingNode: Got floors for "${building}":`, floors);
  
  // Calculate building stats
  const { availableCount, totalCount } = useMemo(() => {
    let available = 0;
    let total = 0;
    
    floors.forEach(floor => {
      const unitKeys = getUnitsByFloor(building, floor);
      const units = unitKeys.map(key => getUnitData(key)).filter(Boolean) as UnitRecord[];
      
      total += units.length;
      available += units.filter(unit => unit.status === 'Available').length;
    });
    
    return { availableCount: available, totalCount: total };
  }, [building, floors, getUnitsByFloor, getUnitData]);

  const toggleFloorExpanded = (floor: string) => {
    setExpandedFloors(prev => ({ ...prev, [floor]: !prev[floor] }));
  };

  const handleFloorClick = (floor: string) => {
    const { selectFloor } = useGLBState.getState();
    selectFloor(building, floor);
    console.log(`Selected floor ${building}/${floor} - GLBs updated`);
  };

  return (
    <div className="border border-gray-200 rounded-lg mb-2 overflow-hidden shadow-sm">
      <div 
        className="px-4 py-3 bg-white flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={() => {
          onBuildingClick();
          onToggleExpanded();
        }}
      >
        <div className="flex items-center space-x-3">
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-500 transition-transform duration-200" />
          ) : (
            <ChevronRight size={18} className="text-gray-500 transition-transform duration-200" />
          )}
          <Building size={16} className="text-blue-600" />
          <div>
            <div className="text-sm font-semibold text-gray-900">{building}</div>
            <div className="text-xs text-gray-500">{floors.length} floors</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-700">
            <span className="text-green-600">{availableCount}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span>{totalCount}</span>
          </div>
          <div className="text-xs text-gray-500">units available</div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50 border-t border-gray-100">
          {floors.map(floor => (
            <FloorNode
              key={floor}
              building={building}
              floor={floor}
              isExpanded={!!expandedFloors[floor]}
              onToggleExpanded={() => toggleFloorExpanded(floor)}
              onFloorClick={() => handleFloorClick(floor)}
              onUnitSelect={onUnitSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const ExploreUnitsPanel: React.FC<ExploreUnitsPanelProps> = ({
  isOpen,
  onClose,
  onRequest,
  onExpandFloorplan
}) => {
  const { 
    showAvailableOnly, 
    setShowAvailableOnly, 
    getBuildingList, 
    isLoadingUnits,
    selectedUnitKey,
    getUnitData,
    setSelected,
    setHovered,
    setUnitDetailsOpen,
    setShow3DPopup
  } = useExploreState();
  
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState<Record<string, boolean>>({});
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Record<string, boolean>>({});
  const [hoveredUnit, setHoveredUnit] = useState<{
    unitName: string;
    unitData?: any;
    position: { x: number; y: number };
  } | null>(null);
  
  // Card navigation state
  const [currentView, setCurrentView] = useState<'explore' | 'details'>('explore');
  const [selectedUnitDetails, setSelectedUnitDetails] = useState<any>(null);

  // Resizing state with mobile-responsive defaults
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? Math.min(340, window.innerWidth - 16) : 320;
    }
    return 320;
  });
  const [panelHeight, setPanelHeight] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768 ? Math.min(700, window.innerHeight - 120) : 625;
    }
    return 625;
  });
  const [isResizing, setIsResizing] = useState<'width' | 'height' | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const resizeStartRef = useRef<{width: number, height: number, startX: number, startY: number} | null>(null);
  
  // Get selected unit data for popup
  const selectedUnit = selectedUnitKey ? getUnitData(selectedUnitKey) : null;
  // Performance: debug logging removed

  // Sync selectedUnitDetails with the actual selected unit from explore state
  useEffect(() => {
    console.log('🔄🍳 SYNC EFFECT - UNIT SELECTION:', { 
      selectedUnit, 
      currentView, 
      selectedUnitKey,
      hasUnit: !!selectedUnit 
    });
    
    if (selectedUnitKey && currentView === 'details') {
      // Always try to get fresh data when viewing details
      const freshData = getUnitData(selectedUnitKey);
      console.log('📊🍳 GETTING UNIT DATA FOR DETAILS:', {
        key: selectedUnitKey,
        data: freshData,
        has_kitchen_size: !!freshData?.kitchen_size,
        kitchen_size_value: freshData?.kitchen_size
      });
      
      if (freshData) {
        setSelectedUnitDetails(freshData);
      } else {
        console.warn('⚠️ No unit data found for key:', selectedUnitKey);
      }
    }
  }, [selectedUnit, currentView, selectedUnitKey, getUnitData]);
  
  // Load GLB file tree structure
  useEffect(() => {
    // Floor sorting function
    const sortFloors = (tree: TreeNode): TreeNode => {
      const sortedTree = { ...tree };
      
      if (sortedTree.children) {
        sortedTree.children = sortedTree.children.map((building) => {
          if (typeof building === 'string') return building;
          
          const sortedBuilding = { ...building };
          if (sortedBuilding.children) {
            // Sort floors within each building
            sortedBuilding.children = [...sortedBuilding.children].sort((a, b) => {
              if (typeof a === 'string' || typeof b === 'string') return 0;
              
              const aName = a.name.toLowerCase();
              const bName = b.name.toLowerCase();
              
              // Define floor order priority
              const getFloorPriority = (floorName: string) => {
                if (floorName.includes('ground') || floorName.includes('gound')) return 0;
                if (floorName.includes('first')) return 1;
                if (floorName.includes('second')) return 2;
                if (floorName.includes('third')) return 3;
                return 999;
              };
              
              const aPriority = getFloorPriority(aName);
              const bPriority = getFloorPriority(bName);
              
              console.log(`🏗️ SORTING FLOORS: "${a.name}" (priority ${aPriority}) vs "${b.name}" (priority ${bPriority})`);
              
              if (aPriority !== bPriority) {
                return aPriority - bPriority;
              }
              
              return a.name.localeCompare(b.name);
            });
          }
          
          return sortedBuilding;
        });
      }
      
      return sortedTree;
    };

    // Fetch the pre-generated index in public/
    fetch(import.meta.env.BASE_URL + 'models/boxes_index.json')
      .then((res) => res.json())
      .then((data: TreeNode) => {
        console.log('🌳 Original tree loaded, now sorting floors...');
        const sortedTree = sortFloors(data);
        console.log('🌳 Tree sorted, setting state...');
        setTree(sortedTree);
      })
      .catch((err) => {
        console.warn('Failed to load boxes_index.json', err);
        setTree(null);
      });
  }, []);

  // Handle window resize for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        const newWidth = Math.min(340, window.innerWidth - 16);
        const newHeight = Math.min(700, window.innerHeight - 120);
        setPanelWidth(newWidth);
        setPanelHeight(newHeight);
      } else {
        setPanelWidth(320);
        setPanelHeight(625);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Resize handlers
  const handleMouseDown = useCallback((direction: 'width' | 'height') => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(direction);
    resizeStartRef.current = {
      width: panelWidth,
      height: panelHeight,
      startX: e.clientX,
      startY: e.clientY
    };
  }, [panelWidth, panelHeight]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !panelRef.current || !resizeStartRef.current) return;

    const startData = resizeStartRef.current;
    
    if (isResizing === 'width') {
      // Right edge - calculate width based on mouse movement from start
      const deltaX = e.clientX - startData.startX;
      const newWidth = Math.max(200, Math.min(800, startData.width + deltaX));
      
      // Apply directly to DOM for smooth performance, no state updates
      panelRef.current.style.width = `${newWidth}px`;
    } else if (isResizing === 'height') {
      // Top edge - calculate height based on mouse movement from start  
      const deltaY = startData.startY - e.clientY; // Inverted for top edge
      const newHeight = Math.max(200, Math.min(window.innerHeight - 100, startData.height + deltaY));
      
      // Apply directly to DOM for smooth performance, no state updates
      panelRef.current.style.height = `${newHeight}px`;
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    if (!panelRef.current) return;
    
    // Update state with final dimensions
    const rect = panelRef.current.getBoundingClientRect();
    setPanelWidth(rect.width);
    setPanelHeight(rect.height);
    
    setIsResizing(null);
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);
  
  
  const buildings = getBuildingList();
  
  // Toggle tree path expansion
  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => ({ ...prev, [path]: !prev[path] }));
  };
  
  // Filter buildings based on search term
  const filteredBuildings = useMemo(() => {
    if (!searchTerm.trim()) return buildings;
    
    const lowerSearch = searchTerm.toLowerCase();
    return buildings.filter(building => 
      building.toLowerCase().includes(lowerSearch)
    );
  }, [buildings, searchTerm]);

  const toggleBuildingExpanded = (building: string) => {
    setExpandedBuildings(prev => ({ ...prev, [building]: !prev[building] }));
  };

  const handleBuildingClick = (building: string) => {
    const { selectBuilding } = useGLBState.getState();
    selectBuilding(building);
    console.log(`Selected building ${building} - GLBs updated`);
  };

  // Render tree nodes from GLB structure
  const renderGLBNode = (node: TreeNode | string, path: string, parentPath: string[] = []): React.ReactNode => {
    if (typeof node === 'string') {
      // This is a GLB file (unit)
      const displayName = node;
      const unitName = filenameToUnitName(displayName);
      const building = parentPath[0];
      const floor = parentPath[1];
      
      // Debug logging for Tower Building and Stages units
      if (building === "Tower Building") {
        console.log(`🗼 Tower unit debug - displayName:'${displayName}' unitName:'${unitName}' building:'${building}' floor:'${floor}' parentPath:`, parentPath);
      }
      if (building === "Stages") {
        console.log(`🎭 Stages unit debug - displayName:'${displayName}' unitName:'${unitName}' building:'${building}' floor:'${floor}' parentPath:`, parentPath);
      }
      
      // Try to find unit data - first try with the normalized name, then with building/floor context
      let unitData = getUnitData(unitName);
      let actualUnitKey = unitName; // Track the key that actually worked
      
      if (!unitData) {
        // Try alternative lookups if needed
        const alternateKeys = [
          `${building}-${floor}-${unitName}`,
          `${building}/${floor}/${unitName}`,
          displayName.replace(/\.glb$/i, '')
        ];
        for (const key of alternateKeys) {
          unitData = getUnitData(key);
          if (unitData) {
            actualUnitKey = key; // Remember which key worked
            console.log(`🔑 Found unit data with alternate key: ${key}`);
            break;
          }
        }
      }
      
      const isSelected = selectedUnitKey === actualUnitKey || selectedUnitKey === unitName;
      const isAvailable = unitData ? unitData.status === 'Available' : false;
      const isDimmed = showAvailableOnly && !isAvailable;

      // Hide unavailable units completely if showAvailableOnly is enabled
      if (showAvailableOnly && !isAvailable) {
        return null;
      }

      return (
        <div
          key={path}
          className={`px-2 py-1 cursor-pointer transition-all duration-150 rounded text-xs border relative ${isSelected 
              ? 'bg-blue-100 border-blue-300 text-blue-800' 
              : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-700'
            }
            ${isDimmed ? 'opacity-40 pointer-events-none' : ''}
          `}
          onMouseEnter={(e) => {
            if (!isDimmed) {
              const hoverData = {
                unitName: displayName.replace(/\.glb$/i, ''),
                unitData,
                position: { x: e.clientX, y: e.clientY }
              };
              console.log('🐭 Setting hovered unit:', hoverData);
              setHoveredUnit(hoverData);
              
              // Dispatch global hover event for App-level rendering
              window.dispatchEvent(new CustomEvent('unit-hover-update', { 
                detail: hoverData 
              }));
              
              // Trigger scene highlighting
              const { hoverUnit } = useGLBState.getState();
              const normalizedUnitName = displayName.replace(/\.glb$/i, '');
              
              // Pass the floor as-is - let hoverUnit handle the key construction logic
              hoverUnit(building, floor, normalizedUnitName);
            }
          }}
          onMouseMove={(e) => {
            if (!isDimmed && hoveredUnit) {
              setHoveredUnit({
                ...hoveredUnit,
                position: { x: e.clientX, y: e.clientY }
              });
            }
          }}
          onMouseLeave={() => {
            console.log('🐭 Clearing hovered unit');
            setHoveredUnit(null);
            
            // Dispatch clear hover event
            window.dispatchEvent(new CustomEvent('unit-hover-clear'));
            
            // Clear scene highlighting
            const { hoverUnit } = useGLBState.getState();
            hoverUnit(null, null, null);
          }}
          onClick={() => {
            if (!isDimmed) {
              console.log('🎯 Unit clicked:', displayName, 'with key:', actualUnitKey);
              // Set the selected unit using the correct key
              const normalizedUnitName = displayName.replace(/\.glb$/i, '');
              
              // Check if this unit is already selected - if so, still open details
              if (selectedUnitKey === actualUnitKey) {
                console.log('🔄 Unit already selected, but still opening details view');
                // Don't return - continue to open details view
              }
              
              setSelected(actualUnitKey);
              
              // Update GLB state for 3D visualization
              const { selectUnit } = useGLBState.getState();
              
              // Special cases for buildings with undefined/empty floors
              let effectiveFloor = floor;
              if (building === "Tower Building" && !floor) {
                effectiveFloor = "Main Floor";
              } else if (building === "Stages" && !floor) {
                effectiveFloor = ""; // Stages uses empty string for main stages
              }
              selectUnit(building, effectiveFloor, normalizedUnitName);
              
              console.log(`Selected unit ${building}/${floor}/${normalizedUnitName} from GLB tree - building:'${building}' floor:'${floor}' unit:'${normalizedUnitName}'`);
              
              // Slide to details view instead of showing 3D popup
              console.log('🔍 About to set selectedUnitDetails with unitData:', unitData);
              console.log('🔍 unitKey used for lookup:', unitName, 'normalizedUnitName:', normalizedUnitName);
              
              // Try to get fresh unit data using the normalized unit name
              const freshUnitData = getUnitData(normalizedUnitName);
              console.log('🔍 Fresh unit data lookup:', freshUnitData);
              
              const finalUnitData = unitData || freshUnitData;
              console.log('🔍 Final unit data to use:', finalUnitData);
              
              setSelectedUnitDetails(finalUnitData);
              setCurrentView('details');
              // Clear the hover state when showing details
              setHoveredUnit(null);
              const { hoverUnit } = useGLBState.getState();
              hoverUnit(null, null, null);
              console.log('🎯 Sliding to details view for unit:', normalizedUnitName);
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              {isAvailable ? (
                <Circle size={4} className="text-green-500 fill-current" />
              ) : (
                <Square size={4} className="text-red-500 fill-current" />
              )}
              <span className={`font-medium truncate ${isSelected ? 'text-blue-800' : ''}`}>
                {displayName.replace(/\.glb$/i, '')}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              {/* Square footage display removed per user request */}
            </div>
          </div>
        </div>
      );
    } else {
      // This is a folder node (building or floor)
      const nodePath = path;
      const expanded = !!expandedPaths[nodePath];
      const currentPath = [...parentPath, node.name];
      const isBuilding = parentPath.length === 0;
      const isFloor = parentPath.length === 1;
      
      if (isBuilding) {
        // Building card for vertical layout
        return (
          <div key={nodePath} className="w-full bg-white bg-opacity-90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm overflow-hidden">
            <div
              className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100"
              onClick={() => {
                const isCurrentlyExpanded = !!expandedPaths[nodePath];
                if (isCurrentlyExpanded) {
                  // Collapsing - clear all selections
                  const { clearSelection } = useGLBState.getState();
                  clearSelection();
                  console.log(`Collapsed building ${node.name} - cleared all selections`);
                } else {
                  // Expanding - select the building (but check if already selected)
                  const { selectedBuilding } = useGLBState.getState();
                  if (selectedBuilding === node.name) {
                    console.log('🔄 Building already selected, just expanding');
                  } else {
                    handleBuildingClick(node.name);
                  }
                }
                toggleExpand(nodePath);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building size={14} className="text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900 text-xs">{node.name}</div>
                    <div className="text-xs text-gray-500">
                      {node.children ? `${node.children.length} floors` : '0 floors'}
                    </div>
                  </div>
                </div>
                {expanded ? (
                  <ChevronDown size={14} className="text-gray-500 transition-transform duration-200" />
                ) : (
                  <ChevronRight size={14} className="text-gray-500 transition-transform duration-200" />
                )}
              </div>
            </div>
            
            {expanded && node.children && (
              <div className="bg-gray-50 max-h-64 overflow-y-auto">
                {node.children.map((child, idx) => 
                  renderGLBNode(
                    child, 
                    `${nodePath}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                    currentPath
                  )
                )}
              </div>
            )}
          </div>
        );
      } else {
        // Floor/unit rendering (simplified for horizontal cards)
        return (
          <div key={nodePath} className="border-b border-gray-100 last:border-b-0">
            <div
              className="px-3 py-2 cursor-pointer hover:bg-gray-100 transition-colors duration-150"
              onMouseEnter={() => {
                if (isFloor) {
                  const building = parentPath[0];
                  const { hoverFloor } = useGLBState.getState();
                  hoverFloor(building, node.name);
                }
              }}
              onMouseLeave={() => {
                if (isFloor) {
                  const { hoverFloor } = useGLBState.getState();
                  hoverFloor(null, null);
                }
              }}
              onClick={() => {
                if (isFloor) {
                  const building = parentPath[0];
                  const { selectedBuilding, selectedFloor, selectFloor } = useGLBState.getState();
                  
                  // Check if this floor is already selected - if so, just toggle expand
                  if (selectedBuilding === building && selectedFloor === node.name) {
                    console.log('🔄 Floor already selected, just toggling expansion');
                  } else {
                    selectFloor(building, node.name);
                    console.log(`Selected floor ${building}/${node.name} from GLB tree`);
                  }
                }
                toggleExpand(nodePath);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin size={10} className="text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">
                    {parentPath[0] === "Stages" && node.name === "Production" 
                      ? "Production" 
                      : node.name}
                  </span>
                </div>
                {expanded ? (
                  <ChevronDown size={10} className="text-gray-400 transition-transform duration-200" />
                ) : (
                  <ChevronRight size={10} className="text-gray-400 transition-transform duration-200" />
                )}
              </div>
            </div>
            
            {expanded && node.children && (
              <div className="bg-gray-100 px-2 py-1">
                <div className={`gap-1 text-xs ${
                  parentPath[0] === "Stages" && node.name === "Production" 
                    ? "flex flex-col" 
                    : "grid grid-cols-2"
                }`}>
                  {node.children.map((child, idx) => 
                    renderGLBNode(
                      child, 
                      `${nodePath}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                      currentPath
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div 
      ref={panelRef}
      className={`fixed left-2 sm:left-6 bg-white bg-opacity-95 backdrop-blur-sm shadow-xl border border-gray-200 z-50 flex flex-col transition-all duration-500 ease-in-out transform rounded-lg overflow-hidden ${
        isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
      }`}
      style={{
        width: `${panelWidth}px`,
        height: `${panelHeight}px`,
        bottom: window.innerWidth < 768 ? '80px' : '64px', // More space for mobile buttons
        maxHeight: window.innerWidth < 768 ? 'calc(100vh - 160px)' : 'calc(100vh - 120px)', // Better mobile fit
      }}
    >
      {/* Top resize handle */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-n-resize hover:bg-blue-500 hover:bg-opacity-30 transition-colors duration-150 z-10"
        onMouseDown={handleMouseDown('height')}
      />
      
      {/* Right resize handle */}
      <div
        className="absolute top-0 bottom-0 right-0 w-1 cursor-e-resize hover:bg-blue-500 hover:bg-opacity-30 transition-colors duration-150 z-10"
        onMouseDown={handleMouseDown('width')}
      />
      {/* Header */}
      <div className={`bg-white bg-opacity-90 backdrop-blur-sm border-b border-gray-200 px-6 py-3 transition-all duration-300 delay-75 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Explore Units</h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-5 h-5 bg-gray-100 hover:bg-gray-200 
                       rounded-md transition-colors duration-150"
            title="Close Panel"
          >
            <X size={12} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Sliding Content Container */}
      <div className="flex-1 relative overflow-hidden">
        <div 
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(${currentView === 'details' ? '-100%' : '0%'})` }}
        >
          {/* Explore Units Panel - Left side */}
          <div className="w-full flex-shrink-0 overflow-y-auto">
            <div className={`h-full transition-opacity duration-300 ${
              isOpen ? 'opacity-100' : 'opacity-0'
            }`}>
          {!tree ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
                <div className="text-sm">Loading GLB files...</div>
              </div>
            </div>
          ) : (
              <div className="flex flex-col gap-3 p-4 overflow-y-auto">
                {tree.children && tree.children.map((child, idx) => 
                  renderGLBNode(
                    child, 
                    `${tree.name}/${typeof child === 'string' ? child : child.name}-${idx}`, 
                    []
                  )
                )}
              </div>
            )}
          </div>
        </div>

        {/* Details Panel - Right side */}
        <div className="w-full flex-shrink-0 overflow-y-auto">
          <div className="h-full bg-white">
            {/* Details Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setCurrentView('explore')}
                    className="flex items-center justify-center w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-150"
                    title="Back to Explore"
                  >
                    <ArrowLeft size={14} className="text-gray-600" />
                  </button>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedUnitDetails?.unit_name || 'Unit Details'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {selectedUnitDetails?.building} • {selectedUnitDetails?.floor}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Details Content */}
            <div className="p-6 space-y-6">
              {/* Unit Info Card */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Unit Number</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedUnitDetails?.unit_name || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {selectedUnitDetails?.status === 'Available' ? (
                        <Circle size={8} className="text-green-500 fill-current" />
                      ) : (
                        <Square size={8} className="text-red-500 fill-current" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedUnitDetails?.status === 'Available' 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {selectedUnitDetails?.status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Area</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedUnitDetails?.area_sqft 
                        ? `${selectedUnitDetails.area_sqft.toLocaleString()} sq ft`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedUnitDetails?.unit_type || 'Suite'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Kitchen</p>
                    <p className="text-lg font-semibold text-gray-900">
{(() => {
                        const kitchenSize = selectedUnitDetails?.kitchen_size;
                        console.log('🍳🔍 KITCHEN DEBUG FOR UNIT:', selectedUnitDetails?.unit_name);
                        console.log('🍳 Kitchen Size Value:', kitchenSize);
                        console.log('🍳 Raw kitchen_size field:', selectedUnitDetails?.kitchen_size);
                        console.log('🍳 All unit data keys:', Object.keys(selectedUnitDetails || {}));
                        console.log('🍳 Full unit data object:', selectedUnitDetails);
                        
                        if (!kitchenSize || kitchenSize === 'None' || kitchenSize === 'N/A') {
                          return 'No Kitchen';
                        } else if (kitchenSize === 'Full') {
                          return 'Full Kitchen';
                        } else if (kitchenSize === 'Compact') {
                          return 'Compact Kitchen';
                        } else if (kitchenSize === 'Kitchenette') {
                          return 'Kitchenette';
                        } else {
                          return `Kitchen: ${kitchenSize}`;
                        }
                      })()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floorplan Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Floorplan</h3>
                </div>
                
                {/* Floorplan Viewer */}
                <FloorplanViewer
                  floorplanUrl={selectedUnitDetails?.floorplan_url || selectedUnitDetails?.floorPlanUrl || null}
                  unitName={selectedUnitDetails?.unit_name || 'Unit'}
                  onExpand={onExpandFloorplan}
                  unitData={selectedUnitDetails}
                />
                
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {selectedUnitDetails?.status === 'Available' && (
                  <button
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center space-x-2"
                    onClick={() => {
                      console.log('🔥 Request button clicked!', selectedUnitDetails);
                      
                      if (onRequest) {
                        if (selectedUnitDetails) {
                          // Use the actual unit data
                          console.log('🚀 Using selectedUnitDetails:', selectedUnitDetails.unit_key, selectedUnitDetails.unit_name);
                          onRequest(selectedUnitDetails.unit_key || selectedUnitDetails.unit_name, selectedUnitDetails.unit_name);
                        } else {
                          // Try to get unit data from the selected unit key in the global state
                          const { selectedUnitKey } = useExploreState.getState();
                          console.log('🔍 No selectedUnitDetails, using selectedUnitKey:', selectedUnitKey);
                          
                          // Try to get unit data for the selected key
                          const unitData = getUnitData(selectedUnitKey || '');
                          console.log('🔍 Retrieved unit data:', unitData);
                          
                          if (unitData) {
                            onRequest(unitData.unit_key, unitData.unit_name);
                          } else {
                            // Last fallback - use the selected unit key directly
                            const displayName = selectedUnitKey || 'Selected Unit';
                            console.log('🔧 Using fallback name:', displayName);
                            onRequest(selectedUnitKey || 'unknown', displayName);
                          }
                        }
                        console.log('✅ onRequest call completed');
                      } else {
                        console.error('❌ onRequest function is missing!');
                      }
                    }}
                  >
                    <MessageCircle size={16} />
                    <span>Request This Unit</span>
                  </button>
                )}
                
                <button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-150 flex items-center justify-center space-x-2"
                  onClick={() => {
                    const shareUrl = `${window.location.origin}${window.location.pathname}?sel=${selectedUnitDetails?.unit_key}`;
                    const shareData = {
                      title: `Unit ${selectedUnitDetails?.unit_name} - ${selectedUnitDetails?.building}`,
                      text: `Check out this unit: ${selectedUnitDetails?.unit_name} in ${selectedUnitDetails?.building}`,
                      url: shareUrl
                    };

                    // Check if Web Share API is supported
                    if (navigator.share) {
                      navigator.share(shareData)
                        .then(() => console.log('Content shared successfully!'))
                        .catch((error) => console.error('Error sharing content:', error));
                    } else {
                      // Fallback for browsers that don't support Web Share API
                      navigator.clipboard.writeText(shareUrl)
                        .then(() => {
                          console.log('Link copied to clipboard');
                          // Show temporary feedback
                          const button = event.target.closest('button');
                          const originalText = button.innerHTML;
                          button.innerHTML = '<span class="text-sm">Link Copied!</span>';
                          setTimeout(() => {
                            button.innerHTML = originalText;
                          }, 2000);
                        })
                        .catch(() => {
                          console.error('Failed to copy link');
                        });
                    }
                  }}
                >
                  <Share size={16} />
                  <span>Share Unit</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>



      {/* Hover Preview moved to App.tsx for global positioning */}
    </div>
  );
};
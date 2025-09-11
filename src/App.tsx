import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { MessageCircle, CheckCircle, Building, RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { UnitWarehouse } from './components/UnitWarehouse';
import UnitDetailPopup from './components/UnitDetailPopup';
import { ExploreUnitsPanel } from './ui/ExploreUnitsPanel';
import { GLBManager } from './components/GLBManager';
import { UnitDetailsPopup } from './components/UnitDetailsPopup';
import { SelectedUnitOverlay } from './components/SelectedUnitOverlay';
import { CanvasClickHandler } from './components/CanvasClickHandler';
import UnitRequestForm from './components/UnitRequestForm';
import { Unit3DPopup } from './components/Unit3DPopup';
import { Unit3DPopupOverlay } from './components/Unit3DPopupOverlay';
import { SingleUnitRequestForm } from './components/SingleUnitRequestForm';
import { FloorplanPopup } from './components/FloorplanPopup';
import { NavigationControls } from './components/NavigationControls';
import { FilterDropdown } from './components/FilterDropdown';
import { HoverToast } from './ui/HoverToast';
import { UnitHoverPreview } from './components/UnitHoverPreview';
import { useUnitStore } from './stores/useUnitStore';
import { useExploreState, buildUnitsIndex, type UnitRecord } from './store/exploreState';
import { useCsvUnitData } from './hooks/useCsvUnitData';
import { emitEvent, getTimestamp } from './lib/events';
import * as THREE from 'three';

// Local CSV URL - for testing before uploading to Google Sheets
const CSV_URL = import.meta.env.BASE_URL + 'unit-data.csv';

// Simple Error Boundary for HDRI loading
class HDRIErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.log('HDRI loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback to simple gradient background
      return <color attach="background" args={['#87CEEB']} />;
    }

    return this.props.children;
  }
}

// Comprehensive unit data based on actual GLB files in boxes folder
export const FALLBACK_UNIT_DATA = {
  // F-Series (Floor Units)  
  'f-10': { name: 'f-10', size: '1,200 sq ft', availability: 'Available', amenities: 'Ground floor unit with loading dock access', glb: 'boxes/First Street Building/Gound Floor/F-10.glb' },
  'f-15': { name: 'f-15', size: '1,500 sq ft', availability: 'Available', amenities: 'Large ground floor space', glb: 'boxes/First Street Building/Gound Floor/F-15.glb' },
  'f-20': { name: 'f-20', size: '1,800 sq ft', availability: 'Occupied', amenities: 'Premium floor unit', glb: 'boxes/First Street Building/Gound Floor/F-20.glb' },
  'f-25': { name: 'f-25', size: '1,400 sq ft', availability: 'Available', amenities: 'Standard floor unit', glb: 'boxes/First Street Building/Gound Floor/F-25.glb' },
  'f-30': { name: 'f-30', size: '2,000 sq ft', availability: 'Available', amenities: 'Large floor unit', glb: 'boxes/First Street Building/Gound Floor/F-30.glb' },
  'f-35': { name: 'f-35', size: '1,600 sq ft', availability: 'Occupied', amenities: 'Corner floor unit', glb: 'boxes/First Street Building/Gound Floor/F-35.glb' },
  'f-40': { name: 'f-40', size: '1,300 sq ft', availability: 'Available', amenities: 'Standard floor space', glb: 'boxes/First Street Building/Gound Floor/F-40.glb' },
  'f-50': { name: 'f-50', size: '1,700 sq ft', availability: 'Available', amenities: 'Large floor space', glb: 'boxes/First Street Building/Gound Floor/F-50.glb' },
  'f-60': { name: 'f-60', size: '1,400 sq ft', availability: 'Occupied', amenities: 'Mid-size floor unit', glb: 'boxes/First Street Building/Gound Floor/F-60.glb' },
  'f-70': { name: 'f-70', size: '1,900 sq ft', availability: 'Available', amenities: 'Premium floor space', glb: 'boxes/First Street Building/Gound Floor/F-70.glb' },
  'f-100': { name: 'f-100', size: '2,200 sq ft', availability: 'Available', amenities: 'Large floor unit with high ceilings', glb: 'boxes/First Street Building/First Floor/F-100.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f100.jpg' },
  'f-105': { name: 'f-105', size: '1,800 sq ft', availability: 'Available', amenities: 'Floor unit with office space', glb: 'boxes/First Street Building/First Floor/F-105.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f105.jpg' },
  'f-110 cr': { name: 'f-110 cr', size: '1,500 sq ft', availability: 'Occupied', amenities: 'Conference room unit', glb: 'boxes/First Street Building/First Floor/F-110 CR.glb' },
  'f-115': { name: 'f-115', size: '1,600 sq ft', availability: 'Available', amenities: 'Standard floor unit', glb: 'boxes/First Street Building/First Floor/F-115.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f115.jpg' },
  'f-140': { name: 'f-140', size: '2,400 sq ft', availability: 'Available', amenities: 'Extra large floor space', glb: 'boxes/First Street Building/First Floor/F-140.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f140.jpg' },
  'f-150': { name: 'f-150', size: '2,000 sq ft', availability: 'Occupied', amenities: 'Premium floor unit', glb: 'boxes/First Street Building/First Floor/F-150.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f150.jpg' },
  'f-160': { name: 'f-160', size: '1,700 sq ft', availability: 'Available', amenities: 'Large floor space', glb: 'boxes/First Street Building/First Floor/F-160.glb' },
  'f-170': { name: 'f-170', size: '1,900 sq ft', availability: 'Available', amenities: 'Floor unit with loading access', glb: 'boxes/First Street Building/First Floor/F-170.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f170.jpg' },
  'f-175': { name: 'f-175', size: '1,600 sq ft', availability: 'Available', amenities: 'Mid-size floor unit', glb: 'boxes/First Street Building/First Floor/F-175.glb' },
  'f-180': { name: 'f-180', size: '2,100 sq ft', availability: 'Occupied', amenities: 'Large premium floor space', glb: 'boxes/First Street Building/First Floor/F-180 .glb' },
  'f-185': { name: 'f-185', size: '1,800 sq ft', availability: 'Available', amenities: 'Floor unit with office' },
  'f-187': { name: 'f-187', size: '1,500 sq ft', availability: 'Available', amenities: 'Compact floor unit' },
  'f-190': { name: 'f-190', size: '2,000 sq ft', availability: 'Available', amenities: 'Large floor space' },
  'f-200': { name: 'f-200', size: '2,300 sq ft', availability: 'Occupied', amenities: 'Premium large floor unit' },
  'f-240': { name: 'f-240', size: '2,600 sq ft', availability: 'Available', amenities: 'Extra large floor space' },
  'f-250': { name: 'f-250', size: '2,400 sq ft', availability: 'Available', amenities: 'Large floor unit' },
  'f-280': { name: 'f-280', size: '2,800 sq ft', availability: 'Available', amenities: 'Extra large premium floor space', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f280.jpg' },
  'f-290': { name: 'f-290', size: '2,500 sq ft', availability: 'Occupied', amenities: 'Large floor unit' },
  'f-300': { name: 'f-300', size: '3,000 sq ft', availability: 'Available', amenities: 'Extra large floor space' },
  'f-330': { name: 'f-330', size: '3,200 sq ft', availability: 'Available', amenities: 'Premium extra large unit' },
  'f-340': { name: 'f-340', size: '3,400 sq ft', availability: 'Available', amenities: 'Maximum floor space' },
  'f-350': { name: 'f-350', size: '3,500 sq ft', availability: 'Occupied', amenities: 'Premium maximum floor unit' },
  'f-360': { name: 'f-360', size: '3,600 sq ft', availability: 'Available', amenities: 'Largest floor space available' },
  'f-363': { name: 'f-363', size: '3,630 sq ft', availability: 'Available', amenities: 'Custom large floor unit' },
  'f-365': { name: 'f-365', size: '3,650 sq ft', availability: 'Available', amenities: 'Premium large space' },
  'f-380': { name: 'f-380', size: '3,800 sq ft', availability: 'Occupied', amenities: 'Maximum premium floor space' },

  // M-Series (Mezzanine Units)
  'm-20': { name: 'm-20', size: '800 sq ft', availability: 'Available', amenities: 'Elevated mezzanine space' },
  'm-40': { name: 'm-40', size: '1,200 sq ft', availability: 'Available', amenities: 'Large mezzanine unit' },
  'm-45': { name: 'm-45', size: '1,000 sq ft', availability: 'Occupied', amenities: 'Mid-size mezzanine' },
  'm-50': { name: 'm-50', size: '1,400 sq ft', availability: 'Available', amenities: 'Large mezzanine space' },
  'm-120': { name: 'm-120', size: '1,600 sq ft', availability: 'Available', amenities: 'Premium mezzanine unit', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m120.jpg' },
  'm-130': { name: 'm-130', size: '1,800 sq ft', availability: 'Occupied', amenities: 'Large mezzanine space' },
  'm-140': { name: 'm-140', size: '1,700 sq ft', availability: 'Available', amenities: 'Mezzanine with office space', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m140.jpg' },
  'm-145': { name: 'm-145', size: '1,500 sq ft', availability: 'Available', amenities: 'Mid-size mezzanine' },
  'm-150': { name: 'm-150', size: '2,000 sq ft', availability: 'Available', amenities: 'Large mezzanine unit', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m150.jpg' },
  'm-160': { name: 'm-160', size: '1,900 sq ft', availability: 'Occupied', amenities: 'Premium mezzanine space' },
  'm-170': { name: 'm-170', size: '2,100 sq ft', availability: 'Available', amenities: 'Large elevated space' },
  'm-180': { name: 'm-180', size: '2,200 sq ft', availability: 'Available', amenities: 'Extra large mezzanine' },
  'm-210': { name: 'm-210', size: '2,400 sq ft', availability: 'Available', amenities: 'Premium large mezzanine' },
  'm-220': { name: 'm-220', size: '2,300 sq ft', availability: 'Occupied', amenities: 'Large mezzanine unit' },
  'm-230': { name: 'm-230', size: '2,500 sq ft', availability: 'Available', amenities: 'Extra large mezzanine space' },
  'm-240': { name: 'm-240', size: '2,600 sq ft', availability: 'Available', amenities: 'Maximum mezzanine unit' },
  'm-250': { name: 'm-250', size: '2,700 sq ft', availability: 'Available', amenities: 'Premium large mezzanine' },
  'm-260': { name: 'm-260', size: '2,800 sq ft', availability: 'Occupied', amenities: 'Extra large elevated space' },
  'm-270': { name: 'm-270', size: '2,900 sq ft', availability: 'Available', amenities: 'Maximum mezzanine space' },
  'm-300': { name: 'm-300', size: '3,200 sq ft', availability: 'Available', amenities: 'Premium maximum mezzanine' },
  'm-320': { name: 'm-320', size: '3,400 sq ft', availability: 'Available', amenities: 'Largest mezzanine available' },
  'm-340': { name: 'm-340', size: '3,600 sq ft', availability: 'Occupied', amenities: 'Premium maximum mezzanine unit' },
  'm-345': { name: 'm-345', size: '3,650 sq ft', availability: 'Available', amenities: 'Custom large mezzanine' },
  'm-350': { name: 'm-350', size: '3,800 sq ft', availability: 'Available', amenities: 'Maximum premium mezzanine space' },

  // T-Series (Tower Units) - Updated to match GLB file naming
  'T-100': { name: 'T-100', size: '1,000 sq ft', availability: 'Available', amenities: 'Tower level with city views' },
  'T-110': { name: 'T-110', size: '1,200 sq ft', availability: 'Available', amenities: 'Mid-level tower unit' },
  'T-200': { name: 'T-200', size: '1,800 sq ft', availability: 'Occupied', amenities: 'Large tower space' },
  'T-210': { name: 'T-210', size: '1,600 sq ft', availability: 'Available', amenities: 'Tower unit with windows' },
  'T-220': { name: 'T-220', size: '1,700 sq ft', availability: 'Available', amenities: 'Premium tower space' },
  'T-230': { name: 'T-230', size: '1,900 sq ft', availability: 'Available', amenities: 'Large tower unit' },
  'T-300': { name: 'T-300', size: '2,200 sq ft', availability: 'Occupied', amenities: 'Premium tower space' },
  'T-320': { name: 'T-320', size: '2,400 sq ft', availability: 'Available', amenities: 'Large tower unit' },
  'T-400 ': { name: 'T-400 ', size: '2,800 sq ft', availability: 'Available', amenities: 'Extra large tower space' },
  'T-410 ': { name: 'T-410 ', size: '2,600 sq ft', availability: 'Available', amenities: 'Large tower unit' },
  'T-420 ': { name: 'T-420 ', size: '2,700 sq ft', availability: 'Occupied', amenities: 'Premium tower space' },
  'T-430 ': { name: 'T-430 ', size: '2,900 sq ft', availability: 'Available', amenities: 'Extra large tower unit' },
  'T-450 ': { name: 'T-450 ', size: '3,000 sq ft', availability: 'Available', amenities: 'Maximum tower space' },
  'T-500': { name: 'T-500', size: '3,200 sq ft', availability: 'Available', amenities: 'Premium large tower unit' },
  'T-530': { name: 'T-530', size: '3,400 sq ft', availability: 'Occupied', amenities: 'Extra large tower space' },
  'T-550': { name: 'T-550', size: '3,600 sq ft', availability: 'Available', amenities: 'Maximum tower unit' },
  'T-600': { name: 'T-600', size: '3,800 sq ft', availability: 'Available', amenities: 'Premium maximum tower space' },
  'T-700 ': { name: 'T-700 ', size: '4,200 sq ft', availability: 'Available', amenities: 'Largest tower unit available' },
  'T-800 ': { name: 'T-800 ', size: '4,600 sq ft', availability: 'Occupied', amenities: 'Premium maximum tower space' },
  'T-900 ': { name: 'T-900 ', size: '5,000 sq ft', availability: 'Available', amenities: 'Premium maximum tower space' },
  'T- 950': { name: 'T- 950', size: '5,200 sq ft', availability: 'Available', amenities: 'Largest tower unit' },
  'T-1000 ': { name: 'T-1000 ', size: '5,500 sq ft', availability: 'Available', amenities: 'Premium maximum tower space' },
  'T-1100 ': { name: 'T-1100 ', size: '6,000 sq ft', availability: 'Available', amenities: 'Largest premium tower unit' },
  'T-1200 ': { name: 'T-1200 ', size: '6,500 sq ft', availability: 'Available', amenities: 'Maximum tower space available' },
  'T-G10 ': { name: 'T-G10 ', size: '800 sq ft', availability: 'Available', amenities: 'Ground level tower unit' },
  'T-G20 ': { name: 'T-G20 ', size: '900 sq ft', availability: 'Available', amenities: 'Ground level tower unit' },

  // Production Stages
  'stage a': { name: 'stage a', size: '8,000 sq ft', availability: 'Available', amenities: 'Full production stage with lighting grid' },
  'stage b': { name: 'stage b', size: '7,500 sq ft', availability: 'Occupied', amenities: 'Large production stage' },
  'stage c': { name: 'stage c', size: '8,500 sq ft', availability: 'Available', amenities: 'Premium production stage' },
  'stage d': { name: 'stage d', size: '7,200 sq ft', availability: 'Available', amenities: 'Standard production stage' },
  'stage e': { name: 'stage e', size: '9,000 sq ft', availability: 'Available', amenities: 'Large premium production stage' },
  'stage f': { name: 'stage f', size: '8,200 sq ft', availability: 'Occupied', amenities: 'Full service production stage' },
  'stage 7': { name: 'stage 7', size: '7,800 sq ft', availability: 'Available', amenities: 'Professional production stage' },
  'stage 8': { name: 'stage 8', size: '8,400 sq ft', availability: 'Available', amenities: 'Large production facility' },
  'mg - stage 7': { name: 'mg - stage 7', size: '6,500 sq ft', availability: 'Available', amenities: 'Mezzanine stage area' },
  'studio o.m.': { name: 'studio o.m.', size: '5,000 sq ft', availability: 'Occupied', amenities: 'Private studio space' },
  'mill 2': { name: 'mill 2', size: '4,500 sq ft', availability: 'Available', amenities: 'Mill building workspace' },
  'mill 3': { name: 'mill 3', size: '4,800 sq ft', availability: 'Available', amenities: 'Large mill workspace' },
  'mill 3 office': { name: 'mill 3 office', size: '1,200 sq ft', availability: 'Available', amenities: 'Office space in mill building' },
  'mill 4': { name: 'mill 4', size: '5,200 sq ft', availability: 'Occupied', amenities: 'Premium mill workspace' },
  'production support - a': { name: 'production support - a', size: '2,000 sq ft', availability: 'Available', amenities: 'Production support facilities' },
  'production support - b': { name: 'production support - b', size: '2,200 sq ft', availability: 'Available', amenities: 'Large production support area' },
  'production support c': { name: 'production support c', size: '2,400 sq ft', availability: 'Available', amenities: 'Premium production support' },
  'production support - d': { name: 'production support - d', size: '2,600 sq ft', availability: 'Occupied', amenities: 'Large production support facility' },

  // Commercial Spaces
  'club 76 fifth street': { name: 'club 76 fifth street', size: '3,500 sq ft', availability: 'Available', amenities: 'Restaurant and entertainment venue' },
  'flix cafe': { name: 'flix cafe', size: '1,800 sq ft', availability: 'Available', amenities: 'Cafe and dining space' },
  'et lab': { name: 'et lab', size: '2,200 sq ft', availability: 'Occupied', amenities: 'Technology laboratory space' },
  'event area 1': { name: 'event area 1', size: '4,000 sq ft', availability: 'Available', amenities: 'Large event and conference space' },
  'kiosk': { name: 'kiosk', size: '200 sq ft', availability: 'Available', amenities: 'Small retail kiosk space' },
  'fg - library': { name: 'fg - library', size: '3,200 sq ft', availability: 'Available', amenities: 'Library and research facility' },
  'theater': { name: 'theater', size: '5,500 sq ft', availability: 'Occupied', amenities: 'Full theater and screening facility' },

  // Facilities & Services
  'f1 restrooms': { name: 'f1 restrooms', size: '400 sq ft', availability: 'Available', amenities: 'Floor 1 restroom facilities' },
  'f2 restrooms': { name: 'f2 restrooms', size: '450 sq ft', availability: 'Available', amenities: 'Floor 2 restroom facilities' },
  'f3 restrooms': { name: 'f3 restrooms', size: '420 sq ft', availability: 'Available', amenities: 'Floor 3 restroom facilities' },
  'fg - restroom': { name: 'fg - restroom', size: '380 sq ft', availability: 'Available', amenities: 'Ground floor restroom facilities' },
  'm1 restrooms': { name: 'm1 restrooms', size: '400 sq ft', availability: 'Available', amenities: 'Mezzanine 1 restroom facilities' },
  'm1 resstroom 2': { name: 'm1 resstroom 2', size: '420 sq ft', availability: 'Available', amenities: 'Additional mezzanine 1 restrooms' },
  'm2 restroom': { name: 'm2 restroom', size: '450 sq ft', availability: 'Available', amenities: 'Mezzanine 2 restroom facilities' },
  'm3 restroom': { name: 'm3 restroom', size: '430 sq ft', availability: 'Available', amenities: 'Mezzanine 3 restroom facilities' },
  'surface parking': { name: 'surface parking', size: '15,000 sq ft', availability: 'Available', amenities: 'Outdoor parking area' },
  'surface parking 2': { name: 'surface parking 2', size: '12,000 sq ft', availability: 'Available', amenities: 'Additional outdoor parking' },
  'park': { name: 'park', size: '8,000 sq ft', availability: 'Available', amenities: 'Green space and recreational area' },
  'lobby - 2': { name: 'lobby - 2', size: '1,200 sq ft', availability: 'Available', amenities: 'Building lobby and reception area' },
};

// Camera controller with simple zoom limits
const CameraController: React.FC<{
  selectedUnit: string | null;
  controlsRef: React.RefObject<any>;
}> = ({ controlsRef }) => {
  const { camera } = useThree();
  
  // Better initial camera settings - flipped 180 degrees and closer
  const defaultTarget = new THREE.Vector3(0, 0, 0);
  
  // Mobile gets more zoomed out settings
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const maxDistance = 25; // Back to original max distance

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={8}  // Increased zoom cutoff instead of collision detection
      maxDistance={25} // Back to original max distance
      target={defaultTarget}
      dampingFactor={0.25} // Increased damping for smoother, less sensitive movement (was 0.15)
      enableDamping={true}
      minPolarAngle={0} // Allow looking straight down
      maxPolarAngle={Math.PI * 0.48} // Prevent camera from going under ground (slightly less than PI/2)
      
      // Mobile-specific touch controls
      touches={{
        ONE: THREE.TOUCH.ROTATE,     // Single finger rotates
        TWO: THREE.TOUCH.DOLLY_PAN   // Two fingers zoom and pan
      }}
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.PAN
      }}
      
      // Better mobile sensitivity
      rotateSpeed={window.innerWidth < 768 ? 0.5 : 0.3}
      zoomSpeed={window.innerWidth < 768 ? 0.5 : 0.3}
      panSpeed={window.innerWidth < 768 ? 0.4 : 0.25}
    />
  );
};

// Details sidebar component with fixed positioning in lower right
const DetailsSidebar: React.FC<{
  selectedUnit: string | null;
  unitData: any;
  onDetailsClick: () => void;
  onClose: () => void;
}> = ({ selectedUnit, unitData, onDetailsClick, onClose }) => {
  if (!selectedUnit) return null;

  const data = unitData[selectedUnit];
  const isAvailable = data?.availability?.toLowerCase().includes('available') || data?.availability?.toLowerCase() === 'true';

  return (
    <div className="fixed bottom-6 right-6 bg-white rounded-lg shadow-lg p-4 w-64 border-2 border-slate-600 z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Unit {selectedUnit.toUpperCase()}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ×
        </button>
      </div>
      
      <div className={`mb-3 p-2 rounded flex items-center ${
        isAvailable ? 'bg-sage-50 text-sage-800' : 'bg-red-50 text-red-800'
      }`}>
        <div className={`w-3 h-3 rounded-full mr-2 ${
          isAvailable ? 'bg-sage-500' : 'bg-red-700'
        }`}></div>
        {isAvailable ? 'Available' : 'Occupied'}
      </div>
      
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-1">Size</p>
        <p className="font-medium">{data?.size || 'N/A'}</p>
      </div>
      
      <button
        onClick={onDetailsClick}
        className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-2 px-4 rounded transition-colors"
      >
        View Details
      </button>
    </div>
  );
};

function App() {
  const { selectedUnit, hoveredUnit, setSelectedUnit, setHoveredUnit } = useUnitStore();
  const { drawerOpen, setDrawerOpen, selectedUnitKey, getUnitData, unitDetailsOpen, setUnitDetailsOpen, show3DPopup, setShow3DPopup, hoveredUnitKey } = useExploreState();
  
  // Global hover preview state
  const [globalHoverPreview, setGlobalHoverPreview] = useState<{
    unitName: string;
    unitData: any;
    position: { x: number; y: number };
  } | null>(null);
  
  // Listen for hover preview updates from ExploreUnitsPanel
  useEffect(() => {
    const handleHoverUpdate = (event: CustomEvent) => {
      console.log('🌍 App received unit-hover-update event:', event.detail);
      setGlobalHoverPreview(event.detail);
    };
    
    const handleHoverClear = () => {
      console.log('🌍 App clearing global hover preview');
      setGlobalHoverPreview(null);
    };
    
    window.addEventListener('unit-hover-update' as any, handleHoverUpdate);
    window.addEventListener('unit-hover-clear' as any, handleHoverClear);
    return () => {
      window.removeEventListener('unit-hover-update' as any, handleHoverUpdate);
      window.removeEventListener('unit-hover-clear' as any, handleHoverClear);
    };
  }, []);
  
  // Debug logging for state changes
  useEffect(() => {
    console.log('📱 App: show3DPopup changed to:', show3DPopup);
  }, [show3DPopup]);
  
  useEffect(() => {
    console.log('📱 App: selectedUnitKey changed to:', selectedUnitKey);
  }, [selectedUnitKey]);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [filterHoveredUnit, setFilterHoveredUnit] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isTopFilterDropdownOpen, setIsTopFilterDropdownOpen] = useState(false);
  const [sphereData, setSphereData] = useState<{center: THREE.Vector3, radius: number} | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [popup3DPosition, setPopup3DPosition] = useState<{x: number, y: number} | undefined>();
  const [showSingleUnitRequest, setShowSingleUnitRequest] = useState(false);
  const [requestUnitKey, setRequestUnitKey] = useState<string>('');
  const [requestUnitName, setRequestUnitName] = useState<string>('');
  const [showFloorplanPopup, setShowFloorplanPopup] = useState(false);
  const [floorplanPopupData, setFloorplanPopupData] = useState<{
    floorplanUrl: string;
    unitName: string;
    unitData?: any;
  } | null>(null);
  
  // Camera controls ref for navigation
  const orbitControlsRef = useRef<any>(null);
  
  // Use new CSV-based data fetching
  const { data: csvUnitData, loading: isUnitDataLoading, error } = useCsvUnitData(CSV_URL);
  
  // Initialize viewer and emit ready event when models are loaded
  useEffect(() => {
    if (!modelsLoading) {
      emitEvent('evt.viewer.ready', {
        ts: getTimestamp(),
        assets: {
          env: 'warehouse',
          overlays: 'units'
        }
      });
    }
  }, [modelsLoading]);

  // Debug logging for loading states
  useEffect(() => {
    console.log('🔍 Loading states:', { modelsLoading, loadingProgress, isUnitDataLoading });
  }, [modelsLoading, loadingProgress, isUnitDataLoading]);
  
  // Fallback: hide loading screen after 15 seconds if models never report completion
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.log('⏰ Fallback timer: Hiding loading screen after 15s');
      setModelsLoading(false);
    }, 15000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Use CSV data if available, otherwise fallback data
  const hasValidUnitData = csvUnitData && Object.keys(csvUnitData).length > 0;
  const effectiveUnitData = useMemo(() => {
    // Performance: removed debug logging
    return hasValidUnitData ? csvUnitData : {};
  }, [hasValidUnitData, csvUnitData]);

  // Read URL parameters on initial load to set selected unit
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const unitParam = urlParams.get('unit') || urlParams.get('sel');
    
    if (unitParam) {
      const unitKey = unitParam.toLowerCase();
      if (unitKey in effectiveUnitData) {
        setSelectedUnit(unitKey);
        console.log(`Initial unit selected from URL: ${unitParam}`);
      }
    }
  }, [effectiveUnitData]);

  // Log unit data for debugging
  useEffect(() => {
    // Performance: debug logging removed
    
    if (error) {
      console.log("CSV loading error:", error);
    }
  }, [csvUnitData, hasValidUnitData, effectiveUnitData, error]);

  // Get explore state actions
  const { setUnitsData, setUnitsIndex } = useExploreState();

  // Integrate CSV data into explore state
  useEffect(() => {
    if (hasValidUnitData && csvUnitData) {
      console.log("🔄 Integrating CSV data into explore state...");
      
      // Convert CSV data to UnitRecord format for explore state
      const unitsMap = new Map<string, UnitRecord>();
      
      Object.entries(csvUnitData).forEach(([unitKey, unitData]) => {
        // Skip duplicate entries (we store multiple keys for same unit)
        const primaryKey = unitData.unit_key || unitKey;
        if (unitsMap.has(primaryKey)) {
          return; // Skip duplicate
        }
        
        
        const unitRecord: UnitRecord = {
          unit_key: primaryKey,
          building: unitData.building || 'Unknown',
          floor: unitData.floor?.toString() || '',
          unit_name: unitData.unit_name || unitData.name,
          status: unitData.status === 'Available' ? 'Available' : 'Unavailable',
          area_sqft: unitData.area_sqft || undefined,
          floorplan_url: unitData.floorPlanUrl || unitData.floorplan_url,
          recipients: ['owner@lacenter.com'], // Default recipient
          notes: unitData.amenities,
          kitchen_size: unitData.kitchen_size || 'None'
        };
        
        // Store with the primary key
        unitsMap.set(primaryKey, unitRecord);
        
        // Also store with GLB variations for easier lookup
        unitsMap.set(`${primaryKey}.glb`, unitRecord);
        unitsMap.set(unitData.name, unitRecord);
        unitsMap.set(`${unitData.name}.glb`, unitRecord);
      });

      console.log("🏗️ Built units map:", unitsMap);
      
      // Build hierarchical index
      const unitsIndex = buildUnitsIndex(unitsMap);
      console.log("🏢 Built units index:", unitsIndex);
      
      // Update explore state
      setUnitsData(unitsMap);
      setUnitsIndex(unitsIndex);
      
      console.log("✅ CSV data integrated into explore state");
    }
  }, [hasValidUnitData, csvUnitData, setUnitsData, setUnitsIndex]);

  // Log selected unit when it changes
  useEffect(() => {
    console.log("Selected unit:", selectedUnit);
  }, [selectedUnit]);
  
  // Log sphere data when it changes
  useEffect(() => {
    if (sphereData) {
      console.log("🌍 Bounding sphere active:", {
        center: `(${sphereData.center.x.toFixed(2)}, ${sphereData.center.y.toFixed(2)}, ${sphereData.center.z.toFixed(2)})`,
        radius: sphereData.radius.toFixed(2)
      });
    }
  }, [sphereData]);

  const handleUnitSelect = useCallback((unitName: string) => {
    setSelectedUnit(unitName);
    setShowFullDetails(false); // Reset full details when selecting a new unit
    setIsFilterDropdownOpen(false); // Close filter dropdown when unit is selected from scene
  }, []);

  const handleDetailsClick = () => {
    setShowFullDetails(true);
  };

  const handleCloseDetails = () => {
    setShowFullDetails(false);
  };

  const handleCloseSidebar = () => {
    setSelectedUnit(null);
    setShowFullDetails(false);
  };

  const handleToggleFilterDropdown = (isOpen: boolean) => {
    setIsFilterDropdownOpen(isOpen);
    
    // Close detail panel when opening filter dropdown
    if (isOpen) {
      setSelectedUnit(null);
      setShowFullDetails(false);
    }
  };

  const handleToggleTopFilterDropdown = (isOpen: boolean) => {
    setIsTopFilterDropdownOpen(isOpen);
    
    // Close detail panel when opening filter dropdown
    if (isOpen) {
      setSelectedUnit(null);
      setShowFullDetails(false);
    }
  };
  
  // Handle explore drawer toggle
  const handleToggleExploreDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  // Handle close drawer
  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  // Animation state for smooth camera movements
  const animationState = useRef<{
    isAnimating: boolean;
    startTime: number;
    duration: number;
    startAzimuth?: number;
    targetAzimuth?: number;
    startDistance?: number;
    targetDistance?: number;
    startPolar?: number;
    targetPolar?: number;
  }>({
    isAnimating: false,
    startTime: 0,
    duration: 1000
  });

  // Smooth easing function
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Generic smooth animation function
  const animateCamera = useCallback((
    targetAzimuth?: number,
    targetDistance?: number,
    targetPolar?: number,
    resetToDefault?: boolean,
    duration: number = 1200
  ) => {
    if (!orbitControlsRef.current || animationState.current.isAnimating) return;

    const controls = orbitControlsRef.current;
    const camera = controls.object;
    
    // Get current values using the correct methods
    const startAzimuth = controls.getAzimuthalAngle();
    const startPolar = controls.getPolarAngle();
    const startDistance = camera.position.distanceTo(controls.target);
    
    animationState.current = {
      isAnimating: true,
      startTime: performance.now(),
      duration,
      startAzimuth,
      targetAzimuth,
      startDistance,
      targetDistance,
      startPolar,
      targetPolar
    };

    const animate = () => {
      if (!animationState.current.isAnimating) return;

      const elapsed = performance.now() - animationState.current.startTime;
      const progress = Math.min(elapsed / animationState.current.duration, 1);
      const easedProgress = easeInOutCubic(progress);

      // Handle reset to default position
      if (resetToDefault) {
        // Animate to initial camera position
        const initialPosition = new THREE.Vector3(-10, 10, -14);
        const initialTarget = new THREE.Vector3(0, 0, 0);
        
        // Lerp the camera position
        const currentPosition = new THREE.Vector3().lerpVectors(
          new THREE.Vector3().setFromSphericalCoords(
            animationState.current.startDistance!,
            animationState.current.startPolar!,
            animationState.current.startAzimuth!
          ).add(controls.target),
          initialPosition,
          easedProgress
        );
        
        camera.position.copy(currentPosition);
        controls.target.lerp(initialTarget, easedProgress);
      } else {
        // Animate individual parameters
        let currentAzimuth = animationState.current.startAzimuth!;
        let currentPolar = animationState.current.startPolar!;
        let currentDistance = animationState.current.startDistance!;

        if (animationState.current.targetAzimuth !== undefined) {
          currentAzimuth = THREE.MathUtils.lerp(
            animationState.current.startAzimuth!,
            animationState.current.targetAzimuth,
            easedProgress
          );
        }

        if (animationState.current.targetPolar !== undefined) {
          currentPolar = THREE.MathUtils.lerp(
            animationState.current.startPolar!,
            animationState.current.targetPolar,
            easedProgress
          );
        }

        if (animationState.current.targetDistance !== undefined) {
          currentDistance = THREE.MathUtils.lerp(
            animationState.current.startDistance!,
            animationState.current.targetDistance,
            easedProgress
          );
        }

        // Apply the new position using spherical coordinates
        const newPosition = new THREE.Vector3().setFromSphericalCoords(
          currentDistance,
          currentPolar,
          currentAzimuth
        ).add(controls.target);

        camera.position.copy(newPosition);
      }

      controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        animationState.current.isAnimating = false;
      }
    };

    animate();
  }, []);

  // Navigation control functions with smooth animations
  const handleRotateLeft = useCallback(() => {
    if (orbitControlsRef.current && !animationState.current.isAnimating) {
      const controls = orbitControlsRef.current;
      const currentAzimuth = controls.getAzimuthalAngle();
      const targetAzimuth = currentAzimuth - Math.PI / 8; // 22.5 degrees - more subtle
      animateCamera(targetAzimuth, undefined, undefined, false, 800);
    }
  }, [animateCamera]);

  const handleRotateRight = useCallback(() => {
    if (orbitControlsRef.current && !animationState.current.isAnimating) {
      const controls = orbitControlsRef.current;
      const currentAzimuth = controls.getAzimuthalAngle();
      const targetAzimuth = currentAzimuth + Math.PI / 8; // 22.5 degrees - more subtle
      animateCamera(targetAzimuth, undefined, undefined, false, 800);
    }
  }, [animateCamera]);

  const handleZoomIn = useCallback(() => {
    if (orbitControlsRef.current && !animationState.current.isAnimating) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const currentDistance = camera.position.distanceTo(controls.target);
      const targetDistance = Math.max(currentDistance * 0.85, controls.minDistance); // More subtle zoom
      animateCamera(undefined, targetDistance, undefined, false, 600);
    }
  }, [animateCamera]);

  const handleZoomOut = useCallback(() => {
    if (orbitControlsRef.current && !animationState.current.isAnimating) {
      const controls = orbitControlsRef.current;
      const camera = controls.object;
      const currentDistance = camera.position.distanceTo(controls.target);
      const targetDistance = Math.min(currentDistance * 1.18, controls.maxDistance); // More subtle zoom
      animateCamera(undefined, targetDistance, undefined, false, 600);
    }
  }, [animateCamera]);

  const handleResetView = useCallback(() => {
    if (orbitControlsRef.current && !animationState.current.isAnimating) {
      // Reset to initial camera position with smooth animation
      animateCamera(undefined, undefined, undefined, true, 1500);
    }
  }, [animateCamera]);

  const handleRequestClick = useCallback(() => {
    setShowRequestForm(true);
  }, []);
  
  const handleExpandFloorplan = useCallback((floorplanUrl: string, unitName: string, unitData?: any) => {
    setFloorplanPopupData({
      floorplanUrl,
      unitName,
      unitData
    });
    setShowFloorplanPopup(true);
  }, []);
  
  const handleCloseFloorplanPopup = useCallback(() => {
    setShowFloorplanPopup(false);
    setFloorplanPopupData(null);
  }, []);
  
  const handleModelsLoadingProgress = useCallback((loaded: number, total: number) => {
    const progress = Math.round((loaded / total) * 100);
    console.log(`📊 App received loading progress: ${loaded}/${total} (${progress}%)`);
    setLoadingProgress(progress);
    
    if (loaded >= total) {
      console.log('✅ All models loaded! Hiding loading screen in 200ms...');
      // Wait a moment then hide loading screen
      setTimeout(() => {
        console.log('🚪 Hiding loading screen now');
        setModelsLoading(false);
      }, 200);
    }
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw' }} className="bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex relative">
{/* CSV loads in background - only show logo loading screen */}
        
        {modelsLoading && (
          <div className="absolute inset-0 flex justify-center items-center z-30" 
               style={{ 
                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                 backdropFilter: 'blur(10px)'
               }}>
            <div className="text-center text-white">
              
              {/* LA Center Studios Logo */}
              <div className="mb-8">
                <img 
                  src={import.meta.env.BASE_URL + "textures/la center studios logo.png"} 
                  alt="LA Center Studios" 
                  className="mx-auto mb-4 max-w-xs h-auto opacity-90"
                  style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
                />
              </div>
              
              {/* Loading Progress */}
              <div className="mb-6">
                <div className="bg-white bg-opacity-20 rounded-full h-2 w-80 mx-auto mb-4 overflow-hidden">
                  <div 
                    className="bg-white h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Animated dots */}
              <div className="flex justify-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-3 py-2 rounded-md text-sm z-10">
            Using offline data - CSV unavailable: {error}
          </div>
        )}
        
        
        <Canvas
          shadows
          camera={{ position: [-10, 10, -14], fov: 45 }}
          style={{ background: '#e0e0e0' }}
          dpr={1} // force 1x pixel ratio for performance
          gl={{
            antialias: false,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.151,
            outputColorSpace: THREE.SRGBColorSpace,
            physicallyCorrectLights: true,
            shadowMap: {
              enabled: true,
              type: THREE.BasicShadowMap,
            },
            powerPreference: "high-performance"
          } as any}
        >
          {/* HDRI-Based Lighting System */}
          {/* Very minimal ambient light - let HDRI provide most lighting */}
          <ambientLight intensity={0.05} />
          
          {/* Subtle white fog - pushed farther and widened */}
          <fog attach="fog" args={['#f4f6f8', 14, 80]} />
          
          {/* Enhanced directional light with better shadow settings */}
          <directionalLight
            position={[20, 25, 15]}
            intensity={0.7} // +0.1 to compensate for lower env
            color="#ffffff"
            castShadow
            shadow-mapSize={[8192, 8192]} // Ultra high quality shadows
            shadow-camera-far={150}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
            shadow-bias={-0.00001} // Reduced for better accuracy
            shadow-normalBias={0.01}
            shadow-radius={4} // Softer shadow edges
          />
          
          {/* Subtle fill light to prevent harsh shadows */}
          <directionalLight
            position={[-10, 12, -5]}
            intensity={0.1} // reduce fill to avoid wash
            color="#ffffff"
            castShadow={false} // No shadows from fill light
          />

          {/* 3D Scene - Full Environment */}
          <UnitWarehouse
            onUnitSelect={handleUnitSelect}
            onUnitHover={setHoveredUnit}
            selectedUnit={selectedUnit}
            unitData={effectiveUnitData}
            filterHoveredUnit={hoveredUnit}
            onBoundingSphereData={setSphereData}
            onLoadingProgress={handleModelsLoadingProgress}
          />

          {/* GLB Manager for unit boxes with invisible/glowing states */}
          <GLBManager />
          
          {/* Selected Unit Highlight Overlay */}
          <SelectedUnitOverlay />
          
          {/* Canvas Click Handler for clearing selection */}
          <CanvasClickHandler />
          
          {/* HDRI Environment with your custom HDR */}
          {/* HDRI environment (safe defaults) */}
          <HDRIErrorBoundary>
            <React.Suspense fallback={<color attach="background" args={['#87CEEB']} />}>
              <Environment
                files={`${import.meta.env.BASE_URL}textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr`}
                background={true}                    // Show HDRI as background sky
                backgroundIntensity={0.65}           // reduced further for less blown reflections
                environmentIntensity={0.4}           // reduced from 0.6 to fix window reflections
                backgroundBlurriness={0.06}
                backgroundRotation={[0, Math.PI * 0.05, 0]}
                resolution={128}
              />
            </React.Suspense>
          </HDRIErrorBoundary>
          
          {/* Enhanced Camera Controls with proper object framing */}
          <CameraController selectedUnit={selectedUnit} controlsRef={orbitControlsRef} />
          
          {/* 3D Scene Popup */}
          <Unit3DPopupOverlay
            onExpand={() => {
              setShow3DPopup(false);
              setUnitDetailsOpen(true);
            }}
            onRequest={(unitKey) => {
              const unitData = getUnitData(unitKey);
              setRequestUnitKey(unitKey);
              setRequestUnitName(unitData?.unit_name || unitKey);
              setShowSingleUnitRequest(true);
            }}
            onClose={() => setShow3DPopup(false)}
          />
          
          {/* Post-Processing Effects - DISABLED FOR PERFORMANCE */}
        </Canvas>
        

        
        {/* Bottom Controls - Hidden during loading */}
        {!modelsLoading && (
          <>
            {/* Desktop Layout - Bottom Bar */}
            <div className="fixed bottom-6 left-6 right-6 z-40 flex justify-between items-end hidden sm:flex">
              {/* Explore Units Button - Bottom Left */}
              <button
                onClick={handleToggleExploreDrawer}
                className="bg-white bg-opacity-90 backdrop-blur-sm hover:bg-blue-50 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-gray-200 hover:border-blue-300 flex items-center space-x-2 transition-all duration-200 hover:shadow-xl"
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span className="text-sm">Explore Units</span>
                {drawerOpen ? (
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>

              {/* Center Controls */}
              <div className="flex items-center space-x-3">
                {/* Request Button */}
                <button
                  onClick={handleRequestClick}
                  className="bg-white bg-opacity-90 backdrop-blur-sm hover:bg-blue-50 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-gray-200 hover:border-blue-300 transition-all duration-200 hover:shadow-xl flex items-center space-x-2"
                  title="Submit a request"
                >
                  <MessageCircle size={16} className="text-gray-600" />
                  <span className="text-sm">Request</span>
                </button>
              </div>

              {/* Camera Controls - Bottom Right */}
              <NavigationControls
                onRotateLeft={handleRotateLeft}
                onRotateRight={handleRotateRight}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetView={handleResetView}
              />
            </div>

            {/* Mobile Layout - Vertical Stack on Right */}
            <div className="block sm:hidden">
              <div className="fixed top-4 right-2 z-40 flex flex-col space-y-2">
                {/* Explore Units - Top */}
                <button
                  onClick={handleToggleExploreDrawer}
                  className="flex flex-col items-center justify-center w-16 h-12 text-gray-700 bg-white bg-opacity-90 
                             backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 hover:bg-opacity-100 
                             transition-all duration-300 touch-manipulation"
                  title="Explore Units"
                >
                  <Building size={14} className="text-gray-600" />
                  <span className="text-xs font-medium mt-0.5">Explore</span>
                </button>

                {/* Request Button - Middle */}
                <button
                  onClick={handleRequestClick}
                  className="flex flex-col items-center justify-center w-16 h-12 bg-blue-600 hover:bg-blue-700 
                            text-white rounded-lg shadow-lg transition-all duration-300 
                            hover:shadow-xl active:scale-95 touch-manipulation"
                  title="Request Info"
                >
                  <MessageCircle size={14} className="text-white" />
                  <span className="text-xs font-medium mt-0.5">Request</span>
                </button>
              </div>

              {/* Camera Controls - Bottom Right (Compact) */}
              <div className="fixed bottom-4 right-2 z-40">
                <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-1.5">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={handleRotateLeft}
                      className="flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 
                                 border border-blue-200 rounded-md transition-all duration-200 
                                 hover:shadow-md active:scale-95 touch-manipulation"
                      title="Rotate Left"
                    >
                      <RotateCcw size={12} className="text-blue-600" />
                    </button>
                    
                    <button
                      onClick={handleZoomIn}
                      className="flex items-center justify-center w-7 h-7 bg-green-50 hover:bg-green-100 
                                 border border-green-200 rounded-md transition-all duration-200 
                                 hover:shadow-md active:scale-95 touch-manipulation"
                      title="Zoom In"
                    >
                      <ZoomIn size={12} className="text-green-600" />
                    </button>
                    
                    <button
                      onClick={handleRotateRight}
                      className="flex items-center justify-center w-7 h-7 bg-blue-50 hover:bg-blue-100 
                                 border border-blue-200 rounded-md transition-all duration-200 
                                 hover:shadow-md active:scale-95 touch-manipulation"
                      title="Rotate Right"
                    >
                      <RotateCw size={12} className="text-blue-600" />
                    </button>
                    
                    <button
                      onClick={handleZoomOut}
                      className="flex items-center justify-center w-7 h-7 bg-green-50 hover:bg-green-100 
                                 border border-green-200 rounded-md transition-all duration-200 
                                 hover:shadow-md active:scale-95 touch-manipulation"
                      title="Zoom Out"
                    >
                      <ZoomOut size={12} className="text-green-600" />
                    </button>
                    
                    <button
                      onClick={handleResetView}
                      className="flex items-center justify-center w-7 h-7 bg-gray-50 hover:bg-gray-100 
                                 border border-gray-200 rounded-md transition-all duration-200 
                                 hover:shadow-md active:scale-95 touch-manipulation col-span-1"
                      title="Reset View"
                    >
                      <Home size={12} className="text-gray-600" />
                    </button>
                    
                    {/* Empty space for grid alignment */}
                    <div></div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}


        {/* Clean Explore Units Sidebar */}
        <ExploreUnitsPanel
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          onRequest={(unitKey, unitName) => {
            console.log('🏠 App onRequest called with:', unitKey, unitName);
            setRequestUnitKey(unitKey);
            setRequestUnitName(unitName);
            setShowSingleUnitRequest(true);
            console.log('✅ Request popup should show now');
          }}
          onExpandFloorplan={handleExpandFloorplan}
        />

        
        {/* Dynamic Details Sidebar */}
        <DetailsSidebar
          selectedUnit={selectedUnit}
          unitData={effectiveUnitData}
          onDetailsClick={handleDetailsClick}
          onClose={handleCloseSidebar}
        />
        

        
        {/* Hover Toast - using new component */}
        <HoverToast />
      </div>
      
      {/* Full Unit Detail Popup */}
      {showFullDetails && (
        <UnitDetailPopup 
          selectedUnit={selectedUnit}
          unitData={effectiveUnitData}
          onClose={handleCloseDetails}
        />
      )}

      {/* Explore Units Details Popup - Center of Scene */}
      <UnitDetailsPopup
        unit={selectedUnitKey ? getUnitData(selectedUnitKey) || {
          unit_key: selectedUnitKey,
          unit_name: selectedUnitKey.toUpperCase(),
          status: 'Unknown',
          recipients: [],
          area_sqft: undefined,
          price_per_sqft: undefined,
          lease_term: undefined,
          notes: 'Unit data not available in CSV',
          floorplan_url: undefined
        } as any : null}
        isOpen={unitDetailsOpen}
        onClose={() => {
          setUnitDetailsOpen(false);
        }}
      />

      {/* Request Form */}
      <UnitRequestForm
        isOpen={showRequestForm}
        onClose={() => setShowRequestForm(false)}
      />
      
      {/* Single Unit Request Form */}
      {showSingleUnitRequest && (
        <SingleUnitRequestForm
          isOpen={showSingleUnitRequest}
          onClose={() => {
            console.log('🚪 Closing request form');
            setShowSingleUnitRequest(false);
          }}
          unitKey={requestUnitKey}
          unitName={requestUnitName}
        />
      )}
      
      {/* Floorplan Popup */}
      {showFloorplanPopup && floorplanPopupData && (
        <FloorplanPopup
          isOpen={showFloorplanPopup}
          onClose={handleCloseFloorplanPopup}
          floorplanUrl={floorplanPopupData.floorplanUrl}
          unitName={floorplanPopupData.unitName}
          unitData={floorplanPopupData.unitData}
        />
      )}
      
      {/* Debug info removed */}
      
      {/* Global Hover Preview - Rendered at App level for true global positioning */}
      {globalHoverPreview && (
        <UnitHoverPreview
          unitName={globalHoverPreview.unitName}
          unitData={globalHoverPreview.unitData}
          position={globalHoverPreview.position}
          isVisible={true}
        />
      )}
    </div>
  );
}

export default App;
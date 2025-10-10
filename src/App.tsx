import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CameraControls, Environment, Sky } from '@react-three/drei';
import { detectDevice, getMobileOptimizedSettings } from './utils/deviceDetection';
import { MobileMemoryManager } from './utils/memoryManager';
import { MessageCircle, CheckCircle, Building, RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { assetUrl } from './lib/assets';
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
import { GroundPlane } from './components/GroundPlane';
import { SimpleShadowDebug as ShadowDebugUI } from './components/SimpleShadowDebug';
import { SceneDebugUI, SceneDebugSettings } from './components/SceneDebugUI';
import { UnitHoverPreview } from './components/UnitHoverPreview';
import { SafariErrorBoundary } from './components/SafariErrorBoundary';
import { AdaptivePerformance } from './components/PerformanceMonitor';
import { GodRays } from './scene/GodRays';
import { Lighting } from './scene/Lighting';
import { useUnitStore } from './stores/useUnitStore';
import { useExploreState, buildUnitsIndex, type UnitRecord } from './store/exploreState';
import { useGLBState } from './store/glbState';
import { useCsvUnitData } from './hooks/useCsvUnitData';
import { emitEvent, getTimestamp } from './lib/events';
import { validateAllMaterials, setupRendererSafety } from './dev/MaterialValidator';
import { runDuplicateAudit } from './dev/DuplicateAudit';


// Component to capture scene and gl refs + setup safety
const SceneCapture = ({ sceneRef, glRef }: { sceneRef: React.RefObject<THREE.Scene>, glRef: React.RefObject<THREE.WebGLRenderer> }) => {
  const { gl, scene } = useThree();
  const setupComplete = useRef(false);
  
  useEffect(() => {
    sceneRef.current = scene;
    glRef.current = gl;
    
    // Setup renderer safety once
    if (!setupComplete.current) {
      setupRendererSafety(gl);
      setupComplete.current = true;
    }
  }, [scene, gl, sceneRef, glRef]);
  
  // Run material validation after scene loads
  useEffect(() => {
    const timer = setTimeout(() => {
      validateAllMaterials(scene);
    }, 2000); // After models load
    
    return () => clearTimeout(timer);
  }, [scene]);
  
  return null;
};

// Material setup removed - materials handled by UnitWarehouse component

// Adaptive pixel ratio component for performance optimization
function AdaptivePixelRatio() {
  const current = useThree((state) => state.performance.current);
  const setPixelRatio = useThree((state) => state.setDpr);
  useEffect(() => {
    setPixelRatio(window.devicePixelRatio * current);
  }, [current, setPixelRatio]);
  return null;
}

// Google Sheets CSV data source - Updated to new spreadsheet
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRBerrxFj5qKyqlWidn983mMQWCNBBsl824Nr8qSiHNqNaIKAr-RLEhDP_P2TuVnewkLms8EFdBiY2T/pub?output=csv';

// Legacy HDRI Environment component - kept for fallback but not used by default
const LegacyHDRIEnvironment = React.memo(() => {
  return (
    <Environment
      files={assetUrl("textures/qwantani_noon_puresky_2k.hdr")}
      background={false} // Sky component handles background
      backgroundIntensity={0.8}
      environmentIntensity={0.35} // Reduced for realism
      backgroundBlurriness={0.0}
      backgroundRotation={[0, 0, 0]}
      resolution={1024}
    />
  );
});

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
  'f-10': { name: 'f-10', size: '1,200 sq ft', availability: 'Available', amenities: 'Ground floor unit with loading dock access', glb: 'boxes/Fifth Street Building/Ground Floor/F-10.glb' },
  'f-15': { name: 'f-15', size: '1,500 sq ft', availability: 'Available', amenities: 'Large ground floor space', glb: 'boxes/Fifth Street Building/Ground Floor/F-15.glb' },
  'f-20': { name: 'f-20', size: '1,800 sq ft', availability: 'Occupied', amenities: 'Premium floor unit', glb: 'boxes/Fifth Street Building/Ground Floor/F-20.glb' },
  'f-25': { name: 'f-25', size: '1,400 sq ft', availability: 'Available', amenities: 'Standard floor unit', glb: 'boxes/Fifth Street Building/Ground Floor/F-25.glb' },
  'f-30': { name: 'f-30', size: '2,000 sq ft', availability: 'Available', amenities: 'Large floor unit', glb: 'boxes/Fifth Street Building/Ground Floor/F-30.glb' },
  'f-35': { name: 'f-35', size: '1,600 sq ft', availability: 'Occupied', amenities: 'Corner floor unit', glb: 'boxes/Fifth Street Building/Ground Floor/F-35.glb' },
  'f-40': { name: 'f-40', size: '1,300 sq ft', availability: 'Available', amenities: 'Standard floor space', glb: 'boxes/Fifth Street Building/Ground Floor/F-40.glb' },
  'f-50': { name: 'f-50', size: '1,700 sq ft', availability: 'Available', amenities: 'Large floor space', glb: 'boxes/Fifth Street Building/Ground Floor/F-50.glb' },
  'f-60': { name: 'f-60', size: '1,400 sq ft', availability: 'Occupied', amenities: 'Mid-size floor unit', glb: 'boxes/Fifth Street Building/Ground Floor/F-60.glb' },
  'f-70': { name: 'f-70', size: '1,900 sq ft', availability: 'Available', amenities: 'Premium floor space', glb: 'boxes/Fifth Street Building/Ground Floor/F-70.glb' },
  'f-100': { name: 'f-100', size: '2,200 sq ft', availability: 'Available', amenities: 'Large floor unit with high ceilings', glb: 'boxes/Fifth Street Building/First Floor/F-100.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f100.png' },
  'f-105': { name: 'f-105', size: '1,800 sq ft', availability: 'Available', amenities: 'Floor unit with office space', glb: 'boxes/Fifth Street Building/First Floor/F-105.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f105.png' },
  'f-110 cr': { name: 'f-110 cr', size: '1,500 sq ft', availability: 'Occupied', amenities: 'Conference room unit', glb: 'boxes/Fifth Street Building/First Floor/F-110 CR.glb' },
  'f-115': { name: 'f-115', size: '1,600 sq ft', availability: 'Available', amenities: 'Standard floor unit', glb: 'boxes/Fifth Street Building/First Floor/F-115.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f115.png' },
  'f-140': { name: 'f-140', size: '2,400 sq ft', availability: 'Available', amenities: 'Extra large floor space', glb: 'boxes/Fifth Street Building/First Floor/F-140.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f140.png' },
  'f-150': { name: 'f-150', size: '2,000 sq ft', availability: 'Occupied', amenities: 'Premium floor unit', glb: 'boxes/Fifth Street Building/First Floor/F-150.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f150.png' },
  'f-160': { name: 'f-160', size: '1,700 sq ft', availability: 'Available', amenities: 'Large floor space', glb: 'boxes/Fifth Street Building/First Floor/F-160.glb' },
  'f-170': { name: 'f-170', size: '1,900 sq ft', availability: 'Available', amenities: 'Floor unit with loading access', glb: 'boxes/Fifth Street Building/First Floor/F-170.glb', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f170.png' },
  'f-175': { name: 'f-175', size: '1,600 sq ft', availability: 'Available', amenities: 'Mid-size floor unit', glb: 'boxes/Fifth Street Building/First Floor/F-175.glb' },
  'f-180': { name: 'f-180', size: '2,100 sq ft', availability: 'Occupied', amenities: 'Large premium floor space', glb: 'boxes/Fifth Street Building/First Floor/F-180 .glb' },
  'f-185': { name: 'f-185', size: '1,800 sq ft', availability: 'Available', amenities: 'Floor unit with office' },
  'f-187': { name: 'f-187', size: '1,500 sq ft', availability: 'Available', amenities: 'Compact floor unit' },
  'f-190': { name: 'f-190', size: '2,000 sq ft', availability: 'Available', amenities: 'Large floor space' },
  'f-200': { name: 'f-200', size: '2,300 sq ft', availability: 'Occupied', amenities: 'Premium large floor unit' },
  'f-240': { name: 'f-240', size: '2,600 sq ft', availability: 'Available', amenities: 'Extra large floor space' },
  'f-250': { name: 'f-250', size: '2,400 sq ft', availability: 'Available', amenities: 'Large floor unit' },
  'f-280': { name: 'f-280', size: '2,800 sq ft', availability: 'Available', amenities: 'Extra large premium floor space', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/f280.png' },
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
  'm-120': { name: 'm-120', size: '1,600 sq ft', availability: 'Available', amenities: 'Premium mezzanine unit', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m120.png' },
  'm-130': { name: 'm-130', size: '1,800 sq ft', availability: 'Occupied', amenities: 'Large mezzanine space' },
  'm-140': { name: 'm-140', size: '1,700 sq ft', availability: 'Available', amenities: 'Mezzanine with office space', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m140.png' },
  'm-145': { name: 'm-145', size: '1,500 sq ft', availability: 'Available', amenities: 'Mid-size mezzanine' },
  'm-150': { name: 'm-150', size: '2,000 sq ft', availability: 'Available', amenities: 'Large mezzanine unit', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/m150.png' },
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

  // Production Stages
  'stage a': { name: 'stage a', size: '8,000 sq ft', availability: 'Available', amenities: 'Full production stage with lighting grid' },
  'stage b': { name: 'stage b', size: '7,500 sq ft', availability: 'Occupied', amenities: 'Large production stage' },
  'stage c': { name: 'stage c', size: '8,500 sq ft', availability: 'Available', amenities: 'Premium production stage' },
  'stage d': { name: 'stage d', size: '7,200 sq ft', availability: 'Available', amenities: 'Standard production stage' },
  'stage e': { name: 'stage e', size: '9,000 sq ft', availability: 'Available', amenities: 'Large premium production stage' },
  'stage f': { name: 'stage f', size: '8,200 sq ft', availability: 'Occupied', amenities: 'Full service production stage' },
  'stage 7': { name: 'stage 7', size: '7,800 sq ft', availability: 'Available', amenities: 'Professional production stage' },
  'stage 8': { name: 'stage 8', size: '8,400 sq ft', availability: 'Available', amenities: 'Large production facility' },
  'mg - stage 7': { name: 'mg - stage 7', size: '6,500 sq ft', availability: 'Available', amenities: 'Mezzanine stage area', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/LACS_Site Map_M1_Color_page_1.png' },
  'studio o.m.': { name: 'studio o.m.', size: '5,000 sq ft', availability: 'Occupied', amenities: 'Private studio space', floorPlanUrl: import.meta.env.BASE_URL + 'floorplans/converted/LACS_Site Map_M1_Color_page_1.png' },
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

// Enhanced Camera controller with CameraControls for smooth navigation
const CameraController: React.FC<{
  selectedUnit: string | null;
  controlsRef: React.RefObject<any>;
}> = ({ controlsRef }) => {
  useEffect(() => {
    // Simplified camera controller initialization without verbose logging
    const checkControls = () => {
      if (controlsRef?.current) {
        return true;
      }
      return false;
    };
    
    // Check immediately, then once more after delay if needed
    if (!checkControls()) {
      const timeout = setTimeout(() => {
        checkControls();
      }, 100);
      
      return () => clearTimeout(timeout);
    }
  }, [controlsRef]);
  
  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      minPolarAngle={0}
      maxPolarAngle={Math.PI * 0.48}
      minDistance={8}
      maxDistance={25}
      dollySpeed={0.5}
      truckSpeed={1}
      azimuthRotateSpeed={0.15}
      polarRotateSpeed={0.15}
      draggingSmoothTime={0.4}
      smoothTime={0.4}
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

// RendererSetup removed - EnvHDRI handles all renderer configuration

function App() {
  const { selectedUnit, hoveredUnit, setSelectedUnit, setHoveredUnit } = useUnitStore();
  const { drawerOpen, setDrawerOpen, selectedUnitKey, getUnitData, unitDetailsOpen, setUnitDetailsOpen, show3DPopup, setShow3DPopup, hoveredUnitKey } = useExploreState();
  const { setCameraControlsRef } = useGLBState();
  
  // Global hover preview state
  const [globalHoverPreview, setGlobalHoverPreview] = useState<{
    unitName: string;
    unitData: any;
    position: { x: number; y: number };
  } | null>(null);
  
  // Listen for hover preview updates from ExploreUnitsPanel
  useEffect(() => {
    const handleHoverUpdate = (event: CustomEvent) => {
      setGlobalHoverPreview(event.detail);
    };
    
    const handleHoverClear = () => {
      setGlobalHoverPreview(null);
    };
    
    window.addEventListener('unit-hover-update' as any, handleHoverUpdate);
    window.addEventListener('unit-hover-clear' as any, handleHoverClear);
    return () => {
      window.removeEventListener('unit-hover-update' as any, handleHoverUpdate);
      window.removeEventListener('unit-hover-clear' as any, handleHoverClear);
    };
  }, []);

  // Global hotkeys for debugging and audit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'd' || event.key === 'D') {
        if (sceneRef.current) {
          console.log("🔍 Running material validation and duplicate audit...");
          validateAllMaterials(sceneRef.current);
          runDuplicateAudit(sceneRef.current);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Debug logging for state changes
  
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [filterHoveredUnit, setFilterHoveredUnit] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isTopFilterDropdownOpen, setIsTopFilterDropdownOpen] = useState(false);
  const [sphereData, setSphereData] = useState<{center: THREE.Vector3, radius: number} | null>(null);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingPhase, setLoadingPhase] = useState('initializing'); // Track loading phase
  const [effectsReady, setEffectsReady] = useState(false); // Delay post-processing effects
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [popup3DPosition, setPopup3DPosition] = useState<{x: number, y: number} | undefined>();
  const [showSingleUnitRequest, setShowSingleUnitRequest] = useState(false);
  const [shadowDebugOpen, setShadowDebugOpen] = useState(false);
  const [sceneDebugSettings, setSceneDebugSettings] = useState<SceneDebugSettings>({
    sunPosition: [-34.0, 78.5, 28.5],
    sunIntensity: 6.2,
    shadowBias: -0.0005,
    shadowNormalBias: 0.70,
    shadowMapSize: 4096
  });
  // Fixed shadow settings - optimized single light source
  const FIXED_SHADOW_SETTINGS = {
    shadowsEnabled: true,
    shadowMapSize: 2048,
    shadowIntensity: 3.0,
    shadowRadius: 6,
    shadowBias: -1, // Adjusted for cleaner shadows
    showHelpers: false
  };
  
  // Refs to store Three.js instances for shadow settings callback
  const sceneRef = useRef<THREE.Scene | null>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const [requestUnitKey, setRequestUnitKey] = useState<string>('');
  const [requestUnitName, setRequestUnitName] = useState<string>('');
  const [showFloorplanPopup, setShowFloorplanPopup] = useState(false);
  const [floorplanPopupData, setFloorplanPopupData] = useState<{
    floorplanUrl: string;
    unitName: string;
    unitData?: any;
  } | null>(null);
  
  // Camera controls ref for navigation
  const orbitControlsRef = useRef<CameraControls>(null);
  
  // Mobile device detection and optimization settings
  const deviceCapabilities = useMemo(() => {
    const caps = detectDevice();
    console.log('🔍 Device Detection Results:', caps);
    console.log('🔍 Will render shadows?', !caps.isMobile);
    return caps;
  }, []);
  
  // Force shadow initialization on app start - moved after deviceCapabilities definition
  useEffect(() => {
    // Ensure shadows are properly initialized when app starts - ALWAYS enable for all devices
    console.log('🔥 App: Force initializing shadows on startup for ALL devices');
    // Shadow settings are now handled by SimpleShadowDebug component directly
  }, []);
  const mobileSettings = useMemo(() => getMobileOptimizedSettings(deviceCapabilities), [deviceCapabilities]);
  
  // Shadow-enabled renderer configuration
  const glConfig = useMemo(() => {
    return {
      powerPreference: "high-performance",
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
      depth: true,
      premultipliedAlpha: false,
      failIfMajorPerformanceCaveat: false,
    };
  }, []);
  
  // Initialize memory manager for mobile devices
  useEffect(() => {
    if (deviceCapabilities.isMobile) {
      const memoryManager = MobileMemoryManager.getInstance();
      memoryManager.startMemoryMonitoring();
      
      // Add iOS low memory warning handler
      if (deviceCapabilities.isIOS) {
        const handleLowMemory = () => {
          console.warn('🚨 Low memory warning detected on iOS');
          memoryManager.aggressiveCleanup();
          // Force reload of essential resources only
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        };
        
        // Listen for low memory events (iOS specific)
        window.addEventListener('memorywarning', handleLowMemory);
        
        return () => {
          memoryManager.stopMemoryMonitoring();
          window.removeEventListener('memorywarning', handleLowMemory);
        };
      }
      
      return () => {
        memoryManager.stopMemoryMonitoring();
      };
    }
  }, [deviceCapabilities.isMobile, deviceCapabilities.isIOS]);
  
  // Optimized camera controls initialization with faster polling and shorter timeout
  useEffect(() => {
    setCameraControlsRef(orbitControlsRef);
    
    let hasLogged = false;
    let timeoutId: NodeJS.Timeout;
    
    // Set initial target position when controls are ready
    const setupInitialTarget = () => {
      if (orbitControlsRef.current && orbitControlsRef.current.target && typeof orbitControlsRef.current.target.set === 'function') {
        if (!hasLogged) {
          console.log('🎯 Camera controls initialized successfully');
          hasLogged = true;
        }
        orbitControlsRef.current.target.set(0, 0, 0);
        orbitControlsRef.current.update();
        return true;
      }
      return false;
    };
    
    // Try immediate setup
    if (!setupInitialTarget()) {
      let attempts = 0;
      const maxAttempts = 30; // 3 seconds max (reduced from 10 seconds)
      
      const interval = setInterval(() => {
        attempts++;
        if (setupInitialTarget()) {
          clearInterval(interval);
          clearTimeout(timeoutId);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.warn('⚠️ Camera controls initialization timeout after 3 seconds');
        }
      }, 100);
      
      // Alternative: try using requestAnimationFrame for faster checking
      const trySetupRAF = () => {
        if (!setupInitialTarget() && attempts < maxAttempts) {
          requestAnimationFrame(trySetupRAF);
        }
      };
      requestAnimationFrame(trySetupRAF);
      
      return () => {
        clearInterval(interval);
        clearTimeout(timeoutId);
      };
    }
  }, [setCameraControlsRef]);
  
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

  // Fallback: hide loading screen after 12 seconds if something goes wrong
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      console.warn('⚠️ Loading timeout reached (12s), forcing completion');
      setLoadingProgress(100);
      setLoadingPhase('complete');
      setEffectsReady(true);
      setTimeout(() => setModelsLoading(false), 300);
    }, 12000);
    
    return () => clearTimeout(fallbackTimer);
  }, []);

  // Handle window resize for proper canvas resizing
  useEffect(() => {
    const handleResize = () => {
      // Force canvas to recalculate size
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
      }
    }
  }, [effectiveUnitData]);

  // Log unit data for debugging
  useEffect(() => {
    // Performance: debug logging removed
    
    if (error) {
    }
  }, [csvUnitData, hasValidUnitData, effectiveUnitData, error]);

  // Get explore state actions
  const { setUnitsData, setUnitsIndex } = useExploreState();

  // Integrate CSV data into explore state
  useEffect(() => {
    if (hasValidUnitData && csvUnitData) {
      
      // Convert CSV data to UnitRecord format for explore state
      const unitsMap = new Map<string, UnitRecord>();
      
      // Only include desired buildings
      const allowedBuildings = ['Fifth Street Building', 'Maryland Building', 'Tower Building'];
      
      Object.entries(csvUnitData).forEach(([unitKey, unitData]) => {
        // Skip buildings we don't want to show
        if (!allowedBuildings.includes(unitData.building)) {
          return;
        }
        
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
          status: unitData.status === true, // Convert to boolean as expected by UnitStatus type
          area_sqft: unitData.area_sqft || undefined,
          floorplan_url: unitData.floorplan || unitData.floorPlanUrl || unitData.floorplan_url,
          recipients: unitData.email_recipients ? [unitData.email_recipients] : ['owner@lacenter.com'], // Use CSV email or default
          kitchen_size: unitData.kitchen_size,
          unit_type: unitData.unit_type || 'Suite' // Copy unit type from CSV data
        };
        
        // Store with the primary key
        unitsMap.set(primaryKey, unitRecord);
        
        // Also store with GLB variations for easier lookup
        unitsMap.set(`${primaryKey}.glb`, unitRecord);
        unitsMap.set(unitData.name, unitRecord);
        unitsMap.set(`${unitData.name}.glb`, unitRecord);
        
      });

      
      // Build hierarchical index
      const unitsIndex = buildUnitsIndex(unitsMap);
      
      
      // Update explore state
      setUnitsData(unitsMap);
      setUnitsIndex(unitsIndex);
      
    }
  }, [hasValidUnitData, csvUnitData, setUnitsData, setUnitsIndex]);

  // Log selected unit when it changes
  
  // Log sphere data when it changes

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

  // CameraControls-compatible animation function
  const animateCamera = useCallback((
    targetAzimuth?: number,
    targetDistance?: number,
    targetPolar?: number,
    resetToDefault?: boolean,
    duration: number = 1200
  ) => {
    if (!orbitControlsRef.current || animationState.current.isAnimating) return;

    const controls = orbitControlsRef.current;
    
    if (resetToDefault) {
      // Reset to initial position using CameraControls
      controls.reset(true);
      return;
    }

    // Use CameraControls methods for smooth animations
    if (targetAzimuth !== undefined) {
      controls.rotateAzimuthTo(targetAzimuth, true);
    }
    
    if (targetPolar !== undefined) {
      controls.rotatePolarTo(targetPolar, true);
    }
    
    if (targetDistance !== undefined) {
      const currentDistance = controls.distance;
      const dollyAmount = targetDistance / currentDistance;
      controls.dolly(dollyAmount, true);
    }
  }, []);

  // Navigation control functions with CameraControls
  const handleRotateLeft = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.rotate(-Math.PI / 8, 0, true); // 22.5 degrees left
    }
  }, []);

  const handleRotateRight = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.rotate(Math.PI / 8, 0, true); // 22.5 degrees right
    }
  }, []);

  const handleZoomIn = useCallback(() => {
    console.log('🔍 Zoom In button clicked');
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const distanceBefore = controls.distance;
      controls.dolly(0.85, true); // Zoom in (less than 1.0 to move camera closer)
      // Log distance after a brief delay to capture the change
      setTimeout(() => {
        const distanceAfter = controls.distance;
        console.log(`🔍 ZoomIn → distance ${distanceBefore.toFixed(2)} → ${distanceAfter.toFixed(2)}`);
      }, 100);
    } else {
      console.warn('⚠️ orbitControlsRef null (wire failure) - App.tsx:handleZoomIn');
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    console.log('🔍 Zoom Out button clicked');
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      const distanceBefore = controls.distance;
      controls.dolly(-0.35, true); // Zoom out (negative value to move camera away)
      // Log distance after a brief delay to capture the change
      setTimeout(() => {
        const distanceAfter = controls.distance;
        console.log(`🔍 ZoomOut → distance ${distanceBefore.toFixed(2)} → ${distanceAfter.toFixed(2)}`);
      }, 100);
    } else {
      console.warn('⚠️ orbitControlsRef null (wire failure) - App.tsx:handleZoomOut');
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (orbitControlsRef.current) {
      const controls = orbitControlsRef.current;
      controls.reset(true); // Reset to initial position
    }
  }, []);

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
  
  // Start loading progress immediately on mount
  useEffect(() => {
    setLoadingPhase('initializing');
    setLoadingProgress(5);
    console.log('🎬 Loading started...');
    
    // Simulate early progress to show activity
    const earlyProgress = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < 15) return prev + 1;
        return prev;
      });
    }, 100);
    
    setTimeout(() => {
      setLoadingPhase('loading-assets');
      clearInterval(earlyProgress);
    }, 1000);
    
    return () => clearInterval(earlyProgress);
  }, []);

  const handleModelsLoadingProgress = useCallback((loaded: number, total: number) => {
    // Map model loading to 15-70% of progress bar
    const modelProgress = Math.round((loaded / total) * 55) + 15;
    setLoadingProgress(modelProgress);
    setLoadingPhase('loading-models');
    console.log(`📦 Models: ${loaded}/${total} (${modelProgress}%)`);
    
    if (loaded >= total) {
      setLoadingPhase('validating-materials');
      setLoadingProgress(75);
      console.log('🔍 Validating materials...');
      
      // Material validation phase
      setTimeout(() => {
        setLoadingPhase('compiling-shaders');
        setLoadingProgress(85);
        console.log('⚡ Compiling shaders...');
        
        // Shader compilation phase
        setTimeout(() => {
          setLoadingPhase('enabling-effects');
          setLoadingProgress(95);
          setEffectsReady(true);
          console.log('✨ Post-processing effects enabled');
          
          // Final phase - scene ready
          setTimeout(() => {
            setLoadingProgress(100);
            setLoadingPhase('complete');
            console.log('🎬 Scene ready with post-processing');
            
            // Hide loading screen after brief pause
            setTimeout(() => {
              setModelsLoading(false);
            }, 300);
          }, 500);
        }, 800);
      }, 600);
    }
  }, []);

  return (
    <SafariErrorBoundary>
      <div style={{ height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0 }} className="bg-gray-50 flex flex-col overflow-hidden">
        <div className="flex-1 flex relative" style={{ height: '100%', width: '100%' }}>
{/* CSV loads in background - only show logo loading screen */}
        
        {modelsLoading && (
          <div className="absolute inset-0 flex justify-center items-center z-30" 
               style={{ 
                 background: 'white',
                 backdropFilter: 'none'
               }}>
            <div className="text-center">
              
              {/* Pulsating GIF Logo */}
              <div className="mb-8">
                <div style={{
                  overflow: 'hidden',
                  maxWidth: '20rem',
                  margin: '0 auto 1rem'
                }}>
                  <img 
                    src={assetUrl('textures/333999.gif')} 
                    alt="Loading" 
                    className="w-full"
                    style={{ 
                      filter: 'none',
                      animation: 'pulse 2s ease-in-out infinite',
                      marginBottom: '-3px'
                    }}
                  />
                </div>
              </div>
              
              {/* Loading Progress */}
              <div className="mb-6">
                <div className="bg-gray-200 rounded-full h-3 w-80 mx-auto overflow-hidden">
                  <div 
                    className="bg-gray-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
                
                {/* Loading Phase Text */}
                <p className="text-gray-600 text-sm mt-3">
                  {loadingPhase === 'initializing' && 'Initializing...'}
                  {loadingPhase === 'loading-assets' && 'Loading assets...'}
                  {loadingPhase === 'loading-models' && `Loading models... ${loadingProgress}%`}
                  {loadingPhase === 'validating-materials' && 'Validating materials...'}
                  {loadingPhase === 'compiling-shaders' && 'Compiling shaders...'}
                  {loadingPhase === 'enabling-effects' && 'Enabling post-processing...'}
                  {loadingPhase === 'complete' && 'Ready!'}
                </p>
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
          dpr={Math.min(window.devicePixelRatio, deviceCapabilities.isMobile ? 1.5 : 1.8)}
          camera={{ position: [-10, 10, -14], fov: 45, near: 0.1, far: 1000 }}
          style={{ 
            width: '100%', 
            height: '100%',
            filter: "none"
          }}
          gl={{
            powerPreference: "high-performance",
            antialias: false,
            alpha: false,
            logarithmicDepthBuffer: false,
            preserveDrawingBuffer: false,
            stencil: false,
            depth: true,
            premultipliedAlpha: false,
            failIfMajorPerformanceCaveat: false,
          }}
          frameloop="always"
        >
          {/* Environment - HDRI lighting */}
          <Environment
            files={assetUrl("textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr")}
            background={true}
            backgroundIntensity={1.6}
            environmentIntensity={1.2}
            resolution={1024}
          />
          
          {/* Lighting System - unified and optimized */}
          <Lighting 
            hdriUrl="/env/qwantani_noon_2k.hdr"
            exposure={1.0}
          />
          
          {/* Volumetric fog for god rays - FogExp2 for exponential density (reduced for better low-angle visibility) */}
          <fogExp2 attach="fog" args={['#b8d0e8', 0.004]} />
          
          {/* Capture scene and gl for external callbacks */}
          <SceneCapture sceneRef={sceneRef} glRef={glRef} />
          
          {/* Post-processing disabled - focus on basic shadows */}
          {/* <SSAOEffect 
            enabled={true}
            ssaoIntensity={0.8}
            ssaoRadius={0.15}
            bloomIntensity={0.2}
            dofEnabled={false}
            toneMappingEnabled={true}
          /> */}

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
          
          {/* Selected Unit Highlight Overlay - simplified for low power devices */}
          {!deviceCapabilities.isLowPowerDevice && <SelectedUnitOverlay />}
          
          {/* Canvas Click Handler for clearing selection */}
          <CanvasClickHandler />
          
          {/* God Rays Effect - delayed to prevent context loss */}
          {effectsReady && <GodRays />}
          
          {/* Enhanced Camera Controls with proper object framing */}
          <CameraController selectedUnit={selectedUnit} controlsRef={orbitControlsRef} />
          
          {/* Performance Optimizations - DISABLED for testing */}
          {/* <AdaptivePixelRatio />
          <AdaptivePerformance /> */}
          
          
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
        
        
        {/* Mobile Layout - Top controls, bottom camera */}
        {!modelsLoading && deviceCapabilities.isMobile && (
          <>
            {/* Top Controls for Mobile */}
            <div className="fixed top-6 left-6 right-6 z-40 flex justify-between items-start">
              {/* Explore Units Button - Top Left */}
              <button
                onClick={handleToggleExploreDrawer}
                className="bg-white bg-opacity-55 backdrop-blur-md hover:bg-white hover:bg-opacity-65 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-white border-opacity-50 hover:border-blue-300 flex items-center space-x-2 transition-all duration-200 hover:shadow-xl"
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

              {/* Request Button - Top Right */}
              <button
                onClick={handleRequestClick}
                className="bg-white bg-opacity-55 backdrop-blur-md hover:bg-white hover:bg-opacity-65 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-white border-opacity-50 hover:border-blue-300 transition-all duration-200 hover:shadow-xl flex items-center space-x-2"
                title="Submit a request"
              >
                <MessageCircle size={16} className="text-gray-600" />
                <span className="text-sm">Request</span>
              </button>
            </div>

            {/* Bottom Camera Controls for Mobile */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
              <NavigationControls
                onRotateLeft={handleRotateLeft}
                onRotateRight={handleRotateRight}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onResetView={handleResetView}
              />
            </div>
          </>
        )}

        {/* Desktop Layout - Bottom controls */}
        {!modelsLoading && !deviceCapabilities.isMobile && (
          <div className="fixed bottom-6 left-6 right-6 z-40 flex justify-between items-end">
            {/* Explore Units Button - Bottom Left */}
            <button
              onClick={handleToggleExploreDrawer}
              className="bg-white bg-opacity-55 backdrop-blur-md hover:bg-white hover:bg-opacity-65 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-white border-opacity-50 hover:border-blue-300 flex items-center space-x-2 transition-all duration-200 hover:shadow-xl"
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
                className="bg-white bg-opacity-55 backdrop-blur-md hover:bg-white hover:bg-opacity-65 text-gray-800 font-medium py-2 px-4 rounded-lg shadow-lg border border-white border-opacity-50 hover:border-blue-300 transition-all duration-200 hover:shadow-xl flex items-center space-x-2"
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
        )}


        {/* Clean Explore Units Sidebar */}
        <ExploreUnitsPanel
          isOpen={drawerOpen}
          onClose={handleCloseDrawer}
          onRequest={(unitKey, unitName) => {
            setRequestUnitKey(unitKey);
            setRequestUnitName(unitName);
            setShowSingleUnitRequest(true);
          }}
          onExpandFloorplan={handleExpandFloorplan}
          onCloseFilters={() => {
            setIsFilterDropdownOpen(false);
            setIsTopFilterDropdownOpen(false);
          }}
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
            setShowSingleUnitRequest(false);
          }}
          unitKey={requestUnitKey}
          unitName={requestUnitName}
        />
      )}

      {/* Shadow Debug UI - DISABLED (using RealisticSun instead) */}
      
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

      {/* Sun Position Controls - Removed, values hard-coded */}
      </div>
    </SafariErrorBoundary>
  );
}

export default App;
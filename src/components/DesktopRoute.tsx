import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment } from '@react-three/drei';
import { MessageCircle, CheckCircle, Building, RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { UnitWarehouse } from './UnitWarehouse';
import UnitDetailPopup from './UnitDetailPopup';
import { ExploreUnitsPanel } from '../ui/ExploreUnitsPanel';
import { GLBManager } from './GLBManager';
import { UnitDetailsPopup } from './UnitDetailsPopup';
import { SelectedUnitOverlay } from './SelectedUnitOverlay';
import { CanvasClickHandler } from './CanvasClickHandler';
import UnitRequestForm from './UnitRequestForm';
import { Unit3DPopup } from './Unit3DPopup';
import { Unit3DPopupOverlay } from './Unit3DPopupOverlay';
import { SingleUnitRequestForm } from './SingleUnitRequestForm';
import { FloorplanPopup } from './FloorplanPopup';
import { NavigationControls } from './NavigationControls';
import { FilterDropdown } from './FilterDropdown';
import { HoverToast } from '../ui/HoverToast';
import { UnitHoverPreview } from './UnitHoverPreview';
import PalmTreeInstancerSimple from './PalmTreeInstancerSimple';
import { useUnitStore } from '../stores/useUnitStore';
import { useExploreState, buildUnitsIndex, type UnitRecord } from '../store/exploreState';
import { useGLBState } from '../store/glbState';
import { useCsvUnitData } from '../hooks/useCsvUnitData';
import { emitEvent, getTimestamp } from '../lib/events';
import * as THREE from 'three';

// Desktop-specific adaptive pixel ratio component
function DesktopAdaptivePixelRatio() {
  const current = useThree((state) => state.performance.current);
  const setPixelRatio = useThree((state) => state.setDpr);
  useEffect(() => {
    setPixelRatio(window.devicePixelRatio * current);
  }, [current, setPixelRatio]);
  return null;
}

// Desktop loading screen component
function DesktopLoadingScreen({ progress }: { progress: number }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center items-center z-30 bg-white">
      {/* LA Center Studios Animated Logo - Smaller with Pulse */}
      <div className="mb-8">
        <div 
          className="w-48 h-48 overflow-hidden rounded-2xl"
          style={{
            maxWidth: '70vw',
            maxHeight: '40vh'
          }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}loading-logo.gif`}
            alt="LA Center Studios Loading"
            className="animate-pulse"
            style={{
              width: '100%',
              height: 'calc(100% + 3px)',
              objectFit: 'cover',
              animationDuration: '2s',
              transform: 'translateY(-3px)'
            }}
          />
        </div>
      </div>
      
      {/* Loading text */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-medium text-black mb-4">
          Loading LA Center Studios
        </h2>
        <p className="text-gray-700 text-lg">
          Preparing your immersive 3D warehouse experience...
        </p>
      </div>
      
      {/* Progress bar - Smaller and Black */}
      <div className="w-64 bg-gray-200 rounded-full h-2 mb-6">
        <div 
          className="bg-black h-2 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Progress percentage - Plain Black */}
      <div className="text-black font-normal text-xl mb-4">
        {Math.round(progress)}%
      </div>
      
      {/* Loading tips */}
      {progress < 70 && (
        <div className="mt-4 text-center text-gray-500 max-w-md">
          <p className="text-sm">
            Loading high-quality 3D models and textures for the best viewing experience
          </p>
        </div>
      )}
    </div>
  );
}

// Google Sheets CSV data source - published public spreadsheet
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDfR23epOzgSvWy5zup1Uk5W1X-QJsrQp3yzXlN1MvZHCfEZqZrF8Rf2SrP81eNhWVPtX9olHf_wCT/pub?output=csv';

export const DesktopRoute: React.FC = () => {
  // State management
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [showExplorePanel, setShowExplorePanel] = useState(false);
  const [showUnitPopup, setShowUnitPopup] = useState(false);
  const [showDetailsPopup, setShowDetailsPopup] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [show3DPopup, setShow3DPopup] = useState(false);
  const [showSingleRequestForm, setShowSingleRequestForm] = useState(false);
  const [showFloorplanPopup, setShowFloorplanPopup] = useState(false);
  const [floorplanPopupData, setFloorplanPopupData] = useState<{
    floorplanUrl: string;
    unitName: string;
    unitData?: any;
  } | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  const [requestUnitKey, setRequestUnitKey] = useState<string>('');
  const [requestUnitName, setRequestUnitName] = useState<string>('');
  
  // Refs
  const orbitControlsRef = useRef<any>(null);
  
  // Store hooks
  const { 
    selectedUnitKey, 
    setSelectedUnit: setSelectedUnitInStore,
    setCameraControlsRef
  } = useGLBState();
  
  const { 
    currentView, 
    setCurrentView,
    selectedUnit: exploreSelectedUnit,
    setSelectedUnit: setExploreSelectedUnit 
  } = useExploreState();
  
  // Data fetching
  const { data: csvUnitData, loading: isUnitDataLoading, error } = useCsvUnitData(CSV_URL);
  
  // Connect camera controls to GLB state
  useEffect(() => {
    setCameraControlsRef(orbitControlsRef);
    
    if (orbitControlsRef.current) {
      console.log('🖥️ Desktop camera controls initialized');
      orbitControlsRef.current.update();
    }
  }, [setCameraControlsRef]);
  
  // 10-second loading timer with smooth progress
  useEffect(() => {
    if (modelsLoading) {
      const startTime = Date.now();
      const duration = 10000; // 10 seconds
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * 100, 100);
        
        setLoadingProgress(progress);
        
        if (progress >= 100) {
          clearInterval(interval);
          setModelsLoading(false);
        }
      }, 50); // Update every 50ms for smooth animation
      
      return () => clearInterval(interval);
    }
  }, [modelsLoading]);
  
  // Initialize viewer and emit ready event
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
  
  
  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (orbitControlsRef.current) {
        orbitControlsRef.current.update();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Effective unit data
  const hasValidUnitData = csvUnitData && Object.keys(csvUnitData).length > 0;
  const effectiveUnitData = useMemo(() => {
    return hasValidUnitData ? csvUnitData : {};
  }, [hasValidUnitData, csvUnitData]);
  
  // URL parameter handling
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
  
  // Desktop-specific handlers
  const handleUnitClick = useCallback((unitKey: string) => {
    setSelectedUnit(unitKey);
    setSelectedUnitInStore(unitKey);
  }, [setSelectedUnitInStore]);
  
  const handleUnitHover = useCallback((unitKey: string | null) => {
    setHoveredUnit(unitKey);
  }, []);
  
  const handleFloorplanExpand = useCallback((floorplanUrl: string, unitName: string, unitData?: any) => {
    setFloorplanPopupData({ floorplanUrl, unitName, unitData });
    setShowFloorplanPopup(true);
  }, []);
  
  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      {/* Desktop Loading Screen */}
      {modelsLoading && <DesktopLoadingScreen progress={loadingProgress} />}
      
      {/* Main 3D Canvas */}
      {!modelsLoading && (
        <Canvas
          camera={{
            position: [15, 10, 15],
            fov: 50,
            near: 0.1,
            far: 500
          }}
          dpr={Math.min(window.devicePixelRatio, 2)}
          performance={{ min: 0.5, max: 1 }}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
          }}
        >
          <DesktopAdaptivePixelRatio />
          
          {/* Desktop lighting setup */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={1.2}
            castShadow={true}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-10, 10, -5]} intensity={0.8} />
          
          {/* Camera Controls */}
          <CameraControls
            ref={orbitControlsRef}
            makeDefault
            minPolarAngle={0}
            maxPolarAngle={Math.PI * 0.48}
            minDistance={8}
            maxDistance={25}
            dollySpeed={1}
            truckSpeed={0.5}
            azimuthRotateSpeed={0.3}
            polarRotateSpeed={0.3}
            draggingSmoothTime={0.25}
            smoothTime={0.25}
          />
          
          {/* 3D Content */}
          <UnitWarehouse 
            unitData={effectiveUnitData}
            onUnitClick={handleUnitClick}
            onUnitHover={handleUnitHover}
            selectedUnit={selectedUnit}
            hoveredUnit={hoveredUnit}
            filterBuilding={filterBuilding}
            isMobile={false}
          />
          
          {/* Palm Trees */}
          <PalmTreeInstancerSimple visible={true} />
          
          {/* GLB Manager */}
          <GLBManager 
            selectedUnit={selectedUnit}
            onLoadingChange={setModelsLoading}
            isMobile={false}
          />
          
          {/* Environment */}
          <Environment preset="warehouse" />
          
          {/* Canvas Click Handler */}
          <CanvasClickHandler />
        </Canvas>
      )}
      
      {/* Desktop UI Overlays */}
      {!modelsLoading && (
        <>
          {/* Navigation Controls */}
          <NavigationControls 
            orbitControlsRef={orbitControlsRef}
            selectedUnit={selectedUnit}
            isMobile={false}
          />
          
          {/* Filter Dropdown */}
          <FilterDropdown 
            onFilterChange={setFilterBuilding}
            currentFilter={filterBuilding}
            isMobile={false}
          />
          
          {/* Explore Units Button */}
          <button
            onClick={() => setShowExplorePanel(true)}
            className="absolute top-20 left-4 bg-white hover:bg-gray-50 text-gray-800 px-4 py-2 rounded-lg shadow-lg border border-gray-200 font-medium flex items-center space-x-2 transition-all hover:shadow-xl z-10"
          >
            <Building className="w-4 h-4" />
            <span>Explore Units</span>
          </button>
          
          {/* Selected Unit Overlay */}
          {selectedUnit && effectiveUnitData[selectedUnit] && (
            <SelectedUnitOverlay 
              unit={effectiveUnitData[selectedUnit]}
              onClose={() => setSelectedUnit('')}
              onShowDetails={() => setShowDetailsPopup(true)}
              onRequest={() => {
                setRequestUnitKey(selectedUnit);
                setRequestUnitName(effectiveUnitData[selectedUnit]?.name || selectedUnit);
                setShowSingleRequestForm(true);
              }}
              onShow3D={() => setShow3DPopup(true)}
            />
          )}
          
          {/* Explore Panel */}
          <ExploreUnitsPanel
            isOpen={showExplorePanel}
            onClose={() => setShowExplorePanel(false)}
            onRequest={(unitKey: string, unitName: string) => {
              setRequestUnitKey(unitKey);
              setRequestUnitName(unitName);
              setShowRequestForm(true);
            }}
            onExpandFloorplan={handleFloorplanExpand}
            pageType="main"
          />
          
          {/* Hover Toast */}
          {hoveredUnit && (
            <HoverToast 
              unitKey={hoveredUnit}
              unitData={effectiveUnitData[hoveredUnit]}
              isMobile={false}
            />
          )}
          
          {/* Unit Preview */}
          {hoveredUnit && effectiveUnitData[hoveredUnit] && (
            <UnitHoverPreview 
              unit={effectiveUnitData[hoveredUnit]}
              unitKey={hoveredUnit}
            />
          )}
          
          {/* Popups and Forms */}
          {showUnitPopup && selectedUnit && (
            <UnitDetailPopup 
              unit={effectiveUnitData[selectedUnit]}
              onClose={() => setShowUnitPopup(false)}
            />
          )}
          
          {showDetailsPopup && selectedUnit && (
            <UnitDetailsPopup 
              unit={effectiveUnitData[selectedUnit]}
              onClose={() => setShowDetailsPopup(false)}
            />
          )}
          
          {showRequestForm && (
            <UnitRequestForm 
              onClose={() => setShowRequestForm(false)}
              unitKey={requestUnitKey}
              unitName={requestUnitName}
            />
          )}
          
          {show3DPopup && selectedUnit && (
            <>
              <Unit3DPopup 
                unit={effectiveUnitData[selectedUnit]}
                onClose={() => setShow3DPopup(false)}
              />
              <Unit3DPopupOverlay />
            </>
          )}
          
          {showSingleRequestForm && (
            <SingleUnitRequestForm 
              onClose={() => setShowSingleRequestForm(false)}
              unitKey={requestUnitKey}
              unitName={requestUnitName}
            />
          )}
          
          {showFloorplanPopup && floorplanPopupData && (
            <FloorplanPopup
              isOpen={showFloorplanPopup}
              onClose={() => setShowFloorplanPopup(false)}
              floorplanUrl={floorplanPopupData.floorplanUrl}
              unitName={floorplanPopupData.unitName}
              unitData={floorplanPopupData.unitData}
            />
          )}
        </>
      )}
    </div>
  );
};
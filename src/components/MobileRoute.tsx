import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { CameraControls } from '@react-three/drei';
import { detectDevice, getMobileOptimizedSettings } from '../utils/deviceDetection';
import { MobileMemoryManager } from '../utils/memoryManager';
import { MobileLoadingScreen } from './MobileLoadingScreen';
import { SafariErrorBoundary } from './SafariErrorBoundary';
import { UnitWarehouse } from './UnitWarehouse';
import { GLBManager } from './GLBManager';
import { ExploreUnitsPanel } from '../ui/ExploreUnitsPanel';
import { NavigationControls } from './NavigationControls';
import { FilterDropdown } from './FilterDropdown';
import { HoverToast } from '../ui/HoverToast';
import PalmTreeInstancerSimple from './PalmTreeInstancerSimple';
import { useUnitStore } from '../stores/useUnitStore';
import { useExploreState } from '../store/exploreState';
import { useGLBState } from '../store/glbState';
import { useCsvUnitData } from '../hooks/useCsvUnitData';
import * as THREE from 'three';

// Mobile-specific Canvas wrapper with optimizations
function MobileCanvas({ children, mobileSettings }: { children: React.ReactNode, mobileSettings: any }) {
  return (
    <Canvas
      camera={{
        position: [15, 10, 15],
        fov: 50,
        near: 0.1,
        far: 500
      }}
      dpr={mobileSettings.pixelRatio}
      performance={{ 
        min: 0.2,  // More aggressive performance scaling for mobile
        max: 0.8   // Cap performance for battery preservation
      }}
      gl={{
        antialias: mobileSettings.antialias,
        alpha: false,
        powerPreference: mobileSettings.powerPreference || 'default',
        failIfMajorPerformanceCaveat: mobileSettings.failIfMajorPerformanceCaveat || false,
        preserveDrawingBuffer: mobileSettings.preserveDrawingBuffer !== false,
        // Mobile-specific WebGL optimizations
        stencil: false,
        depth: true,
        logarithmicDepthBuffer: false // Can cause issues on some mobile GPUs
      }}
      style={{ 
        touchAction: 'manipulation', // Prevent zoom gestures
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
    >
      {children}
    </Canvas>
  );
}

// Mobile-specific adaptive pixel ratio component
function MobileAdaptivePixelRatio() {
  const { current } = useThree((state) => ({ current: state.performance.current }));
  const setPixelRatio = useThree((state) => state.setDpr);
  
  useEffect(() => {
    // More conservative pixel ratio scaling for mobile
    const mobilePixelRatio = Math.min(window.devicePixelRatio * current, 1.5);
    setPixelRatio(mobilePixelRatio);
  }, [current, setPixelRatio]);
  
  return null;
}

// Google Sheets CSV data source - published public spreadsheet
const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRDfR23epOzgSvWy5zup1Uk5W1X-QJsrQp3yzXlN1MvZHCfEZqZrF8Rf2SrP81eNhWVPtX9olHf_wCT/pub?output=csv';

interface MobileRouteProps {
  deviceCapabilities: any;
}

export const MobileRoute: React.FC<MobileRouteProps> = ({ deviceCapabilities }) => {
  const mobileSettings = useMemo(() => getMobileOptimizedSettings(deviceCapabilities), [deviceCapabilities]);
  
  // State management
  const [modelsLoading, setModelsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [showExplorePanel, setShowExplorePanel] = useState(false);
  const [filterBuilding, setFilterBuilding] = useState<string | null>(null);
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);
  
  // Refs
  const cameraControlsRef = useRef<any>(null);
  
  // Store hooks
  const { setCameraControlsRef } = useGLBState();
  const { currentView } = useExploreState();
  
  // Data fetching
  const { data: csvUnitData, loading: isUnitDataLoading, error } = useCsvUnitData(CSV_URL);
  
  // Initialize memory manager for mobile
  useEffect(() => {
    const memoryManager = MobileMemoryManager.getInstance();
    memoryManager.startMemoryMonitoring();
    
    // More aggressive memory management for mobile
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }, 30000); // Force garbage collection every 30 seconds
    
    return () => {
      memoryManager.stopMemoryMonitoring();
      clearInterval(interval);
    };
  }, []);
  
  // Connect camera controls
  useEffect(() => {
    setCameraControlsRef(cameraControlsRef);
    
    if (cameraControlsRef.current) {
      console.log('📱 Mobile camera controls initialized');
      cameraControlsRef.current.update();
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
  
  
  // Handle window resize for mobile
  useEffect(() => {
    const handleResize = () => {
      if (cameraControlsRef.current) {
        cameraControlsRef.current.update();
      }
    };
    
    const handleOrientationChange = () => {
      // Delay to allow for orientation change completion
      setTimeout(handleResize, 300);
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
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
  
  // Mobile-specific handlers
  const handleUnitClick = useCallback((unitKey: string) => {
    setSelectedUnit(unitKey);
    setShowExplorePanel(false); // Auto-close panel on mobile
  }, []);
  
  const handleUnitHover = useCallback((unitKey: string | null) => {
    // Reduce hover effects on mobile for performance
    if (!deviceCapabilities.isLowPowerDevice) {
      setHoveredUnit(unitKey);
    }
  }, [deviceCapabilities.isLowPowerDevice]);
  
  return (
    <SafariErrorBoundary>
      <div className="relative w-full h-screen overflow-hidden bg-gray-50">
        {/* Mobile Loading Screen */}
        <MobileLoadingScreen 
          progress={loadingProgress} 
          isMobile={true}
        />
        
        {/* Main 3D Canvas - Mobile Optimized */}
        {!modelsLoading && (
          <MobileCanvas mobileSettings={mobileSettings}>
            <MobileAdaptivePixelRatio />
            
            {/* Mobile-optimized lighting */}
            <ambientLight intensity={0.6} />
            <directionalLight 
              position={[10, 10, 5]} 
              intensity={0.8}
              castShadow={false} // Disabled shadows for mobile performance
            />
            
            {/* Camera Controls - Mobile optimized */}
            <CameraControls
              ref={cameraControlsRef}
              makeDefault
              minPolarAngle={0}
              maxPolarAngle={Math.PI * 0.48}
              minDistance={5}   // Closer minimum for mobile
              maxDistance={30}  // Closer maximum for mobile
              dollySpeed={0.8}  // Slower dolly for mobile precision
              truckSpeed={0.3}  // Slower truck for mobile precision
              azimuthRotateSpeed={0.25}  // Slower rotation for mobile
              polarRotateSpeed={0.25}
              draggingSmoothTime={0.5}   // Smoother for mobile
              smoothTime={0.5}
              // Mobile touch optimizations
              mouseButtons={{
                left: 1,   // Rotate
                middle: 0, // Disabled
                right: 0,  // Disabled (conflicts with mobile context menu)
                wheel: 16  // Zoom
              }}
              touches={{
                one: 32,   // Rotate
                two: 544,  // Dolly + Truck
                three: 0   // Disabled
              }}
            />
            
            {/* 3D Content */}
            <UnitWarehouse 
              unitData={effectiveUnitData}
              onUnitClick={handleUnitClick}
              onUnitHover={handleUnitHover}
              selectedUnit={selectedUnit}
              hoveredUnit={hoveredUnit}
              filterBuilding={filterBuilding}
              isMobile={true}
              deviceCapabilities={deviceCapabilities}
            />
            
            {/* Palm Trees - Reduced for mobile performance */}
            {!deviceCapabilities.isLowPowerDevice && (
              <PalmTreeInstancerSimple visible={true} />
            )}
            
            {/* GLB Manager */}
            <GLBManager 
              selectedUnit={selectedUnit}
              onLoadingChange={setModelsLoading}
              isMobile={true}
            />
            
            {/* Mobile-optimized environment */}
            <color attach="background" args={['#f0f4f8']} />
          </MobileCanvas>
        )}
        
        {/* Mobile UI Overlay */}
        {!modelsLoading && (
          <>
            {/* Mobile Navigation Controls */}
            <NavigationControls 
              orbitControlsRef={cameraControlsRef}
              selectedUnit={selectedUnit}
              isMobile={true}
              className="absolute top-4 right-4 z-20"
            />
            
            {/* Mobile Explore Button */}
            <button
              onClick={() => setShowExplorePanel(true)}
              className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20
                         bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full
                         shadow-lg font-medium text-sm flex items-center space-x-2
                         touch-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              <Building className="w-4 h-4" />
              <span>Explore Units</span>
            </button>
            
            {/* Mobile Filter Dropdown */}
            <div className="absolute top-4 left-4 z-20">
              <FilterDropdown 
                onFilterChange={setFilterBuilding}
                currentFilter={filterBuilding}
                isMobile={true}
              />
            </div>
            
            {/* Mobile Explore Panel */}
            <ExploreUnitsPanel
              isOpen={showExplorePanel}
              onClose={() => setShowExplorePanel(false)}
              onRequest={(unitKey: string, unitName: string) => {
                console.log('📱 Mobile unit request:', unitKey, unitName);
              }}
              pageType="main"
            />
            
            {/* Mobile Hover Toast - Simplified */}
            {hoveredUnit && !deviceCapabilities.isLowPowerDevice && (
              <HoverToast 
                unitKey={hoveredUnit}
                unitData={effectiveUnitData[hoveredUnit]}
                isMobile={true}
              />
            )}
          </>
        )}
        
        {/* Mobile-specific warnings */}
        {deviceCapabilities.isSafari && deviceCapabilities.isMobile && (
          <div className="absolute top-0 left-0 right-0 bg-yellow-50 border-b border-yellow-200 p-2 z-30 text-center">
            <p className="text-xs text-yellow-800">
              Safari Mobile: Some features may be limited. For best experience, try Chrome.
            </p>
          </div>
        )}
      </div>
    </SafariErrorBoundary>
  );
};
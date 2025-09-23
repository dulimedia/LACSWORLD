import React, { useMemo, useEffect, useState } from 'react';
import { detectDevice } from '../utils/deviceDetection';
import { MobileRoute } from './MobileRoute';
import { DesktopRoute } from './DesktopRoute';
import { SafariErrorBoundary } from './SafariErrorBoundary';

// Route decision component that chooses between mobile and desktop experiences
export const RouteManager: React.FC = () => {
  const [routeDecision, setRouteDecision] = useState<'mobile' | 'desktop' | 'loading'>('loading');
  const [deviceCapabilities, setDeviceCapabilities] = useState<any>(null);
  const [showRouteInfo, setShowRouteInfo] = useState(false);
  
  // Detect device capabilities on mount
  useEffect(() => {
    const capabilities = detectDevice();
    setDeviceCapabilities(capabilities);
    
    // Decision logic for routing
    let route: 'mobile' | 'desktop' = 'desktop';
    
    // Primary mobile detection
    if (capabilities.isMobile) {
      route = 'mobile';
    }
    
    // Force mobile route for specific conditions
    if (capabilities.isIOS || capabilities.isAndroid) {
      route = 'mobile';
    }
    
    // Special handling for Safari mobile
    if (capabilities.isSafari && capabilities.isMobile) {
      route = 'mobile';
      console.log('🔍 Safari Mobile detected - Using mobile-optimized route');
    }
    
    // Override for low power devices
    if (capabilities.isLowPowerDevice) {
      route = 'mobile';
      console.log('🔋 Low power device detected - Using mobile-optimized route');
    }
    
    // URL parameter override for testing
    const urlParams = new URLSearchParams(window.location.search);
    const forceRoute = urlParams.get('route');
    if (forceRoute === 'mobile' || forceRoute === 'desktop') {
      route = forceRoute;
      console.log(`🎯 Route forced via URL parameter: ${route}`);
    }
    
    setRouteDecision(route);
    
    // Log route decision
    console.log('📱🖥️ Route Decision:', {
      route,
      deviceCapabilities: capabilities,
      userAgent: navigator.userAgent
    });
    
    // Show route info for a few seconds in development
    if (process.env.NODE_ENV === 'development') {
      setShowRouteInfo(true);
      setTimeout(() => setShowRouteInfo(false), 5000);
    }
  }, []);
  
  // Loading state while detecting device
  if (routeDecision === 'loading' || !deviceCapabilities) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-xl font-bold">LA</span>
          </div>
          <p className="text-gray-600">Detecting device capabilities...</p>
        </div>
      </div>
    );
  }
  
  return (
    <SafariErrorBoundary>
      {/* Route Information Banner (Development Only) */}
      {showRouteInfo && process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white p-2 text-center z-50">
          <div className="text-sm">
            <strong>Route:</strong> {routeDecision.toUpperCase()} | 
            <strong> Device:</strong> {deviceCapabilities.isMobile ? 'Mobile' : 'Desktop'} |
            <strong> Browser:</strong> {deviceCapabilities.isSafari ? 'Safari' : 'Other'} |
            <strong> Platform:</strong> {deviceCapabilities.isIOS ? 'iOS' : deviceCapabilities.isAndroid ? 'Android' : 'Desktop'}
          </div>
          <button 
            onClick={() => setShowRouteInfo(false)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-200"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Route-specific Components */}
      {routeDecision === 'mobile' ? (
        <MobileRoute deviceCapabilities={deviceCapabilities} />
      ) : (
        <DesktopRoute />
      )}
      
      {/* Route Switch Helper (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-3">
            <div className="text-xs text-gray-600 mb-2">Dev Tools</div>
            <div className="flex space-x-2">
              <button
                onClick={() => window.location.href = window.location.pathname + '?route=mobile'}
                className={`px-2 py-1 text-xs rounded ${
                  routeDecision === 'mobile' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                📱 Mobile
              </button>
              <button
                onClick={() => window.location.href = window.location.pathname + '?route=desktop'}
                className={`px-2 py-1 text-xs rounded ${
                  routeDecision === 'desktop' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                🖥️ Desktop
              </button>
            </div>
          </div>
        </div>
      )}
    </SafariErrorBoundary>
  );
};
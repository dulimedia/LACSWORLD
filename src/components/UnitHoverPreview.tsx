import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnitHoverPreviewProps {
  unitName: string;
  unitData?: any;
  position: { x: number; y: number };
  isVisible: boolean;
}

export const UnitHoverPreview: React.FC<UnitHoverPreviewProps> = ({
  unitName,
  unitData,
  position,
  isVisible
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Generate placeholder floor plan URL (will be replaced with actual data)
  const getFloorPlanPreview = (unitName: string) => {
    // For now, use a placeholder. Will be replaced with actual Google Sheets data
    return `/floorplans/previews/${unitName.toLowerCase()}.png`;
  };

  const floorPlanUrl = getFloorPlanPreview(unitName);

  useEffect(() => {
    if (isVisible) {
      setImageLoaded(false);
      setImageError(false);
    }
  }, [isVisible, unitName]);

  if (!isVisible) return null;
  
  console.log('🎨 UnitHoverPreview rendering with position x:', position.x, 'y:', position.y);

  // Calculate position to follow mouse cursor
  const calculatePosition = () => {
    const previewWidth = 200;
    const previewHeight = 160;
    const offset = 15; // Small offset from cursor
    
    let left = position.x + offset;
    let top = position.y + offset;
    
    // Check if window is available (client-side)
    if (typeof window !== 'undefined') {
      // Check if preview would go off the right edge
      if (left + previewWidth > window.innerWidth - 20) {
        // Show on the left side of cursor instead
        left = position.x - previewWidth - offset;
      }
      
      // Check if preview would go off the bottom
      if (top + previewHeight > window.innerHeight - 20) {
        // Show above cursor instead
        top = position.y - previewHeight - offset;
      }
      
      // Ensure it doesn't go off the top
      if (top < 20) {
        top = 20;
      }
      
      // Ensure it doesn't go off the left
      if (left < 20) {
        left = 20;
      }
    }
    
    return { left, top };
  };
  
  const { left, top } = calculatePosition();
  console.log('🎨 UnitHoverPreview calculated final position - left:', left, 'top:', top, 'window size:', typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="fixed z-[9999] pointer-events-none"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          maxWidth: '200px'
        }}
      >
        <div className="bg-white bg-opacity-98 backdrop-blur-sm border border-gray-300 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-semibold text-gray-900">{unitName}</div>
            {unitData?.area_sqft && (
              <div className="text-xs text-gray-600">
                {unitData.area_sqft.toLocaleString()} sq ft
              </div>
            )}
          </div>

          {/* Floor Plan Preview */}
          <div className="relative bg-gray-50">
            {!imageError ? (
              <img
                src={floorPlanUrl}
                alt={`${unitName} floor plan`}
                className={`w-full h-24 object-cover transition-opacity duration-200 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-24 flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-xs text-gray-400 mb-1">Floor Plan</div>
                  <div className="text-xs text-gray-500">Preview Not Available</div>
                </div>
              </div>
            )}

            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin w-4 h-4 border border-blue-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* Status */}
          {unitData && (
            <div className="px-3 py-2 bg-gray-50">
              <div className={`text-xs font-medium ${
                unitData.status === 'Available' ? 'text-green-600' : 'text-red-600'
              }`}>
                {unitData.status || 'Status Unknown'}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
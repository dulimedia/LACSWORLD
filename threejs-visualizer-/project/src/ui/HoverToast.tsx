import React, { useEffect, useState } from 'react';
import { useExploreState } from '../store/exploreState';

interface HoverToastProps {
  className?: string;
}

export const HoverToast: React.FC<HoverToastProps> = ({ className = '' }) => {
  const { hoveredUnitKey, getUnitData } = useExploreState();
  const [visible, setVisible] = useState(false);
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);

  // Get unit data for the hovered unit
  const hoveredUnit = hoveredUnitKey ? getUnitData(hoveredUnitKey) : null;

  useEffect(() => {
    // Clear existing timeout
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      setHideTimeout(null);
    }

    if (hoveredUnitKey && hoveredUnit) {
      // Show immediately when hovering
      setVisible(true);
    } else {
      // Hide with delay when hover stops
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 800);
      setHideTimeout(timeout);
    }

    // Cleanup timeout on unmount
    return () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
    };
  }, [hoveredUnitKey, hoveredUnit]);

  if (!visible || !hoveredUnit) {
    return null;
  }

  return (
    <div 
      className={`
        fixed bottom-6 left-1/2 transform -translate-x-1/2 
        bg-white bg-opacity-90 backdrop-blur-sm 
        rounded-lg shadow-lg border border-gray-200 
        px-4 py-2 z-50 pointer-events-none
        transition-all duration-200 ease-in-out
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        ${className}
      `}
    >
      <div className="text-sm font-medium text-gray-900">
        Building {hoveredUnit.building} · Floor {hoveredUnit.floor} · {hoveredUnit.unit_name}
      </div>
      {hoveredUnit.area_sqft && (
        <div className="text-xs text-gray-600 mt-1">
          {hoveredUnit.area_sqft.toLocaleString()} sq ft · {hoveredUnit.status}
        </div>
      )}
    </div>
  );
};
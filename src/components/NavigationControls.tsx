import React from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';

interface NavigationControlsProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = React.memo(({
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  return (
    <div className="bg-white bg-opacity-55 backdrop-blur-md rounded-lg shadow-lg border border-white border-opacity-50 p-2">
      <div className="flex items-center gap-2 md:gap-2 sm:gap-1">
        <div className="text-xs text-gray-600 font-medium px-2 hidden sm:block">Camera</div>
        
        {/* All controls in horizontal line */}
        <button
          onClick={onRotateLeft}
          className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 bg-blue-50 hover:bg-blue-100 
                     border border-blue-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95 touch-manipulation"
          title="Rotate Left"
        >
          <RotateCcw size={16} className="text-blue-600 sm:w-3.5 sm:h-3.5" />
        </button>
        
        <button
          onClick={onRotateRight}
          className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 bg-blue-50 hover:bg-blue-100 
                     border border-blue-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95 touch-manipulation"
          title="Rotate Right"
        >
          <RotateCw size={16} className="text-blue-600 sm:w-3.5 sm:h-3.5" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 bg-green-50 hover:bg-green-100 
                     border border-green-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95 touch-manipulation"
          title="Zoom In"
        >
          <ZoomIn size={16} className="text-green-600 sm:w-3.5 sm:h-3.5" />
        </button>
        
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 bg-green-50 hover:bg-green-100 
                     border border-green-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95 touch-manipulation"
          title="Zoom Out"
        >
          <ZoomOut size={16} className="text-green-600 sm:w-3.5 sm:h-3.5" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1 hidden sm:block"></div>
        
        <button
          onClick={onResetView}
          className="flex items-center justify-center h-10 px-3 sm:h-8 bg-gray-50 hover:bg-gray-100 
                     border border-gray-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95 touch-manipulation"
          title="Reset to Original View"
        >
          <Home size={16} className="text-gray-600 mr-1 sm:w-3.5 sm:h-3.5" />
          <span className="text-xs text-gray-700 font-medium hidden sm:inline">Reset</span>
        </button>
      </div>
    </div>
  );
}); 
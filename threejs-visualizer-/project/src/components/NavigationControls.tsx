import React from 'react';
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, Home } from 'lucide-react';

interface NavigationControlsProps {
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  onRotateLeft,
  onRotateRight,
  onZoomIn,
  onZoomOut,
  onResetView
}) => {
  return (
    <div className="bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="flex items-center gap-2">
        <div className="text-xs text-gray-600 font-medium px-2">Camera</div>
        
        {/* All controls in horizontal line */}
        <button
          onClick={onRotateLeft}
          className="flex items-center justify-center w-8 h-8 bg-blue-50 hover:bg-blue-100 
                     border border-blue-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95"
          title="Rotate Left"
        >
          <RotateCcw size={14} className="text-blue-600" />
        </button>
        
        <button
          onClick={onRotateRight}
          className="flex items-center justify-center w-8 h-8 bg-blue-50 hover:bg-blue-100 
                     border border-blue-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95"
          title="Rotate Right"
        >
          <RotateCw size={14} className="text-blue-600" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={onZoomIn}
          className="flex items-center justify-center w-8 h-8 bg-green-50 hover:bg-green-100 
                     border border-green-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95"
          title="Zoom In"
        >
          <ZoomIn size={14} className="text-green-600" />
        </button>
        
        <button
          onClick={onZoomOut}
          className="flex items-center justify-center w-8 h-8 bg-green-50 hover:bg-green-100 
                     border border-green-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95"
          title="Zoom Out"
        >
          <ZoomOut size={14} className="text-green-600" />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          onClick={onResetView}
          className="flex items-center justify-center h-8 px-3 bg-gray-50 hover:bg-gray-100 
                     border border-gray-200 rounded-md transition-all duration-200 
                     hover:shadow-md active:scale-95"
          title="Reset to Original View"
        >
          <Home size={14} className="text-gray-600 mr-1" />
          <span className="text-xs text-gray-700 font-medium">Reset</span>
        </button>
      </div>
    </div>
  );
}; 
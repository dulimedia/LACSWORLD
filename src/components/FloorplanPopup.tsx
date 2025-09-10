import React, { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface FloorplanPopupProps {
  isOpen: boolean;
  onClose: () => void;
  floorplanUrl: string;
  unitName: string;
  unitData?: any;
}

export const FloorplanPopup: React.FC<FloorplanPopupProps> = ({
  isOpen,
  onClose,
  floorplanUrl,
  unitName,
  unitData
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, posX: 0, posY: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset zoom and position when popup opens
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      setIsFullscreen(false);
    }
  }, [isOpen]);

  // Disable page scrolling when popup is open
  useEffect(() => {
    if (isOpen) {
      // Disable body scroll
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Re-enable body scroll
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleReset();
          break;
        case 'f':
        case 'F':
          setIsFullscreen(!isFullscreen);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, scale, isFullscreen]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.25, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.25, 0.1));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;

    setPosition({
      x: dragStart.posX + deltaX,
      y: dragStart.posY + deltaY
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.1), 5));
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center ${isFullscreen ? 'bg-black' : 'bg-black bg-opacity-75'}`}
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div 
        className={`relative bg-white rounded-lg shadow-2xl overflow-hidden ${
          isFullscreen 
            ? 'w-full h-full rounded-none' 
            : 'w-11/12 h-5/6 max-w-6xl max-h-4xl'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${isFullscreen ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
          <div>
            <h2 className="text-xl font-semibold">
              Floorplan - Unit {unitName.toUpperCase()}
            </h2>
            {unitData?.size && (
              <p className={`text-sm ${isFullscreen ? 'text-gray-300' : 'text-gray-600'} mt-1`}>
                {unitData.size}
              </p>
            )}
          </div>
          
          {/* Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className={`p-2 rounded-md transition-colors ${
                isFullscreen 
                  ? 'hover:bg-gray-700 text-white' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Zoom Out (-)"
            >
              <ZoomOut size={18} />
            </button>
            
            <span className={`text-sm px-2 ${isFullscreen ? 'text-gray-300' : 'text-gray-600'}`}>
              {Math.round(scale * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className={`p-2 rounded-md transition-colors ${
                isFullscreen 
                  ? 'hover:bg-gray-700 text-white' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Zoom In (+)"
            >
              <ZoomIn size={18} />
            </button>
            
            <button
              onClick={handleReset}
              className={`p-2 rounded-md transition-colors ${
                isFullscreen 
                  ? 'hover:bg-gray-700 text-white' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Reset View (0)"
            >
              <RotateCcw size={18} />
            </button>
            
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className={`p-2 rounded-md transition-colors ${
                isFullscreen 
                  ? 'hover:bg-gray-700 text-white' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Toggle Fullscreen (F)"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            
            <button
              onClick={onClose}
              className={`p-2 rounded-md transition-colors ${
                isFullscreen 
                  ? 'hover:bg-gray-700 text-white' 
                  : 'hover:bg-gray-200 text-gray-600'
              }`}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div 
          ref={containerRef}
          className={`relative overflow-hidden ${isFullscreen ? 'h-full bg-gray-900' : 'h-full bg-gray-100'}`}
          onWheel={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleWheel(e);
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleReset}
          style={{ cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
        >
          <div
            className="flex items-center justify-center w-full h-full"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
          >
            <img
              ref={imageRef}
              src={floorplanUrl}
              alt={`Floorplan for Unit ${unitName}`}
              className="max-w-full max-h-full object-contain select-none"
              draggable={false}
              onLoad={() => {
                // Optional: Center the image when it loads
                if (containerRef.current && imageRef.current) {
                  const container = containerRef.current.getBoundingClientRect();
                  const image = imageRef.current.getBoundingClientRect();
                  
                  // Only center if image is smaller than container
                  if (image.width < container.width && image.height < container.height) {
                    setPosition({ x: 0, y: 0 });
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Instructions Footer */}
        <div className={`px-4 py-2 text-xs border-t ${isFullscreen ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
          <div className="flex justify-between items-center">
            <span>Drag to pan • Scroll to zoom • Double-click to reset</span>
            <span>Press F for fullscreen • ESC to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
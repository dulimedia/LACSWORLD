import React, { useState, useEffect } from 'react';
import { Expand, X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { getFloorplanUrl, preloadImage, FALLBACK_FLOORPLAN } from '../services/floorplanService';
import { getFloorplanUrl as getIntelligentFloorplanUrl } from '../services/floorplanMappingService';

interface FloorplanViewerProps {
  floorplanUrl: string | null;
  unitName: string;
  building?: string;
  floor?: string;
  unitId?: string;
  isExpanded?: boolean;
  onClose?: () => void;
  onExpand?: (floorplanUrl: string, unitName: string, unitData?: any) => void;
  unitData?: any;
}

export const FloorplanViewer: React.FC<FloorplanViewerProps> = ({
  floorplanUrl,
  unitName,
  building,
  floor,
  unitId,
  isExpanded = false,
  onClose,
  onExpand,
  unitData
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(isExpanded);
  const [finalImageUrl, setFinalImageUrl] = useState<string>(FALLBACK_FLOORPLAN);

  useEffect(() => {
    setIsFullscreen(isExpanded);
  }, [isExpanded]);

  // Handle floorplan URL changes and preloading
  useEffect(() => {
    const loadFloorplan = async () => {
      setImageLoading(true);
      setImageError(false);
      setRetryCount(0);
      
      // First try intelligent mapping, then fallback to original service
      let url = getIntelligentFloorplanUrl(unitName, unitData);
      if (!url) {
        url = getFloorplanUrl(floorplanUrl);
      }
      
      if (url && url !== FALLBACK_FLOORPLAN) {
        try {
          // Try to preload the image
          await preloadImage(url);
          setFinalImageUrl(url);
          // Don't set loading to false here - let the onLoad handler do it
        } catch (error) {
          console.warn(`Failed to load floorplan: ${url}`, error);
          setFinalImageUrl(FALLBACK_FLOORPLAN);
          setImageError(true);
          setImageLoading(false);
        }
      } else {
        setFinalImageUrl(FALLBACK_FLOORPLAN);
        setImageLoading(false);
      }
    };
    
    loadFloorplan();
  }, [floorplanUrl, unitName, unitData]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    if (retryCount < 2 && finalImageUrl !== FALLBACK_FLOORPLAN) {
      // Retry up to 2 times for non-fallback images
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageLoading(true);
        setImageError(false);
      }, 1000);
    } else {
      // Use fallback image
      setFinalImageUrl(FALLBACK_FLOORPLAN);
      setImageError(true);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    setImageLoading(true);
    setImageError(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (finalImageUrl && finalImageUrl !== FALLBACK_FLOORPLAN) {
      const link = document.createElement('a');
      link.href = finalImageUrl;
      link.download = `${unitName}-floorplan.jpg`;
      link.click();
    }
  };

  const handleToggleFullscreen = () => {
    if (onExpand && finalImageUrl) {
      // Use the new popup system
      onExpand(finalImageUrl, unitName, unitData);
    } else {
      // Fallback to internal fullscreen
      setIsFullscreen(!isFullscreen);
    }
  };

  // Component now always renders with either the actual image or fallback
  // No need for early return since we have fallback handling

  const viewerContent = (
    <>
      {/* Controls */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center space-x-1 sm:space-x-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-1.5 sm:p-2 z-20">
        <button
          onClick={handleZoomOut}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Zoom Out"
        >
          <ZoomOut size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        <span className="text-xs sm:text-sm font-medium text-gray-700 min-w-[40px] sm:min-w-[50px] text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Zoom In"
        >
          <ZoomIn size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        <div className="w-px h-4 sm:h-6 bg-gray-300 mx-1" />
        <button
          onClick={handleRotate}
          className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
          title="Rotate"
        >
          <RotateCw size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
        </button>
        {finalImageUrl !== FALLBACK_FLOORPLAN && (
          <button
            onClick={handleDownload}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation hidden sm:block"
            title="Download"
          >
            <Download size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
        {!isExpanded && (
          <button
            onClick={handleToggleFullscreen}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
            title="Expand"
          >
            <Expand size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
        {isFullscreen && onClose && (
          <button
            onClick={() => {
              setIsFullscreen(false);
              onClose();
            }}
            className="p-2 sm:p-2 hover:bg-gray-100 rounded-md transition-colors touch-manipulation"
            title="Close"
          >
            <X size={16} className="text-gray-700 sm:w-4.5 sm:h-4.5" />
          </button>
        )}
      </div>

      {/* Image Container */}
      <div className={`${isFullscreen ? 'overflow-auto' : 'overflow-hidden'} relative bg-gray-50 rounded-lg`}>
        <div
          className="flex items-center justify-center min-h-[300px] p-4"
          style={{
            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            transition: 'transform 0.3s ease'
          }}
        >
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full" />
            </div>
          )}
          
          <img
            src={finalImageUrl}
            alt={`${unitName} Floorplan`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={`max-w-full h-auto ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            style={{
              maxHeight: isFullscreen ? 'none' : '500px',
              objectFit: 'contain'
            }}
          />
        </div>
      </div>

      {/* Footer Info */}
      {!isFullscreen && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {finalImageUrl === FALLBACK_FLOORPLAN 
              ? `${unitName} • No floorplan available for this unit`
              : `${unitName} Floorplan • Click expand for full view`
            }
          </p>
        </div>
      )}
    </>
  );

  // Fullscreen Modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 sm:p-8">
        <div className="bg-white rounded-xl shadow-2xl max-w-[95vw] max-h-[95vh] sm:max-w-[90vw] sm:max-h-[90vh] w-full h-full relative">
          <div className="absolute top-4 left-4 z-20">
            <h2 className="text-xl font-semibold text-gray-900">{unitName} Floorplan</h2>
          </div>
          {viewerContent}
        </div>
      </div>
    );
  }

  // Inline Viewer
  return (
    <div className="relative bg-white rounded-lg shadow-sm">
      {viewerContent}
    </div>
  );
};
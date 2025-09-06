import React, { useState, useEffect } from 'react';
import { Expand, X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface FloorplanViewerProps {
  floorplanUrl: string | null;
  unitName: string;
  isExpanded?: boolean;
  onClose?: () => void;
}

export const FloorplanViewer: React.FC<FloorplanViewerProps> = ({
  floorplanUrl,
  unitName,
  isExpanded = false,
  onClose
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(isExpanded);

  useEffect(() => {
    setIsFullscreen(isExpanded);
  }, [isExpanded]);

  // Reset loading state when floorplanUrl changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    setRetryCount(0);
  }, [floorplanUrl]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    if (retryCount < 2) {
      // Retry up to 2 times
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setImageLoading(true);
        setImageError(false);
      }, 1000);
    } else {
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
    if (floorplanUrl) {
      const link = document.createElement('a');
      link.href = floorplanUrl;
      link.download = `${unitName}-floorplan.jpg`;
      link.click();
    }
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!floorplanUrl) {
    console.error('🚨 FloorplanViewer: No floorplanUrl provided for', unitName);
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <div className="w-full h-48 bg-white rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-gray-500">No floorplan available</p>
            <p className="text-xs text-gray-400 mt-1">{unitName}</p>
            <p className="text-xs text-red-400 mt-1">DEBUG: floorplanUrl is {String(floorplanUrl)}</p>
          </div>
        </div>
      </div>
    );
  }

  const viewerContent = (
    <>
      {/* Controls */}
      <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white bg-opacity-90 backdrop-blur-sm rounded-lg shadow-lg p-2 z-20">
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={18} className="text-gray-700" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[50px] text-center">
          {zoom}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={18} className="text-gray-700" />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <button
          onClick={handleRotate}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Rotate"
        >
          <RotateCw size={18} className="text-gray-700" />
        </button>
        <button
          onClick={handleDownload}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          title="Download"
        >
          <Download size={18} className="text-gray-700" />
        </button>
        {!isExpanded && (
          <button
            onClick={handleToggleFullscreen}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Expand"
          >
            <Expand size={18} className="text-gray-700" />
          </button>
        )}
        {isFullscreen && onClose && (
          <button
            onClick={() => {
              setIsFullscreen(false);
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
            title="Close"
          >
            <X size={18} className="text-gray-700" />
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
          
          {imageError ? (
            <div className="text-center p-8">
              <p className="text-red-600 font-medium">Failed to load floorplan</p>
              <p className="text-gray-500 text-sm mt-2">Image may not be available yet</p>
              <p className="text-gray-400 text-xs mt-1">{floorplanUrl}</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : (
            <img
              src={floorplanUrl ? `${floorplanUrl}?v=${Date.now()}&retry=${retryCount}` : ''}
              alt={`${unitName} Floorplan`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={`max-w-full h-auto ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              style={{
                maxHeight: isFullscreen ? 'none' : '500px',
                objectFit: 'contain'
              }}
            />
          )}
        </div>
      </div>

      {/* Footer Info */}
      {!isFullscreen && (
        <div className="mt-2 text-center">
          <p className="text-xs text-gray-500">
            {unitName} Floorplan • Click expand for full view
          </p>
        </div>
      )}
    </>
  );

  // Fullscreen Modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-8">
        <div className="bg-white rounded-xl shadow-2xl max-w-[90vw] max-h-[90vh] w-full h-full relative">
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
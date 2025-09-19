import React from 'react';

interface MobileLoadingScreenProps {
  progress: number;
  isMobile: boolean;
}

export const MobileLoadingScreen: React.FC<MobileLoadingScreenProps> = ({ progress, isMobile }) => {
  if (!isMobile) {
    return null; // Use the regular loading screen on desktop
  }

  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

  return (
    <div className="absolute inset-0 flex flex-col justify-center items-center z-30 bg-gray-50" 
         style={{
           // Safari-specific optimizations to prevent crashes
           ...(isSafari && {
             transform: 'translateZ(0)', // Force hardware acceleration
             backfaceVisibility: 'hidden',
             perspective: '1000px'
           })
         }}>
      {/* Simple logo without animations for mobile */}
      <div className="mb-8">
        <div className="w-24 h-24 bg-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white text-2xl font-bold">LA</span>
        </div>
      </div>
      
      {/* Loading text - simplified for mobile */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Loading LA Center
        </h2>
        <p className="text-gray-600 text-sm">
          Preparing 3D experience...
        </p>
      </div>
      
      {/* Progress bar - simpler design for mobile */}
      <div className="w-64 bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Progress percentage */}
      <div className="text-gray-500 text-sm">
        {progress}%
      </div>
      
      {/* Mobile-specific optimization tip */}
      {progress < 50 && (
        <div className="mt-6 text-center text-xs text-gray-500 max-w-xs">
          {isSafari ? 
            "Safari detected: Optimizing for best performance..." : 
            "Tip: For best performance on mobile, close other browser tabs"
          }
        </div>
      )}
      
      {/* Safari-specific warning if loading is slow */}
      {isSafari && progress < 30 && (
        <div className="mt-4 text-center text-xs text-orange-600 max-w-xs">
          Loading may take longer on Safari. Please wait...
        </div>
      )}
    </div>
  );
};
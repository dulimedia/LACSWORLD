// Device detection utilities for mobile optimization
export interface DeviceCapabilities {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isLowPowerDevice: boolean;
  maxTextureSize: number;
  supportsWebGL2: boolean;
  devicePixelRatio: number;
}

export const detectDevice = (): DeviceCapabilities => {
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isMobile = isIOS || isAndroid || /Mobi|Mobile/i.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  // Detect low power devices (older iOS devices, budget Android)
  const isLowPowerDevice = isMobile && (
    /iPhone [1-9]|iPad[1-4]/.test(userAgent) || // Older iOS devices
    /Android [1-6]/.test(userAgent) // Older Android versions
  );

  // Get WebGL capabilities
  let maxTextureSize = 2048; // Conservative default
  let supportsWebGL2 = false;
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      supportsWebGL2 = !!canvas.getContext('webgl2');
    }
  } catch (e) {
    console.warn('WebGL detection failed:', e);
  }

  return {
    isMobile,
    isIOS,
    isAndroid,
    isSafari,
    isLowPowerDevice,
    maxTextureSize,
    supportsWebGL2,
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2) // Cap at 2 for performance
  };
};

export const getMobileOptimizedSettings = (device: DeviceCapabilities) => {
  if (!device.isMobile) {
    return {
      pixelRatio: Math.min(window.devicePixelRatio, 2),
      antialias: true,
      shadows: true,
      postProcessing: true,
      maxLights: 8,
      textureSize: 1024,
      modelComplexity: 'high'
    };
  }

  // Mobile optimizations
  const baseSettings = {
    pixelRatio: device.isLowPowerDevice ? 1 : Math.min(device.devicePixelRatio, 1.5),
    antialias: false, // Expensive on mobile
    shadows: false, // Very expensive on mobile
    postProcessing: false, // Can cause memory issues
    maxLights: device.isLowPowerDevice ? 2 : 4,
    textureSize: device.isLowPowerDevice ? 256 : 512,
    modelComplexity: device.isLowPowerDevice ? 'low' : 'medium'
  };

  // iOS Safari specific optimizations
  if (device.isIOS && device.isSafari) {
    return {
      ...baseSettings,
      pixelRatio: 1, // iOS Safari is very sensitive to high pixel ratios
      preserveDrawingBuffer: false, // Can cause memory leaks on iOS
      powerPreference: 'low-power', // Prefer battery life over performance
      failIfMajorPerformanceCaveat: true // Fail if hardware acceleration not available
    };
  }

  return baseSettings;
};
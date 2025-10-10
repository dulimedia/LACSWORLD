export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  // Enhanced mobile detection
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const tier: Tier = isMobile ? "mobileLow" : "desktopHigh";

  console.log(`📱 Device: ${tier} (mobile: ${isMobile}, iOS: ${isIOS})`);

  return {
    tier,
    isMobile,
    isIOS,
    // Global gates - mobile optimizations
    dynamicShadows: tier === "desktopHigh",
    ssr: false,  // Disabled entirely (was causing issues)
    ssgi: tier === "desktopHigh",  // Desktop only
    ao: tier === "desktopHigh",    // Desktop only
    bloom: tier === "desktopHigh", // Desktop only  
    anisotropy: tier === "desktopHigh" ? 8 : 2,  // Mobile: 2 (was 4)
    maxTextureSize: tier === "desktopHigh" ? 4096 : 1024,  // Mobile: 1024 (was 2048)
    
    // New debugging flags
    useLogDepth: false,    // Keep false to avoid black-on-zoom
    originRebase: false,   // Enable for very large world coordinates
  };
})();
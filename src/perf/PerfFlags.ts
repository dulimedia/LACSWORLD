export type Tier = "mobileLow" | "desktopHigh";

export const PerfFlags = (() => {
  // crude caps; Claude can refine with UA/feature checks
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const tier: Tier = isMobile ? "mobileLow" : "desktopHigh";

  return {
    tier,
    // Global gates
    dynamicShadows: tier === "desktopHigh",
    ssr: tier === "desktopHigh",
    ssgi: true,            // desktop: medium; mobile: low (internal quality switch)
    ao: true,
    bloom: true,
    anisotropy: tier === "desktopHigh" ? 8 : 4,
    maxTextureSize: tier === "desktopHigh" ? 4096 : 2048,
    
    // New debugging flags
    useLogDepth: false,    // Keep false to avoid black-on-zoom
    originRebase: false,   // Enable for very large world coordinates
  };
})();
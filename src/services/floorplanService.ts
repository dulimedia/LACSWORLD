/**
 * Floorplan Service - Manages floorplan images with preloading and fallback
 */

// Fallback image when floorplan is not available
export const FALLBACK_FLOORPLAN = import.meta.env.BASE_URL + 'floorplans/no-floorplan-available.svg';

// Cache for preloaded images
const imageCache = new Map<string, HTMLImageElement>();
const loadingPromises = new Map<string, Promise<HTMLImageElement>>();

/**
 * Generate a stable key for floorplan based on building, floor, and unit IDs
 */
export function generateFloorplanKey(
  building: string,
  floor: string,
  unitId: string
): string {
  // Create a stable key using the three identifiers
  return `${building}_${floor}_${unitId}`.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Preload an image and cache it
 */
export async function preloadImage(url: string): Promise<HTMLImageElement> {
  // Return cached image if available
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  // Return existing loading promise if image is being loaded
  if (loadingPromises.has(url)) {
    return loadingPromises.get(url)!;
  }

  // Create loading promise
  const loadingPromise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      imageCache.set(url, img);
      loadingPromises.delete(url);
      resolve(img);
    };
    
    img.onerror = () => {
      loadingPromises.delete(url);
      // Don't cache failed loads
      reject(new Error(`Failed to load image: ${url}`));
    };
    
    img.src = url;
  });

  loadingPromises.set(url, loadingPromise);
  return loadingPromise;
}

/**
 * Preload all floorplans for a specific floor
 */
export async function preloadFloorFloorplans(
  units: Array<{ floorplan_url?: string }>
): Promise<void> {
  const urls = units
    .map(unit => unit.floorplan_url)
    .filter((url): url is string => !!url);

  // Preload all images in parallel
  const promises = urls.map(url => 
    preloadImage(url).catch(() => {
      // Silently handle failed preloads
      console.warn(`Failed to preload floorplan: ${url}`);
    })
  );

  await Promise.all(promises);
}

/**
 * Get floorplan URL with fallback and proper base URL handling
 */
export function getFloorplanUrl(
  floorplanUrl: string | null | undefined,
  fallbackUrl: string = FALLBACK_FLOORPLAN
): string {
  if (!floorplanUrl) {
    return fallbackUrl;
  }
  
  // If it's already a full URL, return as-is
  if (floorplanUrl.startsWith('http://') || floorplanUrl.startsWith('https://')) {
    return floorplanUrl;
  }
  
  // Handle relative paths with proper base URL
  let normalizedPath = floorplanUrl;
  
  // Remove leading slash if present since BASE_URL includes trailing slash
  if (normalizedPath.startsWith('/')) {
    normalizedPath = normalizedPath.substring(1);
  }
  
  // URL encode the path to handle spaces and special characters
  const pathParts = normalizedPath.split('/');
  const encodedParts = pathParts.map(part => encodeURIComponent(part));
  const encodedPath = encodedParts.join('/');
  
  // Combine with base URL
  const finalUrl = import.meta.env.BASE_URL + encodedPath;
  console.log(`🔗 Building floorplan URL: "${floorplanUrl}" -> "${finalUrl}"`);
  return finalUrl;
}

/**
 * Check if an image is already cached
 */
export function isImageCached(url: string): boolean {
  return imageCache.has(url);
}

/**
 * Clear the image cache (useful for memory management)
 */
export function clearImageCache(): void {
  imageCache.clear();
  loadingPromises.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    cachedImages: imageCache.size,
    loadingImages: loadingPromises.size,
    totalMemoryEstimate: Array.from(imageCache.values()).reduce((total, img) => {
      // Rough estimate: width * height * 4 bytes per pixel
      return total + (img.width * img.height * 4);
    }, 0)
  };
}
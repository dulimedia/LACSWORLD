/**
 * Configuration for the ghost/highlight material used for selected units
 * Adjust these values to fine-tune the appearance of selected units
 */

export const GHOST_MATERIAL_CONFIG = {
  // Visual appearance
  color: '#0080FF',      // Blue color for selected units
  opacity: 0.45,         // Enhanced visibility - increased from 0.25 for better prominence
  
  // Fresnel effect parameters (edge glow)
  fresnelBias: 0.1,      // Base fresnel value
  fresnelScale: 2.2,     // Enhanced intensity of the fresnel effect - increased from 1.8
  fresnelPower: 2.8,     // Enhanced falloff of the fresnel effect - increased from 2.5
  
  // Render settings
  depthTest: false,      // Draw on top of everything
  depthWrite: false,     // Don't write to depth buffer (prevents z-fighting)
  doubleSide: true,      // Render both sides of the mesh
  
  // Bloom/glow settings (for future use)
  bloomIntensity: 0.3,   // How much the edges glow
  edgeBrightness: 0.6,   // Edge highlight strength
};

// Alternative presets for different visual styles
export const GHOST_MATERIAL_PRESETS = {
  subtle: {
    opacity: 0.2,
    fresnelScale: 1.5,
    fresnelPower: 2.0,
  },
  standard: {
    opacity: 0.25,
    fresnelScale: 1.8,
    fresnelPower: 2.5,
  },
  prominent: {
    opacity: 0.35,
    fresnelScale: 2.0,
    fresnelPower: 3.0,
  },
};
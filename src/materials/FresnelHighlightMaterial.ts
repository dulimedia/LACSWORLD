import * as THREE from 'three';

export function createFresnelHighlightMaterial({
  color = '#3aa7ff',   // vibrant blue
  opacity = 0.35,      // translucent
  bias = 0.1,
  scale = 1.5,
  power = 3.0,
  doubleSide = true,
}: {
  color?: string;
  opacity?: number;
  bias?: number;
  scale?: number;
  power?: number;
  doubleSide?: boolean;
} = {}) {
  const uniforms = {
    uColor:   { value: new THREE.Color(color) },
    uOpacity: { value: opacity },
    uBias:    { value: bias },
    uScale:   { value: scale },
    uPower:   { value: power },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,    // draw on top of everything
    depthWrite: false,
    side: doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    uniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uBias;
      uniform float uScale;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vWorldPos;

      void main() {
        // View dir in world space
        vec3 cameraToFrag = normalize(cameraPosition - vWorldPos);
        // Fresnel term
        float fresnel = uBias + uScale * pow(1.0 - max(dot(vNormal, cameraToFrag), 0.0), uPower);
        fresnel = clamp(fresnel, 0.0, 1.0);

        // Glow-y translucent edge color with bloom-friendly brightness
        vec3 col = uColor * (0.4 + 0.6 * fresnel);
        
        // Boost brightness for bloom effect on edges
        float bloomBoost = fresnel * 2.0; // Brighten edges more for bloom
        col = col + uColor * bloomBoost * 0.3; // Add emissive glow
        
        gl_FragColor = vec4(col, uOpacity);
      }
    `
  });

  // Set high render order to ensure it draws on top
  mat.renderOrder = 999;
  return mat;
}
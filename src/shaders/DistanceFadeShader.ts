import * as THREE from 'three';

export const DistanceFadeShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uSphereCenter': { value: new THREE.Vector3(0, 0, 0) },
    'uSphereRadius': { value: 10.0 },
    'uFadeStart': { value: 0.8 }, // Start fading at 80% of sphere radius
    'uFadeEnd': { value: 1.2 },   // Complete fade at 120% of sphere radius
    'uFadeColor': { value: new THREE.Color(1.0, 1.0, 1.0) }, // White fade
    'uCameraPosition': { value: new THREE.Vector3() },
    'uViewMatrix': { value: new THREE.Matrix4() },
    'uProjectionMatrix': { value: new THREE.Matrix4() }
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      
      // Calculate world position for distance checking
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec3 uSphereCenter;
    uniform float uSphereRadius;
    uniform float uFadeStart;
    uniform float uFadeEnd;
    uniform vec3 uFadeColor;
    uniform vec3 uCameraPosition;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      // Sample the original color
      vec4 originalColor = texture2D(tDiffuse, vUv);
      
      // Calculate distance from sphere center to current fragment
      float distanceFromCenter = distance(vWorldPosition, uSphereCenter);
      
      // Normalize distance relative to sphere radius
      float normalizedDistance = distanceFromCenter / uSphereRadius;
      
      // Calculate fade factor
      float fadeFactor = 1.0;
      if (normalizedDistance > uFadeStart) {
        fadeFactor = 1.0 - smoothstep(uFadeStart, uFadeEnd, normalizedDistance);
      }
      
      // Apply distance-based vignette effect
      vec2 vignetteCoord = vUv - 0.5;
      float vignetteDistance = length(vignetteCoord);
      float vignetteFactor = 1.0 - smoothstep(0.3, 0.8, vignetteDistance);
      
      // Combine distance fade and vignette
      float combinedFade = fadeFactor * vignetteFactor;
      
      // Mix between original color and fade color
      vec3 finalColor = mix(uFadeColor, originalColor.rgb, combinedFade);
      
      gl_FragColor = vec4(finalColor, originalColor.a);
    }
  `
};
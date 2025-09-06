import * as THREE from 'three';

export const VignetteShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'uVignetteIntensity': { value: 0.5 },
    'uVignetteSize': { value: 0.7 },
    'uVignetteSmoothness': { value: 0.5 },
    'uFadeColor': { value: new THREE.Color(1.0, 1.0, 1.0) }
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uVignetteIntensity;
    uniform float uVignetteSize;
    uniform float uVignetteSmoothness;
    uniform vec3 uFadeColor;
    
    varying vec2 vUv;
    
    void main() {
      vec4 originalColor = texture2D(tDiffuse, vUv);
      
      // Calculate distance from center
      vec2 coord = vUv - 0.5;
      float distance = length(coord);
      
      // Create smooth vignette effect
      float vignette = 1.0 - smoothstep(uVignetteSize, uVignetteSize + uVignetteSmoothness, distance);
      vignette = pow(vignette, uVignetteIntensity);
      
      // Apply architectural focus: fade to white at edges
      vec3 finalColor = mix(uFadeColor, originalColor.rgb, vignette);
      
      gl_FragColor = vec4(finalColor, originalColor.a);
    }
  `
};
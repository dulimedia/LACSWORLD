import * as THREE from 'three';

export function colorFromKelvin(k: number) {
  // fast approximate conversion; return THREE.Color
  let t = k / 100;
  let r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  let g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661
                  : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  let b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = new THREE.Color(
    THREE.MathUtils.clamp(r/255,0,1),
    THREE.MathUtils.clamp(g/255,0,1),
    THREE.MathUtils.clamp(b/255,0,1)
  );
  return c;
}
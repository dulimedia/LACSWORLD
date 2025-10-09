import { useRef } from 'react';
import { EffectComposer, GodRays as GodRaysEffect, SSAO, Bloom, Vignette, DepthOfField, SMAA, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction, NormalPass } from 'postprocessing';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { PerfFlags } from '../perf/PerfFlags';

export function GodRays() {
  const sunRef = useRef<THREE.Mesh>(null);
  const { scene, camera } = useThree();
  const isDesktop = PerfFlags.tier === "desktopHigh";

  return (
    <>
      <mesh ref={sunRef} position={[10, 50, 10]}>
        <sphereGeometry args={[5, 32, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>

      <EffectComposer enableNormalPass multisampling={0}>
        {/* Ambient occlusion for depth */}
        <SSAO 
          samples={8} 
          radius={0.25} 
          intensity={1.0} 
          bias={0.025}
          depthAwareUpsampling
        />
        
        {/* God rays volumetric lighting */}
        <GodRaysEffect
          sun={sunRef}
          blendFunction={BlendFunction.SCREEN}
          samples={40}
          density={0.96}
          decay={0.92}
          weight={0.5}
          exposure={0.9}
          clampMax={1.0}
          blur={true}
          resolutionScale={0.9}
        />
        
        {/* Bloom for highlights */}
        <Bloom 
          intensity={0.3}
          luminanceThreshold={1.0}
          luminanceSmoothing={0.2}
          mipmapBlur
        />
        
        {/* Chromatic aberration for lens realism (desktop only) */}
        {isDesktop && (
          <ChromaticAberration 
            offset={[0.00025, 0.00025]}
            modulationOffset={0.1}
            radialModulation={false}
          />
        )}
        
        {/* Film grain for photographic texture (desktop only) */}
        {isDesktop && (
          <Noise 
            opacity={0.0125}
          />
        )}
        
        {/* Vignette for cinematic edge darkening */}
        <Vignette 
          offset={0.3} 
          darkness={0.6}
          eskil={false}
        />
        
        {/* SMAA antialiasing for smooth edges */}
        <SMAA />
      </EffectComposer>
    </>
  );
}

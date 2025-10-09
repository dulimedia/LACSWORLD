import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EnvHDRI } from '../../scene/EnvHDRI';
import { PerfFlags } from '../../perf/PerfFlags';
import * as THREE from 'three';
import { useEffect, useState } from 'react';

function TestScene() {
  return (
    <>
      {/* Ground plane */}
      <mesh rotation-x={-Math.PI/2} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#808080" />
      </mesh>
      
      {/* Test cubes at various distances */}
      {Array.from({ length: 10 }, (_, i) => (
        <mesh 
          key={i} 
          position={[i * 4 - 18, 0, 0]} 
          castShadow 
          receiveShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={`hsl(${i * 36}, 70%, 50%)`}
            metalness={0.2}
            roughness={0.7}
          />
        </mesh>
      ))}
      
      {/* Far background objects to test extreme zoom */}
      <mesh position={[0, 0, -50]}>
        <sphereGeometry args={[5, 32, 32]} />
        <meshStandardMaterial color="#ff4444" metalness={0.8} roughness={0.1} />
      </mesh>
    </>
  );
}

function RendererSetup() {
  const canvas = document.querySelector('canvas');
  const renderer = (canvas as any)?.__r3f?.gl;
  
  useEffect(() => {
    if (renderer) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.9;
      renderer.physicallyCorrectLights = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      
      console.log('🎨 Zoom test renderer configured');
    }
  }, [renderer]);
  
  return null;
}

export default function ZoomBlackout() {
  const [useLogDepth, setUseLogDepth] = useState(false);
  
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxWidth: '350px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Zoom Blackout Test</h3>
        <div>🔍 Use mouse wheel or zoom buttons to test extreme distances</div>
        <div>❌ Objects should NEVER turn pitch black</div>
        <div>⚠️ If blackout occurs, check camera near/far and logDepth</div>
        
        <div style={{ marginTop: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              checked={useLogDepth}
              onChange={(e) => setUseLogDepth(e.target.checked)}
            />
            Enable LogDepth (may cause blackouts)
          </label>
        </div>
      </div>
      
      <Canvas 
        camera={{ position: [0, 2, 8], fov: 45, near: 0.1, far: 1000 }}
        gl={{ 
          antialias: true,
          alpha: false,
          logarithmicDepthBuffer: useLogDepth || PerfFlags.useLogDepth
        }}
        shadows
      >
        <RendererSetup />
        <EnvHDRI 
          hdriUrl="/textures/qwantani_noon_puresky_2k.hdr"
          setBackground={true}
        />
        
        <OrbitControls
          enableZoom={true}
          zoomSpeed={1.0}
          minDistance={0.5}
          maxDistance={200}
          enablePan={true}
          enableRotate={true}
          mouseButtons={{ 
            LEFT: THREE.MOUSE.ROTATE, 
            MIDDLE: THREE.MOUSE.DOLLY, 
            RIGHT: THREE.MOUSE.PAN 
          }}
        />
        
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        
        <TestScene />
      </Canvas>
    </div>
  );
}
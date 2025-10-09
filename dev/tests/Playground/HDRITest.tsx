import { Canvas } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import EnvHDRI from "../../scene/EnvHDRI";

export default function HDRITest() {
  const [exposure, setExposure] = useState(0.9);
  const [background, setBackground] = useState(true);
  const glRef = useRef<THREE.WebGLRenderer>();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') {
        if (event.shiftKey) {
          // Shift+E: decrease exposure
          setExposure(prev => {
            const newValue = Math.max(0.1, prev - 0.05);
            console.log(`🎛 exposure=${newValue.toFixed(2)}`);
            return newValue;
          });
        } else {
          // E: increase exposure
          setExposure(prev => {
            const newValue = Math.min(3.0, prev + 0.05);
            console.log(`🎛 exposure=${newValue.toFixed(2)}`);
            return newValue;
          });
        }
      } else if (event.key === 'b' || event.key === 'B') {
        setBackground(prev => {
          const newValue = !prev;
          console.log(`🌅 Background toggled: ${newValue}`);
          return newValue;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* HUD */}
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
        fontSize: '14px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>HDRI Test</h3>
        <div>Exposure: {exposure.toFixed(2)} (E/Shift+E to adjust)</div>
        <div>Background: {background ? 'ON' : 'OFF'} (B to toggle)</div>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
          Should see reflective sphere with HDRI environment
        </div>
      </div>
      
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 45 }}
        onCreated={({ gl }) => {
          glRef.current = gl;
        }}
      >
        {/* HDRI Environment - Single Owner */}
        <EnvHDRI 
          url="/textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr"
          background={background}
          exposure={exposure}
        />
        
        {/* Test Geometry - Reflective Sphere */}
        <mesh position={[0, 1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.8, 64, 32]} />
          <meshStandardMaterial
            metalness={1.0}
            roughness={0.05}
            envMapIntensity={1.0}
          />
        </mesh>
        
        {/* Rough Sphere for comparison */}
        <mesh position={[-2, 1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.8, 32, 16]} />
          <meshStandardMaterial
            metalness={0.0}
            roughness={0.9}
            color="#ff6600"
          />
        </mesh>
        
        {/* Medium reflection sphere */}
        <mesh position={[2, 1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.8, 32, 16]} />
          <meshStandardMaterial
            metalness={0.7}
            roughness={0.3}
            color="#0066ff"
          />
        </mesh>
        
        {/* Ground plane */}
        <mesh rotation-x={-Math.PI/2} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial 
            color="#888888" 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>
        
        {/* Basic lighting for shadows */}
        <directionalLight
          position={[5, 10, 5]}
          intensity={1.0}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
      </Canvas>
    </div>
  );
}
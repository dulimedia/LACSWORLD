import { Canvas } from "@react-three/fiber";
import { EnvLighting } from "../../scene/lighting/env";
import { PhysicalRig } from "../../scene/lighting/rig";
import { StaticInstanced } from "../../scene/instancing/instancer";
import { useMemo } from "react";
import * as THREE from "three";

function InstancingTest() {
  const count = 1000;
  
  const { geometry, material, matrices } = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6),
      metalness: 0.2,
      roughness: 0.8
    });
    
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < count; i++) {
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(
        (Math.random() - 0.5) * 20,
        Math.random() * 2,
        (Math.random() - 0.5) * 20
      );
      const rotation = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      const scale = new THREE.Vector3(1, 1, 1);
      matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale);
      mats.push(matrix);
    }
    
    return { geometry: geo, material: mat, matrices: mats };
  }, [count]);

  return (
    <StaticInstanced
      count={count}
      geometry={geometry}
      material={material}
      matrices={matrices}
    />
  );
}

export default function InstancingPerf() {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
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
        <h3 style={{ margin: '0 0 10px 0' }}>Instancing Performance Test</h3>
        <div>✅ Rendering 1000 instanced cubes</div>
        <div>✅ Should maintain stable FPS</div>
        <div>✅ Check console for memory usage</div>
      </div>
      
      <Canvas shadows camera={{ fov:45, near:0.1, far:1000, position: [0, 5, 10] }}>
        <EnvLighting url="/textures/qwantani_noon_puresky_2k.hdr" background={true} exposure={0.9}/>
        <PhysicalRig />
        <InstancingTest />
        <mesh rotation-x={-Math.PI/2} receiveShadow>
          <planeGeometry args={[50,50]} />
          <meshStandardMaterial color="#888888" roughness={0.9}/>
        </mesh>
      </Canvas>
    </div>
  );
}
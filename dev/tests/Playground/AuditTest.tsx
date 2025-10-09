import { Canvas, useThree } from "@react-three/fiber";
import { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import EnvHDRI from "../../scene/EnvHDRI";
import { PhysicalRig, shadowSettings } from "../../scene/lighting/rig";
import { validateAllMaterials } from "../../dev/MaterialValidator";
import { runDuplicateAudit, DuplicateAudit, AuditResults } from "../../dev/DuplicateAudit";

function TestScene() {
  const { scene } = useThree();
  const [auditResults, setAuditResults] = useState<AuditResults | null>(null);

  useEffect(() => {
    // Create test objects with some duplicates
    const group = new THREE.Group();
    group.name = "test-objects";

    // Add some duplicate cubes
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0xff6600 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(i * 2 - 4, 1, 0);
      mesh.name = `cube-${i}`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    // Add some overlapping planes (coplanar candidates)
    const planeGeometry = new THREE.PlaneGeometry(2, 2);
    const planeMaterial1 = new THREE.MeshStandardMaterial({ color: 0x00ff00, transparent: true, opacity: 0.7 });
    const planeMaterial2 = new THREE.MeshStandardMaterial({ color: 0x0000ff, transparent: true, opacity: 0.7 });
    
    const plane1 = new THREE.Mesh(planeGeometry, planeMaterial1);
    const plane2 = new THREE.Mesh(planeGeometry, planeMaterial2);
    
    plane1.position.set(0, 2, 2);
    plane2.position.set(0.01, 2.01, 2.01); // Very close - coplanar candidate
    
    plane1.name = "plane-A";
    plane2.name = "plane-B";
    
    group.add(plane1);
    group.add(plane2);

    scene.add(group);

    return () => {
      scene.remove(group);
    };
  }, [scene]);

  const runAudit = () => {
    console.log("🔍 Running material validation...");
    validateAllMaterials(scene);
    
    console.log("🔍 Running duplicate audit...");
    const results = runDuplicateAudit(scene);
    setAuditResults(results);
  };

  const toggleOffenders = () => {
    if (auditResults) {
      DuplicateAudit.getInstance().toggleTopOffenders(auditResults, 3);
    }
  };

  const restoreObjects = () => {
    DuplicateAudit.getInstance().restoreHiddenObjects();
  };

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation-x={-Math.PI/2} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    </group>
  );
}

export default function AuditTest() {
  const [exposure, setExposure] = useState(0.9);
  const [background, setBackground] = useState(false);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const sceneRef = useRef<THREE.Scene>();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'e' || event.key === 'E') {
        if (event.shiftKey) {
          setExposure(prev => {
            const newValue = Math.max(0.1, prev - 0.05);
            console.log(`🎛 exposure=${newValue.toFixed(2)}`);
            return newValue;
          });
        } else {
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
      } else if (event.key === 's' || event.key === 'S') {
        setShadowsEnabled(prev => {
          const newValue = !prev;
          console.log(`🌞 Shadows toggled: ${newValue}`);
          return newValue;
        });
      } else if (event.key === 'd' || event.key === 'D') {
        if (sceneRef.current) {
          console.log("🔍 Running material validation...");
          validateAllMaterials(sceneRef.current);
          
          console.log("🔍 Running duplicate audit...");
          runDuplicateAudit(sceneRef.current);
        }
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
        fontSize: '14px',
        maxWidth: '300px'
      }}>
        <h3 style={{ margin: '0 0 10px 0' }}>Audit Test</h3>
        <div>Exposure: {exposure.toFixed(2)} (E/Shift+E)</div>
        <div>Background: {background ? 'ON' : 'OFF'} (B)</div>
        <div>Shadows: {shadowsEnabled ? 'ON' : 'OFF'} (S)</div>
        <div>Normal Bias: {shadowSettings.normalBias.toFixed(3)} ([ / ])</div>
        <div style={{ marginTop: '10px', padding: '5px', background: 'rgba(255,255,255,0.1)' }}>
          <strong>Controls:</strong>
          <div>D - Run duplicate audit</div>
          <div>[ / ] - Adjust shadow bias</div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
          Check console for audit results
        </div>
      </div>
      
      <Canvas
        shadows
        camera={{ position: [5, 5, 10], fov: 45 }}
        onCreated={({ scene }) => {
          sceneRef.current = scene;
        }}
      >
        {/* HDRI Environment */}
        <EnvHDRI 
          url="/textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr"
          background={background}
          exposure={exposure}
        />
        
        {/* Physical Lighting Rig */}
        <PhysicalRig 
          enableShadows={shadowsEnabled}
          sunIntensity={2.5}
          hemisphereIntensity={0.8}
          sunPosition={[10, 20, 10]}
        />
        
        {/* Test Scene with duplicates */}
        <TestScene />
      </Canvas>
    </div>
  );
}
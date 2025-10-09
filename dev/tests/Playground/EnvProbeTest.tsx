import { Canvas } from "@react-three/fiber";
import { EnvLighting } from "../../scene/lighting/env";
import { PhysicalRig } from "../../scene/lighting/rig";

export default function EnvProbeTest() {
  return (
    <Canvas shadows camera={{ fov:45, near:0.1, far:1000 }}>
      <EnvLighting url="/textures/qwantani_noon_puresky_2k.hdr" background={true} exposure={0.9} lightProbeIntensity={1.0}/>
      <PhysicalRig />
      {/* test spheres */}
      {[0,1,2].map(i => (
        <mesh key={i} position={[i*1.8-1.8, 0.5, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.5, 64, 32]} />
          <meshStandardMaterial metalness={i===0?1:0.2} roughness={i===2?0.05:0.6} />
        </mesh>
      ))}
      {/* ground */}
      <mesh rotation-x={-Math.PI/2} receiveShadow>
        <planeGeometry args={[80,80]} />
        <meshStandardMaterial color="#d8d8d8" roughness={0.9}/>
      </mesh>
    </Canvas>
  );
}
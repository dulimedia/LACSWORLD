import { Canvas } from "@react-three/fiber";
import { Lighting } from "../../scene/Lighting";
import { PerfFlags } from "../../perf/PerfFlags";

export default function ShadowBanding() {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [8, 6, 10], fov: 45 }}>
      <Lighting exposure={0.95} />
      {/* ground */}
      <mesh rotation-x={-Math.PI/2} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cfcfcf" />
      </mesh>
      {/* test boxes */}
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[i*2-4, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[1,1,1]} />
          <meshStandardMaterial metalness={0.1} roughness={0.6} />
        </mesh>
      ))}
    </Canvas>
  );
}
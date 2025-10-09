import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { EnvLighting } from "../../scene/lighting/env";
import { PhysicalRig } from "../../scene/lighting/rig";
import { loadGLB } from "../../scene/loaders/glb";

function Model() {
  const { gl, scene } = useThree();
  useEffect(() => {
    // Check if sample GLB exists, otherwise show placeholder
    loadGLB(gl, "/models/sample.glb", { setCastReceiveShadow: true }).then(gltf => {
      gltf.scene.position.set(0,0,0);
      scene.add(gltf.scene);
    }).catch(error => {
      console.log("⚠️ /models/sample.glb not found - add a test GLB file for full testing");
      // Add a fallback cube
      const geo = new THREE.BoxGeometry(1,1,1);
      const mat = new THREE.MeshStandardMaterial({color: '#ff6600', metalness: 0.2, roughness: 0.7});
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(0, 0.5, 0);
      cube.castShadow = true;
      cube.receiveShadow = true;
      scene.add(cube);
    });
  }, [gl, scene]);
  return null;
}

export default function GLTFShadowTest() {
  return (
    <Canvas shadows camera={{ fov:45, near:0.1, far:1000 }}>
      <EnvLighting url="/textures/qwantani_noon_puresky_2k.hdr" background={false}/>
      <PhysicalRig />
      <Model/>
      <mesh rotation-x={-Math.PI/2} receiveShadow>
        <planeGeometry args={[120,120]} />
        <meshStandardMaterial color="#cfcfcf" roughness={0.95}/>
      </mesh>
    </Canvas>
  );
}
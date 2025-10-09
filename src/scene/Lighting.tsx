import { useMemo, useEffect } from "react";
import { useThree, useLoader } from "@react-three/fiber";
import { PerfFlags } from "../perf/PerfFlags";
import { PMREMGenerator, SRGBColorSpace, EquirectangularReflectionMapping, CineonToneMapping, ACESFilmicToneMapping, Texture, DirectionalLight, OrthographicCamera, HemisphereLight, VSMShadowMap, PCFSoftShadowMap } from "three";
import { RGBELoader } from "three-stdlib";

type Props = {
  hdriUrl?: string;      // recommend 2k KTX2 or small HDR
  exposure?: number;     // default 0.9
};

export function Lighting({ hdriUrl = "/env/qwantani_noon_2k.hdr", exposure = 0.7 }: Props) {
  const { gl, scene } = useThree();

  // Enhanced color pipeline with better shadow support
  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    
    // Use PCFSoft shadows for compatibility (VSM can cause issues)
    if (PerfFlags.dynamicShadows) {
      gl.shadowMap.type = PCFSoftShadowMap;
    }
  }, [gl, exposure]);

  // HDRI → PMREM with error handling (deleted 4K HDR, now using 2K for all devices)
  const hdriPath = PerfFlags.tier === "desktopHigh" 
    ? "/textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr" 
    : hdriUrl;
  
  let envTex: Texture | null = null;
  try {
    envTex = useLoader(RGBELoader, hdriPath) as Texture;
  } catch (err) {
    console.error('❌ HDRI load failed:', hdriPath, err);
  }
  
  useEffect(() => {
    if (!envTex) {
      console.warn('⚠️ No HDRI texture available, using fallback environment');
      return;
    }
    
    try {
      envTex.mapping = EquirectangularReflectionMapping;
      const pmrem = new PMREMGenerator(gl);
      pmrem.compileEquirectangularShader();
      const { texture } = pmrem.fromEquirectangular(envTex);
      scene.environment = texture;
      envTex.dispose();
      console.log('✅ HDRI environment loaded:', hdriPath);
      return () => texture?.dispose();
    } catch (err) {
      console.error('❌ HDRI processing failed:', err);
    }
  }, [envTex, gl, scene, hdriPath]);

  // Enhanced multi-light setup for photorealism
  useEffect(() => {
    // Clear old lights
    const old = scene.children.filter(o => o.userData.__appLight);
    old.forEach(o => scene.remove(o));

    // 1. Hemisphere light for soft ambient fill (prevents pitch black shadows)
    const hemi = new HemisphereLight(0xffffff, 0x555555, 0.3);
    hemi.userData.__appLight = true;
    scene.add(hemi);

    // 2. Main sun with subtle warmth (50% brighter for well-lit scene)
    const sun = new DirectionalLight(0xfff4e6, 5.25);
    sun.position.set(50, 120, -60);

    if (PerfFlags.dynamicShadows) {
      sun.castShadow = true;
      // Optimized shadow map for performance
      sun.shadow.mapSize.set(1536, 1536);
      sun.shadow.bias = -0.0003;
      (sun.shadow as any).normalBias = 0.5;
      sun.shadow.radius = 1.0;

      // Optimized ortho frustum
      const cam = sun.shadow.camera as OrthographicCamera;
      cam.left = -40; cam.right = 40; cam.top = 40; cam.bottom = -40;
      cam.near = 10; cam.far = 260;
      cam.updateProjectionMatrix();
    }

    sun.userData.__appLight = true;
    scene.add(sun);

    // Area lights disabled - can cause rendering issues
    // Use point/spot lights as alternative if needed

    console.log('✨ Photorealistic lighting initialized');

    return () => { 
      const lights = scene.children.filter(o => o.userData.__appLight);
      lights.forEach(l => scene.remove(l)); 
    };
  }, [scene]);

  return null;
}
import { useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { PerfFlags } from "../perf/PerfFlags";
import { PMREMGenerator, SRGBColorSpace, EquirectangularReflectionMapping, CineonToneMapping, ACESFilmicToneMapping, Texture, DirectionalLight, OrthographicCamera, HemisphereLight, VSMShadowMap, PCFSoftShadowMap } from "three";
import { RGBELoader } from "three-stdlib";
import { assetUrl } from "../lib/assets";

type Props = {
  hdriUrl?: string;      // recommend 2k KTX2 or small HDR
  exposure?: number;     // default 0.9
};

export function Lighting({ hdriUrl = "/env/qwantani_noon_2k.hdr", exposure = 0.77 }: Props) {
  const { gl, scene } = useThree();

  // Enhanced color pipeline with better shadow support (+10% brightness)
  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    
    // Use PCFSoft shadows for compatibility (VSM can cause issues)
    if (PerfFlags.dynamicShadows) {
      gl.shadowMap.type = PCFSoftShadowMap;
    }
  }, [gl, exposure]);

  // HDRI → PMREM with error handling and mobile optimization
  // Mobile: Skip HDRI entirely for iOS Safari (causes crashes)
  const hdriPath = useMemo(() => {
    if (PerfFlags.isIOS) {
      console.log(`🌍 Skipping HDRI on iOS Safari (memory safety)`);
      return null;
    }
    const path = PerfFlags.tier === "desktopHigh" 
      ? "textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr"
      : "textures/qwantani_noon_puresky_2k.hdr";
    const url = assetUrl(path);
    console.log(`🌍 Loading HDRI for ${PerfFlags.tier}:`, url);
    return url;
  }, []);
  
  useEffect(() => {
    console.log('🚫 HDRI DISABLED - Testing sun-only lighting');
    return;
    
    if (!hdriPath) {
      console.log('⚠️ No HDRI path (iOS fallback mode)');
      return;
    }

    let cancelled = false;
    const loader = new RGBELoader();
    
    const loadTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('⚠️ HDRI load timeout (8s), continuing without environment map');
        cancelled = true;
      }
    }, 8000);
    
    loader.load(
      hdriPath,
      (texture) => {
        if (cancelled) return;
        clearTimeout(loadTimeout);
        
        try {
          texture.mapping = EquirectangularReflectionMapping;
          const pmrem = new PMREMGenerator(gl);
          pmrem.compileEquirectangularShader();
          const { texture: envMap } = pmrem.fromEquirectangular(texture);
          scene.environment = envMap;
          texture.dispose();
          console.log('✅ HDRI environment loaded:', hdriPath);
        } catch (err) {
          console.error('❌ HDRI processing failed:', err);
        }
      },
      undefined,
      (err) => {
        if (cancelled) return;
        clearTimeout(loadTimeout);
        console.error('❌ HDRI load failed:', hdriPath, err);
      }
    );
    
    return () => {
      cancelled = true;
      clearTimeout(loadTimeout);
    };
  }, [hdriPath, gl, scene]);

  // Enhanced multi-light setup for photorealism
  useEffect(() => {
    // Clear old lights
    const old = scene.children.filter(o => o.userData.__appLight);
    old.forEach(o => scene.remove(o));

    // 1. Hemisphere light for soft ambient fill (+10% brightness)
    // DISABLED FOR TESTING - Sun only
    // const hemi = new HemisphereLight(0xffffff, 0x555555, 0.33);
    // hemi.userData.__appLight = true;
    // scene.add(hemi);
    console.log('🚫 HEMISPHERE DISABLED - Testing sun-only lighting');

    // 2. Main sun with subtle warmth (+10% brightness: 5.25 → 5.78)
    const sun = new DirectionalLight(0xfff4e6, 5.78);
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
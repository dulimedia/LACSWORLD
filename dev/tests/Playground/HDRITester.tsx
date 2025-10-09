import { Canvas } from "@react-three/fiber";
import { useState, useEffect } from "react";
import { useThree, useLoader } from "@react-three/fiber";
import { PMREMGenerator, sRGBEncoding, EquirectangularReflectionMapping, ACESFilmicToneMapping, Texture } from "three";
import { RGBELoader } from "three-stdlib";

const HDRI_OPTIONS = [
  { name: "Horn Koppe Spring 2K", path: "/textures/horn-koppe_spring_2k.hdr" },
  { name: "Horn Koppe Spring 2K (Copy)", path: "/textures/horn-koppe_spring_2k (1).hdr" },
  { name: "Kloofendal Clear 4K", path: "/textures/kloofendal_43d_clear_puresky_4k.hdr" },
  { name: "Kloofendal Cloudy 2K", path: "/textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr" },
  { name: "Qwantani Noon 2K", path: "/textures/qwantani_noon_puresky_2k.hdr" },
];

function HDRILoader({ hdriPath, onLoad }: { hdriPath: string; onLoad: (success: boolean, info: string) => void }) {
  const { gl, scene } = useThree();

  useEffect(() => {
    // Configure renderer once
    gl.outputColorSpace = sRGBEncoding;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.9;
  }, [gl]);

  useEffect(() => {
    const startTime = Date.now();
    console.log(`🔄 Loading HDRI: ${hdriPath}`);
    
    const loader = new RGBELoader();
    loader.load(
      hdriPath,
      (texture: Texture) => {
        try {
          texture.mapping = EquirectangularReflectionMapping;
          const pmrem = new PMREMGenerator(gl);
          pmrem.compileEquirectangularShader();
          const { texture: envTexture } = pmrem.fromEquirectangular(texture);
          
          scene.environment = envTexture;
          scene.background = envTexture;
          
          const loadTime = Date.now() - startTime;
          const info = `✅ HDRI loaded: ${texture.image.width}x${texture.image.height} (${loadTime}ms)`;
          console.log(info);
          onLoad(true, info);
          
          texture.dispose();
          pmrem.dispose();
        } catch (error) {
          const errorMsg = `❌ PMREM Error: ${error}`;
          console.error(errorMsg);
          onLoad(false, errorMsg);
        }
      },
      undefined,
      (error) => {
        const errorMsg = `❌ Load Error: ${error}`;
        console.error(errorMsg);
        onLoad(false, errorMsg);
      }
    );
  }, [hdriPath, gl, scene, onLoad]);

  return null;
}

function TestSphere() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial metalness={1} roughness={0} />
    </mesh>
  );
}

function TestGround() {
  return (
    <mesh rotation-x={-Math.PI/2} position={[0, -1.5, 0]}>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial metalness={0.1} roughness={0.7} />
    </mesh>
  );
}

export default function HDRITester() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadStatus, setLoadStatus] = useState<string>("Ready to test");
  const [isLoading, setIsLoading] = useState(false);

  const currentHDRI = HDRI_OPTIONS[currentIndex];

  const handleLoad = (success: boolean, info: string) => {
    setLoadStatus(info);
    setIsLoading(false);
  };

  const switchHDRI = (direction: 'prev' | 'next') => {
    setIsLoading(true);
    if (direction === 'next') {
      setCurrentIndex((prev) => (prev + 1) % HDRI_OPTIONS.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + HDRI_OPTIONS.length) % HDRI_OPTIONS.length);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '14px',
        maxWidth: '400px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>HDRI Tester</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>Current:</strong> {currentHDRI.name}<br/>
          <small style={{ color: '#888' }}>{currentHDRI.path}</small>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={() => switchHDRI('prev')} 
            disabled={isLoading}
            style={{ marginRight: '10px', padding: '8px 16px' }}
          >
            ← Previous
          </button>
          <button 
            onClick={() => switchHDRI('next')} 
            disabled={isLoading}
            style={{ padding: '8px 16px' }}
          >
            Next →
          </button>
        </div>

        <div style={{ 
          padding: '10px', 
          background: 'rgba(255,255,255,0.1)', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Status:</strong><br/>
          {isLoading ? "🔄 Loading..." : loadStatus}
        </div>

        <div style={{ marginTop: '15px', fontSize: '11px', color: '#aaa' }}>
          Index: {currentIndex + 1}/{HDRI_OPTIONS.length}<br/>
          Use browser console for detailed logs
        </div>
      </div>

      {/* 3D Scene */}
      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [3, 2, 3], fov: 45 }}
        style={{ background: '#000' }}
      >
        <HDRILoader hdriPath={currentHDRI.path} onLoad={handleLoad} />
        <TestSphere />
        <TestGround />
        
        {/* Simple lighting fallback */}
        <ambientLight intensity={0.1} />
        <directionalLight position={[5, 5, 5]} intensity={0.5} />
      </Canvas>
    </div>
  );
}
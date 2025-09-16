import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Mesh, Object3D, MeshStandardMaterial, MeshPhysicalMaterial, Material, Color } from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { FALLBACK_UNIT_DATA } from '../App';
import { UnitData, LoadedModel } from '../types';
import { useFilterStore } from '../stores/useFilterStore';
import FresnelMaterial from '../materials/FresnelMaterial';

class UnitWarehouseErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('UnitWarehouse runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <group>{/* UnitWarehouse failed — check console for details */}</group>;
    }
    return this.props.children as any;
  }
}

function HDRIEnvironment() {
  const { scene, gl } = useThree();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      console.log('🌅 Loading HDRI environment...');

      // Set immediate fallback background
      scene.background = new THREE.Color(0x87CEEB);
      
      // Add WebGL context lost/restored handlers
      const canvas = gl.domElement;
      canvas.addEventListener('webglcontextlost', (event) => {
        console.warn('🚫 WebGL context lost, preventing default');
        console.warn('🚫 Context lost reason:', event.statusMessage || 'Unknown');
        event.preventDefault();
        
        // Clean up problematic materials to prevent re-occurrence
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            try {
              const isProblematic = (mat: any) => 
                mat?.name?.toLowerCase().includes('transparents') || 
                mat?.name?.toLowerCase().includes('sidewalk');
              
              if (Array.isArray(child.material)) {
                child.material.forEach((mat, index) => {
                  if (isProblematic(mat)) {
                    console.warn('🧼 Replacing problematic material:', mat.name);
                    child.material[index] = new THREE.MeshBasicMaterial({ color: 0x888888 });
                  }
                });
              } else if (isProblematic(child.material)) {
                console.warn('🧼 Replacing problematic material:', child.material.name);
                child.material = new THREE.MeshBasicMaterial({ color: 0x888888 });
              }
            } catch (error) {
              console.error('⚠️ Error cleaning material:', error);
            }
          }
        });
      });
      
      canvas.addEventListener('webglcontextrestored', () => {
        console.log('✅ WebGL context restored, reloading scene');
        // Clear any existing materials and textures
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            if (child.geometry) {
              child.geometry.dispose();
            }
          }
        });
        // Force garbage collection and restart
        setTimeout(() => window.location.reload(), 100);
      });

      const loader = new RGBELoader();

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadHDRI());
      } else {
        setTimeout(() => loadHDRI(), 100);
      }

      function applyFallbackEnvironment() {
        console.log('🔄 Applying fallback environment...');

        const gradientTexture = new THREE.DataTexture(
          new Uint8Array([
            135, 206, 235, 255, // Sky blue top
            255, 255, 255, 255, // White bottom
          ]),
          1, 2, THREE.RGBAFormat
        );
        gradientTexture.needsUpdate = true;
        gradientTexture.mapping = THREE.EquirectangularReflectionMapping;

        scene.environment = gradientTexture;
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background

        scene.traverse((child: any) => {
          if (child.isMesh && child.material) {
            const processMaterial = (mat: THREE.Material) => {
              // Skip invalid materials only
              if (!mat) {
                console.warn('⚠️ Skipping invalid material:', mat?.name);
                return;
              }
              
              if (mat instanceof THREE.MeshStandardMaterial) {
                // Detect glass materials
                const isLikelyGlass = 
                  mat.name?.toLowerCase().includes('glass') ||
                  child.name?.toLowerCase().includes('glass') ||
                  (mat.transparent && mat.opacity > 0.7 && mat.metalness === 0);

                if (isLikelyGlass) {
                  // Convert to PhysicalMaterial for proper glass rendering
                  const physicalMat = new THREE.MeshPhysicalMaterial({
                    transmission: 0.9,
                    thickness: 0.3,
                    ior: 1.5,
                    roughness: 0.18,
                    metalness: 0.0,
                    envMapIntensity: 0.25, // key: lower for non-blown reflections
                    attenuationColor: new THREE.Color('#eef3f7'), // very light gray-blue
                    attenuationDistance: 3.0,
                    clearcoat: 0.0,
                    side: THREE.FrontSide,
                  });

                  // Copy basic properties from original material
                  physicalMat.name = mat.name;
                  if (mat.map) physicalMat.map = mat.map;
                  if (mat.normalMap) physicalMat.normalMap = mat.normalMap;
                  if (mat.roughnessMap) physicalMat.roughnessMap = mat.roughnessMap;
                  if (mat.metalnessMap) physicalMat.metalnessMap = mat.metalnessMap;
                  
                  // But ensure critical glass params overwrite
                  physicalMat.transmission = 0.9;
                  physicalMat.roughness = 0.18;
                  physicalMat.envMapIntensity = 0.25;
                  physicalMat.ior = 1.5;
                  physicalMat.thickness = 0.3;
                  physicalMat.metalness = 0.0;
                  physicalMat.clearcoat = 0.0;
                  
                  return physicalMat;
                } else {
                  // Non-glass: keep sane reflection levels
                  mat.envMapIntensity = 0.6; // further increased for brighter, less contrasted scene
                  mat.needsUpdate = true;
                  return mat;
                }
              }
              return mat;
            };

            if (Array.isArray(child.material)) {
              child.material = child.material.map(processMaterial);
            } else {
              child.material = processMaterial(child.material);
            }
          }
        });

        setIsLoading(false);
        console.log('✅ Fallback environment applied');
      }

      function loadHDRI() {
        try {
          loader.load(
            `${import.meta.env.BASE_URL}textures/kloofendal_48d_partly_cloudy_puresky_2k.hdr`,
            (texture) => {
              try {
                console.log('✅ HDRI loaded successfully:', texture);
                texture.mapping = THREE.EquirectangularReflectionMapping;

                const pmremGenerator = new THREE.PMREMGenerator(gl);
                pmremGenerator.compileEquirectangularShader();
                const envMap = pmremGenerator.fromEquirectangular(texture).texture;

                texture.dispose();

                scene.environment = envMap;
                scene.background = envMap;

                const materialsToUpdate: THREE.MeshStandardMaterial[] = [];
                scene.traverse((child: any) => {
                  if (child.isMesh && child.material) {
                    if (Array.isArray(child.material)) {
                      child.material.forEach((mat: THREE.Material) => {
                        // Skip invalid materials only
                        if (!mat) {
                          console.warn('⚠️ Skipping invalid material in array:', mat?.name);
                          return;
                        }
                        if (mat instanceof THREE.MeshStandardMaterial) {
                          mat.envMapIntensity = 1.0; // further increased for brighter, less contrasted scene
                          mat.roughness = Math.max(mat.roughness, 0.3); // increase roughness to reduce sharp reflections
                          materialsToUpdate.push(mat);
                        }
                      });
                    } else if (child.material instanceof THREE.MeshStandardMaterial) {
                      // Skip invalid materials only
                      if (!child.material) {
                        console.warn('⚠️ Skipping invalid single material');
                        return;
                      }
                      child.material.envMapIntensity = 1.0; // further increased for brighter, less contrasted scene
                      child.material.roughness = Math.max(child.material.roughness, 0.3); // increase roughness to reduce sharp reflections
                      materialsToUpdate.push(child.material);
                    }
                  }
                });

                materialsToUpdate.forEach(mat => mat.needsUpdate = true);

                pmremGenerator.dispose();

                setIsLoading(false);
                console.log('🌍 HDRI environment (PMREM) applied to scene');

              } catch (e) {
                console.error('Error applying HDRI texture:', e);
                applyFallbackEnvironment();
              } finally {
                setIsLoading(false);
              }
            },
            undefined,
            (error) => {
              console.error('❌ Failed to load HDRI:', error);
              applyFallbackEnvironment();
            }
          );
        } catch (e) {
          console.error('Unexpected error loading HDRI:', e);
          applyFallbackEnvironment();
        }
      }
    } catch (e) {
      console.error('Unexpected error in HDRIEnvironment effect:', e);
      setIsLoading(false);
    }
  }, [scene, gl]);

  return null;
}

function BoundingSphere({ onBoundingSphereData }: { onBoundingSphereData?: (data: {center: THREE.Vector3, radius: number}) => void }) {
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'models/environment/white wall.glb');

  React.useEffect(() => {
    if (scene) {
      console.log('🔵 Bounding sphere loaded:', scene);

      const box = new THREE.Box3().setFromObject(scene);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y, size.z) / 2;

      console.log('📐 Bounding sphere - Center:', center, 'Radius:', radius);

      if (onBoundingSphereData) {
        onBoundingSphereData({ center, radius });
      }

      scene.traverse((child: any) => {
        if (child.isMesh) {
          child.visible = false; 
        }
      });
    }
  }, [scene, onBoundingSphereData]);

  return <primitive object={scene} />;
}

interface UnitWarehouseProps {
  onUnitSelect: (unitName: string) => void;
  onUnitHover: (unitName: string | null) => void;
  selectedUnit: string | null;
  unitData: Record<string, UnitData>;
  filterHoveredUnit?: string | null; 
  onBoundingSphereData?: (data: {center: THREE.Vector3, radius: number}) => void; 
  onLoadingProgress?: (loaded: number, total: number) => void;
  showOnlyEventSpaces?: boolean;
  showOnlyStages?: boolean;
}

const isUnitFile = (fileName:string): boolean => {
  if (fileName.toLowerCase().includes('stage c')) {
    return false;
  }
  return !fileName.startsWith('boxes/');
};

const isBridgeFile = (fileName: string): boolean => {
  return false;
};

const getUnitName = (fileName: string): string => {
  return fileName.replace('.glb', '');
};

const SingleModel: React.FC<{
  fileName: string;
  onLoad: (model: LoadedModel) => void;
  onBoundingSphereData?: (data: {center: THREE.Vector3, radius: number}) => void;
}> = React.memo(({ fileName, onLoad, onBoundingSphereData }) => {
  const baseUrl = import.meta.env.BASE_URL;
  const modelUrl = `${baseUrl}models/${fileName}`;

  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLogged = useRef(false);

  const useDraco = true;

  const { scene, materials } = useGLTF(modelUrl, useDraco);

  if (!scene) {
    console.error('Scene not loaded for:', fileName);
    return null; 
  }

  Object.values(materials).forEach((mat: Material, index: number) => {
    mat.userData.slotIndex = index;
  });

  useEffect(() => {
    if (fileName.startsWith('boxes/')) {
      console.log('📦 Loading box model:', fileName);
    }
  }, []);

  useEffect(() => {
    try {
      if (scene && isLoading) {
        setIsLoading(false);
      }
    } catch (e) {
      console.error('Error in SingleModel load detection effect:', e);
    }
  }, [scene, isLoading]);

  useEffect(() => {
    if (scene && !hasLogged.current) {
      hasLogged.current = true;

      const whiteMaterial = new THREE.MeshStandardMaterial({ color: 'white' });

      const processMaterials = () => {
        const meshesToProcess: THREE.Mesh[] = [];

        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshesToProcess.push(child);
          }
        });

        let processedCount = 0;
        const batchSize = 2; 

        const processBatch = () => {
          const batch = meshesToProcess.slice(processedCount, processedCount + batchSize);

          batch.forEach((child) => {
            if (Array.isArray(child.material)) {
              (child as any).userData.originalMaterial = (child.material as any).map((m: any) =>
                m && typeof m.clone === 'function' ? m.clone() : m
              );
            } else {
              (child as any).userData.originalMaterial = (child.material && typeof (child.material as any).clone === 'function')
                ? (child.material as any).clone()
                : child.material;
            }

            child.castShadow = true;
            child.receiveShadow = true;

            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((mat: THREE.Material, index: number) => {
                  // Skip invalid materials only
                  if (!mat) {
                    console.warn('⚠️ Skipping invalid material in processing:', mat?.name);
                    return;
                  }
                  if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.envMapIntensity = 1.1; // further increased for brighter, less contrasted scene
                    mat.roughness = Math.max(mat.roughness, 0.4); // increase roughness to reduce sharp reflections and contrast
                    mat.metalness = Math.min(mat.metalness, 0.8);
                    mat.needsUpdate = true;

                    child.userData[`originalRoughness_${index}`] = mat.roughness;
                    child.userData[`originalMetalness_${index}`] = mat.metalness;
                    child.userData[`originalColor_${index}`] = mat.color ? mat.color.clone() : null;
                    child.userData.isOptimizable = true;
                  }
                });
              } else if (child.material instanceof THREE.MeshStandardMaterial) {
                // Skip invalid materials only
                if (!child.material) {
                  console.warn('⚠️ Skipping invalid single material in processing');
                  return;
                }
                child.material.envMapIntensity = 1.1; // further increased for brighter, less contrasted scene
                child.material.roughness = Math.max(child.material.roughness, 0.4); // increase roughness to reduce sharp reflections and contrast
                child.material.metalness = Math.min(child.material.metalness, 0.8);
                child.material.needsUpdate = true;

                child.userData.originalRoughness = child.material.roughness;
                child.userData.originalMetalness = child.material.metalness;
                child.userData.originalColor = child.material.color ? child.material.color.clone() : null;
                child.userData.isOptimizable = true;
              }
            }
          });

          processedCount += batchSize;

          if (processedCount < meshesToProcess.length) {
            if ('requestIdleCallback' in window) {
              requestIdleCallback(() => processBatch());
            } else {
              setTimeout(() => processBatch(), 0);
            }
          } else {
            console.log(`✅ Processed ${meshesToProcess.length} meshes for ${fileName}`);
          }
        };

        processBatch();
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => processMaterials());
      } else {
        setTimeout(() => processMaterials(), 0);
      }

      const modelName = getUnitName(fileName);
      scene.name = modelName;

      const isUnit = isUnitFile(fileName);
      const isBridge = isBridgeFile(fileName);

      const consolidatedFiles = new Set([
        'environment/accessory concrete.glb',
        'environment/hq sidewalk 2.glb',
        'environment/roads.glb',
        'environment/stages.glb',
        'environment/transparent buildings.glb',
        'environment/transparents sidewalk.glb',
        'environment/white wall.glb',
        'environment/FRAME 4.glb',
        'environment/roof and walls.glb',
        'environment/maryland street .glb'
      ]);

      const isBoxFile = fileName.startsWith('boxes/');

      if (!consolidatedFiles.has(fileName) && !fileName.startsWith('boxes/')) {
        scene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(scene);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        console.log(`📐 Model bbox center for ${modelName}: (${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}) size: (${size.x.toFixed(2)}, ${size.y.toFixed(2)}, ${size.z.toFixed(2)})`);
        scene.position.set(-center.x, -center.y, -center.z);
        scene.rotation.set(0, 0, 0);
        if ((scene as any).quaternion && typeof (scene as any).quaternion.identity === 'function') {
          (scene as any).quaternion.identity();
        }
        scene.updateMatrixWorld(true);
      } else {
        console.log(`↩️ Preserving original transform for consolidated model: ${fileName}`);
      }

      scene.updateMatrixWorld(true);
      
      const loadedModel: LoadedModel = {
        name: modelName,
        object: scene,
        isUnit,
        isBridge
      };

      if (fileName.toLowerCase().includes('stage c')) {
        const whiteMaterial = new THREE.MeshStandardMaterial({ color: 'white' });
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = whiteMaterial;
          }
        });
      }

      onLoad(loadedModel);
    }
  }, [scene, fileName, onLoad]);

  if (loadError) {
    console.error('Model load error for:', fileName, loadError);
    return null; 
  }

  if (isLoading) {
    return null; 
  }

  return null; 
});

const UnitWarehouseComponent: React.FC<UnitWarehouseProps> = ({
  onUnitSelect,
  onUnitHover,
  selectedUnit,
  unitData,
  filterHoveredUnit,
  onBoundingSphereData,
  onLoadingProgress,
  showOnlyEventSpaces,
  showOnlyStages
}) => {
  const { activeFilter, isUnitActive, activeUnits } = useFilterStore();
  const activeUnitsList = useMemo(() => Array.from(activeUnits), [activeUnits]);

  const activeMaterial = useMemo(() => new FresnelMaterial({
    fresnelColor: '#00d5ff', 
    baseColor: '#0080ff', 
    amount: 1.5, 
    offset: 0.05, 
    intensity: 2.0, 
    fresnelAlpha: 1.0, 
    alpha: false, 
    time: 2.0 
  }), []);

  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#87CEFA'), 
    emissive: new THREE.Color('#87CEFA'),
    emissiveIntensity: 2,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
    metalness: 0.1,
  });

  // Hover material - softer/less intense than selection highlight
  const hoverMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#ADD8E6'), 
    emissive: new THREE.Color('#ADD8E6'),
    emissiveIntensity: 1,
    transparent: true,
    opacity: 0.5,
    roughness: 0.4,
    metalness: 0.1,
  });

  const [modelsLoaded, setModelsLoaded] = useState(false); 
  const groupRef = useRef<THREE.Group>(null);
  const loadedModelsRef = useRef<LoadedModel[]>([]);
  const loadedBoxModelsCollection = useRef<LoadedModel[]>([]);
  const [boxLoadedModels, setBoxLoadedModels] = useState<LoadedModel[]>([]);
  const [boundingSphereData, setBoundingSphereData] = useState<{center: THREE.Vector3, radius: number} | null>(null);
  const [areBoxesLoaded, setAreBoxesLoaded] = useState(false);
  const shadowsComputed = useRef(false);

  const allModels = useMemo(() => [
    'environment/accessory concrete.glb',
    'environment/hq sidewalk 2.glb',
    'environment/roads.glb',
    'environment/stages.glb',
    'environment/transparent buildings.glb',
    'environment/transparents sidewalk.glb',
    'environment/white wall.glb',
    'environment/FRAME 4.glb',
    'environment/roof and walls.glb',
    'environment/maryland street .glb'
  ], []);

  const boxFiles = useMemo(() => {
    const boxFiles = [];
    for (const key in FALLBACK_UNIT_DATA) {
      const unit = FALLBACK_UNIT_DATA[key];
      if (unit.glb && unit.glb.length > 0) {
        boxFiles.push(unit.glb);
      }
    }
    return boxFiles;
  }, []);

  const loadedModels = useMemo(() => loadedModelsRef.current, [loadedModelsRef]);

  const handleModelLoad = useCallback((model: LoadedModel) => {
    loadedModelsRef.current.push(model);
    if (onLoadingProgress) {
      onLoadingProgress(loadedModelsRef.current.length, allModels.length);
      if (loadedModelsRef.current.length === allModels.length) setModelsLoaded(true); 
    }
  }, [onLoadingProgress, allModels.length]);

  const handleBoxModelLoad = useCallback((model: LoadedModel, unitId: string) => {
    let meshCount = 0;
    model.object.traverse((child: Object3D) => {
      if (child instanceof Mesh) {
        meshCount++;
      }
    });

    model.object.traverse((child: Object3D) => {
      if ((child as any).material && !Array.isArray((child as any).material)) {
        (child as any).userData.originalMaterial = (child as any).material;

        const mat = (child as any).material as MeshStandardMaterial;
        (child as any).userData._originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0,0,0);
        (child as any).userData._originalEmissiveIntensity = (mat as any).emissiveIntensity ?? 1.0;
      }
    });

    loadedBoxModelsCollection.current = [...loadedBoxModelsCollection.current, model];

    if (loadedBoxModelsCollection.current.length === boxFiles.length) {
      setBoxLoadedModels(loadedBoxModelsCollection.current);
      console.log('📦✅ All box models loaded and state updated once!');
    }

    if (meshCount === 0) {
      console.warn(`⚠️ Box model ${unitId} has no meshes!`);
    }
  }, [boxFiles.length]);

  // Helper function to check if unit is available in CSV data
  const isUnitAvailable = useCallback((unitName: string): boolean => {
    if (!unitData || Object.keys(unitData).length === 0) {
      // If no CSV data loaded, show all units (fallback behavior)
      return true;
    }
    
    // Extract unit name from full path (e.g., "boxes/First Street Building/First Floor/F-100" -> "F-100")
    const unitNameOnly = unitName.split('/').pop() || unitName;
    const cleanUnitName = unitNameOnly.replace(/\.glb$/i, '');
    
    // Try multiple key formats to find the unit
    const possibleKeys = [
      cleanUnitName.toLowerCase(),
      cleanUnitName,
      `${cleanUnitName.toLowerCase()}.glb`,
      `${cleanUnitName}.glb`,
      cleanUnitName.replace(/\s+/g, ''),
      cleanUnitName.replace(/\s+/g, '').toLowerCase(),
      unitName.toLowerCase(),
      unitName
    ];
    
    for (const key of possibleKeys) {
      const unit = unitData[key];
      if (unit) {
        // Check if status is true (available) 
        const isAvailable = unit.status === true;
        // Uncomment for debugging: console.log(`✅ Unit ${cleanUnitName} found in CSV (key: ${key}) - Available: ${isAvailable}`);
        return isAvailable;
      }
    }
    
    // If unit not found in CSV, hide it (assume unavailable)
    // Uncomment for debugging: console.log(`⚠️ Unit ${cleanUnitName} not found in CSV data - hiding`);
    return false;
  }, [unitData]);

  useEffect(() => {
    const activeUnits = activeUnitsList;

    if (activeUnits.length > 0) {
      console.log('🎯 FILTER ACTIVATED:', activeUnits);
    }

    let activatedCount = 0;
    let hiddenByAvailabilityCount = 0;

    boxLoadedModels.forEach((model) => {
      const shouldBeActive = isUnitActive(model.name);
      const isAvailable = isUnitAvailable(model.name);

      model.object.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          // Unit must BOTH be active in filter AND available in CSV to be visible
          if (shouldBeActive && isAvailable) {
            child.visible = true;
            activatedCount++;

            if (!(child as any).userData.originalMaterial) {
              (child as any).userData.originalMaterial = child.material;
            }

            child.material = activeMaterial;
          } else {
            child.visible = false;
            
            if (!isAvailable) {
              hiddenByAvailabilityCount++;
            }

            if ((child as any).userData.originalMaterial) {
              child.material = (child as any).userData.originalMaterial;
            }
          }
        }
      });
    });

    if (activatedCount > 0) {
      console.log(`✅ ACTIVATED ${activatedCount} meshes`);
    }
    if (hiddenByAvailabilityCount > 0) {
      console.log(`🚫 HIDDEN ${hiddenByAvailabilityCount} unavailable units`);
    }
    if (activeUnits.length > 0 && activatedCount === 0) {
      console.warn(`❌ FILTER SET but NO MESHES ACTIVATED! Available models:`, boxLoadedModels.map(m => m.name));
    }
  }, [activeFilter, boxLoadedModels, activeUnitsList, isUnitActive, isUnitAvailable, activeMaterial]);

  useEffect(() => {
    boxLoadedModels.forEach(model => {
      model.object.traverse((child: Object3D) => {
        if (child instanceof Mesh && (child as any).userData.originalMaterial) {
          child.material = (child as any).userData.originalMaterial;
        }
      });
    });

    if (!selectedUnit) {
      return; 
    }

    // Only show selection highlight if unit is available
    const isAvailable = isUnitAvailable(selectedUnit);
    if (!isAvailable) {
      console.log(`🚫 Cannot highlight unavailable unit: ${selectedUnit}`);
      return;
    }

    const target = boxLoadedModels.find(m => m.name === selectedUnit);

    if (target) {
      target.object.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          if (!(child as any).userData.originalMaterial) {
            (child as any).userData.originalMaterial = child.material;
          }
          child.material = highlightMaterial;
        }
      });
    }
  }, [selectedUnit, boxLoadedModels, highlightMaterial, isUnitAvailable]);

  // Hover highlighting effect (separate from selection)
  useEffect(() => {
    // Reset all hover materials first
    boxLoadedModels.forEach(model => {
      model.object.traverse((child: Object3D) => {
        if (child instanceof Mesh) {
          // Only reset hover material if it's not the selected unit
          if (model.name !== selectedUnit) {
            const originalMaterial = (child as any).userData.originalMaterial;
            if (originalMaterial && child.material === hoverMaterial) {
              child.material = originalMaterial;
            }
          }
        }
      });
    });

    // Apply hover material if there's a hovered unit AND it's available
    if (filterHoveredUnit && filterHoveredUnit !== selectedUnit) {
      const isAvailable = isUnitAvailable(filterHoveredUnit);
      
      if (!isAvailable) {
        console.log(`🚫 Cannot hover unavailable unit: ${filterHoveredUnit}`);
        return;
      }

      const target = boxLoadedModels.find(m => m.name === filterHoveredUnit);
      
      if (target) {
        target.object.traverse((child: Object3D) => {
          if (child instanceof Mesh) {
            if (!(child as any).userData.originalMaterial) {
              (child as any).userData.originalMaterial = child.material;
            }
            child.material = hoverMaterial;
          }
        });
      }
    }
  }, [filterHoveredUnit, selectedUnit, boxLoadedModels, hoverMaterial, isUnitAvailable]);

  useEffect(() => {
    if (onBoundingSphereData && boundingSphereData) {
      onBoundingSphereData(boundingSphereData);
    }
  }, [boundingSphereData, onBoundingSphereData]);

  useEffect(() => {
    if (modelsLoaded && !areBoxesLoaded) {
      console.log('📦 Main models loaded, now loading boxes...');
      setAreBoxesLoaded(true);
    }
  }, [modelsLoaded, areBoxesLoaded]);

  const frameCounter = useRef(0);

  useFrame((state) => {
    frameCounter.current++;

    if (activeMaterial && typeof activeMaterial.update === 'function') {
      activeMaterial.update();
    }

    if (frameCounter.current % 3 !== 0) return;

    if (false && boundingSphereData && loadedModels.length > 0) {
      const cameraPosition = state.camera.position;

      loadedModels.forEach((model) => {
        model.object.traverse((child: Object3D) => {
          if (child instanceof Mesh && child.userData.isOptimizable && child.material instanceof THREE.MeshStandardMaterial) {
            const objectPosition = new THREE.Vector3();
            child.getWorldPosition(objectPosition);
            const distanceFromSphereCenter = objectPosition.distanceTo(boundingSphereData!.center);
            const normalizedSphereDistance = distanceFromSphereCenter / boundingSphereData!.radius;

            if (normalizedSphereDistance > 0.5) {
              const fadeAmount = Math.min((normalizedSphereDistance - 0.5) / 0.4, 1.0);

              if (child.material.color) {
                const originalColor = child.userData.originalColor || child.material.color.clone();
                child.userData.originalColor = originalColor;
                const whiteColor = new THREE.Color(1, 1, 1);
                const colorFadeAmount = Math.pow(fadeAmount, 0.5);
                child.material.color.lerpColors(originalColor, whiteColor, colorFadeAmount * 0.95);
              }

              if (normalizedSphereDistance > 0.7) {
                const opacityFade = Math.max(1.0 - (normalizedSphereDistance - 0.7) * 3.0, 0.1);
                child.material.opacity = opacityFade;
                child.material.transparent = true;
              }

              child.material.roughness = Math.min(child.userData.originalRoughness + fadeAmount * 0.8, 1.0);
              child.material.metalness = Math.max(child.userData.originalMetalness - fadeAmount * 0.6, 0.0);
              child.castShadow = false;

            } else {
              child.material.roughness = child.userData.originalRoughness;
              child.material.metalness = child.userData.originalMetalness;
              child.material.opacity = 1.0;
              child.material.transparent = false;

              if (child.userData.originalColor && child.material.color) {
                child.material.color.copy(child.userData.originalColor);
              }

              child.castShadow = true;
              child.receiveShadow = true;
            }

            child.material.needsUpdate = true;
          }
        });
      });
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <HDRIEnvironment />
      <BoundingSphere onBoundingSphereData={setBoundingSphereData} />
      {allModels.map((fileName, index) => (
        <SingleModel
          key={fileName}
          fileName={fileName}
          onLoad={handleModelLoad}
        />
      ))}
      {areBoxesLoaded && (() => {
        console.log('📦✅ Boxes are loaded, now rendering...');
        try {
          if (!boxFiles || boxFiles.length === 0) {
            console.log('No box files to render.');
            return null;
          }

          console.log(`📦 Rendering ${boxFiles.length} box models...`);

          return boxFiles.map((boxPath) => (
            <SingleModel
              key={boxPath}
              fileName={boxPath}
              onLoad={(model) => handleBoxModelLoad(model, boxPath)}
            />
          ));
        } catch (error) {
          console.error('Error rendering box models:', error);
          return null; 
        }
      })()}
      {boxLoadedModels.map((model) => (
        <primitive key={`box-${model.name}`} object={model.object} />
      ))}
      {loadedModels.map((model) => (
        <primitive key={model.name} object={model.object} />
      ))}
    </group>
  );
};

export const UnitWarehouse: React.FC<UnitWarehouseProps> = (props) => {
  return (
    <UnitWarehouseErrorBoundary>
      <UnitWarehouseComponent {...props} />
    </UnitWarehouseErrorBoundary>
  );
};

export default UnitWarehouse;
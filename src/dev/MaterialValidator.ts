import * as THREE from 'three';

interface ValidationStats {
  materialsChecked: number;
  badMapsRemoved: number;
  nanValuesFixed: number;
  transparentFixed: number;
}

export class MaterialValidator {
  private static instance: MaterialValidator;
  private stats: ValidationStats = {
    materialsChecked: 0,
    badMapsRemoved: 0,
    nanValuesFixed: 0,
    transparentFixed: 0
  };

  static getInstance(): MaterialValidator {
    if (!MaterialValidator.instance) {
      MaterialValidator.instance = new MaterialValidator();
    }
    return MaterialValidator.instance;
  }

  validateScene(scene: THREE.Scene): ValidationStats {
    this.resetStats();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(mat => this.validateMaterial(mat));
        } else {
          this.validateMaterial(object.material);
        }
      }
    });

    console.log(`🧪 MaterialValidator normalized: ${this.stats.materialsChecked} materials, removed ${this.stats.badMapsRemoved} bad maps`);
    return { ...this.stats };
  }

  private resetStats(): void {
    this.stats = {
      materialsChecked: 0,
      badMapsRemoved: 0,
      nanValuesFixed: 0,
      transparentFixed: 0
    };
  }

  private validateMaterial(material: THREE.Material): void {
    if (!(material instanceof THREE.MeshStandardMaterial || 
          material instanceof THREE.MeshPhysicalMaterial)) {
      return;
    }

    this.stats.materialsChecked++;

    // Fix NaN values
    this.fixNaNValues(material);

    // Fix transparency settings
    this.fixTransparencySettings(material);

    // Validate and fix textures
    this.validateTextures(material);

    // Set precision
    if (!material.precision) {
      material.precision = 'highp';
    }

    // Force material update
    material.needsUpdate = true;
  }

  private fixNaNValues(material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial): void {
    const props = ['metalness', 'roughness', 'opacity', 'refractionRatio'];
    let hasNaN = false;

    props.forEach(prop => {
      const value = (material as any)[prop];
      if (typeof value === 'number' && !isFinite(value)) {
        const defaultValue = this.getDefaultValue(prop);
        (material as any)[prop] = defaultValue;
        hasNaN = true;
      }
    });

    if (hasNaN) {
      this.stats.nanValuesFixed++;
    }
  }

  private getDefaultValue(prop: string): number {
    const defaults: Record<string, number> = {
      metalness: 0.0,
      roughness: 1.0,
      opacity: 1.0,
      refractionRatio: 0.98
    };
    return defaults[prop] || 0.0;
  }

  private fixTransparencySettings(material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial): void {
    if (material.transparent === true) {
      material.depthWrite = false;
      
      if (material.alphaMap && material.alphaTest === 0) {
        material.alphaTest = 0.001;
      }
      
      if (material.blending !== THREE.NormalBlending) {
        material.blending = THREE.NormalBlending;
      }
      
      this.stats.transparentFixed++;
    }
  }

  private validateTextures(material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial): void {
    const textureProps = [
      'map', 'normalMap', 'roughnessMap', 'metalnessMap', 
      'aoMap', 'emissiveMap', 'alphaMap', 'displacementMap'
    ];

    textureProps.forEach(prop => {
      const texture = (material as any)[prop] as THREE.Texture;
      if (texture instanceof THREE.Texture) {
        if (!this.isValidTexture(texture)) {
          (material as any)[prop] = null;
          this.stats.badMapsRemoved++;
          console.warn(`🚨 Removed invalid texture from ${material.name || 'unnamed material'}.${prop}`);
        } else {
          this.setTextureColorSpace(texture, prop);
        }
      }
    });
  }

  private isValidTexture(texture: THREE.Texture): boolean {
    if (!texture.image) return false;
    
    const image = texture.image;
    if (!image.width || !image.height || image.width === 0 || image.height === 0) {
      return false;
    }
    
    return true;
  }

  private setTextureColorSpace(texture: THREE.Texture, prop: string): void {
    // Color textures should be sRGB, others linear
    const sRGBTextures = ['map', 'emissiveMap'];
    texture.colorSpace = sRGBTextures.includes(prop) 
      ? THREE.SRGBColorSpace 
      : THREE.LinearSRGBColorSpace;
  }

  setupErrorHandling(renderer: THREE.WebGLRenderer): void {
    // Listen for shader compilation errors
    const originalCompile = renderer.compile;
    renderer.compile = function(scene: THREE.Scene, camera: THREE.Camera) {
      try {
        return originalCompile.call(this, scene, camera);
      } catch (error) {
        console.error('🚨 Shader compilation failed:', error);
        return originalCompile.call(this, scene, camera);
      }
    };

    // Monitor WebGL context
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', (event) => {
      console.error('🚨 WebGL context lost:', event);
      event.preventDefault();
    });

    canvas.addEventListener('webglcontextrestored', () => {
      console.log('✅ WebGL context restored');
    });
  }

  logShaderDefines(material: THREE.Material): void {
    if (material instanceof THREE.ShaderMaterial || 
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial) {
      
      console.group(`🔍 Shader defines for ${material.name || material.type}:`);
      
      // Log common defines that might cause issues
      const defines = (material as any).defines || {};
      const importantDefines = [
        'USE_MAP', 'USE_NORMALMAP', 'USE_UV', 'USE_ROUGHNESSMAP',
        'USE_METALNESSMAP', 'USE_ALPHAMAP', 'USE_AOMAP', 'USE_EMISSIVEMAP'
      ];
      
      importantDefines.forEach(define => {
        if (defines[define] !== undefined) {
          console.log(`  ${define}: ${defines[define]}`);
        }
      });
      
      console.log(`  Precision: ${(material as any).precision || 'default'}`);
      console.groupEnd();
    }
  }
}

// Global validation function for easy use
export function validateAllMaterials(scene: THREE.Scene): ValidationStats {
  return MaterialValidator.getInstance().validateScene(scene);
}

// Setup renderer safety settings
export function setupRendererSafety(renderer: THREE.WebGLRenderer): void {
  const validator = MaterialValidator.getInstance();
  validator.setupErrorHandling(renderer);
  
  // Limit anisotropy globally
  const maxAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
  renderer.capabilities.getMaxAnisotropy = () => maxAnisotropy;
  
  // Shadow map settings
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  console.log(`🔧 Renderer safety setup: maxAnisotropy=${maxAnisotropy}, shadowType=PCFSoft`);
}
import * as THREE from 'three';

interface DuplicateEntry {
  key: string;
  objects: THREE.Object3D[];
  positions: string[];
  names: string[];
  glbHints: string[];
  aabb?: THREE.Box3;
}

interface CoplanarEntry {
  objects: THREE.Object3D[];
  iou: number;
  description: string;
}

export interface AuditResults {
  duplicates: DuplicateEntry[];
  coplanars: CoplanarEntry[];
  totalObjects: number;
  duplicateCount: number;
  coplanarCount: number;
}

export class DuplicateAudit {
  private static instance: DuplicateAudit;
  private hiddenObjects: Set<THREE.Object3D> = new Set();

  static getInstance(): DuplicateAudit {
    if (!DuplicateAudit.instance) {
      DuplicateAudit.instance = new DuplicateAudit();
    }
    return DuplicateAudit.instance;
  }

  runDuplicateAudit(scene: THREE.Scene): AuditResults {
    const meshes: THREE.Mesh[] = [];
    const duplicateMap = new Map<string, THREE.Object3D[]>();
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry && object.material) {
        meshes.push(object);
        
        const key = this.generateKey(object);
        if (!duplicateMap.has(key)) {
          duplicateMap.set(key, []);
        }
        duplicateMap.get(key)!.push(object);
      }
    });

    // Find duplicates (same key, multiple objects)
    const duplicates: DuplicateEntry[] = [];
    duplicateMap.forEach((objects, key) => {
      if (objects.length > 1) {
        duplicates.push({
          key,
          objects,
          positions: objects.map(obj => this.formatPosition(obj.position)),
          names: objects.map(obj => obj.name || 'unnamed'),
          glbHints: objects.map(obj => this.extractGLBHint(obj)),
          aabb: this.calculateCombinedAABB(objects)
        });
      }
    });

    // Find coplanars (high IoU overlap)
    const coplanars = this.findCoplanarObjects(meshes);

    const results: AuditResults = {
      duplicates,
      coplanars,
      totalObjects: meshes.length,
      duplicateCount: duplicates.reduce((sum, entry) => sum + entry.objects.length, 0),
      coplanarCount: coplanars.reduce((sum, entry) => sum + entry.objects.length, 0)
    };

    this.printAuditResults(results);
    return results;
  }

  private generateKey(object: THREE.Mesh): string {
    const geometry = object.geometry;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    
    // Create key from geometry + material + rounded world matrix
    const geometryKey = geometry.uuid;
    const materialKey = material ? material.uuid : 'no-material';
    
    // Round world matrix to 3 decimals to catch near-duplicates
    const matrix = object.matrixWorld;
    const matrixKey = Array.from(matrix.elements)
      .map(val => Math.round(val * 1000) / 1000)
      .join(',');
    
    return `${geometryKey}_${materialKey}_${matrixKey}`;
  }

  private formatPosition(position: THREE.Vector3): string {
    return `(${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`;
  }

  private extractGLBHint(object: THREE.Object3D): string {
    // Try to extract GLB file hint from object hierarchy
    let current: THREE.Object3D | null = object;
    while (current) {
      if (current.name && current.name.includes('.glb')) {
        return current.name;
      }
      if (current.userData && current.userData.originalFile) {
        return current.userData.originalFile;
      }
      current = current.parent;
    }
    
    // Check for common GLB patterns in names
    if (object.name) {
      if (object.name.toLowerCase().includes('building')) {
        return 'buildings GLB';
      }
      if (object.name.toLowerCase().includes('palm')) {
        return 'palm tree GLB';
      }
      if (object.name.toLowerCase().includes('transparent')) {
        return 'transparent assets GLB';
      }
    }
    
    return 'unknown GLB';
  }

  private calculateCombinedAABB(objects: THREE.Object3D[]): THREE.Box3 {
    const box = new THREE.Box3();
    objects.forEach(obj => {
      const objBox = new THREE.Box3().setFromObject(obj);
      box.union(objBox);
    });
    return box;
  }

  private findCoplanarObjects(meshes: THREE.Mesh[]): CoplanarEntry[] {
    const coplanars: CoplanarEntry[] = [];
    const processed = new Set<THREE.Mesh>();

    for (let i = 0; i < meshes.length; i++) {
      if (processed.has(meshes[i])) continue;
      
      const meshA = meshes[i];
      const aabbA = new THREE.Box3().setFromObject(meshA);
      
      for (let j = i + 1; j < meshes.length; j++) {
        if (processed.has(meshes[j])) continue;
        
        const meshB = meshes[j];
        const aabbB = new THREE.Box3().setFromObject(meshB);
        
        const iou = this.calculateIoU(aabbA, aabbB);
        if (iou > 0.95) {
          coplanars.push({
            objects: [meshA, meshB],
            iou,
            description: `${meshA.name || 'unnamed'} & ${meshB.name || 'unnamed'} (IoU: ${iou.toFixed(3)})`
          });
          processed.add(meshA);
          processed.add(meshB);
        }
      }
    }

    return coplanars;
  }

  private calculateIoU(boxA: THREE.Box3, boxB: THREE.Box3): number {
    const intersection = boxA.clone().intersect(boxB);
    if (intersection.isEmpty()) return 0;

    const intersectionVolume = intersection.getSize(new THREE.Vector3()).length();
    const unionVolume = boxA.getSize(new THREE.Vector3()).length() + 
                       boxB.getSize(new THREE.Vector3()).length() - 
                       intersectionVolume;

    return intersectionVolume / unionVolume;
  }

  private printAuditResults(results: AuditResults): void {
    console.group('🔍 Duplicate & Coplanar Audit Results');
    
    console.log(`📊 Total objects: ${results.totalObjects}`);
    console.log(`🔄 Duplicates found: ${results.duplicates.length} groups (${results.duplicateCount} objects)`);
    console.log(`📐 Coplanars found: ${results.coplanars.length} pairs (${results.coplanarCount} objects)`);
    
    if (results.duplicates.length > 0) {
      console.group('🔄 Duplicate Groups:');
      results.duplicates.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.objects.length} objects at positions: ${entry.positions.join(', ')}`);
        console.log(`   Names: ${entry.names.join(', ')}`);
        console.log(`   GLB hints: ${[...new Set(entry.glbHints)].join(', ')}`);
      });
      console.groupEnd();
    }
    
    if (results.coplanars.length > 0) {
      console.group('📐 Coplanar Objects:');
      results.coplanars.forEach((entry, index) => {
        console.log(`${index + 1}. ${entry.description}`);
      });
      console.groupEnd();
    }
    
    console.groupEnd();
  }

  toggleTopOffenders(results: AuditResults, count: number = 3): number {
    let hiddenCount = 0;
    
    // Sort duplicates by object count (most problematic first)
    const sortedDuplicates = results.duplicates
      .sort((a, b) => b.objects.length - a.objects.length)
      .slice(0, count);
    
    sortedDuplicates.forEach(entry => {
      // Hide all but the first object in each duplicate group
      for (let i = 1; i < entry.objects.length; i++) {
        const obj = entry.objects[i];
        if (!this.hiddenObjects.has(obj)) {
          obj.visible = false;
          this.hiddenObjects.add(obj);
          hiddenCount++;
        }
      }
    });
    
    console.log(`🙈 Toggled visibility of ${hiddenCount} duplicate objects for A/B testing`);
    return hiddenCount;
  }

  restoreHiddenObjects(): number {
    let restoredCount = 0;
    this.hiddenObjects.forEach(obj => {
      obj.visible = true;
      restoredCount++;
    });
    this.hiddenObjects.clear();
    
    console.log(`👁️ Restored visibility of ${restoredCount} objects`);
    return restoredCount;
  }
}

// Global function for easy access
export function runDuplicateAudit(scene: THREE.Scene): AuditResults {
  return DuplicateAudit.getInstance().runDuplicateAudit(scene);
}
import { useState, useEffect } from 'react';

// Types
export interface FloorplanMapping {
  [unitName: string]: string;
}

export function useFloorplanMapping() {
  const [mapping, setMapping] = useState<FloorplanMapping>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMapping = async () => {
      try {
        const response = await fetch('/floorplans/unit-floorplan-mapping.json');
        if (!response.ok) {
          throw new Error('Failed to load floorplan mapping');
        }
        const data = await response.json();
        setMapping(data);
        setError(null);
      } catch (err) {
        console.error('Error loading floorplan mapping:', err);
        
        // Fallback mapping if file doesn't exist yet
        const fallbackMapping: FloorplanMapping = {
          'F-100': '/floorplans/f100.jpg',
          'F-105': '/floorplans/f105.jpg',
          'F-110 CR': '/floorplans/f110.jpg',
          'F-115': '/floorplans/f115.jpg',
          'F-140': '/floorplans/f140.jpg',
          'F-150': '/floorplans/f150.jpg',
          'F-160': '/floorplans/f160.jpg',
          'F-170': '/floorplans/f170.jpg',
          'F-175': '/floorplans/f175.jpg',
          'F-180': '/floorplans/f180.jpg',
          'F-200': '/floorplans/f200.jpg',
          'F-240': '/floorplans/f240.jpg',
          'F-250': '/floorplans/f250.jpg',
          'F-280': '/floorplans/f280.jpg',
          'F-290': '/floorplans/f290.jpg',
          'M-120': '/floorplans/m120.jpg',
          'M-130': '/floorplans/m130.jpg',
          'M-140': '/floorplans/m140.jpg',
          'M-150': '/floorplans/m150.jpg',
          'M-160': '/floorplans/m160.jpg',
          'T-100': '/floorplans/t100.jpg',
          'T-110': '/floorplans/t110.jpg',
          'T-200': '/floorplans/t200.jpg',
          'T-210': '/floorplans/t210.jpg',
          'T-220': '/floorplans/t220.jpg',
          'Stage A': '/floorplans/stage-a.jpg',
          'Stage B': '/floorplans/stage-b.jpg',
          'Stage C': '/floorplans/stage-c.jpg',
          'Stage D': '/floorplans/stage-d.jpg',
          'Stage E': '/floorplans/stage-e.jpg',
          'Stage F': '/floorplans/stage-f.jpg',
          'Stage 7': '/floorplans/stage-7.jpg',
          'Stage 8': '/floorplans/stage-8.jpg',
          'C-100': '/floorplans/chicago-floor-1.jpg',
          'C-110': '/floorplans/chicago-floor-1.jpg',
          'C-115': '/floorplans/chicago-floor-1.jpg',
          'C-200': '/floorplans/chicago-floor-2.jpg',
          'C-210': '/floorplans/chicago-floor-2.jpg'
        };
        setMapping(fallbackMapping);
        setError('Using fallback mapping');
      } finally {
        setLoading(false);
      }
    };

    loadMapping();
  }, []);

  // Helper function to get floorplan URL for a unit
  const getFloorplanUrl = (unitName: string): string | null => {
    if (!unitName) return null;
    
    // Try exact match first
    if (mapping[unitName]) {
      return mapping[unitName];
    }
    
    // Try with different variations
    const variations = [
      unitName,
      unitName.toUpperCase(),
      unitName.toLowerCase(),
      unitName.replace(/\s+/g, '-'),
      unitName.replace(/-/g, ''),
      unitName.replace(/\s+/g, '')
    ];
    
    for (const variant of variations) {
      if (mapping[variant]) {
        return mapping[variant];
      }
    }
    
    // Default floorplan if none found
    return '/floorplans/default-floorplan.jpg';
  };

  return {
    mapping,
    loading,
    error,
    getFloorplanUrl
  };
}
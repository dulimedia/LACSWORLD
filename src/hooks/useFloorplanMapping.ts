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
        const response = await fetch(import.meta.env.BASE_URL + 'floorplans/unit-floorplan-mapping.json');
        if (!response.ok) {
          throw new Error('Failed to load floorplan mapping');
        }
        const data = await response.json();
        setMapping(data);
        setError(null);
      } catch (err) {
        console.error('Error loading floorplan mapping:', err);
        
        // Fallback mapping if file doesn't exist yet - using proper base URL
        const baseUrl = import.meta.env.BASE_URL;
        const fallbackMapping: FloorplanMapping = {
          'F-100': baseUrl + 'floorplans/f100.jpg',
          'F-105': baseUrl + 'floorplans/f105.jpg',
          'F-110 CR': baseUrl + 'floorplans/f110.jpg',
          'F-115': baseUrl + 'floorplans/f115.jpg',
          'F-140': baseUrl + 'floorplans/f140.jpg',
          'F-150': baseUrl + 'floorplans/f150.jpg',
          'F-160': baseUrl + 'floorplans/f160.jpg',
          'F-170': baseUrl + 'floorplans/f170.jpg',
          'F-175': baseUrl + 'floorplans/f175.jpg',
          'F-180': baseUrl + 'floorplans/f180.jpg',
          'F-200': baseUrl + 'floorplans/f200.jpg',
          'F-240': baseUrl + 'floorplans/f240.jpg',
          'F-250': baseUrl + 'floorplans/f250.jpg',
          'F-280': baseUrl + 'floorplans/f280.jpg',
          'F-290': baseUrl + 'floorplans/f290.jpg',
          'M-120': baseUrl + 'floorplans/m120.jpg',
          'M-130': baseUrl + 'floorplans/m130.jpg',
          'M-140': baseUrl + 'floorplans/m140.jpg',
          'M-150': baseUrl + 'floorplans/m150.jpg',
          'M-160': baseUrl + 'floorplans/m160.jpg',
          'T-100': baseUrl + 'floorplans/t100.jpg',
          'T-110': baseUrl + 'floorplans/t110.jpg',
          'T-200': baseUrl + 'floorplans/t200.jpg',
          'T-210': baseUrl + 'floorplans/t210.jpg',
          'T-220': baseUrl + 'floorplans/t220.jpg',
          'Stage A': baseUrl + 'floorplans/stage-a.jpg',
          'Stage B': baseUrl + 'floorplans/stage-b.jpg',
          'Stage C': baseUrl + 'floorplans/stage-c.jpg',
          'Stage D': baseUrl + 'floorplans/stage-d.jpg',
          'Stage E': baseUrl + 'floorplans/stage-e.jpg',
          'Stage F': baseUrl + 'floorplans/stage-f.jpg',
          'Stage 7': baseUrl + 'floorplans/stage-7.jpg',
          'Stage 8': baseUrl + 'floorplans/stage-8.jpg',
          'C-100': baseUrl + 'floorplans/chicago-floor-1.jpg',
          'C-110': baseUrl + 'floorplans/chicago-floor-1.jpg',
          'C-115': baseUrl + 'floorplans/chicago-floor-1.jpg',
          'C-200': baseUrl + 'floorplans/chicago-floor-2.jpg',
          'C-210': baseUrl + 'floorplans/chicago-floor-2.jpg'
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
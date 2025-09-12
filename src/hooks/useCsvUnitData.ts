import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { UnitData } from '../types';

// Debounce function to prevent rapid refetching
function debounce(func: (...args: any[]) => void, delay: number) {
  let timeoutId: NodeJS.Timeout;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}

export function useCsvUnitData(url: string = '/unit-data.csv') {
  const [data, setData] = useState<Record<string, UnitData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Skip cache busting for Google Sheets URLs to avoid redirect issues
      const isGoogleSheets = url.includes('docs.google.com');
      let finalUrl = url;
      
      if (!isGoogleSheets) {
        const separator = url.includes('?') ? '&' : '?';
        const cacheBuster = `${separator}v=${Math.random()}&t=${Date.now()}`;
        finalUrl = url + cacheBuster;
      }
      
      console.log('🌐 CSV URL Debug - Original URL:', url);
      console.log('🌐 CSV URL Debug - Is Google Sheets:', isGoogleSheets);
      console.log('🌐 CSV URL Debug - Final URL:', finalUrl);
      const response = await fetch(finalUrl, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const unitData: Record<string, UnitData> = {};
          // Ensure results.data is an array before processing
          if (Array.isArray(results.data)) {
            results.data.forEach((row: any) => {
              const unitName = row.Product?.trim();
              const unitNameLower = unitName?.toLowerCase();
              
              // Include all units regardless of availability status
              if (unitName) {
                // Store with multiple possible keys for better matching
                const floorplanUrl = row['Floorplan'] || row['Column 1'];
                const unitDataEntry = {
                  name: row.Product,
                  availability: row.Available,
                  size: row.Size,
                  floorPlanUrl: floorplanUrl,
                  floorplan_url: floorplanUrl, // Ensure both naming conventions work
                  // Map additional fields for the app
                  unit_name: row.Product,
                  unit_key: unitNameLower,
                  building: row.Building,
                  floor: row.Floor || '',
                  area_sqft: parseInt(row.Size) || 0,
                  status: row.Available,
                  unit_type: row.Unit_Type || 'Commercial',
                  kitchen_size: row.Kitchen_Size || 'None'
                };
                
                // Debug logging for units that should have kitchens
                if (unitName === 'M-150' || unitName === 'M-140' || unitName === 'F-100' || unitName === 'T-320') {
                  console.log('🍳 CSV Debug for', unitName, ':', {
                    kitchen_size_raw: row.Kitchen_Size,
                    kitchen_size_final: unitDataEntry.kitchen_size,
                    full_row: row
                  });
                }
                
                
                // Store with multiple key formats for flexible matching
                unitData[unitNameLower] = unitDataEntry; // e.g., "f-100"
                unitData[unitName] = unitDataEntry; // e.g., "F-100"
                unitData[`${unitNameLower}.glb`] = unitDataEntry; // e.g., "f-100.glb"
                unitData[`${unitName}.glb`] = unitDataEntry; // e.g., "F-100.glb"
                
                // Also store with space variations for units like "F-110 CR"
                const unitNameNoSpace = unitName.replace(/\s+/g, '');
                unitData[unitNameNoSpace.toLowerCase()] = unitDataEntry;
                unitData[`${unitNameNoSpace.toLowerCase()}.glb`] = unitDataEntry;
              }
            });
          }
          setData(unitData);
        },
        error: (err: any) => {
          setError(err.message);
        },
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debouncedFetch = debounce(fetchData, 500);
    debouncedFetch();
  }, [url]);

  return { data, loading, error };
}
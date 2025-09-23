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
    console.log('🔍 [CSV Debug] Starting data fetch...');
    console.log('🔍 [CSV Debug] Original URL:', url);
    setLoading(true);
    setError(null);
    try {
      // Skip cache busting for Google Sheets URLs to avoid redirect issues
      const isGoogleSheets = url.includes('docs.google.com');
      console.log('🔍 [CSV Debug] Is Google Sheets:', isGoogleSheets);
      let finalUrl = url;
      
      if (!isGoogleSheets) {
        const separator = url.includes('?') ? '&' : '?';
        const cacheBuster = `${separator}v=${Math.random()}&t=${Date.now()}`;
        finalUrl = url + cacheBuster;
        console.log('🔍 [CSV Debug] Added cache buster');
      }
      
      console.log('🔍 [CSV Debug] Final URL:', finalUrl);
      
      const response = await fetch(finalUrl, { 
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      
      console.log('🔍 [CSV Debug] Response status:', response.status);
      console.log('🔍 [CSV Debug] Response ok:', response.ok);
      console.log('🔍 [CSV Debug] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorMsg = `HTTP error! status: ${response.status}`;
        console.error('🔍 [CSV Debug] Fetch failed:', errorMsg);
        throw new Error(errorMsg);
      }
      const csvText = await response.text();
      console.log('🔍 [CSV Debug] CSV text length:', csvText.length);
      console.log('🔍 [CSV Debug] CSV preview:', csvText.substring(0, 200));
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          console.log('🔍 [CSV Debug] Parse results:', results);
          console.log('🔍 [CSV Debug] Number of rows:', results.data.length);
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
                // Convert availability to boolean - handle 1/0 numeric values
                const isAvailable = row.Available === '1' || row.Available === 1;
                
                const unitDataEntry = {
                  name: row.Product,
                  availability: isAvailable,
                  size: row.Size_RSF || row.Size,
                  floorPlanUrl: floorplanUrl,
                  floorplan_url: floorplanUrl, // Ensure both naming conventions work
                  // Map additional fields for the app
                  unit_name: row.Product,
                  unit_key: unitNameLower,
                  building: row.Building,
                  floor: row.Floor || '',
                  area_sqft: (() => {
                    const rawSize = row.Size_RSF || row.Size || '';
                    const cleanSize = rawSize.replace(/[,\s]/g, '').replace(/RSF/gi, '').replace(/[A-Za-z]/g, '');
                    const parsed = parseInt(cleanSize);
                    return parsed > 0 ? parsed : undefined;
                  })(),
                  status: isAvailable,
                  unit_type: row.Unit_Type || 'Commercial',
                  kitchen_size: row.Kitchen_Size || 'None',
                  height: row.Height || ''
                };
                
                
                
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
          console.log('🔍 [CSV Debug] Processed unit data keys:', Object.keys(unitData));
          console.log('🔍 [CSV Debug] Total units processed:', Object.keys(unitData).length);
          setData(unitData);
          console.log('✅ [CSV Debug] Data loading completed successfully');
        },
        error: (err: any) => {
          console.error('🔍 [CSV Debug] Papa parse error:', err);
          setError(err.message);
        },
      });
    } catch (e: any) {
      console.error('🔍 [CSV Debug] Fetch error:', e);
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
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CSV_PATH = path.join(__dirname, '..', 'public', 'unit-data.csv');
const FLOORPLANS_DIR = path.join(__dirname, '..', 'public', 'floorplans');

// Tower Building floor mapping - based on unit ranges
const TOWER_FLOOR_MAPPING = {
  // Floor 1: T-100 to T-199
  'T-100': 't-1floor.jpg',
  'T-110': 't-1floor.jpg',
  
  // Floor 2: T-200 to T-299  
  'T-200': 't-2floor.jpg', // Has individual plan, but could fallback to floor
  'T-210': 't-2floor.jpg', // Has individual plan
  'T-220': 't-2floor.jpg', // Has individual plan
  'T-230': 't-2floor.jpg',
  
  // Floor 3: T-300 to T-399
  'T-300': 't-3floor.jpg',
  'T-320': 't-3floor.jpg',
  
  // Floor 4: T-400 to T-499
  'T-400': 't-4floor.jpg',
  'T-410': 't-4floor.jpg',
  'T-420': 't-4floor.jpg',
  'T-430': 't-4floor.jpg',
  'T-450': 't-4floor.jpg',
  
  // Floor 5: T-500 to T-599
  'T-500': 't-5floor.jpg',
  'T-530': 't-5floor.jpg',
  'T-550': 't-5floor.jpg',
  
  // Floor 6: T-600 to T-699
  'T-600': 't-6floor.jpg',
  
  // Floor 7: T-700 to T-799
  'T-700': 't-7floor.jpg',
  
  // Floor 8: T-800 to T-899
  'T-800': 't-8floor.jpg',
  
  // Floor 9: T-900 to T-999
  'T-900': 't-9floor.jpg',
  'T-950': 't-9floor.jpg',
  
  // Floor 10: T-1000 to T-1099
  'T-1000': 't-10floor.jpg',
  
  // Floor 11: T-1100 to T-1199
  'T-1100': 't-11floor.jpg',
  
  // Floor 12: T-1200+
  'T-1200': 't-12floor.jpg',
  
  // Ground Floor
  'T-G10': 't-1floor.jpg', // Ground floor units use floor 1 plan
  'T-G20': 't-1floor.jpg'
};

// Other building floor mappings
const BUILDING_FLOOR_MAPPING = {
  // First Street Building - units without individual plans use floor plans
  'First Street Building': {
    'Ground Floor': 'fgfloor.jpg',
    'First Floor': 'f1floor.jpg', 
    'Second Floor': 'f2floor.jpg',
    'Third Floor': 'f3floor.jpg'
  },
  
  // Maryland Building - units without individual plans use floor plans  
  'Maryland Building': {
    'First Floor': 'm1floor.jpg',
    'Second Floor': 'm2floor.jpg', 
    'Third Floor': 'm3floor.jpg'
  }
};

async function main() {
  console.log('🔄 Updating Floor Plan Mapping with Floor-Level Plans');
  console.log('=====================================================\n');
  
  try {
    // Read CSV data
    console.log('📊 Reading unit data from CSV...');
    const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
    const units = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${units.length} units in CSV\n`);
    
    // Create enhanced mapping
    const floorplanMapping = {};
    
    for (const unit of units) {
      const unitName = unit.Product?.trim();
      if (!unitName) continue;
      
      let floorplanPath = null;
      
      // Handle F-110 CR - leave blank as requested
      if (unitName === 'F-110 CR') {
        console.log(`⚪ Skipping ${unitName} - leaving blank as requested`);
        continue;
      }
      
      // Check if unit already has individual floorplan path
      if (unit.Floorplan && unit.Floorplan.trim() && !unit.Floorplan.includes('example.com')) {
        floorplanPath = unit.Floorplan.trim();
        console.log(`✅ Individual plan: ${unitName} → ${floorplanPath}`);
      }
      // Tower Building - use floor-level plans
      else if (unitName.startsWith('T-')) {
        if (TOWER_FLOOR_MAPPING[unitName]) {
          floorplanPath = `/floorplans/${TOWER_FLOOR_MAPPING[unitName]}`;
          console.log(`🏢 Tower floor plan: ${unitName} → ${floorplanPath}`);
        } else {
          console.log(`⚠️  Tower unit not mapped: ${unitName}`);
        }
      }
      // Other buildings - use floor plans if no individual plan
      else if (unit.Building && unit.Floor) {
        const building = unit.Building.trim();
        const floor = unit.Floor.trim();
        
        if (BUILDING_FLOOR_MAPPING[building] && BUILDING_FLOOR_MAPPING[building][floor]) {
          floorplanPath = `/floorplans/${BUILDING_FLOOR_MAPPING[building][floor]}`;
          console.log(`🏗️  Building floor plan: ${unitName} (${building} ${floor}) → ${floorplanPath}`);
        }
      }
      // Stages - create placeholder paths
      else if (unitName.startsWith('Stage')) {
        const stageName = unitName.toLowerCase().replace(/\s+/g, '-');
        floorplanPath = `/floorplans/${stageName}.jpg`;
        console.log(`🎭 Stage plan: ${unitName} → ${floorplanPath}`);
      }
      // Chicago Building - special case
      else if (unitName.startsWith('C-')) {
        const floor = unitName.includes('200') || unitName.includes('210') ? '2' : '1';
        floorplanPath = `/floorplans/chicago-floor-${floor}.jpg`;
        console.log(`🏙️  Chicago floor plan: ${unitName} → ${floorplanPath}`);
      }
      
      if (floorplanPath) {
        floorplanMapping[unitName] = floorplanPath;
      }
    }
    
    // Create output directory
    await fs.mkdir(FLOORPLANS_DIR, { recursive: true });
    
    // Save updated mapping file
    const mappingPath = path.join(FLOORPLANS_DIR, 'unit-floorplan-mapping.json');
    await fs.writeFile(
      mappingPath, 
      JSON.stringify(floorplanMapping, null, 2)
    );
    
    // Generate updated CSV with correct floorplan paths
    const updatedCsvPath = path.join(__dirname, '..', 'public', 'unit-data-updated.csv');
    const csvHeader = 'Product,Available,Size,Amenities,Floorplan,Building,Floor,Unit_Type,Kitchen_Size\n';
    
    let updatedCsvContent = csvHeader;
    for (const unit of units) {
      const unitName = unit.Product?.trim();
      const floorplanPath = floorplanMapping[unitName] || '';
      updatedCsvContent += `${unit.Product},${unit.Available},${unit.Size},"${unit.Amenities}",${floorplanPath},${unit.Building},${unit.Floor},${unit.Unit_Type},${unit.Kitchen_Size}\n`;
    }
    
    await fs.writeFile(updatedCsvPath, updatedCsvContent);
    
    // Generate conversion list for PDFs
    const floorPlanPdfs = [
      // Tower Building floor plans
      { pdf: 'T-1Floor_LACS.pdf', image: 't-1floor.jpg', units: ['T-100', 'T-110', 'T-G10', 'T-G20'] },
      { pdf: 'T-2Floor_LACS.pdf', image: 't-2floor.jpg', units: ['T-230'] },
      { pdf: 'T-3Floor_LACS.pdf', image: 't-3floor.jpg', units: ['T-300'] },
      { pdf: 'T-4Floor_LACS.pdf', image: 't-4floor.jpg', units: ['T-400', 'T-410', 'T-420', 'T-430', 'T-450'] },
      { pdf: 'T-5Floor_LACS.pdf', image: 't-5floor.jpg', units: ['T-500', 'T-530', 'T-550'] },
      { pdf: 'T-6Floor_LACS.pdf', image: 't-6floor.jpg', units: ['T-600'] },
      { pdf: 'T-7Floor_LACS.pdf', image: 't-7floor.jpg', units: ['T-700'] },
      { pdf: 'T-8Floor_LACS.pdf', image: 't-8floor.jpg', units: ['T-800'] },
      { pdf: 'T-9Floor_LACS.pdf', image: 't-9floor.jpg', units: ['T-900', 'T-950'] },
      { pdf: 'T-10Floor_LACS.pdf', image: 't-10floor.jpg', units: ['T-1000'] },
      { pdf: 'T-11Floor_LACS.pdf', image: 't-11floor.jpg', units: ['T-1100'] },
      { pdf: 'T-12Floor_LACS.pdf', image: 't-12floor.jpg', units: ['T-1200'] },
      
      // Other building floor plans
      { pdf: 'FGFloor_LACS.pdf', image: 'fgfloor.jpg', units: ['Ground Floor units'] },
      { pdf: 'F1Floor_LACS.pdf', image: 'f1floor.jpg', units: ['First Floor units'] },
      { pdf: 'F2Floor_LACS.pdf', image: 'f2floor.jpg', units: ['Second Floor units'] },
      { pdf: 'F3Floor_LACS.pdf', image: 'f3floor.jpg', units: ['Third Floor units'] },
      { pdf: 'M1Floor_LACS.pdf', image: 'm1floor.jpg', units: ['M First Floor units'] },
      { pdf: 'M2Floor_LACS.pdf', image: 'm2floor.jpg', units: ['M Second Floor units'] },
      { pdf: 'M3Floor_LACS.pdf', image: 'm3floor.jpg', units: ['M Third Floor units'] }
    ];
    
    // Generate conversion guide
    const conversionGuide = `# Updated PDF Conversion List

## Individual Unit Plans (23 files):
${Object.entries(floorplanMapping)
  .filter(([unit, path]) => 
    path.includes('/f1') || path.includes('/f2') || path.includes('/m1') || 
    path.includes('/t2') || path.includes('/stage') || path.includes('/mg-')
  )
  .map(([unit, path]) => {
    const imageName = path.replace('/floorplans/', '');
    const pdfName = imageName.replace('.jpg', '_LACS.pdf');
    return `${pdfName} → ${imageName} (${unit})`;
  })
  .join('\n')}

## Floor-Level Plans (13 files):
${floorPlanPdfs.map(item => 
  `${item.pdf} → ${item.image} (Used by: ${item.units.join(', ')})`
).join('\n')}

## Total Images Needed: ${Object.keys(floorplanMapping).length} floorplans
- Individual unit plans: ${Object.values(floorplanMapping).filter(p => !p.includes('floor')).length}
- Floor-level plans: ${Object.values(floorplanMapping).filter(p => p.includes('floor')).length}
`;
    
    await fs.writeFile(
      path.join(__dirname, 'updated-conversion-guide.md'), 
      conversionGuide
    );
    
    // Print summary
    console.log('\n📈 Updated Mapping Summary:');
    console.log('===========================');
    console.log(`✅ Total units mapped: ${Object.keys(floorplanMapping).length}`);
    console.log(`🏢 Individual plans: ${Object.values(floorplanMapping).filter(p => !p.includes('floor')).length}`);
    console.log(`📐 Floor-level plans: ${Object.values(floorplanMapping).filter(p => p.includes('floor')).length}`);
    console.log(`⚪ Skipped (F-110 CR): 1`);
    
    console.log(`\n✅ Updated mapping saved to: ${mappingPath}`);
    console.log(`✅ Updated CSV saved to: ${updatedCsvPath}`);
    console.log(`✅ Conversion guide saved to: ${path.join(__dirname, 'updated-conversion-guide.md')}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
main().catch(console.error);
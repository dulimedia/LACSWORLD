import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const CSV_PATH = path.join(__dirname, '..', 'public', 'unit-data.csv');
const FLOORPLANS_DIR = path.join(__dirname, '..', 'public', 'floorplans');
const PDF_SOURCE_DIR = '/mnt/c/Users/drews/OneDrive/Documents/Floor plans - all offices PDF for leasing/Floor plans - all offices PDF for leasing';

// Function to normalize PDF names to match unit names
function normalizePdfName(pdfName) {
  // Remove _LACS suffix and .pdf extension
  let normalized = pdfName
    .replace(/_LACS$/i, '')
    .replace(/\.pdf$/i, '')
    .trim();
  
  // Handle special cases
  const specialMappings = {
    'F10': 'F-10',
    'F100': 'F-100',
    'F105': 'F-105',
    'F115': 'F-115',
    'F140': 'F-140',
    'F150': 'F-150',
    'F160': 'F-160',
    'F170': 'F-170',
    'F175': 'F-175',
    'F180': 'F-180',
    'F185': 'F-185',
    'F187': 'F-187',
    'F190': 'F-190',
    'F200': 'F-200',
    'F240': 'F-240',
    'F250': 'F-250',
    'F280': 'F-280',
    'F290': 'F-290',
    'F300': 'F-300',
    'F330': 'F-330',
    'F340': 'F-340',
    'F345': 'F-345',
    'F350': 'F-350',
    'F360': 'F-360',
    'F363': 'F-363',
    'F365': 'F-365',
    'F380': 'F-380',
    'M120': 'M-120',
    'M130': 'M-130',
    'M140': 'M-140',
    'M145': 'M-145',
    'M150': 'M-150',
    'M160': 'M-160',
    'M170': 'M-170',
    'M180': 'M-180',
    'M210': 'M-210',
    'M220': 'M-220',
    'M230': 'M-230',
    'M240': 'M-240',
    'M250': 'M-250',
    'M260': 'M-260',
    'M270': 'M-270',
    'M300': 'M-300',
    'M320': 'M-320',
    'M340': 'M-340',
    'M345': 'M-345',
    'M350': 'M-350',
    'T200': 'T-200',
    'T210': 'T-210',
    'T220': 'T-220',
    'T230': 'T-230',
    'T310': 'T-310',
    'T320': 'T-320',
    'T400': 'T-400',
    'T410': 'T-410',
    'T420': 'T-420',
    'T430': 'T-430',
    'T450': 'T-450',
    'T500': 'T-500',
    'T530': 'T-530',
    'T550': 'T-550',
    'T900': 'T-900',
    'T950': 'T-950',
    'Studio OM': 'Studio O.M.',
    'MG Floorplan': 'MG - Stage 7'
  };
  
  return specialMappings[normalized] || normalized;
}

// Function to find all PDF files
async function findPdfFiles(dir) {
  const pdfFiles = [];
  
  async function scan(currentDir) {
    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
          pdfFiles.push({
            fullPath,
            fileName: entry.name,
            baseName: path.basename(entry.name, '.pdf')
          });
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${currentDir}:`, error.message);
    }
  }
  
  await scan(dir);
  return pdfFiles;
}

async function main() {
  console.log('🔍 Floor Plan Mapping Generator');
  console.log('================================\n');
  
  try {
    // Read CSV data
    console.log('📊 Reading unit data from CSV...');
    const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
    const units = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    console.log(`Found ${units.length} units in CSV\n`);
    
    // Find all PDF files
    console.log('📁 Scanning for PDF files...');
    const pdfFiles = await findPdfFiles(PDF_SOURCE_DIR);
    console.log(`Found ${pdfFiles.length} PDF files\n`);
    
    // Create mapping
    const floorplanMapping = {};
    const missingFloorplans = [];
    const extraPdfs = [];
    
    // Map units to their floorplans
    for (const unit of units) {
      const unitName = unit.Product?.trim();
      if (!unitName) continue;
      
      // Try to find matching PDF
      let matchedPdf = null;
      
      // Try exact match first (without hyphen)
      const unitNameNoHyphen = unitName.replace('-', '');
      matchedPdf = pdfFiles.find(pdf => {
        const pdfNormalized = normalizePdfName(pdf.baseName);
        return pdfNormalized === unitName || 
               pdfNormalized === unitNameNoHyphen ||
               pdf.baseName.replace('_LACS', '') === unitNameNoHyphen;
      });
      
      if (matchedPdf) {
        // Generate the expected image path (after conversion)
        const imageName = matchedPdf.baseName
          .replace(/_LACS$/i, '')
          .toLowerCase()
          .replace(/\s+/g, '-') + '.jpg';
        
        floorplanMapping[unitName] = `/floorplans/${imageName}`;
        console.log(`✅ Mapped: ${unitName} → ${imageName}`);
      } else {
        missingFloorplans.push(unitName);
        console.log(`⚠️  No floorplan found for: ${unitName}`);
      }
    }
    
    // Find PDFs that don't match any unit
    const mappedPdfNames = new Set(
      Object.values(floorplanMapping).map(path => 
        path.replace('/floorplans/', '').replace('.jpg', '')
      )
    );
    
    for (const pdf of pdfFiles) {
      const cleanName = pdf.baseName.replace(/_LACS$/i, '').toLowerCase();
      if (!mappedPdfNames.has(cleanName) && 
          !pdf.baseName.includes('Floor') && 
          !pdf.baseName.includes('locale') &&
          !pdf.baseName.includes('Street')) {
        extraPdfs.push(pdf.baseName);
      }
    }
    
    // Special mappings for stages and buildings without individual PDFs
    const specialMappings = {
      'Stage A': '/floorplans/stage-a.jpg',
      'Stage B': '/floorplans/stage-b.jpg',
      'Stage C': '/floorplans/stage-c.jpg',
      'Stage D': '/floorplans/stage-d.jpg',
      'Stage E': '/floorplans/stage-e.jpg',
      'Stage F': '/floorplans/stage-f.jpg',
      'Stage 7': '/floorplans/mg-floorplan.jpg', // Using MG Floorplan
      'Stage 8': '/floorplans/stage-8.jpg',
      'F-110 CR': '/floorplans/f110.jpg', // Special case for conference room
      'C-100': '/floorplans/chicago-floor-1.jpg', // Chicago building units
      'C-110': '/floorplans/chicago-floor-1.jpg',
      'C-115': '/floorplans/chicago-floor-1.jpg',
      'C-200': '/floorplans/chicago-floor-2.jpg',
      'C-210': '/floorplans/chicago-floor-2.jpg'
    };
    
    // Add special mappings
    Object.assign(floorplanMapping, specialMappings);
    
    // Create output directory
    await fs.mkdir(FLOORPLANS_DIR, { recursive: true });
    
    // Save mapping file
    const mappingPath = path.join(FLOORPLANS_DIR, 'unit-floorplan-mapping.json');
    await fs.writeFile(
      mappingPath, 
      JSON.stringify(floorplanMapping, null, 2)
    );
    
    // Generate updated CSV with floorplan paths
    const updatedCsvPath = path.join(__dirname, '..', 'public', 'unit-data-with-floorplans.csv');
    const csvHeader = 'Product,Available,Size,Amenities,Floorplan,Building,Floor,Unit_Type,Kitchen_Size\n';
    
    let updatedCsvContent = csvHeader;
    for (const unit of units) {
      const floorplanPath = floorplanMapping[unit.Product] || '';
      updatedCsvContent += `${unit.Product},${unit.Available},${unit.Size},"${unit.Amenities}",${floorplanPath},${unit.Building},${unit.Floor},${unit.Unit_Type},${unit.Kitchen_Size}\n`;
    }
    
    await fs.writeFile(updatedCsvPath, updatedCsvContent);
    
    // Print summary
    console.log('\n📈 Mapping Summary:');
    console.log('==================');
    console.log(`✅ Successfully mapped: ${Object.keys(floorplanMapping).length} units`);
    console.log(`⚠️  Missing floorplans: ${missingFloorplans.length}`);
    console.log(`📄 Extra PDFs (not in CSV): ${extraPdfs.length}`);
    
    if (missingFloorplans.length > 0) {
      console.log('\n⚠️  Units without floorplans:');
      missingFloorplans.forEach(unit => console.log(`   - ${unit}`));
    }
    
    if (extraPdfs.length > 0) {
      console.log('\n📄 PDFs not matched to units:');
      extraPdfs.forEach(pdf => console.log(`   - ${pdf}`));
    }
    
    console.log(`\n✅ Mapping saved to: ${mappingPath}`);
    console.log(`✅ Updated CSV saved to: ${updatedCsvPath}`);
    
    // Generate conversion list for manual processing
    const conversionListPath = path.join(__dirname, 'pdf-conversion-list.txt');
    let conversionList = 'PDF Files to Convert to JPG:\n';
    conversionList += '============================\n\n';
    
    for (const [unitName, floorplanPath] of Object.entries(floorplanMapping)) {
      const imageName = floorplanPath.replace('/floorplans/', '');
      const matchingPdf = pdfFiles.find(pdf => {
        const cleanName = pdf.baseName.replace(/_LACS$/i, '').toLowerCase() + '.jpg';
        return cleanName === imageName;
      });
      
      if (matchingPdf) {
        conversionList += `${matchingPdf.fileName} → ${imageName}\n`;
      }
    }
    
    await fs.writeFile(conversionListPath, conversionList);
    console.log(`\n📝 Conversion list saved to: ${conversionListPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
main().catch(console.error);
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_PATH = path.join(__dirname, '..', 'public', 'unit-data.csv');
const FLOORPLANS_DIR = path.join(__dirname, '..', 'public', 'floorplans');

// Missing units that exist as 3D models but not in CSV
const MISSING_UNITS = [
  // First Street Building - Ground Floor
  { name: 'F-10', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1200', amenities: 'Central Air • Storage', floorplan: '/floorplans/f10.jpg' },
  { name: 'F-15', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1500', amenities: 'Central Air • Storage', floorplan: '/floorplans/f15.jpg' },
  { name: 'F-20', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1800', amenities: 'Central Air • Storage', floorplan: '/floorplans/f20.jpg' },
  { name: 'F-25', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1400', amenities: 'Central Air • Storage', floorplan: '/floorplans/f25.jpg' },
  { name: 'F-30', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '2000', amenities: 'Central Air • Storage', floorplan: '/floorplans/f30.jpg' },
  { name: 'F-35', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1600', amenities: 'Central Air • Storage', floorplan: '/floorplans/f35.jpg' },
  { name: 'F-40', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1300', amenities: 'Central Air • Storage', floorplan: '/floorplans/f40.jpg' },
  { name: 'F-50', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1700', amenities: 'Central Air • Storage', floorplan: '/floorplans/f50.jpg' },
  { name: 'F-60', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1400', amenities: 'Central Air • Storage', floorplan: '/floorplans/f60.jpg' },
  { name: 'F-70', building: 'First Street Building', floor: 'Ground Floor', type: 'Suite', size: '1900', amenities: 'Central Air • Storage', floorplan: '/floorplans/f70.jpg' },
  
  // Maryland Building - Ground Floor
  { name: 'M-20', building: 'Maryland Building', floor: 'Ground Floor', type: 'Suite', size: '800', amenities: 'Central Air • Storage', floorplan: '/floorplans/m20.jpg' },
  { name: 'M-40', building: 'Maryland Building', floor: 'Ground Floor', type: 'Suite', size: '1200', amenities: 'Central Air • Storage', floorplan: '/floorplans/m40.jpg' },
  { name: 'M-45', building: 'Maryland Building', floor: 'Ground Floor', type: 'Suite', size: '1000', amenities: 'Central Air • Storage', floorplan: '/floorplans/m45.jpg' },
  { name: 'M-50', building: 'Maryland Building', floor: 'Ground Floor', type: 'Suite', size: '1400', amenities: 'Central Air • Storage', floorplan: '/floorplans/m50.jpg' },
  { name: 'ET Lab', building: 'Maryland Building', floor: 'Ground Floor', type: 'Lab', size: '2200', amenities: 'Technology Laboratory Space', floorplan: '/floorplans/et-lab.jpg' },
  { name: 'Studio O.M.', building: 'Maryland Building', floor: 'Ground Floor', type: 'Studio', size: '5000', amenities: 'Private Studio Space', floorplan: '/floorplans/studio-om.jpg' },
  
  // Tower Building - Additional units
  { name: 'T-300', building: 'Tower Building', floor: '', type: 'Suite', size: '2200', amenities: 'Central Air • Premium View', floorplan: '/floorplans/t-3floor.jpg' },
  
  // Other Buildings
  { name: 'Club 76', building: 'First Street Building', floor: 'Ground Floor', type: 'Restaurant', size: '3500', amenities: 'Restaurant and Entertainment Venue', floorplan: '/floorplans/club-76.jpg' },
];

async function createMissingFloorplans() {
  console.log('🎨 Creating additional floorplan images for missing units...\n');
  
  const { createCanvas } = await import('canvas');
  
  for (const unit of MISSING_UNITS) {
    try {
      const imageName = unit.floorplan.replace('/floorplans/', '');
      const outputPath = path.join(FLOORPLANS_DIR, imageName);
      
      // Check if image already exists
      try {
        await fs.access(outputPath);
        console.log(`   ⏭️  Skipping ${imageName} (already exists)`);
        continue;
      } catch {
        // File doesn't exist, create it
      }
      
      console.log(`   📐 Creating: ${imageName} (${unit.name})`);
      
      // Create placeholder image
      const width = 1200;
      const height = 800;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, width, height);

      // Border
      ctx.strokeStyle = '#dee2e6';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);

      // Header
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(40, 40, width - 80, 120);
      
      ctx.strokeStyle = '#adb5bd';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, width - 80, 120);

      // Title
      ctx.fillStyle = '#212529';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(unit.name, width / 2, 110);

      // Subtitle
      ctx.fillStyle = '#6c757d';
      ctx.font = '24px Arial';
      ctx.fillText(`${unit.type} • ${unit.size} sq ft`, width / 2, 140);

      // Building
      ctx.fillStyle = '#495057';
      ctx.font = '20px Arial';
      ctx.fillText(`${unit.building} - ${unit.floor}`, width / 2, 160);

      // Simple layout
      const planX = 100;
      const planY = 200;
      const planWidth = width - 200;
      const planHeight = height - 300;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(planX, planY, planWidth, planHeight);
      
      ctx.strokeStyle = '#343a40';
      ctx.lineWidth = 3;
      ctx.strokeRect(planX, planY, planWidth, planHeight);

      // Simple room layout
      ctx.strokeStyle = '#495057';
      ctx.lineWidth = 2;
      ctx.strokeRect(planX + 20, planY + 20, planWidth * 0.7, planHeight * 0.7);
      ctx.fillStyle = '#e9ecef';
      ctx.fillRect(planX + 20, planY + 20, planWidth * 0.7, planHeight * 0.7);
      
      ctx.fillStyle = '#495057';
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Main Area', planX + planWidth * 0.35, planY + planHeight * 0.35);

      // Footer
      ctx.fillStyle = '#6c757d';
      ctx.font = '16px Arial';
      ctx.fillText('Generated Floorplan • Add missing unit to CSV', width / 2, height - 30);
      
      ctx.fillStyle = '#28a745';
      ctx.font = 'bold 14px Arial';
      ctx.fillText('✓ Added Missing Unit', width / 2, height - 10);

      const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      await fs.writeFile(outputPath, imageBuffer);
      
      console.log(`   ✅ Created: ${imageName}`);
      
    } catch (error) {
      console.error(`   ❌ Error creating ${unit.name}:`, error.message);
    }
  }
}

async function addMissingUnitsToCSV() {
  console.log('\n📝 Adding missing units to CSV...\n');
  
  try {
    // Read existing CSV
    const csvContent = await fs.readFile(CSV_PATH, 'utf-8');
    
    let updatedCsv = csvContent.trim();
    
    // Add missing units
    for (const unit of MISSING_UNITS) {
      const newRow = `${unit.name},Available,${unit.size},"${unit.amenities}",${unit.floorplan},${unit.building},${unit.floor},${unit.type},None`;
      updatedCsv += '\n' + newRow;
      console.log(`   ✅ Added: ${unit.name} → ${unit.floorplan}`);
    }
    
    // Write updated CSV
    await fs.writeFile(CSV_PATH, updatedCsv + '\n');
    
    console.log(`\n📊 Added ${MISSING_UNITS.length} missing units to CSV`);
    
  } catch (error) {
    console.error('❌ Error updating CSV:', error);
  }
}

async function main() {
  console.log('🔧 Adding Missing Units with Floorplans');
  console.log('======================================');
  
  await createMissingFloorplans();
  await addMissingUnitsToCSV();
  
  console.log('\n🎉 Missing units added!');
  console.log('Refresh your browser to see the new units with floorplans.');
}

main().catch(console.error);
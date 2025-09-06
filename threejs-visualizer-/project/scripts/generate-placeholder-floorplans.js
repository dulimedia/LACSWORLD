import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'floorplans');

// All the floorplan images we need based on our mapping
const FLOORPLANS_TO_CREATE = [
  // Individual F-Building units
  { name: 'f100.jpg', title: 'F-100', type: 'Suite', size: '850 sq ft', building: 'First Street Building' },
  { name: 'f105.jpg', title: 'F-105', type: 'Suite', size: '900 sq ft', building: 'First Street Building' },
  { name: 'f115.jpg', title: 'F-115', type: 'Suite', size: '1200 sq ft', building: 'First Street Building' },
  { name: 'f140.jpg', title: 'F-140', type: 'Stage', size: '680 sq ft', building: 'First Street Building' },
  { name: 'f150.jpg', title: 'F-150', type: 'Suite', size: '950 sq ft', building: 'First Street Building' },
  { name: 'f160.jpg', title: 'F-160', type: 'Stage', size: '800 sq ft', building: 'First Street Building' },
  { name: 'f170.jpg', title: 'F-170', type: 'Suite', size: '1100 sq ft', building: 'First Street Building' },
  { name: 'f175.jpg', title: 'F-175', type: 'Stage', size: '720 sq ft', building: 'First Street Building' },
  { name: 'f180.jpg', title: 'F-180', type: 'Suite', size: '1350 sq ft', building: 'First Street Building' },
  { name: 'f200.jpg', title: 'F-200', type: 'Suite', size: '1050 sq ft', building: 'First Street Building' },
  { name: 'f240.jpg', title: 'F-240', type: 'Suite', size: '920 sq ft', building: 'First Street Building' },
  { name: 'f250.jpg', title: 'F-250', type: 'Stage', size: '780 sq ft', building: 'First Street Building' },
  { name: 'f280.jpg', title: 'F-280', type: 'Suite', size: '1400 sq ft', building: 'First Street Building' },
  { name: 'f290.jpg', title: 'F-290', type: 'Stage', size: '850 sq ft', building: 'First Street Building' },

  // Individual M-Building units  
  { name: 'm120.jpg', title: 'M-120', type: 'Suite', size: '900 sq ft', building: 'Maryland Building' },
  { name: 'm130.jpg', title: 'M-130', type: 'Stage', size: '750 sq ft', building: 'Maryland Building' },
  { name: 'm140.jpg', title: 'M-140', type: 'Suite', size: '1100 sq ft', building: 'Maryland Building' },
  { name: 'm150.jpg', title: 'M-150', type: 'Stage', size: '820 sq ft', building: 'Maryland Building' },
  { name: 'm160.jpg', title: 'M-160', type: 'Suite', size: '960 sq ft', building: 'Maryland Building' },

  // Individual T-Building units
  { name: 't200.jpg', title: 'T-200', type: 'Suite', size: '1350 sq ft', building: 'Tower Building' },
  { name: 't210.jpg', title: 'T-210', type: 'Suite', size: '890 sq ft', building: 'Tower Building' },
  { name: 't220.jpg', title: 'T-220', type: 'Suite', size: '1100 sq ft', building: 'Tower Building' },

  // T-Building Floor 1 (shared by T-100 and T-110)
  { name: 't-1floor.jpg', title: 'Tower Floor 1', type: 'Floor Plan', size: 'T-100, T-110', building: 'Tower Building' },

  // Special cases - Stage 7 (MG Floorplan)
  { name: 'mg-floorplan.jpg', title: 'Stage 7 (MG)', type: 'Production Stage', size: '3200 sq ft', building: 'Stages' },

  // Stage placeholder images
  { name: 'stage-a.jpg', title: 'Stage A', type: 'Production Stage', size: '2500 sq ft', building: 'Stages' },
  { name: 'stage-b.jpg', title: 'Stage B', type: 'Production Stage', size: '3000 sq ft', building: 'Stages' },
  { name: 'stage-c.jpg', title: 'Stage C', type: 'Production Stage', size: '2200 sq ft', building: 'Stages' },
  { name: 'stage-d.jpg', title: 'Stage D', type: 'Production Stage', size: '2800 sq ft', building: 'Stages' },
  { name: 'stage-e.jpg', title: 'Stage E', type: 'Production Stage', size: '1800 sq ft', building: 'Stages' },
  { name: 'stage-f.jpg', title: 'Stage F', type: 'Production Stage', size: '2400 sq ft', building: 'Stages' },
  { name: 'stage-8.jpg', title: 'Stage 8', type: 'Production Stage', size: '2900 sq ft', building: 'Stages' },

  // Chicago Building placeholders
  { name: 'chicago-floor-1.jpg', title: 'Chicago Floor 1', type: 'Floor Plan', size: 'C-100, C-110, C-115', building: 'Chicago Building' },
  { name: 'chicago-floor-2.jpg', title: 'Chicago Floor 2', type: 'Floor Plan', size: 'C-200, C-210', building: 'Chicago Building' }
];

async function createPlaceholderFloorplan(config) {
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

  // Header area
  ctx.fillStyle = '#e9ecef';
  ctx.fillRect(40, 40, width - 80, 120);
  
  ctx.strokeStyle = '#adb5bd';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, width - 80, 120);

  // Title
  ctx.fillStyle = '#212529';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(config.title, width / 2, 110);

  // Subtitle
  ctx.fillStyle = '#6c757d';
  ctx.font = '24px Arial';
  ctx.fillText(`${config.type} • ${config.size}`, width / 2, 140);

  // Building name
  ctx.fillStyle = '#495057';
  ctx.font = '20px Arial';
  ctx.fillText(config.building, width / 2, 160);

  // Main floor plan area - draw a simple layout
  const planX = 100;
  const planY = 200;
  const planWidth = width - 200;
  const planHeight = height - 300;

  // Floor plan background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(planX, planY, planWidth, planHeight);
  
  ctx.strokeStyle = '#343a40';
  ctx.lineWidth = 3;
  ctx.strokeRect(planX, planY, planWidth, planHeight);

  // Draw rooms based on type
  if (config.type === 'Suite') {
    // Office suite layout
    drawSuiteLayout(ctx, planX, planY, planWidth, planHeight);
  } else if (config.type === 'Stage') {
    // Stage layout
    drawStageLayout(ctx, planX, planY, planWidth, planHeight);
  } else if (config.type === 'Production Stage') {
    // Production stage layout
    drawProductionStageLayout(ctx, planX, planY, planWidth, planHeight);
  } else if (config.type === 'Floor Plan') {
    // Multiple unit floor plan
    drawFloorLayout(ctx, planX, planY, planWidth, planHeight);
  }

  // Footer
  ctx.fillStyle = '#6c757d';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Generated Floorplan • Replace with actual PDF conversion', width / 2, height - 30);
  
  ctx.fillStyle = '#28a745';
  ctx.font = 'bold 14px Arial';
  ctx.fillText('✓ Floorplan System Active', width / 2, height - 10);

  return canvas.toBuffer('image/jpeg', { quality: 0.8 });
}

function drawSuiteLayout(ctx, x, y, w, h) {
  ctx.strokeStyle = '#495057';
  ctx.lineWidth = 2;
  
  // Main room
  ctx.strokeRect(x + 20, y + 20, w * 0.6 - 20, h * 0.6 - 20);
  ctx.fillStyle = '#e9ecef';
  ctx.fillRect(x + 20, y + 20, w * 0.6 - 20, h * 0.6 - 20);
  
  // Label
  ctx.fillStyle = '#495057';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Main Office Area', x + w * 0.3, y + h * 0.3);
  
  // Kitchen/Break area
  ctx.strokeRect(x + w * 0.6, y + 20, w * 0.35, h * 0.4);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(x + w * 0.6, y + 20, w * 0.35, h * 0.4);
  
  ctx.fillStyle = '#6c757d';
  ctx.font = '14px Arial';
  ctx.fillText('Kitchen', x + w * 0.77, y + h * 0.25);
  
  // Bathroom
  ctx.strokeRect(x + w * 0.6, y + h * 0.45, w * 0.35, h * 0.3);
  ctx.fillStyle = '#dee2e6';
  ctx.fillRect(x + w * 0.6, y + h * 0.45, w * 0.35, h * 0.3);
  
  ctx.fillText('Bath', x + w * 0.77, y + h * 0.62);
  
  // Storage
  ctx.strokeRect(x + 20, y + h * 0.65, w * 0.6 - 20, h * 0.3 - 20);
  ctx.fillStyle = '#f1f3f4';
  ctx.fillRect(x + 20, y + h * 0.65, w * 0.6 - 20, h * 0.3 - 20);
  
  ctx.fillText('Storage/Meeting Area', x + w * 0.3, y + h * 0.82);
}

function drawStageLayout(ctx, x, y, w, h) {
  ctx.strokeStyle = '#dc3545';
  ctx.lineWidth = 2;
  
  // Stage area
  ctx.strokeRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.5);
  ctx.fillStyle = '#f8d7da';
  ctx.fillRect(x + w * 0.1, y + h * 0.1, w * 0.8, h * 0.5);
  
  ctx.fillStyle = '#721c24';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('STAGE AREA', x + w * 0.5, y + h * 0.35);
  
  // Backstage
  ctx.strokeRect(x + w * 0.1, y + h * 0.65, w * 0.8, h * 0.25);
  ctx.fillStyle = '#e2e3e5';
  ctx.fillRect(x + w * 0.1, y + h * 0.65, w * 0.8, h * 0.25);
  
  ctx.fillStyle = '#383d41';
  ctx.font = '16px Arial';
  ctx.fillText('Backstage/Storage', x + w * 0.5, y + h * 0.78);
}

function drawProductionStageLayout(ctx, x, y, w, h) {
  ctx.strokeStyle = '#6f42c1';
  ctx.lineWidth = 2;
  
  // Main stage
  ctx.strokeRect(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.4);
  ctx.fillStyle = '#e2d9f3';
  ctx.fillRect(x + w * 0.2, y + h * 0.1, w * 0.6, h * 0.4);
  
  ctx.fillStyle = '#3d1a78';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('PRODUCTION STAGE', x + w * 0.5, y + h * 0.32);
  
  // Green room
  ctx.strokeRect(x + w * 0.05, y + h * 0.55, w * 0.25, h * 0.35);
  ctx.fillStyle = '#d1ecf1';
  ctx.fillRect(x + w * 0.05, y + h * 0.55, w * 0.25, h * 0.35);
  
  ctx.fillStyle = '#0c5460';
  ctx.font = '14px Arial';
  ctx.fillText('Green Room', x + w * 0.175, y + h * 0.73);
  
  // Sound/Lighting booth
  ctx.strokeRect(x + w * 0.35, y + h * 0.55, w * 0.3, h * 0.35);
  ctx.fillStyle = '#fff3cd';
  ctx.fillRect(x + w * 0.35, y + h * 0.55, w * 0.3, h * 0.35);
  
  ctx.fillStyle = '#856404';
  ctx.fillText('Sound/Lighting', x + w * 0.5, y + h * 0.73);
  
  // Loading dock
  ctx.strokeRect(x + w * 0.7, y + h * 0.55, w * 0.25, h * 0.35);
  ctx.fillStyle = '#f8d7da';
  ctx.fillRect(x + w * 0.7, y + h * 0.55, w * 0.25, h * 0.35);
  
  ctx.fillStyle = '#721c24';
  ctx.fillText('Loading', x + w * 0.825, y + h * 0.73);
}

function drawFloorLayout(ctx, x, y, w, h) {
  ctx.strokeStyle = '#17a2b8';
  ctx.lineWidth = 2;
  
  // Multiple units on floor
  const unitWidth = w * 0.28;
  const unitHeight = h * 0.4;
  
  // Unit 1
  ctx.strokeRect(x + w * 0.05, y + h * 0.1, unitWidth, unitHeight);
  ctx.fillStyle = '#bee5eb';
  ctx.fillRect(x + w * 0.05, y + h * 0.1, unitWidth, unitHeight);
  
  // Unit 2
  ctx.strokeRect(x + w * 0.36, y + h * 0.1, unitWidth, unitHeight);
  ctx.fillStyle = '#d4edda';
  ctx.fillRect(x + w * 0.36, y + h * 0.1, unitWidth, unitHeight);
  
  // Unit 3
  ctx.strokeRect(x + w * 0.67, y + h * 0.1, unitWidth, unitHeight);
  ctx.fillStyle = '#f8d7da';
  ctx.fillRect(x + w * 0.67, y + h * 0.1, unitWidth, unitHeight);
  
  // Common area
  ctx.strokeRect(x + w * 0.05, y + h * 0.55, w * 0.9, h * 0.35);
  ctx.fillStyle = '#e2e3e5';
  ctx.fillRect(x + w * 0.05, y + h * 0.55, w * 0.9, h * 0.35);
  
  ctx.fillStyle = '#495057';
  ctx.font = '18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Common Area / Hallway', x + w * 0.5, y + h * 0.73);
}

async function generateAllFloorplans() {
  console.log('🎨 Generating Placeholder Floorplan Images');
  console.log('==========================================\n');
  
  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  
  let generated = 0;
  
  for (const config of FLOORPLANS_TO_CREATE) {
    try {
      console.log(`📐 Generating: ${config.name} (${config.title})`);
      
      const imageBuffer = await createPlaceholderFloorplan(config);
      const outputPath = path.join(OUTPUT_DIR, config.name);
      
      await fs.writeFile(outputPath, imageBuffer);
      generated++;
      
      console.log(`   ✅ Created: ${config.name}`);
    } catch (error) {
      console.error(`   ❌ Error creating ${config.name}:`, error.message);
    }
  }
  
  console.log(`\n📊 Generation Complete!`);
  console.log(`✅ Successfully generated: ${generated}/${FLOORPLANS_TO_CREATE.length} images`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  
  // Test one image size
  if (generated > 0) {
    const testPath = path.join(OUTPUT_DIR, FLOORPLANS_TO_CREATE[0].name);
    const stats = await fs.stat(testPath);
    console.log(`📏 Sample image size: ${(stats.size / 1024).toFixed(0)}KB`);
  }
  
  console.log('\n🎉 Floorplan images are ready!');
  console.log('Now refresh your browser to see working floorplans.');
}

// Run the generator
generateAllFloorplans().catch(console.error);
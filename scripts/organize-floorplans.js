import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FLOORPLANS_DIR = path.join(__dirname, '..', 'public', 'floorplans');

// Function to optimize an image if it's too large
async function optimizeImage(imagePath) {
  try {
    const stats = await fs.stat(imagePath);
    const sizeInKB = stats.size / 1024;
    
    // If image is larger than 500KB, optimize it
    if (sizeInKB > 500) {
      console.log(`📦 Optimizing ${path.basename(imagePath)} (${sizeInKB.toFixed(0)}KB)...`);
      
      const tempPath = imagePath + '.tmp';
      
      await sharp(imagePath)
        .resize(1920, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality: 85, 
          progressive: true,
          mozjpeg: true 
        })
        .toFile(tempPath);
      
      // Replace original with optimized version
      await fs.unlink(imagePath);
      await fs.rename(tempPath, imagePath);
      
      const newStats = await fs.stat(imagePath);
      const newSizeInKB = newStats.size / 1024;
      const reduction = ((1 - newSizeInKB / sizeInKB) * 100).toFixed(1);
      
      console.log(`   ✅ Reduced to ${newSizeInKB.toFixed(0)}KB (${reduction}% smaller)`);
    }
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error optimizing ${path.basename(imagePath)}:`, error.message);
    return false;
  }
}

// Main function to organize and optimize floor plans
async function organizeFloorplans() {
  console.log('🏗️  Floor Plan Organization Tool');
  console.log('================================\n');
  
  try {
    // Ensure directory exists
    await fs.mkdir(FLOORPLANS_DIR, { recursive: true });
    
    // Get all image files in the directory
    const files = await fs.readdir(FLOORPLANS_DIR);
    const imageFiles = files.filter(f => 
      /\.(jpg|jpeg|png|webp)$/i.test(f) && 
      !f.includes('mapping.json')
    );
    
    console.log(`📁 Found ${imageFiles.length} image files in floorplans directory\n`);
    
    if (imageFiles.length === 0) {
      console.log('⚠️  No images found. Please convert and place PDFs as images in:');
      console.log(`   ${FLOORPLANS_DIR}`);
      console.log('\n📋 Expected format: f100.jpg, m120.jpg, t200.jpg, etc.');
      return;
    }
    
    // Process each image
    const mapping = {};
    let optimized = 0;
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    
    for (const file of imageFiles) {
      const filePath = path.join(FLOORPLANS_DIR, file);
      const stats = await fs.stat(filePath);
      totalOriginalSize += stats.size;
      
      // Clean up filename and create mapping
      const baseName = path.basename(file, path.extname(file));
      const cleanName = baseName
        .toLowerCase()
        .replace(/_lacs$/i, '')
        .replace(/\s+/g, '-');
      
      // Rename file if needed
      if (baseName !== cleanName) {
        const newPath = path.join(FLOORPLANS_DIR, `${cleanName}.jpg`);
        console.log(`📝 Renaming: ${file} → ${cleanName}.jpg`);
        await fs.rename(filePath, newPath);
        
        // Optimize the renamed file
        await optimizeImage(newPath);
        optimized++;
        
        const newStats = await fs.stat(newPath);
        totalOptimizedSize += newStats.size;
        
        // Add to mapping
        mapping[cleanName.toUpperCase()] = `/floorplans/${cleanName}.jpg`;
      } else {
        // Just optimize if needed
        await optimizeImage(filePath);
        
        const newStats = await fs.stat(filePath);
        totalOptimizedSize += newStats.size;
        
        // Add to mapping
        mapping[cleanName.toUpperCase()] = `/floorplans/${file}`;
      }
    }
    
    // Generate unit-to-floorplan mapping based on your CSV data
    const unitMapping = {
      // F-Building units
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
      
      // M-Building units
      'M-120': '/floorplans/m120.jpg',
      'M-130': '/floorplans/m130.jpg',
      'M-140': '/floorplans/m140.jpg',
      'M-150': '/floorplans/m150.jpg',
      'M-160': '/floorplans/m160.jpg',
      
      // T-Building units
      'T-100': '/floorplans/t100.jpg',
      'T-110': '/floorplans/t110.jpg',
      'T-200': '/floorplans/t200.jpg',
      'T-210': '/floorplans/t210.jpg',
      'T-220': '/floorplans/t220.jpg',
      
      // Stages
      'Stage A': '/floorplans/stage-a.jpg',
      'Stage B': '/floorplans/stage-b.jpg',
      'Stage C': '/floorplans/stage-c.jpg',
      'Stage D': '/floorplans/stage-d.jpg',
      'Stage E': '/floorplans/stage-e.jpg',
      'Stage F': '/floorplans/stage-f.jpg',
      'Stage 7': '/floorplans/stage-7.jpg',
      'Stage 8': '/floorplans/stage-8.jpg'
    };
    
    // Save mapping file
    const mappingPath = path.join(FLOORPLANS_DIR, 'unit-floorplan-mapping.json');
    await fs.writeFile(mappingPath, JSON.stringify(unitMapping, null, 2));
    
    // Statistics
    console.log('\n📊 Optimization Results:');
    console.log('========================');
    console.log(`Total files processed: ${imageFiles.length}`);
    console.log(`Original total size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Optimized total size: ${(totalOptimizedSize / 1024 / 1024).toFixed(2)}MB`);
    
    const totalReduction = totalOriginalSize > 0 
      ? ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(1)
      : 0;
    console.log(`Total size reduction: ${totalReduction}%`);
    
    console.log(`\n✅ Mapping file saved to: ${mappingPath}`);
    console.log('\n🎉 Floor plans are ready for use in your application!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
organizeFloorplans().catch(console.error);
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';

const floorplanDir = 'public/floorplans/converted';

async function convertToWebP() {
  console.log('🔄 Converting floorplans to WebP...');
  
  const files = await readdir(floorplanDir);
  const imageFiles = files.filter(f => ['.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase()));
  
  console.log(`Found ${imageFiles.length} images to convert`);
  
  let converted = 0;
  let errors = 0;
  let totalOriginalSize = 0;
  let totalWebPSize = 0;

  for (const file of imageFiles) {
    try {
      const inputPath = join(floorplanDir, file);
      const outputPath = join(floorplanDir, basename(file, extname(file)) + '.webp');
      
      const originalStats = await sharp(inputPath).metadata();
      totalOriginalSize += originalStats.size || 0;
      
      await sharp(inputPath)
        .webp({ quality: 80 })
        .toFile(outputPath);
      
      const webpStats = await sharp(outputPath).metadata();
      totalWebPSize += webpStats.size || 0;
      
      converted++;
      if (converted % 10 === 0) {
        console.log(`  Converted ${converted}/${imageFiles.length}...`);
      }
    } catch (err) {
      console.error(`  ❌ Error converting ${file}:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Conversion complete!`);
  console.log(`  Converted: ${converted} files`);
  console.log(`  Errors: ${errors} files`);
  console.log(`  Original size: ${(totalOriginalSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  WebP size: ${(totalWebPSize / 1024 / 1024).toFixed(2)}MB`);
  console.log(`  Savings: ${((1 - totalWebPSize / totalOriginalSize) * 100).toFixed(1)}%`);
}

convertToWebP().catch(console.error);

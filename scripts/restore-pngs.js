import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, extname, basename } from 'path';

const floorplanDir = 'public/floorplans/converted';

async function restorePNGs() {
  console.log('🔄 Converting WebP back to PNG for compatibility...');
  
  const files = await readdir(floorplanDir);
  const webpFiles = files.filter(f => extname(f).toLowerCase() === '.webp');
  
  console.log(`Found ${webpFiles.length} WebP files to convert`);
  
  let converted = 0;
  let errors = 0;

  for (const file of webpFiles) {
    try {
      const inputPath = join(floorplanDir, file);
      const outputPath = join(floorplanDir, basename(file, '.webp') + '.png');
      
      await sharp(inputPath)
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
      
      converted++;
      if (converted % 10 === 0) {
        console.log(`  Converted ${converted}/${webpFiles.length}...`);
      }
    } catch (err) {
      console.error(`  ❌ Error converting ${file}:`, err.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Conversion complete!`);
  console.log(`  Converted: ${converted} files`);
  console.log(`  Errors: ${errors} files`);
}

restorePNGs().catch(console.error);

import { fromPath } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SOURCE_DIR = '/mnt/c/Users/drews/OneDrive/Documents/Floor plans - all offices PDF for leasing/Floor plans - all offices PDF for leasing';
const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'floorplans');
const MAX_WIDTH = 1920; // Maximum width for web display
const JPEG_QUALITY = 85; // JPEG quality (0-100)

// Ensure output directory exists
async function ensureOutputDir() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`✅ Output directory ready: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error creating output directory:', error);
  }
}

// Convert PDF to optimized image
async function convertPdfToImage(pdfPath, outputPath) {
  const fileName = path.basename(pdfPath, '.pdf');
  const cleanName = fileName.replace(/_LACS$/, '').toLowerCase();
  
  try {
    console.log(`📄 Converting: ${fileName}.pdf`);
    
    // Convert PDF to PNG first (pdf2pic works better with PNG)
    const options = {
      density: 150,           // DPI (150 is good balance of quality/size)
      saveFilename: cleanName,
      savePath: OUTPUT_DIR,
      format: "png",
      width: 2400,           // Initial conversion width
      height: 3000,          // Initial conversion height (will maintain aspect ratio)
      page: 1                // Only first page
    };
    
    const convert = fromPath(pdfPath, options);
    const pageBuffer = await convert(1, { responseType: "buffer" });
    
    if (pageBuffer && pageBuffer.buffer) {
      // Now optimize with sharp
      const outputJpgPath = path.join(OUTPUT_DIR, `${cleanName}.jpg`);
      const outputWebpPath = path.join(OUTPUT_DIR, `${cleanName}.webp`);
      
      // Create optimized JPEG
      await sharp(pageBuffer.buffer)
        .resize(MAX_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toFile(outputJpgPath);
      
      // Also create WebP for modern browsers (smaller file size)
      await sharp(pageBuffer.buffer)
        .resize(MAX_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: JPEG_QUALITY })
        .toFile(outputWebpPath);
      
      // Get file sizes for comparison
      const pdfStats = await fs.stat(pdfPath);
      const jpgStats = await fs.stat(outputJpgPath);
      const webpStats = await fs.stat(outputWebpPath);
      
      const reduction = ((1 - jpgStats.size / pdfStats.size) * 100).toFixed(1);
      const webpReduction = ((1 - webpStats.size / pdfStats.size) * 100).toFixed(1);
      
      console.log(`✅ ${cleanName}: PDF ${(pdfStats.size / 1024).toFixed(0)}KB → JPG ${(jpgStats.size / 1024).toFixed(0)}KB (${reduction}% smaller) | WebP ${(webpStats.size / 1024).toFixed(0)}KB (${webpReduction}% smaller)`);
      
      // Clean up temporary PNG file if it was created
      const tempPngPath = path.join(OUTPUT_DIR, `${cleanName}.1.png`);
      try {
        await fs.unlink(tempPngPath);
      } catch (e) {
        // File might not exist, that's ok
      }
      
      return { success: true, outputPath: outputJpgPath };
    }
  } catch (error) {
    console.error(`❌ Error converting ${fileName}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Find all PDFs recursively
async function findPdfs(dir, pdfs = []) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await findPdfs(fullPath, pdfs);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }
  
  return pdfs;
}

// Main conversion process
async function main() {
  console.log('🚀 Starting PDF to Image Conversion Process');
  console.log('=========================================');
  
  await ensureOutputDir();
  
  console.log(`📁 Searching for PDFs in: ${SOURCE_DIR}`);
  const pdfs = await findPdfs(SOURCE_DIR);
  
  console.log(`📊 Found ${pdfs.length} PDF files to convert\n`);
  
  let successful = 0;
  let failed = 0;
  
  // Process PDFs in batches to avoid memory issues
  const batchSize = 5;
  for (let i = 0; i < pdfs.length; i += batchSize) {
    const batch = pdfs.slice(i, Math.min(i + batchSize, pdfs.length));
    
    await Promise.all(
      batch.map(async (pdfPath) => {
        const result = await convertPdfToImage(pdfPath);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      })
    );
    
    console.log(`Progress: ${Math.min(i + batchSize, pdfs.length)}/${pdfs.length} processed\n`);
  }
  
  console.log('\n=========================================');
  console.log('📈 Conversion Complete!');
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  
  // Generate a mapping file for the application
  const mapping = {};
  const outputFiles = await fs.readdir(OUTPUT_DIR);
  
  for (const file of outputFiles) {
    if (file.endsWith('.jpg')) {
      const name = file.replace('.jpg', '').toUpperCase();
      mapping[name] = `/floorplans/${file}`;
    }
  }
  
  // Save mapping to JSON file
  const mappingPath = path.join(OUTPUT_DIR, 'floorplan-mapping.json');
  await fs.writeFile(mappingPath, JSON.stringify(mapping, null, 2));
  console.log(`\n📝 Floor plan mapping saved to: ${mappingPath}`);
}

// Run the conversion
main().catch(console.error);
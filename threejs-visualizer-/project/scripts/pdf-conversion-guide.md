# PDF Floor Plan Conversion Guide

## Problem
Your PDF floor plans are too large for web use (ranging from 45KB to 7.5MB per file). We need to convert them to optimized images.

## Quick Solution Options

### Option 1: Online Batch Conversion (Recommended)
Use these free online services that support batch conversion:

1. **ILovePDF** (https://www.ilovepdf.com/pdf_to_jpg)
   - Upload up to 25 PDFs at once
   - Choose image quality (recommended: 150 DPI for web)
   - Downloads as ZIP file
   - Free tier allows good quality conversion

2. **SmallPDF** (https://smallpdf.com/pdf-to-jpg)
   - Batch conversion available
   - Good compression options
   - 2 free conversions per day (use incognito for more)

3. **CloudConvert** (https://cloudconvert.com/pdf-to-jpg)
   - 25 free conversions per day
   - Excellent quality control
   - Can set max width to 1920px

### Option 2: Adobe Acrobat (If Available)
1. Open Adobe Acrobat
2. Tools → Export PDF → Image → JPEG
3. Settings: Set quality to "Medium" or 150 DPI
4. Export all PDFs

### Option 3: Windows Built-in (Quick but Lower Quality)
1. Right-click PDF in Windows Explorer
2. Open with Microsoft Edge or Photos app
3. Print → Microsoft Print to PDF → Change to "Microsoft XPS Document Writer"
4. Then convert XPS to JPG using online converter

## Recommended Settings for Web Optimization

- **Format**: JPEG (best compression) or WebP (modern browsers)
- **Resolution**: 150 DPI (good balance of quality/size)
- **Max Width**: 1920 pixels (resize if larger)
- **Quality**: 85% (JPEG quality setting)
- **Expected Size**: 200-500KB per image (down from multi-MB PDFs)

## File Naming Convention

Your PDFs are named like: `F100_LACS.pdf`, `M120_LACS.pdf`, etc.

Convert them to: `f100.jpg`, `m120.jpg` (lowercase, no _LACS suffix)

## After Conversion

1. Place all converted images in:
   `/project/public/floorplans/`

2. The images will be automatically served by your web app at:
   `http://localhost:3092/floorplans/f100.jpg`

## Quick Batch Rename (After Download)

If you need to rename files in bulk on Windows:

1. Select all files in Windows Explorer
2. Right-click → "PowerRename" (if PowerToys installed)
3. Or use command prompt:
   ```cmd
   cd "C:\Users\drews\Downloads\converted_images"
   powershell -Command "Get-ChildItem *.jpg | Rename-Item -NewName {$_.Name -replace '_LACS', '' -replace '\.jpg$', '.jpg'.ToLower()}"
   ```

## File List to Convert

Based on your folder scan, you have 88 PDFs across:
- F-Building: ~32 individual offices + 4 floor plans
- M-Building: ~24 individual offices + 3 floor plans  
- T-Building: ~20 individual offices + 12 floor plans
- Campus-General: Various stages and common areas

## Verification

After conversion, your `/public/floorplans/` folder should contain:
- ~88 JPEG files
- Each file 200-500KB (instead of 45KB-7.5MB PDFs)
- Total folder size: ~30-40MB (instead of 100MB+)
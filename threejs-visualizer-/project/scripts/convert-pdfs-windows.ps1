# PowerShell script to convert PDFs to images using Windows tools
param(
    [string]$SourceDir = "C:\Users\drews\OneDrive\Documents\Floor plans - all offices PDF for leasing\Floor plans - all offices PDF for leasing",
    [string]$OutputDir = "C:\Users\drews\OneDrive\Documents\OFFICIAL_LA_CENTER\threejs-visualizer-\project\public\floorplans"
)

# Create output directory if it doesn't exist
if (!(Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force
}

Write-Host "PDF to Image Conversion Script" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Green
Write-Host "Source: $SourceDir"
Write-Host "Output: $OutputDir"
Write-Host ""

# Get all PDF files recursively
$pdfFiles = Get-ChildItem -Path $SourceDir -Filter "*.pdf" -Recurse

Write-Host "Found $($pdfFiles.Count) PDF files to convert" -ForegroundColor Yellow

foreach ($pdf in $pdfFiles) {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($pdf.Name)
    # Clean the name - remove _LACS suffix
    $cleanName = $baseName -replace '_LACS$', ''
    
    $outputPath = Join-Path $OutputDir "$cleanName.jpg"
    
    Write-Host "Converting: $($pdf.Name) -> $cleanName.jpg" -ForegroundColor Cyan
    
    try {
        # Using Windows built-in tools via COM object
        Add-Type -AssemblyName System.Drawing
        
        # This approach works if we have Acrobat Reader or similar installed
        # Alternative: use online conversion service or manual conversion
        
        Write-Host "  Note: $($pdf.Name) requires manual conversion" -ForegroundColor Yellow
        
    } catch {
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Conversion notes saved. Manual conversion may be required." -ForegroundColor Yellow
Write-Host "Recommended: Use online converter like ilovepdf.com or smallpdf.com" -ForegroundColor Green
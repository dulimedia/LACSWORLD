import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function buildIndex(dir, basePath = '') {
  const result = { name: path.basename(dir), children: [] };
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      if (item.isDirectory()) {
        const subIndex = buildIndex(path.join(dir, item.name), path.join(basePath, item.name));
        result.children.push(subIndex);
      } else if (item.name.endsWith('.glb')) {
        result.children.push(item.name);
      }
    }
    
    // Sort children: directories first, then files
    result.children.sort((a, b) => {
      const aIsDir = typeof a === 'object';
      const bIsDir = typeof b === 'object';
      
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      
      const aName = typeof a === 'string' ? a : a.name;
      const bName = typeof b === 'string' ? b : b.name;
      
      return aName.localeCompare(bName);
    });
    
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error.message);
  }
  
  return result;
}

const boxesDir = path.join(__dirname, '..', 'public', 'models', 'boxes');
const outputFile = path.join(__dirname, '..', 'public', 'models', 'boxes_index.json');

if (!fs.existsSync(boxesDir)) {
  console.error(`Boxes directory not found: ${boxesDir}`);
  process.exit(1);
}

const index = buildIndex(boxesDir);
fs.writeFileSync(outputFile, JSON.stringify(index, null, 2));

console.log(`Generated boxes index with ${index.children.length} buildings:`);
index.children.forEach(building => {
  console.log(`  - ${building.name}`);
});
console.log(`Saved to: ${outputFile}`);
/**
 * Debug Script for Hover Functionality Testing
 * 
 * This script provides comprehensive testing and debugging tools for the hover system.
 * Add this to your browser console to run diagnostics.
 */

window.debugHoverSystem = function() {
  console.log("🔍 === HOVER SYSTEM DIAGNOSTIC START ===");
  
  // Test 1: Check GLB State Structure
  console.log("\n📋 1. GLB State Structure Test");
  try {
    const glbState = window.useGLBState?.getState();
    if (!glbState) {
      console.error("❌ GLB State not available");
      return;
    }
    
    console.log(`✅ GLB Nodes loaded: ${glbState.glbNodes.size} total`);
    console.log(`📊 Loading status: ${glbState.loadedCount}/${glbState.totalCount} loaded`);
    
    // Check for key patterns
    const keys = Array.from(glbState.glbNodes.keys());
    const towerKeys = keys.filter(k => k.includes("Tower Building"));
    const firstStreetKeys = keys.filter(k => k.includes("Fifth Street Building"));
    const marylandKeys = keys.filter(k => k.includes("Maryland Building"));
    
    console.log(`🏗️ Tower Building units: ${towerKeys.length}`);
    console.log(`🏢 Fifth Street Building units: ${firstStreetKeys.length}`);
    console.log(`🏛️ Maryland Building units: ${marylandKeys.length}`);
    
    // Check for specific problematic units
    const problematicUnits = ["T-1100", "T-1000", "T-1200", "F-180"];
    problematicUnits.forEach(unit => {
      const towerKey = `Tower Building/${unit}`;
      const firstStreetKey = `Fifth Street Building/First Floor/${unit}`;
      
      if (glbState.glbNodes.has(towerKey)) {
        console.log(`✅ Found: ${towerKey}`);
      } else if (glbState.glbNodes.has(firstStreetKey)) {
        console.log(`✅ Found: ${firstStreetKey}`);
      } else {
        console.log(`❌ Missing: ${unit} (checked Tower and First Street)`);
        // Look for similar keys
        const similar = keys.filter(k => k.includes(unit));
        if (similar.length > 0) {
          console.log(`   🔍 Similar keys found:`, similar);
        }
      }
    });
    
  } catch (error) {
    console.error("❌ GLB State test failed:", error);
  }
  
  // Test 2: Check Floor Structure
  console.log("\n🏢 2. Floor Structure Test");
  try {
    const glbState = window.useGLBState?.getState();
    
    const buildings = ["Fifth Street Building", "Maryland Building", "Tower Building"];
    const floors = {
      "Fifth Street Building": ["First Floor", "Ground Floor", "Second Floor", "Third Floor"],
      "Maryland Building": ["First Floor", "Ground Floor", "Second Floor", "Third Floor"],
      "Tower Building": ["Main Floor"]
    };
    
    buildings.forEach(building => {
      console.log(`\n🏗️ ${building}:`);
      floors[building].forEach(floor => {
        const units = glbState.getGLBsByFloor(building, floor);
        console.log(`  📍 ${floor}: ${units.length} units`);
        if (units.length === 0) {
          console.log(`    ⚠️  No units found for ${building}/${floor}`);
        } else {
          const loadedUnits = units.filter(u => u.object && u.isLoaded);
          console.log(`    ✅ Units: ${units.slice(0, 3).map(u => u.unitName).join(", ")}${units.length > 3 ? "..." : ""}`);
          console.log(`    📊 Loading: ${loadedUnits.length}/${units.length} units have objects loaded`);
          if (loadedUnits.length === 0 && units.length > 0) {
            console.log(`    ⚠️  All units found but none have objects loaded yet!`);
          }
        }
      });
    });
    
  } catch (error) {
    console.error("❌ Floor structure test failed:", error);
  }
  
  // Test 3: Hover Function Testing
  console.log("\n🖱️ 3. Hover Function Test");
  try {
    const glbState = window.useGLBState?.getState();
    
    // Test unit hover
    console.log("\n🎯 Testing Unit Hover:");
    const testUnits = [
      { building: "Tower Building", floor: "Main Floor", unit: "T-1100" },
      { building: "Fifth Street Building", floor: "First Floor", unit: "F-100" },
      { building: "Maryland Building", floor: "First Floor", unit: "M-140" }
    ];
    
    testUnits.forEach(({ building, floor, unit }) => {
      console.log(`\n  Testing: ${building}/${floor}/${unit}`);
      
      // Test key construction
      let expectedKey;
      if (building === "Tower Building") {
        expectedKey = `${building}/${unit}`;
      } else {
        expectedKey = `${building}/${floor}/${unit}`;
      }
      
      const exists = glbState.glbNodes.has(expectedKey);
      console.log(`    Key: ${expectedKey} - ${exists ? "✅ EXISTS" : "❌ MISSING"}`);
      
      if (!exists) {
        // Look for alternatives
        const alternatives = Array.from(glbState.glbNodes.keys()).filter(k => k.includes(unit));
        if (alternatives.length > 0) {
          console.log(`    🔍 Alternative keys:`, alternatives);
        }
      }
      
      // Test hover function
      try {
        glbState.hoverUnit(building, floor, unit);
        const currentHovered = glbState.hoveredUnit;
        console.log(`    Hover result: ${currentHovered ? "✅ " + currentHovered : "❌ No hover set"}`);
        
        // Clear hover
        glbState.hoverUnit(null, null, null);
      } catch (hoverError) {
        console.log(`    ❌ Hover failed:`, hoverError);
      }
    });
    
    // Test floor hover
    console.log("\n🏢 Testing Floor Hover:");
    const testFloors = [
      { building: "Fifth Street Building", floor: "First Floor" },
      { building: "Maryland Building", floor: "Ground Floor" },
      { building: "Tower Building", floor: "Main Floor" }
    ];
    
    testFloors.forEach(({ building, floor }) => {
      console.log(`\n  Testing: ${building}/${floor}`);
      
      try {
        glbState.hoverFloor(building, floor);
        const currentHoveredFloor = glbState.hoveredFloor;
        console.log(`    Floor hover result: ${currentHoveredFloor ? "✅ " + JSON.stringify(currentHoveredFloor) : "❌ No floor hover set"}`);
        
        // Clear hover
        glbState.hoverFloor(null, null);
      } catch (floorHoverError) {
        console.log(`    ❌ Floor hover failed:`, floorHoverError);
      }
    });
    
  } catch (error) {
    console.error("❌ Hover function test failed:", error);
  }
  
  // Test 4: SelectedUnitOverlay Integration
  console.log("\n✨ 4. SelectedUnitOverlay Integration Test");
  try {
    // Test if SelectedUnitOverlay is responding to hover states
    console.log("📍 Current state:");
    const glbState = window.useGLBState?.getState();
    console.log(`  Hovered Unit: ${glbState.hoveredUnit || "None"}`);
    console.log(`  Hovered Floor: ${glbState.hoveredFloor ? JSON.stringify(glbState.hoveredFloor) : "None"}`);
    console.log(`  Selected Unit: ${glbState.selectedUnit || "None"}`);
    console.log(`  Selected Building: ${glbState.selectedBuilding || "None"}`);
    console.log(`  Selected Floor: ${glbState.selectedFloor || "None"}`);
    
  } catch (error) {
    console.error("❌ SelectedUnitOverlay test failed:", error);
  }
  
  console.log("\n🔍 === HOVER SYSTEM DIAGNOSTIC END ===");
  console.log("\n💡 To test manually:");
  console.log("1. Run: window.testUnitHover('Tower Building', 'Main Floor', 'T-1100')");
  console.log("2. Run: window.testFloorHover('Fifth Street Building', 'First Floor')");
  console.log("3. Run: window.clearAllHovers()");
};

// Helper functions for manual testing
window.testUnitHover = function(building, floor, unit) {
  console.log(`🖱️ Testing unit hover: ${building}/${floor}/${unit}`);
  const glbState = window.useGLBState?.getState();
  glbState?.hoverUnit(building, floor, unit);
  console.log(`Result: hoveredUnit = ${glbState?.hoveredUnit}`);
};

window.testFloorHover = function(building, floor) {
  console.log(`🏢 Testing floor hover: ${building}/${floor}`);
  const glbState = window.useGLBState?.getState();
  glbState?.hoverFloor(building, floor);
  console.log(`Result: hoveredFloor = ${JSON.stringify(glbState?.hoveredFloor)}`);
};

window.clearAllHovers = function() {
  console.log("🧹 Clearing all hovers");
  const glbState = window.useGLBState?.getState();
  glbState?.hoverUnit(null, null, null);
  glbState?.hoverFloor(null, null);
  console.log("✅ All hovers cleared");
};

window.listAllUnits = function() {
  console.log("📋 All available units:");
  const glbState = window.useGLBState?.getState();
  const keys = Array.from(glbState?.glbNodes.keys() || []);
  keys.sort().forEach(key => {
    const node = glbState.glbNodes.get(key);
    console.log(`  ${key} - ${node?.isLoaded ? "✅" : "⏳"} loaded`);
  });
};

window.waitForGLBsAndTest = function() {
  console.log("⏳ Waiting for GLBs to load before testing...");
  const glbState = window.useGLBState?.getState();
  
  const checkLoading = () => {
    const loadedCount = glbState.loadedCount;
    const totalCount = glbState.totalCount;
    console.log(`📊 Loading progress: ${loadedCount}/${totalCount} GLBs loaded`);
    
    if (loadedCount === totalCount && totalCount > 0) {
      console.log("✅ All GLBs loaded! Running diagnostic...");
      window.debugHoverSystem();
    } else if (loadedCount < totalCount) {
      console.log("⏳ Still loading... will check again in 2 seconds");
      setTimeout(checkLoading, 2000);
    } else {
      console.log("❌ No GLBs found. Something might be wrong.");
    }
  };
  
  checkLoading();
};

window.testFloorHoverWhenReady = function(building, floor) {
  console.log(`⏳ Testing floor hover when GLBs are ready: ${building}/${floor}`);
  const glbState = window.useGLBState?.getState();
  
  const testWhenReady = () => {
    const floorUnits = glbState.getGLBsByFloor(building, floor);
    const loadedUnits = floorUnits.filter(u => u.object && u.isLoaded);
    
    console.log(`📊 Floor units: ${floorUnits.length} found, ${loadedUnits.length} loaded`);
    
    if (loadedUnits.length > 0) {
      console.log("✅ Units are loaded! Testing floor hover...");
      window.testFloorHover(building, floor);
    } else if (floorUnits.length > 0) {
      console.log("⏳ Units found but not loaded yet, waiting...");
      setTimeout(testWhenReady, 1000);
    } else {
      console.log("❌ No units found for this floor");
    }
  };
  
  testWhenReady();
};

// Auto-run diagnostic (development only)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log("🔍 Hover Debug System Loaded");
  console.log("Run window.debugHoverSystem() to start diagnostic");
  console.log("Run window.waitForGLBsAndTest() to wait for loading first");
  console.log("Run window.testFloorHoverWhenReady('Fifth Street Building', 'First Floor') to test when ready");
}
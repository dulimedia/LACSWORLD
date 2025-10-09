import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Eye, EyeOff } from 'lucide-react';

interface ShadowSettings {
  shadowsEnabled: boolean;
  shadowMapSize: number;
  shadowIntensity: number;
  shadowRadius: number;
  shadowBias: number;
  showHelpers: boolean;
}

interface SimpleShadowDebugProps {
  isOpen: boolean;
  onToggle: () => void;
  onSettingsChange?: (settings: ShadowSettings) => void;
  initialSettings?: ShadowSettings;
}

export const SimpleShadowDebug: React.FC<SimpleShadowDebugProps> = ({ 
  isOpen, 
  onToggle, 
  onSettingsChange,
  initialSettings 
}) => {
  // Shadow control states initialized from props
  const [shadowsEnabled, setShadowsEnabled] = useState(initialSettings?.shadowsEnabled ?? true);
  const [shadowMapSize, setShadowMapSize] = useState(initialSettings?.shadowMapSize ?? 1024);
  const [shadowIntensity, setShadowIntensity] = useState(initialSettings?.shadowIntensity ?? 2.0);
  const [shadowRadius, setShadowRadius] = useState(initialSettings?.shadowRadius ?? 4);
  const [shadowBias, setShadowBias] = useState(initialSettings?.shadowBias ?? -5);
  const [showHelpers, setShowHelpers] = useState(initialSettings?.showHelpers ?? false);

  // Notify parent of initial settings on mount and force shadow initialization
  useEffect(() => {
    const initialSettingsToApply = {
      shadowsEnabled,
      shadowMapSize,
      shadowIntensity,
      shadowRadius,
      shadowBias,
      showHelpers
    };
    console.log('🎬 SimpleShadowDebug: Applying initial settings:', initialSettingsToApply);
    onSettingsChange?.(initialSettingsToApply);
    
    // Force immediate shadow application even when panel is closed
    console.log('🔥 SimpleShadowDebug: Force applying shadow settings on mount');
  }, []);
  
  // Force apply settings when panel opens to ensure shadows work
  useEffect(() => {
    if (isOpen) {
      const settingsToApply = {
        shadowsEnabled,
        shadowMapSize,
        shadowIntensity,
        shadowRadius,
        shadowBias,
        showHelpers
      };
      console.log('🔥 SimpleShadowDebug: Panel opened, re-applying settings:', settingsToApply);
      onSettingsChange?.(settingsToApply);
    }
  }, [isOpen]);
  
  // Apply settings after a short delay to ensure scene is ready
  useEffect(() => {
    const settingsToApply = {
      shadowsEnabled,
      shadowMapSize,
      shadowIntensity,
      shadowRadius,
      shadowBias,
      showHelpers
    };
    
    const delayedApply = () => {
      console.log('🔥 SimpleShadowDebug: Delayed settings application');
      onSettingsChange?.(settingsToApply);
    };
    
    // Apply immediately
    delayedApply();
    
    // Apply again after delays to ensure scene is ready
    const timeout1 = setTimeout(delayedApply, 100);
    const timeout2 = setTimeout(delayedApply, 500);
    const timeout3 = setTimeout(delayedApply, 1000);
    
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
    };
  }, [shadowsEnabled, shadowMapSize, shadowIntensity, shadowRadius, shadowBias, showHelpers]);

  // Helper function to notify parent of changes
  const notifyChange = (newSettings: Partial<ShadowSettings>) => {
    const settings = {
      shadowsEnabled,
      shadowMapSize,
      shadowIntensity,
      shadowRadius,
      shadowBias,
      showHelpers,
      ...newSettings
    };
    onSettingsChange?.(settings);
  };

  const handleShadowsToggle = () => {
    const newValue = !shadowsEnabled;
    setShadowsEnabled(newValue);
    notifyChange({ shadowsEnabled: newValue });
  };

  const handleShadowMapSizeChange = (value: number) => {
    setShadowMapSize(value);
    notifyChange({ shadowMapSize: value });
  };

  const handleShadowIntensityChange = (value: number) => {
    setShadowIntensity(value);
    notifyChange({ shadowIntensity: value });
  };

  const handleShadowRadiusChange = (value: number) => {
    setShadowRadius(value);
    notifyChange({ shadowRadius: value });
  };

  const handleShadowBiasChange = (value: number) => {
    setShadowBias(value);
    notifyChange({ shadowBias: value });
  };

  const handleShowHelpersToggle = () => {
    const newValue = !showHelpers;
    setShowHelpers(newValue);
    notifyChange({ showHelpers: newValue });
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-lg transition-colors"
        title="Shadow & Lighting Controls"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 p-4 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Shadow & Lighting</h3>
        <button
          onClick={onToggle}
          className="text-gray-500 hover:text-gray-700 text-xl"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-4">
        {/* Shadows Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Enable Shadows</label>
          <button
            onClick={handleShadowsToggle}
            className={`p-2 rounded ${shadowsEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
          >
            {shadowsEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        </div>

        {/* Shadow Quality */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Shadow Quality</label>
          <select
            value={shadowMapSize}
            onChange={(e) => handleShadowMapSizeChange(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded text-sm"
            disabled={!shadowsEnabled}
          >
            <option value={512}>Low (512)</option>
            <option value={1024}>Medium (1024)</option>
            <option value={2048}>High (2048)</option>
            <option value={4096}>Ultra (4096)</option>
          </select>
        </div>

        {/* Light Intensity */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Light Intensity ({shadowIntensity.toFixed(2)})
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={shadowIntensity}
            onChange={(e) => handleShadowIntensityChange(Number(e.target.value))}
            className="w-full"
            disabled={!shadowsEnabled}
          />
        </div>

        {/* Shadow Softness */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Shadow Softness ({shadowRadius})
          </label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={shadowRadius}
            onChange={(e) => handleShadowRadiusChange(Number(e.target.value))}
            className="w-full"
            disabled={!shadowsEnabled}
          />
        </div>

        {/* Shadow Bias */}
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">
            Shadow Bias ({(shadowBias * 10000).toFixed(0)})
          </label>
          <input
            type="range"
            min="-10"
            max="0"
            step="0.1"
            value={shadowBias * 10000}
            onChange={(e) => handleShadowBiasChange(Number(e.target.value) / 10000)}
            className="w-full"
            disabled={!shadowsEnabled}
          />
        </div>

        {/* Debug Helpers */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">Show Light Helpers</label>
          <button
            onClick={handleShowHelpersToggle}
            className={`p-2 rounded ${showHelpers ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}
          >
            <Sun className="w-4 h-4" />
          </button>
        </div>

        {/* Performance Note */}
        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Higher quality settings may impact performance on lower-end devices
        </div>
      </div>
    </div>
  );
};
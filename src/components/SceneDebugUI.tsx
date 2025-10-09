import React, { useState } from 'react';
import { Settings } from 'lucide-react';

export interface SceneDebugSettings {
  sunPosition: [number, number, number];
  sunIntensity: number;
  shadowBias: number;
  shadowNormalBias: number;
  shadowMapSize: number;
}

interface SceneDebugUIProps {
  settings: SceneDebugSettings;
  onChange: (settings: SceneDebugSettings) => void;
}

export const SceneDebugUI: React.FC<SceneDebugUIProps> = ({ settings, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const updateSetting = <K extends keyof SceneDebugSettings>(
    key: K,
    value: SceneDebugSettings[K]
  ) => {
    onChange({ ...settings, [key]: value });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 z-50 bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-lg shadow-lg transition-colors"
        title="Scene Debug Controls"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Scene Controls</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-6">
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Sun Position</h4>
          
          <div>
            <label className="text-xs text-gray-600 block mb-1">
              X: {settings.sunPosition[0].toFixed(1)}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="0.5"
              value={settings.sunPosition[0]}
              onChange={(e) => updateSetting('sunPosition', [
                Number(e.target.value),
                settings.sunPosition[1],
                settings.sunPosition[2]
              ])}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Y: {settings.sunPosition[1].toFixed(1)}
            </label>
            <input
              type="range"
              min="5"
              max="100"
              step="0.5"
              value={settings.sunPosition[1]}
              onChange={(e) => updateSetting('sunPosition', [
                settings.sunPosition[0],
                Number(e.target.value),
                settings.sunPosition[2]
              ])}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Z: {settings.sunPosition[2].toFixed(1)}
            </label>
            <input
              type="range"
              min="-50"
              max="50"
              step="0.5"
              value={settings.sunPosition[2]}
              onChange={(e) => updateSetting('sunPosition', [
                settings.sunPosition[0],
                settings.sunPosition[1],
                Number(e.target.value)
              ])}
              className="w-full"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-600 block mb-1">
            Sun Intensity: {settings.sunIntensity.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={settings.sunIntensity}
            onChange={(e) => updateSetting('sunIntensity', Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-3">
          <h4 className="font-medium text-gray-900 text-sm">Shadows</h4>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Shadow Map Size
            </label>
            <select
              value={settings.shadowMapSize}
              onChange={(e) => updateSetting('shadowMapSize', Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded text-sm"
            >
              <option value={512}>512 (Low)</option>
              <option value={1024}>1024 (Medium)</option>
              <option value={2048}>2048 (High)</option>
              <option value={4096}>4096 (Ultra)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Shadow Bias: {settings.shadowBias.toFixed(4)}
            </label>
            <input
              type="range"
              min="-0.01"
              max="0"
              step="0.0001"
              value={settings.shadowBias}
              onChange={(e) => updateSetting('shadowBias', Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-gray-600 block mb-1">
              Normal Bias: {settings.shadowNormalBias.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.01"
              value={settings.shadowNormalBias}
              onChange={(e) => updateSetting('shadowNormalBias', Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>


        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
          💡 Changes apply in real-time. Higher settings may impact performance.
        </div>
      </div>
    </div>
  );
};

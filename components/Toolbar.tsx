'use client'

import { DrawingSettings } from '@/types/canvas'

interface ToolbarProps {
  settings: DrawingSettings
  onSettingsChange: (settings: DrawingSettings) => void
  onClearCanvas: () => void
  onUndo?: () => void
  onRedo?: () => void
}

const PRESET_COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF', 
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500',
  '#800080', '#FFC0CB', '#A52A2A', '#808080'
]

export default function Toolbar({ settings, onSettingsChange, onClearCanvas, onUndo, onRedo }: ToolbarProps) {
  const updateSetting = <K extends keyof DrawingSettings>(
    key: K, 
    value: DrawingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 shadow-2xl overflow-x-auto">
      <div className="flex items-center justify-between gap-4 min-w-fit">
        {/* Left Section - Tools */}
        <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 flex-shrink-0">
          {/* Drawing Tools */}
          <div className="flex gap-1 sm:gap-2 bg-gray-800/50 p-1 rounded-lg">
            <button
              onClick={() => updateSetting('tool', 'pen')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 ${
                settings.tool === 'pen' 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Pen Tool (P)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            
            <button
              onClick={() => updateSetting('tool', 'eraser')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 ${
                settings.tool === 'eraser' 
                  ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Eraser Tool (E)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            
            {/* Shape Tools Separator */}
            <div className="w-px bg-gray-600 mx-1 hidden sm:block" />
            
            {/* Rectangle Tool */}
            <button
              onClick={() => updateSetting('tool', 'rectangle')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 hidden sm:block ${
                settings.tool === 'rectangle' 
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Rectangle Tool (R)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="4" y="6" width="16" height="12" strokeWidth={2} />
              </svg>
            </button>
            
            {/* Circle Tool */}
            <button
              onClick={() => updateSetting('tool', 'circle')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 hidden sm:block ${
                settings.tool === 'circle' 
                  ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Circle Tool (C)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" strokeWidth={2} />
              </svg>
            </button>
            
            {/* Arrow Tool */}
            <button
              onClick={() => updateSetting('tool', 'arrow')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 hidden md:block ${
                settings.tool === 'arrow' 
                  ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Arrow Tool (A)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            
            {/* Line Tool */}
            <button
              onClick={() => updateSetting('tool', 'line')}
              className={`px-2 sm:px-3 py-2 rounded-md font-medium transition-all duration-200 hidden md:block ${
                settings.tool === 'line' 
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Line Tool (L)"
            >
              <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20L20 4" />
              </svg>
            </button>
          </div>

          {/* Color Selection - Show for all tools except eraser */}
          {settings.tool !== 'eraser' && (
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-gray-400 text-sm">Color:</span>
              <div className="flex items-center gap-2">
                {/* Preset Colors */}
                <div className="hidden xl:flex gap-1">
                  {PRESET_COLORS.map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => updateSetting('color', presetColor)}
                      className={`w-6 h-6 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
                        settings.color === presetColor 
                          ? 'border-white shadow-lg' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: presetColor }}
                    />
                  ))}
                </div>
                {/* Custom Color Picker */}
                <div className="relative">
                  <input
                    type="color"
                    value={settings.color}
                    onChange={(e) => updateSetting('color', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
                    style={{ 
                      backgroundColor: settings.color,
                      boxShadow: '0 0 0 2px rgba(255,255,255,0.2)'
                    }}
                  />
                  <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-gray-600 hover:border-gray-400 transition-colors" />
                </div>
              </div>
            </div>
          )}

          {/* Brush Size */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-gray-400 text-sm">Size:</span>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="20"
                value={settings.strokeWidth}
                onChange={(e) => updateSetting('strokeWidth', Number(e.target.value))}
                className="w-24 lg:w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${(settings.strokeWidth - 1) * 100 / 19}%, #374151 ${(settings.strokeWidth - 1) * 100 / 19}%, #374151 100%)`
                }}
              />
              <div className="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                <div 
                  className="bg-white rounded-full transition-all duration-200"
                  style={{ 
                    width: `${Math.min(settings.strokeWidth, 20)}px`, 
                    height: `${Math.min(settings.strokeWidth, 20)}px` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          {/* Undo Button */}
          {onUndo && (
            <button
              onClick={onUndo}
              className="px-2 sm:px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-1"
              title="Undo (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="hidden sm:inline text-sm">Undo</span>
            </button>
          )}
          
          {/* Redo Button */}
          {onRedo && (
            <button
              onClick={onRedo}
              className="px-2 sm:px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium flex items-center gap-1"
              title="Redo (Ctrl+Y)"
            >
              <span className="hidden sm:inline text-sm">Redo</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          )}
          
          <button
            onClick={onClearCanvas}
            className="px-3 sm:px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all duration-200 font-medium border border-red-500/20 text-sm"
          >
            <span className="hidden sm:inline">Clear</span>
            <span className="sm:hidden">Clr</span>
          </button>
        </div>
      </div>
    </div>
  )
}
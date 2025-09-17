'use client'

import { DrawingSettings } from '@/types/canvas'
import { motion } from 'framer-motion'
import { 
  Pen, Eraser, Square, Circle, ArrowRight, 
  Minus, Undo2, Redo2, Trash2, Type, MousePointer2
} from 'lucide-react'

interface ToolbarProps {
  settings: DrawingSettings
  onSettingsChange: (settings: DrawingSettings) => void
  onClearCanvas: () => void
  onUndo?: () => void
  onRedo?: () => void
  canUndo?: boolean
  canRedo?: boolean
}

const PRESET_COLORS = [
  '#000000', '#ef4444', '#22c55e', '#3b82f6', 
  '#eab308', '#a855f7', '#06b6d4', '#f97316'
]

const tools = [
  { id: 'pen', icon: Pen, color: 'from-blue-500 to-blue-600' },
  { id: 'eraser', icon: Eraser, color: 'from-pink-500 to-pink-600' },
  { id: 'text', icon: Type, color: 'from-indigo-500 to-indigo-600' },
  { id: 'delete', icon: MousePointer2, color: 'from-red-500 to-red-600' },
  { id: 'rectangle', icon: Square, color: 'from-green-500 to-green-600' },
  { id: 'circle', icon: Circle, color: 'from-purple-500 to-purple-600' },
  { id: 'arrow', icon: ArrowRight, color: 'from-yellow-500 to-yellow-600' },
  { id: 'line', icon: Minus, color: 'from-orange-500 to-orange-600' }
]

export default function Toolbar({ 
    settings, 
    onSettingsChange, 
    onClearCanvas, 
    onUndo, 
    onRedo,
    canUndo,
    canRedo
}: ToolbarProps) {
  const updateSetting = <K extends keyof DrawingSettings>(
    key: K, 
    value: DrawingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  return (
    <motion.div 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-3 shadow-2xl">
        <div className="flex items-center gap-3">
          {/* Drawing Tools */}
          <div className="flex gap-1 bg-black/20 p-1 rounded-xl">
            {tools.map((tool) => {
              const Icon = tool.icon
              const isActive = settings.tool === tool.id
              return (
                <motion.button
                  key={tool.id}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => updateSetting('tool', tool.id as any)}
                  className={`relative p-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'text-white shadow-lg' 
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                  title={`${tool.id.charAt(0).toUpperCase() + tool.id.slice(1)} Tool`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTool"
                      className={`absolute inset-0 bg-gradient-to-r ${tool.color} rounded-lg`}
                    />
                  )}
                  <Icon className="w-5 h-5 relative z-10" />
                </motion.button>
              )
            })}
          </div>

          <div className="w-px h-8 bg-white/20" />

          {/* Colors */}
          {settings.tool !== 'eraser' && settings.tool !== 'delete' && (
            <div className="flex gap-1">
              {PRESET_COLORS.map((color) => (
                <motion.button
                  key={color}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => updateSetting('color', color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    settings.color === color 
                      ? 'border-white shadow-lg scale-110' 
                      : 'border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          <div className="w-px h-8 bg-white/20" />

          {/* Brush Size */}
          {settings.tool !== 'text' && settings.tool !== 'delete' && (
             <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={settings.strokeWidth}
                  onChange={(e) => updateSetting('strokeWidth', Number(e.target.value))}
                  className="w-24 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="text-white/60 text-xs font-medium w-6 text-center">
                  {settings.strokeWidth}
                </div>
              </div>
          )}
         
          <div className="w-px h-8 bg-white/20" />

          {/* Actions */}
          <div className="flex gap-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white hover:bg-white/10"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white hover:bg-white/10"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClearCanvas}
              className="p-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
              title="Clear Canvas"
            >
              <Trash2 className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
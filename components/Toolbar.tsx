'use client'

import { DrawingSettings } from '@/types/canvas'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { 
  Pen, Eraser, Square, Circle, ArrowRight, 
  Minus, Undo2, Redo2, Trash2, Type, MousePointer2,
  Palette, ChevronUp, ChevronDown, Sliders
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
  '#000000', '#ffffff', '#ef4444', '#22c55e', 
  '#3b82f6', '#eab308', '#a855f7', '#06b6d4', 
  '#ec4899', '#f97316', '#6b7280', '#8b5cf6'
]

const tools = [
  { id: 'pen', icon: Pen, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'text', icon: Type, label: 'Text' },
  { id: 'delete', icon: MousePointer2, label: 'Select & Delete' }
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
  const [isExpanded, setIsExpanded] = useState(true)
  const [showColors, setShowColors] = useState(false)
  const [showBrushSize, setShowBrushSize] = useState(false)

  const updateSetting = <K extends keyof DrawingSettings>(
    key: K, 
    value: DrawingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value })
  }

  const currentTool = tools.find(t => t.id === settings.tool)

  return (
    <>
      {/* Main Toolbar - Bottom Center */}
      <motion.div 
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 20 }}
      >
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-1">
          <AnimatePresence mode="wait">
            {isExpanded ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-1 p-2"
              >
                {/* Tools Section */}
                <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
                  {tools.map((tool) => {
                    const Icon = tool.icon
                    const isActive = settings.tool === tool.id
                    return (
                      <motion.button
                        key={tool.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => updateSetting('tool', tool.id as DrawingSettings['tool'])}
                        className={`relative p-3 rounded-lg transition-all group ${
                          isActive 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg' 
                            : 'text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {/* Tooltip */}
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          {tool.label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* Color & Size Controls */}
                {settings.tool !== 'eraser' && settings.tool !== 'delete' && (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowColors(!showColors)}
                      className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all relative"
                    >
                      <div 
                        className="w-5 h-5 rounded-full border-2 border-white"
                        style={{ backgroundColor: settings.color }}
                      />
                    </motion.button>

                    {settings.tool !== 'text' && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowBrushSize(!showBrushSize)}
                        className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                      >
                        <Sliders className="w-5 h-5" />
                      </motion.button>
                    )}
                  </>
                )}

                <div className="w-px h-10 bg-white/10" />

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onUndo}
                    disabled={!canUndo}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                  >
                    <Undo2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onRedo}
                    disabled={!canRedo}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                  >
                    <Redo2 className="w-5 h-5" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClearCanvas}
                    className="p-3 rounded-lg bg-white/5 hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="w-px h-10 bg-white/10" />

                {/* Collapse Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExpanded(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2 p-2"
              >
                <div className="flex items-center gap-2 px-2">
                  {currentTool && (
                    <>
                      <currentTool.icon className="w-5 h-5 text-purple-400" />
                      <span className="text-sm text-white/60">{currentTool.label}</span>
                    </>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExpanded(true)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-all text-gray-400 hover:text-white"
                >
                  <ChevronUp className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Color Palette Popup */}
      <AnimatePresence>
        {showColors && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4">
              <div className="grid grid-cols-6 gap-2">
                {PRESET_COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      updateSetting('color', color)
                      setShowColors(false)
                    }}
                    className={`w-10 h-10 rounded-xl border-2 transition-all ${
                      settings.color === color 
                        ? 'border-purple-400 shadow-lg scale-110' 
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                value={settings.color}
                onChange={(e) => updateSetting('color', e.target.value)}
                className="mt-3 w-full h-10 rounded-lg cursor-pointer"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Brush Size Popup */}
      <AnimatePresence>
        {showBrushSize && settings.tool !== 'text' && settings.tool !== 'delete' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4">
              <div className="flex items-center gap-4">
                <span className="text-white/60 text-sm">Size:</span>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={settings.strokeWidth}
                  onChange={(e) => updateSetting('strokeWidth', Number(e.target.value))}
                  className="w-48 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
                />
                <span className="text-white font-medium w-8 text-center">
                  {settings.strokeWidth}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                {[1, 3, 5, 10, 20, 30].map(size => (
                  <motion.button
                    key={size}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      updateSetting('strokeWidth', size)
                      setShowBrushSize(false)
                    }}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/80 text-sm"
                  >
                    {size}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
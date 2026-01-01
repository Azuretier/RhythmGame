import { motion } from "framer-motion";
import { memo, useState } from "react";
import { X, Minus, Maximize2, Square } from "lucide-react";

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowFrameProps {
  title: string;
  id: string;
  onClose: () => void;
  isActive: boolean;
  onFocus: () => void;
  children: React.ReactNode;
  theme: any;
  isDarkMode: boolean;
  large?: boolean;
  scrollable?: boolean;
  position: WindowPosition;
  onPositionChange: (x: number, y: number) => void;
}

const WindowFrame = memo(({ 
  title, 
  id, 
  onClose, 
  isActive, 
  onFocus, 
  children, 
  theme, 
  isDarkMode, 
  large = false,
  scrollable = false,
  position,
  onPositionChange,
}: WindowFrameProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<'close' | 'minimize' | 'maximize' | null>(null);

  const handleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        // If maximized, take full screen (with some padding)
        ...(isMaximized ? {
          x: 0,
          y: 0,
          width: '100vw',
          height: 'calc(100vh - 64px)', // Leave room for taskbar
        } : {})
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      drag={!isMaximized}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (!isMaximized) {
          onPositionChange(
            position.x,
            position.y,
          );
        }
      }}
      onMouseDown={onFocus}
      style={{
        position: isMaximized ? 'fixed' : 'absolute',
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
        zIndex: isActive ? 50 : 40,
      }}
      className={`
        ${isDarkMode ? 'bg-slate-800/95' : 'bg-white/95'} 
        backdrop-blur-xl
        rounded-xl 
        shadow-2xl 
        border 
        ${isActive 
          ? isDarkMode ? 'border-white/20' : 'border-slate-300' 
          : isDarkMode ? 'border-white/10' : 'border-slate-200'
        } 
        overflow-hidden
        ${isMaximized ? 'rounded-none' : ''}
      `}
    >
      {/* Title Bar */}
      <div 
        className={`
          ${isDarkMode ? 'bg-slate-900/90' : 'bg-slate-100/90'}
          px-4 py-3
          flex items-center
          cursor-move 
          border-b 
          ${isDarkMode ? 'border-white/10' : 'border-slate-200'}
          select-none
        `}
      >
        {/* Window Controls - Left Side (macOS style) */}
        <div className="flex items-center gap-2">
          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseEnter={() => setHoveredButton('close')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-3.5 h-3.5 rounded-full 
              flex items-center justify-center
              transition-all duration-150
              ${hoveredButton === 'close' 
                ? 'bg-red-500 scale-110' 
                : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }
              group
            `}
          >
            {hoveredButton === 'close' && (
              <X size={8} className="text-red-900" strokeWidth={3} />
            )}
          </button>

          {/* Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Could implement minimize to taskbar
            }}
            onMouseEnter={() => setHoveredButton('minimize')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-3.5 h-3.5 rounded-full 
              flex items-center justify-center
              transition-all duration-150
              ${hoveredButton === 'minimize' 
                ? 'bg-yellow-500 scale-110' 
                : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }
            `}
          >
            {hoveredButton === 'minimize' && (
              <Minus size={8} className="text-yellow-900" strokeWidth={3} />
            )}
          </button>

          {/* Maximize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleMaximize();
            }}
            onMouseEnter={() => setHoveredButton('maximize')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-3.5 h-3.5 rounded-full 
              flex items-center justify-center
              transition-all duration-150
              ${hoveredButton === 'maximize' 
                ? 'bg-green-500 scale-110' 
                : isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
              }
            `}
          >
            {hoveredButton === 'maximize' && (
              <Maximize2 size={7} className="text-green-900" strokeWidth={3} />
            )}
          </button>
        </div>

        {/* Title - Centered */}
        <div className="flex-1 flex justify-center">
          <span className={`
            ${isDarkMode ? 'text-white/80' : 'text-slate-600'} 
            font-medium text-sm
            truncate max-w-[300px]
          `}>
            {title}
          </span>
        </div>

        {/* Spacer to balance the layout */}
        <div className="w-[68px]"></div>
      </div>

      {/* Content */}
      <div className={`
        p-6 
        ${large ? 'min-w-[900px] max-h-[80vh] overflow-y-auto' : ''} 
        ${scrollable ? 'min-w-[700px] max-h-[70vh] overflow-y-auto' : ''} 
        ${!large && !scrollable ? 'min-w-[700px]' : ''}
        ${isMaximized ? 'min-w-0 w-full h-[calc(100vh-64px-48px)] max-h-none' : ''}
      `}>
        {children}
      </div>
    </motion.div>
  );
});

WindowFrame.displayName = 'WindowFrame';

export default WindowFrame;
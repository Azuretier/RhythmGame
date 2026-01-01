import { motion } from "framer-motion";
import { memo, useState } from "react";
import { X, Minus, Square } from "lucide-react";

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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.15 }}
      drag={!isMaximized}
      dragMomentum={false}
      onDragEnd={(e, info) => {
        if (!isMaximized) {
          onPositionChange(
            position.x + info.offset.x,
            position.y + info.offset.y
          );
        }
      }}
      onMouseDown={onFocus}
      style={{
        position: isMaximized ? 'fixed' : 'absolute',
        left: isMaximized ? 0 : position.x,
        top: isMaximized ? 0 : position.y,
        width: isMaximized ? '100vw' : 'auto',
        height: isMaximized ? 'calc(100vh - 64px)' : 'auto',
        zIndex: isActive ? 50 : 40,
      }}
      className={`
        ${isDarkMode ? 'bg-slate-800' : 'bg-white'} 
        backdrop-blur-xl
        shadow-2xl 
        border 
        ${isActive 
          ? isDarkMode ? 'border-white/20' : 'border-slate-300' 
          : isDarkMode ? 'border-white/10' : 'border-slate-200'
        } 
        overflow-hidden
        ${isMaximized ? 'rounded-none' : 'rounded-xl'}
      `}
    >
      {/* Title Bar */}
      <div 
        className={`
          ${isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}
          px-4 py-2
          flex items-center justify-between
          cursor-move 
          border-b 
          ${isDarkMode ? 'border-white/10' : 'border-slate-200'}
          select-none
        `}
      >
        {/* Title - Left Side */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className={`
            ${isDarkMode ? 'text-white/80' : 'text-slate-700'} 
            font-medium text-sm
            truncate
          `}>
            {title}
          </span>
        </div>

        {/* Window Controls - Right Side */}
        <div className="flex items-center">
          {/* Minimize Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              // Minimize functionality - could minimize to taskbar
            }}
            onMouseEnter={() => setHoveredButton('minimize')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-11 h-8
              flex items-center justify-center
              transition-colors duration-150
              ${hoveredButton === 'minimize' 
                ? 'bg-yellow-500' 
                : 'bg-transparent hover:bg-white/10'
              }
            `}
          >
            <Minus 
              size={16} 
              className={`
                transition-colors duration-150
                ${hoveredButton === 'minimize' 
                  ? 'text-yellow-900' 
                  : isDarkMode ? 'text-white/70' : 'text-slate-500'
                }
              `}
            />
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
              w-11 h-8
              flex items-center justify-center
              transition-colors duration-150
              ${hoveredButton === 'maximize' 
                ? 'bg-green-500' 
                : 'bg-transparent hover:bg-white/10'
              }
            `}
          >
            <Square 
              size={14} 
              className={`
                transition-colors duration-150
                ${hoveredButton === 'maximize' 
                  ? 'text-green-900' 
                  : isDarkMode ? 'text-white/70' : 'text-slate-500'
                }
              `}
            />
          </button>

          {/* Close Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            onMouseEnter={() => setHoveredButton('close')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-11 h-8
              flex items-center justify-center
              transition-colors duration-150
              ${hoveredButton === 'close' 
                ? 'bg-red-500' 
                : 'bg-transparent hover:bg-white/10'
              }
            `}
          >
            <X 
              size={16} 
              className={`
                transition-colors duration-150
                ${hoveredButton === 'close' 
                  ? 'text-white' 
                  : isDarkMode ? 'text-white/70' : 'text-slate-500'
                }
              `}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`
        p-6 
        ${isMaximized 
          ? 'w-full h-[calc(100vh-64px-40px)] max-h-none overflow-y-auto' 
          : large 
            ? 'min-w-[900px] max-h-[80vh] overflow-y-auto' 
            : scrollable 
              ? 'min-w-[700px] max-h-[70vh] overflow-y-auto' 
              : 'min-w-[700px]'
        }
      `}>
        {children}
      </div>
    </motion.div>
  );
});

WindowFrame.displayName = 'WindowFrame';

export default WindowFrame;
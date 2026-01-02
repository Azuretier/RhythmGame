import { motion } from "framer-motion";
import { memo, useState, useRef } from "react";
import { X, Minus, Square, ChevronDown } from "lucide-react";

interface WindowPosition {
  x: number;
  y: number;
}

interface WindowFrameProps {
  title: string;
  id: string;
  onClose: () => void;
  onHide?: () => void;
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
  onHide,
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
  const [hoveredButton, setHoveredButton] = useState<'close' | 'hide' | 'maximize' | null>(null);
  
  const savedPositionRef = useRef<WindowPosition>({ x: position.x, y: position.y });

  const handleMaximize = () => {
    if (!isMaximized) {
      savedPositionRef.current = { x: position.x, y: position.y };
    } else {
      onPositionChange(savedPositionRef.current.x, savedPositionRef.current.y);
    }
    setIsMaximized(!isMaximized);
  };

  const handleHide = () => {
    if (onHide) {
      onHide();
    }
  };

  // Focus and perform action in one click
  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    // Focus first, then immediately perform action
    if (!isActive) {
      onFocus();
    }
    action();
  };

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
        x: isMaximized ? -position.x : 0,
        y: isMaximized ? -position.y : 0,
      }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.15 }}
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
      // Only focus on mousedown for the title bar drag area, not the whole window
      onMouseDown={(e) => {
        // Don't prevent focus, but don't block button clicks
        if (!isActive) {
          onFocus();
        }
      }}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
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
          pl-4 pr-0
          h-10
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
        <div className="flex items-center h-full">
          {/* Hide/Minimize to Taskbar Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleButtonClick(e, handleHide)}
            onMouseEnter={() => setHoveredButton('hide')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-12 h-full
              flex items-center justify-center
              transition-colors duration-100
              ${hoveredButton === 'hide' 
                ? isDarkMode ? 'bg-white/20' : 'bg-black/10'
                : 'bg-transparent'
              }
            `}
          >
            <ChevronDown 
              size={18} 
              className={isDarkMode ? 'text-white/70' : 'text-slate-500'}
            />
          </button>

          {/* Maximize Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleButtonClick(e, handleMaximize)}
            onMouseEnter={() => setHoveredButton('maximize')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-12 h-full
              flex items-center justify-center
              transition-colors duration-100
              ${hoveredButton === 'maximize' 
                ? isDarkMode ? 'bg-white/20' : 'bg-black/10'
                : 'bg-transparent'
              }
            `}
          >
            <Square 
              size={14} 
              className={isDarkMode ? 'text-white/70' : 'text-slate-500'}
            />
          </button>

          {/* Close Button */}
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => handleButtonClick(e, onClose)}
            onMouseEnter={() => setHoveredButton('close')}
            onMouseLeave={() => setHoveredButton(null)}
            className={`
              w-12 h-full
              flex items-center justify-center
              transition-colors duration-100
              ${hoveredButton === 'close' 
                ? 'bg-red-500' 
                : 'bg-transparent'
              }
            `}
          >
            <X 
              size={18} 
              className={`
                transition-colors duration-100
                ${hoveredButton === 'close' 
                  ? 'text-white' 
                  : isDarkMode ? 'text-white/70' : 'text-slate-500'
                }
              `}
            />
          </button>
        </div>
      </div>

      {/* Content - Also handle focus on click */}
      <div 
        className={`
          p-6 
          ${isMaximized 
            ? 'w-full h-[calc(100vh-64px-40px)] max-h-none overflow-y-auto' 
            : large 
              ? 'min-w-[900px] max-h-[80vh] overflow-y-auto' 
              : scrollable 
                ? 'min-w-[700px] max-h-[70vh] overflow-y-auto' 
                : 'min-w-[700px]'
          }
        `}
      >
        {children}
      </div>
    </motion.div>
  );
});

WindowFrame.displayName = 'WindowFrame';

export default WindowFrame;
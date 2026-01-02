// ============================================
// FIXED WindowFrame Component
// - Centers window X under cursor when exiting fullscreen via drag
// - Restores original window size
// ============================================

import { motion, useMotionValue } from "framer-motion";
import { memo, useState, useRef, useEffect } from "react";
import { X, Square, ChevronDown } from "lucide-react";

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
  
  // Use motion values for smooth dragging
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  
  const savedPositionRef = useRef<WindowPosition>({ x: position.x, y: position.y });
  const savedSizeRef = useRef<{ width: number; height: number }>({ width: 700, height: 400 });
  const wasMaximizedRef = useRef(false);
  const windowRef = useRef<HTMLDivElement>(null);

  // Sync motion values with position prop
  useEffect(() => {
    if (!isMaximized) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, isMaximized]);

  // Save window size before maximizing
  const saveWindowSize = () => {
    if (windowRef.current && !isMaximized) {
      savedSizeRef.current = {
        width: windowRef.current.offsetWidth,
        height: windowRef.current.offsetHeight,
      };
    }
  };

  const handleMaximize = () => {
    if (!isMaximized) {
      saveWindowSize();
      savedPositionRef.current = { x: x.get(), y: y.get() };
    } else {
      x.set(savedPositionRef.current.x);
      y.set(savedPositionRef.current.y);
      onPositionChange(savedPositionRef.current.x, savedPositionRef.current.y);
    }
    setIsMaximized(!isMaximized);
  };

  const handleHide = () => {
    if (onHide) {
      onHide();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isActive) {
      onFocus();
    }
    action();
  };

  const handleDragStart = (event: any) => {
    if (isMaximized) {
      wasMaximizedRef.current = true;
      setIsMaximized(false);
    }
  };

  const handleDrag = (event: any, info: any) => {
    // If we just exited fullscreen, center window under cursor
    if (wasMaximizedRef.current) {
      wasMaximizedRef.current = false;
      
      // Get current cursor position
      const cursorX = event.clientX || event.touches?.[0]?.clientX || 0;
      const cursorY = event.clientY || event.touches?.[0]?.clientY || 0;
      
      // Get saved window width (original size before maximize)
      const windowWidth = savedSizeRef.current.width;
      
      // Center the window horizontally under cursor
      const newX = cursorX - (windowWidth / 2);
      // Position Y so cursor is on title bar (20px from top = middle of 40px title bar)
      const newY = cursorY - 20;
      
      x.set(Math.max(0, newX));
      y.set(Math.max(0, newY));
      
      // Update saved position
      savedPositionRef.current = { x: Math.max(0, newX), y: Math.max(0, newY) };
    }
  };

  const handleDragEnd = () => {
    const currentX = x.get();
    const currentY = y.get();
    
    // Snap to fullscreen if dragged to top edge
    if (currentY <= 5) {
      saveWindowSize();
      savedPositionRef.current = { x: currentX, y: 50 };
      setIsMaximized(true);
    } else {
      onPositionChange(currentX, currentY);
    }
  };

  return (
    <motion.div
      ref={windowRef}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1,
      }}
      exit={{ scale: 0.9, opacity: 0 }}
      transition={{ duration: 0.15 }}
      drag
      dragMomentum={false}
      dragElastic={0}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      onMouseDown={(e) => {
        if (!isActive) {
          onFocus();
        }
      }}
      style={{
        position: isMaximized ? 'fixed' : 'absolute',
        left: isMaximized ? 0 : undefined,
        top: isMaximized ? 0 : undefined,
        x: isMaximized ? 0 : x,
        y: isMaximized ? 0 : y,
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

      {/* Content */}
      <div 
        onMouseDown={(e) => e.stopPropagation()}
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
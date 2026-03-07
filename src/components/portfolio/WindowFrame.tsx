// ============================================
// FIXED WindowFrame Component
// - Can drag immediately after exiting fullscreen
// - Cursor stays on title bar when exiting fullscreen
// - Smooth dragging
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
  isDarkMode: boolean;
  large?: boolean;
  scrollable?: boolean;
  position: WindowPosition;
  onPositionChange: (x: number, y: number) => void;
}

const WindowFrame = memo(({ 
  title,
  onClose,
  onHide,
  isActive,
  onFocus,
  children,
  isDarkMode,
  large = false,
  scrollable = false,
  position,
  onPositionChange,
}: WindowFrameProps) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [hoveredButton, setHoveredButton] = useState<'close' | 'hide' | 'maximize' | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Use motion values for smooth dragging
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  
  const savedPositionRef = useRef<WindowPosition>({ x: position.x, y: position.y });
  const containerRef = useRef<HTMLDivElement>(null);

  // Get window width based on props
  const getWindowWidth = () => {
    if (large) return 900;
    return 700;
  };

  // Sync motion values with position prop when not dragging
  useEffect(() => {
    if (!isMaximized && !isDragging) {
      x.set(position.x);
      y.set(position.y);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.x, position.y, isMaximized, isDragging]);

  const handleMaximize = () => {
    if (!isMaximized) {
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

  const handleDragStart = (event: MouseEvent | TouchEvent | PointerEvent) => {
    setIsDragging(true);
    
    if (!isActive) {
      onFocus();
    }

    if (isMaximized) {
      // Get cursor position
      let cursorX = 0;
      let cursorY = 0;
      
      if ('clientX' in event) {
        cursorX = event.clientX;
        cursorY = event.clientY;
      } else if ('touches' in event && event.touches[0]) {
        cursorX = event.touches[0].clientX;
        cursorY = event.touches[0].clientY;
      }
      
      const screenWidth = window.innerWidth;
      const windowWidth = getWindowWidth();
      
      // Calculate cursor position as percentage of screen, then map to window width
      const percentX = cursorX / screenWidth;
      const offsetX = percentX * windowWidth;
      
      // Calculate new position so cursor stays on title bar
      const newX = cursorX - offsetX;
      const newY = cursorY - 20; // 20px = middle of title bar
      
      // Exit fullscreen
      setIsMaximized(false);
      
      // Set position immediately
      x.set(Math.max(0, newX));
      y.set(Math.max(0, newY));
      
      // Save this as the new position
      savedPositionRef.current = { x: Math.max(0, newX), y: Math.max(0, newY) };
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    
    const currentX = x.get();
    const currentY = y.get();
    
    // Snap to fullscreen if dragged to top edge
    if (currentY <= 5) {
      savedPositionRef.current = { x: currentX, y: 50 };
      setIsMaximized(true);
    } else {
      onPositionChange(currentX, currentY);
    }
  };

  return (
    <motion.div
      ref={containerRef}
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
      dragListener={!isMaximized} // Allow drag listener when not maximized
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseDown={() => {
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
      {/* Title Bar - handles drag for fullscreen windows */}
      <div 
        onMouseDown={(e) => {
          // For maximized windows, we need to manually trigger drag behavior
          if (isMaximized) {
            handleDragStart(e.nativeEvent);
            
            // Manually handle the drag
            const handleMouseMove = (moveEvent: MouseEvent) => {
              const newX = moveEvent.clientX - (getWindowWidth() * (e.clientX / window.innerWidth));
              const newY = moveEvent.clientY - 20;
              x.set(Math.max(0, newX));
              y.set(Math.max(0, newY));
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
              handleDragEnd();
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }
        }}
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
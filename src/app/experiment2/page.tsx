"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Cake, GraduationCap, Send, Folder, Share2, ChevronRight, Star, Github, Youtube, Instagram, MessageCircle, Sun, Moon, MapPin, Mail, Globe, Sparkles, TrendingUp, Clock, ExternalLink, User, BarChart3, Terminal, Settings, X, Minimize2, Maximize2, FolderOpen, Image as ImageIcon, Music, Film } from "lucide-react"
import RainEffect from '@/components/main/realistic-rain';

// --- MOCK DATA ---
const PROFILE_INFO = {
  images: ["/api/placeholder/128/128"],
  name: "Your Name",
  pronouns: "they/them",
  birthday: "January 1st",
  role: "Developer & Designer",
  location: "Tokyo, Japan",
  email: "hello@example.com",
  website: "yoursite.com",
  bio_texts: ["Building cool stuff", "Learning new things", "Creating experiences"]
};

const SNS_LINKS = [
  { id: 1, icon: Youtube, label: "YouTube", username: "@yourchannel", href: "https://youtube.com", isStatic: false, followers: "10.5K" },
  { id: 2, icon: Github, label: "GitHub", username: "@yourusername", href: "https://github.com", isStatic: false, followers: "2.3K" },
  { id: 3, icon: Instagram, label: "Instagram", username: "@yourhandle", href: "https://instagram.com", isStatic: false, followers: "5.8K" },
  { id: 4, icon: MessageCircle, label: "Discord", username: "username#0000", href: "#", isStatic: true, followers: "Online" },
];

const PROJECTS = [
  { id: 1, title: "Portfolio Website", status: "Completed", tech: "Next.js, TailwindCSS", description: "Modern portfolio with smooth animations", progress: 100, lastUpdate: "2 days ago" },
  { id: 2, title: "Task Manager App", status: "In Progress", tech: "React, TypeScript", description: "Productivity app with kanban boards", progress: 65, lastUpdate: "5 hours ago" },
  { id: 3, title: "Music Player", status: "Planning", tech: "React, Web Audio API", description: "Beautiful audio player interface", progress: 15, lastUpdate: "1 week ago" },
  { id: 4, title: "Chat Application", status: "Completed", tech: "WebSocket, Node.js", description: "Real-time messaging platform", progress: 100, lastUpdate: "1 month ago" },
];

const VISITOR_DATA = {
  totalVisits: 12847,
  todayVisits: 234,
  uniqueVisitors: 8392,
  avgSessionTime: "3m 42s",
  topCountries: ["Japan 🇯🇵", "USA 🇺🇸", "UK 🇬🇧"],
  lastVisit: "2 minutes ago"
};

const NEWS_HEADLINES = [
  "Breaking: New web framework announced at conference today",
  "Portfolio redesign receives 10K+ visits in first week",
  "Latest project reaches 100% completion milestone",
];

const Main = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [time, setTime] = useState(new Date());
  const [openWindows, setOpenWindows] = useState<string[]>([]);
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [selectedSns, setSelectedSns] = useState(0);
  const [selectedProject, setSelectedProject] = useState(0);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const newsInterval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % NEWS_HEADLINES.length);
    }, 5000);
    return () => clearInterval(newsInterval);
  }, []);

  // Modern loading animation
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsLoading(false), 300);
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, []);

  const openWindow = (windowId: string) => {
    if (!openWindows.includes(windowId)) {
      setOpenWindows([...openWindows, windowId]);
    }
    setActiveWindow(windowId);
  };

  const closeWindow = (windowId: string) => {
    setOpenWindows(openWindows.filter(w => w !== windowId));
    if (activeWindow === windowId) {
      setActiveWindow(openWindows[openWindows.length - 2] || null);
    }
  };

  const handleSnsScroll = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY > 0 && selectedSns < SNS_LINKS.length - 1) {
      setSelectedSns(selectedSns + 1);
    } else if (e.deltaY < 0 && selectedSns > 0) {
      setSelectedSns(selectedSns - 1);
    }
  };

  const handleProjectScroll = (e: React.WheelEvent) => {
    e.stopPropagation();
    if (e.deltaY > 0 && selectedProject < PROJECTS.length - 1) {
      setSelectedProject(selectedProject + 1);
    } else if (e.deltaY < 0 && selectedProject > 0) {
      setSelectedProject(selectedProject - 1);
    }
  };

  const desktopIcons = [
    { id: 'profile', icon: User, label: 'Profile', color: 'bg-blue-500' },
    { id: 'social', icon: Share2, label: 'Social', color: 'bg-purple-500' },
    { id: 'projects', icon: FolderOpen, label: 'Projects', color: 'bg-green-500' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics', color: 'bg-orange-500' },
    { id: 'terminal', icon: Terminal, label: 'Terminal', color: 'bg-gray-700' },
    { id: 'settings', icon: Settings, label: 'Settings', color: 'bg-red-500' },
  ];

  return (
    <>
      {/* Modern Loading Screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"
          >
            {/* Animated background circles */}
            <div className="absolute inset-0 overflow-hidden">
              <motion.div
                className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"
                animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.div
                className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"
                animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-8">
              {/* Logo animation */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="relative"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-24 h-24 border-4 border-transparent border-t-purple-500 border-r-blue-500 rounded-full"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="text-white" size={40} />
                </div>
              </motion.div>

              {/* Loading text */}
              <div className="text-center space-y-2">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-3xl font-black text-white"
                >
                  Loading Experience
                </motion.h2>
                <p className="text-white/60 text-sm">Please wait while we prepare everything</p>
              </div>

              {/* Modern progress bar */}
              <div className="w-80 space-y-2">
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    style={{ width: `${loadingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-white/40 text-xs">
                  <span>Initializing</span>
                  <span>{loadingProgress}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop with Rain Effect */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950"
      >
        {/* Rain Effect Canvas */}
        <RainEffect onLoaded={() => setIsLoaded(true)} />

        {/* Clock and News Overlay */}
        <div className="absolute inset-y-24 left-16 z-10 space-y-4">
          {/* Large Clock */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white"
          >
            <div className="text-8xl font-bold tracking-tighter leading-none drop-shadow-2xl">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="text-2xl font-medium mt-2 opacity-90">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit' })}
            </div>
          </motion.div>

          {/* News Ticker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-black/30 backdrop-blur-md border border-white/10 rounded-xl p-4 max-w-2xl"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={currentNewsIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white/90 text-sm leading-relaxed"
              >
                {NEWS_HEADLINES[currentNewsIndex]}
              </motion.p>
            </AnimatePresence>
            
            {/* Dots indicator */}
            <div className="flex gap-2 mt-3">
              {NEWS_HEADLINES.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentNewsIndex ? 'bg-white w-6' : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Desktop Icons */}
        <div className="absolute top-6 right-6 grid grid-cols-1 gap-6">
          {desktopIcons.map((icon) => (
            <motion.button
              key={icon.id}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => openWindow(icon.id)}
              className="group flex flex-col items-center gap-2"
            >
              <div className={`${icon.color} p-4 rounded-lg shadow-lg border-2 border-white/20 group-hover:border-white/40 transition-all`}>
                <icon.icon className="text-white" size={32} />
              </div>
              <span className="text-white text-sm font-bold bg-black/50 px-3 py-1 rounded backdrop-blur-sm">
                {icon.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Windows with Scrollable Content */}
        <AnimatePresence>
          {openWindows.includes('profile') && (
            <WindowFrame
              title="Profile"
              id="profile"
              onClose={() => closeWindow('profile')}
              isActive={activeWindow === 'profile'}
              onFocus={() => setActiveWindow('profile')}
            >
              <ProfileWindow />
            </WindowFrame>
          )}

          {openWindows.includes('social') && (
            <WindowFrame
              title="Social Networks"
              id="social"
              onClose={() => closeWindow('social')}
              isActive={activeWindow === 'social'}
              onFocus={() => setActiveWindow('social')}
            >
              <div className="relative h-[500px] flex items-center justify-center" onWheel={handleSnsScroll}>
                {SNS_LINKS.map((sns, index) => {
                  const offset = index - selectedSns;
                  const isSelected = index === selectedSns;
                  
                  return (
                    <div
                      key={sns.id}
                      className="absolute transition-all duration-300 ease-out cursor-pointer"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translateX(-50%) translateY(calc(-50% + ${offset * 140}px)) scale(${isSelected ? 1 : 0.85})`,
                        opacity: Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.3,
                        zIndex: 100 - Math.abs(offset),
                        pointerEvents: Math.abs(offset) > 2 ? 'none' : 'auto',
                      }}
                      onClick={() => setSelectedSns(index)}
                    >
                      <SnsWidget {...sns} isSelected={isSelected} />
                    </div>
                  );
                })}
              </div>
            </WindowFrame>
          )}

          {openWindows.includes('projects') && (
            <WindowFrame
              title="Projects"
              id="projects"
              onClose={() => closeWindow('projects')}
              isActive={activeWindow === 'projects'}
              onFocus={() => setActiveWindow('projects')}
            >
              <div className="relative h-[500px] flex items-center justify-center" onWheel={handleProjectScroll}>
                {PROJECTS.map((project, index) => {
                  const offset = index - selectedProject;
                  const isSelected = index === selectedProject;
                  
                  return (
                    <div
                      key={project.id}
                      className="absolute transition-all duration-300 ease-out cursor-pointer"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translateX(-50%) translateY(calc(-50% + ${offset * 140}px)) scale(${isSelected ? 1 : 0.85})`,
                        opacity: Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.3,
                        zIndex: 100 - Math.abs(offset),
                        pointerEvents: Math.abs(offset) > 2 ? 'none' : 'auto',
                      }}
                      onClick={() => setSelectedProject(index)}
                    >
                      <ProjectWidget {...project} isSelected={isSelected} />
                    </div>
                  );
                })}
              </div>
            </WindowFrame>
          )}

          {openWindows.includes('analytics') && (
            <WindowFrame
              title="Site Analytics"
              id="analytics"
              onClose={() => closeWindow('analytics')}
              isActive={activeWindow === 'analytics'}
              onFocus={() => setActiveWindow('analytics')}
            >
              <AnalyticsWindow />
            </WindowFrame>
          )}

          {openWindows.includes('terminal') && (
            <WindowFrame
              title="Terminal"
              id="terminal"
              onClose={() => closeWindow('terminal')}
              isActive={activeWindow === 'terminal'}
              onFocus={() => setActiveWindow('terminal')}
            >
              <TerminalWindow />
            </WindowFrame>
          )}
        </AnimatePresence>

        {/* Taskbar */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-md border-t border-white/10 flex items-center px-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 bg-blue-600 rounded-lg shadow-lg"
          >
            <Sparkles className="text-white" size={24} />
          </motion.button>

          <div className="flex-1 flex gap-2">
            {openWindows.map((windowId) => {
              const icon = desktopIcons.find(i => i.id === windowId);
              return (
                <button
                  key={windowId}
                  onClick={() => setActiveWindow(windowId)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    activeWindow === windowId
                      ? 'bg-white/20 border-2 border-white/30'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  {icon && <icon.icon className="text-white" size={18} />}
                  <span className="text-white text-sm font-medium">{icon?.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className="text-white text-sm font-mono">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-white/60 text-xs">
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </motion.main>
    </>
  );
};

// Window Frame Component
const WindowFrame = ({ title, id, onClose, isActive, onFocus, children }: any) => {
  const [position, setPosition] = useState({ x: 100 + Math.random() * 200, y: 50 + Math.random() * 100 });
  const [isDragging, setIsDragging] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      drag
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      onMouseDown={onFocus}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: isActive ? 50 : 40,
      }}
      className={`bg-slate-800 rounded-lg shadow-2xl border-2 ${isActive ? 'border-blue-500' : 'border-white/10'} overflow-hidden`}
    >
      {/* Title Bar */}
      <div className="bg-slate-900/90 px-6 py-4 flex items-center justify-between cursor-move border-b border-white/10">
        <span className="text-white font-bold text-sm">{title}</span>
        <div className="flex gap-2">
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-colors"></button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-colors"></button>
          <button
            onClick={onClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
          ></button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-w-[700px]">
        {children}
      </div>
    </motion.div>
  );
};

// Profile Window
const ProfileWindow = () => (
  <div className="space-y-6">
    <div className="flex items-start gap-6">
      <div className="relative">
        <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-purple-500/50 shadow-xl">
          <img src={PROFILE_INFO.images[0]} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-800"></div>
      </div>
      <div className="flex-1 space-y-3">
        <h2 className="text-3xl font-black text-white">{PROFILE_INFO.name}</h2>
        <p className="text-purple-400 font-bold uppercase text-sm tracking-wider">{PROFILE_INFO.pronouns}</p>
        <p className="text-gray-400">{PROFILE_INFO.role}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <InfoCard icon={Cake} label="Birthday" value={PROFILE_INFO.birthday} color="text-pink-400" />
      <InfoCard icon={MapPin} label="Location" value={PROFILE_INFO.location} color="text-green-400" />
      <InfoCard icon={Mail} label="Email" value={PROFILE_INFO.email} color="text-blue-400" />
      <InfoCard icon={Globe} label="Website" value={PROFILE_INFO.website} color="text-purple-400" />
    </div>
  </div>
);

const InfoCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="bg-slate-900/50 p-4 rounded-lg border border-white/10">
    <div className="flex items-center gap-2 mb-2">
      <Icon className={color} size={16} />
      <span className="text-gray-400 text-xs font-bold uppercase">{label}</span>
    </div>
    <p className="text-white font-medium text-sm">{value}</p>
  </div>
);

// SNS Widget (Scrollable osu-style)
const SnsWidget = ({ icon: Icon, label, username, followers, isSelected }: any) => {
  const brandStyles: Record<string, { gradient: string; glowColor: string }> = {
    YouTube: { gradient: "from-red-500 to-red-600", glowColor: "shadow-red-500/50" },
    GitHub: { gradient: "from-gray-700 to-gray-900", glowColor: "shadow-gray-500/50" },
    Instagram: { gradient: "from-purple-500 via-pink-500 to-orange-500", glowColor: "shadow-pink-500/50" },
    Discord: { gradient: "from-indigo-500 to-blue-600", glowColor: "shadow-blue-500/50" },
  };

  const activeBrand = brandStyles[label] || { gradient: "from-gray-500 to-gray-700", glowColor: "shadow-gray-500/50" };

  return (
    <div className={`
      w-[600px] h-28 rounded-2xl border-2 transition-all duration-300
      ${isSelected 
        ? `border-white bg-gradient-to-r shadow-2xl ${activeBrand.glowColor}` 
        : 'border-white/20 bg-gradient-to-r'
      } ${activeBrand.gradient}
    `}>
      <div className="relative h-full flex items-center px-8 gap-5 backdrop-blur-sm bg-black/40 rounded-2xl">
        <div className={`w-1.5 h-20 rounded-full bg-white ${isSelected ? 'opacity-100' : 'opacity-50'}`}></div>
        
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${isSelected ? 'bg-white/30' : 'bg-white/20'} backdrop-blur-sm`}>
          <Icon size={28} className="text-white" />
        </div>

        <div className="flex-1">
          <h3 className="text-white font-bold text-2xl truncate mb-1">{label}</h3>
          <p className="text-white/80 text-sm truncate">{username}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-white/60 text-xs">{followers} followers</span>
          </div>
        </div>

        {isSelected && (
          <ChevronRight className="w-6 h-6 text-white animate-pulse" />
        )}
      </div>
    </div>
  );
};

// Project Widget (Scrollable osu-style)
const ProjectWidget = ({ title, status, tech, progress, lastUpdate, isSelected }: any) => {
  const statusColors: Record<string, { gradient: string; glowColor: string }> = {
    'In Progress': { gradient: 'from-yellow-500 to-orange-500', glowColor: 'shadow-orange-500/50' },
    'Completed': { gradient: 'from-green-500 to-emerald-500', glowColor: 'shadow-green-500/50' },
    'Planning': { gradient: 'from-purple-500 to-pink-500', glowColor: 'shadow-purple-500/50' },
  };

  const statusStyle = statusColors[status] || { gradient: 'from-cyan-500 to-blue-600', glowColor: 'shadow-cyan-500/50' };

  return (
    <div className={`
      w-[600px] h-28 rounded-2xl border-2 transition-all duration-300
      ${isSelected 
        ? `border-white bg-gradient-to-r shadow-2xl ${statusStyle.glowColor}` 
        : 'border-white/20 bg-gradient-to-r'
      } ${statusStyle.gradient}
    `}>
      <div className="relative h-full flex items-center px-8 gap-5 backdrop-blur-sm bg-black/40 rounded-2xl">
        <div className={`w-1.5 h-20 rounded-full bg-white ${isSelected ? 'opacity-100' : 'opacity-50'}`}></div>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white/20 text-white uppercase tracking-widest border border-white/20">
              {status}
            </span>
            <span className="text-white/50 text-xs">{lastUpdate}</span>
          </div>
          
          <h3 className="text-white font-bold text-2xl truncate">{title}</h3>
          <p className="text-white/70 text-xs truncate">{tech}</p>
          
          <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
            <span className="text-white text-xs font-bold">{progress}%</span>
          </div>
          {isSelected && (
            <ChevronRight className="w-6 h-6 text-white animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

// Analytics Window
const AnalyticsWindow = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <StatCard label="Total Visits" value={VISITOR_DATA.totalVisits.toLocaleString()} icon={TrendingUp} color="bg-blue-500" />
      <StatCard label="Today's Visits" value={VISITOR_DATA.todayVisits.toLocaleString()} icon={Clock} color="bg-green-500" />
      <StatCard label="Unique Visitors" value={VISITOR_DATA.uniqueVisitors.toLocaleString()} icon={User} color="bg-purple-500" />
      <StatCard label="Avg. Session" value={VISITOR_DATA.avgSessionTime} icon={Clock} color="bg-orange-500" />
    </div>

    <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10">
      <h3 className="text-white font-bold mb-4 flex items-center gap-2">
        <Globe className="text-blue-400" size={20} />
        Top Countries
      </h3>
      <div className="space-y-2">
        {VISITOR_DATA.topCountries.map((country, i) => (
          <div key={i} className="flex items-center justify-between text-white/80">
            <span>{country}</span>
            <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                style={{ width: `${100 - i * 20}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="bg-slate-900/50 p-4 rounded-lg border border-white/10">
      <p className="text-gray-400 text-sm">
        Last visit: <span className="text-white font-medium">{VISITOR_DATA.lastVisit}</span>
      </p>
    </div>
  </div>
);

// Terminal Window
const TerminalWindow = () => {
  const [lines] = useState([
    '$ whoami',
    'developer@portfolio',
    '$ ls -la',
    'drwxr-xr-x  profile.txt',
    'drwxr-xr-x  projects/',
    'drwxr-xr-x  social/',
    '-rw-r--r--  README.md',
    '$ cat README.md',
    'Welcome to my portfolio!',
    'Feel free to explore around.',
    '$'
  ]);

  return (
    <div className="bg-black rounded-lg p-6 font-mono text-sm">
      {lines.map((line, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className={line.startsWith('$') ? 'text-green-400' : 'text-white/80'}
        >
          {line}
        </motion.div>
      ))}
      <span className="text-green-400 animate-pulse">█</span>
    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="bg-slate-900/50 p-6 rounded-lg border border-white/10">
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
      <Icon className="text-white" size={24} />
    </div>
    <p className="text-3xl font-black text-white mb-1">{value}</p>
    <p className="text-gray-400 text-sm font-medium">{label}</p>
  </div>
);

export default Main;
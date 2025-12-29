"use client"

import { useEffect, useState, createContext, useContext, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Disc3, MessageSquare } from "lucide-react"
import { db } from "@/lib/portfolio/firebase";
import { auth } from "@/lib/portfolio/firebase";
import { Cake, GraduationCap, Send, Folder, Share2, ChevronRight, Star, Github, Youtube, Instagram, MessageCircle, Sun, Moon, MapPin, Mail, Globe, Sparkles, TrendingUp, Clock, ExternalLink, User as UserIcon, BarChart3, Terminal, Settings, X, Minimize2, Maximize2, FolderOpen, Image as ImageIcon, Music, Film, BookOpen, Bot, Command, Zap, Shield, Heart, Code, HelpCircle, ChevronDown, ChevronUp, Copy, Check, ArrowLeft, Layers, Server, Database, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Battery, BatteryCharging, Cpu, HardDrive, Thermometer,Users, Hash, Mic, Headphones, AtSign, Send as SendIcon, Smile, Paperclip, PenSquare, Calendar, Tag, Eye, ThumbsUp, MessageSquare as CommentIcon, Rss, Bookmark, MoreHorizontal, Wifi, Bluetooth, Monitor, Activity, Zap as ZapIcon } from "lucide-react"
import RainEffect from '@/components/main/realistic-rain';
import { signInAnonymously, onAuthStateChanged, User } from "firebase/auth";
import { TerminalLineType, TRANSLATIONS, SNS_LINKS, MUSIC_TRACKS, THEMES, PROFILE_INFO, DISCORD_SERVERS, PROJECTS, VISITOR_DATA, NEWS_HEADLINES, AZURE_DOCS, BLOG_POSTS, TERMINAL_COMMANDS } from "@/components/portfolio/data";

// --- SETTINGS CONTEXT ---
interface SettingsContextType {
  theme: string;
  setTheme: (theme: string) => void;
  rainIntensity: number;
  setRainIntensity: (intensity: number) => void;
  newsSpeed: number;
  setNewsSpeed: (speed: number) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  notifications: boolean;
  setNotifications: (enabled: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  isLoading: boolean;
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const SettingsContext = createContext<SettingsContextType | null>(null);

const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
};

// --- WINDOW POSITION TYPE ---
interface WindowPosition {
  x: number;
  y: number;
}

const Main = () => {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState('purple');
  const [rainIntensity, setRainIntensity] = useState(150);
  const [newsSpeed, setNewsSpeed] = useState(5);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [language, setLanguage] = useState('en');
  const [settingsLoading, setSettingsLoading] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [time, setTime] = useState(new Date());

  const [openWindows, setOpenWindows] = useState<string[]>([]); // Acts as our Z-index stack
  const [activeWindow, setActiveWindow] = useState<string | null>(null);
  const [windowPositions, setWindowPositions] = useState<Record<string, WindowPosition>>({});
  const [selectedSns, setSelectedSns] = useState(0);
  const [selectedProject, setSelectedProject] = useState(0);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Store window positions to prevent teleporting

  const currentTheme = THEMES[theme as keyof typeof THEMES] || THEMES.purple;

  // Translation function
  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en'][key] || key;
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else signInAnonymously(auth);
    });
    return () => unsub();
  }, []);

  // Inside your Main component, update the loadSettings useCallback:
const loadSettings = useCallback(async () => {
  if (!user) return;
  
  setSettingsLoading(true);
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/portfolio/firebase');
    
    // Ensure the path is correct - check your .env if this returns undefined
    const appId = process.env.NEXT_PUBLIC_MNSW_FIREBASE_APP_ID;
    const docRef = doc(db, `artifacts/${appId}/user_settings/${user.uid}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.theme) setTheme(data.theme);
      if (data.rainIntensity) setRainIntensity(data.rainIntensity);
      if (data.newsSpeed) setNewsSpeed(data.newsSpeed);
      if (data.isDarkMode !== undefined) setIsDarkMode(data.isDarkMode);
      if (data.notifications !== undefined) setNotifications(data.notifications);
      if (data.language) setLanguage(data.language);
      console.log("Settings loaded successfully");
    }
  } catch (error) {
    console.error("Error loading settings:", error);
  } finally {
    setSettingsLoading(false);
  }
}, [user]); // Only recreate if user object changes

  const saveSettings = useCallback(async () => {
    if (!user) return;
    const { doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/portfolio/firebase');
    await setDoc(doc(db, `artifacts/${process.env.NEXT_PUBLIC_MNSW_FIREBASE_APP_ID}/user_settings/${user.uid}`), { 
            theme,
            rainIntensity,
            newsSpeed,
            isDarkMode,
            notifications,
            language, 
            updatedAt: Date.now() 
        }, { merge: true });
    }, [theme, rainIntensity, newsSpeed, isDarkMode, notifications, language]);

  // Add this effect below your other useEffects
  useEffect(() => {
    if (user) {
      loadSettings();
    }
  }, [user, loadSettings]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const newsInterval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % NEWS_HEADLINES.length);
    }, newsSpeed * 1000);
    return () => clearInterval(newsInterval);
  }, [newsSpeed]);

  // Modern loading animation
  // Update your loading progress useEffect:
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        // If we've reached 90% but settings are still fetching, hang at 90
        if (prev >= 90 && settingsLoading) {
          return 90;
        }
        
        if (prev >= 100) {
          clearInterval(interval);
          // Only hide the loading screen if settings have finished loading
          if (!settingsLoading) {
            setTimeout(() => setIsLoading(false), 300);
          }
          return 100;
        }
        return prev + 1;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [settingsLoading]); // Add settingsLoading as dependency

  // Initialize window position only once when opening
  const getWindowPosition = (windowId: string): WindowPosition => {
    if (windowPositions[windowId]) {
      return windowPositions[windowId];
    }
    // Calculate new position based on existing windows
    const baseX = 100;
    const baseY = 50;
    const offset = Object.keys(windowPositions).length * 30;
    return { x: baseX + offset, y: baseY + offset };
  };

  const openWindow = (windowId: string) => {
    setOpenWindows((prev) => {
      // If window is already open, just bring it to the front of the stack
      if (prev.includes(windowId)) {
        setActiveWindow(windowId);
        return [...prev.filter((id) => id !== windowId), windowId];
      }

      // Initialize position ONLY if it doesn't exist yet
      setWindowPositions((positions) => {
        if (positions[windowId]) return positions;
        // Staggering effect based on how many windows exist right now
        const stagger = Object.keys(positions).length * 30;
        return {
          ...positions,
          [windowId]: { x: 100 + stagger, y: 80 + stagger },
        };
      });

      setActiveWindow(windowId);
      return [...prev, windowId];
    });
  };

  // 3. Robust Close Function
  const closeWindow = (windowId: string) => {
    setOpenWindows((prev) => {
      const newStack = prev.filter((id) => id !== windowId);
      
      // Logic: If the closed window was active, focus the next one in the stack
      if (activeWindow === windowId) {
        setActiveWindow(newStack.length > 0 ? newStack[newStack.length - 1] : null);
      }
      return newStack;
    });
  };

  // 4. Stable Position Update
  const updateWindowPosition = (windowId: string, x: number, y: number) => {
    setWindowPositions((prev) => ({
      ...prev,
      [windowId]: { x, y },
    }));
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
    { id: 'profile', icon: UserIcon, label: t('profile'), color: `${currentTheme.accent}` },
    { id: 'social', icon: Share2, label: t('social'), color: 'bg-purple-500' },
    { id: 'projects', icon: FolderOpen, label: t('projects'), color: 'bg-green-500' },
    { id: 'analytics', icon: BarChart3, label: t('analytics'), color: 'bg-orange-500' },
    { id: 'azure-docs', icon: Bot, label: t('azureDocs'), color: 'bg-indigo-500' },
    { id: 'music', icon: Music, label: 'Music', color: 'bg-pink-500' },
    { id: 'discord', icon: MessageCircle, label: 'Discord', color: 'bg-indigo-600' },
    { id: 'live-chat', icon: Users, label: 'Live Chat', color: 'bg-emerald-500' },
    { id: 'blog', icon: PenSquare, label: 'Blog', color: 'bg-amber-500' },
    { id: 'terminal', icon: Terminal, label: t('terminal'), color: 'bg-gray-700' },
    { id: 'settings', icon: Settings, label: t('settings'), color: 'bg-red-500' },
  ];

  const MusicPlayerWindow = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState(0);
    const [volume, setVolume] = useState(75);
    const [brightness, setBrightness] = useState(85);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // Simulated system stats
    const [systemStats] = useState({
      cpu: 21,
      ram: 28,
      disk: 30,
      battery: 100,
      batteryCharging: false,
      uptime: "1 day, 8 hours, 37 min",
      coreTemps: [55, 57, 56, 53],
      avgTemp: 57,
    });

    const track = MUSIC_TRACKS[currentTrack];
    
    // Simulate progress
    useEffect(() => {
      if (isPlaying) {
        const interval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              setCurrentTrack(c => (c + 1) % MUSIC_TRACKS.length);
              return 0;
            }
            return prev + 0.5;
          });
          setCurrentTime(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
      }
    }, [isPlaying]);

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const parseTime = (timeStr: string) => {
      const [mins, secs] = timeStr.split(':').map(Number);
      return mins * 60 + secs;
    };

    const nextTrack = () => { setCurrentTrack((prev) => (prev + 1) % MUSIC_TRACKS.length); setProgress(0); setCurrentTime(0); };
    const prevTrack = () => { setCurrentTrack((prev) => (prev - 1 + MUSIC_TRACKS.length) % MUSIC_TRACKS.length); setProgress(0); setCurrentTime(0); };

    // Circular Progress Component
    const CircularProgress = ({ value, max, size, color, icon: Icon, label }: any) => {
      const radius = (size - 8) / 2;
      const circumference = 2 * Math.PI * radius;
      const strokeDashoffset = circumference - (value / max) * circumference;

      return (
        <div className="flex flex-col items-center gap-1">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg className="absolute inset-0 -rotate-90" width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}
                strokeWidth="4"
              />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-300"
              />
            </svg>
            {/* Icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon size={size / 3} style={{ color }} />
            </div>
          </div>
          <span className={`text-xs font-mono ${isDarkMode ? 'text-white/70' : 'text-slate-600'}`}>
            <span style={{ color }}>{label}</span> {value}%
          </span>
        </div>
      );
    };

    return (
      <div className={`space-y-4 font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        {/* User Profile Header */}
        <div className={`flex items-center gap-4 p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="relative">
            <img src="/api/placeholder/64/64" alt="User" className="w-16 h-16 rounded-xl object-cover" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>Monasm</h2>
            <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>up {systemStats.uptime}</p>
          </div>
          <div className="flex gap-2">
            {[Wifi, Bluetooth, Monitor, Settings].map((Icon, i) => (
              <button key={i} className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'} transition-colors`}>
                <Icon size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
              </button>
            ))}
          </div>
        </div>

        {/* Battery Status */}
        <div className={`p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={`w-16 h-8 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-300'} rounded-md border-2 ${isDarkMode ? 'border-white/20' : 'border-slate-400'} overflow-hidden`}>
                <div 
                  className="h-full bg-green-500 transition-all duration-300"
                  style={{ width: `${systemStats.battery}%` }}
                />
              </div>
              <div className={`absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-3 ${isDarkMode ? 'bg-white/20' : 'bg-slate-400'} rounded-r`}></div>
            </div>
            <div>
              <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Battery {systemStats.battery}%</p>
              <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>0 h 0 min to full. Full</p>
            </div>
          </div>
        </div>

        {/* System Stats */}
        <div className={`p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex justify-around">
            <CircularProgress value={systemStats.cpu} max={100} size={70} color="#f472b6" icon={Cpu} label="CPU" />
            <CircularProgress value={systemStats.ram} max={100} size={70} color="#60a5fa" icon={Activity} label="RAM" />
            <CircularProgress value={systemStats.disk} max={100} size={70} color="#4ade80" icon={HardDrive} label="DISK" />
          </div>

          {/* Volume & Brightness Sliders */}
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3">
              <Volume2 size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${volume}%`, background: `linear-gradient(to right, ${theme.primary}, ${theme.secondary})` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sun size={16} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                <div 
                  className="h-full bg-yellow-400 rounded-full transition-all"
                  style={{ width: `${brightness}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Core Temperature */}
        <div className={`p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <h3 className={`font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Core Temperature</h3>
          <p className={`text-3xl font-bold mb-4 ${systemStats.avgTemp > 70 ? 'text-red-500' : systemStats.avgTemp > 50 ? 'text-orange-400' : 'text-green-400'}`}>
            {systemStats.avgTemp} °C
          </p>
          <div className="grid grid-cols-2 gap-2">
            {systemStats.coreTemps.map((temp, i) => (
              <div key={i} className={`px-3 py-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg text-sm`}>
                <span className={isDarkMode ? 'text-white/50' : 'text-slate-500'}>Core {i}: </span>
                <span className={temp > 60 ? 'text-orange-400' : isDarkMode ? 'text-white' : 'text-slate-900'}>{temp} °C</span>
              </div>
            ))}
          </div>
        </div>

        {/* Music Player */}
        <div className={`p-4 ${isDarkMode ? 'bg-slate-900/80' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-4">
            {/* Album Art */}
            <motion.div
              animate={{ rotate: isPlaying ? 360 : 0 }}
              transition={{ duration: 3, repeat: isPlaying ? Infinity : 0, ease: "linear" }}
              className="relative"
            >
              <img src={track.cover} alt={track.title} className="w-16 h-16 rounded-xl object-cover" />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
                  <Disc3 className="text-white animate-pulse" size={24} />
                </div>
              )}
            </motion.div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold truncate ${isDarkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>{track.title}</h4>
              <p className={`text-sm truncate ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>By {track.artist}</p>
              
              {/* Progress */}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                  <div 
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, background: theme.primary }}
                  />
                </div>
                <span className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>{track.duration}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <button onClick={prevTrack} className={`p-2 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'} rounded-full transition-colors`}>
              <SkipBack size={20} className={isDarkMode ? 'text-white' : 'text-slate-700'} />
            </button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 bg-gradient-to-r ${theme.gradient} rounded-full text-white shadow-lg hover:opacity-90 transition-opacity`}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>
            <button onClick={nextTrack} className={`p-2 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-200'} rounded-full transition-colors`}>
              <SkipForward size={20} className={isDarkMode ? 'text-white' : 'text-slate-700'} />
            </button>
          </div>
        </div>
      </div>
    );
  };

// ============================================
// 5. DISCORD SERVERS WINDOW
// ============================================

  const DiscordWindow = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [copiedInvite, setCopiedInvite] = useState<string | null>(null);
    const [hoveredServer, setHoveredServer] = useState<number | null>(null);

    const categories = ['All', ...new Set(DISCORD_SERVERS.map(s => s.category))];
    const filteredServers = selectedCategory && selectedCategory !== 'All' 
      ? DISCORD_SERVERS.filter(s => s.category === selectedCategory)
      : DISCORD_SERVERS;

    const copyInvite = (invite: string) => {
      navigator.clipboard.writeText(invite);
      setCopiedInvite(invite);
      setTimeout(() => setCopiedInvite(null), 2000);
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>My Discord Servers</h2>
            <p className={isDarkMode ? 'text-white/60' : 'text-slate-600'}>Join our communities and connect!</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 ${isDarkMode ? 'bg-indigo-500/20' : 'bg-indigo-100'} rounded-full`}>
            <Users size={18} className="text-indigo-500" />
            <span className="text-indigo-500 font-bold">
              {DISCORD_SERVERS.reduce((acc, s) => acc + parseInt(s.members.replace(',', '')), 0).toLocaleString()} Members
            </span>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === 'All' ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                (cat === 'All' && !selectedCategory) || selectedCategory === cat
                  ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                  : `${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Server Cards */}
        <div className="grid grid-cols-2 gap-4">
          {filteredServers.map((server) => (
            <motion.div
              key={server.id}
              whileHover={{ scale: 1.02, y: -4 }}
              onHoverStart={() => setHoveredServer(server.id)}
              onHoverEnd={() => setHoveredServer(null)}
              className={`${isDarkMode ? 'bg-slate-900/80' : 'bg-white'} rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} shadow-lg`}
            >
              {/* Banner */}
              <div className="relative h-24 bg-gradient-to-r from-indigo-500 to-purple-600">
                <div className="absolute inset-0 bg-black/20"></div>
                {server.verified && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Check size={12} />
                    Verified
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4 -mt-8 relative">
                {/* Server Icon */}
                <div className={`w-16 h-16 rounded-2xl ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border-4 ${isDarkMode ? 'border-slate-900' : 'border-white'} shadow-lg flex items-center justify-center text-3xl mb-3`}>
                  {server.icon}
                </div>

                <h3 className={`font-bold text-lg ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{server.name}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'} line-clamp-2 mt-1`}>{server.description}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1">
                    <Users size={14} className={isDarkMode ? 'text-white/40' : 'text-slate-400'} />
                    <span className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>{server.members}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>{server.online} online</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4">
                  <a
                    href={server.invite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 py-2 px-4 bg-gradient-to-r ${theme.gradient} text-white font-medium rounded-lg text-center text-sm hover:opacity-90 transition-opacity`}
                  >
                    Join Server
                  </a>
                  <button
                    onClick={() => copyInvite(server.invite)}
                    className={`p-2 ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} rounded-lg transition-colors`}
                  >
                    {copiedInvite === server.invite ? <Check size={18} className="text-green-500" /> : <Copy size={18} className={isDarkMode ? 'text-white' : 'text-slate-600'} />}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

// ============================================
// 6. LIVE CHAT WINDOW (Real-time with Firestore)
// ============================================

  // Types for chat
  interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    avatar: string;
    message: string;
    timestamp: Date;
    type: 'message' | 'join' | 'leave';
  }

  const LiveChatWindow = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
      { id: '1', userId: 'system', username: 'System', avatar: '', message: 'Welcome to the live chat!', timestamp: new Date(), type: 'join' },
      { id: '2', userId: 'user1', username: 'CoolUser123', avatar: '/api/placeholder/32/32', message: 'Hey everyone! 👋', timestamp: new Date(Date.now() - 60000), type: 'message' },
      { id: '3', userId: 'user2', username: 'DevGuru', avatar: '/api/placeholder/32/32', message: 'This portfolio is amazing!', timestamp: new Date(Date.now() - 30000), type: 'message' },
    ]);
    const [newMessage, setNewMessage] = useState('');
    const [username, setUsername] = useState('Guest' + Math.floor(Math.random() * 1000));
    const [onlineUsers] = useState(12);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // FIRESTORE REAL-TIME LISTENER (uncomment when Firebase is set up)
    useEffect(() => {
      const q = query(
        collection(db, 'chatMessages'),
        orderBy('timestamp', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date(),
        })) as ChatMessage[];
        setMessages(newMessages.reverse());
      });

      return () => unsubscribe();
    }, []);

    const sendMessage = async () => {
      if (!newMessage.trim()) return;

      const message: ChatMessage = {
        id: Date.now().toString(),
        userId: 'currentUser',
        username,
        avatar: '/api/placeholder/32/32',
        message: newMessage,
        timestamp: new Date(),
        type: 'message',
      };

      // For demo - add locally
      setMessages(prev => [...prev, message]);
      setNewMessage('');

      // FIRESTORE SEND (uncomment when Firebase is set up)
      /*
      await addDoc(collection(db, 'chatMessages'), {
        ...message,
        timestamp: serverTimestamp(),
      });
      */
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="flex flex-col h-[500px]">
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${theme.gradient} rounded-full flex items-center justify-center`}>
              <MessageCircle className="text-white" size={20} />
            </div>
            <div>
              <h3 className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Live Chat</h3>
              <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>Real-time conversation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'}`}>{onlineUsers} online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.userId === 'currentUser' ? 'flex-row-reverse' : ''}`}
            >
              {msg.type === 'message' && (
                <>
                  <img src={msg.avatar} alt={msg.username} className="w-8 h-8 rounded-full" />
                  <div className={`max-w-[70%] ${msg.userId === 'currentUser' ? 'items-end' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{msg.username}</span>
                      <span className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className={`px-4 py-2 rounded-2xl ${
                      msg.userId === 'currentUser' 
                        ? `bg-gradient-to-r ${theme.gradient} text-white` 
                        : `${isDarkMode ? 'bg-white/10' : 'bg-slate-100'} ${isDarkMode ? 'text-white' : 'text-slate-900'}`
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                </>
              )}
              {msg.type === 'join' && (
                <div className={`w-full text-center text-sm ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
                  {msg.message}
                </div>
              )}
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className={`flex-1 px-4 py-3 rounded-xl ${isDarkMode ? 'bg-white/10 text-white placeholder:text-white/40' : 'bg-slate-100 text-slate-900 placeholder:text-slate-400'} border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} focus:outline-none focus:border-${theme.accent}`}
            />
            <button className={`p-3 ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 hover:bg-slate-200'} rounded-xl transition-colors`}>
              <Smile size={20} className={isDarkMode ? 'text-white/60' : 'text-slate-500'} />
            </button>
            <button 
              onClick={sendMessage}
              className={`p-3 bg-gradient-to-r ${theme.gradient} rounded-xl text-white hover:opacity-90 transition-opacity`}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  };

// ============================================
// 7. BLOG & SNS WINDOW
// ============================================

  const BlogWindow = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
    const [activeTab, setActiveTab] = useState<'blog' | 'feed'>('blog');
    const [selectedPost, setSelectedPost] = useState<typeof BLOG_POSTS[0] | null>(null);

    const tabs = [
      { id: 'blog', label: 'Blog Posts', icon: PenSquare },
      { id: 'feed', label: 'Social Feed', icon: Rss },
    ];

    return (
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'blog' | 'feed')}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                  : `${isDarkMode ? 'bg-white/10 text-white/70 hover:bg-white/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'blog' && (
            <motion.div
              key="blog"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {BLOG_POSTS.map((post) => (
                <motion.article
                  key={post.id}
                  whileHover={{ scale: 1.01 }}
                  className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-white'} rounded-xl overflow-hidden border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} shadow-lg cursor-pointer`}
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="flex">
                    {/* Cover Image */}
                    <div className="w-48 h-40 flex-shrink-0">
                      <img src={post.cover} alt={post.title} className="w-full h-full object-cover" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">
                      <div className="flex items-center gap-2 mb-2">
                        {post.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-white/10 text-white/70' : 'bg-slate-100 text-slate-600'}`}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{post.title}</h3>
                      <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-slate-500'} line-clamp-2`}>{post.excerpt}</p>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-4">
                          <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                            <Calendar size={14} />
                            {post.date}
                          </span>
                          <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                            <Clock size={14} />
                            {post.readTime}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                            <ThumbsUp size={14} />
                            {post.likes}
                          </span>
                          <span className={`flex items-center gap-1 text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-400'}`}>
                            <MessageSquare size={14} />
                            {post.comments}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>
          )}

          {activeTab === 'feed' && (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Social Feed Posts */}
              {[
                { id: 1, content: "Just launched a new feature for Azure Supporter! 🚀 Check it out!", likes: 89, comments: 12, shares: 5, time: "2h ago", image: null },
                { id: 2, content: "Working on something exciting... stay tuned! 👀✨", likes: 156, comments: 34, shares: 8, time: "5h ago", image: "/api/placeholder/400/300" },
                { id: 3, content: "Thank you all for 10K followers! You're amazing! 🎉💖", likes: 342, comments: 67, shares: 23, time: "1d ago", image: null },
              ].map((post) => (
                <div key={post.id} className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-white'} rounded-xl p-5 border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                  {/* Author */}
                  <div className="flex items-center gap-3 mb-4">
                    <img src="/api/placeholder/40/40" alt="Author" className="w-10 h-10 rounded-full" />
                    <div>
                      <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Your Name</p>
                      <p className={`text-xs ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>{post.time}</p>
                    </div>
                    <button className={`ml-auto p-2 ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-slate-100'} rounded-full`}>
                      <MoreHorizontal size={18} className={isDarkMode ? 'text-white/50' : 'text-slate-400'} />
                    </button>
                  </div>

                  {/* Content */}
                  <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'} mb-4`}>{post.content}</p>

                  {post.image && (
                    <img src={post.image} alt="Post" className="w-full rounded-xl mb-4" />
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-6">
                    <button className={`flex items-center gap-2 ${isDarkMode ? 'text-white/60 hover:text-red-400' : 'text-slate-500 hover:text-red-500'} transition-colors`}>
                      <Heart size={18} />
                      <span className="text-sm">{post.likes}</span>
                    </button>
                    <button className={`flex items-center gap-2 ${isDarkMode ? 'text-white/60 hover:text-blue-400' : 'text-slate-500 hover:text-blue-500'} transition-colors`}>
                      <MessageSquare size={18} />
                      <span className="text-sm">{post.comments}</span>
                    </button>
                    <button className={`flex items-center gap-2 ${isDarkMode ? 'text-white/60 hover:text-green-400' : 'text-slate-500 hover:text-green-500'} transition-colors`}>
                      <Share2 size={18} />
                      <span className="text-sm">{post.shares}</span>
                    </button>
                    <button className={`ml-auto ${isDarkMode ? 'text-white/60 hover:text-yellow-400' : 'text-slate-500 hover:text-yellow-500'} transition-colors`}>
                      <Bookmark size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

// ============================================
// 8. UPDATED TERMINAL WINDOW (with fun commands)
// ============================================

  interface TerminalLine {
  content: string;
  type: TerminalLineType;
}

  const TerminalWindow = () => {
    const [lines, setLines] = useState<TerminalLine[]>([
      { content: "Welcome to Portfolio Terminal v2.0", type: 'info' },
      { content: "Type 'help' for available commands", type: 'output' },
      { content: "", type: 'output' },
    ]);
    const [currentInput, setCurrentInput] = useState('');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isMatrixRunning, setIsMatrixRunning] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const terminalRef = useRef<HTMLDivElement>(null);

    // Auto-scroll and focus
    useEffect(() => {
      terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight);
      inputRef.current?.focus();
    }, [lines]);

    // Matrix effect
    useEffect(() => {
      if (!isMatrixRunning) return;

      const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
      const interval = setInterval(() => {
        const line = Array.from({ length: 60 }, () => 
          chars[Math.floor(Math.random() * chars.length)]
        ).join('');
        setLines(prev => [...prev.slice(-30), { content: line, type: 'cyan' }]);
      }, 100);

      return () => clearInterval(interval);
    }, [isMatrixRunning]);

    const addLine = (content: string, type: TerminalLineType = 'output') => {
      setLines(prev => [...prev, { content, type }]);
    };

    const handleCommand = (cmd: string) => {
      const trimmedCmd = cmd.trim();
      if (!trimmedCmd) return;

      // Add to history
      setCommandHistory(prev => [...prev, trimmedCmd]);
      setHistoryIndex(-1);

      // Show input
      addLine(`$ ${trimmedCmd}`, 'input');

      // Parse command and args
      const [command, ...args] = trimmedCmd.split(' ');
      const lowerCommand = command.toLowerCase();

      // Handle special commands
      if (lowerCommand === 'clear') {
        setLines([]);
        setIsMatrixRunning(false);
        return;
      }

      if (lowerCommand === 'cmatrix') {
        setIsMatrixRunning(true);
        addLine("Matrix rain started. Type 'clear' to stop.", 'info');
        return;
      }

      if (lowerCommand === 'exit') {
        setIsMatrixRunning(false);
        addLine("Goodbye!", 'info');
        return;
      }

      // Execute command
      const cmdHandler = TERMINAL_COMMANDS[lowerCommand];
      if (cmdHandler) {
        cmdHandler.action(args, addLine);
      } else {
        addLine(`Command not found: ${command}`, 'error');
        addLine("Type 'help' for available commands", 'output');
      }
    };

    

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleCommand(currentInput);
        setCurrentInput('');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setCurrentInput(commandHistory[commandHistory.length - 1 - newIndex] || '');
        } else {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
      } else if (e.key === 'c' && e.ctrlKey) {
        setIsMatrixRunning(false);
        addLine('^C', 'input');
      }
    };

    const getLineColor = (type: TerminalLine['type']) => {
      switch (type) {
        case 'input': return 'text-green-400';
        case 'error': return 'text-red-400';
        case 'info': return 'text-yellow-400';
        case 'cyan': return 'text-cyan-400';
        default: return 'text-white/80';
      }
    };

    return (
      <div 
        className="bg-black rounded-lg p-4 font-mono text-sm h-[400px] flex flex-col cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {/* Terminal Content */}
        <div ref={terminalRef} className="flex-1 overflow-y-auto space-y-0.5">
          {lines.map((line, i) => (
            <div key={i} className={`${getLineColor(line.type)} whitespace-pre`}>
              {line.content}
            </div>
          ))}
        </div>

        {/* Input Line */}
        {!isMatrixRunning && (
          <div className="flex items-center mt-2">
            <span className="text-green-400">$&nbsp;</span>
            <input
              ref={inputRef}
              type="text"
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-white outline-none caret-green-400"
              autoFocus
            />
            <span className="text-green-400 animate-pulse">█</span>
          </div>
        )}
      </div>
    );
  };

  const settingsValue: SettingsContextType = {
    theme, setTheme,
    rainIntensity, setRainIntensity,
    newsSpeed, setNewsSpeed,
    isDarkMode, setIsDarkMode,
    notifications, setNotifications,
    language, setLanguage,
    t,
    saveSettings,
    loadSettings,
    isLoading: settingsLoading,
  };

  // Dark/Light mode background classes
  const bgClass = isDarkMode 
    ? `from-slate-800 via-slate-900 to-slate-950 ${currentTheme.bg.split(' ')[1]}`
    : currentTheme.bgLight;

  const textClass = isDarkMode ? 'text-white' : 'text-slate-900';
  const textMutedClass = isDarkMode ? 'text-white/60' : 'text-slate-600';

  return (
    <SettingsContext.Provider value={settingsValue}>
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
                  {t('loading')}
                </motion.h2>
                <p className="text-white/60 text-sm">{t('loadingDesc')}</p>
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
                  <span>{t('initializing')}</span>
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
        className={`relative w-full h-screen overflow-hidden bg-gradient-to-br ${bgClass}`}
      >
        {/* Rain Effect Canvas - Pass intensity */}
        <RainEffect onLoaded={() => setIsLoaded(true)} intensity={rainIntensity} />

        {/* Clock and News Overlay */}
        <div className="absolute top-96 left-16 z-10 space-y-4">
          {/* Large Clock */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={textClass}
          >
            <div className="text-8xl font-bold tracking-tighter leading-none drop-shadow-2xl">
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </div>
            <div className="text-2xl font-medium mt-2 opacity-90">
              {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: '2-digit' })}
            </div>
          </motion.div>

          {/* News Ticker - Fixed height */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`${isDarkMode ? 'bg-black/30' : 'bg-white/70'} backdrop-blur-md border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} rounded-xl p-4 w-[500px] h-[100px]`}
          >
            <div className="h-[52px] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentNewsIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`${isDarkMode ? 'text-white/90' : 'text-slate-700'} text-sm leading-relaxed line-clamp-2`}
                >
                  {NEWS_HEADLINES[currentNewsIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
            
            {/* Dots indicator */}
            <div className="flex gap-2 mt-3">
              {NEWS_HEADLINES.map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === currentNewsIndex 
                      ? `bg-gradient-to-r ${currentTheme.gradient} w-6` 
                      : `${isDarkMode ? 'bg-white/30' : 'bg-slate-300'} w-2`
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
              <span className={`${isDarkMode ? 'text-white bg-black/50' : 'text-slate-900 bg-white/70'} text-sm font-bold px-3 py-1 rounded backdrop-blur-sm`}>
                {icon.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Dynamic Windows Rendering */}
        <AnimatePresence>
          {openWindows.map((windowId) => {
            // Determine which content to show based on windowId
            let content;
            let title = t(windowId);
            let isLarge = false;
            let isScrollable = false;

            switch (windowId) {
              case 'profile':
                content = <ProfileWindow theme={currentTheme} isDarkMode={isDarkMode} t={t} />;
                break;
              case 'social':
                content = (
                  <div className="relative h-[500px] flex items-center justify-center pt-4" onWheel={handleSnsScroll}>
                    {SNS_LINKS.map((sns, index) => {
                      const offset = index - selectedSns;
                      const isSelected = index === selectedSns;
                      return (
                        <div
                          key={sns.id}
                          className="absolute transition-all duration-300 ease-out cursor-pointer"
                          style={{
                            left: '50%',
                            top: '55%',
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
                );
                break;
              case 'projects':
                title = t('projects');
                content = (
                  <div 
                    className="relative h-[500px] flex items-center justify-center pt-4" 
                    onWheel={handleProjectScroll}
                  >
                    {PROJECTS.map((project, index) => {
                      const offset = index - selectedProject;
                      const isSelected = index === selectedProject;
                      
                      return (
                        <div
                          key={project.id}
                          className="absolute transition-all duration-300 ease-out cursor-pointer"
                          style={{
                            left: '50%',
                            top: '55%',
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
                );
                break;
              case 'analytics':
                content = <AnalyticsWindow theme={currentTheme} isDarkMode={isDarkMode} t={t} />;
                break;
              case 'azure-docs':
                title = "Azure Supporter Documentation";
                content = <AzureDocsWindow theme={currentTheme} isDarkMode={isDarkMode} />;
                isLarge = true;
                break;
              case 'music':
                title = "Music Player";
                content = <MusicPlayerWindow theme={currentTheme} isDarkMode={isDarkMode} />;
                break;

              case 'discord':
                title = "Discord";
                content = <DiscordWindow theme={currentTheme} isDarkMode={isDarkMode} />;
                break;
              case 'live-chat':
                title = "Live Chat";
                content = <LiveChatWindow theme={currentTheme} isDarkMode={isDarkMode} />;
              case 'blog':
                content = <BlogWindow theme={currentTheme} isDarkMode={isDarkMode} />;
                isScrollable = true;
                break;
              case 'terminal':
                content = <TerminalWindow />;
                break;
              case 'settings':
                content = <SettingsWindow theme={currentTheme} />;
                isScrollable = true;
                break;
              default:
                return null;
            }

            return (
              <WindowFrame
                key={windowId}
                id={windowId}
                title={title}
                onClose={() => closeWindow(windowId)}
                isActive={activeWindow === windowId}
                onFocus={() => {
                  setActiveWindow(windowId);
                  // Re-order stack on focus to bring to front
                  setOpenWindows(prev => [...prev.filter(id => id !== windowId), windowId]);
                }}
                theme={currentTheme}
                isDarkMode={isDarkMode}
                large={isLarge}
                scrollable={isScrollable}
                position={windowPositions[windowId] || { x: 100, y: 100 }}
                onPositionChange={(x, y) => updateWindowPosition(windowId, x, y)}
              >
                {content}
              </WindowFrame>
            );
          })}
        </AnimatePresence>

        {/* Taskbar */}
        <div className={`absolute bottom-0 left-0 right-0 h-16 ${isDarkMode ? 'bg-slate-900/95' : 'bg-white/90'} backdrop-blur-md border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center px-4 gap-4`}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`p-3 bg-gradient-to-r ${currentTheme.gradient} rounded-lg shadow-lg`}
          >
            <Sparkles className="text-white" size={24} />
          </motion.button>

          <div className="flex-1 flex gap-2">
            {openWindows.map((windowId) => {
              const icon = desktopIcons.find(i => i.id === windowId);
              const active = activeWindow === windowId;
              
              return (
                <button
                  key={windowId}
                  onClick={() => {
                    if (active) {
                      // Optional: Minimize logic here, or just keep focus
                    } else {
                      setActiveWindow(windowId);
                      // Move to end of array to bring to front
                      setOpenWindows(prev => [...prev.filter(id => id !== windowId), windowId]);
                    }
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                    active
                      ? `${isDarkMode ? 'bg-white/20 border-white/30' : 'bg-slate-200 border-slate-300'} border-2`
                      : `${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-slate-100 hover:bg-slate-200'} border-2 border-transparent`
                  }`}
                >
                  {icon && <icon.icon className={isDarkMode ? 'text-white' : 'text-slate-700'} size={18} />}
                  <span className={`${isDarkMode ? 'text-white' : 'text-slate-700'} text-sm font-medium`}>
                    {icon?.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <div className={`${isDarkMode ? 'text-white' : 'text-slate-700'} text-sm font-mono`}>
              {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={`${isDarkMode ? 'text-white/60' : 'text-slate-500'} text-xs`}>
              {time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>
      </motion.main>
    </SettingsContext.Provider>
  );
};

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

const WindowFrame = ({
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
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      drag
      dragMomentum={false}
      // THE FIX: Calculate absolute position relative to where drag ended
      onDragEnd={(e, info) => {
        onPositionChange(position.x, position.y);
      }}
      onPointerDown={onFocus}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: isActive ? 50 : 10, // Stacking handled by zIndex + array order
      }}
      className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow-2xl border-2 ${
        isActive ? `border-${theme.accent}` : isDarkMode ? 'border-white/10' : 'border-slate-200'
      } overflow-hidden flex flex-col`}
    >
      {/* Title Bar (Drag Handle) */}
      <div
        className={`bg-gradient-to-r ${
          isActive ? theme.gradient : isDarkMode ? 'from-slate-900 to-slate-800' : 'from-slate-100 to-slate-200'
        } px-4 py-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={`${isActive || isDarkMode ? 'text-white' : 'text-slate-700'} font-bold text-sm truncate`}>
            {title}
          </span>
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-4">
          <button className="w-3 h-3 rounded-full bg-yellow-500 hover:opacity-80 transition-opacity" />
          <button className="w-3 h-3 rounded-full bg-green-500 hover:opacity-80 transition-opacity" />
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent focusing when closing
              onClose();
            }}
            className="w-3 h-3 rounded-full bg-red-500 hover:opacity-80 transition-opacity"
          />
        </div>
      </div>

      {/* Content Area */}
      <div
        onPointerDown={(e) => e.stopPropagation()} // Crucial: allow clicking content without dragging
        className={`p-6 ${
          large ? 'w-[900px] h-[600px]' : 'w-[700px]'
        } ${
          large || scrollable ? 'overflow-y-auto overflow-x-hidden' : ''
        } max-h-[80vh]`}
      >
        {children}
      </div>
    </motion.div>
  );
};

// Profile Window
const ProfileWindow = ({ theme, isDarkMode, t }: { theme: any; isDarkMode: boolean; t: (key: string) => string }) => (
  <div className="space-y-6">
    <div className="flex items-start gap-6">
      <div className="relative">
        <div className={`w-32 h-32 rounded-2xl overflow-hidden border-4 border-opacity-50 shadow-xl`} style={{ borderColor: theme.primary }}>
          <img src={PROFILE_INFO.images[0]} alt="Profile" className="w-full h-full object-cover" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-slate-800"></div>
      </div>
      <div className="flex-1 space-y-3">
        <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{PROFILE_INFO.name}</h2>
        <p className="font-bold uppercase text-sm tracking-wider" style={{ color: theme.primary }}>{PROFILE_INFO.pronouns}</p>
        <p className={isDarkMode ? 'text-gray-400' : 'text-slate-600'}>{PROFILE_INFO.role}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
      <InfoCard icon={Cake} label={t('birthday')} value={PROFILE_INFO.birthday} color="text-pink-400" isDarkMode={isDarkMode} />
      <InfoCard icon={MapPin} label={t('location')} value={PROFILE_INFO.location} color="text-green-400" isDarkMode={isDarkMode} />
      <InfoCard icon={Mail} label={t('email')} value={PROFILE_INFO.email} color="text-blue-400" isDarkMode={isDarkMode} />
      <InfoCard icon={Globe} label={t('website')} value={PROFILE_INFO.website} color="text-purple-400" isDarkMode={isDarkMode} />
    </div>
  </div>
);

const InfoCard = ({ icon: Icon, label, value, color, isDarkMode }: any) => (
  <div className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
    <div className="flex items-center gap-2 mb-2">
      <Icon className={color} size={16} />
      <span className={`${isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-xs font-bold uppercase`}>{label}</span>
    </div>
    <p className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-medium text-sm`}>{value}</p>
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
const AnalyticsWindow = ({ theme, isDarkMode, t }: { theme: any; isDarkMode: boolean; t: (key: string) => string }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-2 gap-4">
      <StatCard label={t('totalVisits')} value={VISITOR_DATA.totalVisits.toLocaleString()} icon={TrendingUp} color="bg-blue-500" isDarkMode={isDarkMode} />
      <StatCard label={t('todayVisits')} value={VISITOR_DATA.todayVisits.toLocaleString()} icon={Clock} color="bg-green-500" isDarkMode={isDarkMode} />
      <StatCard label={t('uniqueVisitors')} value={VISITOR_DATA.uniqueVisitors.toLocaleString()} icon={UserIcon} color="bg-purple-500" isDarkMode={isDarkMode} />
      <StatCard label={t('avgSession')} value={VISITOR_DATA.avgSessionTime} icon={Clock} color="bg-orange-500" isDarkMode={isDarkMode} />
    </div>

    <div className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
      <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold mb-4 flex items-center gap-2`}>
        <Globe className="text-blue-400" size={20} />
        {t('topCountries')}
      </h3>
      <div className="space-y-2">
        {VISITOR_DATA.topCountries.map((country, i) => (
          <div key={i} className={`flex items-center justify-between ${isDarkMode ? 'text-white/80' : 'text-slate-700'}`}>
            <span>{country}</span>
            <div className={`w-32 h-2 ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'} rounded-full overflow-hidden`}>
              <div
                className={`h-full bg-gradient-to-r ${theme.gradient} rounded-full`}
                style={{ width: `${100 - i * 20}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
      <p className={isDarkMode ? 'text-gray-400' : 'text-slate-600'} style={{ fontSize: '0.875rem' }}>
        {t('lastVisit')}: <span className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{VISITOR_DATA.lastVisit}</span>
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

// Azure Supporter Documentation Window
const AzureDocsWindow = ({ theme, isDarkMode }: { theme: any; isDarkMode: boolean }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedFeature, setExpandedFeature] = useState<number | null>(0);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(text);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'quickstart', label: 'Quick Start', icon: Zap },
    { id: 'commands', label: 'Commands', icon: Command },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Sidebar Navigation */}
      <div className="w-48 flex-shrink-0 space-y-2">
        <div className="flex items-center gap-3 mb-6">
          <div className={`w-12 h-12 bg-gradient-to-r ${theme.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
            <Bot className="text-white" size={24} />
          </div>
          <div>
            <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-black text-lg`}>Azure</h3>
            <p className={`${isDarkMode ? 'text-white/50' : 'text-slate-500'} text-xs`}>v{AZURE_DOCS.overview.version}</p>
          </div>
        </div>

        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
              activeSection === section.id
                ? `bg-gradient-to-r ${theme.gradient} text-white shadow-lg`
                : `${isDarkMode ? 'text-white/60 hover:text-white hover:bg-white/10' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`
            }`}
          >
            <section.icon size={18} />
            <span className="font-medium text-sm">{section.label}</span>
          </button>
        ))}

        {/* Invite Button */}
        <div className="pt-4 mt-4 border-t border-white/10">
          <a
            href={AZURE_DOCS.overview.invite}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r ${theme.gradient} text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity`}
          >
            <ExternalLink size={16} />
            Add to Server
          </a>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto pr-2">
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Hero Section */}
              <div className={`bg-gradient-to-r ${theme.gradient} rounded-2xl p-8 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10">
                  <h1 className="text-4xl font-black text-white mb-2">{AZURE_DOCS.overview.title}</h1>
                  <p className="text-white/90 text-xl mb-4">{AZURE_DOCS.overview.tagline}</p>
                  <p className="text-white/70 max-w-2xl">{AZURE_DOCS.overview.description}</p>
                  
                  <div className="flex items-center gap-4 mt-6">
                    <div className="bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                      <span className="text-white/60 text-sm">Prefix:</span>
                      <span className="text-white font-mono font-bold ml-2">{AZURE_DOCS.overview.prefix}</span>
                    </div>
                    <div className="bg-black/30 px-4 py-2 rounded-lg backdrop-blur-sm">
                      <span className="text-white/60 text-sm">Version:</span>
                      <span className="text-white font-mono font-bold ml-2">{AZURE_DOCS.overview.version}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="grid grid-cols-3 gap-4">
                {AZURE_DOCS.features.slice(0, 6).map((feature, i) => (
                  <div
                    key={i}
                    className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-5 rounded-xl border ${isDarkMode ? 'border-white/10 hover:border-white/20' : 'border-slate-200 hover:border-slate-300'} transition-all group`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-r ${theme.gradient} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <feature.icon className="text-white" size={22} />
                    </div>
                    <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold mb-1`}>{feature.title}</h3>
                    <p className={`${isDarkMode ? 'text-white/50' : 'text-slate-500'} text-sm`}>{feature.commands.length} commands</p>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Servers', value: '50,000+' },
                  { label: 'Users', value: '2M+' },
                  { label: 'Commands', value: '100+' },
                  { label: 'Uptime', value: '99.9%' },
                ].map((stat, i) => (
                  <div key={i} className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} text-center`}>
                    <div className={`text-2xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{stat.value}</div>
                    <div className={`${isDarkMode ? 'text-white/50' : 'text-slate-500'} text-sm`}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSection === 'quickstart' && (
            <motion.div
              key="quickstart"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Quick Start Guide</h2>
              <p className={isDarkMode ? 'text-white/60' : 'text-slate-600'}>Get Azure Supporter running on your server in minutes.</p>

              <div className="space-y-4">
                {AZURE_DOCS.quickStart.map((step) => (
                  <div
                    key={step.step}
                    className={`flex items-start gap-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                  >
                    <div className={`w-10 h-10 bg-gradient-to-r ${theme.gradient} rounded-full flex items-center justify-center flex-shrink-0 font-black text-white`}>
                      {step.step}
                    </div>
                    <div>
                      <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold text-lg`}>{step.title}</h3>
                      <p className={isDarkMode ? 'text-white/60' : 'text-slate-600'}>{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Example Commands */}
              <div className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold text-lg mb-4`}>Try These Commands First</h3>
                <div className="space-y-3">
                  {['!az help', '!az setup', '!az serverinfo'].map((cmd) => (
                    <div key={cmd} className={`flex items-center justify-between ${isDarkMode ? 'bg-black/30' : 'bg-white'} p-3 rounded-lg`}>
                      <code className="text-green-400 font-mono">{cmd}</code>
                      <button
                        onClick={() => copyToClipboard(cmd)}
                        className={`${isDarkMode ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-600'} transition-colors`}
                      >
                        {copiedCommand === cmd ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === 'commands' && (
            <motion.div
              key="commands"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Commands</h2>
              <p className={`${isDarkMode ? 'text-white/60' : 'text-slate-600'} mb-6`}>Explore all available commands organized by category.</p>

              {AZURE_DOCS.features.map((feature, index) => (
                <div key={index} className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
                    className={`w-full flex items-center justify-between p-5 ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-200'} transition-colors`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 bg-gradient-to-r ${theme.gradient} rounded-lg flex items-center justify-center`}>
                        <feature.icon className="text-white" size={20} />
                      </div>
                      <div className="text-left">
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold`}>{feature.title}</h3>
                        <p className={`${isDarkMode ? 'text-white/50' : 'text-slate-500'} text-sm`}>{feature.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`${isDarkMode ? 'text-white/40' : 'text-slate-400'} text-sm`}>{feature.commands.length} commands</span>
                      {expandedFeature === index ? (
                        <ChevronUp className={isDarkMode ? 'text-white/50' : 'text-slate-400'} size={20} />
                      ) : (
                        <ChevronDown className={isDarkMode ? 'text-white/50' : 'text-slate-400'} size={20} />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedFeature === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`border-t ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}
                      >
                        <div className="p-5 space-y-3">
                          {feature.commands.map((cmd, cmdIndex) => (
                            <div
                              key={cmdIndex}
                              className={`${isDarkMode ? 'bg-black/30 hover:bg-black/40' : 'bg-white hover:bg-slate-50'} p-4 rounded-lg transition-colors`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <code className="text-green-400 font-mono font-bold">{cmd.name}</code>
                                <button
                                  onClick={() => copyToClipboard(cmd.usage)}
                                  className={`${isDarkMode ? 'text-white/50 hover:text-white' : 'text-slate-400 hover:text-slate-600'} transition-colors p-1`}
                                >
                                  {copiedCommand === cmd.usage ? (
                                    <Check size={16} className="text-green-400" />
                                  ) : (
                                    <Copy size={16} />
                                  )}
                                </button>
                              </div>
                              <p className={`${isDarkMode ? 'text-white/70' : 'text-slate-600'} text-sm mb-2`}>{cmd.desc}</p>
                              <div className="flex items-center gap-2">
                                <span className={`${isDarkMode ? 'text-white/40' : 'text-slate-400'} text-xs`}>Usage:</span>
                                <code className="text-yellow-400/80 text-xs font-mono">{cmd.usage}</code>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </motion.div>
          )}

          {activeSection === 'faq' && (
            <motion.div
              key="faq"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Frequently Asked Questions</h2>
              <p className={isDarkMode ? 'text-white/60' : 'text-slate-600'}>Find answers to common questions about Azure Supporter.</p>

              <div className="space-y-4">
                {AZURE_DOCS.faq.map((item, index) => (
                  <div key={index} className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 bg-gradient-to-r ${theme.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <HelpCircle className="text-white" size={16} />
                      </div>
                      <div>
                        <h3 className={`${isDarkMode ? 'text-white' : 'text-slate-900'} font-bold mb-2`}>{item.q}</h3>
                        <p className={isDarkMode ? 'text-white/60' : 'text-slate-600'}>{item.a}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Support Card */}
              <div className={`bg-gradient-to-r ${theme.gradient} rounded-xl p-6 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-bold text-xl mb-1">Still need help?</h3>
                    <p className="text-white/80">Join our support server for assistance</p>
                  </div>
                  <a
                    href="#"
                    className="bg-white/20 hover:bg-white/30 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <MessageCircle size={18} />
                    Join Support Server
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ============================================
// ADD THESE COMPONENTS TO COMPLETE THE FIXES
// Place after the AzureDocsWindow component
// ============================================

// Custom Select Component (COMPLETE VERSION)
interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  isDarkMode: boolean;
  theme: any;
}

const CustomSelect = ({ value, onChange, options, isDarkMode, theme }: CustomSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={selectRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} p-4 rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between transition-all hover:border-opacity-50`}
        style={{ borderColor: isOpen ? theme.primary : undefined }}
      >
        <span className="font-medium">{selectedOption?.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={isDarkMode ? 'text-white/50' : 'text-slate-400'} size={20} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 w-full mt-2 ${isDarkMode ? 'bg-slate-900' : 'bg-white'} rounded-xl border ${isDarkMode ? 'border-white/10' : 'border-slate-200'} shadow-2xl overflow-hidden`}
          >
            {options.map((option, index) => (
              <motion.button
                key={option.value}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left transition-all flex items-center justify-between ${
                  value === option.value
                    ? `bg-gradient-to-r ${theme.gradient} text-white`
                    : `${isDarkMode ? 'text-white/80 hover:bg-white/10' : 'text-slate-700 hover:bg-slate-100'}`
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {value === option.value && (
                  <Check size={16} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Settings Window with all functional controls (UPDATED VERSION)
const SettingsWindow = ({ theme }: { theme: any }) => {
  const settings = useSettings();
  const [autoSave, setAutoSave] = useState(true);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const themes = [
    { id: 'purple', name: 'Purple Dream', gradient: 'from-purple-500 to-pink-500' },
    { id: 'blue', name: 'Ocean Blue', gradient: 'from-blue-500 to-cyan-500' },
    { id: 'green', name: 'Forest Green', gradient: 'from-green-500 to-emerald-500' },
    { id: 'orange', name: 'Sunset Orange', gradient: 'from-orange-500 to-red-500' },
  ];

  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'de', label: 'Deutsch (German)' },
    { value: 'zh', label: '中文 (Chinese)' },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await settings.saveSettings();
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    settings.setTheme('purple');
    settings.setRainIntensity(150);
    settings.setNewsSpeed(5);
    settings.setIsDarkMode(true);
    settings.setNotifications(true);
    settings.setLanguage('en');
  };

  return (
    <div className="space-y-6 relative">
      {/* Save Notification */}
      <AnimatePresence>
        {showSaveNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute -top-2 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg z-50 flex items-center gap-2"
          >
            <Check size={18} />
            {settings.t('settingsSaved')}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appearance Section */}
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${settings.isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <Sun className="text-yellow-400" size={24} />
          {settings.t('appearance')}
        </h3>
        
        {/* Dark Mode Toggle */}
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between`}>
          <div>
            <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{settings.t('darkMode')}</p>
            <p className={`${settings.isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-sm`}>{settings.t('darkModeDesc')}</p>
          </div>
          <button
            onClick={() => settings.setIsDarkMode(!settings.isDarkMode)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.isDarkMode ? `bg-gradient-to-r ${theme.gradient}` : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center"
              animate={{ x: settings.isDarkMode ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {settings.isDarkMode ? <Moon size={12} className="text-slate-700" /> : <Sun size={12} className="text-yellow-500" />}
            </motion.div>
          </button>
        </div>

        {/* Theme Selection */}
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium mb-3`}>{settings.t('colorTheme')}</p>
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => settings.setTheme(t.id)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  settings.theme === t.id
                    ? 'border-white bg-white/10 shadow-lg'
                    : `${settings.isDarkMode ? 'border-white/10 hover:border-white/30' : 'border-slate-200 hover:border-slate-300'}`
                }`}
              >
                <div className={`w-full h-8 rounded bg-gradient-to-r ${t.gradient} mb-2`}></div>
                <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} text-sm font-medium`}>{t.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${settings.isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <MessageCircle className="text-blue-400" size={24} />
          {settings.t('notifications')}
        </h3>
        
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between`}>
          <div>
            <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{settings.t('enableNotifications')}</p>
            <p className={`${settings.isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-sm`}>{settings.t('notificationsDesc')}</p>
          </div>
          <button
            onClick={() => settings.setNotifications(!settings.notifications)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              settings.notifications ? `bg-gradient-to-r ${theme.gradient}` : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: settings.notifications ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Effects Section */}
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${settings.isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <Sparkles className="text-purple-400" size={24} />
          {settings.t('visualEffects')}
        </h3>

        {/* Rain Intensity Slider */}
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{settings.t('rainIntensity')}</p>
            <span style={{ color: theme.primary }} className="font-bold">{settings.rainIntensity}</span>
          </div>
          <input
            type="range"
            min="50"
            max="300"
            value={settings.rainIntensity}
            onChange={(e) => settings.setRainIntensity(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${theme.primary} 0%, ${theme.primary} ${((settings.rainIntensity - 50) / 250) * 100}%, ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${((settings.rainIntensity - 50) / 250) * 100}%, ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 100%)`
            }}
          />
          <p className={`${settings.isDarkMode ? 'text-gray-500' : 'text-slate-400'} text-xs mt-2`}>{settings.t('rainIntensityDesc')}</p>
        </div>

        {/* News Speed Slider */}
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{settings.t('newsSpeed')}</p>
            <span style={{ color: theme.primary }} className="font-bold">{settings.newsSpeed}s</span>
          </div>
          <input
            type="range"
            min="3"
            max="10"
            value={settings.newsSpeed}
            onChange={(e) => settings.setNewsSpeed(Number(e.target.value))}
            className="w-full h-2 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, ${theme.primary} 0%, ${theme.primary} ${((settings.newsSpeed - 3) / 7) * 100}%, ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${((settings.newsSpeed - 3) / 7) * 100}%, ${settings.isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 100%)`
            }}
          />
          <p className={`${settings.isDarkMode ? 'text-gray-500' : 'text-slate-400'} text-xs mt-2`}>{settings.t('newsSpeedDesc')}</p>
        </div>
      </div>

      {/* Language & Region */}
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${settings.isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <Globe className="text-green-400" size={24} />
          {settings.t('languageRegion')}
        </h3>
        
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
          <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium mb-3`}>{settings.t('language')}</p>
          <CustomSelect
            value={settings.language}
            onChange={settings.setLanguage}
            options={languageOptions}
            isDarkMode={settings.isDarkMode}
            theme={theme}
          />
        </div>
      </div>

      {/* System Section */}
      <div className="space-y-4">
        <h3 className={`text-xl font-black ${settings.isDarkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-2`}>
          <Settings className="text-red-400" size={24} />
          {settings.t('system')}
        </h3>
        
        <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-4 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'} flex items-center justify-between`}>
          <div>
            <p className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-medium`}>{settings.t('autoSave')}</p>
            <p className={`${settings.isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-sm`}>{settings.t('autoSaveDesc')}</p>
          </div>
          <button
            onClick={() => setAutoSave(!autoSave)}
            className={`relative w-14 h-8 rounded-full transition-colors ${
              autoSave ? `bg-gradient-to-r ${theme.gradient}` : 'bg-gray-300'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{ x: autoSave ? 24 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2`}
        >
          {isSaving ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles size={20} />
            </motion.div>
          ) : (
            <Check size={20} />
          )}
          {settings.t('saveChanges')}
        </button>
      </div>

      {/* About Section */}
      <div className={`${settings.isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-lg border ${settings.isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
        <div className="flex items-center gap-4 mb-4">
          <div className={`w-16 h-16 bg-gradient-to-r ${theme.gradient} rounded-2xl flex items-center justify-center`}>
            <Sparkles className="text-white" size={32} />
          </div>
          <div>
            <h4 className={`${settings.isDarkMode ? 'text-white' : 'text-slate-900'} font-black text-lg`}>Portfolio v2.0</h4>
            <p className={`${settings.isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-sm`}>Built with React & Tailwind CSS</p>
          </div>
        </div>
        <div className={`${settings.isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-xs space-y-1`}>
          <p>© 2024 Your Name. All rights reserved.</p>
          <p>Last updated: December 2024</p>
        </div>
      </div>
    </div>
  );
};

// StatCard Component
const StatCard = ({ label, value, icon: Icon, color, isDarkMode }: any) => (
  <div className={`${isDarkMode ? 'bg-slate-900/50' : 'bg-slate-100'} p-6 rounded-lg border ${isDarkMode ? 'border-white/10' : 'border-slate-200'}`}>
    <div className={`${color} w-12 h-12 rounded-lg flex items-center justify-center mb-3`}>
      <Icon className="text-white" size={24} />
    </div>
    <p className={`text-3xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'} mb-1`}>{value}</p>
    <p className={`${isDarkMode ? 'text-gray-400' : 'text-slate-500'} text-sm font-medium`}>{label}</p>
  </div>
);

export default Main;
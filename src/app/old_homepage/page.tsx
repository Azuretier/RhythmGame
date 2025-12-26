"use client"

import { useEffect, useState } from "react"
import { motion, animate, AnimatePresence } from "framer-motion"
import { ThemeToggle } from '@/components/main/sunmoon';
import RainEffect from '@/components/main/realistic-rain';
import {
  FaBirthdayCake,
  FaUserGraduate,
  FaPaperPlane,
  FaGithub,
  FaDiscord,
  FaYoutube,
  FaInstagram,
  FaFolderOpen,
  FaShareAlt
} from "react-icons/fa"

const Main = () => {
  // --- States ---
  const [activeTab, setActiveTab] = useState<'sns' | 'projects'>('sns');
  const [displayedText, setDisplayedText] = useState("")
  const [textIndex, setTextIndex] = useState(0)
  const [typing, setTyping] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [transitionStarted, setTransitionStarted] = useState(false);
  const [transitionDisplayed, setTransitionDisplayed] = useState(true);
  const [fadeUpAnimationStarted, setFadeUpAnimationStarted] = useState(false);
  const [profImageIndex, setProfImageIndex] = useState(0);

  const texts = ["Life is like a paper airplane, isn't it?", "I make my world myself"]
  const images = [
    "profile_image/original_azure.png",
    "profile_image/♔.png",
    "profile_image/azure.jpg",
    "profile_image/doll.jpg",
    "profile_image/siesta.jpg",
    "profile_image/Switch_Edition.png",
  ];

  // --- Gradient Border Style Helper ---
  // This creates the gradient border effect
  const gradientBorderStyle = "p-[1.5px] bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 rounded-xl shadow-lg hover:from-pink-500 hover:to-cyan-500 transition-all duration-500";
  const innerCardStyle = "bg-[var(--widget-bg)] backdrop-blur-md rounded-[11px] h-full w-full p-6 flex flex-col justify-center";

  // --- Effects (Existing Logic) ---
  useEffect(() => {
    const interval = setInterval(() => {
      setProfImageIndex((prev) => (prev + 1) % images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    if (!isLoaded) return;
    setTimeout(() => {
      setShowLoadingScreen(false);
      setTransitionStarted(true);
      setTimeout(() => setTransitionDisplayed(false), 1100);
      setTimeout(() => setFadeUpAnimationStarted(true), 600);
    }, 400); 
  }, [isLoaded]);

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");
    elements.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.opacity = "0";
      if (fadeUpAnimationStarted) {
        setTimeout(() => {
          animate(el, { opacity: [0, 1], y: [50, 0] }, { type: "spring" });
        }, index * 100);
      }
    });
  }, [fadeUpAnimationStarted]);

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (typing) {
      if (displayedText.length < texts[textIndex].length) {
        timeout = setTimeout(() => setDisplayedText(texts[textIndex].slice(0, displayedText.length + 1)), 100)
      } else {
        timeout = setTimeout(() => setTyping(false), 1500)
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => setDisplayedText(displayedText.slice(0, -1)), 50)
      } else {
        setTyping(true)
        setTextIndex((prev) => (prev + 1) % texts.length)
      }
    }
    return () => clearTimeout(timeout)
  }, [displayedText, typing, textIndex]);

  return (
    <main className="grid grid-cols-12 grid-rows-7 items-center justify-center h-screen overflow-hidden">
      {transitionDisplayed && (
        <div className={`fixed inset-0 bg-black z-40 transition-transform duration-1000 ${transitionStarted ? "-translate-y-full" : "translate-y-0"}`}></div>
      )}
      
      {showLoadingScreen && (
        <div className="flex flex-col items-center gap-4 fixed inset-0 bg-black justify-center z-50">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-2xl font-mono tracking-widest">LOADING</span>
        </div>
      )}

      <RainEffect onLoaded={() => setIsLoaded(true)} />

      {/* --- LEFT SIDE: PROFILE (Gradient Border) --- */}
      <div className={`fade-up ${gradientBorderStyle} row-start-3 col-start-2 row-span-3 col-span-3 h-full`}>
        <div className={innerCardStyle}>
          <div className="flex items-center justify-start mb-6 w-32 h-32 rounded-full overflow-hidden shadow-lg border-2 border-white/20">
            <AnimatePresence mode="wait">
              <motion.img
                key={images[profImageIndex]}
                src={images[profImageIndex]}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            </AnimatePresence>
          </div>
          <div className="mb-4">
            <p className="text-3xl font-black tracking-tighter">Azure</p>
            <p className="text-sm text-gray-400">He / Him</p>
          </div>
          <div className="space-y-3 text-sm font-bold">
            <div className="flex items-center gap-3">
              <FaBirthdayCake className="text-pink-400" /> <p>200X / 02 / 18</p>
            </div>
            <div className="flex items-center gap-3">
              <FaUserGraduate className="text-cyan-400" /> <p>Student</p>
            </div>
            <div className="flex items-center gap-3">
              <FaPaperPlane className="text-purple-400 shrink-0" />
              <div className="flex">
                <span className="truncate">{displayedText}</span>
                <span className="blinking text-purple-400">|</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- RIGHT SIDE: CONTENT AREA --- */}
      <div className="grid grid-rows-7 grid-cols-9 row-start-3 col-start-6 row-span-3 col-span-6 h-full gap-4">
        
        {/* VIEW SWITCHER TAB */}
        <div className="col-span-9 row-span-1 flex items-center justify-between px-2">
            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20">
                <button 
                  onClick={() => setActiveTab('sns')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'sns' ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/5'}`}
                >
                    <FaShareAlt /> SNS
                </button>
                <button 
                  onClick={() => setActiveTab('projects')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'projects' ? 'bg-white text-black shadow-lg' : 'text-white hover:bg-white/5'}`}
                >
                    <FaFolderOpen /> PROJECTS
                </button>
            </div>
            <ThemeToggle />
        </div>

        {/* DYNAMIC CONTENT */}
        <AnimatePresence mode="wait">
          {activeTab === 'sns' ? (
            <motion.div 
              key="sns-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 grid-rows-2 col-span-9 row-span-6 gap-4"
            >
              {/* SNS WIDGETS with Gradient Borders */}
              <SnsWidget href="https://instagram.com/..." icon={<FaInstagram size={32}/>} label="Instagram" user="@rrrrrrrrrrvq" gradient="from-purple-500 to-pink-500" />
              <SnsWidget href="https://github.com/..." icon={<FaGithub size={32}/>} label="GitHub" user="Azuretier" gradient="from-gray-700 to-black" />
              <SnsWidget isStatic icon={<FaDiscord size={32}/>} label="Discord" user="@daichi_a" gradient="from-indigo-500 to-blue-600" />
              <SnsWidget href="https://youtube.com/..." icon={<FaYoutube size={32}/>} label="YouTube" user="@azuchan_a" gradient="from-red-600 to-red-400" />
            </motion.div>
          ) : (
            <motion.div 
              key="projects-grid"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 grid-rows-2 col-span-9 row-span-6 gap-4"
            >
              {/* Replace these with your actual current projects */}
              <ProjectWidget title="Portfolio 2025" status="Live" tech="Next.js + Tailwind" />
              <ProjectWidget title="Rain Effect Lib" status="Developing" tech="React Hooks" />
              <ProjectWidget title="Azure Tools" status="Planned" tech="Python" />
              <ProjectWidget title="Art Generator" status="Paused" tech="Canvas API" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  )
}

// --- Sub-components for Gradient Border ---

const SnsWidget = ({ href, icon, label, user, gradient, isStatic = false }: any) => {
  const content = (
    <div className="bg-[var(--widget-bg)] backdrop-blur-md rounded-[11px] p-6 h-full flex flex-col justify-center gap-3">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg bg-gradient-to-br ${gradient}`}>
          {icon}
        </div>
        <div>
          <p className="font-black text-lg">{label}</p>
          <p className="text-sm text-gray-500">{user}</p>
        </div>
    </div>
  );

  return (
    <div className={`p-[1.5px] rounded-xl bg-gradient-to-br ${gradient} opacity-90 hover:opacity-100 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer`}>
      {isStatic ? content : <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{content}</a>}
    </div>
  );
};

const ProjectWidget = ({ title, status, tech }: any) => {
  return (
    <div className="p-[1.5px] rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 hover:from-blue-600 hover:to-cyan-400 transition-all">
      <div className="bg-[var(--widget-bg)] backdrop-blur-md rounded-[11px] p-6 h-full flex flex-col justify-between">
        <div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/10 text-cyan-400 uppercase tracking-widest">{status}</span>
            <h3 className="text-xl font-black mt-2">{title}</h3>
        </div>
        <p className="text-xs text-gray-500 font-mono">{tech}</p>
      </div>
    </div>
  );
};

export default Main
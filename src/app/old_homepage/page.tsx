"use client"

import { useEffect, useState } from "react"
import { motion, animate, AnimatePresence } from "framer-motion"
import { ThemeToggle } from '@/components/main/sunmoon';
import RainEffect from '@/components/main/realistic-rain';

// --- IMPORT YOUR DATA ---
import { PROFILE_INFO, SNS_LINKS, PROJECTS } from "@/data/old_homepage/data";

import {
  FaBirthdayCake, FaUserGraduate, FaPaperPlane,
  FaFolderOpen, FaShareAlt
} from "react-icons/fa"

// --- STYLING CONSTANTS ---
const BORDER_SIZE = "p-[2px]"; 
const OUTER_RADIUS = "rounded-[22px]"; 
const INNER_RADIUS = "rounded-[20px]"; 

const Main = () => {
  const [activeTab, setActiveTab] = useState<'sns' | 'projects'>('sns');
  const [displayedText, setDisplayedText] = useState("");
  const [textIndex, setTextIndex] = useState(0);
  const [typing, setTyping] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [transitionStarted, setTransitionStarted] = useState(false);
  const [transitionDisplayed, setTransitionDisplayed] = useState(true);
  const [fadeUpAnimationStarted, setFadeUpAnimationStarted] = useState(false);
  const [profImageIndex, setProfImageIndex] = useState(0);

  // Animation Logic (Shortened for brevity)
  useEffect(() => {
    const interval = setInterval(() => {
      setProfImageIndex((prev) => (prev + 1) % PROFILE_INFO.images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
    let timeout: any;
    const texts = PROFILE_INFO.bio_texts;
    if (typing) {
      if (displayedText.length < texts[textIndex].length) {
        timeout = setTimeout(() => setDisplayedText(texts[textIndex].slice(0, displayedText.length + 1)), 100);
      } else {
        timeout = setTimeout(() => setTyping(false), 1500);
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => setDisplayedText(displayedText.slice(0, -1)), 50);
      } else {
        setTyping(true);
        setTextIndex((prev) => (prev + 1) % texts.length);
      }
    }
    return () => clearTimeout(timeout);
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

      {/* --- PROFILE SIDEBAR --- */}
      <div className={`fade-up ${BORDER_SIZE} ${OUTER_RADIUS} bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 row-start-3 col-start-2 row-span-3 col-span-3 h-full shadow-2xl`}>
        <div className={`${INNER_RADIUS} bg-[var(--widget-bg)] backdrop-blur-md h-full w-full p-8 flex flex-col justify-center`}>
          <div className="flex items-center justify-start mb-6 w-32 h-32 rounded-full overflow-hidden shadow-lg border-2 border-white/20">
            <AnimatePresence mode="wait">
              <motion.img
                key={PROFILE_INFO.images[profImageIndex]}
                src={PROFILE_INFO.images[profImageIndex]}
                alt="Profile Avatar"
                className="w-full h-full object-cover"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
              />
            </AnimatePresence>
          </div>
          <div className="mb-4">
            <p className="text-4xl font-black tracking-tighter leading-none mb-1">{PROFILE_INFO.name}</p>
            <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{PROFILE_INFO.pronouns}</p>
          </div>
          <div className="space-y-4 text-sm font-bold">
            <div className="flex items-center gap-3"><FaBirthdayCake className="text-pink-400" /> <p>{PROFILE_INFO.birthday}</p></div>
            <div className="flex items-center gap-3"><FaUserGraduate className="text-cyan-400" /> <p>{PROFILE_INFO.role}</p></div>
            <div className="flex items-center gap-3">
              <FaPaperPlane className="text-purple-400 shrink-0" />
              <div className="flex"><span className="truncate">{displayedText}</span><span className="blinking text-purple-400">|</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT HUB --- */}
      <div className="grid grid-rows-7 grid-cols-9 row-start-3 col-start-6 row-span-3 col-span-6 h-full gap-4">
        
        {/* SWITCHER BAR */}
        <div className="col-span-9 row-span-1 flex items-center justify-between px-2">
            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/20 shadow-xl">
                <button 
                  onClick={() => setActiveTab('sns')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'sns' ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/5'}`}
                >
                    <FaShareAlt /> SNS
                </button>
                <button 
                  onClick={() => setActiveTab('projects')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all ${activeTab === 'projects' ? 'bg-white text-black shadow-md' : 'text-white hover:bg-white/5'}`}
                >
                    <FaFolderOpen /> PROJECTS
                </button>
            </div>
            <ThemeToggle />
        </div>

        {/* DYNAMIC GRID */}
        <AnimatePresence mode="wait">
          {activeTab === 'sns' ? (
            <motion.div 
              key="sns-grid"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 grid-rows-2 col-span-9 row-span-6 gap-4"
            >
              {SNS_LINKS.map((sns) => (
                <SnsWidget key={sns.id} {...sns} />
              ))}
            </motion.div>
          ) : (
            <motion.div 
              key="projects-grid"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-2 grid-rows-2 col-span-9 row-span-6 gap-4"
            >
              {PROJECTS.map((project) => (
                <ProjectWidget key={project.id} {...project} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

// --- SUB-COMPONENTS (ROBUST BORDERS) ---

const SnsWidget = ({ href, icon: Icon, label, username, gradient, isStatic }: any) => {
  const content = (
    <div className={`${INNER_RADIUS} bg-[var(--widget-bg)] backdrop-blur-md p-6 h-full flex flex-col justify-center gap-3`}>
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg ${gradient}`}>
          <Icon size={32} />
        </div>
        <div>
          <p className="font-black text-lg">{label}</p>
          <p className="text-sm text-gray-500">{username}</p>
        </div>
    </div>
  );

  return (
    <div className={`${BORDER_SIZE} ${OUTER_RADIUS} ${gradient} opacity-90 hover:opacity-100 transition-all cursor-pointer`}>
      {isStatic ? content : <a href={href} target="_blank" rel="noopener noreferrer" className="block h-full">{content}</a>}
    </div>
  );
};

const ProjectWidget = ({ title, status, tech, description }: any) => {
  return (
    <div className={`${BORDER_SIZE} ${OUTER_RADIUS} bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 transition-all cursor-pointer shadow-xl h-full w-full`}>
      <div className={`${INNER_RADIUS} bg-[var(--widget-bg)] backdrop-blur-md p-6 h-full flex flex-col justify-between`}>
        <div className="space-y-3">
            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-cyan-400/10 text-cyan-400 uppercase tracking-[0.2em] border border-cyan-400/20">{status}</span>
            <h3 className="text-2xl font-black tracking-tighter leading-none">{title}</h3>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">{description}</p>
        </div>
        <p className="text-[10px] text-gray-500 font-mono italic opacity-60 uppercase tracking-widest">{tech}</p>
      </div>
    </div>
  );
};

export default Main;
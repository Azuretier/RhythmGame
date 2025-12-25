"use client"

// for a commit for vercel api.  
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
  FaInstagram
} from "react-icons/fa"

const Main = () => {
  const texts = [
    "Life is like a paper airplane, isn't it?",
    "I make my world myself",
  ]

  const images = [
    "profile_image/original_azure.png",
    "profile_image/♔.png",
    "profile_image/azure.jpg",
    "profile_image/doll.jpg",
    "profile_image/siesta.jpg",
    "profile_image/Switch_Edition.png",
  ];

  const [displayedText, setDisplayedText] = useState("")
  const [textIndex, setTextIndex] = useState(0)
  const [typing, setTyping] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [transitionStarted, setTransitionStarted] = useState(false);
  const [transitionDisplayed, setTransitionDisplayed] = useState(true);
  const [fadeUpAnimationStarted, setFadeUpAnimationStarted] = useState(false);

  const [profImageIndex, setProfImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProfImageIndex((prev) => (prev + 1) % images.length);
    }, 10000); // Change image every 10 seconds

    return () => clearInterval(interval); // cleanup on unmount
  }, []);


  useEffect(() => {
    if (!isLoaded) return;

    setTimeout(() => {
      setShowLoadingScreen(false);
      setTransitionStarted(true);
      setTimeout(() => setTransitionDisplayed(false), 1100);
      setTimeout(() => setFadeUpAnimationStarted(true), 600);
    }, 400); 
    // timeout runs on its own line, so it won't block the rest of the code
  }, [isLoaded]);

  useEffect(() => {
    const elements = document.querySelectorAll(".fade-up");

    elements.forEach((el, index) => {
      if (!(el instanceof HTMLElement)) return;
      el.style.opacity = "0";

      if (fadeUpAnimationStarted) {
        setTimeout(() => {
          animate(el, { opacity: [0, 1], y: [50, 0] }, { type: "spring" });
        }, index * 150);
      }
    });

  }, [fadeUpAnimationStarted]);

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (typing) {
      if (displayedText.length < texts[textIndex].length) {
        timeout = setTimeout(() => {
          setDisplayedText(
            texts[textIndex].slice(0, displayedText.length + 1)
          )
        }, 100)
      } else {
        timeout = setTimeout(() => setTyping(false), 1500)
      }
    } else {
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, 50)
      } else {
        setTyping(true)
        setTextIndex((prev) => (prev + 1) % texts.length)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, typing, textIndex, texts])
  return (
    <main className="grid grid-cols-12 grid-rows-7 grid-flow-row items-center justify-center h-screen">
      {transitionDisplayed && (
        <div
          className={`fixed inset-0 bg-black z-40 transition-transform duration-1000 ${
            transitionStarted ? "-translate-y-full" : "translate-y-0"
          }`}
        ></div>
      )}
      {showLoadingScreen && (
        <div className="flex flex-col items-center gap-4 fixed inset-0 bg-black flex items-center justify-center z-50 transition-opacity duration-700">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-2xl">Loading...</span>
        </div>
      )}
      <RainEffect onLoaded={() => setIsLoaded(true)} />
      <motion.div className="fade-up grid backdrop-blur-xl bg-[var(--widget-bg)] border border-[var(--widget-border)] p-6 rounded-lg items-center grid-cols-1 grid-rows-6 row-start-3 col-start-2 row-span-3 col-span-3 h-full">
        <div className="flex items-center justify-start row-span-2 w-32 h-32 rounded-full overflow-hidden shadow-lg">
          <AnimatePresence mode="wait">
            <motion.img
              key={images[profImageIndex]} // Use key to trigger re-render on image change
              src={images[profImageIndex]}
              alt="Profile Avatar"
              className="w-full h-full object-cover"
              width={128}
              height={128}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
            />
          </AnimatePresence>
        </div>
        <div className="grid row-span-1 row-start-3 items-center">
          <p className="text-2xl font-bold">Azure</p>
          <p className="text-sm text-gray-500">He/Him</p>
        </div>
        <div className="grid row-span-2 text-lg font-bold row-start-4">
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaBirthdayCake className="font-sanserif"/>
            <p>200X/2/18</p>
          </div>
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaUserGraduate className="font-sanserif"/>
            <p>Student</p>
          </div>
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaPaperPlane className="font-sanserif"/>
            <div className="grid grid-rows-1 grid-flow-col justify-start">
              <span>{displayedText}</span>
              <span className="blinking">|</span>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="grid rounded-xl grid-rows-7 grid-cols-9 row-start-3 col-start-6 row-span-3 col-span-6 h-full">
        <motion.a href="https://www.instagram.com/rrrrrrrrrrvq/" target="_blank" rel="noopener noreferrer" className="fade-up grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 border border-[var(--widget-border)] shadow-md transition-colors hover:border-instagram-gradient rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-instagram-gradient drop-shadow-md">
            <FaInstagram size={48} />
          </div>
          <div className="grid">
            <p>X</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@rrrrrrrrrrvq</p>
            </section>
            </div>
        </motion.a>
        <motion.a href="https://github.com/Azuretier" target="_blank" rel="noopener noreferrer" className="fade-up grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 col-start-6 border border-[var(--widget-border)] shadow-md transition-colors hover:border-black dark:hover:border-gray-300 rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black">
            <FaGithub size={48} />
            </div>
          <div className="grid">
            <p>GitHub</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">Azuretier</p>
            </section>
            </div>
        </motion.a>
        <motion.a className="fade-up grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 row-start-5 border border-[var(--widget-border)] shadow-md transition-colors hover:border-[rgb(88,101,242)] rounded-lg row-span-3 col-span-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-[rgb(88,101,242)] drop-shadow-md">
            <FaDiscord size={48} />
            </div>
          <div className="grid">
            <p>Discord</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@daichi_a</p>
            </section>
          </div>
        </motion.a>
        <motion.a href="https://youtube.com/@azuchan_a" target="_blank" rel="noopener noreferrer" className="fade-up grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 row-start-5 col-start-6 border border-[var(--widget-border)] shadow-md transition-colors hover:border-[rgb(255,0,0)] rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-[rgb(255,0,0)] bg-white drop-shadow-md">
            <FaYoutube size={48} />
          </div>
          <div className="grid">
            <p>YouTube</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@azuchan_a</p>
            </section>
          </div>
        </motion.a>
      </div>
      <div className="flex items-center justify-center col-span-1 row-span-1 col-start-11 row-start-2">
        <ThemeToggle />
        </div>
    </main>
  )
}

export default Main
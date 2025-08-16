"use client"

// for a commit for vercel api.  
import { useEffect, useState } from "react"
import { motion, animate } from "framer-motion"
import { ThemeToggle } from '@/components/sunmoon';
import RainEffect from '@/components/realistic-rain2';
import {
  FaBirthdayCake,
  FaUserGraduate,
  FaPaperPlane,
  FaGithub,
  FaDiscord,
  FaYoutube,
} from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6";
import Image from "next/image"
//import { FadeUpStagger} from "@/components/animation";

const Main = () => {
  const texts = [
    "Life is like a paper airplane, isn't it?",
    "Keep flying high!",
    "Every day is a new flight.",
    "Catch the wind and soar!",
  ]

  const [displayedText, setDisplayedText] = useState("")
  const [textIndex, setTextIndex] = useState(0)
  const [typing, setTyping] = useState(true)
  const [isLoaded, setIsLoaded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;

    if (showOverlay) {
      setTimeout(() => setShowOverlay(false), 400); 
      // timeout runs on its own line, so it won't block the rest of the code
    }else {
      const elements = document.querySelectorAll(".fade-up");
      elements.forEach((el, index) => {
        if (el instanceof HTMLElement) {
          el.style.opacity = "0";
          setTimeout(() => {
            animate(el, { opacity: [0, 1], y: [50, 0] }, { type: "spring" });
          }, index * 150);
        }
      });
    }
  }, [showOverlay, isLoaded]);

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
      {showOverlay && (
        <div className="flex flex-col items-center gap-4 fixed inset-0 bg-black flex items-center justify-center z-50 transition-opacity duration-700">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-2xl">Loading...</span>
        </div>
      )}
      <RainEffect onLoaded={() => setIsLoaded(true)} />
      <motion.div className="fade-up grid bg-black/70 p-6 rounded-lg items-center grid-cols-1 grid-rows-4 row-start-3 col-start-2 row-span-3 col-span-3 h-full">
        <div className="flex h-50 w-50 items-center justify-start row-span-2">
          <Image src="/azure.png" alt="avatar" width={200} height={200} />
        </div>
        <div className="grid col-span-3 row-start-3 items-center">
          <p className="text-3xl font-black">Azure</p>
          <p className="text-gray-500 font-black">あずれーと</p>
          <p className="text-gray-500 font-normal text-lg">I make my world myself</p>
        </div>
        <div className="grid text-gray-500 col-span-3 row-start-4 font-sanserif">
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaBirthdayCake />
            <p>200X/2/18</p>
          </div>
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaUserGraduate />
            <p>Student</p>
          </div>
          <div className="grid justify-start gap-2 grid-flow-col items-center">
            <FaPaperPlane />
            <div className="grid grid-rows-1 grid-flow-col justify-start">
              <span>{displayedText}</span>
              <span className="blinking">|</span>
            </div>
          </div>
        </div>
      </motion.div>
      <div className="grid rounded-xl grid-rows-7 grid-cols-9 row-start-3 col-start-6 row-span-3 col-span-6 h-full">
        <motion.a href="https://x.com/09xgg" target="_blank" rel="noopener noreferrer" className="fade-up grid bg-black/70 gap-3 p-6 border shadow-md transition-colors hover:border-black dark:hover:border-gray-300 rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black dark:drop-shadow-[0_0_8px_rgba(230,255,255,0.5)]">
            <FaXTwitter size={48} />
          </div>
          <div className="grid">
            <p>X</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@09xgg</p>
            </section>
          </div>
        </motion.a>
        <motion.a href="https://github.com/Azuretier" target="_blank" rel="noopener noreferrer" className="fade-up grid bg-black/70 gap-3 p-6 col-start-6 border shadow-md transition-colors hover:border-black dark:hover:border-gray-300 rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black dark:drop-shadow-[0_0_8px_rgba(230,255,255,0.5)]">
            <FaGithub size={48} />
          </div>
          <div className="grid">
            <p>GitHub</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">Azuretier</p>
            </section>
          </div>
        </motion.a>
        <motion.a className="fade-up grid bg-black/70 gap-3 p-6 row-start-5 border shadow-md transition-colors hover:border-[rgb(88,101,242)] rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-[rgb(88,101,242)]">
            <FaDiscord size={48} />
          </div>
          <div className="grid">
            <p>Discord</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@xykmr_only09</p>
            </section>
          </div>
        </motion.a>
        <motion.a href="https://youtube.com/@Azuret" target="_blank" rel="noopener noreferrer" className="fade-up grid bg-black/70 gap-3 p-6 row-start-5 col-start-6 border shadow-md transition-colors hover:border-[rgb(255,0,0)] rounded-lg row-span-3 col-span-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-[rgb(255,0,0)] bg-white drop-shadow-md">
            <FaYoutube size={48} />
          </div>
          <div className="grid">
            <p>YouTube</p>
            <section className='flex items-center gap-1'>
              <p className="text-sm text-gray-500">@Azuret</p>
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

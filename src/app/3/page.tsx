"use client"

// for a commit for vercel api 
import { useEffect, useState } from "react"
import { motion, animate } from "framer-motion"
import { ThemeToggle } from '@/components/sunmoon';
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

  useEffect(() => {
    const elements = document.querySelectorAll('.fade-up');
    
    elements.forEach((el, index) => {

      if (el instanceof HTMLElement) {
        el.style.opacity = "0";
        // Add delay based on element index
        setTimeout(() => {
          animate(el, { opacity: [0.1, 1], y: [50, 0] }, { type: 'spring'});
        }, index * 150); // delay 150ms between each
      }
    });
  }, []);

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
    <>
      {/* Main Content */}
      <main className="grid grid-cols-12 grid-rows-7 grid-flow-row items-center justify-center h-screen">
          <motion.div
            className="fade-up grid gap-4 p-4 rounded-xl text-base grid-cols-1 grid-flow-row row-start-3 col-start-2 row-span-3 col-span-4 shadow-2xl"
          >
            <Image src="/azure.png" alt="avatar" width={200} height={200} />
            <div className="grid col-span-3">
              <p className="text-3xl font-black">Azure</p>
              <p className="text-subtext font-black">あずれーと</p>
              <p className="font-normal text-subtext text-lg">I make my world myself</p>
            </div>
            <div className="grid gap-1 text-subtext grid-flow-row grid-rows-3 grid-cols-1">
              <div className="grid justify-start gap-2 items-center grid-flow-col">
                <FaBirthdayCake />
                <p>200X/2/18</p>
              </div>
              <div className="grid justify-start gap-2 items-center grid-flow-col">
                <FaUserGraduate />
                <p>Student</p>
              </div>
              <div className="grid justify-start gap-2 items-center grid-flow-col">
                <FaPaperPlane />
                <div className="grid grid-rows-1 grid-flow-col justify-start">
                  <span id="rotating-text">{displayedText}</span>
                  <span className="blinking">|</span>
                </div>
              </div>
            </div>
          </motion.div>
          <div className="grid p-4 rounded-xl grid-rows-7 grid-cols-9 grid-flow-row row-start-3 col-start-6 row-span-3 col-span-6 h-full shadow-2xl">
            <motion.a href="https://x.com/09xgg" target="_blank" rel="noopener noreferrer" className="fade-up grid gap-3 p-6 border shadow-md transition-colors hover:border-black dark:hover:border-gray-300 rounded-lg row-span-3 col-span-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.9)]">
                <FaXTwitter size={48} />
              </div>
              <div className="grid">
                <p>X</p>
                <section className='flex items-center gap-1'>
                  <p className="text-sm text-gray-500">@09xgg</p>
                </section>
              </div>
            </motion.a>
            <motion.a href="https://github.com/Azuretier" target="_blank" rel="noopener noreferrer" className="fade-up grid gap-3 p-6 col-start-6 border shadow-md transition-colors hover:border-black dark:hover:border-gray-300 rounded-lg row-span-3 col-span-4">
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
            <motion.a className="fade-up grid gap-3 p-6 row-start-5 border shadow-md transition-colors hover:border-[rgb(88,101,242)] rounded-lg row-span-3 col-span-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-[rgb(88,101,242)] shadow-md">
                <FaDiscord size={48} />
              </div>
              <div className="grid">
                <p>Discord</p>
                <section className='flex items-center gap-1'>
                  <p className="text-sm text-gray-500">@xykmr_only09</p>
                </section>
              </div>
            </motion.a>
            <motion.a href="https://youtube.com/@Azuret" target="_blank" rel="noopener noreferrer" className="fade-up grid gap-3 p-6 row-start-5 col-start-6 border shadow-md transition-colors hover:border-[rgb(255,0,0)] rounded-lg row-span-3 col-span-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-[rgb(255,0,0)] bg-white shadow-md">
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
    </>
  )
}

export default Main

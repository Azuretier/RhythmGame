"use client"

import { useEffect, useState } from "react"
import { motion, animate } from "framer-motion"
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
      <main className="grid grid-cols-12 grid-rows-7 grid-flow-row items-center justify-center h-screen bg-black">
          <motion.div
            className="fade-up grid gap-4 p-4 rounded-xl text-base font-black text-white grid-cols-1 grid-flow-row row-start-3 col-start-2 row-span-3 col-span-4"
          >
            <Image src="/azure.png" alt="avatar" width={200} height={200} />
            <div className="grid col-span-3">
              <p className="text-3xl">Azuret</p>
              <p className="text-subtext">あずれーと</p>
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
          <div className="grid p-4 rounded-xl text-base font-black text-white grid-rows-7 grid-cols-9 grid-flow-row row-start-3 col-start-6 row-span-3 col-span-6 h-full">
            <motion.a href="https://x.com/09xgg" className="fade-up grid place-items-center gap-3 text-white border-2 border-black outline outline-2 outline-gray-400 outline-offset-0 rounded-lg row-span-3 col-span-4">
              <FaXTwitter size={24} />
            </motion.a>
            <motion.a href="https://github.com/Azuretier" className="fade-up grid place-items-center gap-3 col-start-5 text-white border-2 border-black outline outline-2 outline-gray-400 outline-offset-0 rounded-lg row-span-3 col-span-4">
              <FaGithub size={24} />
            </motion.a>
            <motion.a href="https://discord.gg/XkwSarHyQm" className="fade-up grid place-items-center gap-3 row-start-4 text-indigo-400 border-2 border-black outline outline-2 outline-indigo-400 outline-offset-0 rounded-lg row-span-3 col-span-4">
              <FaDiscord size={24} />
            </motion.a>
            <motion.a href="https://youtube.com/@Azuret" className="fade-up grid place-items-center gap-3 row-start-4 col-start-5 text-red-500 border-2 border-black outline outline-2 outline-red-500 outline-offset-0 rounded-lg row-span-3 col-span-4">
              <FaYoutube size={24} />
            </motion.a>
          </div>
      </main>
    </>
  )
}

export default Main

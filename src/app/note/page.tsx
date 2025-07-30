"use client"

// for a commit for vercel api  
import { useEffect, useState } from "react"
import { motion, animate } from "framer-motion"
import { ThemeToggle } from '@/components/sunmoon';
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
          <motion.div className="fade-up grid items-center grid-cols-1 grid-rows-4 row-start-3 col-start-2 row-span-3 col-span-3 h-full">
            <div className="grid col-span-3 row-start-3 items-center">
              <p className="text-3xl font-black">note</p>
              <p className="text-gray-500 font-black">content 1</p>
              <p className="text-gray-500 font-normal text-lg">content 2</p>
            </div>
          </motion.div>
          <div className="flex items-center justify-center col-span-1 row-span-1 col-start-11 row-start-2">
            <ThemeToggle />
          </div>
      </main>
    </>
  )
}

export default Main

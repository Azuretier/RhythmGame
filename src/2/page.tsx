"use client"

import { useEffect, useState } from "react"
import { motion, animate } from "framer-motion"
import {
  FaBirthdayCake,
  FaUserGraduate,
  FaPaperPlane,
} from "react-icons/fa"
import Image from "next/image"

const Main = () => {
  const texts = [
    "Life is like a paper airplane, isn't it?",
    "Keep flying high!",
    "Every day is a new flight.",
    "Catch the wind and soar!",
  ]

  const [displayedText, setDisplayedText] = useState("")
  const [textIndex, setTextIndex] = useState(0)
  const [typing, setTyping] = useState(true) // true: typing, false: deleting

  useEffect(() => {
    const fadeUp = document.getElementById("fadeUp")
    if (fadeUp != null) {
      animate(fadeUp, { opacity: [0.1, 1] })
    }
  }, [])

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (typing) {
      // Typing mode - add one char at a time
      if (displayedText.length < texts[textIndex].length) {
        timeout = setTimeout(() => {
          setDisplayedText(
            texts[textIndex].slice(0, displayedText.length + 1)
          )
        }, 100) // typing speed
      } else {
        // Done typing, pause before deleting
        timeout = setTimeout(() => setTyping(false), 1500)
      }
    } else {
      // Deleting mode - remove one char at a time
      if (displayedText.length > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1))
        }, 50) // deleting speed (usually faster)
      } else {
        // Done deleting, move to next text & start typing again
        setTyping(true)
        setTextIndex((prev) => (prev + 1) % texts.length)
      }
    }

    return () => clearTimeout(timeout)
  }, [displayedText, typing, textIndex, texts])

  return (
    <main className="grid grid-cols-12 grid-rows-6 grid-flow-row items-center justify-center h-screen bg-black">
      <motion.div
        className="grid gap-4 p-4 rounded-xl text-base font-black text-white row-start-3 col-start-2 row-span-2 col-span-5"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0 }}
        transition={{ type: "spring" }}
        id="fadeUp"
      >
        <Image src="/azure.png" alt="avatar" width={200} height={200} />
        <div className="grid row-start-2 col-span-3">
          <p className="text-3xl">Azuret</p>
          <p className="text-subtext">あずれーと</p>
          <p className="font-normal text-subtext text-lg">I make my world myself</p>
        </div>
        <div className="grid gap-1 text-subtext row-start-3">
          <div className="flex gap-2 items-center">
            <FaBirthdayCake />
            <p>200X/2/18</p>
          </div>
          <div className="flex gap-2 items-center">
            <FaUserGraduate />
            <p>Student</p>
          </div>
          <div className="flex gap-2 items-center">
            <FaPaperPlane />
            <span id="rotating-text">{displayedText}</span>
          </div>
        </div>
      </motion.div>
    </main>
  )
}

export default Main

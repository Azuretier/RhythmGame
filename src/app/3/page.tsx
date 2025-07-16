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
    const fadeUp = document.getElementById("fadeUp")
    if (fadeUp != null) {
      animate(fadeUp, { opacity: [0.1, 1] })
    }
  }, [])

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
          <div className="grid gap-1 text-subtext row-start-3 grid-rows-3">
            <div className="flex gap-2 items-center row-start-1">
              <FaBirthdayCake />
              <p>200X/2/18</p>
            </div>
            <div className="flex gap-2 items-center row-start-2">
              <FaUserGraduate />
              <p>Student</p>
            </div>
            <div className="flex gap-2 items-center row-start-3">
              <FaPaperPlane />
              <span id="rotating-text">{displayedText}</span>
            </div>
          </div>
        </motion.div>
      </main>

      {/* SNS Widget */}
      <div className="fixed top-1/2 right-4 -translate-y-1/2 flex flex-col gap-4 z-50 text-white">
        <a
          href="https://x.com/09xgg"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-blue-400 transition"
          title="Twitter"
        >
          <FaXTwitter size={24} />
        </a>
        <a
          href="https://github.com/Azuretier"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-gray-400 transition"
          title="GitHub"
        >
          <FaGithub size={24} />
        </a>
        <a
          href="https://discord.gg/XkwSarHyQm"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-indigo-400 transition"
          title="Discord"
        >
          <FaDiscord size={24} />
        </a>
        <a
          href="https://youtube.com/@Azuret"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-red-500 transition"
          title="YouTube"
        >
          <FaYoutube size={24} />
        </a>
      </div>
    </>
  )
}

export default Main

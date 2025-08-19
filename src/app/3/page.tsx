"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
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

  // Rotate profile images
  useEffect(() => {
    const interval = setInterval(() => {
      setProfImageIndex((prev) => (prev + 1) % images.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Loading + transition handling
  useEffect(() => {
    if (!isLoaded) return;
    setTimeout(() => {
      setShowLoadingScreen(false);
      setTransitionStarted(true);
      setTimeout(() => setTransitionDisplayed(false), 1100);
      setTimeout(() => setFadeUpAnimationStarted(true), 600);
    }, 400);
  }, [isLoaded]);

  // Typing effect
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

  // Fade-up variants (spring)
  const fadeUpVariant = {
    hidden: { opacity: 0, y: 50 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.15,
        type: "spring",
      },
    }),
  }

  return (
    <main className="grid grid-cols-12 grid-rows-7 items-center justify-center h-screen">
      {/* Transition overlay */}
      {transitionDisplayed && (
        <div
          className={`fixed inset-0 bg-black z-40 transition-transform duration-1000 ${
            transitionStarted ? "-translate-y-full" : "translate-y-0"
          }`}
        ></div>
      )}

      {/* Loading screen */}
      {showLoadingScreen && (
        <div className="flex flex-col items-center gap-4 fixed inset-0 bg-black z-50 flex items-center justify-center transition-opacity duration-700">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <span className="text-white text-2xl">Loading...</span>
        </div>
      )}

      {/* Background rain */}
      <RainEffect onLoaded={() => setIsLoaded(true)} />

      {/* Profile Card */}
      <motion.div
        className="grid backdrop-blur-xl bg-[var(--widget-bg)] border border-[var(--widget-border)] p-6 rounded-lg items-center grid-cols-1 grid-rows-6 row-start-3 col-start-2 row-span-3 col-span-3 h-full"
        variants={fadeUpVariant}
        initial="hidden"
        animate={fadeUpAnimationStarted ? "visible" : "hidden"}
        custom={0}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <div className="flex items-center justify-start row-span-2 w-32 h-32 rounded-full overflow-hidden shadow-lg">
          <AnimatePresence mode="wait">
            <motion.img
              key={images[profImageIndex]}
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

      {/* Social Widgets */}
      <div className="grid rounded-xl grid-rows-7 grid-cols-9 row-start-3 col-start-6 row-span-3 col-span-6 h-full">
        <motion.a
          href="https://x.com/09xgg"
          target="_blank"
          rel="noopener noreferrer"
          className="grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 border border-[var(--widget-border)] shadow-md rounded-lg row-span-3 col-span-4"
          variants={fadeUpVariant}
          initial="hidden"
          animate={fadeUpAnimationStarted ? "visible" : "hidden"}
          custom={1}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black">
            <FaXTwitter size={48} />
          </div>
          <div className="grid">
            <p>X</p>
            <p className="text-sm text-gray-500">@09xgg</p>
          </div>
        </motion.a>

        <motion.a
          href="https://github.com/Azuretier"
          target="_blank"
          rel="noopener noreferrer"
          className="grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 border border-[var(--widget-border)] shadow-md rounded-lg row-span-3 col-span-4 col-start-6"
          variants={fadeUpVariant}
          initial="hidden"
          animate={fadeUpAnimationStarted ? "visible" : "hidden"}
          custom={2}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-black">
            <FaGithub size={48} />
          </div>
          <div className="grid">
            <p>GitHub</p>
            <p className="text-sm text-gray-500">Azuretier</p>
          </div>
        </motion.a>

        <motion.a
          className="grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 border border-[var(--widget-border)] shadow-md rounded-lg row-span-3 col-span-4 row-start-5"
          variants={fadeUpVariant}
          initial="hidden"
          animate={fadeUpAnimationStarted ? "visible" : "hidden"}
          custom={3}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-white bg-[rgb(88,101,242)] drop-shadow-md">
            <FaDiscord size={48} />
          </div>
          <div className="grid">
            <p>Discord</p>
            <p className="text-sm text-gray-500">@xykmr_only09</p>
          </div>
        </motion.a>

        <motion.a
          href="https://youtube.com/@Azuret"
          target="_blank"
          rel="noopener noreferrer"
          className="grid backdrop-blur-xl bg-[var(--widget-bg)] gap-3 p-6 border border-[var(--widget-border)] shadow-md rounded-lg row-span-3 col-span-4 col-start-6 row-start-5"
          variants={fadeUpVariant}
          initial="hidden"
          animate={fadeUpAnimationStarted ? "visible" : "hidden"}
          custom={4}
          whileHover={{ scale: 1.05 }}
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl text-[rgb(255,0,0)] bg-white drop-shadow-md">
            <FaYoutube size={48} />
          </div>
          <div className="grid">
            <p>YouTube</p>
            <p className="text-sm text-gray-500">@Azuret</p>
          </div>
        </motion.a>
      </div>

      {/* Theme Toggle */}
      <div className="flex items-center justify-center col-span-1 row-span-1 col-start-11 row-start-2">
        <ThemeToggle />
      </div>
    </main>
  )
}

export default Main

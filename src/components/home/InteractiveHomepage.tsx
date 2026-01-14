"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import LoadingScreen from "./LoadingScreen";
import MessengerUI from "./MessengerUI";

// Dynamically import background to avoid SSR issues
const WebGLBackground = dynamic(() => import("./WebGLBackground"), {
  ssr: false,
});

export default function InteractiveHomepage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing");
  const [backgroundLoaded, setBackgroundLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      // Detect GPU capability
      setStatus("Detecting capabilities");
      setProgress(20);

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (!mounted) return;

      setStatus("Loading experience");
      setProgress(40);

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (!mounted) return;

      setProgress(60);
      setStatus("Preparing interface");

      await new Promise((resolve) => setTimeout(resolve, 500));
      
      if (!mounted) return;

      setProgress(80);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // When background is loaded, complete the loading
    if (backgroundLoaded && progress >= 80) {
      setProgress(100);
      setStatus("Ready");

      setTimeout(() => {
        setLoading(false);
      }, 800);
    }
  }, [backgroundLoaded, progress]);

  const handleBackgroundLoaded = () => {
    console.log("Background loaded");
    setBackgroundLoaded(true);
  };

  return (
    <>
      {/* Background shader */}
      <WebGLBackground onLoaded={handleBackgroundLoaded} />

      {/* Loading screen */}
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen progress={progress} status={status} />}
      </AnimatePresence>

      {/* Main messenger UI */}
      {!loading && <MessengerUI />}
    </>
  );
}

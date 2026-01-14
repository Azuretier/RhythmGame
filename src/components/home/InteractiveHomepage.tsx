"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import LoadingScreen from "./LoadingScreen";
import MessengerUI from "./MessengerUI";
import VersionSelector from "@/components/version/VersionSelector";
import FloatingVersionSwitcher from "@/components/version/FloatingVersionSwitcher";
import { useVersion } from "@/lib/version/context";
import type { AppVersion } from "@/lib/version/types";

// Dynamically import background to avoid SSR issues
const WebGLBackground = dynamic(() => import("./WebGLBackground"), {
  ssr: false,
});

export default function InteractiveHomepage() {
  const router = useRouter();
  const { currentVersion, setVersion, isVersionSelected } = useVersion();
  const [loading, setLoading] = useState(true);
  const [showVersionSelector, setShowVersionSelector] = useState(false);
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
        // Show version selector if no version is selected
        if (!isVersionSelected) {
          setShowVersionSelector(true);
        }
      }, 800);
    }
  }, [backgroundLoaded, progress, isVersionSelected]);

  const handleVersionSelect = (version: AppVersion) => {
    setVersion(version);
    setShowVersionSelector(false);
    
    // Route to appropriate page based on version
    if (version === '1.0.1') {
      router.push('/current');
    }
    // For v1.0.0, stay on current page (which shows MessengerUI)
  };

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

      {/* Version selector - shown after loading if no version selected */}
      <AnimatePresence mode="wait">
        {!loading && showVersionSelector && (
          <VersionSelector onSelect={handleVersionSelect} />
        )}
      </AnimatePresence>

      {/* Main messenger UI - shown if v1.0.0 is selected or already selected */}
      {!loading && !showVersionSelector && currentVersion === '1.0.0' && (
        <>
          <MessengerUI />
          <FloatingVersionSwitcher />
        </>
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import LoadingScreen from "./LoadingScreen";
import VersionSelector from "../version/VersionSelector";
import VersionSwitcher from "../version/VersionSwitcher";
import { UIVersion } from "@/lib/version/types";
import { useVersion } from "@/lib/version/context";
import {
  getSelectedVersion,
  setSelectedVersion,
  hasVersionSelection,
} from "@/lib/version/storage";
import V1_0_0_UI from "./v1.0.0/V1_0_0_UI";
import V1_0_1_UI from "./v1.0.1/V1_0_1_UI";
import V1_0_2_UI from "./v1.0.2/V1_0_2_UI";

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
  const [selectedVersion, setSelectedVersionState] = useState<UIVersion | null>(
    null
  );

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      // Check if version is already selected
      const version = getSelectedVersion();
      if (version) {
        setSelectedVersionState(version);
      }

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
        if (!hasVersionSelection()) {
          setTimeout(() => {
            setShowVersionSelector(true);
          }, 300);
        }
      }, 800);
    }
  }, [backgroundLoaded, progress, isVersionSelected]);

  const handleVersionSelect = (version: UIVersion) => {
    // Persist selection via storage
    setSelectedVersion(version);
    // Update local state
    setSelectedVersionState(version);
    // Update context
    setVersion(version);
    // Hide the selector
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

  const renderVersionUI = () => {
    switch (selectedVersion) {
      case "1.0.0":
        return <V1_0_0_UI />;
      case "1.0.1":
        return <V1_0_1_UI />;
      case "1.0.2":
        return <V1_0_2_UI />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Background shader */}
      <WebGLBackground onLoaded={handleBackgroundLoaded} />

      {/* Loading screen */}
      <AnimatePresence mode="wait">
        {loading && <LoadingScreen progress={progress} status={status} />}
      </AnimatePresence>

      {/* Version selector (first time only) */}
      {!loading && showVersionSelector && (
        <VersionSelector onSelect={handleVersionSelect} />
      )}

      {/* Main UI based on selected version */}
      {!loading && !showVersionSelector && selectedVersion && (
        <>
          {renderVersionUI()}
          <VersionSwitcher />
        </>
      )}
    </>
  );
}

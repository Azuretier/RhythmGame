"use client";

import { useEffect, memo } from "react";

interface StaticBackgroundProps {
  onLoaded?: () => void;
}

const StaticBackground = memo(({ onLoaded }: StaticBackgroundProps) => {
  // Call onLoaded after component mounts
  useEffect(() => {
    if (onLoaded) {
      onLoaded();
    }
  }, [onLoaded]);

  return (
    <div
      className="fixed inset-0 -z-10"
      style={{
        background:
          "linear-gradient(to bottom, rgb(12, 25, 51) 0%, rgb(51, 38, 77) 40%, rgb(204, 76, 128) 100%)",
      }}
    />
  );
});

StaticBackground.displayName = "StaticBackground";

export default StaticBackground;

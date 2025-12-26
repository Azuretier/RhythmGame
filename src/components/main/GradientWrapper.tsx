"use client"; // Required for Framer Motion in Next.js App Router

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GradientMotionLinkProps extends HTMLMotionProps<'a'> {
  children: React.ReactNode;
  gradient?: string;
  className?: string;
  rounded?: string;
}

export default function GradientMotionLink({
  children,
  gradient = "from-blue-500 to-purple-600",
  className = "",
  rounded = "rounded-xl",
  ...props
}: GradientMotionLinkProps) {
  return (
    <motion.a
      // Standard Link Props (href, target, etc.)
      {...props}
      
      // Framer Motion Gestures
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      
      // Layout Classes
      className={`group relative cursor-pointer inline-block p-[2px] ${rounded} ${className}`}
    >
      {/* The Gradient Layer - Now also animated by Motion */}
      <motion.div
        className={`absolute backdrop-blur-xl inset-1 bg-gradient-to-r ${gradient} ${rounded} opacity-0 group-hover:opacity-100`}
        transition={{ duration: 0.3 }}
      />
        {children}
    </motion.a>
  );
}
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
  rounded = "rounded-lg",
  ...props
}: GradientMotionLinkProps) {
  return (
    <motion.a
      {...props}
      className={`group backdrop-blur-xl inset-0 hover:bg-gradient-to-r ${gradient} ${rounded} transition-colors duration-300 ${className}`}
    >
      <div className={`relative backdrop-blur-xl bg-white dark:bg-slate-900 h-full w-full ${rounded}`}>
        {children}
      </div>
    </motion.a>
  );
}
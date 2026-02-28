"use client"; // Required for Framer Motion in Next.js App Router

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GradientMotionLinkProps extends HTMLMotionProps<'a'> {
  children: React.ReactNode;
  gradient?: string;
  className?: string;
}

export default function GradientMotionLink({
  children,
  gradient = "from-blue-500 to-purple-600",
  className,
  ...props
}: GradientMotionLinkProps) {
  return (
    <motion.a
      {...props}
      className={`hover:bg-gradient-to-r ${gradient} ${className}`}
    >
      <div className={`relative backdrop-blur-xl p-1`}>
        {children}
      </div>
    </motion.a>
  );
}
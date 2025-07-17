'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const FADE_UP_ANIMATION_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

// children refer to whatever stuff is nested inside of FadeUpStagger i think
const FadeUpStagger = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      viewport={{ once: true }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.15,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// The href will point to the first argument of forwardRef<> HTMLDivElement
// The props accepted are based on React.HTMLAttributes<HTMLAnchorElement> which means contents from <a>
const FadeUpDiv = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLAnchorElement>>(
  ({ className, children }, ref) => (
    <motion.div ref={ref} className={className} variants={FADE_UP_ANIMATION_VARIANTS}>
      {children}
    </motion.div>
  ),
);
FadeUpDiv.displayName = 'FadeUpDiv';

const FadeUpCard = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ className, children, href }, ref) => (
    <motion.a
      ref={ref}
      className={cn('rounded-xl border bg-card text-card-foreground shadow', className)}
      href={href}
      target='_blank'
      rel='noreferrer'
      variants={FADE_UP_ANIMATION_VARIANTS}
    >
      {children}
    </motion.a>
  ),
);
FadeUpCard.displayName = 'CardIcon';

export { FADE_UP_ANIMATION_VARIANTS, FadeUpStagger, FadeUpDiv, FadeUpCard };
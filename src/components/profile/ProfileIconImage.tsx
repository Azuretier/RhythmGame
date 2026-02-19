'use client';

import { useState } from 'react';
import { getIconSrc } from '@/lib/profile/types';

interface ProfileIconImageProps {
  iconId: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Renders a profile icon from a PNG in public/profile_image/.
 * Shows a default user silhouette if the image fails to load.
 */
export default function ProfileIconImage({
  iconId,
  size = 48,
  className,
  style,
}: ProfileIconImageProps) {
  const [failed, setFailed] = useState(false);

  const src = getIconSrc(iconId);
  const showDefault = !src || failed;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: showDefault ? '#444' : 'transparent',
        flexShrink: 0,
        ...style,
      }}
    >
      {showDefault ? (
        <svg
          width={size * 0.55}
          height={size * 0.55}
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ) : (
        <img
          src={src}
          alt={iconId}
          width={size}
          height={size}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setFailed(true)}
          draggable={false}
        />
      )}
    </div>
  );
}

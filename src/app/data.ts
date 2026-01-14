// app/data.ts
import { Github, Youtube, Instagram, MessageSquare, LucideIcon } from 'lucide-react';

export interface SocialLink {
  name: string;
  icon: LucideIcon;
  url: string;
  color: string;
  username: string;
}

export const AZURET_DATA = {
  name: "Azuret",
  role: "Full-stack Developer & Digital Architect",
  discord: {
    tag: "daichi_a",
    url: "https://discord.gg/wPaRjH76"
  },
  socials: [
    { 
      name: 'GitHub', 
      icon: Github, 
      url: 'https://github.com/Azuretier', 
      color: 'hover:text-white',
      username: 'Azuretier'
    },
    { 
      name: 'YouTube', 
      icon: Youtube, 
      url: 'https://youtube.com/@azuretya', 
      color: 'hover:text-red-500',
      username: '@Azuret'
    },
    { 
      name: 'Instagram', 
      icon: Instagram, 
      url: 'https://www.instagram.com/rrrrrrrrrrvq', 
      color: 'hover:text-pink-500',
      username: '@rrrrrrrrrrvq'
    },
    { 
      name: 'Discord', 
      icon: MessageSquare, 
      url: 'https://discord.gg/z5Q2MSFWuu', 
      color: 'hover:text-indigo-400',
      username: 'Join Community'
    },
  ] as SocialLink[]
};
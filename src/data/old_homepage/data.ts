// src/data/site-data.ts
import { 
  FaGithub, FaDiscord, FaYoutube, FaInstagram, 
  FaCode, FaGamepad, FaRobot 
} from "react-icons/fa";

export interface SnsData {
  id: string;
  label: string;
  username: string;
  href: string;
  icon: any;
  gradient: string;
  isStatic?: boolean;
}

export interface ProjectData {
  id: string;
  title: string;
  status: "Live" | "Developing" | "Paused" | "Planned";
  tech: string;
  description: string;
}

export const PROFILE_INFO = {
  name: "Azure",
  handle: "@daichi_a",
  pronouns: "He / Him",
  birthday: "200X / 02 / 18",
  role: "Student",
  bio_texts: [
    "Life is like a paper airplane, isn't it?",
    "I make my world myself",
  ],
  images: [
    "profile_image/original_azure.png",
    "profile_image/♔.png",
    "profile_image/azure.jpg",
    "profile_image/doll.jpg",
    "profile_image/siesta.jpg",
    "profile_image/Switch_Edition.png",
  ]
};

export const SNS_LINKS: SnsData[] = [
  { 
    id: "insta",
    label: "Instagram", 
    username: "@rrrrrrrrrrvq", 
    href: "https://instagram.com/rrrrrrrrrrvq", 
    icon: FaInstagram, 
    gradient: "bg-gradient-to-br from-purple-500 to-pink-500" 
  },
  { 
    id: "github",
    label: "GitHub", 
    username: "Azuretier", 
    href: "https://github.com/Azuretier", 
    icon: FaGithub, 
    gradient: "bg-gradient-to-br from-gray-700 to-black" 
  },
  { 
    id: "discord",
    label: "Discord", 
    username: "@daichi_a", 
    href: "#", 
    icon: FaDiscord, 
    gradient: "bg-gradient-to-br from-indigo-500 to-blue-600",
    isStatic: true 
  },
  { 
    id: "youtube",
    label: "YouTube", 
    username: "@azuchan_a", 
    href: "https://youtube.com/@azuchan_a", 
    icon: FaYoutube, 
    gradient: "bg-gradient-to-br from-red-600 to-red-400" 
  },
];

export const PROJECTS: ProjectData[] = [
  { 
    id: "p1", 
    title: "MNSW Revamp Project", 
    status: "Developing", 
    tech: "Three.js",
    description: "Trying to reproduce my nostalgia as we were playing like those days again."
  },
  { 
    id: "p2", 
    title: "Blog website", 
    status: "Planned", 
    tech: "Next.js + TailwindCSS",
    description: "A chill blog website to share my thoughts and experiences."
  },
  { 
    id: "p3", 
    title: "Discord Bot", 
    status: "Developing", 
    tech: "discord.py",
    description: "A multifunctional Discord bot for creative features created by me."
  }
];
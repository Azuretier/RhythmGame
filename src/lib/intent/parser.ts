export interface IntentResult {
  type: "route" | "help";
  destination?: {
    name: string;
    url: string;
    icon: string;
  };
  message?: string;
}

const destinations = {
  x: {
    name: "X (Twitter)",
    url: "https://x.com/c2c546",
    icon: "𝕏",
    keywords: ["x", "twitter", "tweet", "tweets", "𝕏"],
  },
  youtube: {
    name: "YouTube",
    url: "https://www.youtube.com/@azuretya",
    icon: "▶",
    keywords: ["youtube", "video", "videos", "channel", "watch", "yt"],
  },
  discord: {
    name: "Discord",
    url: "https://discord.gg/TRFHTWCY4W",
    icon: "💬",
    keywords: ["discord", "server", "chat", "community", "join"],
  },
  github: {
    name: "GitHub",
    url: "https://github.com/Azuretier",
    icon: "💻",
    keywords: ["github", "code", "repository", "repo", "git"],
  },
  instagram: {
    name: "Instagram",
    url: "https://www.instagram.com/rrrrrrrrrrvq",
    icon: "📸",
    keywords: ["instagram", "insta", "ig", "photo", "pictures"],
  },
};

export function parseIntent(input: string): IntentResult {
  const normalized = input.toLowerCase().trim();

  // Check if empty or just asking for help
  if (!normalized || normalized.match(/^(help|what|how|info|list|show|tell|commands?)$/)) {
    return {
      type: "help",
      message: "I can help you navigate to:",
    };
  }

  // Check each destination
  for (const dest of Object.values(destinations)) {
    const matched = dest.keywords.some((keyword) => {
      // Match if keyword is in the message
      return normalized.includes(keyword);
    });

    if (matched) {
      return {
        type: "route",
        destination: {
          name: dest.name,
          url: dest.url,
          icon: dest.icon,
        },
      };
    }
  }

  // No match found - show help
  return {
    type: "help",
    message: "I didn't understand that. Try mentioning:",
  };
}

export function getAvailableDestinations() {
  return Object.values(destinations).map((dest) => ({
    name: dest.name,
    url: dest.url,
    icon: dest.icon,
  }));
}

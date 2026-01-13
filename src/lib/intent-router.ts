import { HOMEPAGE_CONFIG, INTENT_KEYWORDS } from "./homepage-config";

export type IntentDestination = "x" | "youtube" | "discord" | "github" | "instagram" | "unknown";

export interface IntentResult {
  destination: IntentDestination;
  url?: string;
  confidence: number;
  message: string;
}

/**
 * Parse user input to determine intent and route to appropriate destination
 * Uses heuristic keyword matching
 */
export function parseIntent(userInput: string): IntentResult {
  const input = userInput.toLowerCase().trim();

  // Check for empty input
  if (!input) {
    return {
      destination: "unknown",
      confidence: 0,
      message: "Try asking where you can find me! (X, YouTube, Discord, GitHub, or Instagram)",
    };
  }

  // Calculate match scores for each destination
  const scores: Record<IntentDestination, number> = {
    x: 0,
    youtube: 0,
    discord: 0,
    github: 0,
    instagram: 0,
    unknown: 0,
  };

  // Calculate scores by checking keywords
  Object.entries(INTENT_KEYWORDS).forEach(([destination, keywords]) => {
    keywords.forEach((keyword) => {
      if (input.includes(keyword)) {
        scores[destination as Exclude<IntentDestination, "unknown">] += 1;
      }
    });
  });

  // Find the highest scoring destination
  let maxScore = 0;
  let bestDestination: Exclude<IntentDestination, "unknown"> | null = null;

  const destinations: Array<Exclude<IntentDestination, "unknown">> = [
    "x",
    "youtube",
    "discord",
    "github",
    "instagram",
  ];

  destinations.forEach((key) => {
    if (scores[key] > maxScore) {
      maxScore = scores[key];
      bestDestination = key;
    }
  });

  // Return result based on destination
  if (bestDestination === "x") {
    return {
      destination: "x",
      url: HOMEPAGE_CONFIG.socials.x,
      confidence: maxScore,
      message: "Taking you to my X (Twitter) profile! 🐦",
    };
  }

  if (bestDestination === "youtube") {
    return {
      destination: "youtube",
      url: HOMEPAGE_CONFIG.socials.youtube,
      confidence: maxScore,
      message: "Opening my YouTube channel! 🎥",
    };
  }

  if (bestDestination === "discord") {
    return {
      destination: "discord",
      url: HOMEPAGE_CONFIG.socials.discord.invite,
      confidence: maxScore,
      message: "Let's chat on Discord! 💬",
    };
  }

  if (bestDestination === "github") {
    return {
      destination: "github",
      url: HOMEPAGE_CONFIG.socials.github,
      confidence: maxScore,
      message: "Check out my GitHub projects! 💻",
    };
  }

  if (bestDestination === "instagram") {
    return {
      destination: "instagram",
      url: HOMEPAGE_CONFIG.socials.instagram,
      confidence: maxScore,
      message: "See my Instagram photos! 📸",
    };
  }

  // No clear intent found
  return {
    destination: "unknown",
    confidence: 0,
    message:
      "I can help you find me on:\n• X (Twitter)\n• YouTube\n• Discord\n• GitHub\n• Instagram\n\nJust ask!",
  };
}

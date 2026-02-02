import { Shield, Zap, Heart, Server, Music, Database, Youtube, Instagram, Github, MessageCircle } from "lucide-react";

// --- TRANSLATIONS ---
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    profile: "Profile",
    social: "Social",
    projects: "Projects",
    analytics: "Analytics",
    terminal: "Terminal",
    settings: "Settings",
    azureDocs: "Azure Docs",
    appearance: "Appearance",
    darkMode: "Dark Mode",
    darkModeDesc: "Use dark theme across the interface",
    colorTheme: "Color Theme",
    notifications: "Notifications",
    enableNotifications: "Enable Notifications",
    notificationsDesc: "Receive updates and alerts",
    visualEffects: "Visual Effects",
    rainIntensity: "Rain Effect Intensity",
    rainIntensityDesc: "Adjusts the number of raindrops displayed",
    newsSpeed: "News Rotation Speed",
    newsSpeedDesc: "How fast the news ticker rotates (in seconds)",
    languageRegion: "Language & Region",
    language: "Language",
    system: "System",
    autoSave: "Auto-save Settings",
    autoSaveDesc: "Automatically save changes",
    resetDefaults: "Reset to Default Settings",
    saveChanges: "Save Changes",
    settingsSaved: "Settings Saved!",
    loading: "Loading Experience",
    loadingDesc: "Please wait while we prepare everything",
    initializing: "Initializing",
    birthday: "Birthday",
    location: "Location",
    email: "Email",
    website: "Website",
    totalVisits: "Total Visits",
    todayVisits: "Today's Visits",
    uniqueVisitors: "Unique Visitors",
    avgSession: "Avg. Session",
    topCountries: "Top Countries",
    lastVisit: "Last visit",
  },
  ja: {
    profile: "プロフィール",
    social: "ソーシャル",
    projects: "プロジェクト",
    analytics: "分析",
    terminal: "ターミナル",
    settings: "設定",
    azureDocs: "Azure ドキュメント",
    appearance: "外観",
    darkMode: "ダークモード",
    darkModeDesc: "インターフェース全体でダークテーマを使用",
    colorTheme: "カラーテーマ",
    notifications: "通知",
    enableNotifications: "通知を有効にする",
    notificationsDesc: "アップデートとアラートを受け取る",
    visualEffects: "視覚効果",
    rainIntensity: "雨エフェクトの強度",
    rainIntensityDesc: "表示される雨滴の数を調整",
    newsSpeed: "ニュースの回転速度",
    newsSpeedDesc: "ニュースティッカーの回転速度（秒）",
    languageRegion: "言語と地域",
    language: "言語",
    system: "システム",
    autoSave: "設定を自動保存",
    autoSaveDesc: "変更を自動的に保存",
    resetDefaults: "デフォルト設定にリセット",
    saveChanges: "変更を保存",
    settingsSaved: "設定を保存しました！",
    loading: "読み込み中",
    loadingDesc: "準備中です。お待ちください",
    initializing: "初期化中",
    birthday: "誕生日",
    location: "場所",
    email: "メール",
    website: "ウェブサイト",
    totalVisits: "総訪問数",
    todayVisits: "今日の訪問数",
    uniqueVisitors: "ユニーク訪問者",
    avgSession: "平均セッション",
    topCountries: "上位の国",
    lastVisit: "最終訪問",
  },
  es: {
    profile: "Perfil",
    social: "Social",
    projects: "Proyectos",
    analytics: "Análisis",
    terminal: "Terminal",
    settings: "Configuración",
    azureDocs: "Docs de Azure",
    appearance: "Apariencia",
    darkMode: "Modo Oscuro",
    darkModeDesc: "Usar tema oscuro en toda la interfaz",
    colorTheme: "Tema de Color",
    notifications: "Notificaciones",
    enableNotifications: "Activar Notificaciones",
    notificationsDesc: "Recibir actualizaciones y alertas",
    visualEffects: "Efectos Visuales",
    rainIntensity: "Intensidad de Lluvia",
    rainIntensityDesc: "Ajusta la cantidad de gotas mostradas",
    newsSpeed: "Velocidad de Noticias",
    newsSpeedDesc: "Qué tan rápido rotan las noticias (segundos)",
    languageRegion: "Idioma y Región",
    language: "Idioma",
    system: "Sistema",
    autoSave: "Guardado Automático",
    autoSaveDesc: "Guardar cambios automáticamente",
    resetDefaults: "Restablecer Configuración",
    saveChanges: "Guardar Cambios",
    settingsSaved: "¡Configuración Guardada!",
    loading: "Cargando",
    loadingDesc: "Por favor espera mientras preparamos todo",
    initializing: "Inicializando",
    birthday: "Cumpleaños",
    location: "Ubicación",
    email: "Correo",
    website: "Sitio Web",
    totalVisits: "Visitas Totales",
    todayVisits: "Visitas de Hoy",
    uniqueVisitors: "Visitantes Únicos",
    avgSession: "Sesión Promedio",
    topCountries: "Países Principales",
    lastVisit: "Última visita",
  },
  fr: {
    profile: "Profil",
    social: "Social",
    projects: "Projets",
    analytics: "Analytique",
    terminal: "Terminal",
    settings: "Paramètres",
    azureDocs: "Docs Azure",
    appearance: "Apparence",
    darkMode: "Mode Sombre",
    darkModeDesc: "Utiliser le thème sombre",
    colorTheme: "Thème de Couleur",
    notifications: "Notifications",
    enableNotifications: "Activer les Notifications",
    notificationsDesc: "Recevoir les mises à jour",
    visualEffects: "Effets Visuels",
    rainIntensity: "Intensité de la Pluie",
    rainIntensityDesc: "Ajuste le nombre de gouttes",
    newsSpeed: "Vitesse des Actualités",
    newsSpeedDesc: "Vitesse de rotation (secondes)",
    languageRegion: "Langue et Région",
    language: "Langue",
    system: "Système",
    autoSave: "Sauvegarde Auto",
    autoSaveDesc: "Sauvegarder automatiquement",
    resetDefaults: "Réinitialiser",
    saveChanges: "Sauvegarder",
    settingsSaved: "Paramètres Sauvegardés!",
    loading: "Chargement",
    loadingDesc: "Veuillez patienter",
    initializing: "Initialisation",
    birthday: "Anniversaire",
    location: "Lieu",
    email: "Email",
    website: "Site Web",
    totalVisits: "Visites Totales",
    todayVisits: "Visites Aujourd'hui",
    uniqueVisitors: "Visiteurs Uniques",
    avgSession: "Session Moyenne",
    topCountries: "Top Pays",
    lastVisit: "Dernière visite",
  },
  de: {
    profile: "Profil",
    social: "Sozial",
    projects: "Projekte",
    analytics: "Analytik",
    terminal: "Terminal",
    settings: "Einstellungen",
    azureDocs: "Azure Docs",
    appearance: "Erscheinung",
    darkMode: "Dunkelmodus",
    darkModeDesc: "Dunkles Theme verwenden",
    colorTheme: "Farbthema",
    notifications: "Benachrichtigungen",
    enableNotifications: "Benachrichtigungen aktivieren",
    notificationsDesc: "Updates erhalten",
    visualEffects: "Visuelle Effekte",
    rainIntensity: "Regenintensität",
    rainIntensityDesc: "Anzahl der Regentropfen",
    newsSpeed: "Nachrichtengeschwindigkeit",
    newsSpeedDesc: "Rotationsgeschwindigkeit (Sekunden)",
    languageRegion: "Sprache & Region",
    language: "Sprache",
    system: "System",
    autoSave: "Auto-Speichern",
    autoSaveDesc: "Änderungen automatisch speichern",
    resetDefaults: "Zurücksetzen",
    saveChanges: "Speichern",
    settingsSaved: "Einstellungen Gespeichert!",
    loading: "Laden",
    loadingDesc: "Bitte warten",
    initializing: "Initialisierung",
    birthday: "Geburtstag",
    location: "Standort",
    email: "E-Mail",
    website: "Webseite",
    totalVisits: "Gesamtbesuche",
    todayVisits: "Besuche Heute",
    uniqueVisitors: "Einzigartige Besucher",
    avgSession: "Durchschn. Sitzung",
    topCountries: "Top Länder",
    lastVisit: "Letzter Besuch",
  },
  zh: {
    profile: "个人资料",
    social: "社交",
    projects: "项目",
    analytics: "分析",
    terminal: "终端",
    settings: "设置",
    azureDocs: "Azure 文档",
    appearance: "外观",
    darkMode: "深色模式",
    darkModeDesc: "在整个界面使用深色主题",
    colorTheme: "颜色主题",
    notifications: "通知",
    enableNotifications: "启用通知",
    notificationsDesc: "接收更新和警报",
    visualEffects: "视觉效果",
    rainIntensity: "雨效果强度",
    rainIntensityDesc: "调整显示的雨滴数量",
    newsSpeed: "新闻轮换速度",
    newsSpeedDesc: "新闻轮换的速度（秒）",
    languageRegion: "语言和地区",
    language: "语言",
    system: "系统",
    autoSave: "自动保存设置",
    autoSaveDesc: "自动保存更改",
    resetDefaults: "重置为默认设置",
    saveChanges: "保存更改",
    settingsSaved: "设置已保存！",
    loading: "加载中",
    loadingDesc: "请稍候",
    initializing: "初始化中",
    birthday: "生日",
    location: "位置",
    email: "电子邮件",
    website: "网站",
    totalVisits: "总访问量",
    todayVisits: "今日访问",
    uniqueVisitors: "独立访客",
    avgSession: "平均会话",
    topCountries: "热门国家",
    lastVisit: "上次访问",
  },
};

export const SNS_LINKS = [
  { id: 1, icon: Youtube, label: "YouTube", username: "@azuret", href: "https://youtube.com", isStatic: false, followers: "10.5K" },
  { id: 2, icon: Github, label: "GitHub", username: "Azuretier", href: "https://github.com/Azuretier", isStatic: false, followers: "2.3K" },
  { id: 3, icon: Instagram, label: "Instagram", username: "@yourhandle", href: "https://instagram.com", isStatic: false, followers: "5.8K" },
  { id: 4, icon: MessageCircle, label: "Discord", username: "username#0000", href: "#", isStatic: true, followers: "Online" },
];

export const MUSIC_TRACKS = [
  { id: 1, title: "Constant Moderato", artist: "Mitsukiyo", album: "Blue Archive OST", duration: "2:17", cover: "/api/placeholder/80/80", liked: true },
  { id: 2, title: "Unwelcome School", artist: "Mitsukiyo", album: "Blue Archive OST", duration: "3:42", cover: "/api/placeholder/80/80", liked: false },
  { id: 3, title: "Luminous Memory", artist: "Mitsukiyo", album: "Blue Archive OST", duration: "4:15", cover: "/api/placeholder/80/80", liked: true },
  { id: 4, title: "Aoharu Dreamer", artist: "Mitsukiyo", album: "Blue Archive OST", duration: "3:28", cover: "/api/placeholder/80/80", liked: false },
  { id: 5, title: "Pixel Time", artist: "Mitsukiyo", album: "Blue Archive OST", duration: "2:56", cover: "/api/placeholder/80/80", liked: true },
];

export const DISCORD_SERVERS = [
  { id: 1, name: "Azure Supporter", description: "Official support server for Azure Bot", members: "12,847", online: "1,234", icon: "🤖", invite: "https://discord.gg/azure", category: "Bot Support", verified: true, banner: "/api/placeholder/400/100" },
  { id: 2, name: "Developer Page", description: "A place for developers to hang out and collaborate", members: "5,621", online: "432", icon: "💻", invite: "https://discord.com/developers/", category: "Development", verified: false, banner: "/api/placeholder/400/100" },
  { id: 3, name: "Gaming Hub", description: "Play games and make friends from around the world", members: "8,932", online: "2,156", icon: "🎮", invite: "https://discord.gg/gaming", category: "Gaming", verified: true, banner: "/api/placeholder/400/100" },
  { id: 4, name: "Music Lounge", description: "Share and discover new music together", members: "3,456", online: "287", icon: "🎵", invite: "https://discord.gg/music", category: "Music", verified: false, banner: "/api/placeholder/400/100" },
];

export const THEMES = {
  purple: {
    id: 'purple',
    name: 'Purple Dream',
    gradient: 'from-purple-500 to-pink-500',
    primary: 'rgb(168, 85, 247)',
    secondary: 'rgb(236, 72, 153)',
    accent: 'purple-500',
    glow: 'shadow-purple-500/50',
    bg: 'from-slate-800 via-purple-900/20 to-slate-950',
    bgLight: 'from-purple-50 via-pink-50 to-white',
  },
  blue: {
    id: 'blue',
    name: 'Ocean Blue',
    gradient: 'from-blue-500 to-cyan-500',
    primary: 'rgb(59, 130, 246)',
    secondary: 'rgb(6, 182, 212)',
    accent: 'blue-500',
    glow: 'shadow-blue-500/50',
    bg: 'from-slate-800 via-blue-900/20 to-slate-950',
    bgLight: 'from-blue-50 via-cyan-50 to-white',
  },
  green: {
    id: 'green',
    name: 'Forest Green',
    gradient: 'from-green-500 to-emerald-500',
    primary: 'rgb(34, 197, 94)',
    secondary: 'rgb(16, 185, 129)',
    accent: 'green-500',
    glow: 'shadow-green-500/50',
    bg: 'from-slate-800 via-green-900/20 to-slate-950',
    bgLight: 'from-green-50 via-emerald-50 to-white',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    gradient: 'from-orange-500 to-red-500',
    primary: 'rgb(249, 115, 22)',
    secondary: 'rgb(239, 68, 68)',
    accent: 'orange-500',
    glow: 'shadow-orange-500/50',
    bg: 'from-slate-800 via-orange-900/20 to-slate-950',
    bgLight: 'from-orange-50 via-red-50 to-white',
  },
};

export const PROFILE_INFO = {
  images: ["/profile_image/doll.jpg"],
  name: "Azurette",
  pronouns: "they/them",
  birthday: "February 18th",
  role: "Developer & Designer",
  location: "Tokyo, Japan",
  email: "daichi@azuret.me",
  website: "azuret.me",
  bio_texts: ["Building cool stuff", "Learning new things", "Creating experiences"]
};

export const PROJECTS = [
  { id: 1, title: "Portfolio Website", status: "In Dev", tech: "Next.js, TailwindCSS", description: "Modern portfolio website powered by my ideas", progress: 20, lastUpdate: "1 min ago" },
  { id: 2, title: "Azure Supporter", status: "In Progress", tech: "Node.js, discord.js", description: "A powerful Discord bot for server management", progress: 10, lastUpdate: "5 hours ago" },
  { id: 3, title: "Web Service", status: "Planning", tech: "React, Next.js, TailwindCSS, Google Firestore Database", description: "Planning some web services such as blog, SNS, live-chat, games and more!", progress: 5, lastUpdate: "1 min ago" },
];


export const VISITOR_DATA = {
  totalVisits: 12847,
  todayVisits: 234,
  uniqueVisitors: 8392,
  avgSessionTime: "3m 42s",
  topCountries: ["Japan 🇯🇵", "USA 🇺🇸", "UK 🇬🇧"],
  lastVisit: "2 minutes ago"
};

export const NEWS_HEADLINES = [
  "Breaking: New web framework announced at conference today",
  "My meta: 顔面最可愛い幸せ𝓪𝓷𝓰𝓮𝓵...",
  "Latest project reaches 100% completion milestone",
];

export const AZURE_DOCS = {
  overview: {
    title: "Azure Supporter",
    tagline: "Your Ultimate Discord Server Management Bot",
    description: "Azure Supporter is a powerful, feature-rich Discord bot designed to enhance your server experience with moderation tools, utility commands, fun features, and seamless integrations.",
    version: "2.5.0",
    prefix: "!az",
    invite: "https://discord.com/oauth2/authorize?client_id=YOUR_BOT_ID",
  },
  features: [
    {
      icon: Shield,
      title: "Moderation",
      description: "Powerful moderation tools to keep your server safe",
      commands: [
        { name: "!az ban", desc: "Ban a user from the server", usage: "!az ban @user [reason]" },
        { name: "!az kick", desc: "Kick a user from the server", usage: "!az kick @user [reason]" },
        { name: "!az mute", desc: "Mute a user temporarily", usage: "!az mute @user [duration] [reason]" },
        { name: "!az warn", desc: "Issue a warning to a user", usage: "!az warn @user [reason]" },
        { name: "!az clear", desc: "Delete multiple messages", usage: "!az clear [amount]" },
        { name: "!az slowmode", desc: "Set channel slowmode", usage: "!az slowmode [seconds]" },
      ]
    },
    {
      icon: Zap,
      title: "Utility",
      description: "Essential utility commands for everyday use",
      commands: [
        { name: "!az userinfo", desc: "Display user information", usage: "!az userinfo [@user]" },
        { name: "!az serverinfo", desc: "Display server statistics", usage: "!az serverinfo" },
        { name: "!az avatar", desc: "Get user's avatar", usage: "!az avatar [@user]" },
        { name: "!az poll", desc: "Create a poll", usage: "!az poll \"Question\" \"Option1\" \"Option2\"" },
        { name: "!az remind", desc: "Set a reminder", usage: "!az remind [time] [message]" },
        { name: "!az translate", desc: "Translate text", usage: "!az translate [lang] [text]" },
      ]
    },
    {
      icon: Heart,
      title: "Fun & Games",
      description: "Entertainment commands to engage your community",
      commands: [
        { name: "!az 8ball", desc: "Ask the magic 8-ball", usage: "!az 8ball [question]" },
        { name: "!az coinflip", desc: "Flip a coin", usage: "!az coinflip" },
        { name: "!az roll", desc: "Roll dice", usage: "!az roll [sides]" },
        { name: "!az meme", desc: "Get a random meme", usage: "!az meme" },
        { name: "!az trivia", desc: "Start a trivia game", usage: "!az trivia [category]" },
        { name: "!az quote", desc: "Get an inspirational quote", usage: "!az quote" },
      ]
    },
    {
      icon: Server,
      title: "Server Management",
      description: "Advanced server configuration and automation",
      commands: [
        { name: "!az welcome", desc: "Configure welcome messages", usage: "!az welcome #channel [message]" },
        { name: "!az autorole", desc: "Set auto-assign roles", usage: "!az autorole @role" },
        { name: "!az logs", desc: "Configure logging channel", usage: "!az logs #channel" },
        { name: "!az prefix", desc: "Change bot prefix", usage: "!az prefix [new prefix]" },
        { name: "!az antiraid", desc: "Enable anti-raid protection", usage: "!az antiraid [on/off]" },
        { name: "!az backup", desc: "Create server backup", usage: "!az backup create" },
      ]
    },
    {
      icon: Music,
      title: "Music",
      description: "High-quality music playback for voice channels",
      commands: [
        { name: "!az play", desc: "Play a song or playlist", usage: "!az play [song/URL]" },
        { name: "!az skip", desc: "Skip current song", usage: "!az skip" },
        { name: "!az queue", desc: "View the music queue", usage: "!az queue" },
        { name: "!az pause", desc: "Pause/resume playback", usage: "!az pause" },
        { name: "!az volume", desc: "Adjust volume", usage: "!az volume [0-100]" },
        { name: "!az lyrics", desc: "Get song lyrics", usage: "!az lyrics [song]" },
      ]
    },
    {
      icon: Database,
      title: "Economy",
      description: "Virtual economy system for your server",
      commands: [
        { name: "!az balance", desc: "Check your balance", usage: "!az balance [@user]" },
        { name: "!az daily", desc: "Claim daily reward", usage: "!az daily" },
        { name: "!az work", desc: "Work for coins", usage: "!az work" },
        { name: "!az shop", desc: "View the shop", usage: "!az shop" },
        { name: "!az buy", desc: "Purchase an item", usage: "!az buy [item]" },
        { name: "!az leaderboard", desc: "View richest users", usage: "!az leaderboard" },
      ]
    },
  ],
  quickStart: [
    { step: 1, title: "Invite Azure Supporter", description: "Click the invite link and select your server" },
    { step: 2, title: "Grant Permissions", description: "Ensure the bot has necessary permissions" },
    { step: 3, title: "Configure Settings", description: "Use !az setup to configure basic settings" },
    { step: 4, title: "Start Using", description: "Begin using commands with the !az prefix" },
  ],
  faq: [
    { q: "How do I change the bot prefix?", a: "Use the command !az prefix [new prefix] to change it. You need Administrator permissions." },
    { q: "The bot isn't responding to commands?", a: "Check if the bot has permission to read and send messages in the channel. Also verify the prefix is correct." },
    { q: "How do I set up welcome messages?", a: "Use !az welcome #channel Your welcome message here. Use {user} for mentions and {server} for server name." },
    { q: "Can I use Azure Supporter for free?", a: "Yes! Azure Supporter is completely free. Premium features are available for additional perks." },
    { q: "How do I report a bug?", a: "Join our support server and create a ticket, or use !az bugreport [description]." },
  ]
};

export const BLOG_POSTS = [
  { id: 1, title: "Building a Modern Portfolio with Next.js", excerpt: "Learn how to create a stunning portfolio website using Next.js and Tailwind CSS with smooth animations...", content: "Full article content here...", date: "Dec 28, 2024", readTime: "5 min", likes: 234, comments: 45, tags: ["Next.js", "React", "Tutorial"], cover: "/api/placeholder/800/400", author: { name: "Your Name", avatar: "/api/placeholder/40/40" } },
  { id: 2, title: "The Future of Discord Bots", excerpt: "Exploring the latest trends and technologies in Discord bot development and what's coming next...", content: "Full article content here...", date: "Dec 25, 2024", readTime: "8 min", likes: 567, comments: 89, tags: ["Discord", "Bots", "AI"], cover: "/api/placeholder/800/400", author: { name: "Your Name", avatar: "/api/placeholder/40/40" } },
  { id: 3, title: "My Journey as a Developer", excerpt: "Reflecting on my experiences and lessons learned over the years of coding and building projects...", content: "Full article content here...", date: "Dec 20, 2024", readTime: "12 min", likes: 891, comments: 156, tags: ["Personal", "Career"], cover: "/api/placeholder/800/400", author: { name: "Your Name", avatar: "/api/placeholder/40/40" } },
];

// ============================================
// TERMINAL TYPE FIX
// Replace the TERMINAL_COMMANDS definition with this:
// ============================================

// Define the line type
export type TerminalLineType = 'input' | 'output' | 'error' | 'info' | 'cyan';

// Update the interface
export const TERMINAL_COMMANDS: Record<string, { 
  description: string; 
  action: (args: string[], addLine: (line: string, type?: TerminalLineType) => void) => void 
}> = {
  help: {
    description: "Show available commands",
    action: (args, addLine) => {
      addLine("Available commands:", "info");
      addLine("  help          - Show this help message", "output");
      addLine("  clear         - Clear terminal", "output");
      addLine("  neofetch      - Display system info", "output");
      addLine("  cmatrix       - Matrix digital rain", "output");
      addLine("  cowsay [msg]  - Cow says your message", "output");
      addLine("  fortune       - Random fortune", "output");
      addLine("  sl            - Steam locomotive", "output");
      addLine("  whoami        - Current user", "output");
      addLine("  date          - Current date/time", "output");
      addLine("  uname -a      - System information", "output");
      addLine("  ls            - List files", "output");
      addLine("  pwd           - Print working directory", "output");
      addLine("  echo [text]   - Print text", "output");
    }
  },
  neofetch: {
    description: "Display system info",
    action: (args, addLine) => {
      addLine("", "output");
      addLine("       /\\         user@portfolio", "cyan");
      addLine("      /  \\        ---------------", "cyan");
      addLine("     /\\   \\       OS: Arch Linux x86_64", "output");
      addLine("    /      \\      Host: Portfolio Desktop", "output");
      addLine("   /   ,,   \\     Kernel: 6.7.0-arch1", "output");
      addLine("  /   |  |   \\    Uptime: 1 day, 8 hours", "output");
      addLine(" /_-''    ''-_\\   Shell: zsh 5.9", "output");
      addLine("                  Resolution: 1920x1080", "output");
      addLine("                  Theme: Catppuccin Mocha", "output");
      addLine("                  Terminal: kitty", "output");
      addLine("                  CPU: AMD Ryzen 9 5900X", "output");
      addLine("                  Memory: 8GB / 32GB", "output");
      addLine("", "output");
    }
  },
  cmatrix: {
    description: "Matrix digital rain",
    action: (args, addLine) => {
      addLine("Starting Matrix rain... (Ctrl+C or type 'clear' to stop)", "info");
    }
  },
  cowsay: {
    description: "Cow says message",
    action: (args, addLine) => {
      const message = args.join(" ") || "Moo!";
      const border = "_".repeat(message.length + 2);
      addLine(` ${border}`, "output");
      addLine(`< ${message} >`, "output");
      addLine(` ${"-".repeat(message.length + 2)}`, "output");
      addLine("        \\   ^__^", "output");
      addLine("         \\  (oo)\\_______", "output");
      addLine("            (__)\\       )\\/\\", "output");
      addLine("                ||----w |", "output");
      addLine("                ||     ||", "output");
    }
  },
  fortune: {
    description: "Random fortune",
    action: (args, addLine) => {
      const fortunes = [
        "Today is a good day to code!",
        "A bug in the code is worth two in the documentation.",
        "The best error message is the one that never shows up.",
        "First, solve the problem. Then, write the code.",
        "Code is like humor. When you have to explain it, it's bad.",
        "Programming is thinking, not typing.",
        "Simplicity is the soul of efficiency.",
      ];
      addLine(fortunes[Math.floor(Math.random() * fortunes.length)], "output");
    }
  },
  sl: {
    description: "Steam locomotive",
    action: (args, addLine) => {
      addLine("      ====        ________                ___________", "output");
      addLine("  _D _|  |_______/        \\__I_I_____===__|_________|", "output");
      addLine("   |(_)---  |   H\\________/ |   |        =|___ ___|", "output");
      addLine("   /     |  |   H  |  |     |   |         ||_| |_||", "output");
      addLine("  |      |  |   H  |__--------------------| [___] |", "output");
      addLine("  | ________|___H__/__|_____/[][]~\\_______|       |", "output");
      addLine("  |/ |   |-----------I_____I [][] []  D   |=======|__", "output");
      addLine("__/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__", "output");
      addLine(" |/-=|___|=    ||    ||    ||    |_____/~\\___/       ", "output");
      addLine("  \\_/      \\O=====O=====O=====O_/      \\_/           ", "output");
    }
  },
  whoami: {
    description: "Current user",
    action: (args, addLine) => {
      addLine("developer@portfolio", "output");
    }
  },
  date: {
    description: "Current date/time (options: -u UTC, -i ISO, -l locale)",
    action: (args, addLine) => {
      const now = new Date();
      
      if (args.includes("-u") || args.includes("--utc")) {
        // UTC format
        addLine(now.toUTCString(), "output");
      } else if (args.includes("-i") || args.includes("--iso")) {
        // ISO 8601 format
        addLine(now.toISOString(), "output");
      } else if (args.includes("-l") || args.includes("--locale")) {
        // Locale format
        addLine(now.toLocaleString(), "output");
      } else if (args.includes("-t") || args.includes("--time")) {
        // Time only
        addLine(now.toLocaleTimeString(), "output");
      } else if (args.includes("-d") || args.includes("--date-only")) {
        // Date only
        addLine(now.toLocaleDateString(), "output");
      } else if (args.includes("--help") || args.includes("-h")) {
        // Help message
        addLine("Usage: date [OPTION]", "output");
        addLine("Display current date and time in various formats", "output");
        addLine("", "output");
        addLine("Options:", "output");
        addLine("  -u, --utc        Display in UTC format", "output");
        addLine("  -i, --iso        Display in ISO 8601 format", "output");
        addLine("  -l, --locale     Display in locale format", "output");
        addLine("  -t, --time       Display time only", "output");
        addLine("  -d, --date-only  Display date only", "output");
        addLine("  -h, --help       Display this help message", "output");
      } else {
        // Default format
        addLine(now.toString(), "output");
      }
    }
  },
  uname: {
    description: "System info",
    action: (args, addLine) => {
      if (args.includes("-a")) {
        addLine("Linux portfolio 6.7.0-arch1 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux", "output");
      } else {
        addLine("Linux", "output");
      }
    }
  },
  clear: {
    description: "Clear terminal",
    action: () => {} // Handled specially in handleCommand
  },
  ls: {
    description: "List files",
    action: (args, addLine) => {
      addLine("Desktop    Documents  Downloads  Music  Pictures  Videos", "cyan");
      addLine("projects   .config    .local     .ssh   README.md", "output");
    }
  },
  pwd: {
    description: "Print working directory",
    action: (args, addLine) => {
      addLine("/home/developer", "output");
    }
  },
  echo: {
    description: "Print message",
    action: (args, addLine) => {
      addLine(args.join(" "), "output");
    }
  },
};
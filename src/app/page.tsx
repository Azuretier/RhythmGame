import { ExternalLink, Mail, Github, Youtube, Instagram, MessageSquare, Sparkles, Globe, Palette } from "lucide-react";

// --- DATA CONFIGURATION ---
// You can move this to a separate file later, but it's here for easy setup!
const USER_DATA = {
  name: "Daichi Azu",
  title: "Artist / Performer / Explorer",
  bio: "Turning wild ideas into interactive digital reality. Specializing in high-energy web experiences and colorful brand identities.",
  email: "hello@yourname.com",
  socials: [
    { name: "GitHub", href: "https://github.com/Azuretier", type: "link" },
    { name: "YouTube", href: "https://www.youtube.com/@azuchan_a", type: "link" },
    { name: "Instagram", href: "https://www.instagram.com/rrrrrrrrrrvq/", type: "link" },
    { name: "Discord: @daichi_a", href: "#", type: "static" }, // Non-interactable
  ],
  projects: [
    {
      title: "Neon Dreams Interface",
      description: "A cyberpunk-inspired dashboard with real-time data visualization.",
      tags: ["Next.js", "Three.js"],
      link: "#",
      image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop",
      color: "from-blue-400 to-indigo-600"
    },
    {
      title: "Abstract Geometry",
      description: "A collection of generated art pieces exploring color theory.",
      tags: ["Creative Coding", "Canvas"],
      link: "#",
      image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop",
      color: "from-pink-400 to-rose-600"
    },
    {
      title: "Cloud Hub",
      description: "A community platform for digital creators to share assets.",
      tags: ["React", "Firebase"],
      link: "#",
      image: "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?q=80&w=1000&auto=format&fit=crop",
      color: "from-amber-400 to-orange-600"
    }
  ]
};

export default function Home() {
  return (
    // The main container with the moving gradient background defined in your CSS
    <main className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-flow p-4 md:p-12 lg:p-20 selection:bg-yellow-300">
      
      {/* --- GLASS CARD CONTAINER --- */}
      <div className="max-w-5xl mx-auto bg-white/20 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/30 overflow-hidden transition-all duration-700 hover:shadow-indigo-500/20">
        
        <div className="p-8 md:p-16">
          
          {/* --- HERO SECTION --- */}
          <header className="flex flex-col items-center text-center space-y-8 mb-20">
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-yellow-400 rounded-full blur-xl opacity-60 animate-pulse"></div>
              <div className="relative h-28 w-28 rounded-full bg-white p-1 shadow-2xl">
                <div className="h-full w-full rounded-full bg-gradient-to-tr from-zinc-100 to-zinc-300 flex items-center justify-center text-4xl shadow-inner">
                  ✨
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 text-white text-xs font-black uppercase tracking-[0.2em] animate-shimmer">
                <Sparkles size={14} /> Open for Freelance 2025
              </div>
              <h1 className="text-5xl md:text-7xl font-black text-white drop-shadow-lg tracking-tighter">
                {USER_DATA.name}
              </h1>
              <p className="text-xl md:text-2xl text-white/80 font-medium max-w-2xl mx-auto leading-relaxed">
                {USER_DATA.bio}
              </p>
            </div>
          </header>

          {/* --- SOCIAL HUB (The Links) --- */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-24">
            {USER_DATA.socials.map((social) => {
              const isLink = social.type === "link";
              
              // Helper to get brand-specific icons and colors
              const getBrandStyles = (name: string) => {
                if (name.includes("GitHub")) return { icon: <Github />, bg: "hover:bg-zinc-900", border: "border-white/40" };
                if (name.includes("YouTube")) return { icon: <Youtube />, bg: "hover:bg-red-600", border: "border-red-200/50" };
                if (name.includes("Instagram")) return { icon: <Instagram />, bg: "hover:bg-gradient-to-tr hover:from-yellow-400 hover:via-pink-500 hover:to-purple-600", border: "border-pink-200/50" };
                if (name.includes("Discord")) return { icon: <MessageSquare />, bg: "bg-white/10 opacity-60 cursor-default", border: "border-white/10" };
                return { icon: <Globe />, bg: "hover:bg-indigo-600", border: "border-white/40" };
              };

              const brand = getBrandStyles(social.name);

              if (isLink) {
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    className={`flex items-center justify-center gap-3 p-5 rounded-2xl border ${brand.border} bg-white/10 backdrop-blur-md text-white font-bold transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${brand.bg}`}
                  >
                    {brand.icon}
                    {social.name}
                  </a>
                );
              } else {
                return (
                  <div
                    key={social.name}
                    className={`flex items-center justify-center gap-3 p-5 rounded-2xl border ${brand.border} ${brand.bg} text-white/70 font-bold`}
                  >
                    {brand.icon}
                    {social.name}
                  </div>
                );
              }
            })}
          </section>

          {/* --- PORTFOLIO GRID --- */}
          <section>
            <div className="flex items-center gap-6 mb-12">
              <h2 className="text-4xl font-black text-white">Portfolio</h2>
              <div className="h-1 flex-1 bg-gradient-to-r from-white/40 to-transparent rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {USER_DATA.projects.map((project, idx) => (
                <div 
                  key={project.title} 
                  className="group relative bg-white/10 backdrop-blur-md rounded-[2rem] p-4 border border-white/20 hover:bg-white/20 transition-all duration-500 animate-float"
                  style={{ animationDelay: `${idx * 0.2}s` }}
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl mb-6 shadow-inner">
                    <img 
                      src={project.image} 
                      alt={project.title}
                      className="object-cover w-full h-full transform group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${project.color} opacity-0 group-hover:opacity-40 transition-opacity duration-500`}></div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      {project.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-black uppercase tracking-tighter bg-white/20 text-white px-2 py-1 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-2xl font-black text-white tracking-tight">{project.title}</h3>
                    <p className="text-white/70 text-sm leading-relaxed mb-6">{project.description}</p>
                    
                    <a 
                      href={project.link} 
                      className="flex items-center justify-center w-full py-3 bg-white text-zinc-900 rounded-xl font-black text-sm transition-all hover:bg-yellow-300 hover:scale-95"
                    >
                      View Live <ExternalLink size={14} className="ml-2" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* --- VIBRANT CALL TO ACTION --- */}
          <footer className="mt-32">
            <div className="relative group p-1 rounded-[3rem] bg-gradient-to-r from-yellow-400 via-pink-500 to-purple-600 animate-gradient-flow">
              <div className="bg-zinc-900 rounded-[2.9rem] p-12 text-center space-y-8">
                <h2 className="text-4xl md:text-5xl font-black text-white">Need a creative partner?</h2>
                <p className="text-zinc-400 text-lg max-w-lg mx-auto font-medium">
                  I'm currently looking for new projects and interesting people to collaborate with.
                </p>
                <a
                  href={`mailto:${USER_DATA.email}`}
                  className="inline-flex items-center gap-3 px-10 py-5 bg-white text-zinc-900 rounded-full font-black text-xl transition-all hover:scale-110 hover:rotate-2 shadow-2xl hover:bg-yellow-300"
                >
                  <Mail /> Hire Me Now
                </a>
              </div>
            </div>
            
            <p className="mt-12 text-center text-white/30 font-bold uppercase tracking-[0.3em] text-xs">
              &copy; {new Date().getFullYear()} {USER_DATA.name} &bull; Built for 2025
            </p>
          </footer>

        </div>
      </div>
    </main>
  );
}
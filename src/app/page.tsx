import { Github, Youtube, Instagram, MessageSquare, ExternalLink, Mail, MapPin, Sparkles, Heart } from "lucide-react";

const USER_DATA = {
  name: "Your Name",
  handle: "@username",
  bio: "Creative developer making cute and functional things. Lover of minimalist design and open-source.",
  location: "Earth / Internet",
  email: "hello@yourname.com",
  socials: [
    { name: "GitHub", href: "https://github.com/yourusername", color: "text-zinc-800" },
    { name: "YouTube", href: "https://youtube.com/@yourchannel", color: "text-red-500" },
    { name: "Instagram", href: "https://instagram.com/yourhandle", color: "text-pink-500" },
  ],
  projects: [
    {
      title: "Project Sakura",
      date: "Dec 2025",
      description: "A minimalist dashboard inspired by seasonal colors and soft aesthetics.",
      tags: ["Next.js", "Tailwind"],
      link: "#",
      image: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Dreamscape UI",
      date: "Nov 2025",
      description: "Experimental UI kit featuring glassmorphism and pastel gradients.",
      tags: ["Design", "React"],
      link: "#",
      image: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1000&auto=format&fit=crop"
    },
    {
      title: "Moe Components",
      date: "Oct 2025",
      description: "A library of cute React components for modern web applications.",
      tags: ["TypeScript", "CSS"],
      link: "#",
      image: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1000&auto=format&fit=crop"
    }
  ]
};

export default function Home() {
  return (
    // Soft Cream/Pastel Background
    <main className="min-h-screen bg-[#fdfcf0] text-zinc-700 selection:bg-orange-100 p-4 md:p-8 lg:p-12 font-sans">
      
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* --- LEFT SIDEBAR (The Hub) --- */}
        <aside className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          
          {/* Profile Card */}
          <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-50/50">
            <div className="relative w-24 h-24 mb-6 group">
              <div className="absolute inset-0 bg-orange-200 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform"></div>
              <div className="relative w-full h-full bg-white rounded-3xl border-2 border-orange-100 flex items-center justify-center text-3xl overflow-hidden shadow-inner">
                 🧸 {/* Replace with <img /> for your headshot */}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-zinc-800">{USER_DATA.name}</h1>
            <p className="text-sm text-orange-400 font-bold mb-4">{USER_DATA.handle}</p>
            <p className="text-zinc-500 leading-relaxed mb-6 text-sm">{USER_DATA.bio}</p>
            
            <div className="space-y-3 pt-4 border-t border-zinc-50">
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <MapPin size={16} /> {USER_DATA.location}
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400">
                <Sparkles size={16} className="text-orange-300" /> Available for Hire
              </div>
            </div>
          </div>

          {/* Social Links Hub */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-orange-50/50 space-y-2">
            <h3 className="px-2 text-xs font-black uppercase tracking-widest text-zinc-300 mb-4">Connect</h3>
            {USER_DATA.socials.map((social) => (
              <a 
                key={social.name}
                href={social.href}
                target="_blank"
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 transition-colors group"
              >
                <div className="flex items-center gap-3 font-bold text-sm">
                   {social.name === "GitHub" && <Github size={18} />}
                   {social.name === "YouTube" && <Youtube size={18} />}
                   {social.name === "Instagram" && <Instagram size={18} />}
                   {social.name}
                </div>
                <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-orange-200 transition-opacity" />
              </a>
            ))}

            {/* STATIC DISCORD TAG */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 text-zinc-400 cursor-default grayscale hover:grayscale-0 transition-all">
              <MessageSquare size={18} />
              <span className="font-bold text-sm">Discord: @yourusername</span>
            </div>
          </div>

          {/* Contact Button */}
          <a 
            href={`mailto:${USER_DATA.email}`}
            className="flex items-center justify-center gap-2 w-full p-4 bg-orange-400 text-white rounded-[1.5rem] font-bold shadow-lg shadow-orange-200 hover:bg-orange-500 hover:-translate-y-1 transition-all active:scale-95"
          >
            <Mail size={18} /> Say Hello!
          </a>
        </aside>

        {/* --- MAIN CONTENT (Portfolio Feed) --- */}
        <section className="lg:col-span-8 space-y-8">
          
          <div className="flex items-center justify-between px-4">
            <h2 className="text-xl font-black text-zinc-800 uppercase tracking-tighter">Selected Works</h2>
            <div className="h-1 w-12 bg-orange-200 rounded-full"></div>
          </div>

          {USER_DATA.projects.map((project) => (
            <div 
              key={project.title}
              className="bg-white rounded-[2.5rem] overflow-hidden shadow-[0_8px_40px_rgb(0,0,0,0.03)] border border-orange-50/30 group hover:shadow-orange-200/20 transition-all duration-500"
            >
              <div className="grid grid-cols-1 md:grid-cols-5 items-stretch">
                {/* Project Image */}
                <div className="md:col-span-2 relative overflow-hidden h-48 md:h-auto">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                </div>
                
                {/* Project Info */}
                <div className="md:col-span-3 p-8 flex flex-col justify-center">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold text-orange-300 uppercase tracking-widest">{project.date}</span>
                    <div className="flex gap-2">
                      {project.tags.map(tag => (
                        <span key={tag} className="text-[10px] bg-zinc-50 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-100">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-zinc-800 mb-2 group-hover:text-orange-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-zinc-500 text-sm leading-relaxed mb-6">
                    {project.description}
                  </p>
                  
                  <a 
                    href={project.link}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-black text-zinc-900 group-hover:gap-4 transition-all"
                  >
                    View Project <ExternalLink size={14} className="text-orange-300" />
                  </a>
                </div>
              </div>
            </div>
          ))}

          {/* Footer inside the feed area */}
          <footer className="py-12 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full text-xs font-bold text-zinc-300 border border-zinc-50">
              Made with <Heart size={12} className="text-orange-200 fill-orange-200" /> and Vercel
            </div>
          </footer>
        </section>

      </div>
    </main>
  );
}
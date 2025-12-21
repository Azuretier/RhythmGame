import { USER_DATA } from "@/components/main/data";
import { ExternalLink, Mail, Github, Youtube, Instagram, MessageSquare } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-zinc-900 selection:bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-20">
        
        {/* --- HUB / HERO SECTION --- */}
        <header className="space-y-6">
          <div className="h-16 w-16 rounded-full bg-zinc-900 flex items-center justify-center text-white text-2xl font-bold">
            {USER_DATA.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">{USER_DATA.name}</h1>
            <p className="text-xl text-zinc-500 mt-2">{USER_DATA.title}</p>
          </div>
          <p className="text-lg leading-relaxed text-zinc-600 max-w-xl">
            {USER_DATA.bio}
          </p>
          
          {/* Social Hub Links */}
          <div className="flex flex-wrap gap-3">
            {USER_DATA.socials.map((social: typeof USER_DATA.socials[number]) => {
              const isLink = social.type === "link";
              const baseStyles = "flex items-center gap-2 px-4 py-2 border rounded-full font-medium text-sm transition-all";
              const activeStyles = "bg-white border-zinc-200 hover:border-zinc-900 hover:shadow-sm";
              const staticStyles = "bg-zinc-50 border-zinc-100 text-zinc-400 cursor-default";

              // Logic to pick icon
              const Icon = () => {
                if (social.name.includes("GitHub")) return <Github size={18} />;
                if (social.name.includes("YouTube")) return <Youtube size={18} />;
                if (social.name.includes("Instagram")) return <Instagram size={18} />;
                if (social.name.includes("Discord")) return <MessageSquare size={18} />;
                return null;
              };

              if (isLink) {
                return (
                  <a key={social.name} href={social.href} target="_blank" className={`${baseStyles} ${activeStyles}`}>
                    <Icon />
                    {social.name}
                  </a>
                );
              } else {
                return (
                  <div key={social.name} className={`${baseStyles} ${staticStyles}`}>
                    <Icon />
                    {social.name}
                  </div>
                );
              }
            })}
          </div>
        </header>

        {/* --- PORTFOLIO SECTION --- */}
        <section className="mt-24">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Portfolio</h2>
            <div className="h-px flex-1 bg-zinc-100 ml-4"></div>
          </div>
          
          <div className="grid grid-cols-1 gap-12">
            {USER_DATA.projects.map((project) => (
              <div key={project.title} className="group cursor-pointer">
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-zinc-100 mb-6">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="object-cover w-full h-full group-hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      {project.tags.map(tag => (
                        <span key={tag} className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 px-2 py-0.5 border border-zinc-100 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-2xl font-bold group-hover:text-blue-600 transition-colors">{project.title}</h3>
                    <p className="text-zinc-500 max-w-md">{project.description}</p>
                  </div>
                  <a 
                    href={project.link} 
                    target="_blank"
                    className="mt-6 p-3 rounded-full bg-zinc-50 text-zinc-900 hover:bg-zinc-900 hover:text-white transition-all"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- CONTACT SECTION --- */}
        <section className="mt-32 p-8 rounded-3xl bg-zinc-900 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Have a project in mind?</h2>
          <p className="text-zinc-400 mb-8">Currently accepting new freelance work for 2025.</p>
          <a
            href={`mailto:${USER_DATA.email}`}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-zinc-900 rounded-full font-bold hover:bg-blue-50 transition-colors"
          >
            <Mail size={20} />
            Let's Talk
          </a>
        </section>

        <footer className="mt-20 py-8 text-center text-zinc-400 text-xs tracking-widest uppercase">
          &copy; {new Date().getFullYear()} — Built by {USER_DATA.name}
        </footer>
      </div>
    </main>
  );
}
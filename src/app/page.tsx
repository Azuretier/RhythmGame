import { USER_DATA } from "@/components/my-blog/data";
import { ExternalLink, Mail } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900 selection:bg-blue-100">
      <div className="max-w-3xl mx-auto px-6 py-20">
        
        {/* --- HUB / HERO SECTION --- */}
        <header className="space-y-6">
          <div className="h-20 w-20 rounded-2xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
            {USER_DATA.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">{USER_DATA.name}</h1>
            <p className="text-xl text-zinc-600 mt-2">{USER_DATA.title}</p>
          </div>
          <p className="text-lg leading-relaxed text-zinc-600 max-w-xl">
            {USER_DATA.bio}
          </p>
          
          {/* Social Hub Links */}
          <div className="flex flex-wrap gap-3">
            {USER_DATA.socials.map((social: typeof USER_DATA.socials[number]) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 rounded-full hover:border-blue-500 transition-colors shadow-sm"
              >
                <social.icon size={18} />
                <span className="font-medium">{social.name}</span>
              </a>
            ))}
            <a
              href={`mailto:${USER_DATA.email}`}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-full hover:bg-zinc-800 transition-colors shadow-sm"
            >
              <Mail size={18} />
              <span className="font-medium">Email Me</span>
            </a>
          </div>
        </header>

        {/* --- PORTFOLIO SECTION --- */}
        <section className="mt-24">
          <h2 className="text-2xl font-bold mb-8">Selected Work</h2>
          <div className="grid grid-cols-1 gap-12">
            {USER_DATA.projects.map((project) => (
              <div key={project.title} className="group relative">
                <div className="aspect-video w-full overflow-hidden rounded-2xl bg-zinc-100 mb-4">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold">{project.title}</h3>
                    <p className="text-zinc-600 mt-1">{project.description}</p>
                    <div className="flex gap-2 mt-3">
                      {project.tags.map(tag => (
                        <span key={tag} className="text-xs font-mono bg-zinc-200 px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a 
                    href={project.link} 
                    target="_blank"
                    className="p-2 rounded-full hover:bg-zinc-100 transition-colors"
                  >
                    <ExternalLink size={20} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="mt-32 pt-8 border-t border-zinc-200 text-center text-zinc-500 text-sm">
          © {new Date().getFullYear()} {USER_DATA.name}. Built with Next.js & Vercel.
        </footer>
      </div>
    </main>
  );
}
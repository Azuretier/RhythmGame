import Image from 'next/image';
import { Github, Twitter, Mail } from 'lucide-react';

export default function BlogProfile() {
  return (
    <section className="flex flex-col items-center text-center py-12 mb-10">
      <div className="relative mb-6">
        <div className="w-32 h-32 rounded-full border-4 border-primary p-1">
          <Image
            src="/avatar.jpg"
            alt="Profile"
            width={128}
            height={128}
            className="w-full h-full rounded-full object-cover"
          />
        </div>
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight mb-2">Caramel</h1>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm mb-6 leading-relaxed">
        Personal blog about coding, life, and sweet things.
      </p>
      <div className="flex gap-4">
        <a href="#" className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full hover:text-primary transition-all">
          <Github className="w-5 h-5" />
        </a>
        <a href="#" className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full hover:text-primary transition-all">
          <Twitter className="w-5 h-5" />
        </a>
        <a href="#" className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-full hover:text-primary transition-all">
          <Mail className="w-5 h-5" />
        </a>
      </div>
    </section>
  );
}

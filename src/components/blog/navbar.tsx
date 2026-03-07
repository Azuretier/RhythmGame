import Link from 'next/link';
import { Search, Moon } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-tighter hover:text-primary transition-colors">
          A Sweet caramel。
        </Link>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <Link href="/posts" className="hover:text-primary">Posts</Link>
            <Link href="/tags" className="hover:text-primary">Tags</Link>
          </div>
          <div className="flex items-center gap-4 border-l border-neutral-200 dark:border-neutral-800 ml-2 pl-6">
            <Search className="w-5 h-5 cursor-pointer hover:text-primary" />
            <button className="hover:text-primary">
              <Moon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
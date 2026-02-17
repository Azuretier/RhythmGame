import Navbar from '@/components/blog/navbar';
import Profile from '@/components/blog/profile';
import PostCard from '@/components/blog/post-card';

export default function Home() {
  const posts = [
    {
      title: "Building a Next.js blog with Tailwind",
      date: "Dec 25, 2025",
      description: "A deep dive into reproducing high-quality Hugo themes using modern React frameworks and Tailwind CSS.",
      tag: "NextJS"
    },
    {
      title: "Why I love the Blowfish Theme",
      date: "Dec 20, 2025",
      description: "Exploring the design choices that make the Blowfish theme for Hugo stand out in the developer community.",
      tag: "Design"
    }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 pb-20">
        <Profile />
        
        <div className="flex justify-between items-end mb-6 border-b border-neutral-200 dark:border-neutral-800 pb-4">
          <h2 className="text-xl font-bold tracking-tight">Recent Posts</h2>
          <span className="text-primary text-sm font-semibold cursor-pointer hover:underline">View All →</span>
        </div>

        <div className="flex flex-col">
          {posts.map((post, idx) => (
            <PostCard key={idx} {...post} />
          ))}
        </div>
      </main>
      
      {/* Simple Footer Component */}
      <footer className="text-center py-10 border-t border-neutral-100 dark:border-neutral-900 text-sm text-neutral-500">
        © 2025 Caramel Blog. Built with Next.js.
      </footer>
    </div>
  );
}
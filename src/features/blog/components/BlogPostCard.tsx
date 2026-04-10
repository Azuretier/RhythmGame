interface BlogPostCardProps {
  title: string;
  date: string;
  description: string;
  tag: string;
}

export default function BlogPostCard({ title, date, description, tag }: BlogPostCardProps) {
  return (
    <article className="group cursor-pointer py-8 border-b border-neutral-100 dark:border-neutral-900 last:border-0">
      <div className="flex flex-col gap-2">
        <time className="text-xs font-mono text-neutral-500 uppercase tracking-widest">{date}</time>
        <h3 className="text-2xl font-bold group-hover:text-primary transition-colors tracking-tight">
          {title}
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 line-clamp-2 leading-relaxed">
          {description}
        </p>
        <div className="mt-2">
          <span className="text-[10px] font-bold px-2 py-1 rounded bg-neutral-100 dark:bg-neutral-900 text-neutral-500 uppercase tracking-tighter">
            #{tag}
          </span>
        </div>
      </div>
    </article>
  );
}

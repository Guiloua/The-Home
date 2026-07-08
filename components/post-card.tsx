import Link from 'next/link';
import type { PostSummary } from '@/types/content';
import { badgeStyles } from '@/components/ui';

export function PostCard({
  post,
  compact = false,
}: {
  post: PostSummary;
  compact?: boolean;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
      <Link href={post.url} className="block">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-medium leading-7 text-ink dark:text-zinc-100 sm:text-xl">
            {post.title}
          </h2>
          <time className="shrink-0 text-xs text-muted">{post.date}</time>
        </div>
        {post.excerpt && (
          <p
            className={
              compact
                ? 'mt-3 line-clamp-2 text-sm leading-6 text-muted'
                : 'mt-3 text-sm leading-7 text-muted'
            }
          >
            {post.excerpt}
          </p>
        )}
      </Link>
      {post.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <span key={tag} className={badgeStyles()}>
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

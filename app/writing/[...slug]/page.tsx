import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteNav } from '@/components/site-nav';
import { badgeStyles } from '@/components/ui';
import { compilePostMdx, getAllPosts, getPostBySlug } from '@/lib/mdx';

type PostPageProps = {
  params: Promise<{ slug: string[] }>;
};

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug.split('/') }));
}

export async function generateMetadata({
  params,
}: PostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const posts = getAllPosts();
  const post = getPostBySlug(slug);

  if (!post || !post.publish) notFound();

  const content = await compilePostMdx(post.content);

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <article>
          <header className="mb-12 text-center">
            <time className="text-sm text-muted">{post.date}</time>
            <h1 className="mt-3 text-4xl font-light leading-tight text-ink dark:text-zinc-100">
              {post.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted">
              {post.excerpt}
            </p>
            {post.tags.length > 0 && (
              <div className="mt-5 flex justify-center gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className={badgeStyles({ tone: 'accent' })}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="article-content prose prose-zinc max-w-none dark:prose-invert">
            {content}
          </div>
        </article>

        <footer className="mt-14 border-t border-line pt-8 dark:border-zinc-800">
          <Link className="text-sm text-muted transition hover:text-ink" href="/writing">
            返回随笔列表
          </Link>
        </footer>
      </main>
    </>
  );
}

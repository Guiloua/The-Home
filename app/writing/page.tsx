import type { Metadata } from 'next';
import { SiteNav } from '@/components/site-nav';
import { PostCard } from '@/components/post-card';
import { getAllPosts } from '@/lib/mdx';

export const metadata: Metadata = {
  title: '随笔',
  description: 'NekoChan 的随笔归档。',
};

export default function WritingPage() {
  const posts = getAllPosts();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-10 border-b border-line pb-8 dark:border-zinc-800">
          <p className="text-sm text-muted">Writing</p>
          <h1 className="mt-2 text-4xl font-light text-ink dark:text-zinc-100">
            随笔
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
            文章内容来自 posts 目录，由 gray-matter 读取 Frontmatter，再经 MDX 渲染。
          </p>
        </header>

        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </main>
    </>
  );
}

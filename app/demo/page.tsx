import type { Metadata } from 'next';
import { DemoCard } from '@/components/demo-card';
import { SiteNav } from '@/components/site-nav';
import { getDemoItems } from '@/lib/demos';
import { getAllPosts } from '@/lib/mdx';

export const metadata: Metadata = {
  title: 'Demo',
  description: 'NekoChan demo archive.',
};

export default function DemoPage() {
  const posts = getAllPosts();
  const demos = getDemoItems();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-light text-ink dark:text-zinc-100">Demo</h1>
          <p className="mt-4 text-sm leading-7 text-muted">The magical stuff</p>
        </header>

        <div className="space-y-5">
          {demos.map((item) => (
            <DemoCard key={item.name} item={item} />
          ))}
        </div>
      </main>
    </>
  );
}

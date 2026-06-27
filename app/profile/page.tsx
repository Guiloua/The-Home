import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteNav } from '@/components/site-nav';
import { badgeStyles } from '@/components/ui';
import { getAllPosts } from '@/lib/mdx';
import { withBasePath } from '@/lib/site';

export const metadata: Metadata = {
  title: '简介',
  description: 'NekoChan profile.',
};

const skills = ['Fighting', 'Saving', 'Feeling'];

export default function ProfilePage() {
  const posts = getAllPosts();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6">
        <section className="text-center">
          <Image
            src={withBasePath('/photo/toma.jpg')}
            alt="Neko"
            width={128}
            height={128}
            className="mx-auto size-32 rounded-full border-4 border-white object-cover shadow-soft dark:border-zinc-900"
          />
          <h1 className="mt-6 text-4xl font-light text-ink dark:text-zinc-100">
            Neko
          </h1>
          <p className="mt-2 text-muted">MaHoShaojyu</p>
        </section>

        <section className="mt-10 rounded-lg border border-line bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-xl font-medium text-ink dark:text-zinc-100">
            Who am I?
          </h2>
          <div className="mt-5 space-y-4 leading-8 text-zinc-700 dark:text-zinc-300">
            <p>saving world&apos;s neko chan</p>
            <p>This is neko chan no secrete world!</p>
          </div>

          <h3 className="mt-8 text-lg font-medium text-ink dark:text-zinc-100">
            Skill
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <span key={skill} className={badgeStyles()}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

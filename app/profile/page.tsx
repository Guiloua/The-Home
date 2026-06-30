import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteNav } from '@/components/site-nav';
import { badgeStyles } from '@/components/ui';
import { getAllPosts } from '@/lib/mdx';
import { getProfile } from '@/lib/profile';
import { withBasePath } from '@/lib/site';

export const metadata: Metadata = {
  title: '简介',
  description: 'NekoChan profile.',
};

export default function ProfilePage() {
  const posts = getAllPosts();
  const profile = getProfile();

  return (
    <>
      <SiteNav posts={posts} />
      <main className="relative min-h-screen overflow-hidden px-4 pb-16 pt-28 sm:px-6">
        <Image
          src={withBasePath(profile.background)}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] dark:bg-zinc-950/78" />

        <section className="relative mx-auto max-w-2xl text-center">
          <Image
            src={withBasePath(profile.avatar)}
            alt={profile.name}
            width={128}
            height={128}
            className="mx-auto size-32 rounded-full border-4 border-white object-cover shadow-soft dark:border-zinc-900"
          />
          <h1 className="mt-6 text-4xl font-light text-ink dark:text-zinc-100">
            {profile.name}
          </h1>
          <p className="mt-2 text-muted">{profile.title}</p>
        </section>

        <section className="relative mx-auto mt-10 max-w-2xl rounded-lg border border-line bg-white/92 p-8 shadow-soft dark:border-zinc-800 dark:bg-zinc-950/90">
          <h2 className="text-xl font-medium text-ink dark:text-zinc-100">
            Who am I?
          </h2>
          <div className="mt-5 space-y-4 leading-8 text-zinc-700 dark:text-zinc-300">
            {profile.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <h3 className="mt-8 text-lg font-medium text-ink dark:text-zinc-100">
            Skill
          </h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile.skills.map((skill) => (
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

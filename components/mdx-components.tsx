import type { AnchorHTMLAttributes, HTMLAttributes } from 'react';

const headingClass = 'scroll-mt-24 font-medium text-ink dark:text-zinc-100';

export const mdxComponents = {
  h1: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className={`${headingClass} text-3xl`} {...props} />
  ),
  h2: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className={`${headingClass} mt-10 text-2xl`} {...props} />
  ),
  h3: (props: HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={`${headingClass} mt-8 text-xl`} {...props} />
  ),
  p: (props: HTMLAttributes<HTMLParagraphElement>) => (
    <p className="leading-8 text-zinc-700 dark:text-zinc-300" {...props} />
  ),
  a: (props: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-zinc-900 dark:text-zinc-100 dark:decoration-zinc-700"
      {...props}
    />
  ),
};

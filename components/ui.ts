import { tv } from 'tailwind-variants';

export const buttonStyles = tv({
  base: 'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400',
  variants: {
    tone: {
      primary: 'bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
      secondary:
        'border border-line bg-white text-ink hover:bg-gray-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900',
      quiet: 'text-muted hover:text-ink dark:text-zinc-400 dark:hover:text-zinc-100',
    },
  },
  defaultVariants: {
    tone: 'secondary',
  },
});

export const badgeStyles = tv({
  base: 'inline-flex items-center rounded-full border px-2.5 py-1 text-xs',
  variants: {
    tone: {
      neutral:
        'border-line bg-white text-muted dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400',
      accent:
        'border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200',
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

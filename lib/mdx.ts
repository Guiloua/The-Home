import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import type { Post, PostMeta, PostSummary } from '@/types/content';

const postsDirectory = path.join(process.cwd(), 'notes');

const toStringValue = (value: unknown) => String(value ?? '').trim();

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(toStringValue).filter(Boolean);
  return toStringValue(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const normalizeDate = (value: unknown): string => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return toStringValue(value);
};

const normalizeBoolean = (value: unknown): boolean =>
  value === true || toStringValue(value).toLowerCase() === 'true';

const toPostMeta = (data: Record<string, unknown>, slug: string): PostMeta => ({
  title: toStringValue(data.title) || slug,
  date: normalizeDate(data.date),
  excerpt: toStringValue(data.excerpt),
  tags: normalizeTags(data.tags),
  publish: normalizeBoolean(data.publish),
});

export const getPostSlugs = (): string[] => {
  if (!fs.existsSync(postsDirectory)) return [];
  return fs
    .readdirSync(postsDirectory)
    .filter((file) => file.endsWith('.md') || file.endsWith('.mdx'))
    .map((file) => file.replace(/\.mdx?$/, ''));
};

export const getPostBySlug = (slug: string): Post | undefined => {
  const safeSlug = path.basename(slug);
  const filePath = ['md', 'mdx']
    .map((extension) => path.join(postsDirectory, `${safeSlug}.${extension}`))
    .find((candidate) => fs.existsSync(candidate));

  if (!filePath) return undefined;

  const source = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(source);
  const meta = toPostMeta(data, safeSlug);

  return {
    ...meta,
    slug: safeSlug,
    url: `/writing/${safeSlug}`,
    content,
  };
};

export const getAllPosts = (
  options: { includeDrafts?: boolean } = {},
): PostSummary[] =>
  getPostSlugs()
    .map(getPostBySlug)
    .filter((post): post is Post => Boolean(post))
    .filter((post) => options.includeDrafts || post.publish)
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
    )
    .map(({ content: _content, ...summary }) => summary);

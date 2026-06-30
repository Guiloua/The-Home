import fs from 'node:fs';
import path from 'node:path';
import { compileMDX } from 'next-mdx-remote/rsc';
import matter from 'gray-matter';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { mdxComponents } from '@/components/mdx-components';
import type { Post, PostMeta, PostSummary, PostTreeNode } from '@/types/content';

const postsDirectory = path.join(process.cwd(), 'posts');
const postExtensions = new Set(['.md', '.mdx']);

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
  title: toStringValue(data.title) || path.basename(slug),
  date: normalizeDate(data.date),
  excerpt: toStringValue(data.excerpt),
  tags: normalizeTags(data.tags),
  publish: normalizeBoolean(data.publish),
});

const normalizeSlug = (slug: string | string[]): string =>
  (Array.isArray(slug) ? slug.join('/') : slug)
    .split('/')
    .filter(Boolean)
    .join('/');

const slugFromFilePath = (filePath: string): string => {
  const relativePath = path.relative(postsDirectory, filePath);
  const parsed = path.parse(relativePath);
  return path
    .join(parsed.dir, parsed.name)
    .split(path.sep)
    .filter(Boolean)
    .join('/');
};

const getPostFiles = (directory = postsDirectory): string[] => {
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return getPostFiles(entryPath);
      if (entry.isFile() && postExtensions.has(path.extname(entry.name))) return [entryPath];
      return [];
    });
};

const findPostFile = (slug: string): string | undefined => {
  const safeSlug = normalizeSlug(slug);
  const candidateBase = path.normalize(path.join(postsDirectory, safeSlug));
  if (!candidateBase.startsWith(postsDirectory + path.sep)) return undefined;

  return ['.mdx', '.md']
    .map((extension) => `${candidateBase}${extension}`)
    .find((candidate) => fs.existsSync(candidate));
};

export const getPostSlugs = (): string[] =>
  getPostFiles()
    .map(slugFromFilePath)
    .sort((a, b) => a.localeCompare(b));

export const getPostBySlug = (slug: string | string[]): Post | undefined => {
  const safeSlug = normalizeSlug(slug);
  const filePath = findPostFile(safeSlug);

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

export const getPostTree = (
  options: { includeDrafts?: boolean } = {},
): PostTreeNode[] => {
  const root: PostTreeNode[] = [];
  const posts = getAllPosts(options);

  posts.forEach((post) => {
    const parts = post.slug.split('/');
    let level = root;
    let currentPath = '';

    parts.forEach((part, index) => {
      currentPath = [currentPath, part].filter(Boolean).join('/');
      let node = level.find((item) => item.name === part);

      if (!node) {
        node = { name: part, path: currentPath, children: [] };
        level.push(node);
      }

      if (index === parts.length - 1) node.post = post;
      level = node.children;
    });
  });

  const sortTree = (nodes: PostTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.post && b.post) return b.post.date.localeCompare(a.post.date);
      if (a.post) return -1;
      if (b.post) return 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((node) => sortTree(node.children));
    return nodes;
  };

  return sortTree(root);
};

export const compilePostMdx = async (source: string) => {
  const { content } = await compileMDX({
    source,
    components: mdxComponents,
    options: {
      parseFrontmatter: false,
      mdxOptions: {
        remarkPlugins: [remarkGfm, remarkMath],
        rehypePlugins: [rehypeKatex],
      },
    },
  });

  return content;
};

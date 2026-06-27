export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const withBasePath = (pathname: string) => {
  if (!basePath) return pathname;
  if (!pathname.startsWith('/')) return pathname;
  return `${basePath}${pathname}`;
};

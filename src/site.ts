const normalizeBasePath = (basePath: string) => {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
};

export const appBasePath = normalizeBasePath(import.meta.env.BASE_URL || '/');

export const buildAppUrl = (path = '') => {
  const normalizedPath = path.replace(/^\//, '');
  return new URL(normalizedPath, `${window.location.origin}${appBasePath}`).toString();
};

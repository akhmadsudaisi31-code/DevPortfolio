import { Project } from './types';

export type ProjectInput = Omit<Project, 'id' | 'createdAt' | 'updatedAt'>;

type GithubRepo = {
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  updated_at: string;
  fork: boolean;
};

type GithubReadme = {
  content?: string;
  encoding?: string;
};

const GITHUB_API_BASE_URL = 'https://api.github.com';
const GITHUB_PROJECT_CACHE_KEY = 'devportfolio_github_project_cache';
const GITHUB_PROJECT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GITHUB_RATE_LIMIT_KEY = 'devportfolio_github_rate_limit_reset_at';
const DEFAULT_RATE_LIMIT_BACKOFF_MS = 15 * 60 * 1000;

type GithubProjectCacheEntry = {
  project: ProjectInput;
  cachedAt: number;
};

export class GithubApiError extends Error {
  status: number;
  resetAt?: number;
  isRateLimited: boolean;

  constructor(message: string, options?: { status?: number; resetAt?: number; isRateLimited?: boolean }) {
    super(message);
    this.name = 'GithubApiError';
    this.status = options?.status ?? 0;
    this.resetAt = options?.resetAt;
    this.isRateLimited = options?.isRateLimited ?? false;
  }
}

const normalizeRepoName = (repoName: string) =>
  repoName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const getGithubHeaders = () => {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
};

const readRateLimitResetAt = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.localStorage.getItem(GITHUB_RATE_LIMIT_KEY);
  if (!rawValue) {
    return null;
  }

  const resetAt = Number(rawValue);
  if (!Number.isFinite(resetAt) || resetAt <= Date.now()) {
    window.localStorage.removeItem(GITHUB_RATE_LIMIT_KEY);
    return null;
  }

  return resetAt;
};

const writeRateLimitResetAt = (resetAt: number | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!resetAt || resetAt <= Date.now()) {
    window.localStorage.removeItem(GITHUB_RATE_LIMIT_KEY);
    return;
  }

  window.localStorage.setItem(GITHUB_RATE_LIMIT_KEY, String(resetAt));
};

const formatResetTime = (resetAt?: number) => {
  if (!resetAt) {
    return 'later';
  }

  return new Date(resetAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildFallbackDescription = (repo: GithubRepo) => {
  const techSummary = unique([repo.language || '', ...(repo.topics || []).slice(0, 2)]).join(', ');
  if (techSummary) {
    return `${normalizeRepoName(repo.name)} repository built with ${techSummary}.`;
  }

  return `${normalizeRepoName(repo.name)} repository from GitHub.`;
};

const readProjectCache = () => {
  if (typeof window === 'undefined') {
    return {} as Record<string, GithubProjectCacheEntry>;
  }

  try {
    const stored = window.localStorage.getItem(GITHUB_PROJECT_CACHE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, GithubProjectCacheEntry>) : {};
  } catch {
    return {};
  }
};

const writeProjectCache = (cache: Record<string, GithubProjectCacheEntry>) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(GITHUB_PROJECT_CACHE_KEY, JSON.stringify(cache));
};

const getCachedProject = (repoFullName: string, repoUpdatedAt: string) => {
  const cache = readProjectCache();
  const entry = cache[repoFullName.toLowerCase()];

  if (!entry) {
    return null;
  }

  const isExpired = Date.now() - entry.cachedAt > GITHUB_PROJECT_CACHE_TTL_MS;
  const matchesRepoVersion = entry.project.githubUpdatedAt === repoUpdatedAt;

  if (isExpired || !matchesRepoVersion) {
    return null;
  }

  return entry.project;
};

const setCachedProject = (project: ProjectInput) => {
  if (!project.githubRepoFullName) {
    return;
  }

  const cache = readProjectCache();
  cache[project.githubRepoFullName.toLowerCase()] = {
    project,
    cachedAt: Date.now(),
  };
  writeProjectCache(cache);
};

const decodeBase64 = (value: string) => {
  try {
    return atob(value.replace(/\n/g, ''));
  } catch {
    return '';
  }
};

const sanitizeReadme = (content: string) =>
  content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\(([^)]*)\)/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[`*_~>-]/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const readmeToExcerpt = (content: string, repoName: string) => {
  const cleaned = sanitizeReadme(content);
  if (!cleaned) {
    return '';
  }

  const repoNamePattern = new RegExp(`^${repoName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*`, 'i');
  const normalized = cleaned.replace(repoNamePattern, '').trim();
  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 30);

  const excerpt = sentences.slice(0, 2).join(' ');
  return excerpt.length > 240 ? `${excerpt.slice(0, 237).trimEnd()}...` : excerpt;
};

const buildDescription = async (repo: GithubRepo, allowReadmeFetch: boolean) => {
  if (repo.description?.trim()) {
    return repo.description.trim();
  }

  const cachedProject = getCachedProject(repo.full_name, repo.updated_at);
  if (cachedProject?.description?.trim()) {
    return cachedProject.description.trim();
  }

  if (!allowReadmeFetch) {
    return buildFallbackDescription(repo);
  }

  const [owner, repoName] = repo.full_name.split('/');
  if (!owner || !repoName) {
    return buildFallbackDescription(repo);
  }

  try {
    const readme = await githubRequest<GithubReadme>(`/repos/${owner}/${repoName}/readme`);

    if (readme.encoding === 'base64' && readme.content) {
      return readmeToExcerpt(decodeBase64(readme.content), repoName);
    }
  } catch (error) {
    console.warn(`Failed to fetch README for ${repo.full_name}`, error);
  }

  return buildFallbackDescription(repo);
};

async function githubRequest<T>(path: string) {
  const blockedUntil = readRateLimitResetAt();
  if (blockedUntil) {
    throw new GithubApiError(
      `GitHub API rate limit reached. Try again after ${formatResetTime(blockedUntil)} or add GITHUB_TOKEN.`,
      { status: 403, resetAt: blockedUntil, isRateLimited: true }
    );
  }

  const response = await fetch(`${GITHUB_API_BASE_URL}${path}`, {
    headers: getGithubHeaders(),
  });

  if (response.ok) {
    writeRateLimitResetAt(null);
  }

  if (!response.ok) {
    const rateLimitResetHeader = response.headers.get('x-ratelimit-reset');
    const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
    const resetAt = rateLimitResetHeader
      ? Number(rateLimitResetHeader) * 1000
      : Date.now() + DEFAULT_RATE_LIMIT_BACKOFF_MS;

    if (response.status === 403 && rateLimitRemaining === '0') {
      writeRateLimitResetAt(resetAt);
      throw new GithubApiError(
        `GitHub API rate limit reached. Try again after ${formatResetTime(resetAt)} or add GITHUB_TOKEN.`,
        { status: 403, resetAt, isRateLimited: true }
      );
    }

    if (response.status === 403) {
      writeRateLimitResetAt(resetAt);
      throw new GithubApiError(
        `GitHub blocked the request. Try again after ${formatResetTime(resetAt)} or configure GITHUB_TOKEN.`,
        { status: 403, resetAt, isRateLimited: true }
      );
    }

    if (response.status === 404) {
      throw new GithubApiError('GitHub resource not found', { status: 404 });
    }

    throw new GithubApiError('Failed to fetch data from GitHub', { status: response.status });
  }

  return response.json() as Promise<T>;
}

export function parseGithubRepoUrl(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== 'github.com' && hostname !== 'www.github.com') {
      return null;
    }

    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) {
      return null;
    }

    return {
      owner,
      repo: repo.replace(/\.git$/i, ''),
    };
  } catch {
    return null;
  }
}

export async function fetchGithubRepositoryProject(repoUrl: string): Promise<ProjectInput> {
  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    throw new Error('Invalid GitHub repository URL');
  }

  const repo = await githubRequest<GithubRepo>(`/repos/${parsed.owner}/${parsed.repo}`);
  return githubRepoToProjectInput(repo, { allowReadmeFetch: true });
}

export async function fetchGithubProjectsForUser(username: string): Promise<ProjectInput[]> {
  const repos = await githubRequest<GithubRepo[]>(
    `/users/${encodeURIComponent(username)}/repos?type=owner&sort=updated&direction=desc&per_page=100`
  );

  const originalRepos = repos.filter((repo) => !repo.fork);
  return Promise.all(originalRepos.map((repo) => githubRepoToProjectInput(repo, { allowReadmeFetch: false })));
}

export async function githubRepoToProjectInput(
  repo: GithubRepo,
  options: {
    allowReadmeFetch: boolean;
  }
): Promise<ProjectInput> {
  const cachedProject = getCachedProject(repo.full_name, repo.updated_at);
  if (cachedProject) {
    return cachedProject;
  }

  const description = await buildDescription(repo, options.allowReadmeFetch);

  const project: ProjectInput = {
    name: normalizeRepoName(repo.name),
    description,
    liveUrl: repo.homepage?.trim() || '',
    repoUrl: repo.html_url,
    emailUsed: '',
    techStack: unique([repo.language || '', ...(repo.topics || [])]),
    notes: `Linked to GitHub repo ${repo.full_name}`,
    imageUrl: '',
    source: 'github',
    githubRepoFullName: repo.full_name,
    githubUpdatedAt: repo.updated_at,
    githubAutoSync: true,
  };

  setCachedProject(project);
  return project;
}

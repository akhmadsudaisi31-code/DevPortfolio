import { parseGithubRepoUrl } from './github';
import { Project } from './types';

type SharedProjectPayload = {
  n: string;
  d: string;
  l: string;
  r: string;
  t: string[];
  i: string;
};

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
};

const base64UrlToBytes = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

export const encodeSharedProjects = (projects: Project[]) => {
  const payload: SharedProjectPayload[] = projects.map((project) => ({
    n: project.name,
    d: project.description,
    l: project.liveUrl,
    r: project.repoUrl,
    t: project.techStack,
    i: project.imageUrl,
  }));

  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
};

export const decodeSharedProjects = (encoded: string): SharedProjectPayload[] => {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(encoded));
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    const legacyJson = decodeURIComponent(atob(encoded));
    const parsed = JSON.parse(legacyJson);
    return Array.isArray(parsed) ? parsed : [];
  }
};

const getProjectGithubOwner = (project: Project) => {
  if (project.githubRepoFullName) {
    return project.githubRepoFullName.split('/')[0]?.trim() || null;
  }

  return parseGithubRepoUrl(project.repoUrl)?.owner || null;
};

export const getCommonGithubUsername = (projects: Project[]) => {
  if (projects.length === 0) {
    return null;
  }

  const owners = projects.map(getProjectGithubOwner);
  if (owners.some((owner) => !owner)) {
    return null;
  }

  const [firstOwner] = owners;
  return owners.every((owner) => owner?.toLowerCase() === firstOwner?.toLowerCase()) ? firstOwner || null : null;
};

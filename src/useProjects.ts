import { useEffect, useRef, useState } from 'react';
import { fetchGithubProjectsForUser, fetchGithubRepositoryProject, GithubApiError, parseGithubRepoUrl } from './github';
import { Project } from './types';

const STORAGE_KEY = 'devportfolio_projects';
const GITHUB_SYNC_KEY = 'devportfolio_github_sync';
const AUTO_SYNC_INTERVAL_MS = 10 * 60 * 1000;
const AUTO_SYNC_COOLDOWN_MS = 3 * 60 * 1000;

type GithubSyncSettings = {
  username: string;
  enabled: boolean;
  lastSyncedAt: number | null;
};

const defaultGithubSyncSettings: GithubSyncSettings = {
  username: '',
  enabled: false,
  lastSyncedAt: null,
};

const mergeGithubProjects = (
  existingProjects: Project[],
  githubProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[],
  username?: string
) => {
  const syncedRepoNames = new Set(
    githubProjects
      .map((project) => project.githubRepoFullName?.toLowerCase())
      .filter(Boolean)
  );

  const projects = existingProjects.filter((project) => {
    if (!username || project.source !== 'github' || !project.githubAutoSync || !project.githubRepoFullName) {
      return true;
    }

    const belongsToUsername = project.githubRepoFullName.toLowerCase().startsWith(`${username.toLowerCase()}/`);
    return !belongsToUsername || syncedRepoNames.has(project.githubRepoFullName.toLowerCase());
  });

  githubProjects.forEach((githubProject) => {
    const existingIndex = projects.findIndex(
      (project) =>
        project.repoUrl === githubProject.repoUrl ||
        (
          !!project.githubRepoFullName &&
          !!githubProject.githubRepoFullName &&
          project.githubRepoFullName.toLowerCase() === githubProject.githubRepoFullName.toLowerCase()
        )
    );

    if (existingIndex >= 0) {
      const existingProject = projects[existingIndex];
      projects[existingIndex] = {
        ...existingProject,
        name: githubProject.name || existingProject.name,
        description: githubProject.description || existingProject.description,
        liveUrl: githubProject.liveUrl || existingProject.liveUrl,
        repoUrl: githubProject.repoUrl || existingProject.repoUrl,
        techStack: githubProject.techStack.length ? githubProject.techStack : existingProject.techStack,
        source: 'github',
        githubRepoFullName: githubProject.githubRepoFullName || existingProject.githubRepoFullName,
        githubUpdatedAt: githubProject.githubUpdatedAt || existingProject.githubUpdatedAt,
        githubAutoSync: existingProject.githubAutoSync ?? githubProject.githubAutoSync ?? true,
        updatedAt: Date.now(),
      };
      return;
    }

    projects.push({
      ...githubProject,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });

  return projects.sort((a, b) => b.createdAt - a.createdAt);
};

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [githubSyncSettings, setGithubSyncSettings] = useState<GithubSyncSettings>(defaultGithubSyncSettings);
  const [githubSyncStatus, setGithubSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [githubSyncMessage, setGithubSyncMessage] = useState('');
  const syncInFlightRef = useRef<Promise<boolean> | null>(null);
  const enrichInFlightRef = useRef(false);

  useEffect(() => {
    const storedProjects = localStorage.getItem(STORAGE_KEY);
    const storedGithubSyncSettings = localStorage.getItem(GITHUB_SYNC_KEY);

    if (storedProjects) {
      try {
        setProjects(JSON.parse(storedProjects));
      } catch (error) {
        console.error('Failed to parse projects from local storage', error);
      }
    }

    if (storedGithubSyncSettings) {
      try {
        setGithubSyncSettings({
          ...defaultGithubSyncSettings,
          ...JSON.parse(storedGithubSyncSettings),
        });
      } catch (error) {
        console.error('Failed to parse GitHub sync settings from local storage', error);
      }
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(GITHUB_SYNC_KEY, JSON.stringify(githubSyncSettings));
    }
  }, [githubSyncSettings, isLoaded]);

  const syncGithubProjects = (
    githubProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[],
    username?: string
  ) => {
    setProjects((prev) => mergeGithubProjects(prev, githubProjects, username));
  };

  const configureGithubAutoSync = (username: string, enabled: boolean) => {
    setGithubSyncSettings((prev) => ({
      username: username.trim(),
      enabled: enabled && !!username.trim(),
      lastSyncedAt: enabled ? Date.now() : prev.lastSyncedAt,
    }));

    if (!enabled) {
      setProjects((prev) =>
        prev.map((project) =>
          project.githubRepoFullName?.toLowerCase().startsWith(`${username.trim().toLowerCase()}/`)
            ? { ...project, githubAutoSync: false }
            : project
        )
      );
    }
  };

  const syncGithubPortfolio = async (username = githubSyncSettings.username, silent = false) => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return false;
    }

    if (syncInFlightRef.current) {
      return syncInFlightRef.current;
    }

    const syncTask = (async () => {
      if (!silent) {
        setGithubSyncStatus('syncing');
        setGithubSyncMessage(`Syncing portfolio with GitHub user ${normalizedUsername}...`);
      }

      try {
        const githubProjects = await fetchGithubProjectsForUser(normalizedUsername);
        syncGithubProjects(githubProjects, normalizedUsername);
        setGithubSyncSettings((prev) => ({
          username: normalizedUsername,
          enabled: prev.enabled || normalizedUsername === prev.username,
          lastSyncedAt: Date.now(),
        }));
        setGithubSyncStatus('idle');
        setGithubSyncMessage(`Portfolio synced from GitHub user ${normalizedUsername}.`);
        return true;
      } catch (error) {
        if (!(error instanceof GithubApiError && error.isRateLimited)) {
          console.error('Failed to sync portfolio from GitHub', error);
        }
        setGithubSyncStatus('error');
        setGithubSyncMessage(error instanceof Error ? error.message : 'Failed to sync portfolio from GitHub');
        return false;
      } finally {
        syncInFlightRef.current = null;
      }
    })();

    syncInFlightRef.current = syncTask;
    return syncTask;
  };

  const enrichProjectsFromGithubRepos = async () => {
    if (enrichInFlightRef.current) {
      return false;
    }

    const candidates = projects.filter((project) => {
      const hasGithubRepo = !!parseGithubRepoUrl(project.repoUrl);
      return hasGithubRepo && (!project.description.trim() || !project.githubRepoFullName || project.source !== 'github');
    });

    if (candidates.length === 0) {
      return false;
    }

    enrichInFlightRef.current = true;

    try {
      const enrichedProjects: Array<{
        id: string;
        updates: Partial<Project>;
      }> = [];

      for (const project of candidates) {
        try {
          const githubProject = await fetchGithubRepositoryProject(project.repoUrl);
          enrichedProjects.push({
            id: project.id,
            updates: {
              name: project.name.trim() || githubProject.name,
              description: project.description.trim() || githubProject.description,
              liveUrl: project.liveUrl.trim() || githubProject.liveUrl,
              techStack: project.techStack.length ? project.techStack : githubProject.techStack,
              source: 'github',
              githubRepoFullName: githubProject.githubRepoFullName,
              githubUpdatedAt: githubProject.githubUpdatedAt,
              githubAutoSync: project.githubAutoSync ?? true,
            },
          });
        } catch (error) {
          if (error instanceof GithubApiError && error.isRateLimited) {
            setGithubSyncMessage(error.message);
            break;
          }

          console.error(`Failed to enrich project ${project.name} from GitHub`, error);
        }
      }

      const validEnrichedProjects = enrichedProjects.filter(Boolean);
      if (validEnrichedProjects.length === 0) {
        return false;
      }

      setProjects((prev) =>
        prev.map((project) => {
          const enriched = validEnrichedProjects.find((entry) => entry?.id === project.id);
          return enriched ? { ...project, ...enriched.updates, updatedAt: Date.now() } : project;
        })
      );

      setGithubSyncMessage(`Updated ${validEnrichedProjects.length} project descriptions from linked GitHub repositories.`);
      return true;
    } finally {
      enrichInFlightRef.current = false;
    }
  };

  useEffect(() => {
    if (!isLoaded || !githubSyncSettings.enabled || !githubSyncSettings.username) {
      return;
    }

    const shouldSyncImmediately =
      !githubSyncSettings.lastSyncedAt || Date.now() - githubSyncSettings.lastSyncedAt > AUTO_SYNC_COOLDOWN_MS;

    if (shouldSyncImmediately) {
      void syncGithubPortfolio(githubSyncSettings.username, true);
    }

    const intervalId = window.setInterval(() => {
      void syncGithubPortfolio(githubSyncSettings.username, true);
    }, AUTO_SYNC_INTERVAL_MS);

    const handleVisibilitySync = () => {
      if (document.visibilityState === 'visible') {
        void syncGithubPortfolio(githubSyncSettings.username, true);
      }
    };

    const handleOnlineSync = () => {
      void syncGithubPortfolio(githubSyncSettings.username, true);
    };

    document.addEventListener('visibilitychange', handleVisibilitySync);
    window.addEventListener('online', handleOnlineSync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilitySync);
      window.removeEventListener('online', handleOnlineSync);
    };
  }, [githubSyncSettings.enabled, githubSyncSettings.username, isLoaded]);

  useEffect(() => {
    if (!isLoaded || (githubSyncSettings.enabled && githubSyncSettings.username)) {
      return;
    }

    void enrichProjectsFromGithubRepos();
  }, [githubSyncSettings.enabled, githubSyncSettings.username, isLoaded, projects]);

  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...project,
      source: project.source || 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      id: crypto.randomUUID(),
    };
    setProjects((prev) => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setProjects((prev) =>
      prev.map((project) => (project.id === id ? { ...project, ...updates, updatedAt: Date.now() } : project))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const importData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const valid = parsed.every((project) => project.id && project.name);
        if (valid) {
          setProjects(parsed);
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'portfolio-data.json');
    linkElement.click();
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    syncGithubProjects,
    syncGithubPortfolio,
    configureGithubAutoSync,
    importData,
    exportData,
    isLoaded,
    githubSyncSettings,
    githubSyncStatus,
    githubSyncMessage,
  };
}

import { useState, useEffect } from 'react';
import { Project } from './types';

const STORAGE_KEY = 'devportfolio_projects';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setProjects(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse projects from local storage', e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    }
  }, [projects, isLoaded]);

  const addProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [newProject, ...prev]);
  };

  const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt' | 'updatedAt'>>) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p))
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const syncGithubProjects = (githubProjects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    setProjects((prev) => {
      const newProjects = [...prev];

      githubProjects.forEach((ghProj) => {
        const existingIndex = newProjects.findIndex((p) => p.repoUrl === ghProj.repoUrl);
        if (existingIndex >= 0) {
          // Update existing
          const existing = newProjects[existingIndex];
          newProjects[existingIndex] = {
            ...existing,
            description: existing.description || ghProj.description,
            liveUrl: existing.liveUrl || ghProj.liveUrl,
            techStack: Array.from(new Set([...existing.techStack, ...ghProj.techStack])),
            updatedAt: Date.now(),
          };
        } else {
          // Add new
          newProjects.push({
            ...ghProj,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
      });

      // Sort by newest first
      return newProjects.sort((a, b) => b.createdAt - a.createdAt);
    });
  };

  const importData = (data: string) => {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        // Basic validation
        const valid = parsed.every(p => p.id && p.name);
        if (valid) {
          setProjects(parsed);
          return true;
        }
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const exportData = () => {
    const dataStr = JSON.stringify(projects, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'portfolio-data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return {
    projects,
    addProject,
    updateProject,
    deleteProject,
    syncGithubProjects,
    importData,
    exportData,
    isLoaded
  };
}

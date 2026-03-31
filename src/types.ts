export interface Project {
  id: string;
  name: string;
  description: string;
  liveUrl: string;
  repoUrl: string;
  emailUsed: string;
  techStack: string[];
  notes: string;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
  source?: 'manual' | 'github';
  githubRepoFullName?: string;
  githubUpdatedAt?: string;
  githubAutoSync?: boolean;
}

export type ViewMode = 'manage' | 'portfolio';

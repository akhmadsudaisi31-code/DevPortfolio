import React, { useState } from 'react';
import { Project } from '../types';
import { fetchGithubRepositoryProject, parseGithubRepoUrl } from '../github';
import {
  X,
  Link as LinkIcon,
  Github,
  Mail,
  Code,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

type FormState = Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'techStack'> & {
  techStack: string;
};

const toFormState = (initialData?: Project): FormState => ({
  name: initialData?.name || '',
  description: initialData?.description || '',
  liveUrl: initialData?.liveUrl || '',
  repoUrl: initialData?.repoUrl || '',
  emailUsed: initialData?.emailUsed || '',
  techStack: initialData?.techStack.join(', ') || '',
  notes: initialData?.notes || '',
  imageUrl: initialData?.imageUrl || '',
  source: initialData?.source || 'manual',
  githubRepoFullName: initialData?.githubRepoFullName,
  githubUpdatedAt: initialData?.githubUpdatedAt,
  githubAutoSync: initialData?.githubAutoSync ?? false,
});

export function ProjectForm({ initialData, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<FormState>(toFormState(initialData));
  const [repoStatus, setRepoStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [repoMessage, setRepoMessage] = useState('');
  const [lastFetchedRepoUrl, setLastFetchedRepoUrl] = useState(initialData?.repoUrl || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === 'repoUrl') {
      setRepoStatus('idle');
      setRepoMessage('');
    }
  };

  const applyGithubRepoData = async (overwriteExisting: boolean) => {
    const normalizedRepoUrl = formData.repoUrl.trim();
    if (!parseGithubRepoUrl(normalizedRepoUrl) || !normalizedRepoUrl || normalizedRepoUrl === lastFetchedRepoUrl) {
      return;
    }

    setRepoStatus('loading');
    setRepoMessage('Fetching repository details from GitHub...');

    try {
      const repoProject = await fetchGithubRepositoryProject(normalizedRepoUrl);

      setFormData((prev) => ({
        ...prev,
        name: overwriteExisting || !prev.name.trim() ? repoProject.name : prev.name,
        description: overwriteExisting || !prev.description.trim() ? repoProject.description : prev.description,
        liveUrl: overwriteExisting || !prev.liveUrl.trim() ? repoProject.liveUrl : prev.liveUrl,
        techStack:
          overwriteExisting || !prev.techStack.trim() ? repoProject.techStack.join(', ') : prev.techStack,
        notes: prev.notes.trim() || repoProject.notes,
        source: 'github',
        githubRepoFullName: repoProject.githubRepoFullName,
        githubUpdatedAt: repoProject.githubUpdatedAt,
        githubAutoSync: true,
      }));
      setLastFetchedRepoUrl(normalizedRepoUrl);
      setRepoStatus('success');
      setRepoMessage(
        overwriteExisting
          ? 'Project data refreshed from GitHub.'
          : 'GitHub repository detected. Empty fields were filled automatically.'
      );
    } catch (error) {
      setRepoStatus('error');
      setRepoMessage(error instanceof Error ? error.message : 'Failed to fetch repository data');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const isGithubRepo = !!parseGithubRepoUrl(formData.repoUrl.trim());

    onSubmit({
      ...formData,
      techStack: formData.techStack.split(',').map((tech) => tech.trim()).filter(Boolean),
      source: isGithubRepo ? 'github' : 'manual',
      githubAutoSync: isGithubRepo ? formData.githubAutoSync ?? true : false,
      githubRepoFullName: isGithubRepo ? formData.githubRepoFullName : undefined,
      githubUpdatedAt: isGithubRepo ? formData.githubUpdatedAt : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl my-8 relative">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 rounded-t-xl flex justify-between items-center z-10">
          <h2 className="text-lg font-mono font-semibold text-gray-900 dark:text-zinc-100">
            {initialData ? 'Edit_Project' : 'Add_New_Project'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                Project Name *
              </label>
              <input
                required
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                placeholder="e.g. E-Commerce Dashboard"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                placeholder="Briefly describe what this project does..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                  <LinkIcon size={14} className="text-gray-400 dark:text-zinc-500" /> Live URL
                </label>
                <input
                  type="url"
                  name="liveUrl"
                  value={formData.liveUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                  <Github size={14} className="text-gray-400 dark:text-zinc-500" /> Repository URL
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    name="repoUrl"
                    value={formData.repoUrl}
                    onChange={handleChange}
                    onBlur={() => void applyGithubRepoData(false)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                    placeholder="https://github.com/..."
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 font-mono">
                      Paste a GitHub repo URL to auto-fill empty project fields from the repository.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLastFetchedRepoUrl('');
                        void applyGithubRepoData(true);
                      }}
                      disabled={!parseGithubRepoUrl(formData.repoUrl.trim()) || repoStatus === 'loading'}
                      className="shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {repoStatus === 'loading' ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Refresh_From_Repo
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {repoStatus !== 'idle' && (
              <div
                className={`p-3 rounded-lg flex items-center gap-3 text-sm font-mono ${
                  repoStatus === 'loading'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                    : repoStatus === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                }`}
              >
                {repoStatus === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {repoStatus === 'success' && <CheckCircle2 size={16} />}
                {repoStatus === 'error' && <AlertCircle size={16} />}
                {repoMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                  <Mail size={14} className="text-gray-400 dark:text-zinc-500" /> Associated Email/Account
                </label>
                <input
                  type="text"
                  name="emailUsed"
                  value={formData.emailUsed}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                  <ImageIcon size={14} className="text-gray-400 dark:text-zinc-500" /> Image URL
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                <Code size={14} className="text-gray-400 dark:text-zinc-500" /> Tech Stack (comma separated)
              </label>
              <input
                type="text"
                name="techStack"
                value={formData.techStack}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                placeholder="React, Tailwind, Node.js..."
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">
                <FileText size={14} className="text-gray-400 dark:text-zinc-500" /> Private Notes / Credentials / Data
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                placeholder="API keys, test accounts, database URLs..."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2 text-gray-600 dark:text-zinc-400 font-mono text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono text-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors shadow-sm"
            >
              {initialData ? 'Save_Changes' : 'Add_Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

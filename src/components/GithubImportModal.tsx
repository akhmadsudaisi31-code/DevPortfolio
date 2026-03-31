import React, { useState } from 'react';
import { X, Github, Loader2, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Project } from '../types';
import { fetchGithubProjectsForUser } from '../github';
import { GoogleGenAI, Type } from '@google/genai';

interface GithubImportModalProps {
  onImport: (payload: {
    username: string;
    autoSync: boolean;
    projects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[];
  }) => void;
  onCancel: () => void;
  initialUsername?: string;
  initialAutoSync?: boolean;
}

export function GithubImportModal({
  onImport,
  onCancel,
  initialUsername = '',
  initialAutoSync = true,
}: GithubImportModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [enableAutoSync, setEnableAutoSync] = useState(initialAutoSync);
  const [useAI, setUseAI] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      return;
    }

    setStatus('loading');
    setMessage('Fetching repositories from GitHub...');

    try {
      let projectsToImport = await fetchGithubProjectsForUser(normalizedUsername);

      if (projectsToImport.length === 0) {
        setStatus('error');
        setMessage('No original repositories found for this user.');
        return;
      }

      if (useAI && process.env.GEMINI_API_KEY) {
        setMessage('Polishing descriptions with AI...');

        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          const projectContext = projectsToImport.map((project) => ({
            name: project.name,
            repo: project.githubRepoFullName,
            techStack: project.techStack,
            description: project.description,
          }));

          const prompt = `You are a professional portfolio copywriter. Rewrite each project description in Indonesian (Bahasa Indonesia) using the repository data provided. Keep every description faithful to the repository context, concise, and suitable for a developer portfolio. Do not invent features beyond the provided data.\n\nProjects:\n${JSON.stringify(projectContext)}`;

          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                    },
                    description: {
                      type: Type.STRING,
                    },
                  },
                  required: ['name', 'description'],
                },
              },
            },
          });

          const generatedData = JSON.parse(aiResponse.text || '[]');
          if (Array.isArray(generatedData)) {
            projectsToImport = projectsToImport.map((project) => {
              const refinedProject = generatedData.find(
                (entry: { name?: string; description?: string }) => entry.name === project.name
              );

              return {
                ...project,
                description: refinedProject?.description?.trim() || project.description,
              };
            });
          }
        } catch (aiError) {
          console.error('AI enhancement failed', aiError);
        }
      }

      onImport({
        username: normalizedUsername,
        autoSync: enableAutoSync,
        projects: projectsToImport,
      });

      setStatus('success');
      setMessage(
        enableAutoSync
          ? `Synced ${projectsToImport.length} repositories. Auto-sync is now active for @${normalizedUsername}.`
          : `Synced ${projectsToImport.length} repositories from @${normalizedUsername}.`
      );

      window.setTimeout(() => {
        onCancel();
      }, 2000);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'An error occurred during sync');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-mono font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Github size={20} /> Sync_From_GitHub
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSync} className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-2">
                GitHub Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                disabled={status === 'loading' || status === 'success'}
                required
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={enableAutoSync}
                  onChange={(e) => setEnableAutoSync(e.target.checked)}
                  disabled={status === 'loading' || status === 'success'}
                  className="peer appearance-none w-4 h-4 border border-gray-300 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-950 checked:bg-emerald-100 dark:checked:bg-emerald-500/20 checked:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
                />
                <CheckCircle2
                  size={12}
                  className="absolute text-emerald-600 dark:text-emerald-400 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-mono text-gray-700 dark:text-zinc-200 flex items-center gap-2">
                  <RefreshCw size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Auto-sync portfolio changes
                </span>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                  Refreshes portfolio data from GitHub automatically on app open, when the tab becomes active, and every 10 minutes.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center justify-center mt-0.5">
                <input
                  type="checkbox"
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  disabled={status === 'loading' || status === 'success'}
                  className="peer appearance-none w-4 h-4 border border-gray-300 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-950 checked:bg-emerald-100 dark:checked:bg-emerald-500/20 checked:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
                />
                <CheckCircle2
                  size={12}
                  className="absolute text-emerald-600 dark:text-emerald-400 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity"
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-mono text-gray-700 dark:text-zinc-200 flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Polish descriptions with AI
                </span>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                  Starts from repository data, then optionally rewrites the text into cleaner portfolio copy in Bahasa Indonesia.
                </p>
              </div>
            </label>

            {status !== 'idle' && (
              <div
                className={`p-3 rounded-lg flex items-center gap-3 text-sm font-mono ${
                  status === 'loading'
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                    : status === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                }`}
              >
                {status === 'loading' && <Loader2 size={16} className="animate-spin" />}
                {status === 'success' && <CheckCircle2 size={16} />}
                {status === 'error' && <AlertCircle size={16} />}
                {message}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-gray-500 dark:text-zinc-400 font-mono text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-colors"
                disabled={status === 'loading'}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-mono text-sm hover:bg-emerald-100 dark:hover:bg-emerald-500/20 rounded-lg transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={status === 'loading' || status === 'success' || !username.trim()}
              >
                {status === 'loading' ? 'Syncing...' : 'Start_Sync'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

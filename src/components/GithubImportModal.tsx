import React, { useState } from 'react';
import { X, Github, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Project } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

interface GithubImportModalProps {
  onImport: (projects: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  onCancel: () => void;
}

export function GithubImportModal({ onImport, onCancel }: GithubImportModalProps) {
  const [username, setUsername] = useState('');
  const [useAI, setUseAI] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setStatus('loading');
    setMessage('Fetching repositories...');

    try {
      const response = await fetch(`https://api.github.com/users/${username.trim()}/repos?sort=updated&per_page=100`);
      
      if (!response.ok) {
        throw new Error(response.status === 404 ? 'User not found' : 'Failed to fetch repositories');
      }

      const repos = await response.json();
      
      if (!Array.isArray(repos)) {
        throw new Error('Invalid response from GitHub');
      }

      let projectsToImport = repos
        .filter(repo => !repo.fork) // Ignore forks
        .map(repo => ({
          name: repo.name.replace(/-/g, ' '),
          description: repo.description || '',
          liveUrl: repo.homepage || '',
          repoUrl: repo.html_url,
          emailUsed: '',
          techStack: repo.language ? [repo.language] : [],
          notes: `Imported from GitHub on ${new Date().toLocaleDateString()}`,
          imageUrl: '',
        }));

      if (projectsToImport.length === 0) {
        setStatus('error');
        setMessage('No original repositories found for this user.');
        return;
      }

      if (useAI && process.env.GEMINI_API_KEY) {
        setMessage('Generating AI descriptions...');
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
          
          const repoDataForAI = projectsToImport.map(p => ({
            name: p.name,
            language: p.techStack[0] || 'Unknown',
            existing_desc: p.description
          }));

          const prompt = `You are a professional portfolio copywriter. I will provide a list of GitHub repositories. For each repository, generate a professional, engaging 1-2 sentence description in Indonesian (Bahasa Indonesia) suitable for a developer portfolio. If an existing description is provided, enhance it and translate it to Indonesian. If it's empty, infer a plausible description based on the repository name and language and write it in Indonesian.
          
          Repositories:
          ${JSON.stringify(repoDataForAI)}
          `;

          const aiResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "The name of the repository"
                    },
                    description: {
                      type: Type.STRING,
                      description: "The generated professional description"
                    }
                  },
                  required: ["name", "description"]
                }
              }
            }
          });

          const generatedData = JSON.parse(aiResponse.text || '[]');
          
          if (Array.isArray(generatedData)) {
            projectsToImport = projectsToImport.map(proj => {
              const aiGenerated = generatedData.find((d: any) => d.name === proj.name);
              return {
                ...proj,
                description: aiGenerated?.description || proj.description
              };
            });
          }
        } catch (aiError) {
          console.error("AI Generation failed", aiError);
        }
      }

      onImport(projectsToImport);
      setStatus('success');
      setMessage(`Successfully synced ${projectsToImport.length} repositories!`);
      
      setTimeout(() => {
        onCancel();
      }, 2000);

    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'An error occurred during sync');
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-md relative">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-zinc-800">
          <h2 className="text-lg font-mono font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
            <Github size={20} /> Sync_From_GitHub
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300">
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
                  checked={useAI}
                  onChange={(e) => setUseAI(e.target.checked)}
                  disabled={status === 'loading' || status === 'success'}
                  className="peer appearance-none w-4 h-4 border border-gray-300 dark:border-zinc-700 rounded bg-gray-50 dark:bg-zinc-950 checked:bg-emerald-100 dark:checked:bg-emerald-500/20 checked:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
                />
                <CheckCircle2 size={12} className="absolute text-emerald-600 dark:text-emerald-400 opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-mono text-gray-700 dark:text-zinc-200 flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
                  Auto-generate descriptions
                </span>
                <p className="text-xs text-gray-500 dark:text-zinc-500 mt-1">
                  Uses AI to write professional portfolio descriptions based on repository names and languages.
                </p>
              </div>
            </label>

            {status !== 'idle' && (
              <div className={`p-3 rounded-lg flex items-center gap-3 text-sm font-mono ${
                status === 'loading' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20' :
                status === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20' :
                'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
              }`}>
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

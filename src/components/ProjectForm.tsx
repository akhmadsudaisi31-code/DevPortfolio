import React, { useState } from 'react';
import { Project } from '../types';
import { X, Link as LinkIcon, Github, Mail, Code, FileText, Image as ImageIcon } from 'lucide-react';

interface ProjectFormProps {
  initialData?: Project;
  onSubmit: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export function ProjectForm({ initialData, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    liveUrl: initialData?.liveUrl || '',
    repoUrl: initialData?.repoUrl || '',
    emailUsed: initialData?.emailUsed || '',
    techStack: initialData?.techStack.join(', ') || '',
    notes: initialData?.notes || '',
    imageUrl: initialData?.imageUrl || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      techStack: formData.techStack.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl my-8 relative">
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 rounded-t-xl flex justify-between items-center z-10">
          <h2 className="text-lg font-mono font-semibold text-gray-900 dark:text-zinc-100">
            {initialData ? 'Edit_Project' : 'Add_New_Project'}
          </h2>
          <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">Project Name *</label>
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
              <label className="block text-xs font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 mb-1">Description</label>
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
                <input
                  type="url"
                  name="repoUrl"
                  value={formData.repoUrl}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all text-gray-900 dark:text-zinc-100 font-mono text-sm placeholder-gray-400 dark:placeholder-zinc-700"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

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

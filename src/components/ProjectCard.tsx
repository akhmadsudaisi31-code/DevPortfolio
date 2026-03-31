import React, { useEffect, useRef, useState } from 'react';
import { Project, ViewMode } from '../types';
import { ExternalLink, Github, Mail, Edit2, Trash2, Code2 } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  mode: ViewMode;
  onEdit?: (project: Project) => void;
  onDelete?: (id: string) => void;
}

export function ProjectCard({ project, mode, onEdit, onDelete }: ProjectCardProps) {
  const isManage = mode === 'manage';
  const [imageError, setImageError] = useState(false);
  const [shouldLoadPreview, setShouldLoadPreview] = useState(!!project.imageUrl.trim());
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setImageError(false);
    setShouldLoadPreview(!!project.imageUrl.trim());
  }, [project.id, project.imageUrl]);

  useEffect(() => {
    if (shouldLoadPreview || (!project.imageUrl.trim() && !project.liveUrl.trim())) {
      return;
    }

    const element = cardRef.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoadPreview(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [project.imageUrl, project.liveUrl, shouldLoadPreview]);

  // Determine which image to show
  // 1. If user provided an imageUrl, use it.
  // 2. If no imageUrl but there is a liveUrl, use a free screenshot API (microlink.io)
  // 3. If neither, or if the image fails to load, show the fallback icon.
  const displayImageUrl = shouldLoadPreview
    ? project.imageUrl 
      ? project.imageUrl 
      : (project.liveUrl && !imageError) 
      ? `https://api.microlink.io/?url=${encodeURIComponent(project.liveUrl)}&screenshot=true&meta=false&embed=screenshot.url`
      : null
    : null;

  return (
    <div ref={cardRef} className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden hover:border-gray-300 dark:hover:border-zinc-700 transition-all duration-300 group flex flex-col h-full shadow-sm hover:shadow-md dark:shadow-none">
      {displayImageUrl ? (
        <div className="h-48 w-full overflow-hidden bg-gray-100 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 relative">
          <img 
            src={displayImageUrl} 
            alt={project.name} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 dark:opacity-80 group-hover:opacity-100"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
          {isManage && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit?.(project)} className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete?.(project.id)} className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-400 shadow-sm">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="h-48 w-full bg-gray-50 dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-center relative">
          <Code2 size={48} className="text-gray-300 dark:text-zinc-800" />
          {isManage && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit?.(project)} className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-emerald-600 dark:hover:text-emerald-400 shadow-sm">
                <Edit2 size={16} />
              </button>
              <button onClick={() => onDelete?.(project.id)} className="p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-red-600 dark:hover:text-red-400 shadow-sm">
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-900 dark:text-zinc-100 line-clamp-1 font-mono">{project.name}</h3>
        </div>
        
        <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4 line-clamp-2 flex-grow">
          {project.description || 'No description provided.'}
        </p>

        {project.techStack.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {project.techStack.slice(0, 4).map((tech, idx) => (
              <span key={idx} className="px-2 py-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 text-[10px] font-mono uppercase tracking-wider rounded-md">
                {tech}
              </span>
            ))}
            {project.techStack.length > 4 && (
              <span className="px-2 py-1 bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-wider rounded-md">
                +{project.techStack.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="space-y-2 mt-auto pt-4 border-t border-gray-200 dark:border-zinc-800">
          {project.liveUrl && (
            <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors font-mono">
              <ExternalLink size={14} />
              <span className="truncate">{project.liveUrl.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          {project.repoUrl && (
            <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors font-mono">
              <Github size={14} />
              <span className="truncate">Repository</span>
            </a>
          )}
          {isManage && project.emailUsed && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-zinc-500 font-mono">
              <Mail size={14} />
              <span className="truncate">{project.emailUsed}</span>
            </div>
          )}
        </div>

        {isManage && project.notes && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-zinc-950 rounded-lg border border-gray-200 dark:border-zinc-800">
            <h4 className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-500 mb-1 uppercase tracking-wider font-mono">Private Notes</h4>
            <p className="text-xs text-gray-600 dark:text-zinc-400 font-mono whitespace-pre-wrap line-clamp-3">
              {project.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

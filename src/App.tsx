import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useProjects } from './useProjects';
import { useTheme } from './useTheme';
import { ProjectForm } from './components/ProjectForm';
import { ProjectCard } from './components/ProjectCard';
import { GithubImportModal } from './components/GithubImportModal';
import { Project, ViewMode } from './types';
import { Plus, Download, Upload, LayoutGrid, Eye, Search, Briefcase, Github, Share2, Copy, Check, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function ManageView() {
  const { projects, addProject, updateProject, deleteProject, syncGithubProjects, importData, exportData, isLoaded } = useProjects();
  const { isDark, toggleTheme } = useTheme();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const PROJECTS_PER_PAGE = 9;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!isLoaded) return null;

  const handleAdd = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    addProject(data);
    setIsFormOpen(false);
  };

  const handleEdit = (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingProject) {
      updateProject(editingProject.id, data);
      setEditingProject(undefined);
      setIsFormOpen(false);
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importData(content);
      if (success) {
        alert('Data imported successfully!');
      } else {
        alert('Failed to import data. Invalid format.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleShare = () => {
    try {
      const minimalProjects = projects.map(p => ({
        n: p.name,
        d: p.description,
        l: p.liveUrl,
        r: p.repoUrl,
        t: p.techStack,
        i: p.imageUrl
      }));
      const encodedData = btoa(encodeURIComponent(JSON.stringify(minimalProjects)));
      const shareUrl = `${window.location.origin}/portfolio?data=${encodedData}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    } catch (e) {
      alert('Failed to generate share link. Data might be too large.');
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.techStack.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * PROJECTS_PER_PAGE,
    currentPage * PROJECTS_PER_PAGE
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Briefcase size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight font-mono">DevPortfolio<span className="text-emerald-600 dark:text-emerald-500">_</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-1 rounded-xl transition-colors">
              <button
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-sm"
              >
                <span className="flex items-center gap-2 font-mono"><LayoutGrid size={16} /> Manage</span>
              </button>
              <button
                onClick={() => navigate('/portfolio')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200"
              >
                <span className="flex items-center gap-2 font-mono"><Eye size={16} /> Preview</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="Search projects, tech stack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleShare}
              className="p-2.5 text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors shadow-sm relative group"
              title="Copy Shareable Portfolio Link"
            >
              {isCopied ? <Check size={18} className="text-emerald-600 dark:text-emerald-400" /> : <Share2 size={18} />}
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 dark:bg-zinc-800 text-white dark:text-zinc-200 text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {isCopied ? 'Copied!' : 'Share Link'}
              </span>
            </button>
            <div className="w-px h-6 bg-gray-200 dark:bg-zinc-800 mx-1"></div>
            <input
              type="file"
              accept=".json"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => setIsGithubModalOpen(true)}
              className="p-2.5 text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors shadow-sm"
              title="Sync from GitHub"
            >
              <Github size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors shadow-sm"
              title="Import JSON"
            >
              <Upload size={18} />
            </button>
            <button
              onClick={exportData}
              className="p-2.5 text-gray-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors shadow-sm"
              title="Export JSON"
            >
              <Download size={18} />
            </button>
            <button
              onClick={() => {
                setEditingProject(undefined);
                setIsFormOpen(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium font-mono text-sm rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
            >
              <Plus size={18} /> Add Project
            </button>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20 bg-white/50 dark:bg-zinc-900/50 rounded-3xl border border-gray-200 dark:border-zinc-800 border-dashed">
            <div className="w-16 h-16 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase size={24} className="text-gray-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-zinc-100 mb-2 font-mono">No projects found</h3>
            <p className="text-gray-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
              {searchQuery 
                ? "We couldn't find any projects matching your search." 
                : "Start building your portfolio by adding your first project."}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsFormOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium font-mono text-sm rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors shadow-sm"
              >
                <Plus size={18} /> Add Your First Project
              </button>
            )}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {paginatedProjects.map((project) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <ProjectCard
                    project={project}
                    mode="manage"
                    onEdit={(p) => {
                      setEditingProject(p);
                      setIsFormOpen(true);
                    }}
                    onDelete={(id) => {
                      if (confirm('Are you sure you want to delete this project?')) {
                        deleteProject(id);
                      }
                    }}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-sm font-mono text-gray-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isFormOpen && (
          <ProjectForm
            initialData={editingProject}
            onSubmit={editingProject ? handleEdit : handleAdd}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingProject(undefined);
            }}
          />
        )}
        {isGithubModalOpen && (
          <GithubImportModal
            onImport={(projects) => {
              syncGithubProjects(projects);
            }}
            onCancel={() => setIsGithubModalOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PortfolioView() {
  const { projects: localProjects, isLoaded } = useProjects();
  const { isDark, toggleTheme } = useTheme();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [clicks, setClicks] = useState<number[]>([]);
  const navigate = useNavigate();

  const handleSecretClick = () => {
    const now = Date.now();
    const recentClicks = [...clicks, now].filter(time => now - time < 2000);
    if (recentClicks.length >= 3) {
      navigate('/');
    } else {
      setClicks(recentClicks);
    }
  };

  useEffect(() => {
    if (!isLoaded) return;
    
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(dataParam)));
        const mappedProjects: Project[] = decoded.map((p: any, idx: number) => ({
          id: `shared-${idx}`,
          name: p.n || '',
          description: p.d || '',
          liveUrl: p.l || '',
          repoUrl: p.r || '',
          techStack: p.t || [],
          imageUrl: p.i || '',
          emailUsed: '',
          notes: '',
          createdAt: 0,
          updatedAt: 0
        }));
        setProjects(mappedProjects);
      } catch (e) {
        console.error("Failed to parse shared data", e);
        setProjects(localProjects);
      }
    } else {
      setProjects(localProjects);
    }
  }, [isLoaded, searchParams, localProjects]);

  if (!isLoaded) return null;

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.techStack.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 transition-colors duration-300">
      <header className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Briefcase size={18} />
            </div>
            <h1 className="text-xl font-bold tracking-tight font-mono">
              Portfolio<span 
                className="text-emerald-600 dark:text-emerald-500 cursor-pointer select-none"
                onClick={handleSecretClick}
                title="Secret Manage Access"
              >_</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-full max-w-xs hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 font-mono text-xs"
              />
            </div>
            <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold font-mono mb-4">My Projects</h2>
          <p className="text-gray-500 dark:text-zinc-400 max-w-2xl mx-auto">
            A collection of my recent work, applications, and open-source contributions.
          </p>
        </div>

        <div className="sm:hidden relative w-full mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={16} />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-600 font-mono text-sm"
          />
        </div>

        {filteredProjects.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-lg font-medium text-gray-500 dark:text-zinc-500 mb-2 font-mono">No projects to display</h3>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence>
              {filteredProjects.map((project, idx) => (
                <motion.div
                  key={project.id || idx}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                >
                  <ProjectCard
                    project={project}
                    mode="portfolio"
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ManageView />} />
        <Route path="/portfolio" element={<PortfolioView />} />
      </Routes>
    </BrowserRouter>
  );
}

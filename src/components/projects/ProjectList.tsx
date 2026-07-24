import React, { useState, useEffect } from 'react';
import { 
  Clipboard, Search, Plus, Folder, Star, MoreVertical, 
  Trash2, Edit3, Copy, Archive, Settings2, BarChart2, FolderOpen,
  Sparkles,   FileText, Clock, ChevronRight, ChevronDown, Move, FileStack, Sliders, Bug, Users
} from 'lucide-react';
import { Project } from '../../types';
import { 
  getDocuments, saveDocument, deleteDocument, duplicateDocument, 
  getDocumentsAll, getTestCasesByProject, getTestCases, saveTestCase, getRecycleBin
} from '../../utils/storage';
import ArchiveFavoritesPanel from './ArchiveFavoritesPanel';
import { useAuth } from '../../contexts/AuthContext';

function formatRelativeTime(isoString: string): string {
  try {
    const now = new Date();
    const past = new Date(isoString);
    const diffMs = now.getTime() - past.getTime();
    if (diffMs < 0) return 'Just now';
    
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return past.toLocaleDateString([], { day: '2-digit', month: 'short' });
  } catch {
    return 'Recently';
  }
}

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string;
  selectedDocumentId: string;
  onSelectProject: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onAddProject: (name: string, desc?: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onToggleFavorite: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  openAddProjectForm?: boolean;
  onAddProjectFormConsumed?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function ProjectList({
  projects,
  selectedProjectId,
  selectedDocumentId,
  onSelectProject,
  onSelectDocument,
  onAddProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onToggleFavorite,
  activeTab,
  onSelectTab,
  openAddProjectForm,
  onAddProjectFormConsumed,
  isMobileOpen,
  onCloseMobile
}: ProjectListProps) {
  const { currentUser } = useAuth();
  const [projSearch, setProjSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (openAddProjectForm) {
      setShowAddForm(true);
      onAddProjectFormConsumed?.();
    }
  }, [openAddProjectForm, onAddProjectFormConsumed]);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Document creation modal state
  const [documentModalProject, setDocumentModalProject] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');

  // Document actions context menu state
  const [documentActionMenu, setDocumentActionMenu] = useState<{ docId: string; projectId: string } | null>(null);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    (p.project_name || '').toLowerCase().includes((projSearch || '').toLowerCase()) && !p.archived
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjName.trim()) {
      onAddProject(newProjName.trim(), newProjDesc.trim());
      setNewProjName('');
      setNewProjDesc('');
      setShowAddForm(false);
    }
  };

  const triggerRename = (proj: Project) => {
    const val = prompt('Enter new project name:', proj.project_name);
    if (val && val.trim()) {
      onRenameProject(proj.id, val.trim());
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}
      <div className={`w-[260px] bg-[#FFF4E8] border-r border-[#E7D6C4] h-full flex flex-col justify-between select-none shrink-0 font-sans fixed md:relative z-40 transition-transform duration-300 ease-in-out top-0 left-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      
      {/* TOP HEADER / LOGO */}
      <div className="p-5 border-b border-[#E7D6C4] shrink-0">
        <div 
          onClick={() => onSelectTab('Dashboard')}
          className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="bg-[#8B5A2B] text-white p-2 rounded-xl shadow-xs">
            <Clipboard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-[#3B2A1D] uppercase tracking-wider leading-none">TestCase</h1>
            <p className="text-[11px] text-[#7A6A5A] font-semibold mt-0.5">Management Suite</p>
          </div>
        </div>
      </div>

      {/* PRIMARY TABS SYSTEM */}
      <div className="px-3 py-4 border-b border-[#E7D6C4]/60 space-y-1 text-xs shrink-0 font-semibold">
        <button
          onClick={() => onSelectTab('Dashboard')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'Dashboard' 
              ? 'bg-[#8B5A2B] text-white shadow-xs' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Analytics Dashboard
        </button>

        <button
          onClick={() => onSelectTab('Projects')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'Projects' 
              ? 'bg-[#8B5A2B] text-white shadow-xs' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Test Cases Spreadsheet
        </button>

        <button
          onClick={() => onSelectTab('BugTracker')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'BugTracker' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Bug className="w-4 h-4 text-red-500 group-hover:text-red-600" />
          Bug Tracker
        </button>

        <button
          onClick={() => onSelectTab('AIGenerator')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'AIGenerator' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-600 group-hover:text-amber-700" />
          AI Test Case Generator
        </button>

        <button
          onClick={() => onSelectTab('CSVConverter')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'CSVConverter' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <FileText className="w-4 h-4" />
          CSV-to-Word Converter
        </button>

        <button
          onClick={() => onSelectTab('DownloadHistory')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'DownloadHistory' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Download History
        </button>

        <button
          onClick={() => onSelectTab('Templates')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'Templates' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <FileStack className="w-4 h-4" />
          Templates
        </button>

        <button
          onClick={() => onSelectTab('Settings')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'Settings' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Settings
        </button>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => onSelectTab('TeamManagement')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
              activeTab === 'TeamManagement' 
                ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
                : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
            }`}
          >
            <Users className="w-4 h-4 text-purple-600 group-hover:text-purple-700" />
            Team Management
          </button>
        )}

        <button
          onClick={() => onSelectTab('RecycleBin')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'RecycleBin' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          Recycle Bin
        </button>
      </div>

      {/* PROJECTS MAIN ZONE */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        <ArchiveFavoritesPanel
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
          onSelectDocument={onSelectDocument}
          onSelectTab={onSelectTab}
        />
        <div className="flex items-center justify-between px-2.5">
          <span className="text-[10px] font-bold text-[#7A6A5A] uppercase tracking-wider">Active Workspace Projects</span>
          <button 
            onClick={() => setShowAddForm(true)}
            className="p-1 hover:bg-[#FFF8F2] text-[#8B5A2B] hover:text-[#A66B37] rounded-lg transition-colors"
            title="Create Project"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* SEARCH BAR */}
        <div className="relative px-2">
          <Search className="w-3.5 h-3.5 text-[#7A6A5A]/60 absolute left-4.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects..."
            value={projSearch}
            onChange={e => setProjSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-[#E7D6C4] bg-white rounded-lg text-xs text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-hidden focus:ring-1 focus:ring-[#8B5A2B] transition-all"
          />
        </div>

        {/* CREATE DIALOG MODAL INLINE */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="bg-white border border-[#E7D6C4] p-3 rounded-xl space-y-2.5 mx-2 shadow-xs animate-fade-in">
            <h3 className="text-[10px] uppercase font-bold text-[#8B5A2B] tracking-wider">New Project Info</h3>
            <input
              type="text"
              required
              placeholder="Project Name..."
              value={newProjName}
              onChange={e => setNewProjName(e.target.value)}
              className="w-full p-2 border border-[#E7D6C4] rounded-lg text-xs text-[#3B2A1D]"
            />
            <input
              type="text"
              placeholder="Brief Description..."
              value={newProjDesc}
              onChange={e => setNewProjDesc(e.target.value)}
              className="w-full p-2 border border-[#E7D6C4] rounded-lg text-xs text-[#3B2A1D]"
            />
            <div className="flex justify-end gap-1.5 text-[10px] font-bold">
              <button 
                type="button" 
                onClick={() => setShowAddForm(false)} 
                className="px-2 py-1 text-[#7A6A5A] hover:text-[#3B2A1D]"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-2.5 py-1 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* PROJECTS CONTAINER LIST */}
        <div className="space-y-2">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((p) => {
              const isProjectSelected = selectedProjectId === p.id;
              const isSelected = isProjectSelected && activeTab === 'Projects';
              const isMenuOpen = activeMenuId === p.id;

              // Retrieve documents in this specific project
              const docs = getDocuments(p.id);
              
              // Retrieve test cases for this specific project
              const totalCases = getTestCasesByProject(p.id);
              
              // Find the latest modified timestamp across project or its documents
              let latestTime = p.updated_at;
              docs.forEach(doc => {
                if (doc.updated_at > latestTime) {
                  latestTime = doc.updated_at;
                }
              });

              return (
                <div key={p.id} className="space-y-1">
                  {/* Project Item */}
                  <div 
                    onClick={() => {
                      onSelectProject(p.id);
                      if (docs.length > 0) {
                        // Automatically select first document if none is selected
                        const hasSelectedDoc = docs.some(d => d.id === selectedDocumentId);
                        if (!hasSelectedDoc) {
                          onSelectDocument(docs[0].id);
                        }
                      } else {
                        onSelectDocument('');
                      }
                      onSelectTab('Projects');
                    }}
                    className={`group flex items-start justify-between px-3 py-2 rounded-xl transition-all cursor-pointer relative ${
                      isProjectSelected 
                        ? 'bg-[#8B5A2B]/10 border border-[#8B5A2B]/20 text-[#3B2A1D]' 
                        : 'text-[#3B2A1D] hover:bg-[#FFF8F2]/60 hover:text-black'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <Folder className={`w-4 h-4 shrink-0 mt-0.5 ${isProjectSelected ? 'text-[#8B5A2B]' : 'text-[#8B5A2B]/70'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`truncate text-xs block leading-tight ${isProjectSelected ? 'font-extrabold text-[#8B5A2B]' : 'font-bold'}`}>{p.project_name}</span>
                          {p.favorite && (
                            <Star className={`w-3 h-3 fill-[#F5A623] text-[#F5A623] shrink-0`} />
                          )}
                        </div>
                        <div className={`text-[10px] mt-1 font-semibold leading-none text-[#7A6A5A]`}>
                          {docs.length} File{docs.length !== 1 ? 's' : ''} • {totalCases.length} Row{totalCases.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {/* Actions Dropdown triggers */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(p.id)}
                        className={`p-1 rounded-md hover:bg-black/5 text-[#7A6A5A] hover:text-[#3B2A1D]`}
                        title="Favorite"
                      >
                        <Star className={`w-3 h-3 ${p.favorite ? 'fill-[#F5A623] text-[#F5A623]' : ''}`} />
                      </button>
                      <button
                        onClick={() => setActiveMenuId(isMenuOpen ? null : p.id)}
                        className={`p-1 rounded-md hover:bg-black/5 text-[#7A6A5A] hover:text-[#3B2A1D]`}
                      >
                        <MoreVertical className="w-3 h-3" />
                      </button>
                    </div>

                    {/* FLOAT CONTEXT DROPDOWN MENU */}
                    {isMenuOpen && (
                      <div 
                        className="absolute right-2 top-9 z-30 bg-white border border-[#E7D6C4] rounded-xl py-1.5 w-36 shadow-lg animate-fade-in"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            triggerRename(p);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-[#7A6A5A]" />
                          Rename Project
                        </button>
                        <button
                          onClick={() => {
                            onDuplicateProject(p.id);
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#7A6A5A]" />
                          Duplicate
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete project "${p.project_name}" and move it to the Recycle Bin?`)) {
                              onDeleteProject(p.id);
                            }
                            setActiveMenuId(null);
                          }}
                          className="w-full px-3 py-1.5 hover:bg-red-50 text-left text-xs font-bold text-red-600 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Suite
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Nested Documents (Nested Files Explorer view) */}
                  {isProjectSelected && (
                    <div className="pl-4 pr-1 py-1 space-y-1 border-l border-[#E7D6C4] ml-5 mt-0.5 mb-1.5">
                      <div className="flex items-center justify-between text-[9px] font-bold text-[#7A6A5A] uppercase tracking-wider mb-1 pl-1">
                        <span>Documents</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDocumentModalProject(p.id);
                          }}
                          className="px-1.5 py-0.5 hover:bg-[#8B5A2B]/10 hover:text-[#8B5A2B] text-[#7A6A5A] rounded-md transition-colors flex items-center gap-0.5 text-[8px]"
                          title="New Test Case File"
                        >
                          <Plus className="w-2.5 h-2.5 text-[#8B5A2B]" />
                          + File
                        </button>
                      </div>

                      {/* Document Items */}
                      {docs.length > 0 ? (
                        docs.map(doc => {
                          const isDocSelected = selectedDocumentId === doc.id;
                          return (
                            <div
                              key={doc.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectDocument(doc.id);
                                onSelectTab('Projects');
                              }}
                              className={`group/doc flex items-center justify-between px-2 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                                isDocSelected
                                  ? 'bg-[#8B5A2B] text-white font-bold shadow-xs'
                                  : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <FileText className={`w-3.5 h-3.5 shrink-0 ${isDocSelected ? 'text-white' : 'text-[#7A6A5A]/70'}`} />
                                <span className="truncate">{doc.name}</span>
                              </div>

                              {/* Document Actions Context Toggle */}
                              <div className="opacity-0 group-hover/doc:opacity-100 flex items-center" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => setDocumentActionMenu({ docId: doc.id, projectId: p.id })}
                                  className={`p-0.5 rounded hover:bg-black/5 ${isDocSelected ? 'text-white hover:bg-white/10' : 'text-[#7A6A5A] hover:text-[#3B2A1D]'}`}
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-[10px] text-[#7A6A5A]/50 italic py-1.5 pl-1.5">
                          No files. Click + File to start.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-[#7A6A5A]/50 text-xs italic">
              No active suites.
            </div>
          )}
        </div>
      </div>

      {/* FOOTER BUTTON ACTION */}
      <div className="p-4 border-t border-[#E7D6C4] shrink-0 bg-[#FFF4E8]">
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Create New Project
        </button>
      </div>

      {/* CREATE NEW FILE (TEST CASE DOCUMENT) DIALOG MODAL */}
      {documentModalProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setDocumentModalProject(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3B2A1D]">Create Test Case File</h3>
                <p className="text-xs text-[#7A6A5A] mt-1 leading-relaxed">
                  Add a new document file module under this project workspace to manage segregated scopes.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Login Module"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Test scenarios for authentication flows"
                  value={newDocDesc}
                  onChange={e => setNewDocDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-hidden font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocumentModalProject(null)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50 cursor-pointer font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newDocName.trim()) {
                    const saved = saveDocument({
                      project_id: documentModalProject,
                      name: newDocName.trim(),
                      description: newDocDesc.trim()
                    });
                    onSelectProject(documentModalProject);
                    onSelectDocument(saved.id);
                    onSelectTab('Projects');
                    setNewDocName('');
                    setNewDocDesc('');
                    setDocumentModalProject(null);
                  }
                }}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOAT CONTEXT ACTIONS FOR DOCUMENT FILES */}
      {documentActionMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setDocumentActionMenu(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 max-w-xs w-full shadow-2xl space-y-1 text-xs" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-[#3B2A1D] pb-1.5 border-b border-[#F5EDE4] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#8B5A2B]" />
              Document File Actions
            </h4>
            <button
              onClick={() => {
                onSelectDocument(documentActionMenu.docId);
                onSelectTab('Projects');
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#8B5A2B]" />
              Open Document
            </button>
            <button
              onClick={() => {
                const doc = getDocumentsAll().find(d => d.id === documentActionMenu.docId);
                if (doc) {
                  const val = prompt('Rename Document:', doc.name);
                  if (val && val.trim()) {
                    saveDocument({ ...doc, name: val.trim() });
                    onSelectProject(documentActionMenu.projectId); // Refresh
                    onSelectDocument(doc.id);
                  }
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#7A6A5A]" />
              Rename File
            </button>
            <button
              onClick={() => {
                const copy = duplicateDocument(documentActionMenu.docId);
                onSelectProject(documentActionMenu.projectId);
                onSelectDocument(copy.id);
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-[#7A6A5A]" />
              Duplicate File
            </button>
            <button
              onClick={() => {
                const doc = getDocumentsAll().find(d => d.id === documentActionMenu.docId);
                if (doc) {
                  const otherProjs = projects.filter(p => p.id !== documentActionMenu.projectId);
                  if (otherProjs.length === 0) {
                    alert('No other projects available to move this document to.');
                  } else {
                    const names = otherProjs.map((p, i) => `${i + 1}. ${p.project_name}`).join('\n');
                    const num = prompt(`Move to which project?\n${names}\nEnter project number:`);
                    const idx = num ? parseInt(num) - 1 : -1;
                    if (idx >= 0 && idx < otherProjs.length) {
                      const targetProj = otherProjs[idx];
                      // Save document with target project ID
                      saveDocument({ ...doc, project_id: targetProj.id });
                      
                      // Update test cases project_id
                      const cases = getTestCases(doc.id);
                      cases.forEach(tc => {
                        saveTestCase({ ...tc, project_id: targetProj.id, document_id: doc.id });
                      });
                      
                      onSelectProject(targetProj.id);
                      onSelectDocument(doc.id);
                    }
                  }
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Move className="w-3.5 h-3.5 text-[#7A6A5A]" />
              Move to Project...
            </button>
            <button
              onClick={() => {
                if (confirm('Move this document and its test cases to the Recycle Bin?')) {
                  deleteDocument(documentActionMenu.docId);
                  const remaining = getDocuments(documentActionMenu.projectId);
                  if (remaining.length > 0) {
                    onSelectDocument(remaining[0].id);
                  } else {
                    onSelectDocument('');
                  }
                  onSelectProject(documentActionMenu.projectId);
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-lg font-bold text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              Delete Document
            </button>
            <button
              onClick={() => setDocumentActionMenu(null)}
              className="w-full text-center py-1.5 border border-[#E7D6C4] hover:bg-gray-50 rounded-lg text-[#7A6A5A] mt-2 font-bold cursor-pointer"
            >
              Close Menu
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

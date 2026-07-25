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
  
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-30 md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}
      <div className={`w-[260px] bg-[#FFF4E8] border-r border-[#E7D6C4] h-full flex flex-col justify-start select-none shrink-0 font-sans fixed md:relative z-40 transition-transform duration-300 ease-in-out top-0 left-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      
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
      <div className="px-3 py-4 space-y-1 text-xs font-semibold flex-1 overflow-y-auto">
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
          onClick={() => onSelectTab('WorkspaceProjects')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'WorkspaceProjects' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          Workspace Projects
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
          onClick={() => onSelectTab('TeamActivity')}
          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
            activeTab === 'TeamActivity' 
              ? 'bg-[#8B5A2B] text-white shadow-xs font-bold' 
              : 'text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF8F2]'
          }`}
        >
          <Clock className="w-4 h-4" />
          Team Activity / Logs
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

        {(currentUser?.role === 'admin' || currentUser?.role === 'team_lead') && (
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

          </div>
    </>
  );
}

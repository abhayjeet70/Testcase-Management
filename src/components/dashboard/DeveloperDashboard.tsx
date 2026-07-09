import React, { useMemo } from 'react';
import { Project } from '../../types';
import { getBugsAll, getTestCases } from '../../utils/storage';
import { Bug as BugIcon, CheckCircle, Code, ArrowUpRight, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface DeveloperDashboardProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function DeveloperDashboard({ projects, onSelectProject, onNavigateToTab }: DeveloperDashboardProps) {
  const { currentUser } = useAuth();
  const allBugs = getBugsAll();
  
  // My Assigned bugs
  const myBugs = allBugs.filter(b => b.assigneeId === currentUser?.id);
  
  const openBugs = myBugs.filter(b => b.status !== 'Fixed' && b.status !== 'Closed');
  const inProgressBugs = myBugs.filter(b => b.status === 'In Progress');
  const verificationBugs = myBugs.filter(b => b.status === 'Verification');

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#3B2A1D] tracking-tight">Developer Dashboard</h1>
          <p className="text-sm text-[#7A6A5A]">Focus on your assigned issues and tasks.</p>
        </div>
        <button
          onClick={() => onNavigateToTab('BugTracker')}
          className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-medium rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
        >
          View Kanban Board
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">My Open Bugs</span>
            <div className="p-1.5 rounded-xl bg-red-50 text-red-600"><BugIcon className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{openBugs.length}</h3></div>
        </div>
        
        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">In Progress</span>
            <div className="p-1.5 rounded-xl bg-amber-50 text-amber-600"><Code className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{inProgressBugs.length}</h3></div>
        </div>

        <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#7A6A5A]">In Verification</span>
            <div className="p-1.5 rounded-xl bg-purple-50 text-purple-600"><CheckCircle className="w-4 h-4"/></div>
          </div>
          <div className="mt-4"><h3 className="text-2xl font-bold text-[#3B2A1D]">{verificationBugs.length}</h3></div>
        </div>
      </div>

      <div className="bg-white border border-[#E7D6C4] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-[#E7D6C4] pb-3">
          <h2 className="text-sm font-bold text-[#3B2A1D] flex items-center gap-2">
            <BugIcon className="w-4 h-4 text-[#8B5A2B]" />
            My Active Task List
          </h2>
          <span className="text-xs font-bold text-[#7A6A5A] bg-[#FFF8F2] px-2 py-1 rounded-md">{openBugs.length} Issues</span>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-[400px] custom-scrollbar pr-2">
          {openBugs.length > 0 ? (
            openBugs
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(bug => (
              <div key={bug.id} className="flex flex-col p-4 border border-[#E7D6C4] rounded-xl hover:border-[#8B5A2B]/50 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-[#3B2A1D] text-sm group-hover:text-[#8B5A2B] transition-colors">{bug.title}</span>
                    <span className="text-xs text-[#7A6A5A] mt-1 line-clamp-2">{bug.description || 'No description provided.'}</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ml-4 ${
                    bug.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                    bug.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>{bug.severity}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-[#7A6A5A] pt-3 border-t border-[#F5EDE4]">
                  <span className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      bug.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                      bug.status === 'Verification' ? 'bg-purple-100 text-purple-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {bug.status}
                    </span>
                    • Updated {formatDistanceToNow(new Date(bug.updatedAt), { addSuffix: true })}
                  </span>
                  <button 
                    onClick={() => onNavigateToTab('BugTracker')} 
                    className="flex items-center gap-1 text-[#8B5A2B] font-bold hover:underline"
                  >
                    Resolve <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-sm text-[#7A6A5A] py-12 flex flex-col items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-50" />
              You have no active bugs assigned! Enjoy the quiet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
